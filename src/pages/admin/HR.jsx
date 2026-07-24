import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Lock, Plus, UserCheck, UserMinus, UserPlus, Users } from "lucide-react";
import { getHrStats, listHrReminders } from "../../api/hr";
import { useTenantModules } from "../../context/TenantModulesContext";
import Button from "../../components/ui/Button";
import EmptyState from "../../components/ui/EmptyState";
import PageHeader from "../../components/ui/PageHeader";
import StatCard from "../../components/ui/StatCard";
import StatGrid from "../../components/ui/StatGrid";
import Tabs from "../../components/ui/Tabs";
import { toast } from "../../components/ui/Toast";
import { getErrorMessage, isModuleDisabledError } from "../../utils/apiError";
import HiringHistoryTab from "../../components/hr/HiringHistoryTab";
import LeavesTab from "../../components/hr/LeavesTab";
import RemindersTab from "../../components/hr/RemindersTab";
import StaffTab from "../../components/hr/StaffTab";

const REMINDER_DAYS = 30;

export default function HR() {
  const { t } = useTranslation();
  const { hasModule, hasPermission } = useTenantModules();
  const canManage = hasPermission("hr.manage");
  // The unified staff tab is gated on the hr.view PERMISSION only, not the hr
  // module: teacher and user management were reachable without that module
  // before the merge, so requiring it now would lock the tenants that never
  // enabled it out of managing their own teachers and logins. Every tenant's
  // admin/hr role holds hr.view regardless of module, and the backend
  // GET /hr/staff is likewise permission-gated only.
  const canViewStaff = hasPermission("hr.view");
  // The HR-specific tabs (leaves, reminders, history) and the HR stat cards
  // still belong to the hr module and stay behind it.
  const canViewHr = hasModule("hr") && hasPermission("hr.view");

  // Legacy deep links (?tab=employees|teachers|users) all resolve to the new
  // single "staff" tab instead of falling through to a missing tab.
  const LEGACY_TAB_MAP = { employees: "staff", teachers: "staff", users: "staff" };

  const visibleTabKeys = useMemo(() => {
    const keys = [];
    if (canViewStaff) keys.push("staff");
    if (canViewHr) keys.push("leaves", "reminders", "history");
    return keys;
  }, [canViewStaff, canViewHr]);

  const [searchParams, setSearchParams] = useSearchParams();
  const rawTabParam = searchParams.get("tab");
  const tabParam = LEGACY_TAB_MAP[rawTabParam] || rawTabParam;
  const activeTab = visibleTabKeys.includes(tabParam) ? tabParam : visibleTabKeys[0];

  const [stats, setStats] = useState(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [reminders, setReminders] = useState([]);
  const [remindersLoading, setRemindersLoading] = useState(true);

  const [staffModalOpen, setStaffModalOpen] = useState(false);
  const [leaveModalOpen, setLeaveModalOpen] = useState(false);

  const loadStats = useCallback(async () => {
    if (!canViewHr) {
      setStats(null);
      setStatsLoading(false);
      return;
    }
    setStatsLoading(true);
    try {
      setStats(await getHrStats());
    } catch (error) {
      setStats(null);
      // A module-disabled 403 can happen for a few seconds right after the
      // module is toggled on (the backend caches the old state briefly). It is
      // transient and self-heals, so don't alarm the user with a toast.
      if (!isModuleDisabledError(error)) {
        toast.error(getErrorMessage(error, t("pages.hr.statsError")));
      }
    } finally {
      setStatsLoading(false);
    }
  }, [canViewHr]);

  const loadReminders = useCallback(async () => {
    if (!canViewHr) {
      setReminders([]);
      setRemindersLoading(false);
      return;
    }
    setRemindersLoading(true);
    try {
      const data = await listHrReminders({ days: REMINDER_DAYS });
      setReminders(data.items || []);
    } catch (error) {
      setReminders([]);
      if (!isModuleDisabledError(error)) {
        toast.error(getErrorMessage(error, t("pages.hr.remindersError")));
      }
    } finally {
      setRemindersLoading(false);
    }
  }, [canViewHr]);

  useEffect(() => {
    loadStats();
    loadReminders();
  }, [loadStats, loadReminders]);

  const refreshOverview = useCallback(async () => {
    await Promise.all([loadStats(), loadReminders()]);
  }, [loadStats, loadReminders]);

  function setTab(key) {
    setSearchParams({ tab: key }, { replace: true });
  }

  const pendingLeaves = stats?.pending_leave_requests || 0;
  const urgentReminders = reminders.filter((item) => item.days_left <= 7).length;

  const TAB_LABELS = {
    staff: t("pages.hr.tabs.staff"),
    leaves: t("pages.hr.tabs.leaves"),
    reminders: t("pages.hr.tabs.reminders"),
    history: t("pages.hr.tabs.history"),
  };

  const tabs = visibleTabKeys.map((key) => {
    if (key === "leaves") return { key, label: TAB_LABELS[key], count: pendingLeaves || undefined };
    if (key === "reminders") return { key, label: TAB_LABELS[key], count: urgentReminders || undefined };
    return { key, label: TAB_LABELS[key] };
  });

  return (
    <div className="p-6">
      <PageHeader title="HR">
        {canManage && activeTab === "staff" && (
          <Button onClick={() => setStaffModalOpen(true)}>
            <Plus size={16} />
            {t("pages.hr.newStaff")}
          </Button>
        )}
        {canManage && activeTab === "leaves" && (
          <Button onClick={() => setLeaveModalOpen(true)}>
            <Plus size={16} />
            {t("pages.hr.leaveRequest")}
          </Button>
        )}
      </PageHeader>

      {/* Skeleton only WHILE loading. Once loading is done, null stats means the
          fetch failed (e.g. a transient module-disabled window) — render nothing
          rather than a skeleton that would otherwise spin forever. */}
      {canViewHr && statsLoading && <StatGrid loading className="mb-6" />}
      {canViewHr && !statsLoading && stats && (
          <StatGrid className="mb-6">
            <StatCard variant="blue" icon={Users} label={t("pages.hr.stats.total")} value={stats.total_employees} />
            <StatCard variant="purple" icon={UserCheck} label={t("status.active")} value={stats.active_employees} />
            <StatCard
              variant="green"
              icon={UserPlus}
              label={t("pages.hr.stats.hiredThisMonth")}
              value={stats.hired_this_month}
            />
            <StatCard
              variant="rose"
              icon={UserMinus}
              label={t("pages.hr.stats.terminatedThisMonth")}
              value={stats.terminated_this_month}
            />
          </StatGrid>
        )}

      {visibleTabKeys.length > 0 ? (
        <Tabs className="mb-4" tabs={tabs} value={activeTab} onChange={setTab} />
      ) : (
        <EmptyState
          icon={Lock}
          title={t("pages.hr.noAccessTitle")}
          description={t("pages.hr.noAccessDescription")}
        />
      )}

      {activeTab === "staff" && (
        <StaffTab
          canManage={canManage}
          modalOpen={staffModalOpen}
          onOpenModal={() => setStaffModalOpen(true)}
          onCloseModal={() => setStaffModalOpen(false)}
          onDataChanged={refreshOverview}
        />
      )}
      {activeTab === "leaves" && (
        <LeavesTab
          canManage={canManage}
          stats={stats}
          statsLoading={statsLoading}
          modalOpen={leaveModalOpen}
          onCloseModal={() => setLeaveModalOpen(false)}
          onDataChanged={refreshOverview}
        />
      )}
      {activeTab === "reminders" && (
        <RemindersTab
          items={reminders}
          loading={remindersLoading}
          stats={stats}
          statsLoading={statsLoading}
        />
      )}
      {activeTab === "history" && <HiringHistoryTab />}
    </div>
  );
}

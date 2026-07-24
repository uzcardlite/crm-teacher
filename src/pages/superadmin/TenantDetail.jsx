import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  ArrowLeft,
  Bot,
  CalendarClock,
  Clock,
  CreditCard,
  FileText,
  GraduationCap,
  Lock,
  UsersRound,
  Users,
  Wallet,
} from "lucide-react";
import {
  getTenant,
  getTenantStats,
  markTenantPaid,
  setTenantDemo,
  toggleModule,
  updateTenantActive,
} from "../../api/tenants";
import Badge from "../../components/ui/Badge";
import Button from "../../components/ui/Button";
import Card from "../../components/ui/Card";
import Input from "../../components/ui/Input";
import DateInput from "../../components/ui/DateInput";
import Modal from "../../components/ui/Modal";
import Select from "../../components/ui/Select";
import Skeleton from "../../components/ui/Skeleton";
import Textarea from "../../components/ui/Textarea";
import ToggleSwitch from "../../components/ui/ToggleSwitch";
import { toast } from "../../components/ui/Toast";
import { subscriptionVariant } from "../../constants/status";
import { getErrorMessage } from "../../utils/apiError";
import { formatDate, formatDateTime, formatMoney } from "../../utils/format";

// Same days-aware subscription label used on the list, resolved to i18n.
function subscriptionLabel(status, daysRemaining, t) {
  if (status === "demo") return t("pages.tenantDetail.subDemo");
  if (status === "expired") return t("pages.tenantDetail.subExpired");
  if (status === "active" && daysRemaining != null && daysRemaining <= 7) {
    return t("pages.tenantDetail.subExpiring");
  }
  return t("pages.tenantDetail.active");
}

// Local date (YYYY-MM-DD) for "must be after today" checks on a date input.
function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;
}

const EMPTY_PAID_FORM = { term: "1", subscription_ends_at: "", plan_note: "" };
const EMPTY_DEMO_FORM = { demo_days: 14 };

function StatRow({ icon: Icon, label, value }) {
  return (
    <div className="flex items-center gap-3 rounded-btn border border-line px-3 py-2.5">
      <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-btn bg-accent-light/30 text-accent-dark dark:text-accent">
        <Icon size={16} />
      </span>
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-fg">{value}</p>
        <p className="text-xs text-fg-muted">{label}</p>
      </div>
    </div>
  );
}

export default function TenantDetail() {
  const { t } = useTranslation();
  const { tenantId } = useParams();
  const navigate = useNavigate();
  const [tenant, setTenant] = useState(null);
  const [loading, setLoading] = useState(true);
  const [statusUpdating, setStatusUpdating] = useState(false);
  const [pendingModules, setPendingModules] = useState({});
  const [stats, setStats] = useState(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [note, setNote] = useState("");
  const [paidModalOpen, setPaidModalOpen] = useState(false);
  const [paidForm, setPaidForm] = useState(EMPTY_PAID_FORM);
  const [paidErrors, setPaidErrors] = useState({});
  const [paidSubmitting, setPaidSubmitting] = useState(false);
  const [demoModalOpen, setDemoModalOpen] = useState(false);
  const [demoForm, setDemoForm] = useState(EMPTY_DEMO_FORM);
  const [demoErrors, setDemoErrors] = useState({});
  const [demoSubmitting, setDemoSubmitting] = useState(false);

  async function loadTenant() {
    setLoading(true);
    try {
      const data = await getTenant(tenantId);
      setTenant(data);
    } catch (error) {
      toast.error(getErrorMessage(error, t("pages.tenantDetail.tenantError")));
    } finally {
      setLoading(false);
    }
  }

  async function loadStats() {
    setStatsLoading(true);
    try {
      const data = await getTenantStats(tenantId);
      setStats(data);
    } catch (error) {
      toast.error(getErrorMessage(error, t("pages.tenantDetail.statsError")));
    } finally {
      setStatsLoading(false);
    }
  }

  useEffect(() => {
    loadTenant();
    loadStats();
    setNote(localStorage.getItem(`tenant_note_${tenantId}`) || "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenantId]);

  function handleNoteChange(event) {
    const value = event.target.value;
    setNote(value);
    localStorage.setItem(`tenant_note_${tenantId}`, value);
  }

  async function handleToggleActive() {
    setStatusUpdating(true);
    const nextActive = !tenant.is_active;
    try {
      await updateTenantActive(tenantId, nextActive);
      setTenant((prev) => ({ ...prev, is_active: nextActive }));
      toast.success(
        nextActive ? t("pages.tenantDetail.activated") : t("pages.tenantDetail.blocked"),
      );
    } catch (error) {
      toast.error(getErrorMessage(error, t("pages.tenantDetail.statusError")));
    } finally {
      setStatusUpdating(false);
    }
  }

  function openPaidModal() {
    setPaidForm(EMPTY_PAID_FORM);
    setPaidErrors({});
    setPaidModalOpen(true);
  }

  function closePaidModal() {
    if (paidSubmitting) return;
    setPaidModalOpen(false);
  }

  async function handlePaidSubmit(event) {
    event.preventDefault();
    const isCustom = paidForm.term === "custom";
    const nextErrors = {};

    if (isCustom) {
      const value = paidForm.subscription_ends_at;
      if (!value) {
        nextErrors.subscription_ends_at = t("pages.tenantDetail.paid.dateRequired");
      } else if (value <= todayISO()) {
        nextErrors.subscription_ends_at = t("pages.tenantDetail.paid.dateFuture");
      }
    }
    if (paidForm.plan_note.length > 500) {
      nextErrors.plan_note = t("pages.tenantDetail.paid.noteTooLong");
    }
    setPaidErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    // Explicit end date wins over a relative month extension.
    const payload = isCustom
      ? { subscription_ends_at: paidForm.subscription_ends_at }
      : { extend_months: Number(paidForm.term) };
    if (paidForm.plan_note.trim()) payload.plan_note = paidForm.plan_note.trim();

    setPaidSubmitting(true);
    try {
      const updated = await markTenantPaid(tenantId, payload);
      setTenant(updated);
      toast.success(t("pages.tenantDetail.paid.success"));
      setPaidModalOpen(false);
    } catch (error) {
      toast.error(getErrorMessage(error, t("pages.tenantDetail.paid.error")));
    } finally {
      setPaidSubmitting(false);
    }
  }

  function openDemoModal() {
    setDemoForm(EMPTY_DEMO_FORM);
    setDemoErrors({});
    setDemoModalOpen(true);
  }

  function closeDemoModal() {
    if (demoSubmitting) return;
    setDemoModalOpen(false);
  }

  async function handleDemoSubmit(event) {
    event.preventDefault();
    const nextErrors = {};
    const raw = String(demoForm.demo_days ?? "").trim();
    const days = Number(raw);
    if (raw === "" || !Number.isInteger(days) || days <= 0 || days > 365) {
      nextErrors.demo_days = t("pages.tenantDetail.demo.daysError");
    }
    setDemoErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setDemoSubmitting(true);
    try {
      const updated = await setTenantDemo(tenantId, { demo_days: days });
      setTenant(updated);
      toast.success(t("pages.tenantDetail.demo.success"));
      setDemoModalOpen(false);
    } catch (error) {
      toast.error(getErrorMessage(error, t("pages.tenantDetail.demo.error")));
    } finally {
      setDemoSubmitting(false);
    }
  }

  async function handleToggleModule(moduleKey, currentValue) {
    const nextValue = !currentValue;
    setPendingModules((prev) => ({ ...prev, [moduleKey]: true }));
    setTenant((prev) => ({
      ...prev,
      modules: prev.modules.map((m) =>
        m.key === moduleKey ? { ...m, is_enabled: nextValue } : m,
      ),
    }));

    try {
      await toggleModule(tenantId, moduleKey, nextValue);
      toast.success(t("pages.tenantDetail.moduleUpdated"));
    } catch (error) {
      setTenant((prev) => ({
        ...prev,
        modules: prev.modules.map((m) =>
          m.key === moduleKey ? { ...m, is_enabled: currentValue } : m,
        ),
      }));
      toast.error(getErrorMessage(error, t("pages.tenantDetail.moduleToggleError")));
    } finally {
      setPendingModules((prev) => {
        const next = { ...prev };
        delete next[moduleKey];
        return next;
      });
    }
  }

  if (loading) {
    return (
      <div className="p-6">
        <Skeleton className="mb-4 h-5 w-56" />
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Card className="flex flex-col gap-4">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-9 w-28 rounded-btn" />
            <Skeleton className="h-40 w-full" />
          </Card>
          <Card className="flex flex-col gap-3">
            {Array.from({ length: 8 }).map((_, index) => (
              <Skeleton key={index} className="h-10 w-full" />
            ))}
          </Card>
        </div>
      </div>
    );
  }

  if (!tenant) {
    return null;
  }

  return (
    <div className="p-6">
      <button
        type="button"
        onClick={() => navigate("/superadmin/tenants")}
        className="mb-4 flex items-center gap-1.5 text-sm font-medium text-fg-muted transition-colors hover:text-fg-secondary"
      >
        <ArrowLeft size={16} />
        {t("pages.tenantDetail.backToList")}
      </button>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <div className="mb-4 flex items-start justify-between">
            <div>
              <h1 className="text-lg font-semibold text-fg">{tenant.name}</h1>
              <p className="text-sm text-fg-muted">{tenant.slug}</p>
            </div>
            <Badge variant={tenant.is_active ? "success" : "danger"}>
              {tenant.is_active ? t("pages.tenantDetail.active") : t("pages.tenantDetail.blockedStatus")}
            </Badge>
          </div>

          <dl className="space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-fg-muted">{t("pages.tenantDetail.createdAt")}</dt>
              <dd className="text-fg">{formatDate(tenant.created_at)}</dd>
            </div>
          </dl>

          <Button
            variant={tenant.is_active ? "danger" : "primary"}
            className="mt-5"
            onClick={handleToggleActive}
            disabled={statusUpdating}
          >
            {statusUpdating
              ? t("pages.tenantDetail.updating")
              : tenant.is_active
                ? t("pages.tenantDetail.block")
                : t("pages.tenantDetail.activate")}
          </Button>

          <div className="mt-6 border-t border-line pt-5">
            <h2 className="mb-3 text-sm font-semibold text-fg">{t("pages.tenantDetail.statistics")}</h2>
            {statsLoading || !stats ? (
              <div className="grid grid-cols-2 gap-2">
                {Array.from({ length: 6 }).map((_, index) => (
                  <Skeleton key={index} className="h-14 w-full" />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                <StatRow icon={Users} label={t("pages.tenantDetail.stats.students")} value={stats.students_count} />
                <StatRow icon={GraduationCap} label={t("pages.tenantDetail.stats.teachers")} value={stats.teachers_count} />
                <StatRow icon={UsersRound} label={t("pages.tenantDetail.stats.activeGroups")} value={stats.active_groups_count} />
                <StatRow
                  icon={Wallet}
                  label={t("pages.tenantDetail.stats.revenue")}
                  value={formatMoney(stats.current_month_revenue)}
                />
                <StatRow
                  icon={Bot}
                  label={t("pages.tenantDetail.stats.linkedToBot")}
                  value={`${stats.percent_linked_to_bot}%`}
                />
                <StatRow
                  icon={Clock}
                  label={t("pages.tenantDetail.stats.lastActivity")}
                  value={
                    stats.last_activity_at
                      ? formatDateTime(stats.last_activity_at)
                      : t("pages.tenantDetail.stats.noActivity")
                  }
                />
              </div>
            )}
          </div>

          <div className="mt-6 border-t border-line pt-5">
            <h2 className="mb-3 text-sm font-semibold text-fg">{t("pages.tenantDetail.subscription")}</h2>
            <div className="grid grid-cols-2 gap-2">
              <StatRow
                icon={Clock}
                label={t("pages.tenantDetail.subStatus")}
                value={
                  <span className="flex items-center gap-1.5">
                    <Badge variant={subscriptionVariant(tenant.subscription_status, tenant.days_remaining)}>
                      {subscriptionLabel(tenant.subscription_status, tenant.days_remaining, t)}
                    </Badge>
                    {tenant.days_remaining != null && (
                      <span className="text-xs text-fg-muted">
                        {t("pages.tenantDetail.daysLeft", { days: tenant.days_remaining })}
                      </span>
                    )}
                  </span>
                }
              />
              <StatRow
                icon={CalendarClock}
                label={t("pages.tenantDetail.demoEndsAt")}
                value={formatDate(tenant.demo_ends_at)}
              />
              <StatRow
                icon={CreditCard}
                label={t("pages.tenantDetail.subscriptionEndsAt")}
                value={formatDate(tenant.subscription_ends_at)}
              />
              {tenant.plan_note && (
                <StatRow
                  icon={FileText}
                  label={t("pages.tenantDetail.planNote")}
                  value={tenant.plan_note}
                />
              )}
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button variant="primary" onClick={openPaidModal}>
                {t("pages.tenantDetail.paid.open")}
              </Button>
              <Button variant="secondary" onClick={openDemoModal}>
                {t("pages.tenantDetail.demo.open")}
              </Button>
            </div>
          </div>

          <div className="mt-6 border-t border-line pt-5">
            <h2 className="mb-2 text-sm font-semibold text-fg">{t("pages.tenantDetail.note")}</h2>
            <Textarea
              id="tenant-note"
              value={note}
              onChange={handleNoteChange}
              placeholder={t("pages.tenantDetail.notePlaceholder")}
              rows={3}
            />
          </div>
        </Card>

        <Card>
          <h2 className="mb-4 text-sm font-semibold text-fg">{t("pages.tenantDetail.modules")}</h2>
          <div className="divide-y divide-line">
            {tenant.modules.map((module) => (
              <div key={module.key} className="flex items-center justify-between py-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-fg">{module.name}</span>
                    {module.is_core && (
                      <span className="flex items-center gap-1 text-xs text-fg-faint">
                        <Lock size={12} />
                        {t("pages.tenantDetail.coreModule")}
                      </span>
                    )}
                  </div>
                  {module.is_core && (
                    <p className="mt-0.5 text-xs text-fg-faint">
                      {t("pages.tenantDetail.coreModuleDescription")}
                    </p>
                  )}
                </div>
                <ToggleSwitch
                  checked={module.is_enabled}
                  disabled={module.is_core || Boolean(pendingModules[module.key])}
                  onChange={() => handleToggleModule(module.key, module.is_enabled)}
                />
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Modal
        open={paidModalOpen}
        onClose={closePaidModal}
        title={t("pages.tenantDetail.paid.title")}
        footer={
          <>
            <Button variant="secondary" onClick={closePaidModal} disabled={paidSubmitting}>
              {t("pages.tenantDetail.cancel")}
            </Button>
            <Button type="submit" form="mark-paid-form" disabled={paidSubmitting}>
              {paidSubmitting ? t("pages.tenantDetail.saving") : t("pages.tenantDetail.confirm")}
            </Button>
          </>
        }
      >
        <form
          id="mark-paid-form"
          onSubmit={handlePaidSubmit}
          className="flex flex-col gap-4"
          noValidate
        >
          <Select
            label={t("pages.tenantDetail.paid.term")}
            name="term"
            value={paidForm.term}
            onChange={(e) => setPaidForm((prev) => ({ ...prev, term: e.target.value }))}
          >
            <option value="1">{t("pages.tenantDetail.paid.term1")}</option>
            <option value="6">{t("pages.tenantDetail.paid.term6")}</option>
            <option value="12">{t("pages.tenantDetail.paid.term12")}</option>
            <option value="custom">{t("pages.tenantDetail.paid.termCustom")}</option>
          </Select>
          {paidForm.term === "custom" && (
            <DateInput
              label={t("pages.tenantDetail.paid.endsAt")}
              name="subscription_ends_at"
              min={todayISO()}
              value={paidForm.subscription_ends_at}
              onChange={(e) =>
                setPaidForm((prev) => ({ ...prev, subscription_ends_at: e.target.value }))
              }
              error={paidErrors.subscription_ends_at}
            />
          )}
          <Textarea
            label={t("pages.tenantDetail.paid.note")}
            name="plan_note"
            rows={3}
            value={paidForm.plan_note}
            onChange={(e) => setPaidForm((prev) => ({ ...prev, plan_note: e.target.value }))}
            error={paidErrors.plan_note}
          />
        </form>
      </Modal>

      <Modal
        open={demoModalOpen}
        onClose={closeDemoModal}
        title={t("pages.tenantDetail.demo.title")}
        footer={
          <>
            <Button variant="secondary" onClick={closeDemoModal} disabled={demoSubmitting}>
              {t("pages.tenantDetail.cancel")}
            </Button>
            <Button type="submit" form="set-demo-form" disabled={demoSubmitting}>
              {demoSubmitting ? t("pages.tenantDetail.saving") : t("pages.tenantDetail.confirm")}
            </Button>
          </>
        }
      >
        <form
          id="set-demo-form"
          onSubmit={handleDemoSubmit}
          className="flex flex-col gap-4"
          noValidate
        >
          <Input
            label={t("pages.tenantDetail.demo.days")}
            name="demo_days"
            type="number"
            min={1}
            max={365}
            value={demoForm.demo_days}
            onChange={(e) => setDemoForm((prev) => ({ ...prev, demo_days: e.target.value }))}
            error={demoErrors.demo_days}
          />
        </form>
      </Modal>
    </div>
  );
}

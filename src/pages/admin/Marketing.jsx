import { Suspense, lazy, useCallback, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { GraduationCap, Megaphone, Plus, Target, UserPlus, Wallet } from "lucide-react";
import { getMarketingStats } from "../../api/marketing";
import { useTenantModules } from "../../context/TenantModulesContext";
import Button from "../../components/ui/Button";
import EmptyState from "../../components/ui/EmptyState";
import PageHeader from "../../components/ui/PageHeader";
import Spinner from "../../components/ui/Spinner";
import StatCard from "../../components/ui/StatCard";
import StatGrid from "../../components/ui/StatGrid";
import Tabs from "../../components/ui/Tabs";
import { toast } from "../../components/ui/Toast";
import { getErrorMessage, isModuleDisabledError } from "../../utils/apiError";
import { formatCount, formatMoney } from "../../constants/moliya";
import { DEFAULT_TAB, VALID_TABS } from "../../constants/marketing";
import BloggersTab from "../../components/marketing/BloggersTab";
import CalendarTab from "../../components/marketing/CalendarTab";

// Recharts is ~100KB, so the dashboard tab loads only when it is opened.
const MarketingDashboardTab = lazy(() =>
  import("../../components/marketing/MarketingDashboardTab"),
);

export default function Marketing() {
  const { t } = useTranslation();
  const { hasPermission } = useTenantModules();
  const canManage = hasPermission("marketing.manage");

  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get("tab");
  const activeTab = VALID_TABS.includes(tabParam) ? tabParam : DEFAULT_TAB;

  const [stats, setStats] = useState(null);
  const [statsLoading, setStatsLoading] = useState(true);

  // Nothing has been measured yet: no spend, no leads, and therefore no
  // cost-per-lead or acquisition cost to derive. Distinct from "this period
  // happened to cost nothing", which would still have leads or a CPL.
  const hasNoMarketingData =
    stats != null &&
    !stats.total_cost &&
    !stats.total_leads &&
    stats.avg_cpl == null &&
    stats.cac == null;

  const [postModalOpen, setPostModalOpen] = useState(false);
  const [bloggerModalOpen, setBloggerModalOpen] = useState(false);

  const loadStats = useCallback(async () => {
    setStatsLoading(true);
    try {
      setStats(await getMarketingStats());
    } catch (error) {
      setStats(null);
      if (!isModuleDisabledError(error)) {
        toast.error(getErrorMessage(error, t("pages.marketing.statsError")));
      }
    } finally {
      setStatsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  function setTab(key) {
    setSearchParams({ tab: key }, { replace: true });
  }

  const tabLabels = {
    dashboard: t("pages.marketing.tabs.dashboard"),
    bloggers: t("pages.marketing.tabs.bloggers"),
    calendar: t("pages.marketing.tabs.calendar"),
  };
  const tabs = VALID_TABS.map((key) => ({ key, label: tabLabels[key] }));

  return (
    <div className="p-6">
      <PageHeader title={t("nav.marketing")}>
        {canManage && activeTab === "bloggers" && (
          <>
            <Button variant="secondary" onClick={() => setBloggerModalOpen(true)}>
              {t("pages.marketing.addBlogger")}
            </Button>
            <Button onClick={() => setPostModalOpen(true)}>
              <Plus size={16} />
              {t("pages.marketing.addPost")}
            </Button>
          </>
        )}
        {canManage && activeTab === "calendar" && (
          <Button onClick={() => setPostModalOpen(true)}>
            <Plus size={16} />
            {t("pages.marketing.addPost")}
          </Button>
        )}
      </PageHeader>

      {statsLoading || !stats ? (
        <StatGrid loading className="mb-6" />
      ) : hasNoMarketingData ? (
        // A row reading "0 so'm / 0 ta / — / —" looks like a broken screen
        // rather than an empty one. Until there is a single post to measure,
        // say so plainly and point at the action that fixes it.
        <div className="mb-6">
          <EmptyState
            icon={Megaphone}
            title={t("pages.marketing.emptyStats.title")}
            description={t("pages.marketing.emptyStats.description")}
            actionLabel={canManage ? t("pages.marketing.addPost") : undefined}
            onAction={canManage ? () => setPostModalOpen(true) : undefined}
          />
        </div>
      ) : (
        <StatGrid className="mb-6">
          <StatCard
            variant="orange"
            icon={Wallet}
            label={t("pages.marketing.stats.totalCost")}
            value={formatMoney(stats.total_cost)}
            className="min-w-0"
          />
          <StatCard
            variant="blue"
            icon={UserPlus}
            label={t("pages.marketing.stats.totalLeads")}
            value={formatCount(stats.total_leads)}
            className="min-w-0"
          />
          <StatCard
            variant="teal"
            icon={Target}
            label={t("pages.marketing.stats.avgCpl")}
            value={stats.avg_cpl == null ? "—" : formatMoney(stats.avg_cpl)}
            hint={t("pages.marketing.stats.cplHint")}
            className="min-w-0"
          />
          <StatCard
            variant="purple"
            icon={GraduationCap}
            label={t("pages.marketing.stats.cac")}
            value={stats.cac == null ? "—" : formatMoney(stats.cac)}
            hint={t("pages.marketing.stats.cacHint")}
            className="min-w-0"
          />
        </StatGrid>
      )}

      <Tabs className="mb-4" tabs={tabs} value={activeTab} onChange={setTab} />

      {activeTab === "dashboard" && (
        <Suspense
          fallback={
            <div className="flex justify-center py-10">
              <Spinner size={24} />
            </div>
          }
        >
          <MarketingDashboardTab />
        </Suspense>
      )}

      {activeTab === "bloggers" && (
        <BloggersTab
          canManage={canManage}
          postModalOpen={postModalOpen}
          bloggerModalOpen={bloggerModalOpen}
          onOpenPostModal={() => setPostModalOpen(true)}
          onClosePostModal={() => setPostModalOpen(false)}
          onCloseBloggerModal={() => setBloggerModalOpen(false)}
          onDataChanged={loadStats}
        />
      )}

      {activeTab === "calendar" && (
        <CalendarTab
          canManage={canManage}
          postModalOpen={postModalOpen}
          onOpenPostModal={() => setPostModalOpen(true)}
          onClosePostModal={() => setPostModalOpen(false)}
          onDataChanged={loadStats}
        />
      )}
    </div>
  );
}

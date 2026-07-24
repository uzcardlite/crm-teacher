import { Suspense, lazy, useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { AlertTriangle, Lock, Plus, Receipt, TrendingUp, Wallet } from "lucide-react";
import { getFinanceStats } from "../../api/finance";
import { useTenantModules } from "../../context/TenantModulesContext";
import Button from "../../components/ui/Button";
import EmptyState from "../../components/ui/EmptyState";
import PageHeader from "../../components/ui/PageHeader";
import Spinner from "../../components/ui/Spinner";
import StatCard from "../../components/ui/StatCard";
import StatGrid from "../../components/ui/StatGrid";
import Tabs from "../../components/ui/Tabs";
import { toast } from "../../components/ui/Toast";
import { getErrorMessage } from "../../utils/apiError";
import { formatMoney } from "../../constants/moliya";
import PaymentsTab from "../../components/moliya/PaymentsTab";
import DebtorsTab from "../../components/moliya/DebtorsTab";
import ExpensesTab from "../../components/moliya/ExpensesTab";
import PayrollTab from "../../components/moliya/PayrollTab";

// Recharts is ~100KB, so the dashboard tab loads only when it is opened.
const FinanceDashboardTab = lazy(() => import("../../components/moliya/FinanceDashboardTab"));

export default function Moliya() {
  const { t } = useTranslation();
  const { hasModule, hasPermission } = useTenantModules();

  const canViewPayments = hasModule("payments") && hasPermission("payments.view");
  const canCreatePayment = canViewPayments && hasPermission("payments.create");
  const canUpdatePayment = canViewPayments && hasPermission("payments.update");
  const canDeletePayment = canViewPayments && hasPermission("payments.delete");
  const canViewExpenses = hasModule("expenses") && hasPermission("expenses.view");
  const canCreateExpense = canViewExpenses && hasPermission("expenses.create");
  const canUpdateExpense = canViewExpenses && hasPermission("expenses.update");
  const canDeleteExpense = canViewExpenses && hasPermission("expenses.delete");
  const canViewPayroll = hasPermission("payroll.view");

  const visibleTabKeys = useMemo(() => {
    const list = ["dashboard"];
    if (canViewPayments) list.push("payments", "debtors");
    if (canViewExpenses) list.push("expenses");
    if (canViewPayroll) list.push("payroll");
    return list;
  }, [canViewPayments, canViewExpenses, canViewPayroll]);

  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get("tab");
  const activeTab = visibleTabKeys.includes(tabParam) ? tabParam : visibleTabKeys[0];

  const [stats, setStats] = useState(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [expenseModalOpen, setExpenseModalOpen] = useState(false);

  const loadStats = useCallback(async () => {
    if (!canViewPayments) {
      setStats(null);
      setStatsLoading(false);
      return;
    }
    setStatsLoading(true);
    try {
      setStats(await getFinanceStats());
    } catch (error) {
      setStats(null);
      toast.error(getErrorMessage(error, t("pages.moliya.statsError")));
    } finally {
      setStatsLoading(false);
    }
  }, [canViewPayments]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  function setTab(key) {
    setSearchParams({ tab: key }, { replace: true });
  }

  const TAB_LABELS = {
    dashboard: t("pages.moliya.tabs.dashboard"),
    payments: t("pages.moliya.tabs.payments"),
    debtors: t("pages.moliya.tabs.debtors"),
    expenses: t("pages.moliya.tabs.expenses"),
    payroll: t("pages.moliya.tabs.payroll"),
  };

  const tabs = visibleTabKeys.map((key) => ({
    key,
    label: TAB_LABELS[key],
    count: key === "debtors" ? stats?.debtors_count || undefined : undefined,
  }));

  return (
    <div className="p-6">
      <PageHeader title={t("nav.moliya")}>
        {canCreatePayment && (activeTab === "payments" || activeTab === "debtors") && (
          <Button onClick={() => setPaymentModalOpen(true)}>
            <Plus size={16} />
            {t("pages.moliya.newPayment")}
          </Button>
        )}
        {canCreateExpense && activeTab === "expenses" && (
          <Button onClick={() => setExpenseModalOpen(true)}>
            <Plus size={16} />
            {t("pages.moliya.newExpense")}
          </Button>
        )}
      </PageHeader>

      {canViewPayments &&
        (statsLoading || !stats ? (
          <StatGrid loading className="mb-6" />
        ) : (
          <StatGrid className="mb-6">
            <StatCard
              variant="green"
              icon={Wallet}
              label={t("pages.moliya.stats.income")}
              value={formatMoney(stats.income)}
              className="min-w-0"
            />
            <StatCard
              variant="orange"
              icon={Receipt}
              label={t("pages.moliya.stats.expense")}
              value={formatMoney(stats.expense)}
              className="min-w-0"
            />
            <StatCard
              variant="purple"
              icon={TrendingUp}
              label={t("pages.moliya.stats.netProfit")}
              value={formatMoney(stats.net_profit)}
              className="min-w-0"
            />
            <StatCard
              variant="rose"
              icon={AlertTriangle}
              label={t("pages.moliya.stats.totalDebt")}
              value={formatMoney(stats.debtors_total)}
              className="min-w-0"
            />
          </StatGrid>
        ))}

      <Tabs className="mb-4" tabs={tabs} value={activeTab} onChange={setTab} />

      {activeTab === "dashboard" &&
        (canViewPayments ? (
          <Suspense
            fallback={
              <div className="flex justify-center py-10">
                <Spinner size={24} />
              </div>
            }
          >
            <FinanceDashboardTab
              onGoToDebtors={() => setTab("debtors")}
              onGoToPayments={() => setTab("payments")}
            />
          </Suspense>
        ) : (
          <EmptyState
            icon={Lock}
            title={t("pages.moliya.noAccessTitle")}
            description={t("pages.moliya.noAccessDescription")}
          />
        ))}

      {activeTab === "payments" && (
        <PaymentsTab
          canCreate={canCreatePayment}
          canUpdate={canUpdatePayment}
          canDelete={canDeletePayment}
          modalOpen={paymentModalOpen}
          onCloseModal={() => setPaymentModalOpen(false)}
          onDataChanged={loadStats}
        />
      )}

      {activeTab === "debtors" && (
        <DebtorsTab
          canCreate={canCreatePayment}
          modalOpen={paymentModalOpen}
          onCloseModal={() => setPaymentModalOpen(false)}
          onDataChanged={loadStats}
        />
      )}

      {activeTab === "expenses" && (
        <ExpensesTab
          canUpdate={canUpdateExpense}
          canDelete={canDeleteExpense}
          modalOpen={expenseModalOpen}
          onCloseModal={() => setExpenseModalOpen(false)}
          onDataChanged={loadStats}
        />
      )}

      {activeTab === "payroll" && <PayrollTab onDataChanged={loadStats} />}
    </div>
  );
}

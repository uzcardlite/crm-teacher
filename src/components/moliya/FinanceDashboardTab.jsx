import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { getFinanceStats } from "../../api/finance";
import { listFilials } from "../../api/filials";
import { BarChart3 } from "lucide-react";
import Badge from "../ui/Badge";
import Card from "../ui/Card";
import EmptyState from "../ui/EmptyState";
import FilterBar from "../ui/FilterBar";
import Input from "../ui/Input";
import Select from "../ui/Select";
import Skeleton from "../ui/Skeleton";
import { toast } from "../ui/Toast";
import { getErrorMessage, isModuleDisabledError } from "../../utils/apiError";
import ChartTooltip from "./ChartTooltip";
import {
  CHART_COLORS,
  METHOD_BADGE,
  METHOD_CHART_COLOR,
  METHOD_LABELS,
  currentMonthValue,
  dayOfMonth,
  formatAmountShort,
  formatDate,
  formatMoneyI18n,
  monthToApi,
} from "../../constants/moliya";

const CHART_HEIGHT = 220;
const DONUT_HEIGHT = 240;

// Same empty treatment as every table on the page, scaled down for a card slot.
function ChartEmpty({ text }) {
  const { t } = useTranslation();
  return <EmptyState size="sm" icon={BarChart3} title={t("finance.dashboard.noData")} description={text} />;
}

export default function FinanceDashboardTab({ onGoToDebtors, onGoToPayments }) {
  const { t } = useTranslation();
  const [filials, setFilials] = useState([]);
  const [filialId, setFilialId] = useState("");
  const [month, setMonth] = useState(currentMonthValue);

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    listFilials()
      .then(setFilials)
      .catch((error) => {
        if (!isModuleDisabledError(error)) {
          toast.error(getErrorMessage(error, t("finance.common.loadBranchesError")));
        }
      });
  }, [t]);

  const loadStats = useCallback(async () => {
    setLoading(true);
    try {
      setData(
        await getFinanceStats({
          month: monthToApi(month),
          filial_id: filialId || undefined,
        }),
      );
    } catch (error) {
      setData(null);
      toast.error(getErrorMessage(error, t("finance.dashboard.loadError")));
    } finally {
      setLoading(false);
    }
  }, [month, filialId, t]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  const methodData = useMemo(
    () =>
      (data?.by_method || [])
        .filter((row) => Number(row.amount) > 0)
        .map((row) => ({
          ...row,
          amount: Number(row.amount),
          label: METHOD_LABELS[row.method] ? t(METHOD_LABELS[row.method]) : row.method,
        })),
    [data, t],
  );

  const categories = useMemo(() => data?.by_category || [], [data]);
  const maxCategoryAmount = useMemo(
    () => Math.max(1, ...categories.map((row) => Number(row.amount))),
    [categories],
  );

  const paidData = useMemo(() => {
    if (!data) return [];
    if (!data.paid_students && !data.unpaid_students) return [];
    return [
      {
        label: t("finance.dashboard.studentsLabel"),
        paid: data.paid_students,
        unpaid: data.unpaid_students,
      },
    ];
  }, [data, t]);

  const dailyIncome = useMemo(
    () =>
      (data?.daily_income || []).map((row) => ({
        day: dayOfMonth(row.date),
        amount: Number(row.amount),
      })),
    [data],
  );

  const recent = useMemo(() => (data?.recent_payments || []).slice(0, 5), [data]);

  return (
    <>
      <FilterBar>
        <Select
          label={t("finance.common.branch")}
          className="w-full max-w-[220px]"
          value={filialId}
          onChange={(event) => setFilialId(event.target.value)}
        >
          <option value="">{t("finance.common.allBranches")}</option>
          {filials.map((filial) => (
            <option key={filial.id} value={filial.id}>
              {filial.name}
            </option>
          ))}
        </Select>
        <Input
          label={t("finance.common.month")}
          type="month"
          className="w-full max-w-[180px]"
          value={month}
          onChange={(event) => setMonth(event.target.value)}
        />
      </FilterBar>

      <div className="flex flex-col gap-6">
        <Card>
          <h2 className="mb-4 text-sm font-semibold text-fg">{t("finance.dashboard.cashTitle")}</h2>
          {loading || !data ? (
            <Skeleton className="h-16 w-full" />
          ) : (
            <>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div>
                  <p className="text-xs text-fg-muted">{t("finance.dashboard.income")}</p>
                  <p className="mt-1 text-lg font-semibold text-success">
                    {formatMoneyI18n(data.cash_in, t)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-fg-muted">{t("finance.dashboard.expense")}</p>
                  <p className="mt-1 text-lg font-semibold text-danger">
                    {formatMoneyI18n(data.cash_out, t)}
                  </p>
                </div>
                <div className="sm:border-l sm:border-line sm:pl-4">
                  <p className="text-xs text-fg-muted">{t("finance.dashboard.balance")}</p>
                  <p className="mt-1 text-lg font-semibold text-fg">
                    {formatMoneyI18n(data.cash_balance, t)}
                  </p>
                </div>
              </div>
              <p className="mt-3 text-xs text-fg-faint">{t("finance.dashboard.cashNote")}</p>
            </>
          )}
        </Card>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Card>
            <h2 className="mb-4 text-sm font-semibold text-fg">{t("finance.dashboard.methodsTitle")}</h2>
            {loading ? (
              <Skeleton className="h-[240px] w-full rounded-card" />
            ) : methodData.length === 0 ? (
              <ChartEmpty text={t("finance.dashboard.noPaymentsInPeriod")} />
            ) : (
              <ResponsiveContainer width="100%" height={DONUT_HEIGHT}>
                <PieChart>
                  <Pie
                    data={methodData}
                    dataKey="amount"
                    nameKey="label"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={2}
                    stroke="none"
                  >
                    {methodData.map((entry) => (
                      <Cell key={entry.method} fill={METHOD_CHART_COLOR[entry.method]} />
                    ))}
                  </Pie>
                  <Tooltip content={<ChartTooltip />} />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </Card>

          <Card>
            <h2 className="mb-3 text-sm font-semibold text-fg">{t("finance.dashboard.categoriesTitle")}</h2>
            {loading ? (
              <div className="flex flex-col gap-2">
                {Array.from({ length: 3 }).map((_, index) => (
                  <Skeleton key={index} className="h-6 w-full" />
                ))}
              </div>
            ) : categories.length === 0 ? (
              <ChartEmpty text={t("finance.dashboard.noExpensesInPeriod")} />
            ) : (
              <div className="flex flex-col gap-2.5">
                {categories.map((row) => (
                  <div key={row.category} className="flex items-center gap-3">
                    <span className="w-28 flex-shrink-0 truncate text-sm text-fg-secondary">
                      {row.category}
                    </span>
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-surface-sunken">
                      <div
                        className="h-full rounded-full bg-accent"
                        style={{ width: `${(Number(row.amount) / maxCategoryAmount) * 100}%` }}
                      />
                    </div>
                    <span className="w-32 flex-shrink-0 text-right text-sm font-medium text-fg">
                      {formatMoneyI18n(row.amount, t)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        <Card>
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="text-sm font-semibold text-fg">{t("finance.dashboard.paidTitle")}</h2>
            <button
              type="button"
              onClick={onGoToDebtors}
              className="text-sm font-medium text-accent-dark hover:underline"
            >
              {t("finance.dashboard.viewDebtors")}
            </button>
          </div>
          {loading ? (
            <Skeleton className="h-[220px] w-full rounded-card" />
          ) : paidData.length === 0 ? (
            <ChartEmpty text={t("finance.dashboard.notEnoughData")} />
          ) : (
            <>
              <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
                <BarChart data={paidData}>
                  <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} vertical={false} />
                  <XAxis
                    dataKey="label"
                    tickLine={false}
                    axisLine={false}
                    tick={{ fontSize: 12, fill: CHART_COLORS.label }}
                  />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    tick={{ fontSize: 12, fill: CHART_COLORS.label }}
                    tickFormatter={formatAmountShort}
                    allowDecimals={false}
                  />
                  <Tooltip
                    content={
                      <ChartTooltip
                        formatter={(value) => t("finance.common.count", { count: Number(value) })}
                      />
                    }
                    cursor={{ fill: CHART_COLORS.grid }}
                  />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
                  <Bar
                    dataKey="paid"
                    name={t("finance.dashboard.paidLegend")}
                    stackId="a"
                    fill={CHART_COLORS.success}
                    radius={[0, 0, 0, 0]}
                    maxBarSize={40}
                  />
                  <Bar
                    dataKey="unpaid"
                    name={t("finance.dashboard.unpaidLegend")}
                    stackId="a"
                    fill={CHART_COLORS.danger}
                    radius={[4, 4, 0, 0]}
                    maxBarSize={40}
                  />
                </BarChart>
              </ResponsiveContainer>
              <p className="mt-2 text-xs text-fg-faint">
                {t("finance.dashboard.collectionRate", { rate: data?.collection_rate ?? 0 })}
              </p>
            </>
          )}
        </Card>

        <Card>
          <h2 className="mb-4 text-sm font-semibold text-fg">{t("finance.dashboard.dailyIncomeTitle")}</h2>
          {loading ? (
            <Skeleton className="h-[220px] w-full rounded-card" />
          ) : dailyIncome.length === 0 ? (
            <ChartEmpty text={t("finance.dashboard.noPaymentsThisMonth")} />
          ) : (
            <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
              <BarChart data={dailyIncome}>
                <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} vertical={false} />
                <XAxis
                  dataKey="day"
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 12, fill: CHART_COLORS.label }}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 12, fill: CHART_COLORS.label }}
                  tickFormatter={formatAmountShort}
                />
                <Tooltip content={<ChartTooltip />} cursor={{ fill: CHART_COLORS.grid }} />
                <Bar
                  dataKey="amount"
                  name={t("finance.dashboard.incomeLegend")}
                  fill={CHART_COLORS.accent}
                  radius={[4, 4, 0, 0]}
                  maxBarSize={24}
                />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>

        <Card padding="p-0">
          <div className="flex items-center justify-between px-5 py-4">
            <h2 className="text-sm font-semibold text-fg">{t("finance.dashboard.recentTitle")}</h2>
            <button
              type="button"
              onClick={onGoToPayments}
              className="text-sm font-medium text-accent-dark hover:underline"
            >
              {t("finance.dashboard.viewAll")}
            </button>
          </div>
          {loading ? (
            <div className="flex flex-col gap-2 px-5 pb-5">
              {Array.from({ length: 3 }).map((_, index) => (
                <Skeleton key={index} className="h-8 w-full" />
              ))}
            </div>
          ) : recent.length === 0 ? (
            <div className="border-t border-line">
              <ChartEmpty text={t("finance.dashboard.noRecentPayments")} />
            </div>
          ) : (
            <ul className="divide-y divide-line border-t border-line">
              {recent.map((payment) => (
                <li
                  key={payment.id}
                  className="flex items-center justify-between gap-3 px-5 py-3"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-fg">
                      {payment.student_full_name}
                    </p>
                    <p className="text-xs text-fg-muted">{formatDate(payment.payment_date)}</p>
                  </div>
                  <div className="flex flex-shrink-0 items-center gap-3">
                    <Badge variant={METHOD_BADGE[payment.method] || "neutral"}>
                      {METHOD_LABELS[payment.method] ? t(METHOD_LABELS[payment.method]) : payment.method}
                    </Badge>
                    <span className="text-sm font-semibold text-fg">
                      {formatMoneyI18n(payment.amount, t)}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </>
  );
}

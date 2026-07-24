import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { BarChart3 } from "lucide-react";
import { getDashboardAnalytics } from "../../api/dashboard";
import Card from "../ui/Card";
import EmptyState from "../ui/EmptyState";
import Select from "../ui/Select";
import Skeleton from "../ui/Skeleton";
import { toast } from "../ui/Toast";
import { getErrorMessage } from "../../utils/apiError";
import ChartTooltip from "../moliya/ChartTooltip";
import {
  CHART_COLORS,
  formatAmountShort,
  formatCount,
  formatMoney,
  getMonthNames,
} from "../../constants/moliya";

const CHART_HEIGHT = 220;
const PERIOD_OPTIONS = [3, 6, 12, 24];

// "2026-01" -> localized month name for the X axis. Month-only keeps the axis
// legible across 3..24 columns; the tooltip carries the same short label.
function monthLabel(value) {
  if (!value) return "";
  const month = Number(String(value).slice(5, 7));
  return getMonthNames()[month - 1] || value;
}

// Same empty treatment as the finance charts, scaled down for a card slot.
function ChartEmpty({ text }) {
  const { t } = useTranslation();
  return (
    <EmptyState
      size="sm"
      icon={BarChart3}
      title={t("pages.dashboard.analytics.noData")}
      description={text}
    />
  );
}

export default function DashboardAnalytics({ filialId, academicYearId }) {
  const { t } = useTranslation();
  const [period, setPeriod] = useState(12);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadAnalytics = useCallback(async () => {
    setLoading(true);
    try {
      setAnalytics(
        await getDashboardAnalytics({
          months: period,
          filial_id: filialId || undefined,
          academic_year_id: academicYearId || undefined,
        }),
      );
    } catch (error) {
      setAnalytics(null);
      toast.error(getErrorMessage(error, t("pages.dashboard.analytics.loadError")));
    } finally {
      setLoading(false);
    }
  }, [period, filialId, academicYearId, t]);

  useEffect(() => {
    loadAnalytics();
  }, [loadAnalytics]);

  // Decimal fields can arrive as strings — coerce before charting. `net` is not
  // drawn as a series; it only feeds the period-total note under the card.
  const monthly = useMemo(
    () =>
      (analytics?.monthly_finance ?? []).map((row) => ({
        month: monthLabel(row.month),
        income: Number(row.income),
        expense: Number(row.expense),
        net: Number(row.net),
      })),
    [analytics],
  );

  const growth = useMemo(
    () =>
      (analytics?.student_growth ?? []).map((row) => ({
        month: monthLabel(row.month),
        count: Number(row.count),
      })),
    [analytics],
  );

  const attendance = useMemo(
    () =>
      (analytics?.attendance_trend ?? []).map((row) => ({
        month: monthLabel(row.month),
        rate: row.rate == null ? null : Math.round(row.rate * 100),
      })),
    [analytics],
  );

  const netTotal = useMemo(
    () => monthly.reduce((sum, row) => sum + row.net, 0),
    [monthly],
  );

  const financeEmpty = monthly.length === 0 || monthly.every((r) => r.income === 0 && r.expense === 0);
  const growthEmpty = growth.length === 0 || growth.every((r) => r.count === 0);
  const attendanceEmpty = attendance.length === 0 || attendance.every((r) => r.rate == null);

  return (
    <div className="mt-6 flex flex-col gap-6">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-fg">{t("pages.dashboard.analytics.title")}</h2>
        <Select
          className="w-full max-w-[200px]"
          value={period}
          onChange={(event) => setPeriod(Number(event.target.value))}
        >
          {PERIOD_OPTIONS.map((value) => (
            <option key={value} value={value}>
              {t(`pages.dashboard.analytics.last${value}Months`)}
            </option>
          ))}
        </Select>
      </div>

      <Card>
        <h2 className="mb-4 text-sm font-semibold text-fg">
          {t("pages.dashboard.analytics.incomeExpenseTitle")}
        </h2>
        {loading ? (
          <Skeleton className="h-[220px] w-full rounded-card" />
        ) : financeEmpty ? (
          <ChartEmpty text={t("pages.dashboard.analytics.noPeriodData")} />
        ) : (
          <>
            <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
              <BarChart data={monthly}>
                <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} vertical={false} />
                <XAxis
                  dataKey="month"
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
                <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
                <Bar
                  dataKey="income"
                  name={t("pages.dashboard.analytics.income")}
                  fill={CHART_COLORS.success}
                  radius={[4, 4, 0, 0]}
                  maxBarSize={28}
                />
                <Bar
                  dataKey="expense"
                  name={t("pages.dashboard.analytics.expense")}
                  fill={CHART_COLORS.danger}
                  radius={[4, 4, 0, 0]}
                  maxBarSize={28}
                />
              </BarChart>
            </ResponsiveContainer>
            <p className="mt-2 text-xs text-fg-faint">
              {t("pages.dashboard.analytics.netTotal", { amount: formatMoney(netTotal) })}
            </p>
          </>
        )}
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <h2 className="mb-4 text-sm font-semibold text-fg">
            {t("pages.dashboard.analytics.studentGrowthTitle")}
          </h2>
          {loading ? (
            <Skeleton className="h-[220px] w-full rounded-card" />
          ) : growthEmpty ? (
            <ChartEmpty text={t("pages.dashboard.analytics.noPeriodData")} />
          ) : (
            <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
              <AreaChart data={growth}>
                <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} vertical={false} />
                <XAxis
                  dataKey="month"
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
                  content={<ChartTooltip formatter={(value) => formatCount(value)} />}
                  cursor={{ fill: CHART_COLORS.grid }}
                />
                <Area
                  type="monotone"
                  dataKey="count"
                  name={t("pages.dashboard.analytics.students")}
                  stroke={CHART_COLORS.blue}
                  fill={CHART_COLORS.blue}
                  fillOpacity={0.12}
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </Card>

        <Card>
          <h2 className="mb-4 text-sm font-semibold text-fg">
            {t("pages.dashboard.analytics.attendanceTrendTitle")}
          </h2>
          {loading ? (
            <Skeleton className="h-[220px] w-full rounded-card" />
          ) : attendanceEmpty ? (
            <ChartEmpty text={t("pages.dashboard.analytics.noPeriodData")} />
          ) : (
            <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
              <LineChart data={attendance}>
                <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} vertical={false} />
                <XAxis
                  dataKey="month"
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 12, fill: CHART_COLORS.label }}
                />
                <YAxis
                  domain={[0, 100]}
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 12, fill: CHART_COLORS.label }}
                  tickFormatter={(value) => `${value}%`}
                />
                <Tooltip
                  content={<ChartTooltip formatter={(value) => `${Math.round(value)}%`} />}
                  cursor={{ fill: CHART_COLORS.grid }}
                />
                <Line
                  type="monotone"
                  dataKey="rate"
                  name={t("pages.dashboard.analytics.rate")}
                  stroke={CHART_COLORS.teal}
                  strokeWidth={2}
                  dot={false}
                  connectNulls
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </Card>
      </div>
    </div>
  );
}

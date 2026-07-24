import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { BarChart3 } from "lucide-react";
import { getMarketingStats } from "../../api/marketing";
import { listFilials } from "../../api/filials";
import Card from "../ui/Card";
import EmptyState from "../ui/EmptyState";
import FilterBar from "../ui/FilterBar";
import Input from "../ui/Input";
import Select from "../ui/Select";
import Skeleton from "../ui/Skeleton";
import { toast } from "../ui/Toast";
import { getErrorMessage, isModuleDisabledError } from "../../utils/apiError";
import ChartTooltip from "../moliya/ChartTooltip";
import {
  CHART_COLORS,
  currentMonthValue,
  formatAmountShort,
  formatCount,
  formatMoney,
  formatMonth,
} from "../../constants/moliya";
import { CHANNEL_LABELS } from "../../constants/marketing";

const CHART_HEIGHT = 220;

// Same empty treatment as every table on the page, scaled down for a card slot.
function ChartEmpty({ text }) {
  const { t } = useTranslation();
  return <EmptyState size="sm" icon={BarChart3} title={t("growth.dashboard.noData")} description={text} />;
}

// "2026-07" -> ["2026-07-01", "2026-07-31"] for the date_from/date_to filters.
function monthRange(monthValue) {
  if (!monthValue) return [undefined, undefined];
  const [year, month] = monthValue.split("-").map(Number);
  const lastDay = new Date(year, month, 0).getDate();
  return [`${monthValue}-01`, `${monthValue}-${String(lastDay).padStart(2, "0")}`];
}

function BarRow({ label, value, maxValue, valueText, hint }) {
  const width = maxValue > 0 ? (value / maxValue) * 100 : 0;
  return (
    <div className="flex items-center gap-3">
      <span className="w-28 flex-shrink-0 truncate text-sm text-fg-secondary">{label}</span>
      <div className="h-2 flex-1 overflow-hidden rounded-full bg-surface-sunken">
        <div className="h-full rounded-full bg-accent" style={{ width: `${width}%` }} />
      </div>
      <div className="w-32 flex-shrink-0 text-right">
        <span className="text-sm font-medium text-fg">{valueText}</span>
        {hint && <p className="text-xs text-fg-faint">{hint}</p>}
      </div>
    </div>
  );
}

export default function MarketingDashboardTab() {
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
          toast.error(getErrorMessage(error, t("growth.dashboard.toastFilialsError")));
        }
      });
  }, [t]);

  const loadStats = useCallback(async () => {
    setLoading(true);
    const [dateFrom, dateTo] = monthRange(month);
    try {
      setData(
        await getMarketingStats({
          date_from: dateFrom,
          date_to: dateTo,
          filial_id: filialId || undefined,
        }),
      );
    } catch (error) {
      setData(null);
      if (!isModuleDisabledError(error)) {
        toast.error(getErrorMessage(error, t("growth.dashboard.toastStatsError")));
      }
    } finally {
      setLoading(false);
    }
  }, [month, filialId, t]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  const funnel = useMemo(() => {
    if (!data) return [];
    const rows = [
      { label: t("growth.dashboard.reach"), value: Number(data.total_reach || 0) },
      { label: t("growth.dashboard.click"), value: Number(data.total_clicks || 0) },
      { label: t("growth.dashboard.lead"), value: Number(data.total_leads || 0) },
      { label: t("growth.dashboard.student"), value: Number(data.converted_students || 0) },
    ];
    return rows.some((row) => row.value > 0) ? rows : [];
  }, [data, t]);

  const channelData = useMemo(
    () =>
      (data?.by_channel || []).map((row) => ({
        label: CHANNEL_LABELS[row.channel] ? t(CHANNEL_LABELS[row.channel]) : row.channel,
        cost: Number(row.cost || 0),
        leads: Number(row.leads || 0),
      })),
    [data, t],
  );
  const hasChannelData = channelData.some((row) => row.cost > 0 || row.leads > 0);

  const topBloggers = useMemo(() => (data?.top_bloggers || []).slice(0, 5), [data]);
  const maxBloggerLeads = useMemo(
    () => Math.max(1, ...topBloggers.map((row) => Number(row.leads || 0))),
    [topBloggers],
  );

  const monthly = useMemo(
    () =>
      (data?.monthly || []).map((row) => ({
        month: row.month,
        cost: Number(row.cost || 0),
        leads: Number(row.leads || 0),
      })),
    [data],
  );

  return (
    <>
      <FilterBar>
        <Select
          label={t("growth.dashboard.filialLabel")}
          className="w-full max-w-[220px]"
          value={filialId}
          onChange={(event) => setFilialId(event.target.value)}
        >
          <option value="">{t("growth.dashboard.filialAll")}</option>
          {filials.map((filial) => (
            <option key={filial.id} value={filial.id}>
              {filial.name}
            </option>
          ))}
        </Select>
        <Input
          label={t("growth.dashboard.monthLabel")}
          type="month"
          className="w-full max-w-[180px]"
          value={month}
          onChange={(event) => setMonth(event.target.value)}
        />
      </FilterBar>

      <div className="flex flex-col gap-6">
        <Card>
          <h2 className="mb-4 text-sm font-semibold text-fg">{t("growth.dashboard.funnelTitle")}</h2>
          {loading ? (
            <Skeleton className="h-[220px] w-full rounded-card" />
          ) : funnel.length === 0 ? (
            <ChartEmpty text={t("growth.dashboard.funnelEmpty")} />
          ) : (
            <div className="flex flex-col gap-2.5">
              {funnel.map((row, index) => {
                const previous = index > 0 ? funnel[index - 1].value : 0;
                const stepPercent =
                  index > 0 && previous > 0 ? Math.round((row.value / previous) * 100) : null;
                return (
                  <div key={row.label} className="flex flex-col gap-2.5">
                    {stepPercent !== null && (
                      <p className="ml-28 pl-3 text-xs text-fg-faint">↓ {stepPercent}%</p>
                    )}
                    <BarRow
                      label={row.label}
                      value={row.value}
                      maxValue={funnel[0].value}
                      valueText={formatAmountShort(row.value)}
                    />
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        <Card>
          <h2 className="mb-4 text-sm font-semibold text-fg">{t("growth.dashboard.channelTitle")}</h2>
          {loading ? (
            <Skeleton className="h-[220px] w-full rounded-card" />
          ) : !hasChannelData ? (
            <ChartEmpty text={t("growth.dashboard.channelEmpty")} />
          ) : (
            <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
              <BarChart data={channelData}>
                <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} vertical={false} />
                <XAxis
                  dataKey="label"
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 12, fill: CHART_COLORS.label }}
                />
                <YAxis
                  yAxisId="left"
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 12, fill: CHART_COLORS.label }}
                  tickFormatter={formatAmountShort}
                />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  allowDecimals={false}
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 12, fill: CHART_COLORS.label }}
                />
                <Tooltip content={<ChartTooltip />} cursor={{ fill: CHART_COLORS.grid }} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
                <Bar
                  yAxisId="left"
                  dataKey="cost"
                  name={t("growth.dashboard.cost")}
                  fill={CHART_COLORS.accent}
                  radius={[4, 4, 0, 0]}
                  maxBarSize={40}
                />
                <Bar
                  yAxisId="right"
                  dataKey="leads"
                  name={t("growth.dashboard.lead")}
                  fill={CHART_COLORS.blue}
                  radius={[4, 4, 0, 0]}
                  maxBarSize={40}
                />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>

        <Card>
          <h2 className="mb-4 text-sm font-semibold text-fg">{t("growth.dashboard.topBloggersTitle")}</h2>
          {loading ? (
            <div className="flex flex-col gap-2">
              {Array.from({ length: 3 }).map((_, index) => (
                <Skeleton key={index} className="h-6 w-full" />
              ))}
            </div>
          ) : topBloggers.length === 0 ? (
            <ChartEmpty text={t("growth.dashboard.topBloggersEmpty")} />
          ) : (
            <div className="flex flex-col gap-2.5">
              {topBloggers.map((row) => (
                <BarRow
                  key={row.blogger_id}
                  label={`@${row.username}`}
                  value={Number(row.leads || 0)}
                  maxValue={maxBloggerLeads}
                  valueText={formatCount(row.leads)}
                  hint={t("growth.dashboard.cplHint", {
                    value: row.cpl === null || row.cpl === undefined ? "—" : formatMoney(row.cpl),
                  })}
                />
              ))}
            </div>
          )}
        </Card>

        <Card>
          <h2 className="mb-4 text-sm font-semibold text-fg">{t("growth.dashboard.monthlyTitle")}</h2>
          {loading ? (
            <Skeleton className="h-[220px] w-full rounded-card" />
          ) : monthly.length === 0 ? (
            <ChartEmpty text={t("growth.dashboard.monthlyEmpty")} />
          ) : (
            <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
              <BarChart data={monthly}>
                <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} vertical={false} />
                <XAxis
                  dataKey="month"
                  tickFormatter={formatMonth}
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 12, fill: CHART_COLORS.label }}
                />
                <YAxis
                  yAxisId="left"
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 12, fill: CHART_COLORS.label }}
                  tickFormatter={formatAmountShort}
                />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  allowDecimals={false}
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 12, fill: CHART_COLORS.label }}
                />
                <Tooltip content={<ChartTooltip />} cursor={{ fill: CHART_COLORS.grid }} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
                <Bar
                  yAxisId="left"
                  dataKey="cost"
                  name={t("growth.dashboard.cost")}
                  fill={CHART_COLORS.accent}
                  radius={[4, 4, 0, 0]}
                  maxBarSize={24}
                />
                <Bar
                  yAxisId="right"
                  dataKey="leads"
                  name={t("growth.dashboard.lead")}
                  fill={CHART_COLORS.blue}
                  radius={[4, 4, 0, 0]}
                  maxBarSize={24}
                />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>
      </div>
    </>
  );
}

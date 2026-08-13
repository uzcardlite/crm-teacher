import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Banknote } from "lucide-react";
import { getMyPayroll, getMyPayrollHistory } from "../../api/payroll";
import Card from "../../components/ui/Card";
import EmptyState from "../../components/ui/EmptyState";
import Input from "../../components/ui/Input";
import KoshinStar from "../../components/ui/KoshinStar";
import Skeleton from "../../components/ui/Skeleton";
import Table from "../../components/ui/Table";
import { toast } from "../../components/ui/Toast";
import { getErrorMessage } from "../../utils/apiError";
import { cn } from "../../utils/cn";
import { formatMoney, formatMonth, groupThousands } from "../../utils/format";

const PAGE_CLASS = "mx-auto max-w-lg space-y-4 px-4 pb-24 pt-4";

function currentMonth() {
  return new Date().toISOString().slice(0, 7);
}

// One-line explanation of how the month's total was produced, per salary type.
function rateHint(t, history, sessionsTotal) {
  if (!history?.salary_type || history.salary_amount == null) return null;
  const rate = groupThousands(Number(history.salary_amount));
  switch (history.salary_type) {
    case "hourly":
      return t("teacher.salary.hintHourly", { sessions: sessionsTotal, rate });
    case "fixed":
      return t("teacher.salary.hintFixed", { rate });
    case "percentage":
      return t("teacher.salary.hintPercentage", { percent: rate });
    default:
      return null;
  }
}

// Horizontal single-series bar list: month label, thin accent bar scaled to
// the 6-month max, value in text tokens. Tapping a row loads that month.
function HistoryChart({ months, activeMonth, onSelect }) {
  const { t } = useTranslation();
  const max = Math.max(...months.map((m) => Number(m.total_amount) || 0));

  return (
    <Card padding="p-4" className="space-y-1">
      <h2 className="pb-2 text-xs font-semibold uppercase tracking-wide text-fg-muted">
        {t("teacher.salary.historyTitle")}
      </h2>
      <ul>
        {months.map((item) => {
          const amount = Number(item.total_amount) || 0;
          const isActive = item.month === activeMonth;
          const widthPct = max > 0 ? Math.max((amount / max) * 100, amount > 0 ? 4 : 0) : 0;
          return (
            <li key={item.month}>
              <button
                type="button"
                onClick={() => onSelect(item.month)}
                aria-label={`${formatMonth(item.month)}: ${formatMoney(amount)}`}
                aria-pressed={isActive}
                className={cn(
                  "grid w-full grid-cols-[72px_1fr_auto] items-center gap-2 rounded-btn px-1.5 py-2 text-left transition-colors",
                  isActive ? "bg-accent-light/20" : "hover:bg-surface-sunken",
                )}
              >
                <span
                  className={cn(
                    "truncate text-xs",
                    isActive ? "font-semibold text-fg" : "text-fg-muted",
                  )}
                >
                  {formatMonth(item.month)}
                </span>
                <span className="h-2 overflow-hidden">
                  {amount > 0 && (
                    <span
                      className={cn(
                        "block h-full rounded-r",
                        isActive ? "bg-accent" : "bg-accent/50 dark:bg-accent/40",
                      )}
                      style={{ width: `${widthPct}%` }}
                    />
                  )}
                </span>
                <span
                  className={cn(
                    "text-xs tabular-nums",
                    isActive ? "font-semibold text-fg" : "text-fg-muted",
                  )}
                >
                  {amount > 0 ? groupThousands(amount) : "—"}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}

// The teacher's OWN payroll only — no centre finance, no other teacher, no
// student payments, and never a finalize action.
export default function Salary() {
  const { t } = useTranslation();
  const [month, setMonth] = useState(currentMonth());
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [history, setHistory] = useState(null);

  useEffect(() => {
    getMyPayrollHistory()
      .then(setHistory)
      .catch(() => setHistory(null));
  }, []);

  useEffect(() => {
    setLoading(true);
    getMyPayroll(month)
      .then(setData)
      .catch((error) => {
        setData(null);
        toast.error(getErrorMessage(error, t("teacher.salary.loadError")));
      })
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [month]);

  const columns = [
    { key: "group_name", header: t("teacher.salary.groupColumn"), truncate: true },
    { key: "sessions_count", header: t("teacher.salary.sessionsColumn"), align: "right", nowrap: true },
    {
      key: "subtotal",
      header: t("teacher.salary.subtotalColumn"),
      align: "right",
      nowrap: true,
      render: (row) => formatMoney(row.subtotal),
    },
  ];

  const breakdown = data?.breakdown || [];
  const sessionsTotal = breakdown.reduce((sum, item) => sum + (item.sessions_count || 0), 0);
  const isEmpty = data && Number(data.total_amount) === 0 && breakdown.length === 0;
  const hint = rateHint(t, history, sessionsTotal);

  return (
    <div className={PAGE_CLASS}>
      <Input
        label={t("teacher.salary.monthLabel")}
        type="month"
        className="w-full max-w-[180px]"
        value={month}
        onChange={(event) => setMonth(event.target.value)}
        disabled={loading}
      />

      {loading || !data ? (
        <>
          <div className="grid grid-cols-2 gap-3">
            <Card padding="p-4" className="flex flex-col gap-2">
              <Skeleton className="h-8 w-8 rounded-btn" />
              <Skeleton className="h-6 w-20" />
            </Card>
            <Card padding="p-4" className="flex flex-col gap-2">
              <Skeleton className="h-8 w-8 rounded-btn" />
              <Skeleton className="h-6 w-12" />
            </Card>
          </div>
          <Table columns={columns} loading />
        </>
      ) : isEmpty ? (
        <EmptyState
          size="md"
          icon={Banknote}
          title={t("teacher.salary.emptyTitle")}
          description={t("teacher.salary.emptyDescription")}
        />
      ) : (
        <>
          {/* Gilt-on-feruza hero: the month's calculated salary is the payoff,
              set in the heritage serif, with sessions as the secondary metric
              and a koshin watermark. */}
          <div className="relative overflow-hidden rounded-card bg-gradient-feruza px-5 py-5 text-white shadow-card">
            <KoshinStar
              size={140}
              strokeWidth={4}
              className="pointer-events-none absolute -bottom-12 -right-8 text-accent-light/20"
            />
            <div className="relative flex items-center justify-between gap-4">
              <div className="min-w-0">
                <p className="flex items-center gap-1.5 text-xs font-medium text-white/75">
                  <Banknote size={15} />
                  {t("teacher.salary.calculatedSalary")}
                </p>
                <p className="mt-1 truncate font-display text-3xl font-semibold tracking-wide tabular-nums">
                  {formatMoney(data.total_amount)}
                </p>
              </div>
              <div className="shrink-0 border-l border-white/25 pl-4 text-right">
                <p className="font-display text-2xl font-semibold tabular-nums">{sessionsTotal}</p>
                <p className="text-[11px] font-medium text-white/75">
                  {t("teacher.salary.sessionsGiven")}
                </p>
              </div>
            </div>
          </div>
          {hint && <p className="px-0.5 text-xs text-fg-muted">{hint}</p>}
          {breakdown.length > 0 && (
            <Table columns={columns} data={breakdown} rowKey={(row) => row.group_id} />
          )}
        </>
      )}

      {history?.months?.length > 0 && (
        <HistoryChart months={history.months} activeMonth={month} onSelect={setMonth} />
      )}
    </div>
  );
}

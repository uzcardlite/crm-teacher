import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Banknote, Calculator, Eye, EyeOff } from "lucide-react";
import { getMyPayroll, getMyPayrollHistory } from "../../api/payroll";
import Card from "../../components/ui/Card";
import MonthSwitcher from "../../components/ui/MonthSwitcher";
import PageTitle from "../../components/ui/PageTitle";
import EmptyState from "../../components/ui/EmptyState";
import Skeleton from "../../components/ui/Skeleton";
import Table from "../../components/ui/Table";
import { toast } from "../../components/ui/Toast";
import { getErrorMessage } from "../../utils/apiError";
import { cn } from "../../utils/cn";
import { formatDateTime, formatMoney, formatMonth, groupThousands } from "../../utils/format";

const PAGE_CLASS = "mx-auto max-w-lg space-y-4 px-4 pb-24 pt-5";

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
// the 6-month max, value in text tokens. Tapping a row loads that month. Only
// published months ever reach this list — the backend never returns the rest.
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
// student payments, and never a finalize action. The cabinet no longer
// calculates anything itself: a month is either published (an administrator
// finalized it AND chose to show it) or it simply carries no amount.
export default function Salary() {
  const { t } = useTranslation();
  const [month, setMonth] = useState(currentMonth());
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [history, setHistory] = useState(null);
  // Masked by default on every visit, same as the old dashboard pocket —
  // someone glancing over a shoulder should not see a bare number.
  const [amountVisible, setAmountVisible] = useState(false);

  useEffect(() => {
    getMyPayrollHistory()
      .then(setHistory)
      .catch(() => setHistory(null));
  }, []);

  useEffect(() => {
    setLoading(true);
    setAmountVisible(false);
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

  const breakdown = data?.published ? data.breakdown || [] : [];
  const sessionsTotal = data?.published
    ? (data.sessions_count ?? breakdown.reduce((sum, item) => sum + (item.sessions_count || 0), 0))
    : 0;
  const hint = rateHint(t, history, sessionsTotal);

  return (
    <div className={PAGE_CLASS}>
      <PageTitle title={t("teacher.nav.salary")} />
      {/* month is "YYYY-MM"; the switcher speaks "YYYY-MM-01" */}
      <MonthSwitcher value={`${month}-01`} onChange={(value) => setMonth(value.slice(0, 7))} />

      {loading || !data ? (
        <>
          <Skeleton className="h-28 w-full rounded-card" />
          <Table columns={columns} loading />
        </>
      ) : !data.published ? (
        <EmptyState
          size="md"
          icon={Calculator}
          title={t("teacher.salary.notPublishedTitle")}
          description={t("teacher.salary.notPublishedDescription")}
        />
      ) : (
        <>
          {/* The month's published salary: a calm card, big figure, sessions
              beside it. The eye masks the amount without reloading. */}
          <Card padding="p-4" className="relative">
            <button
              type="button"
              onClick={() => setAmountVisible((v) => !v)}
              aria-label={t(amountVisible ? "teacher.dashboard.hideSalary" : "teacher.dashboard.showSalary")}
              className="absolute right-3 top-3 flex h-10 w-10 items-center justify-center rounded-full text-fg-muted transition-colors hover:bg-surface-sunken"
            >
              {amountVisible ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
            <p className="flex items-center gap-1.5 text-[13px] font-medium text-fg-muted">
              <Banknote size={15} />
              {t("teacher.salary.calculatedSalary")}
            </p>
            <p className="mt-1 truncate text-[32px] font-bold tracking-tight tabular-nums text-fg">
              {amountVisible ? formatMoney(data.total_amount) : "•• ••• •••"}
            </p>
            <div className="mt-3 flex items-center justify-between border-t border-line pt-3 text-[15px]">
              <span className="text-fg-secondary">{t("teacher.salary.sessionsGiven")}</span>
              <span className="font-semibold tabular-nums text-fg">{sessionsTotal}</span>
            </div>
            {data.published_at && (
              <p className="mt-2 text-xs text-fg-muted">
                {t("teacher.salary.publishedAt", { date: formatDateTime(data.published_at) })}
              </p>
            )}
          </Card>
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

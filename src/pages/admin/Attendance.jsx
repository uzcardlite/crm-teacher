import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { CheckCheck, Clock } from "lucide-react";
import { getMonthlyReport } from "../../api/attendance";
import { listGroups } from "../../api/groups";
import DailyAttendance from "../../components/attendance/DailyAttendance";
import Avatar from "../../components/ui/Avatar";
import Badge from "../../components/ui/Badge";
import EmptyState from "../../components/ui/EmptyState";
import FilterBar from "../../components/ui/FilterBar";
import PageHeader from "../../components/ui/PageHeader";
import Select from "../../components/ui/Select";
import Skeleton from "../../components/ui/Skeleton";
import Tabs from "../../components/ui/Tabs";
import { toast } from "../../components/ui/Toast";
import { statusVariant } from "../../constants/status";
import { getErrorMessage } from "../../utils/apiError";
import { getMonthNames } from "../../utils/format";
import { cn } from "../../utils/cn";

// Report cells reuse Table's density so the two tables read as one system.
const CELL_CLASS = "px-4 py-3";

export default function Attendance() {
  const { t } = useTranslation();

  // Clock is a lucide node, not a glyph — the other two stay as symbols because
  // there is no 24px-safe icon pair for them at this cell size.
  const STATUS_SYMBOL = {
    present: { symbol: "✓", label: t("status.arrived"), className: "bg-success-bg text-success" },
    absent: { symbol: "✗", label: t("status.notArrived"), className: "bg-danger-bg text-danger" },
    late: {
      symbol: <Clock size={12} />,
      label: t("status.late"),
      className: "bg-accent-light/40 text-accent-dark",
    },
  };

  const VIEW_TABS = [
    { key: "daily", label: t("pages.attendance.tabs.daily") },
    { key: "report", label: t("pages.attendance.tabs.report") },
  ];

  const [searchParams, setSearchParams] = useSearchParams();
  const viewParam = searchParams.get("view");
  const view = VIEW_TABS.some((tab) => tab.key === viewParam) ? viewParam : "daily";

  function setView(key) {
    const next = new URLSearchParams(searchParams);
    next.set("view", key);
    setSearchParams(next, { replace: true });
  }

  const [groups, setGroups] = useState([]);
  const [reportGroupId, setReportGroupId] = useState("");

  const now = new Date();
  const [reportYear, setReportYear] = useState(now.getFullYear());
  const [reportMonth, setReportMonth] = useState(now.getMonth() + 1);
  const [report, setReport] = useState([]);
  const [loadingReport, setLoadingReport] = useState(false);

  useEffect(() => {
    listGroups({ page: 1, size: 100 })
      .then((data) => setGroups(data.items))
      .catch((error) => toast.error(getErrorMessage(error, t("pages.attendance.groupsError"))));
  }, []);

  useEffect(() => {
    if (!reportGroupId || view !== "report") return;
    loadReport();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reportGroupId, reportYear, reportMonth, view]);

  async function loadReport() {
    setLoadingReport(true);
    try {
      const data = await getMonthlyReport({
        group_id: reportGroupId,
        year: reportYear,
        month: reportMonth,
      });
      setReport(data);
    } catch (error) {
      toast.error(getErrorMessage(error, t("pages.attendance.reportError")));
    } finally {
      setLoadingReport(false);
    }
  }

  const daysInMonth = useMemo(
    () => new Date(reportYear, reportMonth, 0).getDate(),
    [reportYear, reportMonth],
  );
  const reportDays = useMemo(
    () =>
      Array.from({ length: daysInMonth }, (_, index) => {
        const day = index + 1;
        const iso = `${reportYear}-${String(reportMonth).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
        return { day, iso };
      }),
    [daysInMonth, reportYear, reportMonth],
  );

  return (
    <div className="p-6">
      <PageHeader title={t("nav.attendance")} />

      <Tabs className="mb-4 w-fit" tabs={VIEW_TABS} value={view} onChange={setView} />

      {view === "daily" ? (
        <DailyAttendance />
      ) : (
        <>
          <FilterBar>
            <Select
              label={t("pages.attendance.group")}
              className="w-full max-w-[240px]"
              value={reportGroupId}
              onChange={(event) => setReportGroupId(event.target.value)}
            >
              <option value="">{t("pages.attendance.selectGroup")}</option>
              {groups.map((group) => (
                <option key={group.id} value={group.id}>
                  {group.name}
                </option>
              ))}
            </Select>
            <Select
              label={t("pages.attendance.month")}
              className="w-full max-w-[160px]"
              value={reportMonth}
              onChange={(event) => setReportMonth(Number(event.target.value))}
            >
              {getMonthNames().map((name, index) => (
                <option key={name} value={index + 1}>
                  {name}
                </option>
              ))}
            </Select>
            <Select
              label={t("pages.attendance.year")}
              className="w-full max-w-[120px]"
              value={reportYear}
              onChange={(event) => setReportYear(Number(event.target.value))}
            >
              {[now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1].map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </Select>
          </FilterBar>

          {!reportGroupId ? (
            <EmptyState
              icon={CheckCheck}
              title={t("pages.attendance.selectGroup")}
              description={t("pages.attendance.selectGroupDescription")}
            />
          ) : loadingReport ? (
            <div className="overflow-hidden rounded-card border border-line bg-surface">
              {Array.from({ length: 6 }).map((_, rowIndex) => (
                <div
                  key={rowIndex}
                  className="flex items-center gap-2 border-b border-line px-4 py-3 last:border-0"
                >
                  <Skeleton className="h-4 w-40 flex-shrink-0" />
                  {Array.from({ length: 12 }).map((__, cellIndex) => (
                    <Skeleton key={cellIndex} className="h-6 w-6 flex-shrink-0 rounded-full" />
                  ))}
                </div>
              ))}
            </div>
          ) : report.length === 0 ? (
            <EmptyState
              icon={CheckCheck}
              title={t("pages.attendance.noStudentsTitle")}
              description={t("pages.attendance.noStudentsDescription")}
            />
          ) : (
            <>
              <div className="mb-3 flex flex-wrap items-center gap-2">
                {Object.values(STATUS_SYMBOL).map((cell) => (
                  <Badge key={cell.label} variant={statusVariant(cell.label)}>
                    {cell.label}
                  </Badge>
                ))}
              </div>
              <div className="overflow-x-auto rounded-card border border-line bg-surface">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-line bg-surface-sunken">
                      <th
                        className={cn(
                          "sticky left-0 whitespace-nowrap bg-surface-sunken text-left font-medium text-fg-muted",
                          CELL_CLASS,
                        )}
                      >
                        {t("pages.attendance.columns.student")}
                      </th>
                      {reportDays.map(({ day }) => (
                        <th
                          key={day}
                          className="min-w-[36px] px-1 py-3 text-center font-medium tabular-nums text-fg-muted"
                        >
                          {day}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {report.map((row) => (
                      <tr
                        key={row.student_id}
                        className="border-b border-line transition-colors last:border-0 hover:bg-surface-sunken"
                      >
                        <td
                          className={cn(
                            "sticky left-0 whitespace-nowrap bg-surface text-fg-secondary",
                            CELL_CLASS,
                          )}
                        >
                          <span className="flex items-center gap-2">
                            {/* `row.photo_url` is not returned by the monthly
                                report endpoint yet — falls back to initials
                                until the backend adds it, per
                                crm-backend/app/schemas/attendance.py. */}
                            <Avatar
                              photoUrl={row.photo_url}
                              name={row.student_full_name}
                              size="sm"
                              zoomOnHover
                            />
                            {row.student_full_name}
                          </span>
                        </td>
                        {reportDays.map(({ iso }) => {
                          const status = row.days[iso];
                          const cell = status ? STATUS_SYMBOL[status] : null;
                          return (
                            <td key={iso} className="px-1 py-3 text-center">
                              <span
                                className={cn(
                                  "inline-flex h-6 w-6 items-center justify-center rounded-full text-xs",
                                  cell ? cell.className : "text-fg-faint",
                                )}
                                title={cell ? cell.label : undefined}
                              >
                                {cell ? cell.symbol : "—"}
                              </span>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}

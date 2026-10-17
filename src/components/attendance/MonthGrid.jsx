import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { CalendarDays } from "lucide-react";
import { getMyGroupMonthAttendance } from "../../api/teacher";
import EmptyState from "../ui/EmptyState";
import Skeleton from "../ui/Skeleton";
import { cn } from "../../utils/cn";

const CELL = {
  present: { text: "✓", className: "bg-success/15 text-success" },
  late: { text: "K", className: "bg-warning/15 text-warning" },
  absent: { text: "✕", className: "bg-danger/15 text-danger" },
};
const WEEKDAY_UZ = ["Ya", "Du", "Se", "Ch", "Pa", "Ju", "Sh"];

// A group's month at a glance: students down, lesson days across, a mark in
// every cell and each student's attendance rate at the end. The name column
// stays put while the days scroll sideways.
export default function MonthGrid({ groupId, month }) {
  const { t, i18n } = useTranslation();
  const [data, setData] = useState(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!groupId) return undefined;
    let cancelled = false;
    setData(null);
    setError(false);
    getMyGroupMonthAttendance(groupId, month)
      .then((result) => !cancelled && setData(result))
      .catch(() => !cancelled && setError(true));
    return () => {
      cancelled = true;
    };
  }, [groupId, month]);

  if (error) {
    return <EmptyState size="md" icon={CalendarDays} title={t("teacher.attendance.monthError")} />;
  }
  if (!data) return <Skeleton className="h-64 w-full rounded-card" />;
  if (data.days.length === 0 || data.students.length === 0) {
    return <EmptyState size="md" icon={CalendarDays} title={t("teacher.attendance.monthEmpty")} />;
  }

  const weekday = (iso) => {
    const date = new Date(`${iso}T00:00:00`);
    return i18n.language === "ru" ? date.toLocaleDateString("ru-RU", { weekday: "short" }) : WEEKDAY_UZ[date.getDay()];
  };

  return (
    <div className="space-y-2">
      <div className="overflow-hidden rounded-card bg-surface shadow-card">
        <div className="overflow-x-auto">
          <table className="w-full border-separate border-spacing-0 text-sm">
            <thead>
              <tr>
                <th className="sticky left-0 z-10 min-w-[140px] bg-surface px-3 py-2 text-left text-xs font-medium text-fg-muted">
                  {t("teacher.attendance.studentsTitle")}
                </th>
                {data.days.map((day) => (
                  <th key={day.date} className="px-0.5 py-2 text-center text-[11px] font-medium text-fg-muted">
                    <span className="block text-fg">{Number(day.date.slice(8, 10))}</span>
                    {weekday(day.date)}
                  </th>
                ))}
                <th className="px-3 py-2 text-right text-xs font-medium text-fg-muted">%</th>
              </tr>
            </thead>
            <tbody>
              {data.students.map((student) => (
                <tr key={student.student_id}>
                  <td className="sticky left-0 z-10 max-w-[160px] truncate border-t border-line bg-surface px-3 py-2 text-[14px] text-fg">
                    {student.full_name}
                  </td>
                  {data.days.map((day) => {
                    const mark = CELL[student.marks[day.date]];
                    return (
                      <td key={day.date} className="border-t border-line px-0.5 py-1.5 text-center">
                        <span
                          className={cn(
                            "mx-auto flex h-7 w-7 items-center justify-center rounded-md text-[12px] font-semibold",
                            mark ? mark.className : "text-fg-faint",
                          )}
                        >
                          {mark ? mark.text : "·"}
                        </span>
                      </td>
                    );
                  })}
                  <td
                    className={cn(
                      "border-t border-line px-3 py-2 text-right text-[14px] font-semibold tabular-nums",
                      student.rate === null ? "text-fg-faint" : student.rate >= 80 ? "text-success" : student.rate >= 60 ? "text-warning" : "text-danger",
                    )}
                  >
                    {student.rate === null ? "—" : `${student.rate}`}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <p className="flex flex-wrap gap-x-4 gap-y-1 px-1 text-xs text-fg-muted">
        <span><span className="font-semibold text-success">✓</span> {t("teacher.attendance.short.present")}</span>
        <span><span className="font-semibold text-warning">K</span> {t("teacher.attendance.short.late")}</span>
        <span><span className="font-semibold text-danger">✕</span> {t("teacher.attendance.short.absent")}</span>
        <span>· {t("teacher.attendance.notMarked")}</span>
      </p>
    </div>
  );
}

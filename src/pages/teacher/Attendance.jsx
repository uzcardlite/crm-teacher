import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { CheckCheck } from "lucide-react";
import {
  bulkMarkMyAttendance,
  listMyAttendance,
  listMyGroups,
  listMyGroupStudents,
} from "../../api/teacher";
import MonthGrid from "../../components/attendance/MonthGrid";
import UnmarkedBanner from "../../components/attendance/UnmarkedBanner";
import MonthSwitcher, { currentMonthValue } from "../../components/ui/MonthSwitcher";
import PageTitle from "../../components/ui/PageTitle";
import Segmented from "../../components/ui/Segmented";
import Avatar from "../../components/ui/Avatar";
import Button from "../../components/ui/Button";
import Card from "../../components/ui/Card";
import EmptyState from "../../components/ui/EmptyState";
import DateInput from "../../components/ui/DateInput";
import Skeleton from "../../components/ui/Skeleton";
import { toast } from "../../components/ui/Toast";
import { getErrorMessage } from "../../utils/apiError";
import { cn } from "../../utils/cn";

// Same three-state config (and exact token classes) as the admin
// DailyAttendance, so marking looks identical across cabinets.
const STATUS_CONFIG = {
  present: { labelKey: "growth.attendance.statusPresent", activeClass: "bg-success text-white shadow-card" },
  late: { labelKey: "growth.attendance.statusLate", activeClass: "bg-warning text-white shadow-card" },
  absent: { labelKey: "growth.attendance.statusAbsent", activeClass: "bg-danger text-white shadow-card" },
};

const PAGE_CLASS = "mx-auto max-w-lg space-y-4 px-4 pb-24 pt-5";

// The device's own calendar day — toISOString() is UTC, which in Tashkent
// still shows yesterday until 05:00.
function todayISO() {
  const now = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;

export default function Attendance() {
  const { t } = useTranslation();
  const [groups, setGroups] = useState([]);
  // The timetable links here with ?group=&date= for one lesson.
  const [searchParams] = useSearchParams();
  const [groupId, setGroupId] = useState(searchParams.get("group") || "");
  const [date, setDate] = useState(() => {
    const wanted = searchParams.get("date");
    return wanted && ISO_DAY.test(wanted) ? wanted : todayISO();
  });
  const [roster, setRoster] = useState([]);
  // "day": mark one lesson; "month": the whole month as a grid (read-only).
  const [mode, setMode] = useState(searchParams.get("view") === "month" ? "month" : "day");
  const [month, setMonth] = useState(currentMonthValue);
  const [attendanceMap, setAttendanceMap] = useState({});
  const [loadingDaily, setLoadingDaily] = useState(false);
  const [saving, setSaving] = useState(false);
  // Bumped after a save so the unmarked list reloads without a page refresh.
  const [disciplineKey, setDisciplineKey] = useState(0);

  useEffect(() => {
    listMyGroups()
      .then((list) => {
        setGroups(list);
        setGroupId((current) => current || (list[0] ? String(list[0].id) : ""));
      })
      .catch((error) => toast.error(getErrorMessage(error, t("teacher.attendance.groupsError"))));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!groupId) return;
    loadDaily();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupId, date]);

  async function loadDaily() {
    setLoadingDaily(true);
    try {
      const [groupStudents, records] = await Promise.all([
        listMyGroupStudents(groupId),
        listMyAttendance({ group_id: groupId, date }),
      ]);
      setRoster(groupStudents);
      const map = {};
      records.forEach((record) => {
        map[record.student_id] = record.status;
      });
      setAttendanceMap(map);
    } catch (error) {
      toast.error(getErrorMessage(error, t("teacher.attendance.loadError")));
    } finally {
      setLoadingDaily(false);
    }
  }

  function setStatus(studentId, status) {
    setAttendanceMap((prev) => ({ ...prev, [studentId]: status }));
  }

  async function handleSave() {
    if (!groupId) return;
    const records = roster
      .filter((student) => attendanceMap[student.student_id])
      .map((student) => ({
        student_id: student.student_id,
        status: attendanceMap[student.student_id],
      }));

    if (records.length === 0) {
      toast.error(t("teacher.attendance.noStatus"));
      return;
    }

    setSaving(true);
    try {
      await bulkMarkMyAttendance({ group_id: groupId, date, records });
      toast.success(t("teacher.attendance.saved"));
      setDisciplineKey((key) => key + 1);
      await loadDaily();
    } catch (error) {
      toast.error(getErrorMessage(error, t("teacher.attendance.saveError")));
    } finally {
      setSaving(false);
    }
  }

  const selectedGroup = groups.find((group) => String(group.id) === String(groupId));
  const counts = { present: 0, late: 0, absent: 0 };
  roster.forEach((student) => {
    const status = attendanceMap[student.student_id];
    if (status) counts[status] += 1;
  });
  const unmarked = roster.length - counts.present - counts.late - counts.absent;

  function markAllPresent() {
    setAttendanceMap((prev) => {
      const next = { ...prev };
      roster.forEach((student) => {
        if (!next[student.student_id]) next[student.student_id] = "present";
      });
      return next;
    });
  }

  return (
    <div className={PAGE_CLASS}>
      <PageTitle title={t("teacher.nav.attendance")} subtitle={selectedGroup?.name} />
      <Segmented
        options={[
          { value: "day", label: t("teacher.attendance.modeDay") },
          { value: "month", label: t("teacher.attendance.modeMonth") },
        ]}
        value={mode}
        onChange={setMode}
        ariaLabel={t("teacher.nav.attendance")}
      />

      {mode === "month" ? (
        <>
          {groups.length > 0 && (
            <Segmented
              options={groups.map((group) => ({ value: String(group.id), label: group.name }))}
              value={String(groupId)}
              onChange={setGroupId}
              ariaLabel={t("teacher.attendance.groupLabel")}
            />
          )}
          <MonthSwitcher value={month} onChange={setMonth} />
          {groupId ? <MonthGrid groupId={groupId} month={month} /> : null}
        </>
      ) : (
      <>
      <UnmarkedBanner
        refreshKey={disciplineKey}
        onPick={(lesson) => {
          setGroupId(String(lesson.group_id));
          setDate(lesson.date);
        }}
      />

      {/* Group switch: a system-style segmented strip (scrolls when long). */}
      {groups.length > 0 && (
        <div
          role="tablist"
          aria-label={t("teacher.attendance.groupLabel")}
          className="flex gap-0.5 overflow-x-auto rounded-[10px] bg-surface-sunken p-0.5"
        >
          {groups.map((group) => {
            const active = String(group.id) === String(groupId);
            return (
              <button
                key={group.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setGroupId(String(group.id))}
                className={cn(
                  "h-9 min-w-[30%] flex-1 shrink-0 truncate rounded-lg px-3 text-[13px] transition-colors",
                  active ? "bg-surface font-semibold text-fg shadow-card" : "font-medium text-fg-secondary",
                )}
              >
                {group.name}
              </button>
            );
          })}
        </div>
      )}

      <DateInput
        label={t("teacher.attendance.dateLabel")}
        className="w-full"
        value={date}
        onChange={(event) => setDate(event.target.value)}
      />

      {!groupId ? (
        <EmptyState
          size="md"
          icon={CheckCheck}
          title={groups.length === 0 ? t("teacher.attendance.noGroups") : t("teacher.attendance.selectGroupTitle")}
          description={t("teacher.attendance.selectGroupDescription")}
        />
      ) : loadingDaily ? (
        <Card padding="p-0" className="overflow-hidden">
          {Array.from({ length: 5 }).map((_, index) => (
            <div key={index} className="flex items-center justify-between gap-3 border-b border-line px-4 py-3 last:border-0">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-8 w-36 rounded-lg" />
            </div>
          ))}
        </Card>
      ) : roster.length === 0 ? (
        <EmptyState
          size="md"
          icon={CheckCheck}
          title={t("teacher.attendance.emptyTitle")}
          description={t("teacher.attendance.emptyDescription")}
        />
      ) : (
        <>
          {/* Summary: one row of counts, like a system stats strip. */}
          <Card padding="p-0" className="grid grid-cols-4 py-3.5">
            {[
              ["present", counts.present, "text-success"],
              ["late", counts.late, "text-warning"],
              ["absent", counts.absent, "text-danger"],
              ["unmarked", unmarked, "text-fg-muted"],
            ].map(([key, value, tone], index) => (
              <div key={key} className={cn("text-center", index > 0 && "border-l border-line")}>
                <p className={cn("text-[22px] font-bold tabular-nums", tone)}>{value}</p>
                <p className="mt-0.5 text-xs text-fg-muted">{t(`teacher.attendance.short.${key}`)}</p>
              </div>
            ))}
          </Card>

          <div className="flex items-baseline justify-between px-1">
            <p className="text-[13px] uppercase tracking-wide text-fg-muted">
              {selectedGroup ? selectedGroup.name : t("teacher.attendance.studentsTitle")}
            </p>
            {unmarked > 0 && (
              <button type="button" onClick={markAllPresent} className="min-h-[36px] text-[15px] text-accent-dark dark:text-accent">
                {t("teacher.attendance.allPresent")}
              </button>
            )}
          </div>

          <Card padding="p-0" className="overflow-hidden">
            <ul>
              {roster.map((student, index) => {
                const currentStatus = attendanceMap[student.student_id];
                return (
                  <li
                    key={student.student_id}
                    className={cn("flex items-center gap-3 py-2.5 pl-4 pr-3", index > 0 && "border-t border-line")}
                  >
                    <Avatar photoUrl={student.photo_url} name={student.student_full_name} size="sm" zoomOnHover />
                    <span className="min-w-0 flex-1 truncate text-base text-fg">{student.student_full_name}</span>
                    {/* Bor / Kech / Yo'q — one segmented control per student */}
                    <span className="grid shrink-0 grid-cols-3 gap-0.5 rounded-[9px] bg-surface-sunken p-0.5">
                      {Object.entries(STATUS_CONFIG).map(([status, config]) => {
                        const isActive = currentStatus === status;
                        return (
                          <button
                            key={status}
                            type="button"
                            onClick={() => setStatus(student.student_id, status)}
                            aria-label={t(config.labelKey)}
                            aria-pressed={isActive}
                            className={cn(
                              "h-8 w-11 rounded-[7px] text-xs font-semibold transition-colors",
                              isActive ? config.activeClass : "text-fg-muted",
                            )}
                          >
                            {t(`teacher.attendance.short.${status}`)}
                          </button>
                        );
                      })}
                    </span>
                  </li>
                );
              })}
            </ul>
          </Card>
          <Button className="h-12 w-full text-base" onClick={handleSave} disabled={saving}>
            {saving ? t("teacher.common.saving") : t("teacher.common.save")}
          </Button>
        </>
      )}
      </>
      )}
    </div>
  );
}

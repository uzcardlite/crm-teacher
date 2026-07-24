import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Check, CheckCheck, Clock, X } from "lucide-react";
import { bulkMarkAttendance, listAttendance } from "../../api/attendance";
import { listGroupStudents, listGroups } from "../../api/groups";
import Avatar from "../ui/Avatar";
import Button from "../ui/Button";
import EmptyState from "../ui/EmptyState";
import DateInput from "../ui/DateInput";
import Select from "../ui/Select";
import Skeleton from "../ui/Skeleton";
import { toast } from "../ui/Toast";
import { getErrorMessage, isModuleDisabledError } from "../../utils/apiError";
import { cn } from "../../utils/cn";

// `labelKey` is resolved with `t()` at the render site since this is a plain
// module-level config, not a component.
const STATUS_CONFIG = {
  present: {
    labelKey: "growth.attendance.statusPresent",
    icon: Check,
    activeClass: "border-success bg-success text-white",
    idleClass: "border-line-strong text-fg-muted hover:bg-success-bg",
  },
  absent: {
    labelKey: "growth.attendance.statusAbsent",
    icon: X,
    activeClass: "border-danger bg-danger text-white",
    idleClass: "border-line-strong text-fg-muted hover:bg-danger-bg",
  },
  late: {
    labelKey: "growth.attendance.statusLate",
    icon: Clock,
    activeClass: "border-accent bg-accent text-accent-dark",
    idleClass: "border-line-strong text-fg-muted hover:bg-accent-light/30",
  },
};

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

// Index 0 must line up with JS `Date#getDay()` (0 = Sunday) so the lookup
// below is a direct array index, not an off-by-one remap.
const WEEKDAY_KEYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];

// `date` is an ISO "YYYY-MM-DD" string. Parsing it with `new Date(iso)`
// interprets it as UTC midnight, which can shift to the previous local day
// depending on the browser's timezone. Splitting the parts and building the
// date with the local-time constructor keeps the weekday tied to the date
// the user actually picked, not to UTC.
function weekdayKeyFromISO(iso) {
  const [year, month, day] = iso.split("-").map(Number);
  return WEEKDAY_KEYS[new Date(year, month - 1, day).getDay()];
}

export default function DailyAttendance() {
  const { t } = useTranslation();
  const [groups, setGroups] = useState([]);
  const [groupId, setGroupId] = useState("");
  const [date, setDate] = useState(todayISO());
  const [roster, setRoster] = useState([]);
  const [attendanceMap, setAttendanceMap] = useState({});
  const [loadingDaily, setLoadingDaily] = useState(false);
  const [saving, setSaving] = useState(false);

  // Refetch whenever the marking date changes so the dropdown only ever
  // lists groups that actually meet on that weekday.
  useEffect(() => {
    const weekday = weekdayKeyFromISO(date);
    listGroups({ page: 1, size: 100, weekday })
      .then((data) => setGroups(data.items))
      .catch((error) => {
        if (!isModuleDisabledError(error)) {
          toast.error(getErrorMessage(error, t("growth.attendance.toastGroupsError")));
        }
      });
  }, [date, t]);

  // If the previously selected group no longer meets on the new date, clear
  // the selection instead of leaving a stale group with no lesson picked.
  useEffect(() => {
    if (groupId && !groups.some((group) => group.id === groupId)) {
      setGroupId("");
    }
  }, [groups, groupId]);

  useEffect(() => {
    if (!groupId) return;
    loadDaily();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupId, date]);

  async function loadDaily() {
    setLoadingDaily(true);
    try {
      const [groupStudents, records] = await Promise.all([
        listGroupStudents(groupId),
        listAttendance({ group_id: groupId, date }),
      ]);
      setRoster(groupStudents);
      const map = {};
      records.forEach((record) => {
        map[record.student_id] = record.status;
      });
      setAttendanceMap(map);
    } catch (error) {
      if (!isModuleDisabledError(error)) {
        toast.error(getErrorMessage(error, t("growth.attendance.toastLoadError")));
      }
    } finally {
      setLoadingDaily(false);
    }
  }

  function setStatus(studentId, status) {
    setAttendanceMap((prev) => ({ ...prev, [studentId]: status }));
  }

  function markAllPresent() {
    setAttendanceMap((prev) => {
      const next = { ...prev };
      roster.forEach((student) => {
        next[student.student_id] = "present";
      });
      return next;
    });
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
      toast.error(t("growth.attendance.toastNoStatus"));
      return;
    }

    setSaving(true);
    try {
      await bulkMarkAttendance({ group_id: groupId, date, records });
      toast.success(t("growth.attendance.toastSaved"));
      await loadDaily();
    } catch (error) {
      toast.error(getErrorMessage(error, t("growth.attendance.toastSaveError")));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end gap-3">
        <Select
          label={t("growth.attendance.groupLabel")}
          className="w-full max-w-[240px]"
          value={groupId}
          onChange={(event) => setGroupId(event.target.value)}
          disabled={groups.length === 0}
        >
          <option value="">
            {groups.length === 0
              ? t("att.attendance.noGroupsOnDate")
              : t("growth.attendance.selectGroup")}
          </option>
          {groups.map((group) => (
            <option key={group.id} value={group.id}>
              {group.name}
            </option>
          ))}
        </Select>

        <DateInput
          id="daily-attendance-date"
          label={t("growth.attendance.dateLabel")}
          value={date}
          onChange={(event) => setDate(event.target.value)}
        />

        {groupId && (
          <Button variant="secondary" onClick={markAllPresent}>
            <CheckCheck size={16} />
            {t("growth.attendance.markAllPresent")}
          </Button>
        )}
      </div>

      {groups.length === 0 ? (
        <EmptyState
          icon={CheckCheck}
          title={t("att.attendance.noGroupsOnDateTitle")}
          description={t("att.attendance.noGroupsOnDateDescription")}
        />
      ) : !groupId ? (
        <EmptyState
          icon={CheckCheck}
          title={t("growth.attendance.emptySelectGroupTitle")}
          description={t("growth.attendance.emptySelectGroupDescription")}
        />
      ) : loadingDaily ? (
        <div className="overflow-hidden rounded-card border border-line bg-surface">
          {Array.from({ length: 6 }).map((_, index) => (
            <div
              key={index}
              className="flex items-center justify-between gap-3 border-b border-line px-4 py-3 last:border-0"
            >
              <Skeleton className="h-4 w-40" />
              <div className="flex items-center gap-2">
                <Skeleton className="h-8 w-20 rounded-btn" />
                <Skeleton className="h-8 w-20 rounded-btn" />
                <Skeleton className="h-8 w-20 rounded-btn" />
              </div>
            </div>
          ))}
        </div>
      ) : roster.length === 0 ? (
        <EmptyState
          icon={CheckCheck}
          title={t("growth.attendance.emptyNoStudentsTitle")}
          description={t("growth.attendance.emptyNoStudentsDescription")}
        />
      ) : (
        <div className="overflow-hidden rounded-card border border-line bg-surface">
          <ul className="divide-y divide-line">
            {roster.map((student) => {
              const currentStatus = attendanceMap[student.student_id];
              return (
                <li
                  key={student.student_id}
                  className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
                >
                  <span className="flex min-w-0 items-center gap-2">
                    {/* `student.photo_url` is not returned by the group roster
                        endpoint yet — falls back to initials until the
                        backend adds it, per crm-backend/app/schemas/group.py. */}
                    <Avatar
                      photoUrl={student.photo_url}
                      name={student.student_full_name}
                      size="sm"
                      zoomOnHover
                    />
                    <span className="truncate text-sm font-medium text-fg-secondary">
                      {student.student_full_name}
                    </span>
                  </span>
                  <div className="flex items-center gap-2">
                    {Object.entries(STATUS_CONFIG).map(([status, config]) => {
                      const Icon = config.icon;
                      const isActive = currentStatus === status;
                      return (
                        <button
                          key={status}
                          type="button"
                          onClick={() => setStatus(student.student_id, status)}
                          className={cn(
                            "flex items-center gap-1.5 rounded-btn border px-2.5 py-1.5 text-xs font-medium transition-colors",
                            isActive ? config.activeClass : config.idleClass,
                          )}
                        >
                          <Icon size={14} />
                          {t(config.labelKey)}
                        </button>
                      );
                    })}
                  </div>
                </li>
              );
            })}
          </ul>
          {/* Sticky so the save action stays reachable on a long roster. */}
          <div className="sticky bottom-0 flex justify-end border-t border-line bg-surface px-4 py-3">
            <Button onClick={handleSave} disabled={saving}>
              {saving ? t("growth.common.saving") : t("growth.common.save")}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

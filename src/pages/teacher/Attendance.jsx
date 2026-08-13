import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Check, CheckCheck, Clock, X } from "lucide-react";
import {
  bulkMarkMyAttendance,
  listMyAttendance,
  listMyGroups,
  listMyGroupStudents,
} from "../../api/teacher";
import Avatar from "../../components/ui/Avatar";
import Button from "../../components/ui/Button";
import Card from "../../components/ui/Card";
import EmptyState from "../../components/ui/EmptyState";
import DateInput from "../../components/ui/DateInput";
import Select from "../../components/ui/Select";
import Skeleton from "../../components/ui/Skeleton";
import { toast } from "../../components/ui/Toast";
import { getErrorMessage } from "../../utils/apiError";
import { cn } from "../../utils/cn";

// Same three-state config (and exact token classes) as the admin
// DailyAttendance, so marking looks identical across cabinets.
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
    // Amber "warning", not the gold accent — gold stays the action colour.
    activeClass: "border-warning bg-warning text-white",
    idleClass: "border-line-strong text-fg-muted hover:bg-warning-bg",
  },
};

const PAGE_CLASS = "mx-auto max-w-lg space-y-4 px-4 pb-24 pt-4";

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export default function Attendance() {
  const { t } = useTranslation();
  const [groups, setGroups] = useState([]);
  const [groupId, setGroupId] = useState("");
  const [date, setDate] = useState(todayISO());
  const [roster, setRoster] = useState([]);
  const [attendanceMap, setAttendanceMap] = useState({});
  const [loadingDaily, setLoadingDaily] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    listMyGroups()
      .then(setGroups)
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
      await loadDaily();
    } catch (error) {
      toast.error(getErrorMessage(error, t("teacher.attendance.saveError")));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className={PAGE_CLASS}>
      <div className="flex flex-col gap-3">
        <Select
          label={t("teacher.attendance.groupLabel")}
          className="w-full"
          value={groupId}
          onChange={(event) => setGroupId(event.target.value)}
          disabled={groups.length === 0}
        >
          <option value="">
            {groups.length === 0
              ? t("teacher.attendance.noGroups")
              : t("teacher.attendance.selectGroup")}
          </option>
          {groups.map((group) => (
            <option key={group.id} value={group.id}>
              {group.name}
            </option>
          ))}
        </Select>
        <DateInput
          label={t("teacher.attendance.dateLabel")}
          className="w-full"
          value={date}
          onChange={(event) => setDate(event.target.value)}
        />
      </div>

      {!groupId ? (
        <EmptyState
          size="md"
          icon={CheckCheck}
          title={t("teacher.attendance.selectGroupTitle")}
          description={t("teacher.attendance.selectGroupDescription")}
        />
      ) : loadingDaily ? (
        <Card padding="p-0" className="overflow-hidden">
          {Array.from({ length: 5 }).map((_, index) => (
            <div
              key={index}
              className="flex items-center justify-between gap-3 border-b border-line px-4 py-3 last:border-0"
            >
              <Skeleton className="h-4 w-32" />
              <div className="flex items-center gap-2">
                <Skeleton className="h-8 w-12 rounded-btn" />
                <Skeleton className="h-8 w-12 rounded-btn" />
                <Skeleton className="h-8 w-12 rounded-btn" />
              </div>
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
          <Card padding="p-0" className="overflow-hidden">
            <ul className="divide-y divide-line">
              {roster.map((student) => {
                const currentStatus = attendanceMap[student.student_id];
                return (
                  <li
                    key={student.student_id}
                    className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
                  >
                    <span className="flex min-w-0 items-center gap-2">
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
                            aria-label={t(config.labelKey)}
                            className={cn(
                              "flex items-center gap-1.5 rounded-btn border px-2.5 py-1.5 text-xs font-medium transition-colors",
                              isActive ? config.activeClass : config.idleClass,
                            )}
                          >
                            <Icon size={14} />
                            <span className="hidden sm:inline">{t(config.labelKey)}</span>
                          </button>
                        );
                      })}
                    </div>
                  </li>
                );
              })}
            </ul>
          </Card>
          <Button className="w-full" onClick={handleSave} disabled={saving}>
            {saving ? t("teacher.common.saving") : t("teacher.common.save")}
          </Button>
        </>
      )}
    </div>
  );
}

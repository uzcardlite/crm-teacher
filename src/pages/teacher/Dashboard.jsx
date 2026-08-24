import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  BookOpen,
  CalendarCheck,
  Check,
  Clock,
  Users,
  UsersRound,
  X,
} from "lucide-react";
import { Link } from "react-router-dom";
import {
  bulkMarkMyAttendance,
  getTeacherMe,
  listMyAttendance,
  listMyGroups,
  listMyGroupStudents,
} from "../../api/teacher";
import { useAuth } from "../../context/AuthContext";
import { useTenantModules } from "../../context/TenantModulesContext";
import Avatar from "../../components/ui/Avatar";
import Button from "../../components/ui/Button";
import Card from "../../components/ui/Card";
import KoshinStar from "../../components/ui/KoshinStar";
import Select from "../../components/ui/Select";
import Skeleton from "../../components/ui/Skeleton";
import StatCard from "../../components/ui/StatCard";
import { toast } from "../../components/ui/Toast";
import { getErrorMessage } from "../../utils/apiError";
import { formatLongDate } from "../../utils/format";
import { cn } from "../../utils/cn";

// Cabinet home: the teacher's own scope only — no centre-wide finance stats.
const PAGE_CLASS = "mx-auto max-w-lg space-y-5 px-4 pb-24 pt-4";

// Same three-state config as the full Attendance page, so marking looks
// identical wherever the teacher does it.
const STATUS_CONFIG = {
  present: {
    labelKey: "growth.attendance.statusPresent",
    icon: Check,
    // Active: filled + a coloured glow so the chosen status reads as "lit".
    // Idle: a soft raised chip (own shadow) rather than a flat outline.
    activeClass: "border-transparent bg-success text-white shadow-glow-success",
    idleClass: "border-line bg-surface text-fg-muted shadow-card hover:bg-success-bg",
  },
  absent: {
    labelKey: "growth.attendance.statusAbsent",
    icon: X,
    activeClass: "border-transparent bg-danger text-white shadow-glow-danger",
    idleClass: "border-line bg-surface text-fg-muted shadow-card hover:bg-danger-bg",
  },
  late: {
    labelKey: "growth.attendance.statusLate",
    icon: Clock,
    // Amber "warning", not the gold accent: gold is reserved for the primary
    // action, so a status never competes with a button for it.
    activeClass: "border-transparent bg-warning text-white shadow-glow-warning",
    idleClass: "border-line bg-surface text-fg-muted shadow-card hover:bg-warning-bg",
  },
};

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

// Quick attendance for TODAY, embedded on the home screen: pick a group
// (the first one is auto-selected), tap statuses, save — no page hop.
function QuickAttendance() {
  const { t } = useTranslation();
  const [groups, setGroups] = useState([]);
  const [groupId, setGroupId] = useState("");
  const [roster, setRoster] = useState([]);
  const [attendanceMap, setAttendanceMap] = useState({});
  const [loadingRoster, setLoadingRoster] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    listMyGroups()
      .then((list) => {
        setGroups(list);
        if (list.length > 0) setGroupId(String(list[0].id));
      })
      .catch((error) => toast.error(getErrorMessage(error, t("teacher.attendance.groupsError"))));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!groupId) return;
    setLoadingRoster(true);
    Promise.all([
      listMyGroupStudents(groupId),
      listMyAttendance({ group_id: groupId, date: todayISO() }),
    ])
      .then(([groupStudents, records]) => {
        setRoster(groupStudents);
        const map = {};
        records.forEach((record) => {
          map[record.student_id] = record.status;
        });
        setAttendanceMap(map);
      })
      .catch((error) => toast.error(getErrorMessage(error, t("teacher.attendance.loadError"))))
      .finally(() => setLoadingRoster(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupId]);

  async function handleSave() {
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
      await bulkMarkMyAttendance({ group_id: groupId, date: todayISO(), records });
      toast.success(t("teacher.attendance.saved"));
    } catch (error) {
      toast.error(getErrorMessage(error, t("teacher.attendance.saveError")));
    } finally {
      setSaving(false);
    }
  }

  if (groups.length === 0) return null;

  return (
    <section className="space-y-3">
      <div className="flex items-center gap-2 px-0.5">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-fg-muted">
          {t("teacher.dashboard.quickAttendanceTitle")}
        </h2>
        <span className="ml-auto text-xs text-fg-faint">{formatLongDate()}</span>
      </div>

      <Card padding="p-0" className="overflow-hidden">
        <div className="border-b border-line bg-surface-sunken/50 px-3 py-2.5">
          <Select
            value={groupId}
            onChange={(event) => setGroupId(event.target.value)}
            className="w-full"
          >
            {groups.map((group) => (
              <option key={group.id} value={group.id}>
                {group.name}
              </option>
            ))}
          </Select>
        </div>

        {loadingRoster ? (
          <div>
            {Array.from({ length: 4 }).map((_, index) => (
              <div
                key={index}
                className="flex items-center justify-between gap-3 border-b border-line px-4 py-3 last:border-0"
              >
                <Skeleton className="h-4 w-32" />
                <div className="flex items-center gap-2">
                  <Skeleton className="h-8 w-10 rounded-btn" />
                  <Skeleton className="h-8 w-10 rounded-btn" />
                  <Skeleton className="h-8 w-10 rounded-btn" />
                </div>
              </div>
            ))}
          </div>
        ) : roster.length === 0 ? (
          <p className="px-4 py-6 text-center text-sm text-fg-muted">
            {t("teacher.attendance.emptyTitle")}
          </p>
        ) : (
          <>
            <ul className="divide-y divide-line">
              {roster.map((student) => {
                const currentStatus = attendanceMap[student.student_id];
                return (
                  <li
                    key={student.student_id}
                    className="flex items-center justify-between gap-2 px-3 py-2.5"
                  >
                    <span className="flex min-w-0 items-center gap-2">
                      <Avatar
                        photoUrl={student.photo_url}
                        name={student.student_full_name}
                        size="sm"
                      />
                      <span className="truncate text-sm font-medium text-fg-secondary">
                        {student.student_full_name}
                      </span>
                    </span>
                    <div className="flex shrink-0 items-center gap-1.5">
                      {Object.entries(STATUS_CONFIG).map(([status, config]) => {
                        const Icon = config.icon;
                        const isActive = currentStatus === status;
                        return (
                          <button
                            key={status}
                            type="button"
                            onClick={() =>
                              setAttendanceMap((prev) => ({
                                ...prev,
                                [student.student_id]: status,
                              }))
                            }
                            aria-label={t(config.labelKey)}
                            className={cn(
                              "u-press-sm flex h-9 w-11 items-center justify-center rounded-btn border",
                              isActive ? config.activeClass : config.idleClass,
                            )}
                          >
                            <Icon size={15} />
                          </button>
                        );
                      })}
                    </div>
                  </li>
                );
              })}
            </ul>
            <div className="border-t border-line p-3">
              <Button
                variant="brand"
                className="h-12 w-full text-[15px]"
                onClick={handleSave}
                disabled={saving}
              >
                {saving ? t("teacher.common.saving") : t("teacher.attendance.saveToday")}
              </Button>
            </div>
          </>
        )}
      </Card>
    </section>
  );
}

export default function Dashboard() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { hasPermission } = useTenantModules();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getTeacherMe()
      .then(setData)
      .catch((error) => toast.error(getErrorMessage(error, t("teacher.dashboard.loadError"))))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading || !data) {
    return (
      <div className={PAGE_CLASS}>
        <Card padding="p-5" className="space-y-4">
          <div className="flex items-center gap-3">
            <Skeleton className="h-16 w-16 rounded-full" />
            <div className="flex flex-1 flex-col gap-2">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-6 w-44" />
            </div>
          </div>
          <Skeleton className="h-16 w-full rounded-card" />
        </Card>
        <div className="grid grid-cols-3 gap-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <Card key={index} padding="p-3" className="flex flex-col gap-2">
              <Skeleton className="h-8 w-8 rounded-btn" />
              <Skeleton className="h-6 w-12" />
              <Skeleton className="h-3 w-16" />
            </Card>
          ))}
        </div>
      </div>
    );
  }

  const summary = data.summary || {};
  const canMarkAttendance = hasPermission("teacher_cabinet.attendance");
  const todayLessons = summary.today_lessons || [];
  const todayCount = todayLessons.length;
  const nextLesson = summary.next_lesson_time
    ? todayLessons.find((lesson) => lesson.time === summary.next_lesson_time)
    : null;

  return (
    <div className={PAGE_CLASS}>
      {/* National hero: a deep amber girih gradient with layered koshin
          stars. The greeting is large and warm; the teacher's calculated
          salary lives INSIDE this card, masked until the eye is pressed. */}
      <div className="relative overflow-hidden rounded-card bg-gradient-orange px-5 pb-5 pt-6 text-white shadow-card dark:bg-gradient-orange-dark">
        {/* Twin blooms turn the flat fill into polished gilt: a bright warm
            sheen top-right and a soft white lift top-left. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-10 -top-20 h-52 w-52 rounded-full bg-accent-light/45 blur-3xl"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -left-12 -top-16 h-44 w-44 rounded-full bg-white/20 blur-3xl"
        />
        <KoshinStar
          size={170}
          strokeWidth={3}
          className="pointer-events-none absolute -right-12 -top-14 text-white/[0.14]"
        />
        <KoshinStar
          size={72}
          strokeWidth={4}
          className="pointer-events-none absolute -bottom-8 right-24 text-white/[0.08]"
        />
        <KoshinStar
          size={40}
          strokeWidth={5}
          className="pointer-events-none absolute bottom-10 left-2 text-white/[0.07]"
        />

        <div className="relative flex items-center gap-4">
          <span className="rounded-full bg-white/15 p-1">
            <Avatar photoUrl={user?.photo_url} name={data.full_name} size="lg" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium uppercase tracking-wider text-white/70">
              {formatLongDate()}
            </p>
            <p className="mt-1 truncate font-display text-[19px] font-bold leading-snug tracking-tight">
              {data.full_name}
            </p>
            {data.subject && (
              <p className="mt-0.5 truncate text-[13px] text-white/75">{data.subject}</p>
            )}
          </div>
        </div>

        {/* Today's timetable replaces the salary pocket: it is what a teacher
            actually needs on open, and it never has to be masked. Salary now
            lives only in "Oyligim", visible once the centre opens it. */}
        <Link
          to="/teacher/schedule"
          className="relative mt-5 flex items-center gap-3 rounded-card border border-white/25 bg-black/15 px-4 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.15)] backdrop-blur-md transition-colors hover:bg-black/20"
        >
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-btn bg-white/20">
            <BookOpen size={20} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium text-white/70">
              {t("teacher.dashboard.todayLessons")}
            </p>
            <p className="mt-0.5 truncate text-lg font-bold tracking-wide">
              {todayCount === 0
                ? t("teacher.dashboard.noLessonsToday")
                : t("teacher.dashboard.lessonsCount", { count: todayCount })}
            </p>
            {nextLesson && (
              <p className="mt-0.5 truncate text-xs text-white/75">
                {t("teacher.dashboard.nextLesson", {
                  time: nextLesson.time,
                  group: nextLesson.group_name,
                })}
              </p>
            )}
          </div>
        </Link>
      </div>

      {/* Overview: the teacher's own scope. Salary moved into the hero, so
          three compact colour-coded tiles sit in one row. */}
      <section className="space-y-3">
        <h2 className="px-0.5 text-xs font-semibold uppercase tracking-wide text-fg-muted">
          {t("teacher.dashboard.overviewTitle")}
        </h2>
        <div className="grid grid-cols-3 gap-3">
          <StatCard
            compact
            variant="purple"
            icon={UsersRound}
            label={t("teacher.dashboard.groupsCount")}
            value={summary.groups_count}
          />
          <StatCard
            compact
            variant="blue"
            icon={Users}
            label={t("teacher.dashboard.studentsCount")}
            value={summary.students_count}
          />
          <StatCard
            compact
            variant="teal"
            icon={CalendarCheck}
            label={t("teacher.dashboard.lessonsThisMonth")}
            value={summary.lessons_this_month}
          />
        </div>
      </section>

      {/* Quick attendance replaces the old launcher tiles: marking today's
          lesson is the teacher's most frequent action, so it lives right on
          the home screen. */}
      {canMarkAttendance && <QuickAttendance />}
    </div>
  );
}

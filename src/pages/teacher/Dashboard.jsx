import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  CalendarCheck,
  CalendarDays,
  Check,
  ClipboardCheck,
  Clock,
  Users,
  UsersRound,
  X,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import {
  bulkMarkMyAttendance,
  getMyWeek,
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
import UnmarkedBanner from "../../components/attendance/UnmarkedBanner";
import FirstVisitGuide from "../../components/ui/FirstVisitGuide";
import KoshinStar from "../../components/ui/KoshinStar";
import Select from "../../components/ui/Select";
import Skeleton from "../../components/ui/Skeleton";
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

const TONES = {
  gold: "bg-gradient-gold text-accent-fg",
  feruza: "bg-gradient-feruza text-white",
  clay: "bg-clay text-white",
};

function OverviewTile({ icon: Icon, tone, value, label, to }) {
  return (
    <Link
      to={to}
      className="u-press flex flex-col gap-2 rounded-card border border-line bg-surface p-3 shadow-card transition-shadow hover:shadow-card-hover"
    >
      <span className={cn("flex h-9 w-9 items-center justify-center rounded-btn", TONES[tone])}>
        <Icon size={18} />
      </span>
      <span className="font-display text-2xl font-bold leading-none text-fg tabular-nums">{value ?? "—"}</span>
      <span className="text-[12px] leading-tight text-fg-muted">{label}</span>
    </Link>
  );
}

function localISO(date = new Date()) {
  const pad = (n) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function minutesOf(time) {
  if (!time) return null;
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

function waitLabel(minutes, t) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h && m) return t("teacher.schedule.hoursMinutes", { h, m });
  if (h) return t("teacher.schedule.hours", { count: h });
  return t("teacher.schedule.minutes", { count: m });
}

const CHIP_DOT = {
  done: "bg-success-bg",
  late: "bg-warning-bg",
  missed: "bg-danger",
  pending: "bg-warning-bg",
  live: "bg-accent-light",
  upcoming: "bg-white/40",
};

// The gilt hero answers "what now?": the lesson in progress (with time left
// and a one-tap register) or the next one, plus today's lessons as chips.
function TodayHero({ fullName, subject, photoUrl, canMark }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [lessons, setLessons] = useState(null);
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    getMyWeek()
      .then((week) => setLessons(week.lessons.filter((lesson) => lesson.date === localISO())))
      .catch(() => setLessons([]));
    const timer = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(timer);
  }, []);

  const current = now.getHours() * 60 + now.getMinutes();
  const today = (lessons || []).map((lesson) => {
    if (lesson.state === "done" || lesson.state === "late" || !lesson.time) return lesson;
    const start = minutesOf(lesson.time);
    const end = start + lesson.duration_minutes;
    if (current >= start && current < end) return { ...lesson, state: "live" };
    if (current < start) return { ...lesson, state: "upcoming" };
    return lesson.state === "upcoming" || lesson.state === "live" ? { ...lesson, state: "pending" } : lesson;
  });
  const live = today.find((lesson) => lesson.state === "live");
  const next = today.find((lesson) => lesson.state === "upcoming" && lesson.time);
  const focus = live || next;
  const doneCount = today.filter((lesson) => lesson.state === "done" || lesson.state === "late").length;

  function mark(lesson) {
    navigate(`/teacher/attendance?group=${lesson.group_id}&date=${lesson.date}`);
  }

  return (
    <div className="relative overflow-hidden rounded-card bg-gradient-orange px-5 pb-5 pt-5 text-white shadow-card dark:bg-gradient-orange-dark">
      <div aria-hidden="true" className="pointer-events-none absolute -right-10 -top-20 h-52 w-52 rounded-full bg-accent-light/45 blur-3xl" />
      <KoshinStar size={170} strokeWidth={3} className="pointer-events-none absolute -right-12 -top-14 text-white/[0.14]" />
      <KoshinStar size={56} strokeWidth={4} className="pointer-events-none absolute -bottom-6 left-6 text-white/[0.08]" />

      {/* who + when, kept small: the lesson is the headline */}
      <div className="relative flex items-center gap-3">
        <span className="rounded-full bg-white/15 p-0.5">
          <Avatar photoUrl={photoUrl} name={fullName} size="md" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-medium uppercase tracking-wider text-white/75">{formatLongDate()}</p>
          <p className="truncate font-display text-base font-bold leading-snug">
            {fullName}
            {subject ? <span className="font-sans text-xs font-medium text-white/75"> · {subject}</span> : null}
          </p>
        </div>
        <Link
          to="/teacher/schedule"
          aria-label={t("teacher.nav.schedule")}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-btn bg-white/15 transition-colors hover:bg-white/25"
        >
          <CalendarDays size={20} />
        </Link>
      </div>

      {/* headline */}
      <div className="relative mt-5">
        {lessons === null ? (
          <Skeleton className="h-16 w-full rounded-card bg-white/20" />
        ) : focus ? (
          <>
            <p className="text-xs font-semibold uppercase tracking-wider text-white/80">
              {live
                ? t("teacher.dashboard.nowInClass", { left: waitLabel(minutesOf(live.time) + live.duration_minutes - current, t) })
                : t("teacher.dashboard.nextIn", { time: waitLabel(minutesOf(next.time) - current, t) })}
            </p>
            <p className="mt-1 truncate font-display text-[26px] font-bold leading-tight">{focus.group_name}</p>
            <p className="mt-1 text-[13px] text-white/80">
              {focus.time}–{focus.end_time}
              {focus.room_name ? ` · ${focus.room_name}` : ""} · {t("teacher.schedule.students", { count: focus.students })}
            </p>
            {live && (
              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-black/20">
                <div
                  className="h-full rounded-full bg-accent-light"
                  style={{ width: `${Math.min(100, Math.round(((current - minutesOf(live.time)) / live.duration_minutes) * 100))}%` }}
                />
              </div>
            )}
            {canMark && live && (
              <button
                type="button"
                onClick={() => mark(live)}
                className="u-press mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-btn bg-black/25 text-[15px] font-semibold shadow-[inset_0_1px_0_rgba(255,255,255,0.15)] backdrop-blur-md transition-colors hover:bg-black/30"
              >
                <ClipboardCheck size={18} />
                {t("teacher.schedule.mark")}
              </button>
            )}
          </>
        ) : (
          <>
            <p className="font-display text-[22px] font-bold leading-tight">
              {today.length ? t("teacher.dashboard.allDoneToday") : t("teacher.dashboard.noLessonsToday")}
            </p>
            <p className="mt-1 text-[13px] text-white/80">
              {today.length
                ? t("teacher.dashboard.doneOf", { done: doneCount, total: today.length })
                : t("teacher.dashboard.restHint")}
            </p>
          </>
        )}
      </div>

      {/* today's lessons as chips */}
      {today.length > 0 && (
        <div className="relative mt-4 flex flex-wrap gap-1.5">
          {today.map((lesson) => (
            <Link
              key={`${lesson.group_id}-${lesson.time}`}
              to="/teacher/schedule"
              className={cn(
                "flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[12px] font-semibold transition-colors",
                lesson.state === "live" ? "bg-accent-light text-accent-fg" : "bg-black/15 text-white hover:bg-black/25",
              )}
            >
              <span className={cn("h-1.5 w-1.5 rounded-full", CHIP_DOT[lesson.state] || CHIP_DOT.upcoming)} />
              {lesson.time || "—"}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

export default function Dashboard() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { hasPermission } = useTenantModules();
  const navigate = useNavigate();
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

  return (
    <div className={PAGE_CLASS}>
      <TodayHero
        fullName={data.full_name}
        subject={data.subject}
        photoUrl={user?.photo_url}
        canMark={canMarkAttendance}
      />

      {/* Overview: the teacher's own scope, in the cabinet's own palette
          (gilt, feruza, clay) instead of unrelated purple/blue gradients. */}
      <section className="grid grid-cols-3 gap-3">
        <OverviewTile
          icon={UsersRound}
          tone="gold"
          value={summary.groups_count}
          label={t("teacher.dashboard.groupsCount")}
          to="/teacher/groups"
        />
        <OverviewTile
          icon={Users}
          tone="feruza"
          value={summary.students_count}
          label={t("teacher.dashboard.studentsCount")}
          to="/teacher/groups"
        />
        <OverviewTile
          icon={CalendarCheck}
          tone="clay"
          value={
            summary.lessons_due_this_month
              ? `${summary.lessons_this_month}/${summary.lessons_due_this_month}`
              : summary.lessons_this_month
          }
          label={t("teacher.dashboard.markedThisMonth")}
          to="/teacher/attendance"
        />
      </section>

      {/* Quick attendance replaces the old launcher tiles: marking today's
          lesson is the teacher's most frequent action, so it lives right on
          the home screen. */}
      {canMarkAttendance && (
        <UnmarkedBanner showStreak onPick={() => navigate("/teacher/attendance")} />
      )}

      {canMarkAttendance && <QuickAttendance />}

      <FirstVisitGuide
        id="dashboard-v2"
        steps={["hero", "tiles", "owed"].map((key) => ({
          title: t(`teacher.dashboard.guide.${key}Title`),
          body: t(`teacher.dashboard.guide.${key}Body`),
        }))}
      />
    </div>
  );
}

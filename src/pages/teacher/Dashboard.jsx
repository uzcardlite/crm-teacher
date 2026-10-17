import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useNavigate } from "react-router-dom";
import { AlertTriangle, Banknote, Cake, ChevronRight, ClipboardList } from "lucide-react";
import { getMyAttendanceDiscipline, getMyWeek, getTeacherMe } from "../../api/teacher";
import { useAuth } from "../../context/AuthContext";
import { useTenantModules } from "../../context/TenantModulesContext";
import Avatar from "../../components/ui/Avatar";
import FirstVisitGuide from "../../components/ui/FirstVisitGuide";
import Skeleton from "../../components/ui/Skeleton";
import { toast } from "../../components/ui/Toast";
import { getErrorMessage } from "../../utils/apiError";
import { formatLongDate } from "../../utils/format";
import { cn } from "../../utils/cn";

// Cabinet home, in the calm system style: the teacher's name as the large
// title, the lesson that matters right now, today's timetable as a grouped
// list, and a short "needs attention" list. No decoration — colour only
// where it carries meaning (state, the brand accent on "now").
const PAGE_CLASS = "mx-auto max-w-lg space-y-6 px-4 pb-24 pt-5";

function localISO(date = new Date()) {
  const pad = (n) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function minutesOf(time) {
  if (!time) return null;
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

function durationLabel(minutes, t) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h && m) return t("teacher.schedule.hoursMinutes", { h, m });
  if (h) return t("teacher.schedule.hours", { count: h });
  return t("teacher.schedule.minutes", { count: m });
}

// The server's lesson state, refreshed against the device clock so "now" and
// the countdown move without reloading.
function withLiveState(lessons, current) {
  return lessons.map((lesson) => {
    if (lesson.state === "done" || lesson.state === "late" || !lesson.time) return lesson;
    const start = minutesOf(lesson.time);
    const end = start + lesson.duration_minutes;
    if (current >= start && current < end) return { ...lesson, state: "live" };
    if (current < start) return { ...lesson, state: "upcoming" };
    return lesson.state === "upcoming" || lesson.state === "live" ? { ...lesson, state: "pending" } : lesson;
  });
}

const STATE_TEXT = {
  done: "text-success",
  late: "text-warning",
  missed: "text-danger",
  pending: "text-warning",
  live: "text-accent-dark dark:text-accent",
  upcoming: "text-fg-muted",
};

function SectionTitle({ children, action }) {
  return (
    <div className="flex items-baseline justify-between px-1">
      <h2 className="text-xl font-bold tracking-tight text-fg">{children}</h2>
      {action}
    </div>
  );
}

function NowCard({ lessons, current, canMark }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const live = lessons.find((lesson) => lesson.state === "live");
  const next = lessons.find((lesson) => lesson.state === "upcoming" && lesson.time);
  const focus = live || next;
  const owedToday = lessons.filter((lesson) => lesson.state === "missed" || lesson.state === "pending");
  const markTarget = live || owedToday[0];

  function mark(lesson) {
    navigate(`/teacher/attendance?group=${lesson.group_id}&date=${lesson.date}`);
  }

  if (!focus) {
    const done = lessons.filter((lesson) => lesson.state === "done" || lesson.state === "late").length;
    return (
      <section className="rounded-card bg-surface p-4 shadow-card">
        <p className="text-[13px] font-medium text-fg-muted">{t("teacher.dashboard.todayLabel")}</p>
        <p className="mt-1 text-[22px] font-bold tracking-tight text-fg">
          {lessons.length ? t("teacher.dashboard.allDoneToday") : t("teacher.dashboard.noLessonsToday")}
        </p>
        <p className="mt-0.5 text-[15px] text-fg-secondary">
          {lessons.length ? t("teacher.dashboard.doneOf", { done, total: lessons.length }) : t("teacher.dashboard.restHint")}
        </p>
        <div className="mt-4 flex gap-2.5">
          {canMark && markTarget && (
            <button
              type="button"
              onClick={() => mark(markTarget)}
              className="u-press h-[46px] flex-1 rounded-btn bg-primary text-base font-semibold text-primary-fg"
            >
              {t("teacher.schedule.mark")}
            </button>
          )}
          <Link
            to="/teacher/schedule"
            className="u-press flex h-[46px] flex-1 items-center justify-center rounded-btn bg-surface-sunken text-base font-medium text-fg"
          >
            {t("teacher.dashboard.weekSchedule")}
          </Link>
        </div>
      </section>
    );
  }

  const start = minutesOf(focus.time);
  const left = live ? start + live.duration_minutes - current : start - current;
  const progress = live ? Math.min(100, Math.max(0, Math.round(((current - start) / live.duration_minutes) * 100))) : 0;

  return (
    <section className="rounded-card bg-surface p-4 shadow-card">
      <div className="flex items-center gap-2 text-[13px]">
        <span className={cn("h-2 w-2 rounded-full", live ? "bg-accent" : "bg-fg-faint")} />
        <span className={cn("font-semibold", live ? "text-accent-dark dark:text-accent" : "text-fg-secondary")}>
          {live ? t("teacher.dashboard.now") : t("teacher.dashboard.next")}
        </span>
        <span className="text-fg-muted">
          · {focus.time} – {focus.end_time}
        </span>
        <span className="ml-auto text-fg-muted">
          {live
            ? t("teacher.dashboard.leftShort", { time: durationLabel(left, t) })
            : t("teacher.dashboard.inShort", { time: durationLabel(left, t) })}
        </span>
      </div>
      <p className="mt-2.5 truncate text-[22px] font-bold tracking-tight text-fg">{focus.group_name}</p>
      <p className="mt-0.5 truncate text-[15px] text-fg-secondary">
        {[focus.room_name, t("teacher.schedule.students", { count: focus.students }), focus.exam_name]
          .filter(Boolean)
          .join(" · ")}
      </p>
      {live && (
        <div className="mt-3.5 h-1 overflow-hidden rounded-full bg-surface-sunken">
          <div className="h-full bg-accent" style={{ width: `${progress}%` }} />
        </div>
      )}
      <div className="mt-4 flex gap-2.5">
        {canMark && markTarget ? (
          <button
            type="button"
            onClick={() => mark(markTarget)}
            className="u-press h-[46px] flex-1 rounded-btn bg-primary text-base font-semibold text-primary-fg"
          >
            {t("teacher.schedule.mark")}
          </button>
        ) : null}
        <Link
          to="/teacher/schedule"
          className={cn(
            "u-press flex h-[46px] items-center justify-center rounded-btn bg-surface-sunken text-base font-medium text-fg",
            canMark && markTarget ? "px-5" : "flex-1",
          )}
        >
          {t("teacher.nav.schedule")}
        </Link>
      </div>
    </section>
  );
}

function TodayList({ lessons }) {
  const { t } = useTranslation();
  if (lessons.length === 0) return null;
  return (
    <section className="space-y-2">
      <SectionTitle
        action={
          <Link to="/teacher/schedule" className="text-[15px] text-accent-dark dark:text-accent">
            {t("teacher.dashboard.week")}
          </Link>
        }
      >
        {t("teacher.nav.schedule")}
      </SectionTitle>
      <div className="overflow-hidden rounded-card bg-surface shadow-card">
        {lessons.map((lesson, index) => (
          <Link
            key={`${lesson.group_id}-${lesson.time}`}
            to="/teacher/schedule"
            className={cn(
              "flex items-center gap-3.5 px-4 py-3 transition-colors hover:bg-surface-sunken",
              index > 0 && "border-t border-line",
            )}
          >
            <div className="w-12 shrink-0 tabular-nums">
              <p className="text-[15px] font-semibold text-fg">{lesson.time || "—"}</p>
              <p className="text-xs text-fg-faint">{lesson.end_time || ""}</p>
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-base font-medium text-fg">{lesson.group_name}</p>
              <p className="truncate text-[13px] text-fg-secondary">
                {[lesson.room_name, t("teacher.schedule.students", { count: lesson.students })].filter(Boolean).join(" · ")}
              </p>
            </div>
            <span className={cn("shrink-0 text-[13px] font-medium", STATE_TEXT[lesson.state] || STATE_TEXT.upcoming)}>
              {t(`teacher.dashboard.state.${lesson.state}`)}
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}

function AttentionList({ owed, birthdays, canMark }) {
  const { t } = useTranslation();
  const rows = [];
  if (canMark && owed > 0) {
    rows.push({ key: "owed", to: "/teacher/attendance", icon: AlertTriangle, tone: "bg-danger", label: t("teacher.dashboard.owed"), value: owed });
  }
  if (birthdays.length > 0) {
    rows.push({
      key: "birthday",
      to: "/teacher/groups",
      icon: Cake,
      tone: "bg-accent",
      label: t("teacher.dashboard.birthday"),
      value: birthdays.length > 1 ? `${birthdays[0]} +${birthdays.length - 1}` : birthdays[0],
    });
  }
  rows.push({ key: "homework", to: "/teacher/homework", icon: ClipboardList, tone: "bg-info", label: t("teacher.nav.homework"), value: "" });
  rows.push({ key: "salary", to: "/teacher/salary", icon: Banknote, tone: "bg-success", label: t("teacher.nav.salary"), value: "" });

  return (
    <section className="space-y-2">
      <SectionTitle>{t("teacher.dashboard.attention")}</SectionTitle>
      <div className="overflow-hidden rounded-card bg-surface shadow-card">
        {rows.map((row, index) => (
          <Link
            key={row.key}
            to={row.to}
            className={cn(
              "flex min-h-[52px] items-center gap-3 px-4 py-2.5 transition-colors hover:bg-surface-sunken",
              index > 0 && "border-t border-line",
            )}
          >
            <span className={cn("flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-lg text-white", row.tone)}>
              <row.icon size={16} strokeWidth={2.2} />
            </span>
            <span className="min-w-0 flex-1 truncate text-base text-fg">{row.label}</span>
            {row.value !== "" && <span className="max-w-[45%] truncate text-[15px] tabular-nums text-fg-muted">{row.value}</span>}
            <ChevronRight size={18} className="shrink-0 text-fg-faint" />
          </Link>
        ))}
      </div>
    </section>
  );
}

export default function Dashboard() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { hasPermission } = useTenantModules();
  const canMark = hasPermission("teacher_cabinet.attendance");
  const [me, setMe] = useState(null);
  const [lessons, setLessons] = useState(null);
  const [owed, setOwed] = useState(0);
  const [current, setCurrent] = useState(() => {
    const now = new Date();
    return now.getHours() * 60 + now.getMinutes();
  });

  useEffect(() => {
    getTeacherMe()
      .then(setMe)
      .catch((error) => toast.error(getErrorMessage(error, t("teacher.dashboard.loadError"))));
    getMyWeek()
      .then((week) => setLessons(week.lessons.filter((lesson) => lesson.date === localISO())))
      .catch(() => setLessons([]));
    if (canMark) {
      getMyAttendanceDiscipline()
        .then((data) => setOwed((data?.to_mark?.length ?? 0) + (data?.locked?.length ?? 0)))
        .catch(() => {});
    }
    const timer = setInterval(() => {
      const now = new Date();
      setCurrent(now.getHours() * 60 + now.getMinutes());
    }, 30_000);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const today = withLiveState(lessons || [], current);
  const name = me?.full_name || user?.full_name || "";

  return (
    <div className={PAGE_CLASS}>
      {/* Large title: the teacher's own name, date above it. Long names step
          down a size and may wrap to two lines rather than being cut. */}
      <header className="flex items-end gap-3 px-1">
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-medium capitalize text-fg-muted">{formatLongDate()}</p>
          {me ? (
            <h1
              className={cn(
                "mt-0.5 line-clamp-2 break-words font-bold leading-tight tracking-tight text-fg",
                name.length > 22 ? "text-[26px]" : "text-[30px]",
              )}
            >
              {name}
            </h1>
          ) : (
            <Skeleton className="mt-1.5 h-8 w-56" />
          )}
          {me?.subject && <p className="mt-0.5 text-[15px] text-fg-secondary">{me.subject}</p>}
        </div>
        <Link to="/teacher/settings" aria-label={t("teacher.nav.settings")} className="shrink-0">
          <Avatar photoUrl={user?.photo_url} name={name} size="md" />
        </Link>
      </header>

      {lessons === null ? (
        <Skeleton className="h-44 w-full rounded-card" />
      ) : (
        <NowCard lessons={today} current={current} canMark={canMark} />
      )}

      {lessons !== null && <TodayList lessons={today} />}

      <AttentionList owed={owed} birthdays={me?.summary?.birthdays_today || []} canMark={canMark} />

      <FirstVisitGuide
        id="dashboard-v3"
        steps={["hero", "list", "owed"].map((key) => ({
          title: t(`teacher.dashboard.guide3.${key}Title`),
          body: t(`teacher.dashboard.guide3.${key}Body`),
        }))}
      />
    </div>
  );
}

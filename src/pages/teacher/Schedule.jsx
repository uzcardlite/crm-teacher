import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  Clock,
  Coffee,
  DoorOpen,
  GraduationCap,
  Users,
} from "lucide-react";
import { getMyWeek } from "../../api/teacher";
import Card from "../../components/ui/Card";
import FirstVisitGuide from "../../components/ui/FirstVisitGuide";
import KoshinStar from "../../components/ui/KoshinStar";
import Skeleton from "../../components/ui/Skeleton";
import { toast } from "../../components/ui/Toast";
import { getErrorMessage } from "../../utils/apiError";
import { cn } from "../../utils/cn";

const PAGE_CLASS = "mx-auto max-w-lg space-y-4 px-4 pb-24 pt-4";
const WEEKDAYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];
const SWIPE_PX = 60;
// A gap shorter than this between two lessons is not worth a "break" row.
const MIN_BREAK_MINUTES = 15;

// "YYYY-MM-DD" in the device's own calendar (not UTC).
function iso(date) {
  const pad = (n) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function parseIso(value) {
  const [y, m, d] = value.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function addDays(value, days) {
  const date = parseIso(value);
  date.setDate(date.getDate() + days);
  return iso(date);
}

function minutesOf(time) {
  if (!time) return null;
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

function nowMinutes() {
  const now = new Date();
  return now.getHours() * 60 + now.getMinutes();
}

// Lesson state as of right now: the server's, refreshed locally for today so
// "now in class" and the countdown move without a reload.
function liveState(lesson, todayIso, current) {
  if (lesson.state === "done" || lesson.state === "late") return lesson.state;
  if (lesson.date !== todayIso || !lesson.time) return lesson.state;
  const start = minutesOf(lesson.time);
  const end = start + lesson.duration_minutes;
  if (current >= start && current < end) return "live";
  if (current < start) return "upcoming";
  return lesson.state === "live" || lesson.state === "upcoming" ? "pending" : lesson.state;
}

const STATE_STYLE = {
  done: { dot: "bg-success", chip: "bg-success-bg text-success" },
  late: { dot: "bg-warning", chip: "bg-warning-bg text-warning" },
  missed: { dot: "bg-danger", chip: "bg-danger-bg text-danger" },
  pending: { dot: "bg-warning", chip: "bg-warning-bg text-warning" },
  live: { dot: "bg-accent", chip: "bg-accent text-accent-fg" },
  upcoming: { dot: "bg-line-strong", chip: "bg-surface-sunken text-fg-secondary" },
};

function formatDuration(minutes, t) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h && m) return t("teacher.schedule.hoursMinutes", { h, m });
  if (h) return t("teacher.schedule.hours", { count: h });
  return t("teacher.schedule.minutes", { count: m });
}

// --- pieces -------------------------------------------------------------------

function WeekStrip({ days, selected, todayIso, counts, alerts, onPick, lang }) {
  const { t } = useTranslation();
  return (
    <div className="grid grid-cols-7 gap-1.5">
      {days.map((day, index) => {
        const isSelected = day === selected;
        const isToday = day === todayIso;
        const count = counts[day] || 0;
        return (
          <button
            key={day}
            type="button"
            onClick={() => onPick(day)}
            aria-pressed={isSelected}
            aria-label={parseIso(day).toLocaleDateString(lang, { weekday: "long", day: "numeric", month: "long" })}
            className={cn(
              "u-press flex min-h-[64px] flex-col items-center justify-center gap-0.5 rounded-card border transition-colors",
              isSelected
                ? "border-transparent bg-gradient-gold text-accent-fg shadow-glow-accent"
                : isToday
                  ? "border-accent bg-surface text-fg"
                  : "border-line bg-surface text-fg-secondary",
            )}
          >
            <span className={cn("text-[11px] font-medium", isSelected ? "text-accent-fg/80" : "text-fg-muted")}>
              {t(`pages.schedule.days.${WEEKDAYS[index]}`).slice(0, 2)}
            </span>
            <span className="font-display text-lg font-bold leading-none">{parseIso(day).getDate()}</span>
            <span className="flex h-2 items-center gap-0.5" aria-hidden="true">
              {Array.from({ length: Math.min(count, 4) }).map((_, i) => (
                <span
                  key={i}
                  className={cn(
                    "h-1 w-1 rounded-full",
                    isSelected ? "bg-accent-fg/70" : alerts[day] ? "bg-danger" : "bg-secondary",
                  )}
                />
              ))}
            </span>
          </button>
        );
      })}
    </div>
  );
}

function NowCard({ lesson, current, onMark }) {
  const { t } = useTranslation();
  if (!lesson) return null;
  const start = minutesOf(lesson.time);
  const live = lesson.displayState === "live";
  const progress = live ? Math.min(100, Math.round(((current - start) / lesson.duration_minutes) * 100)) : 0;
  const left = live ? start + lesson.duration_minutes - current : start - current;

  return (
    <Card padding="p-0" className="overflow-hidden border-transparent bg-gradient-feruza text-white">
      <div className="flex items-center gap-3 p-4">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-btn bg-secondary-dark/50">
          {live ? <span className="h-3 w-3 rounded-full bg-accent ring-4 ring-accent/30" /> : <Clock size={20} />}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium text-white/80">
            {live ? t("teacher.schedule.now") : t("teacher.schedule.nextIn", { time: formatDuration(left, t) })}
          </p>
          <p className="truncate font-display text-lg font-semibold">{lesson.group_name}</p>
          <p className="text-xs text-white/80">
            {lesson.time}–{lesson.end_time}
            {lesson.room_name ? ` · ${lesson.room_name}` : ""}
            {live ? ` · ${t("teacher.schedule.minutesLeft", { count: left })}` : ""}
          </p>
        </div>
        {live && (
          <button
            type="button"
            onClick={() => onMark(lesson)}
            className="u-press flex min-h-[44px] items-center gap-1.5 rounded-btn bg-accent px-3 text-sm font-semibold text-accent-fg"
          >
            <ClipboardCheck size={16} />
            {t("teacher.schedule.mark")}
          </button>
        )}
      </div>
      {live && (
        <div className="h-1.5 bg-secondary-dark/50">
          <div className="h-full bg-accent" style={{ width: `${progress}%` }} />
        </div>
      )}
    </Card>
  );
}

function LessonRow({ lesson, onMark, onOpenGroup }) {
  const { t } = useTranslation();
  const style = STATE_STYLE[lesson.displayState] || STATE_STYLE.upcoming;
  const canMark = ["live", "pending", "missed"].includes(lesson.displayState);
  const marked = lesson.displayState === "done" || lesson.displayState === "late";

  return (
    <div className="flex gap-3">
      {/* time column */}
      <div className="flex w-12 shrink-0 flex-col items-end pt-3">
        <span className="font-display text-sm font-bold text-fg">{lesson.time || "—"}</span>
        <span className="text-[11px] text-fg-muted">{lesson.end_time || ""}</span>
      </div>
      {/* rail */}
      <div className="relative flex w-3 shrink-0 justify-center">
        <span className="absolute inset-y-0 w-px bg-line" aria-hidden="true" />
        <span
          className={cn("relative mt-4 h-3 w-3 rounded-full ring-4 ring-background", style.dot, lesson.displayState === "live" && "ring-accent/30")}
          aria-hidden="true"
        />
      </div>
      {/* card */}
      <Card
        padding="p-3.5"
        className={cn("mb-3 min-w-0 flex-1", lesson.displayState === "live" && "border-accent shadow-glow-accent")}
      >
        <button type="button" onClick={() => onOpenGroup(lesson)} className="block w-full text-left">
          <div className="flex items-start gap-2">
            <p className="min-w-0 flex-1 truncate font-display text-base font-semibold text-fg">{lesson.group_name}</p>
            <span className={cn("shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold", style.chip)}>
              {t(`teacher.schedule.state.${lesson.displayState}`)}
            </span>
          </div>
          <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-fg-muted">
            {lesson.room_name && (
              <span className="flex items-center gap-1">
                <DoorOpen size={13} />
                {lesson.room_name}
              </span>
            )}
            <span className="flex items-center gap-1">
              <Users size={13} />
              {t("teacher.schedule.students", { count: lesson.students })}
            </span>
            <span className="flex items-center gap-1">
              <Clock size={13} />
              {formatDuration(lesson.duration_minutes, t)}
            </span>
          </div>
        </button>
        {(lesson.kind !== "regular" || lesson.exam_name || marked) && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {lesson.kind === "extra" && (
              <span className="rounded-full bg-info-bg px-2 py-0.5 text-[11px] font-medium text-info">{t("teacher.schedule.extra")}</span>
            )}
            {lesson.kind === "moved" && (
              <span className="rounded-full bg-clay-bg px-2 py-0.5 text-[11px] font-medium text-clay-dark">
                {t("teacher.schedule.moved", { date: lesson.moved_from ? parseIso(lesson.moved_from).getDate() : "" })}
              </span>
            )}
            {lesson.exam_name && (
              <span className="flex items-center gap-1 rounded-full bg-accent/15 px-2 py-0.5 text-[11px] font-medium text-accent-dark">
                <GraduationCap size={12} />
                {lesson.exam_name}
              </span>
            )}
            {marked && (
              <span className="rounded-full bg-surface-sunken px-2 py-0.5 text-[11px] text-fg-secondary">
                ✓ {lesson.present} · ✗ {lesson.absent}
              </span>
            )}
          </div>
        )}
        {canMark && (
          <button
            type="button"
            onClick={() => onMark(lesson)}
            className={cn(
              "u-press mt-3 flex min-h-[44px] w-full items-center justify-center gap-2 rounded-btn text-sm font-semibold",
              lesson.displayState === "missed" ? "bg-danger text-white" : "bg-accent text-accent-dark",
            )}
          >
            <ClipboardCheck size={16} />
            {t("teacher.schedule.mark")}
          </button>
        )}
      </Card>
    </div>
  );
}

function BreakRow({ minutes }) {
  const { t } = useTranslation();
  return (
    <div className="flex gap-3">
      <div className="w-12 shrink-0" />
      <div className="relative flex w-3 shrink-0 justify-center">
        <span className="absolute inset-y-0 w-px border-l border-dashed border-line-strong" aria-hidden="true" />
      </div>
      <p className="mb-3 flex items-center gap-1.5 text-xs text-fg-muted">
        <Coffee size={13} />
        {t("teacher.schedule.break", { time: formatDuration(minutes, t) })}
      </p>
    </div>
  );
}

// --- page -----------------------------------------------------------------------

export default function Schedule() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const lang = i18n.language === "ru" ? "ru-RU" : "uz-UZ";
  const todayIso = iso(new Date());

  const [anchor, setAnchor] = useState(todayIso); // any day of the shown week
  const [selected, setSelected] = useState(todayIso);
  const [week, setWeek] = useState(null);
  const [loading, setLoading] = useState(true);
  const [current, setCurrent] = useState(nowMinutes);
  const touchX = useRef(null);

  const load = useCallback(
    (start) => {
      setLoading(true);
      getMyWeek(start)
        .then(setWeek)
        .catch((error) => toast.error(getErrorMessage(error, t("teacher.schedule.loadError"))))
        .finally(() => setLoading(false));
    },
    [t],
  );

  useEffect(() => {
    load(anchor);
  }, [anchor, load]);

  // Keep "now" fresh for the live card and states.
  useEffect(() => {
    const timer = setInterval(() => setCurrent(nowMinutes()), 30_000);
    return () => clearInterval(timer);
  }, []);

  const days = useMemo(() => {
    const start = week?.start ?? addDays(anchor, -((parseIso(anchor).getDay() + 6) % 7));
    return Array.from({ length: 7 }, (_, i) => addDays(start, i));
  }, [week, anchor]);

  const lessons = useMemo(
    () => (week?.lessons || []).map((lesson) => ({ ...lesson, displayState: liveState(lesson, todayIso, current) })),
    [week, todayIso, current],
  );

  const counts = {};
  const alerts = {};
  for (const lesson of lessons) {
    counts[lesson.date] = (counts[lesson.date] || 0) + 1;
    if (lesson.displayState === "missed") alerts[lesson.date] = true;
  }
  const dayLessons = lessons.filter((lesson) => lesson.date === selected);
  const dayMinutes = dayLessons.reduce((sum, lesson) => sum + lesson.duration_minutes, 0);
  const weekMinutes = lessons.reduce((sum, lesson) => sum + lesson.duration_minutes, 0);
  const focus =
    selected === todayIso
      ? dayLessons.find((lesson) => lesson.displayState === "live") ||
        dayLessons.find((lesson) => lesson.displayState === "upcoming" && lesson.time)
      : null;

  function shiftWeek(delta) {
    const nextAnchor = addDays(days[0], delta * 7);
    setAnchor(nextAnchor);
    setSelected(addDays(selected, delta * 7));
  }

  function pickDay(day) {
    setSelected(day);
  }

  function shiftDay(delta) {
    const next = addDays(selected, delta);
    setSelected(next);
    if (!days.includes(next)) setAnchor(next);
  }

  function goToday() {
    setAnchor(todayIso);
    setSelected(todayIso);
  }

  function mark(lesson) {
    navigate(`/teacher/attendance?group=${lesson.group_id}&date=${lesson.date}`);
  }

  function openGroup() {
    navigate("/teacher/groups");
  }

  const weekLabel = `${parseIso(days[0]).toLocaleDateString(lang, { day: "numeric", month: "short" })} – ${parseIso(days[6]).toLocaleDateString(lang, { day: "numeric", month: "short" })}`;
  const selectedLabel = parseIso(selected).toLocaleDateString(lang, { weekday: "long", day: "numeric", month: "long" });

  // Lesson rows with a "break" row wherever there is a real gap.
  const rows = [];
  dayLessons.forEach((lesson, index) => {
    const prev = dayLessons[index - 1];
    if (prev?.time && lesson.time) {
      const gap = minutesOf(lesson.time) - (minutesOf(prev.time) + prev.duration_minutes);
      if (gap >= MIN_BREAK_MINUTES) rows.push({ type: "break", key: `b-${index}`, minutes: gap });
    }
    rows.push({ type: "lesson", key: `${lesson.group_id}-${lesson.time}-${index}`, lesson });
  });

  const guideSteps = [
    { title: t("teacher.schedule.guide.weekTitle"), body: t("teacher.schedule.guide.weekBody") },
    { title: t("teacher.schedule.guide.nowTitle"), body: t("teacher.schedule.guide.nowBody") },
    { title: t("teacher.schedule.guide.colorsTitle"), body: t("teacher.schedule.guide.colorsBody") },
    { title: t("teacher.schedule.guide.markTitle"), body: t("teacher.schedule.guide.markBody") },
  ];

  return (
    <div
      className={PAGE_CLASS}
      onTouchStart={(event) => {
        touchX.current = event.touches[0].clientX;
      }}
      onTouchEnd={(event) => {
        if (touchX.current === null) return;
        const dx = event.changedTouches[0].clientX - touchX.current;
        touchX.current = null;
        if (Math.abs(dx) >= SWIPE_PX) shiftDay(dx < 0 ? 1 : -1);
      }}
    >
      {/* week header */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => shiftWeek(-1)}
          aria-label={t("teacher.schedule.prevWeek")}
          className="u-press flex h-11 w-11 items-center justify-center rounded-btn border border-line bg-surface text-fg-secondary"
        >
          <ChevronLeft size={18} />
        </button>
        <div className="min-w-0 flex-1 text-center">
          <p className="font-display text-base font-semibold capitalize text-fg">{weekLabel}</p>
          <p className="text-xs text-fg-muted">
            {t("teacher.schedule.weekSummary", { count: lessons.length, time: formatDuration(weekMinutes, t) })}
          </p>
        </div>
        <button
          type="button"
          onClick={() => shiftWeek(1)}
          aria-label={t("teacher.schedule.nextWeek")}
          className="u-press flex h-11 w-11 items-center justify-center rounded-btn border border-line bg-surface text-fg-secondary"
        >
          <ChevronRight size={18} />
        </button>
      </div>

      <WeekStrip days={days} selected={selected} todayIso={todayIso} counts={counts} alerts={alerts} onPick={pickDay} lang={lang} />

      {/* selected day */}
      <div className="flex items-end justify-between gap-2">
        <div>
          <p className="font-display text-xl font-bold capitalize text-fg">{selectedLabel}</p>
          <p className="text-xs text-fg-muted">
            {dayLessons.length
              ? t("teacher.schedule.daySummary", { count: dayLessons.length, time: formatDuration(dayMinutes, t) })
              : t("teacher.schedule.noLessons")}
          </p>
        </div>
        {selected !== todayIso && (
          <button type="button" onClick={goToday} className="u-press min-h-[36px] rounded-full border border-accent px-3 text-xs font-semibold text-accent-dark">
            {t("teacher.schedule.today")}
          </button>
        )}
      </div>

      {loading && !week ? (
        <div className="space-y-3">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      ) : (
        <div className={cn(loading && "opacity-60")}>
          <NowCard lesson={focus} current={current} onMark={mark} />
          {dayLessons.length === 0 ? (
            <Card padding="p-6" className="flex flex-col items-center gap-2 text-center">
              <span className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-feruza text-white">
                <KoshinStar size={26} strokeWidth={6} />
              </span>
              <p className="font-display text-base font-semibold text-fg">{t("teacher.schedule.freeTitle")}</p>
              <p className="text-xs text-fg-muted">{t("teacher.schedule.freeBody")}</p>
            </Card>
          ) : (
            <div className={cn(focus && "mt-4")}>
              {rows.map((row) =>
                row.type === "break" ? (
                  <BreakRow key={row.key} minutes={row.minutes} />
                ) : (
                  <LessonRow key={row.key} lesson={row.lesson} onMark={mark} onOpenGroup={openGroup} />
                ),
              )}
            </div>
          )}
        </div>
      )}

      {!loading && week && week.lessons.length === 0 && (
        <p className="flex items-center justify-center gap-1.5 text-xs text-fg-muted">
          <CalendarDays size={13} />
          {t("teacher.schedule.emptyWeek")}
        </p>
      )}

      <FirstVisitGuide id="schedule-v2" steps={guideSteps} />
    </div>
  );
}

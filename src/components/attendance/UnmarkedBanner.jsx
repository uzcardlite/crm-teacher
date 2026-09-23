import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { AlertTriangle, Flame, Lock } from "lucide-react";
import { getMyAttendanceDiscipline } from "../../api/teacher";
import Card from "../ui/Card";
import { cn } from "../../utils/cn";

// "2026-03-10" -> "10.03"
function shortDate(iso) {
  const [, month, day] = String(iso).split("-");
  return `${day}.${month}`;
}

/**
 * The registers this teacher still owes. Renders nothing while loading, on
 * failure, or when everything is marked — an empty screen is the good case and
 * must not carry a warning box.
 *
 * `onPick(lesson)` lets the attendance page jump straight to that group/date.
 */
export default function UnmarkedBanner({ onPick, showStreak = false, refreshKey = 0 }) {
  const { t } = useTranslation();
  const ns = "teacher.attendance.discipline";
  const [data, setData] = useState(null);

  useEffect(() => {
    let cancelled = false;
    getMyAttendanceDiscipline()
      .then((result) => {
        if (!cancelled) setData(result);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [refreshKey]);

  if (!data) return null;

  const { to_mark: toMark, locked, streak_days: streak } = data;
  const nothingOwed = toMark.length === 0 && locked.length === 0;

  if (nothingOwed) {
    // Positive reinforcement only; never an empty red box.
    if (!showStreak || streak < 1) return null;
    return (
      <Card padding="p-4" className="flex items-center gap-3 border-success/40 bg-success-bg">
        <Flame size={18} className="shrink-0 text-success" />
        <p className="text-sm font-semibold text-success">{t(`${ns}.streak`, { n: streak })}</p>
      </Card>
    );
  }

  return (
    <Card padding="p-4" className="border-danger/40 bg-danger-bg">
      <div className="flex items-start gap-3">
        <AlertTriangle size={18} className="mt-0.5 shrink-0 text-danger" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-danger">
            {t(`${ns}.title`)} · {toMark.length + locked.length}
          </p>
          <p className="mt-0.5 text-xs text-danger/80">{t(`${ns}.subtitle`)}</p>

          {toMark.length > 0 && (
            <ul className="mt-3 flex flex-col gap-1.5">
              {toMark.map((lesson) => (
                <li key={`${lesson.date}-${lesson.group_id}`}>
                  <button
                    type="button"
                    onClick={() => onPick?.(lesson)}
                    disabled={!onPick}
                    className={cn(
                      "flex w-full items-center gap-2 rounded-btn border border-line bg-surface px-3 py-2 text-left text-sm transition-colors",
                      onPick && "hover:bg-surface-sunken",
                    )}
                  >
                    <span className="shrink-0 font-semibold tabular-nums text-fg">
                      {shortDate(lesson.date)}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-fg-secondary">
                      {lesson.group_name}
                      {lesson.time ? ` · ${lesson.time}` : ""}
                    </span>
                    <span className="shrink-0 text-xs font-semibold text-accent-dark dark:text-accent">
                      {lesson.state === "pending" ? t(`${ns}.pending`) : t(`${ns}.openLesson`)}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}

          {locked.length > 0 && (
            <div className="mt-3 rounded-btn border border-line bg-surface px-3 py-2">
              <p className="flex items-center gap-1.5 text-xs font-semibold text-fg-secondary">
                <Lock size={12} className="shrink-0 text-fg-faint" />
                {t(`${ns}.lockedTitle`)} · {locked.length}
              </p>
              <p className="mt-1 text-[11px] leading-snug text-fg-muted">
                {t(`${ns}.lockedHint`, { n: data.backfill_days })}
              </p>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}

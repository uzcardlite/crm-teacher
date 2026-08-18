import { useEffect, useRef, useState } from "react";
import { Bell } from "lucide-react";
import { useTranslation } from "react-i18next";
import { getTeacherAnnouncementFeed } from "../../api/teacher";
import { cn } from "../../utils/cn";

const SEEN_KEY = "crm_teacher_announcements_seen_at";

function getSeenAt() {
  const raw = localStorage.getItem(SEEN_KEY);
  const ts = raw ? Date.parse(raw) : 0;
  return Number.isNaN(ts) ? 0 : ts;
}

function formatWhen(iso, t) {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return t("teacher.notifications.now");
  if (mins < 60) return t("teacher.notifications.minutesAgo", { count: mins });
  const hours = Math.floor(mins / 60);
  if (hours < 24) return t("teacher.notifications.hoursAgo", { count: hours });
  const days = Math.floor(hours / 24);
  if (days < 7) return t("teacher.notifications.daysAgo", { count: days });
  return new Date(iso).toLocaleDateString();
}

// Live announcement inbox for teachers (super-admin broadcasts to the teachers
// audience). Unread tracked per-device in localStorage.
export default function NotificationBell() {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([]);
  const [seenAt, setSeenAt] = useState(getSeenAt);
  const ref = useRef(null);

  useEffect(() => {
    let alive = true;
    getTeacherAnnouncementFeed()
      .then((data) => alive && setItems(Array.isArray(data) ? data : []))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (!open) return undefined;
    function onClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    function onKey(e) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const unread = items.filter((a) => new Date(a.created_at).getTime() > seenAt).length;

  function toggle() {
    const next = !open;
    setOpen(next);
    if (next && unread > 0) {
      const now = new Date().toISOString();
      localStorage.setItem(SEEN_KEY, now);
      setSeenAt(Date.parse(now));
    }
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={toggle}
        aria-label={t("teacher.notifications.title")}
        className="relative flex h-9 w-9 items-center justify-center rounded-full text-fg-muted transition-colors hover:bg-surface-sunken"
      >
        <Bell size={20} />
        {unread > 0 && (
          <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-danger px-1 text-[10px] font-bold text-white ring-2 ring-surface">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="fixed right-3 top-[3.75rem] z-50 w-[calc(100vw-1.5rem)] max-w-[22rem] overflow-hidden rounded-card border border-line bg-surface-raised shadow-card md:absolute md:right-0 md:top-full md:mt-2 md:w-80">
          <div className="flex items-center justify-between border-b border-line px-4 py-3">
            <span className="text-sm font-semibold text-fg">
              {t("teacher.notifications.title")}
            </span>
            {items.length > 0 && (
              <span className="text-xs text-fg-muted">
                {t("teacher.notifications.count", { count: items.length })}
              </span>
            )}
          </div>
          <div className="max-h-96 overflow-y-auto">
            {items.length === 0 ? (
              <div className="px-4 py-10 text-center text-sm text-fg-muted">
                {t("teacher.notifications.empty")}
              </div>
            ) : (
              <ul className="divide-y divide-line">
                {items.map((a) => {
                  const fresh = new Date(a.created_at).getTime() > seenAt;
                  return (
                    <li key={a.id} className={cn("px-4 py-3", fresh && "bg-accent-light/20")}>
                      <div className="flex items-start gap-2">
                        {fresh && (
                          <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-accent" />
                        )}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-baseline justify-between gap-2">
                            <span className="truncate text-sm font-medium text-fg">{a.title}</span>
                            <span className="shrink-0 text-[11px] text-fg-faint">
                              {formatWhen(a.created_at, t)}
                            </span>
                          </div>
                          {a.body && (
                            <p className="mt-0.5 whitespace-pre-wrap break-words text-xs text-fg-secondary">
                              {a.body}
                            </p>
                          )}
                          {a.media_type === "photo" && a.media_url && (
                            <img
                              src={a.media_url}
                              alt=""
                              className="mt-2 max-h-40 w-full rounded-btn object-cover"
                            />
                          )}
                          {a.media_type === "video" && a.media_url && (
                            <video
                              src={a.media_url}
                              controls
                              className="mt-2 max-h-40 w-full rounded-btn"
                            />
                          )}
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  Bell,
  ChevronRight,
  ChevronUp,
  Globe,
  Headset,
  LogOut,
  Moon,
  Settings,
  Sun,
  User,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import Avatar from "../ui/Avatar";
import { cn } from "../../utils/cn";
import { prefetchRoute } from "../../utils/prefetch";
import { LANG_KEY, getStoredLang } from "../../i18n";

const ROLE_LABEL_KEYS = { admin: "profile.roles.admin", qabul: "profile.roles.qabul", kassa: "profile.roles.kassa" };
const THEME_KEY = "crm_theme";

function getStoredTheme() {
  return localStorage.getItem(THEME_KEY) === "dark" ? "dark" : "light";
}

// `placement` adapts the trigger + panel anchoring to where the dropdown
// lives. "sidebar" (default) is the dark sidebar footer: full name/role text
// on a dark trigger, panel opening upward. "header" is the teacher cabinet's
// light sticky header: an avatar-only trigger with the panel opening downward.
export default function ProfileDropdown({ onNavigate, placement = "sidebar" }) {
  const { t, i18n } = useTranslation();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [theme, setTheme] = useState(getStoredTheme);
  const [lang, setLang] = useState(getStoredLang);
  const containerRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;

    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setOpen(false);
      }
    }
    function handleKeyDown(event) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  function toggleTheme() {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    localStorage.setItem(THEME_KEY, next);
    document.documentElement.classList.toggle("dark", next === "dark");
  }

  // Mirrors toggleTheme exactly: flip, persist to localStorage, apply globally.
  function toggleLanguage() {
    const next = lang === "uz" ? "ru" : "uz";
    setLang(next);
    localStorage.setItem(LANG_KEY, next);
    i18n.changeLanguage(next);
    document.documentElement.lang = next;
  }

  function goTo(path) {
    setOpen(false);
    onNavigate?.();
    navigate(path);
  }

  function handleLogout() {
    setOpen(false);
    onNavigate?.();
    logout();
    navigate("/login", { replace: true });
  }

  const roleLabelKey = ROLE_LABEL_KEYS[user?.role_name];
  const roleLabel = roleLabelKey ? t(roleLabelKey) : user?.role_name;
  const isHeader = placement === "header";

  return (
    <div
      ref={containerRef}
      className={cn("relative", !isHeader && "border-t border-sidebar-border px-3 py-4")}
    >
      {open && (
        <div
          className={cn(
            "absolute z-40 overflow-hidden rounded-card border border-line bg-surface shadow-card",
            isHeader ? "right-0 top-full mt-2 w-64" : "bottom-full left-3 right-3 mb-2",
          )}
        >
          <div className="flex items-center justify-between gap-2 border-b border-line px-4 py-3">
            <div className="min-w-0">
              <div className="truncate text-sm font-medium text-fg">
                {user?.full_name}
              </div>
              <div className="truncate text-xs text-fg-muted">{roleLabel}</div>
            </div>
            <button
              type="button"
              onClick={toggleTheme}
              className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full border border-line-strong text-fg-muted transition-colors hover:bg-surface-sunken"
              aria-label={t("profile.toggleTheme")}
            >
              {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
            </button>
          </div>

          <div className="py-1">
            <button
              type="button"
              onClick={() => goTo("/app/profile")}
              onMouseEnter={() => prefetchRoute("/app/profile")}
              className="flex w-full items-center gap-3 px-4 py-2 text-left text-sm text-fg-secondary transition-colors hover:bg-surface-sunken"
            >
              <User size={16} className="text-fg-faint" />
              {t("profile.profile")}
            </button>
            <button
              type="button"
              onClick={() => goTo("/app/profile?tab=markaz")}
              onMouseEnter={() => prefetchRoute("/app/profile")}
              className="flex w-full items-center gap-3 px-4 py-2 text-left text-sm text-fg-secondary transition-colors hover:bg-surface-sunken"
            >
              <Settings size={16} className="text-fg-faint" />
              {t("profile.settings")}
            </button>
            <button
              type="button"
              onClick={toggleLanguage}
              className="flex w-full items-center gap-3 px-4 py-2 text-left text-sm text-fg-secondary transition-colors hover:bg-surface-sunken"
            >
              <Globe size={16} className="text-fg-faint" />
              <span className="flex-1">{t("profile.language")}</span>
              <span className="flex items-center gap-1 text-xs text-fg-faint">
                {lang === "uz" ? t("profile.languageUz") : t("profile.languageRu")}
                <ChevronRight size={14} />
              </span>
            </button>
            <button
              type="button"
              onClick={() => goTo("/app/notifications")}
              onMouseEnter={() => prefetchRoute("/app/notifications")}
              className="flex w-full items-center gap-3 px-4 py-2 text-left text-sm text-fg-secondary transition-colors hover:bg-surface-sunken"
            >
              <Bell size={16} className="text-fg-faint" />
              <span className="flex-1">{t("profile.notifications")}</span>
              <ChevronRight size={14} className="text-fg-faint" />
            </button>
            <button
              type="button"
              onClick={() => goTo("/app/contact-admin")}
              onMouseEnter={() => prefetchRoute("/app/contact-admin")}
              className="flex w-full items-center gap-3 px-4 py-2 text-left text-sm text-fg-secondary transition-colors hover:bg-surface-sunken"
            >
              <Headset size={16} className="text-fg-faint" />
              {t("profile.contactAdmin")}
            </button>
          </div>

          <div className="border-t border-line py-1">
            <button
              type="button"
              onClick={handleLogout}
              className="flex w-full items-center gap-3 px-4 py-2 text-left text-sm text-danger transition-colors hover:bg-danger-bg"
            >
              <LogOut size={16} />
              {t("profile.logout")}
            </button>
          </div>
        </div>
      )}

      {isHeader ? (
        // Tight header slot: an avatar-only trigger (name/role live in the
        // panel), using the app-wide Avatar rather than the sidebar hue.
        <button
          type="button"
          onClick={() => setOpen((prev) => !prev)}
          className="flex items-center rounded-full transition-opacity hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          aria-label={user?.full_name}
        >
          <Avatar photoUrl={user?.photo_url} name={user?.full_name} size="sm" />
        </button>
      ) : (
        <button
          type="button"
          onClick={() => setOpen((prev) => !prev)}
          className="flex w-full items-center gap-2 rounded-btn px-3 py-2 text-left transition-colors hover:bg-sidebar-hover"
        >
          <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center overflow-hidden rounded-full bg-sidebar-active text-sm font-semibold text-sidebar-active-text">
            {user?.photo_url ? (
              <img
                src={user.photo_url}
                alt={user.full_name}
                className="h-full w-full object-cover"
              />
            ) : (
              (user?.full_name || "?").charAt(0).toUpperCase()
            )}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-medium text-white">
              {user?.full_name}
            </span>
            <span className="block truncate text-xs text-sidebar-text">{roleLabel}</span>
          </span>
          <ChevronUp
            size={16}
            className={cn(
              "flex-shrink-0 text-sidebar-text transition-transform",
              !open && "rotate-180",
            )}
          />
        </button>
      )}
    </div>
  );
}

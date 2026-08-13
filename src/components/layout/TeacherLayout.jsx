import { useEffect, useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ChevronRight, Globe, LogOut, Menu, MessageCircle, Moon, Sun, X } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useTenantModules } from "../../context/TenantModulesContext";
import SubscriptionExpired from "../../pages/SubscriptionExpired";
import { TEACHER_NAV_ITEMS, teacherRouteTitle } from "../../constants/teacherNav";
import { getChatUnreadCount } from "../../api/teacher";
import { prefetchAllRoutes, prefetchRoute } from "../../utils/prefetch";
import { cn } from "../../utils/cn";
import { LANG_KEY, getStoredLang } from "../../i18n";
import Avatar from "../ui/Avatar";
import KoshinStar from "../ui/KoshinStar";

const CHAT_PATH = "/teacher/chat";
const UNREAD_POLL_MS = 12000;
const THEME_KEY = "crm_theme";

function getStoredTheme() {
  return localStorage.getItem(THEME_KEY) === "dark" ? "dark" : "light";
}

// Mobile-first cabinet shell: a sticky light header + a page container + a
// fixed bottom tab-bar (there is no desktop sidebar). The whole cabinet is
// held to a phone-width column with max-w-lg, on desktop as well as mobile.
// The ☰ drawer is the single home for everything personal: profile identity,
// the overflow nav items, day/night mode, language and logout.
export default function TeacherLayout() {
  const { t, i18n } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { hasPermission } = useTenantModules();
  const [unreadCount, setUnreadCount] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const [theme, setTheme] = useState(getStoredTheme);
  const [lang, setLang] = useState(getStoredLang);

  useEffect(() => {
    prefetchAllRoutes("/teacher");
  }, []);

  // Close the ☰ menu whenever the route changes (e.g. after tapping an item).
  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  const canChat = hasPermission("teacher_cabinet.chat");

  // Global unread badge for the chat tab. Polled only when the teacher has the
  // chat permission and only while the tab is visible; same silent-refresh
  // rhythm as the open conversation, no spinner.
  useEffect(() => {
    if (!canChat) return undefined;
    const load = () => {
      if (document.visibilityState !== "visible") return;
      getChatUnreadCount()
        .then((data) => setUnreadCount(data?.count ?? 0))
        .catch(() => {});
    };
    load();
    const interval = setInterval(load, UNREAD_POLL_MS);
    document.addEventListener("visibilitychange", load);
    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", load);
    };
  }, [canChat, location.pathname]);

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

  function handleLogout() {
    setMenuOpen(false);
    logout();
    navigate("/login", { replace: true });
  }

  const visibleTabs = TEACHER_NAV_ITEMS.filter(
    (item) => !item.permission || hasPermission(item.permission),
  );
  // Up to 5 primary items in the bottom bar; header-only items (chat) live in
  // the header pill; the rest open from the ☰ menu.
  const primaryTabs = visibleTabs.filter((item) => item.primary);
  const moreTabs = visibleTabs.filter((item) => !item.primary && !item.headerOnly);

  // If /auth/me ever reports the teacher's tenant subscription as blocked,
  // fall back to the block screen. (The primary teacher path is the apiClient
  // 403 subscription_expired interceptor, since /auth/me subscription is null
  // for teachers.) Super admin never carries this flag. Placed after all hooks
  // to keep hook order stable.
  if (user?.subscription?.blocked === true) {
    return <SubscriptionExpired />;
  }

  const drawerRowClass =
    "flex w-full items-center gap-3 px-4 py-3 text-sm font-medium transition-colors";

  return (
    <div className="min-h-dvh bg-background">
      <header className="sticky top-0 z-30 flex items-center justify-between gap-2 border-b border-line bg-surface/85 px-4 py-3 shadow-card backdrop-blur-md">
        {/* National accent: a koshin star in a soft amber chip next to the page
            title — a quiet, consistent brand cue across every screen. */}
        <div className="flex min-w-0 items-center gap-2.5">
          <button
            type="button"
            onClick={() => setMenuOpen(true)}
            aria-label={t("teacher.nav.more")}
            className="-ml-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-fg-muted transition-colors hover:bg-surface-sunken"
          >
            <Menu size={20} />
          </button>
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-btn bg-accent-light/25 text-accent-dark dark:text-accent">
            <KoshinStar size={15} strokeWidth={7} />
          </span>
          <h1 className="truncate text-base font-semibold text-fg">
            {teacherRouteTitle(location.pathname, t)}
          </h1>
        </div>
        {/* Right side: the "O'quvchim" chat pill (Farzandim's "Ustoz" pattern
            mirrored for teachers) + the avatar door into the drawer. */}
        <div className="flex shrink-0 items-center gap-2">
          {canChat && (
            <button
              type="button"
              onClick={() => navigate(CHAT_PATH)}
              onMouseEnter={() => prefetchRoute(CHAT_PATH)}
              aria-label={
                unreadCount > 0
                  ? t("teacher.chatButton.ariaUnread", { count: unreadCount })
                  : t("teacher.chatButton.aria")
              }
              className="relative flex items-center gap-1.5 rounded-full bg-accent-light/30 py-1.5 pl-3 pr-3.5 text-accent-dark transition-colors hover:bg-accent-light/50 active:bg-accent-light/60 dark:bg-accent/15 dark:text-accent-light dark:hover:bg-accent/25"
            >
              <MessageCircle size={18} />
              <span className="text-sm font-semibold">{t("teacher.chatButton.label")}</span>
              {unreadCount > 0 && (
                <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-danger ring-2 ring-surface" />
              )}
            </button>
          )}
          <button
            type="button"
            onClick={() => setMenuOpen(true)}
            aria-label={user?.full_name}
            className="flex items-center rounded-full transition-opacity hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            <Avatar photoUrl={user?.photo_url} name={user?.full_name} size="sm" />
          </button>
        </div>
      </header>

      {/* ☰ drawer: profile identity on a dark national header, overflow nav,
          then the personal controls (theme, language) and logout. */}
      {menuOpen && (
        <div className="fixed inset-0 z-50">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setMenuOpen(false)}
          />
          <div className="absolute inset-y-0 left-0 flex w-72 max-w-[85%] flex-col bg-surface shadow-card">
            {/* Profile header: glazed-feruza tile panel with a gilt koshin
                watermark — the gold-on-turquoise pairing of a madrasa portal. */}
            <div className="relative overflow-hidden bg-gradient-feruza px-4 pb-4 pt-4 text-white">
              <KoshinStar
                size={110}
                strokeWidth={4}
                className="pointer-events-none absolute -right-8 -top-8 text-accent-light/25"
              />
              <div className="flex items-start justify-between">
                <span className="rounded-full bg-white/15 p-1">
                  <Avatar photoUrl={user?.photo_url} name={user?.full_name} size="lg" />
                </span>
                <button
                  type="button"
                  onClick={() => setMenuOpen(false)}
                  aria-label={t("teacher.nav.close")}
                  className="flex h-8 w-8 items-center justify-center rounded-full text-white/80 transition-colors hover:bg-white/15"
                >
                  <X size={18} />
                </button>
              </div>
              <p className="mt-3 truncate text-base font-semibold">{user?.full_name}</p>
              <p className="truncate text-xs text-white/75">
                {t("profile.roles.teacher")}
              </p>
            </div>

            {moreTabs.length > 0 && (
              <div className="border-b border-line py-2">
                {moreTabs.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    onMouseEnter={() => prefetchRoute(item.to)}
                    className={({ isActive }) =>
                      cn(
                        drawerRowClass,
                        isActive
                          ? "bg-accent-light/20 text-accent-dark"
                          : "text-fg-secondary hover:bg-surface-sunken",
                      )
                    }
                  >
                    <item.icon size={20} className="shrink-0" />
                    <span>{t(item.labelKey)}</span>
                  </NavLink>
                ))}
              </div>
            )}

            <div className="flex-1 overflow-y-auto py-2">
              <button
                type="button"
                onClick={toggleTheme}
                className={cn(drawerRowClass, "text-fg-secondary hover:bg-surface-sunken")}
              >
                {theme === "dark" ? (
                  <Sun size={20} className="shrink-0 text-fg-faint" />
                ) : (
                  <Moon size={20} className="shrink-0 text-fg-faint" />
                )}
                <span className="flex-1 text-left">
                  {t(theme === "dark" ? "profile.lightMode" : "profile.darkMode")}
                </span>
                {/* Small track/knob switch so the current mode is glanceable. */}
                <span
                  className={cn(
                    "relative h-5 w-9 shrink-0 rounded-full transition-colors",
                    theme === "dark" ? "bg-accent" : "bg-line-strong",
                  )}
                >
                  <span
                    className={cn(
                      "absolute top-0.5 h-4 w-4 rounded-full bg-white shadow-card transition-transform",
                      theme === "dark" ? "translate-x-[18px]" : "translate-x-0.5",
                    )}
                  />
                </span>
              </button>
              <button
                type="button"
                onClick={toggleLanguage}
                className={cn(drawerRowClass, "text-fg-secondary hover:bg-surface-sunken")}
              >
                <Globe size={20} className="shrink-0 text-fg-faint" />
                <span className="flex-1 text-left">{t("profile.language")}</span>
                <span className="flex items-center gap-1 text-xs text-fg-faint">
                  {lang === "uz" ? t("profile.languageUz") : t("profile.languageRu")}
                  <ChevronRight size={14} />
                </span>
              </button>
            </div>

            <div className="border-t border-line py-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
              <button
                type="button"
                onClick={handleLogout}
                className={cn(drawerRowClass, "text-danger hover:bg-danger-bg")}
              >
                <LogOut size={20} className="shrink-0" />
                {t("profile.logout")}
              </button>
            </div>
          </div>
        </div>
      )}

      <main>
        <Outlet />
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface/90 pb-[env(safe-area-inset-bottom)] shadow-card backdrop-blur-md">
        <div className="mx-auto flex max-w-lg items-stretch justify-around">
          {primaryTabs.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              onMouseEnter={() => prefetchRoute(item.to)}
              className={({ isActive }) =>
                cn(
                  "relative flex flex-1 flex-col items-center gap-1 pb-2 pt-2.5 text-[11px] font-medium transition-colors",
                  isActive ? "text-accent" : "text-fg-muted hover:text-fg-secondary",
                )
              }
            >
              {({ isActive }) => (
                <>
                  {/* Active indicator: a short amber bar hugging the top edge. */}
                  <span
                    className={cn(
                      "absolute inset-x-6 top-0 h-0.5 rounded-full bg-accent transition-opacity",
                      isActive ? "opacity-100" : "opacity-0",
                    )}
                  />
                  <span
                    className={cn(
                      "relative flex h-8 w-12 items-center justify-center rounded-full transition-colors",
                      isActive && "bg-accent-light/25",
                    )}
                  >
                    <item.icon size={20} />
                  </span>
                  <span>{t(item.labelKey)}</span>
                </>
              )}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
}

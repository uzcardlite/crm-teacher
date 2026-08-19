import { useEffect, useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  ChevronRight,
  Globe,
  LogOut,
  Menu,
  MessageCircle,
  Moon,
  Settings,
  Sun,
  X,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useTenantModules } from "../../context/TenantModulesContext";
import SubscriptionExpired from "../../pages/SubscriptionExpired";
import { TEACHER_NAV_ITEMS, teacherRouteTitle } from "../../constants/teacherNav";
import { getChatUnreadCount } from "../../api/teacher";
import { prefetchAllRoutes, prefetchRoute } from "../../utils/prefetch";
import { cn } from "../../utils/cn";
import { getStoredLang } from "../../i18n";
import {
  getStoredTheme,
  resolveTheme,
  setLanguage as applyLanguage,
  setTheme as applyTheme,
} from "../../utils/appearance";
import { applyTabBarPrefs } from "../../utils/tabBarPrefs";
import Avatar from "../ui/Avatar";
import KoshinStar from "../ui/KoshinStar";
import NotificationBell from "./NotificationBell";

const CHAT_PATH = "/teacher/chat";
const SETTINGS_PATH = "/teacher/settings";
const UNREAD_POLL_MS = 12000;

// Mobile-first cabinet shell: a sticky light header + a page container + a
// fixed bottom tab-bar (there is no desktop sidebar). The whole cabinet is
// held to a phone-width column with max-w-lg, on desktop as well as mobile.
// The ☰ drawer is the single home for everything personal: profile identity,
// the overflow nav items, day/night mode, language and logout.
export default function TeacherLayout() {
  const { t } = useTranslation();
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

  // Quick flip between light and dark. A teacher who wants "follow the
  // system" picks it in Sozlamalar; this button only ever lands on an explicit
  // choice, which is what makes it predictable as a one-tap control.
  function toggleTheme() {
    setTheme(applyTheme(resolveTheme(theme) === "dark" ? "light" : "dark"));
  }

  function toggleLanguage() {
    setLang(applyLanguage(lang === "uz" ? "ru" : "uz"));
  }

  function handleLogout() {
    setMenuOpen(false);
    logout();
    navigate("/login", { replace: true });
  }

  // Permission gating first, then the teacher's own order/hidden list from
  // Sozlamalar. Prefs never widen access: an item the role cannot see stays
  // out either way.
  const allowedTabs = TEACHER_NAV_ITEMS.filter(
    (item) => !item.permission || hasPermission(item.permission),
  );
  const visibleTabs = applyTabBarPrefs(
    allowedTabs.filter((item) => !item.headerOnly),
    user?.sidebar_prefs,
  ).concat(allowedTabs.filter((item) => item.headerOnly));
  // Up to 5 primary items in the bottom bar; header-only items (chat) live in
  // the header pill; the rest open from the ☰ menu.
  const primaryTabs = visibleTabs.filter((item) => item.primary).slice(0, 5);
  const moreTabs = visibleTabs.filter((item) => !item.primary && !item.headerOnly);

  // If /auth/me ever reports the teacher's tenant subscription as blocked,
  // fall back to the block screen. (The primary teacher path is the apiClient
  // 403 subscription_expired interceptor, since /auth/me subscription is null
  // for teachers.) Super admin never carries this flag. Placed after all hooks
  // to keep hook order stable.
  if (user?.subscription?.blocked === true) {
    return <SubscriptionExpired />;
  }

  // "system" is a valid choice, so the drawer's icon/label/switch describe the
  // appearance in effect, not the raw stored value.
  const isDark = resolveTheme(theme) === "dark";

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
          <NotificationBell />
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
              <p className="truncate text-xs text-white/85">
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
              <NavLink
                to={SETTINGS_PATH}
                onMouseEnter={() => prefetchRoute(SETTINGS_PATH)}
                className={({ isActive }) =>
                  cn(
                    drawerRowClass,
                    isActive
                      ? "bg-accent-light/20 text-accent-dark"
                      : "text-fg-secondary hover:bg-surface-sunken",
                  )
                }
              >
                <Settings size={20} className="shrink-0 text-fg-faint" />
                <span className="flex-1 text-left">{t("teacher.nav.settings")}</span>
                <ChevronRight size={14} className="text-fg-faint" />
              </NavLink>
              <button
                type="button"
                onClick={toggleTheme}
                className={cn(drawerRowClass, "text-fg-secondary hover:bg-surface-sunken")}
              >
                {/* Icon + label name the CURRENT mode, and the switch is ON in
                    that same mode — so nothing contradicts (dark → Moon +
                    "Tungi rejim" + switch on). */}
                {isDark ? (
                  <Moon size={20} className="shrink-0 text-fg-faint" />
                ) : (
                  <Sun size={20} className="shrink-0 text-fg-faint" />
                )}
                <span className="flex-1 text-left">
                  {t(isDark ? "profile.darkMode" : "profile.lightMode")}
                </span>
                {/* Flex + padding keeps the knob inside the track at both ends:
                    32px inner width, 16px knob, 16px travel (translate-x-4). */}
                <span
                  className={cn(
                    "flex h-5 w-9 shrink-0 items-center rounded-full px-0.5 transition-colors",
                    isDark ? "bg-accent" : "bg-line-strong",
                  )}
                >
                  <span
                    className={cn(
                      "h-4 w-4 rounded-full bg-white shadow-card transition-transform",
                      isDark ? "translate-x-4" : "translate-x-0",
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
        {/* Re-keyed on the path so each section fades + lifts in (see index.css). */}
        <div key={location.pathname} className="page-enter">
          <Outlet />
        </div>
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
                  "relative flex flex-1 flex-col items-center gap-1 pb-2 pt-2.5 text-[11px] transition-colors",
                  isActive
                    ? "text-accent-dark dark:text-accent font-semibold"
                    : "text-fg-muted font-medium hover:text-fg-secondary",
                )
              }
            >
              {({ isActive }) => (
                <>
                  {/* Active tab: the icon rides a gilt gradient pill with a
                      soft gold glow — a finished, tappable marker rather than a
                      faint tint. Inactive icons sit flat. */}
                  <span
                    className={cn(
                      "relative flex h-9 w-14 items-center justify-center rounded-full transition-all duration-200",
                      isActive
                        ? "bg-gradient-gold text-accent-fg shadow-glow-accent"
                        : "text-fg-muted",
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

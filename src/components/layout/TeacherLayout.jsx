import { useEffect, useRef, useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  ChevronRight,
  Globe,
  Headset,
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
import { getChatUnreadCount, getMyAttendanceDiscipline } from "../../api/teacher";
import { prefetchAllRoutes, prefetchRoute } from "../../utils/prefetch";
import { SUPPORT_URL, openSupport } from "../../utils/support";
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
import NotificationBell from "./NotificationBell";

const CHAT_PATH = "/teacher/chat";
const SETTINGS_PATH = "/teacher/settings";
const UNREAD_POLL_MS = 12000;
// The raised centre button of the dock: the teacher's most frequent action.
const CENTER_PATH = "/teacher/attendance";

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
  // Registers still owed — the badge on the centre "Davomat" button.
  const [owedCount, setOwedCount] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const tabBarRef = useRef(null);

  // Publish the tab bar's real height (labels can wrap, and iPhones add a
  // home-indicator inset) so pages can park a fixed bar right above it.
  useEffect(() => {
    const node = tabBarRef.current;
    if (!node) return undefined;
    const root = document.documentElement;
    const publish = () => root.style.setProperty("--tab-bar-h", `${node.offsetHeight}px`);
    publish();
    if (typeof ResizeObserver === "undefined") return undefined;
    const observer = new ResizeObserver(publish);
    observer.observe(node);
    return () => {
      observer.disconnect();
      root.style.removeProperty("--tab-bar-h");
    };
  }, []);
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
  const canAttendance = hasPermission("teacher_cabinet.attendance");

  // Refreshed on every page change, so the badge drops as soon as a register
  // is saved and the teacher moves on.
  useEffect(() => {
    if (!canAttendance) return;
    getMyAttendanceDiscipline()
      .then((data) => setOwedCount((data?.to_mark?.length ?? 0) + (data?.locked?.length ?? 0)))
      .catch(() => {});
  }, [canAttendance, location.pathname]);

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
  const allowedTabs = TEACHER_NAV_ITEMS.filter((item) => {
    if (!item.permission) return true;
    // An array permission is "any of" — e.g. Rag'batlantirish stays visible
    // to a teacher who only has reactions OR only behaviour, not both.
    return Array.isArray(item.permission)
      ? item.permission.some(hasPermission)
      : hasPermission(item.permission);
  });
  const visibleTabs = applyTabBarPrefs(
    allowedTabs.filter((item) => !item.headerOnly),
    user?.sidebar_prefs,
  ).concat(allowedTabs.filter((item) => item.headerOnly));
  // Up to 5 primary items in the bottom bar; header-only items (chat) live in
  // the header pill; the rest open from the ☰ menu.
  const primaryTabs = visibleTabs.filter((item) => item.primary).slice(0, 5);
  // "Davomat" always takes the dock's raised centre seat, whatever order the
  // teacher saved in Sozlamalar; the other tabs keep their order around it.
  const centerIndex = primaryTabs.findIndex((item) => item.to === CENTER_PATH);
  if (centerIndex !== -1) {
    const [centerTab] = primaryTabs.splice(centerIndex, 1);
    primaryTabs.splice(Math.floor(primaryTabs.length / 2), 0, centerTab);
  }
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
    // Transparent root so the ambient corner-glows painted on body::before show
    // through the gaps between cards (see index.css). Surfaces paint their own
    // backgrounds on top.
    <div className="min-h-dvh">
      <header className="sticky top-0 z-30 flex items-center justify-between gap-2 border-b border-line bg-background/85 px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))] backdrop-blur-xl">
        <div className="flex min-w-0 items-center gap-2.5">
          <button
            type="button"
            onClick={() => setMenuOpen(true)}
            aria-label={t("teacher.nav.more")}
            className="u-press-sm -ml-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-fg-muted hover:bg-surface-sunken"
          >
            <Menu size={20} />
          </button>
          {teacherRouteTitle(location.pathname, t) && (
            <h1 className="truncate text-base font-semibold text-fg">
              {teacherRouteTitle(location.pathname, t)}
            </h1>
          )}
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
              className="u-press relative flex items-center gap-1.5 rounded-full bg-surface-sunken py-1.5 pl-3 pr-3.5 text-fg hover:bg-line"
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
            className="u-press-sm flex items-center rounded-full hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
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
            {/* Profile header: a quiet grey panel with the teacher's identity. */}
            <div className="relative overflow-hidden border-b border-line bg-surface-sunken px-4 pb-4 pt-[max(1rem,env(safe-area-inset-top))] text-fg">
              <div className="flex items-start justify-between">
                <Avatar photoUrl={user?.photo_url} name={user?.full_name} size="lg" />
                <button
                  type="button"
                  onClick={() => setMenuOpen(false)}
                  aria-label={t("teacher.nav.close")}
                  className="flex h-9 w-9 items-center justify-center rounded-full text-fg-muted transition-colors hover:bg-line"
                >
                  <X size={18} />
                </button>
              </div>
              <p className="mt-3 truncate text-base font-semibold">{user?.full_name}</p>
              <p className="truncate text-xs text-fg-muted">
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
                          ? "bg-surface-sunken font-semibold text-fg"
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
              <a
                href={SUPPORT_URL}
                target="_blank"
                rel="noopener noreferrer"
                onClick={openSupport}
                className={cn(drawerRowClass, "text-fg-secondary hover:bg-surface-sunken")}
              >
                <Headset size={20} className="shrink-0 text-fg-faint" />
                <span className="flex-1 text-left">{t("teacher.nav.support")}</span>
                <ChevronRight size={14} className="text-fg-faint" />
              </a>
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

      {/* Room for the floating dock and its raised centre button. */}
      <main className="pb-8">
        {/* Re-keyed on the path so each section fades + lifts in (see index.css). */}
        <div key={location.pathname} className="page-enter">
          <Outlet />
        </div>
      </main>

      {/* Floating dock: inset from the edges, hairline border, and the register
          ("Davomat") as a raised primary button carrying the owed count. */}
      <div
        ref={tabBarRef}
        className="pointer-events-none fixed inset-x-0 bottom-0 z-40 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]"
      >
        <nav
          aria-label={t("teacher.nav.more")}
          className="pointer-events-auto mx-auto grid h-[66px] max-w-lg items-center rounded-[22px] border border-line bg-surface/90 shadow-dock backdrop-blur-xl"
          style={{ gridTemplateColumns: `repeat(${Math.max(primaryTabs.length, 1)}, minmax(0, 1fr))` }}
        >
          {primaryTabs.map((item) => {
            const label = t(item.shortLabelKey || item.labelKey);
            if (item.to === CENTER_PATH) {
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onMouseEnter={() => prefetchRoute(item.to)}
                  aria-label={owedCount ? t("teacher.nav.attendanceOwed", { count: owedCount }) : label}
                  className="u-press-sm flex flex-col items-center"
                >
                  {({ isActive }) => (
                    <>
                      <span
                        className={cn(
                          "relative -mt-7 flex h-[58px] w-[58px] items-center justify-center rounded-full border-4 border-background bg-primary text-primary-fg transition-shadow",
                          isActive && "ring-2 ring-accent ring-offset-2 ring-offset-background",
                        )}
                      >
                        <item.icon size={24} strokeWidth={2.2} />
                        {owedCount > 0 && (
                          <span className="absolute -right-2 -top-1.5 flex h-[22px] min-w-[22px] items-center justify-center rounded-full border-2 border-background bg-danger px-1.5 text-[11px] font-extrabold leading-none text-white">
                            {owedCount > 99 ? "99+" : owedCount}
                          </span>
                        )}
                      </span>
                      <span
                        className={cn(
                          "mt-0.5 text-[11px]",
                          isActive ? "font-semibold text-fg" : "font-medium text-fg-muted",
                        )}
                      >
                        {label}
                      </span>
                    </>
                  )}
                </NavLink>
              );
            }
            return (
              <NavLink
                key={item.to}
                to={item.to}
                onMouseEnter={() => prefetchRoute(item.to)}
                className={({ isActive }) =>
                  cn(
                    "u-press-sm relative flex h-[60px] min-w-0 flex-col items-center justify-center gap-1 transition-colors",
                    isActive ? "text-fg" : "text-fg-faint hover:text-fg-secondary",
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    <item.icon size={22} strokeWidth={isActive ? 2.4 : 1.9} />
                    <span
                      className={cn(
                        "w-full truncate px-0.5 text-center text-[11px]",
                        isActive ? "font-semibold" : "font-medium",
                      )}
                    >
                      {label}
                    </span>
                  </>
                )}
              </NavLink>
            );
          })}
        </nav>
      </div>
    </div>
  );
}

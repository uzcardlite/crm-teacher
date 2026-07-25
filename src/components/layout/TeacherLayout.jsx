import { useEffect, useState } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Menu, X } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useTenantModules } from "../../context/TenantModulesContext";
import SubscriptionExpired from "../../pages/SubscriptionExpired";
import { TEACHER_NAV_ITEMS, teacherRouteTitle } from "../../constants/teacherNav";
import { getChatUnreadCount } from "../../api/teacher";
import { prefetchAllRoutes, prefetchRoute } from "../../utils/prefetch";
import { cn } from "../../utils/cn";
import KoshinStar from "../ui/KoshinStar";
import ProfileDropdown from "./ProfileDropdown";

const CHAT_PATH = "/teacher/chat";
const UNREAD_POLL_MS = 12000;

// Mobile-first cabinet shell: a sticky light header + a page container + a
// fixed bottom tab-bar (there is no sidebar). The whole cabinet is held to a
// phone-width column with max-w-lg, on desktop as well as mobile.
export default function TeacherLayout() {
  const { t } = useTranslation();
  const location = useLocation();
  const { user } = useAuth();
  const { hasPermission } = useTenantModules();
  const [unreadCount, setUnreadCount] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);

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

  const visibleTabs = TEACHER_NAV_ITEMS.filter(
    (item) => !item.permission || hasPermission(item.permission),
  );
  // Up to 4 primary items in the bottom bar; the rest open from the ☰ menu.
  const primaryTabs = visibleTabs.filter((item) => item.primary);
  const moreTabs = visibleTabs.filter((item) => !item.primary);

  // If /auth/me ever reports the teacher's tenant subscription as blocked,
  // fall back to the block screen. (The primary teacher path is the apiClient
  // 403 subscription_expired interceptor, since /auth/me subscription is null
  // for teachers.) Super admin never carries this flag. Placed after all hooks
  // to keep hook order stable.
  if (user?.subscription?.blocked === true) {
    return <SubscriptionExpired />;
  }

  return (
    <div className="min-h-dvh bg-background">
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-line bg-surface px-4 py-3">
        {/* National accent: a small koshin star mark in brand amber next to the
            page title — a quiet, consistent amber cue across every screen. */}
        <div className="flex min-w-0 items-center gap-2">
          {moreTabs.length > 0 && (
            <button
              type="button"
              onClick={() => setMenuOpen(true)}
              aria-label={t("teacher.nav.more")}
              className="-ml-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-fg-muted transition-colors hover:bg-surface-sunken"
            >
              <Menu size={20} />
            </button>
          )}
          <KoshinStar size={16} strokeWidth={7} className="shrink-0 text-accent" />
          <h1 className="truncate text-sm font-semibold text-fg">
            {teacherRouteTitle(location.pathname, t)}
          </h1>
        </div>
        <ProfileDropdown placement="header" />
      </header>

      {/* ☰ menu: the nav items that don't fit the 4-slot bottom bar. */}
      {menuOpen && (
        <div className="fixed inset-0 z-50">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setMenuOpen(false)}
          />
          <div className="absolute inset-y-0 left-0 flex w-72 max-w-[80%] flex-col bg-surface shadow-card">
            <div className="flex items-center justify-between border-b border-line px-4 py-3">
              <div className="flex items-center gap-2">
                <KoshinStar size={16} strokeWidth={7} className="text-accent" />
                <span className="text-sm font-semibold text-fg">{t("teacher.nav.more")}</span>
              </div>
              <button
                type="button"
                onClick={() => setMenuOpen(false)}
                aria-label={t("teacher.nav.close")}
                className="flex h-8 w-8 items-center justify-center rounded-full text-fg-muted transition-colors hover:bg-surface-sunken"
              >
                <X size={18} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto py-2">
              {moreTabs.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onMouseEnter={() => prefetchRoute(item.to)}
                  className={({ isActive }) =>
                    cn(
                      "flex items-center gap-3 px-4 py-3 text-sm font-medium transition-colors",
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
          </div>
        </div>
      )}

      <main>
        <Outlet />
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface">
        <div className="mx-auto flex max-w-lg items-stretch justify-around">
          {primaryTabs.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              onMouseEnter={() => prefetchRoute(item.to)}
              className={({ isActive }) =>
                cn(
                  "flex flex-1 flex-col items-center gap-1 py-2 text-xs font-medium transition-colors",
                  isActive ? "text-accent" : "text-fg-muted",
                )
              }
            >
              <span className="relative">
                <item.icon size={20} />
                {item.to === CHAT_PATH && unreadCount > 0 && (
                  <span className="absolute -right-2 -top-1 inline-flex min-w-[16px] items-center justify-center rounded-full bg-danger px-1 text-[10px] font-semibold leading-none text-white">
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </span>
                )}
              </span>
              <span>{t(item.labelKey)}</span>
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
}

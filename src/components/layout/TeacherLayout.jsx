import { useEffect, useState } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
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

  useEffect(() => {
    prefetchAllRoutes("/teacher");
  }, []);

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
          <KoshinStar size={16} strokeWidth={7} className="shrink-0 text-accent" />
          <h1 className="truncate text-sm font-semibold text-fg">
            {teacherRouteTitle(location.pathname, t)}
          </h1>
        </div>
        <ProfileDropdown placement="header" />
      </header>

      <main>
        <Outlet />
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface">
        <div className="mx-auto flex max-w-lg items-stretch justify-around">
          {visibleTabs.map((item) => (
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

import { NavLink } from "react-router-dom";
import { X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useTenantModules } from "../../context/TenantModulesContext";
import { NAV_ITEMS } from "../../constants/nav";
import { cn } from "../../utils/cn";
import { prefetchRoute } from "../../utils/prefetch";
import ProfileDropdown from "./ProfileDropdown";

export default function Sidebar({ mobileOpen = false, onClose }) {
  const { t } = useTranslation();
  const { hasModule, hasPermission } = useTenantModules();

  const isItemVisible = (item) => {
    if (!item.module) return true;
    if (!hasModule(item.module)) return false;
    // `permission` is a single required key; `permissionAny` is an any-of list
    // (visible if the user holds at least one of them).
    if (item.permission && !hasPermission(item.permission)) return false;
    if (item.permissionAny && !item.permissionAny.some((key) => hasPermission(key))) return false;
    return true;
  };

  const visibleItems = NAV_ITEMS.filter(isItemVisible);

  return (
    <>
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-gray-900/50 lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex h-screen w-64 flex-shrink-0 flex-col bg-sidebar bg-girih-sidebar text-sidebar-text transition-transform duration-200 ease-in-out",
          "lg:static lg:translate-x-0",
          mobileOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex items-center justify-between px-5 py-5">
          {/* The logo doubles as the way home, which is what people expect of
              it. Closes the mobile drawer too, or the dashboard would open
              behind it. */}
          <NavLink
            to="/app/dashboard"
            onClick={onClose}
            className="flex items-center gap-2 rounded-btn transition-opacity hover:opacity-80"
          >
            <span className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-btn">
              <img src="/logo.svg" alt="" className="h-full w-full object-cover" />
            </span>
            <span className="text-base font-semibold text-white">Milliy CRM</span>
          </NavLink>
          <button
            type="button"
            onClick={onClose}
            className="text-sidebar-text transition-colors hover:text-white lg:hidden"
            aria-label={t("nav.closeMenu")}
          >
            <X size={20} />
          </button>
        </div>

        {/* Scrolls on its own so a long module list never squeezes the
            profile block at the bottom out of view. */}
        <nav className="flex-1 space-y-1 overflow-y-auto px-3">
          {visibleItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={onClose}
              onMouseEnter={() => prefetchRoute(item.to)}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 rounded-btn px-3 py-2.5 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-sidebar-active text-sidebar-active-text"
                    : "text-sidebar-text hover:bg-sidebar-hover",
                )
              }
            >
              <item.icon size={18} />
              {t(item.labelKey)}
            </NavLink>
          ))}
        </nav>

        <ProfileDropdown onNavigate={onClose} />
      </aside>
    </>
  );
}

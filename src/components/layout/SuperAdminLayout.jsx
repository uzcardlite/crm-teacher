import { useEffect } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { LogOut, ShieldCheck } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { cn } from "../../utils/cn";
import { prefetchAllRoutes, prefetchRoute } from "../../utils/prefetch";

const NAV_ITEMS = [
  { to: "/superadmin/dashboard", label: "Boshqaruv paneli" },
  { to: "/superadmin/tenants", label: "Tenantlar" },
  { to: "/superadmin/leads", label: "Lidlar" },
  { to: "/superadmin/roles", label: "Rollar" },
];

export default function SuperAdminLayout() {
  const { logout } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    prefetchAllRoutes("/superadmin");
  }, []);

  function handleLogout() {
    logout();
    navigate("/login", { replace: true });
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="flex items-center justify-between border-b border-sidebar-border bg-sidebar px-5 py-3">
        <div className="flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-btn bg-sidebar-active text-sidebar-active-text">
            <ShieldCheck size={18} />
          </span>
          <span className="text-base font-semibold text-white">Super Admin</span>
        </div>

        <nav className="flex items-center gap-1">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              onMouseEnter={() => prefetchRoute(item.to)}
              className={({ isActive }) =>
                cn(
                  "rounded-btn px-3 py-2 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-sidebar-active text-sidebar-active-text"
                    : "text-sidebar-text hover:bg-sidebar-hover",
                )
              }
            >
              {item.label}
            </NavLink>
          ))}
          <button
            type="button"
            onClick={handleLogout}
            className="ml-2 flex items-center gap-2 rounded-btn px-3 py-2 text-sm font-medium text-sidebar-text transition-colors hover:bg-sidebar-hover"
          >
            <LogOut size={16} />
            Chiqish
          </button>
        </nav>
      </header>

      {/* flex-col so a full-height page (the leads board) can claim the
          remaining space with flex-1 instead of a viewport calculation. */}
      <main className="flex flex-1 flex-col">
        <Outlet />
      </main>
    </div>
  );
}

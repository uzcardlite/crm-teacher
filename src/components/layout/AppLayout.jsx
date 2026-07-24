import { useEffect, useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { Menu } from "lucide-react";
import { useTranslation } from "react-i18next";
import Sidebar from "./Sidebar";
import SubscriptionBanner from "./SubscriptionBanner";
import SubscriptionExpired from "../../pages/SubscriptionExpired";
import { useAuth } from "../../context/AuthContext";
import { routeTitle } from "../../constants/nav";
import { prefetchAllRoutes } from "../../utils/prefetch";

export default function AppLayout() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    prefetchAllRoutes("/app");
  }, []);

  // A blocked (expired) tenant admin loses the whole app shell — no sidebar,
  // just the block screen. Only ever true for a real tenant admin whose
  // /auth/me subscription reports blocked; super admin/teacher never carry it.
  if (user?.subscription?.blocked === true) {
    return <SubscriptionExpired />;
  }

  return (
    <div className="flex h-screen bg-background">
      <Sidebar mobileOpen={mobileOpen} onClose={() => setMobileOpen(false)} />

      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-line bg-surface px-4 py-3 lg:hidden">
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            className="flex h-9 w-9 items-center justify-center rounded-btn text-fg-muted transition-colors hover:bg-surface-sunken"
            aria-label={t("nav.openMenu")}
          >
            <Menu size={20} />
          </button>
          <span className="truncate text-sm font-semibold text-fg">
            {routeTitle(location.pathname, t)}
          </span>
        </header>

        {/* flex-col so a full-height page (the leads board) can claim the
            remaining space with flex-1 instead of a viewport calculation. */}
        <main className="flex flex-1 flex-col overflow-y-auto">
          <SubscriptionBanner />
          <Outlet />
        </main>
      </div>
    </div>
  );
}

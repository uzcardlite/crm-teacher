import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { useAuth } from "./AuthContext";
import { getMyModules } from "../api/tenants";

const TenantModulesContext = createContext(null);

// Modules available to every tenant regardless of tariff. Must stay in sync
// with the backend's ALWAYS_ON_MODULES (app/core/module_gate.py).
const ALWAYS_ON_MODULES = new Set(["hr", "teacher_cabinet"]);

export function TenantModulesProvider({ children }) {
  const { user } = useAuth();
  const [modules, setModules] = useState([]);
  const [permissions, setPermissions] = useState([]);
  const [loading, setLoading] = useState(true);

  const isSuperAdmin = user?.role_name === "super_admin" && !user?.tenant_id;
  // A tenant admin has full access to every action in their tenant — mirrors the
  // backend permission bypass (app/core/permissions.py) so no button is hidden.
  const isTenantAdmin = user?.role_name === "admin" && Boolean(user?.tenant_id);

  useEffect(() => {
    if (!user || isSuperAdmin) {
      setModules([]);
      setPermissions([]);
      setLoading(false);
      return undefined;
    }

    let cancelled = false;
    setLoading(true);

    getMyModules()
      .then((data) => {
        if (!cancelled) {
          setModules(data.modules);
          setPermissions(data.permissions || []);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setModules([]);
          setPermissions([]);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [user, isSuperAdmin]);

  // Modules every tenant always has, regardless of their tariff — mirrors the
  // backend's ALWAYS_ON_MODULES so the nav and route guards never hide them.
  const hasModule = useCallback(
    (key) => ALWAYS_ON_MODULES.has(key) || modules.includes(key),
    [modules],
  );
  const hasPermission = useCallback(
    (key) => isTenantAdmin || permissions.includes(key),
    [permissions, isTenantAdmin],
  );

  const value = { modules, hasModule, permissions, hasPermission, loading };

  return (
    <TenantModulesContext.Provider value={value}>
      {children}
    </TenantModulesContext.Provider>
  );
}

export function useTenantModules() {
  const context = useContext(TenantModulesContext);
  if (!context) {
    throw new Error("useTenantModules must be used within a TenantModulesProvider");
  }
  return context;
}

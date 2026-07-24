import { Lock } from "lucide-react";
import { useTenantModules } from "../../context/TenantModulesContext";
import EmptyState from "../ui/EmptyState";
import Spinner from "../ui/Spinner";

export default function ModuleRoute({ moduleKey, requiredPermission, requiredPermissions, children }) {
  const { hasModule, hasPermission, loading } = useTenantModules();

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center py-20">
        <Spinner size={28} />
      </div>
    );
  }

  if (!hasModule(moduleKey)) {
    return (
      <div className="p-6">
        <EmptyState
          icon={Lock}
          title="Bu bo'lim sizning tarifingizda mavjud emas"
          description="Ushbu modulni yoqish uchun administratsiya bilan bog'laning."
        />
      </div>
    );
  }

  // `requiredPermission` is a single key (all-of collapses to one), while
  // `requiredPermissions` is an any-of list — access is granted if the user
  // holds at least one of the listed keys. This lets a page like Reports stay
  // reachable for a role that only has reports.attendance (not reports.finance).
  const permissionKeys = requiredPermissions ?? (requiredPermission ? [requiredPermission] : []);
  const permissionOk = permissionKeys.length === 0 || permissionKeys.some((key) => hasPermission(key));

  if (!permissionOk) {
    return (
      <div className="p-6">
        <EmptyState
          icon={Lock}
          title="Sizda bu bo'limga kirish huquqi yo'q"
          description="Ushbu bo'limga kirish uchun tegishli ruxsat administratsiya tomonidan berilishi kerak."
        />
      </div>
    );
  }

  return children;
}

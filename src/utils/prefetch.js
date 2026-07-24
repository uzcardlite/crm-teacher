// Route path -> dynamic import map. App.jsx lazy() calls reuse these same
// functions so prefetch and render share one chunk (no double download).
export const routeImports = {
  // tenant (admin) pages
  "/app/dashboard": () => import("../pages/admin/Dashboard"),
  "/app/students": () => import("../pages/admin/Students"),
  "/app/hr": () => import("../pages/admin/HR"),
  "/app/hr/employees/:employeeId": () => import("../pages/admin/HrEmployeeProfile"),
  "/app/marketing": () => import("../pages/admin/Marketing"),
  "/app/sms": () => import("../pages/admin/Sms"),
  "/app/moliya": () => import("../pages/admin/Moliya"),
  "/app/reports": () => import("../pages/admin/Reports"),
  "/app/groups": () => import("../pages/admin/Groups"),
  "/app/teachers": () => import("../pages/admin/Teachers"),
  "/app/schedule": () => import("../pages/admin/Schedule"),
  "/app/exams": () => import("../pages/admin/Exams"),
  "/app/homework": () => import("../pages/admin/Homework"),
  "/app/behaviour": () => import("../pages/admin/Behaviour"),
  "/app/booking": () => import("../pages/admin/Booking"),
  "/app/attendance": () => import("../pages/admin/Attendance"),
  "/app/parents": () => import("../pages/admin/Parents"),
  "/app/contracts": () => import("../pages/admin/Contracts"),
  "/app/menu": () => import("../pages/admin/DailyMenu"),
  "/app/filials": () => import("../pages/admin/Filials"),
  "/app/turnstile": () => import("../pages/admin/Turnstile"),
  "/app/profile": () => import("../pages/admin/Profile"),
  "/app/notifications": () => import("../pages/admin/Notifications"),
  "/app/contact-admin": () => import("../pages/admin/ContactAdmin"),
  // teacher cabinet pages
  "/teacher/dashboard": () => import("../pages/teacher/Dashboard"),
  "/teacher/groups": () => import("../pages/teacher/Groups"),
  "/teacher/groups/:groupId": () => import("../pages/teacher/GroupDetail"),
  "/teacher/attendance": () => import("../pages/teacher/Attendance"),
  "/teacher/exams": () => import("../pages/teacher/Exams"),
  "/teacher/homework": () => import("../pages/teacher/Homework"),
  "/teacher/behaviour": () => import("../pages/teacher/Behaviour"),
  "/teacher/booking": () => import("../pages/teacher/Booking"),
  "/teacher/schedule": () => import("../pages/teacher/Schedule"),
  "/teacher/salary": () => import("../pages/teacher/Salary"),
  "/teacher/chat": () => import("../pages/teacher/Chat"),
  "/teacher/chat/:threadId": () => import("../pages/teacher/ChatThread"),
  // superadmin pages
  "/superadmin/dashboard": () => import("../pages/superadmin/SuperAdminDashboard"),
  "/superadmin/tenants": () => import("../pages/superadmin/TenantsList"),
  "/superadmin/tenants/:tenantId": () => import("../pages/superadmin/TenantDetail"),
  "/superadmin/leads": () => import("../pages/superadmin/LeadsPipeline"),
  "/superadmin/roles": () => import("../pages/superadmin/RolesManagement"),
};

const prefetched = new Set();

// Warm the browser cache for a single route's chunk without rendering it.
export function prefetchRoute(path) {
  const importer = routeImports[path];
  if (!importer || prefetched.has(path)) return;
  prefetched.add(path);
  importer().catch(() => prefetched.delete(path)); // allow retry on network error
}

// Staggered idle prefetch of every route with the given prefix ("/app" or "/superadmin").
// Runs one import per interval tick so the main thread stays responsive.
export function prefetchAllRoutes(prefix, intervalMs = 250) {
  // timeout ensures the callback still runs when the browser never reports an
  // idle period (some environments deprioritize requestIdleCallback indefinitely).
  const schedule = (fn) =>
    "requestIdleCallback" in window
      ? requestIdleCallback(fn, { timeout: 2000 })
      : setTimeout(fn, 1);
  const paths = Object.keys(routeImports).filter(
    (path) => path.startsWith(prefix) && !prefetched.has(path),
  );
  paths.forEach((path, index) => {
    setTimeout(() => schedule(() => prefetchRoute(path)), index * intervalMs);
  });
}

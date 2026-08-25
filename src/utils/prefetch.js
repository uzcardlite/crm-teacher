// Route path -> dynamic import map. App.jsx lazy() calls reuse these same
// functions so prefetch and render share one chunk (no double download).
export const routeImports = {
  // teacher cabinet pages (this standalone Ustoz app ships only these)
  "/teacher/dashboard": () => import("../pages/teacher/Dashboard"),
  "/teacher/groups": () => import("../pages/teacher/Groups"),
  "/teacher/groups/:groupId": () => import("../pages/teacher/GroupDetail"),
  "/teacher/attendance": () => import("../pages/teacher/Attendance"),
  "/teacher/exams": () => import("../pages/teacher/Grading"),
  "/teacher/homework": () => import("../pages/teacher/Homework"),
  "/teacher/behaviour": () => import("../pages/teacher/Behaviour"),
  "/teacher/reactions": () => import("../pages/teacher/Reactions"),
  "/teacher/booking": () => import("../pages/teacher/Booking"),
  "/teacher/schedule": () => import("../pages/teacher/Schedule"),
  "/teacher/salary": () => import("../pages/teacher/Salary"),
  "/teacher/chat": () => import("../pages/teacher/Chat"),
  "/teacher/chat/:threadId": () => import("../pages/teacher/ChatThread"),
  "/teacher/settings": () => import("../pages/teacher/Settings"),
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

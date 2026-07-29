import {
  Banknote,
  CalendarCheck,
  CalendarClock,
  CalendarDays,
  ClipboardList,
  GraduationCap,
  LayoutDashboard,
  MessagesSquare,
  Star,
  UsersRound,
} from "lucide-react";

// Single source of truth for the teacher cabinet bottom tab-bar. Same
// key-not-string i18n convention as constants/nav.js: TeacherLayout resolves
// `labelKey` with t() at render time. Each tab is gated by a
// teacher_cabinet.* permission via useTenantModules().hasPermission.
//
// "Jadval" uses CalendarDays (not CalendarCheck) so it is visually distinct
// from "Davomat", which owns CalendarCheck.
// `primary: true` items live in the bottom tab-bar (max 5). The rest are
// reached through the top-right ☰ menu, so the bar never overflows.
export const TEACHER_NAV_ITEMS = [
  { to: "/teacher/dashboard", labelKey: "teacher.nav.dashboard", icon: LayoutDashboard, permission: "teacher_cabinet.view", primary: true },
  { to: "/teacher/exams", labelKey: "teacher.nav.exams", icon: GraduationCap, permission: "teacher_cabinet.grades", primary: true },
  { to: "/teacher/attendance", labelKey: "teacher.nav.attendance", icon: CalendarCheck, permission: "teacher_cabinet.attendance", primary: true },
  { to: "/teacher/groups", labelKey: "teacher.nav.groups", icon: UsersRound, permission: "teacher_cabinet.view", primary: true },
  // Chat deliberately has no `primary` flag and is excluded from the drawer:
  // its entry point is the labelled header pill (Farzandim-style), so it stays
  // here only for the route title and permission gate.
  { to: "/teacher/chat", labelKey: "teacher.nav.chat", icon: MessagesSquare, permission: "teacher_cabinet.chat", headerOnly: true },
  { to: "/teacher/homework", labelKey: "teacher.nav.homework", icon: ClipboardList, permission: "teacher_cabinet.homework" },
  { to: "/teacher/behaviour", labelKey: "teacher.nav.behaviour", icon: Star, permission: "teacher_cabinet.behaviour" },
  { to: "/teacher/booking", labelKey: "teacher.nav.booking", icon: CalendarClock, permission: "teacher_cabinet.booking" },
  { to: "/teacher/schedule", labelKey: "teacher.nav.schedule", icon: CalendarDays, permission: "teacher_cabinet.view" },
  { to: "/teacher/salary", labelKey: "teacher.nav.salary", icon: Banknote, permission: "teacher_cabinet.view" },
];

const TITLE_BY_PATH = Object.fromEntries(
  TEACHER_NAV_ITEMS.map((item) => [item.to, item.labelKey]),
);

// Longest matching prefix wins so /teacher/groups/:id keeps the "Guruhlarim"
// title. `t` is passed in — this plain module cannot use the hook itself.
export function teacherRouteTitle(pathname, t) {
  if (!pathname) return "CRM";
  const match = Object.keys(TITLE_BY_PATH)
    .filter((path) => pathname === path || pathname.startsWith(`${path}/`))
    .sort((a, b) => b.length - a.length)[0];
  return match ? t(TITLE_BY_PATH[match]) : "CRM";
}

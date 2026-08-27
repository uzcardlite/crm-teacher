import {
  Award,
  Banknote,
  CalendarCheck,
  CalendarClock,
  CalendarDays,
  ClipboardList,
  GraduationCap,
  LayoutDashboard,
  MessagesSquare,
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
  // Center tab, deliberately: Reaksiya + Do'stlar + Xulq used to be three
  // separate destinations (two in this bar's overflow, one buried inside
  // Reactions as a tab) — merged into one, it earns the bar's middle seat.
  // `permission` as an array is "any of" — either half of the old feature
  // set is enough to see the tab (see TeacherLayout's allowedTabs filter).
  { to: "/teacher/recognition", labelKey: "teacher.nav.recognition", icon: Award, permission: ["teacher_cabinet.reactions", "teacher_cabinet.behaviour"], primary: true },
  { to: "/teacher/attendance", labelKey: "teacher.nav.attendance", icon: CalendarCheck, permission: "teacher_cabinet.attendance", primary: true },
  { to: "/teacher/groups", labelKey: "teacher.nav.groups", icon: UsersRound, permission: "teacher_cabinet.view", primary: true },
  // Chat deliberately has no `primary` flag and is excluded from the drawer:
  // its entry point is the labelled header pill (Farzandim-style), so it stays
  // here only for the route title and permission gate.
  { to: "/teacher/chat", labelKey: "teacher.nav.chat", icon: MessagesSquare, permission: "teacher_cabinet.chat", headerOnly: true },
  { to: "/teacher/homework", labelKey: "teacher.nav.homework", icon: ClipboardList, permission: "teacher_cabinet.homework" },
  { to: "/teacher/booking", labelKey: "teacher.nav.booking", icon: CalendarClock, permission: "teacher_cabinet.booking" },
  { to: "/teacher/schedule", labelKey: "teacher.nav.schedule", icon: CalendarDays, permission: "teacher_cabinet.view" },
  { to: "/teacher/salary", labelKey: "teacher.nav.salary", icon: Banknote, permission: "teacher_cabinet.view" },
];

// Reachable from the ☰ drawer rather than the tab-bar, so it lives outside
// TEACHER_NAV_ITEMS (which is what the bar and the customizer iterate) but
// still needs a header title.
const EXTRA_TITLES = {
  "/teacher/settings": "teacher.nav.settings",
  "/teacher/students": "teacher.nav.groups",
};

const TITLE_BY_PATH = {
  ...Object.fromEntries(TEACHER_NAV_ITEMS.map((item) => [item.to, item.labelKey])),
  ...EXTRA_TITLES,
};

// Longest matching prefix wins so /teacher/groups/:id keeps the "Guruhlarim"
// title. `t` is passed in — this plain module cannot use the hook itself.
export function teacherRouteTitle(pathname, t) {
  if (!pathname) return "CRM";
  const match = Object.keys(TITLE_BY_PATH)
    .filter((path) => pathname === path || pathname.startsWith(`${path}/`))
    .sort((a, b) => b.length - a.length)[0];
  return match ? t(TITLE_BY_PATH[match]) : "CRM";
}

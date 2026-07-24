import {
  Banknote,
  Bell,
  Building2,
  CalendarCheck,
  CalendarClock,
  ClipboardList,
  Contact,
  DoorOpen,
  FileSpreadsheet,
  FileText,
  GraduationCap,
  IdCard,
  LayoutDashboard,
  LifeBuoy,
  Megaphone,
  MessageSquare,
  Star,
  User,
  UserCog,
  Users,
  UsersRound,
  UtensilsCrossed,
} from "lucide-react";

// Single source of truth for the admin navigation. The Sidebar renders it as
// a flat list — no collapsible folders — and AppLayout reuses the labels for
// the mobile header title.
//
// i18n note: this is a plain module, not a component, so it cannot call the
// `useTranslation` hook here. Every entry exposes a `labelKey` (an i18next
// key under the `nav.*` namespace) instead of translated text; the render
// site (Sidebar, routeTitle callers) resolves it with `t(item.labelKey)`.
// Any later constants file that needs render-time text should follow the
// same key-not-string convention.
export const NAV_ITEMS = [
  { to: "/app/dashboard", labelKey: "nav.dashboard", icon: LayoutDashboard, module: null },
  { to: "/app/students", labelKey: "nav.students", icon: Users, module: null },
  { to: "/app/groups", labelKey: "nav.groups", icon: UsersRound, module: "groups" },
  { to: "/app/teachers", labelKey: "nav.teachers", icon: UserCog, module: "groups" },
  { to: "/app/attendance", labelKey: "nav.attendance", icon: CalendarCheck, module: "attendance" },
  { to: "/app/exams", labelKey: "nav.exams", icon: GraduationCap, module: "groups" },
  {
    to: "/app/homework",
    labelKey: "nav.homework",
    icon: ClipboardList,
    module: "teacher_cabinet",
    permission: "teacher_cabinet.homework",
  },
  {
    to: "/app/behaviour",
    labelKey: "nav.behaviour",
    icon: Star,
    module: "teacher_cabinet",
    permission: "teacher_cabinet.behaviour",
  },
  {
    to: "/app/booking",
    labelKey: "nav.booking",
    icon: CalendarClock,
    module: "teacher_cabinet",
    permission: "teacher_cabinet.booking",
  },
  { to: "/app/parents", labelKey: "nav.parents", icon: Contact, module: "telegram_bot" },
  {
    to: "/app/contracts",
    labelKey: "nav.contracts",
    icon: FileText,
    module: "contracts",
    permission: "contracts.view",
  },
  // HR now also hosts teachers/system-users tabs, so it stays reachable even
  // for tenants without the hr module — HR.jsx gates each tab individually.
  { to: "/app/hr", labelKey: "nav.hr", icon: IdCard, module: null },
  { to: "/app/moliya", labelKey: "nav.moliya", icon: Banknote, module: null },
  {
    to: "/app/reports",
    labelKey: "nav.reports",
    icon: FileSpreadsheet,
    module: "reports",
    // Any-of: the link shows for a role holding either report permission, so a
    // reports.attendance-only role can still reach the page (davomat tab).
    permissionAny: ["reports.finance", "reports.attendance"],
  },
  {
    to: "/app/marketing",
    labelKey: "nav.marketing",
    icon: Megaphone,
    module: "marketing",
    permission: "marketing.view",
  },
  {
    to: "/app/sms",
    labelKey: "nav.sms",
    icon: MessageSquare,
    module: "sms",
    permissionAny: ["sms.send", "sms.view"],
  },
  {
    to: "/app/menu",
    labelKey: "nav.dailyMenu",
    icon: UtensilsCrossed,
    module: "daily_menu",
    permission: "daily_menu.view",
  },
  { to: "/app/filials", labelKey: "nav.filials", icon: Building2, module: "filials" },
  {
    to: "/app/turnstile",
    labelKey: "nav.turnstile",
    icon: DoorOpen,
    module: "turnstile",
    permission: "turnstile.view",
  },
];

// Pages reachable outside the sidebar (profile menu, deep links).
const EXTRA_TITLES = {
  "/app/schedule": { labelKey: "nav.schedule", icon: CalendarCheck },
  "/app/profile": { labelKey: "nav.profile", icon: User },
  "/app/notifications": { labelKey: "nav.notifications", icon: Bell },
  "/app/contact-admin": { labelKey: "nav.contactAdmin", icon: LifeBuoy },
};

const TITLE_BY_PATH = {
  ...Object.fromEntries(NAV_ITEMS.map((item) => [item.to, { labelKey: item.labelKey, icon: item.icon }])),
  ...EXTRA_TITLES,
};

// Longest matching prefix wins, so nested routes (/app/hr/employees/:id) keep
// their parent's title instead of falling back to "CRM".
// `t` is the translate function from `useTranslation()` — passed in by the
// caller since this module cannot use the hook itself.
export function routeTitle(pathname, t) {
  if (!pathname) return "Milliy CRM";
  const match = Object.keys(TITLE_BY_PATH)
    .filter((path) => pathname === path || pathname.startsWith(`${path}/`))
    .sort((a, b) => b.length - a.length)[0];
  return match ? t(TITLE_BY_PATH[match].labelKey) : "CRM";
}

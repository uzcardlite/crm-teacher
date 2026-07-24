// Canonical status -> Badge variant dictionary for the whole app.
//
// PM ruling (final, resolves the earlier HR/Parents/Groups conflicts):
//   success  = a good, completed or confirmed state
//              (Faol / Bog'langan / To'langan / Chiqdi / Keldi)
//   danger   = a real problem the user must act on
//              (Qarzdor / Xato / Bekor qilingan / Kelmadi)
//   warning  = a heads-up, not yet a problem
//              ("To'lgan" guruh / muddat yaqin / xonasiz guruh / Kechikdi)
//   neutral  = ABSENCE of a state, never an error
//              (Nofaol / Bog'lanmagan / a plain position label)
//   info | violet | teal | rose = CATEGORY only (channel, post type, method).
//              Never use a category hue to express a state.
//
// So: HR "Nofaol" danger -> neutral, Parents "Bog'lanmagan" danger -> neutral,
// Groups "To'lgan" danger -> warning.

// Uzbek display label -> ui/Badge variant. Lookup is case-insensitive.
export const STATUS_BADGE = {
  // success
  faol: "success",
  "bog'langan": "success",
  "to'langan": "success",
  chiqdi: "success",
  keldi: "success",
  tasdiqlangan: "success",
  // danger
  qarzdor: "danger",
  xato: "danger",
  "bekor qilingan": "danger",
  kelmadi: "danger",
  // warning
  "to'lgan": "warning",
  kechikdi: "warning",
  xonasiz: "warning",
  "muddat yaqin": "warning",
  kutilmoqda: "warning",
  // neutral
  nofaol: "neutral",
  "bog'lanmagan": "neutral",
  "band emas": "neutral",
};

// Variants that carry NO state meaning — safe for categories only.
export const CATEGORY_VARIANTS = ["info", "violet", "teal", "rose"];

// i18n note: this module cannot call `useTranslation` (plain module, not a
// component). `STATUS_BADGE` above matches on the CURRENT rendered Uzbek
// label text — that stays as-is until the pages that render those literals
// (Students.jsx, Parents.jsx, Attendance.jsx, ...) are converted in a later
// pass. `STATUS_LABEL_KEYS` below is the forward-looking pattern: it maps
// each semantic status code to an i18next key under `status.*`, so once a
// render site is converted it can do `t(STATUS_LABEL_KEYS.faol)` for display
// and pass the semantic code (not the translated label) into `statusVariant`.
// Later passes converting hr.js/marketing.js label dictionaries should
// follow the same code -> i18n-key shape.
export const STATUS_LABEL_KEYS = {
  faol: "status.active",
  nofaol: "status.inactive",
  "bog'langan": "status.linked",
  "bog'lanmagan": "status.unlinked",
  "to'langan": "status.paid",
  qarzdor: "status.debtor",
  xato: "status.error",
  "bekor qilingan": "status.cancelled",
  kelmadi: "status.notArrived",
  "to'lgan": "status.full",
  kechikdi: "status.late",
  xonasiz: "status.noRoom",
  "muddat yaqin": "status.deadlineSoon",
  kutilmoqda: "status.pending",
  "band emas": "status.vacant",
  tasdiqlangan: "status.confirmed",
  keldi: "status.arrived",
  chiqdi: "status.departed",
};

// Resolve a display label to a Badge variant. Unknown labels stay neutral,
// because an unrecognised value is not an error.
export function statusVariant(label, fallback = "neutral") {
  if (!label) return fallback;
  return STATUS_BADGE[String(label).trim().toLowerCase()] ?? fallback;
}

// --- Boolean shorthands ----------------------------------------------------
// "Faol / Nofaol" — inactive is an absence of state, not a failure.
export function activeVariant(isActive) {
  return isActive ? "success" : "neutral";
}

// "Bog'langan / Bog'lanmagan" (parent account, telegram link, ...).
export function linkedVariant(isLinked) {
  return isLinked ? "success" : "neutral";
}

// "To'langan / Qarzdor" — an unpaid invoice IS actionable, so danger.
export function paidVariant(isPaid) {
  return isPaid ? "success" : "danger";
}

// Group capacity: a full group is a heads-up, not an error.
export function capacityVariant(current, capacity) {
  if (!capacity) return "neutral";
  return Number(current) >= Number(capacity) ? "warning" : "success";
}

// --- Subscription (tenant billing) -----------------------------------------
// Backend is the single source of truth via `subscription_color`
// (blue|green|yellow|red|null). This map turns that colour straight into a
// Badge variant, so the frontend never re-derives the semantics.
const SUBSCRIPTION_COLOR_VARIANT = {
  blue: "info",
  green: "success",
  yellow: "warning",
  red: "danger",
};

// Map a backend `subscription_color` directly to a Badge variant. A missing /
// unknown colour is neutral-safe ("success"), NEVER "danger".
export function subscriptionColorVariant(color) {
  if (!color) return "success";
  return SUBSCRIPTION_COLOR_VARIANT[color] ?? "success";
}

// Resolve a subscription status + remaining days to a Badge variant. Mirrors
// the backend `subscription_color` mapping 1:1. Regression guard: a null /
// unknown status (or an old tenant with no dates) is NEVER "danger" — it reads
// as a neutral-safe "success" and shows no banner. Red is reserved strictly
// for an actual "expired" status.
export function subscriptionVariant(status, daysRemaining) {
  if (!status || status === "active") {
    // Unknown/old tenant, or an active one: warn only in the final week.
    if (status === "active" && daysRemaining != null && daysRemaining <= 7) {
      return "warning";
    }
    return "success";
  }
  if (status === "demo") return "info";
  if (status === "expired") return "danger";
  return "success";
}

// Whether the top-of-app subscription banner should render. Demo always shows;
// active shows only in the final week. Expired is handled by the block screen,
// not a banner. Null / old tenant => no banner.
export function shouldShowSubscriptionBanner(status, daysRemaining) {
  return (
    status === "demo" ||
    (status === "active" && daysRemaining != null && daysRemaining <= 7)
  );
}

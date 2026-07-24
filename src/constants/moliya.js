// Shared Moliya labels, badge variants, chart colors and formatters.
// Single source for every tab under src/components/moliya/ so the dashboard,
// payments, debtors, expenses and payroll tabs stay in sync.

import i18n from "../i18n";
import { activeLocale as numberLocale, formatMoney } from "../utils/format";

// --- Payment methods -------------------------------------------------------
// Backend enum: cash | transfer | click | payme. There is no card member, so
// no "Karta" label exists here.
//
// i18n note: like NAV_ITEMS in constants/nav.js, this plain module cannot
// call `useTranslation`, so every label is an i18next KEY (under the
// `finance.*` namespace), not literal text. Render sites resolve it with
// `t(METHOD_LABELS[method])`.
export const METHOD_LABELS = {
  cash: "finance.methods.cash",
  transfer: "finance.methods.transfer",
  click: "finance.methods.click",
  payme: "finance.methods.payme",
};

// One distinct Badge variant per method so they never look identical.
export const METHOD_BADGE = {
  cash: "success",
  transfer: "blue",
  click: "violet",
  payme: "teal",
};

// Debt severity scale for the debtors table (months unpaid).
export const MONTHS_BADGE = { 1: "warning", 2: "rose", 3: "danger" };

export function monthsBadgeVariant(months) {
  const n = Number(months) || 0;
  if (n >= 3) return MONTHS_BADGE[3];
  return MONTHS_BADGE[n] || "neutral";
}

// i18n note: key, not text — see METHOD_LABELS above.
export const SALARY_TYPE_LABELS = {
  fixed: "finance.salaryType.fixed",
  hourly: "finance.salaryType.hourly",
};

// --- Reminder channels -----------------------------------------------------
// i18n note: key, not text — see METHOD_LABELS above.
export const CHANNEL_LABELS = {
  telegram: "finance.channels.telegram",
  sms: "finance.channels.sms",
  both: "finance.channels.both",
};

// --- Chart palette ---------------------------------------------------------
// Recharts needs literal color values, so hex lives HERE and nowhere else.
// Every value below is copied from tailwind.config.js — keep them in sync.
// NEVER write a hex code inside a component — import from here.
// grid/axis/label read the theme's line/foreground CSS variables so charts
// stay legible in both light and dark mode. Brand hues stay fixed hexes —
// they must read identically in either theme (see components CLAUDE.md).
export const CHART_COLORS = {
  accent: "#F5A623",
  accentLight: "#FAC775",
  success: "#0F6E56",
  danger: "#A32D2D",
  teal: "#0F766E",
  blue: "#1D4ED8",
  violet: "#6D28D9",
  rose: "#BE123C",
  grid: "rgb(var(--line))",
  axis: "rgb(var(--line-strong))",
  label: "rgb(var(--fg-muted))",
};

// Donut slice color per payment method — mirrors METHOD_BADGE hue for hue.
export const METHOD_CHART_COLOR = {
  cash: CHART_COLORS.success,
  transfer: CHART_COLORS.blue,
  click: CHART_COLORS.violet,
  payme: CHART_COLORS.teal,
};

// --- Formatters ------------------------------------------------------------
// MONTH_NAMES, formatMoney, formatDate, formatMonth now live in
// utils/format.js (single app-wide source) and are re-exported here so every
// existing `from "../../constants/moliya"` import keeps working unchanged.
export {
  getMonthNames,
  formatMoney,
  formatDate,
  formatDateTime,
  formatMonth,
} from "../utils/format";

// Kept only so existing call sites keep compiling: formatMoney itself is now
// language-aware (it reads the currency word and number locale from i18n), so
// there is nothing left for a wrapper to do. `t` is ignored.
export function formatMoneyI18n(value) {
  return formatMoney(value);
}

// Axis/tooltip variant: no currency suffix, thousands separated only.
export function formatAmountShort(value) {
  if (value === null || value === undefined) return "0";
  return Number(value).toLocaleString(numberLocale());
}

// "15 ta" in Uzbek. Russian has no equivalent numeral classifier, so its
// translation is just the number — hence a translated template rather than a
// suffix glued on here.
export function formatCount(value) {
  const count = value === null || value === undefined ? 0 : Number(value);
  return i18n.t("finance.itemsCount", { formatted: count.toLocaleString(numberLocale()) });
}

export function currentMonthValue() {
  return new Date().toISOString().slice(0, 7);
}

export function todayValue() {
  return new Date().toISOString().slice(0, 10);
}

// API takes a full date for a month filter: "2026-07" -> "2026-07-01".
export function monthToApi(value) {
  return value ? `${value}-01` : undefined;
}

// "2026-07-14" -> "14" for the daily income axis.
export function dayOfMonth(value) {
  if (!value) return "";
  return String(Number(String(value).slice(8, 10)));
}

// Canonical display formatters for the whole app.
//
// Add a new formatter HERE, never a second copy in a page.
//
// These read the active language straight from the i18n instance rather than
// taking `t` as an argument. They are called from dozens of places, many of
// them outside components, and threading a translate function through all of
// them would have been noise. Reading i18n.language at call time also means a
// language switch takes effect without a reload — a module-level constant
// would freeze whichever language happened to be active at import.

import i18n from "../i18n";

// Also used directly wherever only the number grouping is needed.
export function activeLocale() {
  return i18n.language === "ru" ? "ru-RU" : "uz-UZ";
}

// Month names are hardcoded per language rather than read from Intl. Chrome's
// ICU has no "uz-UZ" month data in many builds and falls back to "M01".."M12"
// — which is exactly the garbage that showed up as "M08 2026" on the calendar.
// Russian ICU is fine, but a fixed array keeps both languages predictable and
// the calendar readable everywhere.
const MONTHS = {
  uz: [
    "Yanvar", "Fevral", "Mart", "Aprel", "May", "Iyun",
    "Iyul", "Avgust", "Sentyabr", "Oktyabr", "Noyabr", "Dekabr",
  ],
  ru: [
    "Январь", "Февраль", "Март", "Апрель", "Май", "Июнь",
    "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь",
  ],
};

export function getMonthNames() {
  return i18n.language === "ru" ? MONTHS.ru : MONTHS.uz;
}

// Weekday names, hardcoded per language for the same ICU reason as the months.
// Indexed by Date.getDay() (0 = Sunday).
const WEEKDAYS = {
  uz: ["Yakshanba", "Dushanba", "Seshanba", "Chorshanba", "Payshanba", "Juma", "Shanba"],
  ru: ["Воскресенье", "Понедельник", "Вторник", "Среда", "Четверг", "Пятница", "Суббота"],
};

// Human date line for headers/greetings, e.g. "Yakshanba, 27 Iyul".
// Uses the hardcoded month/weekday tables, never Intl, so it reads correctly
// in both languages across every browser ICU build.
export function formatLongDate(value = new Date()) {
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return EMPTY_VALUE;
  const weekdays = i18n.language === "ru" ? WEEKDAYS.ru : WEEKDAYS.uz;
  const months = getMonthNames();
  return `${weekdays[d.getDay()]}, ${d.getDate()} ${months[d.getMonth()]}`;
}

// Every formatter renders the SAME placeholder when there is nothing to show:
// an em dash, matching the empty cell Table draws. Never a hyphen.
export const EMPTY_VALUE = "—";

function pad2(n) {
  return String(n).padStart(2, "0");
}

// "2026-07-14T09:00:00" -> "14.07.2026". Formatted by hand rather than through
// toLocaleDateString(locale), for the same reason as month names: the uz-UZ
// locale is unreliable across browser ICU builds. dd.mm.yyyy is the convention
// in both languages, so one format serves both.
export function formatDate(value) {
  if (!value) return EMPTY_VALUE;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return EMPTY_VALUE;
  return `${pad2(d.getDate())}.${pad2(d.getMonth() + 1)}.${d.getFullYear()}`;
}

// "2026-07-14T09:00:00" -> "14.07.2026, 09:00"
export function formatDateTime(value) {
  if (!value) return EMPTY_VALUE;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return EMPTY_VALUE;
  return `${formatDate(value)}, ${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

// "2026-07-14T09:00:00" -> "09:00". Wall-clock time only, hand-formatted for
// the same locale-reliability reason as the other formatters.
export function formatTime(value) {
  if (!value) return EMPTY_VALUE;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return EMPTY_VALUE;
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

// Chat thread-list timestamp: today -> "HH:mm", any other day -> "dd.mm.yyyy".
// Keeps the row compact while still disambiguating older conversations.
export function formatChatTimestamp(value) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  const now = new Date();
  const sameDay =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate();
  return sameDay ? formatTime(value) : formatDate(value);
}

// 1250000 -> "1 250 000 so'm" / "1 250 000 сум"
export function formatMoney(value) {
  if (value === null || value === undefined) return EMPTY_VALUE;
  return `${Number(value).toLocaleString(activeLocale())} ${i18n.t("finance.currency")}`;
}

// "2026-07" or "2026-07-01" -> "Iyul 2026" / "Июль 2026"
export function formatMonth(value) {
  if (!value) return EMPTY_VALUE;
  const [year, month] = String(value).slice(0, 7).split("-");
  return `${getMonthNames()[Number(month) - 1]} ${year}`;
}

// Homework due-date status relative to today, compared at day precision (time
// dropped). Returns a Badge variant plus the i18n key SUFFIX — each page maps
// it into its own namespace (teacher.homework.* vs pages.homework.*) so the
// date logic lives in exactly one place. Overdue -> danger, today/tomorrow ->
// warning, further future -> info.
export function homeworkDueStatus(dueDate) {
  if (!dueDate) return { variant: "info", key: "statusUpcoming" };
  const due = new Date(dueDate);
  if (Number.isNaN(due.getTime())) return { variant: "info", key: "statusUpcoming" };
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  due.setHours(0, 0, 0, 0);
  const diffDays = Math.round((due.getTime() - today.getTime()) / 86400000);
  if (diffDays < 0) return { variant: "danger", key: "statusOverdue" };
  if (diffDays <= 1) return { variant: "warning", key: "statusDueSoon" };
  return { variant: "info", key: "statusUpcoming" };
}

// Behaviour point tone. Non-negative -> success, negative -> danger.
// Badge `variant` and text token live in ONE place so the teacher card,
// teacher chips and admin table never re-derive the rule.
export function behaviourTone(points) {
  return points >= 0
    ? { badge: "success", text: "text-success" }
    : { badge: "danger", text: "text-danger" };
}

// "Ali Valiyev Botirovich" -> "AV" (Avatar fallback, moved from constants/hr.js)
export function initials(fullName) {
  if (!fullName) return "?";
  return fullName
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

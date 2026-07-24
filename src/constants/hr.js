// Shared HR labels, badge variants and formatters. Single source so the
// employees list, leaves tab, reminders feed and the employee profile stay in
// sync (no per-file copies of the same maps).

// Generic formatters live in utils/format.js; re-exported here so existing
// `from "../../constants/hr"` imports keep working unchanged.
export { formatDate, initials } from "../utils/format";

import { EMPTY_VALUE } from "../utils/format";

// i18n note: this is a plain module, not a component, so it cannot call the
// `useTranslation` hook here. These maps expose i18next keys (under the
// `staff.*` namespace) instead of translated text; the render site resolves
// them with `t(MAP[value])`, same convention as constants/nav.js.
// Assignable staff roles → localized position labels. Backend returns raw
// role.name ("teacher", "kassa"...); the render site resolves with
// t(ROLE_LABELS[name]) so the free-text role key is never shown.
export const ROLE_LABELS = {
  teacher: "staff.positions.teacher",
  kassa: "staff.positions.kassa",
  qabul: "staff.positions.qabul",
  hr: "staff.positions.hr",
  admin: "staff.positions.admin",
};

export const EVENT_LABELS = {
  hired: "staff.eventType.hired",
  position_changed: "staff.eventType.position_changed",
  terminated: "staff.eventType.terminated",
  reactivated: "staff.eventType.reactivated",
};

export const EVENT_BADGE = {
  hired: "success",
  position_changed: "violet",
  terminated: "danger",
  reactivated: "teal",
};

export const LEAVE_TYPE_LABELS = {
  annual: "staff.leaveType.annual",
  sick: "staff.leaveType.sick",
  unpaid: "staff.leaveType.unpaid",
  maternity: "staff.leaveType.maternity",
  other: "staff.leaveType.other",
};

export const LEAVE_TYPE_BADGE = {
  annual: "teal",
  sick: "rose",
  unpaid: "warning",
  maternity: "violet",
  other: "neutral",
};

export const LEAVE_STATUS_LABELS = {
  pending: "staff.leaveStatus.pending",
  approved: "staff.leaveStatus.approved",
  rejected: "staff.leaveStatus.rejected",
  cancelled: "staff.leaveStatus.cancelled",
};

export const LEAVE_STATUS_BADGE = {
  pending: "warning",
  approved: "success",
  rejected: "danger",
  cancelled: "neutral",
};

export const DOC_TYPE_LABELS = {
  contract: "staff.docType.contract",
  passport: "staff.docType.passport",
  diploma: "staff.docType.diploma",
  certificate: "staff.docType.certificate",
  other: "staff.docType.other",
};

export const EDUCATION_LEVEL_LABELS = {
  secondary: "staff.educationLevel.secondary",
  vocational: "staff.educationLevel.vocational",
  bachelor: "staff.educationLevel.bachelor",
  master: "staff.educationLevel.master",
  phd: "staff.educationLevel.phd",
  other: "staff.educationLevel.other",
};

// Backend accepts exactly these mime types with a 10MB cap; the client mirrors
// the same limits so an oversized file never leaves the browser.
export const DOC_ALLOWED_MIME = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
];
export const DOC_MAX_SIZE_BYTES = 10 * 1024 * 1024;

export function todayValue() {
  return new Date().toISOString().slice(0, 10);
}

export function toDateInputValue(value) {
  if (!value) return "";
  return String(value).slice(0, 10);
}

export function formatSize(bytes) {
  if (typeof bytes !== "number" || Number.isNaN(bytes)) return EMPTY_VALUE;
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// Display-only tenure label; every persisted duration figure comes from the API.
// `t` is the translate function from `useTranslation()` — passed in by the
// caller since this module cannot use the hook itself (same convention as
// `routeTitle` in constants/nav.js).
export function tenure(hiredAt, terminatedAt, t) {
  if (!hiredAt) return EMPTY_VALUE;
  const start = new Date(hiredAt);
  const end = terminatedAt ? new Date(terminatedAt) : new Date();
  let months = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());
  if (end.getDate() < start.getDate()) months -= 1;
  if (months < 1) return t("staff.tenure.lessThanMonth");
  const years = Math.floor(months / 12);
  const restMonths = months % 12;
  if (years === 0) return t("staff.tenure.months", { count: restMonths });
  if (restMonths === 0) return t("staff.tenure.years", { count: years });
  return `${t("staff.tenure.years", { count: years })} ${t("staff.tenure.months", { count: restMonths })}`;
}

// SMS page URL contract and badge mapping. Same key-not-string convention as
// constants/marketing.js — tab LABELS are resolved with t() at the render site.

// ?tab= values. `compose` (send form) is the working default; `history` is the log.
export const VALID_TABS = ["compose", "history"];
export const DEFAULT_TAB = "compose";

// Recipient selector modes for the compose form.
export const RECIPIENT_TYPES = ["group", "students", "phones"];
export const DEFAULT_RECIPIENT_TYPE = "group";

// Backend SmsStatus enum -> ui/Badge variant. Rename here only if backend renames.
export const STATUS_BADGE = {
  sent: "success",
  failed: "danger",
  skipped: "neutral",
};

// Status order for the history filter Select ("all" is prepended at render).
export const STATUS_ORDER = ["sent", "failed", "skipped"];

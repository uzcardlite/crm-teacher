// Contract status -> Badge variant / i18n-key dictionaries. Plain module, so
// it stores i18next keys (resolved with `t()` at the render site) rather than
// translated text — same convention as constants/marketing.js. No hex here;
// the variants below all exist in ui/Badge.jsx.

// Only variants that exist in ui/Badge.jsx.
export const STATUS_BADGE = {
  active: "success",
  completed: "neutral",
  cancelled: "danger",
};

// Reuses the centralised `status.*` namespace (status.completed added alongside
// the existing status.active / status.cancelled).
export const STATUS_LABELS = {
  active: "status.active",
  completed: "status.completed",
  cancelled: "status.cancelled",
};

// Order for the status Select (create/edit) and the filter dropdown.
export const STATUS_ORDER = ["active", "completed", "cancelled"];

// Default status for a new contract.
export const DEFAULT_STATUS = "active";

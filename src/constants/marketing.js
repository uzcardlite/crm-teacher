// Shared Marketing labels, badge variants and calendar block tokens.
// Single source for src/components/marketing/* — no per-file copies.
// Money/date formatters live in constants/moliya.js, initials() in constants/hr.js.
// NEVER put a hex code here — Recharts colors come from CHART_COLORS (moliya.js).
//
// i18n note: this is a plain module, not a component, so it cannot call the
// `useTranslation` hook here. Every label dictionary below stores an i18next
// key (under the `growth.marketing.*` namespace) instead of translated text;
// the render site resolves it with `t(...)`. TAB_LABELS / VALID_TABS /
// DEFAULT_TAB stay as plain strings — they are only consumed by
// pages/admin/Marketing.jsx, which is out of this pass's scope.

// --- Post status -----------------------------------------------------------
// Keys mirror the backend MarketingPostStatus enum exactly. If backend renames
// a member, rename it HERE only.
export const STATUS_LABELS = {
  rejalashtirilgan: "growth.marketing.status.rejalashtirilgan",
  jarayonda: "growth.marketing.status.jarayonda",
  montajda: "growth.marketing.status.montajda",
  chiqdi: "growth.marketing.status.chiqdi",
  bekor_qilingan: "growth.marketing.status.bekor_qilingan",
};

// Only variants that exist in ui/Badge.jsx:
// success | danger | warning | neutral | teal | rose | violet | blue
export const STATUS_BADGE = {
  rejalashtirilgan: "blue",
  jarayonda: "warning",
  montajda: "violet",
  chiqdi: "success",
  bekor_qilingan: "neutral",
};

// Status order for the stat row and the status Select (cancelled last).
export const STATUS_ORDER = [
  "rejalashtirilgan",
  "jarayonda",
  "montajda",
  "chiqdi",
  "bekor_qilingan",
];

// Default status for a new post.
export const DEFAULT_STATUS = "rejalashtirilgan";

// Backend requires a published date once the post reaches this status.
export const PUBLISHED_STATUS = "chiqdi";

// --- Post type -------------------------------------------------------------
// Backend MarketingPostType enum: storis | reels | post | video | boshqa.
export const POST_TYPE_LABELS = {
  storis: "growth.marketing.postType.storis",
  reels: "growth.marketing.postType.reels",
  post: "growth.marketing.postType.post",
  video: "growth.marketing.postType.video",
  boshqa: "growth.marketing.postType.boshqa",
};

export const POST_TYPE_BADGE = {
  storis: "rose",
  reels: "violet",
  post: "blue",
  video: "teal",
  boshqa: "neutral",
};

// --- Channel ---------------------------------------------------------------
export const CHANNEL_LABELS = {
  instagram: "growth.marketing.channel.instagram",
  telegram: "growth.marketing.channel.telegram",
};

export const CHANNEL_BADGE = {
  instagram: "rose",
  telegram: "blue",
};

// Secondary tab strip above the posts table (component state, not the URL).
// `label` is resolved from `labelKey` at the render site (BloggersTab).
export const CHANNEL_TABS = [
  { key: "all", labelKey: "growth.marketing.channelTabs.all" },
  { key: "instagram", labelKey: "growth.marketing.channelTabs.instagram" },
  { key: "telegram", labelKey: "growth.marketing.channelTabs.telegram" },
];

// --- Calendar blocks -------------------------------------------------------
// Same token triple as Schedule.jsx PALETTE. Tailwind class names MUST stay
// literal here (the content scanner cannot resolve built strings).
// `bekor_qilingan` has no scheduleBlock hue — muted gray is intentional.
export const TIMELINE_BLOCK = {
  rejalashtirilgan: {
    bg: "bg-scheduleBlock-blue-bg",
    border: "border-scheduleBlock-blue-border",
    text: "text-scheduleBlock-blue-text",
  },
  jarayonda: {
    bg: "bg-scheduleBlock-amber-bg",
    border: "border-scheduleBlock-amber-border",
    text: "text-scheduleBlock-amber-text",
  },
  montajda: {
    bg: "bg-scheduleBlock-violet-bg",
    border: "border-scheduleBlock-violet-border",
    text: "text-scheduleBlock-violet-text",
  },
  chiqdi: {
    bg: "bg-scheduleBlock-green-bg",
    border: "border-scheduleBlock-green-border",
    text: "text-scheduleBlock-green-text",
  },
  bekor_qilingan: {
    bg: "bg-surface-sunken",
    border: "border-line-strong",
    text: "text-fg-faint",
  },
};

// Fallback for an unknown status coming from the API.
export const TIMELINE_BLOCK_FALLBACK = TIMELINE_BLOCK.bekor_qilingan;

// --- Tabs ------------------------------------------------------------------
// Tab LABELS are built inside pages/admin/Marketing.jsx with `t()`; only the
// URL keys live here, because they are part of the ?tab= contract, not text.
export const VALID_TABS = ["dashboard", "bloggers", "calendar"];

// Bloggers is the main working screen, so an unknown ?tab= falls back to it.
export const DEFAULT_TAB = "bloggers";

// --- Weekday header for CalendarTab (Monday-first, matches Schedule.jsx) ----
// Keys resolved with `t()` at the render site (CalendarTab).
export const WEEKDAY_SHORT_KEYS = [
  "growth.marketing.weekday.mon",
  "growth.marketing.weekday.tue",
  "growth.marketing.weekday.wed",
  "growth.marketing.weekday.thu",
  "growth.marketing.weekday.fri",
  "growth.marketing.weekday.sat",
  "growth.marketing.weekday.sun",
];

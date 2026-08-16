// Grading-scale helpers. A teacher picks the scale they grade on in Settings
// (5-point, 10-point, 100-point, ...), so nothing here may assume 1-5.
//
// Mirrors app/core/grading.py on the backend — keep the two in step.

export const DEFAULT_DAILY_GRADE_MAX = 5;
export const DEFAULT_EXAM_GRADE_MAX = 100;

export const MIN_DAILY_GRADE_MAX = 2;
export const MAX_DAILY_GRADE_MAX = 100;

// One-tap presets in Settings. Not a whitelist — any value inside the bounds
// above is accepted, these are only what we suggest.
export const DAILY_GRADE_PRESETS = [5, 10, 12, 100];

// At or below this many points the grading UI can show one button per score;
// past it a numeric input is the only control that fits on a phone.
export const MAX_SCALE_AS_BUTTONS = 12;

export function usesButtons(max) {
  return Number(max) <= MAX_SCALE_AS_BUTTONS;
}

// The five colour bands the app has always used for grades, now keyed off the
// score's *share* of its scale rather than its raw value. The thresholds are
// chosen so a 5-point scale reproduces the original mapping exactly
// (1→danger, 2→clay, 3→warning, 4→secondary, 5→success) while 10- and
// 100-point scales get a sensible spread of the same palette.
const BANDS = [
  { upTo: 0.35, className: "border-danger bg-danger text-white" },
  { upTo: 0.5, className: "border-clay bg-clay text-white" },
  { upTo: 0.65, className: "border-warning bg-warning text-white" },
  { upTo: 0.85, className: "border-secondary bg-secondary text-white" },
  { upTo: Infinity, className: "border-success bg-success text-white" },
];

// Filled style for a selected/displayed score. `max` falls back to the legacy
// 5 so a grade row that predates the setting still colours correctly.
export function scoreColorClass(score, max = DEFAULT_DAILY_GRADE_MAX) {
  const ceiling = Number(max) || DEFAULT_DAILY_GRADE_MAX;
  const ratio = Number(score) / ceiling;
  return BANDS.find((band) => ratio <= band.upTo).className;
}

// Every score a button row should offer, high to low is the caller's business.
export function scoreOptions(max) {
  const ceiling = Number(max) || DEFAULT_DAILY_GRADE_MAX;
  return Array.from({ length: ceiling }, (_, index) => index + 1);
}

// "4/5" — grades are meaningless without the scale they were given on, so
// every surface that shows a score shows this instead of a bare number.
export function formatScore(score, max = DEFAULT_DAILY_GRADE_MAX) {
  if (score === null || score === undefined || score === "") return "—";
  return `${score}/${max || DEFAULT_DAILY_GRADE_MAX}`;
}

// Tailwind's grid-cols-* are static class names, so they cannot be built by
// interpolation — the JIT compiler would never see them. Explicit map instead.
const COLS = {
  2: "grid-cols-2",
  3: "grid-cols-3",
  4: "grid-cols-4",
  5: "grid-cols-5",
  6: "grid-cols-6",
  7: "grid-cols-4",
  8: "grid-cols-4",
  9: "grid-cols-5",
  10: "grid-cols-5",
  11: "grid-cols-4",
  12: "grid-cols-4",
};

export function scoreGridClass(max) {
  return COLS[Number(max)] ?? "grid-cols-5";
}

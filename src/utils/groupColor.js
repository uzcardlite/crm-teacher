// Shared identity-colour palette for groups. The same group id always maps to
// the same hue here and on the Schedule board, so a group is recognisable at
// a glance across pages. Tailwind class names must stay literal (content scan).
export const GROUP_COLOR_PALETTE = [
  { bg: "bg-scheduleBlock-teal-bg", border: "border-scheduleBlock-teal-border", text: "text-scheduleBlock-teal-text" },
  { bg: "bg-scheduleBlock-blue-bg", border: "border-scheduleBlock-blue-border", text: "text-scheduleBlock-blue-text" },
  { bg: "bg-scheduleBlock-violet-bg", border: "border-scheduleBlock-violet-border", text: "text-scheduleBlock-violet-text" },
  { bg: "bg-scheduleBlock-rose-bg", border: "border-scheduleBlock-rose-border", text: "text-scheduleBlock-rose-text" },
  { bg: "bg-scheduleBlock-amber-bg", border: "border-scheduleBlock-amber-border", text: "text-scheduleBlock-amber-text" },
  { bg: "bg-scheduleBlock-green-bg", border: "border-scheduleBlock-green-border", text: "text-scheduleBlock-green-text" },
  { bg: "bg-scheduleBlock-pink-bg", border: "border-scheduleBlock-pink-border", text: "text-scheduleBlock-pink-text" },
];

// Deterministic hash of the group id keeps the colour stable across reloads
// and consistent between this page and the Schedule board.
export function colorForGroup(groupId) {
  let sum = 0;
  for (let i = 0; i < groupId.length; i += 1) sum += groupId.charCodeAt(i);
  return GROUP_COLOR_PALETTE[sum % GROUP_COLOR_PALETTE.length];
}

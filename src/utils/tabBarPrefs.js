// Per-user customization of the teacher cabinet's navigation, stored on the
// server as `{ order: ["/teacher/groups", ...], hidden: [...] }` (null when the
// teacher never customized anything). Values are route paths, so prefs stay
// valid when labels or icons change.
//
// Shares the backend's users.sidebar_prefs column with the admin app — the
// paths there are /app/*, here they are /teacher/*, and neither app ever sees
// the other's. The same two rules hold:
//  - paths the teacher cannot see (permission-gated, or gone from the nav
//    config) are ignored rather than breaking the list;
//  - items missing from `order` keep their default position and are appended,
//    so a newly shipped tab still appears for someone who customized earlier.
//
// Prefs never widen access: gating runs first, and this only reorders/hides
// what is already allowed.

export function normalizePrefs(prefs) {
  return {
    order: Array.isArray(prefs?.order) ? prefs.order.filter((p) => typeof p === "string") : [],
    hidden: Array.isArray(prefs?.hidden) ? prefs.hidden.filter((p) => typeof p === "string") : [],
  };
}

// Orders `items` (already permission-filtered) without dropping hidden ones —
// the settings screen needs to render those too, in order, to un-hide them.
export function orderNavItems(items, prefs) {
  const { order } = normalizePrefs(prefs);
  const byPath = new Map(items.map((item) => [item.to, item]));

  const ordered = [];
  const seen = new Set();
  for (const path of order) {
    const item = byPath.get(path);
    if (!item || seen.has(path)) continue;
    ordered.push(item);
    seen.add(path);
  }
  for (const item of items) {
    if (!seen.has(item.to)) ordered.push(item);
  }
  return ordered;
}

// What the layout actually renders: ordered minus hidden.
export function applyTabBarPrefs(items, prefs) {
  const { hidden } = normalizePrefs(prefs);
  const hiddenSet = new Set(hidden);
  return orderNavItems(items, prefs).filter((item) => !hiddenSet.has(item.to));
}

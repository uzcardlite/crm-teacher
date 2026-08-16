import { describe, expect, it } from "vitest";
import { applyTabBarPrefs, normalizePrefs, orderNavItems } from "../../utils/tabBarPrefs";

const ITEMS = [
  { to: "/teacher/dashboard" },
  { to: "/teacher/groups" },
  { to: "/teacher/salary" },
];

const paths = (items) => items.map((item) => item.to);

describe("normalizePrefs", () => {
  it("tolerates null and malformed prefs", () => {
    expect(normalizePrefs(null)).toEqual({ order: [], hidden: [] });
    expect(normalizePrefs({ order: "nope", hidden: [1, "/teacher/groups"] })).toEqual({
      order: [],
      hidden: ["/teacher/groups"],
    });
  });
});

describe("orderNavItems", () => {
  it("follows the saved order", () => {
    const ordered = orderNavItems(ITEMS, { order: ["/teacher/salary", "/teacher/groups"] });
    expect(paths(ordered)).toEqual([
      "/teacher/salary",
      "/teacher/groups",
      "/teacher/dashboard",
    ]);
  });

  // A teacher who customized before a tab shipped must still get the new tab.
  it("appends items missing from the saved order", () => {
    const ordered = orderNavItems(ITEMS, { order: ["/teacher/groups"] });
    expect(paths(ordered)).toEqual([
      "/teacher/groups",
      "/teacher/dashboard",
      "/teacher/salary",
    ]);
  });

  it("ignores paths the teacher cannot see", () => {
    const ordered = orderNavItems(ITEMS, { order: ["/teacher/turnstile", "/teacher/salary"] });
    expect(paths(ordered)).toEqual([
      "/teacher/salary",
      "/teacher/dashboard",
      "/teacher/groups",
    ]);
  });

  it("keeps hidden items, leaving that decision to the caller", () => {
    expect(orderNavItems(ITEMS, { hidden: ["/teacher/groups"] })).toHaveLength(3);
  });
});

describe("applyTabBarPrefs", () => {
  it("drops hidden items", () => {
    const visible = applyTabBarPrefs(ITEMS, { hidden: ["/teacher/groups"] });
    expect(paths(visible)).toEqual(["/teacher/dashboard", "/teacher/salary"]);
  });

  // Prefs must never widen access: gating happens before this runs, so a path
  // that is not in `items` cannot be brought back by naming it in `order`.
  it("cannot surface an item that was gated out", () => {
    const visible = applyTabBarPrefs(ITEMS, { order: ["/teacher/secret"], hidden: [] });
    expect(paths(visible)).not.toContain("/teacher/secret");
  });
});

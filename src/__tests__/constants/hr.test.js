// tenure() recently threw in production from a wrong-arity call site; these
// tests pin its boundary behaviour so a regression there is caught before
// deploy. A stub `t` is used (rather than the real i18n instance) so this
// test only exercises tenure()'s own month/year arithmetic, not locale
// wording -- that is covered separately by the locale parity test.
import { describe, expect, it, vi } from "vitest";
import { EMPTY_VALUE } from "../../utils/format";
import { tenure } from "../../constants/hr";

// Mirrors the real translate function's shape closely enough to assert on:
// returns the key, with `{{count}}` interpolated when options are passed.
function fakeT(key, options) {
  if (options && "count" in options) {
    return key.replace("staff.tenure.", "") + `:${options.count}`;
  }
  return key.replace("staff.tenure.", "");
}

describe("tenure", () => {
  it("returns the em dash when hiredAt is missing", () => {
    expect(tenure(null, null, fakeT)).toBe(EMPTY_VALUE);
    expect(tenure(undefined, undefined, fakeT)).toBe(EMPTY_VALUE);
  });

  it("returns 'lessThanMonth' for under a month of tenure", () => {
    expect(tenure("2026-07-01", "2026-07-20", fakeT)).toBe("lessThanMonth");
  });

  it("returns 'lessThanMonth' right at the day-of-month boundary", () => {
    // Hired on the 31st, "ended" on the 28th of the following month: the
    // day-of-month rollback in tenure() must pull this back under a month.
    expect(tenure("2026-01-31", "2026-02-28", fakeT)).toBe("lessThanMonth");
  });

  it("returns whole months under a year", () => {
    expect(tenure("2026-01-01", "2026-04-01", fakeT)).toBe("months:3");
  });

  it("returns whole years with no remainder", () => {
    expect(tenure("2024-01-01", "2026-01-01", fakeT)).toBe("years:2");
  });

  it("returns years plus a months remainder", () => {
    expect(tenure("2024-01-01", "2025-03-01", fakeT)).toBe("years:1 months:2");
  });

  it("defaults the end date to now when terminatedAt is not given", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-22T00:00:00"));
    expect(tenure("2026-06-01", null, fakeT)).toBe("months:1");
    vi.useRealTimers();
  });
});

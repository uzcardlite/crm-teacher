import { describe, expect, it } from "vitest";
import {
  DEFAULT_DAILY_GRADE_MAX,
  formatScore,
  scoreColorClass,
  scoreOptions,
  usesButtons,
} from "../../utils/grading";

describe("scoreColorClass", () => {
  // The regression that matters: teachers who never touch the setting must see
  // exactly the palette they saw before scales existed.
  it("reproduces the original 1-5 palette on a 5-point scale", () => {
    expect(scoreColorClass(1, 5)).toContain("danger");
    expect(scoreColorClass(2, 5)).toContain("clay");
    expect(scoreColorClass(3, 5)).toContain("warning");
    expect(scoreColorClass(4, 5)).toContain("secondary");
    expect(scoreColorClass(5, 5)).toContain("success");
  });

  it("bands by share of the scale, not by raw value", () => {
    // 5 is top marks out of 5 but a failure out of 100.
    expect(scoreColorClass(5, 5)).toContain("success");
    expect(scoreColorClass(5, 100)).toContain("danger");
  });

  it("reserves green for the top band, which starts above 85%", () => {
    // The boundary is inherited from the 5-point mapping (4/5 = 0.85 is the
    // top of the "secondary" band), so 85/100 is deliberately not green.
    expect(scoreColorClass(85, 100)).toContain("secondary");
    expect(scoreColorClass(86, 100)).toContain("success");
  });

  it("reads a missing scale as the legacy 5-point one", () => {
    expect(scoreColorClass(4)).toBe(scoreColorClass(4, DEFAULT_DAILY_GRADE_MAX));
    expect(scoreColorClass(4, null)).toBe(scoreColorClass(4, 5));
  });
});

describe("scoreOptions", () => {
  it("offers every score from 1 to the ceiling", () => {
    expect(scoreOptions(5)).toEqual([1, 2, 3, 4, 5]);
    expect(scoreOptions(10)).toHaveLength(10);
    expect(scoreOptions(10).at(-1)).toBe(10);
  });
});

describe("usesButtons", () => {
  it("switches to a numeric input past 12 points", () => {
    expect(usesButtons(5)).toBe(true);
    expect(usesButtons(12)).toBe(true);
    expect(usesButtons(100)).toBe(false);
  });
});

describe("formatScore", () => {
  it("always carries the scale alongside the score", () => {
    expect(formatScore(4, 5)).toBe("4/5");
    expect(formatScore(85, 100)).toBe("85/100");
  });

  it("renders a dash when there is no grade", () => {
    expect(formatScore(null, 5)).toBe("—");
    expect(formatScore(undefined, 5)).toBe("—");
    expect(formatScore("", 5)).toBe("—");
  });
});

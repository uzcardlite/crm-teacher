// Formatters read i18n.language directly (see utils/format.js), so each test
// that cares about locale-specific output sets the language explicitly rather
// than depending on whatever a previous test left behind.
import { afterEach, describe, expect, it } from "vitest";
import i18n from "../../i18n";
import {
  EMPTY_VALUE,
  formatDate,
  formatDateTime,
  formatMoney,
  formatMonth,
  getMonthNames,
  initials,
} from "../../utils/format";

afterEach(async () => {
  await i18n.changeLanguage("uz");
});

describe("EMPTY_VALUE handling", () => {
  it("formatDate returns the em dash for null/undefined", () => {
    expect(formatDate(null)).toBe(EMPTY_VALUE);
    expect(formatDate(undefined)).toBe(EMPTY_VALUE);
  });

  it("formatDateTime returns the em dash for null/undefined", () => {
    expect(formatDateTime(null)).toBe(EMPTY_VALUE);
    expect(formatDateTime(undefined)).toBe(EMPTY_VALUE);
  });

  it("formatMoney returns the em dash for null/undefined but keeps 0", async () => {
    expect(formatMoney(null)).toBe(EMPTY_VALUE);
    expect(formatMoney(undefined)).toBe(EMPTY_VALUE);
    await i18n.changeLanguage("uz");
    expect(formatMoney(0)).toBe(`0 ${i18n.t("finance.currency")}`);
  });

  it("formatMonth returns the em dash for null/undefined/empty string", () => {
    expect(formatMonth(null)).toBe(EMPTY_VALUE);
    expect(formatMonth(undefined)).toBe(EMPTY_VALUE);
    expect(formatMonth("")).toBe(EMPTY_VALUE);
  });
});

describe("formatDate / formatDateTime", () => {
  // Dates are formatted by hand as dd.mm.yyyy rather than via toLocaleDateString,
  // because the uz-UZ locale is unreliable across ICU builds — so the output is
  // deterministic and asserted as an exact literal in both languages.
  it("formats an ISO date as dd.mm.yyyy in uz", async () => {
    await i18n.changeLanguage("uz");
    expect(formatDate("2026-07-14T09:00:00")).toBe("14.07.2026");
  });

  it("formats the same date the same way in ru", async () => {
    await i18n.changeLanguage("ru");
    expect(formatDate("2026-07-14T09:00:00")).toBe("14.07.2026");
  });

  it("formatDateTime includes the time portion", async () => {
    await i18n.changeLanguage("uz");
    expect(formatDateTime("2026-07-14T09:30:00")).toBe("14.07.2026, 09:30");
  });
});

describe("formatMoney", () => {
  it("groups digits and appends the uz currency word", async () => {
    await i18n.changeLanguage("uz");
    expect(formatMoney(1250000)).toBe(`1.250.000 ${i18n.t("finance.currency")}`);
  });

  it("groups digits and appends the ru currency word, switching from uz", async () => {
    await i18n.changeLanguage("ru");
    expect(formatMoney(1250000)).toBe(`1.250.000 ${i18n.t("finance.currency")}`);
    // The currency word itself must actually change between languages,
    // otherwise this test would pass even if the language switch did nothing.
    await i18n.changeLanguage("uz");
    expect(i18n.t("finance.currency")).not.toBe(
      i18n.getFixedT("ru")("finance.currency"),
    );
  });
});

describe("getMonthNames / formatMonth", () => {
  it("returns 12 real capitalised month names, not ICU 'M01' fallbacks", async () => {
    await i18n.changeLanguage("uz");
    const months = getMonthNames();
    expect(months).toHaveLength(12);
    // The exact bug we are guarding against: Intl on uz-UZ produced "M08".
    expect(months[7]).toBe("Avgust");
    months.forEach((name) => {
      expect(name).not.toMatch(/^M\d+$/);
      expect(name[0]).toBe(name[0].toUpperCase());
    });

    await i18n.changeLanguage("ru");
    expect(getMonthNames()[7]).toBe("Август");
  });

  it("formatMonth resolves a YYYY-MM value using the active language's month name", async () => {
    await i18n.changeLanguage("uz");
    const uzMonths = getMonthNames();
    expect(formatMonth("2026-07")).toBe(`${uzMonths[6]} 2026`);

    await i18n.changeLanguage("ru");
    const ruMonths = getMonthNames();
    expect(formatMonth("2026-07")).toBe(`${ruMonths[6]} 2026`);
    expect(ruMonths[6]).not.toBe(uzMonths[6]);
  });

  it("formatMonth also accepts a full date string, using only the first 7 chars", async () => {
    await i18n.changeLanguage("uz");
    expect(formatMonth("2026-07-01")).toBe(formatMonth("2026-07"));
  });
});

describe("initials", () => {
  it("returns '?' when the name is falsy", () => {
    expect(initials(null)).toBe("?");
    expect(initials(undefined)).toBe("?");
    expect(initials("")).toBe("?");
  });

  it("takes the first letter of the first two words, uppercased", () => {
    expect(initials("Ali Valiyev Botirovich")).toBe("AV");
    expect(initials("ali valiyev")).toBe("AV");
  });

  it("handles a single-word name", () => {
    expect(initials("Madonna")).toBe("M");
  });

  it("collapses extra whitespace between words", () => {
    expect(initials("  Ali   Valiyev  ")).toBe("AV");
  });
});

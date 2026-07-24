// This has drifted once already: a key added to one language file without its
// twin in the other silently falls back through i18next's fallbackLng and
// shows the wrong language for that one string. Compare every uz/ru locale
// file pair by their full set of leaf-key paths (not just top-level
// namespaces), so a missing nested key -- including a plural variant like
// `foo_one` / `foo_other` -- fails the test.
import { describe, expect, it } from "vitest";
import uz from "../../locales/uz.json";
import ru from "../../locales/ru.json";
import uzPages from "../../locales/uz.pages.json";
import ruPages from "../../locales/ru.pages.json";
import uzFinance from "../../locales/uz.finance.json";
import ruFinance from "../../locales/ru.finance.json";
import uzStaff from "../../locales/uz.staff.json";
import ruStaff from "../../locales/ru.staff.json";
import uzGrowth from "../../locales/uz.growth.json";
import ruGrowth from "../../locales/ru.growth.json";

// Collects every leaf path in dotted notation, e.g. "pages.students.name".
function leafPaths(obj, prefix = "") {
  const paths = [];
  for (const [key, value] of Object.entries(obj)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (value !== null && typeof value === "object" && !Array.isArray(value)) {
      paths.push(...leafPaths(value, path));
    } else {
      paths.push(path);
    }
  }
  return paths.sort();
}

const PAIRS = [
  ["uz.json / ru.json", uz, ru],
  ["uz.pages.json / ru.pages.json", uzPages, ruPages],
  ["uz.finance.json / ru.finance.json", uzFinance, ruFinance],
  ["uz.staff.json / ru.staff.json", uzStaff, ruStaff],
  ["uz.growth.json / ru.growth.json", uzGrowth, ruGrowth],
];

describe("locale key parity", () => {
  it.each(PAIRS)("%s expose identical key sets", (_label, left, right) => {
    const leftKeys = new Set(leafPaths(left));
    const rightKeys = new Set(leafPaths(right));

    const missingInRight = [...leftKeys].filter((key) => !rightKeys.has(key));
    const missingInLeft = [...rightKeys].filter((key) => !leftKeys.has(key));

    expect(missingInRight, "keys present in uz but missing in ru").toEqual([]);
    expect(missingInLeft, "keys present in ru but missing in uz").toEqual([]);
  });
});

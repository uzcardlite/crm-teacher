// This has drifted once already: a key added to one language file without its
// twin in the other silently falls back through i18next's fallbackLng and
// shows the wrong language for that one string. Compare every uz/ru locale
// file pair by their full set of leaf-key paths (not just top-level
// namespaces), so a missing nested key -- including a plural variant like
// `foo_one` / `foo_other` -- fails the test.
//
// The pairs are discovered with import.meta.glob rather than listed by hand:
// the hand-written list had silently stopped covering uz.teacher.json (the
// largest file in the app) and four other namespaces, so the parity check was
// passing while most of the translations went unchecked.
import { describe, expect, it } from "vitest";

const modules = import.meta.glob("../../locales/*.json", { eager: true });

// "../../locales/uz.finance.json" -> { lang: "uz", area: "finance.json" }
function parse(path) {
  const file = path.split("/").pop();
  const [lang, ...rest] = file.split(".");
  return { lang, area: rest.join("."), file };
}

const byArea = new Map();
for (const [path, mod] of Object.entries(modules)) {
  const { lang, area } = parse(path);
  const entry = byArea.get(area) ?? {};
  entry[lang] = mod.default ?? mod;
  byArea.set(area, entry);
}

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

const PAIRS = [...byArea.entries()].map(([area, langs]) => [
  `uz.${area} / ru.${area}`,
  langs.uz,
  langs.ru,
]);

describe("locale key parity", () => {
  it("finds locale files to check", () => {
    // Guards the glob itself: if the path or the naming convention changes,
    // it.each below would silently run zero cases and the suite stay green.
    expect(PAIRS.length).toBeGreaterThan(0);
  });

  it.each(PAIRS)("%s expose identical key sets", (_label, left, right) => {
    // A file with no twin in the other language is the same bug one level up.
    expect(left, "uz file missing").toBeTruthy();
    expect(right, "ru file missing").toBeTruthy();

    const leftKeys = new Set(leafPaths(left));
    const rightKeys = new Set(leafPaths(right));

    const missingInRight = [...leftKeys].filter((key) => !rightKeys.has(key));
    const missingInLeft = [...rightKeys].filter((key) => !leftKeys.has(key));

    expect(missingInRight, "keys present in uz but missing in ru").toEqual([]);
    expect(missingInLeft, "keys present in ru but missing in uz").toEqual([]);
  });
});

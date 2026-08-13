// Global test setup: adds the jest-dom matchers (toBeInTheDocument, etc.) to
// vitest's `expect` and cleans up the DOM between tests.
import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

// Node >= 24 ships its own `localStorage` global that stays undefined unless
// the process is started with --localstorage-file, and it shadows the one
// jsdom installs on the window. Anything importing src/i18n.js then dies at
// module load with "Cannot read properties of undefined (reading 'getItem')" —
// on the developer's machine only, since CI pins Node 22 where the built-in
// does not exist. Install a plain in-memory Storage so the suite behaves the
// same on every Node version.
if (!globalThis.localStorage) {
  const store = new Map();
  const storage = {
    get length() {
      return store.size;
    },
    key: (i) => Array.from(store.keys())[i] ?? null,
    getItem: (k) => (store.has(String(k)) ? store.get(String(k)) : null),
    setItem: (k, v) => void store.set(String(k), String(v)),
    removeItem: (k) => void store.delete(String(k)),
    clear: () => store.clear(),
  };
  // The global is an accessor property, so assignment alone would not take.
  Object.defineProperty(globalThis, "localStorage", {
    value: storage,
    configurable: true,
    writable: true,
  });
  if (typeof window !== "undefined" && window !== globalThis) {
    Object.defineProperty(window, "localStorage", {
      value: storage,
      configurable: true,
      writable: true,
    });
  }
}

afterEach(() => {
  cleanup();
  localStorage.clear();
});

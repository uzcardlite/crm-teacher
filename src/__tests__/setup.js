// Global test setup: adds the jest-dom matchers (toBeInTheDocument, etc.) to
// vitest's `expect` and cleans up the DOM between tests.
import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

afterEach(() => {
  cleanup();
});

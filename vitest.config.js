import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

// Separate from vite.config.js so `vite build` never picks up test-only
// settings, but it still shares the same React plugin so JSX/HMR behave
// identically between dev and test runs.
export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    setupFiles: ["./src/__tests__/setup.js"],
    css: false,
    globals: false,
  },
});

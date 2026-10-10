import { defineConfig } from "vitest/config";

/** Unit tests only — no database. */
export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    exclude: ["src/**/*.int.test.ts", "node_modules"],
  },
});

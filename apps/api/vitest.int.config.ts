import { defineConfig } from "vitest/config";

/** Integration tests against keyt_school_test only. */
export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.int.test.ts"],
    globalSetup: ["src/test/global-setup-int.ts"],
    setupFiles: ["src/test/setup-int.ts"],
    fileParallelism: false,
    hookTimeout: 120_000,
    testTimeout: 60_000,
  },
});

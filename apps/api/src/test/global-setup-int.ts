/**
 * Vitest globalSetup: sync STRUCTURE ONLY into keyt_school_test before int tests.
 */
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

export default async function globalSetup(): Promise<void> {
  process.env.DB_NAME = "keyt_school_test";
  if (!process.env.DB_NAME.endsWith("_test")) {
    throw new Error(
      'ABORT: global setup refuses a database name that does not end with "_test".',
    );
  }

  const script = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    "../../scripts/sync-test-schema.mjs",
  );

  await new Promise<void>((resolve, reject) => {
    const child = spawn(process.execPath, [script], {
      stdio: "inherit",
      windowsHide: true,
      env: { ...process.env, DB_NAME: "keyt_school_test" },
    });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code !== 0) {
        reject(new Error("sync-test-schema.mjs exited with code " + code));
        return;
      }
      resolve();
    });
  });
}

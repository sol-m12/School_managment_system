/**
 * Runs before every integration test file.
 * Forces the test database and aborts unless the name ends with "_test".
 * Must set DB_NAME before any app module loads env/db.
 */
import dotenv from "dotenv";

process.env.NODE_ENV = "test";
process.env.DB_NAME = "keyt_school_test";

dotenv.config({ override: false });

// Re-assert after dotenv so a .env DB_NAME cannot win.
process.env.DB_NAME = "keyt_school_test";

const dbName = process.env.DB_NAME;
if (!dbName || !dbName.endsWith("_test")) {
  throw new Error(
    'ABORT: integration tests require DB_NAME ending with "_test" (got "' +
      String(dbName) +
      '"). Refusing to run against a non-test database.',
  );
}

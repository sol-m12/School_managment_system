/**
 * Copy STRUCTURE ONLY from keyt_school into keyt_school_test.
 * Never writes to keyt_school. Does not read or print .env contents.
 * Uses MAMP mysqldump/mysql via a pipe (no .sql files written or read).
 */
import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
require("dotenv").config({
  path: path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../.env"),
});

const SOURCE_DB = "keyt_school";
const TARGET_DB = "keyt_school_test";
const MAMP_BIN = "C:\\MAMP\\bin\\mysql\\bin";

function requireEnv(name) {
  const value = process.env[name];
  if (value === undefined || value === "") {
    throw new Error("Missing required environment variable: " + name);
  }
  return value;
}

function assertTestDatabase(name) {
  if (!name.endsWith("_test")) {
    throw new Error(
      'ABORT: target database name must end with "_test" (got "' + name + '").',
    );
  }
}

function runPiped(dumpArgs, mysqlArgs) {
  return new Promise((resolve, reject) => {
    const dump = spawn(path.join(MAMP_BIN, "mysqldump.exe"), dumpArgs, {
      stdio: ["ignore", "pipe", "pipe"],
      windowsHide: true,
    });
    const mysql = spawn(path.join(MAMP_BIN, "mysql.exe"), mysqlArgs, {
      stdio: ["pipe", "pipe", "pipe"],
      windowsHide: true,
    });

    let dumpErr = "";
    let mysqlErr = "";

    dump.stderr.on("data", (chunk) => {
      dumpErr += chunk.toString();
    });
    mysql.stderr.on("data", (chunk) => {
      mysqlErr += chunk.toString();
    });

    dump.stdout.pipe(mysql.stdin);

    dump.on("error", reject);
    mysql.on("error", reject);

    dump.on("close", (code) => {
      if (code !== 0) {
        reject(
          new Error(
            "mysqldump failed (exit " +
              code +
              "): " +
              dumpErr.trim().slice(0, 500),
          ),
        );
      }
    });

    mysql.on("close", (code) => {
      if (code !== 0) {
        reject(
          new Error(
            "mysql import failed (exit " +
              code +
              "): " +
              mysqlErr.trim().slice(0, 500),
          ),
        );
        return;
      }
      resolve();
    });
  });
}

async function main() {
  assertTestDatabase(TARGET_DB);

  const host = requireEnv("DB_HOST");
  const user = requireEnv("DB_USER");
  const port = String(process.env.DB_PORT || 3306);
  const password = process.env.DB_PASSWORD ?? "";

  const common = ["-h", host, "-P", port, "-u", user];
  if (password) {
    common.push("-p" + password);
  }

  // Structure only; --add-drop-table replaces existing objects in the test DB.
  const dumpArgs = [
    ...common,
    "--no-data",
    "--skip-triggers",
    "--skip-routines",
    "--skip-events",
    "--single-transaction",
    SOURCE_DB,
  ];

  const mysqlArgs = [...common, TARGET_DB];

  await runPiped(dumpArgs, mysqlArgs);
  console.log(
    "Synced structure from " + SOURCE_DB + " into " + TARGET_DB + " (no data).",
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});

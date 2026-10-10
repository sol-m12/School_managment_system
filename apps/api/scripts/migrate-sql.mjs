/**
 * Applies numbered *.sql files in apps/api/migrations/ in order.
 * Records applied filenames in schema_migrations (global table).
 * Does not read or print .env contents.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
require("dotenv").config();
const mysql = require("mysql2/promise");

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const migrationsDir = path.join(root, "migrations");

function requireEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error("Missing required environment variable: " + name);
  }
  return value;
}

async function ensureMigrationsTable(connection) {
  await connection.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id INT NOT NULL AUTO_INCREMENT,
      filename VARCHAR(255) NOT NULL,
      applied_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      UNIQUE KEY schema_migrations_filename_unique (filename)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);
}

async function appliedSet(connection) {
  const [rows] = await connection.query(
    "SELECT filename FROM schema_migrations ORDER BY filename ASC",
  );
  return new Set(rows.map((row) => row.filename));
}

async function main() {
  const host = requireEnv("DB_HOST");
  const user = requireEnv("DB_USER");
  const database = requireEnv("DB_NAME");
  const port = Number(process.env.DB_PORT || 3306);
  const password = process.env.DB_PASSWORD ?? "";

  if (!fs.existsSync(migrationsDir)) {
    throw new Error("Migrations directory not found: " + migrationsDir);
  }

  const files = fs
    .readdirSync(migrationsDir)
    .filter((name) => /^\d+_.*\.sql$/i.test(name))
    .sort((a, b) => a.localeCompare(b, "en"));

  const connection = await mysql.createConnection({
    host,
    port,
    user,
    password,
    database,
    multipleStatements: true,
    charset: "utf8mb4",
  });

  try {
    await ensureMigrationsTable(connection);
    const done = await appliedSet(connection);

    for (const filename of files) {
      if (done.has(filename)) {
        console.log("skip  " + filename);
        continue;
      }

      const fullPath = path.join(migrationsDir, filename);
      const sql = fs.readFileSync(fullPath, "utf8");
      console.log("apply " + filename);
      await connection.beginTransaction();
      try {
        await connection.query(sql);
        await connection.query(
          "INSERT INTO schema_migrations (filename) VALUES (?)",
          [filename],
        );
        await connection.commit();
        console.log("done  " + filename);
      } catch (error) {
        await connection.rollback();
        throw error;
      }
    }

    console.log("Migrations complete.");
  } finally {
    await connection.end();
  }
}

main().catch((error) => {
  console.error("Migration failed:", error.message);
  process.exit(1);
});

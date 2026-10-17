/**
 * Create or update the first Super Admin (platform_users).
 *
 *   npm run platform:seed -- --username platform --password "ChangeMeNow1!" --name "Platform Admin"
 *
 * Does not print the password. Re-running with the same username resets the password hash.
 */
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
require("dotenv").config({
  path: path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../.env"),
});
const mysql = require("mysql2/promise");
const bcrypt = require("bcrypt");

function arg(name) {
  const flag = `--${name}`;
  const index = process.argv.indexOf(flag);
  if (index === -1 || index + 1 >= process.argv.length) return "";
  return process.argv[index + 1].trim();
}

function requireArg(name) {
  const value = arg(name);
  if (!value) throw new Error("Missing --" + name);
  return value;
}

async function main() {
  const username = requireArg("username");
  const password = requireArg("password");
  const displayName = arg("name") || "Platform Admin";

  if (username.length > 50) throw new Error("Username must be 50 characters or fewer");
  if (password.length < 8) throw new Error("Password must be at least 8 characters");

  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD ?? "",
    database: process.env.DB_NAME,
    charset: "utf8mb4",
  });

  try {
    const passwordHash = await bcrypt.hash(password, 12);
    const [existing] = await connection.query(
      "SELECT id FROM platform_users WHERE username = ? LIMIT 1",
      [username],
    );

    if (existing.length > 0) {
      await connection.query(
        `UPDATE platform_users
         SET password_hash = ?, display_name = ?, is_active = 1, token_version = token_version + 1
         WHERE id = ?`,
        [passwordHash, displayName, existing[0].id],
      );
      console.log(
        JSON.stringify({ action: "updated", id: existing[0].id, username, displayName }, null, 2),
      );
      return;
    }

    const [inserted] = await connection.query(
      `INSERT INTO platform_users (username, password_hash, display_name, is_active, token_version)
       VALUES (?, ?, ?, 1, 0)`,
      [username, passwordHash, displayName],
    );
    console.log(
      JSON.stringify(
        { action: "created", id: inserted.insertId, username, displayName },
        null,
        2,
      ),
    );
  } finally {
    await connection.end();
  }
}

main().catch((error) => {
  console.error("Seed platform admin failed:", error.message);
  process.exit(1);
});

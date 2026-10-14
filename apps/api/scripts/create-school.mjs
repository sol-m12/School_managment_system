/**
 * Create a school (tenant) and one login for it.
 * Every row is stored under that school's tenant id, so the new school
 * starts empty and never sees another school's students or staff.
 *
 * Re-running with the same slug adds another user to that school.
 *
 *   npm run school:create -- --slug solschool --name "Sol School" --username admin --password "SolSchool123!" --role Admin
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

const ROLES = [
  "Teacher",
  "Admin",
  "Technician",
  "Secretary",
  "Counselor",
  "Finance",
  "V_Principal",
  "Registrar",
  "Librarian",
  "Store_Keeper",
];

const STAFF_ROLES = new Set(ROLES);

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

function slugOf(value) {
  const slug = value.toLowerCase();
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
    throw new Error("Slug must be lowercase letters, numbers, and hyphens: " + value);
  }
  return slug;
}

async function main() {
  const slug = slugOf(requireArg("slug"));
  const name = requireArg("name");
  const username = requireArg("username");
  const password = requireArg("password");
  const role = requireArg("role");

  if (username.length > 50) throw new Error("Username must be 50 characters or fewer");
  if (password.length < 8) throw new Error("Password must be at least 8 characters");
  if (!ROLES.includes(role)) throw new Error("Role must be one of: " + ROLES.join(", "));

  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD ?? "",
    database: process.env.DB_NAME,
    charset: "utf8mb4",
  });

  try {
    await connection.beginTransaction();

    const [existingTenants] = await connection.query(
      "SELECT id, name, status FROM tenants WHERE slug = ? LIMIT 1",
      [slug],
    );

    let tenantId;
    let createdTenant = false;
    if (existingTenants.length > 0) {
      tenantId = existingTenants[0].id;
      if (existingTenants[0].status !== "active") {
        await connection.query("UPDATE tenants SET status = 'active' WHERE id = ?", [tenantId]);
      }
    } else {
      const [inserted] = await connection.query(
        "INSERT INTO tenants (name, slug, status) VALUES (?, ?, 'active')",
        [name, slug],
      );
      tenantId = inserted.insertId;
      createdTenant = true;
    }

    const [existingUsers] = await connection.query(
      "SELECT user_id FROM users WHERE tenant_id = ? AND username = ? LIMIT 1",
      [tenantId, username],
    );
    if (existingUsers.length > 0) {
      throw new Error("User already exists for this school: " + username);
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const [userInsert] = await connection.query(
      "INSERT INTO users (username, password_hash, role, is_active, tenant_id, token_version) VALUES (?, ?, ?, 1, ?, 0)",
      [username, passwordHash, role, tenantId],
    );
    const userId = userInsert.insertId;

    if (STAFF_ROLES.has(role)) {
      const jobTitle = role === "Teacher" ? "Teacher" : role.replaceAll("_", " ");
      const firstName = arg("first") || name;
      const lastName = arg("last") || role.replaceAll("_", " ");
      await connection.query(
        `INSERT INTO staff
          (first_name, last_name, role, job_title, user_id, is_approved, tenant_id)
         VALUES (?, ?, ?, ?, ?, 1, ?)`,
        [firstName, lastName, role, jobTitle, userId, tenantId],
      );
    }

    if (createdTenant) {
      const [maxId] = await connection.query("SELECT COALESCE(MAX(id), 0) AS maxId FROM school_settings");
      const settingsId = Number(maxId[0].maxId) + 1;
      await connection.query(
        "INSERT INTO school_settings (id, school_name, tenant_id) VALUES (?, ?, ?)",
        [settingsId, name, tenantId],
      );

      const [yearRows] = await connection.query(
        "SELECT setting_value FROM system_settings WHERE setting_key = 'current_academic_year' ORDER BY setting_id ASC LIMIT 1",
      );
      const academicYear = yearRows[0]?.setting_value || "2018";
      await connection.query(
        "INSERT INTO system_settings (setting_key, setting_value, tenant_id) VALUES ('current_academic_year', ?, ?), ('current_semester', '1', ?)",
        [academicYear, tenantId, tenantId],
      );
    }

    await connection.commit();

    console.log(
      JSON.stringify(
        {
          tenantId,
          slug,
          name,
          username,
          role,
          createdTenant,
        },
        null,
        2,
      ),
    );
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    await connection.end();
  }
}

main().catch((error) => {
  console.error("Create school failed:", error.message);
  process.exit(1);
});

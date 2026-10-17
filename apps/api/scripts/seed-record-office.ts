/**
 * Creates the Record Office login for tenant 1 when none exists.
 * Staff login is E plus the staff number. The first password is that login ID.
 * Does not print a password hash or any environment value.
 */
import { and, eq } from "drizzle-orm";
import { db, pool } from "../src/db/index.js";
import { staff, users } from "../src/db/schema/index.js";
import { hashPassword } from "../src/lib/password.js";

const tenantId = 1;

const [existing] = await db
  .select({ username: users.username })
  .from(users)
  .where(and(eq(users.tenantId, tenantId), eq(users.role, "Registrar")))
  .limit(1);

if (existing) {
  console.log(`Record office login already exists: ${existing.username}`);
  console.log("The password is not printed again.");
} else {
  const inserted = await db.insert(staff).values({
    firstName: "ማህደር",
    lastName: "ቤት",
    role: "Registrar",
    jobTitle: "የመዝገብ ቤት ኃላፊ",
    isApproved: 1,
    tenantId,
  });
  const staffId = Number(inserted[0].insertId);
  const username = `E${staffId}`;
  const account = await db.insert(users).values({
    username,
    passwordHash: await hashPassword(username),
    role: "Registrar",
    isActive: 1,
    passwordChanged: 0,
    tenantId,
    tokenVersion: 0,
  });
  await db
    .update(staff)
    .set({ userId: Number(account[0].insertId) })
    .where(and(eq(staff.staffId, staffId), eq(staff.tenantId, tenantId)));
  console.log(`Record office login: ${username}`);
  console.log(`Password: ${username}`);
}

await pool.end();

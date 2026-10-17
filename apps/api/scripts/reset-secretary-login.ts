/**
 * Sets the Secretary login for tenant 1 to E{staffId} / E{staffId}.
 * Creates the staff row when none exists. Prints the username once.
 */
import { and, eq } from "drizzle-orm";
import { db, pool } from "../src/db/index.js";
import { staff, users } from "../src/db/schema/index.js";
import { hashPassword } from "../src/lib/password.js";

const tenantId = 1;

const [linked] = await db
  .select({
    staffId: staff.staffId,
    userId: staff.userId,
    username: users.username,
  })
  .from(staff)
  .leftJoin(users, and(eq(users.userId, staff.userId), eq(users.tenantId, tenantId)))
  .where(and(eq(staff.tenantId, tenantId), eq(staff.role, "Secretary")))
  .limit(1);

let staffId = linked?.staffId;
let userId = linked?.userId ?? null;

if (!staffId) {
  const inserted = await db.insert(staff).values({
    firstName: "ሴክሬታሪ",
    lastName: "ቤት",
    role: "Secretary",
    jobTitle: "Secretary",
    isApproved: 1,
    tenantId,
  });
  staffId = Number(inserted[0].insertId);
}

const username = `E${staffId}`;
const passwordHash = await hashPassword(username);

if (userId) {
  await db
    .update(users)
    .set({
      username,
      passwordHash,
      role: "Secretary",
      isActive: 1,
      passwordChanged: 0,
      tokenVersion: 1,
    })
    .where(and(eq(users.userId, userId), eq(users.tenantId, tenantId)));
} else {
  const [orphan] = await db
    .select({ userId: users.userId })
    .from(users)
    .where(and(eq(users.tenantId, tenantId), eq(users.role, "Secretary")))
    .limit(1);
  if (orphan) {
    userId = orphan.userId;
    await db
      .update(users)
      .set({
        username,
        passwordHash,
        isActive: 1,
        passwordChanged: 0,
        tokenVersion: 1,
      })
      .where(and(eq(users.userId, userId), eq(users.tenantId, tenantId)));
  } else {
    const account = await db.insert(users).values({
      username,
      passwordHash,
      role: "Secretary",
      isActive: 1,
      passwordChanged: 0,
      tenantId,
      tokenVersion: 0,
    });
    userId = Number(account[0].insertId);
  }
  await db
    .update(staff)
    .set({ userId })
    .where(and(eq(staff.staffId, staffId), eq(staff.tenantId, tenantId)));
}

console.log(`Secretary login: ${username}`);
console.log(`Password: ${username}`);

await pool.end();

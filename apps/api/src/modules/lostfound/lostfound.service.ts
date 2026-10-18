import { desc, eq, ne } from "drizzle-orm";
import { db } from "../../db/index.js";
import { lostFoundItems } from "../../db/schema/index.js";
import { scoped, withTenant } from "../../lib/tenant.js";
import type { ModerateBody, PostItemBody } from "./lostfound.schema.js";

export type LostFoundErrorCode = "NOT_FOUND" | "NOT_PENDING" | "VALIDATION";

export class LostFoundError extends Error {
  constructor(readonly code: LostFoundErrorCode) {
    super(code);
  }
}

function insertId(result: unknown): number {
  const header = result as { insertId?: number } | Array<{ insertId?: number }>;
  if (Array.isArray(header)) return Number(header[0]?.insertId ?? 0);
  return Number(header.insertId ?? 0);
}

function mapRow(row: typeof lostFoundItems.$inferSelect) {
  return {
    id: row.itemId,
    kind: row.kind,
    title: row.title,
    description: row.description,
    locationText: row.locationText,
    contactText: row.contactText,
    status: row.status,
    postedByUserId: row.postedByUserId,
    createdAt: row.createdAt,
  };
}

export async function listBoard(tenantId: number) {
  const rows = await db
    .select()
    .from(lostFoundItems)
    .where(scoped(lostFoundItems, tenantId, eq(lostFoundItems.status, "Approved")))
    .orderBy(desc(lostFoundItems.itemId));
  return { rows: rows.map(mapRow) };
}

export async function listMine(tenantId: number, userId: number) {
  const rows = await db
    .select()
    .from(lostFoundItems)
    .where(scoped(lostFoundItems, tenantId, eq(lostFoundItems.postedByUserId, userId)))
    .orderBy(desc(lostFoundItems.itemId));
  return { rows: rows.map(mapRow) };
}

export async function listQueue(tenantId: number) {
  const rows = await db
    .select()
    .from(lostFoundItems)
    .where(scoped(lostFoundItems, tenantId, ne(lostFoundItems.status, "Rejected")))
    .orderBy(desc(lostFoundItems.itemId));
  return { rows: rows.map(mapRow) };
}

export async function getItem(tenantId: number, id: number) {
  const [row] = await db
    .select()
    .from(lostFoundItems)
    .where(scoped(lostFoundItems, tenantId, eq(lostFoundItems.itemId, id)))
    .limit(1);
  if (!row) throw new LostFoundError("NOT_FOUND");
  return mapRow(row);
}

export async function postItem(tenantId: number, userId: number, input: PostItemBody) {
  const id = insertId(
    await db.insert(lostFoundItems).values(
      withTenant(
        {
          kind: input.kind,
          title: input.title,
          description: input.description,
          locationText: input.locationText,
          contactText: input.contactText,
          status: "Pending" as const,
          postedByUserId: userId,
        },
        tenantId,
      ),
    ),
  );
  return getItem(tenantId, id);
}

export async function moderateItem(
  tenantId: number,
  userId: number,
  id: number,
  input: ModerateBody,
) {
  const [row] = await db
    .select()
    .from(lostFoundItems)
    .where(scoped(lostFoundItems, tenantId, eq(lostFoundItems.itemId, id)))
    .limit(1);
  if (!row) throw new LostFoundError("NOT_FOUND");

  const status =
    input.action === "Approve"
      ? ("Approved" as const)
      : input.action === "Reject"
        ? ("Rejected" as const)
        : ("Resolved" as const);

  if (input.action === "Approve" || input.action === "Reject") {
    if (row.status !== "Pending") throw new LostFoundError("NOT_PENDING");
  }
  if (input.action === "Resolve" && row.status !== "Approved") {
    throw new LostFoundError("VALIDATION");
  }

  await db
    .update(lostFoundItems)
    .set({
      status,
      moderatedByUserId: userId,
      moderatedAt: new Date().toISOString().slice(0, 19).replace("T", " "),
    })
    .where(scoped(lostFoundItems, tenantId, eq(lostFoundItems.itemId, id)));

  return getItem(tenantId, id);
}

export async function deleteItem(tenantId: number, id: number) {
  const [row] = await db
    .select({ id: lostFoundItems.itemId })
    .from(lostFoundItems)
    .where(scoped(lostFoundItems, tenantId, eq(lostFoundItems.itemId, id)))
    .limit(1);
  if (!row) throw new LostFoundError("NOT_FOUND");
  await db
    .delete(lostFoundItems)
    .where(scoped(lostFoundItems, tenantId, eq(lostFoundItems.itemId, id)));
  return { ok: true as const };
}

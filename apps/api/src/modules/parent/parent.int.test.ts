import request from "supertest";
import { beforeAll, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "../../db/index.js";
import { parentIdentities, parentStudentLinks, users } from "../../db/schema/index.js";
import { createAccessToken } from "../../lib/jwt.js";
import { hashPassword } from "../../lib/password.js";
import type { Role } from "../../lib/roles.js";
import { withTenant } from "../../lib/tenant.js";
import { createTestApp } from "../../test/createTestApp.js";
import { seedTwoTenants, type IsolationSeed } from "../../test/seed.js";

const app = createTestApp();

function bearer(tenantId: number, role: Role, userId: number): string {
  return `Bearer ${createAccessToken({ userId, tenantId, role })}`;
}

describe("parent role", () => {
  let seed: IsolationSeed;
  let parentUserId = 0;
  let parentCode = "";
  let parentId = 0;

  beforeAll(async () => {
    seed = await seedTwoTenants();
  });

  it("lets the school technician create a parent account with a shareable code", async () => {
    const created = await request(app)
      .post("/operations/parents")
      .set("Authorization", bearer(seed.tenantA.id, "Technician", seed.tenantA.userId))
      .send({
        username: `parent_a_${Date.now()}`,
        password: "ParentPass12",
        displayName: "Parent Alpha",
      })
      .expect(201);
    parentUserId = created.body.userId as number;
    parentCode = created.body.parentCode as string;
    parentId = created.body.parentId as number;
    expect(parentCode.startsWith("KEYT-P-")).toBe(true);
  });

  it("rejects create/link for non-technician roles", async () => {
    await request(app)
      .post("/operations/parents")
      .set("Authorization", bearer(seed.tenantA.id, "Teacher", seed.tenantA.userId))
      .send({ username: "x", password: "ParentPass12", displayName: "Nope" })
      .expect(403);
  });

  it("links only students inside the technician school", async () => {
    await request(app)
      .post("/operations/parents/links")
      .set("Authorization", bearer(seed.tenantA.id, "Technician", seed.tenantA.userId))
      .send({ parentCode, studentId: seed.tenantA.studentId })
      .expect(201);

    await request(app)
      .post("/operations/parents/links")
      .set("Authorization", bearer(seed.tenantA.id, "Technician", seed.tenantA.userId))
      .send({ parentCode, studentId: seed.tenantB.studentId })
      .expect(404);
  });

  it("supports cross-school children via the same parent code without exposing unlinked students", async () => {
    await request(app)
      .post("/operations/parents/links")
      .set("Authorization", bearer(seed.tenantB.id, "Technician", seed.tenantB.userId))
      .send({ parentCode, studentId: seed.tenantB.studentId })
      .expect(201);

    const children = await request(app)
      .get("/parent/children")
      .set("Authorization", bearer(seed.tenantA.id, "Parent", parentUserId))
      .expect(200);

    const ids = (children.body.children as { studentId: number; schoolName: string }[]).map((row) => row.studentId);
    expect(ids).toContain(seed.tenantA.studentId);
    expect(ids).toContain(seed.tenantB.studentId);
    expect(children.body.children.every((row: { schoolName: string }) => Boolean(row.schoolName))).toBe(true);

    await request(app)
      .get(`/parent/children/${seed.tenantA.studentId + 999999}/attendance`)
      .set("Authorization", bearer(seed.tenantA.id, "Parent", parentUserId))
      .expect(403);
  });

  it("does not let a foreign parent user read another identity's children", async () => {
    const identity = await db.insert(parentIdentities).values({
      parentCode: `KEYT-P-TEST${Date.now().toString(16).slice(-4).toUpperCase()}`,
      displayName: "Other Parent",
    });
    const otherParentId = Number(identity[0].insertId);
    const otherUser = await db.insert(users).values(
      withTenant(
        {
          username: `parent_other_${Date.now()}`,
          passwordHash: await hashPassword("ParentPass12"),
          role: "Parent",
          passwordChanged: 0,
          isActive: 1,
          tokenVersion: 0,
          parentId: otherParentId,
        },
        seed.tenantB.id,
      ),
    );
    const otherUserId = Number(otherUser[0].insertId);

    const children = await request(app)
      .get("/parent/children")
      .set("Authorization", bearer(seed.tenantB.id, "Parent", otherUserId))
      .expect(200);
    expect(children.body.children).toEqual([]);

    await request(app)
      .get(`/parent/children/${seed.tenantA.studentId}/attendance`)
      .set("Authorization", bearer(seed.tenantB.id, "Parent", otherUserId))
      .expect(403);

    await db.delete(parentStudentLinks).where(eq(parentStudentLinks.parentId, parentId));
    await db.delete(users).where(eq(users.userId, otherUserId));
    await db.delete(parentIdentities).where(eq(parentIdentities.parentId, otherParentId));
  });
});

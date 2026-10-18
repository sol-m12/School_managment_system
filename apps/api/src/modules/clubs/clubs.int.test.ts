import { eq } from "drizzle-orm";
import request from "supertest";
import { beforeAll, describe, expect, it } from "vitest";
import { db } from "../../db/index.js";
import { committeesClubs, staff } from "../../db/schema/index.js";
import { createAccessToken } from "../../lib/jwt.js";
import { scoped, withTenant } from "../../lib/tenant.js";
import { createTestApp } from "../../test/createTestApp.js";
import { describeTenantIsolation } from "../../test/describeTenantIsolation.js";
import { seedTwoTenants, type IsolationSeed } from "../../test/seed.js";
import {
  ClubError,
  createClub,
  deleteClub,
  getClub,
  listClubs,
  updateClub,
} from "./clubs.service.js";

const app = createTestApp();

function bearer(tenantId: number, role: "Technician" | "Student" | "Teacher" | "V_Principal", userId = 1): string {
  return `Bearer ${createAccessToken({ userId, tenantId, role })}`;
}

async function insertTeacher(tenantId: number, name: string): Promise<number> {
  const result = await db.insert(staff).values(
    withTenant(
      {
        firstName: name,
        lastName: "Patron",
        role: "Teacher" as const,
        jobTitle: "Teacher",
      },
      tenantId,
    ),
  );
  return Number(result[0].insertId);
}

async function seedClubs(seed: IsolationSeed): Promise<{ aId: number; bId: number }> {
  const staffA = await insertTeacher(seed.tenantA.id, "TeacherA");
  const staffB = await insertTeacher(seed.tenantB.id, "TeacherB");
  const clubA = await createClub(seed.tenantA.id, seed.tenantA.userId, {
    name: "Science Club A",
    description: "Tenant A",
    year: "2017",
    patronStaffId: staffA,
    presidentStudentId: seed.tenantA.studentId,
    isStudentCouncil: false,
    isActive: true,
  });
  const clubB = await createClub(seed.tenantB.id, seed.tenantB.userId, {
    name: "Science Club B",
    description: "Tenant B",
    year: "2017",
    patronStaffId: staffB,
    presidentStudentId: seed.tenantB.studentId,
    isStudentCouncil: false,
    isActive: true,
  });
  return { aId: clubA.id, bId: clubB.id };
}

describeTenantIsolation("clubs", {
  resourceId: async (seed) => seedClubs(seed),
  list: async (tenantId) => (await listClubs(tenantId)).rows,
  get: async (tenantId, id) => {
    try {
      return await getClub(tenantId, id);
    } catch (error) {
      if (error instanceof ClubError && error.code === "NOT_FOUND") return null;
      throw error;
    }
  },
  update: async (tenantId, id) => {
    await expect(
      updateClub(tenantId, id, { name: "Cross-tenant write" }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  },
  delete: async (tenantId, id) => {
    await expect(deleteClub(tenantId, id)).rejects.toMatchObject({ code: "NOT_FOUND" });
  },
});

describe("clubs API: tenant from the token only", () => {
  let seed: IsolationSeed;
  let aId: number;
  let bId: number;

  beforeAll(async () => {
    seed = await seedTwoTenants();
    const ids = await seedClubs(seed);
    aId = ids.aId;
    bId = ids.bId;
  });

  it("lists only the caller tenant clubs", async () => {
    const auth = bearer(seed.tenantA.id, "Technician", seed.tenantA.userId);
    const list = await request(app).get("/clubs").set("Authorization", auth).expect(200);
    const ids = (list.body.rows as { id: number }[]).map((r) => r.id);
    expect(ids).toContain(aId);
    expect(ids).not.toContain(bId);
  });

  it("cannot update another tenant club", async () => {
    const auth = bearer(seed.tenantA.id, "Technician", seed.tenantA.userId);
    await request(app)
      .put(`/clubs/${bId}`)
      .set("Authorization", auth)
      .send({ name: "Hacked" })
      .expect(404);

    const [row] = await db
      .select({ name: committeesClubs.name })
      .from(committeesClubs)
      .where(scoped(committeesClubs, seed.tenantB.id, eq(committeesClubs.structureId, bId)))
      .limit(1);
    expect(row?.name).toBe("Science Club B");
  });
});

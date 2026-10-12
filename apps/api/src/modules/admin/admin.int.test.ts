import { eq } from "drizzle-orm";
import request from "supertest";
import { beforeAll, describe, expect, it } from "vitest";
import { db } from "../../db/index.js";
import { students, users } from "../../db/schema/index.js";
import { createAccessToken } from "../../lib/jwt.js";
import { scoped } from "../../lib/tenant.js";
import { createTestApp } from "../../test/createTestApp.js";
import { seedTwoTenants, type IsolationSeed } from "../../test/seed.js";

const app = createTestApp();

function bearer(tenantId: number): string {
  return `Bearer ${createAccessToken({ userId: 1, tenantId, role: "Admin" })}`;
}

describe("admin API: tenant isolation", () => {
  let seed: IsolationSeed;

  beforeAll(async () => {
    seed = await seedTwoTenants();
  });

  it("lists only the caller tenant's students", async () => {
    const res = await request(app).get("/admin/students").set("Authorization", bearer(seed.tenantA.id)).expect(200);
    const ids = (res.body.rows as { id: number }[]).map((row) => row.id);
    expect(ids).toContain(seed.tenantA.studentId);
    expect(ids).not.toContain(seed.tenantB.studentId);
  });

  it("does not reset another tenant's password", async () => {
    const [before] = await db
      .select({ passwordHash: users.passwordHash })
      .from(users)
      .where(scoped(users, seed.tenantB.id, eq(users.userId, seed.tenantB.userId)))
      .limit(1);

    await request(app)
      .post("/admin/passwords")
      .set("Authorization", bearer(seed.tenantA.id))
      .send({ userId: seed.tenantB.userId, password: "ShouldNotApply1" })
      .expect(404);

    const [after] = await db
      .select({ passwordHash: users.passwordHash })
      .from(users)
      .where(scoped(users, seed.tenantB.id, eq(users.userId, seed.tenantB.userId)))
      .limit(1);
    expect(after?.passwordHash).toBe(before?.passwordHash);
  });

  it("stores the academic year on the caller tenant only", async () => {
    await request(app)
      .put("/admin/academic-year")
      .set("Authorization", bearer(seed.tenantA.id))
      .send({ academicYear: "2091", semester: "1" })
      .expect(200);
    await request(app)
      .put("/admin/academic-year")
      .set("Authorization", bearer(seed.tenantB.id))
      .send({ academicYear: "2092", semester: "2" })
      .expect(200);

    const a = await request(app).get("/admin/academic-year").set("Authorization", bearer(seed.tenantA.id)).expect(200);
    const b = await request(app).get("/admin/academic-year").set("Authorization", bearer(seed.tenantB.id)).expect(200);
    expect(a.body.academicYear).toBe("2091");
    expect(b.body.academicYear).toBe("2092");
  });

  it("cannot read another tenant's student through the repeater report", async () => {
    await db
      .update(students)
      .set({ registrationType: "ደጋሚ", gradeLevel: 9 })
      .where(scoped(students, seed.tenantB.id, eq(students.studentId, seed.tenantB.studentId)));

    const res = await request(app).get("/admin/repeaters").set("Authorization", bearer(seed.tenantA.id)).expect(200);
    const ids = (res.body.rows as { id: number }[]).map((row) => row.id);
    expect(ids).not.toContain(seed.tenantB.studentId);
  });
});

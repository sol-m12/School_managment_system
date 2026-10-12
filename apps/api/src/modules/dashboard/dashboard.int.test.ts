import { eq } from "drizzle-orm";
import request from "supertest";
import { beforeAll, describe, expect, it } from "vitest";
import { db } from "../../db/index.js";
import { students } from "../../db/schema/index.js";
import { createAccessToken } from "../../lib/jwt.js";
import type { Role } from "../../lib/roles.js";
import { scoped } from "../../lib/tenant.js";
import { createTestApp } from "../../test/createTestApp.js";
import { seedTwoTenants, type IsolationSeed } from "../../test/seed.js";

const app = createTestApp();

function bearer(tenantId: number, role: Role, userId = 1): string {
  return `Bearer ${createAccessToken({ userId, tenantId, role })}`;
}

describe("dashboard", () => {
  let seed: IsolationSeed;

  beforeAll(async () => {
    seed = await seedTwoTenants();
    await db
      .update(students)
      .set({ isApproved: 1 })
      .where(scoped(students, seed.tenantA.id, eq(students.studentId, seed.tenantA.studentId)));
  });

  it("returns 401 without a token", async () => {
    await request(app).get("/dashboard").expect(401);
  });

  it("shows the control center to Admin and V_Principal, and only that tenant's students", async () => {
    const admin = await request(app).get("/dashboard").set("Authorization", bearer(seed.tenantA.id, "Admin")).expect(200);
    expect(admin.body.kind).toBe("control");
    expect(admin.body.academicYear).toBe("2017");
    expect(admin.body.students).toBe(1);

    const vice = await request(app)
      .get("/dashboard")
      .set("Authorization", bearer(seed.tenantA.id, "V_Principal", seed.tenantA.userId))
      .expect(200);
    expect(vice.body.students).toBe(1);

    const other = await request(app).get("/dashboard").set("Authorization", bearer(seed.tenantB.id, "Admin")).expect(200);
    expect(other.body.students).toBe(0);
  });

  it("shows the store home to Technician and an empty home to Teacher", async () => {
    const technician = await request(app)
      .get("/dashboard")
      .set("Authorization", bearer(seed.tenantA.id, "Technician"))
      .expect(200);
    expect(technician.body).toMatchObject({ kind: "store", itemTypes: 0, lowStock: 0, todayTransactions: 0 });

    const teacher = await request(app).get("/dashboard").set("Authorization", bearer(seed.tenantA.id, "Teacher")).expect(200);
    expect(teacher.body).toEqual({ kind: "empty" });
  });
});

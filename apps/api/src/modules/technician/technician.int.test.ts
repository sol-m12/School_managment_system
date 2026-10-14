import request from "supertest";
import { beforeAll, describe, expect, it } from "vitest";
import { createAccessToken } from "../../lib/jwt.js";
import type { Role } from "../../lib/roles.js";
import { createTestApp } from "../../test/createTestApp.js";
import { seedTwoTenants, type IsolationSeed } from "../../test/seed.js";

const app = createTestApp();

function bearer(tenantId: number, role: Role = "Technician"): string {
  return `Bearer ${createAccessToken({ userId: 1, tenantId, role })}`;
}

describe("technician API", () => {
  let seed: IsolationSeed;

  beforeAll(async () => {
    seed = await seedTwoTenants();
  });

  it("rejects a teacher from staff registration", async () => {
    await request(app).get("/technician/teachers").set("Authorization", bearer(seed.tenantA.id, "Teacher")).expect(403);
  });

  it("registers a teacher only on the caller tenant", async () => {
    const created = await request(app)
      .post("/technician/teachers")
      .set("Authorization", bearer(seed.tenantA.id))
      .send({
        firstName: "Abebe",
        lastName: "Kebede",
        gender: "Male",
        jobTitle: "Teacher",
        phoneNumber: "0911000000",
        hireDate: "2026-10-14",
        salary: 1000,
        experienceYears: 2,
        subjectId: seed.tenantA.subjectId,
      })
      .expect(201);

    expect(created.body.username).toMatch(/^abebe_\d{4}$/);
    expect(typeof created.body.temporaryPassword).toBe("string");

    const own = await request(app).get("/technician/teachers").set("Authorization", bearer(seed.tenantA.id)).expect(200);
    const other = await request(app).get("/technician/teachers").set("Authorization", bearer(seed.tenantB.id)).expect(200);
    const ownIds = (own.body.rows as { id: number }[]).map((row) => row.id);
    const otherIds = (other.body.rows as { id: number }[]).map((row) => row.id);
    expect(ownIds).toContain(created.body.id);
    expect(otherIds).not.toContain(created.body.id);
  });

  it("does not register staff against another tenant's subject list", async () => {
    const created = await request(app)
      .post("/technician/staff")
      .set("Authorization", bearer(seed.tenantA.id))
      .send({
        firstName: "Marta",
        lastName: "Tesfaye",
        role: "Secretary",
        jobTitle: "Secretary",
        gender: "Female",
        password: "TempPass1",
      })
      .expect(201);

    const other = await request(app).get("/technician/staff").set("Authorization", bearer(seed.tenantB.id)).expect(200);
    const ids = (other.body.rows as { id: number }[]).map((row) => row.id);
    expect(ids).not.toContain(created.body.id);
  });

  it("keeps announcements inside the caller tenant", async () => {
    const created = await request(app)
      .post("/technician/announcements")
      .set("Authorization", bearer(seed.tenantA.id))
      .send({
        title: "Tenant A notice",
        content: "Only school A",
        targetRole: "Staff",
        startDate: "2026-10-14",
        endDate: null,
        isUrgent: false,
      })
      .expect(201);

    const id = created.body.announcement.id as number;
    await request(app)
      .put(`/technician/announcements/${id}`)
      .set("Authorization", bearer(seed.tenantB.id))
      .send({
        title: "Stolen",
        content: "Should not save",
        targetRole: "All",
        startDate: "2026-10-14",
        isUrgent: true,
      })
      .expect(404);

    const other = await request(app)
      .get("/technician/announcements")
      .set("Authorization", bearer(seed.tenantB.id))
      .expect(200);
    const ids = (other.body.rows as { id: number }[]).map((row) => row.id);
    expect(ids).not.toContain(id);

    await request(app).delete(`/technician/announcements/${id}`).set("Authorization", bearer(seed.tenantB.id)).expect(404);
    await request(app).delete(`/technician/announcements/${id}`).set("Authorization", bearer(seed.tenantA.id)).expect(204);
  });

  it("lists only the caller tenant's student id cards", async () => {
    const res = await request(app)
      .get("/technician/student-ids")
      .set("Authorization", bearer(seed.tenantA.id))
      .expect(200);
    const ids = (res.body.rows as { id: number }[]).map((row) => row.id);
    expect(ids).toContain(seed.tenantA.studentId);
    expect(ids).not.toContain(seed.tenantB.studentId);
  });
});

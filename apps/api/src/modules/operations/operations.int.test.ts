import { eq, inArray } from "drizzle-orm";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { db } from "../../db/index.js";
import { grades, staff, students, systemSettings, users } from "../../db/schema/index.js";
import { createAccessToken } from "../../lib/jwt.js";
import { verifyPassword } from "../../lib/password.js";
import type { Role } from "../../lib/roles.js";
import { scoped, withTenant } from "../../lib/tenant.js";
import { createTestApp } from "../../test/createTestApp.js";
import { seedTwoTenants, type IsolationSeed } from "../../test/seed.js";

const app = createTestApp();

function bearer(tenantId: number, role: Role = "Technician", userId = 1): string {
  return `Bearer ${createAccessToken({ userId, tenantId, role })}`;
}

describe("technician operations", () => {
  let seed: IsolationSeed;
  let staffA = 0;
  let staffB = 0;

  beforeAll(async () => {
    seed = await seedTwoTenants();
    const insertedA = await db.insert(staff).values(
      withTenant({ firstName: "Abebe", lastName: "Kebede", role: "Teacher", jobTitle: "Teacher" }, seed.tenantA.id),
    );
    const insertedB = await db.insert(staff).values(
      withTenant({ firstName: "Other", lastName: "School", role: "Teacher", jobTitle: "Teacher" }, seed.tenantB.id),
    );
    staffA = Number(insertedA[0].insertId);
    staffB = Number(insertedB[0].insertId);
    await db.delete(systemSettings).where(inArray(systemSettings.tenantId, [seed.tenantA.id, seed.tenantB.id]));
    await db.insert(grades).values(
      withTenant(
        {
          studentId: seed.tenantA.studentId,
          subjectId: seed.tenantA.subjectId,
          semester: "1",
          score: "80.00",
          weightingType: "Mid",
          academicYear: "2016",
          submissionStatus: "Submitted",
          isSubmitted: 1,
        },
        seed.tenantA.id,
      ),
    );
    await db.insert(grades).values(
      withTenant(
        {
          studentId: seed.tenantB.studentId,
          subjectId: seed.tenantB.subjectId,
          semester: "1",
          score: "70.00",
          weightingType: "Mid",
          academicYear: "2016",
          submissionStatus: "Submitted",
          isSubmitted: 1,
        },
        seed.tenantB.id,
      ),
    );
  });

  it("hides the health screen from the principal", async () => {
    await request(app).get("/operations/health").set("Authorization", bearer(seed.tenantA.id, "Principal")).expect(403);
  });

  it("creates a student login from the ID and cannot see another school", async () => {
    const created = await request(app)
      .post("/operations/identities")
      .set("Authorization", bearer(seed.tenantA.id))
      .send({ kind: "student", id: seed.tenantA.studentId })
      .expect(201);
    expect(created.body.username).toBe(String(seed.tenantA.studentId));

    const listA = await request(app).get("/operations/identities").set("Authorization", bearer(seed.tenantA.id)).expect(200);
    const idsA = (listA.body.students as { id: number }[]).map((row) => row.id);
    expect(idsA).not.toContain(seed.tenantA.studentId);
    expect(idsA).not.toContain(seed.tenantB.studentId);

    await request(app)
      .post("/operations/identities")
      .set("Authorization", bearer(seed.tenantA.id))
      .send({ kind: "student", id: seed.tenantB.studentId })
      .expect(404);

    const [other] = await db
      .select({ userId: students.userId })
      .from(students)
      .where(scoped(students, seed.tenantB.id, eq(students.studentId, seed.tenantB.studentId)))
      .limit(1);
    expect(other?.userId ?? null).toBeNull();
  });

  it("resets only the caller school's password to the login ID", async () => {
    const [user] = await db
      .select({ id: users.userId, username: users.username })
      .from(users)
      .where(scoped(users, seed.tenantA.id, eq(users.username, String(seed.tenantA.studentId))))
      .limit(1);
    expect(user).toBeTruthy();
    await request(app)
      .post("/operations/passwords/default")
      .set("Authorization", bearer(seed.tenantA.id))
      .send({ userId: seed.tenantB.userId })
      .expect(404);
    await request(app)
      .post("/operations/passwords/default")
      .set("Authorization", bearer(seed.tenantA.id))
      .send({ userId: user!.id })
      .expect(200);
    const [row] = await db
      .select({ passwordHash: users.passwordHash, passwordChanged: users.passwordChanged })
      .from(users)
      .where(scoped(users, seed.tenantA.id, eq(users.userId, user!.id)))
      .limit(1);
    expect(row?.passwordChanged).toBe(0);
    expect((await verifyPassword(user!.username, row!.passwordHash)).ok).toBe(true);
  });

  it("locks, archives, and rolls the Ethiopian year for one school", async () => {
    await request(app)
      .put("/admin/academic-year")
      .set("Authorization", bearer(seed.tenantA.id))
      .send({ academicYear: "2018", semester: "2" })
      .expect(200);
    await request(app)
      .put("/admin/academic-year")
      .set("Authorization", bearer(seed.tenantB.id))
      .send({ academicYear: "2017", semester: "1" })
      .expect(200);

    await request(app).post("/operations/academic-year/lock").set("Authorization", bearer(seed.tenantA.id)).expect(200);
    await request(app)
      .put("/admin/academic-year")
      .set("Authorization", bearer(seed.tenantA.id))
      .send({ academicYear: "2019", semester: "1" })
      .expect(409);

    await request(app).post("/operations/academic-year/archive").set("Authorization", bearer(seed.tenantA.id)).expect(200);
    const rolled = await request(app).post("/operations/academic-year/rollover").set("Authorization", bearer(seed.tenantA.id)).expect(200);
    expect(rolled.body.academicYear).toBe("2019");
    expect(rolled.body.semester).toBe("1");
    expect(rolled.body.gate).toBe("open");
    expect(rolled.body.archived).toContain("2018");

    const other = await request(app).get("/admin/academic-year").set("Authorization", bearer(seed.tenantB.id)).expect(200);
    expect(other.body.academicYear).toBe("2017");
    expect(other.body.archived ?? []).not.toContain("2018");
  });

  it("does not lock another school's marks", async () => {
    await request(app)
      .post("/operations/grades")
      .set("Authorization", bearer(seed.tenantA.id))
      .send({
        action: "lock",
        studentId: seed.tenantB.studentId,
        subjectId: seed.tenantB.subjectId,
        academicYear: "2016",
        semester: "1",
        reason: "Wrong school must not change marks",
      })
      .expect(404);

    const [still] = await db
      .select({ status: grades.submissionStatus })
      .from(grades)
      .where(scoped(grades, seed.tenantB.id, eq(grades.studentId, seed.tenantB.studentId)))
      .limit(1);
    expect(still?.status).toBe("Submitted");
  });

  it("keeps helpdesk tickets inside the school", async () => {
    const created = await request(app)
      .post("/operations/tickets")
      .set("Authorization", bearer(seed.tenantA.id))
      .send({ title: "Lab network down", details: "Grade 9 lab has no connection.", category: "network", priority: "urgent" })
      .expect(201);
    const ticketId = created.body.ticket.id as number;
    const other = await request(app).get("/operations/tickets").set("Authorization", bearer(seed.tenantB.id)).expect(200);
    const ids = (other.body.rows as { id: number }[]).map((row) => row.id);
    expect(ids).not.toContain(ticketId);
    await request(app)
      .patch(`/operations/tickets/${ticketId}`)
      .set("Authorization", bearer(seed.tenantB.id))
      .send({ status: "Closed" })
      .expect(404);
  });

  it("imports a staff account from CSV and assigns duties only in this school", async () => {
    const imported = await request(app)
      .post("/operations/import")
      .set("Authorization", bearer(seed.tenantA.id))
      .send({ csv: `kind,id\nstaff,${staffA}\n` })
      .expect(200);
    expect(imported.body.created[0].username).toBe(`E${staffA}`);

    await request(app)
      .post("/operations/duties/homeroom")
      .set("Authorization", bearer(seed.tenantA.id))
      .send({ classId: seed.tenantB.classId, staffId: staffB })
      .expect(404);

    await request(app)
      .post("/operations/duties/department")
      .set("Authorization", bearer(seed.tenantA.id))
      .send({ department: "Natural Science", staffId: staffA })
      .expect(200);

    const dutiesB = await request(app).get("/operations/duties").set("Authorization", bearer(seed.tenantB.id)).expect(200);
    expect(dutiesB.body.heads).toEqual([]);
  });

  afterAll(async () => {
    await db.delete(systemSettings).where(inArray(systemSettings.tenantId, [seed.tenantA.id, seed.tenantB.id]));
  });
});

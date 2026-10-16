import { eq } from "drizzle-orm";
import request from "supertest";
import { beforeAll, describe, expect, it } from "vitest";
import { db } from "../../db/index.js";
import { attendance, students, subjects, users } from "../../db/schema/index.js";
import { createAccessToken } from "../../lib/jwt.js";
import type { Role } from "../../lib/roles.js";
import { scoped, withTenant } from "../../lib/tenant.js";
import { createTestApp } from "../../test/createTestApp.js";
import { seedTwoTenants, type IsolationSeed } from "../../test/seed.js";

const app = createTestApp();

function bearer(tenantId: number, role: Role, userId: number): string {
  return `Bearer ${createAccessToken({ userId, tenantId, role })}`;
}

describe("student desk", () => {
  let seed: IsolationSeed;
  let studentUser = 0;
  let garmentId = 0;

  beforeAll(async () => {
    seed = await seedTwoTenants();
    const user = await db.insert(users).values({
      username: "desk-student",
      passwordHash: "x",
      role: "Student",
      isActive: 1,
      tenantId: seed.tenantA.id,
      tokenVersion: 0,
    });
    studentUser = Number(user[0].insertId);
    await db
      .update(students)
      .set({ userId: studentUser, gradeLevel: 9, section: "A", academicYear: "2018" })
      .where(scoped(students, seed.tenantA.id, eq(students.studentId, seed.tenantA.studentId)));
    const subject = await db.insert(subjects).values(
      withTenant(
        { subjectName: "Garment", gradeLevel: 9, stream: "Common", creditHours: 2, isVocational: 1, sortOrder: 3 },
        seed.tenantA.id,
      ),
    );
    garmentId = Number(subject[0].insertId);
    await db.insert(attendance).values(
      withTenant(
        {
          studentId: seed.tenantA.studentId,
          date: "2018-04-02",
          status: "P",
          approvalStatus: "Approved",
          recordedBy: seed.tenantA.userId,
        },
        seed.tenantA.id,
      ),
    );
    await db.insert(attendance).values(
      withTenant(
        {
          studentId: seed.tenantB.studentId,
          date: "2018-04-02",
          status: "A",
          approvalStatus: "Approved",
          recordedBy: seed.tenantB.userId,
        },
        seed.tenantB.id,
      ),
    );
  });

  it("hides the desk from a teacher and from another school", async () => {
    await request(app).get("/student/desk/attendance").set("Authorization", bearer(seed.tenantA.id, "Teacher", seed.tenantA.userId)).expect(403);
    const own = await request(app)
      .get("/student/desk/attendance")
      .set("Authorization", bearer(seed.tenantA.id, "Student", studentUser))
      .expect(200);
    expect(own.body.present).toBeGreaterThan(0);
    expect(own.body.absent).toBe(0);
  });

  it("lets grades 9-10 choose one curriculum skill and refuses exploration grades", async () => {
    const chosen = await request(app)
      .post("/student/desk/vocational/choice")
      .set("Authorization", bearer(seed.tenantA.id, "Student", studentUser))
      .send({ subjectId: garmentId })
      .expect(201);
    expect(chosen.body.subjectId).toBe(garmentId);
    await request(app)
      .post("/student/desk/vocational/choice")
      .set("Authorization", bearer(seed.tenantA.id, "Student", studentUser))
      .send({ subjectId: garmentId })
      .expect(409);
    await db
      .update(students)
      .set({ gradeLevel: 8, vocationalId: null })
      .where(scoped(students, seed.tenantA.id, eq(students.studentId, seed.tenantA.studentId)));
    await request(app)
      .post("/student/desk/vocational/choice")
      .set("Authorization", bearer(seed.tenantA.id, "Student", studentUser))
      .send({ subjectId: garmentId })
      .expect(409);
    const other = await request(app)
      .get("/student/desk/vocational")
      .set("Authorization", bearer(seed.tenantB.id, "Student", studentUser))
      .expect(404);
    expect(other.body.code).toBe("NOT_FOUND");
  });

  it("accepts a transcript only in grade 12 and keeps a query inside the school", async () => {
    await db
      .update(students)
      .set({ gradeLevel: 9 })
      .where(scoped(students, seed.tenantA.id, eq(students.studentId, seed.tenantA.studentId)));
    await request(app)
      .post("/student/desk/documents")
      .set("Authorization", bearer(seed.tenantA.id, "Student", studentUser))
      .send({ kind: "transcript", purpose: "University" })
      .expect(409);
    await db
      .update(students)
      .set({ gradeLevel: 12 })
      .where(scoped(students, seed.tenantA.id, eq(students.studentId, seed.tenantA.studentId)));
    await request(app)
      .post("/student/desk/documents")
      .set("Authorization", bearer(seed.tenantA.id, "Student", studentUser))
      .send({ kind: "transcript", purpose: "University" })
      .expect(201);
    await request(app)
      .post("/student/desk/documents")
      .set("Authorization", bearer(seed.tenantA.id, "Student", studentUser))
      .send({ kind: "document", purpose: "Again" })
      .expect(409);
    const opened = await request(app)
      .post("/student/desk/helpdesk")
      .set("Authorization", bearer(seed.tenantA.id, "Student", studentUser))
      .send({ title: "Cannot see my mark", details: "Semester 1 is blank", category: "marks" })
      .expect(201);
    const other = await request(app).get("/operations/tickets").set("Authorization", bearer(seed.tenantB.id, "Technician", seed.tenantB.userId)).expect(200);
    expect((other.body.rows as { id: number }[]).map((row) => row.id)).not.toContain(opened.body.id);
  });
});

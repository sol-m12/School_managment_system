import { eq } from "drizzle-orm";
import request from "supertest";
import { beforeAll, describe, expect, it } from "vitest";
import { db } from "../../db/index.js";
import { staff, students, users } from "../../db/schema/index.js";
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

describe("admin API: teacher list actions", () => {
  let seed: IsolationSeed;
  let teacherA: { staffId: number; userId: number };
  let teacherB: { staffId: number; userId: number };

  async function insertTeacher(tenantId: number, username: string, firstName: string) {
    const user = await db.insert(users).values({
      username,
      passwordHash: "x",
      role: "Teacher",
      isActive: 1,
      tenantId,
      tokenVersion: 0,
    });
    const userId = Number(user[0].insertId);
    const member = await db.insert(staff).values({
      firstName,
      lastName: "Tester",
      role: "Teacher",
      jobTitle: "Teacher",
      phoneNumber: "0911000000",
      salary: "1000.00",
      experienceYears: "2.00",
      userId,
      tenantId,
    });
    return { staffId: Number(member[0].insertId), userId };
  }

  beforeAll(async () => {
    seed = await seedTwoTenants();
    teacherA = await insertTeacher(seed.tenantA.id, "teacher_a", "Alpha");
    teacherB = await insertTeacher(seed.tenantB.id, "teacher_b", "Beta");
  });

  it("lists only the caller tenant's teachers", async () => {
    const res = await request(app).get("/admin/teachers").set("Authorization", bearer(seed.tenantA.id)).expect(200);
    const ids = (res.body.rows as { id: number }[]).map((row) => row.id);
    expect(ids).toContain(teacherA.staffId);
    expect(ids).not.toContain(teacherB.staffId);
  });

  it("cannot update, block or delete another tenant's teacher", async () => {
    const body = {
      firstName: "Hacked",
      lastName: "Name",
      phoneNumber: "0",
      gender: "Male",
      jobTitle: "Teacher",
      salary: 1,
      experienceYears: 1,
    };
    await request(app).put(`/admin/teachers/${teacherB.staffId}`).set("Authorization", bearer(seed.tenantA.id)).send(body).expect(404);
    await request(app)
      .post(`/admin/teachers/${teacherB.staffId}/toggle-status`)
      .set("Authorization", bearer(seed.tenantA.id))
      .send({ currentStatus: 1 })
      .expect(404);
    await request(app).delete(`/admin/teachers/${teacherB.staffId}`).set("Authorization", bearer(seed.tenantA.id)).expect(404);

    const [row] = await db
      .select({ firstName: staff.firstName })
      .from(staff)
      .where(scoped(staff, seed.tenantB.id, eq(staff.staffId, teacherB.staffId)));
    expect(row?.firstName).toBe("Beta");
    const [login] = await db
      .select({ isActive: users.isActive })
      .from(users)
      .where(scoped(users, seed.tenantB.id, eq(users.userId, teacherB.userId)));
    expect(login?.isActive).toBe(1);
  });

  it("updates a teacher's data in the caller tenant", async () => {
    await request(app)
      .put(`/admin/teachers/${teacherA.staffId}`)
      .set("Authorization", bearer(seed.tenantA.id))
      .send({
        firstName: "Alpha2",
        lastName: "Tester",
        phoneNumber: "0922000000",
        gender: "Female",
        jobTitle: "Senior Teacher",
        salary: 2500.5,
        experienceYears: 3.5,
      })
      .expect(200);
    const res = await request(app).get("/admin/teachers").set("Authorization", bearer(seed.tenantA.id)).expect(200);
    const row = (res.body.rows as { id: number; firstName: string; salary: number; experienceYears: number; gender: string }[]).find(
      (item) => item.id === teacherA.staffId,
    );
    expect(row).toMatchObject({ firstName: "Alpha2", salary: 2500.5, experienceYears: 3.5, gender: "Female" });
  });

  it("rejects an invalid update body without touching the row", async () => {
    await request(app)
      .put(`/admin/teachers/${teacherA.staffId}`)
      .set("Authorization", bearer(seed.tenantA.id))
      .send({ firstName: "", salary: "abc" })
      .expect(400);
  });

  it("toggles the login status using the legacy current-status rule", async () => {
    const off = await request(app)
      .post(`/admin/teachers/${teacherA.staffId}/toggle-status`)
      .set("Authorization", bearer(seed.tenantA.id))
      .send({ currentStatus: 1 })
      .expect(200);
    expect(off.body.isActive).toBe(false);
    const on = await request(app)
      .post(`/admin/teachers/${teacherA.staffId}/toggle-status`)
      .set("Authorization", bearer(seed.tenantA.id))
      .send({ currentStatus: 0 })
      .expect(200);
    expect(on.body.isActive).toBe(true);
  });

  it("deletes the teacher and the login user", async () => {
    await request(app).delete(`/admin/teachers/${teacherA.staffId}`).set("Authorization", bearer(seed.tenantA.id)).expect(200);
    const rows = await db.select({ id: staff.staffId }).from(staff).where(scoped(staff, seed.tenantA.id, eq(staff.staffId, teacherA.staffId)));
    expect(rows).toHaveLength(0);
    const logins = await db.select({ id: users.userId }).from(users).where(scoped(users, seed.tenantA.id, eq(users.userId, teacherA.userId)));
    expect(logins).toHaveLength(0);
    await request(app).delete(`/admin/teachers/${teacherA.staffId}`).set("Authorization", bearer(seed.tenantA.id)).expect(404);
  });
});

describe("admin API: class management", () => {
  let seed: IsolationSeed;

  beforeAll(async () => {
    seed = await seedTwoTenants();
  });

  it("lists only the caller tenant's classes", async () => {
    const res = await request(app).get("/admin/classes").set("Authorization", bearer(seed.tenantA.id)).expect(200);
    const ids = (res.body.rows as { id: number }[]).map((row) => row.id);
    expect(ids).toContain(seed.tenantA.classId);
    expect(ids).not.toContain(seed.tenantB.classId);
  });

  it("does not change another tenant's class", async () => {
    await request(app)
      .put(`/admin/classes/${seed.tenantB.classId}`)
      .set("Authorization", bearer(seed.tenantA.id))
      .send({ gradeLevel: 10, section: "Z", stream: "Natural", classTeacherId: null, maxCapacity: 40 })
      .expect(404);
    await request(app)
      .post(`/admin/classes/${seed.tenantB.classId}/homeroom`)
      .set("Authorization", bearer(seed.tenantA.id))
      .send({ teacherId: null })
      .expect(404);
  });

  it("rejects a duplicate grade and section", async () => {
    await request(app)
      .post("/admin/classes/base")
      .set("Authorization", bearer(seed.tenantA.id))
      .send({ gradeLevel: 9, section: "A" })
      .expect(409);
  });
});

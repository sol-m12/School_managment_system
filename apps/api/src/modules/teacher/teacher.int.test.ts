import { eq } from "drizzle-orm";
import request from "supertest";
import { beforeAll, describe, expect, it } from "vitest";
import { db } from "../../db/index.js";
import { classes, grades, items, staff, students, subjects, systemSettings, teacherAssignments } from "../../db/schema/index.js";
import { createAccessToken } from "../../lib/jwt.js";
import type { Role } from "../../lib/roles.js";
import { scoped, withTenant } from "../../lib/tenant.js";
import { createTestApp } from "../../test/createTestApp.js";
import { seedTwoTenants, type IsolationSeed } from "../../test/seed.js";

const app = createTestApp();

function bearer(tenantId: number, role: Role, userId: number): string {
  return `Bearer ${createAccessToken({ userId, tenantId, role })}`;
}

describe("teacher pages", () => {
  let seed: IsolationSeed;
  let staffA = 0;

  beforeAll(async () => {
    seed = await seedTwoTenants();
    await db.delete(systemSettings).where(eq(systemSettings.tenantId, seed.tenantA.id));
    await db.delete(systemSettings).where(eq(systemSettings.tenantId, seed.tenantB.id));
    await db.insert(systemSettings).values([
      withTenant({ settingKey: "current_academic_year", settingValue: "2017" }, seed.tenantA.id),
      withTenant({ settingKey: "current_semester", settingValue: "2" }, seed.tenantA.id),
      withTenant({ settingKey: "current_academic_year", settingValue: "2017" }, seed.tenantB.id),
    ]);
    const inserted = await db.insert(staff).values(
      withTenant(
        {
          firstName: "Yonas",
          lastName: "Bekele",
          role: "Teacher",
          jobTitle: "Teacher",
          userId: seed.tenantA.userId,
        },
        seed.tenantA.id,
      ),
    );
    staffA = Number(inserted[0].insertId);
    await db.insert(teacherAssignments).values([
      withTenant(
        {
          staffId: staffA,
          subjectId: seed.tenantA.subjectId,
          gradeLevel: 9,
          section: "A",
          academicYear: "2017",
        },
        seed.tenantA.id,
      ),
      withTenant(
        {
          staffId: staffA,
          subjectId: seed.tenantB.subjectId,
          gradeLevel: 9,
          section: "B",
          academicYear: "2017",
        },
        seed.tenantB.id,
      ),
    ]);
    await db
      .update(students)
      .set({ section: "A", submissionStatus: "Approved" })
      .where(scoped(students, seed.tenantA.id, eq(students.studentId, seed.tenantA.studentId)));
    await db
      .update(students)
      .set({ section: "A", gradeLevel: 9, academicYear: "2017" })
      .where(scoped(students, seed.tenantB.id, eq(students.studentId, seed.tenantB.studentId)));
    await db.insert(subjects).values(
      withTenant({ subjectName: "Secret Subject", gradeLevel: 9, stream: "Common", creditHours: 2 }, seed.tenantB.id),
    );
  });

  const teacherA = () => bearer(seed.tenantA.id, "Teacher", seed.tenantA.userId);

  it("returns 401 without a token and 403 for a role without the page", async () => {
    await request(app).get("/teacher/schedule").expect(401);
    await request(app)
      .get("/teacher/schedule")
      .set("Authorization", bearer(seed.tenantA.id, "Admin", seed.tenantA.userId))
      .expect(403);
  });

  it("lists only this teacher's assignments in this school", async () => {
    const response = await request(app).get("/teacher/schedule").set("Authorization", teacherA()).expect(200);
    expect(response.body.academicYear).toBe("2017");
    expect(response.body.assignments).toEqual([
      expect.objectContaining({ gradeLevel: 9, section: "A", subjectName: "Seed Subject" }),
    ]);
    expect(JSON.stringify(response.body)).not.toContain("Secret Subject");
  });

  it("loads a grade sheet for this school only, then saves a score the other school cannot see", async () => {
    const options = await request(app).get("/teacher/grades/options").set("Authorization", teacherA()).expect(200);
    expect(options.body.semester).toBe("2");
    expect(options.body.classes).toEqual([{ value: "9-A", label: "Grade 9 - A" }]);

    const created = await request(app)
      .post("/teacher/grades/plans")
      .set("Authorization", teacherA())
      .send({ classSelect: "9-A", subjectId: seed.tenantA.subjectId, items: [{ name: "Quiz 1", percent: 20 }] })
      .expect(200);
    expect(created.body.added).toBe(1);

    const sheet = await request(app)
      .get("/teacher/grades/sheet")
      .query({ classSelect: "9-A", subjectId: seed.tenantA.subjectId })
      .set("Authorization", teacherA())
      .expect(200);
    expect(sheet.body.students.map((row: { id: number }) => row.id)).toEqual([seed.tenantA.studentId]);

    await request(app)
      .post("/teacher/grades/scores")
      .set("Authorization", teacherA())
      .send({
        classSelect: "9-A",
        subjectId: seed.tenantA.subjectId,
        marks: [{ studentId: seed.tenantB.studentId, weightingType: "Quiz 1", score: 10 }],
      })
      .expect(404);

    await request(app)
      .post("/teacher/grades/scores")
      .set("Authorization", teacherA())
      .send({
        classSelect: "9-A",
        subjectId: seed.tenantA.subjectId,
        marks: [{ studentId: seed.tenantA.studentId, weightingType: "9-A:Quiz 1", score: 18 }],
      })
      .expect(200);

    const saved = await db
      .select({ studentId: grades.studentId, tenantId: grades.tenantId })
      .from(grades)
      .where(eq(grades.subjectId, seed.tenantA.subjectId));
    expect(saved).toEqual([{ studentId: seed.tenantA.studentId, tenantId: seed.tenantA.id }]);

    await request(app)
      .get("/teacher/grades/sheet")
      .query({ classSelect: "9-A", subjectId: seed.tenantA.subjectId })
      .set("Authorization", bearer(seed.tenantB.id, "Teacher", seed.tenantB.userId))
      .expect(404);
  });

  it("saves homeroom attendance for this school only", async () => {
    await db.update(classes).set({ classTeacherId: staffA }).where(eq(classes.classId, seed.tenantA.classId));
    const sheet = await request(app).get("/teacher/attendance/homeroom").set("Authorization", teacherA()).expect(200);
    expect(sheet.body.students.map((row: { id: number }) => row.id)).toContain(seed.tenantA.studentId);
    expect(sheet.body.students.map((row: { id: number }) => row.id)).not.toContain(seed.tenantB.studentId);

    await request(app)
      .post("/teacher/attendance/homeroom")
      .set("Authorization", teacherA())
      .send({
        classId: sheet.body.classId,
        date: "2017-10-14",
        marks: [{ studentId: seed.tenantB.studentId, mark: "X" }],
      })
      .expect(404);

    await request(app)
      .post("/teacher/attendance/homeroom")
      .set("Authorization", teacherA())
      .send({
        classId: sheet.body.classId,
        date: "2017-10-14",
        marks: [{ studentId: seed.tenantA.studentId, mark: "A" }],
      })
      .expect(200);

    const again = await request(app)
      .get("/teacher/attendance/homeroom")
      .query({ date: "2017-10-14" })
      .set("Authorization", teacherA())
      .expect(200);
    const saved = again.body.students.find((row: { id: number }) => row.id === seed.tenantA.studentId);
    expect(saved.mark).toBe("A");

    const other = await request(app)
      .get("/teacher/attendance/homeroom")
      .set("Authorization", bearer(seed.tenantB.id, "Teacher", seed.tenantB.userId))
      .expect(200);
    expect(other.body.students ?? []).toEqual([]);
  });

  it("hides another school's exam and registration", async () => {
    const created = await request(app)
      .post("/teacher/exams")
      .set("Authorization", teacherA())
      .send({
        examTitle: "Tenant A Only Exam",
        gradeLevel: 9,
        subjectId: seed.tenantA.subjectId,
        section: "A",
        examPassword: "4455",
        durationMinutes: 30,
        isOfficial: false,
      })
      .expect(200);

    const mine = await request(app).get("/teacher/exams").set("Authorization", teacherA()).expect(200);
    expect(mine.body.exams.map((row: { title: string }) => row.title)).toContain("Tenant A Only Exam");

    await request(app)
      .get(`/teacher/exam-results/${created.body.id}`)
      .set("Authorization", bearer(seed.tenantB.id, "Teacher", seed.tenantB.userId))
      .expect(404);

    await request(app)
      .post("/teacher/registration")
      .set("Authorization", teacherA())
      .send({
        fullName: "Isolated Pupil",
        gender: "F",
        age: 15,
        gradeLevel: 9,
        registrationType: "አዲስ",
        stream: null,
      })
      .expect(200);

    const pending = await request(app).get("/teacher/registration").query({ grade: 9 }).set("Authorization", teacherA()).expect(200);
    expect(pending.body.pending.map((row: { fullName: string }) => row.fullName)).toContain("Isolated Pupil");

    const hidden = await request(app)
      .get("/teacher/registration")
      .query({ grade: 9, q: "Isolated" })
      .set("Authorization", bearer(seed.tenantB.id, "Teacher", seed.tenantB.userId))
      .expect(200);
    expect(JSON.stringify(hidden.body)).not.toContain("Isolated Pupil");
  });

  it("keeps a store request, a shared file, and the locked profile inside this school", async () => {
    const itemA = await db.insert(items).values(
      withTenant({ itemCode: "TCH-A", itemName: "Teacher Paper A", unitOfMeasure: "Ream" }, seed.tenantA.id),
    );
    await db.insert(items).values(
      withTenant({ itemCode: "TCH-B", itemName: "Secret Store Item", unitOfMeasure: "Ream" }, seed.tenantB.id),
    );
    const itemAId = Number(itemA[0].insertId);

    const sent = await request(app)
      .post("/teacher/store-requests")
      .set("Authorization", teacherA())
      .send({ itemId: itemAId, quantity: 2, purpose: "For the ICT class" })
      .expect(201);
    expect(sent.body.requests.map((row: { name: string }) => row.name)).toContain("Teacher Paper A");
    expect(JSON.stringify(sent.body)).not.toContain("Secret Store Item");

    await request(app)
      .post("/teacher/store-requests")
      .set("Authorization", teacherA())
      .send({ itemId: itemAId + 99999, quantity: 1, purpose: "Missing item" })
      .expect(404);

    const otherStore = await request(app)
      .get("/teacher/store-requests")
      .set("Authorization", bearer(seed.tenantB.id, "Teacher", seed.tenantB.userId))
      .expect(200);
    expect(otherStore.body.available).toBe(false);
    expect(JSON.stringify(otherStore.body)).not.toContain("Teacher Paper A");

    const profile = await request(app).get("/teacher/profile").set("Authorization", teacherA()).expect(200);
    expect(profile.body.profile.firstName).toBe("Yonas");
    expect(profile.body.profile.username).toBe(seed.username);
    expect(profile.body.profile.password).toBeUndefined();

    const shared = await request(app)
      .post("/teacher/course-files")
      .set("Authorization", teacherA())
      .send({
        classSelect: "9-A",
        category: "Lecture notes",
        title: "Chapter One Note",
        content: "Only class A should read this.",
      })
      .expect(201);
    expect(shared.body.rows.map((row: { title: string }) => row.title)).toContain("Chapter One Note");

    const otherFiles = await request(app)
      .get("/teacher/course-files")
      .set("Authorization", bearer(seed.tenantB.id, "Teacher", seed.tenantB.userId))
      .expect(200);
    expect(JSON.stringify(otherFiles.body)).not.toContain("Chapter One Note");
  });
});

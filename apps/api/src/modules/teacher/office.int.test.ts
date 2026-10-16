import { eq } from "drizzle-orm";
import request from "supertest";
import { beforeAll, describe, expect, it } from "vitest";
import { db } from "../../db/index.js";
import {
  annualLessonPlan,
  attendance,
  classes,
  classSchedule,
  departmentHeads,
  grades,
  staff,
  students,
  subjects,
  systemSettings,
  teacherAssignments,
  users,
} from "../../db/schema/index.js";
import { createAccessToken } from "../../lib/jwt.js";
import type { Role } from "../../lib/roles.js";
import { scoped, withTenant } from "../../lib/tenant.js";
import { createTestApp } from "../../test/createTestApp.js";
import { seedTwoTenants, type IsolationSeed } from "../../test/seed.js";

const app = createTestApp();
const YEAR = "2018";

function bearer(tenantId: number, role: Role, userId: number): string {
  return `Bearer ${createAccessToken({ userId, tenantId, role })}`;
}

async function addUser(tenantId: number, username: string): Promise<number> {
  const result = await db.insert(users).values({
    username,
    passwordHash: "x",
    role: "Teacher",
    isActive: 1,
    tenantId,
    tokenVersion: 0,
  });
  return Number(result[0].insertId);
}

async function addStaff(tenantId: number, userId: number, firstName: string): Promise<number> {
  const result = await db.insert(staff).values(
    withTenant({ firstName, lastName: "Bekele", role: "Teacher", jobTitle: "Teacher", isApproved: 1, userId }, tenantId),
  );
  return Number(result[0].insertId);
}

async function addSubject(tenantId: number, name: string, gradeLevel: number): Promise<number> {
  const result = await db.insert(subjects).values({
    subjectName: name,
    gradeLevel,
    stream: "Common",
    creditHours: 3,
    sortOrder: 1,
    tenantId,
  });
  return Number(result[0].insertId);
}

describe("teacher office", () => {
  let seed: IsolationSeed;
  let teacherA = 0;
  let teacherB = 0;
  let staffA = 0;
  let staffB = 0;
  let teacherOther = 0;
  let mathId = 0;
  let mathTenId = 0;
  let englishId = 0;
  let pupilId = 0;
  let mondayId = 0;
  let tuesdayId = 0;
  let fridayLeft = 0;
  let fridayRight = 0;

  beforeAll(async () => {
    seed = await seedTwoTenants();
    teacherA = await addUser(seed.tenantA.id, "office-a");
    teacherB = await addUser(seed.tenantA.id, "office-b");
    teacherOther = await addUser(seed.tenantB.id, "office-b");
    staffA = await addStaff(seed.tenantA.id, teacherA, "Sara");
    staffB = await addStaff(seed.tenantA.id, teacherB, "Jonas");
    await addStaff(seed.tenantB.id, teacherOther, "Other");
    await db.insert(systemSettings).values(withTenant({ settingKey: "current_academic_year", settingValue: YEAR }, seed.tenantA.id));
    await db.insert(systemSettings).values(withTenant({ settingKey: "current_academic_year", settingValue: YEAR }, seed.tenantB.id));

    mathId = await addSubject(seed.tenantA.id, "Mathematics", 9);
    mathTenId = await addSubject(seed.tenantA.id, "Mathematics 10", 10);
    englishId = await addSubject(seed.tenantA.id, "English", 9);
    const pupil = await db.insert(students).values({
      fullName: "Abel Bekele",
      gender: "M",
      age: 15,
      gradeLevel: 9,
      section: "A",
      academicYear: YEAR,
      tenantId: seed.tenantA.id,
    });
    pupilId = Number(pupil[0].insertId);
    await db
      .update(classes)
      .set({ classTeacherId: staffA })
      .where(scoped(classes, seed.tenantA.id, eq(classes.classId, seed.tenantA.classId)));

    await db.insert(teacherAssignments).values([
      withTenant({ staffId: staffA, subjectId: mathId, gradeLevel: 9, section: "A", academicYear: YEAR }, seed.tenantA.id),
      withTenant({ staffId: staffB, subjectId: mathTenId, gradeLevel: 10, section: "A", academicYear: YEAR }, seed.tenantA.id),
      withTenant({ staffId: staffB, subjectId: englishId, gradeLevel: 9, section: "A", academicYear: YEAR }, seed.tenantA.id),
    ]);
    await db.insert(departmentHeads).values(
      withTenant({ staffId: staffA, department: "Mathematics", academicYear: YEAR }, seed.tenantA.id),
    );

    await db.insert(classSchedule).values([
      withTenant(slot("Monday", 1, staffA, mathId, seed.tenantA.classId), seed.tenantA.id),
      withTenant(slot("Tuesday", 1, staffB, englishId, seed.tenantA.classId), seed.tenantA.id),
      withTenant(slot("Friday", 1, staffA, mathId, seed.tenantA.classId), seed.tenantA.id),
      withTenant(slot("Friday", 2, staffA, mathId, seed.tenantA.classId), seed.tenantA.id),
      withTenant(slot("Friday", 2, staffB, englishId, seed.tenantA.classId), seed.tenantA.id),
    ]);
    const placed = await db
      .select({
        id: classSchedule.timetableId,
        day: classSchedule.dayOfWeek,
        period: classSchedule.periodNumber,
        teacherId: classSchedule.teacherStaffId,
      })
      .from(classSchedule)
      .where(scoped(classSchedule, seed.tenantA.id, eq(classSchedule.academicYear, YEAR)));
    mondayId = placed.find((row) => row.day === "Monday" && row.period === 1)?.id ?? 0;
    tuesdayId = placed.find((row) => row.day === "Tuesday" && row.period === 1)?.id ?? 0;
    fridayLeft = placed.find((row) => row.day === "Friday" && row.period === 1 && row.teacherId === staffA)?.id ?? 0;
    fridayRight = placed.find((row) => row.day === "Friday" && row.period === 2 && row.teacherId === staffB)?.id ?? 0;

    await db.insert(grades).values(
      withTenant(
        {
          studentId: pupilId,
          subjectId: mathId,
          semester: "1",
          score: "80.00",
          maxScore: "100.00",
          weightingType: "Test",
          assessmentName: "Mid",
          academicYear: YEAR,
          recordedBy: staffB,
          isSubmitted: 1,
          submissionStatus: "Submitted",
        },
        seed.tenantA.id,
      ),
    );
    await db.insert(grades).values(
      withTenant(
        {
          studentId: pupilId,
          subjectId: englishId,
          semester: "1",
          score: "70.00",
          maxScore: "100.00",
          weightingType: "Test",
          assessmentName: "Mid",
          academicYear: YEAR,
          recordedBy: staffB,
          isSubmitted: 1,
          submissionStatus: "Submitted",
        },
        seed.tenantA.id,
      ),
    );
    await db.insert(annualLessonPlan).values(
      withTenant(
        {
          staffId: staffA,
          subjectId: mathId,
          gradeLevel: 9,
          academicYear: YEAR,
          weekNumber: 1,
          topicTitle: "Fractions",
          status: "Draft",
        },
        seed.tenantA.id,
      ),
    );
    await db.insert(annualLessonPlan).values(
      withTenant(
        {
          staffId: staffA,
          subjectId: mathId,
          gradeLevel: 9,
          academicYear: YEAR,
          weekNumber: 2,
          topicTitle: "Decimals",
          status: "Draft",
        },
        seed.tenantA.id,
      ),
    );
  });

  const tokenA = () => bearer(seed.tenantA.id, "Teacher", teacherA);
  const tokenB = () => bearer(seed.tenantA.id, "Teacher", teacherB);
  const tokenOther = () => bearer(seed.tenantB.id, "Teacher", teacherOther);

  it("hides the office from a student", async () => {
    await request(app).get("/teacher/office/timetable").set("Authorization", bearer(seed.tenantA.id, "Student", teacherA)).expect(403);
  });

  it("syncs attendance inside the school and keeps an approved mark", async () => {
    const first = await request(app)
      .post("/teacher/office/attendance/sync")
      .set("Authorization", tokenA())
      .send({ marks: [{ studentId: pupilId, subjectId: mathId, date: "2018-04-02", status: "P" }] })
      .expect(200);
    expect(first.body.synced).toBe(1);
    expect(first.body.conflicts).toEqual([]);

    const outside = await request(app)
      .post("/teacher/office/attendance/sync")
      .set("Authorization", tokenA())
      .send({ marks: [{ studentId: seed.tenantB.studentId, subjectId: mathId, date: "2018-04-02", status: "A" }] })
      .expect(200);
    expect(outside.body.synced).toBe(0);
    expect(outside.body.conflicts[0].code).toBe("NOT_ASSIGNED");

    await db
      .update(attendance)
      .set({ approvalStatus: "Approved" })
      .where(scoped(attendance, seed.tenantA.id, eq(attendance.studentId, pupilId)));
    const again = await request(app)
      .post("/teacher/office/attendance/sync")
      .set("Authorization", tokenA())
      .send({ marks: [{ studentId: pupilId, subjectId: mathId, date: "2018-04-02", status: "A" }] })
      .expect(200);
    expect(again.body.synced).toBe(0);
    expect(again.body.conflicts[0].code).toBe("ALREADY_APPROVED");
  });

  it("swaps free periods and refuses a double booking", async () => {
    await request(app)
      .post("/teacher/office/swaps")
      .set("Authorization", tokenA())
      .send({ leftId: mondayId, rightId: tuesdayId })
      .expect(201);
    await request(app)
      .post("/teacher/office/swaps")
      .set("Authorization", tokenA())
      .send({ leftId: fridayLeft, rightId: fridayRight })
      .expect(409);

    const other = await request(app).get("/teacher/office/timetable").set("Authorization", tokenOther()).expect(200);
    const ids = (other.body.school as { id: number }[]).map((row) => row.id);
    expect(ids).not.toContain(mondayId);
  });

  it("covers a period only on its weekday and only when the substitute is free", async () => {
    await request(app)
      .post("/teacher/office/substitutions")
      .set("Authorization", tokenB())
      .send({ timetableId: mondayId, coverDate: "2018-04-03", substituteStaffId: staffA, reason: "Clinic" })
      .expect(409);
    await request(app)
      .post("/teacher/office/substitutions")
      .set("Authorization", tokenB())
      .send({ timetableId: mondayId, coverDate: "2018-04-09", substituteStaffId: staffB, reason: "Clinic" })
      .expect(409);
    const covered = await request(app)
      .post("/teacher/office/substitutions")
      .set("Authorization", tokenB())
      .send({ timetableId: mondayId, coverDate: "2018-04-09", substituteStaffId: staffA, reason: "Clinic" })
      .expect(201);
    await request(app)
      .post("/teacher/office/swaps")
      .set("Authorization", tokenB())
      .send({ leftId: mondayId, rightId: tuesdayId })
      .expect(409);
    await request(app).delete(`/teacher/office/substitutions/${covered.body.id}`).set("Authorization", tokenB()).expect(200);
  });

  it("keeps leave, questions, and participation inside one school", async () => {
    await request(app)
      .post("/teacher/office/leave")
      .set("Authorization", tokenB())
      .send({ kind: "sick", startsOn: "2018-05-01", endsOn: "2018-05-03", reason: "Fever" })
      .expect(201);
    await request(app)
      .post("/teacher/office/leave")
      .set("Authorization", tokenB())
      .send({ kind: "personal", startsOn: "2018-05-03", endsOn: "2018-05-04", reason: "Family" })
      .expect(409);

    const question = await request(app)
      .post("/teacher/office/questions")
      .set("Authorization", tokenA())
      .send({
        subjectId: mathId,
        topic: "Fractions",
        stem: "Half of 8",
        optionA: "2",
        optionB: "4",
        optionC: "6",
        optionD: "8",
        correct: "B",
        points: 1,
      })
      .expect(201);
    await request(app)
      .post("/teacher/office/papers")
      .set("Authorization", tokenA())
      .send({ subjectId: mathId, title: "Quiz", count: 2 })
      .expect(409);
    await request(app)
      .post("/teacher/office/papers")
      .set("Authorization", tokenA())
      .send({ subjectId: mathId, title: "Quiz", count: 1 })
      .expect(201);
    const other = await request(app).get("/teacher/office/questions").set("Authorization", tokenOther()).expect(200);
    expect((other.body.questions as { id: number }[]).map((row) => row.id)).not.toContain(question.body.id);

    await request(app)
      .post("/teacher/office/participation")
      .set("Authorization", tokenA())
      .send({ studentId: pupilId, subjectId: mathId, markedOn: "2018-04-02" })
      .expect(201);
    await request(app)
      .post("/teacher/office/participation")
      .set("Authorization", tokenA())
      .send({ studentId: pupilId, subjectId: mathId, markedOn: "2018-04-02" })
      .expect(409);
  });

  it("shows a homeroom student only to that class teacher", async () => {
    const view = await request(app).get(`/teacher/office/student-360/${pupilId}`).set("Authorization", tokenA()).expect(200);
    expect(view.body.attendance.present).toBeGreaterThan(0);
    expect(view.body.participation).toBe(1);
    await request(app).get(`/teacher/office/student-360/${seed.tenantB.studentId}`).set("Authorization", tokenA()).expect(404);
    await request(app).get("/teacher/office/student-360").set("Authorization", tokenB()).expect(403);
  });

  it("lets the department head approve department marks and cover an approved topic", async () => {
    const board = await request(app).get("/teacher/office/grades").set("Authorization", tokenA()).expect(200);
    const math = (board.body.rows as { id: number; subject: string }[]).find((row) => row.subject === "Mathematics");
    const english = (board.body.rows as { id: number; subject: string }[]).find((row) => row.subject === "English");
    expect(math).toBeTruthy();
    expect(english).toBeUndefined();
    await request(app).post(`/teacher/office/grades/${math?.id}/approve`).set("Authorization", tokenA()).expect(200);
    await request(app).post(`/teacher/office/grades/${math?.id}/send`).set("Authorization", tokenA()).expect(200);
    await request(app).post(`/teacher/office/grades/${math?.id}/send`).set("Authorization", tokenA()).expect(409);

    const curriculum = await request(app).get("/teacher/office/curriculum").set("Authorization", tokenA()).expect(200);
    const planId = (curriculum.body.plans as { id: number; topic: string }[]).find((row) => row.topic === "Fractions")?.id;
    await request(app).post(`/teacher/office/plans/${planId}/approve`).set("Authorization", tokenA()).expect(200);
    await request(app)
      .post("/teacher/office/coverage")
      .set("Authorization", tokenA())
      .send({ planDetailId: planId, coveredOn: "2018-04-02" })
      .expect(201);
    const draftId = (curriculum.body.plans as { id: number; topic: string }[]).find((row) => row.topic === "Decimals")?.id;
    await request(app)
      .post("/teacher/office/coverage")
      .set("Authorization", tokenA())
      .send({ planDetailId: draftId, coveredOn: "2018-04-03" })
      .expect(409);
    const coverage = await request(app).get("/teacher/office/coverage").set("Authorization", tokenA()).expect(200);
    const mathCoverage = (coverage.body.subjects as { name: string; percent: number }[]).find((row) => row.name === "Mathematics");
    expect(mathCoverage?.percent).toBe(50);
    await request(app).get("/teacher/office/curriculum").set("Authorization", tokenOther()).expect(403);
  });

  it("evaluates another department teacher and refuses a self evaluation", async () => {
    const scores = { planning: 18, delivery: 24, assessment: 20, punctuality: 12, care: 8 };
    await request(app)
      .post("/teacher/office/evaluations")
      .set("Authorization", tokenA())
      .send({ staffId: staffA, term: "1", note: "Myself", scores })
      .expect(409);
    const saved = await request(app)
      .post("/teacher/office/evaluations")
      .set("Authorization", tokenA())
      .send({ staffId: staffB, term: "1", note: "Steady lessons", scores })
      .expect(201);
    await request(app)
      .post("/teacher/office/evaluations")
      .set("Authorization", tokenA())
      .send({ staffId: staffB, term: "1", note: "Again", scores })
      .expect(409);
    const other = await request(app).get("/teacher/office/evaluations").set("Authorization", tokenOther()).expect(403);
    expect(other.body.id).toBeUndefined();
    expect(saved.body.id).toBeGreaterThan(0);

    const bought = await request(app)
      .post("/teacher/office/requisitions")
      .set("Authorization", tokenA())
      .send({ itemName: "Graph books", quantity: 40, purpose: "Grade 9 sets" })
      .expect(201);
    await request(app).post(`/teacher/office/requisitions/${bought.body.id}/send`).set("Authorization", tokenA()).expect(200);
    const list = await request(app).get("/teacher/office/requisitions").set("Authorization", tokenOther()).expect(403);
    expect(list.body.rows).toBeUndefined();
  });
});

function slot(day: "Monday" | "Tuesday" | "Friday", period: number, teacherStaffId: number, subjectId: number, classId: number) {
  return {
    academicYear: YEAR,
    dayOfWeek: day,
    periodNumber: period,
    startTime: "08:00:00",
    endTime: "08:40:00",
    classId,
    subjectId,
    teacherStaffId,
    type: "Class" as const,
  };
}

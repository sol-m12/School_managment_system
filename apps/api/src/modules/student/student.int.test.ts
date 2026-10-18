import { and, eq } from "drizzle-orm";
import request from "supertest";
import { beforeAll, describe, expect, it } from "vitest";
import { db } from "../../db/index.js";
import { grades, groupMembers, groupsInfo, students, systemSettings, users } from "../../db/schema/index.js";
import { createAccessToken } from "../../lib/jwt.js";
import type { Role } from "../../lib/roles.js";
import { withTenant } from "../../lib/tenant.js";
import { createTestApp } from "../../test/createTestApp.js";
import { seedTwoTenants, type IsolationSeed } from "../../test/seed.js";

const app = createTestApp();

function bearer(tenantId: number, userId: number, role: Role): string {
  return `Bearer ${createAccessToken({ userId, tenantId, role })}`;
}

describe("student API", () => {
  let seed: IsolationSeed;
  let studentAUserId = 0;
  let studentBUserId = 0;
  let groupAId = 0;

  beforeAll(async () => {
    seed = await seedTwoTenants();
    const userA = await db.insert(users).values({
      username: "student-a",
      passwordHash: "unused",
      role: "Student",
      isActive: 1,
      tenantId: seed.tenantA.id,
      tokenVersion: 0,
    });
    const userB = await db.insert(users).values({
      username: "student-b",
      passwordHash: "unused",
      role: "Student",
      isActive: 1,
      tenantId: seed.tenantB.id,
      tokenVersion: 0,
    });
    studentAUserId = Number(userA[0].insertId);
    studentBUserId = Number(userB[0].insertId);
    await db
      .update(students)
      .set({ userId: studentAUserId, section: "A", stream: "Common" })
      .where(eq(students.studentId, seed.tenantA.studentId));
    await db
      .update(students)
      .set({ userId: studentBUserId, section: "B", stream: "Common" })
      .where(eq(students.studentId, seed.tenantB.studentId));
    const [yearRow] = await db
      .select({ value: systemSettings.settingValue })
      .from(systemSettings)
      .where(and(eq(systemSettings.tenantId, seed.tenantA.id), eq(systemSettings.settingKey, "current_academic_year")))
      .limit(1);
    const [semesterRow] = await db
      .select({ value: systemSettings.settingValue })
      .from(systemSettings)
      .where(and(eq(systemSettings.tenantId, seed.tenantA.id), eq(systemSettings.settingKey, "current_semester")))
      .limit(1);
    await db.insert(grades).values(
      withTenant(
        {
          studentId: seed.tenantA.studentId,
          subjectId: seed.tenantA.subjectId,
          semester: semesterRow?.value === "2" ? "2" : "1",
          score: "17.50",
          maxScore: "20.00",
          weightingType: "Test:Classwork",
          academicYear: yearRow?.value ?? "2017",
          submissionStatus: "Submitted",
        },
        seed.tenantA.id,
      ),
    );
    const group = await db.insert(groupsInfo).values(
      withTenant(
        {
          groupName: "Group A only",
          teacherId: seed.tenantA.userId,
          subjectId: seed.tenantA.subjectId,
          gradeLevel: 9,
          section: "A",
          academicYear: "2017",
        },
        seed.tenantA.id,
      ),
    );
    groupAId = Number(group[0].insertId);
    await db.insert(groupMembers).values(
      withTenant({ groupId: groupAId, studentId: seed.tenantA.studentId, isLeader: 1 }, seed.tenantA.id),
    );
  });

  it("rejects a teacher from the student results page", async () => {
    await request(app)
      .get("/student/results")
      .set("Authorization", bearer(seed.tenantA.id, seed.tenantA.userId, "Teacher"))
      .expect(403);
  });

  it("does not return another tenant's marks or groups", async () => {
    const own = await request(app)
      .get("/student/results")
      .set("Authorization", bearer(seed.tenantA.id, studentAUserId, "Student"))
      .expect(200);
    const other = await request(app)
      .get("/student/results")
      .set("Authorization", bearer(seed.tenantB.id, studentBUserId, "Student"))
      .expect(200);

    expect(own.body.fullName).toBe("Student A");
    expect(JSON.stringify(own.body)).toContain("17.5");
    expect(other.body.fullName).toBe("Student B");
    expect(JSON.stringify(other.body)).not.toContain("17.5");
    expect(JSON.stringify(other.body)).not.toContain("Student A");

    const ownGroups = await request(app)
      .get("/student/groups")
      .set("Authorization", bearer(seed.tenantA.id, studentAUserId, "Student"))
      .expect(200);
    const otherGroups = await request(app)
      .get("/student/groups")
      .set("Authorization", bearer(seed.tenantB.id, studentBUserId, "Student"))
      .expect(200);
    const ownIds = (ownGroups.body.rows as { id: number }[]).map((row) => row.id);
    const otherIds = (otherGroups.body.rows as { id: number }[]).map((row) => row.id);
    expect(ownIds).toContain(groupAId);
    expect(otherIds).not.toContain(groupAId);
  });

  it("keeps home, quiz, and the exam lock inside the signed-in school", async () => {
    const homeA = await request(app)
      .get("/student/home")
      .set("Authorization", bearer(seed.tenantA.id, studentAUserId, "Student"))
      .expect(200);
    const homeB = await request(app)
      .get("/student/home")
      .set("Authorization", bearer(seed.tenantB.id, studentBUserId, "Student"))
      .expect(200);
    expect(homeA.body.fullName).toBe("Student A");
    expect(homeB.body.fullName).toBe("Student B");
    expect(homeA.body.studentId).toBe(seed.tenantA.studentId);
    expect(homeB.body.studentId).toBe(seed.tenantB.studentId);
    expect(typeof homeA.body.hasPhoto).toBe("boolean");
    expect(JSON.stringify(homeB.body)).not.toContain("Student A");

    const quizA = await request(app)
      .get("/student/quiz")
      .set("Authorization", bearer(seed.tenantA.id, studentAUserId, "Student"))
      .expect(200);
    const quizB = await request(app)
      .get("/student/quiz")
      .set("Authorization", bearer(seed.tenantB.id, studentBUserId, "Student"))
      .expect(200);
    expect(quizA.body.inGroup).toBe(true);
    expect(quizA.body.groupName).toBe("Group A only");
    expect(quizB.body.inGroup).toBe(false);

    const exams = await request(app)
      .get("/student/exams")
      .set("Authorization", bearer(seed.tenantA.id, studentAUserId, "Student"))
      .expect(200);
    expect(exams.body.locked).toBe(true);

    const labs = await request(app)
      .get("/student/labs")
      .set("Authorization", bearer(seed.tenantA.id, studentAUserId, "Student"))
      .expect(200);
    expect(labs.body.labs.map((lab: { id: string }) => lab.id)).toEqual(["physics", "chemistry", "biology"]);
  });
});

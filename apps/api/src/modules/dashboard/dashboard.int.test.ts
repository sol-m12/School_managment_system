import { eq } from "drizzle-orm";
import request from "supertest";
import { beforeAll, describe, expect, it } from "vitest";
import { db } from "../../db/index.js";
import { classSchedule, staff, students, systemSettings, teacherAssignments } from "../../db/schema/index.js";
import { createAccessToken } from "../../lib/jwt.js";
import type { Role } from "../../lib/roles.js";
import { scoped, withTenant } from "../../lib/tenant.js";
import { createTestApp } from "../../test/createTestApp.js";
import { seedTwoTenants, type IsolationSeed } from "../../test/seed.js";
import { schoolWeekday } from "./dashboard.service.js";

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

  it("shows the control center to Principal and V_Principal, and only that tenant's students", async () => {
    const principal = await request(app).get("/dashboard").set("Authorization", bearer(seed.tenantA.id, "Principal")).expect(200);
    expect(principal.body.kind).toBe("control");
    expect(principal.body.academicYear).toBe("2017");
    expect(principal.body.students).toBe(1);

    const vice = await request(app)
      .get("/dashboard")
      .set("Authorization", bearer(seed.tenantA.id, "V_Principal", seed.tenantA.userId))
      .expect(200);
    expect(vice.body.students).toBe(1);

    const other = await request(app).get("/dashboard").set("Authorization", bearer(seed.tenantB.id, "Principal")).expect(200);
    expect(other.body.students).toBe(0);
  });

  it("shows the store home to Technician", async () => {
    const technician = await request(app)
      .get("/dashboard")
      .set("Authorization", bearer(seed.tenantA.id, "Technician"))
      .expect(200);
    expect(technician.body).toMatchObject({ kind: "store", itemTypes: 0, lowStock: 0, todayTransactions: 0 });
  });

  it("shows a teacher only the classes and students of their own school", async () => {
    await db.delete(systemSettings).where(scoped(systemSettings, seed.tenantA.id));
    await db.delete(classSchedule).where(scoped(classSchedule, seed.tenantA.id));
    await db.insert(systemSettings).values(
      withTenant({ settingKey: "current_academic_year", settingValue: "2017" }, seed.tenantA.id),
    );
    const staffResult = await db.insert(staff).values(
      withTenant(
        {
          firstName: "Yonas",
          lastName: "Teacher",
          role: "Teacher",
          jobTitle: "Teacher",
          userId: seed.tenantA.userId,
        },
        seed.tenantA.id,
      ),
    );
    const staffId = Number(staffResult[0].insertId);
    await db.insert(teacherAssignments).values(
      withTenant(
        {
          staffId,
          subjectId: seed.tenantA.subjectId,
          gradeLevel: 9,
          section: "A",
          academicYear: "2017",
        },
        seed.tenantA.id,
      ),
    );
    await db
      .update(students)
      .set({ section: "A", submissionStatus: "Approved" })
      .where(scoped(students, seed.tenantA.id, eq(students.studentId, seed.tenantA.studentId)));
    await db
      .update(students)
      .set({ section: "A", gradeLevel: 9, academicYear: "2017", submissionStatus: "Approved" })
      .where(scoped(students, seed.tenantB.id, eq(students.studentId, seed.tenantB.studentId)));
    await db.insert(classSchedule).values(
      withTenant(
        {
          academicYear: "2017",
          dayOfWeek: schoolWeekday(),
          periodNumber: 1,
          startTime: "08:00:00",
          endTime: "08:40:00",
          classId: seed.tenantA.classId,
          subjectId: seed.tenantA.subjectId,
          teacherStaffId: staffId,
          type: "Class",
        },
        seed.tenantA.id,
      ),
    );

    const teacher = await request(app)
      .get("/dashboard")
      .set("Authorization", bearer(seed.tenantA.id, "Teacher", seed.tenantA.userId))
      .expect(200);
    expect(teacher.body).toMatchObject({
      kind: "academic",
      firstName: "Yonas",
      academicYear: "2017",
      students: 1,
      classes: 1,
    });
    expect(teacher.body.todayPeriods).toEqual([
      expect.objectContaining({ periodNumber: 1, gradeLevel: 9, section: "A", classId: seed.tenantA.classId }),
    ]);

    const other = await request(app)
      .get("/dashboard")
      .set("Authorization", bearer(seed.tenantB.id, "Teacher", seed.tenantB.userId))
      .expect(200);
    expect(other.body).toMatchObject({ kind: "academic", students: 0, classes: 0, todayPeriods: [] });
  });
});

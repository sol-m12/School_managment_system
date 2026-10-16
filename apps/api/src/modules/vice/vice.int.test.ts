import request from "supertest";
import { beforeAll, describe, expect, it } from "vitest";
import { db } from "../../db/index.js";
import { classSchedule, staff } from "../../db/schema/index.js";
import { createAccessToken } from "../../lib/jwt.js";
import type { Role } from "../../lib/roles.js";
import { withTenant } from "../../lib/tenant.js";
import { createTestApp } from "../../test/createTestApp.js";
import { seedTwoTenants, type IsolationSeed } from "../../test/seed.js";

const app = createTestApp();

function bearer(tenantId: number, role: Role = "V_Principal", userId = 1): string {
  return `Bearer ${createAccessToken({ userId, tenantId, role })}`;
}

describe("vice principal office", () => {
  let seed: IsolationSeed;
  let teacherA = 0;
  let teacherA2 = 0;

  beforeAll(async () => {
    seed = await seedTwoTenants();
    const first = await db.insert(staff).values(
      withTenant(
        { firstName: "Sara", lastName: "Bekele", role: "Teacher", jobTitle: "Teacher", isApproved: 1 },
        seed.tenantA.id,
      ),
    );
    const second = await db.insert(staff).values(
      withTenant(
        { firstName: "Jonas", lastName: "Hailu", role: "Teacher", jobTitle: "Teacher", isApproved: 1 },
        seed.tenantA.id,
      ),
    );
    teacherA = Number(first[0].insertId);
    teacherA2 = Number(second[0].insertId);
    await db.insert(staff).values(
      withTenant(
        { firstName: "Other", lastName: "School", role: "Teacher", jobTitle: "Teacher", isApproved: 1 },
        seed.tenantB.id,
      ),
    );
  });

  it("hides the office from a teacher", async () => {
    await request(app).get("/vice/vocational").set("Authorization", bearer(seed.tenantA.id, "Teacher")).expect(403);
  });

  it("keeps a program and its students inside one school", async () => {
    const opened = await request(app)
      .post("/vice/programs")
      .set("Authorization", bearer(seed.tenantA.id, "V_Principal", seed.tenantA.userId))
      .send({ name: "Garment", trade: "Textile", gradeLevel: 10, capacity: 1, description: "Sewing workshop" })
      .expect(201);

    await request(app)
      .post("/vice/placements")
      .set("Authorization", bearer(seed.tenantA.id, "V_Principal", seed.tenantA.userId))
      .send({ programId: opened.body.id, studentId: seed.tenantB.studentId, note: "" })
      .expect(404);

    await request(app)
      .post("/vice/placements")
      .set("Authorization", bearer(seed.tenantA.id, "V_Principal", seed.tenantA.userId))
      .send({ programId: opened.body.id, studentId: seed.tenantA.studentId, note: "first choice" })
      .expect(201);

    await request(app)
      .post("/vice/placements")
      .set("Authorization", bearer(seed.tenantA.id, "V_Principal", seed.tenantA.userId))
      .send({ programId: opened.body.id, studentId: seed.tenantA.studentId, note: "" })
      .expect(409);

    const own = await request(app).get("/vice/vocational").set("Authorization", bearer(seed.tenantA.id)).expect(200);
    const ids = (own.body.programs as { id: number }[]).map((row) => row.id);
    expect(ids).toContain(opened.body.id);

    const other = await request(app).get("/vice/vocational").set("Authorization", bearer(seed.tenantB.id)).expect(200);
    expect((other.body.programs as { id: number }[]).map((row) => row.id)).not.toContain(opened.body.id);
  });

  it("requires a hearing before a penalty and cannot see another school's case", async () => {
    const opened = await request(app)
      .post("/vice/referrals")
      .set("Authorization", bearer(seed.tenantA.id, "V_Principal", seed.tenantA.userId))
      .send({ studentId: seed.tenantA.studentId, category: "misconduct", severity: "high", summary: "Fight in the yard" })
      .expect(201);

    await request(app)
      .post(`/vice/referrals/${opened.body.id}/penalties`)
      .set("Authorization", bearer(seed.tenantA.id))
      .send({ kind: "warning", days: 0, startsOn: "2018-03-01", note: "First warning" })
      .expect(409);

    const hearing = await request(app)
      .post(`/vice/referrals/${opened.body.id}/hearings`)
      .set("Authorization", bearer(seed.tenantA.id))
      .send({ heldOn: "2018-03-02", committee: "Discipline committee", minutes: "Heard both sides" })
      .expect(201);

    await request(app)
      .patch(`/vice/hearings/${hearing.body.id}`)
      .set("Authorization", bearer(seed.tenantA.id))
      .send({ outcome: "Upheld", minutes: "The report stands" })
      .expect(200);

    await request(app)
      .post(`/vice/referrals/${opened.body.id}/penalties`)
      .set("Authorization", bearer(seed.tenantA.id))
      .send({ kind: "detention", days: 2, startsOn: "2018-03-03", note: "After school" })
      .expect(201);

    const other = await request(app).get("/vice/behavior").set("Authorization", bearer(seed.tenantB.id)).expect(200);
    expect((other.body.referrals as { id: number }[]).map((row) => row.id)).not.toContain(opened.body.id);
  });

  it("does not give one teacher two exams at the same time", async () => {
    const first = await request(app)
      .post("/vice/sessions")
      .set("Authorization", bearer(seed.tenantA.id))
      .send({
        title: "Math",
        room: "Hall A",
        examDate: "2018-04-01",
        startTime: "08:00",
        endTime: "10:00",
        gradeLevel: 9,
        section: "A",
        needed: 1,
      })
      .expect(201);
    const second = await request(app)
      .post("/vice/sessions")
      .set("Authorization", bearer(seed.tenantA.id))
      .send({
        title: "English",
        room: "Hall B",
        examDate: "2018-04-01",
        startTime: "09:00",
        endTime: "11:00",
        gradeLevel: 9,
        section: "B",
        needed: 1,
      })
      .expect(201);

    const plan = await request(app).post("/vice/invigilation/assign").set("Authorization", bearer(seed.tenantA.id)).expect(200);
    expect(plan.body.assigned).toBe(0);
    expect(plan.body.gaps).toEqual([]);

    await request(app)
      .post(`/vice/sessions/${second.body.id}/invigilators`)
      .set("Authorization", bearer(seed.tenantA.id))
      .send({ staffId: teacherA })
      .expect(409);

    const board = await request(app).get("/vice/invigilation").set("Authorization", bearer(seed.tenantA.id)).expect(200);
    const rows = board.body.sessions as { id: number; duties: { staffId: number }[] }[];
    const math = rows.find((row) => row.id === first.body.id);
    const english = rows.find((row) => row.id === second.body.id);
    expect(math?.duties).toHaveLength(1);
    expect(english?.duties).toHaveLength(1);
    expect(math?.duties[0]?.staffId).not.toBe(english?.duties[0]?.staffId);
    expect([teacherA, teacherA2]).toContain(math?.duties[0]?.staffId);

    const other = await request(app).get("/vice/invigilation").set("Authorization", bearer(seed.tenantB.id)).expect(200);
    expect((other.body.sessions as { id: number }[]).map((row) => row.id)).not.toContain(first.body.id);
  });

  it("builds one weekday from the timetable and keeps the subject teacher off the lead seat", async () => {
    await db.insert(classSchedule).values(
      withTenant(
        {
          academicYear: "2018",
          dayOfWeek: "Monday",
          periodNumber: 1,
          startTime: "08:00:00",
          endTime: "08:40:00",
          classId: seed.tenantA.classId,
          subjectId: seed.tenantA.subjectId,
          teacherStaffId: teacherA,
          type: "Class",
        },
        seed.tenantA.id,
      ),
    );

    const day = await request(app)
      .post("/vice/invigilation/day")
      .set("Authorization", bearer(seed.tenantA.id))
      .send({ examDate: "2018-04-02" })
      .expect(200);

    expect(day.body.created).toBe(1);
    expect(day.body.assigned).toBe(2);

    const board = await request(app).get("/vice/invigilation").set("Authorization", bearer(seed.tenantA.id)).expect(200);
    const sitting = (board.body.sessions as { title: string; examDate: string; duties: { staffId: number; duty: string }[] }[]).find(
      (row) => row.examDate === "2018-04-02" && row.title === "Seed Subject",
    );
    expect(sitting?.duties.find((duty) => duty.duty === "lead")?.staffId).toBe(teacherA2);

    const other = await request(app)
      .post("/vice/invigilation/day")
      .set("Authorization", bearer(seed.tenantB.id))
      .send({ examDate: "2018-04-02" })
      .expect(200);
    expect(other.body.sittings).toBe(0);
  });
});

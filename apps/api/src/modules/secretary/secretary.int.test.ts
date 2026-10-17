import request from "supertest";
import { beforeAll, describe, expect, it } from "vitest";
import { createAccessToken } from "../../lib/jwt.js";
import type { Role } from "../../lib/roles.js";
import { createTestApp } from "../../test/createTestApp.js";
import { seedTwoTenants, type IsolationSeed } from "../../test/seed.js";

const app = createTestApp();

function bearer(tenantId: number, role: Role, userId: number): string {
  return `Bearer ${createAccessToken({ userId, tenantId, role })}`;
}

describe("secretary office", () => {
  let seed: IsolationSeed;
  let studentId = 0;
  let noticeId = 0;

  beforeAll(async () => {
    seed = await seedTwoTenants();
  });

  function desk(tenant = seed.tenantA.id, userId = seed.tenantA.userId) {
    return bearer(tenant, "Secretary", userId);
  }

  it("keeps the office inside the secretary role and the school", async () => {
    const token = desk();
    await request(app).get("/secretary/desk").set("Authorization", bearer(seed.tenantA.id, "Teacher", seed.tenantA.userId)).expect(403);
    const home = await request(app).get("/secretary/desk").set("Authorization", token).expect(200);
    expect(home.body).toMatchObject({ pendingNotices: expect.any(Number), openTickets: expect.any(Number) });
    const other = await request(app).get("/secretary/students").set("Authorization", desk(seed.tenantB.id, seed.tenantB.userId)).expect(200);
    expect(other.body.rows.every((row: { id: number }) => row.id !== seed.tenantA.studentId)).toBe(true);
  });

  it("registers a student with username and password equal to the student id", async () => {
    const created = await request(app)
      .post("/secretary/students")
      .set("Authorization", desk())
      .send({
        fullName: "Secretary Test Student",
        gender: "M",
        age: 15,
        gradeLevel: 9,
        stream: null,
        registrationType: "አዲስ",
        previousSchool: "",
        kebele: "01",
        gote: "",
        houseNumber: "",
      })
      .expect(201);
    studentId = created.body.id as number;
    expect(created.body.username).toBe(String(studentId));
    expect(created.body.password).toBe(String(studentId));
    expect(created.body.code).toBe(`KEYT-${seed.tenantA.id}-${studentId}`);
    const hidden = await request(app).get("/secretary/students").set("Authorization", desk(seed.tenantB.id, seed.tenantB.userId)).expect(200);
    expect(hidden.body.rows.some((row: { id: number }) => row.id === studentId)).toBe(false);
  });

  it("requires the principal to authorize notices", async () => {
    const created = await request(app)
      .post("/secretary/notices")
      .set("Authorization", desk())
      .send({ title: "Meeting", content: "Staff meeting tomorrow", targetRole: "Staff" })
      .expect(201);
    noticeId = created.body.id as number;
    await request(app)
      .post(`/secretary/notices/${noticeId}/decide`)
      .set("Authorization", desk())
      .send({ decision: "approve" })
      .expect(403);
    await request(app)
      .post(`/secretary/notices/${noticeId}/decide`)
      .set("Authorization", bearer(seed.tenantA.id, "Principal", seed.tenantA.userId))
      .send({ decision: "approve" })
      .expect(200);
    const other = await request(app).get("/secretary/notices").set("Authorization", desk(seed.tenantB.id, seed.tenantB.userId)).expect(200);
    expect(other.body.rows.some((row: { id: number }) => row.id === noticeId)).toBe(false);
  });

  it("renews by barcode code inside the same school only", async () => {
    const renewed = await request(app)
      .post("/secretary/renewals")
      .set("Authorization", desk())
      .send({ code: `KEYT-${seed.tenantA.id}-${studentId}`, toYear: "2099" })
      .expect(201);
    expect(renewed.body.rows[0].id).toBe(studentId);
    await request(app)
      .post("/secretary/renewals")
      .set("Authorization", desk())
      .send({ code: `KEYT-${seed.tenantB.id}-${seed.tenantB.studentId}`, toYear: "2099" })
      .expect(409);
  });

  it("parses form text and registers from the scan", async () => {
    const scanned = await request(app)
      .post("/secretary/ocr")
      .set("Authorization", desk())
      .send({
        rawText: `Full Name: OCR Student
Gender: F
Age: 16
Grade: 10
Registration Type: አዲስ`,
      })
      .expect(201);
    expect(scanned.body.ready).toBe(true);
    const registered = await request(app)
      .post("/secretary/ocr/register")
      .set("Authorization", desk())
      .send({ scanId: scanned.body.id })
      .expect(201);
    expect(registered.body.username).toBe(String(registered.body.id));
    expect(registered.body.password).toBe(String(registered.body.id));
  });
});

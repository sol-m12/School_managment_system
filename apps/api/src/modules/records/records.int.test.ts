import { eq } from "drizzle-orm";
import request from "supertest";
import { beforeAll, describe, expect, it } from "vitest";
import { db } from "../../db/index.js";
import { grades, staff, stDocumentRequests, students, tcGradeReviews } from "../../db/schema/index.js";
import { createAccessToken } from "../../lib/jwt.js";
import type { Role } from "../../lib/roles.js";
import { scoped, withTenant } from "../../lib/tenant.js";
import { createTestApp } from "../../test/createTestApp.js";
import { seedTwoTenants, type IsolationSeed } from "../../test/seed.js";

const app = createTestApp();

function bearer(tenantId: number, role: Role, userId: number): string {
  return `Bearer ${createAccessToken({ userId, tenantId, role })}`;
}

describe("record office", () => {
  let seed: IsolationSeed;
  let gradeId = 0;
  let requestId = 0;
  let fileId = 0;
  let verifyCode = "";

  beforeAll(async () => {
    seed = await seedTwoTenants();
    await db
      .update(students)
      .set({ gradeLevel: 12, section: "A", academicYear: "2018" })
      .where(scoped(students, seed.tenantA.id, eq(students.studentId, seed.tenantA.studentId)));
    const inserted = await db.insert(grades).values(
      withTenant(
        {
          studentId: seed.tenantA.studentId,
          subjectId: seed.tenantA.subjectId,
          semester: "1",
          score: "80.00",
          maxScore: "100.00",
          weightingType: "Final",
          assessmentName: "Final",
          academicYear: "2018",
          submissionStatus: "Approved",
          registrarAccepted: 0,
          recordedBy: seed.tenantA.userId,
        },
        seed.tenantA.id,
      ),
    );
    gradeId = Number(inserted[0].insertId);
    await db.insert(tcGradeReviews).values(
      withTenant({ gradeEntryId: gradeId, status: "Sent", recordedBy: seed.tenantA.userId }, seed.tenantA.id),
    );
  });

  it("keeps the office inside the registrar role and the school", async () => {
    const token = bearer(seed.tenantA.id, "Registrar", seed.tenantA.userId);
    await request(app).get("/records/inbox").set("Authorization", bearer(seed.tenantA.id, "Teacher", seed.tenantA.userId)).expect(403);
    const own = await request(app).get("/records/inbox").set("Authorization", token).expect(200);
    expect(own.body.rows.some((row: { id: number }) => row.id === gradeId)).toBe(true);
    const other = await request(app).get("/records/inbox").set("Authorization", bearer(seed.tenantB.id, "Registrar", seed.tenantB.userId)).expect(200);
    expect(other.body.rows).toEqual([]);
  });

  it("accepts a sent mark, then changes it only after the principal grants it", async () => {
    const token = bearer(seed.tenantA.id, "Registrar", seed.tenantA.userId);
    const principal = bearer(seed.tenantA.id, "Principal", seed.tenantA.userId);
    await request(app).post(`/records/inbox/${gradeId}/accept`).set("Authorization", token).expect(200);
    const blocked = await request(app)
      .post("/records/corrections")
      .set("Authorization", token)
      .send({ gradeEntryId: gradeId, proposedScore: 90, reason: "Roster correction" });
    expect(blocked.status).toBe(201);
    const pending = blocked.body.id as number;
    const early = await request(app).post(`/records/corrections/${pending}/apply`).set("Authorization", token);
    expect(early.status).toBe(409);
    expect(early.body.code).toBe("OVERRIDE_REQUIRED");
    await request(app)
      .post(`/records/overrides/${pending}/decide`)
      .set("Authorization", principal)
      .send({ action: "grant", note: "Approved by the principal" })
      .expect(200);
    await request(app).post(`/records/corrections/${pending}/apply`).set("Authorization", token).expect(200);
    const [row] = await db
      .select({ score: grades.score })
      .from(grades)
      .where(scoped(grades, seed.tenantA.id, eq(grades.gradeEntryId, gradeId)));
    expect(Number(row?.score)).toBe(90);
    const foreign = await request(app)
      .post(`/records/overrides/${pending}/decide`)
      .set("Authorization", bearer(seed.tenantB.id, "Principal", seed.tenantB.userId))
      .send({ action: "grant", note: "Not this school" });
    expect(foreign.status).toBe(404);
  });

  it("archives the roster, locks new marks, and unlocks only with the principal", async () => {
    const token = bearer(seed.tenantA.id, "Registrar", seed.tenantA.userId);
    const principal = bearer(seed.tenantA.id, "Principal", seed.tenantA.userId);
    const archived = await request(app)
      .post("/records/archives")
      .set("Authorization", token)
      .send({ academicYear: "2018", gradeLevel: 12, section: "A" })
      .expect(201);
    expect(archived.body.rowCount).toBe(1);
    await request(app)
      .post("/records/archives")
      .set("Authorization", token)
      .send({ academicYear: "2018", gradeLevel: 12, section: "A" })
      .expect(409);
    const hidden = await request(app).get("/records/archives").set("Authorization", bearer(seed.tenantB.id, "Registrar", seed.tenantB.userId)).expect(200);
    expect(hidden.body.archives).toEqual([]);
    const unlock = await request(app)
      .post("/records/unlocks")
      .set("Authorization", token)
      .send({ academicYear: "2018", gradeLevel: 12, section: "A", reason: "Late mark arrived" })
      .expect(201);
    await request(app).post(`/records/unlocks/${unlock.body.id}/apply`).set("Authorization", token).expect(409);
    await request(app)
      .post(`/records/overrides/${unlock.body.id}/decide`)
      .set("Authorization", principal)
      .send({ action: "grant", note: "Open the section" })
      .expect(200);
    await request(app).post(`/records/unlocks/${unlock.body.id}/apply`).set("Authorization", token).expect(200);
  });

  it("moves a transcript request one step at a time and publishes a verify code", async () => {
    const token = bearer(seed.tenantA.id, "Registrar", seed.tenantA.userId);
    const opened = await db.insert(stDocumentRequests).values(
      withTenant(
        { studentId: seed.tenantA.studentId, kind: "transcript", purpose: "University", status: "Submitted" },
        seed.tenantA.id,
      ),
    );
    requestId = Number(opened[0].insertId);
    const first = await request(app).post(`/records/queue/${requestId}/advance`).set("Authorization", token).expect(200);
    expect(first.body.status).toBe("Reviewing");
    const ready = await request(app).post(`/records/queue/${requestId}/advance`).set("Authorization", token).expect(200);
    expect(ready.body.status).toBe("Ready");
    verifyCode = ready.body.verifyCode as string;
    const check = await request(app).get("/public/verify").query({ code: verifyCode.toLowerCase() }).expect(200);
    expect(check.body.valid).toBe(true);
    await request(app).get("/public/verify").query({ code: "REC-MISSING" }).expect(404);
    const other = await request(app).get("/records/transcripts").set("Authorization", bearer(seed.tenantB.id, "Registrar", seed.tenantB.userId)).expect(200);
    expect(other.body.rows).toEqual([]);
    await request(app).delete("/records/access/1").set("Authorization", token).expect(405);
  });

  it("imports structured rows, files a pdf, and lists alumni only for grade 12", async () => {
    const token = bearer(seed.tenantA.id, "Registrar", seed.tenantA.userId);
    await request(app).post("/records/imports").set("Authorization", token).send({ kind: "excel", text: "sheet" }).expect(400);
    await request(app).post("/records/imports").set("Authorization", token).send({ kind: "pdf", text: "%PDF" }).expect(400);
    const imported = await request(app)
      .post("/records/imports")
      .set("Authorization", token)
      .send({
        kind: "csv",
        text: "fullName,gender,age,gradeLevel,section,academicYear\nImported Student,F,17,12,B,2018",
      })
      .expect(201);
    expect(imported.body.inserted).toBe(1);
    const other = await request(app).get("/records/students").set("Authorization", bearer(seed.tenantB.id, "Registrar", seed.tenantB.userId)).expect(200);
    expect(other.body.rows.some((row: { fullName: string }) => row.fullName === "Imported Student")).toBe(false);
    const filed = await request(app)
      .post("/records/files")
      .set("Authorization", token)
      .field("studentId", String(seed.tenantA.studentId))
      .field("title", "Certificate")
      .attach("file", Buffer.from("%PDF-1.1\n1 0 obj\n<<>>\nendobj\ntrailer\n<<>>\n%%EOF"), "scan.pdf")
      .expect(201);
    fileId = filed.body.id as number;
    await request(app).get(`/records/files/${fileId}`).set("Authorization", bearer(seed.tenantB.id, "Registrar", seed.tenantB.userId)).expect(404);
    await request(app)
      .post("/records/alumni")
      .set("Authorization", token)
      .send({ studentId: seed.tenantB.studentId, graduationYear: "2018", note: "" })
      .expect(404);
    await request(app)
      .post("/records/alumni")
      .set("Authorization", bearer(seed.tenantB.id, "Registrar", seed.tenantB.userId))
      .send({ studentId: seed.tenantB.studentId, graduationYear: "2018", note: "" })
      .expect(409);
    const added = await request(app)
      .post("/records/alumni")
      .set("Authorization", token)
      .send({ studentId: seed.tenantA.studentId, graduationYear: "2018", note: "Completed" })
      .expect(201);
    const listed = await request(app).get("/records/alumni").query({ q: "Student", year: "2018", gender: "M" }).set("Authorization", token).expect(200);
    expect(listed.body.rows.some((row: { id: number }) => row.id === added.body.id)).toBe(true);
    const person = await db.insert(staff).values(
      withTenant({ firstName: "Sara", lastName: "Bekele", role: "Teacher", jobTitle: "Teacher" }, seed.tenantA.id),
    );
    await request(app)
      .post("/records/staff")
      .set("Authorization", token)
      .send({ staffId: Number(person[0].insertId), kind: "credential", title: "Degree", body: "BEd 2015" })
      .expect(201);
    const exported = await request(app).get("/records/export").query({ kind: "marks", year: "2018" }).set("Authorization", token).expect(200);
    expect(exported.body.csv).toContain("90");
    const log = await request(app).get("/records/access").set("Authorization", bearer(seed.tenantB.id, "Registrar", seed.tenantB.userId)).expect(200);
    expect(log.body.rows).toEqual([]);
  });
});

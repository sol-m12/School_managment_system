import { eq } from "drizzle-orm";
import request from "supertest";
import { beforeAll, describe, expect, it } from "vitest";
import { db } from "../../db/index.js";
import { grades, principalPolicies } from "../../db/schema/index.js";
import { createAccessToken } from "../../lib/jwt.js";
import type { Role } from "../../lib/roles.js";
import { withTenant } from "../../lib/tenant.js";
import { createTestApp } from "../../test/createTestApp.js";
import { seedTwoTenants, type IsolationSeed } from "../../test/seed.js";
import { createPolicy, deletePolicy, getPolicy, listPolicies, renamePolicy } from "./principal.service.js";

const app = createTestApp();

function bearer(tenantId: number, role: Role = "Principal", userId = 1): string {
  return `Bearer ${createAccessToken({ userId, tenantId, role })}`;
}

describe("principal office", () => {
  let seed: IsolationSeed;
  let policyA = 0;
  let policyB = 0;

  beforeAll(async () => {
    seed = await seedTwoTenants();
    policyA = (await createPolicy(seed.tenantA.id, seed.tenantA.userId, {
      title: "Keyit conduct",
      body: "Students attend every period.",
      area: "policy",
      status: "Active",
      effectiveOn: null,
    })).id;
    policyB = (await createPolicy(seed.tenantB.id, seed.tenantB.userId, {
      title: "Other school",
      body: "Not for Keyit.",
      area: "compliance",
      status: "Draft",
      effectiveOn: null,
    })).id;
    await db.insert(grades).values(
      withTenant(
        {
          studentId: seed.tenantA.studentId,
          subjectId: seed.tenantA.subjectId,
          semester: "1",
          score: "20.00",
          weightingType: "Mid",
          academicYear: "2017",
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
          score: "15.00",
          weightingType: "Mid",
          academicYear: "2017",
          isSubmitted: 1,
        },
        seed.tenantB.id,
      ),
    );
  });

  it("hides the office from a teacher", async () => {
    await request(app).get("/principal/executive").set("Authorization", bearer(seed.tenantA.id, "Teacher")).expect(403);
  });

  it("lists only this school's policies", async () => {
    const rows = await listPolicies(seed.tenantA.id);
    const ids = rows.map((row) => row.id);
    expect(ids).toContain(policyA);
    expect(ids).not.toContain(policyB);

    const own = await getPolicy(seed.tenantA.id, policyA);
    expect(own?.id).toBe(policyA);
    expect(await getPolicy(seed.tenantA.id, policyB)).toBeNull();

    await renamePolicy(seed.tenantA.id, policyB, "Changed from the other school");
    const still = await getPolicy(seed.tenantB.id, policyB);
    expect(still?.title).toBe("Other school");

    await deletePolicy(seed.tenantA.id, policyB);
    expect((await getPolicy(seed.tenantB.id, policyB))?.id).toBe(policyB);
  });

  it("does not put another school's student on the at-risk list", async () => {
    const response = await request(app).get("/principal/at-risk").set("Authorization", bearer(seed.tenantA.id)).expect(200);
    const ids = (response.body.rows as { id: number }[]).map((row) => row.id);
    expect(ids).toContain(seed.tenantA.studentId);
    expect(ids).not.toContain(seed.tenantB.studentId);
  });

  it("refuses a transfer certificate until clearance, and cannot see the other school", async () => {
    const opened = await request(app)
      .post("/principal/transfers")
      .set("Authorization", bearer(seed.tenantA.id))
      .send({ studentId: seed.tenantA.studentId, destination: "Addis School", reason: "Family move" })
      .expect(201);

    await request(app)
      .post(`/principal/transfers/${opened.body.id}/certificate`)
      .set("Authorization", bearer(seed.tenantA.id))
      .expect(409);

    await request(app)
      .post(`/principal/transfers/${opened.body.id}/clearance`)
      .set("Authorization", bearer(seed.tenantA.id))
      .send({ libraryClear: true, storeClear: true, financeClear: true })
      .expect(200);

    const certificate = await request(app)
      .post(`/principal/transfers/${opened.body.id}/certificate`)
      .set("Authorization", bearer(seed.tenantA.id))
      .expect(200);
    expect(certificate.body.number).toContain("TC-");

    const other = await request(app).get("/principal/transfers").set("Authorization", bearer(seed.tenantB.id)).expect(200);
    const ids = (other.body.transfers as { id: number }[]).map((row) => row.id);
    expect(ids).not.toContain(opened.body.id);
  });

  it("does not decide a store request that belongs to another school", async () => {
    const [policy] = await db
      .select({ id: principalPolicies.policyId })
      .from(principalPolicies)
      .where(eq(principalPolicies.policyId, policyB))
      .limit(1);
    expect(policy?.id).toBe(policyB);

    await request(app)
      .post("/principal/inbox")
      .set("Authorization", bearer(seed.tenantA.id))
      .send({ source: "registration", sourceId: seed.tenantB.studentId, action: "approve", note: "" })
      .expect(404);
  });
});

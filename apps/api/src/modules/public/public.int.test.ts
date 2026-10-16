import { eq } from "drizzle-orm";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { db } from "../../db/index.js";
import { externalInquiries, schoolNews, schoolSettings, staff, users } from "../../db/schema/index.js";
import { hashPassword } from "../../lib/password.js";
import { scoped } from "../../lib/tenant.js";
import { createTestApp } from "../../test/createTestApp.js";
import { seedTwoTenants, type IsolationSeed } from "../../test/seed.js";

const app = createTestApp();

describe("public home", () => {
  let seed: IsolationSeed;

  beforeAll(async () => {
    seed = await seedTwoTenants();
    await db.delete(schoolSettings).where(eq(schoolSettings.id, 910001));
    await db.delete(schoolSettings).where(eq(schoolSettings.id, 910002));
    await db.insert(schoolSettings).values([
      {
        id: 910001,
        schoolName: "School A Portal",
        schoolVision: "Vision A",
        aboutText: "About A",
        schoolNeeds: "Needs A",
        schoolEmail: "a@school.test",
        schoolPhone: "0911000001",
        schoolAddress: "Address A",
        tenantId: seed.tenantA.id,
      },
      {
        id: 910002,
        schoolName: "School B Portal",
        aboutText: "About B",
        tenantId: seed.tenantB.id,
      },
    ]);
    await db.insert(schoolNews).values([
      { title: "News A", content: "Only A", createdAt: "2020-01-02 00:00:00", tenantId: seed.tenantA.id },
      { title: "News B", content: "Only B", createdAt: "2020-01-03 00:00:00", tenantId: seed.tenantB.id },
    ]);
    await db.insert(users).values({
      username: "portal_admin",
      passwordHash: await hashPassword("TestPass123!"),
      role: "Principal",
      isActive: 1,
      tenantId: seed.tenantA.id,
      tokenVersion: 0,
    });
    const [admin] = await db
      .select({ userId: users.userId })
      .from(users)
      .where(scoped(users, seed.tenantA.id, eq(users.username, "portal_admin")))
      .limit(1);
    await db.insert(staff).values([
      {
        firstName: "Principal",
        lastName: "A",
        role: "Principal",
        jobTitle: "Principal",
        userId: admin?.userId,
        tenantId: seed.tenantA.id,
      },
      {
        firstName: "Vice",
        lastName: "A",
        role: "V_Principal",
        jobTitle: "Vice Principal",
        userId: seed.tenantA.userId,
        tenantId: seed.tenantA.id,
      },
    ]);
  });

  afterAll(async () => {
    if (!seed) return;
    for (const tenantId of [seed.tenantA.id, seed.tenantB.id]) {
      await db.delete(externalInquiries).where(scoped(externalInquiries, tenantId));
      await db.delete(schoolNews).where(scoped(schoolNews, tenantId));
      await db.delete(schoolSettings).where(scoped(schoolSettings, tenantId));
      await db.delete(staff).where(scoped(staff, tenantId));
    }
  });

  it("returns 404 for an unknown school", async () => {
    await request(app).get("/public/home").query({ slug: "missing-school" }).expect(404);
  });

  it("returns only that school's portal", async () => {
    const homeA = await request(app).get("/public/home").query({ slug: seed.tenantA.slug }).expect(200);
    expect(homeA.body.schoolName).toBe("School A Portal");
    expect(homeA.body.students).toBe(2);
    expect(homeA.body.staff).toBe(2);
    expect(homeA.body.news).toEqual([{ title: "News A", content: "Only A" }]);
    expect(homeA.body.principal).toEqual({ name: "Principal A", photoFile: null });
    expect(homeA.body.vicePrincipal).toEqual({ name: "Vice A", photoFile: null });
    expect(JSON.stringify(homeA.body)).not.toContain("School B");
    expect(JSON.stringify(homeA.body)).not.toContain("Only B");

    const homeB = await request(app).get("/public/home").query({ slug: seed.tenantB.slug }).expect(200);
    expect(homeB.body.schoolName).toBe("School B Portal");
    expect(homeB.body.students).toBe(1);
    expect(homeB.body.news).toEqual([{ title: "News B", content: "Only B" }]);
    expect(homeB.body.principal).toBeNull();
    expect(JSON.stringify(homeB.body)).not.toContain("School A");
  });

  it("stores an inquiry on the school from the slug, not another school", async () => {
    await request(app)
      .post("/public/inquiries")
      .send({
        slug: seed.tenantA.slug,
        senderName: "Abebe Donor",
        orgName: "Abebe Foundation",
        email: "abebe@example.com",
        phone: "0911223344",
        subject: "Support",
        message: "We can help.",
      })
      .expect(201);

    const rowsA = await db
      .select({ senderName: externalInquiries.senderName })
      .from(externalInquiries)
      .where(scoped(externalInquiries, seed.tenantA.id));
    const rowsB = await db
      .select({ senderName: externalInquiries.senderName })
      .from(externalInquiries)
      .where(scoped(externalInquiries, seed.tenantB.id));
    expect(rowsA.map((row) => row.senderName)).toContain("Abebe Donor");
    expect(rowsB).toHaveLength(0);
  });
});

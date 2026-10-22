import { eq } from "drizzle-orm";
import request from "supertest";
import { beforeAll, describe, expect, it } from "vitest";
import { db } from "../../db/index.js";
import {
  platformUsers,
  schoolSettings,
  staff,
  systemSettings,
  tenants,
  users,
} from "../../db/schema/index.js";
import { createAccessToken, createPlatformAccessToken } from "../../lib/jwt.js";
import { hashPassword } from "../../lib/password.js";
import { scoped } from "../../lib/tenant.js";
import { createTestApp } from "../../test/createTestApp.js";
import { seedTwoTenants } from "../../test/seed.js";

const app = createTestApp();

const PLATFORM_USER = `plat_${Date.now().toString(36)}`;
const PLATFORM_PASS = "PlatformTest1!";

describe("platform API", () => {
  let platformUserId: number;

  beforeAll(async () => {
    await seedTwoTenants();
    const passwordHash = await hashPassword(PLATFORM_PASS);
    const inserted = await db.insert(platformUsers).values({
      username: PLATFORM_USER,
      passwordHash,
      displayName: "Test Platform Admin",
      isActive: 1,
      tokenVersion: 0,
    });
    platformUserId = Number(inserted[0].insertId);
  });

  function platformBearer(userId = platformUserId): string {
    return `Bearer ${createPlatformAccessToken({ userId })}`;
  }

  it("rejects school JWT on platform routes", async () => {
    const schoolToken = createAccessToken({
      userId: 1,
      tenantId: 1,
      role: "Technician",
    });
    await request(app)
      .get("/platform/schools")
      .set("Authorization", `Bearer ${schoolToken}`)
      .expect(401);
  });

  it("logs in a platform user without a tenant slug", async () => {
    const res = await request(app)
      .post("/platform/auth/login")
      .send({ username: PLATFORM_USER, password: PLATFORM_PASS })
      .expect(200);

    expect(res.body.accessToken).toEqual(expect.any(String));
    expect(res.body.user.username).toBe(PLATFORM_USER);
    expect(res.body.user).not.toHaveProperty("tenantId");
  });

  it("lists tenants for a platform session", async () => {
    const res = await request(app)
      .get("/platform/schools")
      .set("Authorization", platformBearer())
      .expect(200);

    const slugs = (res.body.rows as { slug: string }[]).map((row) => row.slug);
    expect(slugs.length).toBeGreaterThan(0);
  });

  it("provisions a new school with seeded settings and first Technician admin", async () => {
    const slug = `school-${Date.now().toString(36)}`;
    const adminUsername = `admin_${slug.slice(-6)}`;

    const res = await request(app)
      .post("/platform/schools")
      .set("Authorization", platformBearer())
      .send({
        name: "New Test School",
        slug,
        adminUsername,
        adminPassword: "SchoolAdmin1!",
        adminFirstName: "School",
        adminLastName: "Operator",
      })
      .expect(201);

    expect(res.body.school.slug).toBe(slug);
    expect(res.body.school.adminRole).toBe("Technician");
    expect(res.body.school.loginPath).toContain(slug);

    const tenantId = res.body.school.tenantId as number;

    const [tenant] = await db
      .select({ id: tenants.id, status: tenants.status })
      .from(tenants)
      .where(eq(tenants.id, tenantId))
      .limit(1);
    expect(tenant?.status).toBe("active");

    const [admin] = await db
      .select({ role: users.role, tenantId: users.tenantId })
      .from(users)
      .where(scoped(users, tenantId, eq(users.username, adminUsername)))
      .limit(1);
    expect(admin?.role).toBe("Technician");
    expect(admin?.tenantId).toBe(tenantId);

    const [staffRow] = await db
      .select({ role: staff.role, tenantId: staff.tenantId })
      .from(staff)
      .where(scoped(staff, tenantId, eq(staff.role, "Technician")))
      .limit(1);
    expect(staffRow?.tenantId).toBe(tenantId);

    const settings = await db
      .select({ schoolName: schoolSettings.schoolName, tenantId: schoolSettings.tenantId })
      .from(schoolSettings)
      .where(eq(schoolSettings.tenantId, tenantId));
    expect(settings).toHaveLength(1);
    expect(settings[0]?.schoolName).toBe("New Test School");

    const yearRows = await db
      .select({ settingKey: systemSettings.settingKey })
      .from(systemSettings)
      .where(eq(systemSettings.tenantId, tenantId));
    expect(yearRows.map((row) => row.settingKey).sort()).toEqual([
      "current_academic_year",
      "current_semester",
    ]);
  });

  it("refuses a duplicate school slug", async () => {
    const slug = `dup-${Date.now().toString(36)}`;
    await request(app)
      .post("/platform/schools")
      .set("Authorization", platformBearer())
      .send({
        name: "Dup School",
        slug,
        adminUsername: `a_${slug.slice(-6)}`,
        adminPassword: "SchoolAdmin1!",
      })
      .expect(201);

    await request(app)
      .post("/platform/schools")
      .set("Authorization", platformBearer())
      .send({
        name: "Dup School 2",
        slug,
        adminUsername: `b_${slug.slice(-6)}`,
        adminPassword: "SchoolAdmin1!",
      })
      .expect(409)
      .expect({ code: "SLUG_TAKEN" });
  });

  it("downloads a SQL backup scoped to one school tenant", async () => {
    const slug = `bak-${Date.now().toString(36)}`;
    const created = await request(app)
      .post("/platform/schools")
      .set("Authorization", platformBearer())
      .send({
        name: "Backup School",
        slug,
        adminUsername: `b_${slug.slice(-6)}`,
        adminPassword: "SchoolAdmin1!",
      })
      .expect(201);

    const tenantId = created.body.school.tenantId as number;
    const res = await request(app)
      .get(`/platform/schools/${tenantId}/backup`)
      .set("Authorization", platformBearer())
      .expect(200);

    const body = String(res.text);
    expect(body).toContain("keyt-tenant-sql-v1");
    expect(body).toContain(`tenant_id: ${tenantId}`);
    expect(body).toContain(`slug: ${slug}`);
    expect(body).toContain("INSERT INTO `tenants`");
    expect(body).toContain("SET FOREIGN_KEY_CHECKS=0");
  });
});

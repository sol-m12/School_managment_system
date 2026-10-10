import { eq } from "drizzle-orm";
import request from "supertest";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { db } from "../db/index.js";
import { classes, students } from "../db/schema/index.js";
import { verifyAccessToken } from "./jwt.js";
import {
  loginWithPassword,
  logoutUser,
  refreshAccessToken,
  AuthError,
} from "../modules/auth/auth.service.js";
import { createTestApp } from "../test/createTestApp.js";
import { describeTenantIsolation } from "../test/describeTenantIsolation.js";
import { seedTwoTenants, type IsolationSeed } from "../test/seed.js";
import { scoped, withTenant } from "./tenant.js";

describe("tenant helpers (scoped / withTenant)", () => {
  let seed: IsolationSeed;

  beforeAll(async () => {
    seed = await seedTwoTenants();
  });

  it("scoped() returns only the caller tenant rows", async () => {
    const aStudents = await db
      .select({
        studentId: students.studentId,
        tenantId: students.tenantId,
      })
      .from(students)
      .where(scoped(students, seed.tenantA.id));

    expect(aStudents.length).toBeGreaterThanOrEqual(1);
    expect(aStudents.every((r) => r.tenantId === seed.tenantA.id)).toBe(true);
    expect(
      aStudents.some((r) => r.studentId === seed.tenantB.studentId),
    ).toBe(false);

    const aClasses = await db
      .select({
        classId: classes.classId,
        tenantId: classes.tenantId,
      })
      .from(classes)
      .where(scoped(classes, seed.tenantA.id));

    expect(aClasses.every((r) => r.tenantId === seed.tenantA.id)).toBe(true);
    expect(aClasses.some((r) => r.classId === seed.tenantB.classId)).toBe(
      false,
    );
  });

  it("withTenant() always writes the caller tenant_id", async () => {
    const poisoned = withTenant(
      {
        fullName: "Poisoned Insert",
        gender: "F" as const,
        age: 14,
        gradeLevel: 8,
        academicYear: "2017",
        tenantId: seed.tenantB.id,
      },
      seed.tenantA.id,
    );

    expect(poisoned.tenantId).toBe(seed.tenantA.id);

    const result = await db.insert(students).values(poisoned);
    const insertId = Number(result[0].insertId);

    const [row] = await db
      .select({
        studentId: students.studentId,
        tenantId: students.tenantId,
      })
      .from(students)
      .where(eq(students.studentId, insertId))
      .limit(1);

    expect(row?.tenantId).toBe(seed.tenantA.id);
  });
});

describe("auth tenant isolation", () => {
  let seed: IsolationSeed;
  const app = createTestApp();

  beforeAll(async () => {
    seed = await seedTwoTenants();
  });

  it("same username logs into the correct tenant; wrong slug fails", async () => {
    const loginA = await loginWithPassword({
      tenantSlug: seed.tenantA.slug,
      username: seed.username,
      password: seed.password,
    });
    expect(loginA.user.tenantId).toBe(seed.tenantA.id);
    expect(loginA.user.id).toBe(seed.tenantA.userId);

    const loginB = await loginWithPassword({
      tenantSlug: seed.tenantB.slug,
      username: seed.username,
      password: seed.password,
    });
    expect(loginB.user.tenantId).toBe(seed.tenantB.id);
    expect(loginB.user.id).toBe(seed.tenantB.userId);

    await expect(
      loginWithPassword({
        tenantSlug: "missing-tenant-slug",
        username: seed.username,
        password: seed.password,
      }),
    ).rejects.toMatchObject({ code: "AUTH_INVALID_CREDENTIALS" });
  });

  it("ignores tenantId / tenant_id in body and query", async () => {
    const loginRes = await request(app)
      .post("/auth/login")
      .send({
        tenantSlug: seed.tenantA.slug,
        username: seed.username,
        password: seed.password,
        tenantId: seed.tenantB.id,
        tenant_id: seed.tenantB.id,
      })
      .expect(200);

    expect(loginRes.body.user.tenantId).toBe(seed.tenantA.id);
    const accessToken = loginRes.body.accessToken as string;
    expect(verifyAccessToken(accessToken).tenantId).toBe(seed.tenantA.id);

    const meRes = await request(app)
      .get("/auth/me")
      .query({ tenantId: seed.tenantB.id, tenant_id: seed.tenantB.id })
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ tenantId: seed.tenantB.id, tenant_id: seed.tenantB.id })
      .expect(200);

    expect(meRes.body.user.tenantId).toBe(seed.tenantA.id);
  });

  it("refresh cookie for tenant A cannot yield a token for tenant B", async () => {
    const agent = request.agent(app);

    await agent
      .post("/auth/login")
      .send({
        tenantSlug: seed.tenantA.slug,
        username: seed.username,
        password: seed.password,
      })
      .expect(200);

    const refreshRes = await agent.post("/auth/refresh").expect(200);
    const payload = verifyAccessToken(refreshRes.body.accessToken as string);
    expect(payload.tenantId).toBe(seed.tenantA.id);
    expect(payload.tenantId).not.toBe(seed.tenantB.id);
    expect(payload.userId).toBe(seed.tenantA.userId);
  });

  it("rejects refresh after logout bumps token_version", async () => {
    const login = await loginWithPassword({
      tenantSlug: seed.tenantA.slug,
      username: seed.username,
      password: seed.password,
    });

    await refreshAccessToken(login.refreshToken);

    await logoutUser(seed.tenantA.userId, seed.tenantA.id);

    await expect(refreshAccessToken(login.refreshToken)).rejects.toBeInstanceOf(
      AuthError,
    );
    await expect(refreshAccessToken(login.refreshToken)).rejects.toMatchObject({
      code: "AUTH_UNAUTHORIZED",
    });
  });
});

describe("real app boot", () => {
  it("boots without errors or warnings and serves GET /health", async () => {
    const warnings: unknown[] = [];
    const errors: unknown[] = [];
    const warnSpy = vi
      .spyOn(console, "warn")
      .mockImplementation((...args: unknown[]) => {
        warnings.push(args);
      });
    const errorSpy = vi
      .spyOn(console, "error")
      .mockImplementation((...args: unknown[]) => {
        errors.push(args);
      });

    try {
      const { app } = await import("../index.js");
      const res = await request(app).get("/health").expect(200);
      expect(res.body).toEqual({ status: "ok" });
      expect(warnings).toEqual([]);
      expect(errors).toEqual([]);
    } finally {
      warnSpy.mockRestore();
      errorSpy.mockRestore();
    }
  });
});

describeTenantIsolation("students", {
  resourceId: (seed) => ({
    aId: seed.tenantA.studentId,
    bId: seed.tenantB.studentId,
  }),
  list: async (tenantId) => {
    const rows = await db
      .select({ id: students.studentId })
      .from(students)
      .where(scoped(students, tenantId));
    return rows;
  },
  get: async (tenantId, id) => {
    const [row] = await db
      .select({ id: students.studentId })
      .from(students)
      .where(scoped(students, tenantId, eq(students.studentId, id)))
      .limit(1);
    return row;
  },
  update: async (tenantId, id) => {
    await db
      .update(students)
      .set({ fullName: "Cross-tenant write attempt" })
      .where(scoped(students, tenantId, eq(students.studentId, id)));
  },
  delete: async (tenantId, id) => {
    await db
      .delete(students)
      .where(scoped(students, tenantId, eq(students.studentId, id)));
  },
});

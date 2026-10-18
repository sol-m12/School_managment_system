import { eq } from "drizzle-orm";
import request from "supertest";
import { beforeAll, describe, expect, it } from "vitest";
import { db } from "../../db/index.js";
import { students } from "../../db/schema/index.js";
import { createAccessToken } from "../../lib/jwt.js";
import { scoped } from "../../lib/tenant.js";
import { createTestApp } from "../../test/createTestApp.js";
import { describeTenantIsolation } from "../../test/describeTenantIsolation.js";
import { seedTwoTenants, type IsolationSeed } from "../../test/seed.js";
import {
  ForumError,
  getQuestion,
  listQuestions,
  moderateDelete,
  postQuestion,
} from "./forum.service.js";

const app = createTestApp();

function bearer(tenantId: number, userId: number): string {
  return `Bearer ${createAccessToken({ userId, tenantId, role: "Student" })}`;
}

async function linkStudent(tenantId: number, studentId: number, userId: number) {
  await db
    .update(students)
    .set({ userId })
    .where(scoped(students, tenantId, eq(students.studentId, studentId)));
}

async function seedQuestions(seed: IsolationSeed) {
  await linkStudent(seed.tenantA.id, seed.tenantA.studentId, seed.tenantA.userId);
  await linkStudent(seed.tenantB.id, seed.tenantB.studentId, seed.tenantB.userId);
  const a = await postQuestion(seed.tenantA.id, seed.tenantA.userId, {
    title: "Q A",
    body: "Body A",
  });
  const b = await postQuestion(seed.tenantB.id, seed.tenantB.userId, {
    title: "Q B",
    body: "Body B",
  });
  return { aId: a.id, bId: b.id };
}

describeTenantIsolation("forum", {
  resourceId: async (seed) => seedQuestions(seed),
  list: async (tenantId) => (await listQuestions(tenantId)).rows,
  get: async (tenantId, id) => {
    try {
      return await getQuestion(tenantId, id);
    } catch (error) {
      if (error instanceof ForumError && error.code === "NOT_FOUND") return null;
      throw error;
    }
  },
  update: async (tenantId, id) => {
    await expect(moderateDelete(tenantId, "question", id)).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
  },
  delete: async (tenantId, id) => {
    await expect(moderateDelete(tenantId, "question", id)).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
  },
});

describe("forum API: tenant from token", () => {
  let seed: IsolationSeed;

  beforeAll(async () => {
    seed = await seedTwoTenants();
    await seedQuestions(seed);
  });

  it("lists only caller tenant questions", async () => {
    const auth = bearer(seed.tenantA.id, seed.tenantA.userId);
    const res = await request(app).get("/forum/questions").set("Authorization", auth).expect(200);
    const titles = (res.body.rows as { title: string }[]).map((r) => r.title);
    expect(titles).toContain("Q A");
    expect(titles).not.toContain("Q B");
  });
});

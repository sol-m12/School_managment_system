import request from "supertest";
import { beforeAll, describe, expect, it } from "vitest";
import { createAccessToken } from "../../lib/jwt.js";
import { createTestApp } from "../../test/createTestApp.js";
import { describeTenantIsolation } from "../../test/describeTenantIsolation.js";
import { seedTwoTenants, type IsolationSeed } from "../../test/seed.js";
import {
  ScholarshipError,
  createOpportunity,
  deleteOpportunity,
  getOpportunity,
  listOpportunities,
  updateOpportunity,
} from "./scholarships.service.js";

const app = createTestApp();

function bearer(tenantId: number, userId: number): string {
  return `Bearer ${createAccessToken({ userId, tenantId, role: "V_Principal" })}`;
}

async function seedOpps(seed: IsolationSeed) {
  const a = await createOpportunity(seed.tenantA.id, seed.tenantA.userId, {
    title: "Opp A",
    url: "",
    guidelines: "A",
    isActive: true,
  });
  const b = await createOpportunity(seed.tenantB.id, seed.tenantB.userId, {
    title: "Opp B",
    url: "",
    guidelines: "B",
    isActive: true,
  });
  return { aId: a.id, bId: b.id };
}

describeTenantIsolation("scholarships", {
  resourceId: async (seed) => seedOpps(seed),
  list: async (tenantId) => (await listOpportunities(tenantId)).rows,
  get: async (tenantId, id) => {
    try {
      return await getOpportunity(tenantId, id);
    } catch (error) {
      if (error instanceof ScholarshipError && error.code === "NOT_FOUND") return null;
      throw error;
    }
  },
  update: async (tenantId, id) => {
    await expect(updateOpportunity(tenantId, id, { title: "x" })).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
  },
  delete: async (tenantId, id) => {
    await expect(deleteOpportunity(tenantId, id)).rejects.toMatchObject({ code: "NOT_FOUND" });
  },
});

describe("scholarships API: tenant from token", () => {
  let seed: IsolationSeed;

  beforeAll(async () => {
    seed = await seedTwoTenants();
    await seedOpps(seed);
  });

  it("lists only caller tenant opportunities", async () => {
    const auth = bearer(seed.tenantA.id, seed.tenantA.userId);
    const res = await request(app)
      .get("/scholarships/opportunities")
      .set("Authorization", auth)
      .expect(200);
    const titles = (res.body.rows as { title: string }[]).map((r) => r.title);
    expect(titles).toContain("Opp A");
    expect(titles).not.toContain("Opp B");
  });
});

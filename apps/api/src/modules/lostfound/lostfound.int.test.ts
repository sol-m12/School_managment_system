import request from "supertest";
import { beforeAll, describe, expect, it } from "vitest";
import { createAccessToken } from "../../lib/jwt.js";
import { createTestApp } from "../../test/createTestApp.js";
import { describeTenantIsolation } from "../../test/describeTenantIsolation.js";
import { seedTwoTenants, type IsolationSeed } from "../../test/seed.js";
import {
  LostFoundError,
  deleteItem,
  getItem,
  listQueue,
  moderateItem,
  postItem,
} from "./lostfound.service.js";

const app = createTestApp();

function bearer(tenantId: number, role: "Student" | "Secretary", userId: number): string {
  return `Bearer ${createAccessToken({ userId, tenantId, role })}`;
}

async function seedItems(seed: IsolationSeed) {
  const a = await postItem(seed.tenantA.id, seed.tenantA.userId, {
    kind: "Lost",
    title: "Bag A",
    description: "Tenant A",
    locationText: "",
    contactText: "",
  });
  const b = await postItem(seed.tenantB.id, seed.tenantB.userId, {
    kind: "Found",
    title: "Bag B",
    description: "Tenant B",
    locationText: "",
    contactText: "",
  });
  return { aId: a.id, bId: b.id };
}

describeTenantIsolation("lostfound", {
  resourceId: async (seed) => seedItems(seed),
  list: async (tenantId) => (await listQueue(tenantId)).rows,
  get: async (tenantId, id) => {
    try {
      return await getItem(tenantId, id);
    } catch (error) {
      if (error instanceof LostFoundError && error.code === "NOT_FOUND") return null;
      throw error;
    }
  },
  update: async (tenantId, id) => {
    await expect(
      moderateItem(tenantId, 1, id, { action: "Approve" }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  },
  delete: async (tenantId, id) => {
    await expect(deleteItem(tenantId, id)).rejects.toMatchObject({ code: "NOT_FOUND" });
  },
});

describe("lostfound API: tenant from token", () => {
  let seed: IsolationSeed;

  beforeAll(async () => {
    seed = await seedTwoTenants();
    await seedItems(seed);
  });

  it("lists only caller tenant queue", async () => {
    const auth = bearer(seed.tenantA.id, "Secretary", seed.tenantA.userId);
    const res = await request(app).get("/lostfound/queue").set("Authorization", auth).expect(200);
    const titles = (res.body.rows as { title: string }[]).map((r) => r.title);
    expect(titles).toContain("Bag A");
    expect(titles).not.toContain("Bag B");
  });
});

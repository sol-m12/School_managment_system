import request from "supertest";
import { beforeAll, describe, expect, it } from "vitest";
import { createAccessToken } from "../../lib/jwt.js";
import type { Role } from "../../lib/roles.js";
import { createTestApp } from "../../test/createTestApp.js";
import { seedTwoTenants, type IsolationSeed } from "../../test/seed.js";

const app = createTestApp();

function bearer(tenantId: number, role: Role = "Store_Keeper"): string {
  return `Bearer ${createAccessToken({ userId: 1, tenantId, role })}`;
}

describe("store keeper API", () => {
  let seed: IsolationSeed;

  beforeAll(async () => {
    seed = await seedTwoTenants();
  });

  it("rejects a teacher", async () => {
    await request(app).get("/store/items").set("Authorization", bearer(seed.tenantA.id, "Teacher")).expect(403);
  });

  it("keeps an item inside the school that created it", async () => {
    const category = await request(app)
      .post("/store/categories")
      .set("Authorization", bearer(seed.tenantA.id))
      .send({ categoryCode: "4403", categoryName: "የጽህፈት መሳሪያ", description: "" })
      .expect(201);

    const created = await request(app)
      .post("/store/items")
      .set("Authorization", bearer(seed.tenantA.id))
      .send({
        itemName: "A4 paper",
        categoryId: category.body.id,
        itemCode: "4403-001",
        modelNo: "",
        unitOfMeasure: "Ream",
        unitCost: 0,
        reorderLevel: 5,
        storeNo: "Store A",
        shelfNo: "Shelf 1",
        isPerishable: false,
        expiryDate: null,
        specification: "",
        itemType: "consumable",
      })
      .expect(201);

    const own = await request(app).get("/store/items").set("Authorization", bearer(seed.tenantA.id)).expect(200);
    expect(own.body.rows.some((row: { id: number }) => row.id === created.body.id)).toBe(true);
    expect(own.body.stats.totalSkus).toBeGreaterThan(0);

    const other = await request(app).get("/store/items").set("Authorization", bearer(seed.tenantB.id)).expect(200);
    expect(other.body.rows.some((row: { id: number }) => row.id === created.body.id)).toBe(false);
    expect(other.body.stats.totalSkus).toBe(0);
  });

  it("receives stock on Model 19 only for that school", async () => {
    const board = await request(app).get("/store/grn").set("Authorization", bearer(seed.tenantA.id)).expect(200);
    const itemId = board.body.items[0].id as number;
    await request(app)
      .post("/store/grn")
      .set("Authorization", bearer(seed.tenantA.id))
      .send({
        grnNumber: "1001",
        dateReceived: "2026-10-15",
        department: "Store",
        supplierId: null,
        itemId,
        quantityReceived: 15,
        unitPrice: 12,
      })
      .expect(201);

    const items = await request(app).get("/store/items").set("Authorization", bearer(seed.tenantA.id)).expect(200);
    const item = items.body.rows.find((row: { id: number }) => row.id === itemId);
    expect(item.currentStock).toBe(15);

    const other = await request(app).get("/store/grn").set("Authorization", bearer(seed.tenantB.id)).expect(200);
    expect(other.body.records).toEqual([]);
    expect(other.body.items).toEqual([]);
  });
});

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

describe("store office API", () => {
  let seed: IsolationSeed;
  let paperId = 0;
  let projectorId = 0;
  let assetId = 0;
  let loanId = 0;

  beforeAll(async () => {
    seed = await seedTwoTenants();
  });

  async function addItem(
    token: string,
    input: { code: string; name: string; itemType: "consumable" | "fixed_asset"; reorderLevel: number },
  ): Promise<number> {
    const category = await request(app)
      .post("/store/categories")
      .set("Authorization", token)
      .send({ categoryCode: input.code.slice(0, 8), categoryName: input.name, description: "" })
      .expect(201);
    const created = await request(app)
      .post("/store/items")
      .set("Authorization", token)
      .send({
        itemName: input.name,
        categoryId: category.body.id,
        itemCode: input.code,
        modelNo: "",
        unitOfMeasure: "Pcs",
        unitCost: 10,
        reorderLevel: input.reorderLevel,
        storeNo: "Store A",
        shelfNo: "Shelf 1",
        isPerishable: false,
        expiryDate: null,
        specification: "",
        itemType: input.itemType,
      })
      .expect(201);
    return created.body.id as number;
  }

  it("rejects a teacher", async () => {
    await request(app)
      .get("/store/office/search")
      .query({ q: "paper" })
      .set("Authorization", bearer(seed.tenantA.id, "Teacher"))
      .expect(403);
  });

  it("routes a purchase only while stock is at the reorder level, and only inside that school", async () => {
    const token = bearer(seed.tenantA.id);
    paperId = await addItem(token, { code: "OFF-PAPER", name: "Office paper", itemType: "consumable", reorderLevel: 5 });
    projectorId = await addItem(token, {
      code: "OFF-PROJ",
      name: "Classroom projector",
      itemType: "fixed_asset",
      reorderLevel: 1,
    });

    const alerts = await request(app).get("/store/office/alerts").set("Authorization", token).expect(200);
    expect(alerts.body.rows.some((row: { itemId: number; kind: string }) => row.itemId === paperId && row.kind === "reorder")).toBe(
      true,
    );

    await request(app)
      .post("/store/office/procurement")
      .set("Authorization", token)
      .send({ itemId: paperId, quantity: 5, note: "restock" })
      .expect(201);

    const other = await request(app).get("/store/office/procurement").set("Authorization", bearer(seed.tenantB.id)).expect(200);
    expect(other.body.requests).toEqual([]);
    expect(other.body.low.some((row: { id: number }) => row.id === paperId)).toBe(false);

    await request(app)
      .post("/store/office/procurement")
      .set("Authorization", token)
      .send({ itemId: paperId, quantity: 1, note: "" })
      .expect(409);

    const board = await request(app).get("/store/grn").set("Authorization", token).expect(200);
    await request(app)
      .post("/store/grn")
      .set("Authorization", token)
      .send({
        grnNumber: board.body.nextGrnNumber || "9001",
        dateReceived: "2026-10-17",
        department: "Store",
        supplierId: null,
        itemId: paperId,
        quantityReceived: 20,
        unitPrice: 10,
      })
      .expect(201);

    const blocked = await request(app)
      .post("/store/office/procurement")
      .set("Authorization", token)
      .send({ itemId: paperId, quantity: 1, note: "" });
    expect(blocked.status).toBe(409);
    expect(blocked.body.code).toBe("STOCK_ADEQUATE");
  });

  it("searches inventory for the school that owns the item", async () => {
    const own = await request(app)
      .get("/store/office/search")
      .query({ q: "OFF-PAPER" })
      .set("Authorization", bearer(seed.tenantA.id))
      .expect(200);
    expect(own.body.rows.some((row: { id: number }) => row.id === paperId)).toBe(true);
    const other = await request(app)
      .get("/store/office/search")
      .query({ q: "OFF-PAPER" })
      .set("Authorization", bearer(seed.tenantB.id))
      .expect(200);
    expect(other.body.rows).toEqual([]);
  });

  it("tags a fixed asset, records damage, and lends it only inside that school", async () => {
    const token = bearer(seed.tenantA.id);
    const catalog = await request(app).get("/store/office/assets").set("Authorization", token).expect(200);
    expect(catalog.body.items.some((row: { id: number }) => row.id === paperId)).toBe(true);

    const tagged = await request(app)
      .post("/store/office/assets")
      .set("Authorization", token)
      .send({ itemId: projectorId, serialNo: "SN-1", location: "Hall" })
      .expect(201);
    assetId = tagged.body.id as number;
    expect(tagged.body.tag).toBe("AST-001");

    const own = await request(app).get("/store/office/assets").set("Authorization", token).expect(200);
    expect(own.body.rows[0].qrSvg.startsWith("<svg")).toBe(true);
    const found = await request(app)
      .get("/store/office/assets/lookup")
      .query({ tag: "ast-001" })
      .set("Authorization", token)
      .expect(200);
    expect(found.body.tag).toBe("AST-001");
    expect(found.body.name).toBe("Classroom projector");
    await request(app)
      .get("/store/office/assets/lookup")
      .query({ tag: "AST-001" })
      .set("Authorization", bearer(seed.tenantB.id))
      .expect(404);
    const otherAssets = await request(app).get("/store/office/assets").set("Authorization", bearer(seed.tenantB.id)).expect(200);
    expect(otherAssets.body.rows).toEqual([]);

    const board = await request(app).get("/store/grn").set("Authorization", token).expect(200);
    await request(app)
      .post("/store/grn")
      .set("Authorization", token)
      .send({
        grnNumber: board.body.nextGrnNumber || "9002",
        dateReceived: "2026-10-17",
        department: "Store",
        supplierId: null,
        itemId: projectorId,
        quantityReceived: 2,
        unitPrice: 10,
      })
      .expect(201);

    await request(app)
      .post("/store/office/disposals")
      .set("Authorization", token)
      .send({ itemId: projectorId, assetId: null, quantity: 1, kind: "damage", note: "Broken lamp" })
      .expect(201);

    const items = await request(app).get("/store/items").set("Authorization", token).expect(200);
    const projector = items.body.rows.find((row: { id: number; currentStock: number }) => row.id === projectorId);
    expect(projector.currentStock).toBe(1);
    const hidden = await request(app).get("/store/office/disposals").set("Authorization", bearer(seed.tenantB.id)).expect(200);
    expect(hidden.body.rows).toEqual([]);

    const loan = await request(app)
      .post("/store/office/loans")
      .set("Authorization", token)
      .send({ assetId, borrowerName: "Abebe", purpose: "Class", dueOn: "2026-10-01" })
      .expect(201);
    loanId = loan.body.id as number;
    const loans = await request(app).get("/store/office/loans").set("Authorization", token).expect(200);
    expect(loans.body.rows.find((row: { id: number }) => row.id === loanId).overdue).toBe(true);
    const otherLoans = await request(app).get("/store/office/loans").set("Authorization", bearer(seed.tenantB.id)).expect(200);
    expect(otherLoans.body.rows).toEqual([]);
    await request(app)
      .post(`/store/office/loans/${loanId}/return`)
      .set("Authorization", bearer(seed.tenantB.id))
      .expect(404);
    await request(app).post(`/store/office/loans/${loanId}/return`).set("Authorization", token).expect(200);
  });

  it("forecasts from issues and keeps the report inside the school", async () => {
    const forecast = await request(app).get("/store/office/forecast").set("Authorization", bearer(seed.tenantA.id)).expect(200);
    const projector = forecast.body.rows.find((row: { id: number }) => row.id === projectorId);
    expect(projector.issued).toBe(1);
    expect(projector.daysLeft).toBe(90);
    expect(forecast.body.windowDays).toBe(90);

    const own = await request(app).get("/store/office/reports").set("Authorization", bearer(seed.tenantA.id)).expect(200);
    expect(own.body.skus).toBeGreaterThan(0);
    expect(own.body.audit.some((row: { actionType: string }) => row.actionType === "store.route")).toBe(true);
    expect(own.body.disposals).toBe(1);

    const other = await request(app).get("/store/office/reports").set("Authorization", bearer(seed.tenantB.id)).expect(200);
    expect(other.body.skus).toBe(0);
    expect(other.body.audit).toEqual([]);
    expect(other.body.disposals).toBe(0);
  });
});

import { eq } from "drizzle-orm";
import request from "supertest";
import { beforeAll, describe, expect, it } from "vitest";
import { db } from "../../db/index.js";
import { items, tcRequisitions } from "../../db/schema/index.js";
import { createAccessToken } from "../../lib/jwt.js";
import type { Role } from "../../lib/roles.js";
import { scoped, withTenant } from "../../lib/tenant.js";
import { createTestApp } from "../../test/createTestApp.js";
import { seedTwoTenants, type IsolationSeed } from "../../test/seed.js";

const app = createTestApp();

function bearer(tenantId: number, role: Role, userId: number): string {
  return `Bearer ${createAccessToken({ userId, tenantId, role })}`;
}

describe("procurement office", () => {
  let seed: IsolationSeed;
  let paperId = 0;
  let requestId = 0;
  let vendorId = 0;
  let cheapId = 0;
  let budgetId = 0;
  let tenderId = 0;
  let vendorPassword = "";

  beforeAll(async () => {
    seed = await seedTwoTenants();
  });

  function buyer(tenant = seed.tenantA.id, userId = seed.tenantA.userId) {
    return bearer(tenant, "Procurement", userId);
  }

  async function addItem(token: string, code: string, name: string): Promise<number> {
    const category = await request(app)
      .post("/store/categories")
      .set("Authorization", token)
      .send({ categoryCode: code.slice(0, 8), categoryName: name, description: "" })
      .expect(201);
    const created = await request(app)
      .post("/store/items")
      .set("Authorization", token)
      .send({
        itemName: name,
        categoryId: category.body.id,
        itemCode: code,
        modelNo: "",
        unitOfMeasure: "Pcs",
        unitCost: 10,
        reorderLevel: 5,
        storeNo: "Store A",
        shelfNo: "Shelf 1",
        isPerishable: false,
        expiryDate: null,
        specification: "",
        itemType: "consumable",
      })
      .expect(201);
    return created.body.id as number;
  }

  it("keeps vendors inside the procurement role and the school", async () => {
    const token = buyer();
    await request(app).get("/procurement/desk").set("Authorization", bearer(seed.tenantA.id, "Teacher", seed.tenantA.userId)).expect(403);
    const created = await request(app)
      .post("/procurement/vendors")
      .set("Authorization", token)
      .send({
        supplierName: "Abay Supplies",
        contactName: "Hanna",
        phone: "0911000000",
        email: "abay@example.com",
        licenseNo: "LIC-1",
        licenseExpires: "2026-12-31",
      })
      .expect(201);
    vendorId = created.body.id as number;
    vendorPassword = created.body.password as string;
    expect(created.body.username).toMatch(/^abaysupplies/);
    const hidden = await request(app).get("/procurement/vendors").set("Authorization", buyer(seed.tenantB.id, seed.tenantB.userId)).expect(200);
    expect(hidden.body.rows).toEqual([]);
    const duplicate = await request(app)
      .post("/procurement/vendors")
      .set("Authorization", token)
      .send({
        supplierName: "Abay Supplies",
        contactName: "",
        phone: "",
        email: "",
        licenseNo: "",
        licenseExpires: "2026-12-31",
      });
    expect(duplicate.status).toBe(409);
    expect(duplicate.body.code).toBe("DUPLICATE_NAME");
  });

  it("verifies stock, refuses an over-budget line, and closes the delivery", async () => {
    const store = bearer(seed.tenantA.id, "Store_Keeper", seed.tenantA.userId);
    const token = buyer();
    paperId = await addItem(store, "PAPER-1", "Paper");
    const routed = await request(app)
      .post("/store/office/procurement")
      .set("Authorization", store)
      .send({ itemId: paperId, quantity: 4, note: "low" })
      .expect(201);
    requestId = routed.body.id as number;
    await db.update(items).set({ currentStock: "20.00" }).where(scoped(items, seed.tenantA.id, eq(items.itemId, paperId)));
    const covered = await request(app)
      .post("/procurement/requisitions/check")
      .set("Authorization", token)
      .send({ sourceKind: "store", sourceId: requestId });
    expect(covered.status).toBe(409);
    expect(covered.body.code).toBe("STOCK_ADEQUATE");
    await db.update(items).set({ currentStock: "0.00" }).where(scoped(items, seed.tenantA.id, eq(items.itemId, paperId)));
    await request(app)
      .post("/procurement/requisitions/check")
      .set("Authorization", token)
      .send({ sourceKind: "store", sourceId: requestId })
      .expect(201);

    const chalk = await addItem(store, "CHALK-1", "Chalk");
    await db.update(items).set({ currentStock: "10.00" }).where(scoped(items, seed.tenantA.id, eq(items.itemId, chalk)));
    const teacher = await db.insert(tcRequisitions).values(
      withTenant(
        { staffId: seed.tenantA.userId, department: "Science", itemName: "Chalk", quantity: 2, purpose: "Class", status: "Sent" },
        seed.tenantA.id,
      ),
    );
    const teacherId = Number(teacher[0].insertId);
    const teacherCovered = await request(app)
      .post("/procurement/requisitions/check")
      .set("Authorization", token)
      .send({ sourceKind: "teacher", sourceId: teacherId });
    expect(teacherCovered.status).toBe(409);
    expect(teacherCovered.body.code).toBe("STOCK_COVERED");

    const budget = await request(app)
      .post("/procurement/budgets")
      .set("Authorization", token)
      .send({ fiscalYear: "2018", code: "BUY", title: "Purchases", allocated: 500 })
      .expect(201);
    budgetId = budget.body.id as number;
    const over = await request(app).post("/procurement/approvals").set("Authorization", token).send({
      sourceKind: "store",
      sourceId: requestId,
      budgetId,
      quantity: 4,
      unitPrice: 200,
      decision: "Approved",
      note: "",
    });
    expect(over.status).toBe(409);
    expect(over.body.code).toBe("OVER_BUDGET");
    await request(app)
      .post("/procurement/approvals")
      .set("Authorization", token)
      .send({
        sourceKind: "store",
        sourceId: requestId,
        budgetId,
        quantity: 4,
        unitPrice: 50,
        decision: "Approved",
        note: "within budget",
      })
      .expect(201);
    const order = await request(app)
      .post("/procurement/orders")
      .set("Authorization", token)
      .send({ sourceKind: "store", sourceId: requestId, vendorId })
      .expect(201);
    const tooMuch = await request(app).post(`/procurement/orders/${order.body.id}/receive`).set("Authorization", token).send({ quantity: 5 });
    expect(tooMuch.status).toBe(409);
    expect(tooMuch.body.code).toBe("OVER_RECEIPT");
    const delivered = await request(app)
      .post(`/procurement/orders/${order.body.id}/receive`)
      .set("Authorization", token)
      .send({ quantity: 4 })
      .expect(200);
    expect(delivered.body.status).toBe("Delivered");
    const sheet = await request(app).get(`/procurement/orders/${order.body.id}`).set("Authorization", buyer(seed.tenantB.id, seed.tenantB.userId));
    expect(sheet.status).toBe(404);
  });

  it("awards the lowest licensed bid and hides the tender from another school", async () => {
    const token = buyer();
    const cheap = await request(app)
      .post("/procurement/vendors")
      .set("Authorization", token)
      .send({
        supplierName: "Cheap Goods",
        contactName: "",
        phone: "",
        email: "",
        licenseNo: "OLD",
        licenseExpires: "2020-01-01",
      })
      .expect(201);
    cheapId = cheap.body.id as number;
    const tender = await request(app)
      .post("/procurement/tenders")
      .set("Authorization", token)
      .send({ title: "Paper tender", itemName: "Paper", quantity: 4, closesOn: "2026-12-31", budgetId })
      .expect(201);
    tenderId = tender.body.id as number;
    const other = await request(app).get("/public/tenders").query({ slug: seed.tenantB.slug }).expect(200);
    expect(other.body.rows).toEqual([]);
    const listed = await request(app).get("/public/tenders").query({ slug: seed.tenantA.slug }).expect(200);
    expect(listed.body.rows.some((row: { id: number }) => row.id === tenderId)).toBe(true);

    const vendors = await request(app).get("/procurement/vendors").set("Authorization", token).expect(200);
    const username = vendors.body.rows.find((row: { id: number }) => row.id === vendorId).username as string;
    const login = await request(app)
      .post("/vendor/login")
      .send({ tenantSlug: seed.tenantA.slug, username, password: vendorPassword })
      .expect(200);
    await request(app)
      .post("/vendor/bids")
      .set("Authorization", `Bearer ${login.body.accessToken}`)
      .send({ tenderId, amount: 120, note: "ready" })
      .expect(201);
    const again = await request(app)
      .post("/vendor/bids")
      .set("Authorization", `Bearer ${login.body.accessToken}`)
      .send({ tenderId, amount: 90, note: "" });
    expect(again.status).toBe(409);
    expect(again.body.code).toBe("ALREADY_BID");

    const cheapLogin = await request(app)
      .post("/vendor/login")
      .send({
        tenantSlug: seed.tenantA.slug,
        username: (await request(app).get("/procurement/vendors").set("Authorization", token)).body.rows.find((row: { id: number }) => row.id === cheapId).username,
        password: cheap.body.password,
      })
      .expect(200);
    const expired = await request(app)
      .post("/vendor/bids")
      .set("Authorization", `Bearer ${cheapLogin.body.accessToken}`)
      .send({ tenderId, amount: 10, note: "low" });
    expect(expired.status).toBe(409);
    expect(expired.body.code).toBe("LICENSE_EXPIRED");

    const award = await request(app).post(`/procurement/tenders/${tenderId}/award`).set("Authorization", token).expect(201);
    expect(award.body.letterNo).toBe(`AW-${String(tenderId).padStart(4, "0")}`);
    const matrix = await request(app).get(`/procurement/tenders/${tenderId}`).set("Authorization", token).expect(200);
    expect(matrix.body.rows[0].amount).toBe(120);
    const order = await request(app)
      .post("/procurement/orders")
      .set("Authorization", token)
      .send({ sourceKind: "tender", sourceId: tenderId, vendorId })
      .expect(201);
    expect(order.body.orderNo).toMatch(/^PO-/);
    const portal = await request(app).get("/vendor/desk").set("Authorization", `Bearer ${login.body.accessToken}`).expect(200);
    expect(portal.body.awards.some((row: { letterNo: string }) => row.letterNo === award.body.letterNo)).toBe(true);
    const foreign = await request(app).get("/vendor/desk").set("Authorization", bearer(seed.tenantB.id, "Procurement", seed.tenantB.userId));
    expect(foreign.status).toBe(401);
  });
});

import { eq } from "drizzle-orm";
import request from "supertest";
import { beforeAll, describe, expect, it } from "vitest";
import { db } from "../../db/index.js";
import { items, libraryBorrowing, students } from "../../db/schema/index.js";
import { createAccessToken } from "../../lib/jwt.js";
import type { Role } from "../../lib/roles.js";
import { scoped } from "../../lib/tenant.js";
import { createTestApp } from "../../test/createTestApp.js";
import { seedTwoTenants, type IsolationSeed } from "../../test/seed.js";

const app = createTestApp();

function bearer(tenantId: number, role: Role, userId: number): string {
  return `Bearer ${createAccessToken({ userId, tenantId, role })}`;
}

describe("library office", () => {
  let seed: IsolationSeed;
  let physicsId = 0;
  let poemId = 0;
  let loanId = 0;

  beforeAll(async () => {
    seed = await seedTwoTenants();
    await db
      .update(students)
      .set({ userId: seed.tenantA.userId })
      .where(scoped(students, seed.tenantA.id, eq(students.studentId, seed.tenantA.studentId)));
  });

  function librarian(tenant = seed.tenantA.id, userId = seed.tenantA.userId) {
    return bearer(tenant, "Librarian", userId);
  }

  async function addBook(token: string, accession: string, quantity: number): Promise<number> {
    const created = await request(app)
      .post("/library/catalog")
      .set("Authorization", token)
      .send({
        bookName: accession,
        author: "School",
        publishedYear: "2018",
        pageCount: 120,
        accessionNumber: accession,
        gradeLevel: 9,
        subjectId: seed.tenantA.subjectId,
        quantity,
        remarks: "",
      })
      .expect(201);
    return created.body.id as number;
  }

  it("keeps the office inside the librarian role and the school", async () => {
    const token = librarian();
    await request(app).get("/library/desk").set("Authorization", bearer(seed.tenantA.id, "Teacher", seed.tenantA.userId)).expect(403);
    await request(app).get("/library/desk").set("Authorization", bearer(seed.tenantA.id, "Student", seed.tenantA.userId)).expect(403);
    physicsId = await addBook(token, "PHY-1", 1);
    poemId = await addBook(token, "POEM-1", 1);
    const other = await request(app).get("/library/catalog").set("Authorization", librarian(seed.tenantB.id, seed.tenantB.userId)).expect(200);
    expect(other.body.rows).toEqual([]);
    const duplicate = await request(app)
      .post("/library/catalog")
      .set("Authorization", token)
      .send({
        bookName: "Again",
        author: "",
        publishedYear: "",
        pageCount: null,
        accessionNumber: "PHY-1",
        gradeLevel: null,
        subjectId: null,
        quantity: 1,
        remarks: "",
      });
    expect(duplicate.status).toBe(409);
    expect(duplicate.body.code).toBe("DUPLICATE_CODE");
  });

  it("lends a copy, reminds when it is overdue, and refuses another loan", async () => {
    const token = librarian();
    const early = await request(app).post("/library/opac").set("Authorization", bearer(seed.tenantA.id, "Student", seed.tenantA.userId)).send({ bookId: physicsId });
    expect(early.status).toBe(409);
    expect(early.body.code).toBe("COPIES_FREE");
    const loan = await request(app)
      .post("/library/circulation")
      .set("Authorization", token)
      .send({ bookId: physicsId, userId: seed.tenantA.userId })
      .expect(201);
    loanId = loan.body.id as number;
    await db
      .update(libraryBorrowing)
      .set({ returnDate: "2000-01-01" })
      .where(scoped(libraryBorrowing, seed.tenantA.id, eq(libraryBorrowing.borrowId, loanId)));
    const reminders = await request(app).get("/library/reminders").set("Authorization", token).expect(200);
    expect(reminders.body.rows.some((row: { kind: string; title: string }) => row.kind === "overdue" && row.title === "PHY-1")).toBe(true);
    const blocked = await request(app)
      .post("/library/circulation")
      .set("Authorization", token)
      .send({ bookId: poemId, userId: seed.tenantA.userId });
    expect(blocked.status).toBe(409);
    expect(blocked.body.code).toBe("OVERDUE");
    const hidden = await request(app)
      .get("/library/opac")
      .query({ q: "PHY-1" })
      .set("Authorization", bearer(seed.tenantB.id, "Student", seed.tenantB.userId))
      .expect(200);
    expect(hidden.body.rows).toEqual([]);
  });

  it("blocks clearance while a book is out, then clears it after the return", async () => {
    const token = librarian();
    const principal = bearer(seed.tenantA.id, "Principal", seed.tenantA.userId);
    const transfer = await request(app)
      .post("/principal/transfers")
      .set("Authorization", principal)
      .send({ studentId: seed.tenantA.studentId, destination: "Another school", reason: "Family move" })
      .expect(201);
    const held = await request(app).post(`/library/clearance/${transfer.body.id}`).set("Authorization", token);
    expect(held.status).toBe(409);
    expect(held.body.code).toBe("BOOKS_OUT");
    const forced = await request(app)
      .post(`/principal/transfers/${transfer.body.id}/clearance`)
      .set("Authorization", principal)
      .send({ libraryClear: true, storeClear: true, financeClear: true });
    expect(forced.status).toBe(409);
    expect(forced.body.code).toBe("BOOKS_OUT");
    await request(app).post(`/library/circulation/${loanId}/return`).set("Authorization", token).expect(200);
    await request(app).post(`/library/clearance/${transfer.body.id}`).set("Authorization", token).expect(200);
    const foreign = await request(app)
      .post(`/library/clearance/${transfer.body.id}`)
      .set("Authorization", librarian(seed.tenantB.id, seed.tenantB.userId));
    expect(foreign.status).toBe(404);
  });

  it("takes copies from the store and lets a patron reserve only when the shelf is empty", async () => {
    const token = librarian();
    const store = bearer(seed.tenantA.id, "Store_Keeper", seed.tenantA.userId);
    const category = await request(app)
      .post("/store/categories")
      .set("Authorization", store)
      .send({ categoryCode: "LIB", categoryName: "Books", description: "" })
      .expect(201);
    const item = await request(app)
      .post("/store/items")
      .set("Authorization", store)
      .send({
        itemName: "Atlas",
        categoryId: category.body.id,
        itemCode: "ATLAS-1",
        modelNo: "",
        unitOfMeasure: "Pcs",
        unitCost: 10,
        reorderLevel: 1,
        storeNo: "Store A",
        shelfNo: "Shelf 1",
        isPerishable: false,
        expiryDate: null,
        specification: "",
        itemType: "consumable",
      })
      .expect(201);
    await db.update(items).set({ currentStock: "2.00" }).where(scoped(items, seed.tenantA.id, eq(items.itemId, item.body.id)));
    const short = await request(app).post("/library/intake").set("Authorization", token).send({ itemId: item.body.id, copies: 3 });
    expect(short.status).toBe(409);
    expect(short.body.code).toBe("INSUFFICIENT_STOCK");
    await request(app).post("/library/intake").set("Authorization", token).send({ itemId: item.body.id, copies: 2 }).expect(201);
    const found = await request(app).get("/library/catalog").query({ q: "ATLAS-1" }).set("Authorization", token).expect(200);
    expect(found.body.rows.some((row: { accession: string; quantity: number }) => row.accession === "ATLAS-1" && row.quantity === 2)).toBe(true);
    await request(app)
      .post("/library/circulation")
      .set("Authorization", token)
      .send({ bookId: physicsId, userId: seed.tenantA.userId })
      .expect(201);
    const reserved = await request(app)
      .post("/library/opac")
      .set("Authorization", bearer(seed.tenantA.id, "Student", seed.tenantA.userId))
      .send({ bookId: physicsId })
      .expect(201);
    expect(reserved.body.id).toBeGreaterThan(0);
    const entered = await request(app)
      .post("/library/patrons")
      .set("Authorization", token)
      .send({ userId: seed.tenantA.userId, action: "In", bookTitle: "PHY-1" })
      .expect(201);
    expect(entered.body.id).toBeGreaterThan(0);
    const again = await request(app)
      .post("/library/patrons")
      .set("Authorization", token)
      .send({ userId: seed.tenantA.userId, action: "In", bookTitle: "" });
    expect(again.status).toBe(409);
    expect(again.body.code).toBe("ALREADY_INSIDE");
  });
});

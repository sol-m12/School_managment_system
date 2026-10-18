import request from "supertest";
import { beforeAll, describe, expect, it } from "vitest";
import { createAccessToken } from "../../lib/jwt.js";
import type { Role } from "../../lib/roles.js";
import { createTestApp } from "../../test/createTestApp.js";
import { seedTwoTenants, type IsolationSeed } from "../../test/seed.js";

const app = createTestApp();

function bearer(tenantId: number, role: Role = "Store_Keeper", userId = 1): string {
  return `Bearer ${createAccessToken({ userId, tenantId, role })}`;
}

describe("store finance API", () => {
  let seed: IsolationSeed;
  let publicBodyId = 0;
  let programId = 0;
  let accountId = 0;
  let budgetTypeId = 0;
  let sourceId = 0;

  beforeAll(async () => {
    seed = await seedTwoTenants();
    publicBodyId = await addCode(seed.tenantA.id, "Public Body", "013", "ቀይት ት/ቤት");
    programId = await addCode(seed.tenantA.id, "Program", "000", "ትምህርት");
    accountId = await addCode(seed.tenantA.id, "Account", "6111", "ጉልበት");
    budgetTypeId = await addCode(seed.tenantA.id, "Budget Type", "101", "መደበኛ በጀት");
    sourceId = await addCode(seed.tenantA.id, "Source", "01", "ሰሜን ሸዋ");
  });

  it("rejects a teacher", async () => {
    await request(app).get("/store/finance/cards").set("Authorization", bearer(seed.tenantA.id, "Teacher")).expect(403);
  });

  it("keeps a Mehi 16 card inside the school that saved the budget", async () => {
    await request(app)
      .post("/store/finance/budget")
      .set("Authorization", bearer(seed.tenantA.id))
      .send(budgetBody(0))
      .expect(400);

    const saved = await request(app)
      .post("/store/finance/budget")
      .set("Authorization", bearer(seed.tenantA.id))
      .send(budgetBody(1000))
      .expect(201);
    expect(saved.body.cardsOpened).toBe(1);

    const own = await request(app).get("/store/finance/cards").set("Authorization", bearer(seed.tenantA.id)).expect(200);
    expect(own.body.cards).toHaveLength(1);
    expect(own.body.totals.approved).toBe(1000);
    const cardId = own.body.cards[0].id as number;

    const other = await request(app).get("/store/finance/cards").set("Authorization", bearer(seed.tenantB.id)).expect(200);
    expect(other.body.cards).toEqual([]);

    await request(app).get(`/store/finance/cards/${cardId}`).set("Authorization", bearer(seed.tenantB.id)).expect(404);
    const detail = await request(app).get(`/store/finance/cards/${cardId}`).set("Authorization", bearer(seed.tenantA.id)).expect(200);
    expect(detail.body.lines[0].balance).toBe(1000);

    const lookups = await request(app)
      .get("/store/finance/lookups")
      .query({ page: "ledger" })
      .set("Authorization", bearer(seed.tenantA.id))
      .expect(200);
    expect(lookups.body.programs.some((code: { id: number }) => code.id === programId)).toBe(true);
    expect(lookups.body.budgetTypes.some((code: { id: number }) => code.id === budgetTypeId)).toBe(true);
    expect(lookups.body.sources.some((code: { id: number }) => code.id === sourceId)).toBe(true);
    expect(lookups.body.years).toContain("2018");

    const hiddenLookups = await request(app)
      .get("/store/finance/lookups")
      .query({ page: "ledger" })
      .set("Authorization", bearer(seed.tenantB.id))
      .expect(200);
    expect(hiddenLookups.body.programs).toEqual([]);
    expect(hiddenLookups.body.years).toEqual([]);
  });

  it("keeps a Mehi 17 card and a Mehi 7 payment inside that school", async () => {
    const opened = await request(app)
      .post("/store/finance/mehi17")
      .set("Authorization", bearer(seed.tenantA.id))
      .send({
        fiscalYear: "2018",
        publicBodyCodeId: publicBodyId,
        programCodeId: programId,
        sourceCodeId: sourceId,
        budgetTypeId,
        accountCodeId: accountId,
        accountName: "ባንክ",
        bankAccountNo: "100000023456789",
        openingBalance: 500,
        description: "የበጀት ዓመቱ መነሻ ቀሪ ሂሳብ",
        registerMonth: "ሐምሌ",
      })
      .expect(201);

    const own = await request(app).get("/store/finance/mehi17").set("Authorization", bearer(seed.tenantA.id)).expect(200);
    expect(own.body.cards.some((card: { id: number }) => card.id === opened.body.id)).toBe(true);
    const other = await request(app).get("/store/finance/mehi17").set("Authorization", bearer(seed.tenantB.id)).expect(200);
    expect(other.body.cards).toEqual([]);

    const cards = await request(app).get("/store/finance/cards").set("Authorization", bearer(seed.tenantA.id)).expect(200);
    const cardId = cards.body.cards[0].id as number;

    await request(app)
      .post("/store/finance/mehi7")
      .set("Authorization", bearer(seed.tenantA.id))
      .send({
        serialNo: "244708",
        voucherDate: "2018-08-03",
        payeeName: "የጉልበት ስራ",
        modeOfPayment: "Check",
        checkNo: "CHK-1",
        purpose: "የጉልበት ስራ",
        publicBodyCodeId: publicBodyId,
        programCodeId: programId,
        lines: [
          {
            entryType: "debit",
            accountCodeId: accountId,
            budgetCategoryId: budgetTypeId,
            budgetSourceId: sourceId,
            debitAmount: 200,
            creditAmount: 0,
          },
          {
            entryType: "credit",
            m17CardId: opened.body.id,
            budgetCategoryId: budgetTypeId,
            budgetSourceId: sourceId,
            debitAmount: 0,
            creditAmount: 200,
          },
        ],
      })
      .expect(201);

    const detail = await request(app).get(`/store/finance/cards/${cardId}`).set("Authorization", bearer(seed.tenantA.id)).expect(200);
    expect(detail.body.lines.at(-1).balance).toBe(800);
    await request(app).delete(`/store/finance/cards/${cardId}`).set("Authorization", bearer(seed.tenantA.id)).expect(409);

    const hidden = await request(app)
      .get("/store/finance/mehi17/find")
      .query({ fiscalYear: "2018", sourceCodeId: sourceId, accountType: "Bank" })
      .set("Authorization", bearer(seed.tenantB.id))
      .expect(200);
    expect(hidden.body.found).toBe(false);
  });

  async function addCode(tenantId: number, typeName: string, codeNumber: string, codeNameAm: string): Promise<number> {
    const created = await request(app)
      .post("/store/finance/codes")
      .set("Authorization", bearer(tenantId))
      .send({ typeName, codeNumber, codeNameAm, match: "exact" })
      .expect(201);
    return created.body.id as number;
  }

  function budgetBody(amount: number) {
    return {
      fiscalYear: "2018",
      letterRefNo: "ዘበ/117/01/2018",
      notificationDate: "2018-07-08",
      publicBodyCodeId: publicBodyId,
      programCodeId: programId,
      sourceCodeId: sourceId,
      budgetTypeId,
      lines: [{ accountCodeId: accountId, treasuryAmount: amount, retainedAmount: 0, assistanceAmount: 0, loanAmount: 0 }],
    };
  }
});

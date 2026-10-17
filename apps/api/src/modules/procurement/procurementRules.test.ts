import { describe, expect, it } from "vitest";
import { fitsBudget, licenseCurrent, nextReceipt, rankBids, storeNeedsBuy, teacherNeedsBuy, winningBid } from "./procurementRules.js";

describe("procurement rules", () => {
  it("buys only when the store is at the reorder level", () => {
    expect(storeNeedsBuy(5, 5)).toBe(true);
    expect(storeNeedsBuy(6, 5)).toBe(false);
    expect(teacherNeedsBuy(3, 4)).toBe(true);
    expect(teacherNeedsBuy(4, 4)).toBe(false);
  });

  it("keeps a license current through its expiry date", () => {
    expect(licenseCurrent("2018-10-17", "2018-10-17")).toBe(true);
    expect(licenseCurrent("2018-10-16", "2018-10-17")).toBe(false);
    expect(licenseCurrent(null, "2018-10-17")).toBe(false);
  });

  it("refuses a line that passes the remaining budget", () => {
    expect(fitsBudget(1000, 800, 200)).toBe(true);
    expect(fitsBudget(1000, 800, 200.01)).toBe(false);
  });

  it("awards the lowest valid bid and stops a delivery past the order", () => {
    const ranked = rankBids([
      { id: 2, vendorId: 2, amount: 90, createdAt: "2018-01-02", valid: false },
      { id: 1, vendorId: 1, amount: 100, createdAt: "2018-01-01", valid: true },
      { id: 3, vendorId: 3, amount: 100, createdAt: "2018-01-03", valid: true },
    ]);
    expect(ranked.map((row) => row.id)).toEqual([2, 1, 3]);
    expect(winningBid(ranked)?.id).toBe(1);
    expect(nextReceipt(10, 4, 6)).toEqual({ received: 10, status: "Delivered" });
    expect(nextReceipt(10, 4, 7)).toBe("over");
  });
});

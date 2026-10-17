import { describe, expect, it } from "vitest";
import {
  canRoute,
  daysUntilStockout,
  forecastAlert,
  isOverdue,
  suggestedOrder,
} from "./storeRules.js";

describe("store office rules", () => {
  it("routes a purchase only when stock is at or under the reorder level", () => {
    expect(canRoute(0, 5)).toBe(true);
    expect(canRoute(5, 5)).toBe(true);
    expect(canRoute(6, 5)).toBe(false);
  });

  it("asks for the gap, or one unit when stock already equals the reorder level", () => {
    expect(suggestedOrder(0, 5)).toBe(5);
    expect(suggestedOrder(3, 5)).toBe(2);
    expect(suggestedOrder(5, 5)).toBe(1);
  });

  it("estimates days of stock from issues in the window", () => {
    expect(daysUntilStockout(10, 0, 90)).toBeNull();
    expect(daysUntilStockout(10, 90, 90)).toBe(10);
    expect(daysUntilStockout(0, 90, 90)).toBe(0);
    expect(forecastAlert(10)).toBe(true);
    expect(forecastAlert(31)).toBe(false);
    expect(forecastAlert(null)).toBe(false);
  });

  it("marks a loan overdue only while it is still out", () => {
    expect(isOverdue("2026-01-01", "2026-01-02", "Out")).toBe(true);
    expect(isOverdue("2026-01-03", "2026-01-02", "Out")).toBe(false);
    expect(isOverdue("2026-01-01", "2026-01-02", "Returned")).toBe(false);
  });
});

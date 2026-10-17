/** Stock rules for the store office. The forecast is a rate from recent issues. It is not a trained model. */

export const FORECAST_DAYS = 90;
export const FORECAST_HORIZON = 30;

export function canRoute(stock: number, reorder: number): boolean {
  return stock <= reorder;
}

/** Quantity to ask for when stock is at or under the reorder level. */
export function suggestedOrder(stock: number, reorder: number): number {
  const gap = reorder - stock;
  return gap > 0 ? gap : 1;
}

/** Whole days of stock left at the recent daily issue rate. Null when nothing was issued. */
export function daysUntilStockout(stock: number, issued: number, windowDays: number): number | null {
  if (issued <= 0 || windowDays <= 0) return null;
  const daily = issued / windowDays;
  if (daily <= 0) return null;
  return Math.floor(stock / daily);
}

export function forecastAlert(daysLeft: number | null, horizon = FORECAST_HORIZON): boolean {
  return daysLeft !== null && daysLeft <= horizon;
}

export function isOverdue(dueOn: string, today: string, status: "Out" | "Returned"): boolean {
  return status === "Out" && dueOn < today;
}

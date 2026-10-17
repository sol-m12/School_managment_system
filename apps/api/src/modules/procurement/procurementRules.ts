export function cents(value: number): number {
  return Math.round(value * 100);
}

export function licenseCurrent(expires: string | null, today: string): boolean {
  return Boolean(expires && expires >= today);
}

/** A store request is still a purchase only while stock is at or under the reorder level. */
export function storeNeedsBuy(stock: number, reorder: number): boolean {
  return stock <= reorder;
}

/** A teacher request is covered when the store already holds the full quantity. */
export function teacherNeedsBuy(stock: number, quantity: number): boolean {
  return stock < quantity;
}

export function lineTotal(quantity: number, unitPrice: number): number {
  return cents(quantity * unitPrice) / 100;
}

export function fitsBudget(allocated: number, committed: number, line: number): boolean {
  return cents(committed) + cents(line) <= cents(allocated);
}

export function nextReceipt(
  ordered: number,
  received: number,
  add: number,
): { received: number; status: "Partial" | "Delivered" } | "over" {
  if (add <= 0) return "over";
  const next = cents(received) + cents(add);
  const cap = cents(ordered);
  if (next > cap) return "over";
  return { received: next / 100, status: next === cap ? "Delivered" : "Partial" };
}

export type RankedBid = {
  id: number;
  vendorId: number;
  amount: number;
  createdAt: string;
  valid: boolean;
};

/** Lowest amount first. An earlier bid wins a tie. Only a valid license can be awarded. */
export function rankBids<T extends RankedBid>(bids: T[]): Array<T & { rank: number }> {
  const ordered = [...bids].sort(
    (a, b) => a.amount - b.amount || a.createdAt.localeCompare(b.createdAt) || a.id - b.id,
  );
  return ordered.map((bid, index) => ({ ...bid, rank: index + 1 }));
}

export function winningBid<T extends RankedBid>(bids: T[]): (T & { rank: number }) | null {
  return rankBids(bids).find((bid) => bid.valid) ?? null;
}

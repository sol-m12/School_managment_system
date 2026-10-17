import { and, asc, desc, eq, sql } from "drizzle-orm";
import QRCode from "qrcode";
import { db } from "../../db/index.js";
import {
  auditLog,
  binCardLedger,
  itemCategories,
  items,
  skAlerts,
  skAssets,
  skDisposals,
  skLoans,
  skPurchaseRequests,
} from "../../db/schema/index.js";
import { scoped, withTenant } from "../../lib/tenant.js";
import {
  FORECAST_DAYS,
  FORECAST_HORIZON,
  canRoute,
  daysUntilStockout,
  forecastAlert,
  isOverdue,
  suggestedOrder,
} from "./storeRules.js";

export type OfficeErrorCode =
  | "NOT_FOUND"
  | "STOCK_ADEQUATE"
  | "ALREADY_ROUTED"
  | "NOT_FIXED"
  | "INSUFFICIENT_STOCK"
  | "NOT_READY";

export class OfficeError extends Error {
  readonly code: OfficeErrorCode;

  constructor(code: OfficeErrorCode) {
    super(code);
    this.code = code;
  }
}

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];
type StockStatus = "critical" | "low" | "adequate";

type CatalogItem = {
  id: number;
  code: string;
  name: string;
  stock: number;
  reorder: number;
  unitCost: number;
  storeNo: string;
  shelfNo: string;
  unit: string;
  itemType: string;
  categoryName: string;
};

function num(value: string | number | null | undefined): number {
  return Number(value ?? 0);
}

function money(value: number): string {
  return value.toFixed(2);
}

function schoolDate(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Addis_Ababa" }).format(new Date());
}

function addisNow(): string {
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Africa/Addis_Ababa",
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(new Date());
}

function daysAgo(days: number): string {
  const [year, month, day] = schoolDate().split("-").map(Number);
  const date = new Date(Date.UTC(year ?? 1970, (month ?? 1) - 1, day ?? 1));
  date.setUTCDate(date.getUTCDate() - days);
  return date.toISOString().slice(0, 10);
}

function stockStatus(stock: number, reorder: number): StockStatus {
  if (stock === 0) return "critical";
  if (stock <= reorder) return "low";
  return "adequate";
}

function insertId(result: unknown): number {
  if (!Array.isArray(result)) return 0;
  const header = result[0] as { insertId?: number } | undefined;
  return Number(header?.insertId ?? 0);
}

function isDuplicate(error: unknown): boolean {
  const seen = new Set<unknown>();
  let current: unknown = error;
  while (current && typeof current === "object" && !seen.has(current)) {
    seen.add(current);
    const record = current as { code?: unknown; errno?: unknown; cause?: unknown };
    if (record.code === "ER_DUP_ENTRY" || record.errno === 1062) return true;
    current = record.cause;
  }
  return false;
}

function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, (char) => `\\${char}`);
}

async function writeAudit(tenantId: number, userId: number, actionType: string, description: string): Promise<void> {
  await db.insert(auditLog).values(withTenant({ userId, actionType, description, timestamp: addisNow() }, tenantId));
}

async function catalog(tenantId: number): Promise<CatalogItem[]> {
  const rows = await db
    .select({
      id: items.itemId,
      code: items.itemCode,
      name: items.itemName,
      stock: items.currentStock,
      reorder: items.reorderLevel,
      unitCost: items.unitCost,
      storeNo: items.defaultStoreNo,
      shelfNo: items.defaultShelfNo,
      unit: items.unitOfMeasure,
      itemType: items.itemType,
      categoryName: itemCategories.categoryName,
    })
    .from(items)
    .leftJoin(itemCategories, and(eq(itemCategories.categoryId, items.categoryId), eq(itemCategories.tenantId, tenantId)))
    .where(scoped(items, tenantId))
    .orderBy(asc(items.itemName));

  return rows.map((row) => ({
    id: row.id,
    code: row.code,
    name: row.name,
    stock: num(row.stock),
    reorder: row.reorder,
    unitCost: num(row.unitCost),
    storeNo: row.storeNo ?? "",
    shelfNo: row.shelfNo ?? "",
    unit: row.unit,
    itemType: row.itemType ?? "consumable",
    categoryName: row.categoryName ?? "",
  }));
}

async function itemOf(tenantId: number, itemId: number): Promise<CatalogItem> {
  const [row] = (await catalog(tenantId)).filter((item) => item.id === itemId);
  if (!row) throw new OfficeError("NOT_FOUND");
  return row;
}

async function issuedMap(tenantId: number): Promise<Map<number, number>> {
  const since = daysAgo(FORECAST_DAYS);
  const rows = await db
    .select({
      itemId: binCardLedger.itemId,
      issued: sql<string>`COALESCE(SUM(${binCardLedger.issuedQty}), 0)`,
    })
    .from(binCardLedger)
    .where(scoped(binCardLedger, tenantId, sql`${binCardLedger.transactionDate} >= ${since}`))
    .groupBy(binCardLedger.itemId);
  return new Map(rows.map((row) => [row.itemId, num(row.issued)]));
}

async function latestBalance(tx: Tx, tenantId: number, itemId: number): Promise<number> {
  const [row] = await tx
    .select({ balanceQty: binCardLedger.balanceQty })
    .from(binCardLedger)
    .where(scoped(binCardLedger, tenantId, eq(binCardLedger.itemId, itemId)))
    .orderBy(desc(binCardLedger.ledgerId))
    .limit(1);
  return num(row?.balanceQty);
}

async function syncAlerts(tenantId: number): Promise<void> {
  const rows = await catalog(tenantId);
  const issued = await issuedMap(tenantId);
  const open = await db
    .select({ id: skAlerts.alertId, itemId: skAlerts.itemId, kind: skAlerts.kind })
    .from(skAlerts)
    .where(scoped(skAlerts, tenantId, eq(skAlerts.status, "Open")));

  const wanted = new Map<string, { itemId: number; kind: "reorder" | "forecast"; stock: number; reorder: number }>();
  for (const item of rows) {
    if (item.stock <= item.reorder) {
      wanted.set(`${item.id}:reorder`, { itemId: item.id, kind: "reorder", stock: item.stock, reorder: item.reorder });
    }
    const days = daysUntilStockout(item.stock, issued.get(item.id) ?? 0, FORECAST_DAYS);
    if (forecastAlert(days)) {
      wanted.set(`${item.id}:forecast`, { itemId: item.id, kind: "forecast", stock: item.stock, reorder: item.reorder });
    }
  }

  for (const row of open) {
    const key = `${row.itemId}:${row.kind}`;
    if (!wanted.has(key)) {
      await db.update(skAlerts).set({ status: "Seen" }).where(scoped(skAlerts, tenantId, eq(skAlerts.alertId, row.id)));
    } else {
      wanted.delete(key);
    }
  }

  for (const row of wanted.values()) {
    await db.insert(skAlerts).values(
      withTenant(
        {
          itemId: row.itemId,
          kind: row.kind,
          stock: money(row.stock),
          reorderLevel: row.reorder,
          status: "Open",
        },
        tenantId,
      ),
    );
  }
}

export async function procurementBoard(tenantId: number) {
  const rows = await catalog(tenantId);
  const routed = await db
    .select({ itemId: skPurchaseRequests.itemId })
    .from(skPurchaseRequests)
    .where(scoped(skPurchaseRequests, tenantId));
  const routedIds = new Set(routed.map((row) => row.itemId));
  const requests = await db
    .select({
      id: skPurchaseRequests.requestId,
      itemId: skPurchaseRequests.itemId,
      code: items.itemCode,
      name: items.itemName,
      quantity: skPurchaseRequests.quantity,
      note: skPurchaseRequests.note,
      createdAt: skPurchaseRequests.createdAt,
    })
    .from(skPurchaseRequests)
    .innerJoin(items, and(eq(items.itemId, skPurchaseRequests.itemId), eq(items.tenantId, tenantId)))
    .where(scoped(skPurchaseRequests, tenantId))
    .orderBy(desc(skPurchaseRequests.requestId));

  return {
    low: rows
      .filter((item) => canRoute(item.stock, item.reorder))
      .map((item) => ({
        id: item.id,
        code: item.code,
        name: item.name,
        stock: item.stock,
        reorder: item.reorder,
        suggested: suggestedOrder(item.stock, item.reorder),
        routed: routedIds.has(item.id),
      })),
    requests: requests.map((row) => ({
      id: row.id,
      itemId: row.itemId,
      code: row.code,
      name: row.name,
      quantity: num(row.quantity),
      note: row.note,
      createdAt: row.createdAt,
    })),
  };
}

export async function routePurchase(
  tenantId: number,
  userId: number,
  input: { itemId: number; quantity: number; note: string },
) {
  const item = await itemOf(tenantId, input.itemId);
  if (!canRoute(item.stock, item.reorder)) throw new OfficeError("STOCK_ADEQUATE");
  const [existing] = await db
    .select({ id: skPurchaseRequests.requestId })
    .from(skPurchaseRequests)
    .where(scoped(skPurchaseRequests, tenantId, eq(skPurchaseRequests.itemId, item.id)))
    .limit(1);
  if (existing) throw new OfficeError("ALREADY_ROUTED");

  const result = await db.insert(skPurchaseRequests).values(
    withTenant(
      {
        itemId: item.id,
        quantity: money(input.quantity),
        note: input.note,
        status: "Routed",
        routedBy: userId,
      },
      tenantId,
    ),
  );
  await writeAudit(tenantId, userId, "store.route", `${item.code} ${item.name} x ${input.quantity}`);
  return { id: insertId(result) };
}

export async function searchInventory(tenantId: number, q: string) {
  const pattern = `%${escapeLike(q)}%`;
  const match = sql`(
    ${items.itemName} LIKE ${pattern} ESCAPE '\\\\'
    OR ${items.itemCode} LIKE ${pattern} ESCAPE '\\\\'
    OR ${items.defaultStoreNo} LIKE ${pattern} ESCAPE '\\\\'
    OR ${items.defaultShelfNo} LIKE ${pattern} ESCAPE '\\\\'
  )`;
  const rows = await db
    .select({
      id: items.itemId,
      code: items.itemCode,
      name: items.itemName,
      stock: items.currentStock,
      reorder: items.reorderLevel,
      storeNo: items.defaultStoreNo,
      shelfNo: items.defaultShelfNo,
      unit: items.unitOfMeasure,
    })
    .from(items)
    .where(scoped(items, tenantId, match))
    .orderBy(asc(items.itemName))
    .limit(50);

  return {
    rows: rows.map((row) => ({
      id: row.id,
      code: row.code,
      name: row.name,
      stock: num(row.stock),
      reorder: row.reorder,
      status: stockStatus(num(row.stock), row.reorder),
      storeNo: row.storeNo ?? "",
      shelfNo: row.shelfNo ?? "",
      unit: row.unit,
    })),
  };
}

export async function listAlerts(tenantId: number) {
  await syncAlerts(tenantId);
  const issued = await issuedMap(tenantId);
  const rows = await db
    .select({
      id: skAlerts.alertId,
      itemId: skAlerts.itemId,
      code: items.itemCode,
      name: items.itemName,
      kind: skAlerts.kind,
      stock: items.currentStock,
      reorder: items.reorderLevel,
    })
    .from(skAlerts)
    .innerJoin(items, and(eq(items.itemId, skAlerts.itemId), eq(items.tenantId, tenantId)))
    .where(scoped(skAlerts, tenantId, eq(skAlerts.status, "Open")))
    .orderBy(desc(skAlerts.alertId));

  return {
    rows: rows.map((row) => ({
      id: row.id,
      itemId: row.itemId,
      code: row.code,
      name: row.name,
      kind: row.kind,
      stock: num(row.stock),
      reorder: row.reorder,
      daysLeft:
        row.kind === "forecast"
          ? daysUntilStockout(num(row.stock), issued.get(row.itemId) ?? 0, FORECAST_DAYS)
          : null,
    })),
  };
}

export async function seeAlert(tenantId: number, userId: number, alertId: number) {
  const [row] = await db
    .select({ id: skAlerts.alertId })
    .from(skAlerts)
    .where(scoped(skAlerts, tenantId, and(eq(skAlerts.alertId, alertId), eq(skAlerts.status, "Open"))))
    .limit(1);
  if (!row) throw new OfficeError("NOT_FOUND");
  await db.update(skAlerts).set({ status: "Seen" }).where(scoped(skAlerts, tenantId, eq(skAlerts.alertId, alertId)));
  await writeAudit(tenantId, userId, "store.alert", `Seen ${alertId}`);
  return { id: alertId };
}

export async function routeAlert(tenantId: number, userId: number, alertId: number) {
  const [row] = await db
    .select({ id: skAlerts.alertId, itemId: skAlerts.itemId, kind: skAlerts.kind })
    .from(skAlerts)
    .where(scoped(skAlerts, tenantId, and(eq(skAlerts.alertId, alertId), eq(skAlerts.status, "Open"))))
    .limit(1);
  if (!row || row.kind !== "reorder") throw new OfficeError("NOT_FOUND");
  const item = await itemOf(tenantId, row.itemId);
  const routed = await routePurchase(tenantId, userId, {
    itemId: item.id,
    quantity: suggestedOrder(item.stock, item.reorder),
    note: "",
  });
  await db.update(skAlerts).set({ status: "Seen" }).where(scoped(skAlerts, tenantId, eq(skAlerts.alertId, alertId)));
  return routed;
}

async function nextTag(tenantId: number): Promise<string> {
  const rows = await db
    .select({ tag: skAssets.tag })
    .from(skAssets)
    .where(scoped(skAssets, tenantId));
  let max = 0;
  for (const row of rows) {
    const match = /^AST-(\d+)$/.exec(row.tag);
    if (match) max = Math.max(max, Number(match[1]));
  }
  return `AST-${String(max + 1).padStart(3, "0")}`;
}

export async function assetBoard(tenantId: number) {
  const fixed = (await catalog(tenantId)).filter((item) => item.itemType === "fixed_asset");
  const rows = await db
    .select({
      id: skAssets.assetId,
      itemId: skAssets.itemId,
      code: items.itemCode,
      name: items.itemName,
      tag: skAssets.tag,
      serialNo: skAssets.serialNo,
      location: skAssets.location,
      status: skAssets.status,
    })
    .from(skAssets)
    .innerJoin(items, and(eq(items.itemId, skAssets.itemId), eq(items.tenantId, tenantId)))
    .where(scoped(skAssets, tenantId))
    .orderBy(desc(skAssets.assetId));

  const withQr = await Promise.all(
    rows.map(async (row) => ({
      id: row.id,
      itemId: row.itemId,
      code: row.code,
      name: row.name,
      tag: row.tag,
      serialNo: row.serialNo,
      location: row.location,
      status: row.status,
      qrSvg: await QRCode.toString(row.tag, { type: "svg", margin: 1, width: 280 }),
    })),
  );

  return {
    items: fixed.map((item) => ({ id: item.id, code: item.code, name: item.name, stock: item.stock })),
    rows: withQr,
  };
}

export async function lookupAsset(tenantId: number, tag: string) {
  const normalized = tag.trim().toUpperCase();
  const [row] = await db
    .select({
      id: skAssets.assetId,
      itemId: skAssets.itemId,
      code: items.itemCode,
      name: items.itemName,
      tag: skAssets.tag,
      serialNo: skAssets.serialNo,
      location: skAssets.location,
      status: skAssets.status,
    })
    .from(skAssets)
    .innerJoin(items, and(eq(items.itemId, skAssets.itemId), eq(items.tenantId, tenantId)))
    .where(scoped(skAssets, tenantId, eq(skAssets.tag, normalized)))
    .limit(1);
  if (!row) throw new OfficeError("NOT_FOUND");

  const [loan] = await db
    .select({
      id: skLoans.loanId,
      borrowerName: skLoans.borrowerName,
      purpose: skLoans.purpose,
      dueOn: skLoans.dueOn,
      status: skLoans.status,
    })
    .from(skLoans)
    .where(scoped(skLoans, tenantId, and(eq(skLoans.assetId, row.id), eq(skLoans.status, "Out"))))
    .limit(1);

  return {
    ...row,
    qrSvg: await QRCode.toString(row.tag, { type: "svg", margin: 1, width: 280 }),
    loan: loan
      ? {
          id: loan.id,
          borrowerName: loan.borrowerName,
          purpose: loan.purpose,
          dueOn: loan.dueOn,
          overdue: isOverdue(loan.dueOn, schoolDate(), loan.status),
        }
      : null,
  };
}

export async function registerAsset(
  tenantId: number,
  userId: number,
  input: { itemId: number; serialNo: string; location: string },
) {
  const item = await itemOf(tenantId, input.itemId);
  if (item.itemType !== "fixed_asset") throw new OfficeError("NOT_FIXED");
  let tag = await nextTag(tenantId);
  let id = 0;
  for (let attempt = 0; attempt < 5; attempt += 1) {
    try {
      const result = await db.insert(skAssets).values(
        withTenant(
          {
            itemId: item.id,
            tag,
            serialNo: input.serialNo,
            location: input.location,
            status: "InStore",
          },
          tenantId,
        ),
      );
      id = insertId(result);
      break;
    } catch (error) {
      if (!isDuplicate(error) || attempt === 4) throw error;
      tag = `AST-${String(Number(tag.slice(4)) + 1).padStart(3, "0")}`;
    }
  }
  await writeAudit(tenantId, userId, "store.asset", `${tag} ${item.code}`);
  return { id, tag };
}

export async function disposalBoard(tenantId: number) {
  const stock = await catalog(tenantId);
  const assets = await db
    .select({ id: skAssets.assetId, tag: skAssets.tag, itemId: skAssets.itemId, name: items.itemName })
    .from(skAssets)
    .innerJoin(items, and(eq(items.itemId, skAssets.itemId), eq(items.tenantId, tenantId)))
    .where(scoped(skAssets, tenantId, eq(skAssets.status, "InStore")))
    .orderBy(asc(skAssets.tag));
  const rows = await db
    .select({
      id: skDisposals.disposalId,
      code: items.itemCode,
      name: items.itemName,
      tag: skAssets.tag,
      quantity: skDisposals.quantity,
      kind: skDisposals.kind,
      note: skDisposals.note,
      createdAt: skDisposals.createdAt,
    })
    .from(skDisposals)
    .innerJoin(items, and(eq(items.itemId, skDisposals.itemId), eq(items.tenantId, tenantId)))
    .leftJoin(skAssets, and(eq(skAssets.assetId, skDisposals.assetId), eq(skAssets.tenantId, tenantId)))
    .where(scoped(skDisposals, tenantId))
    .orderBy(desc(skDisposals.disposalId));

  return {
    items: stock.map((item) => ({ id: item.id, code: item.code, name: item.name, stock: item.stock })),
    assets: assets.map((row) => ({ id: row.id, tag: row.tag, itemId: row.itemId, name: row.name })),
    rows: rows.map((row) => ({
      id: row.id,
      code: row.code,
      name: row.name,
      tag: row.tag ?? "",
      quantity: num(row.quantity),
      kind: row.kind,
      note: row.note,
      createdAt: row.createdAt,
    })),
  };
}

export async function recordDisposal(
  tenantId: number,
  userId: number,
  input: { itemId: number; assetId: number | null; quantity: number; kind: "damage" | "disposal"; note: string },
) {
  const item = await itemOf(tenantId, input.itemId);
  if (input.quantity > item.stock) throw new OfficeError("INSUFFICIENT_STOCK");

  await db.transaction(async (tx) => {
    if (input.assetId) {
      const [asset] = await tx
        .select({ id: skAssets.assetId, status: skAssets.status, itemId: skAssets.itemId })
        .from(skAssets)
        .where(scoped(skAssets, tenantId, eq(skAssets.assetId, input.assetId)))
        .limit(1);
      if (!asset || asset.itemId !== item.id) throw new OfficeError("NOT_FOUND");
      if (asset.status !== "InStore") throw new OfficeError("NOT_READY");
      await tx
        .update(skAssets)
        .set({ status: "Disposed" })
        .where(scoped(skAssets, tenantId, eq(skAssets.assetId, asset.id)));
    }
    await tx.insert(skDisposals).values(
      withTenant(
        {
          itemId: item.id,
          assetId: input.assetId,
          quantity: money(input.quantity),
          kind: input.kind,
          note: input.note,
          recordedBy: userId,
        },
        tenantId,
      ),
    );
    const balance = (await latestBalance(tx, tenantId, item.id)) - input.quantity;
    await tx.insert(binCardLedger).values(
      withTenant(
        {
          itemId: item.id,
          transactionDate: schoolDate(),
          referenceDocument: input.kind === "damage" ? "DAMAGE" : "DISPOSAL",
          receivedQty: "0.00",
          issuedQty: money(input.quantity),
          balanceQty: money(balance),
          remark: input.note.slice(0, 255),
        },
        tenantId,
      ),
    );
    await tx
      .update(items)
      .set({ currentStock: money(item.stock - input.quantity) })
      .where(scoped(items, tenantId, eq(items.itemId, item.id)));
  });

  await writeAudit(tenantId, userId, "store.dispose", `${input.kind} ${item.code} x ${input.quantity}`);
  return { ok: true };
}

export async function loanBoard(tenantId: number) {
  const today = schoolDate();
  const assets = await db
    .select({ id: skAssets.assetId, tag: skAssets.tag, name: items.itemName })
    .from(skAssets)
    .innerJoin(items, and(eq(items.itemId, skAssets.itemId), eq(items.tenantId, tenantId)))
    .where(scoped(skAssets, tenantId, eq(skAssets.status, "InStore")))
    .orderBy(asc(skAssets.tag));
  const rows = await db
    .select({
      id: skLoans.loanId,
      assetId: skLoans.assetId,
      tag: skAssets.tag,
      name: items.itemName,
      borrowerName: skLoans.borrowerName,
      purpose: skLoans.purpose,
      dueOn: skLoans.dueOn,
      returnedOn: skLoans.returnedOn,
      status: skLoans.status,
    })
    .from(skLoans)
    .innerJoin(skAssets, and(eq(skAssets.assetId, skLoans.assetId), eq(skAssets.tenantId, tenantId)))
    .innerJoin(items, and(eq(items.itemId, skAssets.itemId), eq(items.tenantId, tenantId)))
    .where(scoped(skLoans, tenantId))
    .orderBy(desc(skLoans.loanId));

  return {
    assets,
    rows: rows.map((row) => ({
      id: row.id,
      assetId: row.assetId,
      tag: row.tag,
      name: row.name,
      borrowerName: row.borrowerName,
      purpose: row.purpose,
      dueOn: row.dueOn,
      returnedOn: row.returnedOn,
      status: row.status,
      overdue: isOverdue(row.dueOn, today, row.status),
    })),
  };
}

export async function lendAsset(
  tenantId: number,
  userId: number,
  input: { assetId: number; borrowerName: string; purpose: string; dueOn: string },
) {
  const [asset] = await db
    .select({ id: skAssets.assetId, tag: skAssets.tag, status: skAssets.status })
    .from(skAssets)
    .where(scoped(skAssets, tenantId, eq(skAssets.assetId, input.assetId)))
    .limit(1);
  if (!asset) throw new OfficeError("NOT_FOUND");
  if (asset.status !== "InStore") throw new OfficeError("NOT_READY");

  const result = await db.transaction(async (tx) => {
    const inserted = await tx.insert(skLoans).values(
      withTenant(
        {
          assetId: asset.id,
          borrowerName: input.borrowerName,
          purpose: input.purpose,
          dueOn: input.dueOn,
          status: "Out",
          recordedBy: userId,
        },
        tenantId,
      ),
    );
    await tx.update(skAssets).set({ status: "OnLoan" }).where(scoped(skAssets, tenantId, eq(skAssets.assetId, asset.id)));
    return inserted;
  });
  await writeAudit(tenantId, userId, "store.loan", `${asset.tag} ${input.borrowerName}`);
  return { id: insertId(result) };
}

export async function returnAsset(tenantId: number, userId: number, loanId: number) {
  const [loan] = await db
    .select({ id: skLoans.loanId, assetId: skLoans.assetId, status: skLoans.status })
    .from(skLoans)
    .where(scoped(skLoans, tenantId, eq(skLoans.loanId, loanId)))
    .limit(1);
  if (!loan) throw new OfficeError("NOT_FOUND");
  if (loan.status !== "Out") throw new OfficeError("NOT_READY");
  await db.transaction(async (tx) => {
    await tx
      .update(skLoans)
      .set({ status: "Returned", returnedOn: schoolDate() })
      .where(scoped(skLoans, tenantId, eq(skLoans.loanId, loan.id)));
    await tx
      .update(skAssets)
      .set({ status: "InStore" })
      .where(scoped(skAssets, tenantId, eq(skAssets.assetId, loan.assetId)));
  });
  await writeAudit(tenantId, userId, "store.return", `Loan ${loan.id}`);
  return { id: loan.id };
}

export async function forecastBoard(tenantId: number) {
  await syncAlerts(tenantId);
  const rows = await catalog(tenantId);
  const issued = await issuedMap(tenantId);
  return {
    windowDays: FORECAST_DAYS,
    horizon: FORECAST_HORIZON,
    rows: rows.map((item) => {
      const used = issued.get(item.id) ?? 0;
      const daysLeft = daysUntilStockout(item.stock, used, FORECAST_DAYS);
      return {
        id: item.id,
        code: item.code,
        name: item.name,
        stock: item.stock,
        reorder: item.reorder,
        issued: used,
        daysLeft,
        alert: forecastAlert(daysLeft),
      };
    }),
  };
}

export async function storeReport(tenantId: number) {
  const rows = await catalog(tenantId);
  let adequate = 0;
  let low = 0;
  let critical = 0;
  let totalValue = 0;
  const categories = new Map<string, { name: string; skus: number; value: number }>();
  for (const item of rows) {
    const status = stockStatus(item.stock, item.reorder);
    if (status === "critical") critical += 1;
    else if (status === "low") low += 1;
    else adequate += 1;
    const value = item.stock * item.unitCost;
    totalValue += value;
    const name = item.categoryName || "—";
    const bucket = categories.get(name) ?? { name, skus: 0, value: 0 };
    bucket.skus += 1;
    bucket.value += value;
    categories.set(name, bucket);
  }

  const [routed] = await db
    .select({ total: sql<number>`COUNT(*)` })
    .from(skPurchaseRequests)
    .where(scoped(skPurchaseRequests, tenantId));
  const loans = await db
    .select({ dueOn: skLoans.dueOn, status: skLoans.status })
    .from(skLoans)
    .where(scoped(skLoans, tenantId, eq(skLoans.status, "Out")));
  const today = schoolDate();
  const [disposals] = await db
    .select({ total: sql<number>`COUNT(*)` })
    .from(skDisposals)
    .where(scoped(skDisposals, tenantId));
  const audit = await db
    .select({
      id: auditLog.logId,
      actionType: auditLog.actionType,
      description: auditLog.description,
      timestamp: auditLog.timestamp,
    })
    .from(auditLog)
    .where(scoped(auditLog, tenantId, sql`${auditLog.actionType} LIKE 'store.%'`))
    .orderBy(desc(auditLog.logId))
    .limit(100);

  return {
    generatedOn: today,
    skus: rows.length,
    adequate,
    low,
    critical,
    totalValue,
    routed: num(routed?.total),
    openLoans: loans.length,
    overdueLoans: loans.filter((row) => isOverdue(row.dueOn, today, row.status)).length,
    disposals: num(disposals?.total),
    categories: [...categories.values()],
    audit: audit.map((row) => ({
      id: row.id,
      actionType: row.actionType,
      description: row.description ?? "",
      timestamp: row.timestamp,
    })),
  };
}

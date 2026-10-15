import { and, asc, count, desc, eq, gt, sql, type SQL } from "drizzle-orm";
import { db } from "../../db/index.js";
import {
  binCardLedger,
  issueModel22,
  itemCategories,
  items,
  model19Grn,
  model19Items,
  requisitionsModel20,
  staff,
  suppliers,
} from "../../db/schema/index.js";
import { scoped, withTenant } from "../../lib/tenant.js";

export type StoreErrorCode = "NOT_FOUND" | "DUPLICATE_CODE" | "INSUFFICIENT_STOCK" | "STAFF_REQUIRED";

export class StoreError extends Error {
  constructor(readonly code: StoreErrorCode) {
    super(code);
  }
}

const DEFAULT_STORE = "Store A";
const DEFAULT_SHELF = "Shelf 1";
const MAX_LEVEL = 200;

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

function num(value: string | number | null | undefined): number {
  return Number(value ?? 0);
}

function money(value: number): string {
  return value.toFixed(2);
}

function schoolDate(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Addis_Ababa" }).format(new Date());
}

function stockStatus(stock: number, reorder: number): "critical" | "low" | "adequate" {
  if (stock === 0) return "critical";
  if (stock <= reorder) return "low";
  return "adequate";
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

async function staffIdFor(tenantId: number, userId: number): Promise<number | null> {
  const [row] = await db
    .select({ staffId: staff.staffId })
    .from(staff)
    .where(scoped(staff, tenantId, eq(staff.userId, userId)))
    .limit(1);
  return row?.staffId ?? null;
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

export async function listCategories(tenantId: number) {
  const rows = await db
    .select({
      id: itemCategories.categoryId,
      code: itemCategories.categoryCode,
      name: itemCategories.categoryName,
      description: itemCategories.description,
    })
    .from(itemCategories)
    .where(scoped(itemCategories, tenantId))
    .orderBy(asc(itemCategories.categoryName));
  return rows.map((row) => ({ ...row, description: row.description ?? "" }));
}

export async function createCategory(
  tenantId: number,
  input: { categoryCode: string; categoryName: string; description: string },
) {
  try {
    const result = await db.insert(itemCategories).values(
      withTenant(
        {
          categoryCode: input.categoryCode,
          categoryName: input.categoryName,
          description: input.description || null,
        },
        tenantId,
      ),
    );
    return { id: Number(result[0].insertId) };
  } catch (error) {
    if (isDuplicate(error)) throw new StoreError("DUPLICATE_CODE");
    throw error;
  }
}

export async function nextItemCode(tenantId: number, categoryId: number, style: "str" | "category") {
  const [category] = await db
    .select({ code: itemCategories.categoryCode })
    .from(itemCategories)
    .where(scoped(itemCategories, tenantId, eq(itemCategories.categoryId, categoryId)))
    .limit(1);
  if (!category) throw new StoreError("NOT_FOUND");

  const [row] = await db
    .select({ total: count() })
    .from(items)
    .where(scoped(items, tenantId, eq(items.categoryId, categoryId)));
  const next = String(num(row?.total) + 1).padStart(3, "0");
  const prefix = style === "category" && category.code ? category.code : "STR";
  return { itemCode: `${prefix}-${next}` };
}

type ItemInput = {
  itemName: string;
  categoryId: number;
  itemCode: string;
  modelNo: string;
  unitOfMeasure: string;
  unitCost: number;
  reorderLevel: number;
  storeNo: string;
  shelfNo: string;
  isPerishable: boolean;
  expiryDate: string | null;
  specification: string;
  itemType: "fixed_asset" | "consumable";
};

export async function createItem(tenantId: number, input: ItemInput) {
  const [category] = await db
    .select({ id: itemCategories.categoryId })
    .from(itemCategories)
    .where(scoped(itemCategories, tenantId, eq(itemCategories.categoryId, input.categoryId)))
    .limit(1);
  if (!category) throw new StoreError("NOT_FOUND");

  try {
    const result = await db.insert(items).values(
      withTenant(
        {
          itemCode: input.itemCode,
          itemName: input.itemName,
          categoryId: input.categoryId,
          modelNo: input.modelNo || null,
          unitOfMeasure: input.unitOfMeasure,
          reorderLevel: input.reorderLevel,
          unitCost: money(input.unitCost),
          currentStock: "0.00",
          isPerishable: input.isPerishable ? 1 : 0,
          expiryDate: input.isPerishable ? input.expiryDate : null,
          defaultStoreNo: input.storeNo || DEFAULT_STORE,
          defaultShelfNo: input.shelfNo || DEFAULT_SHELF,
          specification: input.specification || null,
          itemType: input.itemType,
        },
        tenantId,
      ),
    );
    return { id: Number(result[0].insertId), itemCode: input.itemCode };
  } catch (error) {
    if (isDuplicate(error)) throw new StoreError("DUPLICATE_CODE");
    throw error;
  }
}

export async function listItems(tenantId: number) {
  const rows = await db
    .select({
      id: items.itemId,
      code: items.itemCode,
      name: items.itemName,
      modelNo: items.modelNo,
      categoryId: items.categoryId,
      categoryName: itemCategories.categoryName,
      unitOfMeasure: items.unitOfMeasure,
      reorderLevel: items.reorderLevel,
      unitCost: items.unitCost,
      currentStock: items.currentStock,
      storeNo: items.defaultStoreNo,
      shelfNo: items.defaultShelfNo,
      specification: items.specification,
      itemType: items.itemType,
      isPerishable: items.isPerishable,
      expiryDate: items.expiryDate,
    })
    .from(items)
    .leftJoin(itemCategories, eq(items.categoryId, itemCategories.categoryId))
    .where(scoped(items, tenantId))
    .orderBy(desc(items.itemId));

  let adequate = 0;
  let low = 0;
  let critical = 0;
  let totalValue = 0;

  const list = rows.map((row) => {
    const stock = num(row.currentStock);
    const reorder = row.reorderLevel;
    const cost = num(row.unitCost);
    const value = stock * cost;
    const status = stockStatus(stock, reorder);
    totalValue += value;
    if (status === "critical") critical += 1;
    else if (status === "low") low += 1;
    else adequate += 1;
    return {
      id: row.id,
      code: row.code,
      name: row.name,
      modelNo: row.modelNo ?? "",
      categoryId: row.categoryId,
      categoryName: row.categoryName ?? "",
      unitOfMeasure: row.unitOfMeasure,
      reorderLevel: reorder,
      maxLevel: MAX_LEVEL,
      unitCost: cost,
      currentStock: stock,
      totalValue: value,
      storeNo: row.storeNo || DEFAULT_STORE,
      shelfNo: row.shelfNo || DEFAULT_SHELF,
      specification: row.specification ?? "",
      itemType: row.itemType ?? "consumable",
      isPerishable: row.isPerishable === 1,
      expiryDate: row.expiryDate,
      status,
    };
  });

  return {
    rows: list,
    stats: {
      totalSkus: list.length,
      adequate,
      low,
      critical,
      totalValue,
    },
  };
}

export async function listSuppliers(tenantId: number) {
  return db
    .select({ id: suppliers.supplierId, name: suppliers.supplierName })
    .from(suppliers)
    .where(scoped(suppliers, tenantId))
    .orderBy(asc(suppliers.supplierName));
}

export async function grnBoard(tenantId: number) {
  const [last] = await db
    .select({ grnNumber: model19Grn.grnNumber })
    .from(model19Grn)
    .where(scoped(model19Grn, tenantId))
    .orderBy(desc(model19Grn.grnId))
    .limit(1);
  const nextGrnNumber = last && /^\d+$/.test(last.grnNumber) ? String(Number(last.grnNumber) + 1) : "";

  const catalog = await db
    .select({
      id: items.itemId,
      code: items.itemCode,
      name: items.itemName,
      categoryName: itemCategories.categoryName,
      storeNo: items.defaultStoreNo,
      shelfNo: items.defaultShelfNo,
    })
    .from(items)
    .leftJoin(itemCategories, eq(items.categoryId, itemCategories.categoryId))
    .where(scoped(items, tenantId))
    .orderBy(asc(items.itemName));

  const records = await db
    .select({
      id: model19Grn.grnId,
      grnNumber: model19Grn.grnNumber,
      dateReceived: model19Grn.dateReceived,
      itemCode: items.itemCode,
      itemName: items.itemName,
      quantityReceived: model19Items.quantityReceived,
      unitPrice: model19Items.unitPrice,
    })
    .from(model19Grn)
    .innerJoin(model19Items, eq(model19Grn.grnId, model19Items.grnId))
    .innerJoin(items, eq(model19Items.itemId, items.itemId))
    .where(scoped(model19Grn, tenantId))
    .orderBy(desc(model19Grn.grnId));

  return {
    nextGrnNumber,
    dateReceived: schoolDate(),
    items: catalog.map((row) => ({
      id: row.id,
      code: row.code,
      name: row.name,
      categoryName: row.categoryName ?? "",
      storeNo: row.storeNo ?? "",
      shelfNo: row.shelfNo ?? "",
    })),
    suppliers: await listSuppliers(tenantId),
    records: records.map((row) => ({
      id: row.id,
      grnNumber: row.grnNumber,
      dateReceived: row.dateReceived,
      itemCode: row.itemCode,
      itemName: row.itemName,
      quantityReceived: num(row.quantityReceived),
      unitPrice: num(row.unitPrice),
      totalPrice: num(row.quantityReceived) * num(row.unitPrice),
    })),
  };
}

export async function receiveGrn(
  tenantId: number,
  userId: number,
  input: {
    grnNumber: string;
    dateReceived: string;
    department: string;
    supplierId: number | null;
    itemId: number;
    quantityReceived: number;
    unitPrice: number;
  },
) {
  const staffId = await staffIdFor(tenantId, userId);
  const [item] = await db
    .select({
      id: items.itemId,
      categoryName: itemCategories.categoryName,
      storeNo: items.defaultStoreNo,
      shelfNo: items.defaultShelfNo,
      currentStock: items.currentStock,
    })
    .from(items)
    .leftJoin(itemCategories, eq(items.categoryId, itemCategories.categoryId))
    .where(scoped(items, tenantId, eq(items.itemId, input.itemId)))
    .limit(1);
  if (!item) throw new StoreError("NOT_FOUND");

  if (input.supplierId) {
    const [supplier] = await db
      .select({ id: suppliers.supplierId })
      .from(suppliers)
      .where(scoped(suppliers, tenantId, eq(suppliers.supplierId, input.supplierId)))
      .limit(1);
    if (!supplier) throw new StoreError("NOT_FOUND");
  }

  await db.transaction(async (tx) => {
    const header = await tx.insert(model19Grn).values(
      withTenant(
        {
          grnNumber: input.grnNumber,
          dateReceived: input.dateReceived,
          department: input.department || null,
          supplierId: input.supplierId,
          delivererName: null,
          receivedByStaffId: staffId,
        },
        tenantId,
      ),
    );
    const grnId = Number(header[0].insertId);
    await tx.insert(model19Items).values(
      withTenant(
        {
          grnId,
          itemId: item.id,
          stockClassification: item.categoryName || null,
          storeNo: item.storeNo,
          shelfNo: item.shelfNo,
          quantityReceived: money(input.quantityReceived),
          unitPrice: money(input.unitPrice),
        },
        tenantId,
      ),
    );
    const balance = (await latestBalance(tx, tenantId, item.id)) + input.quantityReceived;
    await tx.insert(binCardLedger).values(
      withTenant(
        {
          itemId: item.id,
          transactionDate: input.dateReceived,
          referenceDocument: `M19-${input.grnNumber}`,
          receivedQty: money(input.quantityReceived),
          issuedQty: "0.00",
          balanceQty: money(balance),
          remark: `በሞዴል 19 (ቁ.${input.grnNumber}) ገቢ የተደረገ`,
        },
        tenantId,
      ),
    );
    await tx
      .update(items)
      .set({ currentStock: money(num(item.currentStock) + input.quantityReceived) })
      .where(scoped(items, tenantId, eq(items.itemId, item.id)));
  });

  return { grnNumber: input.grnNumber };
}

export async function listBinCard(
  tenantId: number,
  query: { itemId: number; fromDate: string; toDate: string; trxType: "" | "IN" | "OUT" },
) {
  const catalog = await db
    .select({
      id: items.itemId,
      code: items.itemCode,
      name: items.itemName,
      unitOfMeasure: items.unitOfMeasure,
    })
    .from(items)
    .where(scoped(items, tenantId))
    .orderBy(asc(items.itemName));

  const filters: SQL[] = [];
  if (query.itemId > 0) filters.push(eq(binCardLedger.itemId, query.itemId));
  if (query.fromDate) filters.push(sql`DATE(${binCardLedger.transactionDate}) >= ${query.fromDate}`);
  if (query.toDate) filters.push(sql`DATE(${binCardLedger.transactionDate}) <= ${query.toDate}`);
  if (query.trxType === "IN") filters.push(gt(binCardLedger.receivedQty, "0"));
  if (query.trxType === "OUT") filters.push(gt(binCardLedger.issuedQty, "0"));

  const rows = await db
    .select({
      id: binCardLedger.ledgerId,
      transactionDate: binCardLedger.transactionDate,
      referenceDocument: binCardLedger.referenceDocument,
      receivedQty: binCardLedger.receivedQty,
      issuedQty: binCardLedger.issuedQty,
      balanceQty: binCardLedger.balanceQty,
      remark: binCardLedger.remark,
      itemCode: items.itemCode,
      itemName: items.itemName,
      unitOfMeasure: items.unitOfMeasure,
      categoryName: itemCategories.categoryName,
    })
    .from(binCardLedger)
    .innerJoin(items, eq(binCardLedger.itemId, items.itemId))
    .leftJoin(itemCategories, eq(items.categoryId, itemCategories.categoryId))
    .where(scoped(binCardLedger, tenantId, filters.length ? and(...filters) : undefined))
    .orderBy(asc(binCardLedger.transactionDate), asc(binCardLedger.ledgerId));

  let totalIn = 0;
  let totalOut = 0;
  const history = rows.map((row) => {
    const received = num(row.receivedQty);
    const issued = num(row.issuedQty);
    totalIn += received;
    totalOut += issued;
    return {
      id: row.id,
      transactionDate: row.transactionDate,
      referenceDocument: row.referenceDocument ?? "",
      receivedQty: received,
      issuedQty: issued,
      balanceQty: num(row.balanceQty),
      remark: row.remark ?? "",
      itemCode: row.itemCode,
      itemName: row.itemName,
      unitOfMeasure: row.unitOfMeasure,
      categoryName: row.categoryName ?? "",
    };
  });

  let selected: {
    name: string;
    code: string;
    currentStock: number;
    unitOfMeasure: string;
    storeNo: string;
    shelfNo: string;
  } | null = null;
  if (query.itemId > 0) {
    const [item] = await db
      .select({
        name: items.itemName,
        code: items.itemCode,
        currentStock: items.currentStock,
        unitOfMeasure: items.unitOfMeasure,
        storeNo: items.defaultStoreNo,
        shelfNo: items.defaultShelfNo,
      })
      .from(items)
      .where(scoped(items, tenantId, eq(items.itemId, query.itemId)))
      .limit(1);
    if (item) {
      selected = {
        name: item.name,
        code: item.code,
        currentStock: num(item.currentStock),
        unitOfMeasure: item.unitOfMeasure,
        storeNo: item.storeNo || "-",
        shelfNo: item.shelfNo || "-",
      };
    }
  }

  return {
    items: catalog,
    selected,
    totalIn,
    totalOut,
    rows: [...history].reverse(),
  };
}

export async function recordInflow(
  tenantId: number,
  input: {
    itemId: number;
    inflowType: string;
    sourceEntity: string;
    quantity: number;
    unitEstimatedCost: number;
    referenceDocNo: string;
    remarks: string;
  },
) {
  const [item] = await db
    .select({ id: items.itemId, currentStock: items.currentStock })
    .from(items)
    .where(scoped(items, tenantId, eq(items.itemId, input.itemId)))
    .limit(1);
  if (!item) throw new StoreError("NOT_FOUND");

  const nextStock = num(item.currentStock) + input.quantity;
  await db.transaction(async (tx) => {
    const balance = (await latestBalance(tx, tenantId, item.id)) + input.quantity;
    const remark = [input.inflowType, input.sourceEntity, input.remarks].filter(Boolean).join(" · ").slice(0, 255);
    await tx.insert(binCardLedger).values(
      withTenant(
        {
          itemId: item.id,
          transactionDate: schoolDate(),
          referenceDocument: input.referenceDocNo,
          receivedQty: money(input.quantity),
          issuedQty: "0.00",
          balanceQty: money(balance),
          remark,
        },
        tenantId,
      ),
    );
    await tx
      .update(items)
      .set({ currentStock: money(nextStock) })
      .where(scoped(items, tenantId, eq(items.itemId, item.id)));
  });
  return { newStockBalance: nextStock };
}

export async function listApprovals(tenantId: number) {
  const rows = await db
    .select({
      id: requisitionsModel20.requisitionId,
      refCode: requisitionsModel20.refCode,
      department: requisitionsModel20.department,
      quantityRequested: requisitionsModel20.quantityRequested,
      purpose: requisitionsModel20.purpose,
      createdAt: requisitionsModel20.createdAt,
      itemName: items.itemName,
      itemCode: items.itemCode,
      currentStock: items.currentStock,
      firstName: staff.firstName,
      lastName: staff.lastName,
    })
    .from(requisitionsModel20)
    .innerJoin(items, eq(requisitionsModel20.itemId, items.itemId))
    .innerJoin(staff, eq(requisitionsModel20.requesterStaffId, staff.staffId))
    .where(
      scoped(
        requisitionsModel20,
        tenantId,
        and(eq(requisitionsModel20.status, "Pending"), sql`${requisitionsModel20.approvedByStaffId} IS NULL`),
      ),
    )
    .orderBy(asc(requisitionsModel20.createdAt));

  return rows.map((row) => ({
    id: row.id,
    refCode: row.refCode,
    requesterName: `${row.firstName} ${row.lastName}`.trim(),
    department: row.department ?? "",
    itemName: row.itemName,
    itemCode: row.itemCode,
    quantityRequested: num(row.quantityRequested),
    currentStock: num(row.currentStock),
    createdAt: row.createdAt,
    purpose: row.purpose ?? "",
  }));
}

export async function actOnRequisition(
  tenantId: number,
  userId: number,
  requisitionId: number,
  action: "forward" | "reject",
) {
  const staffId = await staffIdFor(tenantId, userId);
  if (action === "forward" && !staffId) throw new StoreError("STAFF_REQUIRED");

  const [row] = await db
    .select({ id: requisitionsModel20.requisitionId })
    .from(requisitionsModel20)
    .where(
      scoped(
        requisitionsModel20,
        tenantId,
        and(
          eq(requisitionsModel20.requisitionId, requisitionId),
          eq(requisitionsModel20.status, "Pending"),
          sql`${requisitionsModel20.approvedByStaffId} IS NULL`,
        ),
      ),
    )
    .limit(1);
  if (!row) throw new StoreError("NOT_FOUND");

  if (action === "forward") {
    await db
      .update(requisitionsModel20)
      .set({ approvedByStaffId: staffId })
      .where(scoped(requisitionsModel20, tenantId, eq(requisitionsModel20.requisitionId, requisitionId)));
    return { message: "forwarded" as const };
  }

  await db
    .update(requisitionsModel20)
    .set({ status: "Rejected" })
    .where(scoped(requisitionsModel20, tenantId, eq(requisitionsModel20.requisitionId, requisitionId)));
  return { message: "rejected" as const };
}

export async function listIssues(tenantId: number) {
  const approved = await db
    .select({
      id: requisitionsModel20.requisitionId,
      refCode: requisitionsModel20.refCode,
      department: requisitionsModel20.department,
      quantityRequested: requisitionsModel20.quantityRequested,
      itemId: items.itemId,
      itemName: items.itemName,
      itemCode: items.itemCode,
      unitOfMeasure: items.unitOfMeasure,
      unitCost: items.unitCost,
      requesterFirst: staff.firstName,
      requesterLast: staff.lastName,
    })
    .from(requisitionsModel20)
    .innerJoin(items, eq(requisitionsModel20.itemId, items.itemId))
    .innerJoin(staff, eq(requisitionsModel20.requesterStaffId, staff.staffId))
    .where(scoped(requisitionsModel20, tenantId, eq(requisitionsModel20.status, "Approved")))
    .orderBy(desc(requisitionsModel20.createdAt));

  const pending = [];
  for (const row of approved) {
    const [balance] = await db
      .select({ balanceQty: binCardLedger.balanceQty })
      .from(binCardLedger)
      .where(scoped(binCardLedger, tenantId, eq(binCardLedger.itemId, row.itemId)))
      .orderBy(desc(binCardLedger.ledgerId))
      .limit(1);
    const [approver] = await db
      .select({ firstName: staff.firstName, lastName: staff.lastName })
      .from(requisitionsModel20)
      .leftJoin(staff, eq(requisitionsModel20.approvedByStaffId, staff.staffId))
      .where(scoped(requisitionsModel20, tenantId, eq(requisitionsModel20.requisitionId, row.id)))
      .limit(1);
    const binQty = num(balance?.balanceQty);
    const requested = num(row.quantityRequested);
    pending.push({
      id: row.id,
      refCode: row.refCode,
      requesterName: `${row.requesterFirst} ${row.requesterLast}`.trim(),
      department: row.department ?? "",
      itemId: row.itemId,
      itemName: row.itemName,
      itemCode: row.itemCode,
      unitOfMeasure: row.unitOfMeasure,
      quantityRequested: requested,
      binBalance: binQty,
      enough: binQty >= requested,
      approverName: approver ? `${approver.firstName ?? ""} ${approver.lastName ?? ""}`.trim() : "",
    });
  }

  const historyRows = await db
    .select({
      id: issueModel22.issueId,
      voucherNo: issueModel22.issueNo,
      quantityIssued: issueModel22.quantityIssued,
      issueDate: issueModel22.issueDate,
      itemName: items.itemName,
      itemCode: items.itemCode,
      unitOfMeasure: items.unitOfMeasure,
      unitCost: items.unitCost,
      refCode: requisitionsModel20.refCode,
      department: requisitionsModel20.department,
      requesterFirst: staff.firstName,
      requesterLast: staff.lastName,
    })
    .from(issueModel22)
    .innerJoin(requisitionsModel20, eq(issueModel22.requisitionId, requisitionsModel20.requisitionId))
    .innerJoin(items, eq(issueModel22.itemId, items.itemId))
    .innerJoin(staff, eq(requisitionsModel20.requesterStaffId, staff.staffId))
    .where(scoped(issueModel22, tenantId))
    .orderBy(desc(issueModel22.issueDate))
    .limit(20);

  return {
    pending,
    history: historyRows.map((row) => ({
      id: row.id,
      voucherNo: row.voucherNo,
      quantityIssued: num(row.quantityIssued),
      issueDate: row.issueDate,
      itemName: row.itemName,
      itemCode: row.itemCode,
      unitOfMeasure: row.unitOfMeasure,
      unitCost: num(row.unitCost),
      totalCost: num(row.quantityIssued) * num(row.unitCost),
      refCode: row.refCode,
      department: row.department ?? "",
      requesterName: `${row.requesterFirst} ${row.requesterLast}`.trim(),
    })),
  };
}

export async function issueItem(tenantId: number, userId: number, requisitionId: number, voucherNo: string) {
  const staffId = await staffIdFor(tenantId, userId);
  if (!staffId) throw new StoreError("STAFF_REQUIRED");

  const [request] = await db
    .select({
      id: requisitionsModel20.requisitionId,
      itemId: requisitionsModel20.itemId,
      quantityRequested: requisitionsModel20.quantityRequested,
      requesterStaffId: requisitionsModel20.requesterStaffId,
    })
    .from(requisitionsModel20)
    .where(
      scoped(
        requisitionsModel20,
        tenantId,
        and(eq(requisitionsModel20.requisitionId, requisitionId), eq(requisitionsModel20.status, "Approved")),
      ),
    )
    .limit(1);
  if (!request) throw new StoreError("NOT_FOUND");

  const issuedQty = num(request.quantityRequested);
  await db.transaction(async (tx) => {
    const previous = await latestBalance(tx, tenantId, request.itemId);
    if (previous < issuedQty) throw new StoreError("INSUFFICIENT_STOCK");
    const next = previous - issuedQty;
    await tx
      .update(requisitionsModel20)
      .set({ status: "Completed" })
      .where(scoped(requisitionsModel20, tenantId, eq(requisitionsModel20.requisitionId, request.id)));
    await tx.insert(binCardLedger).values(
      withTenant(
        {
          itemId: request.itemId,
          transactionDate: schoolDate(),
          referenceDocument: voucherNo,
          receivedQty: "0.00",
          issuedQty: money(issuedQty),
          balanceQty: money(next),
          remark: "",
        },
        tenantId,
      ),
    );
    await tx.insert(issueModel22).values(
      withTenant(
        {
          requisitionId: request.id,
          itemId: request.itemId,
          issueNo: voucherNo,
          quantityIssued: money(issuedQty),
          issuedToStaffId: request.requesterStaffId,
          issuedByStaffId: staffId,
        },
        tenantId,
      ),
    );
  });
  return { voucherNo };
}

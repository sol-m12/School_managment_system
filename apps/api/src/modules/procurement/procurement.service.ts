import { randomBytes } from "node:crypto";
import { and, asc, desc, eq, sql } from "drizzle-orm";
import { db } from "../../db/index.js";
import {
  auditLog,
  items,
  poApprovals,
  poAwards,
  poBids,
  poBudgets,
  poChecks,
  poOrders,
  poTenders,
  poVendors,
  skPurchaseRequests,
  suppliers,
  tcRequisitions,
  tenants,
} from "../../db/schema/index.js";
import { hashPassword, verifyPassword } from "../../lib/password.js";
import { scoped, withTenant } from "../../lib/tenant.js";
import type { ApprovalInput, BidInput, BudgetInput, CheckInput, OrderInput, TenderInput, VendorInput } from "./procurement.schema.js";
import {
  cents,
  fitsBudget,
  licenseCurrent,
  lineTotal,
  nextReceipt,
  rankBids,
  storeNeedsBuy,
  teacherNeedsBuy,
  winningBid,
} from "./procurementRules.js";
import { createVendorToken } from "./vendorToken.js";

const PASS = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";

export const PROCUREMENT_ERRORS = [
  "NOT_FOUND",
  "ALREADY_CHECKED",
  "STOCK_ADEQUATE",
  "STOCK_COVERED",
  "NOT_FORWARDED",
  "NOT_CHECKED",
  "OVER_BUDGET",
  "NOT_APPROVED",
  "LICENSE_EXPIRED",
  "VENDOR_SUSPENDED",
  "TENDER_CLOSED",
  "ALREADY_BID",
  "NO_VALID_BID",
  "OVER_RECEIPT",
  "ALREADY_DELIVERED",
  "ALREADY_AWARDED",
  "DUPLICATE_NAME",
  "DUPLICATE_CODE",
  "ALREADY_DECIDED",
  "USERNAME_TAKEN",
  "AUTH_INVALID_CREDENTIALS",
] as const;

export type ProcurementErrorCode = (typeof PROCUREMENT_ERRORS)[number];

export class ProcurementError extends Error {
  constructor(readonly code: ProcurementErrorCode) {
    super(code);
    this.name = "ProcurementError";
  }
}

function num(value: string | number | null | undefined): number {
  return Number(value ?? 0);
}

function money(value: number): string {
  return value.toFixed(2);
}

function insertId(result: unknown): number {
  if (!Array.isArray(result)) return 0;
  const header = result[0] as { insertId?: number } | undefined;
  return Number(header?.insertId ?? 0);
}

function affected(result: unknown): number {
  if (!Array.isArray(result)) return 0;
  const header = result[0] as { affectedRows?: number } | undefined;
  return Number(header?.affectedRows ?? 0);
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

function randomPassword(): string {
  const bytes = randomBytes(10);
  let pass = "";
  for (let i = 0; i < bytes.length; i += 1) pass += PASS[bytes[i]! % PASS.length];
  return pass;
}

function fourDigits(): string {
  return String(1000 + (randomBytes(2).readUInt16BE(0) % 9000));
}

function usernameBase(name: string): string {
  const latin = name.toLowerCase().replace(/[^a-z0-9]+/g, "").slice(0, 12);
  return latin || "vendor";
}

async function writeAudit(tenantId: number, userId: number, actionType: string, description: string): Promise<void> {
  await db.insert(auditLog).values(withTenant({ userId, actionType, description, timestamp: addisNow() }, tenantId));
}

async function activeTenant(slug: string): Promise<number> {
  const [tenant] = await db
    .select({ id: tenants.id })
    .from(tenants)
    .where(and(eq(tenants.slug, slug), eq(tenants.status, "active")))
    .limit(1);
  if (!tenant) throw new ProcurementError("NOT_FOUND");
  return tenant.id;
}

async function stockForName(tenantId: number, name: string): Promise<number> {
  const rows = await db
    .select({ stock: items.currentStock })
    .from(items)
    .where(scoped(items, tenantId, sql`lower(${items.itemName}) = ${name.toLowerCase()}`));
  return rows.reduce((max, row) => Math.max(max, num(row.stock)), 0);
}

async function committed(tenantId: number, budgetId: number): Promise<number> {
  const orders = await db
    .select({
      kind: poOrders.sourceKind,
      id: poOrders.sourceId,
      quantity: poOrders.quantity,
      unitPrice: poOrders.unitPrice,
    })
    .from(poOrders)
    .where(scoped(poOrders, tenantId, eq(poOrders.budgetId, budgetId)));
  const ordered = new Set(orders.map((row) => `${row.kind}:${row.id}`));
  let total = orders.reduce((sum, row) => sum + lineTotal(num(row.quantity), num(row.unitPrice)), 0);

  const approvals = await db
    .select({
      kind: poApprovals.sourceKind,
      id: poApprovals.sourceId,
      quantity: poApprovals.quantity,
      unitPrice: poApprovals.unitPrice,
    })
    .from(poApprovals)
    .where(scoped(poApprovals, tenantId, and(eq(poApprovals.budgetId, budgetId), eq(poApprovals.status, "Approved"))));
  for (const row of approvals) {
    if (ordered.has(`${row.kind}:${row.id}`)) continue;
    total += lineTotal(num(row.quantity), num(row.unitPrice));
  }

  const awards = await db
    .select({ tenderId: poAwards.tenderId, amount: poBids.amount, budgetId: poTenders.budgetId })
    .from(poAwards)
    .innerJoin(poBids, and(eq(poBids.bidId, poAwards.bidId), eq(poBids.tenantId, tenantId)))
    .innerJoin(poTenders, and(eq(poTenders.tenderId, poAwards.tenderId), eq(poTenders.tenantId, tenantId)))
    .where(scoped(poAwards, tenantId, eq(poTenders.budgetId, budgetId)));
  for (const row of awards) {
    if (ordered.has(`tender:${row.tenderId}`)) continue;
    total += num(row.amount);
  }
  return total;
}

async function requireBudget(tenantId: number, budgetId: number) {
  const [row] = await db
    .select({ id: poBudgets.budgetId, allocated: poBudgets.allocated, code: poBudgets.code, title: poBudgets.title })
    .from(poBudgets)
    .where(scoped(poBudgets, tenantId, eq(poBudgets.budgetId, budgetId)))
    .limit(1);
  if (!row) throw new ProcurementError("NOT_FOUND");
  return { id: row.id, allocated: num(row.allocated), code: row.code, title: row.title };
}

async function requireVendor(tenantId: number, vendorId: number, today: string) {
  const [row] = await db
    .select({
      id: poVendors.vendorId,
      name: poVendors.supplierName,
      status: poVendors.status,
      licenseExpires: poVendors.licenseExpires,
    })
    .from(poVendors)
    .where(scoped(poVendors, tenantId, eq(poVendors.vendorId, vendorId)))
    .limit(1);
  if (!row) throw new ProcurementError("NOT_FOUND");
  if (row.status !== "Active") throw new ProcurementError("VENDOR_SUSPENDED");
  if (!licenseCurrent(row.licenseExpires, today)) throw new ProcurementError("LICENSE_EXPIRED");
  return row;
}

function vendorView(row: {
  id: number;
  name: string;
  contact: string;
  phone: string;
  email: string;
  licenseNo: string;
  licenseExpires: string | null;
  status: "Active" | "Suspended";
  username: string;
}, today: string) {
  return {
    ...row,
    licenseCurrent: row.status === "Active" && licenseCurrent(row.licenseExpires, today),
  };
}

export async function desk(tenantId: number) {
  const today = schoolDate();
  const [vendors, checks, orders, tenders, budgets] = await Promise.all([
    db.select({ id: poVendors.vendorId }).from(poVendors).where(scoped(poVendors, tenantId)),
    db.select({ id: poChecks.checkId }).from(poChecks).where(scoped(poChecks, tenantId)),
    db.select({ status: poOrders.status }).from(poOrders).where(scoped(poOrders, tenantId)),
    db.select({ status: poTenders.status, closesOn: poTenders.closesOn }).from(poTenders).where(scoped(poTenders, tenantId)),
    db.select({ id: poBudgets.budgetId }).from(poBudgets).where(scoped(poBudgets, tenantId)),
  ]);
  return {
    vendors: vendors.length,
    checks: checks.length,
    openOrders: orders.filter((row) => row.status !== "Delivered").length,
    openTenders: tenders.filter((row) => row.status === "Open" && row.closesOn >= today).length,
    budgets: budgets.length,
  };
}

export async function listVendors(tenantId: number) {
  const today = schoolDate();
  const rows = await db
    .select({
      id: poVendors.vendorId,
      name: poVendors.supplierName,
      contact: poVendors.contactName,
      phone: poVendors.phone,
      email: poVendors.email,
      licenseNo: poVendors.licenseNo,
      licenseExpires: poVendors.licenseExpires,
      status: poVendors.status,
      username: poVendors.username,
    })
    .from(poVendors)
    .where(scoped(poVendors, tenantId))
    .orderBy(asc(poVendors.supplierName));
  return { rows: rows.map((row) => vendorView(row, today)) };
}

export async function createVendor(tenantId: number, userId: number, input: VendorInput) {
  const password = randomPassword();
  const passwordHash = await hashPassword(password);
  const base = usernameBase(input.supplierName);
  for (let attempt = 0; attempt < 6; attempt += 1) {
    const username = `${base}${fourDigits()}`.slice(0, 50);
    try {
      const inserted = await db.insert(poVendors).values(
        withTenant(
          {
            supplierName: input.supplierName,
            contactName: input.contactName,
            phone: input.phone,
            email: input.email,
            licenseNo: input.licenseNo,
            licenseExpires: input.licenseExpires,
            status: "Active",
            username,
            passwordHash,
          },
          tenantId,
        ),
      );
      const [named] = await db
        .select({ id: suppliers.supplierId })
        .from(suppliers)
        .where(scoped(suppliers, tenantId, eq(suppliers.supplierName, input.supplierName)))
        .limit(1);
      if (!named) {
        await db.insert(suppliers).values(withTenant({ supplierName: input.supplierName }, tenantId));
      }
      await writeAudit(tenantId, userId, "procurement.vendor", input.supplierName);
      return { id: insertId(inserted), username, password };
    } catch (error) {
      if (!isDuplicate(error)) throw error;
      const [nameTaken] = await db
        .select({ id: poVendors.vendorId })
        .from(poVendors)
        .where(scoped(poVendors, tenantId, eq(poVendors.supplierName, input.supplierName)))
        .limit(1);
      if (nameTaken) throw new ProcurementError("DUPLICATE_NAME");
    }
  }
  throw new ProcurementError("USERNAME_TAKEN");
}

export async function setVendorStatus(tenantId: number, userId: number, vendorId: number, status: "Active" | "Suspended") {
  const result = await db
    .update(poVendors)
    .set({ status })
    .where(scoped(poVendors, tenantId, eq(poVendors.vendorId, vendorId)));
  if (affected(result) === 0) throw new ProcurementError("NOT_FOUND");
  await writeAudit(tenantId, userId, "procurement.vendor.status", `${vendorId} ${status}`);
  return { id: vendorId, status };
}

export async function listBudgets(tenantId: number) {
  const rows = await db
    .select({
      id: poBudgets.budgetId,
      fiscalYear: poBudgets.fiscalYear,
      code: poBudgets.code,
      title: poBudgets.title,
      allocated: poBudgets.allocated,
    })
    .from(poBudgets)
    .where(scoped(poBudgets, tenantId))
    .orderBy(desc(poBudgets.fiscalYear), asc(poBudgets.code));
  const withSpend = [];
  for (const row of rows) {
    const spent = await committed(tenantId, row.id);
    const allocated = num(row.allocated);
    withSpend.push({
      id: row.id,
      fiscalYear: row.fiscalYear,
      code: row.code,
      title: row.title,
      allocated,
      spent,
      remaining: (cents(allocated) - cents(spent)) / 100,
    });
  }
  return { rows: withSpend };
}

export async function createBudget(tenantId: number, userId: number, input: BudgetInput) {
  try {
    const inserted = await db.insert(poBudgets).values(
      withTenant(
        {
          fiscalYear: input.fiscalYear,
          code: input.code,
          title: input.title,
          allocated: money(input.allocated),
        },
        tenantId,
      ),
    );
    await writeAudit(tenantId, userId, "procurement.budget", `${input.fiscalYear} ${input.code}`);
    return { id: insertId(inserted) };
  } catch (error) {
    if (isDuplicate(error)) throw new ProcurementError("DUPLICATE_CODE");
    throw error;
  }
}

export async function listRequisitions(tenantId: number) {
  const store = await db
    .select({
      id: skPurchaseRequests.requestId,
      code: items.itemCode,
      name: items.itemName,
      stock: items.currentStock,
      reorder: items.reorderLevel,
      quantity: skPurchaseRequests.quantity,
      note: skPurchaseRequests.note,
      checkId: poChecks.checkId,
      decision: poApprovals.status,
      orderId: poOrders.orderId,
    })
    .from(skPurchaseRequests)
    .innerJoin(items, and(eq(items.itemId, skPurchaseRequests.itemId), eq(items.tenantId, tenantId)))
    .leftJoin(
      poChecks,
      and(eq(poChecks.tenantId, tenantId), eq(poChecks.sourceKind, "store"), eq(poChecks.sourceId, skPurchaseRequests.requestId)),
    )
    .leftJoin(
      poApprovals,
      and(eq(poApprovals.tenantId, tenantId), eq(poApprovals.sourceKind, "store"), eq(poApprovals.sourceId, skPurchaseRequests.requestId)),
    )
    .leftJoin(
      poOrders,
      and(eq(poOrders.tenantId, tenantId), eq(poOrders.sourceKind, "store"), eq(poOrders.sourceId, skPurchaseRequests.requestId)),
    )
    .where(scoped(skPurchaseRequests, tenantId))
    .orderBy(desc(skPurchaseRequests.requestId));

  const teacher = await db
    .select({
      id: tcRequisitions.requisitionId,
      department: tcRequisitions.department,
      itemName: tcRequisitions.itemName,
      quantity: tcRequisitions.quantity,
      purpose: tcRequisitions.purpose,
      status: tcRequisitions.status,
      checkId: poChecks.checkId,
      decision: poApprovals.status,
      orderId: poOrders.orderId,
    })
    .from(tcRequisitions)
    .leftJoin(
      poChecks,
      and(eq(poChecks.tenantId, tenantId), eq(poChecks.sourceKind, "teacher"), eq(poChecks.sourceId, tcRequisitions.requisitionId)),
    )
    .leftJoin(
      poApprovals,
      and(eq(poApprovals.tenantId, tenantId), eq(poApprovals.sourceKind, "teacher"), eq(poApprovals.sourceId, tcRequisitions.requisitionId)),
    )
    .leftJoin(
      poOrders,
      and(eq(poOrders.tenantId, tenantId), eq(poOrders.sourceKind, "teacher"), eq(poOrders.sourceId, tcRequisitions.requisitionId)),
    )
    .where(scoped(tcRequisitions, tenantId, eq(tcRequisitions.status, "Sent")))
    .orderBy(desc(tcRequisitions.requisitionId));

  const teacherRows = [];
  for (const row of teacher) {
    teacherRows.push({
      id: row.id,
      department: row.department,
      name: row.itemName,
      quantity: row.quantity,
      purpose: row.purpose,
      stock: await stockForName(tenantId, row.itemName),
      checked: row.checkId != null,
      decision: row.decision,
      ordered: row.orderId != null,
    });
  }

  return {
    store: store.map((row) => ({
      id: row.id,
      code: row.code,
      name: row.name,
      stock: num(row.stock),
      reorder: row.reorder,
      quantity: num(row.quantity),
      note: row.note,
      checked: row.checkId != null,
      decision: row.decision,
      ordered: row.orderId != null,
    })),
    teacher: teacherRows,
  };
}

export async function checkRequisition(tenantId: number, userId: number, input: CheckInput) {
  const [existing] = await db
    .select({ id: poChecks.checkId })
    .from(poChecks)
    .where(scoped(poChecks, tenantId, and(eq(poChecks.sourceKind, input.sourceKind), eq(poChecks.sourceId, input.sourceId))))
    .limit(1);
  if (existing) throw new ProcurementError("ALREADY_CHECKED");

  let stock = 0;
  let needed = 0;
  if (input.sourceKind === "store") {
    const [row] = await db
      .select({
        quantity: skPurchaseRequests.quantity,
        stock: items.currentStock,
        reorder: items.reorderLevel,
      })
      .from(skPurchaseRequests)
      .innerJoin(items, and(eq(items.itemId, skPurchaseRequests.itemId), eq(items.tenantId, tenantId)))
      .where(scoped(skPurchaseRequests, tenantId, eq(skPurchaseRequests.requestId, input.sourceId)))
      .limit(1);
    if (!row) throw new ProcurementError("NOT_FOUND");
    stock = num(row.stock);
    needed = num(row.quantity);
    if (!storeNeedsBuy(stock, row.reorder)) throw new ProcurementError("STOCK_ADEQUATE");
  } else {
    const [row] = await db
      .select({ name: tcRequisitions.itemName, quantity: tcRequisitions.quantity, status: tcRequisitions.status })
      .from(tcRequisitions)
      .where(scoped(tcRequisitions, tenantId, eq(tcRequisitions.requisitionId, input.sourceId)))
      .limit(1);
    if (!row) throw new ProcurementError("NOT_FOUND");
    if (row.status !== "Sent") throw new ProcurementError("NOT_FORWARDED");
    stock = await stockForName(tenantId, row.name);
    needed = row.quantity;
    if (!teacherNeedsBuy(stock, needed)) throw new ProcurementError("STOCK_COVERED");
  }

  const inserted = await db.insert(poChecks).values(
    withTenant(
      {
        sourceKind: input.sourceKind,
        sourceId: input.sourceId,
        stock: money(stock),
        needed: money(needed),
        recordedBy: userId,
      },
      tenantId,
    ),
  );
  await writeAudit(tenantId, userId, "procurement.check", `${input.sourceKind} ${input.sourceId}`);
  return { id: insertId(inserted) };
}

export async function decide(tenantId: number, userId: number, input: ApprovalInput) {
  const [checked] = await db
    .select({ id: poChecks.checkId })
    .from(poChecks)
    .where(scoped(poChecks, tenantId, and(eq(poChecks.sourceKind, input.sourceKind), eq(poChecks.sourceId, input.sourceId))))
    .limit(1);
  if (!checked) throw new ProcurementError("NOT_CHECKED");

  const [existing] = await db
    .select({ id: poApprovals.approvalId })
    .from(poApprovals)
    .where(scoped(poApprovals, tenantId, and(eq(poApprovals.sourceKind, input.sourceKind), eq(poApprovals.sourceId, input.sourceId))))
    .limit(1);
  if (existing) throw new ProcurementError("ALREADY_DECIDED");

  let budgetId: number | null = null;
  if (input.decision === "Approved") {
    if (input.budgetId == null) throw new ProcurementError("NOT_APPROVED");
    const budget = await requireBudget(tenantId, input.budgetId);
    const line = lineTotal(input.quantity, input.unitPrice);
    const spent = await committed(tenantId, budget.id);
    if (!fitsBudget(budget.allocated, spent, line)) throw new ProcurementError("OVER_BUDGET");
    budgetId = budget.id;
  }

  try {
    const inserted = await db.insert(poApprovals).values(
      withTenant(
        {
          sourceKind: input.sourceKind,
          sourceId: input.sourceId,
          budgetId,
          quantity: money(input.quantity),
          unitPrice: money(input.unitPrice),
          status: input.decision,
          note: input.note,
          recordedBy: userId,
        },
        tenantId,
      ),
    );
    await writeAudit(tenantId, userId, "procurement.approval", `${input.decision} ${input.sourceKind} ${input.sourceId}`);
    return { id: insertId(inserted) };
  } catch (error) {
    if (isDuplicate(error)) throw new ProcurementError("ALREADY_DECIDED");
    throw error;
  }
}

async function sourceItem(tenantId: number, kind: "store" | "teacher", sourceId: number): Promise<string> {
  if (kind === "store") {
    const [row] = await db
      .select({ name: items.itemName })
      .from(skPurchaseRequests)
      .innerJoin(items, and(eq(items.itemId, skPurchaseRequests.itemId), eq(items.tenantId, tenantId)))
      .where(scoped(skPurchaseRequests, tenantId, eq(skPurchaseRequests.requestId, sourceId)))
      .limit(1);
    if (!row) throw new ProcurementError("NOT_FOUND");
    return row.name.slice(0, 160);
  }
  const [row] = await db
    .select({ name: tcRequisitions.itemName })
    .from(tcRequisitions)
    .where(scoped(tcRequisitions, tenantId, eq(tcRequisitions.requisitionId, sourceId)))
    .limit(1);
  if (!row) throw new ProcurementError("NOT_FOUND");
  return row.name;
}

async function insertOrder(
  tenantId: number,
  userId: number,
  input: {
    vendorId: number;
    budgetId: number;
    sourceKind: "store" | "teacher" | "tender";
    sourceId: number;
    itemName: string;
    quantity: number;
    unitPrice: number;
  },
) {
  for (let attempt = 0; attempt < 6; attempt += 1) {
    const orderNo = `PO-${schoolDate().replaceAll("-", "")}-${fourDigits()}`;
    try {
      const inserted = await db.insert(poOrders).values(
        withTenant(
          {
            orderNo,
            vendorId: input.vendorId,
            budgetId: input.budgetId,
            sourceKind: input.sourceKind,
            sourceId: input.sourceId,
            itemName: input.itemName,
            quantity: money(input.quantity),
            unitPrice: money(input.unitPrice),
            status: "Issued",
            receivedQty: money(0),
            note: "",
            recordedBy: userId,
          },
          tenantId,
        ),
      );
      await writeAudit(tenantId, userId, "procurement.order", orderNo);
      return { id: insertId(inserted), orderNo };
    } catch (error) {
      if (!isDuplicate(error)) throw error;
      const [taken] = await db
        .select({ id: poOrders.orderId })
        .from(poOrders)
        .where(scoped(poOrders, tenantId, and(eq(poOrders.sourceKind, input.sourceKind), eq(poOrders.sourceId, input.sourceId))))
        .limit(1);
      if (taken) throw new ProcurementError("ALREADY_DECIDED");
    }
  }
  throw new ProcurementError("DUPLICATE_CODE");
}

export async function createOrder(tenantId: number, userId: number, input: OrderInput) {
  const today = schoolDate();
  const vendor = await requireVendor(tenantId, input.vendorId, today);
  if (input.sourceKind === "tender") {
    const [award] = await db
      .select({
        vendorId: poAwards.vendorId,
        amount: poBids.amount,
        budgetId: poTenders.budgetId,
        itemName: poTenders.itemName,
        quantity: poTenders.quantity,
      })
      .from(poAwards)
      .innerJoin(poBids, and(eq(poBids.bidId, poAwards.bidId), eq(poBids.tenantId, tenantId)))
      .innerJoin(poTenders, and(eq(poTenders.tenderId, poAwards.tenderId), eq(poTenders.tenantId, tenantId)))
      .where(scoped(poAwards, tenantId, eq(poAwards.tenderId, input.sourceId)))
      .limit(1);
    if (!award || award.vendorId !== vendor.id) throw new ProcurementError("NOT_APPROVED");
    const quantity = num(award.quantity);
    return insertOrder(tenantId, userId, {
      vendorId: vendor.id,
      budgetId: award.budgetId,
      sourceKind: "tender",
      sourceId: input.sourceId,
      itemName: award.itemName,
      quantity,
      unitPrice: quantity === 0 ? 0 : num(award.amount) / quantity,
    });
  }

  const [approval] = await db
    .select({
      status: poApprovals.status,
      budgetId: poApprovals.budgetId,
      quantity: poApprovals.quantity,
      unitPrice: poApprovals.unitPrice,
    })
    .from(poApprovals)
    .where(scoped(poApprovals, tenantId, and(eq(poApprovals.sourceKind, input.sourceKind), eq(poApprovals.sourceId, input.sourceId))))
    .limit(1);
  if (!approval || approval.status !== "Approved" || approval.budgetId == null) throw new ProcurementError("NOT_APPROVED");
  return insertOrder(tenantId, userId, {
    vendorId: vendor.id,
    budgetId: approval.budgetId,
    sourceKind: input.sourceKind,
    sourceId: input.sourceId,
    itemName: await sourceItem(tenantId, input.sourceKind, input.sourceId),
    quantity: num(approval.quantity),
    unitPrice: num(approval.unitPrice),
  });
}

export async function listOrders(tenantId: number) {
  const rows = await db
    .select({
      id: poOrders.orderId,
      orderNo: poOrders.orderNo,
      vendor: poVendors.supplierName,
      itemName: poOrders.itemName,
      quantity: poOrders.quantity,
      unitPrice: poOrders.unitPrice,
      status: poOrders.status,
      received: poOrders.receivedQty,
      sourceKind: poOrders.sourceKind,
      createdAt: poOrders.createdAt,
    })
    .from(poOrders)
    .innerJoin(poVendors, and(eq(poVendors.vendorId, poOrders.vendorId), eq(poVendors.tenantId, tenantId)))
    .where(scoped(poOrders, tenantId))
    .orderBy(desc(poOrders.orderId));
  return {
    rows: rows.map((row) => ({
      id: row.id,
      orderNo: row.orderNo,
      vendor: row.vendor,
      itemName: row.itemName,
      quantity: num(row.quantity),
      unitPrice: num(row.unitPrice),
      total: lineTotal(num(row.quantity), num(row.unitPrice)),
      status: row.status,
      received: num(row.received),
      sourceKind: row.sourceKind,
      createdAt: row.createdAt,
    })),
  };
}

export async function getOrder(tenantId: number, orderId: number) {
  const [row] = await db
    .select({
      id: poOrders.orderId,
      orderNo: poOrders.orderNo,
      vendor: poVendors.supplierName,
      licenseNo: poVendors.licenseNo,
      itemName: poOrders.itemName,
      quantity: poOrders.quantity,
      unitPrice: poOrders.unitPrice,
      status: poOrders.status,
      received: poOrders.receivedQty,
      budgetCode: poBudgets.code,
      fiscalYear: poBudgets.fiscalYear,
      createdAt: poOrders.createdAt,
      school: tenants.name,
    })
    .from(poOrders)
    .innerJoin(poVendors, and(eq(poVendors.vendorId, poOrders.vendorId), eq(poVendors.tenantId, tenantId)))
    .innerJoin(poBudgets, and(eq(poBudgets.budgetId, poOrders.budgetId), eq(poBudgets.tenantId, tenantId)))
    .innerJoin(tenants, eq(tenants.id, poOrders.tenantId))
    .where(scoped(poOrders, tenantId, eq(poOrders.orderId, orderId)))
    .limit(1);
  if (!row) throw new ProcurementError("NOT_FOUND");
  return {
    id: row.id,
    orderNo: row.orderNo,
    vendor: row.vendor,
    licenseNo: row.licenseNo,
    itemName: row.itemName,
    quantity: num(row.quantity),
    unitPrice: num(row.unitPrice),
    total: lineTotal(num(row.quantity), num(row.unitPrice)),
    status: row.status,
    received: num(row.received),
    budgetCode: row.budgetCode,
    fiscalYear: row.fiscalYear,
    createdAt: row.createdAt,
    school: row.school,
  };
}

export async function receiveOrder(tenantId: number, userId: number, orderId: number, quantity: number) {
  const [row] = await db
    .select({
      status: poOrders.status,
      ordered: poOrders.quantity,
      received: poOrders.receivedQty,
    })
    .from(poOrders)
    .where(scoped(poOrders, tenantId, eq(poOrders.orderId, orderId)))
    .limit(1);
  if (!row) throw new ProcurementError("NOT_FOUND");
  if (row.status === "Delivered") throw new ProcurementError("ALREADY_DELIVERED");
  const next = nextReceipt(num(row.ordered), num(row.received), quantity);
  if (next === "over") throw new ProcurementError("OVER_RECEIPT");
  await db
    .update(poOrders)
    .set({ receivedQty: money(next.received), status: next.status })
    .where(scoped(poOrders, tenantId, eq(poOrders.orderId, orderId)));
  await writeAudit(tenantId, userId, "procurement.delivery", `${orderId} ${next.status}`);
  return { id: orderId, ...next };
}

export async function listTenders(tenantId: number) {
  const today = schoolDate();
  const rows = await db
    .select({
      id: poTenders.tenderId,
      title: poTenders.title,
      itemName: poTenders.itemName,
      quantity: poTenders.quantity,
      closesOn: poTenders.closesOn,
      status: poTenders.status,
      budgetId: poTenders.budgetId,
      code: poBudgets.code,
    })
    .from(poTenders)
    .innerJoin(poBudgets, and(eq(poBudgets.budgetId, poTenders.budgetId), eq(poBudgets.tenantId, tenantId)))
    .where(scoped(poTenders, tenantId))
    .orderBy(desc(poTenders.tenderId));
  return {
    rows: rows.map((row) => ({
      id: row.id,
      title: row.title,
      itemName: row.itemName,
      quantity: num(row.quantity),
      closesOn: row.closesOn,
      status: row.status,
      budgetId: row.budgetId,
      budgetCode: row.code,
      open: row.status === "Open" && row.closesOn >= today,
    })),
  };
}

export async function createTender(tenantId: number, userId: number, input: TenderInput) {
  await requireBudget(tenantId, input.budgetId);
  const inserted = await db.insert(poTenders).values(
    withTenant(
      {
        title: input.title,
        itemName: input.itemName,
        quantity: money(input.quantity),
        closesOn: input.closesOn,
        status: "Open",
        budgetId: input.budgetId,
        recordedBy: userId,
      },
      tenantId,
    ),
  );
  await writeAudit(tenantId, userId, "procurement.tender", input.title);
  return { id: insertId(inserted) };
}

async function bidRows(tenantId: number, tenderId: number) {
  const today = schoolDate();
  const rows = await db
    .select({
      id: poBids.bidId,
      vendorId: poBids.vendorId,
      vendor: poVendors.supplierName,
      amount: poBids.amount,
      note: poBids.note,
      createdAt: poBids.createdAt,
      status: poVendors.status,
      licenseExpires: poVendors.licenseExpires,
    })
    .from(poBids)
    .innerJoin(poVendors, and(eq(poVendors.vendorId, poBids.vendorId), eq(poVendors.tenantId, tenantId)))
    .where(scoped(poBids, tenantId, eq(poBids.tenderId, tenderId)));
  return rankBids(
    rows.map((row) => ({
      id: row.id,
      vendorId: row.vendorId,
      vendor: row.vendor,
      amount: num(row.amount),
      note: row.note,
      createdAt: row.createdAt,
      licenseExpires: row.licenseExpires,
      valid: row.status === "Active" && licenseCurrent(row.licenseExpires, today),
    })),
  );
}

export async function tenderMatrix(tenantId: number, tenderId: number) {
  const [tender] = await db
    .select({
      id: poTenders.tenderId,
      title: poTenders.title,
      itemName: poTenders.itemName,
      quantity: poTenders.quantity,
      closesOn: poTenders.closesOn,
      status: poTenders.status,
      budgetId: poTenders.budgetId,
    })
    .from(poTenders)
    .where(scoped(poTenders, tenantId, eq(poTenders.tenderId, tenderId)))
    .limit(1);
  if (!tender) throw new ProcurementError("NOT_FOUND");
  const rows = await bidRows(tenantId, tenderId);
  const winner = rows.find((row) => row.valid) ?? null;
  const [order] = await db
    .select({ id: poOrders.orderId })
    .from(poOrders)
    .where(scoped(poOrders, tenantId, and(eq(poOrders.sourceKind, "tender"), eq(poOrders.sourceId, tenderId))))
    .limit(1);
  return {
    tender: { ...tender, quantity: num(tender.quantity) },
    rows,
    winnerId: winner?.id ?? null,
    orderId: order?.id ?? null,
  };
}

export async function awardTender(tenantId: number, userId: number, tenderId: number) {
  const [tender] = await db
    .select({ status: poTenders.status, budgetId: poTenders.budgetId, title: poTenders.title })
    .from(poTenders)
    .where(scoped(poTenders, tenantId, eq(poTenders.tenderId, tenderId)))
    .limit(1);
  if (!tender) throw new ProcurementError("NOT_FOUND");
  if (tender.status === "Awarded") throw new ProcurementError("ALREADY_AWARDED");
  if (tender.status !== "Open") throw new ProcurementError("TENDER_CLOSED");
  const winner = winningBid(await bidRows(tenantId, tenderId));
  if (!winner) throw new ProcurementError("NO_VALID_BID");
  const budget = await requireBudget(tenantId, tender.budgetId);
  const spent = await committed(tenantId, budget.id);
  if (!fitsBudget(budget.allocated, spent, winner.amount)) throw new ProcurementError("OVER_BUDGET");
  const letterNo = `AW-${String(tenderId).padStart(4, "0")}`;
  try {
    const inserted = await db.insert(poAwards).values(
      withTenant(
        { tenderId, bidId: winner.id, vendorId: winner.vendorId, letterNo },
        tenantId,
      ),
    );
    await db
      .update(poTenders)
      .set({ status: "Awarded" })
      .where(scoped(poTenders, tenantId, eq(poTenders.tenderId, tenderId)));
    await writeAudit(tenantId, userId, "procurement.award", `${letterNo} ${tender.title}`);
    return { id: insertId(inserted), letterNo, bidId: winner.id };
  } catch (error) {
    if (isDuplicate(error)) throw new ProcurementError("ALREADY_AWARDED");
    throw error;
  }
}

export async function publicTenders(slug: string) {
  const tenantId = await activeTenant(slug);
  const today = schoolDate();
  const [school] = await db.select({ name: tenants.name }).from(tenants).where(eq(tenants.id, tenantId)).limit(1);
  const rows = await db
    .select({
      id: poTenders.tenderId,
      title: poTenders.title,
      itemName: poTenders.itemName,
      quantity: poTenders.quantity,
      closesOn: poTenders.closesOn,
    })
    .from(poTenders)
    .where(scoped(poTenders, tenantId, and(eq(poTenders.status, "Open"), sql`${poTenders.closesOn} >= ${today}`)))
    .orderBy(asc(poTenders.closesOn));
  return {
    school: school?.name ?? "",
    rows: rows.map((row) => ({ ...row, quantity: num(row.quantity) })),
  };
}

export async function vendorLogin(input: { tenantSlug: string; username: string; password: string }) {
  const tenantId = await activeTenant(input.tenantSlug).catch(() => {
    throw new ProcurementError("AUTH_INVALID_CREDENTIALS");
  });
  const [vendor] = await db
    .select({
      id: poVendors.vendorId,
      passwordHash: poVendors.passwordHash,
      status: poVendors.status,
    })
    .from(poVendors)
    .where(scoped(poVendors, tenantId, eq(poVendors.username, input.username)))
    .limit(1);
  if (!vendor) throw new ProcurementError("AUTH_INVALID_CREDENTIALS");
  const verified = await verifyPassword(input.password, vendor.passwordHash);
  if (!verified.ok) throw new ProcurementError("AUTH_INVALID_CREDENTIALS");
  if (vendor.status !== "Active") throw new ProcurementError("VENDOR_SUSPENDED");
  return {
    accessToken: createVendorToken({ vendorId: vendor.id, tenantId }),
    vendorId: vendor.id,
  };
}

export async function vendorDesk(tenantId: number, vendorId: number) {
  const today = schoolDate();
  const [vendor] = await db
    .select({
      id: poVendors.vendorId,
      name: poVendors.supplierName,
      contact: poVendors.contactName,
      phone: poVendors.phone,
      email: poVendors.email,
      licenseNo: poVendors.licenseNo,
      licenseExpires: poVendors.licenseExpires,
      status: poVendors.status,
      username: poVendors.username,
    })
    .from(poVendors)
    .where(scoped(poVendors, tenantId, eq(poVendors.vendorId, vendorId)))
    .limit(1);
  if (!vendor || vendor.status !== "Active") throw new ProcurementError("AUTH_INVALID_CREDENTIALS");
  const open = await publicTenders((await db.select({ slug: tenants.slug }).from(tenants).where(eq(tenants.id, tenantId)).limit(1))[0]?.slug ?? "");
  const bids = await db
    .select({
      id: poBids.bidId,
      tenderId: poBids.tenderId,
      title: poTenders.title,
      amount: poBids.amount,
      createdAt: poBids.createdAt,
    })
    .from(poBids)
    .innerJoin(poTenders, and(eq(poTenders.tenderId, poBids.tenderId), eq(poTenders.tenantId, tenantId)))
    .where(scoped(poBids, tenantId, eq(poBids.vendorId, vendorId)))
    .orderBy(desc(poBids.bidId));
  const awards = await db
    .select({
      id: poAwards.awardId,
      letterNo: poAwards.letterNo,
      title: poTenders.title,
      itemName: poTenders.itemName,
      amount: poBids.amount,
      createdAt: poAwards.createdAt,
    })
    .from(poAwards)
    .innerJoin(poTenders, and(eq(poTenders.tenderId, poAwards.tenderId), eq(poTenders.tenantId, tenantId)))
    .innerJoin(poBids, and(eq(poBids.bidId, poAwards.bidId), eq(poBids.tenantId, tenantId)))
    .where(scoped(poAwards, tenantId, eq(poAwards.vendorId, vendorId)))
    .orderBy(desc(poAwards.awardId));
  return {
    vendor: vendorView(vendor, today),
    tenders: open.rows,
    bids: bids.map((row) => ({ ...row, amount: num(row.amount) })),
    awards: awards.map((row) => ({ ...row, amount: num(row.amount) })),
  };
}

export async function placeBid(tenantId: number, vendorId: number, input: BidInput) {
  const today = schoolDate();
  await requireVendor(tenantId, vendorId, today);
  const [tender] = await db
    .select({ status: poTenders.status, closesOn: poTenders.closesOn })
    .from(poTenders)
    .where(scoped(poTenders, tenantId, eq(poTenders.tenderId, input.tenderId)))
    .limit(1);
  if (!tender) throw new ProcurementError("NOT_FOUND");
  if (tender.status !== "Open" || tender.closesOn < today) throw new ProcurementError("TENDER_CLOSED");
  try {
    const inserted = await db.insert(poBids).values(
      withTenant(
        {
          tenderId: input.tenderId,
          vendorId,
          amount: money(input.amount),
          note: input.note,
        },
        tenantId,
      ),
    );
    return { id: insertId(inserted) };
  } catch (error) {
    if (isDuplicate(error)) throw new ProcurementError("ALREADY_BID");
    throw error;
  }
}

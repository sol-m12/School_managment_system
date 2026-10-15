import { z } from "zod";

const money = z.number().finite().min(0);
const qty = z.number().finite().positive();

export const categoryBodySchema = z.object({
  categoryCode: z.string().trim().min(1).max(50),
  categoryName: z.string().trim().min(1).max(150),
  description: z.string().trim().max(2000).optional().default(""),
});

export const itemBodySchema = z.object({
  itemName: z.string().trim().min(1).max(255),
  categoryId: z.number().int().positive(),
  itemCode: z.string().trim().min(1).max(50),
  modelNo: z.string().trim().max(100).optional().default(""),
  unitOfMeasure: z.string().trim().min(1).max(50),
  unitCost: money.optional().default(0),
  reorderLevel: z.number().int().min(0).max(100000).optional().default(5),
  storeNo: z.string().trim().max(100).optional().default(""),
  shelfNo: z.string().trim().max(100).optional().default(""),
  isPerishable: z.boolean().optional().default(false),
  expiryDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional().default(null),
  specification: z.string().trim().max(4000).optional().default(""),
  itemType: z.enum(["fixed_asset", "consumable"]).optional().default("consumable"),
});

export const codeQuerySchema = z.object({
  categoryId: z.coerce.number().int().positive(),
  style: z.enum(["str", "category"]).optional().default("str"),
});

export const grnBodySchema = z.object({
  grnNumber: z.string().trim().min(1).max(50),
  dateReceived: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  department: z.string().trim().max(150).optional().default(""),
  supplierId: z.number().int().positive().nullable().optional().default(null),
  itemId: z.number().int().positive(),
  quantityReceived: qty,
  unitPrice: money,
});

export const binQuerySchema = z.object({
  itemId: z.coerce.number().int().min(0).optional().default(0),
  fromDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().default(""),
  toDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().default(""),
  trxType: z.enum(["", "IN", "OUT"]).optional().default(""),
});

export const inflowBodySchema = z.object({
  itemId: z.number().int().positive(),
  inflowType: z.enum(["DONATION", "TRANSFER", "LOAN_RETURN", "FOUND_SURPLUS"]),
  sourceEntity: z.string().trim().min(1).max(200),
  quantity: z.number().int().positive(),
  unitEstimatedCost: money.optional().default(0),
  referenceDocNo: z.string().trim().min(1).max(100),
  remarks: z.string().trim().max(255).optional().default(""),
});

export const requisitionActionSchema = z.object({
  action: z.enum(["forward", "reject"]),
});

export const idParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});

export const issueBodySchema = z.object({
  requisitionId: z.number().int().positive(),
  voucherNo: z.string().trim().min(1).max(100),
});

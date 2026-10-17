import { z } from "zod";

const dateText = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const money = z.number().positive().max(1_000_000_000);
const qty = z.number().positive().max(1_000_000);

export const idParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});

export const slugQuerySchema = z.object({
  slug: z.string().trim().min(1).max(100),
});

export const vendorBodySchema = z.object({
  supplierName: z.string().trim().min(1).max(200),
  contactName: z.string().trim().max(120).default(""),
  phone: z.string().trim().max(50).default(""),
  email: z.string().trim().max(100).default(""),
  licenseNo: z.string().trim().max(80).default(""),
  licenseExpires: dateText,
});

export const vendorStatusSchema = z.object({
  status: z.enum(["Active", "Suspended"]),
});

export const budgetBodySchema = z.object({
  fiscalYear: z.string().trim().regex(/^\d{4}$/),
  code: z.string().trim().min(1).max(40),
  title: z.string().trim().min(1).max(160),
  allocated: money,
});

export const checkBodySchema = z.object({
  sourceKind: z.enum(["store", "teacher"]),
  sourceId: z.number().int().positive(),
});

export const approvalBodySchema = z
  .object({
    sourceKind: z.enum(["store", "teacher"]),
    sourceId: z.number().int().positive(),
    budgetId: z.number().int().positive().nullable(),
    quantity: qty,
    unitPrice: z.number().min(0).max(1_000_000_000),
    decision: z.enum(["Approved", "Refused"]),
    note: z.string().trim().max(500).default(""),
  })
  .superRefine((value, ctx) => {
    if (value.decision === "Approved" && (value.budgetId == null || value.unitPrice <= 0)) {
      ctx.addIssue({ code: "custom", path: ["budgetId"] });
    }
  });

export const orderBodySchema = z.object({
  sourceKind: z.enum(["store", "teacher", "tender"]),
  sourceId: z.number().int().positive(),
  vendorId: z.number().int().positive(),
});

export const receiptBodySchema = z.object({
  quantity: qty,
});

export const tenderBodySchema = z.object({
  title: z.string().trim().min(1).max(160),
  itemName: z.string().trim().min(1).max(160),
  quantity: qty,
  closesOn: dateText,
  budgetId: z.number().int().positive(),
});

export const vendorLoginSchema = z.object({
  tenantSlug: z.string().trim().min(1).max(100),
  username: z.string().trim().min(1).max(50),
  password: z.string().min(1).max(200),
});

export const bidBodySchema = z.object({
  tenderId: z.number().int().positive(),
  amount: money,
  note: z.string().trim().max(500).default(""),
});

export type VendorInput = z.infer<typeof vendorBodySchema>;
export type BudgetInput = z.infer<typeof budgetBodySchema>;
export type CheckInput = z.infer<typeof checkBodySchema>;
export type ApprovalInput = z.infer<typeof approvalBodySchema>;
export type OrderInput = z.infer<typeof orderBodySchema>;
export type TenderInput = z.infer<typeof tenderBodySchema>;
export type BidInput = z.infer<typeof bidBodySchema>;

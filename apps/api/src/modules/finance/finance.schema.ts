import { z } from "zod";

const id = z.number().int().positive();
const optionalId = z.number().int().positive().nullable().optional().default(null);
const money = z.number().finite().min(0);
const day = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

export const lookupQuerySchema = z.object({
  page: z.enum(["budget", "setup", "ledger", "mehi7"]),
});

export const codeBodySchema = z.object({
  typeName: z.string().trim().min(1).max(120),
  codeNumber: z.string().trim().min(1).max(50),
  codeNameAm: z.string().trim().min(1).max(255),
  codeNameEn: z.string().trim().max(255).optional().default(""),
  match: z.enum(["like", "exact"]).optional().default("like"),
});

export const cardQuerySchema = z.object({
  search: z.string().trim().max(200).optional().default(""),
  fiscalYear: z.string().trim().max(10).optional().default(""),
  budgetTypeId: z.coerce.number().int().min(0).optional().default(0),
  sourceCodeId: z.coerce.number().int().min(0).optional().default(0),
  programId: z.coerce.number().int().min(0).optional().default(0),
});

export const idParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});

const budgetLineSchema = z.object({
  accountCodeId: id,
  treasuryAmount: money.optional().default(0),
  retainedAmount: money.optional().default(0),
  assistanceAmount: money.optional().default(0),
  loanAmount: money.optional().default(0),
});

export const budgetBodySchema = z.object({
  fiscalYear: z.string().trim().min(1).max(10),
  letterRefNo: z.string().trim().min(1).max(100),
  notificationDate: day,
  publicBodyCodeId: id,
  programCodeId: id,
  subProgramCodeId: optionalId,
  projectCodeId: optionalId,
  subAgencyCodeId: optionalId,
  sourceCodeId: optionalId,
  budgetTypeId: optionalId,
  lines: z.array(budgetLineSchema).min(1).max(80),
});

export const mehi17BodySchema = z.object({
  fiscalYear: z.string().trim().min(1).max(10),
  publicBodyCodeId: id,
  subAgencyCodeId: optionalId,
  programCodeId: id,
  subProgramCodeId: optionalId,
  projectCodeId: optionalId,
  sourceCodeId: id,
  budgetTypeId: id,
  accountCodeId: optionalId,
  accountName: z.string().trim().max(255).optional().default(""),
  bankAccountNo: z.string().trim().min(1).max(100),
  openingBalance: money.optional().default(0),
  description: z.string().trim().min(1).max(500),
  registerMonth: z.string().trim().min(1).max(30),
});

export const mehi17FindSchema = z.object({
  fiscalYear: z.string().trim().min(1).max(10),
  sourceCodeId: z.coerce.number().int().positive(),
  accountType: z.enum(["Bank", "Cash"]),
});

export const balanceQuerySchema = z.object({
  accountId: z.coerce.number().int().positive(),
  sourceId: z.coerce.number().int().positive(),
  budgetTypeId: z.coerce.number().int().positive(),
});

export const accountQuerySchema = z.object({
  accountId: z.coerce.number().int().positive(),
});

const mehi7LineSchema = z.object({
  entryType: z.enum(["debit", "credit"]),
  accountCodeId: optionalId,
  budgetCategoryId: optionalId,
  budgetSourceId: optionalId,
  m17CardId: optionalId,
  debitAmount: money.optional().default(0),
  creditAmount: money.optional().default(0),
});

export const mehi7BodySchema = z.object({
  serialNo: z.string().trim().min(1).max(100),
  voucherDate: day,
  payeeName: z.string().trim().min(1).max(255),
  modeOfPayment: z.enum(["Check", "Bank_Transfer", "Cash"]),
  checkNo: z.string().trim().max(100).optional().default(""),
  purpose: z.string().trim().min(1).max(500),
  publicBodyCodeId: id.optional().default(1),
  programCodeId: id.optional().default(1),
  lines: z.array(mehi7LineSchema).min(1).max(40),
});

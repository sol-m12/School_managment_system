import { z } from "zod";

export const idParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});

export const searchQuerySchema = z.object({
  q: z.string().trim().min(1).max(80),
});

export const routeBodySchema = z.object({
  itemId: z.number().int().positive(),
  quantity: z.number().positive().max(1_000_000),
  note: z.string().trim().max(500).default(""),
});

export const assetBodySchema = z.object({
  itemId: z.number().int().positive(),
  serialNo: z.string().trim().max(80).default(""),
  location: z.string().trim().max(150).default(""),
});

export const disposalBodySchema = z.object({
  itemId: z.number().int().positive(),
  assetId: z.number().int().positive().nullable().default(null),
  quantity: z.number().positive().max(1_000_000),
  kind: z.enum(["damage", "disposal"]),
  note: z.string().trim().min(1).max(500),
});

export const loanBodySchema = z.object({
  assetId: z.number().int().positive(),
  borrowerName: z.string().trim().min(1).max(150),
  purpose: z.string().trim().max(255).default(""),
  dueOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

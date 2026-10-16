import { Router, type Request, type Response } from "express";
import type { ZodType } from "zod";
import { requirePermission } from "../../middleware/requirePermission.js";
import {
  accountQuerySchema,
  balanceQuerySchema,
  budgetBodySchema,
  cardQuerySchema,
  codeBodySchema,
  idParamSchema,
  lookupQuerySchema,
  mehi17BodySchema,
  mehi17FindSchema,
  mehi7BodySchema,
} from "./finance.schema.js";
import { FinanceError, type FinanceErrorCode } from "./finance.service.js";
import * as finance from "./finance.service.js";

export const financeRouter = Router();

const STATUS: Record<FinanceErrorCode, number> = {
  NO_CARD: 404,
  CARD_NOT_FOUND: 404,
  CARD_HAS_EXPENDITURE: 409,
  ZERO_BUDGET: 400,
  DUPLICATE_MEHI17: 409,
  MISSING_LINE: 400,
  MISSING_CODES: 400,
  NO_M16_CARD: 409,
  INSUFFICIENT_BUDGET: 409,
  NO_M17_CARD: 400,
  INSUFFICIENT_CASH: 409,
};

function sendError(res: Response, error: unknown): void {
  if (error instanceof FinanceError) {
    res.status(STATUS[error.code]).json({ code: error.code, ...error.details });
    return;
  }
  res.status(500).json({ code: "INTERNAL_ERROR" });
}

function tenantOf(req: Request): number {
  if (!req.auth) throw new Error("authenticate must run first");
  return req.auth.tenantId;
}

function userOf(req: Request): number {
  if (!req.auth) throw new Error("authenticate must run first");
  return req.auth.userId;
}

function parseBody<T>(schema: ZodType<T>, req: Request, res: Response): T | null {
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ code: "VALIDATION_ERROR" });
    return null;
  }
  return parsed.data;
}

function parseQuery<T>(schema: ZodType<T>, req: Request, res: Response): T | null {
  const parsed = schema.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ code: "VALIDATION_ERROR" });
    return null;
  }
  return parsed.data;
}

const guard = requirePermission("store.finance");

financeRouter.get("/lookups", ...guard, async (req, res) => {
  const query = parseQuery(lookupQuerySchema, req, res);
  if (!query) return;
  try {
    res.json(await finance.financeLookups(tenantOf(req), query.page));
  } catch (error) {
    sendError(res, error);
  }
});

financeRouter.post("/codes", ...guard, async (req, res) => {
  const input = parseBody(codeBodySchema, req, res);
  if (!input) return;
  try {
    res.status(201).json(await finance.addFinanceCode(tenantOf(req), input));
  } catch (error) {
    sendError(res, error);
  }
});

financeRouter.get("/cards", ...guard, async (req, res) => {
  const query = parseQuery(cardQuerySchema, req, res);
  if (!query) return;
  try {
    res.json(await finance.listLedgerCards(tenantOf(req), query));
  } catch (error) {
    sendError(res, error);
  }
});

financeRouter.get("/cards/latest", ...guard, async (req, res) => {
  try {
    res.json(await finance.ledgerCardDetail(tenantOf(req), null));
  } catch (error) {
    sendError(res, error);
  }
});

financeRouter.get("/cards/:id", ...guard, async (req, res) => {
  const params = idParamSchema.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ code: "VALIDATION_ERROR" });
    return;
  }
  try {
    res.json(await finance.ledgerCardDetail(tenantOf(req), params.data.id));
  } catch (error) {
    sendError(res, error);
  }
});

financeRouter.delete("/cards/:id", ...guard, async (req, res) => {
  const params = idParamSchema.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ code: "VALIDATION_ERROR" });
    return;
  }
  try {
    await finance.deleteLedgerCard(tenantOf(req), params.data.id);
    res.json({ ok: true });
  } catch (error) {
    sendError(res, error);
  }
});

financeRouter.post("/budget", ...guard, async (req, res) => {
  const input = parseBody(budgetBodySchema, req, res);
  if (!input) return;
  try {
    res.status(201).json(await finance.saveBudget(tenantOf(req), userOf(req), input));
  } catch (error) {
    sendError(res, error);
  }
});

financeRouter.get("/mehi17/find", ...guard, async (req, res) => {
  const query = parseQuery(mehi17FindSchema, req, res);
  if (!query) return;
  try {
    res.json(await finance.findMehi17(tenantOf(req), query.fiscalYear, query.sourceCodeId, query.accountType));
  } catch (error) {
    sendError(res, error);
  }
});

financeRouter.get("/mehi17", ...guard, async (req, res) => {
  const selected = zNumber(req.query.selectedId);
  try {
    res.json(await finance.mehi17Board(tenantOf(req), selected));
  } catch (error) {
    sendError(res, error);
  }
});

financeRouter.post("/mehi17", ...guard, async (req, res) => {
  const input = parseBody(mehi17BodySchema, req, res);
  if (!input) return;
  try {
    res.status(201).json(await finance.openMehi17(tenantOf(req), userOf(req), input));
  } catch (error) {
    sendError(res, error);
  }
});

financeRouter.get("/mehi7/hint", ...guard, async (req, res) => {
  const query = parseQuery(accountQuerySchema, req, res);
  if (!query) return;
  try {
    res.json(await finance.accountBudgetHint(tenantOf(req), query.accountId));
  } catch (error) {
    sendError(res, error);
  }
});

financeRouter.get("/mehi7/balance", ...guard, async (req, res) => {
  const query = parseQuery(balanceQuerySchema, req, res);
  if (!query) return;
  try {
    res.json(await finance.m16Balance(tenantOf(req), query.accountId, query.sourceId, query.budgetTypeId));
  } catch (error) {
    sendError(res, error);
  }
});

financeRouter.post("/mehi7", ...guard, async (req, res) => {
  const input = parseBody(mehi7BodySchema, req, res);
  if (!input) return;
  try {
    res.status(201).json(await finance.saveMehi7(tenantOf(req), userOf(req), input));
  } catch (error) {
    sendError(res, error);
  }
});

function zNumber(value: unknown): number | null {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

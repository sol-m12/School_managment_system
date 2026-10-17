import { Router, type Request, type Response } from "express";
import type { ZodType } from "zod";
import { requirePermission } from "../../middleware/requirePermission.js";
import {
  assetBodySchema,
  disposalBodySchema,
  idParamSchema,
  loanBodySchema,
  routeBodySchema,
  searchQuerySchema,
  tagQuerySchema,
} from "./office.schema.js";
import { OfficeError, type OfficeErrorCode } from "./office.service.js";
import * as office from "./office.service.js";

export const storeOfficeRouter = Router();

const guard = requirePermission("store.office");

const STATUS: Record<OfficeErrorCode, number> = {
  NOT_FOUND: 404,
  STOCK_ADEQUATE: 409,
  ALREADY_ROUTED: 409,
  NOT_FIXED: 409,
  INSUFFICIENT_STOCK: 409,
  NOT_READY: 409,
};

function sendError(res: Response, error: unknown): void {
  if (error instanceof OfficeError) {
    res.status(STATUS[error.code]).json({ code: error.code });
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

function parseId(req: Request, res: Response): number | null {
  const parsed = idParamSchema.safeParse(req.params);
  if (!parsed.success) {
    res.status(404).json({ code: "NOT_FOUND" });
    return null;
  }
  return parsed.data.id;
}

storeOfficeRouter.get("/procurement", ...guard, async (req, res) => {
  try {
    res.json(await office.procurementBoard(tenantOf(req)));
  } catch (error) {
    sendError(res, error);
  }
});

storeOfficeRouter.post("/procurement", ...guard, async (req, res) => {
  const input = parseBody(routeBodySchema, req, res);
  if (!input) return;
  try {
    res.status(201).json(await office.routePurchase(tenantOf(req), userOf(req), input));
  } catch (error) {
    sendError(res, error);
  }
});

storeOfficeRouter.get("/search", ...guard, async (req, res) => {
  const parsed = searchQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ code: "VALIDATION_ERROR" });
    return;
  }
  try {
    res.json(await office.searchInventory(tenantOf(req), parsed.data.q));
  } catch (error) {
    sendError(res, error);
  }
});

storeOfficeRouter.get("/alerts", ...guard, async (req, res) => {
  try {
    res.json(await office.listAlerts(tenantOf(req)));
  } catch (error) {
    sendError(res, error);
  }
});

storeOfficeRouter.post("/alerts/:id/seen", ...guard, async (req, res) => {
  const id = parseId(req, res);
  if (!id) return;
  try {
    res.json(await office.seeAlert(tenantOf(req), userOf(req), id));
  } catch (error) {
    sendError(res, error);
  }
});

storeOfficeRouter.post("/alerts/:id/route", ...guard, async (req, res) => {
  const id = parseId(req, res);
  if (!id) return;
  try {
    res.status(201).json(await office.routeAlert(tenantOf(req), userOf(req), id));
  } catch (error) {
    sendError(res, error);
  }
});

storeOfficeRouter.get("/assets/lookup", ...guard, async (req, res) => {
  const parsed = tagQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ code: "VALIDATION_ERROR" });
    return;
  }
  try {
    res.json(await office.lookupAsset(tenantOf(req), parsed.data.tag));
  } catch (error) {
    sendError(res, error);
  }
});

storeOfficeRouter.get("/assets", ...guard, async (req, res) => {
  try {
    res.json(await office.assetBoard(tenantOf(req)));
  } catch (error) {
    sendError(res, error);
  }
});

storeOfficeRouter.post("/assets", ...guard, async (req, res) => {
  const input = parseBody(assetBodySchema, req, res);
  if (!input) return;
  try {
    res.status(201).json(await office.registerAsset(tenantOf(req), userOf(req), input));
  } catch (error) {
    sendError(res, error);
  }
});

storeOfficeRouter.get("/disposals", ...guard, async (req, res) => {
  try {
    res.json(await office.disposalBoard(tenantOf(req)));
  } catch (error) {
    sendError(res, error);
  }
});

storeOfficeRouter.post("/disposals", ...guard, async (req, res) => {
  const input = parseBody(disposalBodySchema, req, res);
  if (!input) return;
  try {
    res.status(201).json(await office.recordDisposal(tenantOf(req), userOf(req), input));
  } catch (error) {
    sendError(res, error);
  }
});

storeOfficeRouter.get("/loans", ...guard, async (req, res) => {
  try {
    res.json(await office.loanBoard(tenantOf(req)));
  } catch (error) {
    sendError(res, error);
  }
});

storeOfficeRouter.post("/loans", ...guard, async (req, res) => {
  const input = parseBody(loanBodySchema, req, res);
  if (!input) return;
  try {
    res.status(201).json(await office.lendAsset(tenantOf(req), userOf(req), input));
  } catch (error) {
    sendError(res, error);
  }
});

storeOfficeRouter.post("/loans/:id/return", ...guard, async (req, res) => {
  const id = parseId(req, res);
  if (!id) return;
  try {
    res.json(await office.returnAsset(tenantOf(req), userOf(req), id));
  } catch (error) {
    sendError(res, error);
  }
});

storeOfficeRouter.get("/forecast", ...guard, async (req, res) => {
  try {
    res.json(await office.forecastBoard(tenantOf(req)));
  } catch (error) {
    sendError(res, error);
  }
});

storeOfficeRouter.get("/reports", ...guard, async (req, res) => {
  try {
    res.json(await office.storeReport(tenantOf(req)));
  } catch (error) {
    sendError(res, error);
  }
});

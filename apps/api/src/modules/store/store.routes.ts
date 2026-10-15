import { Router, type Request, type Response } from "express";
import type { ZodType } from "zod";
import { requirePermission } from "../../middleware/requirePermission.js";
import {
  binQuerySchema,
  categoryBodySchema,
  codeQuerySchema,
  grnBodySchema,
  idParamSchema,
  inflowBodySchema,
  issueBodySchema,
  itemBodySchema,
  requisitionActionSchema,
} from "./store.schema.js";
import { StoreError, type StoreErrorCode } from "./store.service.js";
import * as store from "./store.service.js";

export const storeRouter = Router();

const STATUS: Record<StoreErrorCode, number> = {
  NOT_FOUND: 404,
  DUPLICATE_CODE: 409,
  INSUFFICIENT_STOCK: 409,
  STAFF_REQUIRED: 400,
};

function sendError(res: Response, error: unknown): void {
  if (error instanceof StoreError) {
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

storeRouter.get("/categories", ...requirePermission("store.items"), async (req, res) => {
  try {
    res.json({ rows: await store.listCategories(tenantOf(req)) });
  } catch (error) {
    sendError(res, error);
  }
});

storeRouter.post("/categories", ...requirePermission("store.items"), async (req, res) => {
  const input = parseBody(categoryBodySchema, req, res);
  if (!input) return;
  try {
    res.status(201).json(await store.createCategory(tenantOf(req), input));
  } catch (error) {
    sendError(res, error);
  }
});

storeRouter.get("/items", ...requirePermission("store.items"), async (req, res) => {
  try {
    res.json(await store.listItems(tenantOf(req)));
  } catch (error) {
    sendError(res, error);
  }
});

storeRouter.get("/items/next-code", ...requirePermission("store.items"), async (req, res) => {
  const parsed = codeQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ code: "VALIDATION_ERROR" });
    return;
  }
  try {
    res.json(await store.nextItemCode(tenantOf(req), parsed.data.categoryId, parsed.data.style));
  } catch (error) {
    sendError(res, error);
  }
});

storeRouter.post("/items", ...requirePermission("store.items"), async (req, res) => {
  const input = parseBody(itemBodySchema, req, res);
  if (!input) return;
  try {
    res.status(201).json(await store.createItem(tenantOf(req), input));
  } catch (error) {
    sendError(res, error);
  }
});

storeRouter.get("/grn", ...requirePermission("store.receive"), async (req, res) => {
  try {
    res.json(await store.grnBoard(tenantOf(req)));
  } catch (error) {
    sendError(res, error);
  }
});

storeRouter.post("/grn", ...requirePermission("store.receive"), async (req, res) => {
  const input = parseBody(grnBodySchema, req, res);
  if (!input) return;
  try {
    res.status(201).json(await store.receiveGrn(tenantOf(req), userOf(req), input));
  } catch (error) {
    sendError(res, error);
  }
});

storeRouter.get("/bin-card", ...requirePermission("store.binCard"), async (req, res) => {
  const parsed = binQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ code: "VALIDATION_ERROR" });
    return;
  }
  try {
    res.json(await store.listBinCard(tenantOf(req), parsed.data));
  } catch (error) {
    sendError(res, error);
  }
});

storeRouter.post("/inflow", ...requirePermission("store.inflow"), async (req, res) => {
  const input = parseBody(inflowBodySchema, req, res);
  if (!input) return;
  try {
    res.status(201).json(await store.recordInflow(tenantOf(req), input));
  } catch (error) {
    sendError(res, error);
  }
});

storeRouter.get("/approvals", ...requirePermission("store.approvals"), async (req, res) => {
  try {
    res.json({ rows: await store.listApprovals(tenantOf(req)) });
  } catch (error) {
    sendError(res, error);
  }
});

storeRouter.post("/approvals/:id", ...requirePermission("store.approvals"), async (req, res) => {
  const params = idParamSchema.safeParse(req.params);
  const input = parseBody(requisitionActionSchema, req, res);
  if (!params.success) {
    res.status(404).json({ code: "NOT_FOUND" });
    return;
  }
  if (!input) return;
  try {
    res.json(await store.actOnRequisition(tenantOf(req), userOf(req), params.data.id, input.action));
  } catch (error) {
    sendError(res, error);
  }
});

storeRouter.get("/issues", ...requirePermission("store.issue"), async (req, res) => {
  try {
    res.json(await store.listIssues(tenantOf(req)));
  } catch (error) {
    sendError(res, error);
  }
});

storeRouter.post("/issues", ...requirePermission("store.issue"), async (req, res) => {
  const input = parseBody(issueBodySchema, req, res);
  if (!input) return;
  try {
    res.status(201).json(await store.issueItem(tenantOf(req), userOf(req), input.requisitionId, input.voucherNo));
  } catch (error) {
    sendError(res, error);
  }
});

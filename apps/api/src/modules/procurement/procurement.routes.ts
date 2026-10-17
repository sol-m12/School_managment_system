import { Router, type Request, type Response } from "express";
import rateLimit, { ipKeyGenerator } from "express-rate-limit";
import type { ZodType } from "zod";
import { requirePermission } from "../../middleware/requirePermission.js";
import { vendorAuth } from "./vendorAuth.js";
import {
  approvalBodySchema,
  bidBodySchema,
  budgetBodySchema,
  checkBodySchema,
  idParamSchema,
  orderBodySchema,
  receiptBodySchema,
  slugQuerySchema,
  tenderBodySchema,
  vendorBodySchema,
  vendorLoginSchema,
  vendorStatusSchema,
} from "./procurement.schema.js";
import { ProcurementError, type ProcurementErrorCode } from "./procurement.service.js";
import * as procurement from "./procurement.service.js";

export const procurementRouter = Router();
export const vendorRouter = Router();

const office = requirePermission("procurement.office");

const STATUS: Record<ProcurementErrorCode, number> = {
  NOT_FOUND: 404,
  ALREADY_CHECKED: 409,
  STOCK_ADEQUATE: 409,
  STOCK_COVERED: 409,
  NOT_FORWARDED: 409,
  NOT_CHECKED: 409,
  OVER_BUDGET: 409,
  NOT_APPROVED: 409,
  LICENSE_EXPIRED: 409,
  VENDOR_SUSPENDED: 403,
  TENDER_CLOSED: 409,
  ALREADY_BID: 409,
  NO_VALID_BID: 409,
  OVER_RECEIPT: 409,
  ALREADY_DELIVERED: 409,
  ALREADY_AWARDED: 409,
  DUPLICATE_NAME: 409,
  DUPLICATE_CODE: 409,
  ALREADY_DECIDED: 409,
  USERNAME_TAKEN: 409,
  AUTH_INVALID_CREDENTIALS: 401,
};

const vendorLoginLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => process.env.NODE_ENV === "test",
  keyGenerator: (req) => ipKeyGenerator(req.ip ?? "unknown"),
  message: { code: "AUTH_RATE_LIMITED" },
});

function sendError(res: Response, error: unknown): void {
  if (error instanceof ProcurementError) {
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

procurementRouter.get("/desk", ...office, async (req, res) => {
  try {
    res.json(await procurement.desk(tenantOf(req)));
  } catch (error) {
    sendError(res, error);
  }
});

procurementRouter.get("/vendors", ...office, async (req, res) => {
  try {
    res.json(await procurement.listVendors(tenantOf(req)));
  } catch (error) {
    sendError(res, error);
  }
});

procurementRouter.post("/vendors", ...office, async (req, res) => {
  const body = parseBody(vendorBodySchema, req, res);
  if (!body) return;
  try {
    res.status(201).json(await procurement.createVendor(tenantOf(req), userOf(req), body));
  } catch (error) {
    sendError(res, error);
  }
});

procurementRouter.post("/vendors/:id/status", ...office, async (req, res) => {
  const id = parseId(req, res);
  const body = parseBody(vendorStatusSchema, req, res);
  if (id == null || !body) return;
  try {
    res.json(await procurement.setVendorStatus(tenantOf(req), userOf(req), id, body.status));
  } catch (error) {
    sendError(res, error);
  }
});

procurementRouter.get("/budgets", ...office, async (req, res) => {
  try {
    res.json(await procurement.listBudgets(tenantOf(req)));
  } catch (error) {
    sendError(res, error);
  }
});

procurementRouter.post("/budgets", ...office, async (req, res) => {
  const body = parseBody(budgetBodySchema, req, res);
  if (!body) return;
  try {
    res.status(201).json(await procurement.createBudget(tenantOf(req), userOf(req), body));
  } catch (error) {
    sendError(res, error);
  }
});

procurementRouter.get("/requisitions", ...office, async (req, res) => {
  try {
    res.json(await procurement.listRequisitions(tenantOf(req)));
  } catch (error) {
    sendError(res, error);
  }
});

procurementRouter.post("/requisitions/check", ...office, async (req, res) => {
  const body = parseBody(checkBodySchema, req, res);
  if (!body) return;
  try {
    res.status(201).json(await procurement.checkRequisition(tenantOf(req), userOf(req), body));
  } catch (error) {
    sendError(res, error);
  }
});

procurementRouter.post("/approvals", ...office, async (req, res) => {
  const body = parseBody(approvalBodySchema, req, res);
  if (!body) return;
  try {
    res.status(201).json(await procurement.decide(tenantOf(req), userOf(req), body));
  } catch (error) {
    sendError(res, error);
  }
});

procurementRouter.get("/orders", ...office, async (req, res) => {
  try {
    res.json(await procurement.listOrders(tenantOf(req)));
  } catch (error) {
    sendError(res, error);
  }
});

procurementRouter.post("/orders", ...office, async (req, res) => {
  const body = parseBody(orderBodySchema, req, res);
  if (!body) return;
  try {
    res.status(201).json(await procurement.createOrder(tenantOf(req), userOf(req), body));
  } catch (error) {
    sendError(res, error);
  }
});

procurementRouter.get("/orders/:id", ...office, async (req, res) => {
  const id = parseId(req, res);
  if (id == null) return;
  try {
    res.json(await procurement.getOrder(tenantOf(req), id));
  } catch (error) {
    sendError(res, error);
  }
});

procurementRouter.post("/orders/:id/receive", ...office, async (req, res) => {
  const id = parseId(req, res);
  const body = parseBody(receiptBodySchema, req, res);
  if (id == null || !body) return;
  try {
    res.json(await procurement.receiveOrder(tenantOf(req), userOf(req), id, body.quantity));
  } catch (error) {
    sendError(res, error);
  }
});

procurementRouter.get("/tenders", ...office, async (req, res) => {
  try {
    res.json(await procurement.listTenders(tenantOf(req)));
  } catch (error) {
    sendError(res, error);
  }
});

procurementRouter.post("/tenders", ...office, async (req, res) => {
  const body = parseBody(tenderBodySchema, req, res);
  if (!body) return;
  try {
    res.status(201).json(await procurement.createTender(tenantOf(req), userOf(req), body));
  } catch (error) {
    sendError(res, error);
  }
});

procurementRouter.get("/tenders/:id", ...office, async (req, res) => {
  const id = parseId(req, res);
  if (id == null) return;
  try {
    res.json(await procurement.tenderMatrix(tenantOf(req), id));
  } catch (error) {
    sendError(res, error);
  }
});

procurementRouter.post("/tenders/:id/award", ...office, async (req, res) => {
  const id = parseId(req, res);
  if (id == null) return;
  try {
    res.status(201).json(await procurement.awardTender(tenantOf(req), userOf(req), id));
  } catch (error) {
    sendError(res, error);
  }
});

export async function publicTenderList(req: Request, res: Response): Promise<void> {
  const parsed = slugQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ code: "VALIDATION_ERROR" });
    return;
  }
  try {
    res.json(await procurement.publicTenders(parsed.data.slug));
  } catch (error) {
    sendError(res, error);
  }
}

export function vendorLoginRoute(req: Request, res: Response): void {
  const body = parseBody(vendorLoginSchema, req, res);
  if (!body) return;
  procurement.vendorLogin(body).then(
    (result) => {
      res.json(result);
    },
    (error: unknown) => {
      sendError(res, error);
    },
  );
}

vendorRouter.post("/login", vendorLoginLimit, vendorLoginRoute);

vendorRouter.get("/desk", vendorAuth, async (req, res) => {
  if (!req.vendor) {
    res.status(401).json({ code: "AUTH_UNAUTHORIZED" });
    return;
  }
  try {
    res.json(await procurement.vendorDesk(req.vendor.tenantId, req.vendor.vendorId));
  } catch (error) {
    sendError(res, error);
  }
});

vendorRouter.post("/bids", vendorAuth, async (req, res) => {
  if (!req.vendor) {
    res.status(401).json({ code: "AUTH_UNAUTHORIZED" });
    return;
  }
  const body = parseBody(bidBodySchema, req, res);
  if (!body) return;
  try {
    res.status(201).json(await procurement.placeBid(req.vendor.tenantId, req.vendor.vendorId, body));
  } catch (error) {
    sendError(res, error);
  }
});

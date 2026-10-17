import { Router, type Request, type Response } from "express";
import type { ZodType } from "zod";
import { requirePermission } from "../../middleware/requirePermission.js";
import {
  bookBodySchema,
  checkoutBodySchema,
  codeQuerySchema,
  idParamSchema,
  intakeBodySchema,
  literacyBodySchema,
  patronBodySchema,
  reserveBodySchema,
  resourceBodySchema,
  scanBodySchema,
  searchQuerySchema,
  studentQuerySchema,
} from "./library.schema.js";
import { LibraryError, type LibraryErrorCode } from "./library.service.js";
import * as library from "./library.service.js";

export const libraryRouter = Router();

const office = requirePermission("library.office");
const opac = requirePermission("library.opac");

const STATUS: Record<LibraryErrorCode, number> = {
  NOT_FOUND: 404,
  NOT_READY: 409,
  NONE_LEFT: 409,
  ALREADY_OUT: 409,
  OVERDUE: 409,
  COPIES_FREE: 409,
  ALREADY_RESERVED: 409,
  NOT_INSIDE: 409,
  ALREADY_INSIDE: 409,
  ALREADY_FILED: 409,
  ALREADY_REPORTED: 409,
  BOOKS_OUT: 409,
  DUPLICATE_CODE: 409,
  INSUFFICIENT_STOCK: 409,
};

function sendError(res: Response, error: unknown): void {
  if (error instanceof LibraryError) {
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

libraryRouter.get("/opac", ...opac, async (req, res) => {
  const parsed = searchQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ code: "VALIDATION_ERROR" });
    return;
  }
  try {
    res.json(await library.opac(tenantOf(req), userOf(req), parsed.data.q));
  } catch (error) {
    sendError(res, error);
  }
});

libraryRouter.post("/opac", ...opac, async (req, res) => {
  const input = parseBody(reserveBodySchema, req, res);
  if (!input) return;
  try {
    res.status(201).json(await library.reserve(tenantOf(req), userOf(req), input.bookId));
  } catch (error) {
    sendError(res, error);
  }
});

libraryRouter.get("/desk", ...office, async (req, res) => {
  try {
    res.json(await library.desk(tenantOf(req)));
  } catch (error) {
    sendError(res, error);
  }
});

libraryRouter.get("/catalog", ...office, async (req, res) => {
  const parsed = searchQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ code: "VALIDATION_ERROR" });
    return;
  }
  try {
    res.json(await library.catalog(tenantOf(req), parsed.data.q));
  } catch (error) {
    sendError(res, error);
  }
});

libraryRouter.post("/catalog", ...office, async (req, res) => {
  const input = parseBody(bookBodySchema, req, res);
  if (!input) return;
  try {
    res.status(201).json(await library.addBook(tenantOf(req), input));
  } catch (error) {
    sendError(res, error);
  }
});

libraryRouter.get("/circulation", ...office, async (req, res) => {
  try {
    res.json(await library.circulation(tenantOf(req)));
  } catch (error) {
    sendError(res, error);
  }
});

libraryRouter.post("/circulation", ...office, async (req, res) => {
  const input = parseBody(checkoutBodySchema, req, res);
  if (!input) return;
  try {
    res.status(201).json(await library.checkout(tenantOf(req), userOf(req), input));
  } catch (error) {
    sendError(res, error);
  }
});

libraryRouter.post("/circulation/:id/return", ...office, async (req, res) => {
  const id = parseId(req, res);
  if (!id) return;
  try {
    res.json(await library.returnLoan(tenantOf(req), id));
  } catch (error) {
    sendError(res, error);
  }
});

libraryRouter.get("/intake", ...office, async (req, res) => {
  try {
    res.json(await library.intakeBoard(tenantOf(req)));
  } catch (error) {
    sendError(res, error);
  }
});

libraryRouter.post("/intake", ...office, async (req, res) => {
  const input = parseBody(intakeBodySchema, req, res);
  if (!input) return;
  try {
    res.status(201).json(await library.takeIn(tenantOf(req), userOf(req), input));
  } catch (error) {
    sendError(res, error);
  }
});

libraryRouter.get("/reminders", ...office, async (req, res) => {
  try {
    res.json(await library.reminders(tenantOf(req)));
  } catch (error) {
    sendError(res, error);
  }
});

libraryRouter.post("/reminders/:id/seen", ...office, async (req, res) => {
  const id = parseId(req, res);
  if (!id) return;
  try {
    res.json(await library.seeReminder(tenantOf(req), id));
  } catch (error) {
    sendError(res, error);
  }
});

libraryRouter.get("/patrons", ...office, async (req, res) => {
  try {
    res.json(await library.patrons(tenantOf(req)));
  } catch (error) {
    sendError(res, error);
  }
});

libraryRouter.post("/patrons", ...office, async (req, res) => {
  const input = parseBody(patronBodySchema, req, res);
  if (!input) return;
  try {
    res.status(201).json(await library.logPatron(tenantOf(req), input));
  } catch (error) {
    sendError(res, error);
  }
});

libraryRouter.get("/resources", ...office, async (req, res) => {
  try {
    res.json(await library.resources(tenantOf(req)));
  } catch (error) {
    sendError(res, error);
  }
});

libraryRouter.post("/resources", ...office, async (req, res) => {
  const input = parseBody(resourceBodySchema, req, res);
  if (!input) return;
  try {
    res.status(201).json(await library.addResource(tenantOf(req), userOf(req), input));
  } catch (error) {
    sendError(res, error);
  }
});

libraryRouter.get("/literacy", ...office, async (req, res) => {
  try {
    res.json(await library.literacy(tenantOf(req)));
  } catch (error) {
    sendError(res, error);
  }
});

libraryRouter.post("/literacy", ...office, async (req, res) => {
  const input = parseBody(literacyBodySchema, req, res);
  if (!input) return;
  try {
    res.status(201).json(await library.saveLiteracy(tenantOf(req), userOf(req), input));
  } catch (error) {
    sendError(res, error);
  }
});

libraryRouter.get("/recommend", ...office, async (req, res) => {
  const parsed = studentQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ code: "VALIDATION_ERROR" });
    return;
  }
  try {
    res.json(await library.recommend(tenantOf(req), parsed.data.studentId));
  } catch (error) {
    sendError(res, error);
  }
});

libraryRouter.get("/lookup", ...office, async (req, res) => {
  const parsed = codeQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ code: "VALIDATION_ERROR" });
    return;
  }
  try {
    res.json(await library.lookup(tenantOf(req), parsed.data.code));
  } catch (error) {
    sendError(res, error);
  }
});

libraryRouter.post("/checkout", ...office, async (req, res) => {
  const input = parseBody(scanBodySchema, req, res);
  if (!input) return;
  try {
    res.status(201).json(await library.scanCheckout(tenantOf(req), userOf(req), input));
  } catch (error) {
    sendError(res, error);
  }
});

libraryRouter.get("/reservations", ...office, async (req, res) => {
  try {
    res.json(await library.reservations(tenantOf(req)));
  } catch (error) {
    sendError(res, error);
  }
});

libraryRouter.post("/reservations/:id/ready", ...office, async (req, res) => {
  const id = parseId(req, res);
  if (!id) return;
  try {
    res.json(await library.markReady(tenantOf(req), id));
  } catch (error) {
    sendError(res, error);
  }
});

libraryRouter.post("/reservations/:id/collect", ...office, async (req, res) => {
  const id = parseId(req, res);
  if (!id) return;
  try {
    res.json(await library.collectReservation(tenantOf(req), userOf(req), id));
  } catch (error) {
    sendError(res, error);
  }
});

libraryRouter.post("/reservations/:id/cancel", ...office, async (req, res) => {
  const id = parseId(req, res);
  if (!id) return;
  try {
    res.json(await library.cancelReservation(tenantOf(req), id));
  } catch (error) {
    sendError(res, error);
  }
});

libraryRouter.get("/competition", ...office, async (req, res) => {
  try {
    res.json(await library.competition(tenantOf(req)));
  } catch (error) {
    sendError(res, error);
  }
});

libraryRouter.get("/clearance", ...office, async (req, res) => {
  try {
    res.json(await library.clearance(tenantOf(req)));
  } catch (error) {
    sendError(res, error);
  }
});

libraryRouter.post("/clearance/:id", ...office, async (req, res) => {
  const id = parseId(req, res);
  if (!id) return;
  try {
    res.json(await library.applyClearance(tenantOf(req), id));
  } catch (error) {
    sendError(res, error);
  }
});

import { Router, type Request, type Response } from "express";
import type { ZodType } from "zod";
import { requirePermission } from "../../middleware/requirePermission.js";
import {
  appointmentBodySchema,
  appointmentStatusSchema,
  decideBodySchema,
  documentBodySchema,
  idParamSchema,
  noticeBodySchema,
  ocrBodySchema,
  ocrRegisterSchema,
  registerBodySchema,
  renewBodySchema,
  studentSearchSchema,
  ticketBodySchema,
  ticketStatusSchema,
} from "./secretary.schema.js";
import { AcademicsError } from "../academics/students.service.js";
import { SecretaryError, type SecretaryErrorCode } from "./secretary.service.js";
import * as secretary from "./secretary.service.js";

export const secretaryRouter = Router();

const office = requirePermission("secretary.office");
const authorize = requirePermission("secretary.authorize");

const STATUS: Record<SecretaryErrorCode, number> = {
  NOT_FOUND: 404,
  NOT_PENDING: 409,
  NOT_READY: 409,
  SAME_YEAR: 409,
  YEAR_BACK: 409,
  CODE_TENANT: 409,
  USERNAME_TAKEN: 409,
  PARSE_INCOMPLETE: 400,
};

function sendError(res: Response, error: unknown): void {
  if (error instanceof SecretaryError) {
    res.status(STATUS[error.code]).json({ code: error.code });
    return;
  }
  if (error instanceof AcademicsError) {
    if (error.code === "USERNAME_TAKEN") {
      res.status(409).json({ code: "USERNAME_TAKEN" });
      return;
    }
    if (error.code === "NOT_FOUND") {
      res.status(404).json({ code: "NOT_FOUND" });
      return;
    }
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

secretaryRouter.get("/desk", ...office, async (req, res) => {
  try {
    res.json(await secretary.desk(tenantOf(req)));
  } catch (error) {
    sendError(res, error);
  }
});

secretaryRouter.get("/students", ...office, async (req, res) => {
  const query = studentSearchSchema.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ code: "VALIDATION_ERROR" });
    return;
  }
  try {
    res.json(await secretary.listStudents(tenantOf(req), query.data));
  } catch (error) {
    sendError(res, error);
  }
});

secretaryRouter.post("/students", ...office, async (req, res) => {
  const input = parseBody(registerBodySchema, req, res);
  if (!input) return;
  try {
    res.status(201).json(await secretary.registerStudent(tenantOf(req), userOf(req), input));
  } catch (error) {
    sendError(res, error);
  }
});

secretaryRouter.get("/cleanup", ...office, async (req, res) => {
  try {
    res.json(await secretary.listCleanup(tenantOf(req)));
  } catch (error) {
    sendError(res, error);
  }
});

secretaryRouter.post("/cleanup", ...office, async (req, res) => {
  try {
    res.status(201).json(await secretary.cleanupStudents(tenantOf(req), userOf(req)));
  } catch (error) {
    sendError(res, error);
  }
});

secretaryRouter.get("/renewals", ...office, async (req, res) => {
  try {
    res.json(await secretary.listRenewals(tenantOf(req)));
  } catch (error) {
    sendError(res, error);
  }
});

secretaryRouter.post("/renewals", ...office, async (req, res) => {
  const input = parseBody(renewBodySchema, req, res);
  if (!input) return;
  try {
    res.status(201).json(await secretary.renewStudents(tenantOf(req), userOf(req), input));
  } catch (error) {
    sendError(res, error);
  }
});

secretaryRouter.get("/pending", ...authorize, async (req, res) => {
  try {
    res.json(await secretary.pendingApprovals(tenantOf(req)));
  } catch (error) {
    sendError(res, error);
  }
});

secretaryRouter.get("/audience-options", ...office, async (req, res) => {
  try {
    res.json(await secretary.audienceOptions(tenantOf(req)));
  } catch (error) {
    sendError(res, error);
  }
});

secretaryRouter.get("/notices", ...office, async (req, res) => {
  try {
    res.json(await secretary.listNotices(tenantOf(req)));
  } catch (error) {
    sendError(res, error);
  }
});

secretaryRouter.post("/notices", ...office, async (req, res) => {
  const input = parseBody(noticeBodySchema, req, res);
  if (!input) return;
  try {
    res.status(201).json(await secretary.createNotice(tenantOf(req), userOf(req), input));
  } catch (error) {
    sendError(res, error);
  }
});

secretaryRouter.post("/notices/:id/decide", ...authorize, async (req, res) => {
  const id = parseId(req, res);
  if (!id) return;
  const input = parseBody(decideBodySchema, req, res);
  if (!input) return;
  try {
    res.json(await secretary.decideNotice(tenantOf(req), userOf(req), id, input.decision));
  } catch (error) {
    sendError(res, error);
  }
});

secretaryRouter.get("/documents", ...office, async (req, res) => {
  try {
    res.json(await secretary.listDocuments(tenantOf(req)));
  } catch (error) {
    sendError(res, error);
  }
});

secretaryRouter.post("/documents", ...office, async (req, res) => {
  const input = parseBody(documentBodySchema, req, res);
  if (!input) return;
  try {
    res.status(201).json(await secretary.createDocument(tenantOf(req), userOf(req), input));
  } catch (error) {
    sendError(res, error);
  }
});

secretaryRouter.post("/documents/:id/decide", ...authorize, async (req, res) => {
  const id = parseId(req, res);
  if (!id) return;
  const input = parseBody(decideBodySchema, req, res);
  if (!input) return;
  try {
    res.json(await secretary.decideDocument(tenantOf(req), userOf(req), id, input.decision));
  } catch (error) {
    sendError(res, error);
  }
});

secretaryRouter.get("/appointments", ...office, async (req, res) => {
  try {
    res.json(await secretary.listAppointments(tenantOf(req)));
  } catch (error) {
    sendError(res, error);
  }
});

secretaryRouter.post("/appointments", ...office, async (req, res) => {
  const input = parseBody(appointmentBodySchema, req, res);
  if (!input) return;
  try {
    res.status(201).json(await secretary.createAppointment(tenantOf(req), userOf(req), input));
  } catch (error) {
    sendError(res, error);
  }
});

secretaryRouter.post("/appointments/:id/status", ...office, async (req, res) => {
  const id = parseId(req, res);
  if (!id) return;
  const input = parseBody(appointmentStatusSchema, req, res);
  if (!input) return;
  try {
    res.json(await secretary.updateAppointment(tenantOf(req), id, input.status));
  } catch (error) {
    sendError(res, error);
  }
});

secretaryRouter.get("/tickets", ...office, async (req, res) => {
  try {
    res.json(await secretary.listTickets(tenantOf(req)));
  } catch (error) {
    sendError(res, error);
  }
});

secretaryRouter.post("/tickets", ...office, async (req, res) => {
  const input = parseBody(ticketBodySchema, req, res);
  if (!input) return;
  try {
    res.status(201).json(await secretary.createTicket(tenantOf(req), userOf(req), input));
  } catch (error) {
    sendError(res, error);
  }
});

secretaryRouter.post("/tickets/:id/status", ...office, async (req, res) => {
  const id = parseId(req, res);
  if (!id) return;
  const input = parseBody(ticketStatusSchema, req, res);
  if (!input) return;
  try {
    res.json(await secretary.updateTicket(tenantOf(req), id, input.status));
  } catch (error) {
    sendError(res, error);
  }
});

secretaryRouter.get("/id-cards", ...office, async (req, res) => {
  const query = studentSearchSchema.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ code: "VALIDATION_ERROR" });
    return;
  }
  try {
    res.json(await secretary.listIdCards(tenantOf(req), query.data));
  } catch (error) {
    sendError(res, error);
  }
});

secretaryRouter.get("/ocr", ...office, async (req, res) => {
  try {
    res.json(await secretary.listScans(tenantOf(req)));
  } catch (error) {
    sendError(res, error);
  }
});

secretaryRouter.post("/ocr", ...office, async (req, res) => {
  const input = parseBody(ocrBodySchema, req, res);
  if (!input) return;
  try {
    res.status(201).json(await secretary.scanForm(tenantOf(req), userOf(req), input));
  } catch (error) {
    sendError(res, error);
  }
});

secretaryRouter.post("/ocr/register", ...office, async (req, res) => {
  const input = parseBody(ocrRegisterSchema, req, res);
  if (!input) return;
  try {
    res.status(201).json(await secretary.registerFromScan(tenantOf(req), userOf(req), input.scanId));
  } catch (error) {
    sendError(res, error);
  }
});

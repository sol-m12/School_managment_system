import { Router, type Request, type Response } from "express";
import type { ZodType } from "zod";
import { requirePermission } from "../../middleware/requirePermission.js";
import {
  auditQuerySchema,
  backupCheckBodySchema,
  departmentHeadBodySchema,
  gradeProtocolBodySchema,
  homeroomBodySchema,
  idParamSchema,
  importBodySchema,
  noticeBodySchema,
  provisionBodySchema,
  resetToIdBodySchema,
  ticketBodySchema,
  ticketStatusBodySchema,
} from "./operations.schema.js";
import { OperationsError, type OperationsErrorCode } from "./operations.service.js";
import * as operations from "./operations.service.js";

export const operationsRouter = Router();

const STATUS: Record<OperationsErrorCode, number> = {
  NOT_FOUND: 404,
  USERNAME_TAKEN: 409,
  ALREADY_HAS_ACCOUNT: 409,
  YEAR_LOCKED: 409,
  YEAR_NOT_LOCKED: 409,
  YEAR_FORMAT: 400,
  YEAR_ARCHIVED: 409,
  GRADE_NOT_FOUND: 404,
  TEACHER_ASSIGNED: 409,
  STAFF_NOT_TEACHER: 400,
  IMPORT_EMPTY: 400,
  EXCEL_SAVE_AS_CSV: 400,
};

function sendError(res: Response, error: unknown): void {
  if (error instanceof OperationsError) {
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

operationsRouter.get("/identities", ...requirePermission("accounts.manage"), async (req, res) => {
  try {
    res.json(await operations.listMissingAccounts(tenantOf(req)));
  } catch (error) {
    sendError(res, error);
  }
});

operationsRouter.post("/identities", ...requirePermission("accounts.manage"), async (req, res) => {
  const input = parseBody(provisionBodySchema, req, res);
  if (!input) return;
  try {
    res.status(201).json(await operations.provisionAccount(tenantOf(req), userOf(req), input));
  } catch (error) {
    sendError(res, error);
  }
});

operationsRouter.post("/passwords/default", ...requirePermission("passwords.reset"), async (req, res) => {
  const input = parseBody(resetToIdBodySchema, req, res);
  if (!input) return;
  try {
    res.json(await operations.resetPasswordToId(tenantOf(req), userOf(req), input.userId));
  } catch (error) {
    sendError(res, error);
  }
});

operationsRouter.post("/academic-year/lock", ...requirePermission("academicYear.manage"), async (req, res) => {
  try {
    res.json(await operations.lockAcademicYear(tenantOf(req), userOf(req)));
  } catch (error) {
    sendError(res, error);
  }
});

operationsRouter.post("/academic-year/archive", ...requirePermission("academicYear.manage"), async (req, res) => {
  try {
    res.json(await operations.archiveAcademicYear(tenantOf(req), userOf(req)));
  } catch (error) {
    sendError(res, error);
  }
});

operationsRouter.post("/academic-year/rollover", ...requirePermission("academicYear.manage"), async (req, res) => {
  try {
    res.json(await operations.rolloverAcademicYear(tenantOf(req), userOf(req)));
  } catch (error) {
    sendError(res, error);
  }
});

operationsRouter.post("/grades", ...requirePermission("gradeCorrection.approve"), async (req, res) => {
  const input = parseBody(gradeProtocolBodySchema, req, res);
  if (!input) return;
  try {
    res.json(await operations.applyGradeProtocol(tenantOf(req), userOf(req), input));
  } catch (error) {
    sendError(res, error);
  }
});

operationsRouter.get("/tickets", ...requirePermission("tickets.manage"), async (req, res) => {
  try {
    res.json({ rows: await operations.listTickets(tenantOf(req)) });
  } catch (error) {
    sendError(res, error);
  }
});

operationsRouter.post("/tickets", ...requirePermission("tickets.manage"), async (req, res) => {
  const input = parseBody(ticketBodySchema, req, res);
  if (!input) return;
  try {
    res.status(201).json({ ticket: await operations.createTicket(tenantOf(req), userOf(req), input) });
  } catch (error) {
    sendError(res, error);
  }
});

operationsRouter.patch("/tickets/:id", ...requirePermission("tickets.manage"), async (req, res) => {
  const params = idParamSchema.safeParse(req.params);
  if (!params.success) {
    res.status(404).json({ code: "NOT_FOUND" });
    return;
  }
  const input = parseBody(ticketStatusBodySchema, req, res);
  if (!input) return;
  try {
    res.json({ ticket: await operations.updateTicketStatus(tenantOf(req), userOf(req), params.data.id, input) });
  } catch (error) {
    sendError(res, error);
  }
});

operationsRouter.get("/audit", ...requirePermission("audit.read"), async (req, res) => {
  const parsed = auditQuerySchema.safeParse({ action: typeof req.query.action === "string" ? req.query.action : undefined });
  if (!parsed.success) {
    res.status(400).json({ code: "VALIDATION_ERROR" });
    return;
  }
  try {
    res.json({ rows: await operations.listAudit(tenantOf(req), parsed.data.action) });
  } catch (error) {
    sendError(res, error);
  }
});

operationsRouter.get("/monitoring", ...requirePermission("backup.create"), async (req, res) => {
  try {
    res.json(await operations.monitoring(tenantOf(req)));
  } catch (error) {
    sendError(res, error);
  }
});

operationsRouter.post("/notices", ...requirePermission("backup.create"), async (req, res) => {
  const input = parseBody(noticeBodySchema, req, res);
  if (!input) return;
  try {
    res.status(201).json(await operations.recordNotice(tenantOf(req), userOf(req), input));
  } catch (error) {
    sendError(res, error);
  }
});

operationsRouter.post("/backup-checks", ...requirePermission("backup.create"), async (req, res) => {
  const input = parseBody(backupCheckBodySchema, req, res);
  if (!input) return;
  try {
    res.status(201).json(await operations.recordBackupCheck(tenantOf(req), userOf(req), input));
  } catch (error) {
    sendError(res, error);
  }
});

operationsRouter.post("/import", ...requirePermission("users.import"), async (req, res) => {
  const input = parseBody(importBodySchema, req, res);
  if (!input) return;
  try {
    res.json(await operations.importAccounts(tenantOf(req), userOf(req), input.csv));
  } catch (error) {
    sendError(res, error);
  }
});

operationsRouter.get("/health", ...requirePermission("health.read"), async (req, res) => {
  try {
    res.json(await operations.healthSnapshot(tenantOf(req)));
  } catch (error) {
    sendError(res, error);
  }
});

operationsRouter.get("/duties", ...requirePermission("duties.assign"), async (req, res) => {
  try {
    res.json(await operations.listDuties(tenantOf(req)));
  } catch (error) {
    sendError(res, error);
  }
});

operationsRouter.post("/duties/homeroom", ...requirePermission("duties.assign"), async (req, res) => {
  const input = parseBody(homeroomBodySchema, req, res);
  if (!input) return;
  try {
    res.json(await operations.assignHomeroom(tenantOf(req), userOf(req), input));
  } catch (error) {
    sendError(res, error);
  }
});

operationsRouter.post("/duties/department", ...requirePermission("duties.assign"), async (req, res) => {
  const input = parseBody(departmentHeadBodySchema, req, res);
  if (!input) return;
  try {
    res.json(await operations.assignDepartmentHead(tenantOf(req), userOf(req), input));
  } catch (error) {
    sendError(res, error);
  }
});

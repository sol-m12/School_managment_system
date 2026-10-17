import { Router, type Request, type Response } from "express";
import type { ZodType } from "zod";
import { requirePermission } from "../../middleware/requirePermission.js";
import {
  appointmentBodySchema,
  createParentBodySchema,
  idParamSchema,
  linkParentBodySchema,
  lookupParentQuerySchema,
  messageBodySchema,
} from "./parent.schema.js";
import { ParentError, type ParentErrorCode } from "./parent.service.js";
import * as parent from "./parent.service.js";

export const parentRouter = Router();
export const parentAdminRouter = Router();

const desk = requirePermission("parent.desk");
const manage = requirePermission("parents.manage");

const STATUS: Record<ParentErrorCode, number> = {
  NOT_FOUND: 404,
  FORBIDDEN: 403,
  USERNAME_TAKEN: 409,
  ALREADY_LINKED: 409,
  NO_STUDENT_ACCOUNT: 409,
  CODE_INVALID: 404,
  NOT_PARENT: 403,
  STUDENT_TENANT: 403,
};

function sendError(res: Response, error: unknown): void {
  if (error instanceof ParentError) {
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

function parseParams<T>(schema: ZodType<T>, req: Request, res: Response): T | null {
  const parsed = schema.safeParse(req.params);
  if (!parsed.success) {
    res.status(400).json({ code: "VALIDATION_ERROR" });
    return null;
  }
  return parsed.data;
}

parentAdminRouter.get("/", ...manage, async (req, res) => {
  try {
    res.json(await parent.listManagedParents(tenantOf(req)));
  } catch (error) {
    sendError(res, error);
  }
});

parentAdminRouter.get("/students", ...manage, async (req, res) => {
  try {
    res.json(await parent.listStudentsForLinking(tenantOf(req)));
  } catch (error) {
    sendError(res, error);
  }
});

parentAdminRouter.get("/lookup", ...manage, async (req, res) => {
  const parsed = lookupParentQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ code: "VALIDATION_ERROR" });
    return;
  }
  try {
    res.json(await parent.lookupParentByCode(parsed.data.code));
  } catch (error) {
    sendError(res, error);
  }
});

parentAdminRouter.post("/", ...manage, async (req, res) => {
  const input = parseBody(createParentBodySchema, req, res);
  if (!input) return;
  try {
    res.status(201).json(await parent.createParentAccount(tenantOf(req), userOf(req), input));
  } catch (error) {
    sendError(res, error);
  }
});

parentAdminRouter.post("/links", ...manage, async (req, res) => {
  const input = parseBody(linkParentBodySchema, req, res);
  if (!input) return;
  try {
    res.status(201).json(await parent.linkParentToStudent(tenantOf(req), userOf(req), input));
  } catch (error) {
    sendError(res, error);
  }
});

parentAdminRouter.delete("/links/:id", ...manage, async (req, res) => {
  const params = parseParams(idParamSchema, req, res);
  if (!params) return;
  try {
    res.json(await parent.unlinkParentStudent(tenantOf(req), params.id));
  } catch (error) {
    sendError(res, error);
  }
});

parentRouter.get("/children", ...desk, async (req, res) => {
  try {
    res.json(await parent.listChildren(userOf(req)));
  } catch (error) {
    sendError(res, error);
  }
});

parentRouter.get("/children/:id/attendance", ...desk, async (req, res) => {
  const params = parseParams(idParamSchema, req, res);
  if (!params) return;
  try {
    res.json(await parent.childAttendance(userOf(req), params.id));
  } catch (error) {
    sendError(res, error);
  }
});

parentRouter.get("/children/:id/discipline", ...desk, async (req, res) => {
  const params = parseParams(idParamSchema, req, res);
  if (!params) return;
  try {
    res.json(await parent.childDiscipline(userOf(req), params.id));
  } catch (error) {
    sendError(res, error);
  }
});

parentRouter.get("/children/:id/assignments", ...desk, async (req, res) => {
  const params = parseParams(idParamSchema, req, res);
  if (!params) return;
  try {
    res.json(await parent.childAssignments(userOf(req), params.id));
  } catch (error) {
    sendError(res, error);
  }
});

parentRouter.get("/children/:id/results", ...desk, async (req, res) => {
  const params = parseParams(idParamSchema, req, res);
  if (!params) return;
  try {
    res.json(await parent.childResults(userOf(req), params.id));
  } catch (error) {
    sendError(res, error);
  }
});

parentRouter.get("/children/:id/library", ...desk, async (req, res) => {
  const params = parseParams(idParamSchema, req, res);
  if (!params) return;
  try {
    res.json(await parent.childLibrary(userOf(req), params.id));
  } catch (error) {
    sendError(res, error);
  }
});

parentRouter.get("/children/:id/messages", ...desk, async (req, res) => {
  const params = parseParams(idParamSchema, req, res);
  if (!params) return;
  try {
    res.json(await parent.listMessages(userOf(req), params.id));
  } catch (error) {
    sendError(res, error);
  }
});

parentRouter.post("/messages", ...desk, async (req, res) => {
  const input = parseBody(messageBodySchema, req, res);
  if (!input) return;
  try {
    res.status(201).json(await parent.sendMessage(userOf(req), input));
  } catch (error) {
    sendError(res, error);
  }
});

parentRouter.get("/notifications", ...desk, async (req, res) => {
  try {
    res.json(await parent.notifications(userOf(req)));
  } catch (error) {
    sendError(res, error);
  }
});

parentRouter.get("/appointments", ...desk, async (req, res) => {
  try {
    res.json(await parent.listAppointments(userOf(req)));
  } catch (error) {
    sendError(res, error);
  }
});

parentRouter.post("/appointments", ...desk, async (req, res) => {
  const input = parseBody(appointmentBodySchema, req, res);
  if (!input) return;
  try {
    res.status(201).json(await parent.requestAppointment(userOf(req), input));
  } catch (error) {
    sendError(res, error);
  }
});

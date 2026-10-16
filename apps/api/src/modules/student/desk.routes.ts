import { Router, type Request, type Response } from "express";
import type { ZodType } from "zod";
import { requirePermission } from "../../middleware/requirePermission.js";
import {
  applyBodySchema,
  choiceBodySchema,
  documentBodySchema,
  idParamSchema,
  queryBodySchema,
  workBodySchema,
} from "./desk.schema.js";
import { DeskError, type DeskErrorCode } from "./desk.service.js";
import * as desk from "./desk.service.js";

export const deskRouter = Router();

const guard = requirePermission("student.desk");

const STATUS: Record<DeskErrorCode, number> = {
  NOT_FOUND: 404,
  GRADE_CLOSED: 409,
  EXPLORE_ONLY: 409,
  CONTINUE_ONLY: 409,
  ALREADY_CHOSEN: 409,
  NOT_IN_CURRICULUM: 409,
  WRONG_GRADE: 409,
  ALREADY_OPEN: 409,
  DEADLINE: 409,
  ALREADY_SUBMITTED: 409,
  PROGRAM_CLOSED: 409,
  PROGRAM_FULL: 409,
  ALREADY_PLACED: 409,
};

function sendError(res: Response, error: unknown): void {
  if (error instanceof DeskError) {
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

deskRouter.get("/desk/attendance", ...guard, async (req, res) => {
  try {
    res.json(await desk.attendanceStatus(tenantOf(req), userOf(req)));
  } catch (error) {
    sendError(res, error);
  }
});

deskRouter.get("/desk/discipline", ...guard, async (req, res) => {
  try {
    res.json(await desk.disciplineStatus(tenantOf(req), userOf(req)));
  } catch (error) {
    sendError(res, error);
  }
});

deskRouter.get("/desk/timetable", ...guard, async (req, res) => {
  try {
    res.json(await desk.timetable(tenantOf(req), userOf(req)));
  } catch (error) {
    sendError(res, error);
  }
});

deskRouter.get("/desk/notifications", ...guard, async (req, res) => {
  try {
    res.json(await desk.notifications(tenantOf(req), userOf(req)));
  } catch (error) {
    sendError(res, error);
  }
});

deskRouter.get("/desk/assignments", ...guard, async (req, res) => {
  try {
    res.json(await desk.assignments(tenantOf(req), userOf(req)));
  } catch (error) {
    sendError(res, error);
  }
});

deskRouter.post("/desk/assignments/:id", ...guard, async (req, res) => {
  const params = idParamSchema.safeParse(req.params);
  if (!params.success) {
    res.status(404).json({ code: "NOT_FOUND" });
    return;
  }
  const input = parseBody(workBodySchema, req, res);
  if (!input) return;
  try {
    res.status(201).json(await desk.submitWork(tenantOf(req), userOf(req), params.data.id, input.body));
  } catch (error) {
    sendError(res, error);
  }
});

deskRouter.get("/desk/vocational", ...guard, async (req, res) => {
  try {
    res.json(await desk.vocationalView(tenantOf(req), userOf(req)));
  } catch (error) {
    sendError(res, error);
  }
});

deskRouter.post("/desk/vocational/choice", ...guard, async (req, res) => {
  const input = parseBody(choiceBodySchema, req, res);
  if (!input) return;
  try {
    res.status(201).json(await desk.chooseSkill(tenantOf(req), userOf(req), input.subjectId));
  } catch (error) {
    sendError(res, error);
  }
});

deskRouter.post("/desk/vocational/apply", ...guard, async (req, res) => {
  const input = parseBody(applyBodySchema, req, res);
  if (!input) return;
  try {
    res.status(201).json(await desk.applyProgram(tenantOf(req), userOf(req), input.programId, input.note));
  } catch (error) {
    sendError(res, error);
  }
});

deskRouter.get("/desk/library", ...guard, async (req, res) => {
  try {
    res.json(await desk.libraryDesk(tenantOf(req), userOf(req)));
  } catch (error) {
    sendError(res, error);
  }
});

deskRouter.get("/desk/documents", ...guard, async (req, res) => {
  try {
    res.json(await desk.documentRequests(tenantOf(req), userOf(req)));
  } catch (error) {
    sendError(res, error);
  }
});

deskRouter.post("/desk/documents", ...guard, async (req, res) => {
  const input = parseBody(documentBodySchema, req, res);
  if (!input) return;
  try {
    res.status(201).json(await desk.requestDocument(tenantOf(req), userOf(req), input.kind, input.purpose));
  } catch (error) {
    sendError(res, error);
  }
});

deskRouter.get("/desk/helpdesk", ...guard, async (req, res) => {
  try {
    res.json(await desk.helpdesk(tenantOf(req), userOf(req)));
  } catch (error) {
    sendError(res, error);
  }
});

deskRouter.post("/desk/helpdesk", ...guard, async (req, res) => {
  const input = parseBody(queryBodySchema, req, res);
  if (!input) return;
  try {
    res.status(201).json(await desk.openQuery(tenantOf(req), userOf(req), input));
  } catch (error) {
    sendError(res, error);
  }
});

deskRouter.post("/desk/helpdesk/:id/close", ...guard, async (req, res) => {
  const params = idParamSchema.safeParse(req.params);
  if (!params.success) {
    res.status(404).json({ code: "NOT_FOUND" });
    return;
  }
  try {
    res.json(await desk.closeQuery(tenantOf(req), userOf(req), params.data.id));
  } catch (error) {
    sendError(res, error);
  }
});

deskRouter.get("/desk/planner", ...guard, async (req, res) => {
  try {
    res.json(await desk.studyDesk(tenantOf(req), userOf(req)));
  } catch (error) {
    sendError(res, error);
  }
});

deskRouter.get("/desk/id", ...guard, async (req, res) => {
  try {
    res.json(await desk.digitalId(tenantOf(req), userOf(req)));
  } catch (error) {
    sendError(res, error);
  }
});

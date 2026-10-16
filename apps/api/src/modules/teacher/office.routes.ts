import { Router, type Request, type Response } from "express";
import type { ZodType } from "zod";
import { requirePermission } from "../../middleware/requirePermission.js";
import {
  coverageBodySchema,
  evaluationBodySchema,
  idParamSchema,
  incidentActionSchema,
  incidentBodySchema,
  leaveActionSchema,
  leaveBodySchema,
  paperBodySchema,
  participationBodySchema,
  participationQuerySchema,
  questionBodySchema,
  recommendationBodySchema,
  requisitionBodySchema,
  standardBodySchema,
  substitutionBodySchema,
  swapBodySchema,
  syncBodySchema,
} from "./office.schema.js";
import { OfficeError, type OfficeErrorCode } from "./office.service.js";
import * as office from "./office.service.js";

export const officeRouter = Router();

const subject = requirePermission("teacher.subject");
const homeroom = requirePermission("teacher.homeroom");
const head = requirePermission("teacher.department");

const STATUS: Record<OfficeErrorCode, number> = {
  NOT_FOUND: 404,
  NOT_ASSIGNED: 403,
  NOT_HOMEROOM: 403,
  NOT_HEAD: 403,
  LEAVE_OVERLAP: 409,
  NOT_READY: 409,
  ALREADY_MARKED: 409,
  NOT_ENOUGH: 409,
  ALREADY_RECOMMENDED: 409,
  SWAP_BUSY: 409,
  COVER_BUSY: 409,
  SELF: 409,
  SCORE_OVER: 409,
  ALREADY_EVALUATED: 409,
  WRONG_DAY: 409,
  SUBSTITUTION_OPEN: 409,
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
    res.status(400).json({ code: "VALIDATION_ERROR" });
    return null;
  }
  return parsed.data.id;
}

officeRouter.get("/office/attendance", ...subject, async (req, res) => {
  try {
    res.json(await office.attendanceBoard(tenantOf(req), userOf(req)));
  } catch (error) {
    sendError(res, error);
  }
});

officeRouter.post("/office/attendance/sync", ...subject, async (req, res) => {
  const input = parseBody(syncBodySchema, req, res);
  if (!input) return;
  try {
    res.json(await office.syncAttendance(tenantOf(req), userOf(req), input));
  } catch (error) {
    sendError(res, error);
  }
});

officeRouter.get("/office/timetable", ...subject, async (req, res) => {
  try {
    res.json(await office.timetableView(tenantOf(req), userOf(req)));
  } catch (error) {
    sendError(res, error);
  }
});

officeRouter.post("/office/swaps", ...subject, async (req, res) => {
  const input = parseBody(swapBodySchema, req, res);
  if (!input) return;
  try {
    res.status(201).json(await office.swapPeriods(tenantOf(req), userOf(req), input));
  } catch (error) {
    sendError(res, error);
  }
});

officeRouter.post("/office/substitutions", ...subject, async (req, res) => {
  const input = parseBody(substitutionBodySchema, req, res);
  if (!input) return;
  try {
    res.status(201).json(await office.addSubstitution(tenantOf(req), userOf(req), input));
  } catch (error) {
    sendError(res, error);
  }
});

officeRouter.delete("/office/substitutions/:id", ...subject, async (req, res) => {
  const id = parseId(req, res);
  if (id == null) return;
  try {
    res.json(await office.cancelSubstitution(tenantOf(req), userOf(req), id));
  } catch (error) {
    sendError(res, error);
  }
});

officeRouter.get("/office/incidents", ...subject, async (req, res) => {
  try {
    res.json(await office.incidentBoard(tenantOf(req), userOf(req)));
  } catch (error) {
    sendError(res, error);
  }
});

officeRouter.post("/office/incidents", ...subject, async (req, res) => {
  const input = parseBody(incidentBodySchema, req, res);
  if (!input) return;
  try {
    res.status(201).json(await office.reportIncident(tenantOf(req), userOf(req), input));
  } catch (error) {
    sendError(res, error);
  }
});

officeRouter.patch("/office/incidents/:id", ...subject, async (req, res) => {
  const id = parseId(req, res);
  const input = parseBody(incidentActionSchema, req, res);
  if (id == null || !input) return;
  try {
    res.json(await office.actOnIncident(tenantOf(req), userOf(req), id, input.action));
  } catch (error) {
    sendError(res, error);
  }
});

officeRouter.get("/office/leave", ...subject, async (req, res) => {
  try {
    res.json(await office.leaveBoard(tenantOf(req), userOf(req)));
  } catch (error) {
    sendError(res, error);
  }
});

officeRouter.post("/office/leave", ...subject, async (req, res) => {
  const input = parseBody(leaveBodySchema, req, res);
  if (!input) return;
  try {
    res.status(201).json(await office.requestLeave(tenantOf(req), userOf(req), input));
  } catch (error) {
    sendError(res, error);
  }
});

officeRouter.patch("/office/leave/:id", ...subject, async (req, res) => {
  const id = parseId(req, res);
  const input = parseBody(leaveActionSchema, req, res);
  if (id == null || !input) return;
  try {
    res.json(await office.actOnLeave(tenantOf(req), userOf(req), id, input.action));
  } catch (error) {
    sendError(res, error);
  }
});

officeRouter.get("/office/library", ...subject, async (req, res) => {
  try {
    res.json(await office.libraryBoard(tenantOf(req), userOf(req)));
  } catch (error) {
    sendError(res, error);
  }
});

officeRouter.post("/office/recommendations", ...subject, async (req, res) => {
  const input = parseBody(recommendationBodySchema, req, res);
  if (!input) return;
  try {
    res.status(201).json(await office.recommendBook(tenantOf(req), userOf(req), input));
  } catch (error) {
    sendError(res, error);
  }
});

officeRouter.get("/office/questions", ...subject, async (req, res) => {
  try {
    res.json(await office.questionBoard(tenantOf(req), userOf(req)));
  } catch (error) {
    sendError(res, error);
  }
});

officeRouter.post("/office/questions", ...subject, async (req, res) => {
  const input = parseBody(questionBodySchema, req, res);
  if (!input) return;
  try {
    res.status(201).json(await office.addQuestion(tenantOf(req), userOf(req), input));
  } catch (error) {
    sendError(res, error);
  }
});

officeRouter.post("/office/papers", ...subject, async (req, res) => {
  const input = parseBody(paperBodySchema, req, res);
  if (!input) return;
  try {
    res.status(201).json(await office.generatePaper(tenantOf(req), userOf(req), input));
  } catch (error) {
    sendError(res, error);
  }
});

officeRouter.patch("/office/papers/:id", ...subject, async (req, res) => {
  const id = parseId(req, res);
  if (id == null) return;
  try {
    res.json(await office.closePaper(tenantOf(req), userOf(req), id));
  } catch (error) {
    sendError(res, error);
  }
});

officeRouter.get("/office/participation", ...subject, async (req, res) => {
  const parsed = participationQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ code: "VALIDATION_ERROR" });
    return;
  }
  try {
    res.json(await office.participationBoard(tenantOf(req), userOf(req), parsed.data.subjectId, parsed.data.date));
  } catch (error) {
    sendError(res, error);
  }
});

officeRouter.post("/office/participation", ...subject, async (req, res) => {
  const input = parseBody(participationBodySchema, req, res);
  if (!input) return;
  try {
    res.status(201).json(await office.markParticipation(tenantOf(req), userOf(req), input));
  } catch (error) {
    sendError(res, error);
  }
});

officeRouter.get("/office/student-360", ...homeroom, async (req, res) => {
  try {
    res.json(await office.student360List(tenantOf(req), userOf(req)));
  } catch (error) {
    sendError(res, error);
  }
});

officeRouter.get("/office/student-360/:id", ...homeroom, async (req, res) => {
  const id = parseId(req, res);
  if (id == null) return;
  try {
    res.json(await office.student360(tenantOf(req), userOf(req), id));
  } catch (error) {
    sendError(res, error);
  }
});

officeRouter.get("/office/curriculum", ...head, async (req, res) => {
  try {
    res.json(await office.curriculumBoard(tenantOf(req), userOf(req)));
  } catch (error) {
    sendError(res, error);
  }
});

officeRouter.post("/office/plans/:id/approve", ...head, async (req, res) => {
  const id = parseId(req, res);
  if (id == null) return;
  try {
    res.json(await office.approvePlan(tenantOf(req), userOf(req), id));
  } catch (error) {
    sendError(res, error);
  }
});

officeRouter.post("/office/standards", ...head, async (req, res) => {
  const input = parseBody(standardBodySchema, req, res);
  if (!input) return;
  try {
    res.status(201).json(await office.saveStandard(tenantOf(req), userOf(req), input));
  } catch (error) {
    sendError(res, error);
  }
});

officeRouter.get("/office/grades", ...head, async (req, res) => {
  try {
    res.json(await office.gradeWorkflow(tenantOf(req), userOf(req)));
  } catch (error) {
    sendError(res, error);
  }
});

officeRouter.post("/office/grades/:id/approve", ...head, async (req, res) => {
  const id = parseId(req, res);
  if (id == null) return;
  try {
    res.json(await office.approveGrade(tenantOf(req), userOf(req), id));
  } catch (error) {
    sendError(res, error);
  }
});

officeRouter.post("/office/grades/:id/send", ...head, async (req, res) => {
  const id = parseId(req, res);
  if (id == null) return;
  try {
    res.json(await office.sendGrade(tenantOf(req), userOf(req), id));
  } catch (error) {
    sendError(res, error);
  }
});

officeRouter.get("/office/requisitions", ...head, async (req, res) => {
  try {
    res.json(await office.requisitionBoard(tenantOf(req), userOf(req)));
  } catch (error) {
    sendError(res, error);
  }
});

officeRouter.post("/office/requisitions", ...head, async (req, res) => {
  const input = parseBody(requisitionBodySchema, req, res);
  if (!input) return;
  try {
    res.status(201).json(await office.addRequisition(tenantOf(req), userOf(req), input));
  } catch (error) {
    sendError(res, error);
  }
});

officeRouter.post("/office/requisitions/:id/send", ...head, async (req, res) => {
  const id = parseId(req, res);
  if (id == null) return;
  try {
    res.json(await office.sendRequisition(tenantOf(req), userOf(req), id));
  } catch (error) {
    sendError(res, error);
  }
});

officeRouter.get("/office/coverage", ...head, async (req, res) => {
  try {
    res.json(await office.coverageBoard(tenantOf(req), userOf(req)));
  } catch (error) {
    sendError(res, error);
  }
});

officeRouter.post("/office/coverage", ...head, async (req, res) => {
  const input = parseBody(coverageBodySchema, req, res);
  if (!input) return;
  try {
    res.status(201).json(await office.markCovered(tenantOf(req), userOf(req), input));
  } catch (error) {
    sendError(res, error);
  }
});

officeRouter.get("/office/evaluations", ...head, async (req, res) => {
  try {
    res.json(await office.evaluationBoard(tenantOf(req), userOf(req)));
  } catch (error) {
    sendError(res, error);
  }
});

officeRouter.post("/office/evaluations", ...head, async (req, res) => {
  const input = parseBody(evaluationBodySchema, req, res);
  if (!input) return;
  try {
    res.status(201).json(await office.saveEvaluation(tenantOf(req), userOf(req), input));
  } catch (error) {
    sendError(res, error);
  }
});

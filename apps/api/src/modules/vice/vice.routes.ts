import { Router, type Request, type Response } from "express";
import type { ZodType } from "zod";
import { requirePermission } from "../../middleware/requirePermission.js";
import {
  hearingBodySchema,
  hearingOutcomeSchema,
  idParamSchema,
  manualDutySchema,
  penaltyBodySchema,
  placementBodySchema,
  placementStatusSchema,
  programBodySchema,
  programStatusSchema,
  referralBodySchema,
  sessionBodySchema,
  examDaySchema,
} from "./vice.schema.js";
import { ViceError, type ViceErrorCode } from "./vice.service.js";
import * as vice from "./vice.service.js";

export const viceRouter = Router();

const guard = requirePermission("vice.office");

const STATUS: Record<ViceErrorCode, number> = {
  NOT_FOUND: 404,
  PROGRAM_CLOSED: 409,
  PROGRAM_FULL: 409,
  ALREADY_PLACED: 409,
  HEARING_REQUIRED: 409,
  NOT_READY: 409,
  OVERLAP: 409,
  SESSION_FULL: 409,
  ALREADY_ASSIGNED: 409,
};

function sendError(res: Response, error: unknown): void {
  if (error instanceof ViceError) {
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

viceRouter.get("/vocational", ...guard, async (req, res) => {
  try {
    res.json(await vice.vocationalView(tenantOf(req)));
  } catch (error) {
    sendError(res, error);
  }
});

viceRouter.post("/programs", ...guard, async (req, res) => {
  const input = parseBody(programBodySchema, req, res);
  if (!input) return;
  try {
    res.status(201).json(await vice.createProgram(tenantOf(req), userOf(req), input));
  } catch (error) {
    sendError(res, error);
  }
});

viceRouter.patch("/programs/:id", ...guard, async (req, res) => {
  const id = parseId(req, res);
  const input = parseBody(programStatusSchema, req, res);
  if (id == null || !input) return;
  try {
    await vice.setProgramStatus(tenantOf(req), userOf(req), id, input.status);
    res.json({ id });
  } catch (error) {
    sendError(res, error);
  }
});

viceRouter.post("/placements", ...guard, async (req, res) => {
  const input = parseBody(placementBodySchema, req, res);
  if (!input) return;
  try {
    res.status(201).json(await vice.placeStudent(tenantOf(req), userOf(req), input));
  } catch (error) {
    sendError(res, error);
  }
});

viceRouter.patch("/placements/:id", ...guard, async (req, res) => {
  const id = parseId(req, res);
  const input = parseBody(placementStatusSchema, req, res);
  if (id == null || !input) return;
  try {
    await vice.setPlacementStatus(tenantOf(req), userOf(req), id, input.status);
    res.json({ id });
  } catch (error) {
    sendError(res, error);
  }
});

viceRouter.get("/behavior", ...guard, async (req, res) => {
  try {
    res.json(await vice.behaviorView(tenantOf(req)));
  } catch (error) {
    sendError(res, error);
  }
});

viceRouter.post("/referrals", ...guard, async (req, res) => {
  const input = parseBody(referralBodySchema, req, res);
  if (!input) return;
  try {
    res.status(201).json(await vice.createReferral(tenantOf(req), userOf(req), input));
  } catch (error) {
    sendError(res, error);
  }
});

viceRouter.post("/referrals/:id/hearings", ...guard, async (req, res) => {
  const id = parseId(req, res);
  const input = parseBody(hearingBodySchema, req, res);
  if (id == null || !input) return;
  try {
    res.status(201).json(await vice.scheduleHearing(tenantOf(req), userOf(req), id, input));
  } catch (error) {
    sendError(res, error);
  }
});

viceRouter.patch("/hearings/:id", ...guard, async (req, res) => {
  const id = parseId(req, res);
  const input = parseBody(hearingOutcomeSchema, req, res);
  if (id == null || !input) return;
  try {
    await vice.setHearingOutcome(tenantOf(req), userOf(req), id, input);
    res.json({ id });
  } catch (error) {
    sendError(res, error);
  }
});

viceRouter.post("/referrals/:id/penalties", ...guard, async (req, res) => {
  const id = parseId(req, res);
  const input = parseBody(penaltyBodySchema, req, res);
  if (id == null || !input) return;
  try {
    res.status(201).json(await vice.recordPenalty(tenantOf(req), userOf(req), id, input));
  } catch (error) {
    sendError(res, error);
  }
});

viceRouter.post("/referrals/:id/close", ...guard, async (req, res) => {
  const id = parseId(req, res);
  if (id == null) return;
  try {
    await vice.closeReferral(tenantOf(req), userOf(req), id);
    res.json({ id });
  } catch (error) {
    sendError(res, error);
  }
});

viceRouter.get("/invigilation", ...guard, async (req, res) => {
  try {
    res.json(await vice.invigilationView(tenantOf(req)));
  } catch (error) {
    sendError(res, error);
  }
});

viceRouter.post("/sessions", ...guard, async (req, res) => {
  const input = parseBody(sessionBodySchema, req, res);
  if (!input) return;
  try {
    res.status(201).json(await vice.createSession(tenantOf(req), userOf(req), input));
  } catch (error) {
    sendError(res, error);
  }
});

viceRouter.post("/invigilation/day", ...guard, async (req, res) => {
  const input = parseBody(examDaySchema, req, res);
  if (!input) return;
  try {
    res.json(await vice.prepareExamDay(tenantOf(req), userOf(req), input.examDate));
  } catch (error) {
    sendError(res, error);
  }
});

viceRouter.post("/invigilation/assign", ...guard, async (req, res) => {
  try {
    res.json(await vice.assignInvigilators(tenantOf(req), userOf(req)));
  } catch (error) {
    sendError(res, error);
  }
});

viceRouter.post("/sessions/:id/invigilators", ...guard, async (req, res) => {
  const id = parseId(req, res);
  const input = parseBody(manualDutySchema, req, res);
  if (id == null || !input) return;
  try {
    res.status(201).json(await vice.assignManual(tenantOf(req), userOf(req), id, input.staffId));
  } catch (error) {
    sendError(res, error);
  }
});

viceRouter.delete("/invigilators/:id", ...guard, async (req, res) => {
  const id = parseId(req, res);
  if (id == null) return;
  try {
    await vice.removeDuty(tenantOf(req), userOf(req), id);
    res.json({ id });
  } catch (error) {
    sendError(res, error);
  }
});

import { Router, type Request, type Response } from "express";
import type { ZodType } from "zod";
import { requirePermission } from "../../middleware/requirePermission.js";
import {
  applyBodySchema,
  idParamSchema,
  importScoresSchema,
  opportunityBodySchema,
  recommendationBodySchema,
  settingsBodySchema,
} from "./scholarships.schema.js";
import {
  ScholarshipError,
  type ScholarshipErrorCode,
} from "./scholarships.service.js";
import * as scholarships from "./scholarships.service.js";

export const scholarshipsRouter = Router();

const records = requirePermission("scholarships.records");
const student = requirePermission("scholarships.student");
const post = requirePermission("scholarships.post");
const recommend = requirePermission("scholarships.recommend");

const STATUS: Record<ScholarshipErrorCode, number> = {
  NOT_FOUND: 404,
  NOT_ASSIGNED: 403,
  NOT_ELIGIBLE: 403,
  ALREADY_APPLIED: 409,
  VALIDATION: 400,
};

function sendError(res: Response, error: unknown): void {
  if (error instanceof ScholarshipError) {
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

scholarshipsRouter.get("/records/settings", ...records, async (req, res) => {
  try {
    const year = typeof req.query.year === "string" ? req.query.year : undefined;
    res.json(await scholarships.getSettings(tenantOf(req), year));
  } catch (error) {
    sendError(res, error);
  }
});

scholarshipsRouter.put("/records/settings", ...records, async (req, res) => {
  const input = parseBody(settingsBodySchema, req, res);
  if (!input) return;
  try {
    res.json(await scholarships.saveSettings(tenantOf(req), userOf(req), input));
  } catch (error) {
    sendError(res, error);
  }
});

scholarshipsRouter.get("/records/students", ...records, async (req, res) => {
  try {
    res.json(await scholarships.listStudentOptions(tenantOf(req)));
  } catch (error) {
    sendError(res, error);
  }
});

scholarshipsRouter.get("/records/scores", ...records, async (req, res) => {
  const year = typeof req.query.year === "string" ? req.query.year : "";
  if (!year) {
    res.status(400).json({ code: "VALIDATION_ERROR" });
    return;
  }
  try {
    res.json(await scholarships.listScores(tenantOf(req), year));
  } catch (error) {
    sendError(res, error);
  }
});

scholarshipsRouter.post("/records/scores", ...records, async (req, res) => {
  const input = parseBody(importScoresSchema, req, res);
  if (!input) return;
  try {
    res.status(201).json(await scholarships.importScores(tenantOf(req), userOf(req), input));
  } catch (error) {
    sendError(res, error);
  }
});

scholarshipsRouter.get("/student", ...student, async (req, res) => {
  try {
    res.json(await scholarships.studentPortal(tenantOf(req), userOf(req)));
  } catch (error) {
    sendError(res, error);
  }
});

scholarshipsRouter.post("/student/apply", ...student, async (req, res) => {
  const input = parseBody(applyBodySchema, req, res);
  if (!input) return;
  try {
    res.status(201).json(await scholarships.apply(tenantOf(req), userOf(req), input));
  } catch (error) {
    sendError(res, error);
  }
});

scholarshipsRouter.post("/student/request-letter", ...student, async (req, res) => {
  const applicationId = Number((req.body as { applicationId?: number })?.applicationId);
  if (!Number.isInteger(applicationId) || applicationId <= 0) {
    res.status(400).json({ code: "VALIDATION_ERROR" });
    return;
  }
  try {
    res.json(await scholarships.requestLetter(tenantOf(req), userOf(req), applicationId));
  } catch (error) {
    sendError(res, error);
  }
});

scholarshipsRouter.get("/opportunities", ...post, async (req, res) => {
  try {
    res.json(await scholarships.listOpportunities(tenantOf(req)));
  } catch (error) {
    sendError(res, error);
  }
});

scholarshipsRouter.post("/opportunities", ...post, async (req, res) => {
  const input = parseBody(opportunityBodySchema, req, res);
  if (!input) return;
  try {
    res.status(201).json(await scholarships.createOpportunity(tenantOf(req), userOf(req), input));
  } catch (error) {
    sendError(res, error);
  }
});

scholarshipsRouter.put("/opportunities/:id", ...post, async (req, res) => {
  const id = parseId(req, res);
  if (id == null) return;
  const input = parseBody(opportunityBodySchema.partial(), req, res);
  if (!input) return;
  try {
    res.json(await scholarships.updateOpportunity(tenantOf(req), id, input));
  } catch (error) {
    sendError(res, error);
  }
});

scholarshipsRouter.get("/recommend/queue", ...recommend, async (req, res) => {
  try {
    res.json(await scholarships.listLetterQueue(tenantOf(req)));
  } catch (error) {
    sendError(res, error);
  }
});

scholarshipsRouter.post("/recommend", ...recommend, async (req, res) => {
  const input = parseBody(recommendationBodySchema, req, res);
  if (!input) return;
  try {
    res.status(201).json(await scholarships.draftRecommendation(tenantOf(req), userOf(req), input));
  } catch (error) {
    sendError(res, error);
  }
});

scholarshipsRouter.post("/recommend/:id/sign", ...recommend, async (req, res) => {
  const id = parseId(req, res);
  if (id == null) return;
  try {
    res.json(await scholarships.signRecommendation(tenantOf(req), userOf(req), id));
  } catch (error) {
    sendError(res, error);
  }
});

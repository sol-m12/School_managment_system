import { Router, type Request, type Response } from "express";
import type { ZodType } from "zod";
import { requirePermission } from "../../middleware/requirePermission.js";
import {
  answerBodySchema,
  idParamSchema,
  questionBodySchema,
  wordBodySchema,
} from "./forum.schema.js";
import { ForumError, type ForumErrorCode } from "./forum.service.js";
import * as forum from "./forum.service.js";

export const forumRouter = Router();

const student = requirePermission("forum.student");
const moderate = requirePermission("forum.moderate");
const filter = requirePermission("forum.filter");

const STATUS: Record<ForumErrorCode, number> = {
  NOT_FOUND: 404,
  NOT_ASSIGNED: 403,
  PROFANITY: 400,
  ALREADY_VOTED: 409,
  VALIDATION: 400,
};

function sendError(res: Response, error: unknown): void {
  if (error instanceof ForumError) {
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

forumRouter.get("/questions", ...student, async (req, res) => {
  try {
    res.json(await forum.listQuestions(tenantOf(req)));
  } catch (error) {
    sendError(res, error);
  }
});

forumRouter.get("/questions/:id", ...student, async (req, res) => {
  const id = parseId(req, res);
  if (id == null) return;
  try {
    res.json(await forum.getQuestion(tenantOf(req), id));
  } catch (error) {
    sendError(res, error);
  }
});

forumRouter.post("/questions", ...student, async (req, res) => {
  const input = parseBody(questionBodySchema, req, res);
  if (!input) return;
  try {
    res.status(201).json(await forum.postQuestion(tenantOf(req), userOf(req), input));
  } catch (error) {
    sendError(res, error);
  }
});

forumRouter.post("/questions/:id/answers", ...student, async (req, res) => {
  const id = parseId(req, res);
  if (id == null) return;
  const input = parseBody(answerBodySchema, req, res);
  if (!input) return;
  try {
    res.status(201).json(await forum.postAnswer(tenantOf(req), userOf(req), id, input));
  } catch (error) {
    sendError(res, error);
  }
});

forumRouter.post("/answers/:id/upvote", ...student, async (req, res) => {
  const id = parseId(req, res);
  if (id == null) return;
  try {
    res.status(201).json(await forum.upvoteAnswer(tenantOf(req), userOf(req), id));
  } catch (error) {
    sendError(res, error);
  }
});

forumRouter.get("/moderate/questions", ...moderate, async (req, res) => {
  try {
    res.json(await forum.listQuestions(tenantOf(req)));
  } catch (error) {
    sendError(res, error);
  }
});

forumRouter.get("/moderate/questions/:id", ...moderate, async (req, res) => {
  const id = parseId(req, res);
  if (id == null) return;
  try {
    res.json(await forum.getQuestion(tenantOf(req), id));
  } catch (error) {
    sendError(res, error);
  }
});

forumRouter.post("/moderate/answers/:id/endorse", ...moderate, async (req, res) => {
  const id = parseId(req, res);
  if (id == null) return;
  try {
    res.json(await forum.endorseAnswer(tenantOf(req), userOf(req), id));
  } catch (error) {
    sendError(res, error);
  }
});

forumRouter.delete("/moderate/questions/:id", ...moderate, async (req, res) => {
  const id = parseId(req, res);
  if (id == null) return;
  try {
    res.json(await forum.moderateDelete(tenantOf(req), "question", id));
  } catch (error) {
    sendError(res, error);
  }
});

forumRouter.delete("/moderate/answers/:id", ...moderate, async (req, res) => {
  const id = parseId(req, res);
  if (id == null) return;
  try {
    res.json(await forum.moderateDelete(tenantOf(req), "answer", id));
  } catch (error) {
    sendError(res, error);
  }
});

forumRouter.get("/filter/words", ...filter, async (req, res) => {
  try {
    res.json(await forum.listProfanity(tenantOf(req)));
  } catch (error) {
    sendError(res, error);
  }
});

forumRouter.post("/filter/words", ...filter, async (req, res) => {
  const input = parseBody(wordBodySchema, req, res);
  if (!input) return;
  try {
    res.status(201).json(await forum.addProfanity(tenantOf(req), input));
  } catch (error) {
    sendError(res, error);
  }
});

forumRouter.delete("/filter/words/:id", ...filter, async (req, res) => {
  const id = parseId(req, res);
  if (id == null) return;
  try {
    res.json(await forum.removeProfanity(tenantOf(req), id));
  } catch (error) {
    sendError(res, error);
  }
});

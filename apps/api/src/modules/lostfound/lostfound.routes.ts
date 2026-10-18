import { Router, type Request, type Response } from "express";
import type { ZodType } from "zod";
import { requirePermission } from "../../middleware/requirePermission.js";
import { idParamSchema, moderateSchema, postItemSchema } from "./lostfound.schema.js";
import { LostFoundError, type LostFoundErrorCode } from "./lostfound.service.js";
import * as lostfound from "./lostfound.service.js";

export const lostfoundRouter = Router();

const post = requirePermission("lostfound.post");
const moderate = requirePermission("lostfound.moderate");

const STATUS: Record<LostFoundErrorCode, number> = {
  NOT_FOUND: 404,
  NOT_PENDING: 409,
  VALIDATION: 400,
};

function sendError(res: Response, error: unknown): void {
  if (error instanceof LostFoundError) {
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

lostfoundRouter.get("/board", ...post, async (req, res) => {
  try {
    res.json(await lostfound.listBoard(tenantOf(req)));
  } catch (error) {
    sendError(res, error);
  }
});

lostfoundRouter.get("/mine", ...post, async (req, res) => {
  try {
    res.json(await lostfound.listMine(tenantOf(req), userOf(req)));
  } catch (error) {
    sendError(res, error);
  }
});

lostfoundRouter.post("/", ...post, async (req, res) => {
  const input = parseBody(postItemSchema, req, res);
  if (!input) return;
  try {
    res.status(201).json(await lostfound.postItem(tenantOf(req), userOf(req), input));
  } catch (error) {
    sendError(res, error);
  }
});

lostfoundRouter.get("/queue", ...moderate, async (req, res) => {
  try {
    res.json(await lostfound.listQueue(tenantOf(req)));
  } catch (error) {
    sendError(res, error);
  }
});

lostfoundRouter.post("/:id/moderate", ...moderate, async (req, res) => {
  const id = parseId(req, res);
  if (id == null) return;
  const input = parseBody(moderateSchema, req, res);
  if (!input) return;
  try {
    res.json(await lostfound.moderateItem(tenantOf(req), userOf(req), id, input));
  } catch (error) {
    sendError(res, error);
  }
});

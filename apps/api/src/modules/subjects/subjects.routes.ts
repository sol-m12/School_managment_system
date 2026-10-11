import { Router, type Request, type Response } from "express";
import { requirePermission } from "../../middleware/requirePermission.js";
import {
  isStreamAllowed,
  listQuerySchema,
  subjectBodySchema,
  subjectIdParamSchema,
  type SubjectInput,
} from "./subjects.schema.js";
import {
  SubjectError,
  createSubject,
  deleteSubject,
  getSubject,
  listSubjects,
  updateSubject,
  type SubjectErrorCode,
} from "./subjects.service.js";

export const subjectsRouter = Router();

const STATUS: Record<SubjectErrorCode, number> = {
  SUBJECT_NOT_FOUND: 404,
  SUBJECT_DUPLICATE: 409,
  SUBJECT_IN_USE: 409,
};

function sendError(res: Response, error: unknown): void {
  if (error instanceof SubjectError) {
    res.status(STATUS[error.code]).json({ code: error.code });
    return;
  }
  res.status(500).json({ code: "INTERNAL_ERROR" });
}

function tenantOf(req: Request): number {
  if (!req.auth) throw new Error("authenticate must run first");
  return req.auth.tenantId;
}

/** Parses the body; sends the error response and returns null when invalid. */
function parseBody(req: Request, res: Response): SubjectInput | null {
  const parsed = subjectBodySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ code: "VALIDATION_ERROR" });
    return null;
  }
  if (!isStreamAllowed(parsed.data)) {
    res.status(400).json({ code: "SUBJECT_STREAM_INVALID" });
    return null;
  }
  return parsed.data;
}

function parseId(req: Request, res: Response): number | null {
  const parsed = subjectIdParamSchema.safeParse(req.params);
  if (!parsed.success) {
    res.status(404).json({ code: "SUBJECT_NOT_FOUND" });
    return null;
  }
  return parsed.data.id;
}

subjectsRouter.get("/", ...requirePermission("subjects.read"), async (req, res) => {
  const query = listQuerySchema.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ code: "VALIDATION_ERROR" });
    return;
  }
  try {
    res.json(await listSubjects(tenantOf(req), query.data.page, query.data.pageSize));
  } catch (error) {
    sendError(res, error);
  }
});

subjectsRouter.get("/:id", ...requirePermission("subjects.read"), async (req, res) => {
  const id = parseId(req, res);
  if (id === null) return;
  try {
    res.json({ subject: await getSubject(tenantOf(req), id) });
  } catch (error) {
    sendError(res, error);
  }
});

subjectsRouter.post("/", ...requirePermission("subjects.create"), async (req, res) => {
  const input = parseBody(req, res);
  if (!input) return;
  try {
    res.status(201).json({ subject: await createSubject(tenantOf(req), input) });
  } catch (error) {
    sendError(res, error);
  }
});

subjectsRouter.put("/:id", ...requirePermission("subjects.update"), async (req, res) => {
  const id = parseId(req, res);
  if (id === null) return;
  const input = parseBody(req, res);
  if (!input) return;
  try {
    res.json({ subject: await updateSubject(tenantOf(req), id, input) });
  } catch (error) {
    sendError(res, error);
  }
});

subjectsRouter.delete("/:id", ...requirePermission("subjects.delete"), async (req, res) => {
  const id = parseId(req, res);
  if (id === null) return;
  try {
    await deleteSubject(tenantOf(req), id);
    res.status(204).end();
  } catch (error) {
    sendError(res, error);
  }
});

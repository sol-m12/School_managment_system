import { Router, type Request, type Response } from "express";
import multer from "multer";
import type { ZodType } from "zod";
import { authenticate } from "../../middleware/authenticate.js";
import { requirePermission } from "../../middleware/requirePermission.js";
import {
  assignmentBodySchema,
  assignmentUpdateSchema,
  placementAutoSchema,
  placementManualSchema,
  placementQuerySchema,
  placementResetSchema,
  scheduleGenerateSchema,
  scheduleMoveSchema,
  scheduleSwapSchema,
  studentBodySchema,
} from "./academics.schema.js";
import { idParamSchema as adminId } from "../admin/admin.schema.js";
import * as boards from "./boards.service.js";
import { PhotoError } from "./photoStore.js";
import { AcademicsError, type AcademicsCode } from "./students.service.js";
import * as students from "./students.service.js";

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

export const academicsRouter = Router();

const STATUS: Record<AcademicsCode, number> = {
  NOT_FOUND: 404,
  STUDENT_IN_USE: 409,
  USERNAME_TAKEN: 409,
  PHOTO_TYPE: 400,
  PHOTO_SIZE: 400,
  PLACEMENT_GRADE: 400,
  PLACEMENT_NO_SECTION: 400,
  PLACEMENT_FULL: 400,
  PLACEMENT_NONE: 400,
  PLACEMENT_CONFLICT: 409,
  PLACEMENT_SCOPE: 400,
  TEACHER_LIMIT: 409,
  ASSIGNMENT_EXISTS: 409,
  SCHEDULE_SHIFT: 400,
  SCHEDULE_NO_CLASS: 400,
  SCHEDULE_OVER_CAPACITY: 409,
  SCHEDULE_TEACHER_WEEK: 409,
  SCHEDULE_TEACHER_DAILY: 409,
  SCHEDULE_SUBJECT_DAYS: 409,
  SCHEDULE_PACKING: 409,
  SCHEDULE_UNSOLVED: 409,
  SCHEDULE_MOVE: 409,
};

function sendError(res: Response, error: unknown): void {
  if (error instanceof AcademicsError) {
    res.status(STATUS[error.code]).json({ code: error.code, ...(error.extra ?? {}) });
    return;
  }
  if (error instanceof PhotoError) {
    res.status(error.code === "NOT_FOUND" ? 404 : 400).json({ code: error.code === "NOT_FOUND" ? "NOT_FOUND" : error.code });
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

academicsRouter.get("/students/:id", ...requirePermission("students.manage"), async (req, res) => {
  const params = adminId.safeParse(req.params);
  if (!params.success) {
    res.status(404).json({ code: "NOT_FOUND" });
    return;
  }
  try {
    res.json({ student: await students.getStudent(tenantOf(req), params.data.id) });
  } catch (error) {
    sendError(res, error);
  }
});

academicsRouter.post("/students", ...requirePermission("students.manage"), async (req, res) => {
  const input = parseBody(studentBodySchema, req, res);
  if (!input) return;
  try {
    res.status(201).json({ student: await students.createStudent(tenantOf(req), userOf(req), input) });
  } catch (error) {
    sendError(res, error);
  }
});

academicsRouter.put("/students/:id", ...requirePermission("students.manage"), async (req, res) => {
  const params = adminId.safeParse(req.params);
  if (!params.success) {
    res.status(404).json({ code: "NOT_FOUND" });
    return;
  }
  const input = parseBody(studentBodySchema, req, res);
  if (!input) return;
  try {
    res.json({ student: await students.updateStudent(tenantOf(req), params.data.id, input) });
  } catch (error) {
    sendError(res, error);
  }
});

academicsRouter.delete("/students/:id", ...requirePermission("students.manage"), async (req, res) => {
  const params = adminId.safeParse(req.params);
  if (!params.success) {
    res.status(404).json({ code: "NOT_FOUND" });
    return;
  }
  try {
    await students.deleteStudent(tenantOf(req), params.data.id);
    res.json({ ok: true });
  } catch (error) {
    sendError(res, error);
  }
});

academicsRouter.get("/students/:id/photo", ...requirePermission("students.manage"), async (req, res) => {
  const params = adminId.safeParse(req.params);
  if (!params.success) {
    res.status(404).json({ code: "NOT_FOUND" });
    return;
  }
  try {
    const photo = await students.studentPhoto(tenantOf(req), params.data.id);
    res.setHeader("Content-Type", photo.mime);
    res.setHeader("Cache-Control", "private, max-age=60");
    res.send(photo.bytes);
  } catch (error) {
    sendError(res, error);
  }
});

academicsRouter.get("/placement", ...requirePermission("students.manage"), async (req, res) => {
  const parsed = placementQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ code: "VALIDATION_ERROR" });
    return;
  }
  try {
    res.json(await boards.listPlacement(tenantOf(req), parsed.data));
  } catch (error) {
    sendError(res, error);
  }
});

academicsRouter.post("/placement/auto", ...requirePermission("students.manage"), async (req, res) => {
  const input = parseBody(placementAutoSchema, req, res);
  if (!input) return;
  try {
    res.json(await boards.autoPlace(tenantOf(req), input));
  } catch (error) {
    sendError(res, error);
  }
});

academicsRouter.post("/placement/manual", ...requirePermission("students.manage"), async (req, res) => {
  const input = parseBody(placementManualSchema, req, res);
  if (!input) return;
  try {
    res.json(await boards.manualPlace(tenantOf(req), input));
  } catch (error) {
    sendError(res, error);
  }
});

academicsRouter.post("/placement/reset", ...requirePermission("students.manage"), async (req, res) => {
  const input = parseBody(placementResetSchema, req, res);
  if (!input) return;
  try {
    res.json(await boards.resetPlacement(tenantOf(req), input));
  } catch (error) {
    sendError(res, error);
  }
});

academicsRouter.get("/system-assignment", ...requirePermission("teachingLoad.manage"), async (req, res) => {
  try {
    res.json(await boards.listAssignments(tenantOf(req)));
  } catch (error) {
    sendError(res, error);
  }
});

academicsRouter.post("/system-assignment/auto", ...requirePermission("teachingLoad.manage"), async (req, res) => {
  try {
    res.json(await boards.autoAssign(tenantOf(req)));
  } catch (error) {
    sendError(res, error);
  }
});

academicsRouter.post("/system-assignment", ...requirePermission("teachingLoad.manage"), async (req, res) => {
  const input = parseBody(assignmentBodySchema, req, res);
  if (!input) return;
  try {
    await boards.quickAssign(tenantOf(req), input);
    res.status(201).json({ ok: true });
  } catch (error) {
    sendError(res, error);
  }
});

academicsRouter.put("/system-assignment/:id", ...requirePermission("teachingLoad.manage"), async (req, res) => {
  const params = adminId.safeParse(req.params);
  if (!params.success) {
    res.status(404).json({ code: "NOT_FOUND" });
    return;
  }
  const input = parseBody(assignmentUpdateSchema, req, res);
  if (!input) return;
  try {
    await boards.changeAssignment(tenantOf(req), params.data.id, input.staffId);
    res.json({ ok: true });
  } catch (error) {
    sendError(res, error);
  }
});

academicsRouter.delete("/system-assignment/:id", ...requirePermission("teachingLoad.manage"), async (req, res) => {
  const params = adminId.safeParse(req.params);
  if (!params.success) {
    res.status(404).json({ code: "NOT_FOUND" });
    return;
  }
  try {
    await boards.removeAssignment(tenantOf(req), params.data.id);
    res.json({ ok: true });
  } catch (error) {
    sendError(res, error);
  }
});

academicsRouter.get("/schedule/board", ...requirePermission("periodSchedule.manage"), async (req, res) => {
  const shift = req.query.shift === "Afternoon" || req.query.shift === "Both" ? req.query.shift : "Morning";
  try {
    res.json(await boards.scheduleBoard(tenantOf(req), shift));
  } catch (error) {
    sendError(res, error);
  }
});

academicsRouter.post("/schedule/generate", ...requirePermission("periodSchedule.manage"), async (req, res) => {
  const input = parseBody(scheduleGenerateSchema, req, res);
  if (!input) return;
  try {
    res.json(await boards.generateSchedule(tenantOf(req), userOf(req), input));
  } catch (error) {
    sendError(res, error);
  }
});

academicsRouter.post("/schedule/move", ...requirePermission("periodSchedule.manage"), async (req, res) => {
  const input = parseBody(scheduleMoveSchema, req, res);
  if (!input) return;
  try {
    await boards.moveLesson(tenantOf(req), input);
    res.json({ ok: true });
  } catch (error) {
    sendError(res, error);
  }
});

academicsRouter.post("/schedule/swap", ...requirePermission("periodSchedule.manage"), async (req, res) => {
  const input = parseBody(scheduleSwapSchema, req, res);
  if (!input) return;
  try {
    await boards.swapLessons(tenantOf(req), input);
    res.json({ ok: true });
  } catch (error) {
    sendError(res, error);
  }
});

academicsRouter.get("/profile/photo", authenticate, async (req, res) => {
  try {
    const photo = await students.ownPhoto(tenantOf(req), userOf(req));
    res.setHeader("Content-Type", photo.mime);
    res.setHeader("Cache-Control", "private, max-age=60");
    res.send(photo.bytes);
  } catch (error) {
    sendError(res, error);
  }
});

academicsRouter.post("/profile/photo", authenticate, (req, res) => {
  upload.single("photo")(req, res, (error: unknown) => {
    if (error) {
      res.status(400).json({ code: "PHOTO_SIZE" });
      return;
    }
    const file = req.file;
    if (!file) {
      res.status(400).json({ code: "PHOTO_TYPE" });
      return;
    }
    void students
      .saveOwnPhoto(tenantOf(req), userOf(req), file.buffer)
      .then((saved) => res.json(saved))
      .catch((caught: unknown) => sendError(res, caught));
  });
});

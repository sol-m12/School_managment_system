import { Router, type Request, type Response } from "express";
import { requirePermission } from "../../middleware/requirePermission.js";
import { idParamSchema, messageBodySchema, resourceQuerySchema } from "./student.schema.js";
import { StudentError } from "./student.service.js";
import * as student from "./student.service.js";

export const studentRouter = Router();

function tenantOf(req: Request): number {
  if (!req.auth) throw new Error("authenticate must run first");
  return req.auth.tenantId;
}

function userOf(req: Request): number {
  if (!req.auth) throw new Error("authenticate must run first");
  return req.auth.userId;
}

function sendError(res: Response, error: unknown): void {
  if (error instanceof StudentError) {
    res.status(404).json({ code: error.code });
    return;
  }
  res.status(500).json({ code: "INTERNAL_ERROR" });
}

function fileId(req: Request, res: Response): number | null {
  const parsed = idParamSchema.safeParse(req.params);
  if (!parsed.success) {
    res.status(404).json({ code: "NOT_FOUND" });
    return null;
  }
  return parsed.data.id;
}

function sendDownload(res: Response, file: { fileName: string; bytes: Buffer }): void {
  res.setHeader("Content-Type", "application/octet-stream");
  res.setHeader("Content-Disposition", `attachment; filename="${file.fileName.replace(/"/g, "")}"`);
  res.setHeader("Cache-Control", "private, no-store");
  res.send(file.bytes);
}

studentRouter.get("/home", ...requirePermission("results.readOwn"), async (req, res) => {
  try {
    res.json(await student.studentHome(tenantOf(req), userOf(req)));
  } catch (error) {
    sendError(res, error);
  }
});

studentRouter.get("/results", ...requirePermission("results.readOwn"), async (req, res) => {
  try {
    res.json(await student.studentResults(tenantOf(req), userOf(req)));
  } catch (error) {
    sendError(res, error);
  }
});

studentRouter.get("/groups", ...requirePermission("groups.readOwn"), async (req, res) => {
  try {
    res.json(await student.studentGroups(tenantOf(req), userOf(req)));
  } catch (error) {
    sendError(res, error);
  }
});

studentRouter.get("/groups/:id", ...requirePermission("groups.readOwn"), async (req, res) => {
  const id = fileId(req, res);
  if (!id) return;
  try {
    res.json(await student.studentGroup(tenantOf(req), userOf(req), id));
  } catch (error) {
    sendError(res, error);
  }
});

studentRouter.post("/groups/:id/messages", ...requirePermission("groups.readOwn"), async (req, res) => {
  const id = fileId(req, res);
  if (!id) return;
  const parsed = messageBodySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ code: "VALIDATION_ERROR" });
    return;
  }
  try {
    res.status(201).json(await student.postGroupMessage(tenantOf(req), userOf(req), id, parsed.data.text));
  } catch (error) {
    sendError(res, error);
  }
});

studentRouter.get("/simulations", ...requirePermission("simulations.readOwn"), async (req, res) => {
  try {
    res.json(await student.studentSimulations(tenantOf(req), userOf(req)));
  } catch (error) {
    sendError(res, error);
  }
});

studentRouter.get("/simulations/:id/file", ...requirePermission("simulations.readOwn"), async (req, res) => {
  const id = fileId(req, res);
  if (!id) return;
  try {
    sendDownload(res, await student.readSimulationFile(tenantOf(req), userOf(req), id));
  } catch (error) {
    sendError(res, error);
  }
});

studentRouter.get("/resources", ...requirePermission("resources.readOwn"), async (req, res) => {
  const parsed = resourceQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ code: "VALIDATION_ERROR" });
    return;
  }
  try {
    res.json(await student.studentResources(tenantOf(req), userOf(req), parsed.data));
  } catch (error) {
    sendError(res, error);
  }
});

studentRouter.get("/resources/:id/file", ...requirePermission("resources.readOwn"), async (req, res) => {
  const id = fileId(req, res);
  if (!id) return;
  try {
    sendDownload(res, await student.readResourceFile(tenantOf(req), userOf(req), id));
  } catch (error) {
    sendError(res, error);
  }
});

studentRouter.get("/exams", ...requirePermission("exams.readOwn"), async (req, res) => {
  try {
    const header = req.get("x-safeexambrowser-configkeyhash");
    res.json(await student.studentExams(tenantOf(req), userOf(req), header));
  } catch (error) {
    sendError(res, error);
  }
});

studentRouter.get("/quiz", ...requirePermission("quiz.readOwn"), async (req, res) => {
  try {
    res.json(await student.studentQuiz(tenantOf(req), userOf(req)));
  } catch (error) {
    sendError(res, error);
  }
});

studentRouter.get("/labs", ...requirePermission("simulations.readOwn"), async (_req, res) => {
  res.json(student.virtualLabs());
});

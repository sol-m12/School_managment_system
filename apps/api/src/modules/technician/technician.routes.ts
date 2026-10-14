import { Router, type Request, type Response } from "express";
import type { ZodType } from "zod";
import { requirePermission } from "../../middleware/requirePermission.js";
import {
  announcementBodySchema,
  idParamSchema,
  roleBodySchema,
  staffBodySchema,
  studentIdQuerySchema,
  teacherBodySchema,
} from "./technician.schema.js";
import { TechnicianError, type TechnicianErrorCode } from "./technician.service.js";
import * as technician from "./technician.service.js";

export const technicianRouter = Router();

const STATUS: Record<TechnicianErrorCode, number> = {
  NOT_FOUND: 404,
  USERNAME_TAKEN: 409,
  ROLE_UNKNOWN: 400,
  SUBJECT_NOT_FOUND: 400,
};

function sendError(res: Response, error: unknown): void {
  if (error instanceof TechnicianError) {
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
    res.status(404).json({ code: "NOT_FOUND" });
    return null;
  }
  return parsed.data.id;
}

technicianRouter.get("/announcements", ...requirePermission("announcements.manage"), async (req, res) => {
  try {
    res.json({ rows: await technician.listAnnouncements(tenantOf(req)) });
  } catch (error) {
    sendError(res, error);
  }
});

technicianRouter.post("/announcements", ...requirePermission("announcements.manage"), async (req, res) => {
  const input = parseBody(announcementBodySchema, req, res);
  if (!input) return;
  try {
    res.status(201).json({ announcement: await technician.createAnnouncement(tenantOf(req), userOf(req), input) });
  } catch (error) {
    sendError(res, error);
  }
});

technicianRouter.put("/announcements/:id", ...requirePermission("announcements.manage"), async (req, res) => {
  const id = parseId(req, res);
  const input = parseBody(announcementBodySchema, req, res);
  if (id === null || !input) return;
  try {
    res.json({ announcement: await technician.updateAnnouncement(tenantOf(req), id, input) });
  } catch (error) {
    sendError(res, error);
  }
});

technicianRouter.delete("/announcements/:id", ...requirePermission("announcements.manage"), async (req, res) => {
  const id = parseId(req, res);
  if (id === null) return;
  try {
    await technician.deleteAnnouncement(tenantOf(req), id);
    res.status(204).send();
  } catch (error) {
    sendError(res, error);
  }
});

technicianRouter.get("/options", ...requirePermission("staffRegistration.manage"), async (req, res) => {
  try {
    res.json(await technician.registrationOptions(tenantOf(req)));
  } catch (error) {
    sendError(res, error);
  }
});

technicianRouter.get("/teachers", ...requirePermission("staffRegistration.manage"), async (req, res) => {
  try {
    res.json({ rows: await technician.listTeachers(tenantOf(req)) });
  } catch (error) {
    sendError(res, error);
  }
});

technicianRouter.post("/teachers", ...requirePermission("staffRegistration.manage"), async (req, res) => {
  const input = parseBody(teacherBodySchema, req, res);
  if (!input) return;
  try {
    res.status(201).json(await technician.createTeacher(tenantOf(req), input));
  } catch (error) {
    sendError(res, error);
  }
});

technicianRouter.get("/staff", ...requirePermission("staffRegistration.manage"), async (req, res) => {
  try {
    res.json({ rows: await technician.listStaff(tenantOf(req)) });
  } catch (error) {
    sendError(res, error);
  }
});

technicianRouter.post("/staff", ...requirePermission("staffRegistration.manage"), async (req, res) => {
  const input = parseBody(staffBodySchema, req, res);
  if (!input) return;
  try {
    res.status(201).json(await technician.createStaff(tenantOf(req), input));
  } catch (error) {
    sendError(res, error);
  }
});

technicianRouter.post("/roles", ...requirePermission("staffRegistration.manage"), (req, res) => {
  const input = parseBody(roleBodySchema, req, res);
  if (!input) return;
  // users.role and staff.role are fixed enums. A new name cannot be stored.
  res.status(400).json({ code: "ROLE_UNKNOWN" });
});

technicianRouter.get("/student-ids", ...requirePermission("accounts.manage"), async (req, res) => {
  const parsed = studentIdQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ code: "VALIDATION_ERROR" });
    return;
  }
  try {
    res.json(await technician.listStudentIds(tenantOf(req), parsed.data));
  } catch (error) {
    sendError(res, error);
  }
});

technicianRouter.get("/student-ids/:id/photo", ...requirePermission("accounts.manage"), async (req, res) => {
  const id = parseId(req, res);
  if (id === null) return;
  try {
    const photo = await technician.studentIdPhoto(tenantOf(req), id);
    res.setHeader("Content-Type", photo.mime);
    res.setHeader("Cache-Control", "private, max-age=300");
    res.send(photo.bytes);
  } catch (error) {
    sendError(res, error);
  }
});

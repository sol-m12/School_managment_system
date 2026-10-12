import { Router, type Request, type Response } from "express";
import type { ZodType } from "zod";
import { authenticate } from "../../middleware/authenticate.js";
import { requirePermission } from "../../middleware/requirePermission.js";
import {
  academicYearBodySchema,
  approveAttendanceBodySchema,
  approveGradeBodySchema,
  expenseBodySchema,
  gradeUnlockBodySchema,
  idParamSchema,
  incomeBodySchema,
  passwordResetBodySchema,
  profileBodySchema,
  schoolInfoBodySchema,
  studentQuerySchema,
  userQuerySchema,
} from "./admin.schema.js";
import { AdminError, type AdminErrorCode } from "./admin.service.js";
import * as admin from "./admin.service.js";

export const adminRouter = Router();

const STATUS: Record<AdminErrorCode, number> = {
  NOT_FOUND: 404,
  USERNAME_TAKEN: 409,
  GRADE_NOT_FOUND: 404,
  BACKUP_BLOCKED: 403,
};

function sendError(res: Response, error: unknown): void {
  if (error instanceof AdminError) {
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

function blank(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length === 0 ? undefined : trimmed;
}

adminRouter.get("/academic-year", ...requirePermission("academicYear.manage"), async (req, res) => {
  try {
    res.json(await admin.getAcademicYear(tenantOf(req)));
  } catch (error) {
    sendError(res, error);
  }
});

adminRouter.put("/academic-year", ...requirePermission("academicYear.manage"), async (req, res) => {
  const input = parseBody(academicYearBodySchema, req, res);
  if (!input) return;
  try {
    res.json(await admin.updateAcademicYear(tenantOf(req), input));
  } catch (error) {
    sendError(res, error);
  }
});

adminRouter.get("/users", ...requirePermission("passwords.reset"), async (req, res) => {
  const parsed = userQuerySchema.safeParse({ q: blank(req.query.q) });
  if (!parsed.success) {
    res.status(400).json({ code: "VALIDATION_ERROR" });
    return;
  }
  try {
    res.json({ rows: await admin.searchUsers(tenantOf(req), parsed.data.q) });
  } catch (error) {
    sendError(res, error);
  }
});

adminRouter.post("/passwords", ...requirePermission("passwords.reset"), async (req, res) => {
  const input = parseBody(passwordResetBodySchema, req, res);
  if (!input) return;
  try {
    await admin.resetPassword(tenantOf(req), input.userId, input.password);
    res.json({ ok: true });
  } catch (error) {
    sendError(res, error);
  }
});

adminRouter.get("/school-info", ...requirePermission("schoolInfo.manage"), async (req, res) => {
  try {
    res.json({ school: await admin.getSchoolInfo(tenantOf(req)) });
  } catch (error) {
    sendError(res, error);
  }
});

adminRouter.put("/school-info", ...requirePermission("schoolInfo.manage"), async (req, res) => {
  const input = parseBody(schoolInfoBodySchema, req, res);
  if (!input) return;
  try {
    res.json({ school: await admin.updateSchoolInfo(tenantOf(req), input) });
  } catch (error) {
    sendError(res, error);
  }
});

function queryOf(req: Request): Record<string, string> {
  return Object.fromEntries(
    Object.entries({
      academicYear: blank(req.query.academicYear),
      gradeLevel: blank(req.query.gradeLevel),
      section: blank(req.query.section),
      gender: blank(req.query.gender),
      registrationType: blank(req.query.registrationType),
    }).filter((entry): entry is [string, string] => entry[1] !== undefined),
  );
}

adminRouter.get("/students", ...requirePermission("students.manage"), async (req, res) => {
  const parsed = studentQuerySchema.safeParse(queryOf(req));
  if (!parsed.success) {
    res.status(400).json({ code: "VALIDATION_ERROR" });
    return;
  }
  try {
    res.json(await admin.listStudents(tenantOf(req), parsed.data));
  } catch (error) {
    sendError(res, error);
  }
});

adminRouter.get("/repeaters", ...requirePermission("studentStatusReport.read"), async (req, res) => {
  const parsed = studentQuerySchema.safeParse(queryOf(req));
  if (!parsed.success) {
    res.status(400).json({ code: "VALIDATION_ERROR" });
    return;
  }
  try {
    res.json(await admin.listRepeaters(tenantOf(req), parsed.data));
  } catch (error) {
    sendError(res, error);
  }
});

adminRouter.get("/teachers", ...requirePermission("teachingLoad.manage"), async (req, res) => {
  try {
    res.json(await admin.listTeachers(tenantOf(req)));
  } catch (error) {
    sendError(res, error);
  }
});

adminRouter.get("/schedule", ...requirePermission("periodSchedule.manage"), async (req, res) => {
  try {
    res.json(await admin.listSchedule(tenantOf(req)));
  } catch (error) {
    sendError(res, error);
  }
});

adminRouter.get("/reports", ...requirePermission("academicReports.read"), async (req, res) => {
  try {
    res.json(await admin.listReports(tenantOf(req)));
  } catch (error) {
    sendError(res, error);
  }
});

adminRouter.post("/grades/unlock", ...requirePermission("gradeCorrection.approve"), async (req, res) => {
  const input = parseBody(gradeUnlockBodySchema, req, res);
  if (!input) return;
  try {
    res.json(await admin.unlockGrades(tenantOf(req), input));
  } catch (error) {
    sendError(res, error);
  }
});

adminRouter.get("/approvals", ...requirePermission("academicApprovals.manage"), async (req, res) => {
  try {
    res.json(await admin.listApprovals(tenantOf(req)));
  } catch (error) {
    sendError(res, error);
  }
});

adminRouter.post("/approvals/staff/:id", ...requirePermission("academicApprovals.manage"), async (req, res) => {
  const parsed = idParamSchema.safeParse(req.params);
  if (!parsed.success) {
    res.status(404).json({ code: "NOT_FOUND" });
    return;
  }
  try {
    await admin.approveStaff(tenantOf(req), parsed.data.id);
    res.json({ ok: true });
  } catch (error) {
    sendError(res, error);
  }
});

adminRouter.post("/approvals/students", ...requirePermission("academicApprovals.manage"), async (req, res) => {
  const input = parseBody(approveGradeBodySchema, req, res);
  if (!input) return;
  try {
    res.json(await admin.approveStudents(tenantOf(req), userOf(req), input.gradeLevel));
  } catch (error) {
    sendError(res, error);
  }
});

adminRouter.post("/approvals/attendance", ...requirePermission("academicApprovals.manage"), async (req, res) => {
  const input = parseBody(approveAttendanceBodySchema, req, res);
  if (!input) return;
  try {
    res.json(await admin.approveAttendance(tenantOf(req), userOf(req), input.recordedBy, input.startDate, input.endDate));
  } catch (error) {
    sendError(res, error);
  }
});

adminRouter.get("/store-approvals", ...requirePermission("approvals.read"), async (_req, res) => {
  res.json({ rows: [] });
});

adminRouter.get("/files", ...requirePermission("files.manage"), async (req, res) => {
  try {
    res.json(await admin.listFiles(tenantOf(req)));
  } catch (error) {
    sendError(res, error);
  }
});

adminRouter.get("/profile", authenticate, async (req, res) => {
  try {
    res.json({ profile: await admin.getProfile(tenantOf(req), userOf(req)) });
  } catch (error) {
    sendError(res, error);
  }
});

adminRouter.put("/profile", authenticate, async (req, res) => {
  const input = parseBody(profileBodySchema, req, res);
  if (!input) return;
  try {
    res.json({ profile: await admin.updateProfile(tenantOf(req), userOf(req), input) });
  } catch (error) {
    sendError(res, error);
  }
});

adminRouter.get("/income", ...requirePermission("finance.income"), async (req, res) => {
  try {
    res.json(await admin.listIncome(tenantOf(req)));
  } catch (error) {
    sendError(res, error);
  }
});

adminRouter.post("/income", ...requirePermission("finance.income"), async (req, res) => {
  const input = parseBody(incomeBodySchema, req, res);
  if (!input) return;
  try {
    res.status(201).json(await admin.createIncome(tenantOf(req), userOf(req), input));
  } catch (error) {
    sendError(res, error);
  }
});

adminRouter.get("/expenses", ...requirePermission("finance.expense"), async (req, res) => {
  try {
    res.json(await admin.listExpenses(tenantOf(req)));
  } catch (error) {
    sendError(res, error);
  }
});

adminRouter.post("/expenses", ...requirePermission("finance.expense"), async (req, res) => {
  const input = parseBody(expenseBodySchema, req, res);
  if (!input) return;
  try {
    res.status(201).json(await admin.createExpense(tenantOf(req), userOf(req), input));
  } catch (error) {
    sendError(res, error);
  }
});

adminRouter.get("/role-modules", ...requirePermission("roleModules.manage"), async (_req, res) => {
  res.json({ rows: admin.listRoleModules() });
});

adminRouter.post("/backup", ...requirePermission("backup.create"), (_req, res) => {
  try {
    admin.refuseBackup();
  } catch (error) {
    sendError(res, error);
  }
});

adminRouter.post("/restore", ...requirePermission("backup.restore"), (_req, res) => {
  try {
    admin.refuseBackup();
  } catch (error) {
    sendError(res, error);
  }
});

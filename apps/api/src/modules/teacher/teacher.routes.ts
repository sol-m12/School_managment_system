import { Router, type Request, type Response } from "express";
import { z, type ZodType } from "zod";
import { AcademicsError } from "../academics/students.service.js";
import { requirePermission } from "../../middleware/requirePermission.js";
import {
  attendanceQuerySchema,
  examBodySchema,
  examGradeQuerySchema,
  examOpenSchema,
  examStatusSchema,
  homeroomAttendanceBodySchema,
  lessonBodySchema,
  planBodySchema,
  planIdSchema,
  questionBodySchema,
  registrationBodySchema,
  registrationQuerySchema,
  reportCardQuerySchema,
  scoreBodySchema,
  sheetQuerySchema,
  courseFileBodySchema,
  simulationBodySchema,
  storeRequestBodySchema,
  subjectAttendanceBodySchema,
  subjectAttendanceQuerySchema,
  subjectReportQuerySchema,
} from "./teacher.schema.js";
import { TeacherError, deletePlan, gradeOptions, gradeSheet, savePlans, saveScores, scheduleBoard } from "./teacher.service.js";
import {
  addLesson,
  addQuestion,
  addSimulation,
  classRoster,
  createExam,
  examOptions,
  examResultSheet,
  homeroomAttendance,
  lessonBoard,
  listExams,
  openExam,
  registrationBoard,
  removeExam,
  removeLesson,
  removeQuestion,
  removeSimulation,
  reportCards,
  saveHomeroomAttendance,
  saveRegistration,
  saveSubjectAttendance,
  setExamStatus,
  addCourseFile,
  courseFileBoard,
  simulationBoard,
  storeBoard,
  teacherHome,
  teacherProfile,
  subjectAttendance,
  subjectReport,
  submitStoreRequest,
} from "./teacherPages.service.js";

export const teacherRouter = Router();

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

function sendError(res: Response, error: unknown): void {
  if (error instanceof AcademicsError) {
    const status = error.code === "NOT_FOUND" ? 404 : error.code === "USERNAME_TAKEN" ? 409 : 400;
    res.status(status).json({ code: error.code });
    return;
  }
  if (error instanceof TeacherError) {
    const status =
      error.code === "NOT_ASSIGNED" ||
      error.code === "PLAN_NOT_FOUND" ||
      error.code === "EXAM_NOT_FOUND" ||
      error.code === "ITEM_NOT_FOUND"
        ? 404
        : error.code === "GRADES_LOCKED" || error.code === "ATTENDANCE_LOCKED" || error.code === "STORE_UNAVAILABLE"
          ? 409
          : error.code === "EXAM_PASSWORD"
            ? 403
            : 400;
    res.status(status).json({ code: error.code, ...error.extra });
    return;
  }
  res.status(500).json({ code: "INTERNAL_ERROR" });
}

teacherRouter.get("/home", ...requirePermission("assignedWork.read"), async (req, res) => {
  try {
    res.json(await teacherHome(tenantOf(req), userOf(req)));
  } catch (error) {
    sendError(res, error);
  }
});

teacherRouter.get("/schedule", ...requirePermission("assignedWork.read"), async (req, res) => {
  try {
    res.json(await scheduleBoard(tenantOf(req), userOf(req)));
  } catch (error) {
    sendError(res, error);
  }
});

teacherRouter.get("/grades/options", ...requirePermission("grades.enter"), async (req, res) => {
  try {
    res.json(await gradeOptions(tenantOf(req), userOf(req)));
  } catch (error) {
    sendError(res, error);
  }
});

teacherRouter.get("/grades/sheet", ...requirePermission("grades.enter"), async (req, res) => {
  const parsed = sheetQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ code: "VALIDATION_ERROR" });
    return;
  }
  try {
    res.json(await gradeSheet(tenantOf(req), userOf(req), parsed.data.classSelect, parsed.data.subjectId));
  } catch (error) {
    sendError(res, error);
  }
});

teacherRouter.post("/grades/plans", ...requirePermission("grades.enter"), async (req, res) => {
  const input = parseBody(planBodySchema, req, res);
  if (!input) return;
  try {
    res.json(await savePlans(tenantOf(req), userOf(req), input));
  } catch (error) {
    sendError(res, error);
  }
});

teacherRouter.delete("/grades/plans/:id", ...requirePermission("grades.enter"), async (req, res) => {
  const params = planIdSchema.safeParse(req.params);
  const query = sheetQuerySchema.safeParse(req.query);
  if (!params.success || !query.success) {
    res.status(400).json({ code: "VALIDATION_ERROR" });
    return;
  }
  try {
    await deletePlan(tenantOf(req), userOf(req), params.data.id, query.data.classSelect, query.data.subjectId);
    res.json({ deleted: true });
  } catch (error) {
    sendError(res, error);
  }
});

teacherRouter.post("/grades/scores", ...requirePermission("grades.enter"), async (req, res) => {
  const input = parseBody(scoreBodySchema, req, res);
  if (!input) return;
  try {
    res.json(await saveScores(tenantOf(req), userOf(req), input));
  } catch (error) {
    sendError(res, error);
  }
});

const questionParams = z.object({
  id: z.coerce.number().int().positive(),
  questionId: z.coerce.number().int().positive(),
});

teacherRouter.get("/attendance/homeroom", ...requirePermission("attendance.take"), async (req, res) => {
  const parsed = attendanceQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ code: "VALIDATION_ERROR" });
    return;
  }
  try {
    res.json(await homeroomAttendance(tenantOf(req), userOf(req), parsed.data.date, parsed.data.classId));
  } catch (error) {
    sendError(res, error);
  }
});

teacherRouter.post("/attendance/homeroom", ...requirePermission("attendance.take"), async (req, res) => {
  const input = parseBody(homeroomAttendanceBodySchema, req, res);
  if (!input) return;
  try {
    res.json(await saveHomeroomAttendance(tenantOf(req), userOf(req), input));
  } catch (error) {
    sendError(res, error);
  }
});

teacherRouter.get("/attendance/subject", ...requirePermission("attendance.register"), async (req, res) => {
  const parsed = subjectAttendanceQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ code: "VALIDATION_ERROR" });
    return;
  }
  try {
    res.json(await subjectAttendance(tenantOf(req), userOf(req), parsed.data));
  } catch (error) {
    sendError(res, error);
  }
});

teacherRouter.post("/attendance/subject", ...requirePermission("attendance.register"), async (req, res) => {
  const input = parseBody(subjectAttendanceBodySchema, req, res);
  if (!input) return;
  try {
    res.json(await saveSubjectAttendance(tenantOf(req), userOf(req), input));
  } catch (error) {
    sendError(res, error);
  }
});

teacherRouter.get("/exams/options", ...requirePermission("onlineExams.manage"), async (req, res) => {
  const parsed = examGradeQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ code: "VALIDATION_ERROR" });
    return;
  }
  try {
    res.json(await examOptions(tenantOf(req), userOf(req), parsed.data.grade));
  } catch (error) {
    sendError(res, error);
  }
});

teacherRouter.get("/exams", ...requirePermission("onlineExams.manage"), async (req, res) => {
  try {
    res.json(await listExams(tenantOf(req), userOf(req)));
  } catch (error) {
    sendError(res, error);
  }
});

teacherRouter.post("/exams", ...requirePermission("onlineExams.manage"), async (req, res) => {
  const input = parseBody(examBodySchema, req, res);
  if (!input) return;
  try {
    res.json(await createExam(tenantOf(req), userOf(req), input));
  } catch (error) {
    sendError(res, error);
  }
});

teacherRouter.post("/exams/:id/status", ...requirePermission("onlineExams.manage"), async (req, res) => {
  const params = planIdSchema.safeParse(req.params);
  const input = parseBody(examStatusSchema, req, res);
  if (!params.success || !input) return;
  try {
    res.json(await setExamStatus(tenantOf(req), userOf(req), params.data.id, input.status));
  } catch (error) {
    sendError(res, error);
  }
});

teacherRouter.delete("/exams/:id", ...requirePermission("onlineExams.manage"), async (req, res) => {
  const params = planIdSchema.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ code: "VALIDATION_ERROR" });
    return;
  }
  try {
    res.json(await removeExam(tenantOf(req), userOf(req), params.data.id));
  } catch (error) {
    sendError(res, error);
  }
});

teacherRouter.post("/exams/:id/open", ...requirePermission("onlineExams.manage"), async (req, res) => {
  const params = planIdSchema.safeParse(req.params);
  const input = parseBody(examOpenSchema, req, res);
  if (!params.success || !input) return;
  try {
    res.json(await openExam(tenantOf(req), userOf(req), params.data.id, input.password));
  } catch (error) {
    sendError(res, error);
  }
});

teacherRouter.post("/exams/:id/questions", ...requirePermission("onlineExams.manage"), async (req, res) => {
  const params = planIdSchema.safeParse(req.params);
  const input = parseBody(questionBodySchema, req, res);
  if (!params.success || !input) return;
  try {
    res.json(await addQuestion(tenantOf(req), userOf(req), params.data.id, input));
  } catch (error) {
    sendError(res, error);
  }
});

teacherRouter.delete("/exams/:id/questions/:questionId", ...requirePermission("onlineExams.manage"), async (req, res) => {
  const params = questionParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ code: "VALIDATION_ERROR" });
    return;
  }
  try {
    res.json(await removeQuestion(tenantOf(req), userOf(req), params.data.id, params.data.questionId));
  } catch (error) {
    sendError(res, error);
  }
});

teacherRouter.get("/exam-results", ...requirePermission("examResults.manage"), async (req, res) => {
  try {
    res.json(await listExams(tenantOf(req), userOf(req)));
  } catch (error) {
    sendError(res, error);
  }
});

teacherRouter.get("/exam-results/:id", ...requirePermission("examResults.manage"), async (req, res) => {
  const params = planIdSchema.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ code: "VALIDATION_ERROR" });
    return;
  }
  try {
    res.json(await examResultSheet(tenantOf(req), userOf(req), params.data.id));
  } catch (error) {
    sendError(res, error);
  }
});

teacherRouter.get("/lesson-plans", ...requirePermission("bestTeaching.manage"), async (req, res) => {
  try {
    res.json(await lessonBoard(tenantOf(req), userOf(req)));
  } catch (error) {
    sendError(res, error);
  }
});

teacherRouter.post("/lesson-plans", ...requirePermission("bestTeaching.manage"), async (req, res) => {
  const input = parseBody(lessonBodySchema, req, res);
  if (!input) return;
  try {
    res.json(await addLesson(tenantOf(req), userOf(req), input));
  } catch (error) {
    sendError(res, error);
  }
});

teacherRouter.delete("/lesson-plans/:id", ...requirePermission("bestTeaching.manage"), async (req, res) => {
  const params = planIdSchema.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ code: "VALIDATION_ERROR" });
    return;
  }
  try {
    res.json(await removeLesson(tenantOf(req), userOf(req), params.data.id));
  } catch (error) {
    sendError(res, error);
  }
});

teacherRouter.get("/registration", ...requirePermission("studentRegistration.manage"), async (req, res) => {
  const parsed = registrationQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ code: "VALIDATION_ERROR" });
    return;
  }
  try {
    res.json(await registrationBoard(tenantOf(req), userOf(req), parsed.data.grade, parsed.data.q));
  } catch (error) {
    sendError(res, error);
  }
});

teacherRouter.post("/registration", ...requirePermission("studentRegistration.manage"), async (req, res) => {
  const input = parseBody(registrationBodySchema, req, res);
  if (!input) return;
  try {
    res.json(
      await saveRegistration(tenantOf(req), userOf(req), {
        ...input,
        stream: input.stream ?? null,
      }),
    );
  } catch (error) {
    sendError(res, error);
  }
});

teacherRouter.get("/roster", ...requirePermission("classRoster.read"), async (req, res) => {
  const parsed = reportCardQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ code: "VALIDATION_ERROR" });
    return;
  }
  try {
    res.json(await classRoster(tenantOf(req), userOf(req), parsed.data.classId));
  } catch (error) {
    sendError(res, error);
  }
});

teacherRouter.get("/report-cards", ...requirePermission("reportCards.generate"), async (req, res) => {
  const parsed = reportCardQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ code: "VALIDATION_ERROR" });
    return;
  }
  try {
    res.json(await reportCards(tenantOf(req), userOf(req), parsed.data.classId));
  } catch (error) {
    sendError(res, error);
  }
});

teacherRouter.get("/subject-report", ...requirePermission("studentReports.read"), async (req, res) => {
  const parsed = subjectReportQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ code: "VALIDATION_ERROR" });
    return;
  }
  try {
    res.json(await subjectReport(tenantOf(req), userOf(req), parsed.data));
  } catch (error) {
    sendError(res, error);
  }
});

teacherRouter.get("/simulations", ...requirePermission("simulations.create"), async (req, res) => {
  try {
    res.json(await simulationBoard(tenantOf(req), userOf(req)));
  } catch (error) {
    sendError(res, error);
  }
});

teacherRouter.post("/simulations", ...requirePermission("simulations.create"), async (req, res) => {
  const input = parseBody(simulationBodySchema, req, res);
  if (!input) return;
  try {
    res.json(await addSimulation(tenantOf(req), userOf(req), input));
  } catch (error) {
    sendError(res, error);
  }
});

teacherRouter.delete("/simulations/:id", ...requirePermission("simulations.create"), async (req, res) => {
  const params = planIdSchema.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ code: "VALIDATION_ERROR" });
    return;
  }
  try {
    res.json(await removeSimulation(tenantOf(req), userOf(req), params.data.id));
  } catch (error) {
    sendError(res, error);
  }
});

teacherRouter.get("/store-requests", ...requirePermission("storeRequests.create"), async (req, res) => {
  try {
    res.json(await storeBoard(tenantOf(req), userOf(req)));
  } catch (error) {
    sendError(res, error);
  }
});

teacherRouter.post("/store-requests", ...requirePermission("storeRequests.create"), async (req, res) => {
  const input = parseBody(storeRequestBodySchema, req, res);
  if (!input) return;
  try {
    res.status(201).json(await submitStoreRequest(tenantOf(req), userOf(req), input));
  } catch (error) {
    sendError(res, error);
  }
});

teacherRouter.get("/profile", ...requirePermission("assignedWork.read"), async (req, res) => {
  try {
    res.json(await teacherProfile(tenantOf(req), userOf(req)));
  } catch (error) {
    sendError(res, error);
  }
});

teacherRouter.get("/course-files", ...requirePermission("files.manage"), async (req, res) => {
  try {
    res.json(await courseFileBoard(tenantOf(req), userOf(req)));
  } catch (error) {
    sendError(res, error);
  }
});

teacherRouter.post("/course-files", ...requirePermission("files.manage"), async (req, res) => {
  const input = parseBody(courseFileBodySchema, req, res);
  if (!input) return;
  try {
    res.status(201).json(await addCourseFile(tenantOf(req), userOf(req), input));
  } catch (error) {
    sendError(res, error);
  }
});

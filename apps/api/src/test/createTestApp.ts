import cookieParser from "cookie-parser";
import express, { type Express } from "express";
import { authRouter } from "../modules/auth/auth.routes.js";
import { dashboardRouter } from "../modules/dashboard/dashboard.routes.js";
import { adminRouter } from "../modules/admin/admin.routes.js";
import { publicRouter } from "../modules/public/public.routes.js";
import { subjectsRouter } from "../modules/subjects/subjects.routes.js";
import { teacherRouter } from "../modules/teacher/teacher.routes.js";
import { studentRouter } from "../modules/student/student.routes.js";
import { storeRouter } from "../modules/store/store.routes.js";
import { technicianRouter } from "../modules/technician/technician.routes.js";

/** Minimal Express app for integration tests (no listen). */
export function createTestApp(): Express {
  const app = express();
  app.use(express.json({ limit: "1mb" }));
  app.use(cookieParser());
  app.use("/public", publicRouter);
  app.use("/auth", authRouter);
  app.use("/dashboard", dashboardRouter);
  app.use("/subjects", subjectsRouter);
  app.use("/admin", adminRouter);
  app.use("/teacher", teacherRouter);
  app.use("/technician", technicianRouter);
  app.use("/student", studentRouter);
  app.use("/store", storeRouter);
  return app;
}

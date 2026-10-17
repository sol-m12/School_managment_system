import cookieParser from "cookie-parser";
import express, { type Express } from "express";
import { authRouter } from "../modules/auth/auth.routes.js";
import { dashboardRouter } from "../modules/dashboard/dashboard.routes.js";
import { adminRouter } from "../modules/admin/admin.routes.js";
import { publicRouter } from "../modules/public/public.routes.js";
import { subjectsRouter } from "../modules/subjects/subjects.routes.js";
import { teacherRouter } from "../modules/teacher/teacher.routes.js";
import { officeRouter } from "../modules/teacher/office.routes.js";
import { studentRouter } from "../modules/student/student.routes.js";
import { deskRouter } from "../modules/student/desk.routes.js";
import { storeRouter } from "../modules/store/store.routes.js";
import { storeOfficeRouter } from "../modules/store/office.routes.js";
import { financeRouter } from "../modules/finance/finance.routes.js";
import { technicianRouter } from "../modules/technician/technician.routes.js";
import { operationsRouter } from "../modules/operations/operations.routes.js";
import { principalRouter } from "../modules/principal/principal.routes.js";
import { viceRouter } from "../modules/vice/vice.routes.js";

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
  app.use("/teacher", officeRouter);
  app.use("/technician", technicianRouter);
  app.use("/operations", operationsRouter);
  app.use("/principal", principalRouter);
  app.use("/vice", viceRouter);
  app.use("/student", studentRouter);
  app.use("/student", deskRouter);
  app.use("/store/finance", financeRouter);
  app.use("/store/office", storeOfficeRouter);
  app.use("/store", storeRouter);
  return app;
}

import express from "express";
import helmet from "helmet";
import cors from "cors";
import morgan from "morgan";
import cookieParser from "cookie-parser";
import { env } from "./config/env.js";
import { pool } from "./db/index.js";
import { authRouter } from "./modules/auth/auth.routes.js";
import { dashboardRouter } from "./modules/dashboard/dashboard.routes.js";
import { adminRouter } from "./modules/admin/admin.routes.js";
import { publicRouter } from "./modules/public/public.routes.js";
import { subjectsRouter } from "./modules/subjects/subjects.routes.js";
import { teacherRouter } from "./modules/teacher/teacher.routes.js";
import { studentRouter } from "./modules/student/student.routes.js";
import { storeRouter } from "./modules/store/store.routes.js";
import { technicianRouter } from "./modules/technician/technician.routes.js";

const app = express();

app.use(helmet());
app.use(cors({ origin: "http://localhost:5173", credentials: true }));
app.use(express.json({ limit: "1mb" }));
app.use(cookieParser());
app.use(morgan("dev"));

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.get("/health/db", async (_req, res) => {
  try {
    await pool.query("SELECT 1");
    res.json({ status: "ok", database: "connected" });
  } catch {
    res.status(500).json({ status: "error", database: "not connected" });
  }
});

app.use("/public", publicRouter);
app.use("/auth", authRouter);
app.use("/dashboard", dashboardRouter);
app.use("/subjects", subjectsRouter);
app.use("/admin", adminRouter);
app.use("/teacher", teacherRouter);
app.use("/technician", technicianRouter);
app.use("/student", studentRouter);
app.use("/store", storeRouter);

if (process.env.NODE_ENV !== "test" && process.env.VITEST !== "true") {
  app.listen(env.PORT, () => {
    console.log(`API running on http://localhost:${env.PORT}`);
  });
}

export { app };

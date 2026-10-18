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
import { officeRouter } from "./modules/teacher/office.routes.js";
import { studentRouter } from "./modules/student/student.routes.js";
import { deskRouter } from "./modules/student/desk.routes.js";
import { storeRouter } from "./modules/store/store.routes.js";
import { storeOfficeRouter } from "./modules/store/office.routes.js";
import { financeRouter } from "./modules/finance/finance.routes.js";
import { technicianRouter } from "./modules/technician/technician.routes.js";
import { operationsRouter } from "./modules/operations/operations.routes.js";
import { principalRouter } from "./modules/principal/principal.routes.js";
import { viceRouter } from "./modules/vice/vice.routes.js";
import { recordsRouter } from "./modules/records/records.routes.js";
import { libraryRouter } from "./modules/library/library.routes.js";
import { procurementRouter, publicTenderList, vendorRouter } from "./modules/procurement/procurement.routes.js";
import { secretaryRouter } from "./modules/secretary/secretary.routes.js";
import { platformRouter } from "./modules/platform/platform.routes.js";
import { parentAdminRouter, parentRouter } from "./modules/parent/parent.routes.js";
import { clubsRouter } from "./modules/clubs/clubs.routes.js";

const app = express();

app.use(helmet());
app.use(cors({
  origin(origin, callback) {
    if (!origin) {
      callback(null, true);
      return;
    }
    const allowed = env.WEB_ORIGINS.split(",").map((value) => value.trim()).filter(Boolean);
    if (allowed.includes(origin)) {
      callback(null, true);
      return;
    }
    // Local subdomain testing: http://sunrise.localhost:5173
    if (/^https?:\/\/[a-z0-9-]+\.localhost(?::\d+)?$/i.test(origin)) {
      callback(null, true);
      return;
    }
    const base = env.APP_BASE_DOMAIN.trim().toLowerCase();
    if (base) {
      try {
        const host = new URL(origin).hostname.toLowerCase();
        if (host === base || host.endsWith(`.${base}`)) {
          callback(null, true);
          return;
        }
      } catch {
        // ignore invalid Origin
      }
    }
    callback(null, false);
  },
  credentials: true,
}));
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
app.use("/platform", platformRouter);
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
app.use("/records", recordsRouter);
app.use("/library", libraryRouter);
app.use("/procurement", procurementRouter);
app.use("/vendor", vendorRouter);
app.use("/secretary", secretaryRouter);
app.use("/parent", parentRouter);
app.use("/operations/parents", parentAdminRouter);
app.use("/clubs", clubsRouter);
app.get("/public/tenders", publicTenderList);

if (process.env.NODE_ENV !== "test" && process.env.VITEST !== "true") {
  app.listen(env.PORT, () => {
    console.log(`API running on http://localhost:${env.PORT}`);
  });
}

export { app };

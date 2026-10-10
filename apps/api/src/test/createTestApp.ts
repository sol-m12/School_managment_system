import cookieParser from "cookie-parser";
import express, { type Express } from "express";
import { authRouter } from "../modules/auth/auth.routes.js";

/** Minimal Express app for auth integration tests (no listen). */
export function createTestApp(): Express {
  const app = express();
  app.use(express.json({ limit: "1mb" }));
  app.use(cookieParser());
  app.use("/auth", authRouter);
  return app;
}

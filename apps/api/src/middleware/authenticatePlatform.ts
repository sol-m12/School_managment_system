import type { NextFunction, Request, Response } from "express";
import { verifyPlatformAccessToken } from "../lib/jwt.js";

export function authenticatePlatform(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) {
    res.status(401).json({ code: "AUTH_UNAUTHORIZED" });
    return;
  }

  const token = header.slice("Bearer ".length).trim();
  if (!token) {
    res.status(401).json({ code: "AUTH_UNAUTHORIZED" });
    return;
  }

  try {
    const payload = verifyPlatformAccessToken(token);
    req.platformAuth = { userId: payload.userId };
    next();
  } catch {
    res.status(401).json({ code: "AUTH_UNAUTHORIZED" });
  }
}

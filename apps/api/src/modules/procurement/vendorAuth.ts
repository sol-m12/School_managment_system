import type { NextFunction, Request, Response } from "express";
import { readVendorToken } from "./vendorToken.js";

export function vendorAuth(req: Request, res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    res.status(401).json({ code: "AUTH_UNAUTHORIZED" });
    return;
  }
  try {
    req.vendor = readVendorToken(header.slice("Bearer ".length).trim());
    next();
  } catch {
    res.status(401).json({ code: "AUTH_UNAUTHORIZED" });
  }
}

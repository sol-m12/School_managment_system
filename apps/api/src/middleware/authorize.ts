import type { NextFunction, Request, Response } from "express";
import type { Role } from "../lib/roles.js";

export function authorize(...roles: Role[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.auth) {
      res.status(401).json({ code: "AUTH_UNAUTHORIZED" });
      return;
    }
    if (roles.length > 0 && !roles.includes(req.auth.role)) {
      res.status(403).json({ code: "AUTH_FORBIDDEN" });
      return;
    }
    next();
  };
}

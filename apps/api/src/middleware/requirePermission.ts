import type { NextFunction, Request, RequestHandler, Response } from "express";
import { hasPermission, type Permission } from "../lib/permissions.js";
import { authenticate } from "./authenticate.js";

export function checkPermission(permission: Permission): RequestHandler {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.auth) {
      res.status(401).json({ code: "AUTH_UNAUTHORIZED" });
      return;
    }
    if (!hasPermission(req.auth.role, permission)) {
      res.status(403).json({ code: "AUTH_FORBIDDEN" });
      return;
    }
    next();
  };
}

/** authenticate + permission check. Use as `router.get(path, ...requirePermission("x.read"), handler)`. */
export function requirePermission(permission: Permission): RequestHandler[] {
  return [authenticate, checkPermission(permission)];
}

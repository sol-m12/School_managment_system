import { Router } from "express";
import { authenticate } from "../../middleware/authenticate.js";
import { isRole } from "../../lib/roles.js";
import { dashboardFor } from "./dashboard.service.js";

export const dashboardRouter = Router();

dashboardRouter.get("/", authenticate, async (req, res) => {
  const auth = req.auth;
  if (!auth || !isRole(auth.role)) {
    res.status(401).json({ code: "AUTH_UNAUTHORIZED" });
    return;
  }
  try {
    res.json(await dashboardFor(auth.tenantId, auth.userId, auth.role));
  } catch {
    res.status(500).json({ code: "INTERNAL_ERROR" });
  }
});

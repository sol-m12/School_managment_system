import { Router, type Request, type Response } from "express";
import type { ZodType } from "zod";
import { requirePermission } from "../../middleware/requirePermission.js";
import {
  clearanceBodySchema,
  decideBodySchema,
  documentBodySchema,
  idParamSchema,
  incidentBodySchema,
  incidentStatusSchema,
  messageBodySchema,
  policyBodySchema,
  policyStatusSchema,
  reportDefBodySchema,
  signBodySchema,
  trainingBodySchema,
  transferBodySchema,
} from "./principal.schema.js";
import { PrincipalError, type PrincipalErrorCode } from "./principal.service.js";
import * as principal from "./principal.service.js";

export const principalRouter = Router();

const guard = requirePermission("principal.office");

const STATUS: Record<PrincipalErrorCode, number> = {
  NOT_FOUND: 404,
  NOTE_REQUIRED: 400,
  CLEARANCE_INCOMPLETE: 409,
  NOT_READY: 409,
  BOOKS_OUT: 409,
};

function sendError(res: Response, error: unknown): void {
  if (error instanceof PrincipalError) {
    res.status(STATUS[error.code]).json({ code: error.code });
    return;
  }
  res.status(500).json({ code: "INTERNAL_ERROR" });
}

function tenantOf(req: Request): number {
  if (!req.auth) throw new Error("authenticate must run first");
  return req.auth.tenantId;
}

function userOf(req: Request): number {
  if (!req.auth) throw new Error("authenticate must run first");
  return req.auth.userId;
}

function parseBody<T>(schema: ZodType<T>, req: Request, res: Response): T | null {
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ code: "VALIDATION_ERROR" });
    return null;
  }
  return parsed.data;
}

function parseId(req: Request, res: Response): number | null {
  const parsed = idParamSchema.safeParse(req.params);
  if (!parsed.success) {
    res.status(400).json({ code: "VALIDATION_ERROR" });
    return null;
  }
  return parsed.data.id;
}

principalRouter.get("/executive", ...guard, async (req, res) => {
  try {
    res.json(await principal.executiveView(tenantOf(req)));
  } catch (error) {
    sendError(res, error);
  }
});

principalRouter.post("/policies", ...guard, async (req, res) => {
  const input = parseBody(policyBodySchema, req, res);
  if (!input) return;
  try {
    res.status(201).json(await principal.createPolicy(tenantOf(req), userOf(req), input));
  } catch (error) {
    sendError(res, error);
  }
});

principalRouter.patch("/policies/:id", ...guard, async (req, res) => {
  const id = parseId(req, res);
  const input = parseBody(policyStatusSchema, req, res);
  if (id == null || !input) return;
  try {
    await principal.updatePolicyStatus(tenantOf(req), userOf(req), id, input.status);
    res.json({ id });
  } catch (error) {
    sendError(res, error);
  }
});

principalRouter.get("/trends", ...guard, async (req, res) => {
  try {
    res.json(await principal.trendsView(tenantOf(req)));
  } catch (error) {
    sendError(res, error);
  }
});

principalRouter.get("/premium", ...guard, async (req, res) => {
  try {
    res.json(await principal.premiumView(tenantOf(req)));
  } catch (error) {
    sendError(res, error);
  }
});

principalRouter.get("/messages", ...guard, async (req, res) => {
  const scope = req.query.scope === "bulk" ? "bulk" : "hub";
  try {
    res.json({ rows: await principal.listMessages(tenantOf(req), scope) });
  } catch (error) {
    sendError(res, error);
  }
});

principalRouter.post("/messages", ...guard, async (req, res) => {
  const input = parseBody(messageBodySchema, req, res);
  if (!input) return;
  try {
    res.status(201).json(await principal.createMessage(tenantOf(req), userOf(req), input));
  } catch (error) {
    sendError(res, error);
  }
});

principalRouter.get("/inbox", ...guard, async (req, res) => {
  try {
    res.json(await principal.inbox(tenantOf(req)));
  } catch (error) {
    sendError(res, error);
  }
});

principalRouter.post("/inbox", ...guard, async (req, res) => {
  const input = parseBody(decideBodySchema, req, res);
  if (!input) return;
  try {
    await principal.decide(tenantOf(req), userOf(req), input);
    res.json({ ok: true });
  } catch (error) {
    sendError(res, error);
  }
});

principalRouter.get("/staff-kpis", ...guard, async (req, res) => {
  try {
    res.json(await principal.staffKpiView(tenantOf(req)));
  } catch (error) {
    sendError(res, error);
  }
});

principalRouter.get("/documents", ...guard, async (req, res) => {
  try {
    res.json({ rows: await principal.listDocuments(tenantOf(req)) });
  } catch (error) {
    sendError(res, error);
  }
});

principalRouter.post("/documents", ...guard, async (req, res) => {
  const input = parseBody(documentBodySchema, req, res);
  if (!input) return;
  try {
    res.status(201).json(await principal.createDocument(tenantOf(req), userOf(req), input));
  } catch (error) {
    sendError(res, error);
  }
});

principalRouter.post("/documents/:id/sign", ...guard, async (req, res) => {
  const id = parseId(req, res);
  const input = parseBody(signBodySchema, req, res);
  if (id == null || !input) return;
  try {
    await principal.signDocument(tenantOf(req), userOf(req), id, input);
    res.json({ id });
  } catch (error) {
    sendError(res, error);
  }
});

principalRouter.post("/documents/:id/reject", ...guard, async (req, res) => {
  const id = parseId(req, res);
  if (id == null) return;
  try {
    await principal.rejectDocument(tenantOf(req), userOf(req), id);
    res.json({ id });
  } catch (error) {
    sendError(res, error);
  }
});

principalRouter.get("/analytics", ...guard, async (req, res) => {
  try {
    res.json(await principal.comparativeView(tenantOf(req)));
  } catch (error) {
    sendError(res, error);
  }
});

principalRouter.get("/correlation", ...guard, async (req, res) => {
  try {
    res.json(await principal.correlationView(tenantOf(req)));
  } catch (error) {
    sendError(res, error);
  }
});

principalRouter.get("/transfers", ...guard, async (req, res) => {
  try {
    res.json(await principal.transferBoard(tenantOf(req)));
  } catch (error) {
    sendError(res, error);
  }
});

principalRouter.post("/transfers", ...guard, async (req, res) => {
  const input = parseBody(transferBodySchema, req, res);
  if (!input) return;
  try {
    res.status(201).json(await principal.openTransfer(tenantOf(req), userOf(req), input));
  } catch (error) {
    sendError(res, error);
  }
});

principalRouter.post("/transfers/:id/library", ...guard, async (req, res) => {
  const id = parseId(req, res);
  if (id == null) return;
  try {
    res.json(await principal.checkLibrary(tenantOf(req), id));
  } catch (error) {
    sendError(res, error);
  }
});

principalRouter.post("/transfers/:id/clearance", ...guard, async (req, res) => {
  const id = parseId(req, res);
  const input = parseBody(clearanceBodySchema, req, res);
  if (id == null || !input) return;
  try {
    await principal.saveClearance(tenantOf(req), id, input);
    res.json({ id });
  } catch (error) {
    sendError(res, error);
  }
});

principalRouter.post("/transfers/:id/certificate", ...guard, async (req, res) => {
  const id = parseId(req, res);
  if (id == null) return;
  try {
    res.json(await principal.issueCertificate(tenantOf(req), userOf(req), id));
  } catch (error) {
    sendError(res, error);
  }
});

principalRouter.get("/at-risk", ...guard, async (req, res) => {
  try {
    res.json(await principal.atRiskView(tenantOf(req)));
  } catch (error) {
    sendError(res, error);
  }
});

principalRouter.get("/moe-report", ...guard, async (req, res) => {
  try {
    res.json(await principal.moeReport(tenantOf(req)));
  } catch (error) {
    sendError(res, error);
  }
});

principalRouter.get("/training", ...guard, async (req, res) => {
  try {
    res.json({ rows: await principal.listTraining(tenantOf(req)) });
  } catch (error) {
    sendError(res, error);
  }
});

principalRouter.post("/training", ...guard, async (req, res) => {
  const input = parseBody(trainingBodySchema, req, res);
  if (!input) return;
  try {
    res.status(201).json(await principal.createTraining(tenantOf(req), userOf(req), input));
  } catch (error) {
    sendError(res, error);
  }
});

principalRouter.get("/reports", ...guard, async (req, res) => {
  try {
    res.json({ rows: await principal.listReportDefs(tenantOf(req)) });
  } catch (error) {
    sendError(res, error);
  }
});

principalRouter.post("/reports", ...guard, async (req, res) => {
  const input = parseBody(reportDefBodySchema, req, res);
  if (!input) return;
  try {
    res.status(201).json(await principal.createReportDef(tenantOf(req), userOf(req), input));
  } catch (error) {
    sendError(res, error);
  }
});

principalRouter.delete("/reports/:id", ...guard, async (req, res) => {
  const id = parseId(req, res);
  if (id == null) return;
  try {
    await principal.deleteReportDef(tenantOf(req), id);
    res.json({ id });
  } catch (error) {
    sendError(res, error);
  }
});

principalRouter.post("/reports/:id/run", ...guard, async (req, res) => {
  const id = parseId(req, res);
  if (id == null) return;
  try {
    res.json(await principal.runReportDef(tenantOf(req), id));
  } catch (error) {
    sendError(res, error);
  }
});

principalRouter.get("/warnings", ...guard, async (req, res) => {
  try {
    res.json(await principal.warningsView(tenantOf(req)));
  } catch (error) {
    sendError(res, error);
  }
});

principalRouter.get("/incidents", ...guard, async (req, res) => {
  try {
    res.json({ rows: await principal.listIncidents(tenantOf(req)) });
  } catch (error) {
    sendError(res, error);
  }
});

principalRouter.post("/incidents", ...guard, async (req, res) => {
  const input = parseBody(incidentBodySchema, req, res);
  if (!input) return;
  try {
    res.status(201).json(await principal.createIncident(tenantOf(req), userOf(req), input));
  } catch (error) {
    sendError(res, error);
  }
});

principalRouter.patch("/incidents/:id", ...guard, async (req, res) => {
  const id = parseId(req, res);
  const input = parseBody(incidentStatusSchema, req, res);
  if (id == null || !input) return;
  try {
    await principal.updateIncident(tenantOf(req), id, input.status);
    res.json({ id });
  } catch (error) {
    sendError(res, error);
  }
});

principalRouter.get("/demographics", ...guard, async (req, res) => {
  try {
    res.json(await principal.demographicsView(tenantOf(req)));
  } catch (error) {
    sendError(res, error);
  }
});

import { Router, type Request, type Response } from "express";
import type { ZodType } from "zod";
import { requirePermission } from "../../middleware/requirePermission.js";
import {
  announceBodySchema,
  catalogQuerySchema,
  charterBodySchema,
  clubBodySchema,
  clubUpdateSchema,
  electionBodySchema,
  idParamSchema,
  meetingBodySchema,
  memberDecideSchema,
  memberIdParamSchema,
  reportBodySchema,
  voteBodySchema,
} from "./clubs.schema.js";
import { ClubError, type ClubErrorCode } from "./clubs.service.js";
import * as clubs from "./clubs.service.js";

export const clubsRouter = Router();

const manage = requirePermission("clubs.manage");
const student = requirePermission("clubs.student");
const patron = requirePermission("clubs.patron");
const oversee = requirePermission("clubs.oversee");

const STATUS: Record<ClubErrorCode, number> = {
  NOT_FOUND: 404,
  NOT_ASSIGNED: 403,
  DUPLICATE_NAME: 409,
  COUNCIL_EXISTS: 409,
  STAFF_NOT_FOUND: 400,
  STUDENT_NOT_FOUND: 400,
  CHARTER_BLOCKED: 409,
  ALREADY_MEMBER: 409,
  NOT_PENDING: 409,
  NOT_PATRON: 403,
  NOT_COUNCIL: 409,
  ELECTION_CLOSED: 409,
  ALREADY_VOTED: 409,
  BAD_CANDIDATE: 400,
  NO_VOTES: 409,
  VALIDATION: 400,
};

function sendError(res: Response, error: unknown): void {
  if (error instanceof ClubError) {
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

// --- Technician ---

clubsRouter.get("/options", ...manage, async (req, res) => {
  try {
    res.json(await clubs.optionsBoard(tenantOf(req)));
  } catch (error) {
    sendError(res, error);
  }
});

clubsRouter.get("/", ...manage, async (req, res) => {
  try {
    res.json(await clubs.listClubs(tenantOf(req)));
  } catch (error) {
    sendError(res, error);
  }
});

clubsRouter.post("/", ...manage, async (req, res) => {
  const input = parseBody(clubBodySchema, req, res);
  if (!input) return;
  try {
    res.status(201).json(await clubs.createClub(tenantOf(req), userOf(req), input));
  } catch (error) {
    sendError(res, error);
  }
});

clubsRouter.put("/:id", ...manage, async (req, res) => {
  const id = parseId(req, res);
  if (id == null) return;
  const input = parseBody(clubUpdateSchema, req, res);
  if (!input) return;
  try {
    res.json(await clubs.updateClub(tenantOf(req), id, input));
  } catch (error) {
    sendError(res, error);
  }
});

clubsRouter.post("/:id/submit-charter", ...manage, async (req, res) => {
  const id = parseId(req, res);
  if (id == null) return;
  try {
    res.json(await clubs.submitCharter(tenantOf(req), id));
  } catch (error) {
    sendError(res, error);
  }
});

// --- Student ---

clubsRouter.get("/catalog", ...student, async (req, res) => {
  const parsed = catalogQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ code: "VALIDATION_ERROR" });
    return;
  }
  try {
    res.json(await clubs.catalog(tenantOf(req), parsed.data.q));
  } catch (error) {
    sendError(res, error);
  }
});

clubsRouter.get("/mine", ...student, async (req, res) => {
  try {
    res.json(await clubs.myClubs(tenantOf(req), userOf(req)));
  } catch (error) {
    sendError(res, error);
  }
});

clubsRouter.post("/:id/join", ...student, async (req, res) => {
  const id = parseId(req, res);
  if (id == null) return;
  try {
    res.status(201).json(await clubs.joinClub(tenantOf(req), userOf(req), id));
  } catch (error) {
    sendError(res, error);
  }
});

clubsRouter.delete("/:id/membership", ...student, async (req, res) => {
  const id = parseId(req, res);
  if (id == null) return;
  try {
    res.json(await clubs.withdrawMembership(tenantOf(req), userOf(req), id));
  } catch (error) {
    sendError(res, error);
  }
});

clubsRouter.get("/elections", ...student, async (req, res) => {
  try {
    res.json(await clubs.listElectionsForStudent(tenantOf(req), userOf(req)));
  } catch (error) {
    sendError(res, error);
  }
});

clubsRouter.post("/elections/:id/vote", ...student, async (req, res) => {
  const id = parseId(req, res);
  if (id == null) return;
  const input = parseBody(voteBodySchema, req, res);
  if (!input) return;
  try {
    res.status(201).json(await clubs.castVote(tenantOf(req), userOf(req), id, input));
  } catch (error) {
    sendError(res, error);
  }
});

// --- Teacher patron ---

clubsRouter.get("/patron", ...patron, async (req, res) => {
  try {
    res.json(await clubs.patronBoard(tenantOf(req), userOf(req)));
  } catch (error) {
    sendError(res, error);
  }
});

clubsRouter.post("/:id/members/:memberId/decide", ...patron, async (req, res) => {
  const parsed = memberIdParamSchema.safeParse(req.params);
  if (!parsed.success) {
    res.status(400).json({ code: "VALIDATION_ERROR" });
    return;
  }
  const input = parseBody(memberDecideSchema, req, res);
  if (!input) return;
  try {
    res.json(
      await clubs.decideMember(
        tenantOf(req),
        userOf(req),
        parsed.data.id,
        parsed.data.memberId,
        input,
      ),
    );
  } catch (error) {
    sendError(res, error);
  }
});

clubsRouter.post("/:id/meetings", ...patron, async (req, res) => {
  const id = parseId(req, res);
  if (id == null) return;
  const input = parseBody(meetingBodySchema, req, res);
  if (!input) return;
  try {
    res.status(201).json(await clubs.addMeeting(tenantOf(req), userOf(req), id, input));
  } catch (error) {
    sendError(res, error);
  }
});

clubsRouter.post("/:id/reports", ...patron, async (req, res) => {
  const id = parseId(req, res);
  if (id == null) return;
  const input = parseBody(reportBodySchema, req, res);
  if (!input) return;
  try {
    res.status(201).json(await clubs.addReport(tenantOf(req), userOf(req), id, input));
  } catch (error) {
    sendError(res, error);
  }
});

// --- Vice Principal ---

clubsRouter.get("/oversee", ...oversee, async (req, res) => {
  try {
    res.json(await clubs.overseeBoard(tenantOf(req)));
  } catch (error) {
    sendError(res, error);
  }
});

clubsRouter.post("/:id/charter", ...oversee, async (req, res) => {
  const id = parseId(req, res);
  if (id == null) return;
  const input = parseBody(charterBodySchema, req, res);
  if (!input) return;
  try {
    res.json(await clubs.setCharter(tenantOf(req), id, input));
  } catch (error) {
    sendError(res, error);
  }
});

clubsRouter.post("/elections", ...oversee, async (req, res) => {
  const input = parseBody(electionBodySchema, req, res);
  if (!input) return;
  try {
    res.status(201).json(await clubs.openElection(tenantOf(req), userOf(req), input));
  } catch (error) {
    sendError(res, error);
  }
});

clubsRouter.post("/elections/:id/announce", ...oversee, async (req, res) => {
  const id = parseId(req, res);
  if (id == null) return;
  const input = parseBody(announceBodySchema, req, res);
  if (!input) return;
  try {
    res.json(await clubs.announceElection(tenantOf(req), id, input));
  } catch (error) {
    sendError(res, error);
  }
});

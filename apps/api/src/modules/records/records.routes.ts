import { Router, type Request, type Response } from "express";
import multer from "multer";
import type { ZodType } from "zod";
import { requirePermission } from "../../middleware/requirePermission.js";
import {
  alumniBodySchema,
  alumniQuerySchema,
  correctionBodySchema,
  decideBodySchema,
  exportQuerySchema,
  fileFieldsSchema,
  idParamSchema,
  importBodySchema,
  sectionBodySchema,
  staffBodySchema,
  transcriptBodySchema,
  unlockBodySchema,
} from "./records.schema.js";
import { RecordsError, type RecordsErrorCode } from "./records.service.js";
import * as records from "./records.service.js";

export const recordsRouter = Router();

const office = requirePermission("records.office");
const override = requirePermission("records.override");
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 8 * 1024 * 1024 } });

const STATUS: Record<RecordsErrorCode, number> = {
  NOT_FOUND: 404,
  NOT_SENT: 409,
  NOT_ACCEPTED: 409,
  NOT_READY: 409,
  OVERRIDE_REQUIRED: 409,
  LOCKED: 409,
  ALREADY_ARCHIVED: 409,
  NOT_GRADUATE: 409,
  ALREADY_ALUMNI: 409,
  ALREADY_OPEN: 409,
  IMPORT_EMPTY: 400,
  EXCEL_SAVE_AS_CSV: 400,
  PDF_FILE: 400,
  IMPORT_FORMAT: 400,
  FILE_TYPE: 400,
  FILE_SIZE: 400,
  SCORE_OVER: 409,
  NOTE_REQUIRED: 400,
};

function sendError(res: Response, error: unknown): void {
  if (error instanceof RecordsError) {
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
    res.status(404).json({ code: "NOT_FOUND" });
    return null;
  }
  return parsed.data.id;
}

recordsRouter.get("/desk", ...office, async (req, res) => {
  try {
    res.json(await records.desk(tenantOf(req)));
  } catch (error) {
    sendError(res, error);
  }
});

recordsRouter.get("/students", ...office, async (req, res) => {
  try {
    res.json(await records.listStudents(tenantOf(req)));
  } catch (error) {
    sendError(res, error);
  }
});

recordsRouter.get("/inbox", ...office, async (req, res) => {
  try {
    res.json(await records.inbox(tenantOf(req)));
  } catch (error) {
    sendError(res, error);
  }
});

recordsRouter.post("/inbox/:id/accept", ...office, async (req, res) => {
  const id = parseId(req, res);
  if (!id) return;
  try {
    res.json(await records.acceptGrade(tenantOf(req), userOf(req), id));
  } catch (error) {
    sendError(res, error);
  }
});

recordsRouter.get("/queue", ...office, async (req, res) => {
  try {
    res.json(await records.queue(tenantOf(req)));
  } catch (error) {
    sendError(res, error);
  }
});

recordsRouter.post("/queue/:id/advance", ...office, async (req, res) => {
  const id = parseId(req, res);
  if (!id) return;
  try {
    res.json(await records.advanceQueue(tenantOf(req), userOf(req), id));
  } catch (error) {
    sendError(res, error);
  }
});

recordsRouter.get("/transcripts", ...office, async (req, res) => {
  try {
    res.json(await records.listTranscripts(tenantOf(req)));
  } catch (error) {
    sendError(res, error);
  }
});

recordsRouter.post("/transcripts", ...office, async (req, res) => {
  const input = parseBody(transcriptBodySchema, req, res);
  if (!input) return;
  try {
    res.status(201).json(await records.createTranscript(tenantOf(req), userOf(req), input));
  } catch (error) {
    sendError(res, error);
  }
});

recordsRouter.get("/archives", ...office, async (req, res) => {
  try {
    res.json(await records.listArchives(tenantOf(req)));
  } catch (error) {
    sendError(res, error);
  }
});

recordsRouter.post("/archives", ...office, async (req, res) => {
  const input = parseBody(sectionBodySchema, req, res);
  if (!input) return;
  try {
    res.status(201).json(await records.archiveRoster(tenantOf(req), userOf(req), input));
  } catch (error) {
    sendError(res, error);
  }
});

recordsRouter.get("/requests", ...office, async (req, res) => {
  try {
    res.json(await records.listRequests(tenantOf(req)));
  } catch (error) {
    sendError(res, error);
  }
});

recordsRouter.post("/corrections", ...office, async (req, res) => {
  const input = parseBody(correctionBodySchema, req, res);
  if (!input) return;
  try {
    res.status(201).json(await records.askCorrection(tenantOf(req), userOf(req), input));
  } catch (error) {
    sendError(res, error);
  }
});

recordsRouter.post("/corrections/:id/apply", ...office, async (req, res) => {
  const id = parseId(req, res);
  if (!id) return;
  try {
    res.json(await records.applyCorrection(tenantOf(req), userOf(req), id));
  } catch (error) {
    sendError(res, error);
  }
});

recordsRouter.post("/unlocks", ...office, async (req, res) => {
  const input = parseBody(unlockBodySchema, req, res);
  if (!input) return;
  try {
    res.status(201).json(await records.askUnlock(tenantOf(req), userOf(req), input));
  } catch (error) {
    sendError(res, error);
  }
});

recordsRouter.post("/unlocks/:id/apply", ...office, async (req, res) => {
  const id = parseId(req, res);
  if (!id) return;
  try {
    res.json(await records.applyUnlock(tenantOf(req), userOf(req), id));
  } catch (error) {
    sendError(res, error);
  }
});

recordsRouter.get("/overrides", ...override, async (req, res) => {
  try {
    res.json(await records.listRequests(tenantOf(req)));
  } catch (error) {
    sendError(res, error);
  }
});

recordsRouter.post("/overrides/:id/decide", ...override, async (req, res) => {
  const id = parseId(req, res);
  if (!id) return;
  const input = parseBody(decideBodySchema, req, res);
  if (!input) return;
  try {
    res.json(await records.decideRequest(tenantOf(req), userOf(req), id, input));
  } catch (error) {
    sendError(res, error);
  }
});

recordsRouter.post("/imports", ...office, async (req, res) => {
  const input = parseBody(importBodySchema, req, res);
  if (!input) return;
  try {
    res.status(201).json(await records.importStudents(tenantOf(req), userOf(req), input.kind, input.text));
  } catch (error) {
    sendError(res, error);
  }
});

recordsRouter.get("/staff", ...office, async (req, res) => {
  try {
    res.json(await records.staffBoard(tenantOf(req)));
  } catch (error) {
    sendError(res, error);
  }
});

recordsRouter.post("/staff", ...office, async (req, res) => {
  const input = parseBody(staffBodySchema, req, res);
  if (!input) return;
  try {
    res.status(201).json(await records.addStaffRecord(tenantOf(req), userOf(req), input));
  } catch (error) {
    sendError(res, error);
  }
});

recordsRouter.get("/files", ...office, async (req, res) => {
  try {
    res.json(await records.listFiles(tenantOf(req)));
  } catch (error) {
    sendError(res, error);
  }
});

recordsRouter.post("/files", ...office, (req, res) => {
  upload.single("file")(req, res, (error: unknown) => {
    if (error) {
      res.status(400).json({ code: "FILE_SIZE" });
      return;
    }
    const fields = fileFieldsSchema.safeParse(req.body);
    if (!fields.success || !req.file) {
      res.status(400).json({ code: "VALIDATION_ERROR" });
      return;
    }
    void records
      .saveStudentFile(tenantOf(req), userOf(req), fields.data.studentId, fields.data.title, req.file.buffer)
      .then((body) => res.status(201).json(body))
      .catch((caught: unknown) => sendError(res, caught));
  });
});

recordsRouter.get("/files/:id", ...office, async (req, res) => {
  const id = parseId(req, res);
  if (!id) return;
  try {
    const file = await records.readStudentFile(tenantOf(req), userOf(req), id);
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${file.title.replace(/"/g, "")}.pdf"`);
    res.send(file.bytes);
  } catch (error) {
    sendError(res, error);
  }
});

recordsRouter.get("/alumni", ...office, async (req, res) => {
  const parsed = alumniQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ code: "VALIDATION_ERROR" });
    return;
  }
  try {
    res.json(await records.listAlumni(tenantOf(req), parsed.data));
  } catch (error) {
    sendError(res, error);
  }
});

recordsRouter.post("/alumni", ...office, async (req, res) => {
  const input = parseBody(alumniBodySchema, req, res);
  if (!input) return;
  try {
    res.status(201).json(await records.addAlumni(tenantOf(req), userOf(req), input));
  } catch (error) {
    sendError(res, error);
  }
});

recordsRouter.get("/export", ...office, async (req, res) => {
  const parsed = exportQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ code: "VALIDATION_ERROR" });
    return;
  }
  try {
    res.json(await records.ministryExport(tenantOf(req), userOf(req), parsed.data.kind, parsed.data.year));
  } catch (error) {
    sendError(res, error);
  }
});

recordsRouter.get("/access", ...office, async (req, res) => {
  try {
    res.json(await records.accessLog(tenantOf(req)));
  } catch (error) {
    sendError(res, error);
  }
});

recordsRouter.delete("/access/:id", ...office, (_req, res) => {
  res.status(405).json({ code: "LOCKED" });
});

import { Router } from "express";
import rateLimit, { ipKeyGenerator } from "express-rate-limit";
import { verifyQuerySchema } from "../records/records.schema.js";
import { RecordsError, verifyDocument } from "../records/records.service.js";
import { inquiryBodySchema, publicSlugQuerySchema } from "./public.schema.js";
import { PublicError, createInquiry, publicHome } from "./public.service.js";

export const publicRouter = Router();

const inquiryRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => process.env.NODE_ENV === "test",
  keyGenerator: (req) => ipKeyGenerator(req.ip ?? "unknown"),
  message: { code: "AUTH_RATE_LIMITED" },
});

publicRouter.get("/home", async (req, res) => {
  const parsed = publicSlugQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ code: "VALIDATION_ERROR" });
    return;
  }
  try {
    res.json(await publicHome(parsed.data.slug));
  } catch (error) {
    if (error instanceof PublicError) {
      res.status(404).json({ code: error.code });
      return;
    }
    res.status(500).json({ code: "INTERNAL_ERROR" });
  }
});

publicRouter.get("/verify", async (req, res) => {
  const parsed = verifyQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ code: "VALIDATION_ERROR" });
    return;
  }
  try {
    res.json(await verifyDocument(parsed.data.code));
  } catch (error) {
    if (error instanceof RecordsError) {
      res.status(404).json({ code: error.code });
      return;
    }
    res.status(500).json({ code: "INTERNAL_ERROR" });
  }
});

publicRouter.post("/inquiries", inquiryRateLimit, async (req, res) => {
  const parsed = inquiryBodySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ code: "VALIDATION_ERROR" });
    return;
  }
  try {
    await createInquiry(parsed.data);
    res.status(201).json({ code: "INQUIRY_SENT" });
  } catch (error) {
    if (error instanceof PublicError) {
      res.status(404).json({ code: error.code });
      return;
    }
    res.status(500).json({ code: "INTERNAL_ERROR" });
  }
});

import { Router, type Request } from "express";
import rateLimit, { ipKeyGenerator } from "express-rate-limit";
import {
  PLATFORM_REFRESH_COOKIE_NAME,
  platformRefreshCookieOptions,
} from "../../lib/jwt.js";
import { authenticatePlatform } from "../../middleware/authenticatePlatform.js";
import {
  PlatformAuthError,
  platformGetMe,
  platformLoginWithPassword,
  platformLogout,
  platformRefreshAccessToken,
} from "./platform.auth.service.js";
import {
  createSchoolBodySchema,
  platformLoginBodySchema,
} from "./platform.schema.js";
import {
  PlatformSchoolError,
  createSchool,
  listTenants,
} from "./platform.schools.service.js";

export const platformRouter = Router();

function platformLoginRateLimitKey(req: Pick<Request, "ip" | "body">): string {
  const username =
    typeof req.body?.username === "string" ? req.body.username.trim() : "";
  const ip = req.ip ?? "unknown";
  return `platform:${ipKeyGenerator(ip)}:${username.toLowerCase()}`;
}

const platformLoginRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => process.env.NODE_ENV === "test",
  keyGenerator: platformLoginRateLimitKey,
  message: { code: "AUTH_RATE_LIMITED" },
});

platformRouter.post("/auth/login", platformLoginRateLimit, async (req, res) => {
  const parsed = platformLoginBodySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ code: "VALIDATION_ERROR" });
    return;
  }

  try {
    const result = await platformLoginWithPassword(parsed.data);
    res.cookie(
      PLATFORM_REFRESH_COOKIE_NAME,
      result.refreshToken,
      platformRefreshCookieOptions(),
    );
    res.json({
      accessToken: result.accessToken,
      user: result.user,
    });
  } catch (error) {
    if (error instanceof PlatformAuthError) {
      res.status(401).json({ code: error.code });
      return;
    }
    res.status(500).json({ code: "INTERNAL_ERROR" });
  }
});

platformRouter.post("/auth/refresh", async (req, res) => {
  const token = req.cookies?.[PLATFORM_REFRESH_COOKIE_NAME];
  if (typeof token !== "string" || !token) {
    res.status(401).json({ code: "AUTH_UNAUTHORIZED" });
    return;
  }

  try {
    const result = await platformRefreshAccessToken(token);
    res.json({ accessToken: result.accessToken });
  } catch (error) {
    if (error instanceof PlatformAuthError) {
      res.status(401).json({ code: error.code });
      return;
    }
    res.status(500).json({ code: "INTERNAL_ERROR" });
  }
});

platformRouter.post("/auth/logout", authenticatePlatform, async (req, res) => {
  try {
    const auth = req.platformAuth;
    if (!auth) {
      res.status(401).json({ code: "AUTH_UNAUTHORIZED" });
      return;
    }
    await platformLogout(auth.userId);
    res.clearCookie(PLATFORM_REFRESH_COOKIE_NAME, {
      httpOnly: true,
      sameSite: "lax",
      secure: platformRefreshCookieOptions().secure,
      path: "/platform/auth",
    });
    res.json({ ok: true });
  } catch {
    res.status(500).json({ code: "INTERNAL_ERROR" });
  }
});

platformRouter.get("/auth/me", authenticatePlatform, async (req, res) => {
  try {
    const auth = req.platformAuth;
    if (!auth) {
      res.status(401).json({ code: "AUTH_UNAUTHORIZED" });
      return;
    }
    const user = await platformGetMe(auth.userId);
    res.json({ user });
  } catch (error) {
    if (error instanceof PlatformAuthError) {
      res.status(401).json({ code: error.code });
      return;
    }
    res.status(500).json({ code: "INTERNAL_ERROR" });
  }
});

platformRouter.get("/schools", authenticatePlatform, async (_req, res) => {
  try {
    const rows = await listTenants();
    res.json({ rows });
  } catch {
    res.status(500).json({ code: "INTERNAL_ERROR" });
  }
});

platformRouter.post("/schools", authenticatePlatform, async (req, res) => {
  const parsed = createSchoolBodySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ code: "VALIDATION_ERROR" });
    return;
  }

  try {
    const school = await createSchool(parsed.data);
    res.status(201).json({ school });
  } catch (error) {
    if (error instanceof PlatformSchoolError) {
      const status = error.code === "SLUG_TAKEN" ? 409 : 400;
      res.status(status).json({ code: error.code });
      return;
    }
    res.status(500).json({ code: "INTERNAL_ERROR" });
  }
});

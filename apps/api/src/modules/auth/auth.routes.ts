import { Router } from "express";
import rateLimit from "express-rate-limit";
import {
  REFRESH_COOKIE_NAME,
  refreshCookieOptions,
} from "../../lib/jwt.js";
import { authenticate } from "../../middleware/authenticate.js";
import { loginBodySchema } from "./auth.schema.js";
import {
  AuthError,
  getMe,
  loginWithPassword,
  logoutUser,
  refreshAccessToken,
} from "./auth.service.js";

export const authRouter = Router();

const loginRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    const username =
      typeof req.body?.username === "string" ? req.body.username.trim() : "";
    return `${req.ip ?? "unknown"}:${username.toLowerCase()}`;
  },
  message: { code: "AUTH_RATE_LIMITED" },
});

authRouter.post("/login", loginRateLimit, async (req, res) => {
  const parsed = loginBodySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ code: "VALIDATION_ERROR" });
    return;
  }

  try {
    const result = await loginWithPassword(parsed.data);
    res.cookie(REFRESH_COOKIE_NAME, result.refreshToken, refreshCookieOptions());
    res.json({
      accessToken: result.accessToken,
      user: result.user,
    });
  } catch (error) {
    if (error instanceof AuthError) {
      res.status(401).json({ code: error.code });
      return;
    }
    res.status(500).json({ code: "INTERNAL_ERROR" });
  }
});

authRouter.post("/refresh", async (req, res) => {
  const token = req.cookies?.[REFRESH_COOKIE_NAME];
  if (typeof token !== "string" || !token) {
    res.status(401).json({ code: "AUTH_UNAUTHORIZED" });
    return;
  }

  try {
    const result = await refreshAccessToken(token);
    res.json({ accessToken: result.accessToken });
  } catch (error) {
    if (error instanceof AuthError) {
      res.status(401).json({ code: error.code });
      return;
    }
    res.status(500).json({ code: "INTERNAL_ERROR" });
  }
});

authRouter.post("/logout", authenticate, async (req, res) => {
  try {
    const auth = req.auth;
    if (!auth) {
      res.status(401).json({ code: "AUTH_UNAUTHORIZED" });
      return;
    }
    await logoutUser(auth.userId, auth.tenantId);
    res.clearCookie(REFRESH_COOKIE_NAME, {
      httpOnly: true,
      sameSite: "lax",
      secure: refreshCookieOptions().secure,
      path: "/auth",
    });
    res.json({ ok: true });
  } catch {
    res.status(500).json({ code: "INTERNAL_ERROR" });
  }
});

authRouter.get("/me", authenticate, async (req, res) => {
  try {
    const auth = req.auth;
    if (!auth) {
      res.status(401).json({ code: "AUTH_UNAUTHORIZED" });
      return;
    }
    const user = await getMe(auth.userId, auth.tenantId);
    res.json({ user });
  } catch (error) {
    if (error instanceof AuthError) {
      res.status(401).json({ code: error.code });
      return;
    }
    res.status(500).json({ code: "INTERNAL_ERROR" });
  }
});

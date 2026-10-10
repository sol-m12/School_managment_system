import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import { isRole, type Role } from "./roles.js";

export type AccessTokenPayload = {
  userId: number;
  tenantId: number;
  role: Role;
};

export type RefreshTokenPayload = {
  userId: number;
  tenantId: number;
  tokenVersion: number;
};

const ACCESS_EXPIRES = "15m";
const REFRESH_EXPIRES = "7d";

export function createAccessToken(payload: AccessTokenPayload): string {
  return jwt.sign(payload, env.JWT_ACCESS_SECRET, { expiresIn: ACCESS_EXPIRES });
}

export function createRefreshToken(payload: RefreshTokenPayload): string {
  return jwt.sign(payload, env.JWT_REFRESH_SECRET, {
    expiresIn: REFRESH_EXPIRES,
  });
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET);
  if (typeof decoded !== "object" || decoded === null) {
    throw new Error("INVALID_ACCESS_TOKEN");
  }
  const userId = Number(decoded.userId);
  const tenantId = Number(decoded.tenantId);
  const role = decoded.role;
  if (
    !Number.isInteger(userId) ||
    !Number.isInteger(tenantId) ||
    typeof role !== "string" ||
    !isRole(role)
  ) {
    throw new Error("INVALID_ACCESS_TOKEN");
  }
  return { userId, tenantId, role };
}

export function verifyRefreshToken(token: string): RefreshTokenPayload {
  const decoded = jwt.verify(token, env.JWT_REFRESH_SECRET);
  if (typeof decoded !== "object" || decoded === null) {
    throw new Error("INVALID_REFRESH_TOKEN");
  }
  const userId = Number(decoded.userId);
  const tenantId = Number(decoded.tenantId);
  const tokenVersion = Number(decoded.tokenVersion);
  if (
    !Number.isInteger(userId) ||
    !Number.isInteger(tenantId) ||
    !Number.isInteger(tokenVersion)
  ) {
    throw new Error("INVALID_REFRESH_TOKEN");
  }
  return { userId, tenantId, tokenVersion };
}

export const REFRESH_COOKIE_NAME = "refreshToken";

export function refreshCookieOptions(): {
  httpOnly: boolean;
  sameSite: "lax";
  secure: boolean;
  path: string;
  maxAge: number;
} {
  return {
    httpOnly: true,
    sameSite: "lax",
    secure: env.NODE_ENV === "production",
    path: "/auth",
    maxAge: 7 * 24 * 60 * 60 * 1000,
  };
}

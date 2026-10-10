import { describe, expect, it, vi } from "vitest";

vi.mock("../../lib/jwt.js", () => ({
  REFRESH_COOKIE_NAME: "refreshToken",
  refreshCookieOptions: () => ({}),
}));

vi.mock("../../middleware/authenticate.js", () => ({
  authenticate: vi.fn(),
}));

vi.mock("./auth.service.js", () => ({
  AuthError: class AuthError extends Error {},
  getMe: vi.fn(),
  loginWithPassword: vi.fn(),
  logoutUser: vi.fn(),
  refreshAccessToken: vi.fn(),
}));

import {
  createLoginRateLimit,
  loginRateLimitKey,
} from "./auth.routes.js";

describe("login rate limit", () => {
  it("creates the limiter without ValidationError", () => {
    expect(() => createLoginRateLimit()).not.toThrow();
  });

  it("uses the same key for ::ffff:127.0.0.1 and 127.0.0.1", () => {
    const username = "SharedUser";
    const fromMapped = loginRateLimitKey({
      ip: "::ffff:127.0.0.1",
      body: { username },
    });
    const fromV4 = loginRateLimitKey({
      ip: "127.0.0.1",
      body: { username },
    });
    expect(fromMapped).toBe(fromV4);
    expect(fromMapped.endsWith(":shareduser")).toBe(true);
  });
});

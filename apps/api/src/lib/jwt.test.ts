import { describe, expect, it, vi } from "vitest";

vi.mock("../config/env.js", () => ({
  env: {
    JWT_ACCESS_SECRET: "a".repeat(40),
    JWT_REFRESH_SECRET: "b".repeat(40),
    NODE_ENV: "test",
  },
}));

import {
  createAccessToken,
  createRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
} from "./jwt.js";

describe("jwt", () => {
  it("creates and verifies an access token", () => {
    const token = createAccessToken({
      userId: 7,
      tenantId: 1,
      role: "Admin",
    });
    expect(verifyAccessToken(token)).toEqual({
      userId: 7,
      tenantId: 1,
      role: "Admin",
    });
  });

  it("creates and verifies a refresh token", () => {
    const token = createRefreshToken({
      userId: 7,
      tenantId: 1,
      tokenVersion: 3,
    });
    expect(verifyRefreshToken(token)).toEqual({
      userId: 7,
      tenantId: 1,
      tokenVersion: 3,
    });
  });

  it("rejects a refresh token verified with the access secret path", () => {
    const refresh = createRefreshToken({
      userId: 1,
      tenantId: 1,
      tokenVersion: 0,
    });
    expect(() => verifyAccessToken(refresh)).toThrow();
  });
});

import type { NextFunction, Request, Response } from "express";
import { describe, expect, it, vi } from "vitest";
import { authenticate } from "./authenticate.js";

vi.mock("../lib/jwt.js", () => ({
  verifyAccessToken: vi.fn(),
}));

import { verifyAccessToken } from "../lib/jwt.js";

function mockRes() {
  const res = {
    statusCode: 200,
    body: undefined as unknown,
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(payload: unknown) {
      this.body = payload;
      return this;
    },
  };
  return res as unknown as Response & { statusCode: number; body: unknown };
}

describe("authenticate", () => {
  it("returns 401 when Authorization header is missing", () => {
    const req = { headers: {} } as Request;
    const res = mockRes();
    const next = vi.fn() as unknown as NextFunction;
    authenticate(req, res, next);
    expect(res.statusCode).toBe(401);
    expect(res.body).toEqual({ code: "AUTH_UNAUTHORIZED" });
    expect(next).not.toHaveBeenCalled();
  });

  it("sets req.auth when the bearer token is valid", () => {
    vi.mocked(verifyAccessToken).mockReturnValue({
      userId: 9,
      tenantId: 1,
      role: "Admin",
    });
    const req = {
      headers: { authorization: "Bearer good-token" },
    } as Request;
    const res = mockRes();
    const next = vi.fn() as unknown as NextFunction;
    authenticate(req, res, next);
    expect(req.auth).toEqual({ userId: 9, tenantId: 1, role: "Admin" });
    expect(next).toHaveBeenCalledOnce();
  });
});

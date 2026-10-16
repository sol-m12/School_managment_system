import type { NextFunction, Request, Response } from "express";
import { describe, expect, it, vi } from "vitest";
import { authorize } from "./authorize.js";

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

describe("authorize", () => {
  it("returns 401 when auth is missing", () => {
    const req = {} as Request;
    const res = mockRes();
    const next = vi.fn() as unknown as NextFunction;
    authorize("Principal")(req, res, next);
    expect(res.statusCode).toBe(401);
    expect(res.body).toEqual({ code: "AUTH_UNAUTHORIZED" });
    expect(next).not.toHaveBeenCalled();
  });

  it("returns 403 when role is not allowed", () => {
    const req = {
      auth: { userId: 1, tenantId: 1, role: "Teacher" },
    } as Request;
    const res = mockRes();
    const next = vi.fn() as unknown as NextFunction;
    authorize("Principal")(req, res, next);
    expect(res.statusCode).toBe(403);
    expect(res.body).toEqual({ code: "AUTH_FORBIDDEN" });
    expect(next).not.toHaveBeenCalled();
  });

  it("calls next when role is allowed", () => {
    const req = {
      auth: { userId: 1, tenantId: 1, role: "Principal" },
    } as Request;
    const res = mockRes();
    const next = vi.fn() as unknown as NextFunction;
    authorize("Principal", "Teacher")(req, res, next);
    expect(next).toHaveBeenCalledOnce();
  });
});

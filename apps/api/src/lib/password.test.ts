import { createHash } from "node:crypto";
import bcrypt from "bcrypt";
import { describe, expect, it } from "vitest";
import { hashPassword, verifyPassword } from "./password.js";

describe("password", () => {
  it("verifies a bcrypt hash and does not rehash cost-12 $2b$", async () => {
    const hash = await bcrypt.hash("secret", 12);
    const result = await verifyPassword("secret", hash);
    expect(result).toEqual({ ok: true });
  });

  it("rejects a wrong bcrypt password", async () => {
    const hash = await bcrypt.hash("secret", 10);
    const result = await verifyPassword("nope", hash);
    expect(result).toEqual({ ok: false });
  });

  it("verifies PHP $2y$ bcrypt and returns a rehash", async () => {
    const as2b = await bcrypt.hash("legacy-pass", 10);
    const as2y = as2b.replace(/^\$2b\$/, "$2y$");
    const result = await verifyPassword("legacy-pass", as2y);
    expect(result.ok).toBe(true);
    if (!result.ok || !result.rehash) {
      throw new Error("expected rehash");
    }
    expect(result.rehash.startsWith("$2b$12$")).toBe(true);
    expect(await bcrypt.compare("legacy-pass", result.rehash)).toBe(true);
  });

  it("verifies MD5 and returns a bcrypt rehash", async () => {
    const md5 = createHash("md5").update("old").digest("hex");
    const result = await verifyPassword("old", md5);
    expect(result.ok).toBe(true);
    if (!result.ok || !result.rehash) {
      throw new Error("expected rehash");
    }
    expect(await bcrypt.compare("old", result.rehash)).toBe(true);
  });

  it("verifies plain text and returns a bcrypt rehash", async () => {
    const result = await verifyPassword("plain", "plain");
    expect(result.ok).toBe(true);
    if (!result.ok || !result.rehash) {
      throw new Error("expected rehash");
    }
    expect(await bcrypt.compare("plain", result.rehash)).toBe(true);
  });

  it("hashPassword uses bcrypt cost 12", async () => {
    const hash = await hashPassword("x");
    expect(hash.startsWith("$2b$12$")).toBe(true);
  });
});

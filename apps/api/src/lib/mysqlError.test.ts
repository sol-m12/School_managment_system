import { describe, expect, it } from "vitest";
import { ER_DUP_ENTRY, mysqlErrno } from "./mysqlError.js";

describe("mysqlErrno", () => {
  it("reads errno from a mysql2 error", () => {
    expect(mysqlErrno({ errno: ER_DUP_ENTRY, code: "ER_DUP_ENTRY" })).toBe(1062);
  });

  it("reads errno from an error wrapped in cause (Drizzle)", () => {
    const wrapped = new Error("Failed query", { cause: { errno: ER_DUP_ENTRY } });
    expect(mysqlErrno(wrapped)).toBe(1062);
  });

  it("returns undefined for other values", () => {
    expect(mysqlErrno(new Error("x"))).toBeUndefined();
    expect(mysqlErrno(null)).toBeUndefined();
    expect(mysqlErrno("boom")).toBeUndefined();
  });
});

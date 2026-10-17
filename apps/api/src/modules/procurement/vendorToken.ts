import jwt from "jsonwebtoken";
import { env } from "../../config/env.js";

export type VendorToken = { vendorId: number; tenantId: number };

export function createVendorToken(payload: VendorToken): string {
  return jwt.sign({ ...payload, kind: "vendor" }, env.JWT_ACCESS_SECRET, { expiresIn: "8h" });
}

export function readVendorToken(token: string): VendorToken {
  const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET);
  if (typeof decoded !== "object" || decoded === null || decoded.kind !== "vendor") {
    throw new Error("INVALID_VENDOR_TOKEN");
  }
  const vendorId = Number(decoded.vendorId);
  const tenantId = Number(decoded.tenantId);
  if (!Number.isInteger(vendorId) || !Number.isInteger(tenantId)) {
    throw new Error("INVALID_VENDOR_TOKEN");
  }
  return { vendorId, tenantId };
}

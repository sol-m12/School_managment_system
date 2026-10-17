import type { Role } from "../lib/roles.js";

declare global {
  namespace Express {
    interface Request {
      auth?: {
        userId: number;
        tenantId: number;
        role: Role;
      };
      platformAuth?: {
        userId: number;
      };
      vendor?: {
        vendorId: number;
        tenantId: number;
      };
    }
  }
}

export {};

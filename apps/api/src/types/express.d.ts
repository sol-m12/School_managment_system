import type { Role } from "../lib/roles.js";

declare global {
  namespace Express {
    interface Request {
      auth?: {
        userId: number;
        tenantId: number;
        role: Role;
      };
    }
  }
}

export {};

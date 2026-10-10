import { beforeAll, describe, expect, it } from "vitest";
import { seedTwoTenants, type IsolationSeed } from "./seed.js";

export type TenantIsolationRow = { id: number };

export type TenantIsolationOps = {
  /** Rows visible to the caller tenant (must use scoped / JWT tenant). */
  list: (tenantId: number) => Promise<TenantIsolationRow[]>;
  /** Fetch one row by id under the caller tenant; null/undefined if not found. */
  get: (
    tenantId: number,
    id: number,
  ) => Promise<TenantIsolationRow | null | undefined>;
  /** Update a row; must not affect the other tenant's row. */
  update: (tenantId: number, id: number) => Promise<void>;
  /** Delete a row; must not delete the other tenant's row. */
  delete: (tenantId: number, id: number) => Promise<void>;
  /** Resolve the seeded resource id for each tenant after seed. */
  resourceId: (seed: IsolationSeed) => { aId: number; bId: number };
};

/**
 * Standard cross-tenant checks for a feature's list/get/update/delete.
 *
 * Usage:
 *   describeTenantIsolation("students", {
 *     list: (tenantId) => ...,
 *     get: (tenantId, id) => ...,
 *     update: (tenantId, id) => ...,
 *     delete: (tenantId, id) => ...,
 *     resourceId: (seed) => ({
 *       aId: seed.tenantA.studentId,
 *       bId: seed.tenantB.studentId,
 *     }),
 *   });
 */
export function describeTenantIsolation(
  name: string,
  ops: TenantIsolationOps,
): void {
  describe(`tenant isolation: ${name}`, () => {
    let seed: IsolationSeed;
    let aId: number;
    let bId: number;

    beforeAll(async () => {
      seed = await seedTwoTenants();
      const ids = ops.resourceId(seed);
      aId = ids.aId;
      bId = ids.bId;
    });

    it("list returns only the caller tenant rows", async () => {
      const rows = await ops.list(seed.tenantA.id);
      const ids = rows.map((r) => r.id);
      expect(ids).toContain(aId);
      expect(ids).not.toContain(bId);
    });

    it("get cannot read another tenant's row", async () => {
      const own = await ops.get(seed.tenantA.id, aId);
      expect(own?.id).toBe(aId);

      const cross = await ops.get(seed.tenantA.id, bId);
      expect(cross == null).toBe(true);
    });

    it("update cannot change another tenant's row", async () => {
      await ops.update(seed.tenantA.id, bId);
      const stillThere = await ops.get(seed.tenantB.id, bId);
      expect(stillThere?.id).toBe(bId);
    });

    it("delete cannot remove another tenant's row", async () => {
      await ops.delete(seed.tenantA.id, bId);
      const stillThere = await ops.get(seed.tenantB.id, bId);
      expect(stillThere?.id).toBe(bId);
    });
  });
}

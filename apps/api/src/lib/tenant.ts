import { and, eq, type SQL } from "drizzle-orm";
import type { AnyMySqlColumn } from "drizzle-orm/mysql-core";

type TenantTable = {
  tenantId: AnyMySqlColumn;
};

/**
 * Tenant helpers — every query on a tenant table must use these.
 *
 * Select/update/delete:
 *   db.select().from(users).where(scoped(users, tenantId))
 *   db.select().from(users).where(scoped(users, tenantId, eq(users.userId, id)))
 *
 * Insert:
 *   db.insert(users).values(withTenant({ username, role, ... }, tenantId))
 *
 * tenantId always comes from the verified JWT (req.auth.tenantId), never from the client body.
 */
export function scoped(
  table: TenantTable,
  tenantId: number,
  extraCondition?: SQL,
): SQL | undefined {
  const tenantClause = eq(table.tenantId, tenantId);
  if (!extraCondition) {
    return tenantClause;
  }
  return and(tenantClause, extraCondition);
}

export function withTenant<T extends Record<string, unknown>>(
  values: T,
  tenantId: number,
): T & { tenantId: number } {
  return { ...values, tenantId };
}

import type { RowDataPacket } from "mysql2";
import { pool } from "../db/index.js";

export class TenantBackupError extends Error {
  constructor(readonly code: "TENANT_NOT_FOUND") {
    super(code);
    this.name = "TenantBackupError";
  }
}

export type TenantBackupMeta = {
  id: number;
  name: string;
  slug: string;
  status: string;
};

type ColumnRow = RowDataPacket & { TABLE_NAME: string };
type TenantRow = RowDataPacket & {
  id: number;
  name: string;
  slug: string;
  status: string;
};

function assertSafeIdent(name: string): string {
  if (!/^[A-Za-z0-9_]+$/.test(name)) {
    throw new Error("UNSAFE_IDENT");
  }
  return name;
}

function sqlLiteral(value: unknown): string {
  if (value === null || value === undefined) {
    return "NULL";
  }
  if (typeof value === "bigint") {
    return value.toString();
  }
  if (typeof value === "number") {
    return Number.isFinite(value) ? String(value) : "NULL";
  }
  if (typeof value === "boolean") {
    return value ? "1" : "0";
  }
  if (value instanceof Date) {
    const iso = value.toISOString();
    return `'${iso.slice(0, 19).replace("T", " ")}'`;
  }
  if (Buffer.isBuffer(value)) {
    return `X'${value.toString("hex")}'`;
  }
  if (typeof value === "object") {
    const json = JSON.stringify(value).replace(/\\/g, "\\\\").replace(/'/g, "''");
    return `'${json}'`;
  }
  const text = String(value)
    .replace(/\\/g, "\\\\")
    .replace(/\n/g, "\\n")
    .replace(/\r/g, "\\r")
    .replace(/\t/g, "\\t")
    .replace(/'/g, "''");
  return `'${text}'`;
}

function buildInsert(table: string, rows: RowDataPacket[]): string {
  if (rows.length === 0) {
    return `-- ${table}: 0 rows\n`;
  }
  const columns = Object.keys(rows[0]!).map(assertSafeIdent);
  const colList = columns.map((c) => `\`${c}\``).join(", ");
  const lines: string[] = [`-- ${table}: ${rows.length} row(s)`];
  for (const row of rows) {
    const values = columns.map((col) => sqlLiteral(row[col])).join(", ");
    lines.push(`INSERT INTO \`${table}\` (${colList}) VALUES (${values});`);
  }
  lines.push("");
  return lines.join("\n");
}

async function listTenantScopedTables(): Promise<string[]> {
  const [rows] = await pool.query<ColumnRow[]>(
    `SELECT DISTINCT TABLE_NAME
     FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND COLUMN_NAME = 'tenant_id'
     ORDER BY TABLE_NAME`,
  );
  return rows.map((row) => assertSafeIdent(String(row.TABLE_NAME)));
}

/**
 * Builds a SQL dump for one school (tenant). Includes the tenants row and every
 * table that has a tenant_id column, filtered to that school only.
 */
export async function buildTenantBackupSql(tenantId: number): Promise<{
  meta: TenantBackupMeta;
  filename: string;
  sql: string;
  tableCount: number;
  rowCount: number;
}> {
  const [tenantRows] = await pool.query<TenantRow[]>(
    `SELECT id, name, slug, status FROM tenants WHERE id = ? LIMIT 1`,
    [tenantId],
  );
  const tenant = tenantRows[0];
  if (!tenant) {
    throw new TenantBackupError("TENANT_NOT_FOUND");
  }

  const meta: TenantBackupMeta = {
    id: Number(tenant.id),
    name: String(tenant.name),
    slug: String(tenant.slug),
    status: String(tenant.status),
  };

  const tables = await listTenantScopedTables();
  const parts: string[] = [];
  let rowCount = 0;

  parts.push(`-- Keyt school backup (one tenant only)`);
  parts.push(`-- format: keyt-tenant-sql-v1`);
  parts.push(`-- tenant_id: ${meta.id}`);
  parts.push(`-- slug: ${meta.slug}`);
  parts.push(`-- name: ${meta.name.replace(/\n/g, " ")}`);
  parts.push(`-- exported_at: ${new Date().toISOString()}`);
  parts.push(`-- NOTE: Restore manually. Turn off FK checks if needed.`);
  parts.push(`SET NAMES utf8mb4;`);
  parts.push(`SET FOREIGN_KEY_CHECKS=0;`);
  parts.push("");

  const [tenantFull] = await pool.query<RowDataPacket[]>(
    `SELECT * FROM tenants WHERE id = ?`,
    [tenantId],
  );
  rowCount += tenantFull.length;
  parts.push(buildInsert("tenants", tenantFull));

  for (const table of tables) {
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT * FROM \`${table}\` WHERE tenant_id = ?`,
      [tenantId],
    );
    rowCount += rows.length;
    parts.push(buildInsert(table, rows));
  }

  parts.push(`SET FOREIGN_KEY_CHECKS=1;`);
  parts.push(`-- end of backup for tenant ${meta.id} (${meta.slug})`);

  const stamp = new Date().toISOString().slice(0, 10);
  const filename = `school-${meta.slug}-tenant-${meta.id}-${stamp}.sql`;

  return {
    meta,
    filename,
    sql: parts.join("\n"),
    tableCount: tables.length + 1,
    rowCount,
  };
}

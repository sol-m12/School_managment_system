import { asc, desc, eq, sql } from "drizzle-orm";
import { db } from "../../db/index.js";
import {
  schoolSettings,
  staff,
  systemSettings,
  tenants,
  users,
} from "../../db/schema/index.js";
import { hashPassword } from "../../lib/password.js";
import type { CreateSchoolBody } from "./platform.schema.js";

export class PlatformSchoolError extends Error {
  constructor(readonly code: string) {
    super(code);
    this.name = "PlatformSchoolError";
  }
}

export type TenantListItem = {
  id: number;
  name: string;
  slug: string;
  status: string;
  createdAt: string;
};

export type CreateSchoolResult = {
  tenantId: number;
  name: string;
  slug: string;
  status: string;
  loginPath: string;
  adminUsername: string;
  adminRole: "Technician";
};

/** First school operator is Technician (school IT / admin), not a platform user. */
const FIRST_ADMIN_ROLE = "Technician" as const;

export async function listTenants(): Promise<TenantListItem[]> {
  const rows = await db
    .select({
      id: tenants.id,
      name: tenants.name,
      slug: tenants.slug,
      status: tenants.status,
      createdAt: tenants.createdAt,
    })
    .from(tenants)
    .orderBy(desc(tenants.id));

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    slug: row.slug,
    status: row.status,
    createdAt: row.createdAt,
  }));
}

export async function createSchool(input: CreateSchoolBody): Promise<CreateSchoolResult> {
  const [existing] = await db
    .select({ id: tenants.id })
    .from(tenants)
    .where(eq(tenants.slug, input.slug))
    .limit(1);

  if (existing) {
    throw new PlatformSchoolError("SLUG_TAKEN");
  }

  const passwordHash = await hashPassword(input.adminPassword);
  const firstName = input.adminFirstName?.trim() || input.name;
  const lastName = input.adminLastName?.trim() || "Technician";

  const result = await db.transaction(async (tx) => {
    const insertResult = await tx.insert(tenants).values({
      name: input.name,
      slug: input.slug,
      status: "active",
    });
    const tenantId = Number(insertResult[0].insertId);

    const userInsert = await tx.insert(users).values({
      username: input.adminUsername,
      passwordHash,
      role: FIRST_ADMIN_ROLE,
      isActive: 1,
      tenantId,
      tokenVersion: 0,
      passwordChanged: 0,
    });
    const userId = Number(userInsert[0].insertId);

    await tx.insert(staff).values({
      firstName,
      lastName,
      role: FIRST_ADMIN_ROLE,
      jobTitle: "Technician",
      userId,
      isApproved: 1,
      tenantId,
    });

    const [maxSettings] = await tx
      .select({ maxId: sql<number>`COALESCE(MAX(${schoolSettings.id}), 0)` })
      .from(schoolSettings);
    const settingsId = Number(maxSettings?.maxId ?? 0) + 1;

    await tx.insert(schoolSettings).values({
      id: settingsId,
      schoolName: input.name,
      tenantId,
    });

    const [yearRow] = await tx
      .select({ settingValue: systemSettings.settingValue })
      .from(systemSettings)
      .where(eq(systemSettings.settingKey, "current_academic_year"))
      .orderBy(asc(systemSettings.settingId))
      .limit(1);

    const academicYear = yearRow?.settingValue || "2018";

    await tx.insert(systemSettings).values([
      {
        settingKey: "current_academic_year",
        settingValue: academicYear,
        tenantId,
      },
      {
        settingKey: "current_semester",
        settingValue: "1",
        tenantId,
      },
    ]);

    return { tenantId, userId };
  });

  return {
    tenantId: result.tenantId,
    name: input.name,
    slug: input.slug,
    status: "active",
    loginPath: `/login?tenant=${encodeURIComponent(input.slug)}`,
    adminUsername: input.adminUsername,
    adminRole: FIRST_ADMIN_ROLE,
  };
}

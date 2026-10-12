import { and, asc, count, desc, eq } from "drizzle-orm";
import { db } from "../../db/index.js";
import { externalInquiries, schoolNews, schoolSettings, staff, students, tenants, users } from "../../db/schema/index.js";
import type { Role } from "../../lib/roles.js";
import { scoped, withTenant } from "../../lib/tenant.js";
import type { InquiryBody } from "./public.schema.js";

export class PublicError extends Error {
  constructor(readonly code: "PUBLIC_NOT_FOUND") {
    super(code);
    this.name = "PublicError";
  }
}

export type PublicLeader = { name: string };

export type PublicNewsItem = { title: string; content: string };

export type PublicHome = {
  schoolName: string | null;
  schoolVision: string | null;
  schoolEmail: string | null;
  schoolPhone: string | null;
  schoolAddress: string | null;
  aboutText: string | null;
  schoolNeeds: string | null;
  /** Basename only. The web app serves it from /portal when the file is present. */
  logoFile: string | null;
  students: number;
  staff: number;
  news: PublicNewsItem[];
  principal: PublicLeader | null;
  vicePrincipal: PublicLeader | null;
};

const SAFE_FILE = /^[A-Za-z0-9._ -]+\.[A-Za-z0-9]+$/;

function logoBasename(value: string | null): string | null {
  if (!value) return null;
  const base = value.split(/[/\\]/).pop() ?? "";
  if (!base || base.includes("..") || !SAFE_FILE.test(base)) return null;
  return base;
}

async function tenantIdForSlug(slug: string): Promise<number> {
  const [tenant] = await db
    .select({ id: tenants.id, status: tenants.status })
    .from(tenants)
    .where(eq(tenants.slug, slug))
    .limit(1);
  if (!tenant || tenant.status !== "active") throw new PublicError("PUBLIC_NOT_FOUND");
  return tenant.id;
}

async function leader(tenantId: number, role: Extract<Role, "Admin" | "V_Principal">): Promise<PublicLeader | null> {
  const [row] = await db
    .select({ firstName: staff.firstName, lastName: staff.lastName })
    .from(staff)
    .innerJoin(users, eq(staff.userId, users.userId))
    .where(and(scoped(staff, tenantId), scoped(users, tenantId), eq(users.role, role)))
    .orderBy(asc(staff.staffId))
    .limit(1);
  if (!row) return null;
  const name = `${row.firstName} ${row.lastName}`.trim();
  return name ? { name } : null;
}

export async function publicHome(slug: string): Promise<PublicHome> {
  const tenantId = await tenantIdForSlug(slug);

  const [settings] = await db
    .select({
      schoolName: schoolSettings.schoolName,
      schoolVision: schoolSettings.schoolVision,
      schoolEmail: schoolSettings.schoolEmail,
      schoolPhone: schoolSettings.schoolPhone,
      schoolAddress: schoolSettings.schoolAddress,
      aboutText: schoolSettings.aboutText,
      schoolNeeds: schoolSettings.schoolNeeds,
      schoolLogo: schoolSettings.schoolLogo,
    })
    .from(schoolSettings)
    .where(scoped(schoolSettings, tenantId))
    .limit(1);

  const [studentRow] = await db.select({ total: count() }).from(students).where(scoped(students, tenantId));
  const [staffRow] = await db.select({ total: count() }).from(staff).where(scoped(staff, tenantId));

  const news = await db
    .select({ title: schoolNews.title, content: schoolNews.content })
    .from(schoolNews)
    .where(scoped(schoolNews, tenantId))
    .orderBy(desc(schoolNews.createdAt))
    .limit(5);

  return {
    schoolName: settings?.schoolName ?? null,
    schoolVision: settings?.schoolVision ?? null,
    schoolEmail: settings?.schoolEmail ?? null,
    schoolPhone: settings?.schoolPhone ?? null,
    schoolAddress: settings?.schoolAddress ?? null,
    aboutText: settings?.aboutText ?? null,
    schoolNeeds: settings?.schoolNeeds ?? null,
    logoFile: logoBasename(settings?.schoolLogo ?? null),
    students: Number(studentRow?.total ?? 0),
    staff: Number(staffRow?.total ?? 0),
    news,
    principal: await leader(tenantId, "Admin"),
    vicePrincipal: await leader(tenantId, "V_Principal"),
  };
}

export async function createInquiry(input: InquiryBody): Promise<void> {
  const tenantId = await tenantIdForSlug(input.slug);
  await db.insert(externalInquiries).values(
    withTenant(
      {
        senderName: input.senderName,
        orgName: input.orgName || null,
        email: input.email || null,
        phone: input.phone,
        subject: input.subject,
        message: input.message,
        status: "New" as const,
      },
      tenantId,
    ),
  );
}

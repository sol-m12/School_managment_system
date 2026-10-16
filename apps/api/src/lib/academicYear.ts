import { eq } from "drizzle-orm";
import { db } from "../db/index.js";
import { systemSettings } from "../db/schema/index.js";
import { scoped, withTenant } from "./tenant.js";

export const YEAR_KEY = "current_academic_year";
export const SEMESTER_KEY = "current_semester";
export const GATE_KEY = "academic_year_gate";
export const ARCHIVE_KEY = "archived_academic_years";

export type YearGate = "open" | "locked";

export type YearSnapshot = {
  academicYear: string | null;
  semester: string;
  gate: YearGate;
  archived: string[];
};

export function parseArchived(value: string | null): string[] {
  if (!value) return [];
  const seen = new Set<string>();
  for (const part of value.split(",")) {
    const year = part.trim();
    if (year) seen.add(year);
  }
  return [...seen];
}

export function isEthiopianYear(value: string): boolean {
  return /^\d{4}$/.test(value) && Number(value) >= 1990 && Number(value) <= 2100;
}

export async function settingValue(tenantId: number, key: string): Promise<string | null> {
  const [row] = await db
    .select({ value: systemSettings.settingValue })
    .from(systemSettings)
    .where(scoped(systemSettings, tenantId, eq(systemSettings.settingKey, key)))
    .limit(1);
  return row?.value ?? null;
}

export async function upsertSetting(tenantId: number, key: string, value: string): Promise<void> {
  const [existing] = await db
    .select({ id: systemSettings.settingId })
    .from(systemSettings)
    .where(scoped(systemSettings, tenantId, eq(systemSettings.settingKey, key)))
    .limit(1);
  if (existing) {
    await db
      .update(systemSettings)
      .set({ settingValue: value })
      .where(scoped(systemSettings, tenantId, eq(systemSettings.settingId, existing.id)));
    return;
  }
  await db.insert(systemSettings).values(withTenant({ settingKey: key, settingValue: value }, tenantId));
}

export async function yearSnapshot(tenantId: number): Promise<YearSnapshot> {
  const academicYear = await settingValue(tenantId, YEAR_KEY);
  const semester = (await settingValue(tenantId, SEMESTER_KEY)) ?? "1";
  const gate: YearGate = (await settingValue(tenantId, GATE_KEY)) === "locked" ? "locked" : "open";
  const archived = parseArchived(await settingValue(tenantId, ARCHIVE_KEY));
  return { academicYear, semester, gate, archived };
}

/** A locked current year, or any archived year, cannot be edited by teachers. */
export async function yearIsFrozen(tenantId: number, academicYear: string): Promise<boolean> {
  const snap = await yearSnapshot(tenantId);
  if (snap.archived.includes(academicYear)) return true;
  return snap.academicYear === academicYear && snap.gate === "locked";
}

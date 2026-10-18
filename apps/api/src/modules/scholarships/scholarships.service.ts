import { and, desc, eq } from "drizzle-orm";
import { db } from "../../db/index.js";
import {
  scholarshipApplications,
  scholarshipOpportunities,
  scholarshipRecommendations,
  scholarshipScores,
  scholarshipSettings,
  students,
} from "../../db/schema/index.js";
import { ER_DUP_ENTRY, mysqlErrno } from "../../lib/mysqlError.js";
import { scoped, withTenant } from "../../lib/tenant.js";
import type {
  ApplyBody,
  ImportScoresBody,
  OpportunityBody,
  RecommendationBody,
  SettingsBody,
} from "./scholarships.schema.js";

export type ScholarshipErrorCode =
  | "NOT_FOUND"
  | "NOT_ASSIGNED"
  | "NOT_ELIGIBLE"
  | "ALREADY_APPLIED"
  | "VALIDATION";

export class ScholarshipError extends Error {
  constructor(readonly code: ScholarshipErrorCode) {
    super(code);
  }
}

function insertId(result: unknown): number {
  const header = result as { insertId?: number } | Array<{ insertId?: number }>;
  if (Array.isArray(header)) return Number(header[0]?.insertId ?? 0);
  return Number(header.insertId ?? 0);
}

async function learnerStudentId(tenantId: number, userId: number): Promise<number> {
  const [row] = await db
    .select({ id: students.studentId })
    .from(students)
    .where(scoped(students, tenantId, eq(students.userId, userId)))
    .limit(1);
  if (!row) throw new ScholarshipError("NOT_ASSIGNED");
  return row.id;
}

export async function getSettings(tenantId: number, academicYear?: string) {
  if (academicYear) {
    const [row] = await db
      .select()
      .from(scholarshipSettings)
      .where(
        scoped(
          scholarshipSettings,
          tenantId,
          eq(scholarshipSettings.academicYear, academicYear),
        ),
      )
      .limit(1);
    return {
      settings: row
        ? {
            academicYear: row.academicYear,
            cutoffScore: Number(row.cutoffScore),
          }
        : null,
    };
  }
  const rows = await db
    .select()
    .from(scholarshipSettings)
    .where(scoped(scholarshipSettings, tenantId))
    .orderBy(desc(scholarshipSettings.settingId));
  return {
    rows: rows.map((r) => ({
      academicYear: r.academicYear,
      cutoffScore: Number(r.cutoffScore),
    })),
  };
}

export async function saveSettings(tenantId: number, userId: number, input: SettingsBody) {
  const [existing] = await db
    .select({ id: scholarshipSettings.settingId })
    .from(scholarshipSettings)
    .where(
      scoped(
        scholarshipSettings,
        tenantId,
        eq(scholarshipSettings.academicYear, input.academicYear),
      ),
    )
    .limit(1);
  if (existing) {
    await db
      .update(scholarshipSettings)
      .set({
        cutoffScore: String(input.cutoffScore),
        updatedBy: userId,
      })
      .where(
        scoped(scholarshipSettings, tenantId, eq(scholarshipSettings.settingId, existing.id)),
      );
  } else {
    await db.insert(scholarshipSettings).values(
      withTenant(
        {
          academicYear: input.academicYear,
          cutoffScore: String(input.cutoffScore),
          updatedBy: userId,
        },
        tenantId,
      ),
    );
  }
  return getSettings(tenantId, input.academicYear);
}

export async function importScores(tenantId: number, userId: number, input: ImportScoresBody) {
  let imported = 0;
  for (const row of input.rows) {
    const [student] = await db
      .select({ id: students.studentId })
      .from(students)
      .where(scoped(students, tenantId, eq(students.studentId, row.studentId)))
      .limit(1);
    if (!student) continue;

    const [existing] = await db
      .select({ id: scholarshipScores.scoreId })
      .from(scholarshipScores)
      .where(
        scoped(
          scholarshipScores,
          tenantId,
          and(
            eq(scholarshipScores.studentId, row.studentId),
            eq(scholarshipScores.academicYear, input.academicYear),
          ),
        ),
      )
      .limit(1);

    if (existing) {
      await db
        .update(scholarshipScores)
        .set({
          nationalScore: String(row.nationalScore),
          transcriptRef: row.transcriptRef,
          importedBy: userId,
        })
        .where(scoped(scholarshipScores, tenantId, eq(scholarshipScores.scoreId, existing.id)));
    } else {
      await db.insert(scholarshipScores).values(
        withTenant(
          {
            studentId: row.studentId,
            academicYear: input.academicYear,
            nationalScore: String(row.nationalScore),
            transcriptRef: row.transcriptRef,
            importedBy: userId,
          },
          tenantId,
        ),
      );
    }
    imported += 1;
  }
  return { imported };
}

export async function listScores(tenantId: number, academicYear: string) {
  const rows = await db
    .select({
      id: scholarshipScores.scoreId,
      studentId: scholarshipScores.studentId,
      studentName: students.fullName,
      nationalScore: scholarshipScores.nationalScore,
      transcriptRef: scholarshipScores.transcriptRef,
      academicYear: scholarshipScores.academicYear,
    })
    .from(scholarshipScores)
    .innerJoin(
      students,
      and(eq(students.studentId, scholarshipScores.studentId), eq(students.tenantId, tenantId)),
    )
    .where(scoped(scholarshipScores, tenantId, eq(scholarshipScores.academicYear, academicYear)))
    .orderBy(desc(scholarshipScores.nationalScore));
  return {
    rows: rows.map((r) => ({
      ...r,
      nationalScore: Number(r.nationalScore),
    })),
  };
}

export async function listStudentOptions(tenantId: number) {
  const rows = await db
    .select({
      id: students.studentId,
      name: students.fullName,
      gradeLevel: students.gradeLevel,
    })
    .from(students)
    .where(scoped(students, tenantId))
    .orderBy(students.fullName)
    .limit(2000);
  return {
    students: rows.map((s) => ({
      id: s.id,
      name: s.name,
      label: `${s.name} · Grade ${s.gradeLevel}`,
    })),
  };
}

async function eligibility(tenantId: number, studentId: number) {
  const [score] = await db
    .select()
    .from(scholarshipScores)
    .where(scoped(scholarshipScores, tenantId, eq(scholarshipScores.studentId, studentId)))
    .orderBy(desc(scholarshipScores.scoreId))
    .limit(1);
  if (!score) return { eligible: false, score: null as number | null, cutoff: null as number | null };

  const [settings] = await db
    .select()
    .from(scholarshipSettings)
    .where(
      scoped(
        scholarshipSettings,
        tenantId,
        eq(scholarshipSettings.academicYear, score.academicYear),
      ),
    )
    .limit(1);
  const cutoff = settings ? Number(settings.cutoffScore) : null;
  const national = Number(score.nationalScore);
  return {
    eligible: cutoff != null && national >= cutoff,
    score: national,
    cutoff,
    academicYear: score.academicYear,
    transcriptRef: score.transcriptRef,
  };
}

export async function studentPortal(tenantId: number, userId: number) {
  const studentId = await learnerStudentId(tenantId, userId);
  const elig = await eligibility(tenantId, studentId);
  if (!elig.eligible) {
    return { unlocked: false, ...elig, opportunities: [], applications: [] };
  }

  const opportunities = await db
    .select()
    .from(scholarshipOpportunities)
    .where(
      scoped(
        scholarshipOpportunities,
        tenantId,
        eq(scholarshipOpportunities.isActive, 1),
      ),
    )
    .orderBy(desc(scholarshipOpportunities.opportunityId));

  const applications = await db
    .select({
      id: scholarshipApplications.applicationId,
      opportunityId: scholarshipApplications.opportunityId,
      status: scholarshipApplications.status,
      note: scholarshipApplications.note,
      title: scholarshipOpportunities.title,
    })
    .from(scholarshipApplications)
    .innerJoin(
      scholarshipOpportunities,
      and(
        eq(scholarshipOpportunities.opportunityId, scholarshipApplications.opportunityId),
        eq(scholarshipOpportunities.tenantId, tenantId),
      ),
    )
    .where(scoped(scholarshipApplications, tenantId, eq(scholarshipApplications.studentId, studentId)))
    .orderBy(desc(scholarshipApplications.applicationId));

  return {
    unlocked: true,
    ...elig,
    opportunities: opportunities.map((o) => ({
      id: o.opportunityId,
      title: o.title,
      url: o.url,
      guidelines: o.guidelines,
    })),
    applications,
  };
}

export async function apply(tenantId: number, userId: number, input: ApplyBody) {
  const studentId = await learnerStudentId(tenantId, userId);
  const elig = await eligibility(tenantId, studentId);
  if (!elig.eligible) throw new ScholarshipError("NOT_ELIGIBLE");

  const [opp] = await db
    .select()
    .from(scholarshipOpportunities)
    .where(
      scoped(
        scholarshipOpportunities,
        tenantId,
        and(
          eq(scholarshipOpportunities.opportunityId, input.opportunityId),
          eq(scholarshipOpportunities.isActive, 1),
        ),
      ),
    )
    .limit(1);
  if (!opp) throw new ScholarshipError("NOT_FOUND");

  try {
    const id = insertId(
      await db.insert(scholarshipApplications).values(
        withTenant(
          {
            opportunityId: input.opportunityId,
            studentId,
            status: "Submitted" as const,
            note: input.note,
          },
          tenantId,
        ),
      ),
    );
    return { id };
  } catch (error) {
    if (mysqlErrno(error) === ER_DUP_ENTRY) throw new ScholarshipError("ALREADY_APPLIED");
    throw error;
  }
}

export async function requestLetter(tenantId: number, userId: number, applicationId: number) {
  const studentId = await learnerStudentId(tenantId, userId);
  const [app] = await db
    .select()
    .from(scholarshipApplications)
    .where(
      scoped(
        scholarshipApplications,
        tenantId,
        and(
          eq(scholarshipApplications.applicationId, applicationId),
          eq(scholarshipApplications.studentId, studentId),
        ),
      ),
    )
    .limit(1);
  if (!app) throw new ScholarshipError("NOT_FOUND");
  await db
    .update(scholarshipApplications)
    .set({ status: "LetterRequested" })
    .where(
      scoped(
        scholarshipApplications,
        tenantId,
        eq(scholarshipApplications.applicationId, applicationId),
      ),
    );
  return { ok: true as const };
}

export async function listOpportunities(tenantId: number) {
  const rows = await db
    .select()
    .from(scholarshipOpportunities)
    .where(scoped(scholarshipOpportunities, tenantId))
    .orderBy(desc(scholarshipOpportunities.opportunityId));
  return {
    rows: rows.map((o) => ({
      id: o.opportunityId,
      title: o.title,
      url: o.url,
      guidelines: o.guidelines,
      isActive: o.isActive === 1,
    })),
  };
}

export async function createOpportunity(tenantId: number, userId: number, input: OpportunityBody) {
  const id = insertId(
    await db.insert(scholarshipOpportunities).values(
      withTenant(
        {
          title: input.title,
          url: input.url,
          guidelines: input.guidelines,
          isActive: input.isActive ? 1 : 0,
          postedBy: userId,
        },
        tenantId,
      ),
    ),
  );
  return { id };
}

export async function updateOpportunity(
  tenantId: number,
  id: number,
  input: Partial<OpportunityBody>,
) {
  const [row] = await db
    .select({ id: scholarshipOpportunities.opportunityId })
    .from(scholarshipOpportunities)
    .where(scoped(scholarshipOpportunities, tenantId, eq(scholarshipOpportunities.opportunityId, id)))
    .limit(1);
  if (!row) throw new ScholarshipError("NOT_FOUND");
  await db
    .update(scholarshipOpportunities)
    .set({
      ...(input.title !== undefined ? { title: input.title } : {}),
      ...(input.url !== undefined ? { url: input.url } : {}),
      ...(input.guidelines !== undefined ? { guidelines: input.guidelines } : {}),
      ...(input.isActive !== undefined ? { isActive: input.isActive ? 1 : 0 } : {}),
    })
    .where(scoped(scholarshipOpportunities, tenantId, eq(scholarshipOpportunities.opportunityId, id)));
  return { ok: true as const };
}

export async function listLetterQueue(tenantId: number) {
  const rows = await db
    .select({
      id: scholarshipApplications.applicationId,
      status: scholarshipApplications.status,
      studentId: scholarshipApplications.studentId,
      studentName: students.fullName,
      title: scholarshipOpportunities.title,
      note: scholarshipApplications.note,
    })
    .from(scholarshipApplications)
    .innerJoin(
      students,
      and(
        eq(students.studentId, scholarshipApplications.studentId),
        eq(students.tenantId, tenantId),
      ),
    )
    .innerJoin(
      scholarshipOpportunities,
      and(
        eq(scholarshipOpportunities.opportunityId, scholarshipApplications.opportunityId),
        eq(scholarshipOpportunities.tenantId, tenantId),
      ),
    )
    .where(
      scoped(
        scholarshipApplications,
        tenantId,
        eq(scholarshipApplications.status, "LetterRequested"),
      ),
    )
    .orderBy(desc(scholarshipApplications.applicationId));
  return { rows };
}

export async function draftRecommendation(
  tenantId: number,
  userId: number,
  input: RecommendationBody,
) {
  const [app] = await db
    .select()
    .from(scholarshipApplications)
    .where(
      scoped(
        scholarshipApplications,
        tenantId,
        eq(scholarshipApplications.applicationId, input.applicationId),
      ),
    )
    .limit(1);
  if (!app) throw new ScholarshipError("NOT_FOUND");

  const id = insertId(
    await db.insert(scholarshipRecommendations).values(
      withTenant(
        {
          applicationId: input.applicationId,
          authorUserId: userId,
          body: input.body,
          status: "Draft" as const,
        },
        tenantId,
      ),
    ),
  );
  return { id };
}

export async function signRecommendation(tenantId: number, userId: number, id: number) {
  const [row] = await db
    .select()
    .from(scholarshipRecommendations)
    .where(
      scoped(
        scholarshipRecommendations,
        tenantId,
        and(
          eq(scholarshipRecommendations.recommendationId, id),
          eq(scholarshipRecommendations.authorUserId, userId),
        ),
      ),
    )
    .limit(1);
  if (!row) throw new ScholarshipError("NOT_FOUND");

  await db
    .update(scholarshipRecommendations)
    .set({
      status: "Signed",
      signedAt: new Date().toISOString().slice(0, 19).replace("T", " "),
    })
    .where(
      scoped(
        scholarshipRecommendations,
        tenantId,
        eq(scholarshipRecommendations.recommendationId, id),
      ),
    );

  await db
    .update(scholarshipApplications)
    .set({ status: "LetterReady" })
    .where(
      scoped(
        scholarshipApplications,
        tenantId,
        eq(scholarshipApplications.applicationId, row.applicationId),
      ),
    );

  return { ok: true as const };
}

export async function getOpportunity(tenantId: number, id: number) {
  const [row] = await db
    .select()
    .from(scholarshipOpportunities)
    .where(scoped(scholarshipOpportunities, tenantId, eq(scholarshipOpportunities.opportunityId, id)))
    .limit(1);
  if (!row) throw new ScholarshipError("NOT_FOUND");
  return {
    id: row.opportunityId,
    title: row.title,
    url: row.url,
    guidelines: row.guidelines,
    isActive: row.isActive === 1,
  };
}

export async function deleteOpportunity(tenantId: number, id: number) {
  const [row] = await db
    .select({ id: scholarshipOpportunities.opportunityId })
    .from(scholarshipOpportunities)
    .where(scoped(scholarshipOpportunities, tenantId, eq(scholarshipOpportunities.opportunityId, id)))
    .limit(1);
  if (!row) throw new ScholarshipError("NOT_FOUND");
  await db
    .delete(scholarshipOpportunities)
    .where(scoped(scholarshipOpportunities, tenantId, eq(scholarshipOpportunities.opportunityId, id)));
  return { ok: true as const };
}

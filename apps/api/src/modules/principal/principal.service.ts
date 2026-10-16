import { and, desc, eq, inArray } from "drizzle-orm";
import { db } from "../../db/index.js";
import {
  announcements,
  attendance,
  auditLog,
  libraryBorrowing,
  principalApprovalNotes,
  principalDocuments,
  principalIncidents,
  principalMessages,
  principalPolicies,
  principalReportDefs,
  principalTraining,
  principalTransfers,
  requisitionsModel20,
  staff,
  students,
} from "../../db/schema/index.js";
import { scoped, withTenant } from "../../lib/tenant.js";
import { buildPicture, projectReport, schoolName, type Picture } from "./principal.analytics.js";
import {
  REPORT_COLUMNS,
  type ClearanceInput,
  type DecideInput,
  type DocumentInput,
  type IncidentInput,
  type MessageInput,
  type PolicyInput,
  type ReportColumn,
  type ReportDefInput,
  type SignInput,
  type TrainingInput,
  type TransferInput,
} from "./principal.schema.js";

export type PrincipalErrorCode = "NOT_FOUND" | "NOTE_REQUIRED" | "CLEARANCE_INCOMPLETE" | "NOT_READY";

export class PrincipalError extends Error {
  readonly code: PrincipalErrorCode;

  constructor(code: PrincipalErrorCode) {
    super(code);
    this.code = code;
  }
}

function addisNow(): string {
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Africa/Addis_Ababa",
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(new Date());
}

function addisDate(): string {
  return addisNow().slice(0, 10);
}

function insertId(result: unknown): number {
  if (!Array.isArray(result)) return 0;
  const header = result[0] as { insertId?: number } | undefined;
  return Number(header?.insertId ?? 0);
}

async function writeAudit(tenantId: number, userId: number, actionType: string, description: string): Promise<void> {
  await db.insert(auditLog).values(
    withTenant({ userId, actionType, description, timestamp: addisNow() }, tenantId),
  );
}

function needsNote(action: DecideInput["action"], note: string): boolean {
  return (action === "clarify" || action === "override") && note.trim().length < 3;
}

export async function executiveView(tenantId: number) {
  const [picture, policies] = await Promise.all([buildPicture(tenantId), listPolicies(tenantId)]);
  return {
    passMark: picture.passMark,
    latestYear: picture.latestYear,
    passRate: picture.schoolPassRate,
    presentRate: picture.presentRate,
    incomeTotal: picture.incomeTotal,
    expenseTotal: picture.expenseTotal,
    approvedStaff: picture.approvedStaff,
    staffTotal: picture.staffTotal,
    activePolicies: policies.filter((row) => row.status === "Active").length,
    policies,
  };
}

export async function listPolicies(tenantId: number) {
  return db
    .select({
      id: principalPolicies.policyId,
      title: principalPolicies.title,
      body: principalPolicies.body,
      area: principalPolicies.area,
      status: principalPolicies.status,
      effectiveOn: principalPolicies.effectiveOn,
    })
    .from(principalPolicies)
    .where(scoped(principalPolicies, tenantId))
    .orderBy(desc(principalPolicies.policyId));
}

export async function createPolicy(tenantId: number, userId: number, input: PolicyInput) {
  const result = await db.insert(principalPolicies).values(
    withTenant(
      {
        title: input.title,
        body: input.body,
        area: input.area,
        status: input.status,
        effectiveOn: input.effectiveOn ?? null,
        recordedBy: userId,
      },
      tenantId,
    ),
  );
  const id = insertId(result);
  await writeAudit(tenantId, userId, "principal.policy", input.title);
  return { id };
}

export async function updatePolicyStatus(tenantId: number, userId: number, id: number, status: PolicyInput["status"]) {
  const updated = await db
    .update(principalPolicies)
    .set({ status })
    .where(scoped(principalPolicies, tenantId, eq(principalPolicies.policyId, id)));
  if (Number(updated[0].affectedRows) === 0) throw new PrincipalError("NOT_FOUND");
  await writeAudit(tenantId, userId, "principal.policy", `${status} #${id}`);
}

export async function getPolicy(tenantId: number, id: number) {
  const [row] = await db
    .select({ id: principalPolicies.policyId, title: principalPolicies.title })
    .from(principalPolicies)
    .where(scoped(principalPolicies, tenantId, eq(principalPolicies.policyId, id)))
    .limit(1);
  return row ?? null;
}

export async function renamePolicy(tenantId: number, id: number, title: string) {
  await db
    .update(principalPolicies)
    .set({ title })
    .where(scoped(principalPolicies, tenantId, eq(principalPolicies.policyId, id)));
}

export async function deletePolicy(tenantId: number, id: number) {
  await db.delete(principalPolicies).where(scoped(principalPolicies, tenantId, eq(principalPolicies.policyId, id)));
}

export async function trendsView(tenantId: number) {
  const picture = await buildPicture(tenantId);
  return { passMark: picture.passMark, latestYear: picture.latestYear, years: picture.years, grades: picture.grades };
}

export async function premiumView(tenantId: number) {
  const picture = await buildPicture(tenantId);
  return {
    passMark: picture.passMark,
    latestYear: picture.latestYear,
    forecast: picture.forecast,
    benchmarks: picture.benchmarks,
    schoolPassRate: picture.schoolPassRate,
    years: picture.years.map((year) => ({ year: year.year, passRate: year.passRate })),
    audit: picture.audit,
  };
}

export async function comparativeView(tenantId: number) {
  const picture = await buildPicture(tenantId);
  return {
    passMark: picture.passMark,
    latestYear: picture.latestYear,
    schoolPassRate: picture.schoolPassRate,
    years: picture.years.map((year) => ({ year: year.year, passRate: year.passRate, students: year.students })),
    grades: picture.grades,
  };
}

export async function correlationView(tenantId: number) {
  const picture = await buildPicture(tenantId);
  return { rows: picture.correlation };
}

export async function atRiskView(tenantId: number) {
  const picture = await buildPicture(tenantId);
  return { passMark: picture.passMark, latestYear: picture.latestYear, rows: picture.atRisk };
}

export async function warningsView(tenantId: number) {
  const picture = await buildPicture(tenantId);
  return { latestYear: picture.latestYear, insights: picture.insights, rows: picture.atRisk.filter((row) => row.band === "high") };
}

export async function demographicsView(tenantId: number) {
  const picture = await buildPicture(tenantId);
  return { latestYear: picture.latestYear, years: picture.years };
}

export async function staffKpiView(tenantId: number) {
  const picture = await buildPicture(tenantId);
  return { rows: picture.staffKpis };
}

export async function moeReport(tenantId: number) {
  const [picture, name] = await Promise.all([buildPicture(tenantId), schoolName(tenantId)]);
  return {
    schoolName: name,
    generatedOn: addisDate(),
    passMark: picture.passMark,
    latestYear: picture.latestYear,
    teachers: picture.teacherCount,
    approvedStaff: picture.approvedStaff,
    staffTotal: picture.staffTotal,
    years: picture.years,
    grades: picture.grades,
  };
}

const HUB_KINDS = ["announcement", "emergency", "memo"] as const;
const BULK_KINDS = ["targeted", "bulk"] as const;

export async function listMessages(tenantId: number, scope: "hub" | "bulk") {
  const kinds = scope === "hub" ? HUB_KINDS : BULK_KINDS;
  return db
    .select({
      id: principalMessages.messageId,
      kind: principalMessages.kind,
      audience: principalMessages.audience,
      title: principalMessages.title,
      body: principalMessages.body,
      createdAt: principalMessages.createdAt,
    })
    .from(principalMessages)
    .where(scoped(principalMessages, tenantId, inArray(principalMessages.kind, [...kinds])))
    .orderBy(desc(principalMessages.messageId))
    .limit(100);
}

export async function createMessage(tenantId: number, userId: number, input: MessageInput) {
  const result = await db.insert(principalMessages).values(
    withTenant(
      {
        kind: input.kind,
        audience: input.audience,
        title: input.title,
        body: input.body,
        recordedBy: userId,
      },
      tenantId,
    ),
  );
  if (input.kind === "announcement" || input.kind === "emergency") {
    await db.insert(announcements).values(
      withTenant(
        {
          title: input.title,
          content: input.body,
          targetRole: "All" as const,
          startDate: addisDate(),
          isUrgent: input.kind === "emergency" ? 1 : 0,
          postedBy: userId,
        },
        tenantId,
      ),
    );
  }
  await writeAudit(tenantId, userId, "principal.message", `${input.kind}: ${input.title}`);
  return { id: insertId(result) };
}

export async function inbox(tenantId: number) {
  const [storeRows, studentRows, attendanceRows, staffRows] = await Promise.all([
    db
      .select({
        id: requisitionsModel20.requisitionId,
        refCode: requisitionsModel20.refCode,
        purpose: requisitionsModel20.purpose,
        status: requisitionsModel20.status,
        forwarded: requisitionsModel20.approvedByStaffId,
      })
      .from(requisitionsModel20)
      .where(scoped(requisitionsModel20, tenantId, inArray(requisitionsModel20.status, ["Pending", "Clarify"])))
      .orderBy(desc(requisitionsModel20.requisitionId))
      .limit(40),
    db
      .select({
        id: students.studentId,
        name: students.fullName,
        gradeLevel: students.gradeLevel,
        section: students.section,
        status: students.submissionStatus,
      })
      .from(students)
      .where(scoped(students, tenantId, and(eq(students.isApproved, 0), eq(students.submissionStatus, "Submitted"))))
      .orderBy(desc(students.studentId))
      .limit(40),
    db
      .select({
        id: attendance.attId,
        studentId: attendance.studentId,
        date: attendance.date,
        status: attendance.status,
      })
      .from(attendance)
      .where(scoped(attendance, tenantId, eq(attendance.approvalStatus, "Pending")))
      .orderBy(desc(attendance.attId))
      .limit(40),
    db
      .select({
        id: staff.staffId,
        firstName: staff.firstName,
        lastName: staff.lastName,
        role: staff.role,
      })
      .from(staff)
      .where(scoped(staff, tenantId, eq(staff.isApproved, 0)))
      .orderBy(desc(staff.staffId))
      .limit(40),
  ]);

  return {
    items: [
      ...storeRows.map((row) => ({
        source: "store" as const,
        sourceId: row.id,
        title: row.refCode,
        detail: row.purpose ?? row.status,
        status: row.status,
        ready: row.forwarded != null,
      })),
      ...studentRows.map((row) => ({
        source: "registration" as const,
        sourceId: row.id,
        title: row.name,
        detail: `${row.gradeLevel}${row.section ? `-${row.section}` : ""}`,
        status: row.status ?? "Submitted",
        ready: true,
      })),
      ...attendanceRows.map((row) => ({
        source: "attendance" as const,
        sourceId: row.id,
        title: String(row.studentId),
        detail: `${row.date} ${row.status}`,
        status: "Pending",
        ready: true,
      })),
      ...staffRows.map((row) => ({
        source: "staff" as const,
        sourceId: row.id,
        title: `${row.firstName} ${row.lastName}`.trim(),
        detail: row.role,
        status: "Pending",
        ready: true,
      })),
    ],
  };
}

export async function decide(tenantId: number, userId: number, input: DecideInput) {
  if (needsNote(input.action, input.note)) throw new PrincipalError("NOTE_REQUIRED");
  const note = input.note.trim() || input.action;
  if (input.source === "store") await decideStore(tenantId, input);
  else if (input.source === "registration") await decideRegistration(tenantId, userId, input);
  else if (input.source === "attendance") await decideAttendance(tenantId, userId, input);
  else await decideStaff(tenantId, input);
  await db.insert(principalApprovalNotes).values(
    withTenant(
      {
        source: input.source,
        sourceId: input.sourceId,
        action: input.action,
        note,
        recordedBy: userId,
      },
      tenantId,
    ),
  );
  await writeAudit(tenantId, userId, "principal.decision", `${input.action} ${input.source} #${input.sourceId}`);
}

async function decideStore(tenantId: number, input: DecideInput) {
  const [row] = await db
    .select({
      id: requisitionsModel20.requisitionId,
      forwarded: requisitionsModel20.approvedByStaffId,
    })
    .from(requisitionsModel20)
    .where(scoped(requisitionsModel20, tenantId, eq(requisitionsModel20.requisitionId, input.sourceId)))
    .limit(1);
  if (!row) throw new PrincipalError("NOT_FOUND");
  if (input.action === "approve" && row.forwarded == null) throw new PrincipalError("NOT_READY");
  const status =
    input.action === "reject" ? "Rejected" : input.action === "clarify" ? "Clarify" : "Approved";
  await db
    .update(requisitionsModel20)
    .set({ status })
    .where(scoped(requisitionsModel20, tenantId, eq(requisitionsModel20.requisitionId, input.sourceId)));
}

async function decideRegistration(tenantId: number, userId: number, input: DecideInput) {
  const [row] = await db
    .select({ id: students.studentId })
    .from(students)
    .where(scoped(students, tenantId, eq(students.studentId, input.sourceId)))
    .limit(1);
  if (!row) throw new PrincipalError("NOT_FOUND");
  if (input.action === "clarify") return;
  const approve = input.action === "approve" || input.action === "override";
  await db
    .update(students)
    .set(
      approve
        ? { submissionStatus: "Approved", isApproved: 1, approvedBy: userId, approvalDate: addisNow() }
        : { submissionStatus: "Draft", isApproved: 0, approvedBy: null, approvalDate: null },
    )
    .where(scoped(students, tenantId, eq(students.studentId, input.sourceId)));
}

async function decideAttendance(tenantId: number, userId: number, input: DecideInput) {
  const [row] = await db
    .select({ id: attendance.attId })
    .from(attendance)
    .where(scoped(attendance, tenantId, eq(attendance.attId, input.sourceId)))
    .limit(1);
  if (!row) throw new PrincipalError("NOT_FOUND");
  if (input.action === "clarify") return;
  const approve = input.action === "approve" || input.action === "override";
  await db
    .update(attendance)
    .set(
      approve
        ? { approvalStatus: "Approved", approvedBy: userId, approvalDate: addisNow(), rejectionReason: null }
        : { approvalStatus: "Rejected", approvedBy: userId, approvalDate: addisNow(), rejectionReason: input.note || null },
    )
    .where(scoped(attendance, tenantId, eq(attendance.attId, input.sourceId)));
}

async function decideStaff(tenantId: number, input: DecideInput) {
  const [row] = await db
    .select({ id: staff.staffId })
    .from(staff)
    .where(scoped(staff, tenantId, eq(staff.staffId, input.sourceId)))
    .limit(1);
  if (!row) throw new PrincipalError("NOT_FOUND");
  if (input.action === "clarify") return;
  const approve = input.action === "approve" || input.action === "override";
  await db
    .update(staff)
    .set(approve ? { isApproved: 1, approvalDate: addisNow() } : { isApproved: 0, approvalDate: null })
    .where(scoped(staff, tenantId, eq(staff.staffId, input.sourceId)));
}

export async function listDocuments(tenantId: number) {
  return db
    .select({
      id: principalDocuments.documentId,
      title: principalDocuments.title,
      body: principalDocuments.body,
      status: principalDocuments.status,
      signerName: principalDocuments.signerName,
      signedAt: principalDocuments.signedAt,
    })
    .from(principalDocuments)
    .where(scoped(principalDocuments, tenantId))
    .orderBy(desc(principalDocuments.documentId))
    .limit(100);
}

export async function createDocument(tenantId: number, userId: number, input: DocumentInput) {
  const result = await db.insert(principalDocuments).values(
    withTenant({ title: input.title, body: input.body, recordedBy: userId }, tenantId),
  );
  return { id: insertId(result) };
}

export async function signDocument(tenantId: number, userId: number, id: number, input: SignInput) {
  const updated = await db
    .update(principalDocuments)
    .set({ status: "Signed", signerName: input.signerName, signedBy: userId, signedAt: addisNow() })
    .where(scoped(principalDocuments, tenantId, and(eq(principalDocuments.documentId, id), eq(principalDocuments.status, "Draft"))));
  if (Number(updated[0].affectedRows) === 0) throw new PrincipalError("NOT_FOUND");
  await writeAudit(tenantId, userId, "principal.sign", `${input.signerName} #${id}`);
}

export async function rejectDocument(tenantId: number, userId: number, id: number) {
  const updated = await db
    .update(principalDocuments)
    .set({ status: "Rejected" })
    .where(scoped(principalDocuments, tenantId, and(eq(principalDocuments.documentId, id), eq(principalDocuments.status, "Draft"))));
  if (Number(updated[0].affectedRows) === 0) throw new PrincipalError("NOT_FOUND");
  await writeAudit(tenantId, userId, "principal.sign", `rejected #${id}`);
}

export async function transferBoard(tenantId: number) {
  const [transferRows, studentRows] = await Promise.all([
    db
      .select({
        id: principalTransfers.transferId,
        studentId: principalTransfers.studentId,
        studentName: students.fullName,
        gradeLevel: students.gradeLevel,
        section: students.section,
        destination: principalTransfers.destination,
        reason: principalTransfers.reason,
        libraryClear: principalTransfers.libraryClear,
        storeClear: principalTransfers.storeClear,
        financeClear: principalTransfers.financeClear,
        status: principalTransfers.status,
        certificateNo: principalTransfers.certificateNo,
      })
      .from(principalTransfers)
      .innerJoin(students, and(eq(students.studentId, principalTransfers.studentId), eq(students.tenantId, tenantId)))
      .where(scoped(principalTransfers, tenantId))
      .orderBy(desc(principalTransfers.transferId)),
    db
      .select({
        id: students.studentId,
        name: students.fullName,
        gradeLevel: students.gradeLevel,
        section: students.section,
        year: students.academicYear,
      })
      .from(students)
      .where(scoped(students, tenantId))
      .orderBy(desc(students.studentId)),
  ]);
  return {
    transfers: transferRows.map((row) => ({
      ...row,
      libraryClear: row.libraryClear === 1,
      storeClear: row.storeClear === 1,
      financeClear: row.financeClear === 1,
    })),
    students: studentRows,
  };
}

export async function openTransfer(tenantId: number, userId: number, input: TransferInput) {
  const [student] = await db
    .select({ id: students.studentId })
    .from(students)
    .where(scoped(students, tenantId, eq(students.studentId, input.studentId)))
    .limit(1);
  if (!student) throw new PrincipalError("NOT_FOUND");
  const result = await db.insert(principalTransfers).values(
    withTenant(
      {
        studentId: input.studentId,
        destination: input.destination,
        reason: input.reason,
        recordedBy: userId,
      },
      tenantId,
    ),
  );
  return { id: insertId(result) };
}

async function loadTransfer(tenantId: number, id: number) {
  const [row] = await db
    .select({
      id: principalTransfers.transferId,
      studentId: principalTransfers.studentId,
      destination: principalTransfers.destination,
      reason: principalTransfers.reason,
      libraryClear: principalTransfers.libraryClear,
      storeClear: principalTransfers.storeClear,
      financeClear: principalTransfers.financeClear,
      status: principalTransfers.status,
      certificateNo: principalTransfers.certificateNo,
      name: students.fullName,
      gradeLevel: students.gradeLevel,
      section: students.section,
      year: students.academicYear,
      userId: students.userId,
    })
    .from(principalTransfers)
    .innerJoin(students, and(eq(students.studentId, principalTransfers.studentId), eq(students.tenantId, tenantId)))
    .where(scoped(principalTransfers, tenantId, eq(principalTransfers.transferId, id)))
    .limit(1);
  if (!row) throw new PrincipalError("NOT_FOUND");
  return row;
}

export async function checkLibrary(tenantId: number, id: number) {
  const row = await loadTransfer(tenantId, id);
  let openLoans = 0;
  if (row.userId != null) {
    const loans = await db
      .select({ id: libraryBorrowing.borrowId })
      .from(libraryBorrowing)
      .where(
        scoped(
          libraryBorrowing,
          tenantId,
          and(eq(libraryBorrowing.userId, row.userId), eq(libraryBorrowing.status, "Borrowed")),
        ),
      );
    openLoans = loans.length;
  }
  const libraryClear = openLoans === 0 ? 1 : 0;
  await db
    .update(principalTransfers)
    .set({ libraryClear })
    .where(scoped(principalTransfers, tenantId, eq(principalTransfers.transferId, id)));
  return { libraryClear: libraryClear === 1, openLoans };
}

export async function saveClearance(tenantId: number, id: number, input: ClearanceInput) {
  const row = await loadTransfer(tenantId, id);
  if (row.status === "Issued") throw new PrincipalError("NOT_READY");
  const libraryClear = input.libraryClear ? 1 : 0;
  const storeClear = input.storeClear ? 1 : 0;
  const financeClear = input.financeClear ? 1 : 0;
  const cleared = libraryClear === 1 && storeClear === 1 && financeClear === 1;
  await db
    .update(principalTransfers)
    .set({ libraryClear, storeClear, financeClear, status: cleared ? "Cleared" : "Open" })
    .where(scoped(principalTransfers, tenantId, eq(principalTransfers.transferId, id)));
}

export async function issueCertificate(tenantId: number, userId: number, id: number) {
  const row = await loadTransfer(tenantId, id);
  if (row.certificateNo) {
    return certificateOf(row, row.certificateNo);
  }
  if (row.libraryClear !== 1 || row.storeClear !== 1 || row.financeClear !== 1) {
    throw new PrincipalError("CLEARANCE_INCOMPLETE");
  }
  const number = `TC-${row.year}-${id}`;
  await db
    .update(principalTransfers)
    .set({ status: "Issued", certificateNo: number })
    .where(scoped(principalTransfers, tenantId, eq(principalTransfers.transferId, id)));
  await db
    .update(students)
    .set({ isTransfer: 1 })
    .where(scoped(students, tenantId, eq(students.studentId, row.studentId)));
  await writeAudit(tenantId, userId, "principal.transfer", number);
  return certificateOf(row, number);
}

function certificateOf(
  row: { name: string; gradeLevel: number; section: string | null; destination: string; reason: string; year: string },
  number: string,
) {
  return {
    number,
    studentName: row.name,
    gradeLevel: row.gradeLevel,
    section: row.section,
    destination: row.destination,
    reason: row.reason,
    academicYear: row.year,
    issuedOn: addisDate(),
  };
}

export async function listTraining(tenantId: number) {
  return db
    .select({
      id: principalTraining.sessionId,
      title: principalTraining.title,
      trainer: principalTraining.trainer,
      audience: principalTraining.audience,
      scheduledOn: principalTraining.scheduledOn,
      seats: principalTraining.seats,
      notes: principalTraining.notes,
    })
    .from(principalTraining)
    .where(scoped(principalTraining, tenantId))
    .orderBy(desc(principalTraining.sessionId));
}

export async function createTraining(tenantId: number, userId: number, input: TrainingInput) {
  const result = await db.insert(principalTraining).values(
    withTenant(
      {
        title: input.title,
        trainer: input.trainer,
        audience: input.audience,
        scheduledOn: input.scheduledOn,
        seats: input.seats,
        notes: input.notes || null,
        recordedBy: userId,
      },
      tenantId,
    ),
  );
  return { id: insertId(result) };
}

export async function listIncidents(tenantId: number) {
  return db
    .select({
      id: principalIncidents.incidentId,
      title: principalIncidents.title,
      details: principalIncidents.details,
      severity: principalIncidents.severity,
      status: principalIncidents.status,
      studentId: principalIncidents.studentId,
      createdAt: principalIncidents.createdAt,
    })
    .from(principalIncidents)
    .where(scoped(principalIncidents, tenantId))
    .orderBy(desc(principalIncidents.incidentId));
}

export async function createIncident(tenantId: number, userId: number, input: IncidentInput) {
  if (input.studentId != null) {
    const [student] = await db
      .select({ id: students.studentId })
      .from(students)
      .where(scoped(students, tenantId, eq(students.studentId, input.studentId)))
      .limit(1);
    if (!student) throw new PrincipalError("NOT_FOUND");
  }
  const result = await db.insert(principalIncidents).values(
    withTenant(
      {
        title: input.title,
        details: input.details,
        severity: input.severity,
        studentId: input.studentId ?? null,
        recordedBy: userId,
      },
      tenantId,
    ),
  );
  await writeAudit(tenantId, userId, "principal.incident", input.title);
  return { id: insertId(result) };
}

export async function updateIncident(tenantId: number, id: number, status: "Open" | "Investigating" | "Resolved") {
  const updated = await db
    .update(principalIncidents)
    .set({ status })
    .where(scoped(principalIncidents, tenantId, eq(principalIncidents.incidentId, id)));
  if (Number(updated[0].affectedRows) === 0) throw new PrincipalError("NOT_FOUND");
}

export async function listReportDefs(tenantId: number) {
  const rows = await db
    .select({
      id: principalReportDefs.reportId,
      name: principalReportDefs.name,
      columnsJson: principalReportDefs.columnsJson,
    })
    .from(principalReportDefs)
    .where(scoped(principalReportDefs, tenantId))
    .orderBy(desc(principalReportDefs.reportId));
  return rows.map((row) => ({ id: row.id, name: row.name, columns: parseColumns(row.columnsJson) }));
}

function parseColumns(value: string): ReportColumn[] {
  try {
    const parsed: unknown = JSON.parse(value);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (item): item is ReportColumn => typeof item === "string" && (REPORT_COLUMNS as readonly string[]).includes(item),
    );
  } catch {
    return [];
  }
}

export async function createReportDef(tenantId: number, userId: number, input: ReportDefInput) {
  const result = await db.insert(principalReportDefs).values(
    withTenant(
      {
        name: input.name,
        columnsJson: JSON.stringify(input.columns),
        recordedBy: userId,
      },
      tenantId,
    ),
  );
  return { id: insertId(result) };
}

export async function deleteReportDef(tenantId: number, id: number) {
  const removed = await db
    .delete(principalReportDefs)
    .where(scoped(principalReportDefs, tenantId, eq(principalReportDefs.reportId, id)));
  if (Number(removed[0].affectedRows) === 0) throw new PrincipalError("NOT_FOUND");
}

export async function runReportDef(tenantId: number, id: number) {
  const [row] = await db
    .select({ columnsJson: principalReportDefs.columnsJson })
    .from(principalReportDefs)
    .where(scoped(principalReportDefs, tenantId, eq(principalReportDefs.reportId, id)))
    .limit(1);
  if (!row) throw new PrincipalError("NOT_FOUND");
  const columns = parseColumns(row.columnsJson);
  const picture = await buildPicture(tenantId);
  return { columns, rows: projectReport(picture.reportRows, columns), limited: picture.reportRows.length > 1000 };
}

export type { Picture };

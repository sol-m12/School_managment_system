import { and, desc, eq } from "drizzle-orm";
import { db } from "../../db/index.js";
import {
  attendance,
  auditLog,
  classSchedule,
  expenses,
  grades,
  income,
  schoolSettings,
  staff,
  studentFinalReports,
  students,
  subjects,
  teacherAssignments,
  users,
} from "../../db/schema/index.js";
import { scoped } from "../../lib/tenant.js";
import { REPORT_COLUMNS, type ReportColumn } from "./principal.schema.js";

const PASS_MARK = 50;

export type YearPoint = {
  year: string;
  students: number;
  male: number;
  female: number;
  femaleShare: number | null;
  graded: number;
  passRate: number | null;
  presentRate: number | null;
  p25: number | null;
  p50: number | null;
  p75: number | null;
  registration: { type: string; count: number }[];
};

export type GradePoint = {
  gradeLevel: number;
  students: number;
  graded: number;
  passRate: number | null;
};

export type Insight = {
  code: "passDrop" | "gradeBehind" | "absenceHigh" | "submissionLow" | "genderGap" | "atRiskCount";
  value: number;
  grade?: number;
};

type StudentFact = {
  id: number;
  name: string;
  gender: "M" | "F";
  gradeLevel: number;
  section: string | null;
  year: string;
  registrationType: string | null;
  userId: number | null;
};

export type Picture = {
  passMark: number;
  latestYear: string | null;
  years: YearPoint[];
  grades: GradePoint[];
  schoolPassRate: number | null;
  presentRate: number | null;
  incomeTotal: number;
  expenseTotal: number;
  approvedStaff: number;
  staffTotal: number;
  teacherCount: number;
  submissionRate: number | null;
  forecast: { nextYear: string | null; passRate: number | null; enough: boolean };
  benchmarks: { gradeLevel: number; passRate: number | null; gap: number | null }[];
  staffKpis: {
    id: number;
    name: string;
    periods: number;
    attendanceMarks: number;
    submitted: number;
    drafts: number;
    submissionRate: number | null;
  }[];
  correlation: {
    id: number;
    teacher: string;
    subject: string;
    gradeLevel: number;
    section: string | null;
    year: string;
    students: number;
    average: number | null;
  }[];
  atRisk: {
    id: number;
    name: string;
    gradeLevel: number;
    section: string | null;
    average: number | null;
    absenceRate: number | null;
    score: number;
    band: "high" | "medium" | "low";
  }[];
  insights: Insight[];
  audit: { id: number; userId: number; username: string | null; actionType: string; description: string | null; timestamp: string }[];
  reportRows: Record<ReportColumn, string | number | null>[];
};

function num(value: string | number | null | undefined): number {
  if (value == null || value === "") return 0;
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

function rate(part: number, whole: number): number | null {
  if (whole <= 0) return null;
  return round1((part / whole) * 100);
}

function percentile(sorted: number[], p: number): number | null {
  if (sorted.length === 0) return null;
  const index = (sorted.length - 1) * p;
  const low = Math.floor(index);
  const high = Math.ceil(index);
  const left = sorted[low] ?? 0;
  const right = sorted[high] ?? left;
  if (low === high) return round1(left);
  return round1(left * (high - index) + right * (index - low));
}

function yearRank(year: string): number {
  const parsed = Number(year);
  return Number.isFinite(parsed) ? parsed : 0;
}

export async function buildPicture(tenantId: number): Promise<Picture> {
  const [studentRows, gradeRows, finalRows, attendanceRows, staffRows, assignmentRows, subjectRows, scheduleRows, auditRows, incomeRows, expenseRows] =
    await Promise.all([
      db
        .select({
          id: students.studentId,
          name: students.fullName,
          gender: students.gender,
          gradeLevel: students.gradeLevel,
          section: students.section,
          year: students.academicYear,
          registrationType: students.registrationType,
          userId: students.userId,
        })
        .from(students)
        .where(scoped(students, tenantId)),
      db
        .select({
          studentId: grades.studentId,
          subjectId: grades.subjectId,
          year: grades.academicYear,
          score: grades.score,
          isSubmitted: grades.isSubmitted,
          recordedBy: grades.recordedBy,
        })
        .from(grades)
        .where(scoped(grades, tenantId)),
      db
        .select({
          studentId: studentFinalReports.studentId,
          year: studentFinalReports.academicYear,
          avg: studentFinalReports.yearlyAvg,
        })
        .from(studentFinalReports)
        .where(scoped(studentFinalReports, tenantId)),
      db
        .select({
          studentId: attendance.studentId,
          status: attendance.status,
          recordedBy: attendance.recordedBy,
        })
        .from(attendance)
        .where(scoped(attendance, tenantId)),
      db
        .select({
          id: staff.staffId,
          firstName: staff.firstName,
          lastName: staff.lastName,
          role: staff.role,
          userId: staff.userId,
          isApproved: staff.isApproved,
        })
        .from(staff)
        .where(scoped(staff, tenantId)),
      db
        .select({
          id: teacherAssignments.assignmentId,
          staffId: teacherAssignments.staffId,
          subjectId: teacherAssignments.subjectId,
          gradeLevel: teacherAssignments.gradeLevel,
          section: teacherAssignments.section,
          year: teacherAssignments.academicYear,
        })
        .from(teacherAssignments)
        .where(scoped(teacherAssignments, tenantId)),
      db
        .select({ id: subjects.subjectId, name: subjects.subjectName })
        .from(subjects)
        .where(scoped(subjects, tenantId)),
      db
        .select({ teacherStaffId: classSchedule.teacherStaffId })
        .from(classSchedule)
        .where(scoped(classSchedule, tenantId)),
      db
        .select({
          id: auditLog.logId,
          userId: auditLog.userId,
          username: users.username,
          actionType: auditLog.actionType,
          description: auditLog.description,
          timestamp: auditLog.timestamp,
        })
        .from(auditLog)
        .leftJoin(users, and(eq(users.userId, auditLog.userId), eq(users.tenantId, tenantId)))
        .where(scoped(auditLog, tenantId))
        .orderBy(desc(auditLog.logId))
        .limit(40),
      db.select({ amount: income.amount }).from(income).where(scoped(income, tenantId)),
      db.select({ amount: expenses.amount }).from(expenses).where(scoped(expenses, tenantId)),
    ]);

  const people: StudentFact[] = studentRows.map((row) => ({
    id: row.id,
    name: row.name,
    gender: row.gender,
    gradeLevel: row.gradeLevel,
    section: row.section,
    year: row.year,
    registrationType: row.registrationType,
    userId: row.userId,
  }));

  const byYear = new Map<string, StudentFact[]>();
  for (const student of people) {
    const list = byYear.get(student.year) ?? [];
    list.push(student);
    byYear.set(student.year, list);
  }
  const orderedYears = [...byYear.keys()].sort((a, b) => yearRank(a) - yearRank(b) || a.localeCompare(b));
  const latestYear = orderedYears.length > 0 ? (orderedYears[orderedYears.length - 1] ?? null) : null;

  const subjectTotals = new Map<string, number>();
  for (const grade of gradeRows) {
    const key = `${grade.studentId}:${grade.subjectId}:${grade.year}`;
    subjectTotals.set(key, (subjectTotals.get(key) ?? 0) + num(grade.score));
  }
  const subjectLists = new Map<string, number[]>();
  for (const [key, total] of subjectTotals) {
    const parts = key.split(":");
    const studentKey = `${parts[0]}:${parts[2]}`;
    const list = subjectLists.get(studentKey) ?? [];
    list.push(total);
    subjectLists.set(studentKey, list);
  }
  const finalAverages = new Map<string, number>();
  for (const report of finalRows) {
    if (report.studentId == null || report.year == null) continue;
    const average = num(report.avg);
    if (average <= 0) continue;
    finalAverages.set(`${report.studentId}:${report.year}`, average);
  }

  function studentAverage(studentId: number, year: string): number | null {
    const published = finalAverages.get(`${studentId}:${year}`);
    if (published != null) return round1(published);
    const totals = subjectLists.get(`${studentId}:${year}`);
    if (!totals || totals.length === 0) return null;
    return round1(totals.reduce((sum, value) => sum + value, 0) / totals.length);
  }

  function subjectAverage(studentId: number, subjectId: number, year: string): number | null {
    const total = subjectTotals.get(`${studentId}:${subjectId}:${year}`);
    return total == null ? null : round1(total);
  }

  const attendanceByStudent = new Map<number, { total: number; present: number; absent: number }>();
  for (const row of attendanceRows) {
    const bag = attendanceByStudent.get(row.studentId) ?? { total: 0, present: 0, absent: 0 };
    bag.total += 1;
    if (row.status === "P") bag.present += 1;
    if (row.status === "A") bag.absent += 1;
    attendanceByStudent.set(row.studentId, bag);
  }

  const years: YearPoint[] = orderedYears.map((year) => {
    const group = byYear.get(year) ?? [];
    const averages: number[] = [];
    let passed = 0;
    let present = 0;
    let attendanceTotal = 0;
    const registration = new Map<string, number>();
    for (const student of group) {
      const average = studentAverage(student.id, year);
      if (average != null) {
        averages.push(average);
        if (average >= PASS_MARK) passed += 1;
      }
      const marks = attendanceByStudent.get(student.id);
      if (marks) {
        present += marks.present;
        attendanceTotal += marks.total;
      }
      const typeName = student.registrationType ?? "";
      registration.set(typeName, (registration.get(typeName) ?? 0) + 1);
    }
    const sorted = [...averages].sort((a, b) => a - b);
    const male = group.filter((student) => student.gender === "M").length;
    const female = group.length - male;
    return {
      year,
      students: group.length,
      male,
      female,
      femaleShare: rate(female, group.length),
      graded: averages.length,
      passRate: rate(passed, averages.length),
      presentRate: rate(present, attendanceTotal),
      p25: percentile(sorted, 0.25),
      p50: percentile(sorted, 0.5),
      p75: percentile(sorted, 0.75),
      registration: [...registration.entries()]
        .map(([type, count]) => ({ type, count }))
        .sort((a, b) => b.count - a.count),
    };
  });

  const latestStudents = latestYear ? (byYear.get(latestYear) ?? []) : [];
  const gradeBuckets = new Map<number, StudentFact[]>();
  for (const student of latestStudents) {
    const list = gradeBuckets.get(student.gradeLevel) ?? [];
    list.push(student);
    gradeBuckets.set(student.gradeLevel, list);
  }
  const gradesByLevel: GradePoint[] = [...gradeBuckets.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([gradeLevel, group]) => {
      let graded = 0;
      let passed = 0;
      for (const student of group) {
        const average = studentAverage(student.id, student.year);
        if (average == null) continue;
        graded += 1;
        if (average >= PASS_MARK) passed += 1;
      }
      return { gradeLevel, students: group.length, graded, passRate: rate(passed, graded) };
    });

  const latestPoint = years.length > 0 ? years[years.length - 1] : undefined;
  const schoolPassRate = latestPoint?.passRate ?? null;
  const benchmarks = gradesByLevel.map((grade) => ({
    gradeLevel: grade.gradeLevel,
    passRate: grade.passRate,
    gap: grade.passRate == null || schoolPassRate == null ? null : round1(grade.passRate - schoolPassRate),
  }));

  const previous = years.length >= 2 ? years[years.length - 2] : undefined;
  const lastPass = latestPoint?.passRate ?? null;
  const prevPass = previous?.passRate ?? null;
  const forecast = {
    nextYear: latestYear && Number.isFinite(Number(latestYear)) ? String(Number(latestYear) + 1) : latestYear,
    passRate:
      lastPass == null
        ? null
        : prevPass == null
          ? lastPass
          : round1(Math.max(0, Math.min(100, lastPass + (lastPass - prevPass)))),
    enough: lastPass != null && prevPass != null,
  };

  let approvedStaff = 0;
  let teacherCount = 0;
  for (const member of staffRows) {
    if (member.isApproved === 1) approvedStaff += 1;
    if (member.role === "Teacher") teacherCount += 1;
  }

  const periodsByStaff = new Map<number, number>();
  for (const row of scheduleRows) {
    if (row.teacherStaffId == null) continue;
    periodsByStaff.set(row.teacherStaffId, (periodsByStaff.get(row.teacherStaffId) ?? 0) + 1);
  }
  const attendanceByUser = new Map<number, number>();
  for (const row of attendanceRows) {
    attendanceByUser.set(row.recordedBy, (attendanceByUser.get(row.recordedBy) ?? 0) + 1);
  }
  const gradesByUser = new Map<number, { submitted: number; drafts: number }>();
  let submittedAll = 0;
  let gradeAll = 0;
  for (const grade of gradeRows) {
    gradeAll += 1;
    const submitted = grade.isSubmitted === 1;
    if (submitted) submittedAll += 1;
    if (grade.recordedBy == null) continue;
    const bag = gradesByUser.get(grade.recordedBy) ?? { submitted: 0, drafts: 0 };
    if (submitted) bag.submitted += 1;
    else bag.drafts += 1;
    gradesByUser.set(grade.recordedBy, bag);
  }

  const staffKpis = staffRows
    .filter((member) => member.role === "Teacher")
    .map((member) => {
      const marks = member.userId == null ? { submitted: 0, drafts: 0 } : (gradesByUser.get(member.userId) ?? { submitted: 0, drafts: 0 });
      const total = marks.submitted + marks.drafts;
      return {
        id: member.id,
        name: `${member.firstName} ${member.lastName}`.trim(),
        periods: periodsByStaff.get(member.id) ?? 0,
        attendanceMarks: member.userId == null ? 0 : (attendanceByUser.get(member.userId) ?? 0),
        submitted: marks.submitted,
        drafts: marks.drafts,
        submissionRate: rate(marks.submitted, total),
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name));

  const staffName = new Map(staffRows.map((member) => [member.id, `${member.firstName} ${member.lastName}`.trim()]));
  const subjectName = new Map(subjectRows.map((subject) => [subject.id, subject.name]));
  const correlation = assignmentRows
    .map((assignment) => {
      const matches = people.filter(
        (student) =>
          student.year === assignment.year &&
          student.gradeLevel === assignment.gradeLevel &&
          (assignment.section == null || assignment.section === "" || student.section === assignment.section),
      );
      const averages = matches
        .map((student) => subjectAverage(student.id, assignment.subjectId, assignment.year))
        .filter((value): value is number => value != null);
      const sum = averages.reduce((total, value) => total + value, 0);
      return {
        id: assignment.id,
        teacher: staffName.get(assignment.staffId) ?? "",
        subject: subjectName.get(assignment.subjectId) ?? "",
        gradeLevel: assignment.gradeLevel,
        section: assignment.section,
        year: assignment.year,
        students: averages.length,
        average: averages.length > 0 ? round1(sum / averages.length) : null,
      };
    })
    .sort((a, b) => a.teacher.localeCompare(b.teacher) || a.gradeLevel - b.gradeLevel);

  const atRisk = latestStudents
    .map((student) => {
      const average = studentAverage(student.id, student.year);
      const marks = attendanceByStudent.get(student.id);
      const absenceRate = marks && marks.total > 0 ? round1((marks.absent / marks.total) * 100) : null;
      if (average == null && absenceRate == null) return null;
      const markRisk = average == null ? 40 : Math.max(0, Math.min(100, 100 - average));
      const absenceRisk = absenceRate ?? 0;
      const score = round1(markRisk * 0.6 + absenceRisk * 0.4);
      const band: "high" | "medium" | "low" = score >= 60 ? "high" : score >= 35 ? "medium" : "low";
      return {
        id: student.id,
        name: student.name,
        gradeLevel: student.gradeLevel,
        section: student.section,
        average,
        absenceRate,
        score,
        band,
      };
    })
    .filter((row): row is NonNullable<typeof row> => row != null && row.band !== "low")
    .sort((a, b) => b.score - a.score);

  const insights: Insight[] = [];
  if (lastPass != null && prevPass != null && prevPass - lastPass >= 5) {
    insights.push({ code: "passDrop", value: round1(prevPass - lastPass) });
  }
  for (const grade of benchmarks) {
    if (grade.gap != null && grade.gap <= -10) {
      insights.push({ code: "gradeBehind", value: round1(Math.abs(grade.gap)), grade: grade.gradeLevel });
    }
  }
  const latestAbsence = latestStudents.reduce(
    (bag, student) => {
      const marks = attendanceByStudent.get(student.id);
      if (!marks) return bag;
      return { absent: bag.absent + marks.absent, total: bag.total + marks.total };
    },
    { absent: 0, total: 0 },
  );
  const absenceShare = rate(latestAbsence.absent, latestAbsence.total);
  if (absenceShare != null && absenceShare >= 15) insights.push({ code: "absenceHigh", value: absenceShare });
  const submissionRate = rate(submittedAll, gradeAll);
  if (submissionRate != null && submissionRate < 70) insights.push({ code: "submissionLow", value: submissionRate });
  if (latestPoint?.femaleShare != null && (latestPoint.femaleShare < 40 || latestPoint.femaleShare > 60)) {
    insights.push({ code: "genderGap", value: latestPoint.femaleShare });
  }
  const highCount = atRisk.filter((row) => row.band === "high").length;
  if (highCount > 0) insights.push({ code: "atRiskCount", value: highCount });

  const reportRows = people.map((student) => {
    const average = studentAverage(student.id, student.year);
    const marks = attendanceByStudent.get(student.id);
    const absenceRate = marks && marks.total > 0 ? round1((marks.absent / marks.total) * 100) : null;
    const row: Record<ReportColumn, string | number | null> = {
      name: student.name,
      gender: student.gender,
      gradeLevel: student.gradeLevel,
      section: student.section,
      year: student.year,
      registrationType: student.registrationType,
      average,
      absenceRate,
    };
    return row;
  });

  return {
    passMark: PASS_MARK,
    latestYear,
    years,
    grades: gradesByLevel,
    schoolPassRate,
    presentRate: latestPoint?.presentRate ?? null,
    incomeTotal: round1(incomeRows.reduce((sum, row) => sum + num(row.amount), 0)),
    expenseTotal: round1(expenseRows.reduce((sum, row) => sum + num(row.amount), 0)),
    approvedStaff,
    staffTotal: staffRows.length,
    teacherCount,
    submissionRate,
    forecast,
    benchmarks,
    staffKpis,
    correlation,
    atRisk,
    insights,
    audit: auditRows.map((row) => ({
      id: row.id,
      userId: row.userId,
      username: row.username,
      actionType: row.actionType,
      description: row.description,
      timestamp: row.timestamp,
    })),
    reportRows,
  };
}

export function projectReport(rows: Picture["reportRows"], columns: ReportColumn[]) {
  const allowed = new Set<string>(REPORT_COLUMNS);
  const picked = columns.filter((column) => allowed.has(column));
  return rows.slice(0, 1000).map((row) => {
    const projected: Record<string, string | number | null> = {};
    for (const column of picked) projected[column] = row[column];
    return projected;
  });
}

export async function schoolName(tenantId: number): Promise<string> {
  const [row] = await db
    .select({ name: schoolSettings.schoolName })
    .from(schoolSettings)
    .where(scoped(schoolSettings, tenantId))
    .limit(1);
  return row?.name ?? "";
}

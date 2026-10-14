import { and, asc, eq, inArray, isNull, like, or } from "drizzle-orm";
import { db } from "../../db/index.js";
import {
  annualLessonPlan,
  attendance,
  classes,
  examQuestions,
  examResultsOnline,
  grades,
  onlineExams,
  parentGuardian,
  simulations,
  students,
  subjectWeightings,
  subjects,
  teacherAssignments,
} from "../../db/schema/index.js";
import { scoped, withTenant } from "../../lib/tenant.js";
import { AcademicsError, createStudent } from "../academics/students.service.js";
import type { StudentBody } from "../academics/academics.schema.js";
import { parseClassSelect, TeacherError, loadTeacherContext, type TeacherContext } from "./teacher.service.js";

type Mark = "X" | "A" | "P" | "L";
type DbStatus = "P" | "A" | "T";

function today(): string {
  const now = new Date();
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

function toStatus(mark: Mark): DbStatus {
  if (mark === "A" || mark === "P") return "A";
  if (mark === "L") return "T";
  return "P";
}

function fromStatus(status: DbStatus): Mark {
  if (status === "A") return "A";
  if (status === "T") return "L";
  return "X";
}

async function requireContext(tenantId: number, userId: number): Promise<TeacherContext> {
  const context = await loadTeacherContext(tenantId, userId);
  if (!context) throw new TeacherError("NOT_ASSIGNED");
  return context;
}

async function homeroomClasses(tenantId: number, staffId: number) {
  return db
    .select({
      id: classes.classId,
      gradeLevel: classes.gradeLevel,
      section: classes.section,
      stream: classes.stream,
    })
    .from(classes)
    .where(scoped(classes, tenantId, eq(classes.classTeacherId, staffId)))
    .orderBy(asc(classes.gradeLevel), asc(classes.section));
}

async function classStudents(
  tenantId: number,
  year: string,
  gradeLevel: number,
  section: string,
  stream: "Natural" | "Social" | null,
) {
  const filters = [
    eq(students.academicYear, year),
    eq(students.gradeLevel, gradeLevel),
    eq(students.section, section),
  ];
  if (stream) filters.push(eq(students.stream, stream));
  return db
    .select({
      id: students.studentId,
      fullName: students.fullName,
      gender: students.gender,
      age: students.age,
      kebele: students.kebele,
      gote: students.gote,
      houseNumber: students.houseNumber,
    })
    .from(students)
    .where(scoped(students, tenantId, and(...filters)))
    .orderBy(asc(students.fullName));
}

async function marksFor(
  tenantId: number,
  studentIds: number[],
  date: string,
  subjectId: number | null,
) {
  if (studentIds.length === 0) return new Map<number, Mark>();
  const subjectClause = subjectId === null ? isNull(attendance.subjectId) : eq(attendance.subjectId, subjectId);
  const rows = await db
    .select({ studentId: attendance.studentId, status: attendance.status })
    .from(attendance)
    .where(
      scoped(
        attendance,
        tenantId,
        and(inArray(attendance.studentId, studentIds), eq(attendance.date, date), subjectClause),
      ),
    );
  return new Map(rows.map((row) => [row.studentId, fromStatus(row.status)]));
}

export async function homeroomAttendance(tenantId: number, userId: number, date: string | undefined, classId: number | undefined) {
  const context = await loadTeacherContext(tenantId, userId);
  const day = date ?? today();
  if (!context) return { academicYear: "", date: day, classes: [], classId: null, students: [] };
  const rooms = await homeroomClasses(tenantId, context.staffId);
  const selected = rooms.find((room) => room.id === classId) ?? rooms[0] ?? null;
  if (!selected) {
    return { academicYear: context.academicYear, date: day, classes: [], classId: null, students: [] };
  }
  const people = await classStudents(tenantId, context.academicYear, selected.gradeLevel, selected.section, selected.stream);
  const marks = await marksFor(tenantId, people.map((person) => person.id), day, null);
  return {
    academicYear: context.academicYear,
    date: day,
    classes: rooms.map((room) => ({
      id: room.id,
      gradeLevel: room.gradeLevel,
      section: room.section,
      label: `${room.gradeLevel}${room.section}`,
    })),
    classId: selected.id,
    gradeLevel: selected.gradeLevel,
    section: selected.section,
    students: people.map((person) => ({ ...person, mark: marks.get(person.id) ?? "" })),
  };
}

async function saveMarks(
  tenantId: number,
  staffId: number,
  date: string,
  subjectId: number | null,
  allowedIds: Set<number>,
  marks: { studentId: number; mark: Mark }[],
) {
  if (marks.some((mark) => !allowedIds.has(mark.studentId))) throw new TeacherError("NOT_ASSIGNED");
  await db.transaction(async (tx) => {
    for (const mark of marks) {
      const subjectClause = subjectId === null ? isNull(attendance.subjectId) : eq(attendance.subjectId, subjectId);
      const where = scoped(
        attendance,
        tenantId,
        and(eq(attendance.studentId, mark.studentId), eq(attendance.date, date), subjectClause),
      );
      const [existing] = await tx
        .select({ id: attendance.attId, approval: attendance.approvalStatus })
        .from(attendance)
        .where(where)
        .limit(1);
      if (existing?.approval === "Approved") throw new TeacherError("ATTENDANCE_LOCKED");
      const status = toStatus(mark.mark);
      if (existing) {
        await tx
          .update(attendance)
          .set({ status, approvalStatus: "Pending", recordedBy: staffId })
          .where(scoped(attendance, tenantId, eq(attendance.attId, existing.id)));
      } else {
        await tx.insert(attendance).values(
          withTenant(
            {
              studentId: mark.studentId,
              date,
              status,
              approvalStatus: "Pending" as const,
              recordedBy: staffId,
              subjectId,
            },
            tenantId,
          ),
        );
      }
    }
  });
}

export async function saveHomeroomAttendance(
  tenantId: number,
  userId: number,
  input: { classId: number; date: string; marks: { studentId: number; mark: Mark }[] },
) {
  const context = await requireContext(tenantId, userId);
  const rooms = await homeroomClasses(tenantId, context.staffId);
  const room = rooms.find((item) => item.id === input.classId);
  if (!room) throw new TeacherError("NOT_ASSIGNED");
  const people = await classStudents(tenantId, context.academicYear, room.gradeLevel, room.section, room.stream);
  await saveMarks(tenantId, context.staffId, input.date, null, new Set(people.map((person) => person.id)), input.marks);
  return { saved: input.marks.length };
}

async function taughtRows(tenantId: number, staffId: number, year: string) {
  return db
    .select({
      gradeLevel: teacherAssignments.gradeLevel,
      section: teacherAssignments.section,
      subjectId: subjects.subjectId,
      subjectName: subjects.subjectName,
      isVocational: subjects.isVocational,
    })
    .from(teacherAssignments)
    .innerJoin(subjects, and(eq(subjects.subjectId, teacherAssignments.subjectId), eq(subjects.tenantId, tenantId)))
    .where(
      scoped(teacherAssignments, tenantId, and(eq(teacherAssignments.staffId, staffId), eq(teacherAssignments.academicYear, year))),
    )
    .orderBy(asc(teacherAssignments.gradeLevel), asc(subjects.subjectName));
}

function classValue(gradeLevel: number, section: string | null): { value: string; section: string } {
  const name = section?.trim() ? section.trim() : "Vocational";
  return { value: `${gradeLevel}-${name}`, section: name };
}

export async function subjectAttendance(
  tenantId: number,
  userId: number,
  query: { date?: string; classSelect?: string; subjectId?: number },
) {
  const context = await loadTeacherContext(tenantId, userId);
  const day = query.date ?? today();
  if (!context) {
    return { academicYear: "", semester: "1", date: day, classes: [], subjects: [], students: [] };
  }
  const rows = await taughtRows(tenantId, context.staffId, context.academicYear);
  const classesSeen = new Map<string, { value: string; label: string }>();
  const subjectsSeen = new Map<number, { id: number; name: string }>();
  for (const row of rows) {
    const parsed = classValue(row.gradeLevel, row.section);
    if (!classesSeen.has(parsed.value)) {
      classesSeen.set(parsed.value, { value: parsed.value, label: `Grade ${row.gradeLevel} - ${parsed.section}` });
    }
    if (!subjectsSeen.has(row.subjectId)) subjectsSeen.set(row.subjectId, { id: row.subjectId, name: row.subjectName });
  }
  const selectedClass = query.classSelect && classesSeen.has(query.classSelect) ? query.classSelect : "";
  const selectedSubject = query.subjectId && subjectsSeen.has(query.subjectId) ? query.subjectId : 0;
  let studentsOut: { id: number; fullName: string; gender: "M" | "F"; mark: Mark | "" }[] = [];
  if (selectedClass && selectedSubject) {
    const parsed = parseClassSelect(selectedClass);
    if (parsed) {
      const people = await studentsOfAssignment(tenantId, context.academicYear, parsed.gradeLevel, parsed.section, selectedSubject);
      const marks = await marksFor(tenantId, people.map((person) => person.id), day, selectedSubject);
      studentsOut = people.map((person) => ({
        id: person.id,
        fullName: person.fullName,
        gender: person.gender,
        mark: marks.get(person.id) ?? "",
      }));
    }
  }
  return {
    academicYear: context.academicYear,
    semester: context.semester,
    date: day,
    classes: [...classesSeen.values()],
    subjects: [...subjectsSeen.values()],
    classSelect: selectedClass,
    subjectId: selectedSubject || null,
    students: studentsOut,
  };
}

async function studentsOfAssignment(
  tenantId: number,
  year: string,
  gradeLevel: number,
  section: string,
  subjectId: number,
) {
  if (section === "Vocational") {
    return db
      .select({ id: students.studentId, fullName: students.fullName, gender: students.gender })
      .from(students)
      .where(
        scoped(
          students,
          tenantId,
          and(eq(students.academicYear, year), eq(students.gradeLevel, gradeLevel), eq(students.vocationalId, subjectId)),
        ),
      )
      .orderBy(asc(students.fullName));
  }
  return db
    .select({ id: students.studentId, fullName: students.fullName, gender: students.gender })
    .from(students)
    .where(
      scoped(
        students,
        tenantId,
        and(eq(students.academicYear, year), eq(students.gradeLevel, gradeLevel), eq(students.section, section)),
      ),
    )
    .orderBy(asc(students.fullName));
}

async function assertTeaches(
  tenantId: number,
  staffId: number,
  year: string,
  gradeLevel: number,
  section: string,
  subjectId: number,
) {
  const sectionClause =
    section === "Vocational"
      ? or(isNull(teacherAssignments.section), eq(teacherAssignments.section, ""), eq(teacherAssignments.section, "Vocational"))
      : eq(teacherAssignments.section, section);
  const [row] = await db
    .select({ id: teacherAssignments.assignmentId })
    .from(teacherAssignments)
    .where(
      scoped(
        teacherAssignments,
        tenantId,
        and(
          eq(teacherAssignments.staffId, staffId),
          eq(teacherAssignments.academicYear, year),
          eq(teacherAssignments.gradeLevel, gradeLevel),
          eq(teacherAssignments.subjectId, subjectId),
          sectionClause,
        ),
      ),
    )
    .limit(1);
  if (!row) throw new TeacherError("NOT_ASSIGNED");
}

export async function saveSubjectAttendance(
  tenantId: number,
  userId: number,
  input: { classSelect: string; subjectId: number; date: string; marks: { studentId: number; mark: Mark }[] },
) {
  const context = await requireContext(tenantId, userId);
  const parsed = parseClassSelect(input.classSelect);
  if (!parsed) throw new TeacherError("NOT_ASSIGNED");
  await assertTeaches(tenantId, context.staffId, context.academicYear, parsed.gradeLevel, parsed.section, input.subjectId);
  const people = await studentsOfAssignment(tenantId, context.academicYear, parsed.gradeLevel, parsed.section, input.subjectId);
  await saveMarks(
    tenantId,
    context.staffId,
    input.date,
    input.subjectId,
    new Set(people.map((person) => person.id)),
    input.marks,
  );
  return { saved: input.marks.length };
}

export async function examOptions(tenantId: number, userId: number, grade: number | undefined) {
  const context = await loadTeacherContext(tenantId, userId);
  if (!context) return { academicYear: "", semester: "1", grades: [], subjects: [], sections: [] };
  const rows = await taughtRows(tenantId, context.staffId, context.academicYear);
  const grades = [...new Set(rows.map((row) => row.gradeLevel))].sort((a, b) => a - b);
  const picked = grade ?? grades[0];
  const mine = rows.filter((row) => row.gradeLevel === picked);
  const subjectsSeen = new Map<number, { id: number; name: string }>();
  const sections = new Set<string>();
  for (const row of mine) {
    if (!subjectsSeen.has(row.subjectId)) subjectsSeen.set(row.subjectId, { id: row.subjectId, name: row.subjectName });
    sections.add(classValue(row.gradeLevel, row.section).section);
  }
  return {
    academicYear: context.academicYear,
    semester: context.semester,
    grades,
    grade: picked ?? null,
    subjects: [...subjectsSeen.values()],
    sections: [...sections],
  };
}

export async function listExams(tenantId: number, userId: number) {
  const context = await loadTeacherContext(tenantId, userId);
  if (!context) return { exams: [] };
  const rows = await db
    .select({
      id: onlineExams.examId,
      title: onlineExams.examTitle,
      status: onlineExams.status,
      durationMinutes: onlineExams.durationMinutes,
      subjectName: subjects.subjectName,
      gradeLevel: classes.gradeLevel,
      section: classes.section,
      isVocational: subjects.isVocational,
    })
    .from(onlineExams)
    .innerJoin(subjects, and(eq(subjects.subjectId, onlineExams.subjectId), eq(subjects.tenantId, tenantId)))
    .leftJoin(classes, and(eq(classes.classId, onlineExams.classId), eq(classes.tenantId, tenantId)))
    .where(scoped(onlineExams, tenantId, eq(onlineExams.teacherId, context.staffId)))
    .orderBy(asc(onlineExams.examTitle));
  const counts = await db
    .select({ examId: examResultsOnline.examId })
    .from(examResultsOnline)
    .where(
      scoped(
        examResultsOnline,
        tenantId,
        rows.length === 0 ? eq(examResultsOnline.examId, 0) : inArray(examResultsOnline.examId, rows.map((row) => row.id)),
      ),
    );
  const tally = new Map<number, number>();
  for (const row of counts) tally.set(row.examId, (tally.get(row.examId) ?? 0) + 1);
  return {
    exams: rows.map((row) => ({
      id: row.id,
      title: row.title,
      status: row.status ?? "Draft",
      durationMinutes: row.durationMinutes,
      subjectName: row.subjectName,
      gradeLevel: row.gradeLevel,
      section: row.section,
      vocational: row.isVocational === 1 || row.section == null,
      studentCount: tally.get(row.id) ?? 0,
    })),
  };
}

export async function createExam(
  tenantId: number,
  userId: number,
  input: {
    examTitle: string;
    gradeLevel: number;
    subjectId: number;
    section: string;
    examPassword: string;
    durationMinutes: number;
    isOfficial?: boolean;
    weightingPercent?: number;
  },
) {
  const context = await requireContext(tenantId, userId);
  await assertTeaches(tenantId, context.staffId, context.academicYear, input.gradeLevel, input.section, input.subjectId);
  const [klass] = await db
    .select({ id: classes.classId })
    .from(classes)
    .where(
      scoped(classes, tenantId, and(eq(classes.gradeLevel, input.gradeLevel), eq(classes.section, input.section))),
    )
    .limit(1);
  if (input.isOfficial && input.weightingPercent !== undefined) {
    const weights = await db
      .select({ percentage: subjectWeightings.percentage })
      .from(subjectWeightings)
      .where(
        scoped(
          subjectWeightings,
          tenantId,
          and(
            eq(subjectWeightings.subjectId, input.subjectId),
            eq(subjectWeightings.gradeLevel, String(input.gradeLevel)),
            eq(subjectWeightings.section, input.section),
            eq(subjectWeightings.academicYear, context.academicYear),
            eq(subjectWeightings.semester, context.semester),
          ),
        ),
      );
    const used = weights.reduce((sum, row) => sum + Number(row.percentage), 0);
    if (used + input.weightingPercent > 100) throw new TeacherError("EXAM_WEIGHT");
  }
  const examId = await db.transaction(async (tx) => {
    const inserted = await tx.insert(onlineExams).values(
      withTenant(
        {
          examTitle: input.examTitle,
          subjectId: input.subjectId,
          classId: klass?.id ?? null,
          teacherId: context.staffId,
          isOfficial: input.isOfficial ? 1 : 0,
          durationMinutes: input.durationMinutes,
          totalMarks: "0.00",
          status: "Draft" as const,
          academicYear: context.academicYear,
          semester: context.semester,
          examPassword: input.examPassword,
        },
        tenantId,
      ),
    );
    const id = Number(inserted[0].insertId);
    if (input.isOfficial && input.weightingPercent !== undefined) {
      await tx.insert(subjectWeightings).values(
        withTenant(
          {
            subjectId: input.subjectId,
            gradeLevel: String(input.gradeLevel),
            section: input.section,
            weightingType: input.examTitle.slice(0, 50),
            percentage: input.weightingPercent.toFixed(2),
            academicYear: context.academicYear,
            semester: context.semester,
            staffId: context.staffId,
          },
          tenantId,
        ),
      );
    }
    return id;
  });
  return { id: examId };
}

async function ownExam(tenantId: number, staffId: number, examId: number) {
  const [row] = await db
    .select({
      id: onlineExams.examId,
      title: onlineExams.examTitle,
      password: onlineExams.examPassword,
      subjectId: onlineExams.subjectId,
    })
    .from(onlineExams)
    .where(scoped(onlineExams, tenantId, and(eq(onlineExams.examId, examId), eq(onlineExams.teacherId, staffId))))
    .limit(1);
  if (!row) throw new TeacherError("EXAM_NOT_FOUND");
  return row;
}

export async function setExamStatus(
  tenantId: number,
  userId: number,
  examId: number,
  status: "Draft" | "Published" | "Closed",
) {
  const context = await requireContext(tenantId, userId);
  await ownExam(tenantId, context.staffId, examId);
  await db
    .update(onlineExams)
    .set({ status })
    .where(scoped(onlineExams, tenantId, eq(onlineExams.examId, examId)));
  return { status };
}

export async function removeExam(tenantId: number, userId: number, examId: number) {
  const context = await requireContext(tenantId, userId);
  await ownExam(tenantId, context.staffId, examId);
  await db.delete(examQuestions).where(scoped(examQuestions, tenantId, eq(examQuestions.examId, examId)));
  await db.delete(examResultsOnline).where(scoped(examResultsOnline, tenantId, eq(examResultsOnline.examId, examId)));
  await db.delete(onlineExams).where(scoped(onlineExams, tenantId, eq(onlineExams.examId, examId)));
  return { deleted: true };
}

export async function openExam(tenantId: number, userId: number, examId: number, password: string) {
  const context = await requireContext(tenantId, userId);
  const exam = await ownExam(tenantId, context.staffId, examId);
  if ((exam.password ?? "") !== password) throw new TeacherError("EXAM_PASSWORD");
  const questions = await db
    .select({
      id: examQuestions.questionId,
      questionText: examQuestions.questionText,
      optionA: examQuestions.optionA,
      optionB: examQuestions.optionB,
      optionC: examQuestions.optionC,
      optionD: examQuestions.optionD,
      correctOption: examQuestions.correctOption,
      points: examQuestions.points,
    })
    .from(examQuestions)
    .where(scoped(examQuestions, tenantId, eq(examQuestions.examId, examId)))
    .orderBy(asc(examQuestions.questionId));
  return {
    id: exam.id,
    title: exam.title,
    questions: questions.map((row) => ({ ...row, points: Number(row.points ?? 1) })),
  };
}

async function refreshTotal(tenantId: number, examId: number) {
  const rows = await db
    .select({ points: examQuestions.points })
    .from(examQuestions)
    .where(scoped(examQuestions, tenantId, eq(examQuestions.examId, examId)));
  const total = rows.reduce((sum, row) => sum + Number(row.points ?? 0), 0);
  await db
    .update(onlineExams)
    .set({ totalMarks: total.toFixed(2) })
    .where(scoped(onlineExams, tenantId, eq(onlineExams.examId, examId)));
}

export async function addQuestion(
  tenantId: number,
  userId: number,
  examId: number,
  input: {
    questionText: string;
    optionA: string;
    optionB: string;
    optionC: string;
    optionD: string;
    correctOption: "A" | "B" | "C" | "D";
    points: number;
  },
) {
  const context = await requireContext(tenantId, userId);
  await ownExam(tenantId, context.staffId, examId);
  await db.insert(examQuestions).values(
    withTenant(
      {
        examId,
        questionText: input.questionText,
        optionA: input.optionA,
        optionB: input.optionB,
        optionC: input.optionC,
        optionD: input.optionD,
        correctOption: input.correctOption,
        point: input.points.toFixed(2),
        points: input.points,
      },
      tenantId,
    ),
  );
  await refreshTotal(tenantId, examId);
  return { added: true };
}

export async function removeQuestion(tenantId: number, userId: number, examId: number, questionId: number) {
  const context = await requireContext(tenantId, userId);
  await ownExam(tenantId, context.staffId, examId);
  await db
    .delete(examQuestions)
    .where(scoped(examQuestions, tenantId, and(eq(examQuestions.questionId, questionId), eq(examQuestions.examId, examId))));
  await refreshTotal(tenantId, examId);
  return { deleted: true };
}

export async function examResultSheet(tenantId: number, userId: number, examId: number) {
  const context = await requireContext(tenantId, userId);
  const exam = await ownExam(tenantId, context.staffId, examId);
  const rows = await db
    .select({
      studentId: students.studentId,
      fullName: students.fullName,
      gradeLevel: students.gradeLevel,
      section: students.section,
      totalScore: examResultsOnline.totalScore,
      submittedAt: examResultsOnline.submittedAt,
    })
    .from(examResultsOnline)
    .innerJoin(students, and(eq(students.studentId, examResultsOnline.studentId), eq(students.tenantId, tenantId)))
    .where(scoped(examResultsOnline, tenantId, eq(examResultsOnline.examId, examId)))
    .orderBy(asc(students.fullName));
  return {
    title: exam.title,
    students: rows.map((row) => ({
      id: row.studentId,
      fullName: row.fullName,
      gradeLevel: row.gradeLevel,
      section: row.section ?? "",
      totalScore: Number(row.totalScore),
      submittedAt: row.submittedAt,
    })),
  };
}

export async function lessonBoard(tenantId: number, userId: number) {
  const context = await loadTeacherContext(tenantId, userId);
  if (!context) return { academicYear: "", subjects: [], plans: [] };
  const rows = await taughtRows(tenantId, context.staffId, context.academicYear);
  const subjectsSeen = new Map<number, { id: number; name: string; grades: number[] }>();
  for (const row of rows) {
    const current = subjectsSeen.get(row.subjectId) ?? { id: row.subjectId, name: row.subjectName, grades: [] };
    if (!current.grades.includes(row.gradeLevel)) current.grades.push(row.gradeLevel);
    subjectsSeen.set(row.subjectId, current);
  }
  const plans = await db
    .select({
      id: annualLessonPlan.planDetailId,
      subjectId: annualLessonPlan.subjectId,
      subjectName: subjects.subjectName,
      gradeLevel: annualLessonPlan.gradeLevel,
      weekNumber: annualLessonPlan.weekNumber,
      topicTitle: annualLessonPlan.topicTitle,
      learningObjectives: annualLessonPlan.learningObjectives,
      status: annualLessonPlan.status,
    })
    .from(annualLessonPlan)
    .innerJoin(subjects, and(eq(subjects.subjectId, annualLessonPlan.subjectId), eq(subjects.tenantId, tenantId)))
    .where(
      scoped(
        annualLessonPlan,
        tenantId,
        and(eq(annualLessonPlan.staffId, context.staffId), eq(annualLessonPlan.academicYear, context.academicYear)),
      ),
    )
    .orderBy(asc(annualLessonPlan.weekNumber));
  return { academicYear: context.academicYear, subjects: [...subjectsSeen.values()], plans };
}

export async function addLesson(
  tenantId: number,
  userId: number,
  input: { subjectId: number; gradeLevel: number; weekNumber: number; topicTitle: string; learningObjectives?: string },
) {
  const context = await requireContext(tenantId, userId);
  const rows = await taughtRows(tenantId, context.staffId, context.academicYear);
  if (!rows.some((row) => row.subjectId === input.subjectId && row.gradeLevel === input.gradeLevel)) {
    throw new TeacherError("NOT_ASSIGNED");
  }
  await db.insert(annualLessonPlan).values(
    withTenant(
      {
        staffId: context.staffId,
        subjectId: input.subjectId,
        gradeLevel: input.gradeLevel,
        academicYear: context.academicYear,
        weekNumber: input.weekNumber,
        topicTitle: input.topicTitle,
        learningObjectives: input.learningObjectives?.trim() ? input.learningObjectives.trim() : null,
        status: "Draft" as const,
      },
      tenantId,
    ),
  );
  return { added: true };
}

export async function removeLesson(tenantId: number, userId: number, planId: number) {
  const context = await requireContext(tenantId, userId);
  await db
    .delete(annualLessonPlan)
    .where(
      scoped(
        annualLessonPlan,
        tenantId,
        and(eq(annualLessonPlan.planDetailId, planId), eq(annualLessonPlan.staffId, context.staffId)),
      ),
    );
  return { deleted: true };
}

function parentNames(fullName: string): { firstName: string; lastName: string } {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  return {
    firstName: (parts[0] ?? fullName).slice(0, 100),
    lastName: (parts.slice(1).join(" ") || "-").slice(0, 100),
  };
}

async function savePhone(tenantId: number, studentId: number, fullName: string, phone: string | undefined) {
  const trimmed = phone?.trim() ?? "";
  if (!trimmed) return;
  const [student] = await db
    .select({ parentPgId: students.parentPgId })
    .from(students)
    .where(scoped(students, tenantId, eq(students.studentId, studentId)))
    .limit(1);
  if (!student) return;
  if (student.parentPgId) {
    await db
      .update(parentGuardian)
      .set({ phoneNumber: trimmed })
      .where(scoped(parentGuardian, tenantId, eq(parentGuardian.pgId, student.parentPgId)));
    return;
  }
  const names = parentNames(fullName);
  const inserted = await db.insert(parentGuardian).values(withTenant({ ...names, phoneNumber: trimmed }, tenantId));
  await db
    .update(students)
    .set({ parentPgId: Number(inserted[0].insertId) })
    .where(scoped(students, tenantId, eq(students.studentId, studentId)));
}

export async function registrationBoard(tenantId: number, userId: number, grade: number | undefined, q: string | undefined) {
  const context = await loadTeacherContext(tenantId, userId);
  const year = context?.academicYear ?? "";
  const selected = grade ?? 9;
  if (!context) return { academicYear: year, grade: selected, pending: [], matches: [] };
  const pending = await db
    .select({
      id: students.studentId,
      fullName: students.fullName,
      registrationType: students.registrationType,
      gradeLevel: students.gradeLevel,
      gender: students.gender,
    })
    .from(students)
    .where(
      scoped(
        students,
        tenantId,
        and(
          eq(students.registeredBy, userId),
          eq(students.isApproved, 0),
          eq(students.gradeLevel, selected),
          eq(students.academicYear, context.academicYear),
        ),
      ),
    )
    .orderBy(asc(students.fullName));
  const needle = (q ?? "").replace(/[\\%_]/g, "").trim();
  const matches =
    needle.length === 0
      ? []
      : await db
          .select({
            id: students.studentId,
            fullName: students.fullName,
            gender: students.gender,
            age: students.age,
            gradeLevel: students.gradeLevel,
            registrationType: students.registrationType,
            stream: students.stream,
            isTransfer: students.isTransfer,
            previousSchool: students.previousSchool,
            kebele: students.kebele,
            gote: students.gote,
            houseNumber: students.houseNumber,
            isApproved: students.isApproved,
            registeredBy: students.registeredBy,
          })
          .from(students)
          .where(scoped(students, tenantId, and(eq(students.academicYear, context.academicYear), like(students.fullName, `%${needle}%`))))
          .orderBy(asc(students.fullName))
          .limit(12);
  return {
    academicYear: context.academicYear,
    grade: selected,
    pending,
    matches: matches.map((row) => ({
      ...row,
      isTransfer: row.isTransfer === 1,
      isApproved: row.isApproved === 1,
      editable: row.registeredBy === userId && row.isApproved !== 1,
    })),
  };
}

export async function saveRegistration(
  tenantId: number,
  userId: number,
  input: StudentBody & { studentId?: number; phoneNumber?: string },
) {
  await requireContext(tenantId, userId);
  if (input.studentId) {
    const [existing] = await db
      .select({ registeredBy: students.registeredBy, isApproved: students.isApproved })
      .from(students)
      .where(scoped(students, tenantId, eq(students.studentId, input.studentId)))
      .limit(1);
    if (!existing || existing.registeredBy !== userId || existing.isApproved === 1) throw new TeacherError("NOT_ASSIGNED");
    await db
      .update(students)
      .set({
        fullName: input.fullName,
        gender: input.gender,
        age: input.age,
        gradeLevel: input.gradeLevel,
        registrationType: input.registrationType,
        stream: input.gradeLevel >= 11 && input.stream && input.stream !== "Common" ? input.stream : null,
        previousSchool: input.previousSchool?.trim() ? input.previousSchool.trim() : null,
        kebele: input.kebele?.trim() ? input.kebele.trim() : null,
        gote: input.gote?.trim() ? input.gote.trim() : null,
        houseNumber: input.houseNumber?.trim() ? input.houseNumber.trim() : null,
        isTransfer: input.isTransfer ? 1 : 0,
      })
      .where(scoped(students, tenantId, eq(students.studentId, input.studentId)));
    await savePhone(tenantId, input.studentId, input.fullName, input.phoneNumber);
    return { id: input.studentId };
  }
  try {
    const created = await createStudent(tenantId, userId, input);
    await savePhone(tenantId, created.id, input.fullName, input.phoneNumber);
    return { id: created.id };
  } catch (error) {
    if (error instanceof AcademicsError) throw error;
    throw error;
  }
}

export async function classRoster(tenantId: number, userId: number, classId: number | undefined) {
  const context = await loadTeacherContext(tenantId, userId);
  if (!context) return { allowed: false as const };
  const rooms = await homeroomClasses(tenantId, context.staffId);
  if (rooms.length === 0) return { allowed: false as const };
  const selected = rooms.find((room) => room.id === classId) ?? rooms[0];
  if (!selected) return { allowed: false as const };
  const people = await classStudents(tenantId, context.academicYear, selected.gradeLevel, selected.section, selected.stream);
  return {
    allowed: true as const,
    academicYear: context.academicYear,
    classes: rooms.map((room) => ({ id: room.id, label: `${room.gradeLevel}${room.section}` })),
    classId: selected.id,
    gradeLevel: selected.gradeLevel,
    section: selected.section,
    students: people,
  };
}

export async function reportCards(tenantId: number, userId: number, classId: number | undefined) {
  const roster = await classRoster(tenantId, userId, classId);
  if (!roster.allowed) return roster;
  const context = await requireContext(tenantId, userId);
  const ids = roster.students.map((student) => student.id);
  const markRows =
    ids.length === 0
      ? []
      : await db
          .select({
            studentId: grades.studentId,
            subjectName: subjects.subjectName,
            score: grades.score,
          })
          .from(grades)
          .innerJoin(subjects, and(eq(subjects.subjectId, grades.subjectId), eq(subjects.tenantId, tenantId)))
          .where(
            scoped(
              grades,
              tenantId,
              and(
                inArray(grades.studentId, ids),
                eq(grades.academicYear, context.academicYear),
                eq(grades.semester, context.semester),
              ),
            ),
          );
  const byStudent = new Map<number, Map<string, number>>();
  for (const row of markRows) {
    const subjectsOf = byStudent.get(row.studentId) ?? new Map<string, number>();
    subjectsOf.set(row.subjectName, (subjectsOf.get(row.subjectName) ?? 0) + Number(row.score));
    byStudent.set(row.studentId, subjectsOf);
  }
  const cards = roster.students.map((student) => {
    const subjectMarks = [...(byStudent.get(student.id) ?? new Map()).entries()].map(([name, score]) => ({
      name,
      score: Number(score.toFixed(2)),
    }));
    const average =
      subjectMarks.length === 0
        ? 0
        : Number((subjectMarks.reduce((sum, item) => sum + item.score, 0) / subjectMarks.length).toFixed(2));
    return { ...student, subjects: subjectMarks, average, rank: 0 };
  });
  const order = [...cards].sort((a, b) => b.average - a.average);
  let rank = 0;
  let last = Number.NaN;
  order.forEach((card, index) => {
    if (card.average !== last) {
      rank = index + 1;
      last = card.average;
    }
    card.rank = rank;
  });
  return { ...roster, semester: context.semester, cards };
}

export async function subjectReport(
  tenantId: number,
  userId: number,
  query: { classSelect?: string; subjectId?: number },
) {
  const board = await subjectAttendance(tenantId, userId, query);
  if (!board.classSelect || !board.subjectId) return { ...board, rows: [] };
  const context = await loadTeacherContext(tenantId, userId);
  if (!context) return { ...board, rows: [] };
  const ids = board.students.map((student) => student.id);
  const markRows =
    ids.length === 0
      ? []
      : await db
          .select({ studentId: grades.studentId, score: grades.score })
          .from(grades)
          .where(
            scoped(
              grades,
              tenantId,
              and(
                inArray(grades.studentId, ids),
                eq(grades.subjectId, board.subjectId),
                eq(grades.academicYear, context.academicYear),
                eq(grades.semester, context.semester),
              ),
            ),
          );
  const totals = new Map<number, number>();
  for (const row of markRows) totals.set(row.studentId, (totals.get(row.studentId) ?? 0) + Number(row.score));
  return {
    ...board,
    rows: board.students.map((student) => ({
      id: student.id,
      fullName: student.fullName,
      total: Number((totals.get(student.id) ?? 0).toFixed(2)),
    })),
  };
}

export async function simulationBoard(tenantId: number, userId: number) {
  const context = await loadTeacherContext(tenantId, userId);
  if (!context) return { items: [] };
  const rows = await db
    .select({
      id: simulations.id,
      gradeLevel: simulations.gradeLevel,
      section: simulations.section,
      subjectName: simulations.subjectName,
      simTitle: simulations.simTitle,
      simUrl: simulations.simUrl,
      createdAt: simulations.createdAt,
    })
    .from(simulations)
    .where(scoped(simulations, tenantId, eq(simulations.teacherId, context.staffId)))
    .orderBy(asc(simulations.simTitle));
  return { academicYear: context.academicYear, items: rows };
}

export async function addSimulation(
  tenantId: number,
  userId: number,
  input: { gradeLevel: number; section: string; subjectName: string; simTitle: string; simUrl?: string },
) {
  const context = await requireContext(tenantId, userId);
  const rows = await taughtRows(tenantId, context.staffId, context.academicYear);
  const owns = rows.some(
    (row) =>
      row.gradeLevel === input.gradeLevel &&
      classValue(row.gradeLevel, row.section).section === input.section &&
      row.subjectName === input.subjectName,
  );
  if (!owns) throw new TeacherError("NOT_ASSIGNED");
  await db.insert(simulations).values(
    withTenant(
      {
        teacherId: context.staffId,
        gradeLevel: input.gradeLevel,
        section: input.section,
        subjectName: input.subjectName,
        simTitle: input.simTitle,
        simUrl: input.simUrl?.trim() ? input.simUrl.trim() : null,
      },
      tenantId,
    ),
  );
  return { added: true };
}

export async function removeSimulation(tenantId: number, userId: number, id: number) {
  const context = await requireContext(tenantId, userId);
  await db
    .delete(simulations)
    .where(scoped(simulations, tenantId, and(eq(simulations.id, id), eq(simulations.teacherId, context.staffId))));
  return { deleted: true };
}

export async function storeBoard(tenantId: number, userId: number) {
  const context = await loadTeacherContext(tenantId, userId);
  return {
    teacherName: context?.teacherName ?? "",
    available: false,
    stats: { total: 0, pending: 0, approved: 0, holdings: 0 },
    items: [] as { id: number; label: string }[],
    requests: [] as { ref: string; name: string; quantity: string; requestedAt: string; status: string }[],
    holdings: [] as { code: string; name: string; kind: string; quantity: string; issuedAt: string; status: string }[],
  };
}

export async function submitStoreRequest(): Promise<never> {
  throw new TeacherError("STORE_UNAVAILABLE");
}

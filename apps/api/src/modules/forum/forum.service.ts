import { and, desc, eq, ne, sql } from "drizzle-orm";
import { db } from "../../db/index.js";
import {
  forumAnswers,
  forumProfanityWords,
  forumQuestions,
  forumVotes,
  students,
} from "../../db/schema/index.js";
import { ER_DUP_ENTRY, mysqlErrno } from "../../lib/mysqlError.js";
import { scoped, withTenant } from "../../lib/tenant.js";
import { loadTeacherContext } from "../teacher/teacher.service.js";
import type { AnswerBody, QuestionBody, WordBody } from "./forum.schema.js";

export type ForumErrorCode =
  | "NOT_FOUND"
  | "NOT_ASSIGNED"
  | "PROFANITY"
  | "ALREADY_VOTED"
  | "VALIDATION";

export class ForumError extends Error {
  constructor(readonly code: ForumErrorCode) {
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
  if (!row) throw new ForumError("NOT_ASSIGNED");
  return row.id;
}

async function assertClean(tenantId: number, text: string) {
  const words = await db
    .select({ word: forumProfanityWords.word })
    .from(forumProfanityWords)
    .where(scoped(forumProfanityWords, tenantId));
  const lower = text.toLowerCase();
  for (const row of words) {
    if (row.word && lower.includes(row.word.toLowerCase())) {
      throw new ForumError("PROFANITY");
    }
  }
}

export async function listQuestions(tenantId: number) {
  const rows = await db
    .select({
      id: forumQuestions.questionId,
      title: forumQuestions.title,
      body: forumQuestions.body,
      points: forumQuestions.points,
      studentId: forumQuestions.studentId,
      studentName: students.fullName,
      createdAt: forumQuestions.createdAt,
    })
    .from(forumQuestions)
    .innerJoin(
      students,
      and(eq(students.studentId, forumQuestions.studentId), eq(students.tenantId, tenantId)),
    )
    .where(scoped(forumQuestions, tenantId, eq(forumQuestions.status, "Open")))
    .orderBy(desc(forumQuestions.questionId));
  return { rows };
}

export async function getQuestion(tenantId: number, id: number) {
  const [question] = await db
    .select({
      id: forumQuestions.questionId,
      title: forumQuestions.title,
      body: forumQuestions.body,
      points: forumQuestions.points,
      studentId: forumQuestions.studentId,
      studentName: students.fullName,
      status: forumQuestions.status,
      createdAt: forumQuestions.createdAt,
    })
    .from(forumQuestions)
    .innerJoin(
      students,
      and(eq(students.studentId, forumQuestions.studentId), eq(students.tenantId, tenantId)),
    )
    .where(scoped(forumQuestions, tenantId, eq(forumQuestions.questionId, id)))
    .limit(1);
  if (!question || question.status === "Deleted") throw new ForumError("NOT_FOUND");

  const answers = await db
    .select({
      id: forumAnswers.answerId,
      body: forumAnswers.body,
      points: forumAnswers.points,
      isEndorsed: forumAnswers.isEndorsed,
      studentId: forumAnswers.studentId,
      studentName: students.fullName,
      status: forumAnswers.status,
      createdAt: forumAnswers.createdAt,
    })
    .from(forumAnswers)
    .innerJoin(
      students,
      and(eq(students.studentId, forumAnswers.studentId), eq(students.tenantId, tenantId)),
    )
    .where(
      scoped(
        forumAnswers,
        tenantId,
        and(eq(forumAnswers.questionId, id), ne(forumAnswers.status, "Deleted")),
      ),
    )
    .orderBy(desc(forumAnswers.isEndorsed), desc(forumAnswers.points), desc(forumAnswers.answerId));

  return {
    ...question,
    answers: answers.map((a) => ({
      ...a,
      isEndorsed: a.isEndorsed === 1,
    })),
  };
}

export async function postQuestion(tenantId: number, userId: number, input: QuestionBody) {
  await assertClean(tenantId, `${input.title} ${input.body}`);
  const studentId = await learnerStudentId(tenantId, userId);
  const id = insertId(
    await db.insert(forumQuestions).values(
      withTenant(
        {
          studentId,
          title: input.title,
          body: input.body,
          status: "Open" as const,
          points: 0,
        },
        tenantId,
      ),
    ),
  );
  return getQuestion(tenantId, id);
}

export async function postAnswer(
  tenantId: number,
  userId: number,
  questionId: number,
  input: AnswerBody,
) {
  await assertClean(tenantId, input.body);
  const studentId = await learnerStudentId(tenantId, userId);
  const [q] = await db
    .select({ id: forumQuestions.questionId, status: forumQuestions.status })
    .from(forumQuestions)
    .where(scoped(forumQuestions, tenantId, eq(forumQuestions.questionId, questionId)))
    .limit(1);
  if (!q || q.status !== "Open") throw new ForumError("NOT_FOUND");

  insertId(
    await db.insert(forumAnswers).values(
      withTenant(
        {
          questionId,
          studentId,
          body: input.body,
          status: "Open" as const,
          isEndorsed: 0,
          points: 0,
        },
        tenantId,
      ),
    ),
  );
  return getQuestion(tenantId, questionId);
}

export async function upvoteAnswer(tenantId: number, userId: number, answerId: number) {
  const studentId = await learnerStudentId(tenantId, userId);
  const [answer] = await db
    .select()
    .from(forumAnswers)
    .where(scoped(forumAnswers, tenantId, eq(forumAnswers.answerId, answerId)))
    .limit(1);
  if (!answer || answer.status !== "Open") throw new ForumError("NOT_FOUND");

  try {
    await db.insert(forumVotes).values(
      withTenant({ answerId, studentId }, tenantId),
    );
  } catch (error) {
    if (mysqlErrno(error) === ER_DUP_ENTRY) throw new ForumError("ALREADY_VOTED");
    throw error;
  }

  await db
    .update(forumAnswers)
    .set({ points: sql`${forumAnswers.points} + 1` })
    .where(scoped(forumAnswers, tenantId, eq(forumAnswers.answerId, answerId)));

  await db
    .update(forumQuestions)
    .set({ points: sql`${forumQuestions.points} + 1` })
    .where(scoped(forumQuestions, tenantId, eq(forumQuestions.questionId, answer.questionId)));

  return getQuestion(tenantId, answer.questionId);
}

export async function moderateDelete(
  tenantId: number,
  kind: "question" | "answer",
  id: number,
) {
  if (kind === "question") {
    const [row] = await db
      .select({ id: forumQuestions.questionId })
      .from(forumQuestions)
      .where(scoped(forumQuestions, tenantId, eq(forumQuestions.questionId, id)))
      .limit(1);
    if (!row) throw new ForumError("NOT_FOUND");
    await db
      .update(forumQuestions)
      .set({ status: "Deleted" })
      .where(scoped(forumQuestions, tenantId, eq(forumQuestions.questionId, id)));
    return { ok: true as const };
  }

  const [row] = await db
    .select({ id: forumAnswers.answerId })
    .from(forumAnswers)
    .where(scoped(forumAnswers, tenantId, eq(forumAnswers.answerId, id)))
    .limit(1);
  if (!row) throw new ForumError("NOT_FOUND");
  await db
    .update(forumAnswers)
    .set({ status: "Deleted" })
    .where(scoped(forumAnswers, tenantId, eq(forumAnswers.answerId, id)));
  return { ok: true as const };
}

export async function endorseAnswer(tenantId: number, userId: number, answerId: number) {
  const context = await loadTeacherContext(tenantId, userId);
  if (!context) throw new ForumError("NOT_ASSIGNED");
  const [answer] = await db
    .select()
    .from(forumAnswers)
    .where(scoped(forumAnswers, tenantId, eq(forumAnswers.answerId, answerId)))
    .limit(1);
  if (!answer || answer.status !== "Open") throw new ForumError("NOT_FOUND");

  await db
    .update(forumAnswers)
    .set({ isEndorsed: 1, endorsedByStaffId: context.staffId })
    .where(scoped(forumAnswers, tenantId, eq(forumAnswers.answerId, answerId)));

  return getQuestion(tenantId, answer.questionId);
}

export async function listProfanity(tenantId: number) {
  const rows = await db
    .select({ id: forumProfanityWords.wordId, word: forumProfanityWords.word })
    .from(forumProfanityWords)
    .where(scoped(forumProfanityWords, tenantId))
    .orderBy(forumProfanityWords.word);
  return { rows };
}

export async function addProfanity(tenantId: number, input: WordBody) {
  try {
    const id = insertId(
      await db.insert(forumProfanityWords).values(
        withTenant({ word: input.word.toLowerCase() }, tenantId),
      ),
    );
    return { id, word: input.word.toLowerCase() };
  } catch (error) {
    if (mysqlErrno(error) === ER_DUP_ENTRY) throw new ForumError("VALIDATION");
    throw error;
  }
}

export async function removeProfanity(tenantId: number, id: number) {
  const [row] = await db
    .select({ id: forumProfanityWords.wordId })
    .from(forumProfanityWords)
    .where(scoped(forumProfanityWords, tenantId, eq(forumProfanityWords.wordId, id)))
    .limit(1);
  if (!row) throw new ForumError("NOT_FOUND");
  await db
    .delete(forumProfanityWords)
    .where(scoped(forumProfanityWords, tenantId, eq(forumProfanityWords.wordId, id)));
  return { ok: true as const };
}

import { z } from "zod";

export const idParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});

export const questionBodySchema = z.object({
  title: z.string().trim().min(1).max(255),
  body: z.string().trim().min(1).max(4000),
});

export const answerBodySchema = z.object({
  body: z.string().trim().min(1).max(4000),
});

export const wordBodySchema = z.object({
  word: z.string().trim().min(1).max(100),
});

export type QuestionBody = z.infer<typeof questionBodySchema>;
export type AnswerBody = z.infer<typeof answerBodySchema>;
export type WordBody = z.infer<typeof wordBodySchema>;

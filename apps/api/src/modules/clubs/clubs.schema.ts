import { z } from "zod";

export const idParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});

export const memberIdParamSchema = z.object({
  id: z.coerce.number().int().positive(),
  memberId: z.coerce.number().int().positive(),
});

export const clubBodySchema = z.object({
  name: z.string().trim().min(1).max(150),
  description: z.string().trim().max(2000).optional().default(""),
  year: z.string().trim().min(1).max(10),
  patronStaffId: z.number().int().positive(),
  presidentStudentId: z.number().int().positive(),
  isStudentCouncil: z.boolean().optional().default(false),
  isActive: z.boolean().optional().default(true),
});

export const clubUpdateSchema = clubBodySchema.partial().extend({
  name: z.string().trim().min(1).max(150).optional(),
  year: z.string().trim().min(1).max(10).optional(),
  patronStaffId: z.number().int().positive().optional(),
  presidentStudentId: z.number().int().positive().optional(),
});

export const charterBodySchema = z.object({
  action: z.enum(["Approve", "Suspend", "Draft", "Pending"]),
});

export const memberDecideSchema = z.object({
  action: z.enum(["Approve", "Reject"]),
});

export const meetingBodySchema = z.object({
  title: z.string().trim().min(1).max(255),
  meetsOn: z.string().trim().min(1).max(32),
  location: z.string().trim().max(255).optional().default(""),
  notes: z.string().trim().max(1000).optional().default(""),
});

export const reportBodySchema = z.object({
  title: z.string().trim().min(1).max(255),
  body: z.string().trim().min(1).max(4000),
  reportDate: z.string().trim().min(1).max(16),
});

export const electionBodySchema = z.object({
  title: z.string().trim().min(1).max(255),
  opensOn: z.string().trim().min(1).max(16),
  closesOn: z.string().trim().min(1).max(16),
  candidateStudentIds: z.array(z.number().int().positive()).min(2).max(20),
});

export const voteBodySchema = z.object({
  candidateStudentId: z.number().int().positive(),
});

export const announceBodySchema = z.object({
  setAsPresident: z.boolean().optional().default(true),
});

export const catalogQuerySchema = z.object({
  q: z.string().trim().max(100).optional().default(""),
});

export type ClubBody = z.infer<typeof clubBodySchema>;
export type ClubUpdate = z.infer<typeof clubUpdateSchema>;
export type CharterBody = z.infer<typeof charterBodySchema>;
export type MemberDecide = z.infer<typeof memberDecideSchema>;
export type MeetingBody = z.infer<typeof meetingBodySchema>;
export type ReportBody = z.infer<typeof reportBodySchema>;
export type ElectionBody = z.infer<typeof electionBodySchema>;
export type VoteBody = z.infer<typeof voteBodySchema>;
export type AnnounceBody = z.infer<typeof announceBodySchema>;

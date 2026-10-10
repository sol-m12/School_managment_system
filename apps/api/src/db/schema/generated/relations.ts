import { relations } from "drizzle-orm/relations";
import { onlineExams, examQuestions, examResultsOnline, students, users, groupsInfo, subjects, groupChats, groupMembers, groupTasks, groupSubmissions, studentGroups, libraryAttendance, libraryBooks, libraryBorrowing, libraryHandovers, classes, peerAssessments } from "./schema.js";

export const examQuestionsRelations = relations(examQuestions, ({one}) => ({
	onlineExam: one(onlineExams, {
		fields: [examQuestions.examId],
		references: [onlineExams.examId]
	}),
}));

export const onlineExamsRelations = relations(onlineExams, ({one, many}) => ({
	examQuestions: many(examQuestions),
	examResultsOnlines: many(examResultsOnline),
	subject: one(subjects, {
		fields: [onlineExams.subjectId],
		references: [subjects.subjectId]
	}),
	class: one(classes, {
		fields: [onlineExams.classId],
		references: [classes.classId]
	}),
}));

export const examResultsOnlineRelations = relations(examResultsOnline, ({one}) => ({
	onlineExam: one(onlineExams, {
		fields: [examResultsOnline.examId],
		references: [onlineExams.examId]
	}),
	student: one(students, {
		fields: [examResultsOnline.studentId],
		references: [students.studentId]
	}),
}));

export const studentsRelations = relations(students, ({many}) => ({
	examResultsOnlines: many(examResultsOnline),
	groupMembers: many(groupMembers),
	libraryAttendances: many(libraryAttendance),
	peerAssessments_evaluatorId: many(peerAssessments, {
		relationName: "peerAssessments_evaluatorId_students_studentId"
	}),
	peerAssessments_evaluateeId: many(peerAssessments, {
		relationName: "peerAssessments_evaluateeId_students_studentId"
	}),
	studentGroups: many(studentGroups),
}));

export const groupsInfoRelations = relations(groupsInfo, ({one, many}) => ({
	user: one(users, {
		fields: [groupsInfo.teacherId],
		references: [users.userId]
	}),
	subject: one(subjects, {
		fields: [groupsInfo.subjectId],
		references: [subjects.subjectId]
	}),
	groupChats: many(groupChats),
	groupMembers: many(groupMembers),
}));

export const usersRelations = relations(users, ({many}) => ({
	groupsInfos: many(groupsInfo),
	groupTasks: many(groupTasks),
	libraryBorrowings: many(libraryBorrowing),
	studentGroups: many(studentGroups),
}));

export const subjectsRelations = relations(subjects, ({many}) => ({
	groupsInfos: many(groupsInfo),
	groupTasks: many(groupTasks),
	onlineExams: many(onlineExams),
	studentGroups: many(studentGroups),
}));

export const groupChatsRelations = relations(groupChats, ({one}) => ({
	groupsInfo: one(groupsInfo, {
		fields: [groupChats.groupId],
		references: [groupsInfo.groupId]
	}),
}));

export const groupMembersRelations = relations(groupMembers, ({one}) => ({
	groupsInfo: one(groupsInfo, {
		fields: [groupMembers.groupId],
		references: [groupsInfo.groupId]
	}),
	student: one(students, {
		fields: [groupMembers.studentId],
		references: [students.studentId]
	}),
}));

export const groupSubmissionsRelations = relations(groupSubmissions, ({one}) => ({
	groupTask: one(groupTasks, {
		fields: [groupSubmissions.taskId],
		references: [groupTasks.taskId]
	}),
	studentGroup: one(studentGroups, {
		fields: [groupSubmissions.groupId],
		references: [studentGroups.groupId]
	}),
}));

export const groupTasksRelations = relations(groupTasks, ({one, many}) => ({
	groupSubmissions: many(groupSubmissions),
	user: one(users, {
		fields: [groupTasks.teacherId],
		references: [users.userId]
	}),
	subject: one(subjects, {
		fields: [groupTasks.subjectId],
		references: [subjects.subjectId]
	}),
	peerAssessments: many(peerAssessments),
}));

export const studentGroupsRelations = relations(studentGroups, ({one, many}) => ({
	groupSubmissions: many(groupSubmissions),
	user: one(users, {
		fields: [studentGroups.teacherId],
		references: [users.userId]
	}),
	subject: one(subjects, {
		fields: [studentGroups.subjectId],
		references: [subjects.subjectId]
	}),
	student: one(students, {
		fields: [studentGroups.studentId],
		references: [students.studentId]
	}),
}));

export const libraryAttendanceRelations = relations(libraryAttendance, ({one}) => ({
	student: one(students, {
		fields: [libraryAttendance.studentId],
		references: [students.studentId]
	}),
}));

export const libraryBorrowingRelations = relations(libraryBorrowing, ({one}) => ({
	libraryBook: one(libraryBooks, {
		fields: [libraryBorrowing.bookId],
		references: [libraryBooks.bookId]
	}),
	user: one(users, {
		fields: [libraryBorrowing.userId],
		references: [users.userId]
	}),
}));

export const libraryBooksRelations = relations(libraryBooks, ({many}) => ({
	libraryBorrowings: many(libraryBorrowing),
	libraryHandovers: many(libraryHandovers),
}));

export const libraryHandoversRelations = relations(libraryHandovers, ({one}) => ({
	libraryBook: one(libraryBooks, {
		fields: [libraryHandovers.bookId],
		references: [libraryBooks.bookId]
	}),
}));

export const classesRelations = relations(classes, ({many}) => ({
	onlineExams: many(onlineExams),
}));

export const peerAssessmentsRelations = relations(peerAssessments, ({one}) => ({
	groupTask: one(groupTasks, {
		fields: [peerAssessments.taskId],
		references: [groupTasks.taskId]
	}),
	student_evaluatorId: one(students, {
		fields: [peerAssessments.evaluatorId],
		references: [students.studentId],
		relationName: "peerAssessments_evaluatorId_students_studentId"
	}),
	student_evaluateeId: one(students, {
		fields: [peerAssessments.evaluateeId],
		references: [students.studentId],
		relationName: "peerAssessments_evaluateeId_students_studentId"
	}),
}));
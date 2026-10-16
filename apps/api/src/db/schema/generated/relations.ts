import { relations } from "drizzle-orm/relations";
import { tenants, accountTypes, adminTasks, announcements, annualLessonPlan, assignmentSubmissions, attendance, auditLog, binCardLedger, budgetNotifications, budgetNotificationItems, classes, classSchedule, committeesClubs, committeeMembers, communicationGroups, evaluationCriteria, evaluationDetails, onlineExams, examQuestions, examResultsOnline, students, expenses, externalInquiries, fileShares, financeCodes, foreignPartners, grades, users, groupsInfo, subjects, groupChats, groupMembers, groupMessages, groupResponses, groupTasks, groupSubmissions, studentGroups, income, issueModel22, itemCategories, items, libraryAttendance, libraryBooks, libraryBorrowing, libraryHandovers, liveQuizQuestions, liveQuizSessions, mehi161Cards, mehi161Transactions, mehi17Cards, mehi17Transactions, mehi7Items, mehi7Vouchers, model19Grn, model19Items, parentGuardian, payroll, peerAssessments, periodSettings, requisitionsModel20, schoolNews, schoolPlans, schoolSettings, schoolStats, simulations, staff, staffFiles, staffFolders, stockLedgerCard, studentAssessments, studentFinalReports, subjectWeightings, suppliers, systemSettings, teacherAssignments, teacherEvaluations, teacherRoleCredits, vocationalRequests } from "./schema.js";

export const accountTypesRelations = relations(accountTypes, ({one, many}) => ({
	tenant: one(tenants, {
		fields: [accountTypes.tenantId],
		references: [tenants.id]
	}),
	financeCodes: many(financeCodes),
}));

export const tenantsRelations = relations(tenants, ({many}) => ({
	accountTypes: many(accountTypes),
	adminTasks: many(adminTasks),
	announcements: many(announcements),
	annualLessonPlans: many(annualLessonPlan),
	assignmentSubmissions: many(assignmentSubmissions),
	attendances: many(attendance),
	auditLogs: many(auditLog),
	binCardLedgers: many(binCardLedger),
	budgetNotifications: many(budgetNotifications),
	budgetNotificationItems: many(budgetNotificationItems),
	classes: many(classes),
	classSchedules: many(classSchedule),
	committeesClubs: many(committeesClubs),
	committeeMembers: many(committeeMembers),
	communicationGroups: many(communicationGroups),
	evaluationCriteria: many(evaluationCriteria),
	evaluationDetails: many(evaluationDetails),
	examQuestions: many(examQuestions),
	examResultsOnlines: many(examResultsOnline),
	expenses: many(expenses),
	externalInquiries: many(externalInquiries),
	fileShares: many(fileShares),
	financeCodes: many(financeCodes),
	foreignPartners: many(foreignPartners),
	grades: many(grades),
	groupsInfos: many(groupsInfo),
	groupChats: many(groupChats),
	groupMembers: many(groupMembers),
	groupMessages: many(groupMessages),
	groupResponses: many(groupResponses),
	groupSubmissions: many(groupSubmissions),
	groupTasks: many(groupTasks),
	incomes: many(income),
	issueModel22s: many(issueModel22),
	items: many(items),
	itemCategories: many(itemCategories),
	libraryAttendances: many(libraryAttendance),
	libraryBooks: many(libraryBooks),
	libraryBorrowings: many(libraryBorrowing),
	libraryHandovers: many(libraryHandovers),
	liveQuizQuestions: many(liveQuizQuestions),
	liveQuizSessions: many(liveQuizSessions),
	mehi161Cards: many(mehi161Cards),
	mehi161Transactions: many(mehi161Transactions),
	mehi17Cards: many(mehi17Cards),
	mehi17Transactions: many(mehi17Transactions),
	mehi7Items: many(mehi7Items),
	mehi7Vouchers: many(mehi7Vouchers),
	model19Grns: many(model19Grn),
	model19Items: many(model19Items),
	onlineExams: many(onlineExams),
	parentGuardians: many(parentGuardian),
	payrolls: many(payroll),
	peerAssessments: many(peerAssessments),
	periodSettings: many(periodSettings),
	requisitionsModel20s: many(requisitionsModel20),
	schoolNews: many(schoolNews),
	schoolPlans: many(schoolPlans),
	schoolSettings: many(schoolSettings),
	schoolStats: many(schoolStats),
	simulations: many(simulations),
	staff: many(staff),
	staffFiles: many(staffFiles),
	staffFolders: many(staffFolders),
	stockLedgerCards: many(stockLedgerCard),
	students: many(students),
	studentAssessments: many(studentAssessments),
	studentFinalReports: many(studentFinalReports),
	studentGroups: many(studentGroups),
	subjects: many(subjects),
	subjectWeightings: many(subjectWeightings),
	suppliers: many(suppliers),
	systemSettings: many(systemSettings),
	teacherAssignments: many(teacherAssignments),
	teacherEvaluations: many(teacherEvaluations),
	teacherRoleCredits: many(teacherRoleCredits),
	users: many(users),
	vocationalRequests: many(vocationalRequests),
}));

export const adminTasksRelations = relations(adminTasks, ({one}) => ({
	tenant: one(tenants, {
		fields: [adminTasks.tenantId],
		references: [tenants.id]
	}),
}));

export const announcementsRelations = relations(announcements, ({one}) => ({
	tenant: one(tenants, {
		fields: [announcements.tenantId],
		references: [tenants.id]
	}),
}));

export const annualLessonPlanRelations = relations(annualLessonPlan, ({one}) => ({
	tenant: one(tenants, {
		fields: [annualLessonPlan.tenantId],
		references: [tenants.id]
	}),
}));

export const assignmentSubmissionsRelations = relations(assignmentSubmissions, ({one}) => ({
	tenant: one(tenants, {
		fields: [assignmentSubmissions.tenantId],
		references: [tenants.id]
	}),
}));

export const attendanceRelations = relations(attendance, ({one}) => ({
	tenant: one(tenants, {
		fields: [attendance.tenantId],
		references: [tenants.id]
	}),
}));

export const auditLogRelations = relations(auditLog, ({one}) => ({
	tenant: one(tenants, {
		fields: [auditLog.tenantId],
		references: [tenants.id]
	}),
}));

export const binCardLedgerRelations = relations(binCardLedger, ({one}) => ({
	tenant: one(tenants, {
		fields: [binCardLedger.tenantId],
		references: [tenants.id]
	}),
}));

export const budgetNotificationsRelations = relations(budgetNotifications, ({one, many}) => ({
	tenant: one(tenants, {
		fields: [budgetNotifications.tenantId],
		references: [tenants.id]
	}),
	budgetNotificationItems: many(budgetNotificationItems),
}));

export const budgetNotificationItemsRelations = relations(budgetNotificationItems, ({one}) => ({
	budgetNotification: one(budgetNotifications, {
		fields: [budgetNotificationItems.notificationId],
		references: [budgetNotifications.notificationId]
	}),
	tenant: one(tenants, {
		fields: [budgetNotificationItems.tenantId],
		references: [tenants.id]
	}),
}));

export const classesRelations = relations(classes, ({one, many}) => ({
	tenant: one(tenants, {
		fields: [classes.tenantId],
		references: [tenants.id]
	}),
	onlineExams: many(onlineExams),
}));

export const classScheduleRelations = relations(classSchedule, ({one}) => ({
	tenant: one(tenants, {
		fields: [classSchedule.tenantId],
		references: [tenants.id]
	}),
}));

export const committeesClubsRelations = relations(committeesClubs, ({one}) => ({
	tenant: one(tenants, {
		fields: [committeesClubs.tenantId],
		references: [tenants.id]
	}),
}));

export const committeeMembersRelations = relations(committeeMembers, ({one}) => ({
	tenant: one(tenants, {
		fields: [committeeMembers.tenantId],
		references: [tenants.id]
	}),
}));

export const communicationGroupsRelations = relations(communicationGroups, ({one}) => ({
	tenant: one(tenants, {
		fields: [communicationGroups.tenantId],
		references: [tenants.id]
	}),
}));

export const evaluationCriteriaRelations = relations(evaluationCriteria, ({one}) => ({
	tenant: one(tenants, {
		fields: [evaluationCriteria.tenantId],
		references: [tenants.id]
	}),
}));

export const evaluationDetailsRelations = relations(evaluationDetails, ({one}) => ({
	tenant: one(tenants, {
		fields: [evaluationDetails.tenantId],
		references: [tenants.id]
	}),
}));

export const examQuestionsRelations = relations(examQuestions, ({one}) => ({
	onlineExam: one(onlineExams, {
		fields: [examQuestions.examId],
		references: [onlineExams.examId]
	}),
	tenant: one(tenants, {
		fields: [examQuestions.tenantId],
		references: [tenants.id]
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
	tenant: one(tenants, {
		fields: [onlineExams.tenantId],
		references: [tenants.id]
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
	tenant: one(tenants, {
		fields: [examResultsOnline.tenantId],
		references: [tenants.id]
	}),
}));

export const studentsRelations = relations(students, ({one, many}) => ({
	examResultsOnlines: many(examResultsOnline),
	groupMembers: many(groupMembers),
	libraryAttendances: many(libraryAttendance),
	peerAssessments_evaluatorId: many(peerAssessments, {
		relationName: "peerAssessments_evaluatorId_students_studentId"
	}),
	peerAssessments_evaluateeId: many(peerAssessments, {
		relationName: "peerAssessments_evaluateeId_students_studentId"
	}),
	tenant: one(tenants, {
		fields: [students.tenantId],
		references: [tenants.id]
	}),
	studentGroups: many(studentGroups),
}));

export const expensesRelations = relations(expenses, ({one}) => ({
	tenant: one(tenants, {
		fields: [expenses.tenantId],
		references: [tenants.id]
	}),
}));

export const externalInquiriesRelations = relations(externalInquiries, ({one}) => ({
	tenant: one(tenants, {
		fields: [externalInquiries.tenantId],
		references: [tenants.id]
	}),
}));

export const fileSharesRelations = relations(fileShares, ({one}) => ({
	tenant: one(tenants, {
		fields: [fileShares.tenantId],
		references: [tenants.id]
	}),
}));

export const financeCodesRelations = relations(financeCodes, ({one}) => ({
	tenant: one(tenants, {
		fields: [financeCodes.tenantId],
		references: [tenants.id]
	}),
	accountType: one(accountTypes, {
		fields: [financeCodes.typeId],
		references: [accountTypes.typeId]
	}),
}));

export const foreignPartnersRelations = relations(foreignPartners, ({one}) => ({
	tenant: one(tenants, {
		fields: [foreignPartners.tenantId],
		references: [tenants.id]
	}),
}));

export const gradesRelations = relations(grades, ({one}) => ({
	tenant: one(tenants, {
		fields: [grades.tenantId],
		references: [tenants.id]
	}),
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
	tenant: one(tenants, {
		fields: [groupsInfo.tenantId],
		references: [tenants.id]
	}),
	groupChats: many(groupChats),
	groupMembers: many(groupMembers),
}));

export const usersRelations = relations(users, ({one, many}) => ({
	groupsInfos: many(groupsInfo),
	groupTasks: many(groupTasks),
	libraryBorrowings: many(libraryBorrowing),
	studentGroups: many(studentGroups),
	tenant: one(tenants, {
		fields: [users.tenantId],
		references: [tenants.id]
	}),
}));

export const subjectsRelations = relations(subjects, ({one, many}) => ({
	groupsInfos: many(groupsInfo),
	groupTasks: many(groupTasks),
	onlineExams: many(onlineExams),
	studentGroups: many(studentGroups),
	tenant: one(tenants, {
		fields: [subjects.tenantId],
		references: [tenants.id]
	}),
}));

export const groupChatsRelations = relations(groupChats, ({one}) => ({
	groupsInfo: one(groupsInfo, {
		fields: [groupChats.groupId],
		references: [groupsInfo.groupId]
	}),
	tenant: one(tenants, {
		fields: [groupChats.tenantId],
		references: [tenants.id]
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
	tenant: one(tenants, {
		fields: [groupMembers.tenantId],
		references: [tenants.id]
	}),
}));

export const groupMessagesRelations = relations(groupMessages, ({one}) => ({
	tenant: one(tenants, {
		fields: [groupMessages.tenantId],
		references: [tenants.id]
	}),
}));

export const groupResponsesRelations = relations(groupResponses, ({one}) => ({
	tenant: one(tenants, {
		fields: [groupResponses.tenantId],
		references: [tenants.id]
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
	tenant: one(tenants, {
		fields: [groupSubmissions.tenantId],
		references: [tenants.id]
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
	tenant: one(tenants, {
		fields: [groupTasks.tenantId],
		references: [tenants.id]
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
	tenant: one(tenants, {
		fields: [studentGroups.tenantId],
		references: [tenants.id]
	}),
}));

export const incomeRelations = relations(income, ({one}) => ({
	tenant: one(tenants, {
		fields: [income.tenantId],
		references: [tenants.id]
	}),
}));

export const issueModel22Relations = relations(issueModel22, ({one}) => ({
	tenant: one(tenants, {
		fields: [issueModel22.tenantId],
		references: [tenants.id]
	}),
}));

export const itemsRelations = relations(items, ({one}) => ({
	itemCategory: one(itemCategories, {
		fields: [items.categoryId],
		references: [itemCategories.categoryId]
	}),
	tenant: one(tenants, {
		fields: [items.tenantId],
		references: [tenants.id]
	}),
}));

export const itemCategoriesRelations = relations(itemCategories, ({one, many}) => ({
	items: many(items),
	tenant: one(tenants, {
		fields: [itemCategories.tenantId],
		references: [tenants.id]
	}),
}));

export const libraryAttendanceRelations = relations(libraryAttendance, ({one}) => ({
	student: one(students, {
		fields: [libraryAttendance.studentId],
		references: [students.studentId]
	}),
	tenant: one(tenants, {
		fields: [libraryAttendance.tenantId],
		references: [tenants.id]
	}),
}));

export const libraryBooksRelations = relations(libraryBooks, ({one, many}) => ({
	tenant: one(tenants, {
		fields: [libraryBooks.tenantId],
		references: [tenants.id]
	}),
	libraryBorrowings: many(libraryBorrowing),
	libraryHandovers: many(libraryHandovers),
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
	tenant: one(tenants, {
		fields: [libraryBorrowing.tenantId],
		references: [tenants.id]
	}),
}));

export const libraryHandoversRelations = relations(libraryHandovers, ({one}) => ({
	libraryBook: one(libraryBooks, {
		fields: [libraryHandovers.bookId],
		references: [libraryBooks.bookId]
	}),
	tenant: one(tenants, {
		fields: [libraryHandovers.tenantId],
		references: [tenants.id]
	}),
}));

export const liveQuizQuestionsRelations = relations(liveQuizQuestions, ({one}) => ({
	tenant: one(tenants, {
		fields: [liveQuizQuestions.tenantId],
		references: [tenants.id]
	}),
}));

export const liveQuizSessionsRelations = relations(liveQuizSessions, ({one}) => ({
	tenant: one(tenants, {
		fields: [liveQuizSessions.tenantId],
		references: [tenants.id]
	}),
}));

export const mehi161CardsRelations = relations(mehi161Cards, ({one, many}) => ({
	tenant: one(tenants, {
		fields: [mehi161Cards.tenantId],
		references: [tenants.id]
	}),
	mehi161Transactions: many(mehi161Transactions),
}));

export const mehi161TransactionsRelations = relations(mehi161Transactions, ({one}) => ({
	mehi161Card: one(mehi161Cards, {
		fields: [mehi161Transactions.cardId],
		references: [mehi161Cards.cardId]
	}),
	tenant: one(tenants, {
		fields: [mehi161Transactions.tenantId],
		references: [tenants.id]
	}),
}));

export const mehi17CardsRelations = relations(mehi17Cards, ({one, many}) => ({
	tenant: one(tenants, {
		fields: [mehi17Cards.tenantId],
		references: [tenants.id]
	}),
	mehi17Transactions: many(mehi17Transactions),
}));

export const mehi17TransactionsRelations = relations(mehi17Transactions, ({one}) => ({
	mehi17Card: one(mehi17Cards, {
		fields: [mehi17Transactions.cardId],
		references: [mehi17Cards.cardId]
	}),
	tenant: one(tenants, {
		fields: [mehi17Transactions.tenantId],
		references: [tenants.id]
	}),
}));

export const mehi7ItemsRelations = relations(mehi7Items, ({one}) => ({
	tenant: one(tenants, {
		fields: [mehi7Items.tenantId],
		references: [tenants.id]
	}),
	mehi7Voucher: one(mehi7Vouchers, {
		fields: [mehi7Items.voucherId],
		references: [mehi7Vouchers.voucherId]
	}),
}));

export const mehi7VouchersRelations = relations(mehi7Vouchers, ({one, many}) => ({
	mehi7Items: many(mehi7Items),
	tenant: one(tenants, {
		fields: [mehi7Vouchers.tenantId],
		references: [tenants.id]
	}),
}));

export const model19GrnRelations = relations(model19Grn, ({one, many}) => ({
	tenant: one(tenants, {
		fields: [model19Grn.tenantId],
		references: [tenants.id]
	}),
	model19Items: many(model19Items),
}));

export const model19ItemsRelations = relations(model19Items, ({one}) => ({
	model19Grn: one(model19Grn, {
		fields: [model19Items.grnId],
		references: [model19Grn.grnId]
	}),
	tenant: one(tenants, {
		fields: [model19Items.tenantId],
		references: [tenants.id]
	}),
}));

export const parentGuardianRelations = relations(parentGuardian, ({one}) => ({
	tenant: one(tenants, {
		fields: [parentGuardian.tenantId],
		references: [tenants.id]
	}),
}));

export const payrollRelations = relations(payroll, ({one}) => ({
	tenant: one(tenants, {
		fields: [payroll.tenantId],
		references: [tenants.id]
	}),
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
	tenant: one(tenants, {
		fields: [peerAssessments.tenantId],
		references: [tenants.id]
	}),
}));

export const periodSettingsRelations = relations(periodSettings, ({one}) => ({
	tenant: one(tenants, {
		fields: [periodSettings.tenantId],
		references: [tenants.id]
	}),
}));

export const requisitionsModel20Relations = relations(requisitionsModel20, ({one}) => ({
	tenant: one(tenants, {
		fields: [requisitionsModel20.tenantId],
		references: [tenants.id]
	}),
}));

export const schoolNewsRelations = relations(schoolNews, ({one}) => ({
	tenant: one(tenants, {
		fields: [schoolNews.tenantId],
		references: [tenants.id]
	}),
}));

export const schoolPlansRelations = relations(schoolPlans, ({one}) => ({
	tenant: one(tenants, {
		fields: [schoolPlans.tenantId],
		references: [tenants.id]
	}),
}));

export const schoolSettingsRelations = relations(schoolSettings, ({one}) => ({
	tenant: one(tenants, {
		fields: [schoolSettings.tenantId],
		references: [tenants.id]
	}),
}));

export const schoolStatsRelations = relations(schoolStats, ({one}) => ({
	tenant: one(tenants, {
		fields: [schoolStats.tenantId],
		references: [tenants.id]
	}),
}));

export const simulationsRelations = relations(simulations, ({one}) => ({
	tenant: one(tenants, {
		fields: [simulations.tenantId],
		references: [tenants.id]
	}),
}));

export const staffRelations = relations(staff, ({one}) => ({
	tenant: one(tenants, {
		fields: [staff.tenantId],
		references: [tenants.id]
	}),
}));

export const staffFilesRelations = relations(staffFiles, ({one}) => ({
	tenant: one(tenants, {
		fields: [staffFiles.tenantId],
		references: [tenants.id]
	}),
}));

export const staffFoldersRelations = relations(staffFolders, ({one}) => ({
	tenant: one(tenants, {
		fields: [staffFolders.tenantId],
		references: [tenants.id]
	}),
}));

export const stockLedgerCardRelations = relations(stockLedgerCard, ({one}) => ({
	tenant: one(tenants, {
		fields: [stockLedgerCard.tenantId],
		references: [tenants.id]
	}),
}));

export const studentAssessmentsRelations = relations(studentAssessments, ({one}) => ({
	tenant: one(tenants, {
		fields: [studentAssessments.tenantId],
		references: [tenants.id]
	}),
}));

export const studentFinalReportsRelations = relations(studentFinalReports, ({one}) => ({
	tenant: one(tenants, {
		fields: [studentFinalReports.tenantId],
		references: [tenants.id]
	}),
}));

export const subjectWeightingsRelations = relations(subjectWeightings, ({one}) => ({
	tenant: one(tenants, {
		fields: [subjectWeightings.tenantId],
		references: [tenants.id]
	}),
}));

export const suppliersRelations = relations(suppliers, ({one}) => ({
	tenant: one(tenants, {
		fields: [suppliers.tenantId],
		references: [tenants.id]
	}),
}));

export const systemSettingsRelations = relations(systemSettings, ({one}) => ({
	tenant: one(tenants, {
		fields: [systemSettings.tenantId],
		references: [tenants.id]
	}),
}));

export const teacherAssignmentsRelations = relations(teacherAssignments, ({one}) => ({
	tenant: one(tenants, {
		fields: [teacherAssignments.tenantId],
		references: [tenants.id]
	}),
}));

export const teacherEvaluationsRelations = relations(teacherEvaluations, ({one}) => ({
	tenant: one(tenants, {
		fields: [teacherEvaluations.tenantId],
		references: [tenants.id]
	}),
}));

export const teacherRoleCreditsRelations = relations(teacherRoleCredits, ({one}) => ({
	tenant: one(tenants, {
		fields: [teacherRoleCredits.tenantId],
		references: [tenants.id]
	}),
}));

export const vocationalRequestsRelations = relations(vocationalRequests, ({one}) => ({
	tenant: one(tenants, {
		fields: [vocationalRequests.tenantId],
		references: [tenants.id]
	}),
}));
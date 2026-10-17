import { relations } from "drizzle-orm/relations";
import { tenants, accountTypes, adminTasks, announcements, annualLessonPlan, assignmentSubmissions, attendance, auditLog, backupRuns, binCardLedger, budgetNotifications, budgetNotificationItems, classes, classSchedule, committeesClubs, committeeMembers, communicationGroups, departmentHeads, evaluationCriteria, evaluationDetails, onlineExams, examQuestions, examResultsOnline, students, expenses, externalInquiries, fileShares, financeCodes, foreignPartners, grades, users, groupsInfo, subjects, groupChats, groupMembers, groupMessages, groupResponses, groupTasks, groupSubmissions, studentGroups, income, issueModel22, itemCategories, items, lbBadges, lbIntake, lbLiteracy, lbPatronLog, lbReminders, lbReservations, lbResources, libraryAttendance, libraryBooks, libraryBorrowing, libraryHandovers, liveQuizQuestions, liveQuizSessions, loginAttempts, mehi161Cards, mehi161Transactions, mehi17Cards, mehi17Transactions, mehi7Items, mehi7Vouchers, model19Grn, model19Items, outboundNotices, parentIdentities, parentAppointmentRequests, parentGuardian, parentMessages, parentStudentLinks, payroll, peerAssessments, periodSettings, poApprovals, poAwards, poBids, poBudgets, poChecks, poOrders, poTenders, poVendors, principalApprovalNotes, principalDocuments, principalIncidents, principalMessages, principalPolicies, principalReportDefs, principalTraining, principalTransfers, requisitionsModel20, roAccessLog, roAlumni, roArchives, roArchiveRows, roDocuments, roFiles, roImports, roLocks, roRequests, roStaffRecords, schoolNews, schoolPlans, schoolSettings, schoolStats, secAppointments, secCleanupRuns, secDocuments, secNotices, secOcrScans, secRenewals, secTickets, simulations, skAlerts, skAssets, skDisposals, skLoans, skPurchaseRequests, staff, staffFiles, staffFolders, stockLedgerCard, studentAssessments, studentFinalReports, stCommendations, stDocumentRequests, stTaskWork, subjectWeightings, suppliers, supportTickets, systemSettings, tcBookRecommendations, tcExamStandards, tcGradeReviews, tcIncidents, tcLeaveRequests, tcPapers, tcPaperItems, tcParticipation, tcPerformance, tcPerformanceScores, tcQuestions, tcRequisitions, tcSubstitutions, tcSwaps, tcTopicCoverage, teacherAssignments, teacherEvaluations, teacherRoleCredits, vocationalRequests, vpExamSessions, vpHearings, vpInvigilators, vpPenalties, vpPlacements, vpPrograms, vpReferrals } from "./schema.js";

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
	backupRuns: many(backupRuns),
	binCardLedgers: many(binCardLedger),
	budgetNotifications: many(budgetNotifications),
	budgetNotificationItems: many(budgetNotificationItems),
	classes: many(classes),
	classSchedules: many(classSchedule),
	committeesClubs: many(committeesClubs),
	committeeMembers: many(committeeMembers),
	communicationGroups: many(communicationGroups),
	departmentHeads: many(departmentHeads),
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
	lbBadges: many(lbBadges),
	lbIntakes: many(lbIntake),
	lbLiteracies: many(lbLiteracy),
	lbPatronLogs: many(lbPatronLog),
	lbReminders: many(lbReminders),
	lbReservations: many(lbReservations),
	lbResources: many(lbResources),
	libraryAttendances: many(libraryAttendance),
	libraryBooks: many(libraryBooks),
	libraryBorrowings: many(libraryBorrowing),
	libraryHandovers: many(libraryHandovers),
	liveQuizQuestions: many(liveQuizQuestions),
	liveQuizSessions: many(liveQuizSessions),
	loginAttempts: many(loginAttempts),
	mehi161Cards: many(mehi161Cards),
	mehi161Transactions: many(mehi161Transactions),
	mehi17Cards: many(mehi17Cards),
	mehi17Transactions: many(mehi17Transactions),
	mehi7Items: many(mehi7Items),
	mehi7Vouchers: many(mehi7Vouchers),
	model19Grns: many(model19Grn),
	model19Items: many(model19Items),
	onlineExams: many(onlineExams),
	outboundNotices: many(outboundNotices),
	parentAppointmentRequests: many(parentAppointmentRequests),
	parentGuardians: many(parentGuardian),
	parentMessages: many(parentMessages),
	parentStudentLinks: many(parentStudentLinks),
	payrolls: many(payroll),
	peerAssessments: many(peerAssessments),
	periodSettings: many(periodSettings),
	poApprovals: many(poApprovals),
	poAwards: many(poAwards),
	poBids: many(poBids),
	poBudgets: many(poBudgets),
	poChecks: many(poChecks),
	poOrders: many(poOrders),
	poTenders: many(poTenders),
	poVendors: many(poVendors),
	principalApprovalNotes: many(principalApprovalNotes),
	principalDocuments: many(principalDocuments),
	principalIncidents: many(principalIncidents),
	principalMessages: many(principalMessages),
	principalPolicies: many(principalPolicies),
	principalReportDefs: many(principalReportDefs),
	principalTrainings: many(principalTraining),
	principalTransfers: many(principalTransfers),
	requisitionsModel20s: many(requisitionsModel20),
	roAccessLogs: many(roAccessLog),
	roAlumni: many(roAlumni),
	roArchives: many(roArchives),
	roArchiveRows: many(roArchiveRows),
	roDocuments: many(roDocuments),
	roFiles: many(roFiles),
	roImports: many(roImports),
	roLocks: many(roLocks),
	roRequests: many(roRequests),
	roStaffRecords: many(roStaffRecords),
	schoolNews: many(schoolNews),
	schoolPlans: many(schoolPlans),
	schoolSettings: many(schoolSettings),
	schoolStats: many(schoolStats),
	secAppointments: many(secAppointments),
	secCleanupRuns: many(secCleanupRuns),
	secDocuments: many(secDocuments),
	secNotices: many(secNotices),
	secOcrScans: many(secOcrScans),
	secRenewals: many(secRenewals),
	secTickets: many(secTickets),
	simulations: many(simulations),
	skAlerts: many(skAlerts),
	skAssets: many(skAssets),
	skDisposals: many(skDisposals),
	skLoans: many(skLoans),
	skPurchaseRequests: many(skPurchaseRequests),
	staff: many(staff),
	staffFiles: many(staffFiles),
	staffFolders: many(staffFolders),
	stockLedgerCards: many(stockLedgerCard),
	students: many(students),
	studentAssessments: many(studentAssessments),
	studentFinalReports: many(studentFinalReports),
	studentGroups: many(studentGroups),
	stCommendations: many(stCommendations),
	stDocumentRequests: many(stDocumentRequests),
	stTaskWorks: many(stTaskWork),
	subjects: many(subjects),
	subjectWeightings: many(subjectWeightings),
	suppliers: many(suppliers),
	supportTickets: many(supportTickets),
	systemSettings: many(systemSettings),
	tcBookRecommendations: many(tcBookRecommendations),
	tcExamStandards: many(tcExamStandards),
	tcGradeReviews: many(tcGradeReviews),
	tcIncidents: many(tcIncidents),
	tcLeaveRequests: many(tcLeaveRequests),
	tcPapers: many(tcPapers),
	tcPaperItems: many(tcPaperItems),
	tcParticipations: many(tcParticipation),
	tcPerformances: many(tcPerformance),
	tcPerformanceScores: many(tcPerformanceScores),
	tcQuestions: many(tcQuestions),
	tcRequisitions: many(tcRequisitions),
	tcSubstitutions: many(tcSubstitutions),
	tcSwaps: many(tcSwaps),
	tcTopicCoverages: many(tcTopicCoverage),
	teacherAssignments: many(teacherAssignments),
	teacherEvaluations: many(teacherEvaluations),
	teacherRoleCredits: many(teacherRoleCredits),
	users: many(users),
	vocationalRequests: many(vocationalRequests),
	vpExamSessions: many(vpExamSessions),
	vpHearings: many(vpHearings),
	vpInvigilators: many(vpInvigilators),
	vpPenalties: many(vpPenalties),
	vpPlacements: many(vpPlacements),
	vpPrograms: many(vpPrograms),
	vpReferrals: many(vpReferrals),
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

export const backupRunsRelations = relations(backupRuns, ({one}) => ({
	tenant: one(tenants, {
		fields: [backupRuns.tenantId],
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

export const departmentHeadsRelations = relations(departmentHeads, ({one}) => ({
	tenant: one(tenants, {
		fields: [departmentHeads.tenantId],
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
	parentIdentity: one(parentIdentities, {
		fields: [users.parentId],
		references: [parentIdentities.parentId]
	}),
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

export const lbBadgesRelations = relations(lbBadges, ({one}) => ({
	tenant: one(tenants, {
		fields: [lbBadges.tenantId],
		references: [tenants.id]
	}),
}));

export const lbIntakeRelations = relations(lbIntake, ({one}) => ({
	tenant: one(tenants, {
		fields: [lbIntake.tenantId],
		references: [tenants.id]
	}),
}));

export const lbLiteracyRelations = relations(lbLiteracy, ({one}) => ({
	tenant: one(tenants, {
		fields: [lbLiteracy.tenantId],
		references: [tenants.id]
	}),
}));

export const lbPatronLogRelations = relations(lbPatronLog, ({one}) => ({
	tenant: one(tenants, {
		fields: [lbPatronLog.tenantId],
		references: [tenants.id]
	}),
}));

export const lbRemindersRelations = relations(lbReminders, ({one}) => ({
	tenant: one(tenants, {
		fields: [lbReminders.tenantId],
		references: [tenants.id]
	}),
}));

export const lbReservationsRelations = relations(lbReservations, ({one}) => ({
	tenant: one(tenants, {
		fields: [lbReservations.tenantId],
		references: [tenants.id]
	}),
}));

export const lbResourcesRelations = relations(lbResources, ({one}) => ({
	tenant: one(tenants, {
		fields: [lbResources.tenantId],
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

export const loginAttemptsRelations = relations(loginAttempts, ({one}) => ({
	tenant: one(tenants, {
		fields: [loginAttempts.tenantId],
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

export const outboundNoticesRelations = relations(outboundNotices, ({one}) => ({
	tenant: one(tenants, {
		fields: [outboundNotices.tenantId],
		references: [tenants.id]
	}),
}));

export const parentAppointmentRequestsRelations = relations(parentAppointmentRequests, ({one}) => ({
	parentIdentity: one(parentIdentities, {
		fields: [parentAppointmentRequests.parentId],
		references: [parentIdentities.parentId]
	}),
	tenant: one(tenants, {
		fields: [parentAppointmentRequests.tenantId],
		references: [tenants.id]
	}),
}));

export const parentIdentitiesRelations = relations(parentIdentities, ({many}) => ({
	parentAppointmentRequests: many(parentAppointmentRequests),
	parentMessages: many(parentMessages),
	parentStudentLinks: many(parentStudentLinks),
	users: many(users),
}));

export const parentGuardianRelations = relations(parentGuardian, ({one}) => ({
	tenant: one(tenants, {
		fields: [parentGuardian.tenantId],
		references: [tenants.id]
	}),
}));

export const parentMessagesRelations = relations(parentMessages, ({one}) => ({
	parentIdentity: one(parentIdentities, {
		fields: [parentMessages.parentId],
		references: [parentIdentities.parentId]
	}),
	tenant: one(tenants, {
		fields: [parentMessages.tenantId],
		references: [tenants.id]
	}),
}));

export const parentStudentLinksRelations = relations(parentStudentLinks, ({one}) => ({
	parentIdentity: one(parentIdentities, {
		fields: [parentStudentLinks.parentId],
		references: [parentIdentities.parentId]
	}),
	tenant: one(tenants, {
		fields: [parentStudentLinks.tenantId],
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

export const poApprovalsRelations = relations(poApprovals, ({one}) => ({
	tenant: one(tenants, {
		fields: [poApprovals.tenantId],
		references: [tenants.id]
	}),
}));

export const poAwardsRelations = relations(poAwards, ({one}) => ({
	tenant: one(tenants, {
		fields: [poAwards.tenantId],
		references: [tenants.id]
	}),
}));

export const poBidsRelations = relations(poBids, ({one}) => ({
	tenant: one(tenants, {
		fields: [poBids.tenantId],
		references: [tenants.id]
	}),
}));

export const poBudgetsRelations = relations(poBudgets, ({one}) => ({
	tenant: one(tenants, {
		fields: [poBudgets.tenantId],
		references: [tenants.id]
	}),
}));

export const poChecksRelations = relations(poChecks, ({one}) => ({
	tenant: one(tenants, {
		fields: [poChecks.tenantId],
		references: [tenants.id]
	}),
}));

export const poOrdersRelations = relations(poOrders, ({one}) => ({
	tenant: one(tenants, {
		fields: [poOrders.tenantId],
		references: [tenants.id]
	}),
}));

export const poTendersRelations = relations(poTenders, ({one}) => ({
	tenant: one(tenants, {
		fields: [poTenders.tenantId],
		references: [tenants.id]
	}),
}));

export const poVendorsRelations = relations(poVendors, ({one}) => ({
	tenant: one(tenants, {
		fields: [poVendors.tenantId],
		references: [tenants.id]
	}),
}));

export const principalApprovalNotesRelations = relations(principalApprovalNotes, ({one}) => ({
	tenant: one(tenants, {
		fields: [principalApprovalNotes.tenantId],
		references: [tenants.id]
	}),
}));

export const principalDocumentsRelations = relations(principalDocuments, ({one}) => ({
	tenant: one(tenants, {
		fields: [principalDocuments.tenantId],
		references: [tenants.id]
	}),
}));

export const principalIncidentsRelations = relations(principalIncidents, ({one}) => ({
	tenant: one(tenants, {
		fields: [principalIncidents.tenantId],
		references: [tenants.id]
	}),
}));

export const principalMessagesRelations = relations(principalMessages, ({one}) => ({
	tenant: one(tenants, {
		fields: [principalMessages.tenantId],
		references: [tenants.id]
	}),
}));

export const principalPoliciesRelations = relations(principalPolicies, ({one}) => ({
	tenant: one(tenants, {
		fields: [principalPolicies.tenantId],
		references: [tenants.id]
	}),
}));

export const principalReportDefsRelations = relations(principalReportDefs, ({one}) => ({
	tenant: one(tenants, {
		fields: [principalReportDefs.tenantId],
		references: [tenants.id]
	}),
}));

export const principalTrainingRelations = relations(principalTraining, ({one}) => ({
	tenant: one(tenants, {
		fields: [principalTraining.tenantId],
		references: [tenants.id]
	}),
}));

export const principalTransfersRelations = relations(principalTransfers, ({one}) => ({
	tenant: one(tenants, {
		fields: [principalTransfers.tenantId],
		references: [tenants.id]
	}),
}));

export const requisitionsModel20Relations = relations(requisitionsModel20, ({one}) => ({
	tenant: one(tenants, {
		fields: [requisitionsModel20.tenantId],
		references: [tenants.id]
	}),
}));

export const roAccessLogRelations = relations(roAccessLog, ({one}) => ({
	tenant: one(tenants, {
		fields: [roAccessLog.tenantId],
		references: [tenants.id]
	}),
}));

export const roAlumniRelations = relations(roAlumni, ({one}) => ({
	tenant: one(tenants, {
		fields: [roAlumni.tenantId],
		references: [tenants.id]
	}),
}));

export const roArchivesRelations = relations(roArchives, ({one}) => ({
	tenant: one(tenants, {
		fields: [roArchives.tenantId],
		references: [tenants.id]
	}),
}));

export const roArchiveRowsRelations = relations(roArchiveRows, ({one}) => ({
	tenant: one(tenants, {
		fields: [roArchiveRows.tenantId],
		references: [tenants.id]
	}),
}));

export const roDocumentsRelations = relations(roDocuments, ({one}) => ({
	tenant: one(tenants, {
		fields: [roDocuments.tenantId],
		references: [tenants.id]
	}),
}));

export const roFilesRelations = relations(roFiles, ({one}) => ({
	tenant: one(tenants, {
		fields: [roFiles.tenantId],
		references: [tenants.id]
	}),
}));

export const roImportsRelations = relations(roImports, ({one}) => ({
	tenant: one(tenants, {
		fields: [roImports.tenantId],
		references: [tenants.id]
	}),
}));

export const roLocksRelations = relations(roLocks, ({one}) => ({
	tenant: one(tenants, {
		fields: [roLocks.tenantId],
		references: [tenants.id]
	}),
}));

export const roRequestsRelations = relations(roRequests, ({one}) => ({
	tenant: one(tenants, {
		fields: [roRequests.tenantId],
		references: [tenants.id]
	}),
}));

export const roStaffRecordsRelations = relations(roStaffRecords, ({one}) => ({
	tenant: one(tenants, {
		fields: [roStaffRecords.tenantId],
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

export const secAppointmentsRelations = relations(secAppointments, ({one}) => ({
	tenant: one(tenants, {
		fields: [secAppointments.tenantId],
		references: [tenants.id]
	}),
}));

export const secCleanupRunsRelations = relations(secCleanupRuns, ({one}) => ({
	tenant: one(tenants, {
		fields: [secCleanupRuns.tenantId],
		references: [tenants.id]
	}),
}));

export const secDocumentsRelations = relations(secDocuments, ({one}) => ({
	tenant: one(tenants, {
		fields: [secDocuments.tenantId],
		references: [tenants.id]
	}),
}));

export const secNoticesRelations = relations(secNotices, ({one}) => ({
	tenant: one(tenants, {
		fields: [secNotices.tenantId],
		references: [tenants.id]
	}),
}));

export const secOcrScansRelations = relations(secOcrScans, ({one}) => ({
	tenant: one(tenants, {
		fields: [secOcrScans.tenantId],
		references: [tenants.id]
	}),
}));

export const secRenewalsRelations = relations(secRenewals, ({one}) => ({
	tenant: one(tenants, {
		fields: [secRenewals.tenantId],
		references: [tenants.id]
	}),
}));

export const secTicketsRelations = relations(secTickets, ({one}) => ({
	tenant: one(tenants, {
		fields: [secTickets.tenantId],
		references: [tenants.id]
	}),
}));

export const simulationsRelations = relations(simulations, ({one}) => ({
	tenant: one(tenants, {
		fields: [simulations.tenantId],
		references: [tenants.id]
	}),
}));

export const skAlertsRelations = relations(skAlerts, ({one}) => ({
	tenant: one(tenants, {
		fields: [skAlerts.tenantId],
		references: [tenants.id]
	}),
}));

export const skAssetsRelations = relations(skAssets, ({one}) => ({
	tenant: one(tenants, {
		fields: [skAssets.tenantId],
		references: [tenants.id]
	}),
}));

export const skDisposalsRelations = relations(skDisposals, ({one}) => ({
	tenant: one(tenants, {
		fields: [skDisposals.tenantId],
		references: [tenants.id]
	}),
}));

export const skLoansRelations = relations(skLoans, ({one}) => ({
	tenant: one(tenants, {
		fields: [skLoans.tenantId],
		references: [tenants.id]
	}),
}));

export const skPurchaseRequestsRelations = relations(skPurchaseRequests, ({one}) => ({
	tenant: one(tenants, {
		fields: [skPurchaseRequests.tenantId],
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

export const stCommendationsRelations = relations(stCommendations, ({one}) => ({
	tenant: one(tenants, {
		fields: [stCommendations.tenantId],
		references: [tenants.id]
	}),
}));

export const stDocumentRequestsRelations = relations(stDocumentRequests, ({one}) => ({
	tenant: one(tenants, {
		fields: [stDocumentRequests.tenantId],
		references: [tenants.id]
	}),
}));

export const stTaskWorkRelations = relations(stTaskWork, ({one}) => ({
	tenant: one(tenants, {
		fields: [stTaskWork.tenantId],
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

export const supportTicketsRelations = relations(supportTickets, ({one}) => ({
	tenant: one(tenants, {
		fields: [supportTickets.tenantId],
		references: [tenants.id]
	}),
}));

export const systemSettingsRelations = relations(systemSettings, ({one}) => ({
	tenant: one(tenants, {
		fields: [systemSettings.tenantId],
		references: [tenants.id]
	}),
}));

export const tcBookRecommendationsRelations = relations(tcBookRecommendations, ({one}) => ({
	tenant: one(tenants, {
		fields: [tcBookRecommendations.tenantId],
		references: [tenants.id]
	}),
}));

export const tcExamStandardsRelations = relations(tcExamStandards, ({one}) => ({
	tenant: one(tenants, {
		fields: [tcExamStandards.tenantId],
		references: [tenants.id]
	}),
}));

export const tcGradeReviewsRelations = relations(tcGradeReviews, ({one}) => ({
	tenant: one(tenants, {
		fields: [tcGradeReviews.tenantId],
		references: [tenants.id]
	}),
}));

export const tcIncidentsRelations = relations(tcIncidents, ({one}) => ({
	tenant: one(tenants, {
		fields: [tcIncidents.tenantId],
		references: [tenants.id]
	}),
}));

export const tcLeaveRequestsRelations = relations(tcLeaveRequests, ({one}) => ({
	tenant: one(tenants, {
		fields: [tcLeaveRequests.tenantId],
		references: [tenants.id]
	}),
}));

export const tcPapersRelations = relations(tcPapers, ({one}) => ({
	tenant: one(tenants, {
		fields: [tcPapers.tenantId],
		references: [tenants.id]
	}),
}));

export const tcPaperItemsRelations = relations(tcPaperItems, ({one}) => ({
	tenant: one(tenants, {
		fields: [tcPaperItems.tenantId],
		references: [tenants.id]
	}),
}));

export const tcParticipationRelations = relations(tcParticipation, ({one}) => ({
	tenant: one(tenants, {
		fields: [tcParticipation.tenantId],
		references: [tenants.id]
	}),
}));

export const tcPerformanceRelations = relations(tcPerformance, ({one}) => ({
	tenant: one(tenants, {
		fields: [tcPerformance.tenantId],
		references: [tenants.id]
	}),
}));

export const tcPerformanceScoresRelations = relations(tcPerformanceScores, ({one}) => ({
	tenant: one(tenants, {
		fields: [tcPerformanceScores.tenantId],
		references: [tenants.id]
	}),
}));

export const tcQuestionsRelations = relations(tcQuestions, ({one}) => ({
	tenant: one(tenants, {
		fields: [tcQuestions.tenantId],
		references: [tenants.id]
	}),
}));

export const tcRequisitionsRelations = relations(tcRequisitions, ({one}) => ({
	tenant: one(tenants, {
		fields: [tcRequisitions.tenantId],
		references: [tenants.id]
	}),
}));

export const tcSubstitutionsRelations = relations(tcSubstitutions, ({one}) => ({
	tenant: one(tenants, {
		fields: [tcSubstitutions.tenantId],
		references: [tenants.id]
	}),
}));

export const tcSwapsRelations = relations(tcSwaps, ({one}) => ({
	tenant: one(tenants, {
		fields: [tcSwaps.tenantId],
		references: [tenants.id]
	}),
}));

export const tcTopicCoverageRelations = relations(tcTopicCoverage, ({one}) => ({
	tenant: one(tenants, {
		fields: [tcTopicCoverage.tenantId],
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

export const vpExamSessionsRelations = relations(vpExamSessions, ({one}) => ({
	tenant: one(tenants, {
		fields: [vpExamSessions.tenantId],
		references: [tenants.id]
	}),
}));

export const vpHearingsRelations = relations(vpHearings, ({one}) => ({
	tenant: one(tenants, {
		fields: [vpHearings.tenantId],
		references: [tenants.id]
	}),
}));

export const vpInvigilatorsRelations = relations(vpInvigilators, ({one}) => ({
	tenant: one(tenants, {
		fields: [vpInvigilators.tenantId],
		references: [tenants.id]
	}),
}));

export const vpPenaltiesRelations = relations(vpPenalties, ({one}) => ({
	tenant: one(tenants, {
		fields: [vpPenalties.tenantId],
		references: [tenants.id]
	}),
}));

export const vpPlacementsRelations = relations(vpPlacements, ({one}) => ({
	tenant: one(tenants, {
		fields: [vpPlacements.tenantId],
		references: [tenants.id]
	}),
}));

export const vpProgramsRelations = relations(vpPrograms, ({one}) => ({
	tenant: one(tenants, {
		fields: [vpPrograms.tenantId],
		references: [tenants.id]
	}),
}));

export const vpReferralsRelations = relations(vpReferrals, ({one}) => ({
	tenant: one(tenants, {
		fields: [vpReferrals.tenantId],
		references: [tenants.id]
	}),
}));
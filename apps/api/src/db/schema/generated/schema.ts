import { mysqlTable, mysqlSchema, AnyMySqlColumn, index, foreignKey, int, varchar, text, date, mysqlEnum, timestamp, datetime, decimal, unique, time, longtext, float, char, tinyint, bigint } from "drizzle-orm/mysql-core"
import { sql } from "drizzle-orm"

export const accountTypes = mysqlTable("account_types", {
	typeId: int("type_id").autoincrement().notNull(),
	tenantId: int("tenant_id").notNull().references(() => tenants.id, { onDelete: "restrict", onUpdate: "restrict" } ),
	typeName: varchar("type_name", { length: 120 }).notNull(),
	codePrefix: varchar("code_prefix", { length: 10 }),
},
(table) => [
	index("idx_account_types_tenant_id").on(table.tenantId),
]);

export const adminTasks = mysqlTable("admin_tasks", {
	id: int().autoincrement().notNull(),
	taskName: varchar("task_name", { length: 255 }).notNull(),
	taskDescription: text("task_description"),
	assignedTo: varchar("assigned_to", { length: 100 }),
	// you can use { mode: 'date' }, if you want to have Date as type for this column
	dueDate: date("due_date", { mode: 'string' }),
	status: mysqlEnum(['Pending','In Progress','Completed','Cancelled']).default('Pending'),
	createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	tenantId: int("tenant_id").notNull().references(() => tenants.id, { onDelete: "restrict", onUpdate: "restrict" } ),
},
(table) => [
	index("idx_admin_tasks_tenant_id").on(table.tenantId),
]);

export const announcements = mysqlTable("announcements", {
	announcementId: int("announcement_id").autoincrement().notNull(),
	title: varchar({ length: 255 }).notNull(),
	content: text().notNull(),
	targetRole: mysqlEnum("target_role", ['All','Staff','Students','Parents','Admin_Only']).default('All').notNull(),
	// you can use { mode: 'date' }, if you want to have Date as type for this column
	startDate: date("start_date", { mode: 'string' }).notNull(),
	// you can use { mode: 'date' }, if you want to have Date as type for this column
	endDate: date("end_date", { mode: 'string' }),
	isUrgent: tinyint("is_urgent").default(0),
	postedBy: int("posted_by"),
	postedAt: timestamp("posted_at", { mode: 'string' }).default('CURRENT_TIMESTAMP'),
	tenantId: int("tenant_id").notNull().references(() => tenants.id, { onDelete: "restrict", onUpdate: "restrict" } ),
},
(table) => [
	index("idx_announcements_tenant_id").on(table.tenantId),
]);

export const annualLessonPlan = mysqlTable("annual_lesson_plan", {
	planDetailId: int("plan_detail_id").autoincrement().notNull(),
	staffId: int("staff_id").notNull(),
	subjectId: int("subject_id").notNull(),
	gradeLevel: int("grade_level").notNull(),
	academicYear: varchar("academic_year", { length: 10 }).notNull(),
	weekNumber: int("week_number").notNull(),
	topicTitle: varchar("topic_title", { length: 255 }).notNull(),
	learningObjectives: text("learning_objectives"),
	assignedBy: int("assigned_by"),
	status: mysqlEnum(['Draft','Approved']).default('Draft').notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP'),
	tenantId: int("tenant_id").notNull().references(() => tenants.id, { onDelete: "restrict", onUpdate: "restrict" } ),
},
(table) => [
	index("idx_annual_lesson_plan_tenant_id").on(table.tenantId),
]);

export const assignmentSubmissions = mysqlTable("assignment_submissions", {
	submissionId: int("submission_id").autoincrement().notNull(),
	assignmentId: int("assignment_id").notNull(),
	studentId: int("student_id").notNull(),
	submissionDate: datetime("submission_date", { mode: 'string'}).default('CURRENT_TIMESTAMP'),
	filePath: varchar("file_path", { length: 255 }),
	status: mysqlEnum(['Pending','Graded']).default('Pending'),
	tenantId: int("tenant_id").notNull().references(() => tenants.id, { onDelete: "restrict", onUpdate: "restrict" } ),
},
(table) => [
	index("idx_assignment_submissions_tenant_id").on(table.tenantId),
]);

export const attendance = mysqlTable("attendance", {
	attId: int("att_id").autoincrement().notNull(),
	studentId: int("student_id").notNull(),
	// you can use { mode: 'date' }, if you want to have Date as type for this column
	date: date({ mode: 'string' }).notNull(),
	status: mysqlEnum(['P','A','T']).notNull(),
	approvalStatus: mysqlEnum("approval_status", ['Pending','Approved','Rejected']).default('Pending').notNull(),
	approvedBy: int("approved_by"),
	approvalDate: datetime("approval_date", { mode: 'string'}),
	rejectionReason: text("rejection_reason"),
	recordedBy: int("recorded_by").notNull(),
	subjectId: int("subject_id"),
	tenantId: int("tenant_id").notNull().references(() => tenants.id, { onDelete: "restrict", onUpdate: "restrict" } ),
},
(table) => [
	index("idx_attendance_tenant_id").on(table.tenantId),
]);

export const auditLog = mysqlTable("audit_log", {
	logId: int("log_id").autoincrement().notNull(),
	userId: int("user_id").notNull(),
	actionType: varchar("action_type", { length: 100 }).notNull(),
	description: text(),
	timestamp: datetime({ mode: 'string'}).default('CURRENT_TIMESTAMP').notNull(),
	tenantId: int("tenant_id").notNull().references(() => tenants.id, { onDelete: "restrict", onUpdate: "restrict" } ),
},
(table) => [
	index("idx_audit_log_tenant_id").on(table.tenantId),
]);

export const backupRuns = mysqlTable("backup_runs", {
	runId: int("run_id").autoincrement().notNull(),
	tenantId: int("tenant_id").notNull().references(() => tenants.id, { onDelete: "restrict", onUpdate: "restrict" } ),
	action: mysqlEnum(['backup','restore']).notNull(),
	status: mysqlEnum(['checked','blocked']).notNull(),
	note: varchar({ length: 255 }),
	recordedBy: int("recorded_by").notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
},
(table) => [
	index("idx_backup_runs_tenant_id").on(table.tenantId),
]);

export const binCardLedger = mysqlTable("bin_card_ledger", {
	ledgerId: int("ledger_id").autoincrement().notNull(),
	tenantId: int("tenant_id").notNull().references(() => tenants.id, { onDelete: "restrict", onUpdate: "restrict" } ),
	itemId: int("item_id").notNull(),
	// you can use { mode: 'date' }, if you want to have Date as type for this column
	transactionDate: date("transaction_date", { mode: 'string' }).notNull(),
	referenceDocument: varchar("reference_document", { length: 100 }),
	receivedQty: decimal("received_qty", { precision: 12, scale: 2 }).default('0.00').notNull(),
	issuedQty: decimal("issued_qty", { precision: 12, scale: 2 }).default('0.00').notNull(),
	balanceQty: decimal("balance_qty", { precision: 12, scale: 2 }).default('0.00').notNull(),
	remark: varchar({ length: 255 }),
},
(table) => [
	index("idx_bin_card_ledger_tenant_id").on(table.tenantId),
	index("idx_bin_card_ledger_item").on(table.tenantId, table.itemId, table.ledgerId),
]);

export const budgetNotifications = mysqlTable("budget_notifications", {
	notificationId: int("notification_id").autoincrement().notNull(),
	tenantId: int("tenant_id").notNull().references(() => tenants.id, { onDelete: "restrict", onUpdate: "restrict" } ),
	fiscalYear: varchar("fiscal_year", { length: 10 }).notNull(),
	letterRefNo: varchar("letter_ref_no", { length: 100 }).notNull(),
	// you can use { mode: 'date' }, if you want to have Date as type for this column
	notificationDate: date("notification_date", { mode: 'string' }).notNull(),
	publicBodyCodeId: int("public_body_code_id").notNull(),
	programCodeId: int("program_code_id").notNull(),
	subProgramCodeId: int("sub_program_code_id"),
	projectCodeId: int("project_code_id"),
	recordedBy: int("recorded_by"),
},
(table) => [
	index("idx_budget_notifications_tenant_id").on(table.tenantId),
]);

export const budgetNotificationItems = mysqlTable("budget_notification_items", {
	itemId: int("item_id").autoincrement().notNull(),
	tenantId: int("tenant_id").notNull().references(() => tenants.id, { onDelete: "restrict", onUpdate: "restrict" } ),
	notificationId: int("notification_id").notNull().references(() => budgetNotifications.notificationId, { onDelete: "restrict", onUpdate: "restrict" } ),
	accountCodeId: int("account_code_id").notNull(),
	treasuryAmount: decimal("treasury_amount", { precision: 15, scale: 2 }).default('0.00').notNull(),
	retainedRevenueAmount: decimal("retained_revenue_amount", { precision: 15, scale: 2 }).default('0.00').notNull(),
	assistanceAmount: decimal("assistance_amount", { precision: 15, scale: 2 }).default('0.00').notNull(),
	loanAmount: decimal("loan_amount", { precision: 15, scale: 2 }).default('0.00').notNull(),
},
(table) => [
	index("idx_budget_notification_items_tenant_id").on(table.tenantId),
	index("idx_budget_notification_items_notice").on(table.notificationId),
]);

export const classes = mysqlTable("classes", {
	classId: int("class_id").autoincrement().notNull(),
	gradeLevel: int("grade_level").notNull(),
	stream: mysqlEnum(['Natural','Social']),
	section: varchar({ length: 10 }).notNull(),
	classTeacherId: int("class_teacher_id"),
	maxCapacity: int("max_capacity").default(59),
	tenantId: int("tenant_id").notNull().references(() => tenants.id, { onDelete: "restrict", onUpdate: "restrict" } ),
},
(table) => [
	index("idx_classes_tenant_id").on(table.tenantId),
	unique("uq_classes_tenant_grade_section_stream").on(table.tenantId, table.gradeLevel, table.section, table.stream),
]);

export const classSchedule = mysqlTable("class_schedule", {
	timetableId: int("timetable_id").autoincrement().notNull(),
	academicYear: varchar("academic_year", { length: 10 }).notNull(),
	dayOfWeek: mysqlEnum("day_of_week", ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday']).notNull(),
	periodNumber: int("period_number").notNull(),
	startTime: time("start_time").notNull(),
	endTime: time("end_time").notNull(),
	classId: int("class_id").notNull(),
	subjectId: int("subject_id"),
	teacherStaffId: int("teacher_staff_id"),
	type: mysqlEnum(['Class','Exam']).default('Class').notNull(),
	createdBy: int("created_by"),
	tenantId: int("tenant_id").notNull().references(() => tenants.id, { onDelete: "restrict", onUpdate: "restrict" } ),
},
(table) => [
	index("idx_class_schedule_tenant_id").on(table.tenantId),
]);

export const committeesClubs = mysqlTable("committees_clubs", {
	structureId: int("structure_id").autoincrement().notNull(),
	name: varchar({ length: 150 }).notNull(),
	type: mysqlEnum(['Committee','Club']).notNull(),
	description: text(),
	year: varchar({ length: 10 }),
	isActive: tinyint("is_active").default(1).notNull(),
	createdBy: int("created_by"),
	tenantId: int("tenant_id").notNull().references(() => tenants.id, { onDelete: "restrict", onUpdate: "restrict" } ),
},
(table) => [
	index("idx_committees_clubs_tenant_id").on(table.tenantId),
	unique("uq_committees_clubs_tenant_name").on(table.tenantId, table.name),
]);

export const committeeMembers = mysqlTable("committee_members", {
	memberId: int("member_id").autoincrement().notNull(),
	structureId: int("structure_id").notNull(),
	staffId: int("staff_id"),
	studentId: int("student_id"),
	parentPgId: int("parent_pg_id"),
	roleInStructure: varchar("role_in_structure", { length: 100 }),
	tenantId: int("tenant_id").notNull().references(() => tenants.id, { onDelete: "restrict", onUpdate: "restrict" } ),
},
(table) => [
	index("idx_committee_members_tenant_id").on(table.tenantId),
]);

export const communicationGroups = mysqlTable("communication_groups", {
	groupId: int("group_id").autoincrement().notNull(),
	groupName: varchar("group_name", { length: 255 }).notNull(),
	groupType: mysqlEnum("group_type", ['Class_Section','Adhoc_Project','Staff_Only','Private_Chat']).default('Class_Section').notNull(),
	createdByStaffId: int("created_by_staff_id").notNull(),
	isActive: tinyint("is_active").default(1).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP'),
	tenantId: int("tenant_id").notNull().references(() => tenants.id, { onDelete: "restrict", onUpdate: "restrict" } ),
},
(table) => [
	index("idx_communication_groups_tenant_id").on(table.tenantId),
]);

export const departmentHeads = mysqlTable("department_heads", {
	headId: int("head_id").autoincrement().notNull(),
	tenantId: int("tenant_id").notNull().references(() => tenants.id, { onDelete: "restrict", onUpdate: "restrict" } ),
	staffId: int("staff_id").notNull(),
	department: mysqlEnum(['Languages','Mathematics','Natural Science','Social Science','Aesthetics','Vocational','Physical Education']).notNull(),
	academicYear: varchar("academic_year", { length: 10 }).notNull(),
},
(table) => [
	index("idx_department_heads_tenant_id").on(table.tenantId),
	unique("uq_department_heads_tenant_dept_year").on(table.tenantId, table.department, table.academicYear),
]);

export const evaluationCriteria = mysqlTable("evaluation_criteria", {
	criteriaId: int("criteria_id").autoincrement().notNull(),
	source: varchar({ length: 50 }).notNull(),
	academicYear: varchar("academic_year", { length: 10 }).notNull(),
	categoryTitle: varchar("category_title", { length: 100 }).notNull(),
	description: text().notNull(),
	maxScore: decimal("max_score", { precision: 4, scale: 2 }).notNull(),
	isActive: tinyint("is_active").default(1),
	createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP'),
	tenantId: int("tenant_id").notNull().references(() => tenants.id, { onDelete: "restrict", onUpdate: "restrict" } ),
},
(table) => [
	index("idx_evaluation_criteria_tenant_id").on(table.tenantId),
]);

export const evaluationDetails = mysqlTable("evaluation_details", {
	detailId: int("detail_id").autoincrement().notNull(),
	evaluationId: int("evaluation_id").notNull(),
	criteriaCategory: varchar("criteria_category", { length: 100 }).notNull(),
	criteriaDescription: text("criteria_description").notNull(),
	maxScore: decimal("max_score", { precision: 5, scale: 2 }).notNull(),
	scoreGiven: decimal("score_given", { precision: 5, scale: 2 }).notNull(),
	notes: text(),
	tenantId: int("tenant_id").notNull().references(() => tenants.id, { onDelete: "restrict", onUpdate: "restrict" } ),
},
(table) => [
	index("idx_evaluation_details_tenant_id").on(table.tenantId),
]);

export const examQuestions = mysqlTable("exam_questions", {
	questionId: int("question_id").autoincrement().notNull(),
	examId: int("exam_id").notNull().references(() => onlineExams.examId, { onDelete: "cascade", onUpdate: "restrict" } ),
	questionText: longtext("question_text"),
	optionA: longtext("option_a"),
	optionB: longtext("option_b"),
	optionC: longtext("option_c"),
	optionD: longtext("option_d"),
	correctOption: mysqlEnum("correct_option", ['A','B','C','D']).notNull(),
	point: decimal({ precision: 4, scale: 2 }).default('1.00'),
	points: float().default(1),
	tenantId: int("tenant_id").notNull().references(() => tenants.id, { onDelete: "restrict", onUpdate: "restrict" } ),
},
(table) => [
	index("exam_id").on(table.examId),
	index("idx_exam_questions_tenant_id").on(table.tenantId),
]);

export const examResultsOnline = mysqlTable("exam_results_online", {
	id: int().autoincrement().notNull(),
	examId: int("exam_id").notNull().references(() => onlineExams.examId, { onDelete: "cascade", onUpdate: "restrict" } ),
	studentId: int("student_id").notNull().references(() => students.studentId, { onDelete: "cascade", onUpdate: "restrict" } ),
	totalScore: decimal("total_score", { precision: 5, scale: 2 }).notNull(),
	submittedAt: datetime("submitted_at", { mode: 'string'}).default('CURRENT_TIMESTAMP'),
	tenantId: int("tenant_id").notNull().references(() => tenants.id, { onDelete: "restrict", onUpdate: "restrict" } ),
},
(table) => [
	index("exam_id").on(table.examId),
	index("student_id").on(table.studentId),
	index("idx_exam_results_online_tenant_id").on(table.tenantId),
]);

export const expenses = mysqlTable("expenses", {
	expenseId: int("expense_id").autoincrement().notNull(),
	category: varchar({ length: 100 }).notNull(),
	amount: decimal({ precision: 10, scale: 2 }).notNull(),
	// you can use { mode: 'date' }, if you want to have Date as type for this column
	datePaid: date("date_paid", { mode: 'string' }).notNull(),
	description: text(),
	authorizedBy: int("authorized_by"),
	recordedBy: int("recorded_by"),
	tenantId: int("tenant_id").notNull().references(() => tenants.id, { onDelete: "restrict", onUpdate: "restrict" } ),
},
(table) => [
	index("idx_expenses_tenant_id").on(table.tenantId),
]);

export const externalInquiries = mysqlTable("external_inquiries", {
	id: int().autoincrement().notNull(),
	senderName: varchar("sender_name", { length: 100 }).notNull(),
	senderEmail: varchar("sender_email", { length: 255 }),
	orgName: varchar("org_name", { length: 100 }),
	email: varchar({ length: 100 }),
	phone: varchar({ length: 20 }),
	subject: varchar({ length: 200 }),
	message: text(),
	status: mysqlEnum(['New','Read','Responded']).default('New'),
	createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP'),
	tenantId: int("tenant_id").notNull().references(() => tenants.id, { onDelete: "restrict", onUpdate: "restrict" } ),
},
(table) => [
	index("idx_external_inquiries_tenant_id").on(table.tenantId),
]);

export const fileShares = mysqlTable("file_shares", {
	shareId: int("share_id").autoincrement().notNull(),
	fileId: int("file_id").notNull(),
	classId: int("class_id").notNull(),
	senderId: int("sender_id").notNull(),
	sharedAt: timestamp("shared_at", { mode: 'string' }).default('CURRENT_TIMESTAMP'),
	tenantId: int("tenant_id").notNull().references(() => tenants.id, { onDelete: "restrict", onUpdate: "restrict" } ),
},
(table) => [
	index("idx_file_shares_tenant_id").on(table.tenantId),
]);

export const financeCodes = mysqlTable("finance_codes", {
	codeId: int("code_id").autoincrement().notNull(),
	tenantId: int("tenant_id").notNull().references(() => tenants.id, { onDelete: "restrict", onUpdate: "restrict" } ),
	typeId: int("type_id").notNull().references(() => accountTypes.typeId, { onDelete: "restrict", onUpdate: "restrict" } ),
	codeNumber: varchar("code_number", { length: 50 }).notNull(),
	codeNameAm: varchar("code_name_am", { length: 255 }).notNull(),
	codeNameEn: varchar("code_name_en", { length: 255 }),
	isActive: tinyint("is_active").default(1).notNull(),
},
(table) => [
	index("idx_finance_codes_tenant_id").on(table.tenantId),
	index("idx_finance_codes_tenant_type").on(table.tenantId, table.typeId),
]);

export const foreignPartners = mysqlTable("foreign_partners", {
	partnerId: int("partner_id").autoincrement().notNull(),
	organizationName: varchar("organization_name", { length: 255 }).notNull(),
	contactPerson: varchar("contact_person", { length: 150 }),
	contactEmail: varchar("contact_email", { length: 150 }),
	contactPhone: varchar("contact_phone", { length: 50 }),
	typeOfPartnership: mysqlEnum("type_of_partnership", ['NGO','School','Government','Private_Sector','Other']).notNull(),
	// you can use { mode: 'date' }, if you want to have Date as type for this column
	startDate: date("start_date", { mode: 'string' }),
	// you can use { mode: 'date' }, if you want to have Date as type for this column
	endDate: date("end_date", { mode: 'string' }),
	status: mysqlEnum(['Active','Inactive','Negotiation']).default('Active'),
	description: text(),
	managedBy: int("managed_by"),
	tenantId: int("tenant_id").notNull().references(() => tenants.id, { onDelete: "restrict", onUpdate: "restrict" } ),
},
(table) => [
	index("idx_foreign_partners_tenant_id").on(table.tenantId),
]);

export const grades = mysqlTable("grades", {
	gradeEntryId: int("grade_entry_id").autoincrement().notNull(),
	studentId: int("student_id").notNull(),
	subjectId: int("subject_id").notNull(),
	semester: mysqlEnum(['1','2']).notNull(),
	score: decimal({ precision: 5, scale: 2 }).notNull(),
	maxScore: decimal("max_score", { precision: 5, scale: 2 }).default('100.00'),
	weightingType: varchar("weighting_type", { length: 50 }).notNull(),
	assessmentName: varchar("assessment_name", { length: 100 }),
	academicYear: varchar("academic_year", { length: 10 }).notNull(),
	recordedBy: int("recorded_by"),
	isSubmitted: tinyint("is_submitted").default(0),
	adminApproved: tinyint("admin_approved").default(0),
	registrarAccepted: tinyint("registrar_accepted").default(0),
	submissionStatus: mysqlEnum("submission_status", ['Draft','Submitted','Approved','Accepted']).default('Draft'),
	status: mysqlEnum(['Complete','Incomplete','Absent']).default('Complete'),
	tenantId: int("tenant_id").notNull().references(() => tenants.id, { onDelete: "restrict", onUpdate: "restrict" } ),
},
(table) => [
	index("idx_grades_tenant_id").on(table.tenantId),
]);

export const groupsInfo = mysqlTable("groups_info", {
	groupId: int("group_id").autoincrement().notNull(),
	groupName: varchar("group_name", { length: 100 }).notNull(),
	teacherId: int("teacher_id").notNull().references(() => users.userId, { onDelete: "restrict", onUpdate: "restrict" } ),
	subjectId: int("subject_id").notNull().references(() => subjects.subjectId, { onDelete: "restrict", onUpdate: "restrict" } ),
	gradeLevel: int("grade_level").notNull(),
	section: varchar({ length: 10 }).notNull(),
	academicYear: varchar("academic_year", { length: 10 }).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP'),
	isOnline: tinyint("is_online").default(0),
	tenantId: int("tenant_id").notNull().references(() => tenants.id, { onDelete: "restrict", onUpdate: "restrict" } ),
},
(table) => [
	index("teacher_id").on(table.teacherId),
	index("subject_id").on(table.subjectId),
	index("idx_groups_info_tenant_id").on(table.tenantId),
]);

export const groupChats = mysqlTable("group_chats", {
	chatId: int("chat_id").autoincrement().notNull(),
	groupId: int("group_id").notNull().references(() => groupsInfo.groupId, { onDelete: "cascade", onUpdate: "restrict" } ),
	userId: int("user_id").notNull(),
	message: text(),
	filePath: varchar("file_path", { length: 255 }),
	fileType: mysqlEnum("file_type", ['text','image','video','pdf','other']).default('text'),
	sentAt: timestamp("sent_at", { mode: 'string' }).default('CURRENT_TIMESTAMP'),
	isRead: tinyint("is_read").default(0),
	tenantId: int("tenant_id").notNull().references(() => tenants.id, { onDelete: "restrict", onUpdate: "restrict" } ),
},
(table) => [
	index("group_id").on(table.groupId),
	index("idx_group_chats_tenant_id").on(table.tenantId),
]);

export const groupMembers = mysqlTable("group_members", {
	id: int().autoincrement().notNull(),
	groupId: int("group_id").notNull().references(() => groupsInfo.groupId, { onDelete: "cascade", onUpdate: "restrict" } ),
	studentId: int("student_id").notNull().references(() => students.studentId, { onDelete: "restrict", onUpdate: "restrict" } ),
	isLeader: tinyint("is_leader").default(0),
	isTyping: tinyint("is_typing").default(0),
	tenantId: int("tenant_id").notNull().references(() => tenants.id, { onDelete: "restrict", onUpdate: "restrict" } ),
},
(table) => [
	index("student_id").on(table.studentId),
	index("idx_group_members_tenant_id").on(table.tenantId),
]);

export const groupMessages = mysqlTable("group_messages", {
	messageId: int("message_id").autoincrement().notNull(),
	groupId: int("group_id").notNull(),
	senderUserId: int("sender_user_id").notNull(),
	messageContent: text("message_content"),
	filePath: varchar("file_path", { length: 255 }),
	fileName: varchar("file_name", { length: 255 }),
	fileType: varchar("file_type", { length: 50 }),
	sentAt: timestamp("sent_at", { mode: 'string' }).default('CURRENT_TIMESTAMP'),
	tenantId: int("tenant_id").notNull().references(() => tenants.id, { onDelete: "restrict", onUpdate: "restrict" } ),
},
(table) => [
	index("idx_group_messages_tenant_id").on(table.tenantId),
]);

export const groupResponses = mysqlTable("group_responses", {
	resId: int("res_id").autoincrement().notNull(),
	examId: bigint("exam_id", { mode: "number" }),
	questionId: int("question_id"),
	groupName: varchar("group_name", { length: 100 }),
	submittedAnswer: char("submitted_answer", { length: 1 }),
	isCorrect: tinyint("is_correct"),
	timeTaken: int("time_taken"),
	pointsEarned: int("points_earned"),
	submittedAt: timestamp("submitted_at", { mode: 'string' }).default('CURRENT_TIMESTAMP'),
	tenantId: int("tenant_id").notNull().references(() => tenants.id, { onDelete: "restrict", onUpdate: "restrict" } ),
},
(table) => [
	index("idx_group_responses_tenant_id").on(table.tenantId),
]);

export const groupSubmissions = mysqlTable("group_submissions", {
	submissionId: int("submission_id").autoincrement().notNull(),
	taskId: int("task_id").notNull().references(() => groupTasks.taskId, { onDelete: "restrict", onUpdate: "restrict" } ),
	groupId: int("group_id").notNull().references(() => studentGroups.groupId, { onDelete: "restrict", onUpdate: "restrict" } ),
	submittedFile: varchar("submitted_file", { length: 255 }),
	status: mysqlEnum(['Pending','Graded']).default('Pending'),
	submissionText: text("submission_text"),
	earnedScore: decimal("earned_score", { precision: 5, scale: 2 }).default('0.00'),
	teacherFeedback: text("teacher_feedback"),
	submittedAt: timestamp("submitted_at", { mode: 'string' }).default('CURRENT_TIMESTAMP'),
	gradePoints: decimal("grade_points", { precision: 5, scale: 2 }),
	feedback: text(),
	gradedAt: timestamp("graded_at", { mode: 'string' }),
	tenantId: int("tenant_id").notNull().references(() => tenants.id, { onDelete: "restrict", onUpdate: "restrict" } ),
},
(table) => [
	index("task_id").on(table.taskId),
	index("group_id").on(table.groupId),
	index("idx_group_submissions_tenant_id").on(table.tenantId),
]);

export const groupTasks = mysqlTable("group_tasks", {
	taskId: int("task_id").autoincrement().notNull(),
	groupId: int("group_id"),
	teacherId: int("teacher_id").notNull().references(() => users.userId, { onDelete: "restrict", onUpdate: "restrict" } ),
	subjectId: int("subject_id").notNull().references(() => subjects.subjectId, { onDelete: "restrict", onUpdate: "restrict" } ),
	taskTitle: varchar("task_title", { length: 255 }).notNull(),
	taskDescription: text("task_description"),
	fileAttachment: varchar("file_attachment", { length: 255 }),
	maxScore: decimal("max_score", { precision: 5, scale: 2 }).default('10.00'),
	deadline: datetime({ mode: 'string'}),
	createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP'),
	tenantId: int("tenant_id").notNull().references(() => tenants.id, { onDelete: "restrict", onUpdate: "restrict" } ),
},
(table) => [
	index("teacher_id").on(table.teacherId),
	index("subject_id").on(table.subjectId),
	index("idx_group_tasks_tenant_id").on(table.tenantId),
]);

export const income = mysqlTable("income", {
	incomeId: int("income_id").autoincrement().notNull(),
	source: varchar({ length: 100 }).notNull(),
	amount: decimal({ precision: 10, scale: 2 }).notNull(),
	// you can use { mode: 'date' }, if you want to have Date as type for this column
	dateReceived: date("date_received", { mode: 'string' }).notNull(),
	recordedBy: int("recorded_by"),
	tenantId: int("tenant_id").notNull().references(() => tenants.id, { onDelete: "restrict", onUpdate: "restrict" } ),
},
(table) => [
	index("idx_income_tenant_id").on(table.tenantId),
]);

export const issueModel22 = mysqlTable("issue_model22", {
	issueId: int("issue_id").autoincrement().notNull(),
	tenantId: int("tenant_id").notNull().references(() => tenants.id, { onDelete: "restrict", onUpdate: "restrict" } ),
	requisitionId: int("requisition_id").notNull(),
	itemId: int("item_id").notNull(),
	issueNo: varchar("issue_no", { length: 100 }).notNull(),
	quantityIssued: decimal("quantity_issued", { precision: 12, scale: 2 }).notNull(),
	issuedToStaffId: int("issued_to_staff_id").notNull(),
	issuedByStaffId: int("issued_by_staff_id").notNull(),
	issueDate: timestamp("issue_date", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
},
(table) => [
	index("idx_issue_model22_tenant_id").on(table.tenantId),
]);

export const items = mysqlTable("items", {
	itemId: int("item_id").autoincrement().notNull(),
	tenantId: int("tenant_id").notNull().references(() => tenants.id, { onDelete: "restrict", onUpdate: "restrict" } ),
	itemCode: varchar("item_code", { length: 50 }).notNull(),
	itemName: varchar("item_name", { length: 255 }).notNull(),
	categoryId: int("category_id").references(() => itemCategories.categoryId, { onDelete: "restrict", onUpdate: "restrict" } ),
	modelNo: varchar("model_no", { length: 100 }),
	unitOfMeasure: varchar("unit_of_measure", { length: 50 }).notNull(),
	reorderLevel: int("reorder_level").default(5).notNull(),
	unitCost: decimal("unit_cost", { precision: 12, scale: 2 }).default('0.00').notNull(),
	currentStock: decimal("current_stock", { precision: 12, scale: 2 }).default('0.00').notNull(),
	isPerishable: tinyint("is_perishable").default(0).notNull(),
	// you can use { mode: 'date' }, if you want to have Date as type for this column
	expiryDate: date("expiry_date", { mode: 'string' }),
	defaultStoreNo: varchar("default_store_no", { length: 100 }),
	defaultShelfNo: varchar("default_shelf_no", { length: 100 }),
	specification: text(),
	itemType: varchar("item_type", { length: 30 }),
},
(table) => [
	index("idx_items_tenant_id").on(table.tenantId),
	index("idx_items_category_id").on(table.categoryId),
	unique("uq_items_tenant_code").on(table.tenantId, table.itemCode),
]);

export const itemCategories = mysqlTable("item_categories", {
	categoryId: int("category_id").autoincrement().notNull(),
	tenantId: int("tenant_id").notNull().references(() => tenants.id, { onDelete: "restrict", onUpdate: "restrict" } ),
	categoryCode: varchar("category_code", { length: 50 }).notNull(),
	categoryName: varchar("category_name", { length: 150 }).notNull(),
	description: text(),
},
(table) => [
	index("idx_item_categories_tenant_id").on(table.tenantId),
	unique("uq_item_categories_tenant_code").on(table.tenantId, table.categoryCode),
]);

export const lbBadges = mysqlTable("lb_badges", {
	badgeId: int("badge_id").autoincrement().notNull(),
	tenantId: int("tenant_id").notNull().references(() => tenants.id, { onDelete: "restrict", onUpdate: "restrict" } ),
	userId: int("user_id").notNull(),
	rank: mysqlEnum(['member','scholar']).notNull(),
	points: int().notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
},
(table) => [
	index("idx_lb_badges_tenant_id").on(table.tenantId),
	unique("uq_lb_badges_rank").on(table.tenantId, table.userId, table.rank),
]);

export const lbIntake = mysqlTable("lb_intake", {
	intakeId: int("intake_id").autoincrement().notNull(),
	tenantId: int("tenant_id").notNull().references(() => tenants.id, { onDelete: "restrict", onUpdate: "restrict" } ),
	itemId: int("item_id").notNull(),
	bookId: int("book_id").notNull(),
	copies: int().notNull(),
	recordedBy: int("recorded_by").notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
},
(table) => [
	index("idx_lb_intake_tenant_id").on(table.tenantId),
]);

export const lbLiteracy = mysqlTable("lb_literacy", {
	reportId: int("report_id").autoincrement().notNull(),
	tenantId: int("tenant_id").notNull().references(() => tenants.id, { onDelete: "restrict", onUpdate: "restrict" } ),
	studentId: int("student_id").notNull(),
	academicYear: varchar("academic_year", { length: 10 }).notNull(),
	visits: int().notNull(),
	returnedCount: int("returned_count").notNull(),
	openLoans: int("open_loans").notNull(),
	note: varchar({ length: 500 }).default("").notNull(),
	recordedBy: int("recorded_by").notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
},
(table) => [
	index("idx_lb_literacy_tenant_id").on(table.tenantId),
	unique("uq_lb_literacy_year").on(table.tenantId, table.studentId, table.academicYear),
]);

export const lbPatronLog = mysqlTable("lb_patron_log", {
	logId: int("log_id").autoincrement().notNull(),
	tenantId: int("tenant_id").notNull().references(() => tenants.id, { onDelete: "restrict", onUpdate: "restrict" } ),
	userId: int("user_id").notNull(),
	studentId: int("student_id"),
	action: mysqlEnum(['In','Out']).notNull(),
	bookTitle: varchar("book_title", { length: 255 }).default("").notNull(),
	// you can use { mode: 'date' }, if you want to have Date as type for this column
	loggedOn: date("logged_on", { mode: 'string' }).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
},
(table) => [
	index("idx_lb_patron_log_tenant_id").on(table.tenantId),
	index("idx_lb_patron_log_user").on(table.tenantId, table.userId, table.loggedOn),
]);

export const lbReminders = mysqlTable("lb_reminders", {
	reminderId: int("reminder_id").autoincrement().notNull(),
	tenantId: int("tenant_id").notNull().references(() => tenants.id, { onDelete: "restrict", onUpdate: "restrict" } ),
	borrowId: int("borrow_id").notNull(),
	userId: int("user_id").notNull(),
	kind: mysqlEnum(['due','overdue']).notNull(),
	// you can use { mode: 'date' }, if you want to have Date as type for this column
	dueOn: date("due_on", { mode: 'string' }).notNull(),
	seen: tinyint().default(0).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
},
(table) => [
	index("idx_lb_reminders_tenant_id").on(table.tenantId),
	unique("uq_lb_reminders_borrow").on(table.tenantId, table.borrowId),
]);

export const lbReservations = mysqlTable("lb_reservations", {
	reservationId: int("reservation_id").autoincrement().notNull(),
	tenantId: int("tenant_id").notNull().references(() => tenants.id, { onDelete: "restrict", onUpdate: "restrict" } ),
	bookId: int("book_id").notNull(),
	userId: int("user_id").notNull(),
	status: mysqlEnum(['Open','Ready','Collected','Cancelled']).default('Open').notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
},
(table) => [
	index("idx_lb_reservations_tenant_id").on(table.tenantId),
	index("idx_lb_reservations_book").on(table.tenantId, table.bookId, table.status),
]);

export const lbResources = mysqlTable("lb_resources", {
	resourceId: int("resource_id").autoincrement().notNull(),
	tenantId: int("tenant_id").notNull().references(() => tenants.id, { onDelete: "restrict", onUpdate: "restrict" } ),
	subjectId: int("subject_id"),
	title: varchar({ length: 255 }).notNull(),
	note: varchar({ length: 500 }).default("").notNull(),
	recommendationId: int("recommendation_id"),
	recordedBy: int("recorded_by").notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
},
(table) => [
	index("idx_lb_resources_tenant_id").on(table.tenantId),
	unique("uq_lb_resources_title").on(table.tenantId, table.title),
]);

export const libraryAttendance = mysqlTable("library_attendance", {
	attendanceId: int("attendance_id").autoincrement().notNull(),
	studentId: int("student_id").references(() => students.studentId, { onDelete: "restrict", onUpdate: "restrict" } ),
	// you can use { mode: 'date' }, if you want to have Date as type for this column
	date: date({ mode: 'string' }),
	shift: mysqlEnum(['Regular','Extra_Time']),
	bookTitle: varchar("book_title", { length: 255 }),
	tenantId: int("tenant_id").notNull().references(() => tenants.id, { onDelete: "restrict", onUpdate: "restrict" } ),
},
(table) => [
	index("student_id").on(table.studentId),
	index("idx_library_attendance_tenant_id").on(table.tenantId),
]);

export const libraryBooks = mysqlTable("library_books", {
	bookId: int("book_id").autoincrement().notNull(),
	bookName: varchar("book_name", { length: 255 }).notNull(),
	author: varchar({ length: 255 }),
	publishedYear: varchar("published_year", { length: 10 }),
	pageCount: int("page_count"),
	accessionNumber: varchar("accession_number", { length: 50 }),
	gradeLevel: int("grade_level"),
	subjectId: int("subject_id"),
	quantity: int().default(1),
	// you can use { mode: 'date' }, if you want to have Date as type for this column
	entryDate: date("entry_date", { mode: 'string' }),
	remarks: text(),
	tenantId: int("tenant_id").notNull().references(() => tenants.id, { onDelete: "restrict", onUpdate: "restrict" } ),
},
(table) => [
	index("idx_library_books_tenant_id").on(table.tenantId),
	unique("uq_library_books_tenant_accession_number").on(table.tenantId, table.accessionNumber),
]);

export const libraryBorrowing = mysqlTable("library_borrowing", {
	borrowId: int("borrow_id").autoincrement().notNull(),
	bookId: int("book_id").references(() => libraryBooks.bookId, { onDelete: "restrict", onUpdate: "restrict" } ),
	userId: int("user_id").references(() => users.userId, { onDelete: "restrict", onUpdate: "restrict" } ),
	// you can use { mode: 'date' }, if you want to have Date as type for this column
	borrowDate: date("borrow_date", { mode: 'string' }),
	// you can use { mode: 'date' }, if you want to have Date as type for this column
	returnDate: date("return_date", { mode: 'string' }),
	status: mysqlEnum(['Borrowed','Returned']).default('Borrowed'),
	receiverStaffId: int("receiver_staff_id"),
	tenantId: int("tenant_id").notNull().references(() => tenants.id, { onDelete: "restrict", onUpdate: "restrict" } ),
},
(table) => [
	index("book_id").on(table.bookId),
	index("user_id").on(table.userId),
	index("idx_library_borrowing_tenant_id").on(table.tenantId),
]);

export const libraryHandovers = mysqlTable("library_handovers", {
	handoverId: int("handover_id").autoincrement().notNull(),
	bookId: int("book_id").references(() => libraryBooks.bookId, { onDelete: "restrict", onUpdate: "restrict" } ),
	senderName: varchar("sender_name", { length: 255 }),
	receiverName: varchar("receiver_name", { length: 255 }),
	handoverDate: timestamp("handover_date", { mode: 'string' }).default('CURRENT_TIMESTAMP'),
	witness1: varchar("witness_1", { length: 255 }),
	witness2: varchar("witness_2", { length: 255 }),
	witness3: varchar("witness_3", { length: 255 }),
	tenantId: int("tenant_id").notNull().references(() => tenants.id, { onDelete: "restrict", onUpdate: "restrict" } ),
},
(table) => [
	index("book_id").on(table.bookId),
	index("idx_library_handovers_tenant_id").on(table.tenantId),
]);

export const liveQuizQuestions = mysqlTable("live_quiz_questions", {
	qId: int("q_id").autoincrement().notNull(),
	examId: bigint("exam_id", { mode: "number" }),
	staffId: int("staff_id"),
	subjectId: int("subject_id"),
	gradeLevel: varchar("grade_level", { length: 50 }),
	section: varchar({ length: 50 }),
	questionText: text("question_text").notNull(),
	optionA: text("option_a").notNull(),
	optionB: text("option_b").notNull(),
	optionC: text("option_c"),
	optionD: text("option_d"),
	correctAnswer: char("correct_answer", { length: 1 }).notNull(),
	explanation: text(),
	timeLimit: int("time_limit").default(30),
	points: int().default(1),
	createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP'),
	quizStatus: mysqlEnum("quiz_status", ['waiting','active','finished']).default('waiting'),
	tenantId: int("tenant_id").notNull().references(() => tenants.id, { onDelete: "restrict", onUpdate: "restrict" } ),
},
(table) => [
	index("idx_live_quiz_questions_tenant_id").on(table.tenantId),
]);

export const liveQuizSessions = mysqlTable("live_quiz_sessions", {
	sessionId: int("session_id").autoincrement().notNull(),
	examId: bigint("exam_id", { mode: "number" }),
	currentQuestionId: int("current_question_id").default(0),
	status: mysqlEnum(['waiting','started','finished']).default('waiting'),
	lastUpdated: timestamp("last_updated", { mode: 'string' }).default('CURRENT_TIMESTAMP').onUpdateNow(),
	tenantId: int("tenant_id").notNull().references(() => tenants.id, { onDelete: "restrict", onUpdate: "restrict" } ),
},
(table) => [
	index("idx_live_quiz_sessions_tenant_id").on(table.tenantId),
	unique("exam_id").on(table.examId),
]);

export const loginAttempts = mysqlTable("login_attempts", {
	attemptId: int("attempt_id").autoincrement().notNull(),
	tenantId: int("tenant_id").notNull().references(() => tenants.id, { onDelete: "restrict", onUpdate: "restrict" } ),
	username: varchar({ length: 50 }).notNull(),
	succeeded: tinyint().default(0).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
},
(table) => [
	index("idx_login_attempts_tenant_id").on(table.tenantId),
	index("idx_login_attempts_tenant_time").on(table.tenantId, table.createdAt),
]);

export const mehi161Cards = mysqlTable("mehi_16_1_cards", {
	cardId: int("card_id").autoincrement().notNull(),
	tenantId: int("tenant_id").notNull().references(() => tenants.id, { onDelete: "restrict", onUpdate: "restrict" } ),
	fiscalYear: varchar("fiscal_year", { length: 10 }).notNull(),
	pageNo: varchar("page_no", { length: 20 }).default('1').notNull(),
	publicBodyCodeId: int("public_body_code_id"),
	programCodeId: int("program_code_id"),
	subProgramCodeId: int("sub_program_code_id"),
	projectCodeId: int("project_code_id"),
	subAgencyCodeId: int("sub_agency_code_id"),
	sourceCodeId: int("source_code_id"),
	budgetTypeId: int("budget_type_id"),
	accountCodeId: int("account_code_id"),
	createdBy: int("created_by"),
},
(table) => [
	index("idx_mehi_16_1_cards_tenant_id").on(table.tenantId),
	index("idx_mehi_16_1_cards_lookup").on(table.tenantId, table.fiscalYear, table.accountCodeId),
]);

export const mehi161Transactions = mysqlTable("mehi_16_1_transactions", {
	transId: int("trans_id").autoincrement().notNull(),
	tenantId: int("tenant_id").notNull().references(() => tenants.id, { onDelete: "restrict", onUpdate: "restrict" } ),
	cardId: int("card_id").notNull().references(() => mehi161Cards.cardId, { onDelete: "restrict", onUpdate: "restrict" } ),
	notificationId: int("notification_id"),
	// you can use { mode: 'date' }, if you want to have Date as type for this column
	transDate: date("trans_date", { mode: 'string' }).notNull(),
	description: varchar({ length: 500 }).notNull(),
	refNo: varchar("ref_no", { length: 100 }).notNull(),
	approvedBudget: decimal("approved_budget", { precision: 15, scale: 2 }).default('0.00').notNull(),
	additionToBudget: decimal("addition_to_budget", { precision: 15, scale: 2 }).default('0.00').notNull(),
	reductionFromBudget: decimal("reduction_from_budget", { precision: 15, scale: 2 }).default('0.00').notNull(),
	adjustedBudget: decimal("adjusted_budget", { precision: 15, scale: 2 }).default('0.00').notNull(),
	commitments: decimal({ precision: 15, scale: 2 }).default('0.00').notNull(),
	expenditure: decimal({ precision: 15, scale: 2 }).default('0.00').notNull(),
	balance: decimal({ precision: 15, scale: 2 }).default('0.00').notNull(),
},
(table) => [
	index("idx_mehi_16_1_transactions_tenant_id").on(table.tenantId),
	index("idx_mehi_16_1_transactions_card").on(table.cardId, table.transId),
]);

export const mehi17Cards = mysqlTable("mehi_17_cards", {
	cardId: int("card_id").autoincrement().notNull(),
	tenantId: int("tenant_id").notNull().references(() => tenants.id, { onDelete: "restrict", onUpdate: "restrict" } ),
	fiscalYear: varchar("fiscal_year", { length: 10 }).notNull(),
	publicBodyCodeId: int("public_body_code_id").notNull(),
	subAgencyCodeId: int("sub_agency_code_id"),
	programCodeId: int("program_code_id").notNull(),
	subProgramCodeId: int("sub_program_code_id"),
	projectCodeId: int("project_code_id"),
	sourceCodeId: int("source_code_id").notNull(),
	bankAccountNo: varchar("bank_account_no", { length: 100 }).notNull(),
	budgetTypeId: int("budget_type_id").notNull(),
	accountCodeId: int("account_code_id"),
	accountName: varchar("account_name", { length: 255 }),
	accountType: varchar("account_type", { length: 20 }),
	createdBy: int("created_by"),
},
(table) => [
	index("idx_mehi_17_cards_tenant_id").on(table.tenantId),
	unique("uq_mehi_17_cards_bank").on(table.tenantId, table.fiscalYear, table.bankAccountNo, table.budgetTypeId),
]);

export const mehi17Transactions = mysqlTable("mehi_17_transactions", {
	transId: int("trans_id").autoincrement().notNull(),
	tenantId: int("tenant_id").notNull().references(() => tenants.id, { onDelete: "restrict", onUpdate: "restrict" } ),
	cardId: int("card_id").notNull().references(() => mehi17Cards.cardId, { onDelete: "restrict", onUpdate: "restrict" } ),
	registerMonth: varchar("register_month", { length: 30 }).notNull(),
	// you can use { mode: 'date' }, if you want to have Date as type for this column
	registerDate: date("register_date", { mode: 'string' }).notNull(),
	registerPage: varchar("register_page", { length: 20 }),
	registerItemNo: varchar("register_item_no", { length: 20 }),
	// you can use { mode: 'date' }, if you want to have Date as type for this column
	docDate: date("doc_date", { mode: 'string' }).notNull(),
	description: varchar({ length: 500 }).notNull(),
	refNo: varchar("ref_no", { length: 100 }).notNull(),
	refType: varchar("ref_type", { length: 50 }).notNull(),
	debitAmount: decimal("debit_amount", { precision: 15, scale: 2 }).default('0.00').notNull(),
	creditAmount: decimal("credit_amount", { precision: 15, scale: 2 }).default('0.00').notNull(),
	balance: decimal({ precision: 15, scale: 2 }).default('0.00').notNull(),
	createdBy: int("created_by"),
},
(table) => [
	index("idx_mehi_17_transactions_tenant_id").on(table.tenantId),
	index("idx_mehi_17_transactions_card").on(table.cardId, table.transId),
]);

export const mehi7Items = mysqlTable("mehi_7_items", {
	itemId: int("item_id").autoincrement().notNull(),
	tenantId: int("tenant_id").notNull().references(() => tenants.id, { onDelete: "restrict", onUpdate: "restrict" } ),
	voucherId: int("voucher_id").notNull().references(() => mehi7Vouchers.voucherId, { onDelete: "restrict", onUpdate: "restrict" } ),
	m16CardId: int("m16_card_id"),
	m17CardId: int("m17_card_id"),
	budgetCategoryId: int("budget_category_id"),
	budgetSourceId: int("budget_source_id"),
	accountCodeId: int("account_code_id"),
	debitAmount: decimal("debit_amount", { precision: 15, scale: 2 }).default('0.00').notNull(),
	creditAmount: decimal("credit_amount", { precision: 15, scale: 2 }).default('0.00').notNull(),
},
(table) => [
	index("idx_mehi_7_items_tenant_id").on(table.tenantId),
	index("idx_mehi_7_items_voucher").on(table.voucherId),
]);

export const mehi7Vouchers = mysqlTable("mehi_7_vouchers", {
	voucherId: int("voucher_id").autoincrement().notNull(),
	tenantId: int("tenant_id").notNull().references(() => tenants.id, { onDelete: "restrict", onUpdate: "restrict" } ),
	serialNo: varchar("serial_no", { length: 100 }).notNull(),
	// you can use { mode: 'date' }, if you want to have Date as type for this column
	voucherDate: date("voucher_date", { mode: 'string' }).notNull(),
	fiscalYear: varchar("fiscal_year", { length: 10 }).notNull(),
	publicBodyCodeId: int("public_body_code_id").notNull(),
	programCodeId: int("program_code_id").notNull(),
	payeeName: varchar("payee_name", { length: 255 }).notNull(),
	modeOfPayment: varchar("mode_of_payment", { length: 30 }).notNull(),
	checkNo: varchar("check_no", { length: 100 }),
	purpose: varchar({ length: 500 }).notNull(),
	totalAmount: decimal("total_amount", { precision: 15, scale: 2 }).default('0.00').notNull(),
	createdBy: int("created_by"),
},
(table) => [
	index("idx_mehi_7_vouchers_tenant_id").on(table.tenantId),
]);

export const model19Grn = mysqlTable("model_19_grn", {
	grnId: int("grn_id").autoincrement().notNull(),
	tenantId: int("tenant_id").notNull().references(() => tenants.id, { onDelete: "restrict", onUpdate: "restrict" } ),
	grnNumber: varchar("grn_number", { length: 50 }).notNull(),
	// you can use { mode: 'date' }, if you want to have Date as type for this column
	dateReceived: date("date_received", { mode: 'string' }).notNull(),
	department: varchar({ length: 150 }),
	supplierId: int("supplier_id"),
	delivererName: varchar("deliverer_name", { length: 150 }),
	receivedByStaffId: int("received_by_staff_id"),
},
(table) => [
	index("idx_model_19_grn_tenant_id").on(table.tenantId),
]);

export const model19Items = mysqlTable("model_19_items", {
	lineId: int("line_id").autoincrement().notNull(),
	tenantId: int("tenant_id").notNull().references(() => tenants.id, { onDelete: "restrict", onUpdate: "restrict" } ),
	grnId: int("grn_id").notNull().references(() => model19Grn.grnId, { onDelete: "restrict", onUpdate: "restrict" } ),
	itemId: int("item_id").notNull(),
	stockClassification: varchar("stock_classification", { length: 150 }),
	storeNo: varchar("store_no", { length: 100 }),
	shelfNo: varchar("shelf_no", { length: 100 }),
	quantityReceived: decimal("quantity_received", { precision: 12, scale: 2 }).notNull(),
	unitPrice: decimal("unit_price", { precision: 12, scale: 2 }).notNull(),
},
(table) => [
	index("idx_model_19_items_tenant_id").on(table.tenantId),
	index("idx_model_19_items_grn_id").on(table.grnId),
]);

export const onlineExams = mysqlTable("online_exams", {
	examId: int("exam_id").autoincrement().notNull(),
	examTitle: varchar("exam_title", { length: 255 }).notNull(),
	examDescription: longtext("exam_description"),
	subjectId: int("subject_id").notNull().references(() => subjects.subjectId, { onDelete: "restrict", onUpdate: "restrict" } ),
	classId: int("class_id").references(() => classes.classId, { onDelete: "restrict", onUpdate: "restrict" } ),
	teacherId: int("teacher_id").notNull(),
	isOfficial: tinyint("is_official").default(0),
	durationMinutes: int("duration_minutes").default(40).notNull(),
	totalMarks: decimal("total_marks", { precision: 5, scale: 2 }).default('0.00'),
	status: mysqlEnum(['Draft','Published','Closed']).default('Draft'),
	academicYear: varchar("academic_year", { length: 10 }).notNull(),
	semester: varchar({ length: 10 }),
	examPassword: varchar("exam_password", { length: 255 }),
	createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP'),
	tenantId: int("tenant_id").notNull().references(() => tenants.id, { onDelete: "restrict", onUpdate: "restrict" } ),
},
(table) => [
	index("subject_id").on(table.subjectId),
	index("class_id").on(table.classId),
	index("idx_online_exams_tenant_id").on(table.tenantId),
]);

export const outboundNotices = mysqlTable("outbound_notices", {
	noticeId: int("notice_id").autoincrement().notNull(),
	tenantId: int("tenant_id").notNull().references(() => tenants.id, { onDelete: "restrict", onUpdate: "restrict" } ),
	channel: mysqlEnum(['letter','phone','email']).notNull(),
	recipient: varchar({ length: 160 }).notNull(),
	referenceNo: varchar("reference_no", { length: 80 }).notNull(),
	subject: varchar({ length: 160 }).notNull(),
	// you can use { mode: 'date' }, if you want to have Date as type for this column
	sentOn: date("sent_on", { mode: 'string' }).notNull(),
	recordedBy: int("recorded_by").notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
},
(table) => [
	index("idx_outbound_notices_tenant_id").on(table.tenantId),
]);

export const parentGuardian = mysqlTable("parent_guardian", {
	pgId: int("pg_id").autoincrement().notNull(),
	firstName: varchar("first_name", { length: 100 }).notNull(),
	lastName: varchar("last_name", { length: 100 }).notNull(),
	gender: mysqlEnum(['M','F']),
	phoneNumber: varchar("phone_number", { length: 20 }).notNull(),
	occupation: varchar({ length: 100 }),
	residenceAddress: varchar("residence_address", { length: 255 }),
	email: varchar({ length: 100 }),
	createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP'),
	updatedAt: timestamp("updated_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').onUpdateNow(),
	tenantId: int("tenant_id").notNull().references(() => tenants.id, { onDelete: "restrict", onUpdate: "restrict" } ),
},
(table) => [
	index("idx_parent_guardian_tenant_id").on(table.tenantId),
]);

export const payroll = mysqlTable("payroll", {
	payrollId: int("payroll_id").autoincrement().notNull(),
	staffId: int("staff_id").notNull(),
	// you can use { mode: 'date' }, if you want to have Date as type for this column
	paymentMonth: date("payment_month", { mode: 'string' }).notNull(),
	grossSalary: decimal("gross_salary", { precision: 10, scale: 2 }).notNull(),
	deductions: decimal({ precision: 10, scale: 2 }).default('0.00').notNull(),
	netSalary: decimal("net_salary", { precision: 10, scale: 2 }).notNull(),
	processedBy: int("processed_by"),
	tenantId: int("tenant_id").notNull().references(() => tenants.id, { onDelete: "restrict", onUpdate: "restrict" } ),
},
(table) => [
	index("idx_payroll_tenant_id").on(table.tenantId),
]);

export const peerAssessments = mysqlTable("peer_assessments", {
	assessmentId: int("assessment_id").autoincrement().notNull(),
	taskId: int("task_id").notNull().references(() => groupTasks.taskId, { onDelete: "restrict", onUpdate: "restrict" } ),
	evaluatorId: int("evaluator_id").notNull().references(() => students.studentId, { onDelete: "restrict", onUpdate: "restrict" } ),
	evaluateeId: int("evaluatee_id").notNull().references(() => students.studentId, { onDelete: "restrict", onUpdate: "restrict" } ),
	contributionRating: int("contribution_rating"),
	comment: text(),
	tenantId: int("tenant_id").notNull().references(() => tenants.id, { onDelete: "restrict", onUpdate: "restrict" } ),
},
(table) => [
	index("task_id").on(table.taskId),
	index("evaluator_id").on(table.evaluatorId),
	index("evaluatee_id").on(table.evaluateeId),
	index("idx_peer_assessments_tenant_id").on(table.tenantId),
]);

export const periodSettings = mysqlTable("period_settings", {
	id: int().autoincrement().notNull(),
	periodNumber: int("period_number"),
	startTime: time("start_time"),
	endTime: time("end_time"),
	shift: varchar({ length: 20 }),
	tenantId: int("tenant_id").notNull().references(() => tenants.id, { onDelete: "restrict", onUpdate: "restrict" } ),
},
(table) => [
	index("idx_period_settings_tenant_id").on(table.tenantId),
]);

export const poApprovals = mysqlTable("po_approvals", {
	approvalId: int("approval_id").autoincrement().notNull(),
	tenantId: int("tenant_id").notNull().references(() => tenants.id, { onDelete: "restrict", onUpdate: "restrict" } ),
	sourceKind: mysqlEnum("source_kind", ['store','teacher']).notNull(),
	sourceId: int("source_id").notNull(),
	budgetId: int("budget_id"),
	quantity: decimal({ precision: 12, scale: 2 }).notNull(),
	unitPrice: decimal("unit_price", { precision: 12, scale: 2 }).notNull(),
	status: mysqlEnum(['Approved','Refused']).notNull(),
	note: varchar({ length: 500 }).default("").notNull(),
	recordedBy: int("recorded_by").notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
},
(table) => [
	index("idx_po_approvals_tenant_id").on(table.tenantId),
	unique("uq_po_approvals_source").on(table.tenantId, table.sourceKind, table.sourceId),
]);

export const poAwards = mysqlTable("po_awards", {
	awardId: int("award_id").autoincrement().notNull(),
	tenantId: int("tenant_id").notNull().references(() => tenants.id, { onDelete: "restrict", onUpdate: "restrict" } ),
	tenderId: int("tender_id").notNull(),
	bidId: int("bid_id").notNull(),
	vendorId: int("vendor_id").notNull(),
	letterNo: varchar("letter_no", { length: 40 }).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
},
(table) => [
	index("idx_po_awards_tenant_id").on(table.tenantId),
	unique("uq_po_awards_tender").on(table.tenantId, table.tenderId),
]);

export const poBids = mysqlTable("po_bids", {
	bidId: int("bid_id").autoincrement().notNull(),
	tenantId: int("tenant_id").notNull().references(() => tenants.id, { onDelete: "restrict", onUpdate: "restrict" } ),
	tenderId: int("tender_id").notNull(),
	vendorId: int("vendor_id").notNull(),
	amount: decimal({ precision: 15, scale: 2 }).notNull(),
	note: varchar({ length: 500 }).default("").notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
},
(table) => [
	index("idx_po_bids_tenant_id").on(table.tenantId),
	unique("uq_po_bids_vendor").on(table.tenantId, table.tenderId, table.vendorId),
]);

export const poBudgets = mysqlTable("po_budgets", {
	budgetId: int("budget_id").autoincrement().notNull(),
	tenantId: int("tenant_id").notNull().references(() => tenants.id, { onDelete: "restrict", onUpdate: "restrict" } ),
	fiscalYear: varchar("fiscal_year", { length: 10 }).notNull(),
	code: varchar({ length: 40 }).notNull(),
	title: varchar({ length: 160 }).notNull(),
	allocated: decimal({ precision: 15, scale: 2 }).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
},
(table) => [
	index("idx_po_budgets_tenant_id").on(table.tenantId),
	unique("uq_po_budgets_code").on(table.tenantId, table.fiscalYear, table.code),
]);

export const poChecks = mysqlTable("po_checks", {
	checkId: int("check_id").autoincrement().notNull(),
	tenantId: int("tenant_id").notNull().references(() => tenants.id, { onDelete: "restrict", onUpdate: "restrict" } ),
	sourceKind: mysqlEnum("source_kind", ['store','teacher']).notNull(),
	sourceId: int("source_id").notNull(),
	stock: decimal({ precision: 12, scale: 2 }).notNull(),
	needed: decimal({ precision: 12, scale: 2 }).notNull(),
	recordedBy: int("recorded_by").notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
},
(table) => [
	index("idx_po_checks_tenant_id").on(table.tenantId),
	unique("uq_po_checks_source").on(table.tenantId, table.sourceKind, table.sourceId),
]);

export const poOrders = mysqlTable("po_orders", {
	orderId: int("order_id").autoincrement().notNull(),
	tenantId: int("tenant_id").notNull().references(() => tenants.id, { onDelete: "restrict", onUpdate: "restrict" } ),
	orderNo: varchar("order_no", { length: 40 }).notNull(),
	vendorId: int("vendor_id").notNull(),
	budgetId: int("budget_id").notNull(),
	sourceKind: mysqlEnum("source_kind", ['store','teacher','tender']).notNull(),
	sourceId: int("source_id").notNull(),
	itemName: varchar("item_name", { length: 160 }).notNull(),
	quantity: decimal({ precision: 12, scale: 2 }).notNull(),
	unitPrice: decimal("unit_price", { precision: 12, scale: 2 }).notNull(),
	status: mysqlEnum(['Issued','Partial','Delivered']).default('Issued').notNull(),
	receivedQty: decimal("received_qty", { precision: 12, scale: 2 }).default('0.00').notNull(),
	note: varchar({ length: 500 }).default("").notNull(),
	recordedBy: int("recorded_by").notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
},
(table) => [
	index("idx_po_orders_tenant_id").on(table.tenantId),
	unique("uq_po_orders_no").on(table.tenantId, table.orderNo),
	unique("uq_po_orders_source").on(table.tenantId, table.sourceKind, table.sourceId),
]);

export const poTenders = mysqlTable("po_tenders", {
	tenderId: int("tender_id").autoincrement().notNull(),
	tenantId: int("tenant_id").notNull().references(() => tenants.id, { onDelete: "restrict", onUpdate: "restrict" } ),
	title: varchar({ length: 160 }).notNull(),
	itemName: varchar("item_name", { length: 160 }).notNull(),
	quantity: decimal({ precision: 12, scale: 2 }).notNull(),
	// you can use { mode: 'date' }, if you want to have Date as type for this column
	closesOn: date("closes_on", { mode: 'string' }).notNull(),
	status: mysqlEnum(['Open','Awarded','Closed']).default('Open').notNull(),
	budgetId: int("budget_id").notNull(),
	recordedBy: int("recorded_by").notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
},
(table) => [
	index("idx_po_tenders_tenant_id").on(table.tenantId),
]);

export const poVendors = mysqlTable("po_vendors", {
	vendorId: int("vendor_id").autoincrement().notNull(),
	tenantId: int("tenant_id").notNull().references(() => tenants.id, { onDelete: "restrict", onUpdate: "restrict" } ),
	supplierName: varchar("supplier_name", { length: 200 }).notNull(),
	contactName: varchar("contact_name", { length: 120 }).default("").notNull(),
	phone: varchar({ length: 50 }).default("").notNull(),
	email: varchar({ length: 100 }).default("").notNull(),
	licenseNo: varchar("license_no", { length: 80 }).default("").notNull(),
	// you can use { mode: 'date' }, if you want to have Date as type for this column
	licenseExpires: date("license_expires", { mode: 'string' }),
	status: mysqlEnum(['Active','Suspended']).default('Active').notNull(),
	username: varchar({ length: 50 }).notNull(),
	passwordHash: varchar("password_hash", { length: 255 }).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
},
(table) => [
	index("idx_po_vendors_tenant_id").on(table.tenantId),
	unique("uq_po_vendors_name").on(table.tenantId, table.supplierName),
	unique("uq_po_vendors_username").on(table.tenantId, table.username),
]);

export const principalApprovalNotes = mysqlTable("principal_approval_notes", {
	noteId: int("note_id").autoincrement().notNull(),
	tenantId: int("tenant_id").notNull().references(() => tenants.id, { onDelete: "restrict", onUpdate: "restrict" } ),
	source: mysqlEnum(['store','registration','attendance','staff']).notNull(),
	sourceId: int("source_id").notNull(),
	action: mysqlEnum(['approve','reject','clarify','override']).notNull(),
	note: varchar({ length: 255 }).notNull(),
	recordedBy: int("recorded_by").notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
},
(table) => [
	index("idx_principal_approval_notes_tenant_id").on(table.tenantId),
]);

export const principalDocuments = mysqlTable("principal_documents", {
	documentId: int("document_id").autoincrement().notNull(),
	tenantId: int("tenant_id").notNull().references(() => tenants.id, { onDelete: "restrict", onUpdate: "restrict" } ),
	title: varchar({ length: 160 }).notNull(),
	body: text().notNull(),
	status: mysqlEnum(['Draft','Signed','Rejected']).default('Draft').notNull(),
	signerName: varchar("signer_name", { length: 160 }),
	signedBy: int("signed_by"),
	signedAt: timestamp("signed_at", { mode: 'string' }),
	recordedBy: int("recorded_by").notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
},
(table) => [
	index("idx_principal_documents_tenant_id").on(table.tenantId),
]);

export const principalIncidents = mysqlTable("principal_incidents", {
	incidentId: int("incident_id").autoincrement().notNull(),
	tenantId: int("tenant_id").notNull().references(() => tenants.id, { onDelete: "restrict", onUpdate: "restrict" } ),
	title: varchar({ length: 160 }).notNull(),
	details: text().notNull(),
	severity: mysqlEnum(['low','medium','high']).default('medium').notNull(),
	status: mysqlEnum(['Open','Investigating','Resolved']).default('Open').notNull(),
	studentId: int("student_id"),
	recordedBy: int("recorded_by").notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
},
(table) => [
	index("idx_principal_incidents_tenant_id").on(table.tenantId),
]);

export const principalMessages = mysqlTable("principal_messages", {
	messageId: int("message_id").autoincrement().notNull(),
	tenantId: int("tenant_id").notNull().references(() => tenants.id, { onDelete: "restrict", onUpdate: "restrict" } ),
	kind: mysqlEnum(['announcement','emergency','memo','targeted','bulk']).notNull(),
	audience: varchar({ length: 160 }).notNull(),
	title: varchar({ length: 160 }).notNull(),
	body: text().notNull(),
	recordedBy: int("recorded_by").notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
},
(table) => [
	index("idx_principal_messages_tenant_id").on(table.tenantId),
]);

export const principalPolicies = mysqlTable("principal_policies", {
	policyId: int("policy_id").autoincrement().notNull(),
	tenantId: int("tenant_id").notNull().references(() => tenants.id, { onDelete: "restrict", onUpdate: "restrict" } ),
	title: varchar({ length: 160 }).notNull(),
	body: text().notNull(),
	area: mysqlEnum(['performance','policy','compliance']).notNull(),
	status: mysqlEnum(['Draft','Active','Retired']).default('Draft').notNull(),
	// you can use { mode: 'date' }, if you want to have Date as type for this column
	effectiveOn: date("effective_on", { mode: 'string' }),
	recordedBy: int("recorded_by").notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
},
(table) => [
	index("idx_principal_policies_tenant_id").on(table.tenantId),
]);

export const principalReportDefs = mysqlTable("principal_report_defs", {
	reportId: int("report_id").autoincrement().notNull(),
	tenantId: int("tenant_id").notNull().references(() => tenants.id, { onDelete: "restrict", onUpdate: "restrict" } ),
	name: varchar({ length: 160 }).notNull(),
	columnsJson: text("columns_json").notNull(),
	recordedBy: int("recorded_by").notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
},
(table) => [
	index("idx_principal_report_defs_tenant_id").on(table.tenantId),
]);

export const principalTraining = mysqlTable("principal_training", {
	sessionId: int("session_id").autoincrement().notNull(),
	tenantId: int("tenant_id").notNull().references(() => tenants.id, { onDelete: "restrict", onUpdate: "restrict" } ),
	title: varchar({ length: 160 }).notNull(),
	trainer: varchar({ length: 160 }).notNull(),
	audience: varchar({ length: 160 }).notNull(),
	// you can use { mode: 'date' }, if you want to have Date as type for this column
	scheduledOn: date("scheduled_on", { mode: 'string' }).notNull(),
	seats: int().default(20).notNull(),
	notes: text(),
	recordedBy: int("recorded_by").notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
},
(table) => [
	index("idx_principal_training_tenant_id").on(table.tenantId),
]);

export const principalTransfers = mysqlTable("principal_transfers", {
	transferId: int("transfer_id").autoincrement().notNull(),
	tenantId: int("tenant_id").notNull().references(() => tenants.id, { onDelete: "restrict", onUpdate: "restrict" } ),
	studentId: int("student_id").notNull(),
	destination: varchar({ length: 160 }).notNull(),
	reason: varchar({ length: 255 }).notNull(),
	libraryClear: tinyint("library_clear").default(0).notNull(),
	storeClear: tinyint("store_clear").default(0).notNull(),
	financeClear: tinyint("finance_clear").default(0).notNull(),
	status: mysqlEnum(['Open','Cleared','Issued']).default('Open').notNull(),
	certificateNo: varchar("certificate_no", { length: 40 }),
	recordedBy: int("recorded_by").notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
},
(table) => [
	index("idx_principal_transfers_tenant_id").on(table.tenantId),
]);

export const requisitionsModel20 = mysqlTable("requisitions_model20", {
	requisitionId: int("requisition_id").autoincrement().notNull(),
	tenantId: int("tenant_id").notNull().references(() => tenants.id, { onDelete: "restrict", onUpdate: "restrict" } ),
	refCode: varchar("ref_code", { length: 80 }).notNull(),
	requesterStaffId: int("requester_staff_id").notNull(),
	department: varchar({ length: 150 }),
	itemId: int("item_id").notNull(),
	quantityRequested: decimal("quantity_requested", { precision: 12, scale: 2 }).notNull(),
	estimatedUnitPrice: decimal("estimated_unit_price", { precision: 12, scale: 2 }).default('0.00').notNull(),
	estimatedTotalPrice: decimal("estimated_total_price", { precision: 14, scale: 2 }).default('0.00').notNull(),
	purpose: varchar({ length: 255 }),
	status: varchar({ length: 30 }).default('Pending').notNull(),
	approvedByStaffId: int("approved_by_staff_id"),
	createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
},
(table) => [
	index("idx_requisitions_model20_tenant_id").on(table.tenantId),
	index("idx_requisitions_model20_status").on(table.tenantId, table.status),
]);

export const roAccessLog = mysqlTable("ro_access_log", {
	logId: int("log_id").autoincrement().notNull(),
	tenantId: int("tenant_id").notNull().references(() => tenants.id, { onDelete: "restrict", onUpdate: "restrict" } ),
	userId: int("user_id").notNull(),
	actionType: varchar("action_type", { length: 80 }).notNull(),
	targetCode: varchar("target_code", { length: 40 }).default("").notNull(),
	description: varchar({ length: 500 }).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
},
(table) => [
	index("idx_ro_access_log_tenant_id").on(table.tenantId),
]);

export const roAlumni = mysqlTable("ro_alumni", {
	alumniId: int("alumni_id").autoincrement().notNull(),
	tenantId: int("tenant_id").notNull().references(() => tenants.id, { onDelete: "restrict", onUpdate: "restrict" } ),
	studentId: int("student_id").notNull(),
	graduationYear: varchar("graduation_year", { length: 10 }).notNull(),
	note: varchar({ length: 255 }).default("").notNull(),
	recordedBy: int("recorded_by").notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
},
(table) => [
	index("idx_ro_alumni_tenant_id").on(table.tenantId),
	unique("uq_ro_alumni_student").on(table.tenantId, table.studentId),
]);

export const roArchives = mysqlTable("ro_archives", {
	archiveId: int("archive_id").autoincrement().notNull(),
	tenantId: int("tenant_id").notNull().references(() => tenants.id, { onDelete: "restrict", onUpdate: "restrict" } ),
	academicYear: varchar("academic_year", { length: 10 }).notNull(),
	gradeLevel: int("grade_level").notNull(),
	section: varchar({ length: 10 }).notNull(),
	rowCount: int("row_count").notNull(),
	recordedBy: int("recorded_by").notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
},
(table) => [
	index("idx_ro_archives_tenant_id").on(table.tenantId),
	unique("uq_ro_archives_section").on(table.tenantId, table.academicYear, table.gradeLevel, table.section),
]);

export const roArchiveRows = mysqlTable("ro_archive_rows", {
	rowId: int("row_id").autoincrement().notNull(),
	tenantId: int("tenant_id").notNull().references(() => tenants.id, { onDelete: "restrict", onUpdate: "restrict" } ),
	archiveId: int("archive_id").notNull(),
	gradeEntryId: int("grade_entry_id").notNull(),
	studentName: varchar("student_name", { length: 255 }).notNull(),
	subjectName: varchar("subject_name", { length: 100 }).notNull(),
	score: decimal({ precision: 5, scale: 2 }).notNull(),
	maxScore: decimal("max_score", { precision: 5, scale: 2 }).notNull(),
},
(table) => [
	index("idx_ro_archive_rows_tenant_id").on(table.tenantId),
	index("idx_ro_archive_rows_archive").on(table.tenantId, table.archiveId),
]);

export const roDocuments = mysqlTable("ro_documents", {
	documentId: int("document_id").autoincrement().notNull(),
	tenantId: int("tenant_id").notNull().references(() => tenants.id, { onDelete: "restrict", onUpdate: "restrict" } ),
	studentId: int("student_id").notNull(),
	requestId: int("request_id"),
	kind: mysqlEnum(['transcript','cumulative']).notNull(),
	academicYear: varchar("academic_year", { length: 10 }).notNull(),
	verifyCode: varchar("verify_code", { length: 16 }).notNull(),
	summary: varchar({ length: 500 }).notNull(),
	recordedBy: int("recorded_by").notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
},
(table) => [
	index("idx_ro_documents_tenant_id").on(table.tenantId),
	unique("uq_ro_documents_code").on(table.verifyCode),
]);

export const roFiles = mysqlTable("ro_files", {
	fileId: int("file_id").autoincrement().notNull(),
	tenantId: int("tenant_id").notNull().references(() => tenants.id, { onDelete: "restrict", onUpdate: "restrict" } ),
	studentId: int("student_id").notNull(),
	title: varchar({ length: 160 }).notNull(),
	storedName: varchar("stored_name", { length: 80 }).notNull(),
	recordedBy: int("recorded_by").notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
},
(table) => [
	index("idx_ro_files_tenant_id").on(table.tenantId),
	unique("uq_ro_files_name").on(table.storedName),
]);

export const roImports = mysqlTable("ro_imports", {
	importId: int("import_id").autoincrement().notNull(),
	tenantId: int("tenant_id").notNull().references(() => tenants.id, { onDelete: "restrict", onUpdate: "restrict" } ),
	fileKind: mysqlEnum("file_kind", ['csv','structured']).notNull(),
	rowCount: int("row_count").notNull(),
	recordedBy: int("recorded_by").notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
},
(table) => [
	index("idx_ro_imports_tenant_id").on(table.tenantId),
]);

export const roLocks = mysqlTable("ro_locks", {
	lockId: int("lock_id").autoincrement().notNull(),
	tenantId: int("tenant_id").notNull().references(() => tenants.id, { onDelete: "restrict", onUpdate: "restrict" } ),
	academicYear: varchar("academic_year", { length: 10 }).notNull(),
	gradeLevel: int("grade_level").notNull(),
	section: varchar({ length: 10 }).notNull(),
	status: mysqlEnum(['Locked','Unlocked']).default('Locked').notNull(),
	recordedBy: int("recorded_by").notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
},
(table) => [
	index("idx_ro_locks_tenant_id").on(table.tenantId),
	unique("uq_ro_locks_section").on(table.tenantId, table.academicYear, table.gradeLevel, table.section),
]);

export const roRequests = mysqlTable("ro_requests", {
	requestId: int("request_id").autoincrement().notNull(),
	tenantId: int("tenant_id").notNull().references(() => tenants.id, { onDelete: "restrict", onUpdate: "restrict" } ),
	kind: mysqlEnum(['correction','unlock']).notNull(),
	gradeEntryId: int("grade_entry_id"),
	academicYear: varchar("academic_year", { length: 10 }).notNull(),
	gradeLevel: int("grade_level").notNull(),
	section: varchar({ length: 10 }).notNull(),
	proposedScore: decimal("proposed_score", { precision: 5, scale: 2 }),
	reason: varchar({ length: 500 }).notNull(),
	status: mysqlEnum(['Pending','Granted','Applied','Refused']).default('Pending').notNull(),
	principalNote: varchar("principal_note", { length: 500 }).default("").notNull(),
	recordedBy: int("recorded_by").notNull(),
	decidedBy: int("decided_by"),
	createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
},
(table) => [
	index("idx_ro_requests_tenant_id").on(table.tenantId),
	index("idx_ro_requests_status").on(table.tenantId, table.status),
]);

export const roStaffRecords = mysqlTable("ro_staff_records", {
	recordId: int("record_id").autoincrement().notNull(),
	tenantId: int("tenant_id").notNull().references(() => tenants.id, { onDelete: "restrict", onUpdate: "restrict" } ),
	staffId: int("staff_id").notNull(),
	kind: mysqlEnum(['credential','work','file']).notNull(),
	title: varchar({ length: 160 }).notNull(),
	body: varchar({ length: 1000 }).notNull(),
	recordedBy: int("recorded_by").notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
},
(table) => [
	index("idx_ro_staff_records_tenant_id").on(table.tenantId),
]);

export const schemaMigrations = mysqlTable("schema_migrations", {
	id: int().autoincrement().notNull(),
	filename: varchar({ length: 255 }).notNull(),
	appliedAt: timestamp("applied_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
},
(table) => [
	unique("schema_migrations_filename_unique").on(table.filename),
]);

export const schoolNews = mysqlTable("school_news", {
	id: int().autoincrement().notNull(),
	title: varchar({ length: 255 }).notNull(),
	content: text().notNull(),
	image: varchar({ length: 255 }),
	pdfFile: varchar("pdf_file", { length: 255 }),
	videoUrl: varchar("video_url", { length: 255 }),
	category: mysqlEnum(['General','Parents','Donors','Authorities']).default('General'),
	createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP'),
	tenantId: int("tenant_id").notNull().references(() => tenants.id, { onDelete: "restrict", onUpdate: "restrict" } ),
},
(table) => [
	index("idx_school_news_tenant_id").on(table.tenantId),
]);

export const schoolPlans = mysqlTable("school_plans", {
	planId: int("plan_id").autoincrement().notNull(),
	planTitle: varchar("plan_title", { length: 255 }).notNull(),
	academicYear: varchar("academic_year", { length: 10 }).notNull(),
	planType: mysqlEnum("plan_type", ['Annual','Semester_1','Semester_2','Quarter']).notNull(),
	description: text(),
	// you can use { mode: 'date' }, if you want to have Date as type for this column
	startDate: date("start_date", { mode: 'string' }),
	// you can use { mode: 'date' }, if you want to have Date as type for this column
	endDate: date("end_date", { mode: 'string' }),
	status: mysqlEnum(['Draft','Approved','In_Progress','Completed']).default('Draft'),
	createdBy: int("created_by"),
	tenantId: int("tenant_id").notNull().references(() => tenants.id, { onDelete: "restrict", onUpdate: "restrict" } ),
},
(table) => [
	index("idx_school_plans_tenant_id").on(table.tenantId),
]);

export const schoolSettings = mysqlTable("school_settings", {
	id: int().default(1).notNull(),
	schoolName: varchar("school_name", { length: 255 }).notNull(),
	schoolVision: varchar("school_vision", { length: 255 }),
	schoolEmail: varchar("school_email", { length: 100 }),
	schoolPhone: varchar("school_phone", { length: 50 }),
	schoolAddress: varchar("school_address", { length: 255 }),
	schoolLogo: varchar("school_logo", { length: 255 }),
	aboutText: text("about_text"),
	schoolNeeds: text("school_needs"),
	promoVideoUrl: varchar("promo_video_url", { length: 255 }),
	updatedAt: timestamp("updated_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').onUpdateNow(),
	tenantId: int("tenant_id").notNull().references(() => tenants.id, { onDelete: "restrict", onUpdate: "restrict" } ),
},
(table) => [
	index("idx_school_settings_tenant_id").on(table.tenantId),
]);

export const schoolStats = mysqlTable("school_stats", {
	id: int().autoincrement().notNull(),
	statLabel: varchar("stat_label", { length: 50 }).notNull(),
	statValue: int("stat_value").notNull(),
	icon: varchar({ length: 50 }),
	tenantId: int("tenant_id").notNull().references(() => tenants.id, { onDelete: "restrict", onUpdate: "restrict" } ),
},
(table) => [
	index("idx_school_stats_tenant_id").on(table.tenantId),
]);

export const simulations = mysqlTable("simulations", {
	id: int().autoincrement().notNull(),
	teacherId: int("teacher_id"),
	gradeLevel: int("grade_level"),
	section: varchar({ length: 50 }).notNull(),
	subjectName: varchar("subject_name", { length: 100 }),
	simTitle: varchar("sim_title", { length: 255 }),
	simUrl: text("sim_url"),
	simFile: varchar("sim_file", { length: 255 }),
	createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP'),
	tenantId: int("tenant_id").notNull().references(() => tenants.id, { onDelete: "restrict", onUpdate: "restrict" } ),
},
(table) => [
	index("idx_simulations_tenant_id").on(table.tenantId),
]);

export const skAlerts = mysqlTable("sk_alerts", {
	alertId: int("alert_id").autoincrement().notNull(),
	tenantId: int("tenant_id").notNull().references(() => tenants.id, { onDelete: "restrict", onUpdate: "restrict" } ),
	itemId: int("item_id").notNull(),
	kind: mysqlEnum(['reorder','forecast']).notNull(),
	stock: decimal({ precision: 12, scale: 2 }).notNull(),
	reorderLevel: int("reorder_level").notNull(),
	status: mysqlEnum(['Open','Seen']).default('Open').notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
},
(table) => [
	index("idx_sk_alerts_tenant_id").on(table.tenantId),
	index("idx_sk_alerts_open").on(table.tenantId, table.itemId, table.kind, table.status),
]);

export const skAssets = mysqlTable("sk_assets", {
	assetId: int("asset_id").autoincrement().notNull(),
	tenantId: int("tenant_id").notNull().references(() => tenants.id, { onDelete: "restrict", onUpdate: "restrict" } ),
	itemId: int("item_id").notNull(),
	tag: varchar({ length: 40 }).notNull(),
	serialNo: varchar("serial_no", { length: 80 }).default("").notNull(),
	location: varchar({ length: 150 }).default("").notNull(),
	status: mysqlEnum(['InStore','OnLoan','Disposed']).default('InStore').notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
},
(table) => [
	index("idx_sk_assets_tenant_id").on(table.tenantId),
	unique("uq_sk_assets_tag").on(table.tenantId, table.tag),
]);

export const skDisposals = mysqlTable("sk_disposals", {
	disposalId: int("disposal_id").autoincrement().notNull(),
	tenantId: int("tenant_id").notNull().references(() => tenants.id, { onDelete: "restrict", onUpdate: "restrict" } ),
	itemId: int("item_id").notNull(),
	assetId: int("asset_id"),
	quantity: decimal({ precision: 12, scale: 2 }).notNull(),
	kind: mysqlEnum(['damage','disposal']).notNull(),
	note: varchar({ length: 500 }).notNull(),
	recordedBy: int("recorded_by").notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
},
(table) => [
	index("idx_sk_disposals_tenant_id").on(table.tenantId),
]);

export const skLoans = mysqlTable("sk_loans", {
	loanId: int("loan_id").autoincrement().notNull(),
	tenantId: int("tenant_id").notNull().references(() => tenants.id, { onDelete: "restrict", onUpdate: "restrict" } ),
	assetId: int("asset_id").notNull(),
	borrowerName: varchar("borrower_name", { length: 150 }).notNull(),
	purpose: varchar({ length: 255 }).default("").notNull(),
	// you can use { mode: 'date' }, if you want to have Date as type for this column
	dueOn: date("due_on", { mode: 'string' }).notNull(),
	// you can use { mode: 'date' }, if you want to have Date as type for this column
	returnedOn: date("returned_on", { mode: 'string' }),
	status: mysqlEnum(['Out','Returned']).default('Out').notNull(),
	recordedBy: int("recorded_by").notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
},
(table) => [
	index("idx_sk_loans_tenant_id").on(table.tenantId),
	index("idx_sk_loans_asset").on(table.tenantId, table.assetId, table.status),
]);

export const skPurchaseRequests = mysqlTable("sk_purchase_requests", {
	requestId: int("request_id").autoincrement().notNull(),
	tenantId: int("tenant_id").notNull().references(() => tenants.id, { onDelete: "restrict", onUpdate: "restrict" } ),
	itemId: int("item_id").notNull(),
	quantity: decimal({ precision: 12, scale: 2 }).notNull(),
	note: varchar({ length: 500 }).default("").notNull(),
	status: mysqlEnum(['Routed']).default('Routed').notNull(),
	routedBy: int("routed_by").notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
},
(table) => [
	index("idx_sk_purchase_requests_tenant_id").on(table.tenantId),
	index("idx_sk_purchase_requests_item").on(table.tenantId, table.itemId),
]);

export const staff = mysqlTable("staff", {
	staffId: int("staff_id").autoincrement().notNull(),
	firstName: varchar("first_name", { length: 100 }).notNull(),
	lastName: varchar("last_name", { length: 100 }).notNull(),
	gender: mysqlEnum(['Male','Female','Other']),
	role: mysqlEnum(['Teacher','Technician','Secretary','Counselor','Finance','V_Principal','Registrar','Librarian','Lab_Assistant','Store_Keeper','Principal','Procurement']).notNull(),
	specialization: mysqlEnum(['Regular','Vocational','N/A']).default('N/A'),
	jobTitle: varchar("job_title", { length: 100 }).notNull(),
	phoneNumber: varchar("phone_number", { length: 50 }),
	email: varchar({ length: 100 }),
	// you can use { mode: 'date' }, if you want to have Date as type for this column
	hireDate: date("hire_date", { mode: 'string' }),
	salary: decimal({ precision: 10, scale: 2 }),
	experienceYears: decimal("experience_years", { precision: 4, scale: 2 }).default('0.00'),
	userId: int("user_id"),
	subjectId: int("subject_id"),
	isHomeroomAssigned: tinyint("is_homeroom_assigned").default(0),
	isApproved: tinyint("is_approved").default(0),
	photo: varchar({ length: 255 }),
	approvalDate: datetime("approval_date", { mode: 'string'}),
	tenantId: int("tenant_id").notNull().references(() => tenants.id, { onDelete: "restrict", onUpdate: "restrict" } ),
},
(table) => [
	index("idx_staff_tenant_id").on(table.tenantId),
	unique("user_id").on(table.userId),
]);

export const staffFiles = mysqlTable("staff_files", {
	fileId: int("file_id").autoincrement().notNull(),
	fileTitle: varchar("file_title", { length: 255 }),
	fileName: varchar("file_name", { length: 255 }),
	content: longtext(),
	fileType: varchar("file_type", { length: 50 }).default('DOC'),
	fileCategory: varchar("file_category", { length: 100 }),
	uploadedBy: int("uploaded_by").notNull(),
	folderId: int("folder_id").default(0),
	uploadDate: timestamp("upload_date", { mode: 'string' }).default('CURRENT_TIMESTAMP'),
	targetRole: varchar("target_role", { length: 50 }).default('All'),
	priority: mysqlEnum(['Normal','Urgent','Confidential']).default('Normal'),
	semester: varchar({ length: 20 }).default('1st Semester'),
	academicYear: varchar("academic_year", { length: 10 }).default('2016'),
	tenantId: int("tenant_id").notNull().references(() => tenants.id, { onDelete: "restrict", onUpdate: "restrict" } ),
},
(table) => [
	index("idx_staff_files_tenant_id").on(table.tenantId),
]);

export const staffFolders = mysqlTable("staff_folders", {
	folderId: int("folder_id").autoincrement().notNull(),
	folderName: varchar("folder_name", { length: 255 }).notNull(),
	createdBy: int("created_by").notNull(),
	academicYear: varchar("academic_year", { length: 10 }),
	semester: varchar({ length: 10 }),
	createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP'),
	tenantId: int("tenant_id").notNull().references(() => tenants.id, { onDelete: "restrict", onUpdate: "restrict" } ),
},
(table) => [
	index("idx_staff_folders_tenant_id").on(table.tenantId),
]);

export const stockLedgerCard = mysqlTable("stock_ledger_card", {
	ledgerId: int("ledger_id").autoincrement().notNull(),
	tenantId: int("tenant_id").notNull().references(() => tenants.id, { onDelete: "restrict", onUpdate: "restrict" } ),
	itemId: int("item_id").notNull(),
	transactionDate: datetime("transaction_date", { mode: 'string'}).notNull(),
	refNo: varchar("ref_no", { length: 100 }),
	receivedQty: decimal("received_qty", { precision: 12, scale: 2 }).default('0.00').notNull(),
	issuedQty: decimal("issued_qty", { precision: 12, scale: 2 }).default('0.00').notNull(),
	issuePrice: decimal("issue_price", { precision: 12, scale: 2 }),
	balanceQty: decimal("balance_qty", { precision: 12, scale: 2 }).default('0.00').notNull(),
	balancePrice: decimal("balance_price", { precision: 14, scale: 2 }),
	createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
},
(table) => [
	index("idx_stock_ledger_card_tenant_id").on(table.tenantId),
	index("idx_stock_ledger_card_date").on(table.tenantId, table.transactionDate),
]);

export const students = mysqlTable("students", {
	studentId: int("student_id").autoincrement().notNull(),
	fullName: varchar("full_name", { length: 255 }).notNull(),
	gender: mysqlEnum(['M','F']).notNull(),
	registrationType: mysqlEnum("registration_type", ['አዲስ','ነባር','አቋራጭ','ደጋሚ','መልሶ ቅበላ']).default('አዲስ'),
	age: int().notNull(),
	gradeLevel: int("grade_level").notNull(),
	stream: varchar({ length: 50 }),
	section: varchar({ length: 10 }),
	academicYear: varchar("academic_year", { length: 10 }).notNull(),
	previousSchool: varchar("previous_school", { length: 255 }),
	kebele: varchar({ length: 100 }),
	gote: varchar({ length: 100 }),
	houseNumber: varchar("house_number", { length: 50 }),
	zoneWoreda: varchar("zone_woreda", { length: 100 }),
	parentPgId: int("parent_pg_id"),
	userId: int("user_id"),
	// you can use { mode: 'date' }, if you want to have Date as type for this column
	admissionDate: date("admission_date", { mode: 'string' }),
	isApproved: tinyint("is_approved").default(0),
	registeredBy: int("registered_by"),
	approvedBy: int("approved_by"),
	approvalDate: datetime("approval_date", { mode: 'string'}),
	vocationalId: int("vocational_id"),
	submissionStatus: mysqlEnum("submission_status", ['Draft','Submitted','Approved']).default('Draft'),
	photo: varchar({ length: 255 }).default('default_profile.png'),
	isTransfer: tinyint("is_transfer").default(0),
	tenantId: int("tenant_id").notNull().references(() => tenants.id, { onDelete: "restrict", onUpdate: "restrict" } ),
},
(table) => [
	index("idx_students_tenant_id").on(table.tenantId),
	unique("user_id").on(table.userId),
]);

export const studentAssessments = mysqlTable("student_assessments", {
	assessmentId: int("assessment_id").autoincrement().notNull(),
	studentId: int("student_id").notNull(),
	subjectId: int("subject_id").notNull(),
	weightingType: varchar("weighting_type", { length: 50 }),
	rawScore: decimal("raw_score", { precision: 5, scale: 2 }),
	maxLimit: decimal("max_limit", { precision: 5, scale: 2 }),
	academicYear: varchar("academic_year", { length: 10 }),
	semester: mysqlEnum(['1','2']),
	tenantId: int("tenant_id").notNull().references(() => tenants.id, { onDelete: "restrict", onUpdate: "restrict" } ),
},
(table) => [
	index("idx_student_assessments_tenant_id").on(table.tenantId),
]);

export const studentFinalReports = mysqlTable("student_final_reports", {
	reportId: int("report_id").autoincrement().notNull(),
	studentId: int("student_id"),
	academicYear: varchar("academic_year", { length: 10 }),
	sem1Total: decimal("sem1_total", { precision: 10, scale: 2 }),
	sem1Avg: decimal("sem1_avg", { precision: 10, scale: 2 }),
	sem1Rank: int("sem1_rank"),
	sem2Total: decimal("sem2_total", { precision: 10, scale: 2 }),
	sem2Avg: decimal("sem2_avg", { precision: 10, scale: 2 }),
	sem2Rank: int("sem2_rank"),
	yearlyAvg: decimal("yearly_avg", { precision: 10, scale: 2 }),
	finalRank: int("final_rank"),
	remark: varchar({ length: 50 }),
	tenantId: int("tenant_id").notNull().references(() => tenants.id, { onDelete: "restrict", onUpdate: "restrict" } ),
},
(table) => [
	index("idx_student_final_reports_tenant_id").on(table.tenantId),
]);

export const studentGroups = mysqlTable("student_groups", {
	groupId: int("group_id").autoincrement().notNull(),
	groupName: varchar("group_name", { length: 100 }).notNull(),
	studentId: int("student_id").notNull().references(() => students.studentId, { onDelete: "restrict", onUpdate: "restrict" } ),
	teacherId: int("teacher_id").notNull().references(() => users.userId, { onDelete: "restrict", onUpdate: "restrict" } ),
	subjectId: int("subject_id").notNull().references(() => subjects.subjectId, { onDelete: "restrict", onUpdate: "restrict" } ),
	gradeLevel: int("grade_level").notNull(),
	section: varchar({ length: 10 }).notNull(),
	academicYear: varchar("academic_year", { length: 10 }).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP'),
	tenantId: int("tenant_id").notNull().references(() => tenants.id, { onDelete: "restrict", onUpdate: "restrict" } ),
},
(table) => [
	index("teacher_id").on(table.teacherId),
	index("subject_id").on(table.subjectId),
	index("student_id").on(table.studentId),
	index("idx_student_groups_tenant_id").on(table.tenantId),
]);

export const stCommendations = mysqlTable("st_commendations", {
	commendationId: int("commendation_id").autoincrement().notNull(),
	tenantId: int("tenant_id").notNull().references(() => tenants.id, { onDelete: "restrict", onUpdate: "restrict" } ),
	studentId: int("student_id").notNull(),
	note: varchar({ length: 500 }).notNull(),
	recordedBy: int("recorded_by").notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
},
(table) => [
	index("idx_st_commendations_tenant_id").on(table.tenantId),
]);

export const stDocumentRequests = mysqlTable("st_document_requests", {
	requestId: int("request_id").autoincrement().notNull(),
	tenantId: int("tenant_id").notNull().references(() => tenants.id, { onDelete: "restrict", onUpdate: "restrict" } ),
	studentId: int("student_id").notNull(),
	kind: mysqlEnum(['transcript','document']).notNull(),
	purpose: varchar({ length: 255 }).notNull(),
	status: mysqlEnum(['Submitted','Reviewing','Ready','Collected']).default('Submitted').notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
},
(table) => [
	index("idx_st_document_requests_tenant_id").on(table.tenantId),
]);

export const stTaskWork = mysqlTable("st_task_work", {
	workId: int("work_id").autoincrement().notNull(),
	tenantId: int("tenant_id").notNull().references(() => tenants.id, { onDelete: "restrict", onUpdate: "restrict" } ),
	taskId: int("task_id").notNull(),
	studentId: int("student_id").notNull(),
	body: varchar({ length: 2000 }).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
},
(table) => [
	index("idx_st_task_work_tenant_id").on(table.tenantId),
	unique("uq_st_task_work_student").on(table.tenantId, table.taskId, table.studentId),
]);

export const subjects = mysqlTable("subjects", {
	subjectId: int("subject_id").autoincrement().notNull(),
	subjectName: varchar("subject_name", { length: 100 }).notNull(),
	gradeLevel: int("grade_level").notNull(),
	stream: mysqlEnum(['Natural','Social','Common']).default('Common').notNull(),
	teacherId: int("teacher_id"),
	creditHours: int("credit_hours").notNull(),
	fullMark: decimal("full_mark", { precision: 5, scale: 2 }).default('100.00').notNull(),
	isVocational: tinyint("is_vocational").default(0),
	isOffered: tinyint("is_offered").default(0),
	parentSubjectId: int("parent_subject_id"),
	sortOrder: int("sort_order").default(0),
	tenantId: int("tenant_id").notNull().references(() => tenants.id, { onDelete: "restrict", onUpdate: "restrict" } ),
},
(table) => [
	index("idx_subjects_tenant_id").on(table.tenantId),
	unique("uq_subjects_tenant_name_grade_stream").on(table.tenantId, table.subjectName, table.gradeLevel, table.stream),
]);

export const subjectWeightings = mysqlTable("subject_weightings", {
	weightingId: int("weighting_id").autoincrement().notNull(),
	subjectId: int("subject_id").notNull(),
	gradeLevel: varchar("grade_level", { length: 20 }),
	section: varchar({ length: 50 }),
	weightingType: varchar("weighting_type", { length: 50 }).notNull(),
	percentage: decimal({ precision: 5, scale: 2 }).notNull(),
	academicYear: varchar("academic_year", { length: 10 }).notNull(),
	semester: varchar({ length: 10 }).default('1'),
	staffId: int("staff_id").notNull(),
	tenantId: int("tenant_id").notNull().references(() => tenants.id, { onDelete: "restrict", onUpdate: "restrict" } ),
},
(table) => [
	index("idx_subject_weightings_tenant_id").on(table.tenantId),
]);

export const suppliers = mysqlTable("suppliers", {
	supplierId: int("supplier_id").autoincrement().notNull(),
	tenantId: int("tenant_id").notNull().references(() => tenants.id, { onDelete: "restrict", onUpdate: "restrict" } ),
	supplierName: varchar("supplier_name", { length: 200 }).notNull(),
},
(table) => [
	index("idx_suppliers_tenant_id").on(table.tenantId),
]);

export const supportTickets = mysqlTable("support_tickets", {
	ticketId: int("ticket_id").autoincrement().notNull(),
	tenantId: int("tenant_id").notNull().references(() => tenants.id, { onDelete: "restrict", onUpdate: "restrict" } ),
	openedBy: int("opened_by").notNull(),
	title: varchar({ length: 160 }).notNull(),
	details: text().notNull(),
	category: mysqlEnum(['account','network','hardware','marks','other']).default('other').notNull(),
	priority: mysqlEnum(['low','normal','urgent']).default('normal').notNull(),
	status: mysqlEnum(['Open','InProgress','Resolved','Closed']).default('Open').notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').onUpdateNow().notNull(),
},
(table) => [
	index("idx_support_tickets_tenant_id").on(table.tenantId),
]);

export const systemSettings = mysqlTable("system_settings", {
	settingId: int("setting_id").autoincrement().notNull(),
	settingKey: varchar("setting_key", { length: 100 }).notNull(),
	settingValue: varchar("setting_value", { length: 255 }).notNull(),
	description: text(),
	tenantId: int("tenant_id").notNull().references(() => tenants.id, { onDelete: "restrict", onUpdate: "restrict" } ),
},
(table) => [
	index("idx_system_settings_tenant_id").on(table.tenantId),
	unique("uq_system_settings_tenant_setting_key").on(table.tenantId, table.settingKey),
]);

export const tcBookRecommendations = mysqlTable("tc_book_recommendations", {
	recommendationId: int("recommendation_id").autoincrement().notNull(),
	tenantId: int("tenant_id").notNull().references(() => tenants.id, { onDelete: "restrict", onUpdate: "restrict" } ),
	subjectId: int("subject_id").notNull(),
	title: varchar({ length: 255 }).notNull(),
	author: varchar({ length: 255 }).default("").notNull(),
	reason: varchar({ length: 500 }).notNull(),
	recordedBy: int("recorded_by").notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
},
(table) => [
	index("idx_tc_book_recommendations_tenant_id").on(table.tenantId),
	unique("uq_tc_book_recommendations_title").on(table.tenantId, table.subjectId, table.title),
]);

export const tcExamStandards = mysqlTable("tc_exam_standards", {
	standardId: int("standard_id").autoincrement().notNull(),
	tenantId: int("tenant_id").notNull().references(() => tenants.id, { onDelete: "restrict", onUpdate: "restrict" } ),
	subjectId: int("subject_id").notNull(),
	assessmentName: varchar("assessment_name", { length: 100 }).notNull(),
	maxScore: int("max_score").notNull(),
	recordedBy: int("recorded_by").notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
},
(table) => [
	index("idx_tc_exam_standards_tenant_id").on(table.tenantId),
	unique("uq_tc_exam_standards_name").on(table.tenantId, table.subjectId, table.assessmentName),
]);

export const tcGradeReviews = mysqlTable("tc_grade_reviews", {
	reviewId: int("review_id").autoincrement().notNull(),
	tenantId: int("tenant_id").notNull().references(() => tenants.id, { onDelete: "restrict", onUpdate: "restrict" } ),
	gradeEntryId: int("grade_entry_id").notNull(),
	status: mysqlEnum(['Approved','Sent']).default('Approved').notNull(),
	recordedBy: int("recorded_by").notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
},
(table) => [
	index("idx_tc_grade_reviews_tenant_id").on(table.tenantId),
	unique("uq_tc_grade_reviews_entry").on(table.tenantId, table.gradeEntryId),
]);

export const tcIncidents = mysqlTable("tc_incidents", {
	incidentId: int("incident_id").autoincrement().notNull(),
	tenantId: int("tenant_id").notNull().references(() => tenants.id, { onDelete: "restrict", onUpdate: "restrict" } ),
	studentId: int("student_id").notNull(),
	subjectId: int("subject_id").notNull(),
	category: mysqlEnum(['attendance','academic','behavior','safety']).notNull(),
	summary: varchar({ length: 500 }).notNull(),
	status: mysqlEnum(['Open','Acknowledged','Closed']).default('Open').notNull(),
	recordedBy: int("recorded_by").notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
},
(table) => [
	index("idx_tc_incidents_tenant_id").on(table.tenantId),
]);

export const tcLeaveRequests = mysqlTable("tc_leave_requests", {
	leaveId: int("leave_id").autoincrement().notNull(),
	tenantId: int("tenant_id").notNull().references(() => tenants.id, { onDelete: "restrict", onUpdate: "restrict" } ),
	staffId: int("staff_id").notNull(),
	kind: mysqlEnum(['sick','personal','annual']).notNull(),
	// you can use { mode: 'date' }, if you want to have Date as type for this column
	startsOn: date("starts_on", { mode: 'string' }).notNull(),
	// you can use { mode: 'date' }, if you want to have Date as type for this column
	endsOn: date("ends_on", { mode: 'string' }).notNull(),
	reason: varchar({ length: 500 }).notNull(),
	status: mysqlEnum(['Pending','Approved','Rejected','Withdrawn']).default('Pending').notNull(),
	decidedBy: int("decided_by"),
	createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
},
(table) => [
	index("idx_tc_leave_requests_tenant_id").on(table.tenantId),
]);

export const tcPapers = mysqlTable("tc_papers", {
	paperId: int("paper_id").autoincrement().notNull(),
	tenantId: int("tenant_id").notNull().references(() => tenants.id, { onDelete: "restrict", onUpdate: "restrict" } ),
	subjectId: int("subject_id").notNull(),
	staffId: int("staff_id").notNull(),
	title: varchar({ length: 160 }).notNull(),
	questionCount: int("question_count").notNull(),
	status: mysqlEnum(['Open','Closed']).default('Open').notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
},
(table) => [
	index("idx_tc_papers_tenant_id").on(table.tenantId),
]);

export const tcPaperItems = mysqlTable("tc_paper_items", {
	itemId: int("item_id").autoincrement().notNull(),
	tenantId: int("tenant_id").notNull().references(() => tenants.id, { onDelete: "restrict", onUpdate: "restrict" } ),
	paperId: int("paper_id").notNull(),
	questionId: int("question_id").notNull(),
	position: int().notNull(),
},
(table) => [
	index("idx_tc_paper_items_tenant_id").on(table.tenantId),
]);

export const tcParticipation = mysqlTable("tc_participation", {
	participationId: int("participation_id").autoincrement().notNull(),
	tenantId: int("tenant_id").notNull().references(() => tenants.id, { onDelete: "restrict", onUpdate: "restrict" } ),
	studentId: int("student_id").notNull(),
	subjectId: int("subject_id").notNull(),
	staffId: int("staff_id").notNull(),
	// you can use { mode: 'date' }, if you want to have Date as type for this column
	markedOn: date("marked_on", { mode: 'string' }).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
},
(table) => [
	index("idx_tc_participation_tenant_id").on(table.tenantId),
	unique("uq_tc_participation_day").on(table.tenantId, table.studentId, table.subjectId, table.markedOn),
]);

export const tcPerformance = mysqlTable("tc_performance", {
	performanceId: int("performance_id").autoincrement().notNull(),
	tenantId: int("tenant_id").notNull().references(() => tenants.id, { onDelete: "restrict", onUpdate: "restrict" } ),
	staffId: int("staff_id").notNull(),
	academicYear: varchar("academic_year", { length: 10 }).notNull(),
	term: mysqlEnum(['1','2']).notNull(),
	totalScore: decimal("total_score", { precision: 5, scale: 2 }).notNull(),
	maxScore: decimal("max_score", { precision: 5, scale: 2 }).notNull(),
	note: varchar({ length: 500 }).default("").notNull(),
	recordedBy: int("recorded_by").notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
},
(table) => [
	index("idx_tc_performance_tenant_id").on(table.tenantId),
	unique("uq_tc_performance_term").on(table.tenantId, table.staffId, table.academicYear, table.term),
]);

export const tcPerformanceScores = mysqlTable("tc_performance_scores", {
	scoreId: int("score_id").autoincrement().notNull(),
	tenantId: int("tenant_id").notNull().references(() => tenants.id, { onDelete: "restrict", onUpdate: "restrict" } ),
	performanceId: int("performance_id").notNull(),
	criterion: varchar({ length: 40 }).notNull(),
	maxScore: decimal("max_score", { precision: 5, scale: 2 }).notNull(),
	scoreGiven: decimal("score_given", { precision: 5, scale: 2 }).notNull(),
},
(table) => [
	index("idx_tc_performance_scores_tenant_id").on(table.tenantId),
]);

export const tcQuestions = mysqlTable("tc_questions", {
	questionId: int("question_id").autoincrement().notNull(),
	tenantId: int("tenant_id").notNull().references(() => tenants.id, { onDelete: "restrict", onUpdate: "restrict" } ),
	subjectId: int("subject_id").notNull(),
	staffId: int("staff_id").notNull(),
	topic: varchar({ length: 120 }).notNull(),
	stem: varchar({ length: 1000 }).notNull(),
	optionA: varchar("option_a", { length: 255 }).notNull(),
	optionB: varchar("option_b", { length: 255 }).notNull(),
	optionC: varchar("option_c", { length: 255 }).notNull(),
	optionD: varchar("option_d", { length: 255 }).notNull(),
	correctOption: mysqlEnum("correct_option", ['A','B','C','D']).notNull(),
	points: decimal({ precision: 4, scale: 2 }).default('1.00').notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
},
(table) => [
	index("idx_tc_questions_tenant_id").on(table.tenantId),
]);

export const tcRequisitions = mysqlTable("tc_requisitions", {
	requisitionId: int("requisition_id").autoincrement().notNull(),
	tenantId: int("tenant_id").notNull().references(() => tenants.id, { onDelete: "restrict", onUpdate: "restrict" } ),
	staffId: int("staff_id").notNull(),
	department: varchar({ length: 40 }).notNull(),
	itemName: varchar("item_name", { length: 160 }).notNull(),
	quantity: int().notNull(),
	purpose: varchar({ length: 500 }).notNull(),
	status: mysqlEnum(['Submitted','Sent']).default('Submitted').notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
},
(table) => [
	index("idx_tc_requisitions_tenant_id").on(table.tenantId),
]);

export const tcSubstitutions = mysqlTable("tc_substitutions", {
	substitutionId: int("substitution_id").autoincrement().notNull(),
	tenantId: int("tenant_id").notNull().references(() => tenants.id, { onDelete: "restrict", onUpdate: "restrict" } ),
	timetableId: int("timetable_id").notNull(),
	// you can use { mode: 'date' }, if you want to have Date as type for this column
	coverDate: date("cover_date", { mode: 'string' }).notNull(),
	substituteStaffId: int("substitute_staff_id").notNull(),
	reason: varchar({ length: 255 }).default("").notNull(),
	status: mysqlEnum(['Active','Cancelled']).default('Active').notNull(),
	recordedBy: int("recorded_by").notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
},
(table) => [
	index("idx_tc_substitutions_tenant_id").on(table.tenantId),
	index("idx_tc_substitutions_slot").on(table.tenantId, table.timetableId, table.coverDate),
]);

export const tcSwaps = mysqlTable("tc_swaps", {
	swapId: int("swap_id").autoincrement().notNull(),
	tenantId: int("tenant_id").notNull().references(() => tenants.id, { onDelete: "restrict", onUpdate: "restrict" } ),
	leftTimetableId: int("left_timetable_id").notNull(),
	rightTimetableId: int("right_timetable_id").notNull(),
	academicYear: varchar("academic_year", { length: 10 }).notNull(),
	recordedBy: int("recorded_by").notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
},
(table) => [
	index("idx_tc_swaps_tenant_id").on(table.tenantId),
]);

export const tcTopicCoverage = mysqlTable("tc_topic_coverage", {
	coverageId: int("coverage_id").autoincrement().notNull(),
	tenantId: int("tenant_id").notNull().references(() => tenants.id, { onDelete: "restrict", onUpdate: "restrict" } ),
	planDetailId: int("plan_detail_id").notNull(),
	// you can use { mode: 'date' }, if you want to have Date as type for this column
	coveredOn: date("covered_on", { mode: 'string' }).notNull(),
	recordedBy: int("recorded_by").notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
},
(table) => [
	index("idx_tc_topic_coverage_tenant_id").on(table.tenantId),
	unique("uq_tc_topic_coverage_plan").on(table.tenantId, table.planDetailId),
]);

export const teacherAssignments = mysqlTable("teacher_assignments", {
	assignmentId: int("assignment_id").autoincrement().notNull(),
	staffId: int("staff_id").notNull(),
	subjectId: int("subject_id").notNull(),
	gradeLevel: int("grade_level").notNull(),
	section: varchar({ length: 10 }),
	academicYear: varchar("academic_year", { length: 10 }).default('2025/2026').notNull(),
	tenantId: int("tenant_id").notNull().references(() => tenants.id, { onDelete: "restrict", onUpdate: "restrict" } ),
},
(table) => [
	index("idx_teacher_assignments_tenant_id").on(table.tenantId),
	unique("unique_subject_assignment").on(table.subjectId, table.gradeLevel, table.section, table.academicYear),
]);

export const teacherEvaluations = mysqlTable("teacher_evaluations", {
	evaluationId: int("evaluation_id").autoincrement().notNull(),
	staffId: int("staff_id").notNull(),
	evaluatorId: int("evaluator_id").notNull(),
	evaluationSource: mysqlEnum("evaluation_source", ['V_Principal','Principal','Student','Parent','Final']),
	// you can use { mode: 'date' }, if you want to have Date as type for this column
	evaluationDate: date("evaluation_date", { mode: 'string' }).notNull(),
	academicYear: varchar("academic_year", { length: 10 }).notNull(),
	comments: text(),
	totalScore: decimal("total_score", { precision: 5, scale: 2 }),
	isFinalized: tinyint("is_finalized").default(0),
	tenantId: int("tenant_id").notNull().references(() => tenants.id, { onDelete: "restrict", onUpdate: "restrict" } ),
},
(table) => [
	index("idx_teacher_evaluations_tenant_id").on(table.tenantId),
]);

export const teacherRoleCredits = mysqlTable("teacher_role_credits", {
	roleId: int("role_id").autoincrement().notNull(),
	roleName: varchar("role_name", { length: 100 }),
	maxCredit: int("max_credit"),
	isActive: tinyint("is_active").default(1),
	tenantId: int("tenant_id").notNull().references(() => tenants.id, { onDelete: "restrict", onUpdate: "restrict" } ),
},
(table) => [
	index("idx_teacher_role_credits_tenant_id").on(table.tenantId),
]);

export const tenants = mysqlTable("tenants", {
	id: int().autoincrement().notNull(),
	name: varchar({ length: 255 }).notNull(),
	slug: varchar({ length: 100 }).notNull(),
	status: varchar({ length: 32 }).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
},
(table) => [
	unique("tenants_slug_unique").on(table.slug),
]);

export const users = mysqlTable("users", {
	userId: int("user_id").autoincrement().notNull(),
	username: varchar({ length: 50 }).notNull(),
	passwordHash: varchar("password_hash", { length: 255 }).notNull(),
	tempPassword: varchar("temp_password", { length: 255 }),
	passwordChanged: tinyint("password_changed").default(0),
	role: mysqlEnum(['Teacher','Technician','Secretary','Counselor','Finance','V_Principal','Registrar','Librarian','Store_Keeper','Student','Principal','Procurement']).notNull(),
	resetToken: varchar("reset_token", { length: 255 }),
	resetExpiry: datetime("reset_expiry", { mode: 'string'}),
	isActive: tinyint("is_active").default(1).notNull(),
	lastSeen: timestamp("last_seen", { mode: 'string' }).default('CURRENT_TIMESTAMP').onUpdateNow(),
	tenantId: int("tenant_id").notNull().references(() => tenants.id, { onDelete: "restrict", onUpdate: "restrict" } ),
	tokenVersion: int("token_version").default(0).notNull(),
},
(table) => [
	index("idx_users_tenant_id").on(table.tenantId),
	unique("uq_users_tenant_username").on(table.tenantId, table.username),
]);

export const vocationalRequests = mysqlTable("vocational_requests", {
	requestId: int("request_id").autoincrement().notNull(),
	studentId: int("student_id"),
	subjectId: int("subject_id"),
	requestDate: timestamp("request_date", { mode: 'string' }).default('CURRENT_TIMESTAMP'),
	status: mysqlEnum(['Pending','Assigned','Rejected']).default('Pending'),
	tenantId: int("tenant_id").notNull().references(() => tenants.id, { onDelete: "restrict", onUpdate: "restrict" } ),
},
(table) => [
	index("idx_vocational_requests_tenant_id").on(table.tenantId),
]);

export const vpExamSessions = mysqlTable("vp_exam_sessions", {
	sessionId: int("session_id").autoincrement().notNull(),
	tenantId: int("tenant_id").notNull().references(() => tenants.id, { onDelete: "restrict", onUpdate: "restrict" } ),
	title: varchar({ length: 160 }).notNull(),
	room: varchar({ length: 80 }).notNull(),
	// you can use { mode: 'date' }, if you want to have Date as type for this column
	examDate: date("exam_date", { mode: 'string' }).notNull(),
	startTime: time("start_time").notNull(),
	endTime: time("end_time").notNull(),
	gradeLevel: int("grade_level").notNull(),
	section: varchar({ length: 10 }).notNull(),
	needed: int().default(2).notNull(),
	recordedBy: int("recorded_by").notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
},
(table) => [
	index("idx_vp_exam_sessions_tenant_id").on(table.tenantId),
]);

export const vpHearings = mysqlTable("vp_hearings", {
	hearingId: int("hearing_id").autoincrement().notNull(),
	tenantId: int("tenant_id").notNull().references(() => tenants.id, { onDelete: "restrict", onUpdate: "restrict" } ),
	referralId: int("referral_id").notNull(),
	// you can use { mode: 'date' }, if you want to have Date as type for this column
	heldOn: date("held_on", { mode: 'string' }).notNull(),
	committee: varchar({ length: 255 }).notNull(),
	outcome: mysqlEnum(['Pending','Upheld','Dismissed','Reduced']).default('Pending').notNull(),
	minutes: varchar({ length: 1000 }).default("").notNull(),
	recordedBy: int("recorded_by").notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
},
(table) => [
	index("idx_vp_hearings_tenant_id").on(table.tenantId),
]);

export const vpInvigilators = mysqlTable("vp_invigilators", {
	assignmentId: int("assignment_id").autoincrement().notNull(),
	tenantId: int("tenant_id").notNull().references(() => tenants.id, { onDelete: "restrict", onUpdate: "restrict" } ),
	sessionId: int("session_id").notNull(),
	staffId: int("staff_id").notNull(),
	duty: mysqlEnum(['lead','assistant']).default('assistant').notNull(),
	source: mysqlEnum(['auto','manual']).default('manual').notNull(),
	recordedBy: int("recorded_by").notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
},
(table) => [
	index("idx_vp_invigilators_tenant_id").on(table.tenantId),
	unique("uq_vp_invigilators_session_staff").on(table.tenantId, table.sessionId, table.staffId),
]);

export const vpPenalties = mysqlTable("vp_penalties", {
	penaltyId: int("penalty_id").autoincrement().notNull(),
	tenantId: int("tenant_id").notNull().references(() => tenants.id, { onDelete: "restrict", onUpdate: "restrict" } ),
	referralId: int("referral_id").notNull(),
	kind: mysqlEnum(['warning','detention','suspension','community']).notNull(),
	days: int().default(0).notNull(),
	// you can use { mode: 'date' }, if you want to have Date as type for this column
	startsOn: date("starts_on", { mode: 'string' }).notNull(),
	note: varchar({ length: 255 }).default("").notNull(),
	recordedBy: int("recorded_by").notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
},
(table) => [
	index("idx_vp_penalties_tenant_id").on(table.tenantId),
]);

export const vpPlacements = mysqlTable("vp_placements", {
	placementId: int("placement_id").autoincrement().notNull(),
	tenantId: int("tenant_id").notNull().references(() => tenants.id, { onDelete: "restrict", onUpdate: "restrict" } ),
	programId: int("program_id").notNull(),
	studentId: int("student_id").notNull(),
	status: mysqlEnum(['Applied','Placed','Completed','Withdrawn']).default('Applied').notNull(),
	note: varchar({ length: 255 }).default("").notNull(),
	recordedBy: int("recorded_by").notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
},
(table) => [
	index("idx_vp_placements_tenant_id").on(table.tenantId),
	index("idx_vp_placements_program").on(table.tenantId, table.programId),
]);

export const vpPrograms = mysqlTable("vp_programs", {
	programId: int("program_id").autoincrement().notNull(),
	tenantId: int("tenant_id").notNull().references(() => tenants.id, { onDelete: "restrict", onUpdate: "restrict" } ),
	name: varchar({ length: 160 }).notNull(),
	trade: varchar({ length: 80 }).notNull(),
	gradeLevel: int("grade_level"),
	capacity: int().default(20).notNull(),
	status: mysqlEnum(['Open','Closed']).default('Open').notNull(),
	description: varchar({ length: 500 }).notNull(),
	recordedBy: int("recorded_by").notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
},
(table) => [
	index("idx_vp_programs_tenant_id").on(table.tenantId),
]);

export const vpReferrals = mysqlTable("vp_referrals", {
	referralId: int("referral_id").autoincrement().notNull(),
	tenantId: int("tenant_id").notNull().references(() => tenants.id, { onDelete: "restrict", onUpdate: "restrict" } ),
	studentId: int("student_id").notNull(),
	category: mysqlEnum(['attendance','misconduct','academic','safety']).notNull(),
	severity: mysqlEnum(['low','medium','high']).default('medium').notNull(),
	summary: varchar({ length: 500 }).notNull(),
	status: mysqlEnum(['Escalated','Hearing','Decided','Closed']).default('Escalated').notNull(),
	recordedBy: int("recorded_by").notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
},
(table) => [
	index("idx_vp_referrals_tenant_id").on(table.tenantId),
]);

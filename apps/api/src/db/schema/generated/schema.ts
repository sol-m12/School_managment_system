import { mysqlTable, mysqlSchema, AnyMySqlColumn, int, varchar, text, date, mysqlEnum, timestamp, datetime, unique, time, decimal, index, foreignKey, longtext, float, char, tinyint, bigint } from "drizzle-orm/mysql-core"
import { sql } from "drizzle-orm"

export const adminTasks = mysqlTable("admin_tasks", {
	id: int().autoincrement().notNull(),
	taskName: varchar("task_name", { length: 255 }).notNull(),
	taskDescription: text("task_description"),
	assignedTo: varchar("assigned_to", { length: 100 }),
	// you can use { mode: 'date' }, if you want to have Date as type for this column
	dueDate: date("due_date", { mode: 'string' }),
	status: mysqlEnum(['Pending','In Progress','Completed','Cancelled']).default('Pending'),
	createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
});

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
});

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
});

export const assignmentSubmissions = mysqlTable("assignment_submissions", {
	submissionId: int("submission_id").autoincrement().notNull(),
	assignmentId: int("assignment_id").notNull(),
	studentId: int("student_id").notNull(),
	submissionDate: datetime("submission_date", { mode: 'string'}).default('CURRENT_TIMESTAMP'),
	filePath: varchar("file_path", { length: 255 }),
	status: mysqlEnum(['Pending','Graded']).default('Pending'),
});

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
});

export const auditLog = mysqlTable("audit_log", {
	logId: int("log_id").autoincrement().notNull(),
	userId: int("user_id").notNull(),
	actionType: varchar("action_type", { length: 100 }).notNull(),
	description: text(),
	timestamp: datetime({ mode: 'string'}).default('CURRENT_TIMESTAMP').notNull(),
});

export const classes = mysqlTable("classes", {
	classId: int("class_id").autoincrement().notNull(),
	gradeLevel: int("grade_level").notNull(),
	stream: mysqlEnum(['Natural','Social']),
	section: varchar({ length: 10 }).notNull(),
	classTeacherId: int("class_teacher_id"),
	maxCapacity: int("max_capacity").default(59),
},
(table) => [
	unique("unique_class_section_stream").on(table.gradeLevel, table.section, table.stream),
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
});

export const committeesClubs = mysqlTable("committees_clubs", {
	structureId: int("structure_id").autoincrement().notNull(),
	name: varchar({ length: 150 }).notNull(),
	type: mysqlEnum(['Committee','Club']).notNull(),
	description: text(),
	year: varchar({ length: 10 }),
	isActive: tinyint("is_active").default(1).notNull(),
	createdBy: int("created_by"),
},
(table) => [
	unique("name").on(table.name),
]);

export const committeeMembers = mysqlTable("committee_members", {
	memberId: int("member_id").autoincrement().notNull(),
	structureId: int("structure_id").notNull(),
	staffId: int("staff_id"),
	studentId: int("student_id"),
	parentPgId: int("parent_pg_id"),
	roleInStructure: varchar("role_in_structure", { length: 100 }),
});

export const communicationGroups = mysqlTable("communication_groups", {
	groupId: int("group_id").autoincrement().notNull(),
	groupName: varchar("group_name", { length: 255 }).notNull(),
	groupType: mysqlEnum("group_type", ['Class_Section','Adhoc_Project','Staff_Only','Private_Chat']).default('Class_Section').notNull(),
	createdByStaffId: int("created_by_staff_id").notNull(),
	isActive: tinyint("is_active").default(1).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP'),
});

export const evaluationCriteria = mysqlTable("evaluation_criteria", {
	criteriaId: int("criteria_id").autoincrement().notNull(),
	source: varchar({ length: 50 }).notNull(),
	academicYear: varchar("academic_year", { length: 10 }).notNull(),
	categoryTitle: varchar("category_title", { length: 100 }).notNull(),
	description: text().notNull(),
	maxScore: decimal("max_score", { precision: 4, scale: 2 }).notNull(),
	isActive: tinyint("is_active").default(1),
	createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP'),
});

export const evaluationDetails = mysqlTable("evaluation_details", {
	detailId: int("detail_id").autoincrement().notNull(),
	evaluationId: int("evaluation_id").notNull(),
	criteriaCategory: varchar("criteria_category", { length: 100 }).notNull(),
	criteriaDescription: text("criteria_description").notNull(),
	maxScore: decimal("max_score", { precision: 5, scale: 2 }).notNull(),
	scoreGiven: decimal("score_given", { precision: 5, scale: 2 }).notNull(),
	notes: text(),
});

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
},
(table) => [
	index("exam_id").on(table.examId),
]);

export const examResultsOnline = mysqlTable("exam_results_online", {
	id: int().autoincrement().notNull(),
	examId: int("exam_id").notNull().references(() => onlineExams.examId, { onDelete: "cascade", onUpdate: "restrict" } ),
	studentId: int("student_id").notNull().references(() => students.studentId, { onDelete: "cascade", onUpdate: "restrict" } ),
	totalScore: decimal("total_score", { precision: 5, scale: 2 }).notNull(),
	submittedAt: datetime("submitted_at", { mode: 'string'}).default('CURRENT_TIMESTAMP'),
},
(table) => [
	index("exam_id").on(table.examId),
	index("student_id").on(table.studentId),
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
});

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
});

export const fileShares = mysqlTable("file_shares", {
	shareId: int("share_id").autoincrement().notNull(),
	fileId: int("file_id").notNull(),
	classId: int("class_id").notNull(),
	senderId: int("sender_id").notNull(),
	sharedAt: timestamp("shared_at", { mode: 'string' }).default('CURRENT_TIMESTAMP'),
});

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
});

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
});

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
},
(table) => [
	index("teacher_id").on(table.teacherId),
	index("subject_id").on(table.subjectId),
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
},
(table) => [
	index("group_id").on(table.groupId),
]);

export const groupMembers = mysqlTable("group_members", {
	id: int().autoincrement().notNull(),
	groupId: int("group_id").notNull().references(() => groupsInfo.groupId, { onDelete: "cascade", onUpdate: "restrict" } ),
	studentId: int("student_id").notNull().references(() => students.studentId, { onDelete: "restrict", onUpdate: "restrict" } ),
	isLeader: tinyint("is_leader").default(0),
	isTyping: tinyint("is_typing").default(0),
},
(table) => [
	index("student_id").on(table.studentId),
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
});

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
});

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
},
(table) => [
	index("task_id").on(table.taskId),
	index("group_id").on(table.groupId),
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
},
(table) => [
	index("teacher_id").on(table.teacherId),
	index("subject_id").on(table.subjectId),
]);

export const income = mysqlTable("income", {
	incomeId: int("income_id").autoincrement().notNull(),
	source: varchar({ length: 100 }).notNull(),
	amount: decimal({ precision: 10, scale: 2 }).notNull(),
	// you can use { mode: 'date' }, if you want to have Date as type for this column
	dateReceived: date("date_received", { mode: 'string' }).notNull(),
	recordedBy: int("recorded_by"),
});

export const libraryAttendance = mysqlTable("library_attendance", {
	attendanceId: int("attendance_id").autoincrement().notNull(),
	studentId: int("student_id").references(() => students.studentId, { onDelete: "restrict", onUpdate: "restrict" } ),
	// you can use { mode: 'date' }, if you want to have Date as type for this column
	date: date({ mode: 'string' }),
	shift: mysqlEnum(['Regular','Extra_Time']),
	bookTitle: varchar("book_title", { length: 255 }),
},
(table) => [
	index("student_id").on(table.studentId),
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
},
(table) => [
	unique("accession_number").on(table.accessionNumber),
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
},
(table) => [
	index("book_id").on(table.bookId),
	index("user_id").on(table.userId),
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
},
(table) => [
	index("book_id").on(table.bookId),
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
});

export const liveQuizSessions = mysqlTable("live_quiz_sessions", {
	sessionId: int("session_id").autoincrement().notNull(),
	examId: bigint("exam_id", { mode: "number" }),
	currentQuestionId: int("current_question_id").default(0),
	status: mysqlEnum(['waiting','started','finished']).default('waiting'),
	lastUpdated: timestamp("last_updated", { mode: 'string' }).default('CURRENT_TIMESTAMP').onUpdateNow(),
},
(table) => [
	unique("exam_id").on(table.examId),
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
},
(table) => [
	index("subject_id").on(table.subjectId),
	index("class_id").on(table.classId),
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
});

export const payroll = mysqlTable("payroll", {
	payrollId: int("payroll_id").autoincrement().notNull(),
	staffId: int("staff_id").notNull(),
	// you can use { mode: 'date' }, if you want to have Date as type for this column
	paymentMonth: date("payment_month", { mode: 'string' }).notNull(),
	grossSalary: decimal("gross_salary", { precision: 10, scale: 2 }).notNull(),
	deductions: decimal({ precision: 10, scale: 2 }).default('0.00').notNull(),
	netSalary: decimal("net_salary", { precision: 10, scale: 2 }).notNull(),
	processedBy: int("processed_by"),
});

export const peerAssessments = mysqlTable("peer_assessments", {
	assessmentId: int("assessment_id").autoincrement().notNull(),
	taskId: int("task_id").notNull().references(() => groupTasks.taskId, { onDelete: "restrict", onUpdate: "restrict" } ),
	evaluatorId: int("evaluator_id").notNull().references(() => students.studentId, { onDelete: "restrict", onUpdate: "restrict" } ),
	evaluateeId: int("evaluatee_id").notNull().references(() => students.studentId, { onDelete: "restrict", onUpdate: "restrict" } ),
	contributionRating: int("contribution_rating"),
	comment: text(),
},
(table) => [
	index("task_id").on(table.taskId),
	index("evaluator_id").on(table.evaluatorId),
	index("evaluatee_id").on(table.evaluateeId),
]);

export const periodSettings = mysqlTable("period_settings", {
	id: int().autoincrement().notNull(),
	periodNumber: int("period_number"),
	startTime: time("start_time"),
	endTime: time("end_time"),
	shift: varchar({ length: 20 }),
});

export const schoolNews = mysqlTable("school_news", {
	id: int().autoincrement().notNull(),
	title: varchar({ length: 255 }).notNull(),
	content: text().notNull(),
	image: varchar({ length: 255 }),
	pdfFile: varchar("pdf_file", { length: 255 }),
	videoUrl: varchar("video_url", { length: 255 }),
	category: mysqlEnum(['General','Parents','Donors','Authorities']).default('General'),
	createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP'),
});

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
});

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
});

export const schoolStats = mysqlTable("school_stats", {
	id: int().autoincrement().notNull(),
	statLabel: varchar("stat_label", { length: 50 }).notNull(),
	statValue: int("stat_value").notNull(),
	icon: varchar({ length: 50 }),
});

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
});

export const staff = mysqlTable("staff", {
	staffId: int("staff_id").autoincrement().notNull(),
	firstName: varchar("first_name", { length: 100 }).notNull(),
	lastName: varchar("last_name", { length: 100 }).notNull(),
	gender: mysqlEnum(['Male','Female','Other']),
	role: mysqlEnum(['Teacher','Admin','Technician','Secretary','Counselor','Finance','V_Principal','Registrar','Librarian','Lab_Assistant','Store_Keeper']).notNull(),
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
},
(table) => [
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
});

export const staffFolders = mysqlTable("staff_folders", {
	folderId: int("folder_id").autoincrement().notNull(),
	folderName: varchar("folder_name", { length: 255 }).notNull(),
	createdBy: int("created_by").notNull(),
	academicYear: varchar("academic_year", { length: 10 }),
	semester: varchar({ length: 10 }),
	createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP'),
});

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
},
(table) => [
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
});

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
});

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
},
(table) => [
	index("teacher_id").on(table.teacherId),
	index("subject_id").on(table.subjectId),
	index("student_id").on(table.studentId),
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
},
(table) => [
	unique("unique_subject_grade_stream").on(table.subjectName, table.gradeLevel, table.stream),
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
});

export const systemSettings = mysqlTable("system_settings", {
	settingId: int("setting_id").autoincrement().notNull(),
	settingKey: varchar("setting_key", { length: 100 }).notNull(),
	settingValue: varchar("setting_value", { length: 255 }).notNull(),
	description: text(),
},
(table) => [
	unique("setting_key").on(table.settingKey),
]);

export const teacherAssignments = mysqlTable("teacher_assignments", {
	assignmentId: int("assignment_id").autoincrement().notNull(),
	staffId: int("staff_id").notNull(),
	subjectId: int("subject_id").notNull(),
	gradeLevel: int("grade_level").notNull(),
	section: varchar({ length: 10 }),
	academicYear: varchar("academic_year", { length: 10 }).default('2025/2026').notNull(),
},
(table) => [
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
});

export const teacherRoleCredits = mysqlTable("teacher_role_credits", {
	roleId: int("role_id").autoincrement().notNull(),
	roleName: varchar("role_name", { length: 100 }),
	maxCredit: int("max_credit"),
	isActive: tinyint("is_active").default(1),
});

export const users = mysqlTable("users", {
	userId: int("user_id").autoincrement().notNull(),
	username: varchar({ length: 50 }).notNull(),
	passwordHash: varchar("password_hash", { length: 255 }).notNull(),
	tempPassword: varchar("temp_password", { length: 255 }),
	passwordChanged: tinyint("password_changed").default(0),
	role: mysqlEnum(['Teacher','Admin','Technician','Secretary','Counselor','Finance','V_Principal','Registrar','Librarian','Store_Keeper','Student']).notNull(),
	resetToken: varchar("reset_token", { length: 255 }),
	resetExpiry: datetime("reset_expiry", { mode: 'string'}),
	isActive: tinyint("is_active").default(1).notNull(),
	lastSeen: timestamp("last_seen", { mode: 'string' }).default('CURRENT_TIMESTAMP').onUpdateNow(),
},
(table) => [
	unique("username").on(table.username),
]);

export const vocationalRequests = mysqlTable("vocational_requests", {
	requestId: int("request_id").autoincrement().notNull(),
	studentId: int("student_id"),
	subjectId: int("subject_id"),
	requestDate: timestamp("request_date", { mode: 'string' }).default('CURRENT_TIMESTAMP'),
	status: mysqlEnum(['Pending','Assigned','Rejected']).default('Pending'),
});

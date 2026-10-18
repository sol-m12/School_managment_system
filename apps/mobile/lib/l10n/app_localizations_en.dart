// ignore: unused_import
import 'package:intl/intl.dart' as intl;
import 'app_localizations.dart';

// ignore_for_file: type=lint

/// The translations for English (`en`).
class AppLocalizationsEn extends AppLocalizations {
  AppLocalizationsEn([String locale = 'en']) : super(locale);

  @override
  String get appName => 'Keyt';

  @override
  String get loginTitle => 'Sign in';

  @override
  String get loginWelcomeBack => 'Welcome Back';

  @override
  String get loginSubtitle => 'Sign in to access your portal';

  @override
  String get tenantSlug => 'School ID / Code';

  @override
  String get tenantSlugHint => 'e.g., SCH-104 or School Code';

  @override
  String get username => 'Username or ID';

  @override
  String get usernameHint => 'Enter your username or ID';

  @override
  String get password => 'Password';

  @override
  String get login => 'Sign In';

  @override
  String get rememberMe => 'Remember me';

  @override
  String get forgotPassword => 'Forgot password?';

  @override
  String get forgotPasswordMessage =>
      'Contact your school administrator to reset your password.';

  @override
  String get loginOr => 'OR';

  @override
  String get signInBiometrics => 'Sign in with Biometrics';

  @override
  String get biometricsUnavailable =>
      'Biometric sign-in is not available on this device';

  @override
  String get biometricsNotEnrolled =>
      'Set up fingerprint or Face ID in device settings first';

  @override
  String get biometricsNoCredentials =>
      'Sign in with your password once to enable biometric sign-in';

  @override
  String get biometricsFailed => 'Biometric authentication failed';

  @override
  String get biometricsPrompt => 'Sign in to Keyt';

  @override
  String get biometricsEnableTitle => 'Enable biometric sign-in?';

  @override
  String get biometricsEnableBody =>
      'Use fingerprint or Face ID next time instead of typing your password.';

  @override
  String get biometricsEnableConfirm => 'Enable';

  @override
  String get biometricsEnableSkip => 'Not now';

  @override
  String get biometricsEnabled => 'Biometric sign-in enabled';

  @override
  String get faceIdUsage =>
      'Keyt uses Face ID so you can sign in quickly and securely.';

  @override
  String get sslEncrypted => '256-bit SSL Encrypted • Keyt Secure';

  @override
  String get needAssistance => 'Need assistance?';

  @override
  String get contactSupport => 'Contact Support';

  @override
  String get contactSupportMessage =>
      'Contact your school office for login help.';

  @override
  String get logout => 'Sign out';

  @override
  String get navHome => 'Home';

  @override
  String get navAcademics => 'Academics';

  @override
  String get navAttendance => 'Attendance';

  @override
  String get navLearning => 'Learning';

  @override
  String get navServices => 'Services';

  @override
  String get navMore => 'More';

  @override
  String get offlineBanner => 'You are offline — showing cached data';

  @override
  String lastUpdated(String time) {
    return 'Last updated: $time';
  }

  @override
  String get pullToRefresh => 'Pull to refresh';

  @override
  String get loading => 'Loading…';

  @override
  String get errorGeneric => 'Something went wrong';

  @override
  String get errorNetwork => 'Network error';

  @override
  String get errorUnauthorized => 'Please sign in again';

  @override
  String get errorValidation => 'Invalid input';

  @override
  String get comingSoon => 'Coming soon';

  @override
  String get emptyState => 'No data yet';

  @override
  String get retry => 'Retry';

  @override
  String get language => 'Language';

  @override
  String get languageAmharic => 'Amharic';

  @override
  String get languageEnglish => 'English';

  @override
  String get profile => 'Profile';

  @override
  String get results => 'Results';

  @override
  String get timetable => 'Timetable';

  @override
  String get exams => 'Exams';

  @override
  String get quiz => 'Group quiz';

  @override
  String get assignments => 'Assignments';

  @override
  String get attendance => 'Attendance status';

  @override
  String get discipline => 'Discipline status';

  @override
  String get resources => 'Teacher files';

  @override
  String get simulations => 'Simulations';

  @override
  String get virtualLab => 'Virtual lab';

  @override
  String get groups => 'Groups';

  @override
  String get planner => 'Study planner';

  @override
  String get library => 'Library';

  @override
  String get documents => 'Document request';

  @override
  String get helpdesk => 'Helpdesk';

  @override
  String get vocational => 'Vocational placement';

  @override
  String get digitalId => 'Digital ID';

  @override
  String get notifications => 'Notifications';

  @override
  String get greetingMorning => 'Good morning';

  @override
  String get greetingAfternoon => 'Good afternoon';

  @override
  String get greetingEvening => 'Good evening';

  @override
  String get sectionHub => 'Sections';

  @override
  String get openItem => 'Open';

  @override
  String get submit => 'Submit';

  @override
  String get send => 'Send';

  @override
  String get close => 'Close';

  @override
  String get sessionRestored => 'Session restored';

  @override
  String get roleNotSupported => 'This role is not supported on mobile yet';

  @override
  String get navClasses => 'Classes';

  @override
  String get navTeaching => 'Teaching';

  @override
  String get navOffice => 'Office';

  @override
  String get teacherSchedule => 'Assigned works';

  @override
  String get teacherProfile => 'Teacher profile';

  @override
  String get homeroomAttendance => 'Homeroom attendance';

  @override
  String get subjectAttendance => 'Subject attendance';

  @override
  String get offlineAttendance => 'Offline attendance';

  @override
  String get notHomeroomTeacher =>
      'You are not assigned as a homeroom teacher for any class';

  @override
  String get noAssignedClasses => 'No teaching assignments for this year yet';

  @override
  String get selectClassAndSubject => 'Select a class and subject';

  @override
  String get attendanceLocked => 'Attendance is locked and cannot be changed';

  @override
  String pendingSync(int count) {
    return 'Pending sync ($count)';
  }

  @override
  String get syncNow => 'Sync now';

  @override
  String get syncSuccess => 'Synced successfully';

  @override
  String get syncConflict => 'Some marks conflicted';

  @override
  String get classRoster => 'Class roster';

  @override
  String get studentRegistration => 'Student registration';

  @override
  String get student360 => 'Student 360';

  @override
  String get reportCards => 'Report cards';

  @override
  String get subjectReport => 'Student reports';

  @override
  String get lessonPlans => 'Lesson plans';

  @override
  String get examResults => 'Exam results';

  @override
  String get courseFiles => 'Course files';

  @override
  String get storeRequests => 'Store requests';

  @override
  String get incidents => 'Incidents';

  @override
  String get leaveRequest => 'Leave request';

  @override
  String get questionBank => 'Question bank';

  @override
  String get participation => 'Participation';

  @override
  String get queueAttendance => 'Save offline';

  @override
  String get studentCode => 'Student code';

  @override
  String get scanDigitalId => 'Scan digital ID';

  @override
  String get scanHint => 'Point the camera at a Keyt student QR code';

  @override
  String get scanUnsupported => 'Camera scan is not available on this device';

  @override
  String get scanInvalid => 'Not a valid Keyt student ID';

  @override
  String get scanWrongTenant => 'This ID belongs to another school';

  @override
  String get scanOpenProfile => 'Open student profile';

  @override
  String get notificationsEmpty => 'No announcements right now';

  @override
  String get notificationUrgent => 'Urgent';

  @override
  String get localNotifyChannelName => 'School announcements';

  @override
  String get localNotifyChannelDesc => 'New announcements from your school';

  @override
  String get parentNavHome => 'Home';

  @override
  String get parentNavAcademics => 'Academics';

  @override
  String get parentNavAttendance => 'Attendance';

  @override
  String get parentNavServices => 'Services';

  @override
  String get parentNavHomework => 'Homework';

  @override
  String get parentNavLibrary => 'Library';

  @override
  String get parentNavMessages => 'Messages';

  @override
  String get parentNavMore => 'More';

  @override
  String get parentChildrenDashboard => 'Children dashboard';

  @override
  String get parentAttendance => 'Attendance';

  @override
  String get parentConduct => 'Conduct';

  @override
  String get parentHomework => 'Homework';

  @override
  String get parentLibrary => 'Library';

  @override
  String get parentMessages => 'Messages';

  @override
  String get parentAppointments => 'Appointments';

  @override
  String get parentSchoolFallback => 'School';

  @override
  String get parentEmptyChildren => 'No linked children yet';

  @override
  String get parentSelectChild => 'Select a child';

  @override
  String parentGreeting(String name) {
    return 'Hello, $name';
  }

  @override
  String parentGreetingAm(String name) {
    return 'ሰላም፣ $name';
  }

  @override
  String parentEnrolledChildren(int count) {
    return '$count enrolled children';
  }

  @override
  String parentSchoolsCount(int count) {
    return '$count schools';
  }

  @override
  String get parentVerifiedChildren => 'Verified children';

  @override
  String get parentVerifiedChildrenAm => 'የተረጋገጡ ልጆች';

  @override
  String get parentActiveChild => 'Active';

  @override
  String get parentSwitchChild => 'Switch';

  @override
  String parentReviewingChild(String name, String school) {
    return 'Reviewing records for $name at $school.';
  }

  @override
  String get parentParentCode => 'Parent code';

  @override
  String get parentNoStudentAccount =>
      'This child has no linked student account yet';

  @override
  String get parentCampusServices => 'Campus services';

  @override
  String get parentCampusServicesAm => 'የግቢ አገልግሎቶች';

  @override
  String get parentSendMessage => 'Send message';

  @override
  String get parentBookAppointment => 'Book appointment';

  @override
  String get parentMessageSent => 'Message sent';

  @override
  String get parentAppointmentBooked => 'Appointment requested';

  @override
  String get parentWithRole => 'With';

  @override
  String get parentSubjectName => 'Subject name';

  @override
  String get parentMessageBody => 'Message';

  @override
  String get parentPurpose => 'Purpose';

  @override
  String get parentPreferredDate => 'Preferred date';

  @override
  String get parentPreferredTime => 'Preferred time';

  @override
  String get parentIndicatorDone => 'Done';

  @override
  String get parentIndicatorMissing => 'Missing';

  @override
  String get parentIndicatorPending => 'Pending';

  @override
  String get synced => 'Synced';

  @override
  String get offlineBannerShort => 'Offline';

  @override
  String studentIdLabel(String id) {
    return 'ID: $id';
  }

  @override
  String gradeSection(String grade, String section) {
    return 'Grade $grade$section';
  }

  @override
  String academicYearLabel(String year) {
    return 'Academic year $year';
  }

  @override
  String get quickActions => 'Quick actions';

  @override
  String get todaySimulations => 'Today\'s simulations';

  @override
  String simulationsCount(int count) {
    return '$count simulations';
  }

  @override
  String streamLabel(String stream) {
    return 'Stream: $stream';
  }

  @override
  String get studentRoleLabel => 'Student';

  @override
  String get biometricUnlock => 'Biometric unlock';

  @override
  String get biometricActive => 'Active';

  @override
  String get biometricOff => 'Off';

  @override
  String get signOutBilingual => 'Sign Out';

  @override
  String get schoolPortal => 'School portal';

  @override
  String get noSimulationsYet => 'No simulations for your class yet';

  @override
  String get viewAll => 'View all';

  @override
  String get teacherRoleLabel => 'Teacher';

  @override
  String periodsToday(int count) {
    return '$count periods today';
  }

  @override
  String classesAssigned(int count) {
    return '$count classes assigned';
  }

  @override
  String assignmentsCount(int count) {
    return '$count subjects';
  }

  @override
  String get todaySchedule => 'Today\'s schedule';

  @override
  String get noPeriodsToday => 'No periods scheduled for today';

  @override
  String get takeRoll => 'Take roll';

  @override
  String get offlineReady => 'Offline ready';

  @override
  String syncRecordsPending(int count) {
    return '$count records pending local sync';
  }

  @override
  String semesterLabel(String n) {
    return 'Semester $n';
  }

  @override
  String get askTeacher => 'Ask teacher';

  @override
  String get feeStatus => 'Documents';

  @override
  String get todaySummary => 'Today';

  @override
  String get todaySummaryAm => 'የዛሬው ማጠቃለያ';

  @override
  String get activeNow => 'Active now';

  @override
  String get attendanceTitle => 'Attendance';

  @override
  String get attendanceTitleAm => 'ተሳትፎ';

  @override
  String get academicTitle => 'Academic';

  @override
  String get academicTitleAm => 'ውጤት';

  @override
  String get deadlinesTitle => 'Deadlines';

  @override
  String get deadlinesTitleAm => 'የሚጠበቁ ስራዎች';

  @override
  String get noticeFeedTitle => 'Notice feed';

  @override
  String get noticeFeedTitleAm => 'ማሳሰቢያዎች';

  @override
  String get studyFocusTitle => 'Study focus';

  @override
  String get studyFocusTitleAm => 'የጥናት እቅድ';

  @override
  String get overallRate => 'Overall rate';

  @override
  String get overallRateAm => 'አጠቃላይ ተሳትፎ';

  @override
  String get presentCount => 'Present';

  @override
  String get absentCount => 'Absent';

  @override
  String get tardyCount => 'Tardy';

  @override
  String get noAttendanceYet => 'No attendance records yet';

  @override
  String get noScheduleToday => 'No classes scheduled for today';

  @override
  String get semesterAverage => 'Semester average';

  @override
  String classRank(String rank) {
    return 'Rank $rank';
  }

  @override
  String get editProfile => 'Edit profile';

  @override
  String get tenantSession => 'School session';

  @override
  String get studentAccount => 'Student account';

  @override
  String get signOutSession => 'Sign out of session';

  @override
  String get learningHub => 'Learning hub';

  @override
  String get learningHubAm => 'መማሪያ';

  @override
  String get launchSimulation => 'Launch simulation';

  @override
  String get noResourcesYet => 'No teacher files yet';

  @override
  String get noGroupsYet => 'No study groups yet';

  @override
  String get subjectBreakdown => 'Subject breakdown';

  @override
  String get absenceLogs => 'Attendance log';

  @override
  String get goodStanding => 'Good standing';

  @override
  String get enrolledSubjects => 'Enrolled subjects';

  @override
  String get noResultsYet => 'No results published yet';

  @override
  String enrolledStudents(int count) {
    return '$count enrolled students';
  }

  @override
  String get markAllPresent => 'Mark all present';

  @override
  String get searchStudent => 'Search name or ID';

  @override
  String get excusedCount => 'Excused';

  @override
  String get borrowedBooks => 'Borrowed books';

  @override
  String get noBorrowedBooks => 'No borrowed books';

  @override
  String get documentRequests => 'Document requests';

  @override
  String get noDocumentRequests => 'No document requests';

  @override
  String get readyStatus => 'Ready';

  @override
  String get inReviewStatus => 'In review';

  @override
  String get overdueStatus => 'Overdue';

  @override
  String get returnedStatus => 'Returned';

  @override
  String get openStudent360 => 'Open profile';

  @override
  String get attendanceSummary => 'Attendance';

  @override
  String get averageScore => 'Average';

  @override
  String get dayMon => 'Mon';

  @override
  String get dayTue => 'Tue';

  @override
  String get dayWed => 'Wed';

  @override
  String get dayThu => 'Thu';

  @override
  String get dayFri => 'Fri';

  @override
  String get daySat => 'Sat';

  @override
  String get daySun => 'Sun';

  @override
  String periodBadge(String n) {
    return 'P$n';
  }

  @override
  String get upcomingStatus => 'Upcoming';

  @override
  String get completedStatus => 'Completed';

  @override
  String get myTimetable => 'My classes';

  @override
  String get schoolTimetable => 'School';

  @override
  String get substitutionsSection => 'Substitutions';

  @override
  String get noClassesThisDay => 'No classes on this day';

  @override
  String get weeklySchedule => 'Weekly schedule';

  @override
  String get weeklyScheduleAm => 'ሳምንታዊ የጊዜ ሰሌዳ';

  @override
  String get examScheduleSection => 'Exam schedule';

  @override
  String get assignedClasses => 'Assigned classes';

  @override
  String get clubsTitle => 'Clubs';

  @override
  String get patronTitle => 'My club patronage';

  @override
  String get searchClubs => 'Search clubs';

  @override
  String get emptyCatalog => 'No approved clubs match this search.';

  @override
  String get joinClub => 'Apply to join';

  @override
  String get joinRequested => 'Your membership request was sent.';

  @override
  String get myClubs => 'My memberships';

  @override
  String get emptyMine => 'You have not joined a club yet.';

  @override
  String get president => 'Student president';

  @override
  String get patron => 'Teacher patron';

  @override
  String get memberPending => 'Pending';

  @override
  String get memberActive => 'Active';

  @override
  String get memberRejected => 'The application was rejected.';

  @override
  String get memberWithdrawn => 'Withdrawn';

  @override
  String get withdraw => 'Withdraw request';

  @override
  String get withdrawn => 'The request was withdrawn.';

  @override
  String get upcomingMeetings => 'Upcoming meetings';

  @override
  String get noMeetings => 'No upcoming meetings.';

  @override
  String get elections => 'Elections';

  @override
  String get emptyElections => 'No elections are open.';

  @override
  String voteFor(String name) {
    return 'Vote for $name';
  }

  @override
  String get voteCast => 'Your vote was recorded.';

  @override
  String get alreadyVoted => 'You already voted in this election.';

  @override
  String get emptyPatron => 'You are not assigned as patron of any club.';

  @override
  String get pendingMembers => 'Pending members';

  @override
  String get noPending => 'No pending applications.';

  @override
  String get approve => 'Approve';

  @override
  String get reject => 'Reject';

  @override
  String get memberApproved => 'The member was approved.';

  @override
  String get scheduleMeeting => 'Schedule a meeting';

  @override
  String get meetingTitle => 'Meeting title';

  @override
  String get meetsOn => 'Date and time';

  @override
  String get location => 'Location';

  @override
  String get saveMeeting => 'Save meeting';

  @override
  String get meetingSaved => 'The meeting was saved.';

  @override
  String get activityReport => 'Activity report';

  @override
  String get reportTitle => 'Report title';

  @override
  String get reportDate => 'Report date';

  @override
  String get reportBody => 'Report text';

  @override
  String get saveReport => 'Save report';

  @override
  String get reportSaved => 'The report was saved.';
}

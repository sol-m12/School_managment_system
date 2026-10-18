// ignore: unused_import
import 'package:intl/intl.dart' as intl;
import 'app_localizations.dart';

// ignore_for_file: type=lint

/// The translations for Amharic (`am`).
class AppLocalizationsAm extends AppLocalizations {
  AppLocalizationsAm([String locale = 'am']) : super(locale);

  @override
  String get appName => 'ኬይት';

  @override
  String get loginTitle => 'መግቢያ';

  @override
  String get loginWelcomeBack => 'እንኳን ደህና መጡ';

  @override
  String get loginSubtitle => 'ወደ ፖርታልዎ ለመግባት ይግቡ';

  @override
  String get tenantSlug => 'የትምህርት ቤት መለያ / ኮድ';

  @override
  String get tenantSlugHint => 'ለምሳሌ SCH-104 ወይም የትምህርት ቤት ኮድ';

  @override
  String get username => 'የተጠቃሚ ስም ወይም መለያ';

  @override
  String get usernameHint => 'የተጠቃሚ ስምዎን ወይም መለያዎን ያስገቡ';

  @override
  String get password => 'የይለፍ ቃል';

  @override
  String get login => 'ግባ';

  @override
  String get rememberMe => 'አስታውሰኝ';

  @override
  String get forgotPassword => 'የይለፍ ቃል ረሱ?';

  @override
  String get forgotPasswordMessage =>
      'የይለፍ ቃልዎን ለመቀየር የትምህርት ቤት አስተዳዳሪዎን ያነጋግሩ።';

  @override
  String get loginOr => 'ወይም';

  @override
  String get signInBiometrics => 'በባዮሜትሪክስ ይግቡ';

  @override
  String get biometricsUnavailable => 'በባዮሜትሪክስ መግባት በዚህ መሣሪያ አይገኝም';

  @override
  String get biometricsNotEnrolled =>
      'በመጀመሪያ በመሣሪያ ቅንብሮች የጣት አሻራ ወይም Face ID ያዘጋጁ';

  @override
  String get biometricsNoCredentials => 'በባዮሜትሪክስ ለመግባት አንድ ጊዜ በየይለፍ ቃል ይግቡ';

  @override
  String get biometricsFailed => 'የባዮሜትሪክ ማረጋገጫ አልተሳካም';

  @override
  String get biometricsPrompt => 'ወደ ኬይት ይግቡ';

  @override
  String get biometricsEnableTitle => 'በባዮሜትሪክስ መግባት ይንቃ?';

  @override
  String get biometricsEnableBody =>
      'በሚቀጥለው ጊዜ የይለፍ ቃል ከመተየብ ይልቅ የጣት አሻራ ወይም Face ID ይጠቀሙ።';

  @override
  String get biometricsEnableConfirm => 'አንቃ';

  @override
  String get biometricsEnableSkip => 'አሁን አይደለም';

  @override
  String get biometricsEnabled => 'በባዮሜትሪክስ መግባት ነቅቷል';

  @override
  String get faceIdUsage => 'ኬይት Face IDን በፍጥነትና በደህንነት ለመግባት ይጠቀማል።';

  @override
  String get sslEncrypted => '256-ቢት SSL የተመሰጠረ • ኬይት ደህንነት';

  @override
  String get needAssistance => 'እገዛ ይፈልጋሉ?';

  @override
  String get contactSupport => 'ድጋፍ ያግኙ';

  @override
  String get contactSupportMessage => 'ለመግቢያ እገዛ የትምህርት ቤት ቢሮዎን ያነጋግሩ።';

  @override
  String get logout => 'ውጣ';

  @override
  String get navHome => 'መነሻ';

  @override
  String get navAcademics => 'ትምህርት';

  @override
  String get navAttendance => 'መገኘት';

  @override
  String get navLearning => 'መማር';

  @override
  String get navServices => 'አገልግሎቶች';

  @override
  String get navMore => 'ተጨማሪ';

  @override
  String get offlineBanner => 'ከመስመር ውጭ ነዎት — የተቀመጠ ውሂብ እያሳየ ነው';

  @override
  String lastUpdated(String time) {
    return 'መጨረሻ የዘመነው፡ $time';
  }

  @override
  String get pullToRefresh => 'እንደገና ለማደስ ይጎትቱ';

  @override
  String get loading => 'በመጫን ላይ…';

  @override
  String get errorGeneric => 'ስህተት ተከስቷል';

  @override
  String get errorNetwork => 'የአውታረ መረብ ችግር';

  @override
  String get errorUnauthorized => 'እባክዎ እንደገና ይግቡ';

  @override
  String get errorValidation => 'ትክክል ያልሆነ ግብዓት';

  @override
  String get comingSoon => 'በቅርብ ቀን';

  @override
  String get emptyState => 'ምንም ውሂብ የለም';

  @override
  String get retry => 'እንደገና ሞክር';

  @override
  String get language => 'ቋንቋ';

  @override
  String get languageAmharic => 'አማርኛ';

  @override
  String get languageEnglish => 'English';

  @override
  String get profile => 'መገለጫ';

  @override
  String get results => 'ውጤቶች';

  @override
  String get timetable => 'የጊዜ ሰሌዳ';

  @override
  String get exams => 'ፈተናዎች';

  @override
  String get quiz => 'ፈተና ውድድር';

  @override
  String get assignments => 'ስራዎች';

  @override
  String get attendance => 'የመገኘት ሁኔታ';

  @override
  String get discipline => 'የዲሲፕሊን ሁኔታ';

  @override
  String get resources => 'የመምህር ፋይሎች';

  @override
  String get simulations => 'ሲሙሌሽን';

  @override
  String get virtualLab => 'ቨርቹዋል ላብ';

  @override
  String get groups => 'ቡድን';

  @override
  String get planner => 'የጥናት እቅድ';

  @override
  String get library => 'ቤተ-መጽሐፍት';

  @override
  String get documents => 'ሰነድ ጥያቄ';

  @override
  String get helpdesk => 'እገዛ';

  @override
  String get vocational => 'ሙያ ምደባ';

  @override
  String get digitalId => 'ዲጂታል መታወቂያ';

  @override
  String get notifications => 'ማሳወቂያዎች';

  @override
  String get greetingMorning => 'እንደምን አደሩ';

  @override
  String get greetingAfternoon => 'እንደምን ዋሉ';

  @override
  String get greetingEvening => 'እንደምን አመሸ';

  @override
  String get sectionHub => 'ክፍሎች';

  @override
  String get openItem => 'ክፈት';

  @override
  String get submit => 'አስገባ';

  @override
  String get send => 'ላክ';

  @override
  String get close => 'ዝጋ';

  @override
  String get sessionRestored => 'ክፍለ ጊዜ ተመልሷል';

  @override
  String get roleNotSupported => 'ይህ ሚና በሞባይል ገና አይደገፍም';

  @override
  String get navClasses => 'ክፍሎች';

  @override
  String get navTeaching => 'ማስተማረ';

  @override
  String get navOffice => 'ጂቤት';

  @override
  String get teacherSchedule => 'የተመደቡ ስራዎች';

  @override
  String get teacherProfile => 'የመምህር መገለጫ';

  @override
  String get homeroomAttendance => 'የክፍል መገኘት';

  @override
  String get subjectAttendance => 'የትምህርት መገኘት';

  @override
  String get offlineAttendance => 'ከመስመር ውጭ መገኘት';

  @override
  String get notHomeroomTeacher => 'እርስዎ ለምንም ክፍል የቤት ክፍል መምህር አይደሉም';

  @override
  String get noAssignedClasses => 'ለዚህ ዓመት የተመደበ ትምህርት የለም';

  @override
  String get selectClassAndSubject => 'ክፍል እና ትምህርት ይምረጡ';

  @override
  String get attendanceLocked => 'መገኘት ተቆልፏል፤ መቀየር አይቻልም';

  @override
  String pendingSync(int count) {
    return 'የሚጠባቀ ስርኻት ($count)';
  }

  @override
  String get syncNow => 'አሁን አስማማር';

  @override
  String get syncSuccess => 'በተሳካ ሁኔታ ተሳማማረ';

  @override
  String get syncConflict => 'አንዳንድ ምልክቶች ተጋጠሙ';

  @override
  String get classRoster => 'የክፍል ዘርዝር';

  @override
  String get studentRegistration => 'የተማሪ ምዝግባ';

  @override
  String get student360 => 'ተማሪ 360';

  @override
  String get reportCards => 'የውጤት ካርድ';

  @override
  String get subjectReport => 'የተማሪዎች ሪፖርት';

  @override
  String get lessonPlans => 'የትምህርት እቅዶች';

  @override
  String get examResults => 'የፈተና ውጤቶች';

  @override
  String get courseFiles => 'የክርስ ፋይሎች';

  @override
  String get storeRequests => 'የማዝገቢያ ጥያቄዎች';

  @override
  String get incidents => 'ኡደቶች';

  @override
  String get leaveRequest => 'የፍቃድ ጥያቄ';

  @override
  String get questionBank => 'የጥያቄ ባንክ';

  @override
  String get participation => 'ተሳትፎ';

  @override
  String get queueAttendance => 'ከመስመር ውጭ አስቀምጥ';

  @override
  String get studentCode => 'የተማሪ ከድ';

  @override
  String get scanDigitalId => 'ዲጂታል መታወቂያ ስካን';

  @override
  String get scanHint => 'የኬይት የተማሪ QR ከድ ያንብቡ';

  @override
  String get scanUnsupported => 'የካሜራ ስካን በዚህ ማሽን አይተከላም';

  @override
  String get scanInvalid => 'ትክክል የኬይት የተማሪ መታወቂያ አይደለም';

  @override
  String get scanWrongTenant => 'ይህ መታወቂያ የሌላ ትምህርት ቤት ነው';

  @override
  String get scanOpenProfile => 'የተማሪ መገለጫ ክፈት';

  @override
  String get notificationsEmpty => 'አሁን ማሳወቂያ የለም';

  @override
  String get notificationUrgent => 'አስአኻይ';

  @override
  String get localNotifyChannelName => 'የትምህርት ቤት ማሳወቂያዎች';

  @override
  String get localNotifyChannelDesc => 'አዲስ ማሳወቂያዎች ከትምህርት ቤትዎ';

  @override
  String get parentNavHome => 'መነሻ';

  @override
  String get parentNavAcademics => 'ትምህርት';

  @override
  String get parentNavAttendance => 'መገኘት';

  @override
  String get parentNavServices => 'አገልግሎቶች';

  @override
  String get parentNavHomework => 'የቤት ስራ';

  @override
  String get parentNavLibrary => 'ቤተ-መጻሕፍት';

  @override
  String get parentNavMessages => 'መልእክት';

  @override
  String get parentNavMore => 'ተጨማሪ';

  @override
  String get parentChildrenDashboard => 'የልጆች ዳሽቦርድ';

  @override
  String get parentAttendance => 'መገኘት';

  @override
  String get parentConduct => 'ስነ-ምግባር';

  @override
  String get parentHomework => 'የቤት ስራ';

  @override
  String get parentLibrary => 'ቤተ-መጻሕፍት';

  @override
  String get parentMessages => 'መልእክት';

  @override
  String get parentAppointments => 'ቀጠሮ';

  @override
  String get parentSchoolFallback => 'ትምህርት ቤት';

  @override
  String get parentEmptyChildren => 'ምንም የተገናኘ ልጅ የለም';

  @override
  String get parentSelectChild => 'ልጅ ይምረጡ';

  @override
  String parentGreeting(String name) {
    return 'ሰላም፣ $name';
  }

  @override
  String parentGreetingAm(String name) {
    return 'ሰላም፣ $name';
  }

  @override
  String parentEnrolledChildren(int count) {
    return '$count የተመዘገቡ ልጆች';
  }

  @override
  String parentSchoolsCount(int count) {
    return '$count ትምህርት ቤቶች';
  }

  @override
  String get parentVerifiedChildren => 'የተረጋገጡ ልጆች';

  @override
  String get parentVerifiedChildrenAm => 'የተረጋገጡ ልጆች';

  @override
  String get parentActiveChild => 'ንቁ';

  @override
  String get parentSwitchChild => 'ቀይር';

  @override
  String parentReviewingChild(String name, String school) {
    return 'የ$name መዝገብ በ$school እያዩ ነው።';
  }

  @override
  String get parentParentCode => 'የወላጅ ኮድ';

  @override
  String get parentNoStudentAccount => 'ይህ ልጅ ገና የተማሪ መለያ የለውም';

  @override
  String get parentCampusServices => 'የግቢ አገልግሎቶች';

  @override
  String get parentCampusServicesAm => 'የግቢ አገልግሎቶች';

  @override
  String get parentSendMessage => 'መልእክት ላክ';

  @override
  String get parentBookAppointment => 'ቀጠሮ ያስይዙ';

  @override
  String get parentMessageSent => 'መልእክት ተልኳል';

  @override
  String get parentAppointmentBooked => 'ቀጠሮ ተጠይቋል';

  @override
  String get parentWithRole => 'ለማን';

  @override
  String get parentSubjectName => 'የትምህርት ስም';

  @override
  String get parentMessageBody => 'መልእክት';

  @override
  String get parentPurpose => 'ዓላማ';

  @override
  String get parentPreferredDate => 'የሚመረጥ ቀን';

  @override
  String get parentPreferredTime => 'የሚመረጥ ሰዓት';

  @override
  String get parentIndicatorDone => 'ተሰርቷል';

  @override
  String get parentIndicatorMissing => 'ጎድሏል';

  @override
  String get parentIndicatorPending => 'በመጠባበቅ ላይ';

  @override
  String get synced => 'ተሰምሯል';

  @override
  String get offlineBannerShort => 'ከመስመር ውጭ';

  @override
  String studentIdLabel(String id) {
    return 'መለያ፡ $id';
  }

  @override
  String gradeSection(String grade, String section) {
    return 'ክፍል $grade$section';
  }

  @override
  String academicYearLabel(String year) {
    return 'የትምህርት ዘመን $year';
  }

  @override
  String get quickActions => 'ፈጣን እርምጃዎች';

  @override
  String get todaySimulations => 'የዛሬ ሲሙሌሽኖች';

  @override
  String simulationsCount(int count) {
    return '$count ሲሙሌሽኖች';
  }

  @override
  String streamLabel(String stream) {
    return 'የትምህርት አቅጣጫ፡ $stream';
  }

  @override
  String get studentRoleLabel => 'ተማሪ';

  @override
  String get biometricUnlock => 'ባዮሜትሪክ መክፈቻ';

  @override
  String get biometricActive => 'ነቅቷል';

  @override
  String get biometricOff => 'ጠፍቷል';

  @override
  String get signOutBilingual => 'ውጣ';

  @override
  String get schoolPortal => 'የትምህርት ቤት ፖርታል';

  @override
  String get noSimulationsYet => 'ለክፍልዎ ሲሙሌሽን የለም';

  @override
  String get viewAll => 'ሁሉንም ይመልከቱ';

  @override
  String get teacherRoleLabel => 'መምህር';

  @override
  String periodsToday(int count) {
    return 'ዛሬ $count ጊዜያት';
  }

  @override
  String classesAssigned(int count) {
    return '$count ክፍሎች ተመድበዋል';
  }

  @override
  String assignmentsCount(int count) {
    return '$count ትምህርቶች';
  }

  @override
  String get todaySchedule => 'የዛሬ የጊዜ ሰሌዳ';

  @override
  String get noPeriodsToday => 'ለዛሬ የተመደበ ጊዜ የለም';

  @override
  String get takeRoll => 'መገኘት ይውሰዱ';

  @override
  String get offlineReady => 'ከመስመር ውጭ ዝግጁ';

  @override
  String syncRecordsPending(int count) {
    return '$count መዝገቦች ለአካባቢያዊ ማስማማት በመጠባበቅ ላይ';
  }

  @override
  String semesterLabel(String n) {
    return 'ሴሚስተር $n';
  }

  @override
  String get askTeacher => 'መምህር ጠይቅ';

  @override
  String get feeStatus => 'ሰነዶች';

  @override
  String get todaySummary => 'ዛሬ';

  @override
  String get todaySummaryAm => 'የዛሬው ማጠቃለያ';

  @override
  String get activeNow => 'አሁን በሂደት ላይ';

  @override
  String get attendanceTitle => 'ተሳትፎ';

  @override
  String get attendanceTitleAm => 'ተሳትፎ';

  @override
  String get academicTitle => 'ውጤት';

  @override
  String get academicTitleAm => 'ውጤት';

  @override
  String get deadlinesTitle => 'የሚጠበቁ ስራዎች';

  @override
  String get deadlinesTitleAm => 'የሚጠበቁ ስራዎች';

  @override
  String get noticeFeedTitle => 'ማሳሰቢያዎች';

  @override
  String get noticeFeedTitleAm => 'ማሳሰቢያዎች';

  @override
  String get studyFocusTitle => 'የጥናት እቅድ';

  @override
  String get studyFocusTitleAm => 'የጥናት እቅድ';

  @override
  String get overallRate => 'አጠቃላይ ተሳትፎ';

  @override
  String get overallRateAm => 'አጠቃላይ ተሳትፎ';

  @override
  String get presentCount => 'ተገኝተዋል';

  @override
  String get absentCount => 'ቀርተዋል';

  @override
  String get tardyCount => 'ዘግይተዋል';

  @override
  String get noAttendanceYet => 'የመገኘት መዝገብ የለም';

  @override
  String get noScheduleToday => 'ለዛሬ የተመደበ ትምህርት የለም';

  @override
  String get semesterAverage => 'የሴሚስተር አማካይ';

  @override
  String classRank(String rank) {
    return 'ደረጃ $rank';
  }

  @override
  String get editProfile => 'መገለጫ አርትዕ';

  @override
  String get tenantSession => 'የትምህርት ቤት መለያ';

  @override
  String get studentAccount => 'የተማሪ መለያ';

  @override
  String get signOutSession => 'ከመለያ ውጣ';

  @override
  String get learningHub => 'መማሪያ';

  @override
  String get learningHubAm => 'መማሪያ';

  @override
  String get launchSimulation => 'ሲሙሌሽን ጀምር';

  @override
  String get noResourcesYet => 'የመምህር ፋይል የለም';

  @override
  String get noGroupsYet => 'የጥናት ቡድን የለም';

  @override
  String get subjectBreakdown => 'የትምህርት ዓይነቶች ተሳትፎ';

  @override
  String get absenceLogs => 'የመገኘት መዝገብ';

  @override
  String get goodStanding => 'ጥሩ ሁኔታ';

  @override
  String get enrolledSubjects => 'የተመዘገቡ ትምህርቶች';

  @override
  String get noResultsYet => 'ውጤት ገና አልወጣም';

  @override
  String enrolledStudents(int count) {
    return '$count የተመዘገቡ ተማሪዎች';
  }

  @override
  String get markAllPresent => 'ሁሉንም ተገኝተዋል አድርግ';

  @override
  String get searchStudent => 'ስም ወይም መለያ ፈልግ';

  @override
  String get excusedCount => 'በፍቃድ';

  @override
  String get borrowedBooks => 'የተበደሩ መጻሕፍት';

  @override
  String get noBorrowedBooks => 'የተበደረ መጽሐፍ የለም';

  @override
  String get documentRequests => 'የሰነድ ጥያቄዎች';

  @override
  String get noDocumentRequests => 'የሰነድ ጥያቄ የለም';

  @override
  String get readyStatus => 'ዝግጁ';

  @override
  String get inReviewStatus => 'በግምገማ ላይ';

  @override
  String get overdueStatus => 'ጊዜው አልፏል';

  @override
  String get returnedStatus => 'ተመልሷል';

  @override
  String get openStudent360 => 'መገለጫ ክፈት';

  @override
  String get attendanceSummary => 'መገኘት';

  @override
  String get averageScore => 'አማካይ';

  @override
  String get dayMon => 'ሰኞ';

  @override
  String get dayTue => 'ማክሰ';

  @override
  String get dayWed => 'ረቡዕ';

  @override
  String get dayThu => 'ሐሙስ';

  @override
  String get dayFri => 'አርብ';

  @override
  String get daySat => 'ቅዳሜ';

  @override
  String get daySun => 'እሑድ';

  @override
  String periodBadge(String n) {
    return 'ፒ$n';
  }

  @override
  String get upcomingStatus => 'ይመጣል';

  @override
  String get completedStatus => 'ተጠናቋል';

  @override
  String get myTimetable => 'የእኔ ክፍሎች';

  @override
  String get schoolTimetable => 'ትምህርት ቤት';

  @override
  String get substitutionsSection => 'ተተኪዎች';

  @override
  String get noClassesThisDay => 'በዚህ ቀን ክፍል የለም';

  @override
  String get weeklySchedule => 'ሳምንታዊ የጊዜ ሰሌዳ';

  @override
  String get weeklyScheduleAm => 'ሳምንታዊ የጊዜ ሰሌዳ';

  @override
  String get examScheduleSection => 'የፈተና ሰሌዳ';

  @override
  String get assignedClasses => 'የተመደቡ ክፍሎች';

  @override
  String get clubsTitle => 'ክለቦች';

  @override
  String get patronTitle => 'የእኔ የክለብ አስተዳደር';

  @override
  String get searchClubs => 'ክለቦችን ፈልግ';

  @override
  String get emptyCatalog => 'እስካሁን የተመዘገበ ነገር የለም።';

  @override
  String get joinClub => 'ለመቀላቀል ጠይቅ';

  @override
  String get joinRequested => 'የአባልነት ጥያቄዎ ተልኳል።';

  @override
  String get myClubs => 'የእኔ አባልነቶች';

  @override
  String get emptyMine => 'እስካሁን ክለብ አልተቀላቀሉም።';

  @override
  String get president => 'የክለብ ፕሬዚዳንት';

  @override
  String get patron => 'የክለብ መምህር';

  @override
  String get memberPending => 'በመጠባበቅ ላይ';

  @override
  String get memberActive => 'ንቁ';

  @override
  String get memberRejected => 'ጥያቄው ውድቅ ሆኗል።';

  @override
  String get memberWithdrawn => 'ተሰርዟል';

  @override
  String get withdraw => 'ጥያቄ ሰርዝ';

  @override
  String get withdrawn => 'ጥያቄው ተሰርዟል።';

  @override
  String get upcomingMeetings => 'መጪ ስብሰባዎች';

  @override
  String get noMeetings => 'መጪ ስብሰባ የለም።';

  @override
  String get elections => 'ምርጫዎች';

  @override
  String get emptyElections => 'ክፍት ምርጫ የለም።';

  @override
  String voteFor(String name) {
    return 'ለ$name ድምጽ ስጥ';
  }

  @override
  String get voteCast => 'ድምጽዎ ተመዝግቧል።';

  @override
  String get alreadyVoted => 'በዚህ ምርጫ አስቀድመው ድምጽ ሰጥተዋል።';

  @override
  String get emptyPatron => 'ለማንኛውም ክለብ እንደ መምህር አልተመደቡም።';

  @override
  String get pendingMembers => 'በመጠባበቅ ላይ ያሉ አባላት';

  @override
  String get noPending => 'በመጠባበቅ ላይ ያለ ጥያቄ የለም።';

  @override
  String get approve => 'አጽድቅ';

  @override
  String get reject => 'ውድቅ አድርግ';

  @override
  String get memberApproved => 'አባሉ ጸድቋል።';

  @override
  String get scheduleMeeting => 'ስብሰባ መርሐግብር';

  @override
  String get meetingTitle => 'የስብሰባ ርዕስ';

  @override
  String get meetsOn => 'ቀን እና ሰዓት';

  @override
  String get location => 'ቦታ';

  @override
  String get saveMeeting => 'ስብሰባ አስቀምጥ';

  @override
  String get meetingSaved => 'ስብሰባው ተቀምጧል።';

  @override
  String get activityReport => 'የእንቅስቃሴ ሪፖርት';

  @override
  String get reportTitle => 'የሪፖርት ርዕስ';

  @override
  String get reportDate => 'የሪፖርት ቀን';

  @override
  String get reportBody => 'የሪፖርት ጽሑፍ';

  @override
  String get saveReport => 'ሪፖርት አስቀምጥ';

  @override
  String get reportSaved => 'ሪፖርቱ ተቀምጧል።';

  @override
  String get subject => 'ትምህርት';

  @override
  String get section => 'ሴክሽን';

  @override
  String get topic => 'ርዕስ';

  @override
  String get questionStem => 'ጥያቄ';

  @override
  String get correctOption => 'ትክክለኛው ምርጫ';

  @override
  String get pointsLabel => 'ነጥብ';

  @override
  String get addQuestion => 'ጥያቄ ጨምር';

  @override
  String get saveQuestion => 'ጥያቄ አስቀምጥ';

  @override
  String get generatePaper => 'ወረቀት አዘጋጅ';

  @override
  String get paperTitle => 'የወረቀት ርዕስ';

  @override
  String get questionCount => 'የጥያቄ ብዛት';

  @override
  String get emptyQuestionsBank => 'በባንኩ ውስጥ ጥያቄ የለም።';

  @override
  String get papers => 'ወረቀቶች';

  @override
  String get createExam => 'ፈተናውን ፍጠር';

  @override
  String get examTitle => 'የፈተናው መጠሪያ (Exam Title)';

  @override
  String get gradePick => 'ክፍል (Grade)';

  @override
  String get noSubjectsAssigned => 'እስካሁን የተመደበ ትምህርት የለዎትም።';

  @override
  String get noSections => 'ለዚህ ክፍል ሴክሽን የለም።';

  @override
  String get examPassword => 'ሚስጥር ቁጥር (Exam Password)';

  @override
  String get durationMinutes => 'የፈተና ቆይታ (ደቂቃ)';

  @override
  String get emptyExams => 'ፈተና የለም።';

  @override
  String get publishExam => 'ልቀቅ';

  @override
  String get closeExam => 'ቆልፍ';

  @override
  String get addExamQuestion => 'ጥያቄ ጨምር';

  @override
  String get examCreated => 'ፈተናው ተፈጥሯል።';

  @override
  String get questionSaved => 'ጥያቄው ተጨምሯል።';

  @override
  String get paperGenerated => 'ወረቀቱ ተዘጋጅቷል።';

  @override
  String get opacTitle => 'መዝገብ';

  @override
  String get opacHelp =>
      'ርዕስ የሚያዙት ሁሉም ቅጂ ሲወጣ ብቻ ነው። በመደርደሪያ ያለ ቅጂ በቤተ መጻሕፍት ዴስክ ይበደራል።';

  @override
  String get searchBooks => 'ፈልግ';

  @override
  String get searchBooksHint => 'ርዕስ፣ ደራሲ ወይም መዝገብ ቁጥር';

  @override
  String get author => 'ደራሲ';

  @override
  String get freeCopies => 'በመደርደሪያ';

  @override
  String get reserveBook => 'ያዝ';

  @override
  String get bookReserved => 'ተይዟል';

  @override
  String get teacherShelf => 'የመምህራን መደርደሪያ';

  @override
  String get bookNote => 'ማስታወሻ';

  @override
  String get librarySaved => 'ተቀምጧል።';

  @override
  String get lfBoardTitle => 'የጠፋ እና የተገኘ';

  @override
  String get lfKind => 'አይነት';

  @override
  String get lfKindLost => 'ጠፍቷል';

  @override
  String get lfKindFound => 'ተገኝቷል';

  @override
  String get lfTitle => 'ርዕስ';

  @override
  String get lfDescription => 'መግለጫ';

  @override
  String get lfLocation => 'ቦታ';

  @override
  String get lfContact => 'አድራሻ';

  @override
  String get lfPostItem => 'ልጥፍ';

  @override
  String get lfPosted => 'ልጥፍዎ ለማረጋገጫ ተልኳል።';

  @override
  String get lfApprovedBoard => 'ጸድቆ የወጣ ሰሌዳ';

  @override
  String get lfEmptyBoard => 'ጸድቆ የወጣ ነገር የለም።';

  @override
  String get lfMyPosts => 'የእኔ ልጥፎች';

  @override
  String get lfEmptyMine => 'እስካሁን አልለጠፉም።';

  @override
  String get lfStatusPending => 'በመጠባበቅ ላይ';

  @override
  String get lfStatusApproved => 'ጸድቋል';

  @override
  String get lfStatusResolved => 'ተፈቷል';

  @override
  String get lfStatusRejected => 'ውድቅ';

  @override
  String get lfModerateTitle => 'የጠፋ እና የተገኘ ማረጋገጫ';

  @override
  String get lfEmptyQueue => 'ለማረጋገጫ የሚቀርብ ነገር የለም።';

  @override
  String get lfApprove => 'አጽድቅ';

  @override
  String get lfReject => 'ውድቅ አድርግ';

  @override
  String get lfResolve => 'ተፈቷል አድርግ';

  @override
  String get lfActionApprove => 'ነገሩ ጸድቋል።';

  @override
  String get lfActionReject => 'ነገሩ ውድቅ ሆኗል።';

  @override
  String get lfActionResolve => 'ነገሩ ተፈቷል ተብሏል።';

  @override
  String get forumStudentTitle => 'የትምህርት ጥያቄና መልስ';

  @override
  String get forumModerateTitle => 'የጥያቄና መልስ ቁጥጥር';

  @override
  String get forumQuestionTitle => 'የጥያቄ ርዕስ';

  @override
  String get forumQuestionBody => 'ጥያቄ';

  @override
  String get forumPostQuestion => 'ጥያቄ ለጥፍ';

  @override
  String get forumQuestionPosted => 'ጥያቄዎ ተለጥፏል።';

  @override
  String get forumPoints => 'ነጥብ';

  @override
  String get forumOpen => 'ክፈት';

  @override
  String get forumEmptyQuestions => 'ጥያቄ የለም።';

  @override
  String get forumYourAnswer => 'መልስዎ';

  @override
  String get forumPostAnswer => 'መልስ ለጥፍ';

  @override
  String get forumAnswerPosted => 'መልስዎ ተለጥፏል።';

  @override
  String get forumUpvote => 'ድጋፍ ስጥ';

  @override
  String get forumUpvoted => 'ድጋፉ ተመዝግቧል።';

  @override
  String get forumEndorsed => 'በመምህር ጸድቋል';

  @override
  String get forumEndorse => 'መምህር ያጽድቅ';

  @override
  String get forumEndorsedSaved => 'መልሱ ጸድቋል።';

  @override
  String get forumDelete => 'ሰርዝ';

  @override
  String get forumDeleted => 'ይዘቱ ተሰርዟል።';

  @override
  String get schStudentTitle => 'ስኮላርሺፖች';

  @override
  String get schRecommendTitle => 'የምክር ደብዳቤዎች';

  @override
  String get schLocked => 'ስኮላርሺፕ የሚከፈተው የብሔራዊ ነጥብዎ የትምህርት ቤቱን መቁረጫ ሲደርስ ነው።';

  @override
  String schEligible(int score, int cutoff) {
    return 'ተከፍቷል። ነጥብዎ $score መቁረጫ $cutoff አሟልቷል።';
  }

  @override
  String get schOpportunities => 'እድሎች';

  @override
  String get schLink => 'አገናኝ';

  @override
  String get schApply => 'አመልክት';

  @override
  String get schApplied => 'ማመልከቻ ተልኳል።';

  @override
  String get schEmptyOpportunities => 'እድል አልተለጠፈም።';

  @override
  String get schMyApplications => 'የእኔ ማመልከቻዎች';

  @override
  String get schRequestLetter => 'የምክር ደብዳቤ ጠይቅ';

  @override
  String get schLetterRequested => 'የምክር ደብዳቤ ተጠይቋል።';

  @override
  String get schEmptyApplications => 'ማመልከቻ የለም።';

  @override
  String get schLetterBody => 'የደብዳቤ ጽሑፍ';

  @override
  String get schSaveDraft => 'ረቂቅ አስቀምጥ';

  @override
  String get schDraftSaved => 'ረቂቁ ተቀምጧል።';

  @override
  String get schSignLetter => 'ፈርመህ አድርስ';

  @override
  String get schLetterSigned => 'ደብዳቤው ተፈርሟል።';

  @override
  String get schEmptyQueue => 'የደብዳቤ ጥያቄ የለም።';

  @override
  String get schChooseStudent => 'ተማሪ ይምረጡ';

  @override
  String get libraryUsageTitle => 'የቤተ መጻሕፍት አጠቃቀም';

  @override
  String get libraryUsageEmpty => 'የቤተ መጻሕፍት ጉብኝት አልተመዘገበም።';

  @override
  String get libraryUsageDate => 'ቀን';

  @override
  String get libraryUsageShift => 'ፈረቃ';

  @override
  String get curriculumTitle => 'ሥርዓተ ትምህርት';

  @override
  String get gradeWorkflowTitle => 'የውጤት ማጽደቅ';

  @override
  String get procurementTitle => 'የግዢ ጥያቄ';

  @override
  String get coverageTitle => 'የሥርዓተ ትምህርት ሽፋን';

  @override
  String get evaluationTitle => 'የመምህር ግምገማ';

  @override
  String get approveAction => 'አጽድቅ';

  @override
  String get sendAction => 'ላክ';

  @override
  String get savedGeneric => 'ተቀምጧል።';
}

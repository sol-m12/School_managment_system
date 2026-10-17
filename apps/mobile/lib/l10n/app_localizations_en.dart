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
  String get tenantSlug => 'School ID';

  @override
  String get username => 'Username';

  @override
  String get password => 'Password';

  @override
  String get login => 'Sign in';

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
}

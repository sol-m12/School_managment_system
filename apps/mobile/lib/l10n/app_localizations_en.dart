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
}

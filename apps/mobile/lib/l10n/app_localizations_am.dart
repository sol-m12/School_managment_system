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
  String get biometricsUnavailable => 'በባዮሜትሪክስ መግባት ገና አይገኝም';

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
  String get parentNavAttendance => 'መገኘት';

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
}

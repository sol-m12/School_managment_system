import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:flutter/widgets.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:intl/intl.dart' as intl;

import 'app_localizations_am.dart';
import 'app_localizations_en.dart';

// ignore_for_file: type=lint

/// Callers can lookup localized strings with an instance of AppLocalizations
/// returned by `AppLocalizations.of(context)`.
///
/// Applications need to include `AppLocalizations.delegate()` in their app's
/// `localizationDelegates` list, and the locales they support in the app's
/// `supportedLocales` list. For example:
///
/// ```dart
/// import 'l10n/app_localizations.dart';
///
/// return MaterialApp(
///   localizationsDelegates: AppLocalizations.localizationsDelegates,
///   supportedLocales: AppLocalizations.supportedLocales,
///   home: MyApplicationHome(),
/// );
/// ```
///
/// ## Update pubspec.yaml
///
/// Please make sure to update your pubspec.yaml to include the following
/// packages:
///
/// ```yaml
/// dependencies:
///   # Internationalization support.
///   flutter_localizations:
///     sdk: flutter
///   intl: any # Use the pinned version from flutter_localizations
///
///   # Rest of dependencies
/// ```
///
/// ## iOS Applications
///
/// iOS applications define key application metadata, including supported
/// locales, in an Info.plist file that is built into the application bundle.
/// To configure the locales supported by your app, you’ll need to edit this
/// file.
///
/// First, open your project’s ios/Runner.xcworkspace Xcode workspace file.
/// Then, in the Project Navigator, open the Info.plist file under the Runner
/// project’s Runner folder.
///
/// Next, select the Information Property List item, select Add Item from the
/// Editor menu, then select Localizations from the pop-up menu.
///
/// Select and expand the newly-created Localizations item then, for each
/// locale your application supports, add a new item and select the locale
/// you wish to add from the pop-up menu in the Value field. This list should
/// be consistent with the languages listed in the AppLocalizations.supportedLocales
/// property.
abstract class AppLocalizations {
  AppLocalizations(String locale)
    : localeName = intl.Intl.canonicalizedLocale(locale.toString());

  final String localeName;

  static AppLocalizations of(BuildContext context) {
    return Localizations.of<AppLocalizations>(context, AppLocalizations)!;
  }

  static const LocalizationsDelegate<AppLocalizations> delegate =
      _AppLocalizationsDelegate();

  /// A list of this localizations delegate along with the default localizations
  /// delegates.
  ///
  /// Returns a list of localizations delegates containing this delegate along with
  /// GlobalMaterialLocalizations.delegate, GlobalCupertinoLocalizations.delegate,
  /// and GlobalWidgetsLocalizations.delegate.
  ///
  /// Additional delegates can be added by appending to this list in
  /// MaterialApp. This list does not have to be used at all if a custom list
  /// of delegates is preferred or required.
  static const List<LocalizationsDelegate<dynamic>> localizationsDelegates =
      <LocalizationsDelegate<dynamic>>[
        delegate,
        GlobalMaterialLocalizations.delegate,
        GlobalCupertinoLocalizations.delegate,
        GlobalWidgetsLocalizations.delegate,
      ];

  /// A list of this localizations delegate's supported locales.
  static const List<Locale> supportedLocales = <Locale>[
    Locale('am'),
    Locale('en'),
  ];

  /// No description provided for @appName.
  ///
  /// In am, this message translates to:
  /// **'ኬይት'**
  String get appName;

  /// No description provided for @loginTitle.
  ///
  /// In am, this message translates to:
  /// **'መግቢያ'**
  String get loginTitle;

  /// No description provided for @loginWelcomeBack.
  ///
  /// In am, this message translates to:
  /// **'እንኳን ደህና መጡ'**
  String get loginWelcomeBack;

  /// No description provided for @loginSubtitle.
  ///
  /// In am, this message translates to:
  /// **'ወደ ፖርታልዎ ለመግባት ይግቡ'**
  String get loginSubtitle;

  /// No description provided for @tenantSlug.
  ///
  /// In am, this message translates to:
  /// **'የትምህርት ቤት መለያ / ኮድ'**
  String get tenantSlug;

  /// No description provided for @tenantSlugHint.
  ///
  /// In am, this message translates to:
  /// **'ለምሳሌ SCH-104 ወይም የትምህርት ቤት ኮድ'**
  String get tenantSlugHint;

  /// No description provided for @username.
  ///
  /// In am, this message translates to:
  /// **'የተጠቃሚ ስም ወይም መለያ'**
  String get username;

  /// No description provided for @usernameHint.
  ///
  /// In am, this message translates to:
  /// **'የተጠቃሚ ስምዎን ወይም መለያዎን ያስገቡ'**
  String get usernameHint;

  /// No description provided for @password.
  ///
  /// In am, this message translates to:
  /// **'የይለፍ ቃል'**
  String get password;

  /// No description provided for @login.
  ///
  /// In am, this message translates to:
  /// **'ግባ'**
  String get login;

  /// No description provided for @rememberMe.
  ///
  /// In am, this message translates to:
  /// **'አስታውሰኝ'**
  String get rememberMe;

  /// No description provided for @forgotPassword.
  ///
  /// In am, this message translates to:
  /// **'የይለፍ ቃል ረሱ?'**
  String get forgotPassword;

  /// No description provided for @forgotPasswordMessage.
  ///
  /// In am, this message translates to:
  /// **'የይለፍ ቃልዎን ለመቀየር የትምህርት ቤት አስተዳዳሪዎን ያነጋግሩ።'**
  String get forgotPasswordMessage;

  /// No description provided for @loginOr.
  ///
  /// In am, this message translates to:
  /// **'ወይም'**
  String get loginOr;

  /// No description provided for @signInBiometrics.
  ///
  /// In am, this message translates to:
  /// **'በባዮሜትሪክስ ይግቡ'**
  String get signInBiometrics;

  /// No description provided for @biometricsUnavailable.
  ///
  /// In am, this message translates to:
  /// **'በባዮሜትሪክስ መግባት በዚህ መሣሪያ አይገኝም'**
  String get biometricsUnavailable;

  /// No description provided for @biometricsNotEnrolled.
  ///
  /// In am, this message translates to:
  /// **'በመጀመሪያ በመሣሪያ ቅንብሮች የጣት አሻራ ወይም Face ID ያዘጋጁ'**
  String get biometricsNotEnrolled;

  /// No description provided for @biometricsNoCredentials.
  ///
  /// In am, this message translates to:
  /// **'በባዮሜትሪክስ ለመግባት አንድ ጊዜ በየይለፍ ቃል ይግቡ'**
  String get biometricsNoCredentials;

  /// No description provided for @biometricsFailed.
  ///
  /// In am, this message translates to:
  /// **'የባዮሜትሪክ ማረጋገጫ አልተሳካም'**
  String get biometricsFailed;

  /// No description provided for @biometricsPrompt.
  ///
  /// In am, this message translates to:
  /// **'ወደ ኬይት ይግቡ'**
  String get biometricsPrompt;

  /// No description provided for @biometricsEnableTitle.
  ///
  /// In am, this message translates to:
  /// **'በባዮሜትሪክስ መግባት ይንቃ?'**
  String get biometricsEnableTitle;

  /// No description provided for @biometricsEnableBody.
  ///
  /// In am, this message translates to:
  /// **'በሚቀጥለው ጊዜ የይለፍ ቃል ከመተየብ ይልቅ የጣት አሻራ ወይም Face ID ይጠቀሙ።'**
  String get biometricsEnableBody;

  /// No description provided for @biometricsEnableConfirm.
  ///
  /// In am, this message translates to:
  /// **'አንቃ'**
  String get biometricsEnableConfirm;

  /// No description provided for @biometricsEnableSkip.
  ///
  /// In am, this message translates to:
  /// **'አሁን አይደለም'**
  String get biometricsEnableSkip;

  /// No description provided for @biometricsEnabled.
  ///
  /// In am, this message translates to:
  /// **'በባዮሜትሪክስ መግባት ነቅቷል'**
  String get biometricsEnabled;

  /// No description provided for @faceIdUsage.
  ///
  /// In am, this message translates to:
  /// **'ኬይት Face IDን በፍጥነትና በደህንነት ለመግባት ይጠቀማል።'**
  String get faceIdUsage;

  /// No description provided for @sslEncrypted.
  ///
  /// In am, this message translates to:
  /// **'256-ቢት SSL የተመሰጠረ • ኬይት ደህንነት'**
  String get sslEncrypted;

  /// No description provided for @needAssistance.
  ///
  /// In am, this message translates to:
  /// **'እገዛ ይፈልጋሉ?'**
  String get needAssistance;

  /// No description provided for @contactSupport.
  ///
  /// In am, this message translates to:
  /// **'ድጋፍ ያግኙ'**
  String get contactSupport;

  /// No description provided for @contactSupportMessage.
  ///
  /// In am, this message translates to:
  /// **'ለመግቢያ እገዛ የትምህርት ቤት ቢሮዎን ያነጋግሩ።'**
  String get contactSupportMessage;

  /// No description provided for @logout.
  ///
  /// In am, this message translates to:
  /// **'ውጣ'**
  String get logout;

  /// No description provided for @navHome.
  ///
  /// In am, this message translates to:
  /// **'መነሻ'**
  String get navHome;

  /// No description provided for @navAcademics.
  ///
  /// In am, this message translates to:
  /// **'ትምህርት'**
  String get navAcademics;

  /// No description provided for @navAttendance.
  ///
  /// In am, this message translates to:
  /// **'መገኘት'**
  String get navAttendance;

  /// No description provided for @navLearning.
  ///
  /// In am, this message translates to:
  /// **'መማር'**
  String get navLearning;

  /// No description provided for @navServices.
  ///
  /// In am, this message translates to:
  /// **'አገልግሎቶች'**
  String get navServices;

  /// No description provided for @navMore.
  ///
  /// In am, this message translates to:
  /// **'ተጨማሪ'**
  String get navMore;

  /// No description provided for @offlineBanner.
  ///
  /// In am, this message translates to:
  /// **'ከመስመር ውጭ ነዎት — የተቀመጠ ውሂብ እያሳየ ነው'**
  String get offlineBanner;

  /// No description provided for @lastUpdated.
  ///
  /// In am, this message translates to:
  /// **'መጨረሻ የዘመነው፡ {time}'**
  String lastUpdated(String time);

  /// No description provided for @pullToRefresh.
  ///
  /// In am, this message translates to:
  /// **'እንደገና ለማደስ ይጎትቱ'**
  String get pullToRefresh;

  /// No description provided for @loading.
  ///
  /// In am, this message translates to:
  /// **'በመጫን ላይ…'**
  String get loading;

  /// No description provided for @errorGeneric.
  ///
  /// In am, this message translates to:
  /// **'ስህተት ተከስቷል'**
  String get errorGeneric;

  /// No description provided for @errorNetwork.
  ///
  /// In am, this message translates to:
  /// **'የአውታረ መረብ ችግር'**
  String get errorNetwork;

  /// No description provided for @errorUnauthorized.
  ///
  /// In am, this message translates to:
  /// **'እባክዎ እንደገና ይግቡ'**
  String get errorUnauthorized;

  /// No description provided for @errorValidation.
  ///
  /// In am, this message translates to:
  /// **'ትክክል ያልሆነ ግብዓት'**
  String get errorValidation;

  /// No description provided for @comingSoon.
  ///
  /// In am, this message translates to:
  /// **'በቅርብ ቀን'**
  String get comingSoon;

  /// No description provided for @emptyState.
  ///
  /// In am, this message translates to:
  /// **'ምንም ውሂብ የለም'**
  String get emptyState;

  /// No description provided for @retry.
  ///
  /// In am, this message translates to:
  /// **'እንደገና ሞክር'**
  String get retry;

  /// No description provided for @language.
  ///
  /// In am, this message translates to:
  /// **'ቋንቋ'**
  String get language;

  /// No description provided for @languageAmharic.
  ///
  /// In am, this message translates to:
  /// **'አማርኛ'**
  String get languageAmharic;

  /// No description provided for @languageEnglish.
  ///
  /// In am, this message translates to:
  /// **'English'**
  String get languageEnglish;

  /// No description provided for @profile.
  ///
  /// In am, this message translates to:
  /// **'መገለጫ'**
  String get profile;

  /// No description provided for @results.
  ///
  /// In am, this message translates to:
  /// **'ውጤቶች'**
  String get results;

  /// No description provided for @timetable.
  ///
  /// In am, this message translates to:
  /// **'የጊዜ ሰሌዳ'**
  String get timetable;

  /// No description provided for @exams.
  ///
  /// In am, this message translates to:
  /// **'ፈተናዎች'**
  String get exams;

  /// No description provided for @quiz.
  ///
  /// In am, this message translates to:
  /// **'ፈተና ውድድር'**
  String get quiz;

  /// No description provided for @assignments.
  ///
  /// In am, this message translates to:
  /// **'ስራዎች'**
  String get assignments;

  /// No description provided for @attendance.
  ///
  /// In am, this message translates to:
  /// **'የመገኘት ሁኔታ'**
  String get attendance;

  /// No description provided for @discipline.
  ///
  /// In am, this message translates to:
  /// **'የዲሲፕሊን ሁኔታ'**
  String get discipline;

  /// No description provided for @resources.
  ///
  /// In am, this message translates to:
  /// **'የመምህር ፋይሎች'**
  String get resources;

  /// No description provided for @simulations.
  ///
  /// In am, this message translates to:
  /// **'ሲሙሌሽን'**
  String get simulations;

  /// No description provided for @virtualLab.
  ///
  /// In am, this message translates to:
  /// **'ቨርቹዋል ላብ'**
  String get virtualLab;

  /// No description provided for @groups.
  ///
  /// In am, this message translates to:
  /// **'ቡድን'**
  String get groups;

  /// No description provided for @planner.
  ///
  /// In am, this message translates to:
  /// **'የጥናት እቅድ'**
  String get planner;

  /// No description provided for @library.
  ///
  /// In am, this message translates to:
  /// **'ቤተ-መጽሐፍት'**
  String get library;

  /// No description provided for @documents.
  ///
  /// In am, this message translates to:
  /// **'ሰነድ ጥያቄ'**
  String get documents;

  /// No description provided for @helpdesk.
  ///
  /// In am, this message translates to:
  /// **'እገዛ'**
  String get helpdesk;

  /// No description provided for @vocational.
  ///
  /// In am, this message translates to:
  /// **'ሙያ ምደባ'**
  String get vocational;

  /// No description provided for @digitalId.
  ///
  /// In am, this message translates to:
  /// **'ዲጂታል መታወቂያ'**
  String get digitalId;

  /// No description provided for @notifications.
  ///
  /// In am, this message translates to:
  /// **'ማሳወቂያዎች'**
  String get notifications;

  /// No description provided for @greetingMorning.
  ///
  /// In am, this message translates to:
  /// **'እንደምን አደሩ'**
  String get greetingMorning;

  /// No description provided for @greetingAfternoon.
  ///
  /// In am, this message translates to:
  /// **'እንደምን ዋሉ'**
  String get greetingAfternoon;

  /// No description provided for @greetingEvening.
  ///
  /// In am, this message translates to:
  /// **'እንደምን አመሸ'**
  String get greetingEvening;

  /// No description provided for @sectionHub.
  ///
  /// In am, this message translates to:
  /// **'ክፍሎች'**
  String get sectionHub;

  /// No description provided for @openItem.
  ///
  /// In am, this message translates to:
  /// **'ክፈት'**
  String get openItem;

  /// No description provided for @submit.
  ///
  /// In am, this message translates to:
  /// **'አስገባ'**
  String get submit;

  /// No description provided for @send.
  ///
  /// In am, this message translates to:
  /// **'ላክ'**
  String get send;

  /// No description provided for @close.
  ///
  /// In am, this message translates to:
  /// **'ዝጋ'**
  String get close;

  /// No description provided for @sessionRestored.
  ///
  /// In am, this message translates to:
  /// **'ክፍለ ጊዜ ተመልሷል'**
  String get sessionRestored;

  /// No description provided for @roleNotSupported.
  ///
  /// In am, this message translates to:
  /// **'ይህ ሚና በሞባይል ገና አይደገፍም'**
  String get roleNotSupported;

  /// No description provided for @navClasses.
  ///
  /// In am, this message translates to:
  /// **'ክፍሎች'**
  String get navClasses;

  /// No description provided for @navTeaching.
  ///
  /// In am, this message translates to:
  /// **'ማስተማረ'**
  String get navTeaching;

  /// No description provided for @navOffice.
  ///
  /// In am, this message translates to:
  /// **'ጂቤት'**
  String get navOffice;

  /// No description provided for @teacherSchedule.
  ///
  /// In am, this message translates to:
  /// **'የተመደቡ ስራዎች'**
  String get teacherSchedule;

  /// No description provided for @teacherProfile.
  ///
  /// In am, this message translates to:
  /// **'የመምህር መገለጫ'**
  String get teacherProfile;

  /// No description provided for @homeroomAttendance.
  ///
  /// In am, this message translates to:
  /// **'የክፍል መገኘት'**
  String get homeroomAttendance;

  /// No description provided for @subjectAttendance.
  ///
  /// In am, this message translates to:
  /// **'የትምህርት መገኘት'**
  String get subjectAttendance;

  /// No description provided for @offlineAttendance.
  ///
  /// In am, this message translates to:
  /// **'ከመስመር ውጭ መገኘት'**
  String get offlineAttendance;

  /// No description provided for @pendingSync.
  ///
  /// In am, this message translates to:
  /// **'የሚጠባቀ ስርኻት ({count})'**
  String pendingSync(int count);

  /// No description provided for @syncNow.
  ///
  /// In am, this message translates to:
  /// **'አሁን አስማማር'**
  String get syncNow;

  /// No description provided for @syncSuccess.
  ///
  /// In am, this message translates to:
  /// **'በተሳካ ሁኔታ ተሳማማረ'**
  String get syncSuccess;

  /// No description provided for @syncConflict.
  ///
  /// In am, this message translates to:
  /// **'አንዳንድ ምልክቶች ተጋጠሙ'**
  String get syncConflict;

  /// No description provided for @classRoster.
  ///
  /// In am, this message translates to:
  /// **'የክፍል ዘርዝር'**
  String get classRoster;

  /// No description provided for @studentRegistration.
  ///
  /// In am, this message translates to:
  /// **'የተማሪ ምዝግባ'**
  String get studentRegistration;

  /// No description provided for @student360.
  ///
  /// In am, this message translates to:
  /// **'ተማሪ 360'**
  String get student360;

  /// No description provided for @reportCards.
  ///
  /// In am, this message translates to:
  /// **'የውጤት ካርድ'**
  String get reportCards;

  /// No description provided for @subjectReport.
  ///
  /// In am, this message translates to:
  /// **'የተማሪዎች ሪፖርት'**
  String get subjectReport;

  /// No description provided for @lessonPlans.
  ///
  /// In am, this message translates to:
  /// **'የትምህርት እቅዶች'**
  String get lessonPlans;

  /// No description provided for @examResults.
  ///
  /// In am, this message translates to:
  /// **'የፈተና ውጤቶች'**
  String get examResults;

  /// No description provided for @courseFiles.
  ///
  /// In am, this message translates to:
  /// **'የክርስ ፋይሎች'**
  String get courseFiles;

  /// No description provided for @storeRequests.
  ///
  /// In am, this message translates to:
  /// **'የማዝገቢያ ጥያቄዎች'**
  String get storeRequests;

  /// No description provided for @incidents.
  ///
  /// In am, this message translates to:
  /// **'ኡደቶች'**
  String get incidents;

  /// No description provided for @leaveRequest.
  ///
  /// In am, this message translates to:
  /// **'የፍቃድ ጥያቄ'**
  String get leaveRequest;

  /// No description provided for @questionBank.
  ///
  /// In am, this message translates to:
  /// **'የጥያቄ ባንክ'**
  String get questionBank;

  /// No description provided for @participation.
  ///
  /// In am, this message translates to:
  /// **'ተሳትፎ'**
  String get participation;

  /// No description provided for @queueAttendance.
  ///
  /// In am, this message translates to:
  /// **'ከመስመር ውጭ አስቀምጥ'**
  String get queueAttendance;

  /// No description provided for @studentCode.
  ///
  /// In am, this message translates to:
  /// **'የተማሪ ከድ'**
  String get studentCode;

  /// No description provided for @scanDigitalId.
  ///
  /// In am, this message translates to:
  /// **'ዲጂታል መታወቂያ ስካን'**
  String get scanDigitalId;

  /// No description provided for @scanHint.
  ///
  /// In am, this message translates to:
  /// **'የኬይት የተማሪ QR ከድ ያንብቡ'**
  String get scanHint;

  /// No description provided for @scanUnsupported.
  ///
  /// In am, this message translates to:
  /// **'የካሜራ ስካን በዚህ ማሽን አይተከላም'**
  String get scanUnsupported;

  /// No description provided for @scanInvalid.
  ///
  /// In am, this message translates to:
  /// **'ትክክል የኬይት የተማሪ መታወቂያ አይደለም'**
  String get scanInvalid;

  /// No description provided for @scanWrongTenant.
  ///
  /// In am, this message translates to:
  /// **'ይህ መታወቂያ የሌላ ትምህርት ቤት ነው'**
  String get scanWrongTenant;

  /// No description provided for @scanOpenProfile.
  ///
  /// In am, this message translates to:
  /// **'የተማሪ መገለጫ ክፈት'**
  String get scanOpenProfile;

  /// No description provided for @notificationsEmpty.
  ///
  /// In am, this message translates to:
  /// **'አሁን ማሳወቂያ የለም'**
  String get notificationsEmpty;

  /// No description provided for @notificationUrgent.
  ///
  /// In am, this message translates to:
  /// **'አስአኻይ'**
  String get notificationUrgent;

  /// No description provided for @localNotifyChannelName.
  ///
  /// In am, this message translates to:
  /// **'የትምህርት ቤት ማሳወቂያዎች'**
  String get localNotifyChannelName;

  /// No description provided for @localNotifyChannelDesc.
  ///
  /// In am, this message translates to:
  /// **'አዲስ ማሳወቂያዎች ከትምህርት ቤትዎ'**
  String get localNotifyChannelDesc;

  /// No description provided for @parentNavHome.
  ///
  /// In am, this message translates to:
  /// **'መነሻ'**
  String get parentNavHome;

  /// No description provided for @parentNavAttendance.
  ///
  /// In am, this message translates to:
  /// **'መገኘት'**
  String get parentNavAttendance;

  /// No description provided for @parentNavHomework.
  ///
  /// In am, this message translates to:
  /// **'የቤት ስራ'**
  String get parentNavHomework;

  /// No description provided for @parentNavLibrary.
  ///
  /// In am, this message translates to:
  /// **'ቤተ-መጻሕፍት'**
  String get parentNavLibrary;

  /// No description provided for @parentNavMessages.
  ///
  /// In am, this message translates to:
  /// **'መልእክት'**
  String get parentNavMessages;

  /// No description provided for @parentNavMore.
  ///
  /// In am, this message translates to:
  /// **'ተጨማሪ'**
  String get parentNavMore;

  /// No description provided for @parentChildrenDashboard.
  ///
  /// In am, this message translates to:
  /// **'የልጆች ዳሽቦርድ'**
  String get parentChildrenDashboard;

  /// No description provided for @parentAttendance.
  ///
  /// In am, this message translates to:
  /// **'መገኘት'**
  String get parentAttendance;

  /// No description provided for @parentConduct.
  ///
  /// In am, this message translates to:
  /// **'ስነ-ምግባር'**
  String get parentConduct;

  /// No description provided for @parentHomework.
  ///
  /// In am, this message translates to:
  /// **'የቤት ስራ'**
  String get parentHomework;

  /// No description provided for @parentLibrary.
  ///
  /// In am, this message translates to:
  /// **'ቤተ-መጻሕፍት'**
  String get parentLibrary;

  /// No description provided for @parentMessages.
  ///
  /// In am, this message translates to:
  /// **'መልእክት'**
  String get parentMessages;

  /// No description provided for @parentAppointments.
  ///
  /// In am, this message translates to:
  /// **'ቀጠሮ'**
  String get parentAppointments;

  /// No description provided for @parentSchoolFallback.
  ///
  /// In am, this message translates to:
  /// **'ትምህርት ቤት'**
  String get parentSchoolFallback;

  /// No description provided for @parentEmptyChildren.
  ///
  /// In am, this message translates to:
  /// **'ምንም የተገናኘ ልጅ የለም'**
  String get parentEmptyChildren;

  /// No description provided for @parentSelectChild.
  ///
  /// In am, this message translates to:
  /// **'ልጅ ይምረጡ'**
  String get parentSelectChild;

  /// No description provided for @parentSendMessage.
  ///
  /// In am, this message translates to:
  /// **'መልእክት ላክ'**
  String get parentSendMessage;

  /// No description provided for @parentBookAppointment.
  ///
  /// In am, this message translates to:
  /// **'ቀጠሮ ያስይዙ'**
  String get parentBookAppointment;

  /// No description provided for @parentMessageSent.
  ///
  /// In am, this message translates to:
  /// **'መልእክት ተልኳል'**
  String get parentMessageSent;

  /// No description provided for @parentAppointmentBooked.
  ///
  /// In am, this message translates to:
  /// **'ቀጠሮ ተጠይቋል'**
  String get parentAppointmentBooked;

  /// No description provided for @parentWithRole.
  ///
  /// In am, this message translates to:
  /// **'ለማን'**
  String get parentWithRole;

  /// No description provided for @parentSubjectName.
  ///
  /// In am, this message translates to:
  /// **'የትምህርት ስም'**
  String get parentSubjectName;

  /// No description provided for @parentMessageBody.
  ///
  /// In am, this message translates to:
  /// **'መልእክት'**
  String get parentMessageBody;

  /// No description provided for @parentPurpose.
  ///
  /// In am, this message translates to:
  /// **'ዓላማ'**
  String get parentPurpose;

  /// No description provided for @parentPreferredDate.
  ///
  /// In am, this message translates to:
  /// **'የሚመረጥ ቀን'**
  String get parentPreferredDate;

  /// No description provided for @parentPreferredTime.
  ///
  /// In am, this message translates to:
  /// **'የሚመረጥ ሰዓት'**
  String get parentPreferredTime;

  /// No description provided for @parentIndicatorDone.
  ///
  /// In am, this message translates to:
  /// **'ተሰርቷል'**
  String get parentIndicatorDone;

  /// No description provided for @parentIndicatorMissing.
  ///
  /// In am, this message translates to:
  /// **'ጎድሏል'**
  String get parentIndicatorMissing;

  /// No description provided for @parentIndicatorPending.
  ///
  /// In am, this message translates to:
  /// **'በመጠባበቅ ላይ'**
  String get parentIndicatorPending;

  /// No description provided for @synced.
  ///
  /// In am, this message translates to:
  /// **'ተሰምሯል'**
  String get synced;

  /// No description provided for @offlineBannerShort.
  ///
  /// In am, this message translates to:
  /// **'ከመስመር ውጭ'**
  String get offlineBannerShort;

  /// No description provided for @studentIdLabel.
  ///
  /// In am, this message translates to:
  /// **'መለያ፡ {id}'**
  String studentIdLabel(String id);

  /// No description provided for @gradeSection.
  ///
  /// In am, this message translates to:
  /// **'ክፍል {grade}{section}'**
  String gradeSection(String grade, String section);

  /// No description provided for @academicYearLabel.
  ///
  /// In am, this message translates to:
  /// **'የትምህርት ዘመን {year}'**
  String academicYearLabel(String year);

  /// No description provided for @quickActions.
  ///
  /// In am, this message translates to:
  /// **'ፈጣን እርምጃዎች'**
  String get quickActions;

  /// No description provided for @todaySimulations.
  ///
  /// In am, this message translates to:
  /// **'የዛሬ ሲሙሌሽኖች'**
  String get todaySimulations;

  /// No description provided for @simulationsCount.
  ///
  /// In am, this message translates to:
  /// **'{count} ሲሙሌሽኖች'**
  String simulationsCount(int count);

  /// No description provided for @streamLabel.
  ///
  /// In am, this message translates to:
  /// **'የትምህርት አቅጣጫ፡ {stream}'**
  String streamLabel(String stream);

  /// No description provided for @studentRoleLabel.
  ///
  /// In am, this message translates to:
  /// **'ተማሪ'**
  String get studentRoleLabel;

  /// No description provided for @biometricUnlock.
  ///
  /// In am, this message translates to:
  /// **'ባዮሜትሪክ መክፈቻ'**
  String get biometricUnlock;

  /// No description provided for @biometricActive.
  ///
  /// In am, this message translates to:
  /// **'ነቅቷል'**
  String get biometricActive;

  /// No description provided for @biometricOff.
  ///
  /// In am, this message translates to:
  /// **'ጠፍቷል'**
  String get biometricOff;

  /// No description provided for @signOutBilingual.
  ///
  /// In am, this message translates to:
  /// **'ውጣ'**
  String get signOutBilingual;

  /// No description provided for @schoolPortal.
  ///
  /// In am, this message translates to:
  /// **'የትምህርት ቤት ፖርታል'**
  String get schoolPortal;

  /// No description provided for @noSimulationsYet.
  ///
  /// In am, this message translates to:
  /// **'ለክፍልዎ ሲሙሌሽን የለም'**
  String get noSimulationsYet;

  /// No description provided for @viewAll.
  ///
  /// In am, this message translates to:
  /// **'ሁሉንም ይመልከቱ'**
  String get viewAll;

  /// No description provided for @teacherRoleLabel.
  ///
  /// In am, this message translates to:
  /// **'መምህር'**
  String get teacherRoleLabel;

  /// No description provided for @periodsToday.
  ///
  /// In am, this message translates to:
  /// **'ዛሬ {count} ጊዜያት'**
  String periodsToday(int count);

  /// No description provided for @classesAssigned.
  ///
  /// In am, this message translates to:
  /// **'{count} ክፍሎች ተመድበዋል'**
  String classesAssigned(int count);

  /// No description provided for @assignmentsCount.
  ///
  /// In am, this message translates to:
  /// **'{count} ትምህርቶች'**
  String assignmentsCount(int count);

  /// No description provided for @todaySchedule.
  ///
  /// In am, this message translates to:
  /// **'የዛሬ የጊዜ ሰሌዳ'**
  String get todaySchedule;

  /// No description provided for @noPeriodsToday.
  ///
  /// In am, this message translates to:
  /// **'ለዛሬ የተመደበ ጊዜ የለም'**
  String get noPeriodsToday;

  /// No description provided for @takeRoll.
  ///
  /// In am, this message translates to:
  /// **'መገኘት ይውሰዱ'**
  String get takeRoll;

  /// No description provided for @offlineReady.
  ///
  /// In am, this message translates to:
  /// **'ከመስመር ውጭ ዝግጁ'**
  String get offlineReady;

  /// No description provided for @syncRecordsPending.
  ///
  /// In am, this message translates to:
  /// **'{count} መዝገቦች ለአካባቢያዊ ማስማማት በመጠባበቅ ላይ'**
  String syncRecordsPending(int count);

  /// No description provided for @semesterLabel.
  ///
  /// In am, this message translates to:
  /// **'ሴሚስተር {n}'**
  String semesterLabel(String n);

  /// No description provided for @askTeacher.
  ///
  /// In am, this message translates to:
  /// **'መምህር ጠይቅ'**
  String get askTeacher;

  /// No description provided for @feeStatus.
  ///
  /// In am, this message translates to:
  /// **'ሰነዶች'**
  String get feeStatus;

  /// No description provided for @todaySummary.
  ///
  /// In am, this message translates to:
  /// **'ዛሬ'**
  String get todaySummary;

  /// No description provided for @todaySummaryAm.
  ///
  /// In am, this message translates to:
  /// **'የዛሬው ማጠቃለያ'**
  String get todaySummaryAm;

  /// No description provided for @activeNow.
  ///
  /// In am, this message translates to:
  /// **'አሁን በሂደት ላይ'**
  String get activeNow;

  /// No description provided for @attendanceTitle.
  ///
  /// In am, this message translates to:
  /// **'ተሳትፎ'**
  String get attendanceTitle;

  /// No description provided for @attendanceTitleAm.
  ///
  /// In am, this message translates to:
  /// **'ተሳትፎ'**
  String get attendanceTitleAm;

  /// No description provided for @academicTitle.
  ///
  /// In am, this message translates to:
  /// **'ውጤት'**
  String get academicTitle;

  /// No description provided for @academicTitleAm.
  ///
  /// In am, this message translates to:
  /// **'ውጤት'**
  String get academicTitleAm;

  /// No description provided for @deadlinesTitle.
  ///
  /// In am, this message translates to:
  /// **'የሚጠበቁ ስራዎች'**
  String get deadlinesTitle;

  /// No description provided for @deadlinesTitleAm.
  ///
  /// In am, this message translates to:
  /// **'የሚጠበቁ ስራዎች'**
  String get deadlinesTitleAm;

  /// No description provided for @noticeFeedTitle.
  ///
  /// In am, this message translates to:
  /// **'ማሳሰቢያዎች'**
  String get noticeFeedTitle;

  /// No description provided for @noticeFeedTitleAm.
  ///
  /// In am, this message translates to:
  /// **'ማሳሰቢያዎች'**
  String get noticeFeedTitleAm;

  /// No description provided for @studyFocusTitle.
  ///
  /// In am, this message translates to:
  /// **'የጥናት እቅድ'**
  String get studyFocusTitle;

  /// No description provided for @studyFocusTitleAm.
  ///
  /// In am, this message translates to:
  /// **'የጥናት እቅድ'**
  String get studyFocusTitleAm;

  /// No description provided for @overallRate.
  ///
  /// In am, this message translates to:
  /// **'አጠቃላይ ተሳትፎ'**
  String get overallRate;

  /// No description provided for @overallRateAm.
  ///
  /// In am, this message translates to:
  /// **'አጠቃላይ ተሳትፎ'**
  String get overallRateAm;

  /// No description provided for @presentCount.
  ///
  /// In am, this message translates to:
  /// **'ተገኝተዋል'**
  String get presentCount;

  /// No description provided for @absentCount.
  ///
  /// In am, this message translates to:
  /// **'ቀርተዋል'**
  String get absentCount;

  /// No description provided for @tardyCount.
  ///
  /// In am, this message translates to:
  /// **'ዘግይተዋል'**
  String get tardyCount;

  /// No description provided for @noAttendanceYet.
  ///
  /// In am, this message translates to:
  /// **'የመገኘት መዝገብ የለም'**
  String get noAttendanceYet;

  /// No description provided for @noScheduleToday.
  ///
  /// In am, this message translates to:
  /// **'ለዛሬ የተመደበ ትምህርት የለም'**
  String get noScheduleToday;

  /// No description provided for @semesterAverage.
  ///
  /// In am, this message translates to:
  /// **'የሴሚስተር አማካይ'**
  String get semesterAverage;

  /// No description provided for @classRank.
  ///
  /// In am, this message translates to:
  /// **'ደረጃ {rank}'**
  String classRank(String rank);

  /// No description provided for @editProfile.
  ///
  /// In am, this message translates to:
  /// **'መገለጫ አርትዕ'**
  String get editProfile;

  /// No description provided for @tenantSession.
  ///
  /// In am, this message translates to:
  /// **'የትምህርት ቤት መለያ'**
  String get tenantSession;

  /// No description provided for @studentAccount.
  ///
  /// In am, this message translates to:
  /// **'የተማሪ መለያ'**
  String get studentAccount;

  /// No description provided for @signOutSession.
  ///
  /// In am, this message translates to:
  /// **'ከመለያ ውጣ'**
  String get signOutSession;

  /// No description provided for @learningHub.
  ///
  /// In am, this message translates to:
  /// **'መማሪያ'**
  String get learningHub;

  /// No description provided for @learningHubAm.
  ///
  /// In am, this message translates to:
  /// **'መማሪያ'**
  String get learningHubAm;

  /// No description provided for @launchSimulation.
  ///
  /// In am, this message translates to:
  /// **'ሲሙሌሽን ጀምር'**
  String get launchSimulation;

  /// No description provided for @noResourcesYet.
  ///
  /// In am, this message translates to:
  /// **'የመምህር ፋይል የለም'**
  String get noResourcesYet;

  /// No description provided for @noGroupsYet.
  ///
  /// In am, this message translates to:
  /// **'የጥናት ቡድን የለም'**
  String get noGroupsYet;

  /// No description provided for @subjectBreakdown.
  ///
  /// In am, this message translates to:
  /// **'የትምህርት ዓይነቶች ተሳትፎ'**
  String get subjectBreakdown;

  /// No description provided for @absenceLogs.
  ///
  /// In am, this message translates to:
  /// **'የመገኘት መዝገብ'**
  String get absenceLogs;

  /// No description provided for @goodStanding.
  ///
  /// In am, this message translates to:
  /// **'ጥሩ ሁኔታ'**
  String get goodStanding;

  /// No description provided for @enrolledSubjects.
  ///
  /// In am, this message translates to:
  /// **'የተመዘገቡ ትምህርቶች'**
  String get enrolledSubjects;

  /// No description provided for @noResultsYet.
  ///
  /// In am, this message translates to:
  /// **'ውጤት ገና አልወጣም'**
  String get noResultsYet;

  /// No description provided for @enrolledStudents.
  ///
  /// In am, this message translates to:
  /// **'{count} የተመዘገቡ ተማሪዎች'**
  String enrolledStudents(int count);

  /// No description provided for @markAllPresent.
  ///
  /// In am, this message translates to:
  /// **'ሁሉንም ተገኝተዋል አድርግ'**
  String get markAllPresent;

  /// No description provided for @searchStudent.
  ///
  /// In am, this message translates to:
  /// **'ስም ወይም መለያ ፈልግ'**
  String get searchStudent;

  /// No description provided for @excusedCount.
  ///
  /// In am, this message translates to:
  /// **'በፍቃድ'**
  String get excusedCount;

  /// No description provided for @borrowedBooks.
  ///
  /// In am, this message translates to:
  /// **'የተበደሩ መጻሕፍት'**
  String get borrowedBooks;

  /// No description provided for @noBorrowedBooks.
  ///
  /// In am, this message translates to:
  /// **'የተበደረ መጽሐፍ የለም'**
  String get noBorrowedBooks;

  /// No description provided for @documentRequests.
  ///
  /// In am, this message translates to:
  /// **'የሰነድ ጥያቄዎች'**
  String get documentRequests;

  /// No description provided for @noDocumentRequests.
  ///
  /// In am, this message translates to:
  /// **'የሰነድ ጥያቄ የለም'**
  String get noDocumentRequests;

  /// No description provided for @readyStatus.
  ///
  /// In am, this message translates to:
  /// **'ዝግጁ'**
  String get readyStatus;

  /// No description provided for @inReviewStatus.
  ///
  /// In am, this message translates to:
  /// **'በግምገማ ላይ'**
  String get inReviewStatus;

  /// No description provided for @overdueStatus.
  ///
  /// In am, this message translates to:
  /// **'ጊዜው አልፏል'**
  String get overdueStatus;

  /// No description provided for @returnedStatus.
  ///
  /// In am, this message translates to:
  /// **'ተመልሷል'**
  String get returnedStatus;

  /// No description provided for @openStudent360.
  ///
  /// In am, this message translates to:
  /// **'መገለጫ ክፈት'**
  String get openStudent360;

  /// No description provided for @attendanceSummary.
  ///
  /// In am, this message translates to:
  /// **'መገኘት'**
  String get attendanceSummary;

  /// No description provided for @averageScore.
  ///
  /// In am, this message translates to:
  /// **'አማካይ'**
  String get averageScore;
}

class _AppLocalizationsDelegate
    extends LocalizationsDelegate<AppLocalizations> {
  const _AppLocalizationsDelegate();

  @override
  Future<AppLocalizations> load(Locale locale) {
    return SynchronousFuture<AppLocalizations>(lookupAppLocalizations(locale));
  }

  @override
  bool isSupported(Locale locale) =>
      <String>['am', 'en'].contains(locale.languageCode);

  @override
  bool shouldReload(_AppLocalizationsDelegate old) => false;
}

AppLocalizations lookupAppLocalizations(Locale locale) {
  // Lookup logic when only language code is specified.
  switch (locale.languageCode) {
    case 'am':
      return AppLocalizationsAm();
    case 'en':
      return AppLocalizationsEn();
  }

  throw FlutterError(
    'AppLocalizations.delegate failed to load unsupported locale "$locale". This is likely '
    'an issue with the localizations generation tool. Please file an issue '
    'on GitHub with a reproducible sample app and the gen-l10n configuration '
    'that was used.',
  );
}

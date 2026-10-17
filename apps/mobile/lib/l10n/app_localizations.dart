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

  /// No description provided for @tenantSlug.
  ///
  /// In am, this message translates to:
  /// **'የትምህርት ቤት መለያ'**
  String get tenantSlug;

  /// No description provided for @username.
  ///
  /// In am, this message translates to:
  /// **'የተጠቃሚ ስም'**
  String get username;

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

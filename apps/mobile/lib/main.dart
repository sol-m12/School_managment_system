import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:sqflite_common_ffi/sqflite_ffi.dart';

import 'app/router.dart';
import 'core/locale/locale_controller.dart';
import 'core/providers.dart';
import 'core/theme/app_theme.dart';
import 'l10n/app_localizations.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();

  // Chrome/web is not a supported target (sqflite + secure storage + camera).
  // Running there crashes before the debug service connects.
  if (kIsWeb) {
    runApp(
      const MaterialApp(
        home: Scaffold(
          body: Center(
            child: Padding(
              padding: EdgeInsets.all(24),
              child: Text(
                'Keyt mobile does not run in Chrome.\n\n'
                'Use Windows desktop or an Android/iOS device:\n'
                'flutter run -d windows --dart-define=API_BASE_URL=http://localhost:4000',
                textAlign: TextAlign.center,
              ),
            ),
          ),
        ),
      ),
    );
    return;
  }

  if (defaultTargetPlatform == TargetPlatform.windows ||
      defaultTargetPlatform == TargetPlatform.linux ||
      defaultTargetPlatform == TargetPlatform.macOS) {
    sqfliteFfiInit();
    databaseFactory = databaseFactoryFfi;
  }

  runApp(const ProviderScope(child: KeytApp()));
}

class KeytApp extends ConsumerWidget {
  const KeytApp({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    ref.watch(announcementPollProvider);
    final locale = ref.watch(localeControllerProvider);
    final router = ref.watch(goRouterProvider);
    return MaterialApp.router(
      title: 'Keyt',
      theme: buildAppTheme(),
      locale: locale,
      supportedLocales: AppLocalizations.supportedLocales,
      localizationsDelegates: AppLocalizations.localizationsDelegates,
      routerConfig: router,
      debugShowCheckedModeBanner: false,
    );
  }
}

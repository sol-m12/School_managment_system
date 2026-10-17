import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../core/providers.dart';
import '../features/auth/login_page.dart';
import '../features/student/screens/student_screens.dart';
import '../features/student/student_shell.dart';
import '../l10n/app_localizations.dart';

final _rootKey = GlobalKey<NavigatorState>();

final goRouterProvider = Provider<GoRouter>((ref) {
  final auth = ref.watch(authControllerProvider);

  return GoRouter(
    navigatorKey: _rootKey,
    initialLocation: '/login',
    refreshListenable: _AuthRefresh(ref),
    redirect: (context, state) {
      final loggingIn = state.matchedLocation == '/login';
      if (auth.status == AuthStatus.unknown) return null;
      if (auth.status == AuthStatus.unauthenticated) {
        return loggingIn ? null : '/login';
      }
      final user = auth.user!;
      if (loggingIn) {
        if (user.isStudent) return '/student/home';
        if (user.isTeacher) return '/teacher/home';
        return '/unsupported';
      }
      if (state.matchedLocation.startsWith('/student') && !user.isStudent) {
        return user.isTeacher ? '/teacher/home' : '/unsupported';
      }
      if (state.matchedLocation.startsWith('/teacher') && !user.isTeacher) {
        return user.isStudent ? '/student/home' : '/unsupported';
      }
      return null;
    },
    routes: [
      GoRoute(
        path: '/login',
        builder: (context, state) => const LoginPage(),
      ),
      GoRoute(
        path: '/unsupported',
        builder: (context, state) => const UnsupportedRolePage(),
      ),
      StatefulShellRoute.indexedStack(
        builder: (context, state, navigationShell) {
          return StudentShell(navigationShell: navigationShell);
        },
        branches: [
          StatefulShellBranch(
            routes: [
              GoRoute(
                path: '/student/home',
                builder: (context, state) => const StudentHomeScreen(),
              ),
            ],
          ),
          StatefulShellBranch(
            routes: [
              GoRoute(
                path: '/student/academics',
                builder: (context, state) => const AcademicsHubScreen(),
                routes: [
                  GoRoute(
                    path: 'results',
                    builder: (context, state) {
                      final l10n = AppLocalizations.of(context);
                      return StudentJsonRoute(
                        title: l10n.results,
                        cacheKey: 'student_results',
                        path: '/student/results',
                      );
                    },
                  ),
                  GoRoute(
                    path: 'timetable',
                    builder: (context, state) {
                      final l10n = AppLocalizations.of(context);
                      return StudentJsonRoute(
                        title: l10n.timetable,
                        cacheKey: 'student_timetable',
                        path: '/student/desk/timetable',
                      );
                    },
                  ),
                  GoRoute(
                    path: 'exams',
                    builder: (context, state) {
                      final l10n = AppLocalizations.of(context);
                      return StudentJsonRoute(
                        title: l10n.exams,
                        cacheKey: 'student_exams',
                        path: '/student/exams',
                      );
                    },
                  ),
                  GoRoute(
                    path: 'quiz',
                    builder: (context, state) {
                      final l10n = AppLocalizations.of(context);
                      return StudentJsonRoute(
                        title: l10n.quiz,
                        cacheKey: 'student_quiz',
                        path: '/student/quiz',
                      );
                    },
                  ),
                  GoRoute(
                    path: 'assignments',
                    builder: (context, state) {
                      final l10n = AppLocalizations.of(context);
                      return StudentJsonRoute(
                        title: l10n.assignments,
                        cacheKey: 'student_assignments',
                        path: '/student/desk/assignments',
                      );
                    },
                  ),
                ],
              ),
            ],
          ),
          StatefulShellBranch(
            routes: [
              GoRoute(
                path: '/student/attendance',
                builder: (context, state) => const AttendanceHubScreen(),
                routes: [
                  GoRoute(
                    path: 'status',
                    builder: (context, state) {
                      final l10n = AppLocalizations.of(context);
                      return StudentJsonRoute(
                        title: l10n.attendance,
                        cacheKey: 'student_attendance',
                        path: '/student/desk/attendance',
                      );
                    },
                  ),
                  GoRoute(
                    path: 'discipline',
                    builder: (context, state) {
                      final l10n = AppLocalizations.of(context);
                      return StudentJsonRoute(
                        title: l10n.discipline,
                        cacheKey: 'student_discipline',
                        path: '/student/desk/discipline',
                      );
                    },
                  ),
                ],
              ),
            ],
          ),
          StatefulShellBranch(
            routes: [
              GoRoute(
                path: '/student/learning',
                builder: (context, state) => const LearningHubScreen(),
                routes: [
                  GoRoute(
                    path: 'resources',
                    builder: (context, state) {
                      final l10n = AppLocalizations.of(context);
                      return StudentJsonRoute(
                        title: l10n.resources,
                        cacheKey: 'student_resources',
                        path: '/student/resources',
                      );
                    },
                  ),
                  GoRoute(
                    path: 'simulations',
                    builder: (context, state) {
                      final l10n = AppLocalizations.of(context);
                      return StudentJsonRoute(
                        title: l10n.simulations,
                        cacheKey: 'student_simulations',
                        path: '/student/simulations',
                      );
                    },
                  ),
                  GoRoute(
                    path: 'labs',
                    builder: (context, state) {
                      final l10n = AppLocalizations.of(context);
                      return StudentJsonRoute(
                        title: l10n.virtualLab,
                        cacheKey: 'student_labs',
                        path: '/student/labs',
                      );
                    },
                  ),
                  GoRoute(
                    path: 'groups',
                    builder: (context, state) {
                      final l10n = AppLocalizations.of(context);
                      return StudentJsonRoute(
                        title: l10n.groups,
                        cacheKey: 'student_groups',
                        path: '/student/groups',
                      );
                    },
                  ),
                  GoRoute(
                    path: 'planner',
                    builder: (context, state) {
                      final l10n = AppLocalizations.of(context);
                      return StudentJsonRoute(
                        title: l10n.planner,
                        cacheKey: 'student_planner',
                        path: '/student/desk/planner',
                      );
                    },
                  ),
                ],
              ),
            ],
          ),
          StatefulShellBranch(
            routes: [
              GoRoute(
                path: '/student/services',
                builder: (context, state) => const ServicesHubScreen(),
                routes: [
                  GoRoute(
                    path: 'library',
                    builder: (context, state) {
                      final l10n = AppLocalizations.of(context);
                      return StudentJsonRoute(
                        title: l10n.library,
                        cacheKey: 'student_library',
                        path: '/student/desk/library',
                      );
                    },
                  ),
                  GoRoute(
                    path: 'documents',
                    builder: (context, state) {
                      final l10n = AppLocalizations.of(context);
                      return StudentJsonRoute(
                        title: l10n.documents,
                        cacheKey: 'student_documents',
                        path: '/student/desk/documents',
                      );
                    },
                  ),
                  GoRoute(
                    path: 'helpdesk',
                    builder: (context, state) {
                      final l10n = AppLocalizations.of(context);
                      return StudentJsonRoute(
                        title: l10n.helpdesk,
                        cacheKey: 'student_helpdesk',
                        path: '/student/desk/helpdesk',
                      );
                    },
                  ),
                  GoRoute(
                    path: 'vocational',
                    builder: (context, state) {
                      final l10n = AppLocalizations.of(context);
                      return StudentJsonRoute(
                        title: l10n.vocational,
                        cacheKey: 'student_vocational',
                        path: '/student/desk/vocational',
                      );
                    },
                  ),
                  GoRoute(
                    path: 'id',
                    builder: (context, state) {
                      final l10n = AppLocalizations.of(context);
                      return StudentJsonRoute(
                        title: l10n.digitalId,
                        cacheKey: 'student_id',
                        path: '/student/desk/id',
                      );
                    },
                  ),
                ],
              ),
            ],
          ),
          StatefulShellBranch(
            routes: [
              GoRoute(
                path: '/student/more',
                builder: (context, state) => const MoreHubScreen(),
                routes: [
                  GoRoute(
                    path: 'notifications',
                    builder: (context, state) {
                      final l10n = AppLocalizations.of(context);
                      return StudentJsonRoute(
                        title: l10n.notifications,
                        cacheKey: 'student_notifications',
                        path: '/student/desk/notifications',
                      );
                    },
                  ),
                ],
              ),
            ],
          ),
        ],
      ),
      // Teacher placeholder route for role redirect (Part 2).
      GoRoute(
        path: '/teacher/home',
        builder: (context, state) => const UnsupportedRolePage(),
      ),
    ],
  );
});

class UnsupportedRolePage extends ConsumerWidget {
  const UnsupportedRolePage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppLocalizations.of(context);
    return Scaffold(
      appBar: AppBar(title: Text(l10n.appName)),
      body: Center(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(l10n.roleNotSupported, textAlign: TextAlign.center),
              const SizedBox(height: 16),
              FilledButton(
                onPressed: () =>
                    ref.read(authControllerProvider.notifier).logout(),
                child: Text(l10n.logout),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _AuthRefresh extends ChangeNotifier {
  _AuthRefresh(this.ref) {
    ref.listen<AuthState>(authControllerProvider, (_, _) {
      notifyListeners();
    });
  }

  final Ref ref;
}

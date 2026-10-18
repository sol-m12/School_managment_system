import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../core/auth/auth_user.dart';
import '../core/providers.dart';
import '../features/auth/login_page.dart';
import '../features/parent/parent_shell.dart';
import '../features/parent/screens/parent_academics_screen.dart';
import '../features/parent/screens/parent_home_screen.dart';
import '../features/parent/screens/parent_screens.dart';
import '../features/student/screens/clubs_screen.dart';
import '../features/student/screens/digital_id_screen.dart';
import '../features/student/screens/notifications_screen.dart';
import '../features/student/screens/student_screens.dart';
import '../features/student/screens/timetable_screen.dart';
import '../features/student/student_shell.dart';
import '../features/student/screens/services_screens.dart';
import '../features/teacher/screens/clubs_patron_screen.dart';
import '../features/teacher/screens/homeroom_attendance_screen.dart';
import '../features/teacher/screens/offline_attendance_screen.dart';
import '../features/teacher/screens/online_exams_screen.dart';
import '../features/teacher/screens/question_bank_screen.dart';
import '../features/teacher/screens/scan_id_screen.dart';
import '../features/teacher/screens/schedule_screens.dart';
import '../features/teacher/screens/student_360_screen.dart';
import '../features/teacher/screens/subject_attendance_screen.dart';
import '../features/teacher/screens/teacher_screens.dart';
import '../features/teacher/teacher_shell.dart';
import '../l10n/app_localizations.dart';

final _rootKey = GlobalKey<NavigatorState>();

/// Home path for a signed-in role (used by redirects and tests).
String homePathForRole(AuthUser user) {
  if (user.isStudent) return '/student/home';
  if (user.isTeacher) return '/teacher/home';
  if (user.isParent) return '/parent/home';
  return '/unsupported';
}

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
        return homePathForRole(user);
      }
      final loc = state.matchedLocation;
      if (loc.startsWith('/student') && !user.isStudent) {
        return homePathForRole(user);
      }
      if (loc.startsWith('/teacher') && !user.isTeacher) {
        return homePathForRole(user);
      }
      if (loc.startsWith('/parent') && !user.isParent) {
        return homePathForRole(user);
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
                    builder: (context, state) =>
                        const StudentTimetableScreen(),
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
                    builder: (context, state) => const StudentLibraryScreen(),
                  ),
                  GoRoute(
                    path: 'documents',
                    builder: (context, state) =>
                        const StudentDocumentsScreen(),
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
                    builder: (context, state) => const DigitalIdScreen(),
                  ),
                  GoRoute(
                    path: 'clubs',
                    builder: (context, state) => const StudentClubsScreen(),
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
                    builder: (context, state) => const NotificationsScreen(),
                  ),
                ],
              ),
            ],
          ),
        ],
      ),
      StatefulShellRoute.indexedStack(
        builder: (context, state, navigationShell) {
          return TeacherShell(navigationShell: navigationShell);
        },
        branches: [
          StatefulShellBranch(
            routes: [
              GoRoute(
                path: '/teacher/home',
                builder: (context, state) => const TeacherHomeScreen(),
                routes: [
                  GoRoute(
                    path: 'schedule',
                    builder: (context, state) =>
                        const TeacherScheduleScreen(),
                  ),
                  GoRoute(
                    path: 'profile',
                    builder: (context, state) {
                      final l10n = AppLocalizations.of(context);
                      return TeacherJsonRoute(
                        title: l10n.teacherProfile,
                        cacheKey: 'teacher_profile',
                        path: '/teacher/profile',
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
                path: '/teacher/attendance',
                builder: (context, state) => const TeacherAttendanceHubScreen(),
                routes: [
                  GoRoute(
                    path: 'homeroom',
                    builder: (context, state) =>
                        const HomeroomAttendanceScreen(),
                  ),
                  GoRoute(
                    path: 'subject',
                    builder: (context, state) =>
                        const SubjectAttendanceScreen(),
                  ),
                  GoRoute(
                    path: 'offline',
                    builder: (context, state) => const OfflineAttendanceScreen(),
                  ),
                ],
              ),
            ],
          ),
          StatefulShellBranch(
            routes: [
              GoRoute(
                path: '/teacher/classes',
                builder: (context, state) => const TeacherClassesHubScreen(),
                routes: [
                  GoRoute(
                    path: 'roster',
                    builder: (context, state) {
                      final l10n = AppLocalizations.of(context);
                      return TeacherJsonRoute(
                        title: l10n.classRoster,
                        cacheKey: 'teacher_roster',
                        path: '/teacher/roster',
                      );
                    },
                  ),
                  GoRoute(
                    path: 'registration',
                    builder: (context, state) {
                      final l10n = AppLocalizations.of(context);
                      return TeacherJsonRoute(
                        title: l10n.studentRegistration,
                        cacheKey: 'teacher_registration',
                        path: '/teacher/registration',
                      );
                    },
                  ),
                  GoRoute(
                    path: 'student-360',
                    builder: (context, state) => const Student360ListScreen(),
                    routes: [
                      GoRoute(
                        path: ':id',
                        builder: (context, state) {
                          final id = int.tryParse(
                                state.pathParameters['id'] ?? '',
                              ) ??
                              0;
                          return Student360DetailScreen(studentId: id);
                        },
                      ),
                    ],
                  ),
                  GoRoute(
                    path: 'report-cards',
                    builder: (context, state) {
                      final l10n = AppLocalizations.of(context);
                      return TeacherJsonRoute(
                        title: l10n.reportCards,
                        cacheKey: 'teacher_report_cards',
                        path: '/teacher/report-cards',
                      );
                    },
                  ),
                  GoRoute(
                    path: 'subject-report',
                    builder: (context, state) {
                      final l10n = AppLocalizations.of(context);
                      return TeacherJsonRoute(
                        title: l10n.subjectReport,
                        cacheKey: 'teacher_subject_report',
                        path: '/teacher/subject-report',
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
                path: '/teacher/teaching',
                builder: (context, state) => const TeacherTeachingHubScreen(),
                routes: [
                  GoRoute(
                    path: 'lessons',
                    builder: (context, state) {
                      final l10n = AppLocalizations.of(context);
                      return TeacherJsonRoute(
                        title: l10n.lessonPlans,
                        cacheKey: 'teacher_lessons',
                        path: '/teacher/lesson-plans',
                      );
                    },
                  ),
                  GoRoute(
                    path: 'exams',
                    builder: (context, state) => const OnlineExamsScreen(),
                  ),
                  GoRoute(
                    path: 'exam-results',
                    builder: (context, state) {
                      final l10n = AppLocalizations.of(context);
                      return TeacherJsonRoute(
                        title: l10n.examResults,
                        cacheKey: 'teacher_exam_results',
                        path: '/teacher/exam-results',
                      );
                    },
                  ),
                  GoRoute(
                    path: 'files',
                    builder: (context, state) {
                      final l10n = AppLocalizations.of(context);
                      return TeacherJsonRoute(
                        title: l10n.courseFiles,
                        cacheKey: 'teacher_course_files',
                        path: '/teacher/course-files',
                      );
                    },
                  ),
                  GoRoute(
                    path: 'simulations',
                    builder: (context, state) {
                      final l10n = AppLocalizations.of(context);
                      return TeacherJsonRoute(
                        title: l10n.simulations,
                        cacheKey: 'teacher_simulations',
                        path: '/teacher/simulations',
                      );
                    },
                  ),
                  GoRoute(
                    path: 'participation',
                    builder: (context, state) {
                      final l10n = AppLocalizations.of(context);
                      return TeacherJsonRoute(
                        title: l10n.participation,
                        cacheKey: 'teacher_participation',
                        path: '/teacher/office/participation',
                      );
                    },
                  ),
                  GoRoute(
                    path: 'questions',
                    builder: (context, state) => const QuestionBankScreen(),
                  ),
                ],
              ),
            ],
          ),
          StatefulShellBranch(
            routes: [
              GoRoute(
                path: '/teacher/office',
                builder: (context, state) => const TeacherOfficeHubScreen(),
                routes: [
                  GoRoute(
                    path: 'timetable',
                    builder: (context, state) =>
                        const TeacherOfficeTimetableScreen(),
                  ),
                  GoRoute(
                    path: 'leave',
                    builder: (context, state) {
                      final l10n = AppLocalizations.of(context);
                      return TeacherJsonRoute(
                        title: l10n.leaveRequest,
                        cacheKey: 'teacher_leave',
                        path: '/teacher/office/leave',
                      );
                    },
                  ),
                  GoRoute(
                    path: 'incidents',
                    builder: (context, state) {
                      final l10n = AppLocalizations.of(context);
                      return TeacherJsonRoute(
                        title: l10n.incidents,
                        cacheKey: 'teacher_incidents',
                        path: '/teacher/office/incidents',
                      );
                    },
                  ),
                  GoRoute(
                    path: 'library',
                    builder: (context, state) {
                      final l10n = AppLocalizations.of(context);
                      return TeacherJsonRoute(
                        title: l10n.library,
                        cacheKey: 'teacher_library',
                        path: '/teacher/office/library',
                      );
                    },
                  ),
                  GoRoute(
                    path: 'store',
                    builder: (context, state) {
                      final l10n = AppLocalizations.of(context);
                      return TeacherJsonRoute(
                        title: l10n.storeRequests,
                        cacheKey: 'teacher_store',
                        path: '/teacher/store-requests',
                      );
                    },
                  ),
                  GoRoute(
                    path: 'scan-id',
                    builder: (context, state) => const ScanDigitalIdScreen(),
                  ),
                  GoRoute(
                    path: 'clubs',
                    builder: (context, state) =>
                        const TeacherClubsPatronScreen(),
                  ),
                ],
              ),
            ],
          ),
          StatefulShellBranch(
            routes: [
              GoRoute(
                path: '/teacher/more',
                builder: (context, state) => const TeacherMoreScreen(),
              ),
            ],
          ),
        ],
      ),
      StatefulShellRoute.indexedStack(
        builder: (context, state, navigationShell) {
          return ParentShell(navigationShell: navigationShell);
        },
        branches: [
          StatefulShellBranch(
            routes: [
              GoRoute(
                path: '/parent/home',
                builder: (context, state) => const ParentHomeScreen(),
              ),
            ],
          ),
          StatefulShellBranch(
            routes: [
              GoRoute(
                path: '/parent/academics',
                builder: (context, state) => const ParentAcademicsHubScreen(),
                routes: [
                  GoRoute(
                    path: 'results',
                    builder: (context, state) =>
                        const ParentResultsRichScreen(),
                  ),
                  GoRoute(
                    path: 'homework',
                    builder: (context, state) => const ParentHomeworkScreen(),
                  ),
                ],
              ),
            ],
          ),
          StatefulShellBranch(
            routes: [
              GoRoute(
                path: '/parent/attendance',
                builder: (context, state) => const ParentAttendanceHubScreen(),
                routes: [
                  GoRoute(
                    path: 'status',
                    builder: (context, state) =>
                        const ParentAttendanceStatusScreen(),
                  ),
                  GoRoute(
                    path: 'conduct',
                    builder: (context, state) => const ParentConductScreen(),
                  ),
                ],
              ),
            ],
          ),
          StatefulShellBranch(
            routes: [
              GoRoute(
                path: '/parent/services',
                builder: (context, state) => const ParentServicesHubScreen(),
                routes: [
                  GoRoute(
                    path: 'library',
                    builder: (context, state) => const ParentLibraryScreen(),
                  ),
                  GoRoute(
                    path: 'messages',
                    builder: (context, state) => const ParentMessagesScreen(),
                  ),
                  GoRoute(
                    path: 'appointments',
                    builder: (context, state) =>
                        const ParentAppointmentsScreen(),
                  ),
                ],
              ),
            ],
          ),
          StatefulShellBranch(
            routes: [
              GoRoute(
                path: '/parent/more',
                builder: (context, state) => const ParentMoreScreen(),
                routes: [
                  GoRoute(
                    path: 'notifications',
                    builder: (context, state) =>
                        const ParentNotificationsScreen(),
                  ),
                  GoRoute(
                    path: 'appointments',
                    builder: (context, state) =>
                        const ParentAppointmentsScreen(),
                  ),
                  GoRoute(
                    path: 'results',
                    builder: (context, state) => const ParentResultsScreen(),
                  ),
                ],
              ),
            ],
          ),
        ],
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

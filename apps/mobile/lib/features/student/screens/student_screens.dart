import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/auth/biometric_service.dart';
import '../../../core/locale/locale_controller.dart';
import '../../../core/providers.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/widgets/auth_profile_photo.dart';
import '../../../core/widgets/json_screen.dart';
import '../../../l10n/app_localizations.dart';
import '../widgets/student_chrome.dart';

String _str(Object? value) => value?.toString().trim() ?? '';

String _gradeSection(AppLocalizations l10n, Object? grade, Object? section) {
  final g = _str(grade);
  final s = _str(section);
  if (g.isEmpty) return '';
  return l10n.gradeSection(g, s.isEmpty ? '' : s);
}

class StudentHomeScreen extends ConsumerWidget {
  const StudentHomeScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppLocalizations.of(context);
    return Scaffold(
      backgroundColor: AppColors.loginCanvas,
      body: SafeArea(
        child: JsonScreen(
          title: l10n.navHome,
          cacheKey: 'student_home',
          path: '/student/home',
          builder: (context, data) {
            if (data is! Map) return JsonBody(data: data);
            final map = Map<String, dynamic>.from(data);
            final fullName = _str(map['fullName']);
            final hasPhoto = map['hasPhoto'] == true;
            final studentId = _str(map['studentId']);
            final stream = _str(map['stream']);
            final year = _str(map['academicYear']);
            final today = _str(map['today']);
            final simCount = (map['simulationCount'] as num?)?.toInt() ?? 0;
            final greeting = switch (map['greeting'] as String?) {
              'morning' => l10n.greetingMorning,
              'afternoon' => l10n.greetingAfternoon,
              'evening' => l10n.greetingEvening,
              _ => l10n.navHome,
            };
            final user = ref.watch(authControllerProvider).user;
            final schoolName = (user?.tenantName.trim().isNotEmpty ?? false)
                ? user!.tenantName
                : l10n.appName;
            final sims = map['simulations'];
            final simRows = sims is List
                ? sims
                    .whereType<Map>()
                    .map((e) => Map<String, dynamic>.from(e))
                    .toList()
                : <Map<String, dynamic>>[];

            return Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                StudentTopBar(fullName: fullName, hasPhoto: hasPhoto),
                const SizedBox(height: 8),
                StudentSectionCard(
                  color: AppColors.brand50,
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        schoolName,
                        style: const TextStyle(
                          fontWeight: FontWeight.w800,
                          fontSize: 15,
                          color: AppColors.brand700,
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        [
                          if (year.isNotEmpty) l10n.academicYearLabel(year),
                          if (today.isNotEmpty) today,
                        ].join(' · '),
                        style: const TextStyle(
                          color: AppColors.inkMuted,
                          fontSize: 12,
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 12),
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: AppColors.brand700,
                    borderRadius: BorderRadius.circular(18),
                    boxShadow: [
                      BoxShadow(
                        color: AppColors.brand900.withValues(alpha: 0.2),
                        blurRadius: 18,
                        offset: const Offset(0, 8),
                      ),
                    ],
                  ),
                  child: Column(
                    children: [
                      Row(
                        children: [
                          AuthProfilePhoto(
                            size: 64,
                            fullName: fullName,
                            hasPhoto: hasPhoto,
                            borderColor: Colors.white,
                          ),
                          const SizedBox(width: 14),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                if (studentId.isNotEmpty)
                                  Text(
                                    l10n.studentIdLabel(studentId),
                                    style: TextStyle(
                                      color: Colors.white.withValues(alpha: 0.8),
                                      fontSize: 12,
                                      fontWeight: FontWeight.w600,
                                    ),
                                  ),
                                const SizedBox(height: 4),
                                Text(
                                  fullName.isEmpty ? l10n.studentRoleLabel : fullName,
                                  style: const TextStyle(
                                    color: Colors.white,
                                    fontSize: 18,
                                    fontWeight: FontWeight.w800,
                                    height: 1.2,
                                  ),
                                ),
                                const SizedBox(height: 4),
                                Text(
                                  [
                                    greeting,
                                    _gradeSection(
                                      l10n,
                                      map['gradeLevel'],
                                      map['section'],
                                    ),
                                    if (stream.isNotEmpty)
                                      l10n.streamLabel(stream),
                                  ].where((s) => s.isNotEmpty).join(' · '),
                                  style: TextStyle(
                                    color: Colors.white.withValues(alpha: 0.85),
                                    fontSize: 12,
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 16),
                      Row(
                        children: [
                          _StatChip(
                            label: l10n.simulationsCount(simCount),
                          ),
                          const SizedBox(width: 8),
                          _StatChip(
                            label: _gradeSection(
                              l10n,
                              map['gradeLevel'],
                              map['section'],
                            ),
                          ),
                          const SizedBox(width: 8),
                          _StatChip(
                            label: l10n.studentRoleLabel,
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 18),
                Text(
                  l10n.quickActions,
                  style: const TextStyle(
                    fontWeight: FontWeight.w800,
                    fontSize: 15,
                    color: AppColors.inkStrong,
                  ),
                ),
                const SizedBox(height: 10),
                StudentQuickActionGrid(
                  actions: [
                    StudentQuickAction(
                      label: l10n.results,
                      icon: Icons.bar_chart,
                      onTap: () => context.push('/student/academics/results'),
                    ),
                    StudentQuickAction(
                      label: l10n.timetable,
                      icon: Icons.calendar_month,
                      onTap: () => context.push('/student/academics/timetable'),
                    ),
                    StudentQuickAction(
                      label: l10n.attendance,
                      icon: Icons.how_to_reg,
                      onTap: () => context.push('/student/attendance/status'),
                    ),
                    StudentQuickAction(
                      label: l10n.resources,
                      icon: Icons.folder_open,
                      onTap: () => context.push('/student/learning/resources'),
                    ),
                    StudentQuickAction(
                      label: l10n.digitalId,
                      icon: Icons.badge,
                      onTap: () => context.push('/student/services/id'),
                    ),
                    StudentQuickAction(
                      label: l10n.notifications,
                      icon: Icons.notifications_outlined,
                      onTap: () => context.push('/student/more/notifications'),
                    ),
                  ],
                ),
                const SizedBox(height: 18),
                Row(
                  children: [
                    Expanded(
                      child: Text(
                        l10n.todaySimulations,
                        style: const TextStyle(
                          fontWeight: FontWeight.w800,
                          fontSize: 15,
                          color: AppColors.inkStrong,
                        ),
                      ),
                    ),
                    TextButton(
                      onPressed: () =>
                          context.push('/student/learning/simulations'),
                      child: Text(l10n.viewAll),
                    ),
                  ],
                ),
                if (simRows.isEmpty)
                  StudentSectionCard(
                    child: Text(
                      l10n.noSimulationsYet,
                      style: const TextStyle(color: AppColors.inkMuted),
                    ),
                  )
                else
                  ...simRows.take(4).map((row) {
                    final title = _str(row['title']).isEmpty
                        ? _str(row['subjectName'])
                        : _str(row['title']);
                    final subject = _str(row['subjectName']);
                    return Padding(
                      padding: const EdgeInsets.only(bottom: 8),
                      child: StudentSectionCard(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 14,
                          vertical: 12,
                        ),
                        child: Row(
                          children: [
                            Container(
                              width: 40,
                              height: 40,
                              decoration: BoxDecoration(
                                color: AppColors.brand50,
                                borderRadius: BorderRadius.circular(12),
                              ),
                              child: const Icon(
                                Icons.science_outlined,
                                color: AppColors.brand700,
                              ),
                            ),
                            const SizedBox(width: 12),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    title.isEmpty ? l10n.simulations : title,
                                    style: const TextStyle(
                                      fontWeight: FontWeight.w700,
                                      color: AppColors.inkStrong,
                                    ),
                                  ),
                                  if (subject.isNotEmpty)
                                    Text(
                                      subject,
                                      style: const TextStyle(
                                        color: AppColors.inkMuted,
                                        fontSize: 12,
                                      ),
                                    ),
                                ],
                              ),
                            ),
                            const Icon(
                              Icons.chevron_right,
                              color: AppColors.inkMuted,
                            ),
                          ],
                        ),
                      ),
                    );
                  }),
              ],
            );
          },
        ),
      ),
    );
  }
}

class _StatChip extends StatelessWidget {
  const _StatChip({required this.label});

  final String label;

  @override
  Widget build(BuildContext context) {
    if (label.isEmpty) return const SizedBox.shrink();
    return Expanded(
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 10, horizontal: 6),
        decoration: BoxDecoration(
          color: Colors.white.withValues(alpha: 0.12),
          borderRadius: BorderRadius.circular(10),
        ),
        child: Text(
          label,
          textAlign: TextAlign.center,
          maxLines: 2,
          overflow: TextOverflow.ellipsis,
          style: const TextStyle(
            color: Colors.white,
            fontSize: 10,
            fontWeight: FontWeight.w700,
            height: 1.2,
          ),
        ),
      ),
    );
  }
}

class AcademicsHubScreen extends StatelessWidget {
  const AcademicsHubScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    return _StudentHubScaffold(
      title: l10n.navAcademics,
      child: StudentQuickActionGrid(
        actions: [
          StudentQuickAction(
            label: l10n.results,
            icon: Icons.bar_chart,
            onTap: () => context.push('/student/academics/results'),
          ),
          StudentQuickAction(
            label: l10n.timetable,
            icon: Icons.calendar_month,
            onTap: () => context.push('/student/academics/timetable'),
          ),
          StudentQuickAction(
            label: l10n.exams,
            icon: Icons.laptop,
            onTap: () => context.push('/student/academics/exams'),
          ),
          StudentQuickAction(
            label: l10n.quiz,
            icon: Icons.emoji_events,
            onTap: () => context.push('/student/academics/quiz'),
          ),
          StudentQuickAction(
            label: l10n.assignments,
            icon: Icons.assignment,
            onTap: () => context.push('/student/academics/assignments'),
          ),
        ],
      ),
    );
  }
}

class AttendanceHubScreen extends StatelessWidget {
  const AttendanceHubScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    return _StudentHubScaffold(
      title: l10n.navAttendance,
      child: StudentQuickActionGrid(
        actions: [
          StudentQuickAction(
            label: l10n.attendance,
            icon: Icons.how_to_reg,
            onTap: () => context.push('/student/attendance/status'),
          ),
          StudentQuickAction(
            label: l10n.discipline,
            icon: Icons.gavel,
            onTap: () => context.push('/student/attendance/discipline'),
          ),
        ],
      ),
    );
  }
}

class LearningHubScreen extends StatelessWidget {
  const LearningHubScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    return _StudentHubScaffold(
      title: l10n.navLearning,
      child: StudentQuickActionGrid(
        actions: [
          StudentQuickAction(
            label: l10n.resources,
            icon: Icons.folder_open,
            onTap: () => context.push('/student/learning/resources'),
          ),
          StudentQuickAction(
            label: l10n.simulations,
            icon: Icons.science,
            onTap: () => context.push('/student/learning/simulations'),
          ),
          StudentQuickAction(
            label: l10n.virtualLab,
            icon: Icons.biotech,
            onTap: () => context.push('/student/learning/labs'),
          ),
          StudentQuickAction(
            label: l10n.groups,
            icon: Icons.groups,
            onTap: () => context.push('/student/learning/groups'),
          ),
          StudentQuickAction(
            label: l10n.planner,
            icon: Icons.psychology,
            onTap: () => context.push('/student/learning/planner'),
          ),
        ],
      ),
    );
  }
}

class ServicesHubScreen extends StatelessWidget {
  const ServicesHubScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    return _StudentHubScaffold(
      title: l10n.navServices,
      child: StudentQuickActionGrid(
        actions: [
          StudentQuickAction(
            label: l10n.library,
            icon: Icons.local_library,
            onTap: () => context.push('/student/services/library'),
          ),
          StudentQuickAction(
            label: l10n.documents,
            icon: Icons.description,
            onTap: () => context.push('/student/services/documents'),
          ),
          StudentQuickAction(
            label: l10n.helpdesk,
            icon: Icons.support_agent,
            onTap: () => context.push('/student/services/helpdesk'),
          ),
          StudentQuickAction(
            label: l10n.vocational,
            icon: Icons.handyman,
            onTap: () => context.push('/student/services/vocational'),
          ),
          StudentQuickAction(
            label: l10n.digitalId,
            icon: Icons.badge,
            onTap: () => context.push('/student/services/id'),
          ),
        ],
      ),
    );
  }
}

class _StudentHubScaffold extends StatelessWidget {
  const _StudentHubScaffold({required this.title, required this.child});

  final String title;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.loginCanvas,
      body: SafeArea(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            const StudentTopBar(),
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 4, 16, 12),
              child: Text(
                title,
                style: const TextStyle(
                  fontSize: 20,
                  fontWeight: FontWeight.w800,
                  color: AppColors.inkStrong,
                ),
              ),
            ),
            Expanded(
              child: ListView(
                padding: const EdgeInsets.fromLTRB(16, 0, 16, 24),
                children: [child],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class MoreHubScreen extends ConsumerStatefulWidget {
  const MoreHubScreen({super.key});

  @override
  ConsumerState<MoreHubScreen> createState() => _MoreHubScreenState();
}

class _MoreHubScreenState extends ConsumerState<MoreHubScreen> {
  Map<String, dynamic>? _home;
  bool _biometricEnabled = false;
  bool _biometricAvailable = false;

  @override
  void initState() {
    super.initState();
    Future.microtask(_load);
  }

  Future<void> _load() async {
    final user = ref.read(authControllerProvider).user;
    final store = ref.read(biometricCredentialsStoreProvider);
    final biometric = ref.read(biometricServiceProvider);
    final enabled = await store.isEnabled();
    final availability = await biometric.availability();
    Map<String, dynamic>? home;
    if (user != null) {
      try {
        final cache = ref.read(cacheRepositoryProvider);
        final result = await cache.cacheFirstJson<Object?>(
          user: user,
          key: 'student_home',
          path: '/student/home',
          parse: (json) => json,
          forceRefresh: false,
        );
        if (result.data is Map) {
          home = Map<String, dynamic>.from(result.data as Map);
        }
      } catch (_) {}
    }
    if (!mounted) return;
    setState(() {
      _home = home;
      _biometricEnabled = enabled;
      _biometricAvailable =
          availability == BiometricAvailability.available;
    });
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final user = ref.watch(authControllerProvider).user;
    final locale = ref.watch(localeControllerProvider);
    final fullName = _str(_home?['fullName']);
    final hasPhoto = _home?['hasPhoto'] == true;
    final studentId = _str(_home?['studentId']);
    final year = _str(_home?['academicYear']);
    final schoolName = (user?.tenantName.trim().isNotEmpty ?? false)
        ? user!.tenantName
        : l10n.appName;

    return Scaffold(
      backgroundColor: AppColors.loginCanvas,
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.fromLTRB(16, 8, 16, 32),
          children: [
            StudentTopBar(fullName: fullName, hasPhoto: hasPhoto),
            const SizedBox(height: 8),
            StudentSectionCard(
              child: Row(
                children: [
                  AuthProfilePhoto(
                    size: 72,
                    fullName: fullName.isEmpty ? user?.username : fullName,
                    hasPhoto: hasPhoto,
                  ),
                  const SizedBox(width: 14),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          fullName.isEmpty
                              ? (user?.username ?? l10n.studentRoleLabel)
                              : fullName,
                          style: const TextStyle(
                            fontWeight: FontWeight.w800,
                            fontSize: 18,
                            color: AppColors.inkStrong,
                          ),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          l10n.studentRoleLabel,
                          style: const TextStyle(
                            color: AppColors.inkMuted,
                            fontSize: 13,
                          ),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          [
                            schoolName,
                            if (studentId.isNotEmpty)
                              l10n.studentIdLabel(studentId),
                          ].join(' · '),
                          style: const TextStyle(
                            color: AppColors.inkMuted,
                            fontSize: 12,
                          ),
                        ),
                        if (year.isNotEmpty) ...[
                          const SizedBox(height: 6),
                          Container(
                            padding: const EdgeInsets.symmetric(
                              horizontal: 8,
                              vertical: 4,
                            ),
                            decoration: BoxDecoration(
                              color: AppColors.brand50,
                              borderRadius: BorderRadius.circular(8),
                            ),
                            child: Text(
                              l10n.academicYearLabel(year),
                              style: const TextStyle(
                                color: AppColors.brand700,
                                fontSize: 11,
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                          ),
                        ],
                      ],
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 16),
            StudentSectionCard(
              padding: EdgeInsets.zero,
              child: Column(
                children: [
                  ListTile(
                    leading: const Icon(Icons.notifications_outlined),
                    title: Text(l10n.notifications),
                    trailing: const Icon(Icons.chevron_right),
                    onTap: () => context.push('/student/more/notifications'),
                  ),
                  const Divider(height: 1),
                  ListTile(
                    leading: const Icon(Icons.badge_outlined),
                    title: Text(l10n.digitalId),
                    trailing: const Icon(Icons.chevron_right),
                    onTap: () => context.push('/student/services/id'),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 16),
            Text(
              l10n.language,
              style: const TextStyle(
                fontWeight: FontWeight.w800,
                color: AppColors.inkStrong,
              ),
            ),
            const SizedBox(height: 8),
            StudentSectionCard(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Text(
                    l10n.schoolPortal,
                    style: const TextStyle(
                      color: AppColors.inkMuted,
                      fontSize: 12,
                    ),
                  ),
                  const SizedBox(height: 10),
                  SegmentedButton<String>(
                    segments: [
                      ButtonSegment(
                        value: 'am',
                        label: Text(l10n.languageAmharic),
                      ),
                      ButtonSegment(
                        value: 'en',
                        label: Text(l10n.languageEnglish),
                      ),
                    ],
                    selected: {locale.languageCode},
                    onSelectionChanged: (values) {
                      ref
                          .read(localeControllerProvider.notifier)
                          .setLocale(Locale(values.first));
                    },
                  ),
                ],
              ),
            ),
            const SizedBox(height: 16),
            StudentSectionCard(
              child: Row(
                children: [
                  const Icon(Icons.fingerprint, color: AppColors.brand700),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          l10n.biometricUnlock,
                          style: const TextStyle(fontWeight: FontWeight.w700),
                        ),
                        Text(
                          !_biometricAvailable
                              ? l10n.biometricsUnavailable
                              : (_biometricEnabled
                                  ? l10n.biometricActive
                                  : l10n.biometricOff),
                          style: TextStyle(
                            color: _biometricEnabled
                                ? AppColors.success
                                : AppColors.inkMuted,
                            fontSize: 12,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 24),
            SizedBox(
              height: 52,
              child: FilledButton(
                onPressed: () =>
                    ref.read(authControllerProvider.notifier).logout(),
                style: FilledButton.styleFrom(
                  backgroundColor: const Color(0xFFFEE2E2),
                  foregroundColor: AppColors.danger,
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                ),
                child: Text(
                  '${l10n.logout} / ${l10n.signOutBilingual}',
                  style: const TextStyle(fontWeight: FontWeight.w800),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class StudentJsonRoute extends StatelessWidget {
  const StudentJsonRoute({
    super.key,
    required this.title,
    required this.cacheKey,
    required this.path,
  });

  final String title;
  final String cacheKey;
  final String path;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.loginCanvas,
      appBar: AppBar(title: Text(title)),
      body: JsonScreen(
        title: title,
        cacheKey: cacheKey,
        path: path,
        builder: (context, data) => JsonBody(data: data),
      ),
    );
  }
}

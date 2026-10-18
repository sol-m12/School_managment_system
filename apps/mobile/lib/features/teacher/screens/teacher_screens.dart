import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/auth/biometric_service.dart';
import '../../../core/locale/locale_controller.dart';
import '../../../core/providers.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/widgets/auth_profile_photo.dart';
import '../../../core/widgets/json_screen.dart';
import '../../../core/widgets/keyt_app_bar.dart';
import '../../../core/widgets/timetable_widgets.dart';
import '../../../l10n/app_localizations.dart';
import '../widgets/teacher_chrome.dart';

String _str(Object? value) => value?.toString().trim() ?? '';

class TeacherHomeScreen extends ConsumerWidget {
  const TeacherHomeScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppLocalizations.of(context);
    final pending = ref.watch(pendingOutboxCountProvider).value ?? 0;

    return Scaffold(
      backgroundColor: AppColors.loginCanvas,
      body: SafeArea(
        child: JsonScreen(
          title: l10n.navHome,
          cacheKey: 'teacher_home',
          path: '/teacher/home',
          builder: (context, data) {
            if (data is! Map) return JsonBody(data: data);
            final map = Map<String, dynamic>.from(data);
            final fullName = _str(map['fullName']);
            final hasPhoto = map['hasPhoto'] == true;
            final jobTitle = _str(map['jobTitle']);
            final specialization = _str(map['specialization']);
            final year = _str(map['academicYear']);
            final today = _str(map['today']);
            final periodsToday =
                (map['todayPeriodCount'] as num?)?.toInt() ?? 0;
            final classCount = (map['classCount'] as num?)?.toInt() ?? 0;
            final assignmentCount =
                (map['assignmentCount'] as num?)?.toInt() ?? 0;
            final user = ref.watch(authControllerProvider).user;
            final schoolName = (user?.tenantName.trim().isNotEmpty ?? false)
                ? user!.tenantName
                : l10n.appName;

            final todayPeriods = map['todayPeriods'] is List
                ? (map['todayPeriods'] as List)
                    .whereType<Map>()
                    .map((e) => Map<String, dynamic>.from(e))
                    .toList()
                : <Map<String, dynamic>>[];

            final roleLine = [
              if (jobTitle.isNotEmpty) jobTitle,
              if (specialization.isNotEmpty) specialization,
              l10n.teacherRoleLabel,
            ].join(' · ');

            return Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                TeacherTopBar(fullName: fullName, hasPhoto: hasPhoto),
                const SizedBox(height: 8),
                TeacherSectionCard(
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
                                Text(
                                  fullName.isEmpty
                                      ? (user?.username ?? l10n.teacherRoleLabel)
                                      : fullName,
                                  style: const TextStyle(
                                    color: Colors.white,
                                    fontSize: 18,
                                    fontWeight: FontWeight.w800,
                                    height: 1.2,
                                  ),
                                ),
                                const SizedBox(height: 4),
                                Text(
                                  roleLine,
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
                          _StatChip(label: l10n.periodsToday(periodsToday)),
                          const SizedBox(width: 8),
                          _StatChip(label: l10n.classesAssigned(classCount)),
                          const SizedBox(width: 8),
                          _StatChip(
                            label: l10n.assignmentsCount(assignmentCount),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
                if (pending > 0) ...[
                  const SizedBox(height: 12),
                  TeacherSectionCard(
                    color: const Color(0xFFEFF6FF),
                    child: Row(
                      children: [
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                l10n.offlineReady,
                                style: const TextStyle(
                                  fontWeight: FontWeight.w800,
                                  color: AppColors.brand700,
                                ),
                              ),
                              const SizedBox(height: 4),
                              Text(
                                l10n.syncRecordsPending(pending),
                                style: const TextStyle(
                                  color: AppColors.inkMuted,
                                  fontSize: 12,
                                ),
                              ),
                            ],
                          ),
                        ),
                        FilledButton(
                          onPressed: () => ref
                              .read(attendanceOutboxSyncProvider.notifier)
                              .syncNow(),
                          child: Text(l10n.syncNow),
                        ),
                      ],
                    ),
                  ),
                ],
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
                TeacherQuickActionGrid(
                  actions: [
                    TeacherQuickAction(
                      label: l10n.homeroomAttendance,
                      icon: Icons.how_to_reg,
                      onTap: () =>
                          context.push('/teacher/attendance/homeroom'),
                    ),
                    TeacherQuickAction(
                      label: l10n.subjectAttendance,
                      icon: Icons.edit_calendar,
                      onTap: () =>
                          context.push('/teacher/attendance/subject'),
                    ),
                    TeacherQuickAction(
                      label: l10n.student360,
                      icon: Icons.travel_explore,
                      onTap: () =>
                          context.push('/teacher/classes/student-360'),
                    ),
                    TeacherQuickAction(
                      label: l10n.examResults,
                      icon: Icons.edit_note,
                      onTap: () =>
                          context.push('/teacher/teaching/exam-results'),
                    ),
                    TeacherQuickAction(
                      label: l10n.lessonPlans,
                      icon: Icons.menu_book,
                      onTap: () =>
                          context.push('/teacher/teaching/lessons'),
                    ),
                    TeacherQuickAction(
                      label: l10n.classRoster,
                      icon: Icons.groups_outlined,
                      onTap: () => context.push('/teacher/classes/roster'),
                    ),
                  ],
                ),
                const SizedBox(height: 18),
                Row(
                  children: [
                    Expanded(
                      child: Text(
                        l10n.todaySchedule,
                        style: const TextStyle(
                          fontWeight: FontWeight.w800,
                          fontSize: 15,
                          color: AppColors.inkStrong,
                        ),
                      ),
                    ),
                    TextButton(
                      onPressed: () =>
                          context.push('/teacher/home/schedule'),
                      child: Text(l10n.viewAll),
                    ),
                  ],
                ),
                if (todayPeriods.isEmpty)
                  TimetableEmptyCard(message: l10n.noPeriodsToday)
                else
                  ...todayPeriods.asMap().entries.map((entry) {
                    final row = Map<String, dynamic>.from(entry.value);
                    row['period'] ??= entry.key + 1;
                    return TimetablePeriodCard.fromMap(
                      row,
                      l10n: l10n,
                      isToday: true,
                    );
                  }),
                const SizedBox(height: 8),
                TextButton(
                  onPressed: () => context.push('/teacher/home/profile'),
                  child: Text(l10n.teacherProfile),
                ),
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

class TeacherAttendanceHubScreen extends ConsumerWidget {
  const TeacherAttendanceHubScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppLocalizations.of(context);
    final pending = ref.watch(pendingOutboxCountProvider).value ?? 0;
    return _TeacherHubScaffold(
      title: l10n.navAttendance,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          if (pending > 0) ...[
            TeacherSectionCard(
              color: const Color(0xFFEFF6FF),
              child: Row(
                children: [
                  Expanded(child: Text(l10n.pendingSync(pending))),
                  TextButton(
                    onPressed: () => ref
                        .read(attendanceOutboxSyncProvider.notifier)
                        .syncNow(),
                    child: Text(l10n.syncNow),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 12),
          ],
          TeacherQuickActionGrid(
            actions: [
              TeacherQuickAction(
                label: l10n.homeroomAttendance,
                icon: Icons.how_to_reg,
                onTap: () => context.push('/teacher/attendance/homeroom'),
              ),
              TeacherQuickAction(
                label: l10n.subjectAttendance,
                icon: Icons.edit_calendar,
                onTap: () => context.push('/teacher/attendance/subject'),
              ),
              TeacherQuickAction(
                label: l10n.offlineAttendance,
                icon: Icons.wifi_off,
                onTap: () => context.push('/teacher/attendance/offline'),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class TeacherClassesHubScreen extends StatelessWidget {
  const TeacherClassesHubScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    return _TeacherHubScaffold(
      title: l10n.navClasses,
      child: TeacherQuickActionGrid(
        actions: [
          TeacherQuickAction(
            label: l10n.classRoster,
            icon: Icons.group,
            onTap: () => context.push('/teacher/classes/roster'),
          ),
          TeacherQuickAction(
            label: l10n.studentRegistration,
            icon: Icons.app_registration,
            onTap: () => context.push('/teacher/classes/registration'),
          ),
          TeacherQuickAction(
            label: l10n.student360,
            icon: Icons.travel_explore,
            onTap: () => context.push('/teacher/classes/student-360'),
          ),
          TeacherQuickAction(
            label: l10n.reportCards,
            icon: Icons.receipt_long,
            onTap: () => context.push('/teacher/classes/report-cards'),
          ),
          TeacherQuickAction(
            label: l10n.subjectReport,
            icon: Icons.assessment,
            onTap: () => context.push('/teacher/classes/subject-report'),
          ),
        ],
      ),
    );
  }
}

class TeacherTeachingHubScreen extends StatelessWidget {
  const TeacherTeachingHubScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    return _TeacherHubScaffold(
      title: l10n.navTeaching,
      child: TeacherQuickActionGrid(
        actions: [
          TeacherQuickAction(
            label: l10n.lessonPlans,
            icon: Icons.menu_book,
            onTap: () => context.push('/teacher/teaching/lessons'),
          ),
          TeacherQuickAction(
            label: l10n.exams,
            icon: Icons.laptop,
            onTap: () => context.push('/teacher/teaching/exams'),
          ),
          TeacherQuickAction(
            label: l10n.examResults,
            icon: Icons.bar_chart,
            onTap: () => context.push('/teacher/teaching/exam-results'),
          ),
          TeacherQuickAction(
            label: l10n.courseFiles,
            icon: Icons.folder,
            onTap: () => context.push('/teacher/teaching/files'),
          ),
          TeacherQuickAction(
            label: l10n.simulations,
            icon: Icons.science,
            onTap: () => context.push('/teacher/teaching/simulations'),
          ),
          TeacherQuickAction(
            label: l10n.participation,
            icon: Icons.front_hand,
            onTap: () => context.push('/teacher/teaching/participation'),
          ),
          TeacherQuickAction(
            label: l10n.questionBank,
            icon: Icons.quiz,
            onTap: () => context.push('/teacher/teaching/questions'),
          ),
        ],
      ),
    );
  }
}

class TeacherOfficeHubScreen extends StatelessWidget {
  const TeacherOfficeHubScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    return _TeacherHubScaffold(
      title: l10n.navOffice,
      child: TeacherQuickActionGrid(
        actions: [
          TeacherQuickAction(
            label: l10n.timetable,
            icon: Icons.calendar_month,
            onTap: () => context.push('/teacher/office/timetable'),
          ),
          TeacherQuickAction(
            label: l10n.leaveRequest,
            icon: Icons.event_busy,
            onTap: () => context.push('/teacher/office/leave'),
          ),
          TeacherQuickAction(
            label: l10n.incidents,
            icon: Icons.campaign,
            onTap: () => context.push('/teacher/office/incidents'),
          ),
          TeacherQuickAction(
            label: l10n.library,
            icon: Icons.local_library,
            onTap: () => context.push('/teacher/office/library'),
          ),
          TeacherQuickAction(
            label: l10n.storeRequests,
            icon: Icons.inventory_2,
            onTap: () => context.push('/teacher/office/store'),
          ),
          TeacherQuickAction(
            label: l10n.scanDigitalId,
            icon: Icons.qr_code_scanner,
            onTap: () => context.push('/teacher/office/scan-id'),
          ),
          TeacherQuickAction(
            label: l10n.clubsTitle,
            icon: Icons.emoji_events_outlined,
            onTap: () => context.push('/teacher/office/clubs'),
          ),
          TeacherQuickAction(
            label: l10n.lfBoardTitle,
            icon: Icons.search,
            onTap: () => context.push('/teacher/office/lost-found'),
          ),
          TeacherQuickAction(
            label: l10n.forumModerateTitle,
            icon: Icons.forum_outlined,
            onTap: () => context.push('/teacher/office/forum'),
          ),
          TeacherQuickAction(
            label: l10n.schRecommendTitle,
            icon: Icons.school_outlined,
            onTap: () => context.push('/teacher/office/scholarships'),
          ),
          TeacherQuickAction(
            label: l10n.curriculumTitle,
            icon: Icons.book_outlined,
            onTap: () => context.push('/teacher/office/curriculum'),
          ),
          TeacherQuickAction(
            label: l10n.gradeWorkflowTitle,
            icon: Icons.fact_check_outlined,
            onTap: () => context.push('/teacher/office/grade-workflow'),
          ),
          TeacherQuickAction(
            label: l10n.procurementTitle,
            icon: Icons.shopping_cart_outlined,
            onTap: () => context.push('/teacher/office/procurement'),
          ),
          TeacherQuickAction(
            label: l10n.coverageTitle,
            icon: Icons.stacked_line_chart,
            onTap: () => context.push('/teacher/office/coverage'),
          ),
          TeacherQuickAction(
            label: l10n.evaluationTitle,
            icon: Icons.star_outline,
            onTap: () => context.push('/teacher/office/evaluation'),
          ),
        ],
      ),
    );
  }
}

class _TeacherHubScaffold extends StatelessWidget {
  const _TeacherHubScaffold({required this.title, required this.child});

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
            const TeacherTopBar(),
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

class TeacherMoreScreen extends ConsumerStatefulWidget {
  const TeacherMoreScreen({super.key});

  @override
  ConsumerState<TeacherMoreScreen> createState() => _TeacherMoreScreenState();
}

class _TeacherMoreScreenState extends ConsumerState<TeacherMoreScreen> {
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
          key: 'teacher_home',
          path: '/teacher/home',
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
      _biometricAvailable = availability == BiometricAvailability.available;
    });
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final user = ref.watch(authControllerProvider).user;
    final locale = ref.watch(localeControllerProvider);
    final fullName = _str(_home?['fullName']);
    final hasPhoto = _home?['hasPhoto'] == true;
    final jobTitle = _str(_home?['jobTitle']);
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
            TeacherTopBar(fullName: fullName, hasPhoto: hasPhoto),
            const SizedBox(height: 8),
            TeacherSectionCard(
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
                              ? (user?.username ?? l10n.teacherRoleLabel)
                              : fullName,
                          style: const TextStyle(
                            fontWeight: FontWeight.w800,
                            fontSize: 18,
                            color: AppColors.inkStrong,
                          ),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          [
                            if (jobTitle.isNotEmpty) jobTitle,
                            l10n.teacherRoleLabel,
                          ].join(' · '),
                          style: const TextStyle(
                            color: AppColors.inkMuted,
                            fontSize: 13,
                          ),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          schoolName,
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
            Text(
              l10n.language,
              style: const TextStyle(
                fontWeight: FontWeight.w800,
                color: AppColors.inkStrong,
              ),
            ),
            const SizedBox(height: 8),
            TeacherSectionCard(
              child: SegmentedButton<String>(
                segments: [
                  ButtonSegment(value: 'am', label: Text(l10n.languageAmharic)),
                  ButtonSegment(value: 'en', label: Text(l10n.languageEnglish)),
                ],
                selected: {locale.languageCode},
                onSelectionChanged: (values) {
                  ref
                      .read(localeControllerProvider.notifier)
                      .setLocale(Locale(values.first));
                },
              ),
            ),
            const SizedBox(height: 16),
            TeacherSectionCard(
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
            const SizedBox(height: 16),
            TeacherSectionCard(
              padding: EdgeInsets.zero,
              child: ListTile(
                leading: const Icon(Icons.person_outline),
                title: Text(l10n.teacherProfile),
                trailing: const Icon(Icons.chevron_right),
                onTap: () => context.push('/teacher/home/profile'),
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

class TeacherJsonRoute extends StatelessWidget {
  const TeacherJsonRoute({
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
      appBar: KeytAppBar(title: title),
      body: JsonScreen(
        title: title,
        cacheKey: cacheKey,
        path: path,
        builder: (context, data) => JsonBody(data: data),
      ),
    );
  }
}

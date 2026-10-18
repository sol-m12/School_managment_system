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

List<Map<String, dynamic>> _maps(Object? raw) {
  if (raw is! List) return const [];
  return raw
      .whereType<Map>()
      .map((e) => Map<String, dynamic>.from(e))
      .toList();
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
            final semester = _str(map['semester']);
            final user = ref.watch(authControllerProvider).user;
            final schoolName = (user?.tenantName.trim().isNotEmpty ?? false)
                ? user!.tenantName
                : l10n.appName;
            final att = map['attendance'] is Map
                ? Map<String, dynamic>.from(map['attendance'] as Map)
                : <String, dynamic>{};
            final attPercent = (att['percent'] as num?)?.toDouble();
            final periods = _maps(map['todayPeriods']);
            final sims = _maps(map['simulations']);

            return Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                StudentTopBar(
                  fullName: fullName,
                  hasPhoto: hasPhoto,
                  academicYear: year,
                  semester: semester,
                ),
                const SizedBox(height: 8),
                StudentSectionCard(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          const Icon(Icons.shield_outlined,
                              size: 16, color: AppColors.brand700),
                          const SizedBox(width: 6),
                          Expanded(
                            child: Text(
                              schoolName,
                              style: const TextStyle(
                                fontWeight: FontWeight.w700,
                                fontSize: 12,
                                color: AppColors.brand700,
                              ),
                            ),
                          ),
                          if (attPercent != null)
                            Container(
                              padding: const EdgeInsets.symmetric(
                                horizontal: 8,
                                vertical: 4,
                              ),
                              decoration: BoxDecoration(
                                color: AppColors.success.withValues(alpha: 0.12),
                                borderRadius: BorderRadius.circular(20),
                              ),
                              child: Text(
                                '${attPercent.toStringAsFixed(attPercent % 1 == 0 ? 0 : 1)}%',
                                style: const TextStyle(
                                  color: AppColors.success,
                                  fontWeight: FontWeight.w800,
                                  fontSize: 11,
                                ),
                              ),
                            ),
                        ],
                      ),
                      const SizedBox(height: 14),
                      Row(
                        children: [
                          AuthProfilePhoto(
                            size: 64,
                            fullName: fullName,
                            hasPhoto: hasPhoto,
                          ),
                          const SizedBox(width: 14),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  fullName.isEmpty
                                      ? l10n.studentRoleLabel
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
                                    _gradeSection(
                                      l10n,
                                      map['gradeLevel'],
                                      map['section'],
                                    ),
                                    if (stream.isNotEmpty) stream,
                                    if (studentId.isNotEmpty)
                                      l10n.studentIdLabel(studentId),
                                  ].where((s) => s.isNotEmpty).join(' • '),
                                  style: const TextStyle(
                                    color: AppColors.inkMuted,
                                    fontSize: 12,
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 12),
                StudentQuickActionRow(
                  actions: [
                    StudentQuickAction(
                      label: l10n.digitalId,
                      icon: Icons.badge_outlined,
                      onTap: () => context.push('/student/services/id'),
                    ),
                    StudentQuickAction(
                      label: l10n.timetable,
                      icon: Icons.calendar_month_outlined,
                      onTap: () =>
                          context.push('/student/academics/timetable'),
                    ),
                    StudentQuickAction(
                      label: l10n.askTeacher,
                      icon: Icons.chat_bubble_outline,
                      color: AppColors.info,
                      onTap: () =>
                          context.push('/student/services/helpdesk'),
                    ),
                    StudentQuickAction(
                      label: l10n.feeStatus,
                      icon: Icons.receipt_long_outlined,
                      color: AppColors.warning,
                      onTap: () =>
                          context.push('/student/services/documents'),
                    ),
                  ],
                ),
                const SizedBox(height: 18),
                StudentBilingualHeader(
                  amharic: l10n.todaySummaryAm,
                  english: l10n.todaySummary,
                ),
                const SizedBox(height: 8),
                if (periods.isEmpty)
                  StudentSectionCard(
                    child: Text(
                      l10n.noScheduleToday,
                      style: const TextStyle(color: AppColors.inkMuted),
                    ),
                  )
                else
                  ...periods.take(3).toList().asMap().entries.map((entry) {
                    final i = entry.key;
                    final row = entry.value;
                    final subject = _str(row['subject']);
                    final teacher = _str(row['teacher']);
                    final start = _str(row['start']);
                    final end = _str(row['end']);
                    final period = _str(row['period']);
                    final active = i == 0;
                    return Padding(
                      padding: const EdgeInsets.only(bottom: 8),
                      child: StudentSectionCard(
                        color: active
                            ? AppColors.brand50
                            : AppColors.surface,
                        padding: const EdgeInsets.all(14),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              children: [
                                Expanded(
                                  child: Text(
                                    [
                                      if (start.isNotEmpty && end.isNotEmpty)
                                        '$start – $end',
                                      if (period.isNotEmpty)
                                        '${l10n.timetable} $period',
                                    ].join(' • '),
                                    style: const TextStyle(
                                      fontSize: 11,
                                      color: AppColors.inkMuted,
                                      fontWeight: FontWeight.w600,
                                    ),
                                  ),
                                ),
                                if (active)
                                  Container(
                                    padding: const EdgeInsets.symmetric(
                                      horizontal: 8,
                                      vertical: 3,
                                    ),
                                    decoration: BoxDecoration(
                                      color: AppColors.brand700,
                                      borderRadius: BorderRadius.circular(8),
                                    ),
                                    child: Text(
                                      l10n.activeNow,
                                      style: const TextStyle(
                                        color: Colors.white,
                                        fontSize: 10,
                                        fontWeight: FontWeight.w700,
                                      ),
                                    ),
                                  ),
                              ],
                            ),
                            const SizedBox(height: 6),
                            Text(
                              subject.isEmpty ? l10n.timetable : subject,
                              style: const TextStyle(
                                fontWeight: FontWeight.w800,
                                fontSize: 15,
                                color: AppColors.inkStrong,
                              ),
                            ),
                            if (teacher.isNotEmpty)
                              Text(
                                teacher,
                                style: const TextStyle(
                                  color: AppColors.inkMuted,
                                  fontSize: 12,
                                ),
                              ),
                          ],
                        ),
                      ),
                    );
                  }),
                const SizedBox(height: 10),
                Row(
                  children: [
                    Expanded(
                      child: StudentSectionCard(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              '${l10n.attendanceTitleAm} • ${l10n.attendanceTitle}',
                              style: const TextStyle(
                                fontSize: 11,
                                fontWeight: FontWeight.w700,
                                color: AppColors.inkMuted,
                              ),
                            ),
                            const SizedBox(height: 8),
                            Text(
                              attPercent == null
                                  ? '—'
                                  : '${attPercent.toStringAsFixed(attPercent % 1 == 0 ? 0 : 1)}%',
                              style: const TextStyle(
                                fontSize: 22,
                                fontWeight: FontWeight.w800,
                                color: AppColors.brand700,
                              ),
                            ),
                            Text(
                              '${_str(att['present'])}/${_str(att['total'])}',
                              style: const TextStyle(
                                fontSize: 12,
                                color: AppColors.inkMuted,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: StudentSectionCard(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              '${l10n.academicTitleAm} • ${l10n.academicTitle}',
                              style: const TextStyle(
                                fontSize: 11,
                                fontWeight: FontWeight.w700,
                                color: AppColors.inkMuted,
                              ),
                            ),
                            const SizedBox(height: 8),
                            Text(
                              l10n.results,
                              style: const TextStyle(
                                fontSize: 16,
                                fontWeight: FontWeight.w800,
                                color: AppColors.brand700,
                              ),
                            ),
                            TextButton(
                              onPressed: () =>
                                  context.push('/student/academics/results'),
                              style: TextButton.styleFrom(
                                padding: EdgeInsets.zero,
                                minimumSize: Size.zero,
                                tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                              ),
                              child: Text(l10n.openItem),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ],
                ),
                if (sims.isNotEmpty) ...[
                  const SizedBox(height: 16),
                  StudentBilingualHeader(
                    amharic: l10n.studyFocusTitleAm,
                    english: l10n.studyFocusTitle,
                    trailing: TextButton(
                      onPressed: () =>
                          context.push('/student/learning/simulations'),
                      child: Text(l10n.viewAll),
                    ),
                  ),
                  ...sims.take(2).map((row) {
                    final title = _str(row['title']).isEmpty
                        ? _str(row['subjectName'])
                        : _str(row['title']);
                    return Padding(
                      padding: const EdgeInsets.only(bottom: 8),
                      child: StudentSectionCard(
                        padding: const EdgeInsets.all(12),
                        child: Row(
                          children: [
                            const Icon(Icons.science_outlined,
                                color: AppColors.brand700),
                            const SizedBox(width: 10),
                            Expanded(
                              child: Text(
                                title.isEmpty ? l10n.simulations : title,
                                style: const TextStyle(
                                  fontWeight: FontWeight.w700,
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                    );
                  }),
                ],
                const SizedBox(height: 8),
                TextButton.icon(
                  onPressed: () =>
                      context.push('/student/more/notifications'),
                  icon: const Icon(Icons.campaign_outlined),
                  label: Text(
                    '${l10n.noticeFeedTitleAm} | ${l10n.noticeFeedTitle}',
                  ),
                ),
              ],
            );
          },
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
    return Scaffold(
      backgroundColor: AppColors.loginCanvas,
      body: SafeArea(
        child: JsonScreen(
          title: l10n.navAcademics,
          cacheKey: 'student_results',
          path: '/student/results',
          builder: (context, data) {
            if (data is! Map) return JsonBody(data: data);
            final map = Map<String, dynamic>.from(data);
            final fullName = _str(map['fullName']);
            final year = _str(map['academicYear']);
            final semester = _str(map['semester']);
            final avg = (map['semesterAverage'] as num?)?.toDouble();
            final yearly = (map['yearlyAverage'] as num?)?.toDouble();
            final rank = map['semesterRank'];
            final hideRank = map['hideSemesterRank'] == true;
            final locked = _maps(map['locked']);
            final draft = _maps(map['draft']);
            final subjects = locked.isNotEmpty ? locked : draft;

            return Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                StudentTopBar(
                  fullName: fullName,
                  academicYear: year,
                  semester: semester,
                ),
                const SizedBox(height: 8),
                Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: AppColors.brand700,
                    borderRadius: BorderRadius.circular(18),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        _gradeSection(
                          l10n,
                          map['gradeLevel'],
                          map['section'],
                        ),
                        style: TextStyle(
                          color: Colors.white.withValues(alpha: 0.85),
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                      const SizedBox(height: 12),
                      Row(
                        children: [
                          Expanded(
                            child: _Metric(
                              label: l10n.semesterAverage,
                              value: avg == null
                                  ? '—'
                                  : avg.toStringAsFixed(1),
                            ),
                          ),
                          Expanded(
                            child: _Metric(
                              label: l10n.results,
                              value: yearly == null
                                  ? '—'
                                  : yearly.toStringAsFixed(1),
                            ),
                          ),
                          Expanded(
                            child: _Metric(
                              label: l10n.classRank(
                                hideRank || rank == null
                                    ? '—'
                                    : rank.toString(),
                              ),
                              value: hideRank || rank == null
                                  ? '—'
                                  : '#$rank',
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 12),
                StudentQuickActionRow(
                  actions: [
                    StudentQuickAction(
                      label: l10n.timetable,
                      icon: Icons.calendar_month,
                      onTap: () =>
                          context.push('/student/academics/timetable'),
                    ),
                    StudentQuickAction(
                      label: l10n.exams,
                      icon: Icons.laptop,
                      onTap: () => context.push('/student/academics/exams'),
                    ),
                    StudentQuickAction(
                      label: l10n.assignments,
                      icon: Icons.assignment,
                      onTap: () =>
                          context.push('/student/academics/assignments'),
                    ),
                    StudentQuickAction(
                      label: l10n.quiz,
                      icon: Icons.emoji_events,
                      onTap: () => context.push('/student/academics/quiz'),
                    ),
                  ],
                ),
                const SizedBox(height: 16),
                Text(
                  l10n.enrolledSubjects,
                  style: const TextStyle(
                    fontWeight: FontWeight.w800,
                    fontSize: 15,
                  ),
                ),
                const SizedBox(height: 8),
                if (subjects.isEmpty)
                  StudentSectionCard(
                    child: Text(
                      l10n.noResultsYet,
                      style: const TextStyle(color: AppColors.inkMuted),
                    ),
                  )
                else
                  ...subjects.map((row) {
                    final subject = _str(row['subject']);
                    final earned = (row['earned'] as num?)?.toDouble();
                    final maxScore = (row['maxScore'] as num?)?.toDouble();
                    final pct = (earned != null &&
                            maxScore != null &&
                            maxScore > 0)
                        ? (earned / maxScore) * 100
                        : null;
                    return Padding(
                      padding: const EdgeInsets.only(bottom: 8),
                      child: StudentSectionCard(
                        padding: const EdgeInsets.all(14),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              children: [
                                Expanded(
                                  child: Text(
                                    subject.isEmpty
                                        ? l10n.results
                                        : subject,
                                    style: const TextStyle(
                                      fontWeight: FontWeight.w800,
                                    ),
                                  ),
                                ),
                                Text(
                                  pct == null
                                      ? '—'
                                      : '${pct.toStringAsFixed(0)}%',
                                  style: const TextStyle(
                                    fontWeight: FontWeight.w800,
                                    color: AppColors.brand700,
                                  ),
                                ),
                              ],
                            ),
                            if (pct != null) ...[
                              const SizedBox(height: 8),
                              ClipRRect(
                                borderRadius: BorderRadius.circular(4),
                                child: LinearProgressIndicator(
                                  value: (pct / 100).clamp(0, 1),
                                  minHeight: 6,
                                  backgroundColor: AppColors.brand50,
                                  color: AppColors.brand700,
                                ),
                              ),
                            ],
                            if (earned != null && maxScore != null)
                              Padding(
                                padding: const EdgeInsets.only(top: 6),
                                child: Text(
                                  '${earned.toStringAsFixed(0)} / ${maxScore.toStringAsFixed(0)}',
                                  style: const TextStyle(
                                    fontSize: 12,
                                    color: AppColors.inkMuted,
                                  ),
                                ),
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

class _Metric extends StatelessWidget {
  const _Metric({required this.label, required this.value});

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          value,
          style: const TextStyle(
            color: Colors.white,
            fontSize: 20,
            fontWeight: FontWeight.w800,
          ),
        ),
        Text(
          label,
          style: TextStyle(
            color: Colors.white.withValues(alpha: 0.75),
            fontSize: 10,
          ),
        ),
      ],
    );
  }
}

class AttendanceHubScreen extends StatelessWidget {
  const AttendanceHubScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    return Scaffold(
      backgroundColor: AppColors.loginCanvas,
      body: SafeArea(
        child: JsonScreen(
          title: l10n.navAttendance,
          cacheKey: 'student_attendance',
          path: '/student/desk/attendance',
          builder: (context, data) {
            if (data is! Map) return JsonBody(data: data);
            final map = Map<String, dynamic>.from(data);
            final present = (map['present'] as num?)?.toInt() ?? 0;
            final absent = (map['absent'] as num?)?.toInt() ?? 0;
            final tardy = (map['tardy'] as num?)?.toInt() ?? 0;
            final total = present + absent + tardy;
            final percent =
                total > 0 ? (present / total) * 100 : null;
            final rows = _maps(map['rows']);

            return Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                const StudentTopBar(),
                const SizedBox(height: 8),
                Container(
                  padding: const EdgeInsets.all(18),
                  decoration: BoxDecoration(
                    gradient: const LinearGradient(
                      colors: [AppColors.brand700, AppColors.brand800],
                    ),
                    borderRadius: BorderRadius.circular(18),
                  ),
                  child: Row(
                    children: [
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              '${l10n.overallRateAm} • ${l10n.overallRate}',
                              style: TextStyle(
                                color: Colors.white.withValues(alpha: 0.85),
                                fontSize: 12,
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                            const SizedBox(height: 8),
                            Text(
                              percent == null
                                  ? '—'
                                  : '${percent.toStringAsFixed(1)}%',
                              style: const TextStyle(
                                color: Colors.white,
                                fontSize: 36,
                                fontWeight: FontWeight.w800,
                              ),
                            ),
                            Text(
                              percent != null && percent >= 85
                                  ? l10n.goodStanding
                                  : l10n.attendance,
                              style: TextStyle(
                                color: Colors.white.withValues(alpha: 0.8),
                                fontSize: 12,
                              ),
                            ),
                          ],
                        ),
                      ),
                      Text(
                        '$present/$total',
                        style: const TextStyle(
                          color: Colors.white,
                          fontWeight: FontWeight.w800,
                          fontSize: 18,
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 12),
                Row(
                  children: [
                    _CountPill(
                      count: present,
                      label: l10n.presentCount,
                      color: AppColors.success,
                    ),
                    const SizedBox(width: 8),
                    _CountPill(
                      count: absent,
                      label: l10n.absentCount,
                      color: AppColors.danger,
                    ),
                    const SizedBox(width: 8),
                    _CountPill(
                      count: tardy,
                      label: l10n.tardyCount,
                      color: AppColors.warning,
                    ),
                  ],
                ),
                const SizedBox(height: 16),
                Text(
                  l10n.absenceLogs,
                  style: const TextStyle(
                    fontWeight: FontWeight.w800,
                    fontSize: 15,
                  ),
                ),
                const SizedBox(height: 8),
                if (rows.isEmpty)
                  StudentSectionCard(
                    child: Text(
                      l10n.noAttendanceYet,
                      style: const TextStyle(color: AppColors.inkMuted),
                    ),
                  )
                else
                  ...rows.take(20).map((row) {
                    final status = _str(row['status']);
                    final date = _str(row['date']);
                    final subject = _str(row['subject']);
                    final color = switch (status) {
                      'P' => AppColors.success,
                      'A' => AppColors.danger,
                      'T' => AppColors.warning,
                      _ => AppColors.inkMuted,
                    };
                    final label = switch (status) {
                      'P' => l10n.presentCount,
                      'A' => l10n.absentCount,
                      'T' => l10n.tardyCount,
                      _ => status,
                    };
                    return Padding(
                      padding: const EdgeInsets.only(bottom: 8),
                      child: StudentSectionCard(
                        padding: const EdgeInsets.all(12),
                        child: Row(
                          children: [
                            Container(
                              width: 10,
                              height: 10,
                              decoration: BoxDecoration(
                                color: color,
                                shape: BoxShape.circle,
                              ),
                            ),
                            const SizedBox(width: 10),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    date,
                                    style: const TextStyle(
                                      fontWeight: FontWeight.w700,
                                    ),
                                  ),
                                  if (subject.isNotEmpty)
                                    Text(
                                      subject,
                                      style: const TextStyle(
                                        fontSize: 12,
                                        color: AppColors.inkMuted,
                                      ),
                                    ),
                                ],
                              ),
                            ),
                            Text(
                              label,
                              style: TextStyle(
                                color: color,
                                fontWeight: FontWeight.w800,
                                fontSize: 12,
                              ),
                            ),
                          ],
                        ),
                      ),
                    );
                  }),
                const SizedBox(height: 8),
                OutlinedButton(
                  onPressed: () =>
                      context.push('/student/attendance/discipline'),
                  child: Text(l10n.discipline),
                ),
              ],
            );
          },
        ),
      ),
    );
  }
}

class _CountPill extends StatelessWidget {
  const _CountPill({
    required this.count,
    required this.label,
    required this.color,
  });

  final int count;
  final String label;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: StudentSectionCard(
        padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 8),
        child: Column(
          children: [
            Text(
              '$count',
              style: TextStyle(
                fontSize: 20,
                fontWeight: FontWeight.w800,
                color: color,
              ),
            ),
            Text(
              label,
              textAlign: TextAlign.center,
              style: const TextStyle(fontSize: 10, color: AppColors.inkMuted),
            ),
          ],
        ),
      ),
    );
  }
}

class LearningHubScreen extends StatelessWidget {
  const LearningHubScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    return Scaffold(
      backgroundColor: AppColors.loginCanvas,
      body: SafeArea(
        child: JsonScreen(
          title: l10n.navLearning,
          cacheKey: 'student_simulations',
          path: '/student/simulations',
          builder: (context, data) {
            if (data is! Map) return JsonBody(data: data);
            final map = Map<String, dynamic>.from(data);
            final rows = _maps(map['rows']);
            return Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                const StudentTopBar(),
                const SizedBox(height: 8),
                StudentBilingualHeader(
                  amharic: l10n.learningHubAm,
                  english: l10n.learningHub,
                ),
                const SizedBox(height: 8),
                Text(
                  _gradeSection(l10n, map['gradeLevel'], map['section']),
                  style: const TextStyle(color: AppColors.inkMuted),
                ),
                const SizedBox(height: 12),
                StudentQuickActionRow(
                  actions: [
                    StudentQuickAction(
                      label: l10n.resources,
                      icon: Icons.folder_open,
                      onTap: () =>
                          context.push('/student/learning/resources'),
                    ),
                    StudentQuickAction(
                      label: l10n.virtualLab,
                      icon: Icons.biotech,
                      onTap: () => context.push('/student/learning/labs'),
                    ),
                    StudentQuickAction(
                      label: l10n.groups,
                      icon: Icons.groups,
                      onTap: () =>
                          context.push('/student/learning/groups'),
                    ),
                    StudentQuickAction(
                      label: l10n.planner,
                      icon: Icons.psychology,
                      onTap: () =>
                          context.push('/student/learning/planner'),
                    ),
                  ],
                ),
                const SizedBox(height: 16),
                Text(
                  l10n.simulations,
                  style: const TextStyle(
                    fontWeight: FontWeight.w800,
                    fontSize: 15,
                  ),
                ),
                const SizedBox(height: 8),
                if (rows.isEmpty)
                  StudentSectionCard(
                    child: Text(
                      l10n.noSimulationsYet,
                      style: const TextStyle(color: AppColors.inkMuted),
                    ),
                  )
                else
                  ...rows.map((row) {
                    final title = _str(row['title']).isEmpty
                        ? _str(row['subjectName'])
                        : _str(row['title']);
                    final subject = _str(row['subjectName']);
                    return Padding(
                      padding: const EdgeInsets.only(bottom: 8),
                      child: StudentSectionCard(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              title.isEmpty ? l10n.simulations : title,
                              style: const TextStyle(
                                fontWeight: FontWeight.w800,
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
                            const SizedBox(height: 10),
                            SizedBox(
                              width: double.infinity,
                              child: FilledButton(
                                onPressed: () => context
                                    .push('/student/learning/simulations'),
                                child: Text(l10n.launchSimulation),
                              ),
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

class ServicesHubScreen extends StatelessWidget {
  const ServicesHubScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    return Scaffold(
      backgroundColor: AppColors.loginCanvas,
      body: SafeArea(
        child: Column(
          children: [
            const StudentTopBar(),
            Expanded(
              child: ListView(
                padding: const EdgeInsets.fromLTRB(16, 8, 16, 24),
                children: [
                  Text(
                    l10n.navServices,
                    style: const TextStyle(
                      fontSize: 20,
                      fontWeight: FontWeight.w800,
                    ),
                  ),
                  const SizedBox(height: 12),
                  StudentSectionCard(
                    color: AppColors.brand700,
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          l10n.digitalId,
                          style: const TextStyle(
                            color: Colors.white,
                            fontWeight: FontWeight.w800,
                            fontSize: 16,
                          ),
                        ),
                        const SizedBox(height: 8),
                        Text(
                          l10n.openItem,
                          style: TextStyle(
                            color: Colors.white.withValues(alpha: 0.85),
                          ),
                        ),
                        const SizedBox(height: 12),
                        FilledButton(
                          style: FilledButton.styleFrom(
                            backgroundColor: Colors.white,
                            foregroundColor: AppColors.brand700,
                          ),
                          onPressed: () =>
                              context.push('/student/services/id'),
                          child: Text(l10n.digitalId),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 12),
                  StudentQuickActionGrid(
                    actions: [
                      StudentQuickAction(
                        label: l10n.library,
                        icon: Icons.local_library,
                        onTap: () =>
                            context.push('/student/services/library'),
                      ),
                      StudentQuickAction(
                        label: l10n.documents,
                        icon: Icons.description,
                        onTap: () =>
                            context.push('/student/services/documents'),
                      ),
                      StudentQuickAction(
                        label: l10n.helpdesk,
                        icon: Icons.support_agent,
                        onTap: () =>
                            context.push('/student/services/helpdesk'),
                      ),
                      StudentQuickAction(
                        label: l10n.vocational,
                        icon: Icons.handyman,
                        onTap: () =>
                            context.push('/student/services/vocational'),
                      ),
                      StudentQuickAction(
                        label: l10n.digitalId,
                        icon: Icons.badge,
                        onTap: () => context.push('/student/services/id'),
                      ),
                    ],
                  ),
                ],
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
    final stream = _str(_home?['stream']);
    final year = _str(_home?['academicYear']);
    final semester = _str(_home?['semester']);
    final schoolName = (user?.tenantName.trim().isNotEmpty ?? false)
        ? user!.tenantName
        : l10n.appName;

    return Scaffold(
      backgroundColor: AppColors.loginCanvas,
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.fromLTRB(16, 8, 16, 32),
          children: [
            StudentTopBar(
              fullName: fullName,
              hasPhoto: hasPhoto,
              academicYear: year,
              semester: semester,
            ),
            const SizedBox(height: 8),
            StudentSectionCard(
              child: Column(
                children: [
                  Stack(
                    alignment: Alignment.bottomRight,
                    children: [
                      AuthProfilePhoto(
                        size: 88,
                        fullName:
                            fullName.isEmpty ? user?.username : fullName,
                        hasPhoto: hasPhoto,
                      ),
                      if (_gradeSection(
                            l10n,
                            _home?['gradeLevel'],
                            _home?['section'],
                          )
                              .isNotEmpty)
                        Container(
                          margin: const EdgeInsets.only(bottom: 2, right: 2),
                          padding: const EdgeInsets.symmetric(
                            horizontal: 8,
                            vertical: 3,
                          ),
                          decoration: BoxDecoration(
                            color: AppColors.brand700,
                            borderRadius: BorderRadius.circular(12),
                          ),
                          child: Text(
                            '${_str(_home?['gradeLevel'])}${_str(_home?['section'])}',
                            style: const TextStyle(
                              color: Colors.white,
                              fontSize: 10,
                              fontWeight: FontWeight.w800,
                            ),
                          ),
                        ),
                    ],
                  ),
                  const SizedBox(height: 12),
                  Text(
                    fullName.isEmpty
                        ? (user?.username ?? l10n.studentRoleLabel)
                        : fullName,
                    textAlign: TextAlign.center,
                    style: const TextStyle(
                      fontWeight: FontWeight.w800,
                      fontSize: 20,
                    ),
                  ),
                  const SizedBox(height: 6),
                  Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 10,
                      vertical: 4,
                    ),
                    decoration: BoxDecoration(
                      color: AppColors.brand50,
                      borderRadius: BorderRadius.circular(20),
                    ),
                    child: Text(
                      schoolName,
                      style: const TextStyle(
                        color: AppColors.brand700,
                        fontWeight: FontWeight.w700,
                        fontSize: 12,
                      ),
                    ),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    [
                      if (studentId.isNotEmpty)
                        l10n.studentIdLabel(studentId),
                      if (stream.isNotEmpty) stream,
                    ].join(' • '),
                    textAlign: TextAlign.center,
                    style: const TextStyle(
                      color: AppColors.inkMuted,
                      fontSize: 12,
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 12),
            StudentSectionCard(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    l10n.tenantSession,
                    style: const TextStyle(fontWeight: FontWeight.w800),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    [
                      if (year.isNotEmpty) l10n.academicYearLabel(year),
                      if (semester.isNotEmpty) l10n.semesterLabel(semester),
                      l10n.studentAccount,
                    ].join(' • '),
                    style: const TextStyle(
                      color: AppColors.inkMuted,
                      fontSize: 12,
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 12),
            Text(
              l10n.language,
              style: const TextStyle(fontWeight: FontWeight.w800),
            ),
            const SizedBox(height: 8),
            StudentSectionCard(
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
            const SizedBox(height: 12),
            StudentSectionCard(
              padding: EdgeInsets.zero,
              child: Column(
                children: [
                  ListTile(
                    leading: const Icon(Icons.notifications_outlined),
                    title: Text(l10n.notifications),
                    trailing: const Icon(Icons.chevron_right),
                    onTap: () =>
                        context.push('/student/more/notifications'),
                  ),
                  const Divider(height: 1),
                  ListTile(
                    leading: const Icon(Icons.fingerprint),
                    title: Text(l10n.biometricUnlock),
                    subtitle: Text(
                      !_biometricAvailable
                          ? l10n.biometricsUnavailable
                          : (_biometricEnabled
                              ? l10n.biometricActive
                              : l10n.biometricOff),
                    ),
                  ),
                  const Divider(height: 1),
                  ListTile(
                    leading: const Icon(Icons.support_agent),
                    title: Text(l10n.helpdesk),
                    trailing: const Icon(Icons.chevron_right),
                    onTap: () =>
                        context.push('/student/services/helpdesk'),
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
                  '${l10n.signOutSession} • ${l10n.logout}',
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

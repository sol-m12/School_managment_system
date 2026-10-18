import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/locale/locale_controller.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/widgets/last_updated_label.dart';
import '../../../core/widgets/offline_banner.dart';
import '../../../l10n/app_localizations.dart';
import '../../student/widgets/student_chrome.dart';
import '../parent_child_controller.dart';
import '../parent_dashboard_controller.dart';

class ParentHomeScreen extends ConsumerWidget {
  const ParentHomeScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppLocalizations.of(context);
    final childrenState = ref.watch(parentChildControllerProvider);
    final dash = ref.watch(parentDashboardControllerProvider);
    final locale = ref.watch(localeControllerProvider);
    final isAm = locale.languageCode == 'am';
    final selected = childrenState.selected;
    final schoolName = selected == null
        ? l10n.parentSchoolFallback
        : _schoolLabel(l10n, selected.schoolName);

    return Scaffold(
      backgroundColor: AppColors.loginCanvas,
      body: SafeArea(
        child: Column(
          children: [
            const OfflineBanner(),
            Expanded(
              child: RefreshIndicator(
                onRefresh: () async {
                  await ref
                      .read(parentChildControllerProvider.notifier)
                      .loadChildren(force: true);
                  await ref
                      .read(parentDashboardControllerProvider.notifier)
                      .loadAll(force: true);
                },
                child: ListView(
                  physics: const AlwaysScrollableScrollPhysics(),
                  padding: const EdgeInsets.fromLTRB(16, 8, 16, 28),
                  children: [
                    _ParentTopBar(
                      schoolName: schoolName,
                      parentName: childrenState.parentDisplayName,
                      onNotifications: () =>
                          context.push('/parent/more/notifications'),
                    ),
                    const SizedBox(height: 12),
                    if (childrenState.loading && childrenState.children.isEmpty)
                      StudentSectionCard(child: Text(l10n.loading))
                    else if (childrenState.error != null &&
                        childrenState.children.isEmpty)
                      StudentSectionCard(
                        child: Column(
                          children: [
                            Text(l10n.errorGeneric),
                            const SizedBox(height: 8),
                            FilledButton(
                              onPressed: () => ref
                                  .read(parentChildControllerProvider.notifier)
                                  .loadChildren(force: true),
                              child: Text(l10n.retry),
                            ),
                          ],
                        ),
                      )
                    else if (childrenState.children.isEmpty)
                      StudentSectionCard(
                        child: Text(
                          l10n.parentEmptyChildren,
                          textAlign: TextAlign.center,
                        ),
                      )
                    else ...[
                      _GreetingBlock(
                        displayName: childrenState.parentDisplayName ?? '',
                        childCount: childrenState.children.length,
                        schoolCount: _uniqueSchools(childrenState.children),
                        parentCode: childrenState.parentCode,
                        isAm: isAm,
                        l10n: l10n,
                      ),
                      const SizedBox(height: 12),
                      _ActiveSchoolCard(
                        schoolName: schoolName,
                        updatedAt: childrenState.updatedAt,
                        l10n: l10n,
                      ),
                      const SizedBox(height: 16),
                      StudentBilingualHeader(
                        amharic: l10n.parentVerifiedChildrenAm,
                        english: l10n.parentVerifiedChildren,
                      ),
                      const SizedBox(height: 8),
                      ...childrenState.children.map((child) {
                        final active = child.studentId == selected?.studentId;
                        return Padding(
                          padding: const EdgeInsets.only(bottom: 8),
                          child: _ChildSelectCard(
                            child: child,
                            active: active,
                            schoolFallback: l10n.parentSchoolFallback,
                            activeLabel: l10n.parentActiveChild,
                            switchLabel: l10n.parentSwitchChild,
                            onTap: () => ref
                                .read(parentChildControllerProvider.notifier)
                                .selectChild(child.studentId),
                          ),
                        );
                      }),
                      if (selected != null) ...[
                        const SizedBox(height: 4),
                        StudentSectionCard(
                          color: AppColors.brand50,
                          padding: const EdgeInsets.all(12),
                          child: Text(
                            l10n.parentReviewingChild(
                              selected.fullName,
                              schoolName,
                            ),
                            style: const TextStyle(
                              fontSize: 12,
                              color: AppColors.ink,
                              height: 1.35,
                            ),
                          ),
                        ),
                        const SizedBox(height: 16),
                        LastUpdatedLabel(updatedAt: dash.attendance.updatedAt),
                        StudentBilingualHeader(
                          amharic: l10n.attendanceTitleAm,
                          english: l10n.attendanceTitle,
                          trailing: TextButton(
                            onPressed: () =>
                                context.go('/parent/attendance'),
                            child: Text(l10n.parentNavAttendance),
                          ),
                        ),
                        const SizedBox(height: 8),
                        _AttendanceSummaryCard(
                          slice: dash.attendance,
                          l10n: l10n,
                          onOpen: () => context.go('/parent/attendance'),
                        ),
                        const SizedBox(height: 16),
                        StudentBilingualHeader(
                          amharic: l10n.academicTitleAm,
                          english: l10n.academicTitle,
                          trailing: TextButton(
                            onPressed: () => context.go('/parent/academics'),
                            child: Text(l10n.parentNavAcademics),
                          ),
                        ),
                        const SizedBox(height: 8),
                        _AcademicsSummaryCard(
                          results: dash.results,
                          assignments: dash.assignments,
                          l10n: l10n,
                          onOpen: () => context.go('/parent/academics'),
                        ),
                        const SizedBox(height: 16),
                        StudentBilingualHeader(
                          amharic: l10n.noticeFeedTitleAm,
                          english: l10n.noticeFeedTitle,
                          trailing: TextButton(
                            onPressed: () =>
                                context.push('/parent/more/notifications'),
                            child: Text(l10n.notifications),
                          ),
                        ),
                        const SizedBox(height: 8),
                        _NoticesCard(
                          slice: dash.notices,
                          l10n: l10n,
                          tenantId: selected.tenantId,
                        ),
                        const SizedBox(height: 16),
                        StudentBilingualHeader(
                          amharic: l10n.parentCampusServicesAm,
                          english: l10n.parentCampusServices,
                          trailing: TextButton(
                            onPressed: () => context.go('/parent/services'),
                            child: Text(l10n.parentNavServices),
                          ),
                        ),
                        const SizedBox(height: 8),
                        _ServicesTeaser(
                          library: dash.library,
                          l10n: l10n,
                          onLibrary: () =>
                              context.push('/parent/services/library'),
                          onMessages: () =>
                              context.push('/parent/services/messages'),
                          onAppointments: () =>
                              context.push('/parent/services/appointments'),
                        ),
                      ] else
                        Padding(
                          padding: const EdgeInsets.only(top: 12),
                          child: StudentSectionCard(
                            child: Text(
                              l10n.parentSelectChild,
                              textAlign: TextAlign.center,
                            ),
                          ),
                        ),
                    ],
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  static int _uniqueSchools(List<ParentChild> children) {
    return children.map((c) => c.tenantId).toSet().length;
  }

  static String _schoolLabel(AppLocalizations l10n, String schoolName) {
    final trimmed = schoolName.trim();
    return trimmed.isEmpty ? l10n.parentSchoolFallback : trimmed;
  }
}

class _ParentTopBar extends StatelessWidget {
  const _ParentTopBar({
    required this.schoolName,
    required this.parentName,
    required this.onNotifications,
  });

  final String schoolName;
  final String? parentName;
  final VoidCallback onNotifications;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Container(
          width: 36,
          height: 36,
          decoration: BoxDecoration(
            color: AppColors.brand700,
            borderRadius: BorderRadius.circular(10),
          ),
          child: const Icon(Icons.account_balance, color: Colors.white, size: 20),
        ),
        const SizedBox(width: 10),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                schoolName,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: const TextStyle(
                  fontWeight: FontWeight.w800,
                  fontSize: 14,
                  color: AppColors.inkStrong,
                ),
              ),
              if ((parentName ?? '').trim().isNotEmpty)
                Text(
                  parentName!.trim(),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(fontSize: 11, color: AppColors.inkMuted),
                ),
            ],
          ),
        ),
        IconButton(
          onPressed: onNotifications,
          icon: const Icon(Icons.notifications_outlined),
        ),
      ],
    );
  }
}

class _GreetingBlock extends StatelessWidget {
  const _GreetingBlock({
    required this.displayName,
    required this.childCount,
    required this.schoolCount,
    required this.parentCode,
    required this.isAm,
    required this.l10n,
  });

  final String displayName;
  final int childCount;
  final int schoolCount;
  final String? parentCode;
  final bool isAm;
  final AppLocalizations l10n;

  @override
  Widget build(BuildContext context) {
    final name = displayName.trim().isEmpty ? l10n.profile : displayName.trim();
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          isAm ? l10n.parentGreetingAm(name) : l10n.parentGreeting(name),
          style: const TextStyle(
            fontSize: 22,
            fontWeight: FontWeight.w800,
            color: AppColors.inkStrong,
          ),
        ),
        const SizedBox(height: 4),
        Text(
          '${l10n.parentEnrolledChildren(childCount)} · ${l10n.parentSchoolsCount(schoolCount)}',
          style: const TextStyle(fontSize: 13, color: AppColors.inkMuted),
        ),
        if ((parentCode ?? '').trim().isNotEmpty) ...[
          const SizedBox(height: 8),
          Wrap(
            spacing: 8,
            children: [
              _Chip(
                label: '${l10n.parentParentCode}: ${parentCode!.trim()}',
                color: AppColors.brand700,
              ),
            ],
          ),
        ],
      ],
    );
  }
}

class _ActiveSchoolCard extends StatelessWidget {
  const _ActiveSchoolCard({
    required this.schoolName,
    required this.updatedAt,
    required this.l10n,
  });

  final String schoolName;
  final DateTime? updatedAt;
  final AppLocalizations l10n;

  @override
  Widget build(BuildContext context) {
    return StudentSectionCard(
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
          const SizedBox(height: 8),
          Wrap(
            spacing: 8,
            runSpacing: 6,
            children: [
              _Chip(label: l10n.synced, color: AppColors.success),
              if (updatedAt != null)
                _Chip(
                  label: _relative(updatedAt!),
                  color: AppColors.info,
                ),
            ],
          ),
        ],
      ),
    );
  }

  String _relative(DateTime at) {
    final mins = DateTime.now().difference(at).inMinutes;
    if (mins < 1) return '<1m';
    if (mins < 60) return '${mins}m';
    final hours = mins ~/ 60;
    if (hours < 24) return '${hours}h';
    return '${hours ~/ 24}d';
  }
}

class _ChildSelectCard extends StatelessWidget {
  const _ChildSelectCard({
    required this.child,
    required this.active,
    required this.schoolFallback,
    required this.activeLabel,
    required this.switchLabel,
    required this.onTap,
  });

  final ParentChild child;
  final bool active;
  final String schoolFallback;
  final String activeLabel;
  final String switchLabel;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final school = child.schoolName.trim().isEmpty
        ? schoolFallback
        : child.schoolName.trim();
    final grade = [
      if (child.gradeLevel.isNotEmpty) child.gradeLevel,
      if (child.section.isNotEmpty) child.section,
    ].join('-');

    return Material(
      color: AppColors.surface,
      borderRadius: BorderRadius.circular(16),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(16),
        child: Container(
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(16),
            border: Border.all(
              color: active ? AppColors.brand600 : AppColors.border,
              width: active ? 2 : 1,
            ),
          ),
          child: Row(
            children: [
              CircleAvatar(
                radius: 24,
                backgroundColor: AppColors.brand100,
                child: Text(
                  _initials(child.fullName),
                  style: const TextStyle(
                    fontWeight: FontWeight.w800,
                    color: AppColors.brand700,
                  ),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      child.fullName,
                      style: const TextStyle(
                        fontWeight: FontWeight.w800,
                        fontSize: 15,
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      [
                        if (grade.isNotEmpty) grade,
                        school,
                      ].join(' · '),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                        fontSize: 12,
                        color: AppColors.inkMuted,
                      ),
                    ),
                  ],
                ),
              ),
              if (active)
                _Chip(label: activeLabel, color: AppColors.success)
              else
                TextButton(onPressed: onTap, child: Text(switchLabel)),
            ],
          ),
        ),
      ),
    );
  }

  String _initials(String name) {
    final parts = name.trim().split(RegExp(r'\s+'));
    if (parts.isEmpty || parts.first.isEmpty) return '?';
    if (parts.length == 1) return parts.first.substring(0, 1).toUpperCase();
    return (parts.first.substring(0, 1) + parts.last.substring(0, 1))
        .toUpperCase();
  }
}

class _AttendanceSummaryCard extends StatelessWidget {
  const _AttendanceSummaryCard({
    required this.slice,
    required this.l10n,
    required this.onOpen,
  });

  final ParentDashboardSlice slice;
  final AppLocalizations l10n;
  final VoidCallback onOpen;

  @override
  Widget build(BuildContext context) {
    if (slice.loading && slice.data == null) {
      return StudentSectionCard(child: Text(l10n.loading));
    }
    if (slice.error == 'NO_STUDENT_ACCOUNT') {
      return StudentSectionCard(child: Text(l10n.parentNoStudentAccount));
    }
    if (slice.error != null && slice.data == null) {
      return StudentSectionCard(child: Text(l10n.errorGeneric));
    }
    final map = slice.data is Map
        ? Map<String, dynamic>.from(slice.data as Map)
        : <String, dynamic>{};
    final present = (map['present'] as num?)?.toInt() ?? 0;
    final absent = (map['absent'] as num?)?.toInt() ?? 0;
    final tardy = (map['tardy'] as num?)?.toInt() ?? 0;
    final total = present + absent + tardy;
    final percent = total > 0 ? (present / total) * 100 : null;
    final rows = map['rows'] is List
        ? (map['rows'] as List)
            .whereType<Map>()
            .map((e) => Map<String, dynamic>.from(e))
            .toList()
        : <Map<String, dynamic>>[];
    final latest = rows.isNotEmpty ? rows.first : null;
    final status = latest?['status']?.toString();

    return StudentSectionCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: Text(
                  latest == null
                      ? l10n.noAttendanceYet
                      : _statusLabel(l10n, status),
                  style: const TextStyle(
                    fontWeight: FontWeight.w800,
                    fontSize: 16,
                  ),
                ),
              ),
              if (percent != null)
                _Chip(
                  label: '${percent.toStringAsFixed(percent % 1 == 0 ? 0 : 1)}%',
                  color: AppColors.success,
                ),
            ],
          ),
          if (latest != null) ...[
            const SizedBox(height: 6),
            Text(
              [
                latest['date']?.toString() ?? '',
                if ((latest['subject']?.toString() ?? '').isNotEmpty)
                  latest['subject'].toString(),
              ].where((s) => s.isNotEmpty).join(' · '),
              style: const TextStyle(fontSize: 12, color: AppColors.inkMuted),
            ),
          ],
          const SizedBox(height: 12),
          Row(
            children: [
              _Stat(label: l10n.presentCount, value: '$present'),
              _Stat(label: l10n.tardyCount, value: '$tardy'),
              _Stat(label: l10n.absentCount, value: '$absent'),
            ],
          ),
          const SizedBox(height: 8),
          Align(
            alignment: Alignment.centerRight,
            child: TextButton(onPressed: onOpen, child: Text(l10n.parentNavAttendance)),
          ),
        ],
      ),
    );
  }

  String _statusLabel(AppLocalizations l10n, String? status) {
    return switch (status) {
      'P' => l10n.presentCount,
      'A' => l10n.absentCount,
      'T' => l10n.tardyCount,
      _ => l10n.attendanceSummary,
    };
  }
}

class _AcademicsSummaryCard extends StatelessWidget {
  const _AcademicsSummaryCard({
    required this.results,
    required this.assignments,
    required this.l10n,
    required this.onOpen,
  });

  final ParentDashboardSlice results;
  final ParentDashboardSlice assignments;
  final AppLocalizations l10n;
  final VoidCallback onOpen;

  @override
  Widget build(BuildContext context) {
    if (results.loading && results.data == null) {
      return StudentSectionCard(child: Text(l10n.loading));
    }
    if (results.error == 'NO_STUDENT_ACCOUNT') {
      return StudentSectionCard(child: Text(l10n.parentNoStudentAccount));
    }

    final map = results.data is Map
        ? Map<String, dynamic>.from(results.data as Map)
        : <String, dynamic>{};
    final avg = (map['semesterAverage'] as num?)?.toDouble();
    final rank = map['semesterRank'];
    final semester = map['semester']?.toString();
    final tasks = assignments.data is Map &&
            (assignments.data as Map)['tasks'] is List
        ? ((assignments.data as Map)['tasks'] as List)
            .whereType<Map>()
            .map((e) => Map<String, dynamic>.from(e))
            .toList()
        : <Map<String, dynamic>>[];

    return StudentSectionCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          if (avg == null && tasks.isEmpty)
            Text(
              results.error != null ? l10n.errorGeneric : l10n.noResultsYet,
              style: const TextStyle(color: AppColors.inkMuted),
            )
          else ...[
            Row(
              children: [
                if (avg != null) ...[
                  _ScoreRing(value: avg),
                  const SizedBox(width: 14),
                ],
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        l10n.semesterAverage,
                        style: const TextStyle(
                          fontWeight: FontWeight.w800,
                          fontSize: 15,
                        ),
                      ),
                      if (semester != null && semester.isNotEmpty)
                        Text(
                          l10n.semesterLabel(semester),
                          style: const TextStyle(
                            fontSize: 12,
                            color: AppColors.inkMuted,
                          ),
                        ),
                      if (rank != null)
                        Text(
                          l10n.classRank(rank.toString()),
                          style: const TextStyle(
                            fontSize: 12,
                            color: AppColors.inkMuted,
                          ),
                        ),
                    ],
                  ),
                ),
              ],
            ),
            if (tasks.isNotEmpty) ...[
              const SizedBox(height: 12),
              Text(
                l10n.deadlinesTitle,
                style: const TextStyle(fontWeight: FontWeight.w700),
              ),
              const SizedBox(height: 6),
              ...tasks.take(3).map((task) {
                final title = (task['title'] ?? task['subject'] ?? l10n.parentHomework)
                    .toString();
                final deadline = task['deadline']?.toString() ?? '';
                final indicator = task['indicator']?.toString();
                final badge = switch (indicator) {
                  'done' => l10n.parentIndicatorDone,
                  'missing' => l10n.parentIndicatorMissing,
                  'pending' => l10n.parentIndicatorPending,
                  _ => null,
                };
                return Padding(
                  padding: const EdgeInsets.only(bottom: 6),
                  child: Row(
                    children: [
                      Expanded(
                        child: Text(
                          [
                            title,
                            if (deadline.isNotEmpty) deadline,
                          ].join(' · '),
                          maxLines: 2,
                          overflow: TextOverflow.ellipsis,
                          style: const TextStyle(fontSize: 13),
                        ),
                      ),
                      if (badge != null) ...[
                        const SizedBox(width: 8),
                        _Chip(
                          label: badge,
                          color: indicator == 'done'
                              ? AppColors.success
                              : indicator == 'missing'
                                  ? AppColors.danger
                                  : AppColors.warning,
                        ),
                      ],
                    ],
                  ),
                );
              }),
            ],
          ],
          Align(
            alignment: Alignment.centerRight,
            child: TextButton(
              onPressed: onOpen,
              child: Text(l10n.parentNavAcademics),
            ),
          ),
        ],
      ),
    );
  }
}

class _NoticesCard extends StatelessWidget {
  const _NoticesCard({
    required this.slice,
    required this.l10n,
    required this.tenantId,
  });

  final ParentDashboardSlice slice;
  final AppLocalizations l10n;
  final int tenantId;

  @override
  Widget build(BuildContext context) {
    if (slice.loading && slice.data == null) {
      return StudentSectionCard(child: Text(l10n.loading));
    }
    final rows = slice.data is Map && (slice.data as Map)['rows'] is List
        ? ((slice.data as Map)['rows'] as List)
            .whereType<Map>()
            .map((e) => Map<String, dynamic>.from(e))
            .where((row) => (row['tenantId'] as num?)?.toInt() == tenantId)
            .toList()
        : <Map<String, dynamic>>[];

    if (rows.isEmpty) {
      return StudentSectionCard(
        child: Text(
          l10n.notificationsEmpty,
          style: const TextStyle(color: AppColors.inkMuted),
        ),
      );
    }

    return Column(
      children: rows.take(3).map((row) {
        final urgent = row['urgent'] == true;
        return Padding(
          padding: const EdgeInsets.only(bottom: 8),
          child: StudentSectionCard(
            padding: const EdgeInsets.all(12),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Expanded(
                      child: Text(
                        row['title']?.toString() ?? '',
                        style: const TextStyle(fontWeight: FontWeight.w800),
                      ),
                    ),
                    if (urgent)
                      _Chip(
                        label: l10n.notificationUrgent,
                        color: AppColors.danger,
                      ),
                  ],
                ),
                const SizedBox(height: 4),
                Text(
                  row['content']?.toString() ?? '',
                  maxLines: 3,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(
                    fontSize: 12,
                    color: AppColors.inkMuted,
                    height: 1.35,
                  ),
                ),
              ],
            ),
          ),
        );
      }).toList(),
    );
  }
}

class _ServicesTeaser extends StatelessWidget {
  const _ServicesTeaser({
    required this.library,
    required this.l10n,
    required this.onLibrary,
    required this.onMessages,
    required this.onAppointments,
  });

  final ParentDashboardSlice library;
  final AppLocalizations l10n;
  final VoidCallback onLibrary;
  final VoidCallback onMessages;
  final VoidCallback onAppointments;

  @override
  Widget build(BuildContext context) {
    final map = library.data is Map
        ? Map<String, dynamic>.from(library.data as Map)
        : <String, dynamic>{};
    final borrowed = map['borrowed'];
    final rank = map['rank']?.toString();

    return StudentQuickActionRow(
      actions: [
        StudentQuickAction(
          label: borrowed == null
              ? l10n.parentLibrary
              : '${l10n.parentLibrary}${rank != null && rank.isNotEmpty ? ' · $rank' : ''}',
          icon: Icons.local_library_outlined,
          onTap: onLibrary,
        ),
        StudentQuickAction(
          label: l10n.parentMessages,
          icon: Icons.mail_outline,
          color: AppColors.info,
          onTap: onMessages,
        ),
        StudentQuickAction(
          label: l10n.parentAppointments,
          icon: Icons.event_available_outlined,
          color: AppColors.warning,
          onTap: onAppointments,
        ),
      ],
    );
  }
}

class _ScoreRing extends StatelessWidget {
  const _ScoreRing({required this.value});

  final double value;

  @override
  Widget build(BuildContext context) {
    final pct = (value.clamp(0, 100)) / 100;
    return SizedBox(
      width: 72,
      height: 72,
      child: Stack(
        alignment: Alignment.center,
        children: [
          CircularProgressIndicator(
            value: pct,
            strokeWidth: 7,
            backgroundColor: AppColors.brand100,
            color: AppColors.brand700,
          ),
          Text(
            '${value.toStringAsFixed(value % 1 == 0 ? 0 : 1)}%',
            style: const TextStyle(
              fontWeight: FontWeight.w800,
              fontSize: 12,
              color: AppColors.brand700,
            ),
          ),
        ],
      ),
    );
  }
}

class _Stat extends StatelessWidget {
  const _Stat({required this.label, required this.value});

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: Column(
        children: [
          Text(
            value,
            style: const TextStyle(
              fontWeight: FontWeight.w800,
              fontSize: 18,
              color: AppColors.brand700,
            ),
          ),
          Text(
            label,
            style: const TextStyle(fontSize: 11, color: AppColors.inkMuted),
          ),
        ],
      ),
    );
  }
}

class _Chip extends StatelessWidget {
  const _Chip({required this.label, required this.color});

  final String label;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.12),
        borderRadius: BorderRadius.circular(20),
      ),
      child: Text(
        label,
        style: TextStyle(
          color: color,
          fontWeight: FontWeight.w700,
          fontSize: 11,
        ),
      ),
    );
  }
}

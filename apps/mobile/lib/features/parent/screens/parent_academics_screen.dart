import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/theme/app_colors.dart';
import '../../../core/widgets/json_screen.dart';
import '../../../l10n/app_localizations.dart';
import '../../student/widgets/student_chrome.dart';
import '../parent_cache_keys.dart';
import '../parent_child_controller.dart';
import '../parent_dashboard_controller.dart';
import 'parent_child_data_screen.dart';

class ParentAcademicsHubScreen extends ConsumerWidget {
  const ParentAcademicsHubScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppLocalizations.of(context);
    final selected = ref.watch(parentChildControllerProvider).selected;
    final dash = ref.watch(parentDashboardControllerProvider);

    return Scaffold(
      backgroundColor: AppColors.loginCanvas,
      body: SafeArea(
        child: RefreshIndicator(
          onRefresh: () => ref
              .read(parentDashboardControllerProvider.notifier)
              .loadAll(force: true),
          child: ListView(
            physics: const AlwaysScrollableScrollPhysics(),
            padding: const EdgeInsets.fromLTRB(16, 8, 16, 28),
            children: [
              Text(
                l10n.parentNavAcademics,
                style: const TextStyle(
                  fontSize: 20,
                  fontWeight: FontWeight.w800,
                  color: AppColors.inkStrong,
                ),
              ),
              if (selected != null) ...[
                const SizedBox(height: 4),
                Text(
                  '${selected.fullName} · ${_school(l10n, selected.schoolName)}',
                  style: const TextStyle(color: AppColors.inkMuted, fontSize: 13),
                ),
              ],
              const SizedBox(height: 16),
              StudentSectionCard(
                child: Column(
                  children: [
                    ListTile(
                      contentPadding: EdgeInsets.zero,
                      leading:
                          const Icon(Icons.bar_chart, color: AppColors.brand700),
                      title: Text(l10n.results),
                      trailing: const Icon(Icons.chevron_right),
                      onTap: () => context.push('/parent/academics/results'),
                    ),
                    const Divider(height: 1),
                    ListTile(
                      contentPadding: EdgeInsets.zero,
                      leading: const Icon(
                        Icons.assignment_outlined,
                        color: AppColors.brand700,
                      ),
                      title: Text(l10n.parentHomework),
                      trailing: const Icon(Icons.chevron_right),
                      onTap: () => context.push('/parent/academics/homework'),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 16),
              StudentBilingualHeader(
                amharic: l10n.academicTitleAm,
                english: l10n.academicTitle,
              ),
              const SizedBox(height: 8),
              if (selected == null)
                StudentSectionCard(child: Text(l10n.parentSelectChild))
              else if (dash.results.error == 'NO_STUDENT_ACCOUNT')
                StudentSectionCard(child: Text(l10n.parentNoStudentAccount))
              else
                _ResultsPreview(data: dash.results.data, l10n: l10n),
              const SizedBox(height: 16),
              StudentBilingualHeader(
                amharic: l10n.deadlinesTitleAm,
                english: l10n.deadlinesTitle,
              ),
              const SizedBox(height: 8),
              if (selected == null)
                const SizedBox.shrink()
              else
                _HomeworkPreview(data: dash.assignments.data, l10n: l10n),
            ],
          ),
        ),
      ),
    );
  }

  String _school(AppLocalizations l10n, String name) {
    final trimmed = name.trim();
    return trimmed.isEmpty ? l10n.parentSchoolFallback : trimmed;
  }
}

class _ResultsPreview extends StatelessWidget {
  const _ResultsPreview({required this.data, required this.l10n});

  final Object? data;
  final AppLocalizations l10n;

  @override
  Widget build(BuildContext context) {
    if (data is! Map) {
      return StudentSectionCard(child: Text(l10n.noResultsYet));
    }
    return _ResultsBody(data: data);
  }
}

class _HomeworkPreview extends StatelessWidget {
  const _HomeworkPreview({required this.data, required this.l10n});

  final Object? data;
  final AppLocalizations l10n;

  @override
  Widget build(BuildContext context) {
    if (data is! Map) {
      return StudentSectionCard(child: Text(l10n.emptyState));
    }
    final tasks = (data as Map)['tasks'];
    if (tasks is! List || tasks.isEmpty) {
      return StudentSectionCard(child: Text(l10n.emptyState));
    }
    final rows = tasks
        .whereType<Map>()
        .map((e) => Map<String, dynamic>.from(e))
        .take(5)
        .toList();
    return Column(
      children: rows.map((row) {
        final indicator = row['indicator']?.toString();
        final badge = switch (indicator) {
          'done' => l10n.parentIndicatorDone,
          'missing' => l10n.parentIndicatorMissing,
          'pending' => l10n.parentIndicatorPending,
          _ => null,
        };
        return Padding(
          padding: const EdgeInsets.only(bottom: 8),
          child: StudentSectionCard(
            padding: const EdgeInsets.all(12),
            child: Row(
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        row['title']?.toString() ??
                            row['subject']?.toString() ??
                            l10n.parentHomework,
                        style: const TextStyle(fontWeight: FontWeight.w700),
                      ),
                      if ((row['deadline']?.toString() ?? '').isNotEmpty)
                        Text(
                          row['deadline'].toString(),
                          style: const TextStyle(
                            fontSize: 12,
                            color: AppColors.inkMuted,
                          ),
                        ),
                    ],
                  ),
                ),
                if (badge != null)
                  Container(
                    padding:
                        const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                    decoration: BoxDecoration(
                      color: (indicator == 'done'
                              ? AppColors.success
                              : indicator == 'missing'
                                  ? AppColors.danger
                                  : AppColors.warning)
                          .withValues(alpha: 0.12),
                      borderRadius: BorderRadius.circular(20),
                    ),
                    child: Text(
                      badge,
                      style: TextStyle(
                        fontSize: 11,
                        fontWeight: FontWeight.w700,
                        color: indicator == 'done'
                            ? AppColors.success
                            : indicator == 'missing'
                                ? AppColors.danger
                                : AppColors.warning,
                      ),
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

class ParentResultsRichScreen extends StatelessWidget {
  const ParentResultsRichScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    return ParentChildDataScreen(
      title: l10n.results,
      cacheKeyFor: parentResultsCacheKey,
      pathFor: (id) => '/parent/children/$id/results',
      builder: (context, data) => _ResultsBody(data: data),
    );
  }
}

class _ResultsBody extends StatelessWidget {
  const _ResultsBody({required this.data});

  final Object? data;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    if (data is! Map) return JsonBody(data: data);
    final map = Map<String, dynamic>.from(data as Map);
    final avg = (map['semesterAverage'] as num?)?.toDouble();
    final rank = map['semesterRank'];
    final locked = map['locked'] is List
        ? (map['locked'] as List)
            .whereType<Map>()
            .map((e) => Map<String, dynamic>.from(e))
            .toList()
        : <Map<String, dynamic>>[];
    final draft = map['draft'] is List
        ? (map['draft'] as List)
            .whereType<Map>()
            .map((e) => Map<String, dynamic>.from(e))
            .toList()
        : <Map<String, dynamic>>[];

    if (avg == null && locked.isEmpty && draft.isEmpty) {
      return Text(l10n.noResultsYet);
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        StudentSectionCard(
          color: AppColors.brand700,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                l10n.semesterAverage,
                style: const TextStyle(
                  color: Colors.white70,
                  fontWeight: FontWeight.w600,
                ),
              ),
              const SizedBox(height: 6),
              Text(
                avg == null
                    ? '—'
                    : '${avg.toStringAsFixed(avg % 1 == 0 ? 0 : 1)}%',
                style: const TextStyle(
                  color: Colors.white,
                  fontSize: 32,
                  fontWeight: FontWeight.w800,
                ),
              ),
              if (rank != null) ...[
                const SizedBox(height: 4),
                Text(
                  l10n.classRank(rank.toString()),
                  style: const TextStyle(color: Colors.white70),
                ),
              ],
              if ((map['academicYear']?.toString() ?? '').isNotEmpty ||
                  (map['semester']?.toString() ?? '').isNotEmpty)
                Text(
                  [
                    if ((map['academicYear']?.toString() ?? '').isNotEmpty)
                      l10n.academicYearLabel(map['academicYear'].toString()),
                    if ((map['semester']?.toString() ?? '').isNotEmpty)
                      l10n.semesterLabel(map['semester'].toString()),
                  ].join(' · '),
                  style: const TextStyle(color: Colors.white60, fontSize: 12),
                ),
            ],
          ),
        ),
        const SizedBox(height: 12),
        Text(
          l10n.subjectBreakdown,
          style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 15),
        ),
        const SizedBox(height: 8),
        if (locked.isEmpty && draft.isEmpty)
          Text(
            l10n.noResultsYet,
            style: const TextStyle(color: AppColors.inkMuted),
          )
        else ...[
          ...locked.map((row) => _SubjectTile(row: row, graded: true)),
          ...draft.map((row) => _SubjectTile(row: row, graded: false)),
        ],
      ],
    );
  }
}

class _SubjectTile extends StatelessWidget {
  const _SubjectTile({required this.row, required this.graded});

  final Map<String, dynamic> row;
  final bool graded;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final subject = row['subject']?.toString() ?? l10n.enrolledSubjects;
    final earned = (row['earned'] as num?)?.toDouble() ?? 0;
    final maxScore = (row['maxScore'] as num?)?.toDouble() ?? 0;
    final pct = maxScore > 0 ? (earned / maxScore) * 100 : null;
    final items = row['items'] is List
        ? (row['items'] as List)
            .whereType<Map>()
            .map((e) => Map<String, dynamic>.from(e))
            .toList()
        : <Map<String, dynamic>>[];
    final recent = items.isNotEmpty ? items.last : null;

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
                    subject,
                    style: const TextStyle(fontWeight: FontWeight.w800),
                  ),
                ),
                if (pct != null)
                  Text(
                    '${pct.toStringAsFixed(pct % 1 == 0 ? 0 : 1)}%',
                    style: const TextStyle(
                      fontWeight: FontWeight.w800,
                      color: AppColors.brand700,
                    ),
                  ),
              ],
            ),
            if (recent != null) ...[
              const SizedBox(height: 4),
              Text(
                [
                  recent['label']?.toString() ?? '',
                  if (recent['score'] != null && recent['maxScore'] != null)
                    '${recent['score']}/${recent['maxScore']}',
                ].where((s) => s.isNotEmpty).join(' · '),
                style: const TextStyle(fontSize: 12, color: AppColors.inkMuted),
              ),
            ],
            if (!graded) ...[
              const SizedBox(height: 4),
              Text(
                l10n.parentIndicatorPending,
                style: const TextStyle(fontSize: 11, color: AppColors.warning),
              ),
            ],
          ],
        ),
      ),
    );
  }
}

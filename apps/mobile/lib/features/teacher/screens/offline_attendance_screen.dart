import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/outbox/attendance_outbox.dart';
import '../../../core/providers.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/widgets/offline_banner.dart';
import '../../../l10n/app_localizations.dart';

/// Queues attendance marks for POST /teacher/office/attendance/sync.
/// Marks are loaded from the online board when available; offline teachers
/// can still enqueue previously prepared marks via the form fields below
/// only when they have student/subject IDs from a prior cache load.
class OfflineAttendanceScreen extends ConsumerStatefulWidget {
  const OfflineAttendanceScreen({super.key});

  @override
  ConsumerState<OfflineAttendanceScreen> createState() =>
      _OfflineAttendanceScreenState();
}

class _OfflineAttendanceScreenState
    extends ConsumerState<OfflineAttendanceScreen> {
  Object? _board;
  bool _loading = true;
  String? _message;
  final _selected = <String, String>{};

  @override
  void initState() {
    super.initState();
    Future.microtask(_loadBoard);
  }

  Future<void> _loadBoard() async {
    final user = ref.read(authControllerProvider).user;
    if (user == null) return;
    setState(() => _loading = true);
    try {
      final cache = ref.read(cacheRepositoryProvider);
      final result = await cache.cacheFirstJson<Object?>(
        user: user,
        key: 'teacher_office_attendance',
        path: '/teacher/office/attendance',
        parse: (json) => json,
      );
      if (!mounted) return;
      setState(() {
        _board = result.data;
        _loading = false;
      });
      if (result.fromCache) {
        try {
          final fresh = await cache.refreshJson<Object?>(
            user: user,
            key: 'teacher_office_attendance',
            path: '/teacher/office/attendance',
            parse: (json) => json,
          );
          if (!mounted) return;
          setState(() => _board = fresh.data);
        } catch (_) {}
      }
    } catch (_) {
      if (!mounted) return;
      setState(() => _loading = false);
    }
  }

  List<_MarkOption> _optionsFromBoard() {
    if (_board is! Map) return const [];
    final map = Map<String, dynamic>.from(_board as Map);
    // Flexible parse: accept common shapes without inventing fields.
    final raw = map['students'] ?? map['roster'] ?? map['rows'] ?? map['marks'];
    if (raw is! List) return const [];
    final out = <_MarkOption>[];
    for (final item in raw) {
      if (item is! Map) continue;
      final m = Map<String, dynamic>.from(item);
      final studentId = (m['studentId'] ?? m['id']) as num?;
      final subjectId = m['subjectId'] as num?;
      final name = (m['fullName'] ?? m['name'] ?? m['studentName'] ?? '').toString();
      if (studentId == null || subjectId == null) continue;
      out.add(
        _MarkOption(
          studentId: studentId.toInt(),
          subjectId: subjectId.toInt(),
          label: name.isEmpty ? '#${studentId.toInt()}' : name,
        ),
      );
    }
    return out;
  }

  Future<void> _queue() async {
    final l10n = AppLocalizations.of(context);
    final user = ref.read(authControllerProvider).user;
    if (user == null) return;
    final options = _optionsFromBoard();
    if (options.isEmpty || _selected.isEmpty) {
      setState(() => _message = l10n.emptyState);
      return;
    }
    final today = DateTime.now().toUtc();
    final date =
        '${today.year.toString().padLeft(4, '0')}-${today.month.toString().padLeft(2, '0')}-${today.day.toString().padLeft(2, '0')}';
    final marks = <AttendanceMark>[];
    for (final opt in options) {
      final key = '${opt.studentId}:${opt.subjectId}';
      final status = _selected[key];
      if (status == null) continue;
      marks.add(
        AttendanceMark(
          studentId: opt.studentId,
          subjectId: opt.subjectId,
          date: date,
          status: status,
        ),
      );
    }
    if (marks.isEmpty) {
      setState(() => _message = l10n.emptyState);
      return;
    }
    final idem =
        '${user.tenantId}-${user.id}-$date-${DateTime.now().microsecondsSinceEpoch}';
    await ref.read(attendanceOutboxServiceProvider).enqueue(
          user: user,
          idempotencyKey: idem,
          marks: marks,
        );
    ref.invalidate(pendingOutboxCountProvider);
    if (!mounted) return;
    setState(() => _message = l10n.queueAttendance);
    final online = await ref.read(connectivityServiceProvider).isOnline();
    if (online) {
      await ref.read(attendanceOutboxSyncProvider.notifier).syncNow();
    }
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final options = _optionsFromBoard();
    final pending = ref.watch(pendingOutboxCountProvider).value ?? 0;
    return Scaffold(
      appBar: AppBar(title: Text(l10n.offlineAttendance)),
      body: Column(
        children: [
          const OfflineBanner(),
          if (pending > 0)
            Padding(
              padding: const EdgeInsets.all(12),
              child: Row(
                children: [
                  Expanded(child: Text(l10n.pendingSync(pending))),
                  TextButton(
                    onPressed: () =>
                        ref.read(attendanceOutboxSyncProvider.notifier).syncNow(),
                    child: Text(l10n.syncNow),
                  ),
                ],
              ),
            ),
          if (_message != null)
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              child: Text(_message!, style: const TextStyle(color: AppColors.info)),
            ),
          Expanded(
            child: _loading
                ? Center(child: Text(l10n.loading))
                : options.isEmpty
                    ? Center(child: Text(l10n.emptyState))
                    : ListView.separated(
                        itemCount: options.length,
                        separatorBuilder: (_, _) => const Divider(height: 1),
                        itemBuilder: (context, index) {
                          final opt = options[index];
                          final key = '${opt.studentId}:${opt.subjectId}';
                          return ListTile(
                            minVerticalPadding: 12,
                            title: Text(opt.label),
                            subtitle: Text('S${opt.studentId} · Sub${opt.subjectId}'),
                            trailing: SegmentedButton<String>(
                              segments: const [
                                ButtonSegment(value: 'P', label: Text('P')),
                                ButtonSegment(value: 'A', label: Text('A')),
                                ButtonSegment(value: 'T', label: Text('T')),
                              ],
                              emptySelectionAllowed: true,
                              selected: {
                                if (_selected[key] != null) _selected[key]!,
                              },
                              onSelectionChanged: (values) {
                                setState(() {
                                  if (values.isEmpty) {
                                    _selected.remove(key);
                                  } else {
                                    _selected[key] = values.first;
                                  }
                                });
                              },
                            ),
                          );
                        },
                      ),
          ),
          SafeArea(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: FilledButton(
                onPressed: _queue,
                child: Text(l10n.queueAttendance),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _MarkOption {
  const _MarkOption({
    required this.studentId,
    required this.subjectId,
    required this.label,
  });

  final int studentId;
  final int subjectId;
  final String label;
}

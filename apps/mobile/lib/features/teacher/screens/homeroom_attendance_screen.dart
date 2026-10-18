import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/api/api_exception.dart';
import '../../../core/providers.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/widgets/offline_banner.dart';
import '../../../l10n/app_localizations.dart';
import '../widgets/teacher_chrome.dart';

/// Homeroom roll call: P/A/T/E mapped to legacy marks X/A/L/P.
class HomeroomAttendanceScreen extends ConsumerStatefulWidget {
  const HomeroomAttendanceScreen({super.key});

  @override
  ConsumerState<HomeroomAttendanceScreen> createState() =>
      _HomeroomAttendanceScreenState();
}

class _HomeroomAttendanceScreenState
    extends ConsumerState<HomeroomAttendanceScreen> {
  Map<String, dynamic>? _data;
  bool _loading = true;
  bool _saving = false;
  String? _error;
  String? _message;
  String _query = '';
  int? _classId;
  /// studentId → mark (X|A|L|P)
  final Map<int, String> _marks = {};

  @override
  void initState() {
    super.initState();
    Future.microtask(_load);
  }

  Future<void> _load({int? classId}) async {
    final user = ref.read(authControllerProvider).user;
    if (user == null) return;
    setState(() {
      _loading = true;
      _error = null;
      _message = null;
    });
    try {
      final api = ref.read(apiClientProvider);
      final response = await api.get<Map<String, dynamic>>(
        '/teacher/attendance/homeroom',
        queryParameters: {
          'classId': ?classId,
        },
      );
      final map = response.data ?? <String, dynamic>{};
      final students = map['students'];
      final marks = <int, String>{};
      if (students is List) {
        for (final raw in students) {
          if (raw is! Map) continue;
          final row = Map<String, dynamic>.from(raw);
          final id = (row['id'] as num?)?.toInt();
          if (id == null) continue;
          final mark = (row['mark'] as String?)?.trim() ?? '';
          if (mark.isNotEmpty) marks[id] = mark;
        }
      }
      if (!mounted) return;
      setState(() {
        _data = map;
        _classId = (map['classId'] as num?)?.toInt();
        _marks
          ..clear()
          ..addAll(marks);
        _loading = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _loading = false;
        _error = e is ApiException ? e.code : 'INTERNAL_ERROR';
      });
    }
  }

  Future<void> _save() async {
    final l10n = AppLocalizations.of(context);
    final classId = _classId;
    final date = (_data?['date'] as String?)?.trim();
    if (classId == null || date == null || date.isEmpty) return;
    if (_marks.isEmpty) {
      setState(() => _message = l10n.errorValidation);
      return;
    }
    setState(() {
      _saving = true;
      _message = null;
    });
    try {
      final api = ref.read(apiClientProvider);
      await api.post<Map<String, dynamic>>(
        '/teacher/attendance/homeroom',
        data: {
          'classId': classId,
          'date': date,
          'marks': _marks.entries
              .map((e) => {'studentId': e.key, 'mark': e.value})
              .toList(),
        },
      );
      if (!mounted) return;
      setState(() => _message = l10n.syncSuccess);
      await _load(classId: classId);
    } catch (e) {
      if (!mounted) return;
      setState(() {
                    _message = e is ApiException && e.code == 'ATTENDANCE_LOCKED'
                        ? l10n.attendanceLocked
                        : e is ApiException && e.code == 'NOT_ASSIGNED'
                            ? l10n.notHomeroomTeacher
                            : (e is ApiException ? e.code : l10n.errorGeneric);
      });
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  void _markAllPresent(List<Map<String, dynamic>> students) {
    setState(() {
      for (final row in students) {
        final id = (row['id'] as num?)?.toInt();
        if (id != null) _marks[id] = 'X';
      }
    });
  }

  List<Map<String, dynamic>> _students() {
    final raw = _data?['students'];
    if (raw is! List) return const [];
    return raw
        .whereType<Map>()
        .map((e) => Map<String, dynamic>.from(e))
        .toList();
  }

  List<Map<String, dynamic>> _classes() {
    final raw = _data?['classes'];
    if (raw is! List) return const [];
    return raw
        .whereType<Map>()
        .map((e) => Map<String, dynamic>.from(e))
        .toList();
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final students = _students();
    final filtered = _query.trim().isEmpty
        ? students
        : students.where((row) {
            final name = (row['fullName'] ?? '').toString().toLowerCase();
            final id = (row['id'] ?? '').toString();
            final q = _query.trim().toLowerCase();
            return name.contains(q) || id.contains(q);
          }).toList();

    final present = _marks.values.where((m) => m == 'X').length;
    final absent = _marks.values.where((m) => m == 'A').length;
    final late = _marks.values.where((m) => m == 'L').length;
    final excused = _marks.values.where((m) => m == 'P').length;

    return Scaffold(
      backgroundColor: AppColors.loginCanvas,
      body: SafeArea(
        child: Column(
          children: [
            const OfflineBanner(),
            const TeacherTopBar(),
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 4, 16, 8),
              child: Row(
                children: [
                  Expanded(
                    child: Text(
                      l10n.classRoster,
                      style: const TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.w800,
                      ),
                    ),
                  ),
                  if (_data?['date'] != null)
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
                        '${_data!['date']}',
                        style: const TextStyle(
                          fontWeight: FontWeight.w700,
                          fontSize: 12,
                          color: AppColors.brand700,
                        ),
                      ),
                    ),
                ],
              ),
            ),
            if (_loading)
              const Expanded(child: Center(child: CircularProgressIndicator()))
            else if (_error != null && _data == null)
              Expanded(
                child: Center(
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Text(l10n.errorGeneric),
                      const SizedBox(height: 12),
                      FilledButton(
                        onPressed: _load,
                        child: Text(l10n.retry),
                      ),
                    ],
                  ),
                ),
              )
            else if (_classes().isEmpty)
              Expanded(
                child: Center(
                  child: Padding(
                    padding: const EdgeInsets.all(24),
                    child: Text(
                      l10n.notHomeroomTeacher,
                      textAlign: TextAlign.center,
                      style: const TextStyle(color: AppColors.inkMuted),
                    ),
                  ),
                ),
              )
            else ...[
              SizedBox(
                height: 40,
                child: ListView(
                  scrollDirection: Axis.horizontal,
                  padding: const EdgeInsets.symmetric(horizontal: 16),
                  children: [
                    for (final room in _classes())
                      Padding(
                        padding: const EdgeInsets.only(right: 8),
                        child: ChoiceChip(
                          label: Text('${room['label'] ?? ''}'),
                          selected: _classId == (room['id'] as num?)?.toInt(),
                          onSelected: (_) {
                            final id = (room['id'] as num?)?.toInt();
                            if (id != null) _load(classId: id);
                          },
                        ),
                      ),
                  ],
                ),
              ),
              Padding(
                padding: const EdgeInsets.fromLTRB(16, 8, 16, 0),
                child: Row(
                  children: [
                    Expanded(
                      child: Text(
                        l10n.enrolledStudents(students.length),
                        style: const TextStyle(fontWeight: FontWeight.w700),
                      ),
                    ),
                    TextButton(
                      onPressed: students.isEmpty
                          ? null
                          : () => _markAllPresent(students),
                      child: Text(l10n.markAllPresent),
                    ),
                  ],
                ),
              ),
              Padding(
                padding: const EdgeInsets.fromLTRB(16, 4, 16, 8),
                child: Row(
                  children: [
                    _Stat(label: 'P', count: present, color: AppColors.success),
                    _Stat(label: 'A', count: absent, color: AppColors.danger),
                    _Stat(label: 'T', count: late, color: AppColors.warning),
                    _Stat(label: 'E', count: excused, color: AppColors.info),
                  ],
                ),
              ),
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 16),
                child: TextField(
                  decoration: InputDecoration(
                    hintText: l10n.searchStudent,
                    prefixIcon: const Icon(Icons.search),
                    filled: true,
                    fillColor: AppColors.surface,
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(12),
                      borderSide: BorderSide.none,
                    ),
                  ),
                  onChanged: (v) => setState(() => _query = v),
                ),
              ),
              if (_message != null)
                Padding(
                  padding: const EdgeInsets.fromLTRB(16, 8, 16, 0),
                  child: Text(
                    _message!,
                    style: TextStyle(
                      color: _message == l10n.syncSuccess
                          ? AppColors.success
                          : AppColors.danger,
                    ),
                  ),
                ),
              Expanded(
                child: filtered.isEmpty
                    ? Center(child: Text(l10n.emptyState))
                    : ListView.builder(
                        padding: const EdgeInsets.fromLTRB(16, 12, 16, 100),
                        itemCount: filtered.length,
                        itemBuilder: (context, index) {
                          final row = filtered[index];
                          final id = (row['id'] as num?)?.toInt() ?? 0;
                          final name = (row['fullName'] ?? '').toString();
                          final mark = _marks[id] ?? '';
                          return Padding(
                            padding: const EdgeInsets.only(bottom: 8),
                            child: TeacherSectionCard(
                              padding: const EdgeInsets.all(12),
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Row(
                                    children: [
                                      CircleAvatar(
                                        backgroundColor: AppColors.brand50,
                                        child: Text(
                                          '${index + 1}'.padLeft(2, '0'),
                                          style: const TextStyle(
                                            fontSize: 12,
                                            fontWeight: FontWeight.w800,
                                            color: AppColors.brand700,
                                          ),
                                        ),
                                      ),
                                      const SizedBox(width: 10),
                                      Expanded(
                                        child: Column(
                                          crossAxisAlignment:
                                              CrossAxisAlignment.start,
                                          children: [
                                            Text(
                                              name.isEmpty ? '#$id' : name,
                                              style: const TextStyle(
                                                fontWeight: FontWeight.w800,
                                              ),
                                            ),
                                            Text(
                                              l10n.studentIdLabel('$id'),
                                              style: const TextStyle(
                                                fontSize: 11,
                                                color: AppColors.inkMuted,
                                              ),
                                            ),
                                          ],
                                        ),
                                      ),
                                    ],
                                  ),
                                  const SizedBox(height: 10),
                                  Row(
                                    children: [
                                      _MarkBtn(
                                        label: 'P',
                                        selected: mark == 'X',
                                        color: AppColors.success,
                                        onTap: () =>
                                            setState(() => _marks[id] = 'X'),
                                      ),
                                      _MarkBtn(
                                        label: 'A',
                                        selected: mark == 'A',
                                        color: AppColors.danger,
                                        onTap: () =>
                                            setState(() => _marks[id] = 'A'),
                                      ),
                                      _MarkBtn(
                                        label: 'T',
                                        selected: mark == 'L',
                                        color: AppColors.warning,
                                        onTap: () =>
                                            setState(() => _marks[id] = 'L'),
                                      ),
                                      _MarkBtn(
                                        label: 'E',
                                        selected: mark == 'P',
                                        color: AppColors.info,
                                        onTap: () =>
                                            setState(() => _marks[id] = 'P'),
                                      ),
                                    ],
                                  ),
                                ],
                              ),
                            ),
                          );
                        },
                      ),
              ),
              SafeArea(
                top: false,
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(16, 8, 16, 12),
                  child: SizedBox(
                    width: double.infinity,
                    height: 48,
                    child: FilledButton(
                      onPressed: _saving ? null : _save,
                      child: Text(_saving ? l10n.loading : l10n.submit),
                    ),
                  ),
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}

class _Stat extends StatelessWidget {
  const _Stat({
    required this.label,
    required this.count,
    required this.color,
  });

  final String label;
  final int count;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: Container(
        margin: const EdgeInsets.only(right: 6),
        padding: const EdgeInsets.symmetric(vertical: 8),
        decoration: BoxDecoration(
          color: color.withValues(alpha: 0.12),
          borderRadius: BorderRadius.circular(10),
        ),
        child: Column(
          children: [
            Text(
              '$count',
              style: TextStyle(
                fontWeight: FontWeight.w800,
                color: color,
              ),
            ),
            Text(label, style: TextStyle(fontSize: 11, color: color)),
          ],
        ),
      ),
    );
  }
}

class _MarkBtn extends StatelessWidget {
  const _MarkBtn({
    required this.label,
    required this.selected,
    required this.color,
    required this.onTap,
  });

  final String label;
  final bool selected;
  final Color color;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: Padding(
        padding: const EdgeInsets.only(right: 6),
        child: Material(
          color: selected ? color : AppColors.loginField,
          borderRadius: BorderRadius.circular(10),
          child: InkWell(
            onTap: onTap,
            borderRadius: BorderRadius.circular(10),
            child: SizedBox(
              height: 40,
              child: Center(
                child: Text(
                  label,
                  style: TextStyle(
                    fontWeight: FontWeight.w800,
                    color: selected ? Colors.white : AppColors.inkStrong,
                  ),
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}

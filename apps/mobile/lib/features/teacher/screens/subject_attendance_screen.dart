import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/api/api_exception.dart';
import '../../../core/providers.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/widgets/keyt_app_bar.dart';
import '../../../core/widgets/offline_banner.dart';
import '../../../l10n/app_localizations.dart';
import '../widgets/teacher_chrome.dart';

/// Subject roll call for assigned teaching classes (P/A/T/E → X/A/L/P).
class SubjectAttendanceScreen extends ConsumerStatefulWidget {
  const SubjectAttendanceScreen({super.key});

  @override
  ConsumerState<SubjectAttendanceScreen> createState() =>
      _SubjectAttendanceScreenState();
}

class _SubjectAttendanceScreenState
    extends ConsumerState<SubjectAttendanceScreen> {
  Map<String, dynamic>? _data;
  bool _loading = true;
  bool _saving = false;
  String? _error;
  String? _message;
  String _query = '';
  String? _classSelect;
  int? _subjectId;
  final Map<int, String> _marks = {};

  @override
  void initState() {
    super.initState();
    Future.microtask(() => _load());
  }

  Future<void> _load({String? classSelect, int? subjectId}) async {
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
        '/teacher/attendance/subject',
        queryParameters: {
          if (classSelect != null && classSelect.isNotEmpty)
            'classSelect': classSelect,
          'subjectId': ?subjectId,
        },
      );
      var map = response.data ?? <String, dynamic>{};

      // First open: pick first class + subject so the roster loads.
      final classes = _listMaps(map['classes']);
      final subjects = _listMaps(map['subjects']);
      final currentClass = (map['classSelect']?.toString() ?? '').trim();
      final currentSubject = (map['subjectId'] as num?)?.toInt();
      if ((currentClass.isEmpty || currentSubject == null || currentSubject == 0) &&
          classes.isNotEmpty &&
          subjects.isNotEmpty) {
        final autoClass = classes.first['value']?.toString() ?? '';
        final autoSubject = (subjects.first['id'] as num?)?.toInt();
        if (autoClass.isNotEmpty && autoSubject != null) {
          final filled = await api.get<Map<String, dynamic>>(
            '/teacher/attendance/subject',
            queryParameters: {
              'classSelect': autoClass,
              'subjectId': autoSubject,
            },
          );
          map = filled.data ?? map;
        }
      }

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
        _classSelect = (map['classSelect']?.toString() ?? '').trim().isEmpty
            ? null
            : map['classSelect'].toString();
        _subjectId = (map['subjectId'] as num?)?.toInt();
        if (_subjectId == 0) _subjectId = null;
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
    final classSelect = _classSelect;
    final subjectId = _subjectId;
    final date = (_data?['date'] as String?)?.trim();
    if (classSelect == null ||
        classSelect.isEmpty ||
        subjectId == null ||
        date == null ||
        date.isEmpty) {
      setState(() => _message = l10n.selectClassAndSubject);
      return;
    }
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
        '/teacher/attendance/subject',
        data: {
          'classSelect': classSelect,
          'subjectId': subjectId,
          'date': date,
          'marks': _marks.entries
              .map((e) => {'studentId': e.key, 'mark': e.value})
              .toList(),
        },
      );
      if (!mounted) return;
      setState(() => _message = l10n.syncSuccess);
      await _load(classSelect: classSelect, subjectId: subjectId);
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _message = e is ApiException && e.code == 'ATTENDANCE_LOCKED'
            ? l10n.attendanceLocked
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

  List<Map<String, dynamic>> _students() => _listMaps(_data?['students']);
  List<Map<String, dynamic>> _classes() => _listMaps(_data?['classes']);
  List<Map<String, dynamic>> _subjects() => _listMaps(_data?['subjects']);

  List<Map<String, dynamic>> _listMaps(Object? raw) {
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
    final classes = _classes();
    final subjects = _subjects();
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
      appBar: KeytAppBar(title: l10n.subjectAttendance),
      body: SafeArea(
        child: Column(
          children: [
            const OfflineBanner(),
            const TeacherTopBar(),
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 4, 16, 8),
              child: Row(
                children: [
                  const Spacer(),
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
                        onPressed: () => _load(),
                        child: Text(l10n.retry),
                      ),
                    ],
                  ),
                ),
              )
            else if (classes.isEmpty || subjects.isEmpty)
              Expanded(
                child: Center(
                  child: Padding(
                    padding: const EdgeInsets.all(24),
                    child: Text(
                      l10n.noAssignedClasses,
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
                    for (final room in classes)
                      Padding(
                        padding: const EdgeInsets.only(right: 8),
                        child: ChoiceChip(
                          label: Text('${room['label'] ?? room['value'] ?? ''}'),
                          selected: _classSelect == room['value']?.toString(),
                          onSelected: (_) {
                            final value = room['value']?.toString();
                            if (value == null || value.isEmpty) return;
                            _load(
                              classSelect: value,
                              subjectId: _subjectId,
                            );
                          },
                        ),
                      ),
                  ],
                ),
              ),
              const SizedBox(height: 8),
              SizedBox(
                height: 40,
                child: ListView(
                  scrollDirection: Axis.horizontal,
                  padding: const EdgeInsets.symmetric(horizontal: 16),
                  children: [
                    for (final subject in subjects)
                      Padding(
                        padding: const EdgeInsets.only(right: 8),
                        child: ChoiceChip(
                          label: Text('${subject['name'] ?? ''}'),
                          selected:
                              _subjectId == (subject['id'] as num?)?.toInt(),
                          onSelected: (_) {
                            final id = (subject['id'] as num?)?.toInt();
                            if (id == null) return;
                            _load(
                              classSelect: _classSelect,
                              subjectId: id,
                            );
                          },
                        ),
                      ),
                  ],
                ),
              ),
              if (_classSelect == null || _subjectId == null)
                Expanded(
                  child: Center(
                    child: Text(
                      l10n.selectClassAndSubject,
                      textAlign: TextAlign.center,
                    ),
                  ),
                )
              else ...[
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
                      _Stat(
                        label: l10n.presentCount,
                        count: present,
                        color: AppColors.success,
                      ),
                      _Stat(
                        label: l10n.absentCount,
                        count: absent,
                        color: AppColors.danger,
                      ),
                      _Stat(
                        label: l10n.tardyCount,
                        count: late,
                        color: AppColors.warning,
                      ),
                      _Stat(
                        label: l10n.excusedCount,
                        count: excused,
                        color: AppColors.info,
                      ),
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
                                          onTap: () => setState(
                                            () => _marks[id] = 'X',
                                          ),
                                        ),
                                        _MarkBtn(
                                          label: 'A',
                                          selected: mark == 'A',
                                          color: AppColors.danger,
                                          onTap: () => setState(
                                            () => _marks[id] = 'A',
                                          ),
                                        ),
                                        _MarkBtn(
                                          label: 'T',
                                          selected: mark == 'L',
                                          color: AppColors.warning,
                                          onTap: () => setState(
                                            () => _marks[id] = 'L',
                                          ),
                                        ),
                                        _MarkBtn(
                                          label: 'E',
                                          selected: mark == 'P',
                                          color: AppColors.info,
                                          onTap: () => setState(
                                            () => _marks[id] = 'P',
                                          ),
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
              style: TextStyle(fontWeight: FontWeight.w800, color: color),
            ),
            Text(
              label,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: TextStyle(fontSize: 10, color: color),
            ),
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

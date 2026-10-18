import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/api/api_exception.dart';
import '../../../core/providers.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/widgets/offline_banner.dart';
import '../../../l10n/app_localizations.dart';
import '../widgets/teacher_chrome.dart';

class Student360ListScreen extends ConsumerStatefulWidget {
  const Student360ListScreen({super.key});

  @override
  ConsumerState<Student360ListScreen> createState() =>
      _Student360ListScreenState();
}

class _Student360ListScreenState extends ConsumerState<Student360ListScreen> {
  Map<String, dynamic>? _data;
  bool _loading = true;
  String? _error;
  String _query = '';

  @override
  void initState() {
    super.initState();
    Future.microtask(_load);
  }

  Future<void> _load() async {
    final user = ref.read(authControllerProvider).user;
    if (user == null) return;
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final api = ref.read(apiClientProvider);
      final response =
          await api.get<Map<String, dynamic>>('/teacher/office/student-360');
      if (!mounted) return;
      setState(() {
        _data = response.data;
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

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final raw = _data?['students'];
    final students = raw is List
        ? raw
            .whereType<Map>()
            .map((e) => Map<String, dynamic>.from(e))
            .toList()
        : <Map<String, dynamic>>[];
    final filtered = _query.trim().isEmpty
        ? students
        : students.where((row) {
            final name = (row['name'] ?? '').toString().toLowerCase();
            final id = (row['id'] ?? '').toString();
            final q = _query.trim().toLowerCase();
            return name.contains(q) || id.contains(q);
          }).toList();

    return Scaffold(
      backgroundColor: AppColors.loginCanvas,
      body: SafeArea(
        child: Column(
          children: [
            const OfflineBanner(),
            const TeacherTopBar(),
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 4, 16, 8),
              child: Text(
                l10n.student360,
                style: const TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.w800,
                ),
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
            Expanded(
              child: _loading
                  ? const Center(child: CircularProgressIndicator())
                  : (_error != null && _data == null)
                      ? Center(
                          child: Column(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Text(
                                _error == 'NOT_HOMEROOM'
                                    ? l10n.roleNotSupported
                                    : l10n.errorGeneric,
                              ),
                              const SizedBox(height: 12),
                              FilledButton(
                                onPressed: _load,
                                child: Text(l10n.retry),
                              ),
                            ],
                          ),
                        )
                      : filtered.isEmpty
                          ? Center(child: Text(l10n.emptyState))
                          : ListView.builder(
                              padding:
                                  const EdgeInsets.fromLTRB(16, 12, 16, 24),
                              itemCount: filtered.length,
                              itemBuilder: (context, index) {
                                final row = filtered[index];
                                final id = (row['id'] as num?)?.toInt();
                                final name = (row['name'] ?? '').toString();
                                final grade = row['gradeLevel'];
                                final section = (row['section'] ?? '').toString();
                                return Padding(
                                  padding: const EdgeInsets.only(bottom: 8),
                                  child: TeacherSectionCard(
                                    padding: EdgeInsets.zero,
                                    child: ListTile(
                                      leading: CircleAvatar(
                                        backgroundColor: AppColors.brand50,
                                        child: Text(
                                          name.isEmpty
                                              ? '?'
                                              : name
                                                  .substring(0, 1)
                                                  .toUpperCase(),
                                          style: const TextStyle(
                                            color: AppColors.brand700,
                                            fontWeight: FontWeight.w800,
                                          ),
                                        ),
                                      ),
                                      title: Text(
                                        name.isEmpty ? '#$id' : name,
                                        style: const TextStyle(
                                          fontWeight: FontWeight.w700,
                                        ),
                                      ),
                                      subtitle: Text(
                                        [
                                          if (grade != null) '$grade',
                                          if (section.isNotEmpty) section,
                                          if (id != null)
                                            l10n.studentIdLabel('$id'),
                                        ].join(' • '),
                                      ),
                                      trailing:
                                          const Icon(Icons.chevron_right),
                                      onTap: id == null
                                          ? null
                                          : () => context.push(
                                                '/teacher/classes/student-360/$id',
                                              ),
                                    ),
                                  ),
                                );
                              },
                            ),
            ),
          ],
        ),
      ),
    );
  }
}

class Student360DetailScreen extends ConsumerStatefulWidget {
  const Student360DetailScreen({super.key, required this.studentId});

  final int studentId;

  @override
  ConsumerState<Student360DetailScreen> createState() =>
      _Student360DetailScreenState();
}

class _Student360DetailScreenState
    extends ConsumerState<Student360DetailScreen> {
  Map<String, dynamic>? _data;
  bool _loading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    Future.microtask(_load);
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final api = ref.read(apiClientProvider);
      final response = await api.get<Map<String, dynamic>>(
        '/teacher/office/student-360/${widget.studentId}',
      );
      if (!mounted) return;
      setState(() {
        _data = response.data;
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

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final student = _data?['student'] is Map
        ? Map<String, dynamic>.from(_data!['student'] as Map)
        : <String, dynamic>{};
    final attendance = _data?['attendance'] is Map
        ? Map<String, dynamic>.from(_data!['attendance'] as Map)
        : <String, dynamic>{};
    final grades = _data?['grades'] is List
        ? (_data!['grades'] as List)
            .whereType<Map>()
            .map((e) => Map<String, dynamic>.from(e))
            .toList()
        : <Map<String, dynamic>>[];
    final name = (student['name'] ?? '').toString();
    final average = (_data?['average'] as num?)?.toDouble();

    return Scaffold(
      backgroundColor: AppColors.loginCanvas,
      appBar: AppBar(title: Text(l10n.student360)),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : (_error != null && _data == null)
              ? Center(
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Text(l10n.errorGeneric),
                      FilledButton(
                        onPressed: _load,
                        child: Text(l10n.retry),
                      ),
                    ],
                  ),
                )
              : RefreshIndicator(
                  onRefresh: _load,
                  child: ListView(
                    padding: const EdgeInsets.all(16),
                    children: [
                      TeacherSectionCard(
                        color: AppColors.brand700,
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              name.isEmpty
                                  ? l10n.studentIdLabel('${widget.studentId}')
                                  : name,
                              style: const TextStyle(
                                color: Colors.white,
                                fontSize: 20,
                                fontWeight: FontWeight.w800,
                              ),
                            ),
                            const SizedBox(height: 6),
                            Text(
                              [
                                if (student['gradeLevel'] != null)
                                  '${student['gradeLevel']}',
                                if ((student['section'] ?? '')
                                    .toString()
                                    .isNotEmpty)
                                  '${student['section']}',
                                l10n.studentIdLabel('${student['id'] ?? widget.studentId}'),
                              ].join(' • '),
                              style: TextStyle(
                                color: Colors.white.withValues(alpha: 0.85),
                              ),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(height: 12),
                      Row(
                        children: [
                          _Tile(
                            label: l10n.presentCount,
                            value: '${attendance['present'] ?? 0}',
                            color: AppColors.success,
                          ),
                          _Tile(
                            label: l10n.absentCount,
                            value: '${attendance['absent'] ?? 0}',
                            color: AppColors.danger,
                          ),
                          _Tile(
                            label: l10n.tardyCount,
                            value: '${attendance['tardy'] ?? 0}',
                            color: AppColors.warning,
                          ),
                        ],
                      ),
                      const SizedBox(height: 12),
                      TeacherSectionCard(
                        child: Row(
                          children: [
                            Expanded(
                              child: Text(
                                l10n.averageScore,
                                style: const TextStyle(
                                  fontWeight: FontWeight.w700,
                                ),
                              ),
                            ),
                            Text(
                              average == null
                                  ? '—'
                                  : average.toStringAsFixed(1),
                              style: const TextStyle(
                                fontSize: 22,
                                fontWeight: FontWeight.w800,
                                color: AppColors.brand700,
                              ),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(height: 12),
                      Text(
                        l10n.results,
                        style: const TextStyle(
                          fontWeight: FontWeight.w800,
                          fontSize: 15,
                        ),
                      ),
                      const SizedBox(height: 8),
                      if (grades.isEmpty)
                        TeacherSectionCard(
                          child: Text(
                            l10n.noResultsYet,
                            style: const TextStyle(color: AppColors.inkMuted),
                          ),
                        )
                      else
                        ...grades.map((row) {
                          final subject = (row['subject'] ?? '').toString();
                          final score = (row['score'] as num?)?.toDouble();
                          final max = (row['maxScore'] as num?)?.toDouble();
                          return Padding(
                            padding: const EdgeInsets.only(bottom: 8),
                            child: TeacherSectionCard(
                              padding: const EdgeInsets.all(12),
                              child: Row(
                                children: [
                                  Expanded(
                                    child: Text(
                                      subject.isEmpty
                                          ? l10n.results
                                          : subject,
                                      style: const TextStyle(
                                        fontWeight: FontWeight.w700,
                                      ),
                                    ),
                                  ),
                                  Text(
                                    score == null
                                        ? '—'
                                        : '${score.toStringAsFixed(0)}${max == null ? '' : '/${max.toStringAsFixed(0)}'}',
                                    style: const TextStyle(
                                      fontWeight: FontWeight.w800,
                                      color: AppColors.brand700,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          );
                        }),
                      const SizedBox(height: 8),
                      Text(
                        '${l10n.incidents}: ${_data?['openIncidents'] ?? 0}  •  '
                        '${l10n.library}: ${_data?['borrowedBooks'] ?? 0}',
                        style: const TextStyle(color: AppColors.inkMuted),
                      ),
                    ],
                  ),
                ),
    );
  }
}

class _Tile extends StatelessWidget {
  const _Tile({
    required this.label,
    required this.value,
    required this.color,
  });

  final String label;
  final String value;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: Padding(
        padding: const EdgeInsets.only(right: 8),
        child: TeacherSectionCard(
          padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 8),
          child: Column(
            children: [
              Text(
                value,
                style: TextStyle(
                  fontWeight: FontWeight.w800,
                  fontSize: 18,
                  color: color,
                ),
              ),
              Text(
                label,
                style: const TextStyle(fontSize: 10, color: AppColors.inkMuted),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

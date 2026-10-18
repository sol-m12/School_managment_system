import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/api/api_client.dart';
import '../../../core/providers.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/widgets/keyt_app_bar.dart';
import '../../../core/widgets/offline_banner.dart';
import '../../../l10n/app_localizations.dart';

/// Same API as website Online Exams: create exam, publish, add questions.
class OnlineExamsScreen extends ConsumerStatefulWidget {
  const OnlineExamsScreen({super.key});

  @override
  ConsumerState<OnlineExamsScreen> createState() => _OnlineExamsScreenState();
}

class _OnlineExamsScreenState extends ConsumerState<OnlineExamsScreen> {
  List<Map<String, dynamic>> _exams = const [];
  List<Map<String, dynamic>> _subjects = const [];
  List<String> _sections = const [];
  bool _loading = true;
  bool _busy = false;
  String? _error;
  String? _notice;

  final _title = TextEditingController();
  final _password = TextEditingController();
  final _duration = TextEditingController(text: '40');
  int _grade = 9;
  int? _subjectId;
  String? _section;

  int? _openedId;
  final _qText = TextEditingController();
  final _qa = TextEditingController();
  final _qb = TextEditingController();
  final _qc = TextEditingController();
  final _qd = TextEditingController();
  String _correct = 'A';
  final _qPoints = TextEditingController(text: '1');

  @override
  void initState() {
    super.initState();
    Future.microtask(_loadAll);
  }

  @override
  void dispose() {
    _title.dispose();
    _password.dispose();
    _duration.dispose();
    _qText.dispose();
    _qa.dispose();
    _qb.dispose();
    _qc.dispose();
    _qd.dispose();
    _qPoints.dispose();
    super.dispose();
  }

  Future<void> _loadAll() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final api = ref.read(apiClientProvider);
      final options = await api.get<Map<String, dynamic>>(
        '/teacher/exams/options',
        queryParameters: {'grade': _grade},
      );
      final exams = await api.get<Map<String, dynamic>>('/teacher/exams');
      final opt = options.data ?? {};
      List<Map<String, dynamic>> maps(Object? raw) {
        if (raw is! List) return const [];
        return raw
            .whereType<Map>()
            .map((e) => Map<String, dynamic>.from(e))
            .toList();
      }

      final sectionsRaw = opt['sections'];
      final sections = sectionsRaw is List
          ? sectionsRaw.map((e) => e.toString()).where((s) => s.isNotEmpty).toList()
          : <String>[];

      if (!mounted) return;
      setState(() {
        _subjects = maps(opt['subjects']);
        _sections = sections;
        _exams = maps(exams.data?['exams']);
        _subjectId ??= _subjects.isNotEmpty
            ? (_subjects.first['id'] as num?)?.toInt()
            : null;
        _section ??= _sections.isNotEmpty ? _sections.first : null;
        _loading = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _loading = false;
        _error = mapDioError(e).code;
      });
    }
  }

  Future<void> _createExam() async {
    if (_busy || _subjectId == null || (_section ?? '').isEmpty) return;
    setState(() {
      _busy = true;
      _error = null;
      _notice = null;
    });
    try {
      await ref.read(apiClientProvider).post(
        '/teacher/exams',
        data: {
          'examTitle': _title.text.trim(),
          'gradeLevel': _grade,
          'subjectId': _subjectId,
          'section': _section,
          'examPassword': _password.text.trim(),
          'durationMinutes': int.tryParse(_duration.text.trim()) ?? 40,
        },
      );
      _title.clear();
      _password.clear();
      if (!mounted) return;
      setState(() => _notice = AppLocalizations.of(context).examCreated);
      await _loadAll();
    } catch (e) {
      if (!mounted) return;
      setState(() => _error = mapDioError(e).code);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _setStatus(int id, String status) async {
    if (_busy) return;
    setState(() => _busy = true);
    try {
      await ref.read(apiClientProvider).post(
        '/teacher/exams/$id/status',
        data: {'status': status},
      );
      await _loadAll();
    } catch (e) {
      if (!mounted) return;
      setState(() => _error = mapDioError(e).code);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _addExamQuestion() async {
    if (_busy || _openedId == null) return;
    setState(() {
      _busy = true;
      _error = null;
      _notice = null;
    });
    try {
      await ref.read(apiClientProvider).post(
        '/teacher/exams/$_openedId/questions',
        data: {
          'questionText': _qText.text.trim(),
          'optionA': _qa.text.trim(),
          'optionB': _qb.text.trim(),
          'optionC': _qc.text.trim(),
          'optionD': _qd.text.trim(),
          'correctOption': _correct,
          'points': int.tryParse(_qPoints.text.trim()) ?? 1,
        },
      );
      _qText.clear();
      _qa.clear();
      _qb.clear();
      _qc.clear();
      _qd.clear();
      if (!mounted) return;
      setState(() => _notice = AppLocalizations.of(context).questionSaved);
    } catch (e) {
      if (!mounted) return;
      setState(() => _error = mapDioError(e).code);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    return Scaffold(
      backgroundColor: AppColors.loginCanvas,
      appBar: KeytAppBar(title: l10n.exams),
      body: Column(
        children: [
          const OfflineBanner(),
          if (_notice != null)
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 8, 16, 0),
              child: Text(
                _notice!,
                style: const TextStyle(
                  color: AppColors.success,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ),
          if (_error != null)
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 8, 16, 0),
              child: Text(_error!, style: const TextStyle(color: AppColors.danger)),
            ),
          Expanded(
            child: _loading
                ? const Center(child: CircularProgressIndicator())
                : RefreshIndicator(
                    onRefresh: _loadAll,
                    child: ListView(
                      padding: const EdgeInsets.all(16),
                      children: [
                        Text(
                          l10n.createExam,
                          style: const TextStyle(
                            fontWeight: FontWeight.w800,
                            fontSize: 16,
                          ),
                        ),
                        TextField(
                          controller: _title,
                          decoration: InputDecoration(labelText: l10n.examTitle),
                        ),
                        DropdownButtonFormField<int>(
                          key: ValueKey('grade-$_grade'),
                          initialValue: _grade,
                          decoration: InputDecoration(labelText: l10n.gradePick),
                          items: [9, 10, 11, 12]
                              .map(
                                (g) => DropdownMenuItem(
                                  value: g,
                                  child: Text('$g'),
                                ),
                              )
                              .toList(),
                          onChanged: _busy
                              ? null
                              : (v) {
                                  setState(() => _grade = v ?? 9);
                                  _loadAll();
                                },
                        ),
                        if (_subjects.isEmpty)
                          Padding(
                            padding: const EdgeInsets.symmetric(vertical: 8),
                            child: Text(
                              l10n.noSubjectsAssigned,
                              style: const TextStyle(color: AppColors.inkMuted),
                            ),
                          )
                        else
                          DropdownButtonFormField<int>(
                            key: ValueKey(
                              'exam-subj-$_subjectId-${_subjects.length}',
                            ),
                            initialValue: _subjectId,
                            decoration: InputDecoration(labelText: l10n.subject),
                            items: _subjects
                                .map((s) {
                                  final id = (s['id'] as num?)?.toInt();
                                  if (id == null) return null;
                                  return DropdownMenuItem(
                                    value: id,
                                    child: Text((s['name'] ?? s['subjectName'] ?? '')
                                        .toString()),
                                  );
                                })
                                .whereType<DropdownMenuItem<int>>()
                                .toList(),
                            onChanged: _busy
                                ? null
                                : (v) => setState(() => _subjectId = v),
                          ),
                        if (_sections.isEmpty)
                          Padding(
                            padding: const EdgeInsets.symmetric(vertical: 8),
                            child: Text(
                              l10n.noSections,
                              style: const TextStyle(color: AppColors.inkMuted),
                            ),
                          )
                        else
                          DropdownButtonFormField<String>(
                            key: ValueKey(
                              'section-$_section-${_sections.length}',
                            ),
                            initialValue: _section,
                            decoration: InputDecoration(labelText: l10n.section),
                            items: _sections
                                .map(
                                  (s) => DropdownMenuItem(
                                    value: s,
                                    child: Text(s),
                                  ),
                                )
                                .toList(),
                            onChanged: _busy
                                ? null
                                : (v) => setState(() => _section = v),
                          ),
                        TextField(
                          controller: _password,
                          decoration:
                              InputDecoration(labelText: l10n.examPassword),
                        ),
                        TextField(
                          controller: _duration,
                          keyboardType: TextInputType.number,
                          decoration:
                              InputDecoration(labelText: l10n.durationMinutes),
                        ),
                        const SizedBox(height: 8),
                        FilledButton(
                          onPressed: _busy ? null : _createExam,
                          child: Text(l10n.createExam),
                        ),
                        const SizedBox(height: 24),
                        Text(
                          l10n.exams,
                          style: const TextStyle(fontWeight: FontWeight.w800),
                        ),
                        if (_exams.isEmpty)
                          Text(
                            l10n.emptyExams,
                            style: const TextStyle(color: AppColors.inkMuted),
                          )
                        else
                          ..._exams.map((exam) {
                            final id = (exam['id'] as num?)?.toInt() ?? 0;
                            final status = (exam['status'] ?? '').toString();
                            return Card(
                              child: Padding(
                                padding: const EdgeInsets.all(12),
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                      (exam['examTitle'] ?? exam['title'] ?? '')
                                          .toString(),
                                      style: const TextStyle(
                                        fontWeight: FontWeight.w700,
                                      ),
                                    ),
                                    Text(
                                      '$status · ${exam['section'] ?? ''}',
                                      style: const TextStyle(
                                        fontSize: 12,
                                        color: AppColors.inkMuted,
                                      ),
                                    ),
                                    const SizedBox(height: 8),
                                    Wrap(
                                      spacing: 8,
                                      children: [
                                        if (status == 'Draft')
                                          TextButton(
                                            onPressed: _busy
                                                ? null
                                                : () => _setStatus(
                                                      id,
                                                      'Published',
                                                    ),
                                            child: Text(l10n.publishExam),
                                          ),
                                        if (status == 'Published')
                                          TextButton(
                                            onPressed: _busy
                                                ? null
                                                : () => _setStatus(id, 'Closed'),
                                            child: Text(l10n.closeExam),
                                          ),
                                        TextButton(
                                          onPressed: () => setState(() {
                                            _openedId = id;
                                          }),
                                          child: Text(l10n.addExamQuestion),
                                        ),
                                      ],
                                    ),
                                  ],
                                ),
                              ),
                            );
                          }),
                        if (_openedId != null) ...[
                          const SizedBox(height: 16),
                          Text(
                            '${l10n.addExamQuestion} (#$_openedId)',
                            style: const TextStyle(fontWeight: FontWeight.w800),
                          ),
                          TextField(
                            controller: _qText,
                            minLines: 2,
                            maxLines: 4,
                            decoration:
                                InputDecoration(labelText: l10n.questionStem),
                          ),
                          TextField(
                            controller: _qa,
                            decoration: const InputDecoration(labelText: 'A'),
                          ),
                          TextField(
                            controller: _qb,
                            decoration: const InputDecoration(labelText: 'B'),
                          ),
                          TextField(
                            controller: _qc,
                            decoration: const InputDecoration(labelText: 'C'),
                          ),
                          TextField(
                            controller: _qd,
                            decoration: const InputDecoration(labelText: 'D'),
                          ),
                          DropdownButtonFormField<String>(
                            key: ValueKey('exam-correct-$_correct'),
                            initialValue: _correct,
                            decoration:
                                InputDecoration(labelText: l10n.correctOption),
                            items: const ['A', 'B', 'C', 'D']
                                .map(
                                  (v) => DropdownMenuItem(
                                    value: v,
                                    child: Text(v),
                                  ),
                                )
                                .toList(),
                            onChanged: _busy
                                ? null
                                : (v) => setState(() => _correct = v ?? 'A'),
                          ),
                          TextField(
                            controller: _qPoints,
                            keyboardType: TextInputType.number,
                            decoration:
                                InputDecoration(labelText: l10n.pointsLabel),
                          ),
                          const SizedBox(height: 8),
                          FilledButton(
                            onPressed: _busy ? null : _addExamQuestion,
                            child: Text(l10n.saveQuestion),
                          ),
                        ],
                      ],
                    ),
                  ),
          ),
        ],
      ),
    );
  }
}

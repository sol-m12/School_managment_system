import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/api/api_client.dart';
import '../../../core/providers.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/widgets/keyt_app_bar.dart';
import '../../../core/widgets/offline_banner.dart';
import '../../../l10n/app_localizations.dart';

/// Same API as website Question Bank: list + add questions + generate paper.
class QuestionBankScreen extends ConsumerStatefulWidget {
  const QuestionBankScreen({super.key});

  @override
  ConsumerState<QuestionBankScreen> createState() => _QuestionBankScreenState();
}

class _QuestionBankScreenState extends ConsumerState<QuestionBankScreen> {
  List<Map<String, dynamic>> _subjects = const [];
  List<Map<String, dynamic>> _questions = const [];
  List<Map<String, dynamic>> _papers = const [];
  bool _loading = true;
  bool _busy = false;
  String? _error;
  String? _notice;

  int? _subjectId;
  final _topic = TextEditingController();
  final _stem = TextEditingController();
  final _a = TextEditingController();
  final _b = TextEditingController();
  final _c = TextEditingController();
  final _d = TextEditingController();
  String _correct = 'A';
  final _points = TextEditingController(text: '1');

  final _paperTitle = TextEditingController();
  final _paperCount = TextEditingController(text: '5');
  int? _paperSubjectId;

  @override
  void initState() {
    super.initState();
    Future.microtask(_load);
  }

  @override
  void dispose() {
    _topic.dispose();
    _stem.dispose();
    _a.dispose();
    _b.dispose();
    _c.dispose();
    _d.dispose();
    _points.dispose();
    _paperTitle.dispose();
    _paperCount.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final res = await ref
          .read(apiClientProvider)
          .get<Map<String, dynamic>>('/teacher/office/questions');
      final data = res.data ?? {};
      List<Map<String, dynamic>> maps(Object? raw) {
        if (raw is! List) return const [];
        return raw
            .whereType<Map>()
            .map((e) => Map<String, dynamic>.from(e))
            .toList();
      }

      if (!mounted) return;
      setState(() {
        _subjects = maps(data['subjects']);
        _questions = maps(data['questions']);
        _papers = maps(data['papers']);
        _subjectId ??= _subjects.isNotEmpty
            ? (_subjects.first['id'] as num?)?.toInt()
            : null;
        _paperSubjectId ??= _subjectId;
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

  Future<void> _addQuestion() async {
    if (_busy || _subjectId == null) return;
    setState(() {
      _busy = true;
      _error = null;
      _notice = null;
    });
    try {
      await ref.read(apiClientProvider).post(
        '/teacher/office/questions',
        data: {
          'subjectId': _subjectId,
          'topic': _topic.text.trim(),
          'stem': _stem.text.trim(),
          'optionA': _a.text.trim(),
          'optionB': _b.text.trim(),
          'optionC': _c.text.trim(),
          'optionD': _d.text.trim(),
          'correct': _correct,
          'points': int.tryParse(_points.text.trim()) ?? 1,
        },
      );
      _topic.clear();
      _stem.clear();
      _a.clear();
      _b.clear();
      _c.clear();
      _d.clear();
      if (!mounted) return;
      setState(() => _notice = AppLocalizations.of(context).questionSaved);
      await _load();
    } catch (e) {
      if (!mounted) return;
      setState(() => _error = mapDioError(e).code);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _generatePaper() async {
    if (_busy || _paperSubjectId == null) return;
    setState(() {
      _busy = true;
      _error = null;
      _notice = null;
    });
    try {
      await ref.read(apiClientProvider).post(
        '/teacher/office/papers',
        data: {
          'subjectId': _paperSubjectId,
          'title': _paperTitle.text.trim(),
          'count': int.tryParse(_paperCount.text.trim()) ?? 5,
        },
      );
      _paperTitle.clear();
      if (!mounted) return;
      setState(() => _notice = AppLocalizations.of(context).paperGenerated);
      await _load();
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
      appBar: KeytAppBar(title: l10n.questionBank),
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
                    onRefresh: _load,
                    child: ListView(
                      padding: const EdgeInsets.all(16),
                      children: [
                        Text(
                          l10n.addQuestion,
                          style: const TextStyle(
                            fontWeight: FontWeight.w800,
                            fontSize: 16,
                          ),
                        ),
                        const SizedBox(height: 8),
                        DropdownButtonFormField<int>(
                          key: ValueKey('qb-subj-$_subjectId-${_subjects.length}'),
                          initialValue: _subjectId,
                          decoration: InputDecoration(labelText: l10n.subject),
                          items: _subjects
                              .map((s) {
                                final id = (s['id'] as num?)?.toInt();
                                if (id == null) return null;
                                return DropdownMenuItem(
                                  value: id,
                                  child: Text((s['name'] ?? '').toString()),
                                );
                              })
                              .whereType<DropdownMenuItem<int>>()
                              .toList(),
                          onChanged: _busy
                              ? null
                              : (v) => setState(() => _subjectId = v),
                        ),
                        TextField(
                          controller: _topic,
                          decoration: InputDecoration(labelText: l10n.topic),
                        ),
                        TextField(
                          controller: _stem,
                          minLines: 2,
                          maxLines: 4,
                          decoration: InputDecoration(labelText: l10n.questionStem),
                        ),
                        TextField(
                          controller: _a,
                          decoration: const InputDecoration(labelText: 'A'),
                        ),
                        TextField(
                          controller: _b,
                          decoration: const InputDecoration(labelText: 'B'),
                        ),
                        TextField(
                          controller: _c,
                          decoration: const InputDecoration(labelText: 'C'),
                        ),
                        TextField(
                          controller: _d,
                          decoration: const InputDecoration(labelText: 'D'),
                        ),
                        DropdownButtonFormField<String>(
                          key: ValueKey('correct-$_correct'),
                          initialValue: _correct,
                          decoration: InputDecoration(labelText: l10n.correctOption),
                          items: const ['A', 'B', 'C', 'D']
                              .map(
                                (v) => DropdownMenuItem(value: v, child: Text(v)),
                              )
                              .toList(),
                          onChanged: _busy
                              ? null
                              : (v) => setState(() => _correct = v ?? 'A'),
                        ),
                        TextField(
                          controller: _points,
                          keyboardType: TextInputType.number,
                          decoration: InputDecoration(labelText: l10n.pointsLabel),
                        ),
                        const SizedBox(height: 8),
                        FilledButton(
                          onPressed: _busy ? null : _addQuestion,
                          child: Text(l10n.saveQuestion),
                        ),
                        const SizedBox(height: 24),
                        Text(
                          l10n.generatePaper,
                          style: const TextStyle(
                            fontWeight: FontWeight.w800,
                            fontSize: 16,
                          ),
                        ),
                        DropdownButtonFormField<int>(
                          key: ValueKey(
                            'paper-subj-$_paperSubjectId-${_subjects.length}',
                          ),
                          initialValue: _paperSubjectId,
                          decoration: InputDecoration(labelText: l10n.subject),
                          items: _subjects
                              .map((s) {
                                final id = (s['id'] as num?)?.toInt();
                                if (id == null) return null;
                                return DropdownMenuItem(
                                  value: id,
                                  child: Text((s['name'] ?? '').toString()),
                                );
                              })
                              .whereType<DropdownMenuItem<int>>()
                              .toList(),
                          onChanged: _busy
                              ? null
                              : (v) => setState(() => _paperSubjectId = v),
                        ),
                        TextField(
                          controller: _paperTitle,
                          decoration: InputDecoration(labelText: l10n.paperTitle),
                        ),
                        TextField(
                          controller: _paperCount,
                          keyboardType: TextInputType.number,
                          decoration: InputDecoration(labelText: l10n.questionCount),
                        ),
                        const SizedBox(height: 8),
                        FilledButton(
                          onPressed: _busy ? null : _generatePaper,
                          child: Text(l10n.generatePaper),
                        ),
                        const SizedBox(height: 24),
                        Text(
                          '${l10n.questionBank} (${_questions.length})',
                          style: const TextStyle(fontWeight: FontWeight.w800),
                        ),
                        const SizedBox(height: 8),
                        if (_questions.isEmpty)
                          Text(
                            l10n.emptyQuestionsBank,
                            style: const TextStyle(color: AppColors.inkMuted),
                          )
                        else
                          ..._questions.map(
                            (q) => Card(
                              child: ListTile(
                                title: Text((q['stem'] ?? '').toString()),
                                subtitle: Text(
                                  '${q['subject'] ?? ''} · ${q['topic'] ?? ''} · ${q['points'] ?? ''}',
                                ),
                              ),
                            ),
                          ),
                        const SizedBox(height: 16),
                        Text(
                          '${l10n.papers} (${_papers.length})',
                          style: const TextStyle(fontWeight: FontWeight.w800),
                        ),
                        ..._papers.map(
                          (p) => ListTile(
                            title: Text((p['title'] ?? '').toString()),
                            subtitle: Text(
                              '${p['subject'] ?? ''} · ${p['count'] ?? ''} · ${p['status'] ?? ''}',
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
          ),
        ],
      ),
    );
  }
}

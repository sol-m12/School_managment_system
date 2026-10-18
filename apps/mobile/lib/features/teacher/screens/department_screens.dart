import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/api/api_client.dart';
import '../../../core/providers.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/widgets/keyt_app_bar.dart';
import '../../../core/widgets/offline_banner.dart';
import '../../../l10n/app_localizations.dart';
import '../widgets/teacher_chrome.dart';

List<Map<String, dynamic>> _maps(Object? raw) {
  if (raw is! List) return const [];
  return raw
      .whereType<Map>()
      .map((e) => Map<String, dynamic>.from(e))
      .toList();
}

/// Department curriculum: approve plans + add standards.
class TeacherCurriculumScreen extends ConsumerStatefulWidget {
  const TeacherCurriculumScreen({super.key});

  @override
  ConsumerState<TeacherCurriculumScreen> createState() =>
      _TeacherCurriculumScreenState();
}

class _TeacherCurriculumScreenState
    extends ConsumerState<TeacherCurriculumScreen> {
  List<Map<String, dynamic>> _plans = const [];
  List<Map<String, dynamic>> _subjects = const [];
  List<Map<String, dynamic>> _standards = const [];
  bool _loading = true;
  bool _busy = false;
  String? _error;
  String? _notice;
  int? _subjectId;
  final _assessment = TextEditingController();
  final _maxScore = TextEditingController(text: '100');

  @override
  void initState() {
    super.initState();
    Future.microtask(_load);
  }

  @override
  void dispose() {
    _assessment.dispose();
    _maxScore.dispose();
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
          .get<Map<String, dynamic>>('/teacher/office/curriculum');
      if (!mounted) return;
      final subjects = _maps(res.data?['subjects']);
      setState(() {
        _plans = _maps(res.data?['plans']);
        _subjects = subjects;
        _standards = _maps(res.data?['standards']);
        _subjectId ??= subjects.isNotEmpty
            ? (subjects.first['id'] as num?)?.toInt()
            : null;
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

  Future<void> _approve(int id) async {
    if (_busy) return;
    setState(() => _busy = true);
    try {
      await ref
          .read(apiClientProvider)
          .post('/teacher/office/plans/$id/approve');
      if (!mounted) return;
      setState(() => _notice = AppLocalizations.of(context).savedGeneric);
      await _load();
    } catch (e) {
      if (!mounted) return;
      setState(() => _error = mapDioError(e).code);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _addStandard() async {
    if (_busy || _subjectId == null) return;
    setState(() => _busy = true);
    try {
      await ref.read(apiClientProvider).post(
        '/teacher/office/standards',
        data: {
          'subjectId': _subjectId,
          'assessmentName': _assessment.text.trim(),
          'maxScore': int.tryParse(_maxScore.text.trim()) ?? 100,
        },
      );
      _assessment.clear();
      if (!mounted) return;
      setState(() => _notice = AppLocalizations.of(context).savedGeneric);
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
      appBar: KeytAppBar(title: l10n.curriculumTitle),
      body: SafeArea(
        child: Column(
          children: [
            const OfflineBanner(),
            Expanded(
              child: _loading
                  ? const Center(child: CircularProgressIndicator())
                  : RefreshIndicator(
                      onRefresh: _load,
                      child: ListView(
                        physics: const AlwaysScrollableScrollPhysics(),
                        padding: const EdgeInsets.all(16),
                        children: [
                          if (_notice != null)
                            Text(_notice!,
                                style: const TextStyle(
                                    color: AppColors.success,
                                    fontWeight: FontWeight.w600)),
                          if (_error != null)
                            Text(_error!,
                                style:
                                    const TextStyle(color: AppColors.danger)),
                          ..._plans.map((p) {
                            final id = (p['id'] as num?)?.toInt();
                            final status = (p['status'] ?? '').toString();
                            return Padding(
                              padding: const EdgeInsets.only(bottom: 8),
                              child: TeacherSectionCard(
                                padding: const EdgeInsets.all(12),
                                child: Row(
                                  children: [
                                    Expanded(
                                      child: Text(
                                        '${p['subject'] ?? ''} · ${p['topic'] ?? p['plan'] ?? ''}',
                                        style: const TextStyle(
                                            fontWeight: FontWeight.w700),
                                      ),
                                    ),
                                    Text(status),
                                    if (status == 'Draft' && id != null)
                                      TextButton(
                                        onPressed:
                                            _busy ? null : () => _approve(id),
                                        child: Text(l10n.approveAction),
                                      ),
                                  ],
                                ),
                              ),
                            );
                          }),
                          const SizedBox(height: 12),
                          if (_subjects.isNotEmpty)
                            DropdownButtonFormField<int>(
                              initialValue: _subjectId,
                              decoration:
                                  InputDecoration(labelText: l10n.subject),
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
                              onChanged: (v) => setState(() => _subjectId = v),
                            ),
                          TextField(
                            controller: _assessment,
                            decoration: InputDecoration(
                                labelText: l10n.gradeWorkflowTitle),
                          ),
                          TextField(
                            controller: _maxScore,
                            keyboardType: TextInputType.number,
                            decoration: const InputDecoration(
                                labelText: 'Max score'),
                          ),
                          FilledButton(
                            onPressed: _busy ? null : _addStandard,
                            child: Text(l10n.savedGeneric),
                          ),
                          ..._standards.map((s) => Padding(
                                padding: const EdgeInsets.only(top: 8),
                                child: TeacherSectionCard(
                                  padding: const EdgeInsets.all(12),
                                  child: Text(
                                      '${s['subject'] ?? ''} · ${s['assessmentName'] ?? ''} (${s['maxScore']})'),
                                ),
                              )),
                        ],
                      ),
                    ),
            ),
          ],
        ),
      ),
    );
  }
}

/// Grade collection workflow (approve / send) — not mark entry.
class TeacherGradeWorkflowScreen extends ConsumerStatefulWidget {
  const TeacherGradeWorkflowScreen({super.key});

  @override
  ConsumerState<TeacherGradeWorkflowScreen> createState() =>
      _TeacherGradeWorkflowScreenState();
}

class _TeacherGradeWorkflowScreenState
    extends ConsumerState<TeacherGradeWorkflowScreen> {
  List<Map<String, dynamic>> _rows = const [];
  bool _loading = true;
  bool _busy = false;
  String? _error;
  String? _notice;

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
      final res = await ref
          .read(apiClientProvider)
          .get<Map<String, dynamic>>('/teacher/office/grades');
      if (!mounted) return;
      setState(() {
        _rows = _maps(res.data?['rows']);
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

  Future<void> _act(int id, String action) async {
    if (_busy) return;
    setState(() => _busy = true);
    try {
      await ref
          .read(apiClientProvider)
          .post('/teacher/office/grades/$id/$action');
      if (!mounted) return;
      setState(() => _notice = AppLocalizations.of(context).savedGeneric);
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
      appBar: KeytAppBar(title: l10n.gradeWorkflowTitle),
      body: SafeArea(
        child: Column(
          children: [
            const OfflineBanner(),
            Expanded(
              child: _loading
                  ? const Center(child: CircularProgressIndicator())
                  : RefreshIndicator(
                      onRefresh: _load,
                      child: ListView(
                        physics: const AlwaysScrollableScrollPhysics(),
                        padding: const EdgeInsets.all(16),
                        children: [
                          if (_notice != null)
                            Text(_notice!,
                                style: const TextStyle(
                                    color: AppColors.success,
                                    fontWeight: FontWeight.w600)),
                          if (_error != null)
                            Text(_error!,
                                style:
                                    const TextStyle(color: AppColors.danger)),
                          if (_rows.isEmpty)
                            TeacherSectionCard(
                              child: Text(l10n.emptyCatalog,
                                  style: const TextStyle(
                                      color: AppColors.inkMuted)),
                            )
                          else
                            ..._rows.map((r) {
                              final id = (r['id'] as num?)?.toInt();
                              final review = (r['review'] ?? '').toString();
                              return Padding(
                                padding: const EdgeInsets.only(bottom: 8),
                                child: TeacherSectionCard(
                                  padding: const EdgeInsets.all(12),
                                  child: Column(
                                    crossAxisAlignment:
                                        CrossAxisAlignment.stretch,
                                    children: [
                                      Text(
                                        '${r['student'] ?? ''} · ${r['subject'] ?? ''}',
                                        style: const TextStyle(
                                            fontWeight: FontWeight.w800),
                                      ),
                                      Text(
                                          '${r['score']}/${r['maxScore']} · ${r['assessment'] ?? ''}'),
                                      Row(
                                        children: [
                                          if (review.isEmpty && id != null)
                                            TextButton(
                                              onPressed: _busy
                                                  ? null
                                                  : () => _act(id, 'approve'),
                                              child: Text(l10n.approveAction),
                                            ),
                                          if (review == 'Approved' &&
                                              id != null)
                                            TextButton(
                                              onPressed: _busy
                                                  ? null
                                                  : () => _act(id, 'send'),
                                              child: Text(l10n.sendAction),
                                            ),
                                          Text(review),
                                        ],
                                      ),
                                    ],
                                  ),
                                ),
                              );
                            }),
                        ],
                      ),
                    ),
            ),
          ],
        ),
      ),
    );
  }
}

class TeacherProcurementScreen extends ConsumerStatefulWidget {
  const TeacherProcurementScreen({super.key});

  @override
  ConsumerState<TeacherProcurementScreen> createState() =>
      _TeacherProcurementScreenState();
}

class _TeacherProcurementScreenState
    extends ConsumerState<TeacherProcurementScreen> {
  List<Map<String, dynamic>> _rows = const [];
  bool _loading = true;
  bool _busy = false;
  String? _error;
  String? _notice;
  final _item = TextEditingController();
  final _qty = TextEditingController(text: '1');
  final _purpose = TextEditingController();

  @override
  void initState() {
    super.initState();
    Future.microtask(_load);
  }

  @override
  void dispose() {
    _item.dispose();
    _qty.dispose();
    _purpose.dispose();
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
          .get<Map<String, dynamic>>('/teacher/office/requisitions');
      if (!mounted) return;
      setState(() {
        _rows = _maps(res.data?['rows']);
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

  Future<void> _add() async {
    if (_busy || _item.text.trim().isEmpty) return;
    setState(() => _busy = true);
    try {
      await ref.read(apiClientProvider).post(
        '/teacher/office/requisitions',
        data: {
          'itemName': _item.text.trim(),
          'quantity': int.tryParse(_qty.text.trim()) ?? 1,
          'purpose': _purpose.text.trim(),
        },
      );
      _item.clear();
      _purpose.clear();
      if (!mounted) return;
      setState(() => _notice = AppLocalizations.of(context).savedGeneric);
      await _load();
    } catch (e) {
      if (!mounted) return;
      setState(() => _error = mapDioError(e).code);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _send(int id) async {
    if (_busy) return;
    setState(() => _busy = true);
    try {
      await ref
          .read(apiClientProvider)
          .post('/teacher/office/requisitions/$id/send');
      if (!mounted) return;
      setState(() => _notice = AppLocalizations.of(context).savedGeneric);
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
      appBar: KeytAppBar(title: l10n.procurementTitle),
      body: SafeArea(
        child: Column(
          children: [
            const OfflineBanner(),
            Expanded(
              child: _loading
                  ? const Center(child: CircularProgressIndicator())
                  : RefreshIndicator(
                      onRefresh: _load,
                      child: ListView(
                        physics: const AlwaysScrollableScrollPhysics(),
                        padding: const EdgeInsets.all(16),
                        children: [
                          if (_notice != null)
                            Text(_notice!,
                                style: const TextStyle(
                                    color: AppColors.success,
                                    fontWeight: FontWeight.w600)),
                          if (_error != null)
                            Text(_error!,
                                style:
                                    const TextStyle(color: AppColors.danger)),
                          TeacherSectionCard(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.stretch,
                              children: [
                                TextField(
                                    controller: _item,
                                    decoration: InputDecoration(
                                        labelText: l10n.lfTitle)),
                                TextField(
                                    controller: _qty,
                                    keyboardType: TextInputType.number,
                                    decoration: const InputDecoration(
                                        labelText: 'Qty')),
                                TextField(
                                    controller: _purpose,
                                    decoration: InputDecoration(
                                        labelText: l10n.lfDescription)),
                                FilledButton(
                                    onPressed: _busy ? null : _add,
                                    child: Text(l10n.savedGeneric)),
                              ],
                            ),
                          ),
                          const SizedBox(height: 12),
                          ..._rows.map((r) {
                            final id = (r['id'] as num?)?.toInt();
                            final status = (r['status'] ?? '').toString();
                            return Padding(
                              padding: const EdgeInsets.only(bottom: 8),
                              child: TeacherSectionCard(
                                padding: const EdgeInsets.all(12),
                                child: Row(
                                  children: [
                                    Expanded(
                                      child: Text(
                                          '${r['itemName']} × ${r['quantity']}'),
                                    ),
                                    Text(status),
                                    if (status == 'Submitted' && id != null)
                                      TextButton(
                                        onPressed:
                                            _busy ? null : () => _send(id),
                                        child: Text(l10n.sendAction),
                                      ),
                                  ],
                                ),
                              ),
                            );
                          }),
                        ],
                      ),
                    ),
            ),
          ],
        ),
      ),
    );
  }
}

class TeacherCoverageScreen extends ConsumerStatefulWidget {
  const TeacherCoverageScreen({super.key});

  @override
  ConsumerState<TeacherCoverageScreen> createState() =>
      _TeacherCoverageScreenState();
}

class _TeacherCoverageScreenState extends ConsumerState<TeacherCoverageScreen> {
  List<Map<String, dynamic>> _topics = const [];
  bool _loading = true;
  bool _busy = false;
  String? _error;
  String? _notice;

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
      final res = await ref
          .read(apiClientProvider)
          .get<Map<String, dynamic>>('/teacher/office/coverage');
      if (!mounted) return;
      setState(() {
        _topics = _maps(res.data?['topics']);
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

  Future<void> _mark(int planDetailId) async {
    if (_busy) return;
    setState(() => _busy = true);
    try {
      final today = DateTime.now();
      final coveredOn =
          '${today.year.toString().padLeft(4, '0')}-${today.month.toString().padLeft(2, '0')}-${today.day.toString().padLeft(2, '0')}';
      await ref.read(apiClientProvider).post(
        '/teacher/office/coverage',
        data: {'planDetailId': planDetailId, 'coveredOn': coveredOn},
      );
      if (!mounted) return;
      setState(() => _notice = AppLocalizations.of(context).savedGeneric);
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
      appBar: KeytAppBar(title: l10n.coverageTitle),
      body: SafeArea(
        child: Column(
          children: [
            const OfflineBanner(),
            Expanded(
              child: _loading
                  ? const Center(child: CircularProgressIndicator())
                  : RefreshIndicator(
                      onRefresh: _load,
                      child: ListView(
                        physics: const AlwaysScrollableScrollPhysics(),
                        padding: const EdgeInsets.all(16),
                        children: [
                          if (_notice != null)
                            Text(_notice!,
                                style: const TextStyle(
                                    color: AppColors.success,
                                    fontWeight: FontWeight.w600)),
                          if (_error != null)
                            Text(_error!,
                                style:
                                    const TextStyle(color: AppColors.danger)),
                          ..._topics.map((t) {
                            final id = (t['id'] as num?)?.toInt();
                            final covered = t['covered'] == true;
                            final status = (t['status'] ?? '').toString();
                            return Padding(
                              padding: const EdgeInsets.only(bottom: 8),
                              child: TeacherSectionCard(
                                padding: const EdgeInsets.all(12),
                                child: Row(
                                  children: [
                                    Expanded(
                                      child: Text(
                                        '${t['subject'] ?? ''} W${t['week'] ?? ''} · ${t['topic'] ?? ''}',
                                        style: const TextStyle(
                                            fontWeight: FontWeight.w700),
                                      ),
                                    ),
                                    if (!covered &&
                                        status == 'Approved' &&
                                        id != null)
                                      TextButton(
                                        onPressed:
                                            _busy ? null : () => _mark(id),
                                        child: Text(l10n.approveAction),
                                      )
                                    else
                                      Text(covered ? '✓' : status),
                                  ],
                                ),
                              ),
                            );
                          }),
                        ],
                      ),
                    ),
            ),
          ],
        ),
      ),
    );
  }
}

class TeacherEvaluationScreen extends ConsumerStatefulWidget {
  const TeacherEvaluationScreen({super.key});

  @override
  ConsumerState<TeacherEvaluationScreen> createState() =>
      _TeacherEvaluationScreenState();
}

class _TeacherEvaluationScreenState
    extends ConsumerState<TeacherEvaluationScreen> {
  List<Map<String, dynamic>> _teachers = const [];
  List<Map<String, dynamic>> _rows = const [];
  List<Map<String, dynamic>> _criteria = const [];
  bool _loading = true;
  bool _busy = false;
  String? _error;
  String? _notice;
  int? _staffId;
  String _term = '1';
  final _note = TextEditingController();
  final Map<String, TextEditingController> _scores = {};

  @override
  void initState() {
    super.initState();
    Future.microtask(_load);
  }

  @override
  void dispose() {
    _note.dispose();
    for (final c in _scores.values) {
      c.dispose();
    }
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
          .get<Map<String, dynamic>>('/teacher/office/evaluations');
      if (!mounted) return;
      final teachers = _maps(res.data?['teachers']);
      final criteria = _maps(res.data?['criteria']);
      for (final c in criteria) {
        final key = (c['key'] ?? '').toString();
        if (key.isNotEmpty) {
          _scores.putIfAbsent(key, () => TextEditingController(text: '0'));
        }
      }
      setState(() {
        _teachers = teachers;
        _rows = _maps(res.data?['rows']);
        _criteria = criteria;
        _staffId ??= teachers.isNotEmpty
            ? (teachers.first['id'] as num?)?.toInt()
            : null;
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

  Future<void> _save() async {
    if (_busy || _staffId == null) return;
    setState(() => _busy = true);
    try {
      final scores = <String, int>{};
      for (final e in _scores.entries) {
        scores[e.key] = int.tryParse(e.value.text.trim()) ?? 0;
      }
      await ref.read(apiClientProvider).post(
        '/teacher/office/evaluations',
        data: {
          'staffId': _staffId,
          'term': _term,
          'note': _note.text.trim(),
          'scores': scores,
        },
      );
      if (!mounted) return;
      setState(() => _notice = AppLocalizations.of(context).savedGeneric);
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
      appBar: KeytAppBar(title: l10n.evaluationTitle),
      body: SafeArea(
        child: Column(
          children: [
            const OfflineBanner(),
            Expanded(
              child: _loading
                  ? const Center(child: CircularProgressIndicator())
                  : RefreshIndicator(
                      onRefresh: _load,
                      child: ListView(
                        physics: const AlwaysScrollableScrollPhysics(),
                        padding: const EdgeInsets.all(16),
                        children: [
                          if (_notice != null)
                            Text(_notice!,
                                style: const TextStyle(
                                    color: AppColors.success,
                                    fontWeight: FontWeight.w600)),
                          if (_error != null)
                            Text(_error!,
                                style:
                                    const TextStyle(color: AppColors.danger)),
                          if (_teachers.isNotEmpty)
                            DropdownButtonFormField<int>(
                              initialValue: _staffId,
                              decoration: InputDecoration(
                                  labelText: l10n.schChooseStudent),
                              items: _teachers
                                  .map((t) {
                                    final id = (t['id'] as num?)?.toInt();
                                    if (id == null) return null;
                                    return DropdownMenuItem(
                                      value: id,
                                      child: Text((t['name'] ?? '').toString()),
                                    );
                                  })
                                  .whereType<DropdownMenuItem<int>>()
                                  .toList(),
                              onChanged: (v) => setState(() => _staffId = v),
                            ),
                          DropdownButtonFormField<String>(
                            initialValue: _term,
                            decoration: const InputDecoration(labelText: 'Term'),
                            items: const [
                              DropdownMenuItem(value: '1', child: Text('1')),
                              DropdownMenuItem(value: '2', child: Text('2')),
                            ],
                            onChanged: (v) {
                              if (v != null) setState(() => _term = v);
                            },
                          ),
                          ..._criteria.map((c) {
                            final key = (c['key'] ?? '').toString();
                            return TextField(
                              controller: _scores[key],
                              keyboardType: TextInputType.number,
                              decoration: InputDecoration(
                                labelText: '$key (max ${c['max']})',
                              ),
                            );
                          }),
                          TextField(
                            controller: _note,
                            decoration:
                                InputDecoration(labelText: l10n.bookNote),
                          ),
                          FilledButton(
                            onPressed: _busy ? null : _save,
                            child: Text(l10n.savedGeneric),
                          ),
                          const SizedBox(height: 12),
                          ..._rows.map((r) => Padding(
                                padding: const EdgeInsets.only(bottom: 8),
                                child: TeacherSectionCard(
                                  padding: const EdgeInsets.all(12),
                                  child: Text(
                                      '${r['teacher']} · T${r['term']} · ${r['total']}/${r['max']}'),
                                ),
                              )),
                        ],
                      ),
                    ),
            ),
          ],
        ),
      ),
    );
  }
}

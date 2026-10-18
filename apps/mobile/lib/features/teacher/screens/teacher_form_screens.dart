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

String _today() {
  final d = DateTime.now();
  return '${d.year.toString().padLeft(4, '0')}-${d.month.toString().padLeft(2, '0')}-${d.day.toString().padLeft(2, '0')}';
}

class TeacherLeaveScreen extends ConsumerStatefulWidget {
  const TeacherLeaveScreen({super.key});

  @override
  ConsumerState<TeacherLeaveScreen> createState() => _TeacherLeaveScreenState();
}

class _TeacherLeaveScreenState extends ConsumerState<TeacherLeaveScreen> {
  List<Map<String, dynamic>> _mine = const [];
  bool _loading = true;
  bool _busy = false;
  String? _error;
  String? _notice;
  String _kind = 'Annual';
  final _starts = TextEditingController(text: _today());
  final _ends = TextEditingController(text: _today());
  final _reason = TextEditingController();

  @override
  void initState() {
    super.initState();
    Future.microtask(_load);
  }

  @override
  void dispose() {
    _starts.dispose();
    _ends.dispose();
    _reason.dispose();
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
          .get<Map<String, dynamic>>('/teacher/office/leave');
      if (!mounted) return;
      setState(() {
        _mine = _maps(res.data?['mine']);
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

  Future<void> _submit() async {
    if (_busy) return;
    setState(() => _busy = true);
    try {
      await ref.read(apiClientProvider).post(
        '/teacher/office/leave',
        data: {
          'kind': _kind,
          'startsOn': _starts.text.trim(),
          'endsOn': _ends.text.trim(),
          'reason': _reason.text.trim(),
        },
      );
      _reason.clear();
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
      appBar: KeytAppBar(title: l10n.leaveRequest),
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
                                DropdownButtonFormField<String>(
                                  initialValue: _kind,
                                  decoration: InputDecoration(
                                      labelText: l10n.lfKind),
                                  items: const [
                                    DropdownMenuItem(
                                        value: 'Annual',
                                        child: Text('Annual')),
                                    DropdownMenuItem(
                                        value: 'Sick', child: Text('Sick')),
                                    DropdownMenuItem(
                                        value: 'Other', child: Text('Other')),
                                  ],
                                  onChanged: (v) {
                                    if (v != null) setState(() => _kind = v);
                                  },
                                ),
                                TextField(
                                    controller: _starts,
                                    decoration: const InputDecoration(
                                        labelText: 'Starts (YYYY-MM-DD)')),
                                TextField(
                                    controller: _ends,
                                    decoration: const InputDecoration(
                                        labelText: 'Ends (YYYY-MM-DD)')),
                                TextField(
                                    controller: _reason,
                                    decoration: InputDecoration(
                                        labelText: l10n.lfDescription)),
                                FilledButton(
                                    onPressed: _busy ? null : _submit,
                                    child: Text(l10n.savedGeneric)),
                              ],
                            ),
                          ),
                          ..._mine.map((r) => Padding(
                                padding: const EdgeInsets.only(top: 8),
                                child: TeacherSectionCard(
                                  padding: const EdgeInsets.all(12),
                                  child: Text(
                                      '${r['kind']} ${r['startsOn']}–${r['endsOn']} · ${r['status']}'),
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

class TeacherIncidentsScreen extends ConsumerStatefulWidget {
  const TeacherIncidentsScreen({super.key});

  @override
  ConsumerState<TeacherIncidentsScreen> createState() =>
      _TeacherIncidentsScreenState();
}

class _TeacherIncidentsScreenState
    extends ConsumerState<TeacherIncidentsScreen> {
  List<Map<String, dynamic>> _mine = const [];
  List<Map<String, dynamic>> _students = const [];
  List<Map<String, dynamic>> _subjects = const [];
  bool _loading = true;
  bool _busy = false;
  String? _error;
  String? _notice;
  int? _studentId;
  int? _subjectId;
  final String _category = 'Behavior';
  final _summary = TextEditingController();

  @override
  void initState() {
    super.initState();
    Future.microtask(_load);
  }

  @override
  void dispose() {
    _summary.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final api = ref.read(apiClientProvider);
      final res =
          await api.get<Map<String, dynamic>>('/teacher/office/incidents');
      // Options often embedded; fall back to empty dropdowns.
      final students = _maps(res.data?['students']);
      final subjects = _maps(res.data?['subjects']);
      if (!mounted) return;
      setState(() {
        _mine = _maps(res.data?['mine']);
        _students = students;
        _subjects = subjects;
        _studentId ??= students.isNotEmpty
            ? (students.first['id'] as num?)?.toInt()
            : null;
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

  Future<void> _submit() async {
    if (_busy || _studentId == null || _subjectId == null) return;
    setState(() => _busy = true);
    try {
      await ref.read(apiClientProvider).post(
        '/teacher/office/incidents',
        data: {
          'studentId': _studentId,
          'subjectId': _subjectId,
          'category': _category,
          'summary': _summary.text.trim(),
        },
      );
      _summary.clear();
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
      appBar: KeytAppBar(title: l10n.incidents),
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
                                if (_students.isNotEmpty)
                                  DropdownButtonFormField<int>(
                                    initialValue: _studentId,
                                    decoration: InputDecoration(
                                        labelText: l10n.schChooseStudent),
                                    items: _students
                                        .map((s) {
                                          final id =
                                              (s['id'] as num?)?.toInt();
                                          if (id == null) return null;
                                          return DropdownMenuItem(
                                            value: id,
                                            child: Text((s['name'] ??
                                                    s['fullName'] ??
                                                    '')
                                                .toString()),
                                          );
                                        })
                                        .whereType<DropdownMenuItem<int>>()
                                        .toList(),
                                    onChanged: (v) =>
                                        setState(() => _studentId = v),
                                  )
                                else
                                  TextField(
                                    decoration: InputDecoration(
                                        labelText: 'studentId'),
                                    keyboardType: TextInputType.number,
                                    onChanged: (v) => setState(() =>
                                        _studentId = int.tryParse(v)),
                                  ),
                                if (_subjects.isNotEmpty)
                                  DropdownButtonFormField<int>(
                                    initialValue: _subjectId,
                                    decoration: InputDecoration(
                                        labelText: l10n.subject),
                                    items: _subjects
                                        .map((s) {
                                          final id =
                                              (s['id'] as num?)?.toInt();
                                          if (id == null) return null;
                                          return DropdownMenuItem(
                                            value: id,
                                            child: Text(
                                                (s['name'] ?? '').toString()),
                                          );
                                        })
                                        .whereType<DropdownMenuItem<int>>()
                                        .toList(),
                                    onChanged: (v) =>
                                        setState(() => _subjectId = v),
                                  )
                                else
                                  TextField(
                                    decoration: InputDecoration(
                                        labelText: 'subjectId'),
                                    keyboardType: TextInputType.number,
                                    onChanged: (v) => setState(() =>
                                        _subjectId = int.tryParse(v)),
                                  ),
                                TextField(
                                    controller: _summary,
                                    decoration: InputDecoration(
                                        labelText: l10n.lfDescription)),
                                FilledButton(
                                    onPressed: _busy ? null : _submit,
                                    child: Text(l10n.savedGeneric)),
                              ],
                            ),
                          ),
                          ..._mine.map((r) => Padding(
                                padding: const EdgeInsets.only(top: 8),
                                child: TeacherSectionCard(
                                  padding: const EdgeInsets.all(12),
                                  child: Text(
                                      '${r['summary'] ?? ''} · ${r['status'] ?? ''}'),
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

class TeacherStoreRequestScreen extends ConsumerStatefulWidget {
  const TeacherStoreRequestScreen({super.key});

  @override
  ConsumerState<TeacherStoreRequestScreen> createState() =>
      _TeacherStoreRequestScreenState();
}

class _TeacherStoreRequestScreenState
    extends ConsumerState<TeacherStoreRequestScreen> {
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
          .get<Map<String, dynamic>>('/teacher/store-requests');
      if (!mounted) return;
      setState(() {
        _rows = _maps(res.data?['rows'] ?? res.data?['requests']);
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

  Future<void> _submit() async {
    if (_busy || _item.text.trim().isEmpty) return;
    setState(() => _busy = true);
    try {
      await ref.read(apiClientProvider).post(
        '/teacher/store-requests',
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

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    return Scaffold(
      backgroundColor: AppColors.loginCanvas,
      appBar: KeytAppBar(title: l10n.storeRequests),
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
                                    onPressed: _busy ? null : _submit,
                                    child: Text(l10n.savedGeneric)),
                              ],
                            ),
                          ),
                          ..._rows.map((r) => Padding(
                                padding: const EdgeInsets.only(top: 8),
                                child: TeacherSectionCard(
                                  padding: const EdgeInsets.all(12),
                                  child: Text(
                                      '${r['itemName'] ?? r['title'] ?? ''} · ${r['status'] ?? ''}'),
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

class TeacherLibraryRecommendScreen extends ConsumerStatefulWidget {
  const TeacherLibraryRecommendScreen({super.key});

  @override
  ConsumerState<TeacherLibraryRecommendScreen> createState() =>
      _TeacherLibraryRecommendScreenState();
}

class _TeacherLibraryRecommendScreenState
    extends ConsumerState<TeacherLibraryRecommendScreen> {
  List<Map<String, dynamic>> _borrowed = const [];
  List<Map<String, dynamic>> _subjects = const [];
  List<Map<String, dynamic>> _recs = const [];
  bool _loading = true;
  bool _busy = false;
  String? _error;
  String? _notice;
  int? _subjectId;
  final _title = TextEditingController();
  final _author = TextEditingController();
  final _reason = TextEditingController();

  @override
  void initState() {
    super.initState();
    Future.microtask(_load);
  }

  @override
  void dispose() {
    _title.dispose();
    _author.dispose();
    _reason.dispose();
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
          .get<Map<String, dynamic>>('/teacher/office/library');
      if (!mounted) return;
      final subjects = _maps(res.data?['subjects']);
      setState(() {
        _borrowed = _maps(res.data?['borrowed']);
        _subjects = subjects;
        _recs = _maps(res.data?['recommendations']);
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

  Future<void> _recommend() async {
    if (_busy || _subjectId == null) return;
    setState(() => _busy = true);
    try {
      await ref.read(apiClientProvider).post(
        '/teacher/office/recommendations',
        data: {
          'subjectId': _subjectId,
          'title': _title.text.trim(),
          'author': _author.text.trim(),
          'reason': _reason.text.trim(),
        },
      );
      _title.clear();
      _author.clear();
      _reason.clear();
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
      appBar: KeytAppBar(title: l10n.library),
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
                          Text(l10n.borrowedBooks,
                              style: const TextStyle(
                                  fontWeight: FontWeight.w800)),
                          ..._borrowed.map((b) => Padding(
                                padding: const EdgeInsets.only(top: 6),
                                child: TeacherSectionCard(
                                  padding: const EdgeInsets.all(10),
                                  child: Text((b['title'] ?? '').toString()),
                                ),
                              )),
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
                                      child:
                                          Text((s['name'] ?? '').toString()),
                                    );
                                  })
                                  .whereType<DropdownMenuItem<int>>()
                                  .toList(),
                              onChanged: (v) => setState(() => _subjectId = v),
                            ),
                          TextField(
                              controller: _title,
                              decoration:
                                  InputDecoration(labelText: l10n.lfTitle)),
                          TextField(
                              controller: _author,
                              decoration:
                                  InputDecoration(labelText: l10n.author)),
                          TextField(
                              controller: _reason,
                              decoration:
                                  InputDecoration(labelText: l10n.bookNote)),
                          FilledButton(
                              onPressed: _busy ? null : _recommend,
                              child: Text(l10n.savedGeneric)),
                          ..._recs.map((r) => Padding(
                                padding: const EdgeInsets.only(top: 8),
                                child: TeacherSectionCard(
                                  padding: const EdgeInsets.all(10),
                                  child: Text(
                                      '${r['title']} · ${r['subject'] ?? ''}'),
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

class TeacherParticipationScreen extends ConsumerStatefulWidget {
  const TeacherParticipationScreen({super.key});

  @override
  ConsumerState<TeacherParticipationScreen> createState() =>
      _TeacherParticipationScreenState();
}

class _TeacherParticipationScreenState
    extends ConsumerState<TeacherParticipationScreen> {
  List<Map<String, dynamic>> _students = const [];
  List<Map<String, dynamic>> _subjects = const [];
  bool _loading = true;
  bool _busy = false;
  String? _error;
  String? _notice;
  int? _subjectId;
  final _date = TextEditingController(text: _today());

  @override
  void initState() {
    super.initState();
    Future.microtask(_load);
  }

  @override
  void dispose() {
    _date.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final res = await ref.read(apiClientProvider).get<Map<String, dynamic>>(
        '/teacher/office/participation',
        queryParameters: {
          if (_subjectId != null) 'subjectId': _subjectId,
          'date': _date.text.trim(),
        },
      );
      if (!mounted) return;
      final subjects = _maps(res.data?['subjects']);
      setState(() {
        _students = _maps(res.data?['students'] ?? res.data?['rows']);
        _subjects = subjects;
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

  Future<void> _mark(int studentId) async {
    if (_busy || _subjectId == null) return;
    setState(() => _busy = true);
    try {
      await ref.read(apiClientProvider).post(
        '/teacher/office/participation',
        data: {
          'studentId': studentId,
          'subjectId': _subjectId,
          'markedOn': _date.text.trim(),
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
      appBar: KeytAppBar(title: l10n.participation),
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
                                      child:
                                          Text((s['name'] ?? '').toString()),
                                    );
                                  })
                                  .whereType<DropdownMenuItem<int>>()
                                  .toList(),
                              onChanged: (v) {
                                setState(() => _subjectId = v);
                                _load();
                              },
                            ),
                          TextField(
                              controller: _date,
                              decoration: const InputDecoration(
                                  labelText: 'Date YYYY-MM-DD'),
                              onSubmitted: (_) => _load()),
                          ..._students.map((s) {
                            final id = (s['id'] as num?)?.toInt() ??
                                (s['studentId'] as num?)?.toInt();
                            final marked = s['marked'] == true;
                            return Padding(
                              padding: const EdgeInsets.only(top: 8),
                              child: TeacherSectionCard(
                                padding: const EdgeInsets.all(12),
                                child: Row(
                                  children: [
                                    Expanded(
                                      child: Text((s['name'] ?? s['fullName'] ?? '')
                                          .toString()),
                                    ),
                                    if (!marked && id != null)
                                      TextButton(
                                        onPressed:
                                            _busy ? null : () => _mark(id),
                                        child: Text(l10n.approveAction),
                                      )
                                    else
                                      const Text('✓'),
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

class TeacherLessonPlansScreen extends ConsumerStatefulWidget {
  const TeacherLessonPlansScreen({super.key});

  @override
  ConsumerState<TeacherLessonPlansScreen> createState() =>
      _TeacherLessonPlansScreenState();
}

class _TeacherLessonPlansScreenState
    extends ConsumerState<TeacherLessonPlansScreen> {
  List<Map<String, dynamic>> _rows = const [];
  List<Map<String, dynamic>> _subjects = const [];
  bool _loading = true;
  bool _busy = false;
  String? _error;
  String? _notice;
  int? _subjectId;
  final _grade = TextEditingController(text: '9');
  final _week = TextEditingController(text: '1');
  final _topic = TextEditingController();
  final _objectives = TextEditingController();

  @override
  void initState() {
    super.initState();
    Future.microtask(_load);
  }

  @override
  void dispose() {
    _grade.dispose();
    _week.dispose();
    _topic.dispose();
    _objectives.dispose();
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
          .get<Map<String, dynamic>>('/teacher/lesson-plans');
      if (!mounted) return;
      final subjects = _maps(res.data?['subjects']);
      setState(() {
        _rows = _maps(res.data?['rows'] ?? res.data?['plans']);
        _subjects = subjects;
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

  Future<void> _add() async {
    if (_busy || _subjectId == null) return;
    setState(() => _busy = true);
    try {
      await ref.read(apiClientProvider).post(
        '/teacher/lesson-plans',
        data: {
          'subjectId': _subjectId,
          'gradeLevel': int.tryParse(_grade.text.trim()) ?? 9,
          'weekNumber': int.tryParse(_week.text.trim()) ?? 1,
          'topicTitle': _topic.text.trim(),
          'learningObjectives': _objectives.text.trim(),
        },
      );
      _topic.clear();
      _objectives.clear();
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
      appBar: KeytAppBar(title: l10n.lessonPlans),
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
                                      child:
                                          Text((s['name'] ?? '').toString()),
                                    );
                                  })
                                  .whereType<DropdownMenuItem<int>>()
                                  .toList(),
                              onChanged: (v) => setState(() => _subjectId = v),
                            ),
                          TextField(
                              controller: _grade,
                              keyboardType: TextInputType.number,
                              decoration:
                                  InputDecoration(labelText: l10n.gradePick)),
                          TextField(
                              controller: _week,
                              keyboardType: TextInputType.number,
                              decoration:
                                  const InputDecoration(labelText: 'Week')),
                          TextField(
                              controller: _topic,
                              decoration:
                                  InputDecoration(labelText: l10n.topic)),
                          TextField(
                              controller: _objectives,
                              decoration: InputDecoration(
                                  labelText: l10n.lfDescription)),
                          FilledButton(
                              onPressed: _busy ? null : _add,
                              child: Text(l10n.savedGeneric)),
                          ..._rows.map((r) => Padding(
                                padding: const EdgeInsets.only(top: 8),
                                child: TeacherSectionCard(
                                  padding: const EdgeInsets.all(12),
                                  child: Text(
                                      'W${r['weekNumber'] ?? r['week'] ?? ''} · ${r['topicTitle'] ?? r['topic'] ?? ''} · ${r['status'] ?? ''}'),
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

class TeacherCourseFilesScreen extends ConsumerStatefulWidget {
  const TeacherCourseFilesScreen({super.key});

  @override
  ConsumerState<TeacherCourseFilesScreen> createState() =>
      _TeacherCourseFilesScreenState();
}

class _TeacherCourseFilesScreenState
    extends ConsumerState<TeacherCourseFilesScreen> {
  List<Map<String, dynamic>> _rows = const [];
  List<Map<String, dynamic>> _classes = const [];
  bool _loading = true;
  bool _busy = false;
  String? _error;
  String? _notice;
  String? _classSelect;
  final String _category = 'Note';
  final _title = TextEditingController();
  final _content = TextEditingController();

  @override
  void initState() {
    super.initState();
    Future.microtask(_load);
  }

  @override
  void dispose() {
    _title.dispose();
    _content.dispose();
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
          .get<Map<String, dynamic>>('/teacher/course-files');
      if (!mounted) return;
      final classes = _maps(res.data?['classes']);
      setState(() {
        _rows = _maps(res.data?['rows']);
        _classes = classes;
        _classSelect ??= classes.isNotEmpty
            ? (classes.first['value'] ?? '').toString()
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

  Future<void> _add() async {
    if (_busy || (_classSelect ?? '').isEmpty) return;
    setState(() => _busy = true);
    try {
      await ref.read(apiClientProvider).post(
        '/teacher/course-files',
        data: {
          'classSelect': _classSelect,
          'category': _category,
          'title': _title.text.trim(),
          'content': _content.text.trim(),
        },
      );
      _title.clear();
      _content.clear();
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
      appBar: KeytAppBar(title: l10n.courseFiles),
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
                          if (_classes.isNotEmpty)
                            DropdownButtonFormField<String>(
                              initialValue: _classSelect,
                              decoration: InputDecoration(
                                  labelText: l10n.selectClassAndSubject),
                              items: _classes
                                  .map((c) {
                                    final v = (c['value'] ?? '').toString();
                                    if (v.isEmpty) return null;
                                    return DropdownMenuItem(
                                      value: v,
                                      child: Text(
                                          (c['label'] ?? v).toString()),
                                    );
                                  })
                                  .whereType<DropdownMenuItem<String>>()
                                  .toList(),
                              onChanged: (v) =>
                                  setState(() => _classSelect = v),
                            ),
                          TextField(
                              controller: _title,
                              decoration:
                                  InputDecoration(labelText: l10n.lfTitle)),
                          TextField(
                              controller: _content,
                              maxLines: 4,
                              decoration: InputDecoration(
                                  labelText: l10n.lfDescription)),
                          FilledButton(
                              onPressed: _busy ? null : _add,
                              child: Text(l10n.savedGeneric)),
                          ..._rows.map((r) => Padding(
                                padding: const EdgeInsets.only(top: 8),
                                child: TeacherSectionCard(
                                  padding: const EdgeInsets.all(12),
                                  child: Text(
                                      '${r['title'] ?? ''} · ${r['classLabel'] ?? ''}'),
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

class TeacherSimulationsFormScreen extends ConsumerStatefulWidget {
  const TeacherSimulationsFormScreen({super.key});

  @override
  ConsumerState<TeacherSimulationsFormScreen> createState() =>
      _TeacherSimulationsFormScreenState();
}

class _TeacherSimulationsFormScreenState
    extends ConsumerState<TeacherSimulationsFormScreen> {
  List<Map<String, dynamic>> _rows = const [];
  bool _loading = true;
  bool _busy = false;
  String? _error;
  String? _notice;
  final _title = TextEditingController();
  final _url = TextEditingController();

  @override
  void initState() {
    super.initState();
    Future.microtask(_load);
  }

  @override
  void dispose() {
    _title.dispose();
    _url.dispose();
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
          .get<Map<String, dynamic>>('/teacher/simulations');
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
    if (_busy || _title.text.trim().isEmpty) return;
    setState(() => _busy = true);
    try {
      await ref.read(apiClientProvider).post(
        '/teacher/simulations',
        data: {
          'title': _title.text.trim(),
          'url': _url.text.trim(),
        },
      );
      _title.clear();
      _url.clear();
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
      appBar: KeytAppBar(title: l10n.simulations),
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
                                    controller: _title,
                                    decoration: InputDecoration(
                                        labelText: l10n.lfTitle)),
                                TextField(
                                    controller: _url,
                                    decoration: InputDecoration(
                                        labelText: l10n.schLink)),
                                FilledButton(
                                    onPressed: _busy ? null : _add,
                                    child: Text(l10n.savedGeneric)),
                              ],
                            ),
                          ),
                          ..._rows.map((r) => Padding(
                                padding: const EdgeInsets.only(top: 8),
                                child: TeacherSectionCard(
                                  padding: const EdgeInsets.all(12),
                                  child: Text((r['title'] ?? '').toString()),
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

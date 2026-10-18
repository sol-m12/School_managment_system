import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/api/api_client.dart';
import '../../../core/providers.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/widgets/keyt_app_bar.dart';
import '../../../core/widgets/offline_banner.dart';
import '../../../l10n/app_localizations.dart';
import '../widgets/student_chrome.dart';

List<Map<String, dynamic>> _maps(Object? raw) {
  if (raw is! List) return const [];
  return raw
      .whereType<Map>()
      .map((e) => Map<String, dynamic>.from(e))
      .toList();
}

class StudentAssignmentsScreen extends ConsumerStatefulWidget {
  const StudentAssignmentsScreen({super.key});

  @override
  ConsumerState<StudentAssignmentsScreen> createState() =>
      _StudentAssignmentsScreenState();
}

class _StudentAssignmentsScreenState
    extends ConsumerState<StudentAssignmentsScreen> {
  List<Map<String, dynamic>> _rows = const [];
  bool _loading = true;
  bool _busy = false;
  String? _error;
  String? _notice;
  final Map<int, TextEditingController> _bodies = {};

  @override
  void initState() {
    super.initState();
    Future.microtask(_load);
  }

  @override
  void dispose() {
    for (final c in _bodies.values) {
      c.dispose();
    }
    super.dispose();
  }

  TextEditingController _bodyFor(int id) =>
      _bodies.putIfAbsent(id, TextEditingController.new);

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final res = await ref
          .read(apiClientProvider)
          .get<Map<String, dynamic>>('/student/desk/assignments');
      if (!mounted) return;
      setState(() {
        _rows = _maps(res.data?['rows'] ?? res.data?['tasks']);
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

  Future<void> _submit(int taskId) async {
    if (_busy) return;
    setState(() => _busy = true);
    try {
      await ref.read(apiClientProvider).post(
        '/student/desk/assignments/$taskId',
        data: {'body': _bodyFor(taskId).text.trim()},
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
      appBar: KeytAppBar(title: l10n.assignments),
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
                            StudentSectionCard(
                                child: Text(l10n.emptyCatalog,
                                    style: const TextStyle(
                                        color: AppColors.inkMuted)))
                          else
                            ..._rows.map((row) {
                              final id = (row['id'] as num?)?.toInt() ??
                                  (row['taskId'] as num?)?.toInt();
                              if (id == null) return const SizedBox.shrink();
                              return Padding(
                                padding: const EdgeInsets.only(bottom: 8),
                                child: StudentSectionCard(
                                  padding: const EdgeInsets.all(12),
                                  child: Column(
                                    crossAxisAlignment:
                                        CrossAxisAlignment.stretch,
                                    children: [
                                      Text(
                                        (row['title'] ?? row['subject'] ?? '')
                                            .toString(),
                                        style: const TextStyle(
                                            fontWeight: FontWeight.w800),
                                      ),
                                      TextField(
                                        controller: _bodyFor(id),
                                        decoration: InputDecoration(
                                            labelText: l10n.forumYourAnswer),
                                      ),
                                      FilledButton(
                                        onPressed:
                                            _busy ? null : () => _submit(id),
                                        child: Text(l10n.savedGeneric),
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

class StudentHelpdeskScreen extends ConsumerStatefulWidget {
  const StudentHelpdeskScreen({super.key});

  @override
  ConsumerState<StudentHelpdeskScreen> createState() =>
      _StudentHelpdeskScreenState();
}

class _StudentHelpdeskScreenState extends ConsumerState<StudentHelpdeskScreen> {
  List<Map<String, dynamic>> _rows = const [];
  bool _loading = true;
  bool _busy = false;
  String? _error;
  String? _notice;
  final _title = TextEditingController();
  final _details = TextEditingController();
  final String _category = 'General';

  @override
  void initState() {
    super.initState();
    Future.microtask(_load);
  }

  @override
  void dispose() {
    _title.dispose();
    _details.dispose();
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
          .get<Map<String, dynamic>>('/student/desk/helpdesk');
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

  Future<void> _create() async {
    if (_busy || _title.text.trim().isEmpty) return;
    setState(() => _busy = true);
    try {
      await ref.read(apiClientProvider).post(
        '/student/desk/helpdesk',
        data: {
          'title': _title.text.trim(),
          'details': _details.text.trim(),
          'category': _category,
        },
      );
      _title.clear();
      _details.clear();
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

  Future<void> _close(int id) async {
    if (_busy) return;
    setState(() => _busy = true);
    try {
      await ref
          .read(apiClientProvider)
          .post('/student/desk/helpdesk/$id/close');
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
      appBar: KeytAppBar(title: l10n.helpdesk),
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
                          StudentSectionCard(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.stretch,
                              children: [
                                TextField(
                                    controller: _title,
                                    decoration: InputDecoration(
                                        labelText: l10n.lfTitle)),
                                TextField(
                                    controller: _details,
                                    maxLines: 3,
                                    decoration: InputDecoration(
                                        labelText: l10n.lfDescription)),
                                FilledButton(
                                    onPressed: _busy ? null : _create,
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
                              child: StudentSectionCard(
                                padding: const EdgeInsets.all(12),
                                child: Row(
                                  children: [
                                    Expanded(
                                      child: Text(
                                        (r['title'] ?? '').toString(),
                                        style: const TextStyle(
                                            fontWeight: FontWeight.w700),
                                      ),
                                    ),
                                    Text(status),
                                    if (status != 'Closed' && id != null)
                                      TextButton(
                                        onPressed:
                                            _busy ? null : () => _close(id),
                                        child: Text(l10n.closeExam),
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

class StudentDocumentsFormScreen extends ConsumerStatefulWidget {
  const StudentDocumentsFormScreen({super.key});

  @override
  ConsumerState<StudentDocumentsFormScreen> createState() =>
      _StudentDocumentsFormScreenState();
}

class _StudentDocumentsFormScreenState
    extends ConsumerState<StudentDocumentsFormScreen> {
  List<Map<String, dynamic>> _rows = const [];
  bool _loading = true;
  bool _busy = false;
  String? _error;
  String? _notice;
  String _kind = 'transcript';
  final _purpose = TextEditingController();

  @override
  void initState() {
    super.initState();
    Future.microtask(_load);
  }

  @override
  void dispose() {
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
          .get<Map<String, dynamic>>('/student/desk/documents');
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

  Future<void> _request() async {
    if (_busy) return;
    setState(() => _busy = true);
    try {
      await ref.read(apiClientProvider).post(
        '/student/desk/documents',
        data: {'kind': _kind, 'purpose': _purpose.text.trim()},
      );
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
      appBar: KeytAppBar(title: l10n.documents),
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
                          StudentSectionCard(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.stretch,
                              children: [
                                DropdownButtonFormField<String>(
                                  initialValue: _kind,
                                  decoration: InputDecoration(
                                      labelText: l10n.lfKind),
                                  items: const [
                                    DropdownMenuItem(
                                        value: 'transcript',
                                        child: Text('transcript')),
                                    DropdownMenuItem(
                                        value: 'document',
                                        child: Text('document')),
                                  ],
                                  onChanged: (v) {
                                    if (v != null) setState(() => _kind = v);
                                  },
                                ),
                                TextField(
                                    controller: _purpose,
                                    decoration: InputDecoration(
                                        labelText: l10n.lfDescription)),
                                FilledButton(
                                    onPressed: _busy ? null : _request,
                                    child: Text(l10n.savedGeneric)),
                              ],
                            ),
                          ),
                          const SizedBox(height: 12),
                          ..._rows.map((r) => Padding(
                                padding: const EdgeInsets.only(bottom: 8),
                                child: StudentSectionCard(
                                  padding: const EdgeInsets.all(12),
                                  child: Text(
                                      '${r['kind'] ?? ''} · ${r['status'] ?? ''}'),
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

class StudentVocationalScreen extends ConsumerStatefulWidget {
  const StudentVocationalScreen({super.key});

  @override
  ConsumerState<StudentVocationalScreen> createState() =>
      _StudentVocationalScreenState();
}

class _StudentVocationalScreenState
    extends ConsumerState<StudentVocationalScreen> {
  Map<String, dynamic>? _data;
  bool _loading = true;
  bool _busy = false;
  String? _error;
  String? _notice;
  int? _subjectId;
  int? _programId;
  final _note = TextEditingController();

  @override
  void initState() {
    super.initState();
    Future.microtask(_load);
  }

  @override
  void dispose() {
    _note.dispose();
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
          .get<Map<String, dynamic>>('/student/desk/vocational');
      if (!mounted) return;
      final subjects = _maps(res.data?['subjects'] ?? res.data?['skills']);
      final programs = _maps(res.data?['programs']);
      setState(() {
        _data = res.data;
        _subjectId ??= subjects.isNotEmpty
            ? (subjects.first['id'] as num?)?.toInt()
            : null;
        _programId ??= programs.isNotEmpty
            ? (programs.first['id'] as num?)?.toInt()
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

  Future<void> _choose() async {
    if (_busy || _subjectId == null) return;
    setState(() => _busy = true);
    try {
      await ref.read(apiClientProvider).post(
        '/student/desk/vocational/choice',
        data: {'subjectId': _subjectId},
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

  Future<void> _apply() async {
    if (_busy || _programId == null) return;
    setState(() => _busy = true);
    try {
      await ref.read(apiClientProvider).post(
        '/student/desk/vocational/apply',
        data: {'programId': _programId, 'note': _note.text.trim()},
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
    final subjects = _maps(_data?['subjects'] ?? _data?['skills']);
    final programs = _maps(_data?['programs']);
    return Scaffold(
      backgroundColor: AppColors.loginCanvas,
      appBar: KeytAppBar(title: l10n.vocational),
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
                          if (subjects.isNotEmpty) ...[
                            DropdownButtonFormField<int>(
                              initialValue: _subjectId,
                              decoration:
                                  InputDecoration(labelText: l10n.subject),
                              items: subjects
                                  .map((s) {
                                    final id = (s['id'] as num?)?.toInt();
                                    if (id == null) return null;
                                    return DropdownMenuItem(
                                      value: id,
                                      child: Text((s['name'] ?? s['title'] ?? '')
                                          .toString()),
                                    );
                                  })
                                  .whereType<DropdownMenuItem<int>>()
                                  .toList(),
                              onChanged: (v) => setState(() => _subjectId = v),
                            ),
                            FilledButton(
                                onPressed: _busy ? null : _choose,
                                child: Text(l10n.savedGeneric)),
                          ],
                          if (programs.isNotEmpty) ...[
                            const SizedBox(height: 12),
                            DropdownButtonFormField<int>(
                              initialValue: _programId,
                              decoration: InputDecoration(
                                  labelText: l10n.vocational),
                              items: programs
                                  .map((p) {
                                    final id = (p['id'] as num?)?.toInt();
                                    if (id == null) return null;
                                    return DropdownMenuItem(
                                      value: id,
                                      child: Text((p['name'] ?? p['title'] ?? '')
                                          .toString()),
                                    );
                                  })
                                  .whereType<DropdownMenuItem<int>>()
                                  .toList(),
                              onChanged: (v) => setState(() => _programId = v),
                            ),
                            TextField(
                                controller: _note,
                                decoration: InputDecoration(
                                    labelText: l10n.bookNote)),
                            FilledButton(
                                onPressed: _busy ? null : _apply,
                                child: Text(l10n.schApply)),
                          ],
                          if (subjects.isEmpty && programs.isEmpty)
                            StudentSectionCard(
                                child: Text(l10n.emptyCatalog,
                                    style: const TextStyle(
                                        color: AppColors.inkMuted))),
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

class StudentGroupsScreen extends ConsumerStatefulWidget {
  const StudentGroupsScreen({super.key});

  @override
  ConsumerState<StudentGroupsScreen> createState() =>
      _StudentGroupsScreenState();
}

class _StudentGroupsScreenState extends ConsumerState<StudentGroupsScreen> {
  List<Map<String, dynamic>> _groups = const [];
  Map<String, dynamic>? _detail;
  int? _openedId;
  bool _loading = true;
  bool _busy = false;
  String? _error;
  String? _notice;
  final _message = TextEditingController();

  @override
  void initState() {
    super.initState();
    Future.microtask(_load);
  }

  @override
  void dispose() {
    _message.dispose();
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
          .get<Map<String, dynamic>>('/student/groups');
      if (!mounted) return;
      setState(() {
        _groups = _maps(res.data?['rows'] ?? res.data?['groups']);
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

  Future<void> _open(int id) async {
    setState(() {
      _openedId = id;
      _detail = null;
    });
    try {
      final res = await ref
          .read(apiClientProvider)
          .get<Map<String, dynamic>>('/student/groups/$id');
      if (!mounted) return;
      setState(() => _detail = res.data);
    } catch (e) {
      if (!mounted) return;
      setState(() => _error = mapDioError(e).code);
    }
  }

  Future<void> _send() async {
    if (_busy || _openedId == null || _message.text.trim().isEmpty) return;
    setState(() => _busy = true);
    try {
      await ref.read(apiClientProvider).post(
        '/student/groups/$_openedId/messages',
        data: {'text': _message.text.trim()},
      );
      _message.clear();
      if (!mounted) return;
      setState(() => _notice = AppLocalizations.of(context).savedGeneric);
      await _open(_openedId!);
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
    final messages = _maps(_detail?['messages']);
    return Scaffold(
      backgroundColor: AppColors.loginCanvas,
      appBar: KeytAppBar(title: l10n.navLearning),
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
                          ..._groups.map((g) {
                            final id = (g['id'] as num?)?.toInt();
                            return Padding(
                              padding: const EdgeInsets.only(bottom: 8),
                              child: StudentSectionCard(
                                padding: const EdgeInsets.all(12),
                                child: Row(
                                  children: [
                                    Expanded(
                                      child: Text(
                                        (g['name'] ?? g['title'] ?? '')
                                            .toString(),
                                        style: const TextStyle(
                                            fontWeight: FontWeight.w800),
                                      ),
                                    ),
                                    TextButton(
                                      onPressed:
                                          id == null ? null : () => _open(id),
                                      child: Text(l10n.forumOpen),
                                    ),
                                  ],
                                ),
                              ),
                            );
                          }),
                          if (_detail != null) ...[
                            const SizedBox(height: 12),
                            ...messages.map((m) => Padding(
                                  padding: const EdgeInsets.only(bottom: 6),
                                  child: StudentSectionCard(
                                    padding: const EdgeInsets.all(10),
                                    child: Text(
                                        '${m['author'] ?? m['studentName'] ?? ''}: ${m['text'] ?? m['body'] ?? ''}'),
                                  ),
                                )),
                            TextField(
                                controller: _message,
                                decoration: InputDecoration(
                                    labelText: l10n.forumYourAnswer)),
                            FilledButton(
                                onPressed: _busy ? null : _send,
                                child: Text(l10n.savedGeneric)),
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
}

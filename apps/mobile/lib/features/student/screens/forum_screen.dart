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

/// Same as website student Academic Q&A.
class StudentForumScreen extends ConsumerStatefulWidget {
  const StudentForumScreen({super.key});

  @override
  ConsumerState<StudentForumScreen> createState() => _StudentForumScreenState();
}

class _StudentForumScreenState extends ConsumerState<StudentForumScreen> {
  List<Map<String, dynamic>> _questions = const [];
  Map<String, dynamic>? _detail;
  int? _openedId;
  bool _loading = true;
  bool _busy = false;
  String? _error;
  String? _notice;

  final _qTitle = TextEditingController();
  final _qBody = TextEditingController();
  final _answer = TextEditingController();

  @override
  void initState() {
    super.initState();
    Future.microtask(_loadList);
  }

  @override
  void dispose() {
    _qTitle.dispose();
    _qBody.dispose();
    _answer.dispose();
    super.dispose();
  }

  Future<void> _loadList() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final res = await ref
          .read(apiClientProvider)
          .get<Map<String, dynamic>>('/forum/questions');
      if (!mounted) return;
      setState(() {
        _questions = _maps(res.data?['rows']);
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
      _error = null;
    });
    try {
      final res = await ref
          .read(apiClientProvider)
          .get<Map<String, dynamic>>('/forum/questions/$id');
      if (!mounted) return;
      setState(() => _detail = res.data);
    } catch (e) {
      if (!mounted) return;
      setState(() => _error = mapDioError(e).code);
    }
  }

  Future<void> _postQuestion() async {
    if (_busy || _qTitle.text.trim().isEmpty || _qBody.text.trim().isEmpty) {
      return;
    }
    setState(() {
      _busy = true;
      _error = null;
      _notice = null;
    });
    try {
      await ref.read(apiClientProvider).post(
        '/forum/questions',
        data: {'title': _qTitle.text.trim(), 'body': _qBody.text.trim()},
      );
      _qTitle.clear();
      _qBody.clear();
      if (!mounted) return;
      setState(() => _notice = AppLocalizations.of(context).forumQuestionPosted);
      await _loadList();
    } catch (e) {
      if (!mounted) return;
      setState(() => _error = mapDioError(e).code);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _postAnswer() async {
    if (_busy || _openedId == null || _answer.text.trim().isEmpty) return;
    setState(() {
      _busy = true;
      _error = null;
      _notice = null;
    });
    try {
      await ref.read(apiClientProvider).post(
        '/forum/questions/$_openedId/answers',
        data: {'body': _answer.text.trim()},
      );
      _answer.clear();
      if (!mounted) return;
      setState(() => _notice = AppLocalizations.of(context).forumAnswerPosted);
      await _open(_openedId!);
    } catch (e) {
      if (!mounted) return;
      setState(() => _error = mapDioError(e).code);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _upvote(int answerId) async {
    if (_busy) return;
    setState(() => _busy = true);
    try {
      await ref
          .read(apiClientProvider)
          .post('/forum/answers/$answerId/upvote');
      if (!mounted) return;
      setState(() => _notice = AppLocalizations.of(context).forumUpvoted);
      if (_openedId != null) await _open(_openedId!);
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
    final answers = _maps(_detail?['answers']);
    return Scaffold(
      backgroundColor: AppColors.loginCanvas,
      appBar: KeytAppBar(title: l10n.forumStudentTitle),
      body: SafeArea(
        child: Column(
          children: [
            const OfflineBanner(),
            Expanded(
              child: _loading
                  ? const Center(child: CircularProgressIndicator())
                  : RefreshIndicator(
                      onRefresh: _loadList,
                      child: ListView(
                        physics: const AlwaysScrollableScrollPhysics(),
                        padding: const EdgeInsets.all(16),
                        children: [
                          if (_notice != null)
                            Text(
                              _notice!,
                              style: const TextStyle(
                                color: AppColors.success,
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                          if (_error != null)
                            Text(
                              _error!,
                              style: const TextStyle(color: AppColors.danger),
                            ),
                          StudentSectionCard(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.stretch,
                              children: [
                                TextField(
                                  controller: _qTitle,
                                  decoration: InputDecoration(
                                    labelText: l10n.forumQuestionTitle,
                                  ),
                                ),
                                TextField(
                                  controller: _qBody,
                                  maxLines: 3,
                                  decoration: InputDecoration(
                                    labelText: l10n.forumQuestionBody,
                                  ),
                                ),
                                const SizedBox(height: 8),
                                FilledButton(
                                  onPressed: _busy ? null : _postQuestion,
                                  child: Text(l10n.forumPostQuestion),
                                ),
                              ],
                            ),
                          ),
                          const SizedBox(height: 16),
                          if (_questions.isEmpty)
                            StudentSectionCard(
                              child: Text(
                                l10n.forumEmptyQuestions,
                                style: const TextStyle(
                                  color: AppColors.inkMuted,
                                ),
                              ),
                            )
                          else
                            ..._questions.map((row) {
                              final id = (row['id'] as num?)?.toInt();
                              return Padding(
                                padding: const EdgeInsets.only(bottom: 8),
                                child: StudentSectionCard(
                                  padding: const EdgeInsets.all(12),
                                  child: Row(
                                    children: [
                                      Expanded(
                                        child: Column(
                                          crossAxisAlignment:
                                              CrossAxisAlignment.start,
                                          children: [
                                            Text(
                                              (row['title'] ?? '').toString(),
                                              style: const TextStyle(
                                                fontWeight: FontWeight.w800,
                                              ),
                                            ),
                                            Text(
                                              '${row['studentName'] ?? ''} · ${row['points'] ?? 0} ${l10n.forumPoints}',
                                              style: const TextStyle(
                                                fontSize: 12,
                                                color: AppColors.inkMuted,
                                              ),
                                            ),
                                          ],
                                        ),
                                      ),
                                      TextButton(
                                        onPressed: id == null
                                            ? null
                                            : () => _open(id),
                                        child: Text(l10n.forumOpen),
                                      ),
                                    ],
                                  ),
                                ),
                              );
                            }),
                          if (_detail != null) ...[
                            const SizedBox(height: 16),
                            Text(
                              (_detail!['title'] ?? '').toString(),
                              style: const TextStyle(
                                fontWeight: FontWeight.w800,
                                fontSize: 16,
                              ),
                            ),
                            Text((_detail!['body'] ?? '').toString()),
                            const SizedBox(height: 8),
                            ...answers.map((a) {
                              final aid = (a['id'] as num?)?.toInt();
                              final endorsed = a['isEndorsed'] == true;
                              return Padding(
                                padding: const EdgeInsets.only(bottom: 8),
                                child: StudentSectionCard(
                                  padding: const EdgeInsets.all(12),
                                  child: Column(
                                    crossAxisAlignment:
                                        CrossAxisAlignment.stretch,
                                    children: [
                                      Text((a['body'] ?? '').toString()),
                                      Text(
                                        '${a['studentName'] ?? ''} · ${a['points'] ?? 0} ${l10n.forumPoints}${endorsed ? ' · ${l10n.forumEndorsed}' : ''}',
                                        style: const TextStyle(
                                          fontSize: 12,
                                          color: AppColors.inkMuted,
                                        ),
                                      ),
                                      Align(
                                        alignment: Alignment.centerRight,
                                        child: TextButton(
                                          onPressed: aid == null || _busy
                                              ? null
                                              : () => _upvote(aid),
                                          child: Text(l10n.forumUpvote),
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                              );
                            }),
                            TextField(
                              controller: _answer,
                              decoration: InputDecoration(
                                labelText: l10n.forumYourAnswer,
                              ),
                            ),
                            FilledButton(
                              onPressed: _busy ? null : _postAnswer,
                              child: Text(l10n.forumPostAnswer),
                            ),
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

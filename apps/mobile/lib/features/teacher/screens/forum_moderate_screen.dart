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

/// Same as website teacher forum moderation.
class TeacherForumModerateScreen extends ConsumerStatefulWidget {
  const TeacherForumModerateScreen({super.key});

  @override
  ConsumerState<TeacherForumModerateScreen> createState() =>
      _TeacherForumModerateScreenState();
}

class _TeacherForumModerateScreenState
    extends ConsumerState<TeacherForumModerateScreen> {
  List<Map<String, dynamic>> _questions = const [];
  Map<String, dynamic>? _detail;
  int? _openedId;
  bool _loading = true;
  bool _busy = false;
  String? _error;
  String? _notice;

  @override
  void initState() {
    super.initState();
    Future.microtask(_loadList);
  }

  Future<void> _loadList() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final res = await ref
          .read(apiClientProvider)
          .get<Map<String, dynamic>>('/forum/moderate/questions');
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
    });
    try {
      final res = await ref
          .read(apiClientProvider)
          .get<Map<String, dynamic>>('/forum/moderate/questions/$id');
      if (!mounted) return;
      setState(() => _detail = res.data);
    } catch (e) {
      if (!mounted) return;
      setState(() => _error = mapDioError(e).code);
    }
  }

  Future<void> _endorse(int answerId) async {
    if (_busy) return;
    setState(() => _busy = true);
    try {
      await ref
          .read(apiClientProvider)
          .post('/forum/moderate/answers/$answerId/endorse');
      if (!mounted) return;
      setState(() => _notice = AppLocalizations.of(context).forumEndorsedSaved);
      if (_openedId != null) await _open(_openedId!);
    } catch (e) {
      if (!mounted) return;
      setState(() => _error = mapDioError(e).code);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _deleteQuestion(int id) async {
    if (_busy) return;
    setState(() => _busy = true);
    try {
      await ref
          .read(apiClientProvider)
          .raw
          .delete('/forum/moderate/questions/$id');
      if (!mounted) return;
      setState(() {
        _notice = AppLocalizations.of(context).forumDeleted;
        _openedId = null;
        _detail = null;
      });
      await _loadList();
    } catch (e) {
      if (!mounted) return;
      setState(() => _error = mapDioError(e).code);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _deleteAnswer(int id) async {
    if (_busy) return;
    setState(() => _busy = true);
    try {
      await ref
          .read(apiClientProvider)
          .raw
          .delete('/forum/moderate/answers/$id');
      if (!mounted) return;
      setState(() => _notice = AppLocalizations.of(context).forumDeleted);
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
      appBar: KeytAppBar(title: l10n.forumModerateTitle),
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
                          if (_questions.isEmpty)
                            TeacherSectionCard(
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
                                child: TeacherSectionCard(
                                  padding: const EdgeInsets.all(12),
                                  child: Row(
                                    children: [
                                      Expanded(
                                        child: Text(
                                          (row['title'] ?? '').toString(),
                                          style: const TextStyle(
                                            fontWeight: FontWeight.w800,
                                          ),
                                        ),
                                      ),
                                      TextButton(
                                        onPressed:
                                            id == null ? null : () => _open(id),
                                        child: Text(l10n.forumOpen),
                                      ),
                                      TextButton(
                                        onPressed: id == null || _busy
                                            ? null
                                            : () => _deleteQuestion(id),
                                        child: Text(l10n.forumDelete),
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
                            ...answers.map((a) {
                              final aid = (a['id'] as num?)?.toInt();
                              return Padding(
                                padding: const EdgeInsets.only(bottom: 8),
                                child: TeacherSectionCard(
                                  padding: const EdgeInsets.all(12),
                                  child: Column(
                                    crossAxisAlignment:
                                        CrossAxisAlignment.stretch,
                                    children: [
                                      Text((a['body'] ?? '').toString()),
                                      Row(
                                        children: [
                                          TextButton(
                                            onPressed: aid == null || _busy
                                                ? null
                                                : () => _endorse(aid),
                                            child: Text(l10n.forumEndorse),
                                          ),
                                          TextButton(
                                            onPressed: aid == null || _busy
                                                ? null
                                                : () => _deleteAnswer(aid),
                                            child: Text(l10n.forumDelete),
                                          ),
                                        ],
                                      ),
                                    ],
                                  ),
                                ),
                              );
                            }),
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

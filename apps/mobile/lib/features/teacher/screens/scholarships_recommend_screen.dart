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

/// Same as website teacher scholarship recommendation queue.
class TeacherScholarshipsRecommendScreen extends ConsumerStatefulWidget {
  const TeacherScholarshipsRecommendScreen({super.key});

  @override
  ConsumerState<TeacherScholarshipsRecommendScreen> createState() =>
      _TeacherScholarshipsRecommendScreenState();
}

class _TeacherScholarshipsRecommendScreenState
    extends ConsumerState<TeacherScholarshipsRecommendScreen> {
  List<Map<String, dynamic>> _rows = const [];
  final Map<int, TextEditingController> _bodies = {};
  final Map<int, int> _draftIds = {};
  bool _loading = true;
  bool _busy = false;
  String? _error;
  String? _notice;

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

  TextEditingController _bodyFor(int id) {
    return _bodies.putIfAbsent(id, TextEditingController.new);
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final res = await ref
          .read(apiClientProvider)
          .get<Map<String, dynamic>>('/scholarships/recommend/queue');
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

  Future<void> _saveDraft(int applicationId) async {
    if (_busy) return;
    setState(() {
      _busy = true;
      _error = null;
      _notice = null;
    });
    try {
      final res = await ref.read(apiClientProvider).post<Map<String, dynamic>>(
        '/scholarships/recommend',
        data: {
          'applicationId': applicationId,
          'body': _bodyFor(applicationId).text.trim(),
        },
      );
      final draftId = (res.data?['id'] as num?)?.toInt();
      if (!mounted) return;
      setState(() {
        if (draftId != null) _draftIds[applicationId] = draftId;
        _notice = AppLocalizations.of(context).schDraftSaved;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() => _error = mapDioError(e).code);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _sign(int applicationId) async {
    final draftId = _draftIds[applicationId];
    if (_busy || draftId == null) return;
    setState(() {
      _busy = true;
      _error = null;
      _notice = null;
    });
    try {
      await ref
          .read(apiClientProvider)
          .post('/scholarships/recommend/$draftId/sign');
      if (!mounted) return;
      setState(() => _notice = AppLocalizations.of(context).schLetterSigned);
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
      appBar: KeytAppBar(title: l10n.schRecommendTitle),
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
                          if (_rows.isEmpty)
                            TeacherSectionCard(
                              child: Text(
                                l10n.schEmptyQueue,
                                style: const TextStyle(
                                  color: AppColors.inkMuted,
                                ),
                              ),
                            )
                          else
                            ..._rows.map((row) {
                              final id = (row['id'] as num?)?.toInt();
                              if (id == null) {
                                return const SizedBox.shrink();
                              }
                              return Padding(
                                padding: const EdgeInsets.only(bottom: 8),
                                child: TeacherSectionCard(
                                  padding: const EdgeInsets.all(12),
                                  child: Column(
                                    crossAxisAlignment:
                                        CrossAxisAlignment.stretch,
                                    children: [
                                      Text(
                                        (row['studentName'] ?? '').toString(),
                                        style: const TextStyle(
                                          fontWeight: FontWeight.w800,
                                        ),
                                      ),
                                      Text(
                                        (row['title'] ?? '').toString(),
                                        style: const TextStyle(
                                          color: AppColors.inkMuted,
                                        ),
                                      ),
                                      TextField(
                                        controller: _bodyFor(id),
                                        maxLines: 3,
                                        decoration: InputDecoration(
                                          labelText: l10n.schLetterBody,
                                        ),
                                      ),
                                      Row(
                                        children: [
                                          FilledButton(
                                            onPressed: _busy
                                                ? null
                                                : () => _saveDraft(id),
                                            child: Text(l10n.schSaveDraft),
                                          ),
                                          const SizedBox(width: 8),
                                          if (_draftIds.containsKey(id))
                                            OutlinedButton(
                                              onPressed: _busy
                                                  ? null
                                                  : () => _sign(id),
                                              child: Text(l10n.schSignLetter),
                                            ),
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

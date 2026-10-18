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

/// Same as website Lost & Found board: post + approved list + my posts.
class StudentLostFoundScreen extends ConsumerStatefulWidget {
  const StudentLostFoundScreen({super.key});

  @override
  ConsumerState<StudentLostFoundScreen> createState() =>
      _StudentLostFoundScreenState();
}

class _StudentLostFoundScreenState
    extends ConsumerState<StudentLostFoundScreen> {
  List<Map<String, dynamic>> _board = const [];
  List<Map<String, dynamic>> _mine = const [];
  bool _loading = true;
  bool _busy = false;
  String? _error;
  String? _notice;

  String _kind = 'Lost';
  final _title = TextEditingController();
  final _description = TextEditingController();
  final _location = TextEditingController();
  final _contact = TextEditingController();

  @override
  void initState() {
    super.initState();
    Future.microtask(_load);
  }

  @override
  void dispose() {
    _title.dispose();
    _description.dispose();
    _location.dispose();
    _contact.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final api = ref.read(apiClientProvider);
      final board = await api.get<Map<String, dynamic>>('/lostfound/board');
      final mine = await api.get<Map<String, dynamic>>('/lostfound/mine');
      if (!mounted) return;
      setState(() {
        _board = _maps(board.data?['rows']);
        _mine = _maps(mine.data?['rows']);
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

  Future<void> _post() async {
    if (_busy || _title.text.trim().isEmpty) return;
    setState(() {
      _busy = true;
      _error = null;
      _notice = null;
    });
    try {
      await ref.read(apiClientProvider).post(
        '/lostfound',
        data: {
          'kind': _kind,
          'title': _title.text.trim(),
          'description': _description.text.trim(),
          'locationText': _location.text.trim(),
          'contactText': _contact.text.trim(),
        },
      );
      _title.clear();
      _description.clear();
      _location.clear();
      _contact.clear();
      if (!mounted) return;
      setState(() => _notice = AppLocalizations.of(context).lfPosted);
      await _load();
    } catch (e) {
      if (!mounted) return;
      setState(() => _error = mapDioError(e).code);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  String _statusLabel(AppLocalizations l10n, String status) {
    switch (status) {
      case 'Pending':
        return l10n.lfStatusPending;
      case 'Approved':
        return l10n.lfStatusApproved;
      case 'Resolved':
        return l10n.lfStatusResolved;
      case 'Rejected':
        return l10n.lfStatusRejected;
      default:
        return status;
    }
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    return Scaffold(
      backgroundColor: AppColors.loginCanvas,
      appBar: KeytAppBar(title: l10n.lfBoardTitle),
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
                          StudentSectionCard(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.stretch,
                              children: [
                                DropdownButtonFormField<String>(
                                  initialValue: _kind,
                                  decoration:
                                      InputDecoration(labelText: l10n.lfKind),
                                  items: [
                                    DropdownMenuItem(
                                      value: 'Lost',
                                      child: Text(l10n.lfKindLost),
                                    ),
                                    DropdownMenuItem(
                                      value: 'Found',
                                      child: Text(l10n.lfKindFound),
                                    ),
                                  ],
                                  onChanged: (v) {
                                    if (v != null) setState(() => _kind = v);
                                  },
                                ),
                                TextField(
                                  controller: _title,
                                  decoration: InputDecoration(
                                    labelText: l10n.lfTitle,
                                  ),
                                ),
                                TextField(
                                  controller: _description,
                                  decoration: InputDecoration(
                                    labelText: l10n.lfDescription,
                                  ),
                                ),
                                TextField(
                                  controller: _location,
                                  decoration: InputDecoration(
                                    labelText: l10n.lfLocation,
                                  ),
                                ),
                                TextField(
                                  controller: _contact,
                                  decoration: InputDecoration(
                                    labelText: l10n.lfContact,
                                  ),
                                ),
                                const SizedBox(height: 8),
                                FilledButton(
                                  onPressed: _busy ? null : _post,
                                  child: Text(l10n.lfPostItem),
                                ),
                              ],
                            ),
                          ),
                          const SizedBox(height: 16),
                          Text(
                            l10n.lfApprovedBoard,
                            style: const TextStyle(
                              fontWeight: FontWeight.w800,
                              fontSize: 16,
                            ),
                          ),
                          const SizedBox(height: 8),
                          if (_board.isEmpty)
                            StudentSectionCard(
                              child: Text(
                                l10n.lfEmptyBoard,
                                style: const TextStyle(
                                  color: AppColors.inkMuted,
                                ),
                              ),
                            )
                          else
                            ..._board.map((row) {
                              final kind = (row['kind'] ?? '').toString();
                              return Padding(
                                padding: const EdgeInsets.only(bottom: 8),
                                child: StudentSectionCard(
                                  padding: const EdgeInsets.all(12),
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
                                        kind == 'Found'
                                            ? l10n.lfKindFound
                                            : l10n.lfKindLost,
                                        style: const TextStyle(
                                          color: AppColors.inkMuted,
                                          fontSize: 12,
                                        ),
                                      ),
                                      if ((row['locationText'] ?? '')
                                          .toString()
                                          .isNotEmpty)
                                        Text(
                                          '${l10n.lfLocation}: ${row['locationText']}',
                                          style: const TextStyle(fontSize: 12),
                                        ),
                                    ],
                                  ),
                                ),
                              );
                            }),
                          const SizedBox(height: 16),
                          Text(
                            l10n.lfMyPosts,
                            style: const TextStyle(
                              fontWeight: FontWeight.w800,
                              fontSize: 16,
                            ),
                          ),
                          const SizedBox(height: 8),
                          if (_mine.isEmpty)
                            StudentSectionCard(
                              child: Text(
                                l10n.lfEmptyMine,
                                style: const TextStyle(
                                  color: AppColors.inkMuted,
                                ),
                              ),
                            )
                          else
                            ..._mine.map((row) {
                              return Padding(
                                padding: const EdgeInsets.only(bottom: 8),
                                child: StudentSectionCard(
                                  padding: const EdgeInsets.all(12),
                                  child: Row(
                                    children: [
                                      Expanded(
                                        child: Text(
                                          (row['title'] ?? '').toString(),
                                          style: const TextStyle(
                                            fontWeight: FontWeight.w700,
                                          ),
                                        ),
                                      ),
                                      Text(
                                        _statusLabel(
                                          l10n,
                                          (row['status'] ?? '').toString(),
                                        ),
                                        style: const TextStyle(
                                          fontSize: 12,
                                          fontWeight: FontWeight.w700,
                                        ),
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

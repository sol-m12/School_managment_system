import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/api/api_client.dart';
import '../../../core/providers.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/widgets/keyt_app_bar.dart';
import '../../../core/widgets/offline_banner.dart';
import '../../../l10n/app_localizations.dart';
import '../widgets/student_chrome.dart';

/// Student clubs: catalog (join), my memberships/meetings, elections (vote).
class StudentClubsScreen extends ConsumerStatefulWidget {
  const StudentClubsScreen({super.key});

  @override
  ConsumerState<StudentClubsScreen> createState() => _StudentClubsScreenState();
}

class _StudentClubsScreenState extends ConsumerState<StudentClubsScreen>
    with SingleTickerProviderStateMixin {
  late final TabController _tabs;
  final _search = TextEditingController();

  List<Map<String, dynamic>> _catalog = const [];
  List<Map<String, dynamic>> _memberships = const [];
  List<Map<String, dynamic>> _meetings = const [];
  List<Map<String, dynamic>> _elections = const [];

  bool _loading = true;
  bool _busy = false;
  String? _error;
  String? _notice;

  @override
  void initState() {
    super.initState();
    _tabs = TabController(length: 3, vsync: this);
    Future.microtask(_loadAll);
  }

  @override
  void dispose() {
    _tabs.dispose();
    _search.dispose();
    super.dispose();
  }

  Future<void> _loadAll() async {
    final user = ref.read(authControllerProvider).user;
    if (user == null) return;
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final api = ref.read(apiClientProvider);
      final q = _search.text.trim();
      final catalogRes = await api.get<Map<String, dynamic>>(
        '/clubs/catalog',
        queryParameters: q.isEmpty ? null : {'q': q},
      );
      final mineRes = await api.get<Map<String, dynamic>>('/clubs/mine');
      final electionsRes =
          await api.get<Map<String, dynamic>>('/clubs/elections');

      List<Map<String, dynamic>> asMaps(Object? raw) {
        if (raw is! List) return const [];
        return raw
            .whereType<Map>()
            .map((e) => Map<String, dynamic>.from(e))
            .toList();
      }

      if (!mounted) return;
      setState(() {
        _catalog = asMaps(catalogRes.data?['rows']);
        _memberships = asMaps(mineRes.data?['memberships']);
        _meetings = asMaps(mineRes.data?['meetings']);
        _elections = asMaps(electionsRes.data?['rows']);
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

  Future<void> _runAction(Future<void> Function() action) async {
    if (_busy) return;
    setState(() {
      _busy = true;
      _notice = null;
      _error = null;
    });
    try {
      await action();
      if (!mounted) return;
      await _loadAll();
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _error = mapDioError(e).code;
      });
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  String _memberStatus(AppLocalizations l10n, String status) {
    switch (status) {
      case 'Pending':
        return l10n.memberPending;
      case 'Active':
        return l10n.memberActive;
      case 'Rejected':
        return l10n.memberRejected;
      case 'Withdrawn':
        return l10n.memberWithdrawn;
      default:
        return status;
    }
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    return Scaffold(
      backgroundColor: AppColors.loginCanvas,
      appBar: KeytAppBar(title: l10n.clubsTitle),
      body: SafeArea(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            const OfflineBanner(),
            const StudentTopBar(),
            TabBar(
              controller: _tabs,
              labelColor: AppColors.brand700,
              unselectedLabelColor: AppColors.inkMuted,
              indicatorColor: AppColors.brand700,
              tabs: [
                Tab(text: l10n.searchClubs),
                Tab(text: l10n.myClubs),
                Tab(text: l10n.elections),
              ],
            ),
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
                child: Text(
                  _error!,
                  style: const TextStyle(color: AppColors.danger),
                ),
              ),
            Expanded(
              child: _loading
                  ? const Center(child: CircularProgressIndicator())
                  : TabBarView(
                      controller: _tabs,
                      children: [
                        _catalogTab(l10n),
                        _mineTab(l10n),
                        _electionsTab(l10n),
                      ],
                    ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _catalogTab(AppLocalizations l10n) {
    return RefreshIndicator(
      onRefresh: _loadAll,
      child: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          TextField(
            controller: _search,
            decoration: InputDecoration(
              labelText: l10n.searchClubs,
              suffixIcon: IconButton(
                icon: const Icon(Icons.search),
                onPressed: _busy ? null : _loadAll,
              ),
            ),
            onSubmitted: (_) => _loadAll(),
          ),
          const SizedBox(height: 12),
          if (_catalog.isEmpty)
            StudentSectionCard(
              child: Text(
                l10n.emptyCatalog,
                style: const TextStyle(color: AppColors.inkMuted),
              ),
            )
          else
            ..._catalog.map((club) {
              final id = (club['id'] as num?)?.toInt() ?? 0;
              final name = (club['name'] ?? '').toString();
              final president = (club['presidentName'] ?? '').toString();
              final patron = (club['patronName'] ?? '').toString();
              return Padding(
                padding: const EdgeInsets.only(bottom: 10),
                child: StudentSectionCard(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        name,
                        style: const TextStyle(fontWeight: FontWeight.w800),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        '${l10n.president}: ${president.isEmpty ? '—' : president}',
                        style: const TextStyle(
                          fontSize: 12,
                          color: AppColors.inkMuted,
                        ),
                      ),
                      Text(
                        '${l10n.patron}: ${patron.isEmpty ? '—' : patron}',
                        style: const TextStyle(
                          fontSize: 12,
                          color: AppColors.inkMuted,
                        ),
                      ),
                      const SizedBox(height: 8),
                      Align(
                        alignment: Alignment.centerRight,
                        child: FilledButton(
                          onPressed: _busy || id == 0
                              ? null
                              : () => _runAction(() async {
                                    await ref
                                        .read(apiClientProvider)
                                        .post('/clubs/$id/join');
                                    setState(
                                      () => _notice = l10n.joinRequested,
                                    );
                                  }),
                          child: Text(l10n.joinClub),
                        ),
                      ),
                    ],
                  ),
                ),
              );
            }),
        ],
      ),
    );
  }

  Widget _mineTab(AppLocalizations l10n) {
    return RefreshIndicator(
      onRefresh: _loadAll,
      child: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          Text(
            l10n.myClubs,
            style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 16),
          ),
          const SizedBox(height: 8),
          if (_memberships.isEmpty)
            StudentSectionCard(
              child: Text(
                l10n.emptyMine,
                style: const TextStyle(color: AppColors.inkMuted),
              ),
            )
          else
            ..._memberships.map((m) {
              final clubId = (m['clubId'] as num?)?.toInt() ?? 0;
              final status = (m['status'] ?? '').toString();
              return Padding(
                padding: const EdgeInsets.only(bottom: 8),
                child: StudentSectionCard(
                  child: Row(
                    children: [
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              (m['name'] ?? '').toString(),
                              style: const TextStyle(
                                fontWeight: FontWeight.w700,
                              ),
                            ),
                            Text(
                              '${m['role'] ?? ''} · ${_memberStatus(l10n, status)}',
                              style: const TextStyle(
                                fontSize: 12,
                                color: AppColors.inkMuted,
                              ),
                            ),
                          ],
                        ),
                      ),
                      if (status == 'Pending')
                        TextButton(
                          onPressed: _busy || clubId == 0
                              ? null
                              : () => _runAction(() async {
                                    await ref
                                        .read(apiClientProvider)
                                        .delete('/clubs/$clubId/membership');
                                    setState(() => _notice = l10n.withdrawn);
                                  }),
                          child: Text(l10n.withdraw),
                        ),
                    ],
                  ),
                ),
              );
            }),
          const SizedBox(height: 16),
          Text(
            l10n.upcomingMeetings,
            style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 16),
          ),
          const SizedBox(height: 8),
          if (_meetings.isEmpty)
            StudentSectionCard(
              child: Text(
                l10n.noMeetings,
                style: const TextStyle(color: AppColors.inkMuted),
              ),
            )
          else
            ..._meetings.map((meeting) {
              return Padding(
                padding: const EdgeInsets.only(bottom: 8),
                child: StudentSectionCard(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        (meeting['title'] ?? '').toString(),
                        style: const TextStyle(fontWeight: FontWeight.w700),
                      ),
                      Text(
                        [
                          if (meeting['meetsOn'] != null)
                            '${meeting['meetsOn']}',
                          if ((meeting['location'] ?? '')
                              .toString()
                              .isNotEmpty)
                            '${meeting['location']}',
                        ].join(' · '),
                        style: const TextStyle(
                          fontSize: 12,
                          color: AppColors.inkMuted,
                        ),
                      ),
                    ],
                  ),
                ),
              );
            }),
        ],
      ),
    );
  }

  Widget _electionsTab(AppLocalizations l10n) {
    final open = _elections
        .where((e) => (e['status'] ?? '').toString() == 'Open')
        .toList();
    return RefreshIndicator(
      onRefresh: _loadAll,
      child: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          if (open.isEmpty)
            StudentSectionCard(
              child: Text(
                l10n.emptyElections,
                style: const TextStyle(color: AppColors.inkMuted),
              ),
            )
          else
            ...open.map((election) {
              final electionId = (election['id'] as num?)?.toInt() ?? 0;
              final hasVoted = election['hasVoted'] == true;
              final candidates = (election['candidates'] is List)
                  ? (election['candidates'] as List)
                      .whereType<Map>()
                      .map((e) => Map<String, dynamic>.from(e))
                      .toList()
                  : <Map<String, dynamic>>[];
              return Padding(
                padding: const EdgeInsets.only(bottom: 12),
                child: StudentSectionCard(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        (election['title'] ?? '').toString(),
                        style: const TextStyle(fontWeight: FontWeight.w800),
                      ),
                      Text(
                        (election['clubName'] ?? '').toString(),
                        style: const TextStyle(
                          fontSize: 12,
                          color: AppColors.inkMuted,
                        ),
                      ),
                      const SizedBox(height: 8),
                      if (hasVoted)
                        Text(
                          l10n.alreadyVoted,
                          style: const TextStyle(
                            color: AppColors.info,
                            fontWeight: FontWeight.w600,
                          ),
                        )
                      else
                        ...candidates.map((c) {
                          final candidateId =
                              (c['studentId'] as num?)?.toInt() ?? 0;
                          final name = (c['name'] ?? '').toString();
                          return Padding(
                            padding: const EdgeInsets.only(bottom: 6),
                            child: OutlinedButton(
                              onPressed: _busy ||
                                      electionId == 0 ||
                                      candidateId == 0
                                  ? null
                                  : () => _runAction(() async {
                                        await ref
                                            .read(apiClientProvider)
                                            .post(
                                              '/clubs/elections/$electionId/vote',
                                              data: {
                                                'candidateStudentId':
                                                    candidateId,
                                              },
                                            );
                                        setState(
                                          () => _notice = l10n.voteCast,
                                        );
                                      }),
                              child: Text(l10n.voteFor(name)),
                            ),
                          );
                        }),
                    ],
                  ),
                ),
              );
            }),
        ],
      ),
    );
  }
}

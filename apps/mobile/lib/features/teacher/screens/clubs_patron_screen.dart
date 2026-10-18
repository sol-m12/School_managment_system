import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/api/api_client.dart';
import '../../../core/providers.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/widgets/keyt_app_bar.dart';
import '../../../core/widgets/offline_banner.dart';
import '../../../l10n/app_localizations.dart';
import '../widgets/teacher_chrome.dart';

/// Teacher club patron: approve/reject joins, schedule meetings, activity reports.
class TeacherClubsPatronScreen extends ConsumerStatefulWidget {
  const TeacherClubsPatronScreen({super.key});

  @override
  ConsumerState<TeacherClubsPatronScreen> createState() =>
      _TeacherClubsPatronScreenState();
}

class _TeacherClubsPatronScreenState
    extends ConsumerState<TeacherClubsPatronScreen> {
  List<Map<String, dynamic>> _rows = const [];
  bool _loading = true;
  bool _busy = false;
  String? _error;
  String? _notice;

  final _meetingTitle = TextEditingController();
  final _meetingWhen = TextEditingController();
  final _meetingLocation = TextEditingController();
  final _reportTitle = TextEditingController();
  final _reportDate = TextEditingController();
  final _reportBody = TextEditingController();
  int? _formClubId;

  @override
  void initState() {
    super.initState();
    Future.microtask(_load);
  }

  @override
  void dispose() {
    _meetingTitle.dispose();
    _meetingWhen.dispose();
    _meetingLocation.dispose();
    _reportTitle.dispose();
    _reportDate.dispose();
    _reportBody.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    final user = ref.read(authControllerProvider).user;
    if (user == null) return;
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final res =
          await ref.read(apiClientProvider).get<Map<String, dynamic>>('/clubs/patron');
      final raw = res.data?['rows'];
      final rows = raw is List
          ? raw
              .whereType<Map>()
              .map((e) => Map<String, dynamic>.from(e))
              .toList()
          : <Map<String, dynamic>>[];
      if (!mounted) return;
      setState(() {
        _rows = rows;
        _loading = false;
        if (_formClubId == null && rows.isNotEmpty) {
          _formClubId = (rows.first['id'] as num?)?.toInt();
        }
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _loading = false;
        _error = mapDioError(e).code;
      });
    }
  }

  Future<void> _run(Future<void> Function() action, String success) async {
    if (_busy) return;
    setState(() {
      _busy = true;
      _error = null;
      _notice = null;
    });
    try {
      await action();
      if (!mounted) return;
      setState(() => _notice = success);
      await _load();
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _error = mapDioError(e).code;
      });
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    return Scaffold(
      backgroundColor: const Color(0xFFF3F5FB),
      appBar: KeytAppBar(title: l10n.patronTitle),
      body: SafeArea(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            const OfflineBanner(),
            if (_notice != null)
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 16),
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
                padding: const EdgeInsets.symmetric(horizontal: 16),
                child: Text(
                  _error!,
                  style: const TextStyle(color: AppColors.danger),
                ),
              ),
            Expanded(
              child: _loading
                  ? const Center(child: CircularProgressIndicator())
                  : RefreshIndicator(
                      onRefresh: _load,
                      child: _rows.isEmpty
                          ? ListView(
                              padding: const EdgeInsets.all(16),
                              children: [
                                TeacherSectionCard(
                                  child: Text(
                                    l10n.emptyPatron,
                                    style: const TextStyle(
                                      color: AppColors.inkMuted,
                                    ),
                                  ),
                                ),
                              ],
                            )
                          : ListView(
                              padding: const EdgeInsets.all(16),
                              children: [
                                ..._rows.map(_clubCard),
                                const SizedBox(height: 16),
                                _meetingForm(l10n),
                                const SizedBox(height: 16),
                                _reportForm(l10n),
                              ],
                            ),
                    ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _clubCard(Map<String, dynamic> club) {
    final l10n = AppLocalizations.of(context);
    final clubId = (club['id'] as num?)?.toInt() ?? 0;
    final members = (club['members'] is List)
        ? (club['members'] as List)
            .whereType<Map>()
            .map((e) => Map<String, dynamic>.from(e))
            .where((m) => (m['status'] ?? '').toString() == 'Pending')
            .toList()
        : <Map<String, dynamic>>[];

    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: TeacherSectionCard(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              (club['name'] ?? '').toString(),
              style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 16),
            ),
            Text(
              '${club['year'] ?? ''} · ${club['charterStatus'] ?? ''}',
              style: const TextStyle(fontSize: 12, color: AppColors.inkMuted),
            ),
            const SizedBox(height: 10),
            Text(
              l10n.pendingMembers,
              style: const TextStyle(fontWeight: FontWeight.w700),
            ),
            const SizedBox(height: 6),
            if (members.isEmpty)
              Text(
                l10n.noPending,
                style: const TextStyle(color: AppColors.inkMuted, fontSize: 13),
              )
            else
              ...members.map((member) {
                final memberId = (member['memberId'] as num?)?.toInt() ?? 0;
                return Padding(
                  padding: const EdgeInsets.only(bottom: 8),
                  child: Row(
                    children: [
                      Expanded(
                        child: Text((member['name'] ?? '').toString()),
                      ),
                      TextButton(
                        onPressed: _busy || clubId == 0 || memberId == 0
                            ? null
                            : () => _run(
                                  () async {
                                    await ref.read(apiClientProvider).post(
                                      '/clubs/$clubId/members/$memberId/decide',
                                      data: {'action': 'Approve'},
                                    );
                                  },
                                  l10n.memberApproved,
                                ),
                        child: Text(l10n.approve),
                      ),
                      TextButton(
                        onPressed: _busy || clubId == 0 || memberId == 0
                            ? null
                            : () => _run(
                                  () async {
                                    await ref.read(apiClientProvider).post(
                                      '/clubs/$clubId/members/$memberId/decide',
                                      data: {'action': 'Reject'},
                                    );
                                  },
                                  l10n.memberRejected,
                                ),
                        child: Text(l10n.reject),
                      ),
                    ],
                  ),
                );
              }),
          ],
        ),
      ),
    );
  }

  Widget _clubPicker(AppLocalizations l10n) {
    return DropdownButtonFormField<int>(
      key: ValueKey('club-picker-$_formClubId-${_rows.length}'),
      initialValue: _formClubId,
      decoration: InputDecoration(labelText: l10n.clubsTitle),
      items: _rows
          .map((c) {
            final id = (c['id'] as num?)?.toInt();
            if (id == null) return null;
            return DropdownMenuItem(
              value: id,
              child: Text((c['name'] ?? '').toString()),
            );
          })
          .whereType<DropdownMenuItem<int>>()
          .toList(),
      onChanged: _busy
          ? null
          : (v) => setState(() => _formClubId = v),
    );
  }

  Widget _meetingForm(AppLocalizations l10n) {
    return TeacherSectionCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Text(
            l10n.scheduleMeeting,
            style: const TextStyle(fontWeight: FontWeight.w800),
          ),
          const SizedBox(height: 8),
          _clubPicker(l10n),
          TextField(
            controller: _meetingTitle,
            decoration: InputDecoration(labelText: l10n.meetingTitle),
          ),
          TextField(
            controller: _meetingWhen,
            decoration: InputDecoration(labelText: l10n.meetsOn),
          ),
          TextField(
            controller: _meetingLocation,
            decoration: InputDecoration(labelText: l10n.location),
          ),
          const SizedBox(height: 8),
          FilledButton(
            onPressed: _busy || _formClubId == null
                ? null
                : () => _run(
                      () async {
                        await ref.read(apiClientProvider).post(
                          '/clubs/$_formClubId/meetings',
                          data: {
                            'title': _meetingTitle.text.trim(),
                            'meetsOn': _meetingWhen.text.trim(),
                            'location': _meetingLocation.text.trim(),
                          },
                        );
                        _meetingTitle.clear();
                        _meetingWhen.clear();
                        _meetingLocation.clear();
                      },
                      l10n.meetingSaved,
                    ),
            child: Text(l10n.saveMeeting),
          ),
        ],
      ),
    );
  }

  Widget _reportForm(AppLocalizations l10n) {
    return TeacherSectionCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Text(
            l10n.activityReport,
            style: const TextStyle(fontWeight: FontWeight.w800),
          ),
          const SizedBox(height: 8),
          _clubPicker(l10n),
          TextField(
            controller: _reportTitle,
            decoration: InputDecoration(labelText: l10n.reportTitle),
          ),
          TextField(
            controller: _reportDate,
            decoration: InputDecoration(labelText: l10n.reportDate),
          ),
          TextField(
            controller: _reportBody,
            minLines: 3,
            maxLines: 5,
            decoration: InputDecoration(labelText: l10n.reportBody),
          ),
          const SizedBox(height: 8),
          FilledButton(
            onPressed: _busy || _formClubId == null
                ? null
                : () => _run(
                      () async {
                        await ref.read(apiClientProvider).post(
                          '/clubs/$_formClubId/reports',
                          data: {
                            'title': _reportTitle.text.trim(),
                            'reportDate': _reportDate.text.trim(),
                            'body': _reportBody.text.trim(),
                          },
                        );
                        _reportTitle.clear();
                        _reportDate.clear();
                        _reportBody.clear();
                      },
                      l10n.reportSaved,
                    ),
            child: Text(l10n.saveReport),
          ),
        ],
      ),
    );
  }
}

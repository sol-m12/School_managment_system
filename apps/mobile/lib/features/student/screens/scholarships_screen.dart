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

/// Same as website student scholarships portal.
class StudentScholarshipsScreen extends ConsumerStatefulWidget {
  const StudentScholarshipsScreen({super.key});

  @override
  ConsumerState<StudentScholarshipsScreen> createState() =>
      _StudentScholarshipsScreenState();
}

class _StudentScholarshipsScreenState
    extends ConsumerState<StudentScholarshipsScreen> {
  Map<String, dynamic>? _data;
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
          .get<Map<String, dynamic>>('/scholarships/student');
      if (!mounted) return;
      setState(() {
        _data = res.data;
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

  Future<void> _apply(int opportunityId) async {
    if (_busy) return;
    setState(() {
      _busy = true;
      _error = null;
      _notice = null;
    });
    try {
      await ref.read(apiClientProvider).post(
        '/scholarships/student/apply',
        data: {'opportunityId': opportunityId, 'note': ''},
      );
      if (!mounted) return;
      setState(() => _notice = AppLocalizations.of(context).schApplied);
      await _load();
    } catch (e) {
      if (!mounted) return;
      setState(() => _error = mapDioError(e).code);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _requestLetter(int applicationId) async {
    if (_busy) return;
    setState(() {
      _busy = true;
      _error = null;
      _notice = null;
    });
    try {
      await ref.read(apiClientProvider).post(
        '/scholarships/student/request-letter',
        data: {'applicationId': applicationId},
      );
      if (!mounted) return;
      setState(() => _notice = AppLocalizations.of(context).schLetterRequested);
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
    final unlocked = _data?['unlocked'] == true;
    final opportunities = _maps(_data?['opportunities']);
    final applications = _maps(_data?['applications']);
    final score = _data?['score'];
    final cutoff = _data?['cutoff'];

    return Scaffold(
      backgroundColor: AppColors.loginCanvas,
      appBar: KeytAppBar(title: l10n.schStudentTitle),
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
                          if (!unlocked)
                            StudentSectionCard(
                              child: Text(l10n.schLocked),
                            )
                          else ...[
                            StudentSectionCard(
                              color: const Color(0xFFECFDF5),
                              child: Text(
                                l10n.schEligible(
                                  (score as num?)?.toInt() ?? 0,
                                  (cutoff as num?)?.toInt() ?? 0,
                                ),
                              ),
                            ),
                            const SizedBox(height: 16),
                            Text(
                              l10n.schOpportunities,
                              style: const TextStyle(
                                fontWeight: FontWeight.w800,
                                fontSize: 16,
                              ),
                            ),
                            const SizedBox(height: 8),
                            if (opportunities.isEmpty)
                              StudentSectionCard(
                                child: Text(
                                  l10n.schEmptyOpportunities,
                                  style: const TextStyle(
                                    color: AppColors.inkMuted,
                                  ),
                                ),
                              )
                            else
                              ...opportunities.map((row) {
                                final id = (row['id'] as num?)?.toInt();
                                final url = (row['url'] ?? '').toString();
                                return Padding(
                                  padding: const EdgeInsets.only(bottom: 8),
                                  child: StudentSectionCard(
                                    padding: const EdgeInsets.all(12),
                                    child: Column(
                                      crossAxisAlignment:
                                          CrossAxisAlignment.stretch,
                                      children: [
                                        Text(
                                          (row['title'] ?? '').toString(),
                                          style: const TextStyle(
                                            fontWeight: FontWeight.w800,
                                          ),
                                        ),
                                        if (url.isNotEmpty)
                                          Text(
                                            '${l10n.schLink}: $url',
                                            style: const TextStyle(
                                              fontSize: 12,
                                              color: AppColors.inkMuted,
                                            ),
                                          ),
                                        Align(
                                          alignment: Alignment.centerRight,
                                          child: FilledButton(
                                            onPressed: id == null || _busy
                                                ? null
                                                : () => _apply(id),
                                            child: Text(l10n.schApply),
                                          ),
                                        ),
                                      ],
                                    ),
                                  ),
                                );
                              }),
                            const SizedBox(height: 16),
                            Text(
                              l10n.schMyApplications,
                              style: const TextStyle(
                                fontWeight: FontWeight.w800,
                                fontSize: 16,
                              ),
                            ),
                            const SizedBox(height: 8),
                            if (applications.isEmpty)
                              StudentSectionCard(
                                child: Text(
                                  l10n.schEmptyApplications,
                                  style: const TextStyle(
                                    color: AppColors.inkMuted,
                                  ),
                                ),
                              )
                            else
                              ...applications.map((row) {
                                final id = (row['id'] as num?)?.toInt();
                                final status =
                                    (row['status'] ?? '').toString();
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
                                                  fontWeight: FontWeight.w700,
                                                ),
                                              ),
                                              Text(
                                                status,
                                                style: const TextStyle(
                                                  fontSize: 12,
                                                  color: AppColors.inkMuted,
                                                ),
                                              ),
                                            ],
                                          ),
                                        ),
                                        if (status == 'Submitted')
                                          TextButton(
                                            onPressed: id == null || _busy
                                                ? null
                                                : () => _requestLetter(id),
                                            child: Text(l10n.schRequestLetter),
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

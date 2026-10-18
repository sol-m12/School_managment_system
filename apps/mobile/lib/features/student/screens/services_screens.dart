import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/api/api_client.dart';
import '../../../core/providers.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/widgets/json_screen.dart';
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

/// Same as website `/student/library`: loans + OPAC catalog search/reserve.
class StudentLibraryScreen extends ConsumerStatefulWidget {
  const StudentLibraryScreen({super.key});

  @override
  ConsumerState<StudentLibraryScreen> createState() =>
      _StudentLibraryScreenState();
}

class _StudentLibraryScreenState extends ConsumerState<StudentLibraryScreen> {
  final _search = TextEditingController();
  Timer? _debounce;

  Map<String, dynamic>? _desk;
  List<Map<String, dynamic>> _catalog = const [];
  List<Map<String, dynamic>> _resources = const [];
  bool _loading = true;
  bool _busy = false;
  String? _error;
  String? _notice;

  @override
  void initState() {
    super.initState();
    Future.microtask(_loadAll);
  }

  @override
  void dispose() {
    _debounce?.cancel();
    _search.dispose();
    super.dispose();
  }

  Future<void> _loadAll() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final api = ref.read(apiClientProvider);
      final desk = await api.get<Map<String, dynamic>>('/student/desk/library');
      final opac = await api.get<Map<String, dynamic>>(
        '/library/opac',
        queryParameters: {'q': _search.text.trim()},
      );
      if (!mounted) return;
      setState(() {
        _desk = desk.data;
        _catalog = _maps(opac.data?['rows']);
        _resources = _maps(opac.data?['resources']);
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

  Future<void> _loadOpac() async {
    try {
      final opac = await ref.read(apiClientProvider).get<Map<String, dynamic>>(
            '/library/opac',
            queryParameters: {'q': _search.text.trim()},
          );
      if (!mounted) return;
      setState(() {
        _catalog = _maps(opac.data?['rows']);
        _resources = _maps(opac.data?['resources']);
        _error = null;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() => _error = mapDioError(e).code);
    }
  }

  void _onSearchChanged(String _) {
    _debounce?.cancel();
    _debounce = Timer(const Duration(milliseconds: 250), _loadOpac);
  }

  Future<void> _reserve(int bookId) async {
    if (_busy) return;
    setState(() {
      _busy = true;
      _error = null;
      _notice = null;
    });
    try {
      await ref.read(apiClientProvider).post(
        '/library/opac',
        data: {'bookId': bookId},
      );
      if (!mounted) return;
      setState(() => _notice = AppLocalizations.of(context).librarySaved);
      await _loadOpac();
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
    final map = _desk ?? const <String, dynamic>{};
    final loans = _maps(map['loans']);

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
                      onRefresh: _loadAll,
                      child: ListView(
                        physics: const AlwaysScrollableScrollPhysics(),
                        padding: const EdgeInsets.fromLTRB(16, 8, 16, 24),
                        children: [
                          const StudentTopBar(),
                          if (_notice != null)
                            Padding(
                              padding: const EdgeInsets.only(bottom: 8),
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
                              padding: const EdgeInsets.only(bottom: 8),
                              child: Text(
                                _error!,
                                style: const TextStyle(color: AppColors.danger),
                              ),
                            ),
                          Text(
                            l10n.borrowedBooks,
                            style: const TextStyle(
                              fontWeight: FontWeight.w800,
                              fontSize: 16,
                            ),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            '${l10n.library}: ${map['borrowed'] ?? 0}'
                            '${map['rank'] != null ? ' • ${map['rank']}' : ''}',
                            style: const TextStyle(
                              color: AppColors.inkMuted,
                              fontSize: 12,
                            ),
                          ),
                          const SizedBox(height: 12),
                          if (loans.isEmpty)
                            StudentSectionCard(
                              child: Text(
                                l10n.noBorrowedBooks,
                                style: const TextStyle(
                                  color: AppColors.inkMuted,
                                ),
                              ),
                            )
                          else
                            ...loans.map((row) => _loanCard(l10n, row)),
                          const SizedBox(height: 20),
                          Text(
                            l10n.opacTitle,
                            style: const TextStyle(
                              fontWeight: FontWeight.w800,
                              fontSize: 16,
                            ),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            l10n.opacHelp,
                            style: const TextStyle(
                              color: AppColors.inkMuted,
                              fontSize: 12,
                            ),
                          ),
                          const SizedBox(height: 8),
                          TextField(
                            controller: _search,
                            onChanged: _onSearchChanged,
                            decoration: InputDecoration(
                              labelText: l10n.searchBooks,
                              hintText: l10n.searchBooksHint,
                              prefixIcon: const Icon(Icons.search),
                            ),
                          ),
                          const SizedBox(height: 12),
                          if (_catalog.isEmpty)
                            StudentSectionCard(
                              child: Text(
                                l10n.emptyCatalog,
                                style: const TextStyle(
                                  color: AppColors.inkMuted,
                                ),
                              ),
                            )
                          else
                            ..._catalog.map((row) => _catalogCard(l10n, row)),
                          const SizedBox(height: 20),
                          Text(
                            l10n.teacherShelf,
                            style: const TextStyle(
                              fontWeight: FontWeight.w800,
                              fontSize: 16,
                            ),
                          ),
                          const SizedBox(height: 8),
                          if (_resources.isEmpty)
                            StudentSectionCard(
                              child: Text(
                                l10n.emptyCatalog,
                                style: const TextStyle(
                                  color: AppColors.inkMuted,
                                ),
                              ),
                            )
                          else
                            ..._resources.map(
                              (row) => _resourceCard(l10n, row),
                            ),
                        ],
                      ),
                    ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _loanCard(AppLocalizations l10n, Map<String, dynamic> row) {
    final title = (row['title'] ?? '').toString();
    final status = (row['status'] ?? '').toString();
    final late = row['late'] == true;
    final badge = late
        ? l10n.overdueStatus
        : (status == 'Returned' ? l10n.returnedStatus : status);
    final color = late
        ? AppColors.danger
        : status == 'Returned'
            ? AppColors.success
            : AppColors.info;
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: StudentSectionCard(
        padding: const EdgeInsets.all(12),
        child: Row(
          children: [
            Container(
              width: 40,
              height: 40,
              decoration: BoxDecoration(
                color: AppColors.brand50,
                borderRadius: BorderRadius.circular(10),
              ),
              child: const Icon(Icons.menu_book, color: AppColors.brand700),
            ),
            const SizedBox(width: 10),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    title.isEmpty ? l10n.library : title,
                    style: const TextStyle(fontWeight: FontWeight.w700),
                  ),
                  Text(
                    [
                      if (row['borrowDate'] != null) '${row['borrowDate']}',
                      if (row['returnDate'] != null) '→ ${row['returnDate']}',
                    ].join(' '),
                    style: const TextStyle(
                      fontSize: 11,
                      color: AppColors.inkMuted,
                    ),
                  ),
                ],
              ),
            ),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
              decoration: BoxDecoration(
                color: color.withValues(alpha: 0.12),
                borderRadius: BorderRadius.circular(8),
              ),
              child: Text(
                badge,
                style: TextStyle(
                  color: color,
                  fontWeight: FontWeight.w800,
                  fontSize: 11,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _catalogCard(AppLocalizations l10n, Map<String, dynamic> row) {
    final id = (row['id'] as num?)?.toInt();
    final title = (row['title'] ?? '').toString();
    final author = (row['author'] ?? '').toString();
    final free = row['free'] ?? 0;
    final reserved = row['reserved'] == true;
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: StudentSectionCard(
        padding: const EdgeInsets.all(12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Text(
              title.isEmpty ? l10n.library : title,
              style: const TextStyle(fontWeight: FontWeight.w800),
            ),
            if (author.isNotEmpty)
              Text(
                '${l10n.author}: $author',
                style: const TextStyle(
                  fontSize: 12,
                  color: AppColors.inkMuted,
                ),
              ),
            Text(
              '${l10n.freeCopies}: $free',
              style: const TextStyle(fontSize: 12),
            ),
            const SizedBox(height: 8),
            Align(
              alignment: Alignment.centerRight,
              child: reserved
                  ? Text(
                      l10n.bookReserved,
                      style: const TextStyle(
                        color: AppColors.success,
                        fontWeight: FontWeight.w700,
                      ),
                    )
                  : FilledButton(
                      onPressed: id == null || _busy
                          ? null
                          : () => _reserve(id),
                      child: Text(l10n.reserveBook),
                    ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _resourceCard(AppLocalizations l10n, Map<String, dynamic> row) {
    final title = (row['title'] ?? '').toString();
    final subject = (row['subject'] ?? '').toString();
    final note = (row['note'] ?? '').toString();
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: StudentSectionCard(
        padding: const EdgeInsets.all(12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              title.isEmpty ? l10n.teacherShelf : title,
              style: const TextStyle(fontWeight: FontWeight.w700),
            ),
            if (subject.isNotEmpty)
              Text(
                '${l10n.subject}: $subject',
                style: const TextStyle(
                  fontSize: 12,
                  color: AppColors.inkMuted,
                ),
              ),
            if (note.isNotEmpty)
              Text(
                '${l10n.bookNote}: $note',
                style: const TextStyle(fontSize: 12),
              ),
          ],
        ),
      ),
    );
  }
}

class StudentDocumentsScreen extends StatelessWidget {
  const StudentDocumentsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    return Scaffold(
      backgroundColor: AppColors.loginCanvas,
      appBar: KeytAppBar(title: l10n.documents),
      body: SafeArea(
        child: JsonScreen(
          title: l10n.documents,
          cacheKey: 'student_documents',
          path: '/student/desk/documents',
          builder: (context, data) {
            if (data is! Map) return JsonBody(data: data);
            final map = Map<String, dynamic>.from(data);
            final rows = map['rows'] is List
                ? (map['rows'] as List)
                    .whereType<Map>()
                    .map((e) => Map<String, dynamic>.from(e))
                    .toList()
                : <Map<String, dynamic>>[];

            return Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                const StudentTopBar(),
                Text(
                  l10n.documentRequests,
                  style: const TextStyle(
                    fontWeight: FontWeight.w800,
                    fontSize: 16,
                  ),
                ),
                const SizedBox(height: 12),
                if (rows.isEmpty)
                  StudentSectionCard(
                    child: Text(
                      l10n.noDocumentRequests,
                      style: const TextStyle(color: AppColors.inkMuted),
                    ),
                  )
                else
                  ...rows.map((row) {
                    final kind = (row['kind'] ?? '').toString();
                    final purpose = (row['purpose'] ?? '').toString();
                    final status = (row['status'] ?? '').toString();
                    final color = switch (status) {
                      'Ready' => AppColors.success,
                      'Reviewing' || 'Submitted' => AppColors.info,
                      _ => AppColors.inkMuted,
                    };
                    final label = switch (status) {
                      'Ready' => l10n.readyStatus,
                      'Reviewing' => l10n.inReviewStatus,
                      _ => status,
                    };
                    return Padding(
                      padding: const EdgeInsets.only(bottom: 8),
                      child: StudentSectionCard(
                        padding: const EdgeInsets.all(12),
                        child: Row(
                          children: [
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    kind.isEmpty ? l10n.documents : kind,
                                    style: const TextStyle(
                                      fontWeight: FontWeight.w800,
                                    ),
                                  ),
                                  if (purpose.isNotEmpty)
                                    Text(
                                      purpose,
                                      style: const TextStyle(
                                        fontSize: 12,
                                        color: AppColors.inkMuted,
                                      ),
                                    ),
                                ],
                              ),
                            ),
                            Container(
                              padding: const EdgeInsets.symmetric(
                                horizontal: 8,
                                vertical: 4,
                              ),
                              decoration: BoxDecoration(
                                color: color.withValues(alpha: 0.12),
                                borderRadius: BorderRadius.circular(8),
                              ),
                              child: Text(
                                label,
                                style: TextStyle(
                                  color: color,
                                  fontWeight: FontWeight.w800,
                                  fontSize: 11,
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                    );
                  }),
                const SizedBox(height: 8),
                TextButton(
                  onPressed: () => context.push('/student/services/helpdesk'),
                  child: Text(l10n.helpdesk),
                ),
              ],
            );
          },
        ),
      ),
    );
  }
}

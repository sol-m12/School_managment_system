import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../../core/theme/app_colors.dart';
import '../../../core/widgets/json_screen.dart';
import '../../../l10n/app_localizations.dart';
import '../widgets/student_chrome.dart';

class StudentLibraryScreen extends StatelessWidget {
  const StudentLibraryScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    return Scaffold(
      backgroundColor: AppColors.loginCanvas,
      body: SafeArea(
        child: JsonScreen(
          title: l10n.library,
          cacheKey: 'student_library',
          path: '/student/desk/library',
          builder: (context, data) {
            if (data is! Map) return JsonBody(data: data);
            final map = Map<String, dynamic>.from(data);
            final loans = map['loans'] is List
                ? (map['loans'] as List)
                    .whereType<Map>()
                    .map((e) => Map<String, dynamic>.from(e))
                    .toList()
                : <Map<String, dynamic>>[];

            return Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                const StudentTopBar(),
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
                      style: const TextStyle(color: AppColors.inkMuted),
                    ),
                  )
                else
                  ...loans.map((row) {
                    final title = (row['title'] ?? '').toString();
                    final status = (row['status'] ?? '').toString();
                    final late = row['late'] == true;
                    final badge = late
                        ? l10n.overdueStatus
                        : (status == 'Returned'
                            ? l10n.returnedStatus
                            : status);
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
                              child: const Icon(
                                Icons.menu_book,
                                color: AppColors.brand700,
                              ),
                            ),
                            const SizedBox(width: 10),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    title.isEmpty ? l10n.library : title,
                                    style: const TextStyle(
                                      fontWeight: FontWeight.w700,
                                    ),
                                  ),
                                  Text(
                                    [
                                      if (row['borrowDate'] != null)
                                        '${row['borrowDate']}',
                                      if (row['returnDate'] != null)
                                        '→ ${row['returnDate']}',
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
                              padding: const EdgeInsets.symmetric(
                                horizontal: 8,
                                vertical: 4,
                              ),
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
                  }),
              ],
            );
          },
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

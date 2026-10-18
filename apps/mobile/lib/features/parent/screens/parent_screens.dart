import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/api/api_exception.dart';
import '../../../core/locale/locale_controller.dart';
import '../../../core/providers.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/widgets/json_screen.dart';
import '../../../core/widgets/keyt_app_bar.dart';
import '../../../core/widgets/last_updated_label.dart';
import '../../../core/widgets/offline_banner.dart';
import '../../../l10n/app_localizations.dart';
import '../parent_cache_keys.dart';
import '../parent_child_controller.dart';
import 'parent_academics_screen.dart';
import 'parent_child_data_screen.dart';

class ParentAttendanceHubScreen extends StatelessWidget {
  const ParentAttendanceHubScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    return ParentChildDataScreen(
      title: l10n.parentNavAttendance,
      cacheKeyFor: parentAttendanceCacheKey,
      pathFor: (id) => '/parent/children/$id/attendance',
      builder: (context, data) => Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Card(
            child: ListTile(
              leading: const Icon(Icons.gavel, color: AppColors.brand700),
              title: Text(l10n.parentConduct),
              trailing: const Icon(Icons.chevron_right),
              onTap: () => context.push('/parent/attendance/conduct'),
            ),
          ),
          const SizedBox(height: 12),
          _AttendanceBody(data: data),
        ],
      ),
    );
  }
}

class ParentAttendanceStatusScreen extends StatelessWidget {
  const ParentAttendanceStatusScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    return ParentChildDataScreen(
      title: l10n.parentAttendance,
      cacheKeyFor: parentAttendanceCacheKey,
      pathFor: (id) => '/parent/children/$id/attendance',
      builder: (context, data) => _AttendanceBody(data: data),
    );
  }
}

class _AttendanceBody extends StatelessWidget {
  const _AttendanceBody({required this.data});

  final Object? data;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    if (data is! Map) return JsonBody(data: data);
    final map = Map<String, dynamic>.from(data as Map);
    final present = (map['present'] as num?)?.toInt() ?? 0;
    final absent = (map['absent'] as num?)?.toInt() ?? 0;
    final tardy = (map['tardy'] as num?)?.toInt() ?? 0;
    final total = present + absent + tardy;
    final percent = total > 0 ? (present / total) * 100 : null;
    final rows = map['rows'] is List
        ? (map['rows'] as List)
            .whereType<Map>()
            .map((e) => Map<String, dynamic>.from(e))
            .toList()
        : <Map<String, dynamic>>[];

    if (total == 0 && rows.isEmpty) {
      return Text(l10n.noAttendanceYet);
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Card(
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              children: [
                Text(
                  percent == null
                      ? '—'
                      : '${percent.toStringAsFixed(percent % 1 == 0 ? 0 : 1)}%',
                  style: const TextStyle(
                    fontSize: 36,
                    fontWeight: FontWeight.w800,
                    color: AppColors.brand700,
                  ),
                ),
                Text(
                  l10n.overallRate,
                  style: const TextStyle(color: AppColors.inkMuted),
                ),
                const SizedBox(height: 12),
                Row(
                  children: [
                    _AttStat(label: l10n.presentCount, value: present),
                    _AttStat(label: l10n.tardyCount, value: tardy),
                    _AttStat(label: l10n.absentCount, value: absent),
                  ],
                ),
              ],
            ),
          ),
        ),
        const SizedBox(height: 12),
        Text(
          l10n.absenceLogs,
          style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 15),
        ),
        const SizedBox(height: 8),
        if (rows.isEmpty)
          Text(l10n.noAttendanceYet)
        else
          ...rows.map((row) {
            final status = row['status']?.toString();
            final label = switch (status) {
              'P' => l10n.presentCount,
              'A' => l10n.absentCount,
              'T' => l10n.tardyCount,
              _ => status ?? '',
            };
            final color = switch (status) {
              'P' => AppColors.success,
              'A' => AppColors.danger,
              'T' => AppColors.warning,
              _ => AppColors.inkMuted,
            };
            return Card(
              margin: const EdgeInsets.only(bottom: 8),
              child: ListTile(
                minVerticalPadding: 12,
                leading: CircleAvatar(
                  backgroundColor: color.withValues(alpha: 0.15),
                  child: Icon(Icons.circle, size: 12, color: color),
                ),
                title: Text(label),
                subtitle: Text(
                  [
                    row['date']?.toString() ?? '',
                    if ((row['subject']?.toString() ?? '').isNotEmpty)
                      row['subject'].toString(),
                    if ((row['approval']?.toString() ?? '').isNotEmpty)
                      row['approval'].toString(),
                  ].where((s) => s.isNotEmpty).join(' · '),
                ),
              ),
            );
          }),
      ],
    );
  }
}

class _AttStat extends StatelessWidget {
  const _AttStat({required this.label, required this.value});

  final String label;
  final int value;

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: Column(
        children: [
          Text(
            '$value',
            style: const TextStyle(
              fontWeight: FontWeight.w800,
              fontSize: 18,
              color: AppColors.brand700,
            ),
          ),
          Text(
            label,
            style: const TextStyle(fontSize: 11, color: AppColors.inkMuted),
          ),
        ],
      ),
    );
  }
}

class ParentConductScreen extends StatelessWidget {
  const ParentConductScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    return ParentChildDataScreen(
      title: l10n.parentConduct,
      cacheKeyFor: parentDisciplineCacheKey,
      pathFor: (id) => '/parent/children/$id/discipline',
      builder: (context, data) => JsonBody(data: data),
    );
  }
}

class ParentHomeworkScreen extends StatelessWidget {
  const ParentHomeworkScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    return ParentChildDataScreen(
      title: l10n.parentHomework,
      cacheKeyFor: parentAssignmentsCacheKey,
      pathFor: (id) => '/parent/children/$id/assignments',
      builder: (context, data) => _HomeworkBody(data: data),
    );
  }
}

class _HomeworkBody extends StatelessWidget {
  const _HomeworkBody({required this.data});

  final Object? data;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    if (data is! Map) return JsonBody(data: data);
    final map = Map<String, dynamic>.from(data as Map);
    final tasks = map['tasks'];
    if (tasks is! List || tasks.isEmpty) {
      return Text(l10n.emptyState);
    }
    return Column(
      children: tasks.map((raw) {
        if (raw is! Map) {
          return Card(
            margin: const EdgeInsets.only(bottom: 8),
            child: ListTile(title: Text(raw.toString())),
          );
        }
        final row = Map<String, dynamic>.from(raw);
        final indicator = row['indicator']?.toString();
        final color = indicatorColor(indicator);
        return Card(
          margin: const EdgeInsets.only(bottom: 8),
          child: ListTile(
            minVerticalPadding: 14,
            leading: color == null
                ? const Icon(Icons.assignment_outlined, color: AppColors.brand700)
                : CircleAvatar(
                    backgroundColor: color.withValues(alpha: 0.18),
                    child: Icon(Icons.circle, size: 14, color: color),
                  ),
            title: Text(
              row['title']?.toString() ??
                  row['subject']?.toString() ??
                  l10n.parentHomework,
            ),
            subtitle: Text(_homeworkSubtitle(l10n, row, indicator)),
          ),
        );
      }).toList(),
    );
  }

  String _homeworkSubtitle(
    AppLocalizations l10n,
    Map<String, dynamic> row,
    String? indicator,
  ) {
    final parts = <String>[];
    final deadline = row['deadline']?.toString();
    if (deadline != null && deadline.isNotEmpty) parts.add(deadline);
    final label = switch (indicator) {
      'done' => l10n.parentIndicatorDone,
      'missing' => l10n.parentIndicatorMissing,
      'pending' => l10n.parentIndicatorPending,
      _ => null,
    };
    if (label != null) parts.add(label);
    if (parts.isEmpty) return _formatExtras(row);
    return parts.join(' · ');
  }

  String _formatExtras(Map<String, dynamic> row) {
    final copy = Map<String, dynamic>.from(row)
      ..remove('indicator')
      ..remove('title')
      ..remove('subject')
      ..remove('deadline');
    if (copy.isEmpty) return '';
    return copy.entries.map((e) => '${e.key}: ${e.value}').join(', ');
  }
}

class ParentServicesHubScreen extends StatelessWidget {
  const ParentServicesHubScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    return Scaffold(
      backgroundColor: AppColors.loginCanvas,
      appBar: KeytAppBar(title: l10n.parentNavServices),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(16, 12, 16, 24),
        children: [
          Text(
            l10n.parentCampusServices,
            style: const TextStyle(
              fontWeight: FontWeight.w800,
              fontSize: 16,
            ),
          ),
          const SizedBox(height: 12),
          Card(
            child: Column(
              children: [
                ListTile(
                  minVerticalPadding: 14,
                  leading: const Icon(Icons.local_library_outlined,
                      color: AppColors.brand700),
                  title: Text(l10n.parentLibrary),
                  trailing: const Icon(Icons.chevron_right),
                  onTap: () => context.push('/parent/services/library'),
                ),
                const Divider(height: 1),
                ListTile(
                  minVerticalPadding: 14,
                  leading:
                      const Icon(Icons.mail_outline, color: AppColors.brand700),
                  title: Text(l10n.parentMessages),
                  trailing: const Icon(Icons.chevron_right),
                  onTap: () => context.push('/parent/services/messages'),
                ),
                const Divider(height: 1),
                ListTile(
                  minVerticalPadding: 14,
                  leading: const Icon(Icons.event_available_outlined,
                      color: AppColors.brand700),
                  title: Text(l10n.parentAppointments),
                  trailing: const Icon(Icons.chevron_right),
                  onTap: () => context.push('/parent/services/appointments'),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class ParentLibraryScreen extends StatelessWidget {
  const ParentLibraryScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    return ParentChildDataScreen(
      title: l10n.parentLibrary,
      cacheKeyFor: parentLibraryCacheKey,
      pathFor: (id) => '/parent/children/$id/library',
      builder: (context, data) => _LibraryBody(data: data),
    );
  }
}

class _LibraryBody extends StatelessWidget {
  const _LibraryBody({required this.data});

  final Object? data;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    if (data is! Map) return JsonBody(data: data);
    final map = Map<String, dynamic>.from(data as Map);
    final loans = map['loans'] is List
        ? (map['loans'] as List)
            .whereType<Map>()
            .map((e) => Map<String, dynamic>.from(e))
            .toList()
        : <Map<String, dynamic>>[];

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Card(
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  l10n.borrowedBooks,
                  style: const TextStyle(fontWeight: FontWeight.w800),
                ),
                const SizedBox(height: 6),
                Text(
                  [
                    '${l10n.library}: ${map['borrowed'] ?? 0}',
                    if ((map['rank']?.toString() ?? '').isNotEmpty)
                      map['rank'].toString(),
                    if (map['visits'] != null) '${map['visits']}',
                  ].join(' · '),
                  style: const TextStyle(color: AppColors.inkMuted, fontSize: 13),
                ),
              ],
            ),
          ),
        ),
        const SizedBox(height: 12),
        if (loans.isEmpty)
          Text(l10n.noBorrowedBooks)
        else
          ...loans.map((row) {
            final status = row['status']?.toString() ?? '';
            final late = row['late'] == true;
            return Card(
              margin: const EdgeInsets.only(bottom: 8),
              child: ListTile(
                leading: const Icon(Icons.menu_book, color: AppColors.brand700),
                title: Text(
                  (row['title']?.toString().isNotEmpty ?? false)
                      ? row['title'].toString()
                      : l10n.library,
                ),
                subtitle: Text(
                  [
                    if (row['borrowDate'] != null) '${row['borrowDate']}',
                    if (row['returnDate'] != null) '→ ${row['returnDate']}',
                  ].join(' '),
                ),
                trailing: Text(
                  late
                      ? l10n.overdueStatus
                      : status == 'Returned'
                          ? l10n.returnedStatus
                          : status,
                  style: TextStyle(
                    color: late
                        ? AppColors.danger
                        : status == 'Returned'
                            ? AppColors.success
                            : AppColors.info,
                    fontWeight: FontWeight.w700,
                    fontSize: 12,
                  ),
                ),
              ),
            );
          }),
      ],
    );
  }
}

class ParentMessagesScreen extends ConsumerWidget {
  const ParentMessagesScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppLocalizations.of(context);
    return ParentChildDataScreen(
      title: l10n.parentMessages,
      cacheKeyFor: parentMessagesCacheKey,
      pathFor: (id) => '/parent/children/$id/messages',
      builder: (context, data) {
        if (data is! Map) return JsonBody(data: data);
        final map = Map<String, dynamic>.from(data);
        final rows = map['rows'];
        if (rows is! List || rows.isEmpty) {
          return Text(l10n.emptyState);
        }
        return Column(
          children: rows.map((raw) {
            if (raw is! Map) {
              return Card(
                margin: const EdgeInsets.only(bottom: 8),
                child: ListTile(title: Text(raw.toString())),
              );
            }
            final row = Map<String, dynamic>.from(raw);
            return Card(
              margin: const EdgeInsets.only(bottom: 8),
              child: ListTile(
                minVerticalPadding: 14,
                leading: const Icon(Icons.mail_outline, color: AppColors.brand700),
                title: Text(row['withRole']?.toString() ?? ''),
                subtitle: Text(
                  [
                    if ((row['subjectName']?.toString() ?? '').isNotEmpty)
                      row['subjectName'].toString(),
                    row['body']?.toString() ?? '',
                  ].where((s) => s.isNotEmpty).join('\n'),
                ),
                isThreeLine: true,
              ),
            );
          }).toList(),
        );
      },
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => _openSendMessage(context, ref),
        icon: const Icon(Icons.send),
        label: Text(l10n.parentSendMessage),
      ),
    );
  }

  Future<void> _openSendMessage(BuildContext context, WidgetRef ref) async {
    final studentId = ref.read(selectedParentStudentIdProvider);
    if (studentId == null) return;
    final l10n = AppLocalizations.of(context);
    final bodyCtrl = TextEditingController();
    final subjectCtrl = TextEditingController();
    var withRole = 'Homeroom';

    final sent = await showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      builder: (ctx) {
        return Padding(
          padding: EdgeInsets.only(
            left: 16,
            right: 16,
            top: 16,
            bottom: MediaQuery.viewInsetsOf(ctx).bottom + 16,
          ),
          child: StatefulBuilder(
            builder: (ctx, setModal) {
              return Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Text(
                    l10n.parentSendMessage,
                    style: const TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                  const SizedBox(height: 12),
                  DropdownButtonFormField<String>(
                    initialValue: withRole,
                    decoration: InputDecoration(labelText: l10n.parentWithRole),
                    items: const [
                      DropdownMenuItem(
                        value: 'Principal',
                        child: Text('Principal'),
                      ),
                      DropdownMenuItem(
                        value: 'V_Principal',
                        child: Text('V_Principal'),
                      ),
                      DropdownMenuItem(
                        value: 'Homeroom',
                        child: Text('Homeroom'),
                      ),
                      DropdownMenuItem(
                        value: 'Subject',
                        child: Text('Subject'),
                      ),
                    ],
                    onChanged: (v) {
                      if (v != null) setModal(() => withRole = v);
                    },
                  ),
                  if (withRole == 'Subject') ...[
                    const SizedBox(height: 8),
                    TextField(
                      controller: subjectCtrl,
                      decoration: InputDecoration(
                        labelText: l10n.parentSubjectName,
                      ),
                    ),
                  ],
                  const SizedBox(height: 8),
                  TextField(
                    controller: bodyCtrl,
                    minLines: 3,
                    maxLines: 5,
                    decoration: InputDecoration(labelText: l10n.parentMessageBody),
                  ),
                  const SizedBox(height: 12),
                  SizedBox(
                    height: 48,
                    child: FilledButton(
                      onPressed: () => Navigator.pop(ctx, true),
                      child: Text(l10n.send),
                    ),
                  ),
                ],
              );
            },
          ),
        );
      },
    );

    if (sent != true || !context.mounted) {
      bodyCtrl.dispose();
      subjectCtrl.dispose();
      return;
    }

    final user = ref.read(authControllerProvider).user;
    if (user == null) return;
    try {
      await ref.read(apiClientProvider).post(
        '/parent/messages',
        data: {
          'studentId': studentId,
          'withRole': withRole,
          if (withRole == 'Subject') 'subjectName': subjectCtrl.text.trim(),
          'body': bodyCtrl.text.trim(),
        },
      );
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(l10n.parentMessageSent)),
        );
      }
      await ref.read(cacheRepositoryProvider).refreshJson(
            user: user,
            key: parentMessagesCacheKey(studentId),
            path: '/parent/children/$studentId/messages',
            parse: (j) => j,
          );
    } catch (e) {
      if (context.mounted) {
        final code = e is ApiException ? e.code : 'INTERNAL_ERROR';
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(code)),
        );
      }
    } finally {
      bodyCtrl.dispose();
      subjectCtrl.dispose();
    }
  }
}

class ParentResultsScreen extends StatelessWidget {
  const ParentResultsScreen({super.key});

  @override
  Widget build(BuildContext context) => const ParentResultsRichScreen();
}

class ParentNotificationsScreen extends ConsumerStatefulWidget {
  const ParentNotificationsScreen({super.key});

  @override
  ConsumerState<ParentNotificationsScreen> createState() =>
      _ParentNotificationsScreenState();
}

class _ParentNotificationsScreenState
    extends ConsumerState<ParentNotificationsScreen> {
  List<Map<String, dynamic>> _rows = const [];
  DateTime? _updatedAt;
  bool _loading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    Future.microtask(() => _load(force: false));
  }

  Future<void> _load({required bool force}) async {
    final user = ref.read(authControllerProvider).user;
    if (user == null || !user.isParent) return;
    setState(() {
      _loading = _rows.isEmpty;
      _error = null;
    });
    try {
      final cache = ref.read(cacheRepositoryProvider);
      final result = await cache.cacheFirstJson<Object?>(
        user: user,
        key: parentNotificationsCacheKey(),
        path: '/parent/notifications',
        parse: (json) => json,
        forceRefresh: force,
      );
      if (!mounted) return;
      setState(() {
        _rows = _parseRows(result.data);
        _updatedAt = result.updatedAt;
        _loading = false;
      });
      if (result.fromCache && !force) {
        try {
          final fresh = await cache.refreshJson<Object?>(
            user: user,
            key: parentNotificationsCacheKey(),
            path: '/parent/notifications',
            parse: (json) => json,
          );
          if (!mounted) return;
          setState(() {
            _rows = _parseRows(fresh.data);
            _updatedAt = fresh.updatedAt;
          });
        } catch (_) {}
      }
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _loading = false;
        _error = e is ApiException ? e.code : 'INTERNAL_ERROR';
      });
    }
  }

  List<Map<String, dynamic>> _parseRows(Object? data) {
    if (data is! Map) return const [];
    final rows = data['rows'];
    if (rows is! List) return const [];
    return rows
        .whereType<Map>()
        .map((e) => Map<String, dynamic>.from(e))
        .toList();
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    return Scaffold(
      appBar: KeytAppBar(title: l10n.notifications),
      body: Column(
        children: [
          const OfflineBanner(),
          LastUpdatedLabel(updatedAt: _updatedAt),
          Expanded(
            child: RefreshIndicator(
              onRefresh: () => _load(force: true),
              child: _buildList(l10n),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildList(AppLocalizations l10n) {
    if (_loading) {
      return ListView(
        physics: const AlwaysScrollableScrollPhysics(),
        children: [
          SizedBox(height: 160, child: Center(child: Text(l10n.loading))),
        ],
      );
    }
    if (_error != null && _rows.isEmpty) {
      return ListView(
        physics: const AlwaysScrollableScrollPhysics(),
        children: [
          Padding(
            padding: const EdgeInsets.all(24),
            child: Column(
              children: [
                Text(l10n.errorGeneric),
                SizedBox(
                  height: 48,
                  child: FilledButton(
                    onPressed: () => _load(force: true),
                    child: Text(l10n.retry),
                  ),
                ),
              ],
            ),
          ),
        ],
      );
    }
    if (_rows.isEmpty) {
      return ListView(
        physics: const AlwaysScrollableScrollPhysics(),
        children: [
          Padding(
            padding: const EdgeInsets.all(24),
            child: Text(l10n.notificationsEmpty, textAlign: TextAlign.center),
          ),
        ],
      );
    }
    return ListView.separated(
      physics: const AlwaysScrollableScrollPhysics(),
      itemCount: _rows.length,
      separatorBuilder: (_, _) => const Divider(height: 1),
      itemBuilder: (context, index) {
        final row = _rows[index];
        final urgent = row['urgent'] == true;
        final school = (row['schoolName']?.toString() ?? '').trim();
        return ListTile(
          minVerticalPadding: 14,
          leading: Icon(
            urgent ? Icons.priority_high : Icons.campaign_outlined,
            color: urgent ? AppColors.danger : AppColors.brand700,
          ),
          title: Text(row['title']?.toString() ?? ''),
          subtitle: Text(
            [
              if (school.isNotEmpty) school,
              row['content']?.toString() ?? '',
            ].where((s) => s.isNotEmpty).join('\n'),
          ),
          isThreeLine: school.isNotEmpty,
          trailing: urgent
              ? Chip(
                  label: Text(l10n.notificationUrgent),
                  backgroundColor: AppColors.danger.withValues(alpha: 0.12),
                  labelStyle: const TextStyle(
                    color: AppColors.danger,
                    fontSize: 12,
                  ),
                )
              : null,
        );
      },
    );
  }
}

class ParentAppointmentsScreen extends ConsumerStatefulWidget {
  const ParentAppointmentsScreen({super.key});

  @override
  ConsumerState<ParentAppointmentsScreen> createState() =>
      _ParentAppointmentsScreenState();
}

class _ParentAppointmentsScreenState
    extends ConsumerState<ParentAppointmentsScreen> {
  List<Map<String, dynamic>> _rows = const [];
  DateTime? _updatedAt;
  bool _loading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    Future.microtask(() => _load(force: false));
  }

  Future<void> _load({required bool force}) async {
    final user = ref.read(authControllerProvider).user;
    if (user == null || !user.isParent) return;
    setState(() {
      _loading = _rows.isEmpty;
      _error = null;
    });
    try {
      final cache = ref.read(cacheRepositoryProvider);
      final result = await cache.cacheFirstJson<Object?>(
        user: user,
        key: parentAppointmentsCacheKey(),
        path: '/parent/appointments',
        parse: (json) => json,
        forceRefresh: force,
      );
      if (!mounted) return;
      setState(() {
        _rows = _parseRows(result.data);
        _updatedAt = result.updatedAt;
        _loading = false;
      });
      if (result.fromCache && !force) {
        try {
          final fresh = await cache.refreshJson<Object?>(
            user: user,
            key: parentAppointmentsCacheKey(),
            path: '/parent/appointments',
            parse: (json) => json,
          );
          if (!mounted) return;
          setState(() {
            _rows = _parseRows(fresh.data);
            _updatedAt = fresh.updatedAt;
          });
        } catch (_) {}
      }
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _loading = false;
        _error = e is ApiException ? e.code : 'INTERNAL_ERROR';
      });
    }
  }

  List<Map<String, dynamic>> _parseRows(Object? data) {
    if (data is! Map) return const [];
    final rows = data['rows'];
    if (rows is! List) return const [];
    return rows
        .whereType<Map>()
        .map((e) => Map<String, dynamic>.from(e))
        .toList();
  }

  Future<void> _bookAppointment() async {
    final children = ref.read(parentChildControllerProvider).children;
    if (children.isEmpty) return;
    final l10n = AppLocalizations.of(context);
    final purposeCtrl = TextEditingController();
    final dateCtrl = TextEditingController();
    final timeCtrl = TextEditingController();
    var studentId = ref.read(selectedParentStudentIdProvider) ??
        children.first.studentId;
    var withRole = 'Principal';

    final booked = await showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      builder: (ctx) {
        return Padding(
          padding: EdgeInsets.only(
            left: 16,
            right: 16,
            top: 16,
            bottom: MediaQuery.viewInsetsOf(ctx).bottom + 16,
          ),
          child: StatefulBuilder(
            builder: (ctx, setModal) {
              return SingleChildScrollView(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    Text(
                      l10n.parentBookAppointment,
                      style: const TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                    const SizedBox(height: 12),
                    DropdownButtonFormField<int>(
                      initialValue: studentId,
                      decoration: InputDecoration(
                        labelText: l10n.parentSelectChild,
                      ),
                      items: children
                          .map(
                            (c) => DropdownMenuItem(
                              value: c.studentId,
                              child: Text(c.fullName),
                            ),
                          )
                          .toList(),
                      onChanged: (v) {
                        if (v != null) setModal(() => studentId = v);
                      },
                    ),
                    const SizedBox(height: 8),
                    DropdownButtonFormField<String>(
                      initialValue: withRole,
                      decoration:
                          InputDecoration(labelText: l10n.parentWithRole),
                      items: const [
                        DropdownMenuItem(
                          value: 'Principal',
                          child: Text('Principal'),
                        ),
                        DropdownMenuItem(
                          value: 'V_Principal',
                          child: Text('V_Principal'),
                        ),
                      ],
                      onChanged: (v) {
                        if (v != null) setModal(() => withRole = v);
                      },
                    ),
                    const SizedBox(height: 8),
                    TextField(
                      controller: purposeCtrl,
                      decoration:
                          InputDecoration(labelText: l10n.parentPurpose),
                    ),
                    const SizedBox(height: 8),
                    TextField(
                      controller: dateCtrl,
                      decoration: InputDecoration(
                        labelText: l10n.parentPreferredDate,
                        hintText: 'YYYY-MM-DD',
                      ),
                    ),
                    const SizedBox(height: 8),
                    TextField(
                      controller: timeCtrl,
                      decoration: InputDecoration(
                        labelText: l10n.parentPreferredTime,
                        hintText: 'HH:MM',
                      ),
                    ),
                    const SizedBox(height: 12),
                    SizedBox(
                      height: 48,
                      child: FilledButton(
                        onPressed: () => Navigator.pop(ctx, true),
                        child: Text(l10n.submit),
                      ),
                    ),
                  ],
                ),
              );
            },
          ),
        );
      },
    );

    if (booked != true || !mounted) {
      purposeCtrl.dispose();
      dateCtrl.dispose();
      timeCtrl.dispose();
      return;
    }

    final user = ref.read(authControllerProvider).user;
    if (user == null) return;
    try {
      final time = timeCtrl.text.trim();
      await ref.read(apiClientProvider).post(
        '/parent/appointments',
        data: {
          'studentId': studentId,
          'withRole': withRole,
          'purpose': purposeCtrl.text.trim(),
          'preferredDate': dateCtrl.text.trim(),
          if (time.isNotEmpty) 'preferredTime': time,
        },
      );
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(l10n.parentAppointmentBooked)),
        );
      }
      await _load(force: true);
    } catch (e) {
      if (mounted) {
        final code = e is ApiException ? e.code : 'INTERNAL_ERROR';
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(code)),
        );
      }
    } finally {
      purposeCtrl.dispose();
      dateCtrl.dispose();
      timeCtrl.dispose();
    }
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    return Scaffold(
      appBar: KeytAppBar(title: l10n.parentAppointments),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: _bookAppointment,
        icon: const Icon(Icons.event_available),
        label: Text(l10n.parentBookAppointment),
      ),
      body: Column(
        children: [
          const OfflineBanner(),
          LastUpdatedLabel(updatedAt: _updatedAt),
          Expanded(
            child: RefreshIndicator(
              onRefresh: () => _load(force: true),
              child: _buildList(l10n),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildList(AppLocalizations l10n) {
    if (_loading) {
      return ListView(
        physics: const AlwaysScrollableScrollPhysics(),
        children: [
          SizedBox(height: 160, child: Center(child: Text(l10n.loading))),
        ],
      );
    }
    if (_error != null && _rows.isEmpty) {
      return ListView(
        physics: const AlwaysScrollableScrollPhysics(),
        children: [
          Padding(
            padding: const EdgeInsets.all(24),
            child: Column(
              children: [
                Text(l10n.errorGeneric),
                SizedBox(
                  height: 48,
                  child: FilledButton(
                    onPressed: () => _load(force: true),
                    child: Text(l10n.retry),
                  ),
                ),
              ],
            ),
          ),
        ],
      );
    }
    if (_rows.isEmpty) {
      return ListView(
        physics: const AlwaysScrollableScrollPhysics(),
        children: [
          Padding(
            padding: const EdgeInsets.all(24),
            child: Text(l10n.emptyState, textAlign: TextAlign.center),
          ),
        ],
      );
    }
    return ListView.separated(
      physics: const AlwaysScrollableScrollPhysics(),
      itemCount: _rows.length,
      separatorBuilder: (_, _) => const Divider(height: 1),
      itemBuilder: (context, index) {
        final row = _rows[index];
        final school = (row['schoolName']?.toString() ?? '').trim();
        return ListTile(
          minVerticalPadding: 14,
          leading: const Icon(Icons.event, color: AppColors.brand700),
          title: Text(row['purpose']?.toString() ?? ''),
          subtitle: Text(
            [
              row['studentName']?.toString() ?? '',
              if (school.isNotEmpty) school,
              '${row['preferredDate'] ?? ''} ${row['preferredTime'] ?? ''}'
                  .trim(),
              row['status']?.toString() ?? '',
            ].where((s) => s.isNotEmpty).join('\n'),
          ),
          isThreeLine: true,
        );
      },
    );
  }
}

class ParentMoreScreen extends ConsumerWidget {
  const ParentMoreScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppLocalizations.of(context);
    final user = ref.watch(authControllerProvider).user;
    final locale = ref.watch(localeControllerProvider);
    final childrenState = ref.watch(parentChildControllerProvider);
    final parentName = childrenState.parentDisplayName?.trim() ?? '';
    final parentCode = childrenState.parentCode?.trim() ?? '';

    return Scaffold(
      backgroundColor: AppColors.loginCanvas,
      appBar: KeytAppBar(title: l10n.parentNavMore),
      body: ListView(
        padding: const EdgeInsets.only(bottom: 24),
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 12, 16, 8),
            child: Card(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      parentName.isEmpty ? l10n.profile : parentName,
                      style: const TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.w800,
                      ),
                    ),
                    if (parentCode.isNotEmpty) ...[
                      const SizedBox(height: 4),
                      Text(
                        '${l10n.parentParentCode}: $parentCode',
                        style: const TextStyle(color: AppColors.inkMuted),
                      ),
                    ],
                    if (user != null) ...[
                      const SizedBox(height: 4),
                      Text(
                        user.username,
                        style: const TextStyle(
                          color: AppColors.inkMuted,
                          fontSize: 13,
                        ),
                      ),
                    ],
                    const SizedBox(height: 8),
                    Text(
                      l10n.parentEnrolledChildren(childrenState.children.length),
                      style: const TextStyle(
                        fontWeight: FontWeight.w600,
                        color: AppColors.brand700,
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
          if (childrenState.children.isNotEmpty) ...[
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 8, 16, 4),
              child: Text(
                l10n.parentVerifiedChildren,
                style: const TextStyle(fontWeight: FontWeight.w800),
              ),
            ),
            ...childrenState.children.map((child) {
              final active =
                  child.studentId == childrenState.selectedStudentId;
              final school = child.schoolName.trim().isEmpty
                  ? l10n.parentSchoolFallback
                  : child.schoolName.trim();
              return ListTile(
                leading: CircleAvatar(
                  backgroundColor: AppColors.brand100,
                  child: Text(
                    child.fullName.isEmpty
                        ? '?'
                        : child.fullName.substring(0, 1).toUpperCase(),
                    style: const TextStyle(
                      color: AppColors.brand700,
                      fontWeight: FontWeight.w800,
                    ),
                  ),
                ),
                title: Text(child.fullName),
                subtitle: Text(
                  [
                    if (child.gradeLevel.isNotEmpty) child.gradeLevel,
                    if (child.section.isNotEmpty) child.section,
                    school,
                  ].join(' · '),
                ),
                trailing: active
                    ? Chip(
                        label: Text(l10n.parentActiveChild),
                        visualDensity: VisualDensity.compact,
                      )
                    : TextButton(
                        onPressed: () => ref
                            .read(parentChildControllerProvider.notifier)
                            .selectChild(child.studentId),
                        child: Text(l10n.parentSwitchChild),
                      ),
              );
            }),
            const Divider(height: 1),
          ],
          ListTile(
            minVerticalPadding: 16,
            leading: const Icon(Icons.notifications_outlined),
            title: Text(l10n.notifications),
            trailing: const Icon(Icons.chevron_right),
            onTap: () => context.push('/parent/more/notifications'),
          ),
          const Divider(height: 1),
          ListTile(
            minVerticalPadding: 16,
            leading: const Icon(Icons.event_available_outlined),
            title: Text(l10n.parentAppointments),
            trailing: const Icon(Icons.chevron_right),
            onTap: () => context.push('/parent/services/appointments'),
          ),
          const Divider(height: 1),
          ListTile(
            minVerticalPadding: 16,
            leading: const Icon(Icons.bar_chart),
            title: Text(l10n.results),
            trailing: const Icon(Icons.chevron_right),
            onTap: () => context.push('/parent/academics/results'),
          ),
          const Divider(height: 1),
          ListTile(
            minVerticalPadding: 16,
            leading: const Icon(Icons.language),
            title: Text(l10n.language),
            subtitle: Text(
              locale.languageCode == 'en'
                  ? l10n.languageEnglish
                  : l10n.languageAmharic,
            ),
          ),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
            child: SegmentedButton<String>(
              segments: [
                ButtonSegment(value: 'am', label: Text(l10n.languageAmharic)),
                ButtonSegment(value: 'en', label: Text(l10n.languageEnglish)),
              ],
              selected: {locale.languageCode},
              onSelectionChanged: (values) {
                ref
                    .read(localeControllerProvider.notifier)
                    .setLocale(Locale(values.first));
              },
            ),
          ),
          const Divider(height: 1),
          ListTile(
            minVerticalPadding: 16,
            leading: const Icon(Icons.logout, color: AppColors.danger),
            title: Text(
              l10n.logout,
              style: const TextStyle(color: AppColors.danger),
            ),
            onTap: () {
              ref.read(parentChildControllerProvider.notifier).clearSelection();
              ref.read(authControllerProvider.notifier).logout();
            },
          ),
        ],
      ),
    );
  }
}

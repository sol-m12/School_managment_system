import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/api/api_exception.dart';
import '../../../core/providers.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/widgets/keyt_app_bar.dart';
import '../../../core/widgets/last_updated_label.dart';
import '../../../core/widgets/offline_banner.dart';
import '../../../l10n/app_localizations.dart';

class NotificationsScreen extends ConsumerStatefulWidget {
  const NotificationsScreen({super.key});

  @override
  ConsumerState<NotificationsScreen> createState() =>
      _NotificationsScreenState();
}

class _NotificationsScreenState extends ConsumerState<NotificationsScreen> {
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
    if (user == null) return;
    setState(() {
      _loading = _rows.isEmpty;
      _error = null;
    });
    try {
      final cache = ref.read(cacheRepositoryProvider);
      final result = await cache.cacheFirstJson<Object?>(
        user: user,
        key: 'student_notifications',
        path: '/student/desk/notifications',
        parse: (json) => json,
        forceRefresh: force,
      );
      if (!mounted) return;
      setState(() {
        _rows = _parseRows(result.data);
        _updatedAt = result.updatedAt;
        _loading = false;
      });
      await ref.read(localNotificationServiceProvider).pollStudentAnnouncements(user);
      if (result.fromCache && !force) {
        try {
          final fresh = await cache.refreshJson<Object?>(
            user: user,
            key: 'student_notifications',
            path: '/student/desk/notifications',
            parse: (json) => json,
          );
          if (!mounted) return;
          setState(() {
            _rows = _parseRows(fresh.data);
            _updatedAt = fresh.updatedAt;
          });
          await ref
              .read(localNotificationServiceProvider)
              .pollStudentAnnouncements(user);
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
        children: [SizedBox(height: 160, child: Center(child: Text(l10n.loading)))],
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
                FilledButton(onPressed: () => _load(force: true), child: Text(l10n.retry)),
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
        return ListTile(
          minVerticalPadding: 14,
          leading: Icon(
            urgent ? Icons.priority_high : Icons.campaign_outlined,
            color: urgent ? AppColors.danger : AppColors.brand700,
          ),
          title: Text(row['title']?.toString() ?? ''),
          subtitle: Text(row['content']?.toString() ?? ''),
          trailing: urgent
              ? Chip(
                  label: Text(l10n.notificationUrgent),
                  backgroundColor: AppColors.danger.withValues(alpha: 0.12),
                  labelStyle: const TextStyle(color: AppColors.danger, fontSize: 12),
                )
              : null,
        );
      },
    );
  }
}
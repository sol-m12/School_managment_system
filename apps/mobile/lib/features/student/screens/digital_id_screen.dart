import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:qr_flutter/qr_flutter.dart';

import '../../../core/api/api_exception.dart';
import '../../../core/providers.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/widgets/last_updated_label.dart';
import '../../../core/widgets/offline_banner.dart';
import '../../../l10n/app_localizations.dart';

class DigitalIdScreen extends ConsumerStatefulWidget {
  const DigitalIdScreen({super.key});

  @override
  ConsumerState<DigitalIdScreen> createState() => _DigitalIdScreenState();
}

class _DigitalIdScreenState extends ConsumerState<DigitalIdScreen> {
  Map<String, dynamic>? _data;
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
      _loading = _data == null;
      _error = null;
    });
    try {
      final cache = ref.read(cacheRepositoryProvider);
      final result = await cache.cacheFirstJson<Object?>(
        user: user,
        key: 'student_id',
        path: '/student/desk/id',
        parse: (json) => json,
        forceRefresh: force,
      );
      if (!mounted) return;
      final map = result.data is Map
          ? Map<String, dynamic>.from(result.data as Map)
          : null;
      setState(() {
        _data = map;
        _updatedAt = result.updatedAt;
        _loading = false;
      });
      if (result.fromCache && !force) {
        try {
          final fresh = await cache.refreshJson<Object?>(
            user: user,
            key: 'student_id',
            path: '/student/desk/id',
            parse: (json) => json,
          );
          if (!mounted) return;
          setState(() {
            _data = fresh.data is Map
                ? Map<String, dynamic>.from(fresh.data as Map)
                : _data;
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

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    return Scaffold(
      appBar: AppBar(title: Text(l10n.digitalId)),
      body: Column(
        children: [
          const OfflineBanner(),
          LastUpdatedLabel(updatedAt: _updatedAt),
          Expanded(
            child: RefreshIndicator(
              onRefresh: () => _load(force: true),
              child: ListView(
                physics: const AlwaysScrollableScrollPhysics(),
                padding: const EdgeInsets.all(16),
                children: [_body(l10n)],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _body(AppLocalizations l10n) {
    if (_loading) return Center(child: Text(l10n.loading));
    if (_error != null && _data == null) {
      return Column(
        children: [
          Text(l10n.errorGeneric),
          const SizedBox(height: 12),
          FilledButton(onPressed: () => _load(force: true), child: Text(l10n.retry)),
        ],
      );
    }
    final data = _data;
    if (data == null) return Text(l10n.emptyState);

    final code = (data['code'] as String?)?.trim() ?? '';
    final name = data['fullName']?.toString() ?? '';
    final grade = data['gradeLevel'];
    final section = data['section']?.toString() ?? '';
    final year = data['academicYear']?.toString() ?? '';
    final username = data['username']?.toString() ?? '';
    final gender = data['gender']?.toString();

    return Card(
      elevation: 2,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          children: [
            if (code.isNotEmpty)
              QrImageView(
                data: code,
                version: QrVersions.auto,
                size: 200,
                backgroundColor: Colors.white,
              )
            else
              Text(l10n.emptyState),
            const SizedBox(height: 16),
            Text(
              name,
              textAlign: TextAlign.center,
              style: const TextStyle(
                fontSize: 22,
                fontWeight: FontWeight.w700,
                color: AppColors.brand700,
              ),
            ),
            const SizedBox(height: 8),
            Text('${l10n.studentCode}: $code'),
            Text('$grade$section · $year'),
            if (gender != null) Text(gender),
            if (username.isNotEmpty)
              Padding(
                padding: const EdgeInsets.only(top: 8),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    const Icon(Icons.badge_outlined, size: 18, color: AppColors.inkMuted),
                    const SizedBox(width: 6),
                    Text(username, style: const TextStyle(color: AppColors.inkMuted)),
                  ],
                ),
              ),
          ],
        ),
      ),
    );
  }
}

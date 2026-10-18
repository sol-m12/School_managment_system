import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:qr_flutter/qr_flutter.dart';

import '../../../core/api/api_exception.dart';
import '../../../core/providers.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/widgets/auth_profile_photo.dart';
import '../../../core/widgets/last_updated_label.dart';
import '../../../core/widgets/offline_banner.dart';
import '../../../l10n/app_localizations.dart';
import '../widgets/student_chrome.dart';

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
    final user = ref.watch(authControllerProvider).user;
    final schoolName = (user?.tenantName.trim().isNotEmpty ?? false)
        ? user!.tenantName
        : l10n.appName;

    return Scaffold(
      backgroundColor: AppColors.loginCanvas,
      body: SafeArea(
        child: Column(
          children: [
            const OfflineBanner(),
            StudentTopBar(
              fullName: _data?['fullName']?.toString(),
              hasPhoto: (_data?['photo']?.toString().isNotEmpty ?? false) &&
                  _data?['photo'] != 'default_profile.png',
              academicYear: _data?['academicYear']?.toString(),
            ),
            LastUpdatedLabel(updatedAt: _updatedAt),
            Expanded(
              child: RefreshIndicator(
                onRefresh: () => _load(force: true),
                child: ListView(
                  physics: const AlwaysScrollableScrollPhysics(),
                  padding: const EdgeInsets.fromLTRB(16, 8, 16, 24),
                  children: [_body(l10n, schoolName)],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _body(AppLocalizations l10n, String schoolName) {
    if (_loading) return Center(child: Text(l10n.loading));
    if (_error != null && _data == null) {
      return Column(
        children: [
          Text(l10n.errorGeneric),
          const SizedBox(height: 12),
          FilledButton(
            onPressed: () => _load(force: true),
            child: Text(l10n.retry),
          ),
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
    final photo = data['photo']?.toString();
    final hasPhoto = photo != null &&
        photo.isNotEmpty &&
        photo != 'default_profile.png';

    return Column(
      children: [
        Container(
          width: double.infinity,
          padding: const EdgeInsets.all(18),
          decoration: BoxDecoration(
            gradient: const LinearGradient(
              colors: [AppColors.brand700, AppColors.brand800],
            ),
            borderRadius: BorderRadius.circular(20),
            boxShadow: [
              BoxShadow(
                color: AppColors.brand900.withValues(alpha: 0.2),
                blurRadius: 16,
                offset: const Offset(0, 8),
              ),
            ],
          ),
          child: Column(
            children: [
              Row(
                children: [
                  const Icon(Icons.verified, color: AppColors.success, size: 16),
                  const SizedBox(width: 6),
                  Expanded(
                    child: Text(
                      schoolName,
                      style: TextStyle(
                        color: Colors.white.withValues(alpha: 0.9),
                        fontWeight: FontWeight.w700,
                        fontSize: 12,
                      ),
                    ),
                  ),
                  Text(
                    l10n.digitalId,
                    style: TextStyle(
                      color: Colors.white.withValues(alpha: 0.85),
                      fontSize: 11,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 16),
              Row(
                children: [
                  AuthProfilePhoto(
                    size: 72,
                    fullName: name,
                    hasPhoto: hasPhoto,
                    borderColor: Colors.white,
                  ),
                  const SizedBox(width: 14),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          name.isEmpty ? l10n.studentRoleLabel : name,
                          style: const TextStyle(
                            color: Colors.white,
                            fontSize: 18,
                            fontWeight: FontWeight.w800,
                          ),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          [
                            if (code.isNotEmpty) code,
                            if (grade != null) '$grade$section',
                          ].join(' • '),
                          style: TextStyle(
                            color: Colors.white.withValues(alpha: 0.85),
                            fontSize: 12,
                          ),
                        ),
                        if (year.isNotEmpty)
                          Text(
                            l10n.academicYearLabel(year),
                            style: TextStyle(
                              color: Colors.white.withValues(alpha: 0.7),
                              fontSize: 11,
                            ),
                          ),
                      ],
                    ),
                  ),
                ],
              ),
              if (code.isNotEmpty) ...[
                const SizedBox(height: 16),
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(14),
                  ),
                  child: QrImageView(
                    data: code,
                    version: QrVersions.auto,
                    size: 160,
                    backgroundColor: Colors.white,
                  ),
                ),
              ],
            ],
          ),
        ),
        if (username.isNotEmpty) ...[
          const SizedBox(height: 12),
          StudentSectionCard(
            child: Row(
              children: [
                const Icon(Icons.badge_outlined, color: AppColors.inkMuted),
                const SizedBox(width: 8),
                Text(
                  username,
                  style: const TextStyle(color: AppColors.inkMuted),
                ),
              ],
            ),
          ),
        ],
      ],
    );
  }
}

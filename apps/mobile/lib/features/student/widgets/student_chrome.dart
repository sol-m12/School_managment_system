import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/locale/locale_controller.dart';
import '../../../core/providers.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/widgets/auth_profile_photo.dart';
import '../../../l10n/app_localizations.dart';

/// Student header: real school name, year/semester, EN|አማ toggle, photo.
class StudentTopBar extends ConsumerWidget {
  const StudentTopBar({
    super.key,
    this.fullName,
    this.hasPhoto = true,
    this.academicYear,
    this.semester,
  });

  final String? fullName;
  final bool hasPhoto;
  final String? academicYear;
  final String? semester;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppLocalizations.of(context);
    final user = ref.watch(authControllerProvider).user;
    final locale = ref.watch(localeControllerProvider);
    final online = ref.watch(isOnlineProvider).value ?? true;
    final schoolName = (user?.tenantName.trim().isNotEmpty ?? false)
        ? user!.tenantName
        : l10n.appName;

    final yearLine = [
      if ((academicYear ?? '').trim().isNotEmpty) academicYear!.trim(),
      if ((semester ?? '').trim().isNotEmpty)
        l10n.semesterLabel(semester!.trim()),
      online ? l10n.synced : l10n.offlineBannerShort,
    ].join(' • ');

    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 8, 12, 8),
      child: Row(
        children: [
          Container(
            width: 36,
            height: 36,
            decoration: BoxDecoration(
              color: AppColors.brand700,
              borderRadius: BorderRadius.circular(10),
            ),
            child: const Icon(Icons.account_balance, color: Colors.white, size: 20),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Flexible(
                      child: Text(
                        schoolName,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(
                          fontWeight: FontWeight.w800,
                          fontSize: 14,
                          color: AppColors.inkStrong,
                        ),
                      ),
                    ),
                    const SizedBox(width: 4),
                    const Icon(Icons.verified, size: 14, color: AppColors.success),
                  ],
                ),
                if (yearLine.isNotEmpty) ...[
                  const SizedBox(height: 2),
                  Text(
                    yearLine,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(
                      fontSize: 11,
                      color: AppColors.inkMuted,
                    ),
                  ),
                ],
              ],
            ),
          ),
          _LanguagePill(
            isEnglish: locale.languageCode == 'en',
            onToggle: () {
              final next = locale.languageCode == 'am'
                  ? const Locale('en')
                  : const Locale('am');
              ref.read(localeControllerProvider.notifier).setLocale(next);
            },
          ),
          const SizedBox(width: 8),
          AuthProfilePhoto(
            size: 36,
            fullName: fullName ?? user?.username,
            hasPhoto: hasPhoto,
          ),
        ],
      ),
    );
  }
}

class _LanguagePill extends StatelessWidget {
  const _LanguagePill({required this.isEnglish, required this.onToggle});

  final bool isEnglish;
  final VoidCallback onToggle;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: AppColors.surface,
      borderRadius: BorderRadius.circular(20),
      child: InkWell(
        onTap: onToggle,
        borderRadius: BorderRadius.circular(20),
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(20),
            border: Border.all(color: AppColors.border),
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(
                'EN',
                style: TextStyle(
                  fontSize: 11,
                  fontWeight: FontWeight.w800,
                  color: isEnglish ? AppColors.brand700 : AppColors.inkMuted,
                ),
              ),
              Text(
                ' | ',
                style: TextStyle(fontSize: 11, color: AppColors.inkMuted),
              ),
              Text(
                'አማ',
                style: TextStyle(
                  fontSize: 11,
                  fontWeight: FontWeight.w800,
                  color: !isEnglish ? AppColors.brand700 : AppColors.inkMuted,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class StudentSectionCard extends StatelessWidget {
  const StudentSectionCard({
    super.key,
    required this.child,
    this.padding = const EdgeInsets.all(16),
    this.color = AppColors.surface,
  });

  final Widget child;
  final EdgeInsetsGeometry padding;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: padding,
      decoration: BoxDecoration(
        color: color,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: AppColors.brand900.withValues(alpha: 0.05),
            blurRadius: 16,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: child,
    );
  }
}

class StudentBilingualHeader extends StatelessWidget {
  const StudentBilingualHeader({
    super.key,
    required this.amharic,
    required this.english,
    this.trailing,
  });

  final String amharic;
  final String english;
  final Widget? trailing;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Expanded(
          child: Text(
            '$amharic | $english',
            style: const TextStyle(
              fontWeight: FontWeight.w800,
              fontSize: 15,
              color: AppColors.inkStrong,
            ),
          ),
        ),
        ?trailing,
      ],
    );
  }
}

class StudentQuickAction {
  const StudentQuickAction({
    required this.label,
    required this.icon,
    required this.onTap,
    this.color,
  });

  final String label;
  final IconData icon;
  final VoidCallback onTap;
  final Color? color;
}

class StudentQuickActionRow extends StatelessWidget {
  const StudentQuickActionRow({super.key, required this.actions});

  final List<StudentQuickAction> actions;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        for (var i = 0; i < actions.length; i++) ...[
          if (i > 0) const SizedBox(width: 8),
          Expanded(child: _QuickTile(action: actions[i])),
        ],
      ],
    );
  }
}

class _QuickTile extends StatelessWidget {
  const _QuickTile({required this.action});

  final StudentQuickAction action;

  @override
  Widget build(BuildContext context) {
    final tint = action.color ?? AppColors.brand700;
    return Material(
      color: AppColors.surface,
      borderRadius: BorderRadius.circular(14),
      child: InkWell(
        onTap: action.onTap,
        borderRadius: BorderRadius.circular(14),
        child: Container(
          padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 6),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(14),
            border: Border.all(color: AppColors.border),
          ),
          child: Column(
            children: [
              Container(
                width: 40,
                height: 40,
                decoration: BoxDecoration(
                  color: tint.withValues(alpha: 0.12),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Icon(action.icon, color: tint, size: 22),
              ),
              const SizedBox(height: 8),
              Text(
                action.label,
                textAlign: TextAlign.center,
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
                style: const TextStyle(
                  fontSize: 10,
                  fontWeight: FontWeight.w700,
                  color: AppColors.inkStrong,
                  height: 1.2,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class StudentQuickActionGrid extends StatelessWidget {
  const StudentQuickActionGrid({super.key, required this.actions});

  final List<StudentQuickAction> actions;

  @override
  Widget build(BuildContext context) {
    return GridView.count(
      crossAxisCount: 3,
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      mainAxisSpacing: 10,
      crossAxisSpacing: 10,
      childAspectRatio: 1.05,
      children: [
        for (final action in actions)
          _QuickTile(action: action),
      ],
    );
  }
}

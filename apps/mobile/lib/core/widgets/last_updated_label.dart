import 'package:flutter/material.dart';
import 'package:intl/intl.dart';

import '../../l10n/app_localizations.dart';
import '../theme/app_colors.dart';

class LastUpdatedLabel extends StatelessWidget {
  const LastUpdatedLabel({super.key, required this.updatedAt});

  final DateTime? updatedAt;

  @override
  Widget build(BuildContext context) {
    if (updatedAt == null) return const SizedBox.shrink();
    final l10n = AppLocalizations.of(context);
    final formatted = DateFormat.yMMMd().add_jm().format(updatedAt!.toLocal());
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 4, 16, 8),
      child: Text(
        l10n.lastUpdated(formatted),
        style: const TextStyle(color: AppColors.inkMuted, fontSize: 12),
      ),
    );
  }
}

import 'package:flutter/material.dart';

import '../../l10n/app_localizations.dart';
import '../theme/app_colors.dart';

const kWeekdayOrder = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
];

String weekdayToday() {
  const names = kWeekdayOrder;
  // DateTime.weekday: Mon=1 … Sun=7
  return names[DateTime.now().weekday - 1];
}

String shortDayLabel(AppLocalizations l10n, String day) {
  return switch (day) {
    'Monday' => l10n.dayMon,
    'Tuesday' => l10n.dayTue,
    'Wednesday' => l10n.dayWed,
    'Thursday' => l10n.dayThu,
    'Friday' => l10n.dayFri,
    'Saturday' => l10n.daySat,
    'Sunday' => l10n.daySun,
    _ => day.length >= 3 ? day.substring(0, 3) : day,
  };
}

String _str(Object? value) => value?.toString().trim() ?? '';

/// Horizontal Mon–Fri (or available) day chips.
class TimetableDaySelector extends StatelessWidget {
  const TimetableDaySelector({
    super.key,
    required this.days,
    required this.selected,
    required this.onSelect,
  });

  final List<String> days;
  final String selected;
  final ValueChanged<String> onSelect;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    return SizedBox(
      height: 40,
      child: ListView.separated(
        scrollDirection: Axis.horizontal,
        itemCount: days.length,
        separatorBuilder: (_, _) => const SizedBox(width: 8),
        itemBuilder: (context, index) {
          final day = days[index];
          final active = day == selected;
          return Material(
            color: active ? AppColors.brand700 : AppColors.surface,
            borderRadius: BorderRadius.circular(20),
            child: InkWell(
              onTap: () => onSelect(day),
              borderRadius: BorderRadius.circular(20),
              child: Container(
                padding:
                    const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(
                    color: active ? AppColors.brand700 : AppColors.border,
                  ),
                ),
                child: Text(
                  shortDayLabel(l10n, day),
                  style: TextStyle(
                    fontWeight: FontWeight.w800,
                    fontSize: 13,
                    color: active ? Colors.white : AppColors.inkMuted,
                  ),
                ),
              ),
            ),
          );
        },
      ),
    );
  }
}

enum PeriodStatus { completed, active, upcoming }

PeriodStatus periodStatusFromTimes(String start, String end) {
  final now = TimeOfDay.now();
  final nowMins = now.hour * 60 + now.minute;
  final startMins = _parseMins(start);
  final endMins = _parseMins(end);
  if (startMins == null || endMins == null) return PeriodStatus.upcoming;
  if (nowMins >= endMins) return PeriodStatus.completed;
  if (nowMins >= startMins && nowMins < endMins) return PeriodStatus.active;
  return PeriodStatus.upcoming;
}

int? _parseMins(String raw) {
  final parts = raw.split(':');
  if (parts.length < 2) return null;
  final h = int.tryParse(parts[0]);
  final m = int.tryParse(parts[1]);
  if (h == null || m == null) return null;
  return h * 60 + m;
}

/// Design-aligned period row: P# badge | title + meta | status pill.
class TimetablePeriodCard extends StatelessWidget {
  const TimetablePeriodCard({
    super.key,
    required this.title,
    this.subtitle,
    this.period,
    this.start,
    this.end,
    this.status,
    this.highlightActive = true,
  });

  final String title;
  final String? subtitle;
  final Object? period;
  final String? start;
  final String? end;
  final PeriodStatus? status;
  final bool highlightActive;

  factory TimetablePeriodCard.fromMap(
    Map<String, dynamic> row, {
    required AppLocalizations l10n,
    bool isToday = false,
  }) {
    final subject = _str(row['subject']).isNotEmpty
        ? _str(row['subject'])
        : _str(row['subjectName']);
    final teacher = _str(row['teacher']).isNotEmpty
        ? _str(row['teacher'])
        : _str(row['teacherName']);
    final classLabel = _str(row['classLabel']);
    final grade = _str(row['gradeLevel']);
    final section = _str(row['section']);
    final start = _str(row['start']).isNotEmpty
        ? _str(row['start'])
        : _str(row['startTime']);
    final end =
        _str(row['end']).isNotEmpty ? _str(row['end']) : _str(row['endTime']);
    final period = row['period'] ?? row['periodNumber'];

    String title;
    if (subject.isNotEmpty && (grade.isNotEmpty || classLabel.isNotEmpty)) {
      title = classLabel.isNotEmpty
          ? '$subject · $classLabel'
          : '$subject · ${l10n.gradeSection(grade, section)}';
    } else if (classLabel.isNotEmpty) {
      title = classLabel;
    } else if (grade.isNotEmpty) {
      title = l10n.gradeSection(grade, section);
    } else {
      title = subject.isEmpty ? l10n.timetable : subject;
    }

    final meta = <String>[
      if (subject.isNotEmpty &&
          (classLabel.isNotEmpty || grade.isNotEmpty) &&
          !title.startsWith(subject))
        subject,
      if (teacher.isNotEmpty) teacher,
      if (start.isNotEmpty && end.isNotEmpty) '$start – $end',
    ];

    final PeriodStatus? status = isToday && start.isNotEmpty && end.isNotEmpty
        ? periodStatusFromTimes(start, end)
        : null;

    return TimetablePeriodCard(
      title: title,
      subtitle: meta.isEmpty ? null : meta.join(' · '),
      period: period,
      start: start.isEmpty ? null : start,
      end: end.isEmpty ? null : end,
      status: status,
    );
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final resolved = status;
    final isActive = resolved == PeriodStatus.active && highlightActive;

    String? statusLabel;
    Color statusBg = AppColors.brand50;
    Color statusFg = AppColors.brand700;
    if (resolved == PeriodStatus.active) {
      statusLabel = l10n.activeNow;
      statusBg = AppColors.success.withValues(alpha: 0.15);
      statusFg = AppColors.success;
    } else if (resolved == PeriodStatus.completed) {
      statusLabel = l10n.completedStatus;
      statusBg = AppColors.brand50;
      statusFg = AppColors.inkMuted;
    } else if (resolved == PeriodStatus.upcoming) {
      statusLabel = l10n.upcomingStatus;
      statusBg = const Color(0xFFFFF7ED);
      statusFg = AppColors.warning;
    }

    final periodText = period == null || _str(period).isEmpty
        ? null
        : l10n.periodBadge(_str(period));

    return Container(
      width: double.infinity,
      margin: const EdgeInsets.only(bottom: 8),
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
      decoration: BoxDecoration(
        color: isActive ? AppColors.brand50 : AppColors.surface,
        borderRadius: BorderRadius.circular(16),
        border: Border(
          left: BorderSide(
            color: isActive ? AppColors.brand700 : Colors.transparent,
            width: 4,
          ),
        ),
        boxShadow: [
          BoxShadow(
            color: AppColors.brand900.withValues(alpha: 0.05),
            blurRadius: 14,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Row(
        children: [
          Container(
            width: 44,
            height: 44,
            alignment: Alignment.center,
            decoration: BoxDecoration(
              color: isActive ? AppColors.brand700 : AppColors.brand50,
              shape: BoxShape.circle,
            ),
            child: Text(
              periodText ?? '·',
              style: TextStyle(
                fontWeight: FontWeight.w800,
                fontSize: periodText == null ? 18 : 12,
                color: isActive ? Colors.white : AppColors.brand700,
              ),
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: const TextStyle(
                    fontWeight: FontWeight.w800,
                    fontSize: 14,
                    color: AppColors.inkStrong,
                  ),
                ),
                if (subtitle != null && subtitle!.isNotEmpty) ...[
                  const SizedBox(height: 2),
                  Text(
                    subtitle!,
                    style: const TextStyle(
                      fontSize: 12,
                      color: AppColors.inkMuted,
                    ),
                  ),
                ],
              ],
            ),
          ),
          if (statusLabel != null) ...[
            const SizedBox(width: 8),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
              decoration: BoxDecoration(
                color: statusBg,
                borderRadius: BorderRadius.circular(8),
              ),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  if (resolved == PeriodStatus.active)
                    Container(
                      width: 6,
                      height: 6,
                      margin: const EdgeInsets.only(right: 4),
                      decoration: BoxDecoration(
                        color: statusFg,
                        shape: BoxShape.circle,
                      ),
                    ),
                  if (resolved == PeriodStatus.completed)
                    Padding(
                      padding: const EdgeInsets.only(right: 4),
                      child: Icon(Icons.check, size: 12, color: statusFg),
                    ),
                  Text(
                    statusLabel,
                    style: TextStyle(
                      fontSize: 10,
                      fontWeight: FontWeight.w800,
                      color: statusFg,
                    ),
                  ),
                ],
              ),
            ),
          ],
        ],
      ),
    );
  }
}

class TimetableEmptyCard extends StatelessWidget {
  const TimetableEmptyCard({super.key, required this.message});

  final String message;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: AppColors.brand900.withValues(alpha: 0.05),
            blurRadius: 14,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Text(
        message,
        textAlign: TextAlign.center,
        style: const TextStyle(color: AppColors.inkMuted),
      ),
    );
  }
}

/// Build weekday list present in rows (fallback Mon–Fri).
List<String> daysFromRows(List<Map<String, dynamic>> rows) {
  final found = <String>{};
  for (final row in rows) {
    final day = _str(row['day']);
    if (day.isNotEmpty) found.add(day);
  }
  final ordered =
      kWeekdayOrder.where(found.contains).toList(growable: false);
  if (ordered.isNotEmpty) return ordered;
  return kWeekdayOrder.take(5).toList(growable: false);
}

import 'package:flutter/material.dart';

import '../../../core/theme/app_colors.dart';
import '../../../core/widgets/json_screen.dart';
import '../../../core/widgets/timetable_widgets.dart';
import '../../../l10n/app_localizations.dart';
import '../widgets/student_chrome.dart';

String _str(Object? value) => value?.toString().trim() ?? '';

List<Map<String, dynamic>> _maps(Object? raw) {
  if (raw is! List) return const [];
  return raw
      .whereType<Map>()
      .map((e) => Map<String, dynamic>.from(e))
      .toList();
}

/// Student weekly timetable — day chips + period cards (design-aligned).
class StudentTimetableScreen extends StatefulWidget {
  const StudentTimetableScreen({super.key});

  @override
  State<StudentTimetableScreen> createState() => _StudentTimetableScreenState();
}

class _StudentTimetableScreenState extends State<StudentTimetableScreen> {
  String _selectedDay = weekdayToday();

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    return Scaffold(
      backgroundColor: AppColors.loginCanvas,
      appBar: AppBar(title: Text(l10n.timetable)),
      body: JsonScreen(
        title: l10n.timetable,
        cacheKey: 'student_timetable',
        path: '/student/desk/timetable',
        builder: (context, data) {
          if (data is! Map) {
            return TimetableEmptyCard(message: l10n.emptyState);
          }
          final map = Map<String, dynamic>.from(data);
          final rows = _maps(map['rows']);
          final days = daysFromRows(rows);
          final selected =
              days.contains(_selectedDay) ? _selectedDay : days.first;
          final dayRows = rows
              .where((r) => _str(r['day']) == selected)
              .toList()
            ..sort((a, b) {
              final ap = (a['period'] as num?)?.toInt() ?? 0;
              final bp = (b['period'] as num?)?.toInt() ?? 0;
              return ap.compareTo(bp);
            });
          final isToday = selected == weekdayToday();
          final gradeLine = [
            if (_str(map['gradeLevel']).isNotEmpty)
              l10n.gradeSection(
                _str(map['gradeLevel']),
                _str(map['section']),
              ),
          ].join();

          return Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              StudentBilingualHeader(
                amharic: l10n.weeklyScheduleAm,
                english: l10n.weeklySchedule,
              ),
              if (gradeLine.isNotEmpty) ...[
                const SizedBox(height: 6),
                Text(
                  gradeLine,
                  style: const TextStyle(
                    color: AppColors.inkMuted,
                    fontSize: 13,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ],
              const SizedBox(height: 12),
              TimetableDaySelector(
                days: days,
                selected: selected,
                onSelect: (day) => setState(() => _selectedDay = day),
              ),
              const SizedBox(height: 14),
              if (rows.isEmpty)
                TimetableEmptyCard(message: l10n.noScheduleToday)
              else if (dayRows.isEmpty)
                TimetableEmptyCard(message: l10n.noClassesThisDay)
              else
                ...dayRows.map(
                  (row) => TimetablePeriodCard.fromMap(
                    row,
                    l10n: l10n,
                    isToday: isToday,
                  ),
                ),
            ],
          );
        },
      ),
    );
  }
}

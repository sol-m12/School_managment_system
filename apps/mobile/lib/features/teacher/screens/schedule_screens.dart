import 'package:flutter/material.dart';

import '../../../core/theme/app_colors.dart';
import '../../../core/widgets/keyt_app_bar.dart';
import '../../../core/widgets/json_screen.dart';
import '../../../core/widgets/timetable_widgets.dart';
import '../../../l10n/app_localizations.dart';
import '../widgets/teacher_chrome.dart';

String _str(Object? value) => value?.toString().trim() ?? '';

List<Map<String, dynamic>> _maps(Object? raw) {
  if (raw is! List) return const [];
  return raw
      .whereType<Map>()
      .map((e) => Map<String, dynamic>.from(e))
      .toList();
}

/// Teacher personal schedule — day chips + class/exam period cards.
class TeacherScheduleScreen extends StatefulWidget {
  const TeacherScheduleScreen({super.key});

  @override
  State<TeacherScheduleScreen> createState() => _TeacherScheduleScreenState();
}

class _TeacherScheduleScreenState extends State<TeacherScheduleScreen> {
  String _selectedDay = weekdayToday();

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    return Scaffold(
      backgroundColor: AppColors.loginCanvas,
      appBar: KeytAppBar(title: l10n.teacherSchedule),
      body: JsonScreen(
        title: l10n.teacherSchedule,
        cacheKey: 'teacher_schedule',
        path: '/teacher/schedule',
        builder: (context, data) {
          if (data is! Map) {
            return TimetableEmptyCard(message: l10n.emptyState);
          }
          final map = Map<String, dynamic>.from(data);
          final classRows = _maps(map['classSchedule']);
          final examRows = _maps(map['examSchedule']);
          final assignments = _maps(map['assignments']);
          final all = [...classRows, ...examRows];
          final days = daysFromRows(all);
          final selected =
              days.contains(_selectedDay) ? _selectedDay : days.first;
          final dayClasses = classRows
              .where((r) => _str(r['day']) == selected)
              .toList();
          final dayExams =
              examRows.where((r) => _str(r['day']) == selected).toList();
          final isToday = selected == weekdayToday();
          final year = _str(map['academicYear']);

          return Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Text(
                l10n.weeklySchedule,
                style: const TextStyle(
                  fontWeight: FontWeight.w800,
                  fontSize: 16,
                  color: AppColors.inkStrong,
                ),
              ),
              if (year.isNotEmpty) ...[
                const SizedBox(height: 4),
                Text(
                  l10n.academicYearLabel(year),
                  style: const TextStyle(
                    color: AppColors.inkMuted,
                    fontSize: 12,
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
              Text(
                l10n.todaySchedule,
                style: const TextStyle(
                  fontWeight: FontWeight.w800,
                  fontSize: 14,
                  color: AppColors.inkStrong,
                ),
              ),
              const SizedBox(height: 8),
              if (all.isEmpty)
                TimetableEmptyCard(message: l10n.noPeriodsToday)
              else if (dayClasses.isEmpty && dayExams.isEmpty)
                TimetableEmptyCard(message: l10n.noClassesThisDay)
              else ...[
                ...dayClasses.asMap().entries.map((e) {
                  final row = Map<String, dynamic>.from(e.value);
                  row['period'] ??= e.key + 1;
                  return TimetablePeriodCard.fromMap(
                    row,
                    l10n: l10n,
                    isToday: isToday,
                  );
                }),
                if (dayExams.isNotEmpty) ...[
                  const SizedBox(height: 8),
                  Text(
                    l10n.examScheduleSection,
                    style: const TextStyle(
                      fontWeight: FontWeight.w800,
                      fontSize: 14,
                      color: AppColors.inkStrong,
                    ),
                  ),
                  const SizedBox(height: 8),
                  ...dayExams.map(
                    (row) => TimetablePeriodCard.fromMap(
                      row,
                      l10n: l10n,
                      isToday: isToday,
                    ),
                  ),
                ],
              ],
              if (assignments.isNotEmpty) ...[
                const SizedBox(height: 16),
                Text(
                  l10n.assignedClasses,
                  style: const TextStyle(
                    fontWeight: FontWeight.w800,
                    fontSize: 14,
                    color: AppColors.inkStrong,
                  ),
                ),
                const SizedBox(height: 8),
                ...assignments.map((row) {
                  final subject = _str(row['subjectName']);
                  final grade = _str(row['gradeLevel']);
                  final section = _str(row['section']);
                  return Padding(
                    padding: const EdgeInsets.only(bottom: 8),
                    child: TeacherSectionCard(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 14,
                        vertical: 12,
                      ),
                      child: Row(
                        children: [
                          Container(
                            width: 40,
                            height: 40,
                            decoration: BoxDecoration(
                              color: AppColors.brand50,
                              borderRadius: BorderRadius.circular(12),
                            ),
                            child: const Icon(
                              Icons.menu_book_outlined,
                              color: AppColors.brand700,
                            ),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  subject.isEmpty
                                      ? l10n.teacherSchedule
                                      : subject,
                                  style: const TextStyle(
                                    fontWeight: FontWeight.w700,
                                    color: AppColors.inkStrong,
                                  ),
                                ),
                                if (grade.isNotEmpty)
                                  Text(
                                    l10n.gradeSection(grade, section),
                                    style: const TextStyle(
                                      color: AppColors.inkMuted,
                                      fontSize: 12,
                                    ),
                                  ),
                              ],
                            ),
                          ),
                        ],
                      ),
                    ),
                  );
                }),
              ],
            ],
          );
        },
      ),
    );
  }
}

/// Global teacher office timetable (mine / school / substitutions).
class TeacherOfficeTimetableScreen extends StatefulWidget {
  const TeacherOfficeTimetableScreen({super.key});

  @override
  State<TeacherOfficeTimetableScreen> createState() =>
      _TeacherOfficeTimetableScreenState();
}

class _TeacherOfficeTimetableScreenState
    extends State<TeacherOfficeTimetableScreen> {
  String _selectedDay = weekdayToday();
  int _tab = 0; // 0 mine, 1 school

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    return Scaffold(
      backgroundColor: AppColors.loginCanvas,
      appBar: KeytAppBar(title: l10n.timetable),
      body: JsonScreen(
        title: l10n.timetable,
        cacheKey: 'teacher_timetable',
        path: '/teacher/office/timetable',
        builder: (context, data) {
          if (data is! Map) {
            return TimetableEmptyCard(message: l10n.emptyState);
          }
          final map = Map<String, dynamic>.from(data);
          final mine = _maps(map['mine']);
          final school = _maps(map['school']);
          final subs = _maps(map['substitutions']);
          final source = _tab == 0 ? mine : school;
          final days = daysFromRows(source.isEmpty ? [...mine, ...school] : source);
          final selected =
              days.contains(_selectedDay) ? _selectedDay : days.first;
          final dayRows = source
              .where((r) => _str(r['day']) == selected)
              .toList()
            ..sort((a, b) {
              final ap = (a['period'] as num?)?.toInt() ?? 0;
              final bp = (b['period'] as num?)?.toInt() ?? 0;
              return ap.compareTo(bp);
            });
          final isToday = selected == weekdayToday();
          final year = _str(map['academicYear']);

          return Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              if (year.isNotEmpty)
                Text(
                  l10n.academicYearLabel(year),
                  style: const TextStyle(
                    color: AppColors.inkMuted,
                    fontSize: 12,
                  ),
                ),
              const SizedBox(height: 10),
              Row(
                children: [
                  Expanded(
                    child: _TabChip(
                      label: l10n.myTimetable,
                      selected: _tab == 0,
                      onTap: () => setState(() => _tab = 0),
                    ),
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: _TabChip(
                      label: l10n.schoolTimetable,
                      selected: _tab == 1,
                      onTap: () => setState(() => _tab = 1),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              TimetableDaySelector(
                days: days,
                selected: selected,
                onSelect: (day) => setState(() => _selectedDay = day),
              ),
              const SizedBox(height: 14),
              if (source.isEmpty)
                TimetableEmptyCard(message: l10n.noPeriodsToday)
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
              if (subs.isNotEmpty) ...[
                const SizedBox(height: 16),
                Text(
                  l10n.substitutionsSection,
                  style: const TextStyle(
                    fontWeight: FontWeight.w800,
                    fontSize: 14,
                    color: AppColors.inkStrong,
                  ),
                ),
                const SizedBox(height: 8),
                ...subs.map((row) {
                  final date = _str(row['coverDate']);
                  final reason = _str(row['reason']);
                  final name = [
                    _str(row['firstName']),
                    _str(row['lastName']),
                  ].where((s) => s.isNotEmpty).join(' ');
                  final coverName = _str(row['substituteName']).isNotEmpty
                      ? _str(row['substituteName'])
                      : name;
                  return Padding(
                    padding: const EdgeInsets.only(bottom: 8),
                    child: TeacherSectionCard(
                      padding: const EdgeInsets.all(14),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            coverName.isEmpty
                                ? l10n.substitutionsSection
                                : coverName,
                            style: const TextStyle(
                              fontWeight: FontWeight.w700,
                              color: AppColors.inkStrong,
                            ),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            [
                              if (date.isNotEmpty) date,
                              if (reason.isNotEmpty) reason,
                            ].join(' · '),
                            style: const TextStyle(
                              color: AppColors.inkMuted,
                              fontSize: 12,
                            ),
                          ),
                        ],
                      ),
                    ),
                  );
                }),
              ],
            ],
          );
        },
      ),
    );
  }
}

class _TabChip extends StatelessWidget {
  const _TabChip({
    required this.label,
    required this.selected,
    required this.onTap,
  });

  final String label;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: selected ? AppColors.brand700 : AppColors.surface,
      borderRadius: BorderRadius.circular(12),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(12),
        child: Container(
          padding: const EdgeInsets.symmetric(vertical: 12),
          alignment: Alignment.center,
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(12),
            border: Border.all(
              color: selected ? AppColors.brand700 : AppColors.border,
            ),
          ),
          child: Text(
            label,
            style: TextStyle(
              fontWeight: FontWeight.w800,
              fontSize: 13,
              color: selected ? Colors.white : AppColors.inkMuted,
            ),
          ),
        ),
      ),
    );
  }
}
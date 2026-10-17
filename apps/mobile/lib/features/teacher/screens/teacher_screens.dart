import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/locale/locale_controller.dart';
import '../../../core/providers.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/widgets/json_screen.dart';
import '../../../l10n/app_localizations.dart';

class TeacherHomeScreen extends StatelessWidget {
  const TeacherHomeScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    return Scaffold(
      appBar: AppBar(title: Text(l10n.navHome)),
      body: HubListScreen(
        title: l10n.navHome,
        items: [
          HubItem(
            label: l10n.teacherSchedule,
            icon: Icons.list_alt,
            onTap: () => context.push('/teacher/home/schedule'),
          ),
          HubItem(
            label: l10n.teacherProfile,
            icon: Icons.person,
            onTap: () => context.push('/teacher/home/profile'),
          ),
        ],
      ),
    );
  }
}

class TeacherAttendanceHubScreen extends ConsumerWidget {
  const TeacherAttendanceHubScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppLocalizations.of(context);
    final pending = ref.watch(pendingOutboxCountProvider).value ?? 0;
    return Scaffold(
      appBar: AppBar(title: Text(l10n.navAttendance)),
      body: ListView(
        children: [
          if (pending > 0)
            Material(
              color: AppColors.warning.withValues(alpha: 0.15),
              child: ListTile(
                minVerticalPadding: 16,
                leading: const Icon(Icons.cloud_upload, color: AppColors.warning),
                title: Text(l10n.pendingSync(pending)),
                trailing: TextButton(
                  onPressed: () =>
                      ref.read(attendanceOutboxSyncProvider.notifier).syncNow(),
                  child: Text(l10n.syncNow),
                ),
              ),
            ),
          ListTile(
            minVerticalPadding: 16,
            leading: const Icon(Icons.how_to_reg, color: AppColors.brand700),
            title: Text(l10n.homeroomAttendance),
            trailing: const Icon(Icons.chevron_right),
            onTap: () => context.push('/teacher/attendance/homeroom'),
          ),
          const Divider(height: 1),
          ListTile(
            minVerticalPadding: 16,
            leading: const Icon(Icons.edit_calendar, color: AppColors.brand700),
            title: Text(l10n.subjectAttendance),
            trailing: const Icon(Icons.chevron_right),
            onTap: () => context.push('/teacher/attendance/subject'),
          ),
          const Divider(height: 1),
          ListTile(
            minVerticalPadding: 16,
            leading: const Icon(Icons.wifi_off, color: AppColors.brand700),
            title: Text(l10n.offlineAttendance),
            trailing: const Icon(Icons.chevron_right),
            onTap: () => context.push('/teacher/attendance/offline'),
          ),
        ],
      ),
    );
  }
}

class TeacherClassesHubScreen extends StatelessWidget {
  const TeacherClassesHubScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    return Scaffold(
      appBar: AppBar(title: Text(l10n.navClasses)),
      body: HubListScreen(
        title: l10n.navClasses,
        items: [
          HubItem(
            label: l10n.classRoster,
            icon: Icons.group,
            onTap: () => context.push('/teacher/classes/roster'),
          ),
          HubItem(
            label: l10n.studentRegistration,
            icon: Icons.app_registration,
            onTap: () => context.push('/teacher/classes/registration'),
          ),
          HubItem(
            label: l10n.student360,
            icon: Icons.travel_explore,
            onTap: () => context.push('/teacher/classes/student-360'),
          ),
          HubItem(
            label: l10n.reportCards,
            icon: Icons.receipt_long,
            onTap: () => context.push('/teacher/classes/report-cards'),
          ),
          HubItem(
            label: l10n.subjectReport,
            icon: Icons.assessment,
            onTap: () => context.push('/teacher/classes/subject-report'),
          ),
        ],
      ),
    );
  }
}

class TeacherTeachingHubScreen extends StatelessWidget {
  const TeacherTeachingHubScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    return Scaffold(
      appBar: AppBar(title: Text(l10n.navTeaching)),
      body: HubListScreen(
        title: l10n.navTeaching,
        items: [
          HubItem(
            label: l10n.lessonPlans,
            icon: Icons.menu_book,
            onTap: () => context.push('/teacher/teaching/lessons'),
          ),
          HubItem(
            label: l10n.exams,
            icon: Icons.laptop,
            onTap: () => context.push('/teacher/teaching/exams'),
          ),
          HubItem(
            label: l10n.examResults,
            icon: Icons.bar_chart,
            onTap: () => context.push('/teacher/teaching/exam-results'),
          ),
          HubItem(
            label: l10n.courseFiles,
            icon: Icons.folder,
            onTap: () => context.push('/teacher/teaching/files'),
          ),
          HubItem(
            label: l10n.simulations,
            icon: Icons.science,
            onTap: () => context.push('/teacher/teaching/simulations'),
          ),
          HubItem(
            label: l10n.participation,
            icon: Icons.front_hand,
            onTap: () => context.push('/teacher/teaching/participation'),
          ),
          HubItem(
            label: l10n.questionBank,
            icon: Icons.quiz,
            onTap: () => context.push('/teacher/teaching/questions'),
          ),
        ],
      ),
    );
  }
}

class TeacherOfficeHubScreen extends StatelessWidget {
  const TeacherOfficeHubScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    return Scaffold(
      appBar: AppBar(title: Text(l10n.navOffice)),
      body: HubListScreen(
        title: l10n.navOffice,
        items: [
          HubItem(
            label: l10n.timetable,
            icon: Icons.calendar_month,
            onTap: () => context.push('/teacher/office/timetable'),
          ),
          HubItem(
            label: l10n.leaveRequest,
            icon: Icons.event_busy,
            onTap: () => context.push('/teacher/office/leave'),
          ),
          HubItem(
            label: l10n.incidents,
            icon: Icons.campaign,
            onTap: () => context.push('/teacher/office/incidents'),
          ),
          HubItem(
            label: l10n.library,
            icon: Icons.local_library,
            onTap: () => context.push('/teacher/office/library'),
          ),
          HubItem(
            label: l10n.storeRequests,
            icon: Icons.inventory_2,
            onTap: () => context.push('/teacher/office/store'),
          ),
          HubItem(
            label: l10n.scanDigitalId,
            icon: Icons.qr_code_scanner,
            onTap: () => context.push('/teacher/office/scan-id'),
          ),
        ],
      ),
    );
  }
}

class TeacherMoreScreen extends ConsumerWidget {
  const TeacherMoreScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppLocalizations.of(context);
    final user = ref.watch(authControllerProvider).user;
    final locale = ref.watch(localeControllerProvider);
    return Scaffold(
      appBar: AppBar(title: Text(l10n.navMore)),
      body: ListView(
        children: [
          ListTile(
            minVerticalPadding: 16,
            leading: const Icon(Icons.person_outline),
            title: Text(l10n.profile),
            subtitle: Text(
              user == null
                  ? ''
                  : '${user.username} · ${user.tenantName} (#${user.tenantId})',
            ),
          ),
          const Divider(height: 1),
          ListTile(
            minVerticalPadding: 16,
            leading: const Icon(Icons.language),
            title: Text(l10n.language),
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
            title: Text(l10n.logout, style: const TextStyle(color: AppColors.danger)),
            onTap: () => ref.read(authControllerProvider.notifier).logout(),
          ),
        ],
      ),
    );
  }
}

class TeacherJsonRoute extends StatelessWidget {
  const TeacherJsonRoute({
    super.key,
    required this.title,
    required this.cacheKey,
    required this.path,
  });

  final String title;
  final String cacheKey;
  final String path;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text(title)),
      body: JsonScreen(
        title: title,
        cacheKey: cacheKey,
        path: path,
        builder: (context, data) => JsonBody(data: data),
      ),
    );
  }
}

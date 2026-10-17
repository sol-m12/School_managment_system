import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/locale/locale_controller.dart';
import '../../../core/providers.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/widgets/json_screen.dart';
import '../../../l10n/app_localizations.dart';

class StudentHomeScreen extends StatelessWidget {
  const StudentHomeScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    return Scaffold(
      appBar: AppBar(title: Text(l10n.navHome)),
      body: JsonScreen(
        title: l10n.navHome,
        cacheKey: 'student_home',
        path: '/student/home',
        builder: (context, data) {
          if (data is! Map) return JsonBody(data: data);
          final map = Map<String, dynamic>.from(data);
          final greeting = map['greeting'] as String?;
          final greet = switch (greeting) {
            'morning' => l10n.greetingMorning,
            'afternoon' => l10n.greetingAfternoon,
            'evening' => l10n.greetingEvening,
            _ => l10n.navHome,
          };
          return Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                greet,
                style: const TextStyle(
                  fontSize: 22,
                  fontWeight: FontWeight.w700,
                  color: AppColors.brand700,
                ),
              ),
              const SizedBox(height: 8),
              Text(
                map['fullName']?.toString() ?? '',
                style: const TextStyle(fontSize: 18),
              ),
              const SizedBox(height: 4),
              Text(
                '${map['gradeLevel'] ?? ''} · ${map['section'] ?? ''}',
                style: const TextStyle(color: AppColors.inkMuted),
              ),
              const SizedBox(height: 16),
              JsonBody(data: {
                'today': map['today'],
                'simulationCount': map['simulationCount'],
              }),
            ],
          );
        },
      ),
    );
  }
}

class AcademicsHubScreen extends StatelessWidget {
  const AcademicsHubScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    return Scaffold(
      appBar: AppBar(title: Text(l10n.navAcademics)),
      body: HubListScreen(
        title: l10n.navAcademics,
        items: [
          HubItem(
            label: l10n.results,
            icon: Icons.bar_chart,
            onTap: () => context.push('/student/academics/results'),
          ),
          HubItem(
            label: l10n.timetable,
            icon: Icons.calendar_month,
            onTap: () => context.push('/student/academics/timetable'),
          ),
          HubItem(
            label: l10n.exams,
            icon: Icons.laptop,
            onTap: () => context.push('/student/academics/exams'),
          ),
          HubItem(
            label: l10n.quiz,
            icon: Icons.emoji_events,
            onTap: () => context.push('/student/academics/quiz'),
          ),
          HubItem(
            label: l10n.assignments,
            icon: Icons.assignment,
            onTap: () => context.push('/student/academics/assignments'),
          ),
        ],
      ),
    );
  }
}

class AttendanceHubScreen extends StatelessWidget {
  const AttendanceHubScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    return Scaffold(
      appBar: AppBar(title: Text(l10n.navAttendance)),
      body: HubListScreen(
        title: l10n.navAttendance,
        items: [
          HubItem(
            label: l10n.attendance,
            icon: Icons.how_to_reg,
            onTap: () => context.push('/student/attendance/status'),
          ),
          HubItem(
            label: l10n.discipline,
            icon: Icons.gavel,
            onTap: () => context.push('/student/attendance/discipline'),
          ),
        ],
      ),
    );
  }
}

class LearningHubScreen extends StatelessWidget {
  const LearningHubScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    return Scaffold(
      appBar: AppBar(title: Text(l10n.navLearning)),
      body: HubListScreen(
        title: l10n.navLearning,
        items: [
          HubItem(
            label: l10n.resources,
            icon: Icons.folder_open,
            onTap: () => context.push('/student/learning/resources'),
          ),
          HubItem(
            label: l10n.simulations,
            icon: Icons.science,
            onTap: () => context.push('/student/learning/simulations'),
          ),
          HubItem(
            label: l10n.virtualLab,
            icon: Icons.biotech,
            onTap: () => context.push('/student/learning/labs'),
          ),
          HubItem(
            label: l10n.groups,
            icon: Icons.groups,
            onTap: () => context.push('/student/learning/groups'),
          ),
          HubItem(
            label: l10n.planner,
            icon: Icons.psychology,
            onTap: () => context.push('/student/learning/planner'),
          ),
        ],
      ),
    );
  }
}

class ServicesHubScreen extends StatelessWidget {
  const ServicesHubScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    return Scaffold(
      appBar: AppBar(title: Text(l10n.navServices)),
      body: HubListScreen(
        title: l10n.navServices,
        items: [
          HubItem(
            label: l10n.library,
            icon: Icons.local_library,
            onTap: () => context.push('/student/services/library'),
          ),
          HubItem(
            label: l10n.documents,
            icon: Icons.description,
            onTap: () => context.push('/student/services/documents'),
          ),
          HubItem(
            label: l10n.helpdesk,
            icon: Icons.support_agent,
            onTap: () => context.push('/student/services/helpdesk'),
          ),
          HubItem(
            label: l10n.vocational,
            icon: Icons.handyman,
            onTap: () => context.push('/student/services/vocational'),
          ),
          HubItem(
            label: l10n.digitalId,
            icon: Icons.badge,
            onTap: () => context.push('/student/services/id'),
          ),
        ],
      ),
    );
  }
}

class MoreHubScreen extends ConsumerWidget {
  const MoreHubScreen({super.key});

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
            leading: const Icon(Icons.notifications_outlined),
            title: Text(l10n.notifications),
            trailing: const Icon(Icons.chevron_right),
            onTap: () => context.push('/student/more/notifications'),
          ),
          const Divider(height: 1),
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
            onTap: () => ref.read(authControllerProvider.notifier).logout(),
          ),
        ],
      ),
    );
  }
}

class StudentJsonRoute extends StatelessWidget {
  const StudentJsonRoute({
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


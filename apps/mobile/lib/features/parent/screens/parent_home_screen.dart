import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/theme/app_colors.dart';
import '../../../core/widgets/last_updated_label.dart';
import '../../../core/widgets/offline_banner.dart';
import '../../../l10n/app_localizations.dart';
import '../parent_child_controller.dart';

class ParentHomeScreen extends ConsumerStatefulWidget {
  const ParentHomeScreen({super.key});

  @override
  ConsumerState<ParentHomeScreen> createState() => _ParentHomeScreenState();
}

class _ParentHomeScreenState extends ConsumerState<ParentHomeScreen> {
  final _pageController = PageController(viewportFraction: 0.42);

  @override
  void dispose() {
    _pageController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final state = ref.watch(parentChildControllerProvider);
    final selectedId = state.selectedStudentId;

    return Scaffold(
      appBar: AppBar(title: Text(l10n.parentChildrenDashboard)),
      body: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          const OfflineBanner(),
          LastUpdatedLabel(updatedAt: state.updatedAt),
          Expanded(
            child: RefreshIndicator(
              onRefresh: () => ref
                  .read(parentChildControllerProvider.notifier)
                  .loadChildren(force: true),
              child: _buildBody(l10n, state, selectedId),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildBody(
    AppLocalizations l10n,
    ParentChildState state,
    int? selectedId,
  ) {
    if (state.loading && state.children.isEmpty) {
      return ListView(
        physics: const AlwaysScrollableScrollPhysics(),
        children: [
          SizedBox(height: 200, child: Center(child: Text(l10n.loading))),
        ],
      );
    }
    if (state.error != null && state.children.isEmpty) {
      return ListView(
        physics: const AlwaysScrollableScrollPhysics(),
        children: [
          Padding(
            padding: const EdgeInsets.all(24),
            child: Column(
              children: [
                Text(l10n.errorGeneric, textAlign: TextAlign.center),
                const SizedBox(height: 12),
                SizedBox(
                  height: 48,
                  child: FilledButton(
                    onPressed: () => ref
                        .read(parentChildControllerProvider.notifier)
                        .loadChildren(force: true),
                    child: Text(l10n.retry),
                  ),
                ),
              ],
            ),
          ),
        ],
      );
    }
    if (state.children.isEmpty) {
      return ListView(
        physics: const AlwaysScrollableScrollPhysics(),
        children: [
          Padding(
            padding: const EdgeInsets.all(24),
            child: Text(
              l10n.parentEmptyChildren,
              textAlign: TextAlign.center,
              style: const TextStyle(fontSize: 16),
            ),
          ),
        ],
      );
    }

    return ListView(
      physics: const AlwaysScrollableScrollPhysics(),
      padding: const EdgeInsets.only(bottom: 24),
      children: [
        if (state.parentDisplayName != null &&
            state.parentDisplayName!.isNotEmpty)
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 8, 16, 0),
            child: Text(
              state.parentDisplayName!,
              style: const TextStyle(
                fontSize: 20,
                fontWeight: FontWeight.w700,
                color: AppColors.brand700,
              ),
            ),
          ),
        const SizedBox(height: 12),
        SizedBox(
          height: 168,
          child: PageView.builder(
            controller: _pageController,
            itemCount: state.children.length,
            onPageChanged: (index) {
              final child = state.children[index];
              ref
                  .read(parentChildControllerProvider.notifier)
                  .selectChild(child.studentId);
            },
            itemBuilder: (context, index) {
              final child = state.children[index];
              final selected = child.studentId == selectedId;
              return Padding(
                padding: const EdgeInsets.symmetric(horizontal: 8),
                child: _ChildAvatarCard(
                  child: child,
                  selected: selected,
                  schoolFallback: l10n.parentSchoolFallback,
                  onTap: () {
                    ref
                        .read(parentChildControllerProvider.notifier)
                        .selectChild(child.studentId);
                    _pageController.animateToPage(
                      index,
                      duration: const Duration(milliseconds: 250),
                      curve: Curves.easeOut,
                    );
                  },
                ),
              );
            },
          ),
        ),
        const SizedBox(height: 16),
        if (state.selected != null)
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: Card(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      state.selected!.fullName,
                      style: const TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      _schoolLabel(
                        l10n,
                        state.selected!.schoolName,
                      ),
                      style: const TextStyle(color: AppColors.inkMuted),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      '${state.selected!.gradeLevel} · ${state.selected!.section}',
                      style: const TextStyle(color: AppColors.inkMuted),
                    ),
                  ],
                ),
              ),
            ),
          )
        else
          Padding(
            padding: const EdgeInsets.all(16),
            child: Text(
              l10n.parentSelectChild,
              textAlign: TextAlign.center,
            ),
          ),
      ],
    );
  }

  String _schoolLabel(AppLocalizations l10n, String schoolName) {
    final trimmed = schoolName.trim();
    return trimmed.isEmpty ? l10n.parentSchoolFallback : trimmed;
  }
}

class _ChildAvatarCard extends StatelessWidget {
  const _ChildAvatarCard({
    required this.child,
    required this.selected,
    required this.schoolFallback,
    required this.onTap,
  });

  final ParentChild child;
  final bool selected;
  final String schoolFallback;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final school = child.schoolName.trim().isEmpty
        ? schoolFallback
        : child.schoolName.trim();
    return Material(
      color: selected ? AppColors.brand50 : AppColors.surface,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
        side: BorderSide(
          color: selected ? AppColors.brand600 : AppColors.border,
          width: selected ? 2 : 1,
        ),
      ),
      child: InkWell(
        borderRadius: BorderRadius.circular(12),
        onTap: onTap,
        child: ConstrainedBox(
          constraints: const BoxConstraints(minHeight: 48, minWidth: 48),
          child: Padding(
            padding: const EdgeInsets.all(12),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                CircleAvatar(
                  radius: 32,
                  backgroundColor: AppColors.brand100,
                  child: Text(
                    _initials(child.fullName),
                    style: const TextStyle(
                      color: AppColors.brand700,
                      fontWeight: FontWeight.w700,
                      fontSize: 18,
                    ),
                  ),
                ),
                const SizedBox(height: 8),
                Text(
                  child.fullName,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  textAlign: TextAlign.center,
                  style: const TextStyle(fontWeight: FontWeight.w600),
                ),
                Text(
                  school,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  textAlign: TextAlign.center,
                  style: const TextStyle(
                    fontSize: 12,
                    color: AppColors.inkMuted,
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  String _initials(String name) {
    final parts = name.trim().split(RegExp(r'\s+'));
    if (parts.isEmpty || parts.first.isEmpty) return '?';
    if (parts.length == 1) return parts.first.substring(0, 1).toUpperCase();
    return (parts.first.substring(0, 1) + parts.last.substring(0, 1))
        .toUpperCase();
  }
}

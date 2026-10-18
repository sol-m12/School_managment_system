import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/api/api_exception.dart';
import '../../../core/providers.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/widgets/keyt_app_bar.dart';
import '../../../core/widgets/last_updated_label.dart';
import '../../../core/widgets/offline_banner.dart';
import '../../../l10n/app_localizations.dart';
import '../parent_child_controller.dart';

/// Cache-first JSON screen bound to the currently selected child.
/// Clears previous rows immediately when [studentId] changes.
class ParentChildDataScreen extends ConsumerStatefulWidget {
  const ParentChildDataScreen({
    super.key,
    required this.title,
    required this.cacheKeyFor,
    required this.pathFor,
    required this.builder,
    this.floatingActionButton,
  });

  final String title;
  final String Function(int studentId) cacheKeyFor;
  final String Function(int studentId) pathFor;
  final Widget Function(BuildContext context, Object? data) builder;
  final Widget? floatingActionButton;

  @override
  ConsumerState<ParentChildDataScreen> createState() =>
      _ParentChildDataScreenState();
}

class _ParentChildDataScreenState extends ConsumerState<ParentChildDataScreen> {
  Object? _data;
  DateTime? _updatedAt;
  bool _loading = true;
  String? _error;
  int? _boundStudentId;

  @override
  void initState() {
    super.initState();
    Future.microtask(_syncSelection);
  }

  void _syncSelection() {
    final id = ref.read(selectedParentStudentIdProvider);
    if (id != _boundStudentId) {
      _boundStudentId = id;
      _data = null;
      _updatedAt = null;
      _error = null;
      if (id == null) {
        setState(() => _loading = false);
        return;
      }
      setState(() => _loading = true);
      _load(force: false);
    }
  }

  Future<void> _load({required bool force}) async {
    final studentId = _boundStudentId;
    final user = ref.read(authControllerProvider).user;
    if (studentId == null || user == null || !user.isParent) return;

    setState(() {
      _loading = _data == null;
      _error = null;
    });

    final cacheKey = widget.cacheKeyFor(studentId);
    final path = widget.pathFor(studentId);

    try {
      final cache = ref.read(cacheRepositoryProvider);
      final result = await cache.cacheFirstJson<Object?>(
        user: user,
        key: cacheKey,
        path: path,
        parse: (json) => json,
        forceRefresh: force,
      );
      if (!mounted || _boundStudentId != studentId) return;
      setState(() {
        _data = result.data;
        _updatedAt = result.updatedAt;
        _loading = false;
      });

      if (result.fromCache && !force) {
        try {
          final fresh = await cache.refreshJson<Object?>(
            user: user,
            key: cacheKey,
            path: path,
            parse: (json) => json,
          );
          if (!mounted || _boundStudentId != studentId) return;
          setState(() {
            _data = fresh.data;
            _updatedAt = fresh.updatedAt;
          });
        } catch (_) {}
      }
    } catch (e) {
      if (!mounted || _boundStudentId != studentId) return;
      setState(() {
        _loading = false;
        _error = e is ApiException ? e.code : 'INTERNAL_ERROR';
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    ref.listen<int?>(selectedParentStudentIdProvider, (prev, next) {
      if (prev != next) {
        _boundStudentId = next;
        _data = null;
        _updatedAt = null;
        _error = null;
        if (next == null) {
          setState(() => _loading = false);
        } else {
          setState(() => _loading = true);
          _load(force: false);
        }
      }
    });

    final childrenState = ref.watch(parentChildControllerProvider);
    final studentId = childrenState.selectedStudentId;

    return Scaffold(
      appBar: KeytAppBar(title: widget.title),
      floatingActionButton: studentId == null ? null : widget.floatingActionButton,
      body: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          const OfflineBanner(),
          if (childrenState.selected != null)
            Material(
              color: AppColors.brand50,
              child: ListTile(
                minVerticalPadding: 12,
                dense: true,
                leading: const Icon(Icons.child_care, color: AppColors.brand700),
                title: Text(childrenState.selected!.fullName),
                subtitle: Text(
                  _schoolLabel(l10n, childrenState.selected!.schoolName),
                ),
              ),
            ),
          LastUpdatedLabel(updatedAt: _updatedAt),
          Expanded(
            child: RefreshIndicator(
              onRefresh: () async {
                if (studentId == null) {
                  await ref
                      .read(parentChildControllerProvider.notifier)
                      .loadChildren(force: true);
                } else {
                  await _load(force: true);
                }
              },
              child: _buildBody(l10n, childrenState),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildBody(AppLocalizations l10n, ParentChildState childrenState) {
    if (childrenState.loading && childrenState.children.isEmpty) {
      return _scrollMessage(l10n.loading);
    }
    if (childrenState.children.isEmpty) {
      return _scrollMessage(l10n.parentEmptyChildren);
    }
    if (childrenState.selectedStudentId == null) {
      return _scrollMessage(l10n.parentSelectChild);
    }
    if (_loading) {
      return _scrollMessage(l10n.loading);
    }
    if (_error != null && _data == null) {
      return ListView(
        physics: const AlwaysScrollableScrollPhysics(),
        children: [
          Padding(
            padding: const EdgeInsets.all(24),
            child: Column(
              children: [
                Text(_errorMessage(l10n, _error!), textAlign: TextAlign.center),
                const SizedBox(height: 12),
                SizedBox(
                  height: 48,
                  child: FilledButton(
                    onPressed: () => _load(force: true),
                    child: Text(l10n.retry),
                  ),
                ),
              ],
            ),
          ),
        ],
      );
    }
    return ListView(
      physics: const AlwaysScrollableScrollPhysics(),
      padding: const EdgeInsets.fromLTRB(16, 0, 16, 24),
      children: [widget.builder(context, _data)],
    );
  }

  Widget _scrollMessage(String text) {
    return ListView(
      physics: const AlwaysScrollableScrollPhysics(),
      children: [
        SizedBox(
          height: 200,
          child: Center(child: Text(text, textAlign: TextAlign.center)),
        ),
      ],
    );
  }

  String _schoolLabel(AppLocalizations l10n, String schoolName) {
    final trimmed = schoolName.trim();
    return trimmed.isEmpty ? l10n.parentSchoolFallback : trimmed;
  }

  String _errorMessage(AppLocalizations l10n, String code) {
    return switch (code) {
      'NETWORK_ERROR' => l10n.errorNetwork,
      'AUTH_UNAUTHORIZED' => l10n.errorUnauthorized,
      'VALIDATION_ERROR' => l10n.errorValidation,
      _ => l10n.errorGeneric,
    };
  }
}

Color? indicatorColor(String? indicator) {
  return switch (indicator) {
    'done' => AppColors.success,
    'missing' => AppColors.danger,
    'pending' => AppColors.warning,
    _ => null,
  };
}
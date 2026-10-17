import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/api/api_exception.dart';
import '../../core/providers.dart';
import 'parent_cache_keys.dart';

class ParentChild {
  const ParentChild({
    required this.studentId,
    required this.fullName,
    required this.gradeLevel,
    required this.section,
    required this.schoolName,
    required this.tenantId,
    this.photo,
    this.linkId,
  });

  final int studentId;
  final String fullName;
  final String gradeLevel;
  final String section;
  final String schoolName;
  final int tenantId;
  final String? photo;
  final int? linkId;

  factory ParentChild.fromJson(Map<String, dynamic> json) {
    return ParentChild(
      studentId: (json['studentId'] as num).toInt(),
      fullName: json['fullName']?.toString() ?? '',
      gradeLevel: json['gradeLevel']?.toString() ?? '',
      section: json['section']?.toString() ?? '',
      schoolName: json['schoolName']?.toString() ?? '',
      tenantId: (json['tenantId'] as num?)?.toInt() ?? 0,
      photo: json['photo']?.toString(),
      linkId: (json['linkId'] as num?)?.toInt(),
    );
  }
}

class ParentChildState {
  const ParentChildState({
    this.children = const [],
    this.selectedStudentId,
    this.loading = false,
    this.error,
    this.updatedAt,
    this.parentDisplayName,
  });

  final List<ParentChild> children;
  final int? selectedStudentId;
  final bool loading;
  final String? error;
  final DateTime? updatedAt;
  final String? parentDisplayName;

  ParentChild? get selected {
    final id = selectedStudentId;
    if (id == null) return null;
    for (final child in children) {
      if (child.studentId == id) return child;
    }
    return null;
  }

  ParentChildState copyWith({
    List<ParentChild>? children,
    int? selectedStudentId,
    bool clearSelected = false,
    bool? loading,
    String? error,
    bool clearError = false,
    DateTime? updatedAt,
    String? parentDisplayName,
  }) {
    return ParentChildState(
      children: children ?? this.children,
      selectedStudentId:
          clearSelected ? null : (selectedStudentId ?? this.selectedStudentId),
      loading: loading ?? this.loading,
      error: clearError ? null : (error ?? this.error),
      updatedAt: updatedAt ?? this.updatedAt,
      parentDisplayName: parentDisplayName ?? this.parentDisplayName,
    );
  }
}

class ParentChildController extends Notifier<ParentChildState> {
  @override
  ParentChildState build() {
    ref.listen<AuthState>(authControllerProvider, (prev, next) {
      final wasAuth = prev?.status == AuthStatus.authenticated;
      final isAuth = next.status == AuthStatus.authenticated;
      final prevUser = prev?.user;
      final nextUser = next.user;
      if (!isAuth || nextUser == null || !nextUser.isParent) {
        if (state.selectedStudentId != null || state.children.isNotEmpty) {
          state = const ParentChildState();
        }
        return;
      }
      if (!wasAuth ||
          prevUser?.id != nextUser.id ||
          prevUser?.tenantId != nextUser.tenantId) {
        state = const ParentChildState();
        Future.microtask(() => loadChildren(force: false));
      }
    });

    final auth = ref.read(authControllerProvider);
    if (auth.status == AuthStatus.authenticated &&
        auth.user != null &&
        auth.user!.isParent) {
      Future.microtask(() => loadChildren(force: false));
    }
    return const ParentChildState();
  }

  Future<void> loadChildren({required bool force}) async {
    final user = ref.read(authControllerProvider).user;
    if (user == null || !user.isParent) {
      state = const ParentChildState();
      return;
    }

    state = state.copyWith(
      loading: state.children.isEmpty,
      clearError: true,
    );

    try {
      final cache = ref.read(cacheRepositoryProvider);
      final result = await cache.cacheFirstJson<Object?>(
        user: user,
        key: parentChildrenCacheKey(),
        path: '/parent/children',
        parse: (json) => json,
        forceRefresh: force,
      );
      _applyChildrenPayload(result.data, result.updatedAt);

      if (result.fromCache && !force) {
        try {
          final fresh = await cache.refreshJson<Object?>(
            user: user,
            key: parentChildrenCacheKey(),
            path: '/parent/children',
            parse: (json) => json,
          );
          _applyChildrenPayload(fresh.data, fresh.updatedAt);
        } catch (_) {}
      }
    } catch (e) {
      state = state.copyWith(
        loading: false,
        error: e is ApiException ? e.code : 'INTERNAL_ERROR',
      );
    }
  }

  void _applyChildrenPayload(Object? data, DateTime? updatedAt) {
    final parsed = _parsePayload(data);
    final ids = parsed.children.map((c) => c.studentId).toList();
    final selected = resolveSelectedStudentId(
      studentIds: ids,
      currentSelected: state.selectedStudentId,
    );
    state = ParentChildState(
      children: parsed.children,
      selectedStudentId: selected,
      loading: false,
      updatedAt: updatedAt,
      parentDisplayName: parsed.displayName,
    );
  }

  void selectChild(int studentId) {
    if (state.selectedStudentId == studentId) return;
    if (!state.children.any((c) => c.studentId == studentId)) return;
    // Dependent screens clear previous rows when selectedStudentId changes.
    state = state.copyWith(selectedStudentId: studentId);
  }

  void clearSelection() {
    state = const ParentChildState();
  }

  ({List<ParentChild> children, String? displayName}) _parsePayload(
    Object? data,
  ) {
    if (data is! Map) {
      return (children: const [], displayName: null);
    }
    final map = Map<String, dynamic>.from(data);
    final parent = map['parent'];
    String? displayName;
    if (parent is Map) {
      displayName = parent['displayName']?.toString();
    }
    final raw = map['children'];
    if (raw is! List) {
      return (children: const [], displayName: displayName);
    }
    final children = raw
        .whereType<Map>()
        .map((e) => ParentChild.fromJson(Map<String, dynamic>.from(e)))
        .toList();
    return (children: children, displayName: displayName);
  }
}

final parentChildControllerProvider =
    NotifierProvider<ParentChildController, ParentChildState>(
  ParentChildController.new,
);

/// Selected student id for parent desk screens (null when none / switching).
final selectedParentStudentIdProvider = Provider<int?>((ref) {
  return ref.watch(parentChildControllerProvider).selectedStudentId;
});

import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/api/api_exception.dart';
import '../../core/providers.dart';
import 'parent_cache_keys.dart';
import 'parent_child_controller.dart';

class ParentDashboardSlice {
  const ParentDashboardSlice({
    this.data,
    this.updatedAt,
    this.loading = false,
    this.error,
  });

  final Object? data;
  final DateTime? updatedAt;
  final bool loading;
  final String? error;

  ParentDashboardSlice copyWith({
    Object? data,
    DateTime? updatedAt,
    bool? loading,
    String? error,
    bool clearError = false,
    bool clearData = false,
  }) {
    return ParentDashboardSlice(
      data: clearData ? null : (data ?? this.data),
      updatedAt: updatedAt ?? this.updatedAt,
      loading: loading ?? this.loading,
      error: clearError ? null : (error ?? this.error),
    );
  }
}

class ParentDashboardState {
  const ParentDashboardState({
    this.studentId,
    this.attendance = const ParentDashboardSlice(),
    this.results = const ParentDashboardSlice(),
    this.assignments = const ParentDashboardSlice(),
    this.library = const ParentDashboardSlice(),
    this.notices = const ParentDashboardSlice(),
  });

  final int? studentId;
  final ParentDashboardSlice attendance;
  final ParentDashboardSlice results;
  final ParentDashboardSlice assignments;
  final ParentDashboardSlice library;
  final ParentDashboardSlice notices;

  bool get loading =>
      attendance.loading ||
      results.loading ||
      assignments.loading ||
      library.loading ||
      notices.loading;

  ParentDashboardState copyWith({
    int? studentId,
    bool clearStudent = false,
    ParentDashboardSlice? attendance,
    ParentDashboardSlice? results,
    ParentDashboardSlice? assignments,
    ParentDashboardSlice? library,
    ParentDashboardSlice? notices,
  }) {
    return ParentDashboardState(
      studentId: clearStudent ? null : (studentId ?? this.studentId),
      attendance: attendance ?? this.attendance,
      results: results ?? this.results,
      assignments: assignments ?? this.assignments,
      library: library ?? this.library,
      notices: notices ?? this.notices,
    );
  }
}

class ParentDashboardController extends Notifier<ParentDashboardState> {
  @override
  ParentDashboardState build() {
    ref.listen<int?>(selectedParentStudentIdProvider, (prev, next) {
      if (prev == next) return;
      if (next == null) {
        state = const ParentDashboardState();
        return;
      }
      state = ParentDashboardState(studentId: next);
      Future.microtask(() => loadAll(force: false));
    });

    final id = ref.read(selectedParentStudentIdProvider);
    if (id != null) {
      Future.microtask(() => loadAll(force: false));
      return ParentDashboardState(studentId: id);
    }
    return const ParentDashboardState();
  }

  Future<void> loadAll({required bool force}) async {
    final studentId = ref.read(selectedParentStudentIdProvider);
    final user = ref.read(authControllerProvider).user;
    if (studentId == null || user == null || !user.isParent) {
      state = const ParentDashboardState();
      return;
    }

    state = ParentDashboardState(
      studentId: studentId,
      attendance: const ParentDashboardSlice(loading: true),
      results: const ParentDashboardSlice(loading: true),
      assignments: const ParentDashboardSlice(loading: true),
      library: const ParentDashboardSlice(loading: true),
      notices: const ParentDashboardSlice(loading: true),
    );

    await Future.wait([
      _loadSlice(
        studentId: studentId,
        force: force,
        key: parentAttendanceCacheKey(studentId),
        path: '/parent/children/$studentId/attendance',
        apply: (slice) => state = state.copyWith(attendance: slice),
      ),
      _loadSlice(
        studentId: studentId,
        force: force,
        key: parentResultsCacheKey(studentId),
        path: '/parent/children/$studentId/results',
        apply: (slice) => state = state.copyWith(results: slice),
      ),
      _loadSlice(
        studentId: studentId,
        force: force,
        key: parentAssignmentsCacheKey(studentId),
        path: '/parent/children/$studentId/assignments',
        apply: (slice) => state = state.copyWith(assignments: slice),
      ),
      _loadSlice(
        studentId: studentId,
        force: force,
        key: parentLibraryCacheKey(studentId),
        path: '/parent/children/$studentId/library',
        apply: (slice) => state = state.copyWith(library: slice),
      ),
      _loadSlice(
        studentId: studentId,
        force: force,
        key: parentNotificationsCacheKey(),
        path: '/parent/notifications',
        apply: (slice) => state = state.copyWith(notices: slice),
      ),
    ]);
  }

  Future<void> _loadSlice({
    required int studentId,
    required bool force,
    required String key,
    required String path,
    required void Function(ParentDashboardSlice slice) apply,
  }) async {
    final user = ref.read(authControllerProvider).user;
    if (user == null) return;

    try {
      final cache = ref.read(cacheRepositoryProvider);
      final result = await cache.cacheFirstJson<Object?>(
        user: user,
        key: key,
        path: path,
        parse: (json) => json,
        forceRefresh: force,
      );
      if (ref.read(selectedParentStudentIdProvider) != studentId &&
          path.contains('/children/')) {
        return;
      }
      apply(
        ParentDashboardSlice(
          data: result.data,
          updatedAt: result.updatedAt,
          loading: false,
        ),
      );

      if (result.fromCache && !force) {
        try {
          final fresh = await cache.refreshJson<Object?>(
            user: user,
            key: key,
            path: path,
            parse: (json) => json,
          );
          if (ref.read(selectedParentStudentIdProvider) != studentId &&
              path.contains('/children/')) {
            return;
          }
          apply(
            ParentDashboardSlice(
              data: fresh.data,
              updatedAt: fresh.updatedAt,
              loading: false,
            ),
          );
        } catch (_) {}
      }
    } catch (e) {
      if (ref.read(selectedParentStudentIdProvider) != studentId &&
          path.contains('/children/')) {
        return;
      }
      apply(
        ParentDashboardSlice(
          loading: false,
          error: e is ApiException ? e.code : 'INTERNAL_ERROR',
        ),
      );
    }
  }
}

final parentDashboardControllerProvider =
    NotifierProvider<ParentDashboardController, ParentDashboardState>(
  ParentDashboardController.new,
);

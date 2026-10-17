import 'dart:convert';

import '../api/api_client.dart';
import '../api/api_exception.dart';
import '../auth/auth_user.dart';
import '../cache/cache_database.dart';

class AttendanceMark {
  const AttendanceMark({
    required this.studentId,
    required this.subjectId,
    required this.date,
    required this.status,
  });

  final int studentId;
  final int subjectId;
  final String date;
  final String status;

  Map<String, dynamic> toJson() => {
        'studentId': studentId,
        'subjectId': subjectId,
        'date': date,
        'status': status,
      };

  factory AttendanceMark.fromJson(Map<String, dynamic> json) {
    return AttendanceMark(
      studentId: (json['studentId'] as num).toInt(),
      subjectId: (json['subjectId'] as num).toInt(),
      date: json['date'] as String,
      status: json['status'] as String,
    );
  }
}

class SyncResult {
  const SyncResult({
    required this.synced,
    required this.conflicts,
    required this.failed,
  });

  final int synced;
  final int conflicts;
  final int failed;
}

/// Offline attendance outbox → POST /teacher/office/attendance/sync
class AttendanceOutboxService {
  AttendanceOutboxService({
    required CacheDatabase db,
    required ApiClient api,
  })  : _db = db,
        _api = api;

  final CacheDatabase _db;
  final ApiClient _api;

  Future<void> enqueue({
    required AuthUser user,
    required String idempotencyKey,
    required List<AttendanceMark> marks,
  }) async {
    if (user.tenantId <= 0) {
      throw ApiException('VALIDATION_ERROR');
    }
    await _db.enqueueOutbox(
      tenantId: user.tenantId,
      userId: user.id,
      idempotencyKey: idempotencyKey,
      payload: jsonEncode({'marks': marks.map((m) => m.toJson()).toList()}),
    );
  }

  Future<int> pendingCount(AuthUser user) {
    return _db.pendingCount(tenantId: user.tenantId, userId: user.id);
  }

  Future<List<OutboxRow>> pending(AuthUser user) {
    return _db.pendingOutbox(tenantId: user.tenantId, userId: user.id);
  }

  /// Sync pending rows in created_at order for this tenant+user only.
  Future<SyncResult> syncPending(AuthUser user) async {
    final rows = await pending(user);
    var synced = 0;
    var conflicts = 0;
    var failed = 0;

    for (final row in rows) {
      if (row.tenantId != user.tenantId || row.userId != user.id) {
        continue;
      }
      try {
        final body = jsonDecode(row.payload) as Map<String, dynamic>;
        final response = await _api.post<Map<String, dynamic>>(
          '/teacher/office/attendance/sync',
          data: body,
        );
        final data = response.data ?? const {};
        final conflictList = data['conflicts'];
        final hasConflicts = conflictList is List && conflictList.isNotEmpty;
        if (hasConflicts && (data['synced'] as num? ?? 0) == 0) {
          await _db.markOutboxConflict(row.id, 'CONFLICT');
          conflicts += 1;
        } else {
          await _db.markOutboxSynced(row.id);
          synced += 1;
          if (hasConflicts) conflicts += 1;
        }
      } catch (e) {
        final mapped = mapDioError(e);
        if (mapped.statusCode == 401) {
          rethrow;
        }
        await _db.markOutboxRetry(
          row.id,
          mapped.code,
          row.retryCount + 1,
        );
        failed += 1;
      }
    }

    return SyncResult(synced: synced, conflicts: conflicts, failed: failed);
  }
}

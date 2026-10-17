import 'dart:convert';

import 'package:dio/dio.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mobile/core/api/api_client.dart';
import 'package:mobile/core/auth/auth_user.dart';
import 'package:mobile/core/auth/secure_store.dart';
import 'package:mobile/core/auth/token_store.dart';
import 'package:mobile/core/cache/cache_database.dart';
import 'package:mobile/core/outbox/attendance_outbox.dart';
import 'package:sqflite_common_ffi/sqflite_ffi.dart';

AuthUser teacher({required int tenantId, required int id}) => AuthUser(
      id: id,
      username: 't$id',
      role: 'Teacher',
      tenantId: tenantId,
      tenantName: 'T$tenantId',
      permissions: const [],
    );

typedef _Responder = Future<ResponseBody> Function(RequestOptions options);

class _FakeAdapter implements HttpClientAdapter {
  _FakeAdapter(this.responder);
  final _Responder responder;

  @override
  void close({bool force = false}) {}

  @override
  Future<ResponseBody> fetch(
    RequestOptions options,
    Stream<List<int>>? requestStream,
    Future<void>? cancelFuture,
  ) =>
      responder(options);
}

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();
  sqfliteFfiInit();
  databaseFactory = databaseFactoryFfi;

  late CacheDatabase db;
  late TokenStore tokens;
  late AttendanceOutboxService outbox;

  setUp(() async {
    // Unique in-memory DB per test (shared inMemoryDatabasePath leaks rows).
    final mem = await databaseFactoryFfi.openDatabase(
      'file:mem_teacher_${DateTime.now().microsecondsSinceEpoch}?mode=memory&cache=shared',
      options: OpenDatabaseOptions(singleInstance: false),
    );
    db = CacheDatabase(db: mem);
    tokens = TokenStore(storage: MemorySecureStore());
    await tokens.saveSession(
      accessToken: 'a',
      refreshToken: 'r',
      userJson: jsonEncode(teacher(tenantId: 1, id: 2).toJson()),
    );
  });

  test('teacher auth user carries tenantId', () {
    final u = teacher(tenantId: 9, id: 4);
    expect(u.isTeacher, isTrue);
    expect(u.tenantId, 9);
  });

  test('outbox is ordered and tenant-isolated', () async {
    final a = teacher(tenantId: 1, id: 2);
    final b = teacher(tenantId: 2, id: 2);
    outbox = AttendanceOutboxService(
      db: db,
      api: ApiClient(tokenStore: tokens, baseUrl: 'http://test'),
    );

    await outbox.enqueue(
      user: a,
      idempotencyKey: 'k1',
      marks: [
        const AttendanceMark(
          studentId: 1,
          subjectId: 1,
          date: '2026-01-01',
          status: 'P',
        ),
      ],
    );
    await Future<void>.delayed(const Duration(milliseconds: 5));
    await outbox.enqueue(
      user: a,
      idempotencyKey: 'k2',
      marks: [
        const AttendanceMark(
          studentId: 2,
          subjectId: 1,
          date: '2026-01-01',
          status: 'A',
        ),
      ],
    );
    await outbox.enqueue(
      user: b,
      idempotencyKey: 'k1',
      marks: [
        const AttendanceMark(
          studentId: 9,
          subjectId: 9,
          date: '2026-01-01',
          status: 'T',
        ),
      ],
    );

    final pendingA = await outbox.pending(a);
    expect(pendingA.map((e) => e.idempotencyKey), ['k1', 'k2']);
    expect(pendingA.every((e) => e.tenantId == 1), isTrue);

    final pendingB = await outbox.pending(b);
    expect(pendingB.length, 1);
    expect(pendingB.first.tenantId, 2);
  });

  test('idempotency key ignores duplicate enqueue', () async {
    final a = teacher(tenantId: 1, id: 2);
    outbox = AttendanceOutboxService(
      db: db,
      api: ApiClient(tokenStore: tokens, baseUrl: 'http://test'),
    );
    final marks = [
      const AttendanceMark(
        studentId: 1,
        subjectId: 1,
        date: '2026-01-01',
        status: 'P',
      ),
    ];
    await outbox.enqueue(user: a, idempotencyKey: 'same', marks: marks);
    await outbox.enqueue(user: a, idempotencyKey: 'same', marks: marks);
    expect(await outbox.pendingCount(a), 1);
  });

  test('sync retries keep pending on network failure then succeed', () async {
    final a = teacher(tenantId: 1, id: 2);
    var calls = 0;
    final dio = Dio()
      ..httpClientAdapter = _FakeAdapter((options) async {
        expect(options.path, '/teacher/office/attendance/sync');
        calls++;
        if (calls == 1) {
          throw DioException(
            requestOptions: options,
            type: DioExceptionType.connectionError,
          );
        }
        return ResponseBody.fromString(
          jsonEncode({'synced': 1, 'conflicts': []}),
          200,
          headers: {
            Headers.contentTypeHeader: [Headers.jsonContentType],
          },
        );
      });
    outbox = AttendanceOutboxService(
      db: db,
      api: ApiClient(tokenStore: tokens, baseUrl: 'http://test', dio: dio),
    );
    await outbox.enqueue(
      user: a,
      idempotencyKey: 'sync-1',
      marks: [
        const AttendanceMark(
          studentId: 1,
          subjectId: 1,
          date: '2026-01-01',
          status: 'P',
        ),
      ],
    );

    final first = await outbox.syncPending(a);
    expect(first.failed, 1);
    expect(await outbox.pendingCount(a), 1);

    final second = await outbox.syncPending(a);
    expect(second.synced, 1);
    expect(await outbox.pendingCount(a), 0);
  });

  test('conflicts are recorded and do not clear other tenant outbox', () async {
    final a = teacher(tenantId: 1, id: 2);
    final other = teacher(tenantId: 2, id: 2);
    final dio = Dio()
      ..httpClientAdapter = _FakeAdapter((options) async {
        return ResponseBody.fromString(
          jsonEncode({
            'synced': 0,
            'conflicts': [
              {
                'studentId': 1,
                'subjectId': 1,
                'date': '2026-01-01',
                'code': 'ALREADY_APPROVED',
              },
            ],
          }),
          200,
          headers: {
            Headers.contentTypeHeader: [Headers.jsonContentType],
          },
        );
      });
    outbox = AttendanceOutboxService(
      db: db,
      api: ApiClient(tokenStore: tokens, baseUrl: 'http://test', dio: dio),
    );
    await outbox.enqueue(
      user: a,
      idempotencyKey: 'c1',
      marks: [
        const AttendanceMark(
          studentId: 1,
          subjectId: 1,
          date: '2026-01-01',
          status: 'P',
        ),
      ],
    );
    await outbox.enqueue(
      user: other,
      idempotencyKey: 'c1',
      marks: [
        const AttendanceMark(
          studentId: 2,
          subjectId: 2,
          date: '2026-01-01',
          status: 'A',
        ),
      ],
    );

    final result = await outbox.syncPending(a);
    expect(result.conflicts, 1);
    expect(await outbox.pendingCount(a), 0);
    expect(await outbox.pendingCount(other), 1);
  });

  test('logout clearUser removes only that tenant/user outbox', () async {
    final a = teacher(tenantId: 1, id: 2);
    final b = teacher(tenantId: 1, id: 3);
    outbox = AttendanceOutboxService(
      db: db,
      api: ApiClient(tokenStore: tokens, baseUrl: 'http://test'),
    );
    await outbox.enqueue(
      user: a,
      idempotencyKey: 'x',
      marks: [
        const AttendanceMark(
          studentId: 1,
          subjectId: 1,
          date: '2026-01-01',
          status: 'P',
        ),
      ],
    );
    await outbox.enqueue(
      user: b,
      idempotencyKey: 'x',
      marks: [
        const AttendanceMark(
          studentId: 1,
          subjectId: 1,
          date: '2026-01-01',
          status: 'P',
        ),
      ],
    );
    await db.clearUser(tenantId: 1, userId: 2);
    expect(await outbox.pendingCount(a), 0);
    expect(await outbox.pendingCount(b), 1);
  });

  test('cache-first teacher read stays offline-safe', () async {
    final a = teacher(tenantId: 1, id: 2);
    await db.put(
      tenantId: 1,
      userId: 2,
      key: 'teacher_schedule',
      payload: jsonEncode({'ok': true}),
    );
    final cached =
        await db.get(tenantId: a.tenantId, userId: a.id, key: 'teacher_schedule');
    expect(jsonDecode(cached!.payload)['ok'], true);
  });
}

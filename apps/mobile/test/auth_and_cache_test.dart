import 'dart:convert';

import 'package:dio/dio.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mobile/core/api/api_client.dart';
import 'package:mobile/core/api/api_exception.dart';
import 'package:mobile/core/auth/auth_repository.dart';
import 'package:mobile/core/auth/auth_user.dart';
import 'package:mobile/core/auth/secure_store.dart';
import 'package:mobile/core/auth/token_store.dart';
import 'package:mobile/core/cache/cache_database.dart';
import 'package:mobile/core/cache/cache_repository.dart';
import 'package:sqflite_common_ffi/sqflite_ffi.dart';

AuthUser user({required int tenantId, required int id}) => AuthUser(
      id: id,
      username: 'u$id',
      role: 'Student',
      tenantId: tenantId,
      tenantName: 'T$tenantId',
      permissions: const [],
    );

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();
  sqfliteFfiInit();
  databaseFactory = databaseFactoryFfi;

  late MemorySecureStore storage;
  late TokenStore tokens;

  setUp(() {
    storage = MemorySecureStore();
    tokens = TokenStore(storage: storage);
  });

  group('login + session', () {
    test('login stores access, refresh cookie, and tenant user', () async {
      final dio = Dio()
        ..httpClientAdapter = _FakeAdapter((options) async {
          if (options.path == '/auth/login') {
            return ResponseBody.fromString(
              jsonEncode({
                'accessToken': 'access-1',
                'user': user(tenantId: 7, id: 3).toJson(),
              }),
              200,
              headers: {
                Headers.contentTypeHeader: [Headers.jsonContentType],
                'set-cookie': [
                  'refreshToken=refresh-xyz; Path=/auth; HttpOnly',
                ],
              },
            );
          }
          throw StateError(options.path);
        });

      final api = ApiClient(
        tokenStore: tokens,
        baseUrl: 'http://test',
        dio: dio,
      );
      final repo = AuthRepository(api: api, tokenStore: tokens);
      final logged = await repo.login(
        tenantSlug: 'keyit',
        username: 'haymi',
        password: 'secret',
      );

      expect(logged.tenantId, 7);
      expect(await tokens.readAccessToken(), 'access-1');
      expect(await tokens.readRefreshToken(), 'refresh-xyz');
      final cached = await tokens.readUserJson();
      expect(jsonDecode(cached!)['tenantId'], 7);
    });

    test('session restore uses refresh then /auth/me', () async {
      await tokens.saveSession(
        accessToken: 'old',
        refreshToken: 'refresh-1',
        userJson: jsonEncode(user(tenantId: 1, id: 9).toJson()),
      );

      final dio = Dio()
        ..httpClientAdapter = _FakeAdapter((options) async {
          if (options.path == '/auth/refresh') {
            expect(options.headers['Cookie'], 'refreshToken=refresh-1');
            return ResponseBody.fromString(
              jsonEncode({'accessToken': 'access-2'}),
              200,
              headers: {
                Headers.contentTypeHeader: [Headers.jsonContentType],
              },
            );
          }
          if (options.path == '/auth/me') {
            return ResponseBody.fromString(
              jsonEncode({'user': user(tenantId: 1, id: 9).toJson()}),
              200,
              headers: {
                Headers.contentTypeHeader: [Headers.jsonContentType],
              },
            );
          }
          throw StateError(options.path);
        });

      final api = ApiClient(
        tokenStore: tokens,
        baseUrl: 'http://test',
        dio: dio,
      );
      final repo = AuthRepository(api: api, tokenStore: tokens);
      final restored = await repo.restoreSession();
      expect(restored?.tenantId, 1);
      expect(await tokens.readAccessToken(), 'access-2');
    });

    test('token refresh once after 401', () async {
      await tokens.saveSession(
        accessToken: 'expired',
        refreshToken: 'r1',
        userJson: jsonEncode(user(tenantId: 1, id: 1).toJson()),
      );
      var hits = 0;
      final dio = Dio()
        ..httpClientAdapter = _FakeAdapter((options) async {
          if (options.path == '/student/home') {
            hits++;
            if (hits == 1) {
              return ResponseBody.fromString(
                jsonEncode({'code': 'AUTH_UNAUTHORIZED'}),
                401,
                headers: {
                  Headers.contentTypeHeader: [Headers.jsonContentType],
                },
              );
            }
            expect(options.headers['Authorization'], 'Bearer fresh');
            return ResponseBody.fromString(
              jsonEncode({'ok': true}),
              200,
              headers: {
                Headers.contentTypeHeader: [Headers.jsonContentType],
              },
            );
          }
          if (options.path == '/auth/refresh') {
            return ResponseBody.fromString(
              jsonEncode({'accessToken': 'fresh'}),
              200,
              headers: {
                Headers.contentTypeHeader: [Headers.jsonContentType],
              },
            );
          }
          throw StateError(options.path);
        });

      final api = ApiClient(
        tokenStore: tokens,
        baseUrl: 'http://test',
        dio: dio,
      );
      final res = await api.get<Map<String, dynamic>>('/student/home');
      expect(res.data?['ok'], true);
      expect(hits, 2);
    });
  });

  group('tenant isolation + cache', () {
    test('cache rows are isolated by tenantId + userId', () async {
      final mem = await databaseFactoryFfi.openDatabase(inMemoryDatabasePath);
      final db = CacheDatabase(db: mem);
      await db.put(
        tenantId: 1,
        userId: 10,
        key: 'home',
        payload: jsonEncode({'v': 'a'}),
      );
      await db.put(
        tenantId: 2,
        userId: 10,
        key: 'home',
        payload: jsonEncode({'v': 'b'}),
      );

      final a = await db.get(tenantId: 1, userId: 10, key: 'home');
      final b = await db.get(tenantId: 2, userId: 10, key: 'home');
      expect(jsonDecode(a!.payload)['v'], 'a');
      expect(jsonDecode(b!.payload)['v'], 'b');
      expect(scopedCacheKey(1, 10, 'home'), isNot(scopedCacheKey(2, 10, 'home')));
    });

    test('cache-first returns cache then network refresh stores new data', () async {
      final mem = await databaseFactoryFfi.openDatabase(inMemoryDatabasePath);
      final db = CacheDatabase(db: mem);
      final u = user(tenantId: 1, id: 5);
      await db.put(
        tenantId: 1,
        userId: 5,
        key: 'home',
        payload: jsonEncode({'n': 1}),
      );

      final dio = Dio()
        ..httpClientAdapter = _FakeAdapter((options) async {
          return ResponseBody.fromString(
            jsonEncode({'n': 2}),
            200,
            headers: {
              Headers.contentTypeHeader: [Headers.jsonContentType],
            },
          );
        });
      final api = ApiClient(tokenStore: tokens, baseUrl: 'http://test', dio: dio);
      final cache = CacheRepository(db: db, api: api);

      final first = await cache.cacheFirstJson<Map<String, dynamic>>(
        user: u,
        key: 'home',
        path: '/student/home',
        parse: (j) => Map<String, dynamic>.from(j as Map),
      );
      expect(first.fromCache, isTrue);
      expect(first.data['n'], 1);

      final refreshed = await cache.refreshJson<Map<String, dynamic>>(
        user: u,
        key: 'home',
        path: '/student/home',
        parse: (j) => Map<String, dynamic>.from(j as Map),
      );
      expect(refreshed.fromCache, isFalse);
      expect(refreshed.data['n'], 2);
    });

    test('offline network failure keeps cache and does not clear tokens', () async {
      final mem = await databaseFactoryFfi.openDatabase(inMemoryDatabasePath);
      final db = CacheDatabase(db: mem);
      final u = user(tenantId: 1, id: 5);
      await tokens.saveSession(
        accessToken: 'a',
        refreshToken: 'r',
        userJson: jsonEncode(u.toJson()),
      );
      await db.put(
        tenantId: 1,
        userId: 5,
        key: 'home',
        payload: jsonEncode({'ok': true}),
      );

      final dio = Dio()
        ..httpClientAdapter = _FakeAdapter((options) async {
          throw DioException(
            requestOptions: options,
            type: DioExceptionType.connectionError,
          );
        });
      final api = ApiClient(tokenStore: tokens, baseUrl: 'http://test', dio: dio);
      final cache = CacheRepository(db: db, api: api);
      final result = await cache.cacheFirstJson<Map<String, dynamic>>(
        user: u,
        key: 'home',
        path: '/student/home',
        parse: (j) => Map<String, dynamic>.from(j as Map),
        forceRefresh: true,
      );
      expect(result.fromCache, isTrue);
      expect(await tokens.readAccessToken(), 'a');
    });

    test('logout clears tokens and tenant/user cache only', () async {
      final mem = await databaseFactoryFfi.openDatabase(inMemoryDatabasePath);
      final db = CacheDatabase(db: mem);
      await db.put(
        tenantId: 1,
        userId: 1,
        key: 'home',
        payload: '{"a":1}',
      );
      await db.put(
        tenantId: 2,
        userId: 1,
        key: 'home',
        payload: '{"a":2}',
      );
      await tokens.saveSession(
        accessToken: 'a',
        refreshToken: 'r',
        userJson: jsonEncode(user(tenantId: 1, id: 1).toJson()),
      );

      final dio = Dio()
        ..httpClientAdapter = _FakeAdapter((options) async {
          return ResponseBody.fromString(
            jsonEncode({'ok': true}),
            200,
            headers: {
              Headers.contentTypeHeader: [Headers.jsonContentType],
            },
          );
        });
      final api = ApiClient(tokenStore: tokens, baseUrl: 'http://test', dio: dio);
      final repo = AuthRepository(api: api, tokenStore: tokens);
      await repo.logout();
      await db.clearUser(tenantId: 1, userId: 1);

      expect(await tokens.readAccessToken(), isNull);
      expect(await db.get(tenantId: 1, userId: 1, key: 'home'), isNull);
      expect(await db.get(tenantId: 2, userId: 1, key: 'home'), isNotNull);
    });
  });

  test('network error mapping does not look like logout', () {
    final err = mapDioError(
      DioException(
        requestOptions: RequestOptions(path: '/x'),
        type: DioExceptionType.connectionError,
      ),
    );
    expect(err, isA<ApiException>());
    expect(err.code, 'NETWORK_ERROR');
  });
}

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
  ) {
    return responder(options);
  }
}

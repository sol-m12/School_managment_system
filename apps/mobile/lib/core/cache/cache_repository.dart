import 'dart:convert';

import '../api/api_client.dart';
import '../auth/auth_user.dart';
// mapDioError is exported from api_client.dart
import 'cache_database.dart';

class CacheResult<T> {
  const CacheResult({
    required this.data,
    required this.fromCache,
    this.updatedAt,
  });

  final T data;
  final bool fromCache;
  final DateTime? updatedAt;
}

/// Cache-first reads scoped to the authenticated tenant + user.
class CacheRepository {
  CacheRepository({
    required CacheDatabase db,
    required ApiClient api,
  })  : _db = db,
        _api = api;

  final CacheDatabase _db;
  final ApiClient _api;

  Future<CachedEntry?> peek({
    required AuthUser user,
    required String key,
  }) {
    return _db.get(tenantId: user.tenantId, userId: user.id, key: key);
  }

  /// Returns cached data first when present; otherwise fetches.
  /// When [forceRefresh] is true, network is attempted first.
  Future<CacheResult<T>> cacheFirstJson<T>({
    required AuthUser user,
    required String key,
    required String path,
    required T Function(Object? json) parse,
    bool forceRefresh = false,
  }) async {
    final cached = await _db.get(
      tenantId: user.tenantId,
      userId: user.id,
      key: key,
    );

    if (!forceRefresh && cached != null) {
      return CacheResult(
        data: parse(jsonDecode(cached.payload)),
        fromCache: true,
        updatedAt: cached.updatedAt,
      );
    }

    try {
      return await _fetchAndStore(
        user: user,
        key: key,
        path: path,
        parse: parse,
      );
    } catch (e) {
      if (cached != null) {
        return CacheResult(
          data: parse(jsonDecode(cached.payload)),
          fromCache: true,
          updatedAt: cached.updatedAt,
        );
      }
      throw mapDioError(e);
    }
  }

  /// Background refresh that updates cache; returns fresh data or throws.
  Future<CacheResult<T>> refreshJson<T>({
    required AuthUser user,
    required String key,
    required String path,
    required T Function(Object? json) parse,
  }) {
    return _fetchAndStore(user: user, key: key, path: path, parse: parse);
  }

  Future<CacheResult<T>> _fetchAndStore<T>({
    required AuthUser user,
    required String key,
    required String path,
    required T Function(Object? json) parse,
  }) async {
    final response = await _api.get<dynamic>(path);
    final raw = response.data;
    final now = DateTime.now().toUtc();
    await _db.put(
      tenantId: user.tenantId,
      userId: user.id,
      key: key,
      payload: jsonEncode(raw),
      updatedAt: now,
    );
    return CacheResult(data: parse(raw), fromCache: false, updatedAt: now);
  }

  Future<void> clearForUser(AuthUser user) {
    return _db.clearUser(tenantId: user.tenantId, userId: user.id);
  }
}

/// Pure helper used by tests for tenant isolation of logical cache keys.
String scopedCacheKey(int tenantId, int userId, String key) =>
    '$tenantId:$userId:$key';

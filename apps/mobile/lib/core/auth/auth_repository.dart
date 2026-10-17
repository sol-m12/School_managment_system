import 'dart:convert';

import '../api/api_client.dart';
import '../api/api_exception.dart';
import 'auth_user.dart';
import 'token_store.dart';

class AuthRepository {
  AuthRepository({
    required ApiClient api,
    required TokenStore tokenStore,
  })  : _api = api,
        _tokenStore = tokenStore;

  final ApiClient _api;
  final TokenStore _tokenStore;

  Future<AuthUser> login({
    required String tenantSlug,
    required String username,
    required String password,
  }) async {
    try {
      final response = await _api.post<Map<String, dynamic>>(
        '/auth/login',
        data: {
          'tenantSlug': tenantSlug.trim(),
          'username': username.trim(),
          'password': password,
        },
      );
      final data = response.data;
      if (data == null) throw ApiException('INTERNAL_ERROR');
      final access = data['accessToken'] as String?;
      final userMap = data['user'] as Map<String, dynamic>?;
      if (access == null || userMap == null) {
        throw ApiException('INTERNAL_ERROR');
      }
      final user = AuthUser.fromJson(userMap);
      final refresh = _api.refreshTokenFromResponse(response);
      await _tokenStore.saveSession(
        accessToken: access,
        refreshToken: refresh,
        userJson: jsonEncode(user.toJson()),
      );
      return user;
    } catch (e) {
      throw mapDioError(e);
    }
  }

  Future<AuthUser?> restoreSession() async {
    final cached = await _tokenStore.readUserJson();
    final refresh = await _tokenStore.readRefreshToken();
    final access = await _tokenStore.readAccessToken();
    if (cached == null) return null;
    if ((refresh == null || refresh.isEmpty) &&
        (access == null || access.isEmpty)) {
      return null;
    }

    AuthUser user = AuthUser.fromJson(
      jsonDecode(cached) as Map<String, dynamic>,
    );

    try {
      if (refresh != null && refresh.isNotEmpty) {
        await _api.refreshAccessToken();
      }
      final me = await _api.get<Map<String, dynamic>>('/auth/me');
      final userMap = me.data?['user'] as Map<String, dynamic>?;
      if (userMap != null) {
        user = AuthUser.fromJson(userMap);
        await _tokenStore.saveSession(
          accessToken: (await _tokenStore.readAccessToken()) ?? '',
          refreshToken: await _tokenStore.readRefreshToken(),
          userJson: jsonEncode(user.toJson()),
        );
      }
      return user;
    } on ApiException catch (e) {
      if (e.code == 'AUTH_UNAUTHORIZED' || e.statusCode == 401) {
        await _tokenStore.clear();
        return null;
      }
      // Network errors: keep cached session (tenant context preserved).
      return user;
    } catch (e) {
      final mapped = mapDioError(e);
      if (mapped.code == 'AUTH_UNAUTHORIZED' || mapped.statusCode == 401) {
        await _tokenStore.clear();
        return null;
      }
      return user;
    }
  }

  Future<void> logout() async {
    try {
      await _api.post<Map<String, dynamic>>('/auth/logout');
    } catch (_) {
      // Always clear local session.
    } finally {
      await _tokenStore.clear();
    }
  }
}

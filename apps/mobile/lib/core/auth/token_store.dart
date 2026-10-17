import 'secure_store.dart';

/// Secure token + session metadata storage.
///
/// Refresh tokens are taken from the API `Set-Cookie` header on login
/// (same cookie the website stores as httpOnly) and sent back as a
/// `Cookie` header on `/auth/refresh`. No hardcoded tenant IDs.
class TokenStore {
  TokenStore({SecureStore? storage})
      : _storage = storage ?? FlutterSecureStore();

  static const _accessKey = 'access_token';
  static const _refreshKey = 'refresh_token';
  static const _userJsonKey = 'auth_user_json';

  final SecureStore _storage;

  Future<void> saveSession({
    required String accessToken,
    required String? refreshToken,
    required String userJson,
  }) async {
    await _storage.write(_accessKey, accessToken);
    if (refreshToken != null && refreshToken.isNotEmpty) {
      await _storage.write(_refreshKey, refreshToken);
    }
    await _storage.write(_userJsonKey, userJson);
  }

  Future<void> saveAccessToken(String accessToken) async {
    await _storage.write(_accessKey, accessToken);
  }

  Future<String?> readAccessToken() => _storage.read(_accessKey);

  Future<String?> readRefreshToken() => _storage.read(_refreshKey);

  Future<String?> readUserJson() => _storage.read(_userJsonKey);

  Future<void> clear() async {
    await _storage.delete(_accessKey);
    await _storage.delete(_refreshKey);
    await _storage.delete(_userJsonKey);
  }
}

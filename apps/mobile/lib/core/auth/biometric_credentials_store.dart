import 'secure_store.dart';

class BiometricCredentials {
  const BiometricCredentials({
    required this.tenantSlug,
    required this.username,
    required this.password,
  });

  final String tenantSlug;
  final String username;
  final String password;
}

/// Stores login credentials unlocked only after a successful biometric check.
///
/// Uses the same SharedPreferences-backed store as tokens (Windows-safe).
/// Credentials are written only when the user opts into biometric sign-in.
class BiometricCredentialsStore {
  BiometricCredentialsStore([SecureStore? store])
      : _store = store ?? PrefsSecureStore();

  static const _enabledKey = 'biometric_login_enabled';
  static const _tenantKey = 'biometric_login_tenant';
  static const _usernameKey = 'biometric_login_username';
  static const _passwordKey = 'biometric_login_password';

  final SecureStore _store;

  Future<bool> isEnabled() async {
    return (await _store.read(_enabledKey)) == '1';
  }

  Future<bool> hasCredentials() async {
    if (!await isEnabled()) return false;
    final creds = await read();
    return creds != null;
  }

  Future<BiometricCredentials?> read() async {
    if (!await isEnabled()) return null;
    final tenant = await _store.read(_tenantKey);
    final username = await _store.read(_usernameKey);
    final password = await _store.read(_passwordKey);
    if (tenant == null ||
        tenant.isEmpty ||
        username == null ||
        username.isEmpty ||
        password == null ||
        password.isEmpty) {
      return null;
    }
    return BiometricCredentials(
      tenantSlug: tenant,
      username: username,
      password: password,
    );
  }

  Future<void> save(BiometricCredentials credentials) async {
    await _store.write(_enabledKey, '1');
    await _store.write(_tenantKey, credentials.tenantSlug.trim());
    await _store.write(_usernameKey, credentials.username.trim());
    await _store.write(_passwordKey, credentials.password);
  }

  Future<void> clear() async {
    await _store.delete(_enabledKey);
    await _store.delete(_tenantKey);
    await _store.delete(_usernameKey);
    await _store.delete(_passwordKey);
  }
}

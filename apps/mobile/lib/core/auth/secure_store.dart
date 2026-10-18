import 'package:shared_preferences/shared_preferences.dart';

abstract class SecureStore {
  Future<void> write(String key, String? value);
  Future<String?> read(String key);
  Future<void> delete(String key);
}

/// Token storage via SharedPreferences.
///
/// Used instead of flutter_secure_storage so Windows desktop builds do not
/// require Visual Studio ATL headers (atlbase.h / atlstr.h).
class PrefsSecureStore implements SecureStore {
  PrefsSecureStore([SharedPreferences? prefs]) : _prefs = prefs;

  SharedPreferences? _prefs;

  Future<SharedPreferences> _ensure() async {
    return _prefs ??= await SharedPreferences.getInstance();
  }

  @override
  Future<void> write(String key, String? value) async {
    final prefs = await _ensure();
    if (value == null) {
      await prefs.remove(key);
    } else {
      await prefs.setString(key, value);
    }
  }

  @override
  Future<String?> read(String key) async {
    final prefs = await _ensure();
    return prefs.getString(key);
  }

  @override
  Future<void> delete(String key) async {
    final prefs = await _ensure();
    await prefs.remove(key);
  }
}

/// Back-compat name used by TokenStore / older call sites.
typedef FlutterSecureStore = PrefsSecureStore;

class MemorySecureStore implements SecureStore {
  final Map<String, String> _map = {};

  @override
  Future<void> write(String key, String? value) async {
    if (value == null) {
      _map.remove(key);
    } else {
      _map[key] = value;
    }
  }

  @override
  Future<String?> read(String key) async => _map[key];

  @override
  Future<void> delete(String key) async {
    _map.remove(key);
  }
}

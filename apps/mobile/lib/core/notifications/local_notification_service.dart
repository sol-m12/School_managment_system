import 'package:shared_preferences/shared_preferences.dart';

import '../api/api_client.dart';
import '../auth/auth_user.dart';

/// Foreground poll of GET /student/desk/notifications.
///
/// OS local-notification plugins were removed so Windows builds do not need
/// Visual Studio ATL. New announcement IDs are tracked in prefs; callers can
/// still refresh the in-app notifications list.
class LocalNotificationService {
  LocalNotificationService({required ApiClient api}) : _api = api;

  final ApiClient _api;
  bool _ready = false;

  Future<void> init() async {
    _ready = true;
  }

  String _seenKey(AuthUser user) =>
      'seen_announcements_${user.tenantId}_${user.id}';

  Future<void> pollStudentAnnouncements(AuthUser user) async {
    if (!user.isStudent) return;
    await init();
    try {
      final response = await _api.get<Map<String, dynamic>>(
        '/student/desk/notifications',
      );
      final rows = response.data?['rows'];
      if (rows is! List) return;

      final prefs = await SharedPreferences.getInstance();
      final seen = prefs.getStringList(_seenKey(user))?.toSet() ?? <String>{};
      final nextSeen = <String>{...seen};

      for (final row in rows) {
        if (row is! Map) continue;
        final id = row['id']?.toString();
        if (id == null || id.isEmpty) continue;
        nextSeen.add(id);
      }

      await prefs.setStringList(_seenKey(user), nextSeen.toList());
    } catch (_) {
      // Network errors must not sign the user out.
    }
  }

  Future<void> clearSeen(AuthUser user) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_seenKey(user));
  }
}

import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../api/api_client.dart';
import '../auth/auth_user.dart';

/// Foreground/local alerts from existing GET /student/desk/notifications.
/// True FCM push requires an API device-token endpoint (not available).
class LocalNotificationService {
  LocalNotificationService({
    required ApiClient api,
    FlutterLocalNotificationsPlugin? plugin,
  })  : _api = api,
        _plugin = plugin ?? FlutterLocalNotificationsPlugin();

  final ApiClient _api;
  final FlutterLocalNotificationsPlugin _plugin;
  bool _ready = false;

  static const _channelId = 'keyt_announcements';

  Future<void> init() async {
    if (_ready) return;
    const android = AndroidInitializationSettings('@mipmap/ic_launcher');
    const ios = DarwinInitializationSettings();
    await _plugin.initialize(
      settings: const InitializationSettings(android: android, iOS: ios),
    );
    final androidPlugin = _plugin.resolvePlatformSpecificImplementation<
        AndroidFlutterLocalNotificationsPlugin>();
    await androidPlugin?.requestNotificationsPermission();
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
        if (seen.contains(id)) continue;
        // First successful poll seeds seen IDs without spamming.
        if (seen.isEmpty) continue;
        final title = row['title']?.toString() ?? 'Keyt';
        final body = row['content']?.toString() ?? '';
        final urgent = row['urgent'] == true;
        await _show(
          id: int.tryParse(id) ?? id.hashCode,
          title: urgent ? '⚠ $title' : title,
          body: body,
        );
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

  Future<void> _show({
    required int id,
    required String title,
    required String body,
  }) {
    return _plugin.show(
      id: id,
      title: title,
      body: body,
      notificationDetails: const NotificationDetails(
        android: AndroidNotificationDetails(
          _channelId,
          'School announcements',
          channelDescription: 'New announcements from your school',
          importance: Importance.high,
          priority: Priority.high,
        ),
        iOS: DarwinNotificationDetails(),
      ),
    );
  }
}

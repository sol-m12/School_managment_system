/// Extracts a named cookie value from HTTP `Set-Cookie` header(s).
String? extractCookieValue(HeadersLike headers, String cookieName) {
  final values = headers.valuesFor('set-cookie');
  for (final raw in values) {
    final part = raw.split(';').first.trim();
    final eq = part.indexOf('=');
    if (eq <= 0) continue;
    final name = part.substring(0, eq).trim();
    if (name == cookieName) {
      return part.substring(eq + 1).trim();
    }
  }
  return null;
}

/// Minimal header surface so parsers stay testable without Dio.
abstract class HeadersLike {
  List<String> valuesFor(String name);
}

class MapHeaders implements HeadersLike {
  MapHeaders(this.map);

  final Map<String, List<String>> map;

  @override
  List<String> valuesFor(String name) {
    final lower = name.toLowerCase();
    for (final entry in map.entries) {
      if (entry.key.toLowerCase() == lower) return entry.value;
    }
    return const [];
  }
}

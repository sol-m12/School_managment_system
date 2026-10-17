/// Parses student digital ID payloads: `KEYT-{tenantId}-{studentId}`.
class KeytIdCode {
  const KeytIdCode({required this.tenantId, required this.studentId});

  final int tenantId;
  final int studentId;

  static KeytIdCode? tryParse(String raw) {
    final text = raw.trim();
    final match = RegExp(r'^KEYT-(\d+)-(\d+)$').firstMatch(text);
    if (match == null) return null;
    final tenantId = int.tryParse(match.group(1)!);
    final studentId = int.tryParse(match.group(2)!);
    if (tenantId == null || studentId == null) return null;
    if (tenantId <= 0 || studentId <= 0) return null;
    return KeytIdCode(tenantId: tenantId, studentId: studentId);
  }

  String get encoded => 'KEYT-$tenantId-$studentId';
}

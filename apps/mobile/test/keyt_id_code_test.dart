import 'package:flutter_test/flutter_test.dart';
import 'package:mobile/core/id/keyt_id_code.dart';

void main() {
  test('parses KEYT tenant/student codes', () {
    final code = KeytIdCode.tryParse('KEYT-1-42');
    expect(code?.tenantId, 1);
    expect(code?.studentId, 42);
    expect(code?.encoded, 'KEYT-1-42');
  });

  test('rejects invalid or empty payloads', () {
    expect(KeytIdCode.tryParse(''), isNull);
    expect(KeytIdCode.tryParse('KEYT-x-1'), isNull);
    expect(KeytIdCode.tryParse('KEYT-1'), isNull);
    expect(KeytIdCode.tryParse('OTHER-1-2'), isNull);
  });

  test('tenant mismatch helper stays explicit for scan safety', () {
    final scanned = KeytIdCode.tryParse('KEYT-2-9')!;
    const sessionTenant = 1;
    expect(scanned.tenantId == sessionTenant, isFalse);
  });
}

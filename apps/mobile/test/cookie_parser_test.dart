import 'package:flutter_test/flutter_test.dart';
import 'package:mobile/core/api/cookie_parser.dart';

void main() {
  test('extracts refreshToken from Set-Cookie', () {
    final headers = MapHeaders({
      'set-cookie': [
        'refreshToken=abc.def.ghi; Path=/auth; HttpOnly; SameSite=Lax',
      ],
    });
    expect(extractCookieValue(headers, 'refreshToken'), 'abc.def.ghi');
  });

  test('returns null when cookie missing', () {
    final headers = MapHeaders({'set-cookie': ['other=1']});
    expect(extractCookieValue(headers, 'refreshToken'), isNull);
  });
}

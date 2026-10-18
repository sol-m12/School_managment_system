import 'package:flutter_test/flutter_test.dart';
import 'package:mobile/core/auth/biometric_credentials_store.dart';
import 'package:mobile/core/auth/secure_store.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  late MemorySecureStore storage;
  late BiometricCredentialsStore store;

  setUp(() {
    storage = MemorySecureStore();
    store = BiometricCredentialsStore(storage);
  });

  test('save and read credentials when enabled', () async {
    expect(await store.hasCredentials(), isFalse);

    await store.save(
      const BiometricCredentials(
        tenantSlug: ' keyit ',
        username: ' haymi ',
        password: 'secret',
      ),
    );

    expect(await store.isEnabled(), isTrue);
    expect(await store.hasCredentials(), isTrue);
    final creds = await store.read();
    expect(creds?.tenantSlug, 'keyit');
    expect(creds?.username, 'haymi');
    expect(creds?.password, 'secret');
  });

  test('clear removes credentials', () async {
    await store.save(
      const BiometricCredentials(
        tenantSlug: 'a',
        username: 'b',
        password: 'c',
      ),
    );
    await store.clear();
    expect(await store.isEnabled(), isFalse);
    expect(await store.hasCredentials(), isFalse);
    expect(await store.read(), isNull);
  });
}

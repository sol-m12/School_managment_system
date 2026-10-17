/// API base URL from `--dart-define=API_BASE_URL=...`.
String apiBaseUrl() {
  const fromDefine = String.fromEnvironment('API_BASE_URL');
  if (fromDefine.trim().isNotEmpty) return fromDefine.trim();
  return 'http://localhost:4000';
}

const String apiClientHeader = 'mobile';
const String refreshCookieName = 'refreshToken';

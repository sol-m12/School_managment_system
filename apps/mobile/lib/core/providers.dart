import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'api/api_client.dart';
import 'api/api_config.dart';
import 'auth/auth_repository.dart';
import 'auth/auth_user.dart';
import 'auth/token_store.dart';
import 'cache/cache_database.dart';
import 'cache/cache_repository.dart';
import 'connectivity/connectivity_service.dart';

final tokenStoreProvider = Provider<TokenStore>((ref) => TokenStore());

final cacheDatabaseProvider = Provider<CacheDatabase>((ref) => CacheDatabase());

final connectivityServiceProvider =
    Provider<ConnectivityService>((ref) => ConnectivityService());

final apiClientProvider = Provider<ApiClient>((ref) {
  final store = ref.watch(tokenStoreProvider);
  final client = ApiClient(
    tokenStore: store,
    baseUrl: apiBaseUrl(),
  );
  return client;
});

final authRepositoryProvider = Provider<AuthRepository>((ref) {
  return AuthRepository(
    api: ref.watch(apiClientProvider),
    tokenStore: ref.watch(tokenStoreProvider),
  );
});

final cacheRepositoryProvider = Provider<CacheRepository>((ref) {
  return CacheRepository(
    db: ref.watch(cacheDatabaseProvider),
    api: ref.watch(apiClientProvider),
  );
});

enum AuthStatus { unknown, authenticated, unauthenticated }

class AuthState {
  const AuthState({
    required this.status,
    this.user,
  });

  final AuthStatus status;
  final AuthUser? user;

  static const unknown = AuthState(status: AuthStatus.unknown);
  static const signedOut = AuthState(status: AuthStatus.unauthenticated);

  AuthState copyWith({AuthStatus? status, AuthUser? user}) {
    return AuthState(status: status ?? this.status, user: user ?? this.user);
  }
}

class AuthController extends Notifier<AuthState> {
  @override
  AuthState build() {
    Future.microtask(restore);
    return AuthState.unknown;
  }

  AuthRepository get _repo => ref.read(authRepositoryProvider);
  CacheRepository get _cache => ref.read(cacheRepositoryProvider);
  ApiClient get _api => ref.read(apiClientProvider);

  Future<void> restore() async {
    _api.setSessionRevokedHandler(_onRevoked);
    final user = await _repo.restoreSession();
    if (user == null) {
      state = AuthState.signedOut;
    } else {
      state = AuthState(status: AuthStatus.authenticated, user: user);
    }
  }

  Future<void> login({
    required String tenantSlug,
    required String username,
    required String password,
  }) async {
    final user = await _repo.login(
      tenantSlug: tenantSlug,
      username: username,
      password: password,
    );
    state = AuthState(status: AuthStatus.authenticated, user: user);
  }

  Future<void> logout() async {
    final user = state.user;
    await _repo.logout();
    if (user != null) {
      await _cache.clearForUser(user);
    }
    state = AuthState.signedOut;
  }

  Future<void> _onRevoked() async {
    final user = state.user;
    await ref.read(tokenStoreProvider).clear();
    if (user != null) {
      await _cache.clearForUser(user);
    }
    state = AuthState.signedOut;
  }
}

final authControllerProvider =
    NotifierProvider<AuthController, AuthState>(AuthController.new);

final isOnlineProvider = StreamProvider<bool>((ref) {
  return ref.watch(connectivityServiceProvider).onOnlineChanged;
});

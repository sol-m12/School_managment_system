import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'api/api_client.dart';
import 'api/api_config.dart';
import 'auth/auth_repository.dart';
import 'auth/auth_user.dart';
import 'auth/biometric_credentials_store.dart';
import 'auth/biometric_service.dart';
import 'auth/token_store.dart';
import 'cache/cache_database.dart';
import 'cache/cache_repository.dart';
import 'connectivity/connectivity_service.dart';
import 'notifications/local_notification_service.dart';
import 'outbox/attendance_outbox.dart';

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

final biometricServiceProvider = Provider<BiometricService>((ref) {
  return BiometricService();
});

final biometricCredentialsStoreProvider =
    Provider<BiometricCredentialsStore>((ref) {
  return BiometricCredentialsStore();
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

  Future<AuthUser> login({
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
    return user;
  }

  /// Apply an already-established session (tokens already in [TokenStore]).
  void acceptSession(AuthUser user) {
    state = AuthState(status: AuthStatus.authenticated, user: user);
  }

  Future<void> logout() async {
    final user = state.user;
    await _repo.logout();
    if (user != null) {
      await _cache.clearForUser(user);
      await ref.read(localNotificationServiceProvider).clearSeen(user);
    }
    state = AuthState.signedOut;
  }

  Future<void> _onRevoked() async {
    final user = state.user;
    await ref.read(tokenStoreProvider).clear();
    if (user != null) {
      await _cache.clearForUser(user);
      await ref.read(localNotificationServiceProvider).clearSeen(user);
    }
    state = AuthState.signedOut;
  }
}

final authControllerProvider =
    NotifierProvider<AuthController, AuthState>(AuthController.new);

final isOnlineProvider = StreamProvider<bool>((ref) {
  return ref.watch(connectivityServiceProvider).onOnlineChanged;
});

final localNotificationServiceProvider =
    Provider<LocalNotificationService>((ref) {
  return LocalNotificationService(api: ref.watch(apiClientProvider));
});

final attendanceOutboxServiceProvider = Provider<AttendanceOutboxService>((ref) {
  return AttendanceOutboxService(
    db: ref.watch(cacheDatabaseProvider),
    api: ref.watch(apiClientProvider),
  );
});

/// Polls student desk notifications while authenticated (local alerts only).
final announcementPollProvider = Provider<void>((ref) {
  final auth = ref.watch(authControllerProvider);
  final user = auth.user;
  if (auth.status != AuthStatus.authenticated || user == null || !user.isStudent) {
    return;
  }
  final service = ref.read(localNotificationServiceProvider);
  Future.microtask(() => service.pollStudentAnnouncements(user));
  final timer = Stream.periodic(const Duration(minutes: 5)).listen((_) {
    final current = ref.read(authControllerProvider).user;
    if (current != null && current.isStudent) {
      service.pollStudentAnnouncements(current);
    }
  });
  ref.onDispose(timer.cancel);
});

final pendingOutboxCountProvider = FutureProvider<int>((ref) async {
  final user = ref.watch(authControllerProvider).user;
  if (user == null) return 0;
  return ref.watch(attendanceOutboxServiceProvider).pendingCount(user);
});

class AttendanceOutboxSync extends Notifier<AsyncValue<SyncResult?>> {
  @override
  AsyncValue<SyncResult?> build() {
    ref.listen<AsyncValue<bool>>(isOnlineProvider, (prev, next) {
      final online = next.value ?? false;
      final wasOffline = !(prev?.value ?? true);
      if (online && wasOffline) {
        Future.microtask(syncNow);
      }
    });
    return const AsyncValue.data(null);
  }

  Future<void> syncNow() async {
    final user = ref.read(authControllerProvider).user;
    if (user == null) return;
    state = const AsyncValue.loading();
    try {
      final result =
          await ref.read(attendanceOutboxServiceProvider).syncPending(user);
      state = AsyncValue.data(result);
      ref.invalidate(pendingOutboxCountProvider);
    } catch (e, st) {
      state = AsyncValue.error(e, st);
    }
  }
}

final attendanceOutboxSyncProvider =
    NotifierProvider<AttendanceOutboxSync, AsyncValue<SyncResult?>>(
  AttendanceOutboxSync.new,
);

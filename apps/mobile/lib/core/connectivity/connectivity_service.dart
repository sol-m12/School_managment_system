import 'package:connectivity_plus/connectivity_plus.dart';

class ConnectivityService {
  ConnectivityService({Connectivity? connectivity})
      : _connectivity = connectivity ?? Connectivity();

  final Connectivity _connectivity;

  Stream<bool> get onOnlineChanged async* {
    yield await isOnline();
    await for (final results in _connectivity.onConnectivityChanged) {
      yield _hasLink(results);
    }
  }

  Future<bool> isOnline() async {
    final results = await _connectivity.checkConnectivity();
    return _hasLink(results);
  }

  bool _hasLink(List<ConnectivityResult> results) {
    return results.any(
      (r) =>
          r == ConnectivityResult.mobile ||
          r == ConnectivityResult.wifi ||
          r == ConnectivityResult.ethernet ||
          r == ConnectivityResult.vpn,
    );
  }
}

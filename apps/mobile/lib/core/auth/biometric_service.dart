import 'package:flutter/foundation.dart';
import 'package:flutter/services.dart';
import 'package:local_auth/local_auth.dart';

enum BiometricAvailability {
  available,
  unsupported,
  notEnrolled,
}

/// Thin wrapper around [LocalAuthentication] for login unlock.
class BiometricService {
  BiometricService([LocalAuthentication? auth])
      : _auth = auth ?? LocalAuthentication();

  final LocalAuthentication _auth;

  Future<BiometricAvailability> availability() async {
    if (kIsWeb) return BiometricAvailability.unsupported;
    try {
      final supported = await _auth.isDeviceSupported();
      if (!supported) return BiometricAvailability.unsupported;
      final canCheck = await _auth.canCheckBiometrics;
      final biometrics = await _auth.getAvailableBiometrics();
      if (!canCheck && biometrics.isEmpty) {
        return BiometricAvailability.notEnrolled;
      }
      return BiometricAvailability.available;
    } on PlatformException {
      return BiometricAvailability.unsupported;
    } catch (_) {
      return BiometricAvailability.unsupported;
    }
  }

  Future<bool> authenticate({required String reason}) async {
    try {
      return await _auth.authenticate(
        localizedReason: reason,
        // Allow device PIN/pattern as fallback when biometrics fail briefly.
        biometricOnly: false,
        persistAcrossBackgrounding: true,
      );
    } on PlatformException {
      return false;
    } catch (_) {
      return false;
    }
  }
}

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../../core/api/api_exception.dart';
import '../../core/auth/biometric_credentials_store.dart';
import '../../core/auth/biometric_service.dart';
import '../../core/locale/locale_controller.dart';
import '../../core/providers.dart';
import '../../core/theme/app_colors.dart';
import '../../l10n/app_localizations.dart';

const _rememberKey = 'login_remember';
const _rememberTenantKey = 'login_remember_tenant';
const _rememberUsernameKey = 'login_remember_username';

class LoginPage extends ConsumerStatefulWidget {
  const LoginPage({super.key});

  @override
  ConsumerState<LoginPage> createState() => _LoginPageState();
}

class _LoginPageState extends ConsumerState<LoginPage> {
  final _tenant = TextEditingController();
  final _username = TextEditingController();
  final _password = TextEditingController();
  final _formKey = GlobalKey<FormState>();
  bool _submitting = false;
  bool _obscurePassword = true;
  bool _rememberMe = false;
  bool _biometricReady = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    _restoreRemembered();
    _refreshBiometricReady();
  }

  Future<void> _restoreRemembered() async {
    final prefs = await SharedPreferences.getInstance();
    final remember = prefs.getBool(_rememberKey) ?? false;
    if (!mounted) return;
    setState(() {
      _rememberMe = remember;
      if (remember) {
        _tenant.text = prefs.getString(_rememberTenantKey) ?? '';
        _username.text = prefs.getString(_rememberUsernameKey) ?? '';
      }
    });
  }

  Future<void> _refreshBiometricReady() async {
    final store = ref.read(biometricCredentialsStoreProvider);
    final ready = await store.hasCredentials();
    if (!mounted) return;
    setState(() => _biometricReady = ready);
  }

  Future<void> _persistRemembered() async {
    final prefs = await SharedPreferences.getInstance();
    if (_rememberMe) {
      await prefs.setBool(_rememberKey, true);
      await prefs.setString(_rememberTenantKey, _tenant.text.trim());
      await prefs.setString(_rememberUsernameKey, _username.text.trim());
    } else {
      await prefs.setBool(_rememberKey, false);
      await prefs.remove(_rememberTenantKey);
      await prefs.remove(_rememberUsernameKey);
    }
  }

  @override
  void dispose() {
    _tenant.dispose();
    _username.dispose();
    _password.dispose();
    super.dispose();
  }

  String _mapLoginError(Object e, AppLocalizations l10n) {
    if (e is ApiException) {
      if (e.code == 'VALIDATION_ERROR') return l10n.errorValidation;
      if (e.code == 'NETWORK_ERROR') return l10n.errorNetwork;
      return l10n.errorUnauthorized;
    }
    return l10n.errorGeneric;
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() {
      _submitting = true;
      _error = null;
    });
    final l10n = AppLocalizations.of(context);
    final tenantSlug = _tenant.text;
    final username = _username.text;
    final password = _password.text;
    try {
      // Establish session first so we can offer biometrics before redirect.
      final user = await ref.read(authRepositoryProvider).login(
            tenantSlug: tenantSlug,
            username: username,
            password: password,
          );
      await _persistRemembered();
      await _offerBiometricEnrollment(
        BiometricCredentials(
          tenantSlug: tenantSlug,
          username: username,
          password: password,
        ),
      );
      if (!mounted) return;
      ref.read(authControllerProvider.notifier).acceptSession(user);
    } catch (e) {
      if (!mounted) return;
      setState(() => _error = _mapLoginError(e, l10n));
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  Future<void> _offerBiometricEnrollment(BiometricCredentials credentials) async {
    if (!mounted) return;
    final l10n = AppLocalizations.of(context);
    final biometric = ref.read(biometricServiceProvider);
    final store = ref.read(biometricCredentialsStoreProvider);
    final availability = await biometric.availability();
    if (availability != BiometricAvailability.available) return;

    if (await store.isEnabled()) {
      await store.save(credentials);
      if (mounted) setState(() => _biometricReady = true);
      return;
    }

    if (!mounted) return;
    final enable = await showDialog<bool>(
      context: context,
      barrierDismissible: false,
      builder: (ctx) => AlertDialog(
        title: Text(l10n.biometricsEnableTitle),
        content: Text(l10n.biometricsEnableBody),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(false),
            child: Text(l10n.biometricsEnableSkip),
          ),
          FilledButton(
            onPressed: () => Navigator.of(ctx).pop(true),
            child: Text(l10n.biometricsEnableConfirm),
          ),
        ],
      ),
    );
    if (enable != true || !mounted) return;

    final ok = await biometric.authenticate(reason: l10n.biometricsPrompt);
    if (!ok || !mounted) return;

    await store.save(credentials);
    if (!mounted) return;
    setState(() => _biometricReady = true);
    _showMessage(l10n.biometricsEnabled);
  }

  Future<void> _signInWithBiometrics() async {
    final l10n = AppLocalizations.of(context);
    final biometric = ref.read(biometricServiceProvider);
    final store = ref.read(biometricCredentialsStoreProvider);

    final availability = await biometric.availability();
    if (availability == BiometricAvailability.unsupported) {
      _showMessage(l10n.biometricsUnavailable);
      return;
    }
    if (availability == BiometricAvailability.notEnrolled) {
      _showMessage(l10n.biometricsNotEnrolled);
      return;
    }

    final credentials = await store.read();
    if (credentials == null) {
      _showMessage(l10n.biometricsNoCredentials);
      return;
    }

    final ok = await biometric.authenticate(reason: l10n.biometricsPrompt);
    if (!ok) {
      if (mounted) _showMessage(l10n.biometricsFailed);
      return;
    }

    setState(() {
      _submitting = true;
      _error = null;
    });
    try {
      await ref.read(authControllerProvider.notifier).login(
            tenantSlug: credentials.tenantSlug,
            username: credentials.username,
            password: credentials.password,
          );
    } catch (e) {
      if (e is ApiException &&
          (e.code == 'AUTH_UNAUTHORIZED' || e.statusCode == 401)) {
        await store.clear();
        if (mounted) setState(() => _biometricReady = false);
      }
      if (!mounted) return;
      setState(() => _error = _mapLoginError(e, l10n));
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  void _showMessage(String message) {
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(message)));
  }

  InputDecoration _fieldDecoration({
    required String hint,
    required IconData prefixIcon,
    Widget? suffix,
  }) {
    return InputDecoration(
      hintText: hint,
      hintStyle: const TextStyle(color: AppColors.inkMuted, fontSize: 14),
      filled: true,
      fillColor: AppColors.loginField,
      prefixIcon: Icon(prefixIcon, color: AppColors.inkMuted, size: 20),
      suffixIcon: suffix,
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: BorderSide.none,
      ),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: BorderSide.none,
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: const BorderSide(color: AppColors.brand600, width: 1.5),
      ),
      errorBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: const BorderSide(color: AppColors.danger),
      ),
      focusedErrorBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: const BorderSide(color: AppColors.danger, width: 1.5),
      ),
      contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 16),
    );
  }

  Widget _fieldLabel(String text) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Text(
        text,
        style: const TextStyle(
          color: AppColors.brand700,
          fontWeight: FontWeight.w700,
          fontSize: 13,
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final locale = ref.watch(localeControllerProvider);

    return Scaffold(
      backgroundColor: AppColors.loginCanvas,
      body: SafeArea(
        child: Stack(
          children: [
            Align(
              alignment: Alignment.topRight,
              child: Padding(
                padding: const EdgeInsets.only(top: 8, right: 12),
                child: TextButton(
                  onPressed: () {
                    final next = locale.languageCode == 'am'
                        ? const Locale('en')
                        : const Locale('am');
                    ref.read(localeControllerProvider.notifier).setLocale(next);
                  },
                  child: Text(
                    locale.languageCode == 'am'
                        ? l10n.languageEnglish
                        : l10n.languageAmharic,
                    style: const TextStyle(
                      color: AppColors.loginLink,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ),
              ),
            ),
            Center(
              child: ConstrainedBox(
                constraints: const BoxConstraints(maxWidth: 420),
                child: SingleChildScrollView(
                  padding: const EdgeInsets.fromLTRB(20, 36, 20, 24),
                  child: Column(
                    children: [
                      _LogoBadge(),
                      const SizedBox(height: 20),
                      Text(
                        l10n.loginWelcomeBack,
                        textAlign: TextAlign.center,
                        style: const TextStyle(
                          fontSize: 28,
                          fontWeight: FontWeight.w800,
                          color: AppColors.brand700,
                          height: 1.2,
                        ),
                      ),
                      const SizedBox(height: 8),
                      Text(
                        l10n.loginSubtitle,
                        textAlign: TextAlign.center,
                        style: const TextStyle(
                          color: AppColors.inkMuted,
                          fontSize: 14,
                        ),
                      ),
                      const SizedBox(height: 24),
                      Container(
                        width: double.infinity,
                        padding: const EdgeInsets.fromLTRB(20, 22, 20, 20),
                        decoration: BoxDecoration(
                          color: AppColors.surface,
                          borderRadius: BorderRadius.circular(20),
                          boxShadow: [
                            BoxShadow(
                              color: AppColors.brand900.withValues(alpha: 0.06),
                              blurRadius: 24,
                              offset: const Offset(0, 8),
                            ),
                          ],
                        ),
                        child: Form(
                          key: _formKey,
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.stretch,
                            children: [
                              _fieldLabel(l10n.tenantSlug),
                              TextFormField(
                                controller: _tenant,
                                decoration: _fieldDecoration(
                                  hint: l10n.tenantSlugHint,
                                  prefixIcon: Icons.school_outlined,
                                ),
                                textInputAction: TextInputAction.next,
                                validator: (v) => (v == null || v.trim().isEmpty)
                                    ? l10n.errorValidation
                                    : null,
                              ),
                              const SizedBox(height: 16),
                              _fieldLabel(l10n.username),
                              TextFormField(
                                controller: _username,
                                decoration: _fieldDecoration(
                                  hint: l10n.usernameHint,
                                  prefixIcon: Icons.alternate_email,
                                ),
                                textInputAction: TextInputAction.next,
                                autocorrect: false,
                                validator: (v) => (v == null || v.trim().isEmpty)
                                    ? l10n.errorValidation
                                    : null,
                              ),
                              const SizedBox(height: 16),
                              _fieldLabel(l10n.password),
                              TextFormField(
                                controller: _password,
                                decoration: _fieldDecoration(
                                  hint: '••••••••',
                                  prefixIcon: Icons.lock_outline,
                                  suffix: IconButton(
                                    onPressed: () => setState(
                                      () => _obscurePassword = !_obscurePassword,
                                    ),
                                    icon: Icon(
                                      _obscurePassword
                                          ? Icons.visibility_off_outlined
                                          : Icons.visibility_outlined,
                                      color: AppColors.inkMuted,
                                      size: 20,
                                    ),
                                  ),
                                ),
                                obscureText: _obscurePassword,
                                onFieldSubmitted: (_) => _submit(),
                                validator: (v) =>
                                    (v == null || v.isEmpty) ? l10n.errorValidation : null,
                              ),
                              const SizedBox(height: 12),
                              Row(
                                children: [
                                  SizedBox(
                                    height: 24,
                                    width: 24,
                                    child: Checkbox(
                                      value: _rememberMe,
                                      onChanged: (v) =>
                                          setState(() => _rememberMe = v ?? false),
                                      activeColor: AppColors.brand700,
                                      side: const BorderSide(
                                        color: AppColors.brand100,
                                        width: 1.5,
                                      ),
                                      shape: RoundedRectangleBorder(
                                        borderRadius: BorderRadius.circular(4),
                                      ),
                                    ),
                                  ),
                                  const SizedBox(width: 8),
                                  Expanded(
                                    child: GestureDetector(
                                      onTap: () =>
                                          setState(() => _rememberMe = !_rememberMe),
                                      child: Text(
                                        l10n.rememberMe,
                                        style: const TextStyle(
                                          color: AppColors.inkMuted,
                                          fontSize: 13,
                                        ),
                                      ),
                                    ),
                                  ),
                                  TextButton(
                                    onPressed: () =>
                                        _showMessage(l10n.forgotPasswordMessage),
                                    style: TextButton.styleFrom(
                                      foregroundColor: AppColors.loginLink,
                                      padding: EdgeInsets.zero,
                                      minimumSize: Size.zero,
                                      tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                                    ),
                                    child: Text(
                                      l10n.forgotPassword,
                                      style: const TextStyle(
                                        fontWeight: FontWeight.w600,
                                        fontSize: 13,
                                      ),
                                    ),
                                  ),
                                ],
                              ),
                              if (_error != null) ...[
                                const SizedBox(height: 12),
                                Text(
                                  _error!,
                                  style: const TextStyle(color: AppColors.danger),
                                ),
                              ],
                              const SizedBox(height: 18),
                              SizedBox(
                                height: 52,
                                child: FilledButton(
                                  onPressed: _submitting ? null : _submit,
                                  style: FilledButton.styleFrom(
                                    backgroundColor: AppColors.brand700,
                                    foregroundColor: Colors.white,
                                    disabledBackgroundColor:
                                        AppColors.brand700.withValues(alpha: 0.6),
                                    shape: RoundedRectangleBorder(
                                      borderRadius: BorderRadius.circular(12),
                                    ),
                                  ),
                                  child: _submitting
                                      ? const SizedBox(
                                          width: 22,
                                          height: 22,
                                          child: CircularProgressIndicator(
                                            strokeWidth: 2.5,
                                            color: Colors.white,
                                          ),
                                        )
                                      : Row(
                                          mainAxisAlignment: MainAxisAlignment.center,
                                          children: [
                                            Text(
                                              l10n.login,
                                              style: const TextStyle(
                                                fontSize: 16,
                                                fontWeight: FontWeight.w700,
                                              ),
                                            ),
                                            const SizedBox(width: 8),
                                            const Icon(Icons.arrow_forward, size: 18),
                                          ],
                                        ),
                                ),
                              ),
                              const SizedBox(height: 18),
                              Row(
                                children: [
                                  const Expanded(child: Divider(color: AppColors.border)),
                                  Padding(
                                    padding: const EdgeInsets.symmetric(horizontal: 12),
                                    child: Text(
                                      l10n.loginOr,
                                      style: const TextStyle(
                                        color: AppColors.inkMuted,
                                        fontSize: 12,
                                        fontWeight: FontWeight.w600,
                                      ),
                                    ),
                                  ),
                                  const Expanded(child: Divider(color: AppColors.border)),
                                ],
                              ),
                              const SizedBox(height: 18),
                              SizedBox(
                                height: 52,
                                child: OutlinedButton.icon(
                                  onPressed:
                                      _submitting ? null : _signInWithBiometrics,
                                  icon: Icon(
                                    Icons.fingerprint,
                                    size: 22,
                                    color: _biometricReady
                                        ? AppColors.brand700
                                        : AppColors.inkMuted,
                                  ),
                                  label: Text(
                                    l10n.signInBiometrics,
                                    style: TextStyle(
                                      fontWeight: FontWeight.w700,
                                      fontSize: 14,
                                      color: _biometricReady
                                          ? AppColors.brand700
                                          : AppColors.inkMuted,
                                    ),
                                  ),
                                  style: OutlinedButton.styleFrom(
                                    foregroundColor: AppColors.brand700,
                                    backgroundColor: AppColors.loginField,
                                    side: BorderSide.none,
                                    shape: RoundedRectangleBorder(
                                      borderRadius: BorderRadius.circular(12),
                                    ),
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                      const SizedBox(height: 22),
                      Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          const Icon(
                            Icons.verified_user,
                            size: 14,
                            color: AppColors.success,
                          ),
                          const SizedBox(width: 6),
                          Flexible(
                            child: Text(
                              l10n.sslEncrypted,
                              textAlign: TextAlign.center,
                              style: const TextStyle(
                                color: AppColors.inkMuted,
                                fontSize: 12,
                              ),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 12),
                      Wrap(
                        alignment: WrapAlignment.center,
                        crossAxisAlignment: WrapCrossAlignment.center,
                        children: [
                          Text(
                            '${l10n.needAssistance} ',
                            style: const TextStyle(
                              color: AppColors.inkMuted,
                              fontSize: 13,
                            ),
                          ),
                          GestureDetector(
                            onTap: () => _showMessage(l10n.contactSupportMessage),
                            child: Text(
                              l10n.contactSupport,
                              style: const TextStyle(
                                color: AppColors.loginLink,
                                fontWeight: FontWeight.w700,
                                fontSize: 13,
                              ),
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _LogoBadge extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Stack(
      clipBehavior: Clip.none,
      children: [
        Container(
          width: 64,
          height: 64,
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(16),
            boxShadow: [
              BoxShadow(
                color: AppColors.brand900.withValues(alpha: 0.08),
                blurRadius: 16,
                offset: const Offset(0, 4),
              ),
            ],
          ),
          alignment: Alignment.center,
          child: Container(
            width: 36,
            height: 36,
            decoration: BoxDecoration(
              color: AppColors.brand700,
              borderRadius: BorderRadius.circular(10),
            ),
          ),
        ),
        Positioned(
          top: -2,
          right: -2,
          child: Container(
            width: 14,
            height: 14,
            decoration: BoxDecoration(
              color: AppColors.success,
              shape: BoxShape.circle,
              border: Border.all(color: Colors.white, width: 2),
            ),
          ),
        ),
      ],
    );
  }
}

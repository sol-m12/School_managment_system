import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:mobile_scanner/mobile_scanner.dart';

import '../../../core/id/keyt_id_code.dart';
import '../../../core/providers.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/widgets/keyt_app_bar.dart';
import '../../../l10n/app_localizations.dart';

class ScanDigitalIdScreen extends ConsumerStatefulWidget {
  const ScanDigitalIdScreen({super.key});

  @override
  ConsumerState<ScanDigitalIdScreen> createState() => _ScanDigitalIdScreenState();
}

class _ScanDigitalIdScreenState extends ConsumerState<ScanDigitalIdScreen> {
  final _controller = MobileScannerController();
  String? _message;
  KeytIdCode? _parsed;
  bool _handling = false;

  bool get _cameraSupported =>
      !kIsWeb &&
      (defaultTargetPlatform == TargetPlatform.android ||
          defaultTargetPlatform == TargetPlatform.iOS);

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  void _onDetect(BarcodeCapture capture) {
    if (_handling) return;
    String? raw;
    for (final barcode in capture.barcodes) {
      final value = barcode.rawValue;
      if (value != null && value.isNotEmpty) {
        raw = value;
        break;
      }
    }
    if (raw == null) return;

    final l10n = AppLocalizations.of(context);
    final user = ref.read(authControllerProvider).user;
    final parsed = KeytIdCode.tryParse(raw);
    if (parsed == null) {
      setState(() {
        _message = l10n.scanInvalid;
        _parsed = null;
      });
      return;
    }
    if (user == null || parsed.tenantId != user.tenantId) {
      setState(() {
        _message = l10n.scanWrongTenant;
        _parsed = null;
      });
      return;
    }

    setState(() {
      _handling = true;
      _parsed = parsed;
      _message = parsed.encoded;
    });
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    return Scaffold(
      appBar: KeytAppBar(title: l10n.scanDigitalId),
      body: !_cameraSupported
          ? Center(
              child: Padding(
                padding: const EdgeInsets.all(24),
                child: Text(l10n.scanUnsupported, textAlign: TextAlign.center),
              ),
            )
          : Column(
              children: [
                Expanded(
                  child: MobileScanner(
                    controller: _controller,
                    onDetect: _onDetect,
                  ),
                ),
                Padding(
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    children: [
                      Text(l10n.scanHint, textAlign: TextAlign.center),
                      if (_message != null) ...[
                        const SizedBox(height: 12),
                        Text(
                          _message!,
                          style: TextStyle(
                            color: _parsed == null
                                ? AppColors.danger
                                : AppColors.success,
                          ),
                        ),
                      ],
                      if (_parsed != null) ...[
                        const SizedBox(height: 12),
                        FilledButton(
                          onPressed: () {
                            context.push(
                              '/teacher/classes/student-360/${_parsed!.studentId}',
                            );
                          },
                          child: Text(l10n.scanOpenProfile),
                        ),
                        TextButton(
                          onPressed: () {
                            setState(() {
                              _handling = false;
                              _parsed = null;
                              _message = null;
                            });
                          },
                          child: Text(l10n.retry),
                        ),
                      ],
                    ],
                  ),
                ),
              ],
            ),
    );
  }
}

import 'dart:typed_data';

import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../providers.dart';
import '../theme/app_colors.dart';

/// Loads the signed-in user's photo from `/academics/profile/photo`.
/// Falls back to initials when no photo exists.
class AuthProfilePhoto extends ConsumerStatefulWidget {
  const AuthProfilePhoto({
    super.key,
    this.size = 48,
    this.fullName,
    this.hasPhoto = true,
    this.borderColor,
  });

  final double size;
  final String? fullName;
  final bool hasPhoto;
  final Color? borderColor;

  @override
  ConsumerState<AuthProfilePhoto> createState() => _AuthProfilePhotoState();
}

class _AuthProfilePhotoState extends ConsumerState<AuthProfilePhoto> {
  Uint8List? _bytes;
  bool _failed = false;
  bool _loading = false;

  @override
  void initState() {
    super.initState();
    if (widget.hasPhoto) {
      Future.microtask(_load);
    }
  }

  @override
  void didUpdateWidget(covariant AuthProfilePhoto oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (widget.hasPhoto &&
        (oldWidget.hasPhoto != widget.hasPhoto || _bytes == null && !_failed)) {
      Future.microtask(_load);
    }
  }

  Future<void> _load() async {
    if (_loading || !widget.hasPhoto) return;
    setState(() => _loading = true);
    try {
      final api = ref.read(apiClientProvider);
      final response = await api.raw.get<List<int>>(
        '/academics/profile/photo',
        options: Options(responseType: ResponseType.bytes),
      );
      final data = response.data;
      if (!mounted) return;
      if (data == null || data.isEmpty) {
        setState(() {
          _failed = true;
          _loading = false;
        });
        return;
      }
      setState(() {
        _bytes = Uint8List.fromList(data);
        _failed = false;
        _loading = false;
      });
    } catch (_) {
      if (!mounted) return;
      setState(() {
        _failed = true;
        _loading = false;
      });
    }
  }

  String get _initials {
    final name = (widget.fullName ?? '').trim();
    if (name.isEmpty) return '?';
    final parts = name.split(RegExp(r'\s+')).where((p) => p.isNotEmpty).toList();
    if (parts.length == 1) {
      return parts.first.characters.take(2).toString().toUpperCase();
    }
    final a = parts.first.characters.first;
    final b = parts[1].characters.first;
    return ('$a$b').toUpperCase();
  }

  @override
  Widget build(BuildContext context) {
    final border = widget.borderColor;
    final image = _bytes != null && !_failed
        ? MemoryImage(_bytes!)
        : null;

    return Container(
      width: widget.size,
      height: widget.size,
      decoration: BoxDecoration(
        shape: BoxShape.circle,
        border: border == null ? null : Border.all(color: border, width: 2),
        color: AppColors.brand100,
        image: image == null
            ? null
            : DecorationImage(image: image, fit: BoxFit.cover),
      ),
      alignment: Alignment.center,
      child: image == null
          ? Text(
              _initials,
              style: TextStyle(
                color: AppColors.brand700,
                fontWeight: FontWeight.w700,
                fontSize: widget.size * 0.32,
              ),
            )
          : null,
    );
  }
}

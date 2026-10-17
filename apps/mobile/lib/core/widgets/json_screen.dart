import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../l10n/app_localizations.dart';
import '../api/api_exception.dart';
import '../providers.dart';
import '../theme/app_colors.dart';
import 'last_updated_label.dart';
import 'offline_banner.dart';

/// Generic cache-first JSON screen for student GET endpoints.
class JsonScreen extends ConsumerStatefulWidget {
  const JsonScreen({
    super.key,
    required this.title,
    required this.cacheKey,
    required this.path,
    required this.builder,
  });

  final String title;
  final String cacheKey;
  final String path;
  final Widget Function(BuildContext context, Object? data) builder;

  @override
  ConsumerState<JsonScreen> createState() => _JsonScreenState();
}

class _JsonScreenState extends ConsumerState<JsonScreen> {
  Object? _data;
  DateTime? _updatedAt;
  bool _loading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    Future.microtask(() => _load(force: false));
  }

  Future<void> _load({required bool force}) async {
    final auth = ref.read(authControllerProvider);
    final user = auth.user;
    if (user == null) return;

    setState(() {
      _loading = _data == null;
      _error = null;
    });

    try {
      final cache = ref.read(cacheRepositoryProvider);
      final result = await cache.cacheFirstJson<Object?>(
        user: user,
        key: widget.cacheKey,
        path: widget.path,
        parse: (json) => json,
        forceRefresh: force,
      );
      if (!mounted) return;
      setState(() {
        _data = result.data;
        _updatedAt = result.updatedAt;
        _loading = false;
      });

      // Background refresh when we served cache.
      if (result.fromCache && !force) {
        try {
          final fresh = await cache.refreshJson<Object?>(
            user: user,
            key: widget.cacheKey,
            path: widget.path,
            parse: (json) => json,
          );
          if (!mounted) return;
          setState(() {
            _data = fresh.data;
            _updatedAt = fresh.updatedAt;
          });
        } catch (_) {
          // Keep cache; network errors must not sign out.
        }
      }
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _loading = false;
        _error = e is ApiException ? e.code : 'INTERNAL_ERROR';
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        const OfflineBanner(),
        LastUpdatedLabel(updatedAt: _updatedAt),
        Expanded(
          child: RefreshIndicator(
            onRefresh: () => _load(force: true),
            child: _buildBody(l10n),
          ),
        ),
      ],
    );
  }

  Widget _buildBody(AppLocalizations l10n) {
    if (_loading) {
      return ListView(
        physics: const AlwaysScrollableScrollPhysics(),
        children: [
          SizedBox(
            height: 200,
            child: Center(child: Text(l10n.loading)),
          ),
        ],
      );
    }
    if (_error != null && _data == null) {
      return ListView(
        physics: const AlwaysScrollableScrollPhysics(),
        children: [
          Padding(
            padding: const EdgeInsets.all(24),
            child: Column(
              children: [
                Text(_errorMessage(l10n, _error!), textAlign: TextAlign.center),
                const SizedBox(height: 12),
                FilledButton(
                  onPressed: () => _load(force: true),
                  child: Text(l10n.retry),
                ),
              ],
            ),
          ),
        ],
      );
    }
    return ListView(
      physics: const AlwaysScrollableScrollPhysics(),
      padding: const EdgeInsets.fromLTRB(16, 0, 16, 24),
      children: [
        widget.builder(context, _data),
      ],
    );
  }

  String _errorMessage(AppLocalizations l10n, String code) {
    return switch (code) {
      'NETWORK_ERROR' => l10n.errorNetwork,
      'AUTH_UNAUTHORIZED' => l10n.errorUnauthorized,
      'VALIDATION_ERROR' => l10n.errorValidation,
      _ => l10n.errorGeneric,
    };
  }
}

class HubListScreen extends StatelessWidget {
  const HubListScreen({
    super.key,
    required this.title,
    required this.items,
  });

  final String title;
  final List<HubItem> items;

  @override
  Widget build(BuildContext context) {
    return ListView.separated(
      padding: const EdgeInsets.symmetric(vertical: 8),
      itemCount: items.length,
      separatorBuilder: (_, _) => const Divider(height: 1),
      itemBuilder: (context, index) {
        final item = items[index];
        return ListTile(
          minVerticalPadding: 16,
          leading: Icon(item.icon, color: AppColors.brand700),
          title: Text(item.label),
          trailing: const Icon(Icons.chevron_right),
          onTap: item.onTap,
        );
      },
    );
  }
}

class HubItem {
  const HubItem({
    required this.label,
    required this.icon,
    required this.onTap,
  });

  final String label;
  final IconData icon;
  final VoidCallback onTap;
}

/// Pretty-print common student JSON for mobile without inventing fields.
class JsonBody extends StatelessWidget {
  const JsonBody({super.key, required this.data});

  final Object? data;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    if (data == null) {
      return Text(l10n.emptyState);
    }
    if (data is Map) {
      final map = Map<String, dynamic>.from(data as Map);
      if (map.isEmpty) return Text(l10n.emptyState);
      return Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: map.entries.map((e) {
          return Card(
            margin: const EdgeInsets.only(bottom: 8),
            child: ListTile(
              title: Text(e.key),
              subtitle: Text(_formatValue(e.value)),
            ),
          );
        }).toList(),
      );
    }
    if (data is List) {
      final list = data as List;
      if (list.isEmpty) return Text(l10n.emptyState);
      return Column(
        children: list.asMap().entries.map((e) {
          return Card(
            margin: const EdgeInsets.only(bottom: 8),
            child: ListTile(
              title: Text('#${e.key + 1}'),
              subtitle: Text(_formatValue(e.value)),
            ),
          );
        }).toList(),
      );
    }
    return Text(data.toString());
  }

  String _formatValue(Object? value) {
    if (value == null) return '—';
    if (value is Map || value is List) {
      return value.toString();
    }
    return value.toString();
  }
}

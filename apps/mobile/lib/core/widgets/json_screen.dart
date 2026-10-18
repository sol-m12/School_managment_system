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

/// Safe structured renderer — never dumps raw Map/List (e.g. `[]`) into the UI.
class JsonBody extends StatelessWidget {
  const JsonBody({super.key, required this.data});

  final Object? data;

  static const _titleKeys = [
    'title',
    'name',
    'fullName',
    'subject',
    'subjectName',
    'label',
    'classLabel',
    'filename',
    'fileName',
    'note',
    'summary',
    'kind',
    'status',
  ];

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    if (data == null) {
      return Text(l10n.emptyState);
    }
    if (data is Map) {
      return _buildMap(context, l10n, Map<String, dynamic>.from(data as Map));
    }
    if (data is List) {
      return _buildList(context, l10n, data as List, heading: null);
    }
    final text = data.toString().trim();
    if (text.isEmpty || text == '[]' || text == '{}') {
      return Text(l10n.emptyState);
    }
    return Text(text);
  }

  Widget _buildMap(
    BuildContext context,
    AppLocalizations l10n,
    Map<String, dynamic> map,
  ) {
    if (map.isEmpty) return Text(l10n.emptyState);

    // Prefer a primary list key when the payload is a board (rows/items/…).
    for (final key in const [
      'rows',
      'items',
      'results',
      'students',
      'books',
      'requests',
      'tickets',
      'notifications',
      'assignments',
      'classSchedule',
      'examSchedule',
      'mine',
      'school',
      'todayPeriods',
      'locked',
      'draft',
    ]) {
      final nested = map[key];
      if (nested is List) {
        final scalars = _scalarEntries(map, skip: {key});
        return Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            if (scalars.isNotEmpty) ...[
              ...scalars.map(_scalarTile),
              const SizedBox(height: 8),
            ],
            _buildList(context, l10n, nested, heading: _humanKey(key)),
          ],
        );
      }
    }

    final children = <Widget>[];
    for (final entry in map.entries) {
      final value = entry.value;
      if (value == null) continue;
      if (value is List) {
        children.add(
          Padding(
            padding: const EdgeInsets.only(bottom: 12),
            child: _buildList(
              context,
              l10n,
              value,
              heading: _humanKey(entry.key),
            ),
          ),
        );
        continue;
      }
      if (value is Map) {
        final nested = Map<String, dynamic>.from(value);
        final nestedScalars = _scalarEntries(nested);
        if (nestedScalars.isEmpty) continue;
        children.add(
          Card(
            margin: const EdgeInsets.only(bottom: 8),
            child: Padding(
              padding: const EdgeInsets.fromLTRB(16, 12, 16, 12),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    _humanKey(entry.key),
                    style: const TextStyle(
                      fontWeight: FontWeight.w800,
                      color: AppColors.inkStrong,
                    ),
                  ),
                  const SizedBox(height: 8),
                  ...nestedScalars.map(
                    (e) => Padding(
                      padding: const EdgeInsets.only(bottom: 4),
                      child: Row(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          SizedBox(
                            width: 110,
                            child: Text(
                              _humanKey(e.key),
                              style: const TextStyle(
                                color: AppColors.inkMuted,
                                fontSize: 12,
                              ),
                            ),
                          ),
                          Expanded(
                            child: Text(
                              _scalarText(e.value),
                              style: const TextStyle(
                                fontWeight: FontWeight.w600,
                                color: AppColors.inkStrong,
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
        );
        continue;
      }
      children.add(_scalarTile(MapEntry(entry.key, value)));
    }

    if (children.isEmpty) return Text(l10n.emptyState);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: children,
    );
  }

  Widget _buildList(
    BuildContext context,
    AppLocalizations l10n,
    List<dynamic> list, {
    required String? heading,
  }) {
    if (list.isEmpty) {
      return Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          if (heading != null) ...[
            Text(
              heading,
              style: const TextStyle(
                fontWeight: FontWeight.w800,
                fontSize: 14,
                color: AppColors.inkStrong,
              ),
            ),
            const SizedBox(height: 8),
          ],
          Text(
            l10n.emptyState,
            style: const TextStyle(color: AppColors.inkMuted),
          ),
        ],
      );
    }

    final maps = list
        .whereType<Map>()
        .map((e) => Map<String, dynamic>.from(e))
        .toList();
    if (maps.isEmpty) {
      final texts = list
          .map(_scalarText)
          .where((s) => s.isNotEmpty && s != '—')
          .toList();
      if (texts.isEmpty) {
        return Text(l10n.emptyState);
      }
      return Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          if (heading != null) ...[
            Text(
              heading,
              style: const TextStyle(
                fontWeight: FontWeight.w800,
                fontSize: 14,
                color: AppColors.inkStrong,
              ),
            ),
            const SizedBox(height: 8),
          ],
          ...texts.map(
            (t) => Card(
              margin: const EdgeInsets.only(bottom: 8),
              child: ListTile(title: Text(t)),
            ),
          ),
        ],
      );
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        if (heading != null) ...[
          Text(
            heading,
            style: const TextStyle(
              fontWeight: FontWeight.w800,
              fontSize: 14,
              color: AppColors.inkStrong,
            ),
          ),
          const SizedBox(height: 8),
        ],
        ...maps.map((row) {
          final title = _rowTitle(row);
          final subtitle = _rowSubtitle(row, title);
          return Card(
            margin: const EdgeInsets.only(bottom: 8),
            child: ListTile(
              title: Text(
                title,
                style: const TextStyle(fontWeight: FontWeight.w700),
              ),
              subtitle: subtitle == null ? null : Text(subtitle),
            ),
          );
        }),
      ],
    );
  }

  List<MapEntry<String, Object?>> _scalarEntries(
    Map<String, dynamic> map, {
    Set<String> skip = const {},
  }) {
    final out = <MapEntry<String, Object?>>[];
    for (final e in map.entries) {
      if (skip.contains(e.key)) continue;
      if (e.value is Map || e.value is List) continue;
      if (e.value == null) continue;
      final text = _scalarText(e.value);
      if (text.isEmpty || text == '—') continue;
      out.add(MapEntry(e.key, e.value));
    }
    return out;
  }

  Widget _scalarTile(MapEntry<String, Object?> e) {
    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      child: ListTile(
        title: Text(_humanKey(e.key)),
        subtitle: Text(_scalarText(e.value)),
      ),
    );
  }

  String _rowTitle(Map<String, dynamic> row) {
    for (final key in _titleKeys) {
      final v = _scalarText(row[key]);
      if (v.isNotEmpty && v != '—') return v;
    }
    for (final e in row.entries) {
      if (e.value is Map || e.value is List) continue;
      final v = _scalarText(e.value);
      if (v.isNotEmpty && v != '—') return v;
    }
    return '—';
  }

  String? _rowSubtitle(Map<String, dynamic> row, String title) {
    final parts = <String>[];
    for (final e in row.entries) {
      if (e.value is Map || e.value is List) continue;
      final v = _scalarText(e.value);
      if (v.isEmpty || v == '—' || v == title) continue;
      if (_titleKeys.contains(e.key) && v == title) continue;
      parts.add(v);
      if (parts.length >= 3) break;
    }
    if (parts.isEmpty) return null;
    return parts.join(' · ');
  }

  String _scalarText(Object? value) {
    if (value == null) return '—';
    if (value is bool) return value ? 'Yes' : 'No';
    if (value is num) return value.toString();
    final text = value.toString().trim();
    if (text.isEmpty || text == '[]' || text == '{}') return '—';
    // Never surface nested structure dumps.
    if (text.startsWith('[') || text.startsWith('{')) return '—';
    return text;
  }

  String _humanKey(String key) {
    final spaced = key
        .replaceAllMapped(RegExp(r'([a-z])([A-Z])'), (m) => '${m[1]} ${m[2]}')
        .replaceAll('_', ' ')
        .trim();
    if (spaced.isEmpty) return key;
    return spaced[0].toUpperCase() + spaced.substring(1);
  }
}

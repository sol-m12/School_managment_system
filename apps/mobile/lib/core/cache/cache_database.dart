import 'package:path/path.dart' as p;
import 'package:sqflite/sqflite.dart';

/// SQLite cache isolated by tenantId + userId.
class CacheDatabase {
  CacheDatabase({Database? db}) : _db = db;

  Database? _db;
  Future<Database>? _opening;

  Future<Database> get database async {
    if (_db != null) return _db!;
    _opening ??= _open();
    _db = await _opening!;
    return _db!;
  }

  Future<Database> _open() async {
    final dir = await getDatabasesPath();
    final path = p.join(dir, 'keyt_mobile_cache.db');
    final db = await openDatabase(
      path,
      version: 1,
      onCreate: (db, version) async {
        await _createSchema(db);
      },
    );
    await _createSchema(db);
    return db;
  }

  Future<void> _createSchema(Database db) async {
    await db.execute('''
CREATE TABLE IF NOT EXISTS cache_entries (
  tenant_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  cache_key TEXT NOT NULL,
  payload TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (tenant_id, user_id, cache_key)
)
''');
  }

  Future<Database> ensureReady() async {
    final db = await database;
    await _createSchema(db);
    return db;
  }

  Future<void> put({
    required int tenantId,
    required int userId,
    required String key,
    required String payload,
    DateTime? updatedAt,
  }) async {
    final db = await ensureReady();
    await db.insert(
      'cache_entries',
      {
        'tenant_id': tenantId,
        'user_id': userId,
        'cache_key': key,
        'payload': payload,
        'updated_at': (updatedAt ?? DateTime.now().toUtc()).toIso8601String(),
      },
      conflictAlgorithm: ConflictAlgorithm.replace,
    );
  }

  Future<CachedEntry?> get({
    required int tenantId,
    required int userId,
    required String key,
  }) async {
    final db = await ensureReady();
    final rows = await db.query(
      'cache_entries',
      where: 'tenant_id = ? AND user_id = ? AND cache_key = ?',
      whereArgs: [tenantId, userId, key],
      limit: 1,
    );
    if (rows.isEmpty) return null;
    final row = rows.first;
    return CachedEntry(
      tenantId: row['tenant_id'] as int,
      userId: row['user_id'] as int,
      key: row['cache_key'] as String,
      payload: row['payload'] as String,
      updatedAt: DateTime.parse(row['updated_at'] as String),
    );
  }

  Future<void> clearUser({required int tenantId, required int userId}) async {
    final db = await ensureReady();
    await db.delete(
      'cache_entries',
      where: 'tenant_id = ? AND user_id = ?',
      whereArgs: [tenantId, userId],
    );
  }

  /// Test helper: wipe all rows.
  Future<void> clearAll() async {
    final db = await ensureReady();
    await db.delete('cache_entries');
  }
}

class CachedEntry {
  const CachedEntry({
    required this.tenantId,
    required this.userId,
    required this.key,
    required this.payload,
    required this.updatedAt,
  });

  final int tenantId;
  final int userId;
  final String key;
  final String payload;
  final DateTime updatedAt;
}

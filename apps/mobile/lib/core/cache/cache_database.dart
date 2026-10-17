import 'package:path/path.dart' as p;
import 'package:sqflite/sqflite.dart';

/// SQLite cache + attendance outbox isolated by tenantId + userId.
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
      version: 2,
      onCreate: (db, version) async {
        await _createSchema(db);
      },
      onUpgrade: (db, oldVersion, newVersion) async {
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
    await db.execute('''
CREATE TABLE IF NOT EXISTS attendance_outbox (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tenant_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  idempotency_key TEXT NOT NULL,
  created_at TEXT NOT NULL,
  payload TEXT NOT NULL,
  retry_count INTEGER NOT NULL DEFAULT 0,
  last_error TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  UNIQUE (tenant_id, user_id, idempotency_key)
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
    await db.delete(
      'attendance_outbox',
      where: 'tenant_id = ? AND user_id = ?',
      whereArgs: [tenantId, userId],
    );
  }

  Future<void> clearAll() async {
    final db = await ensureReady();
    await db.delete('cache_entries');
    await db.delete('attendance_outbox');
  }

  Future<int> enqueueOutbox({
    required int tenantId,
    required int userId,
    required String idempotencyKey,
    required String payload,
    DateTime? createdAt,
  }) async {
    final db = await ensureReady();
    return db.insert(
      'attendance_outbox',
      {
        'tenant_id': tenantId,
        'user_id': userId,
        'idempotency_key': idempotencyKey,
        'created_at': (createdAt ?? DateTime.now().toUtc()).toIso8601String(),
        'payload': payload,
        'retry_count': 0,
        'status': 'pending',
      },
      conflictAlgorithm: ConflictAlgorithm.ignore,
    );
  }

  Future<List<OutboxRow>> pendingOutbox({
    required int tenantId,
    required int userId,
  }) async {
    final db = await ensureReady();
    final rows = await db.query(
      'attendance_outbox',
      where: "tenant_id = ? AND user_id = ? AND status = 'pending'",
      whereArgs: [tenantId, userId],
      orderBy: 'created_at ASC, id ASC',
    );
    return rows.map(OutboxRow.fromMap).toList();
  }

  Future<int> pendingCount({
    required int tenantId,
    required int userId,
  }) async {
    final db = await ensureReady();
    final result = await db.rawQuery(
      "SELECT COUNT(*) AS c FROM attendance_outbox WHERE tenant_id = ? AND user_id = ? AND status = 'pending'",
      [tenantId, userId],
    );
    return (result.first['c'] as num?)?.toInt() ?? 0;
  }

  Future<void> markOutboxSynced(int id) async {
    final db = await ensureReady();
    await db.update(
      'attendance_outbox',
      {'status': 'synced', 'last_error': null},
      where: 'id = ?',
      whereArgs: [id],
    );
  }

  Future<void> markOutboxConflict(int id, String error) async {
    final db = await ensureReady();
    await db.update(
      'attendance_outbox',
      {'status': 'conflict', 'last_error': error},
      where: 'id = ?',
      whereArgs: [id],
    );
  }

  Future<void> markOutboxRetry(int id, String error, int retryCount) async {
    final db = await ensureReady();
    await db.update(
      'attendance_outbox',
      {
        'status': 'pending',
        'last_error': error,
        'retry_count': retryCount,
      },
      where: 'id = ?',
      whereArgs: [id],
    );
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

class OutboxRow {
  const OutboxRow({
    required this.id,
    required this.tenantId,
    required this.userId,
    required this.idempotencyKey,
    required this.createdAt,
    required this.payload,
    required this.retryCount,
    required this.status,
    this.lastError,
  });

  final int id;
  final int tenantId;
  final int userId;
  final String idempotencyKey;
  final DateTime createdAt;
  final String payload;
  final int retryCount;
  final String status;
  final String? lastError;

  factory OutboxRow.fromMap(Map<String, Object?> row) {
    return OutboxRow(
      id: row['id'] as int,
      tenantId: row['tenant_id'] as int,
      userId: row['user_id'] as int,
      idempotencyKey: row['idempotency_key'] as String,
      createdAt: DateTime.parse(row['created_at'] as String),
      payload: row['payload'] as String,
      retryCount: row['retry_count'] as int,
      status: row['status'] as String,
      lastError: row['last_error'] as String?,
    );
  }
}

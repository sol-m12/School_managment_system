class AuthUser {
  const AuthUser({
    required this.id,
    required this.username,
    required this.role,
    required this.tenantId,
    required this.tenantName,
    required this.permissions,
  });

  final int id;
  final String username;
  final String role;
  final int tenantId;
  final String tenantName;
  final List<String> permissions;

  bool get isStudent => role == 'Student';
  bool get isTeacher => role == 'Teacher';
  bool get isParent => role == 'Parent';

  factory AuthUser.fromJson(Map<String, dynamic> json) {
    final permissions = json['permissions'];
    return AuthUser(
      id: (json['id'] as num).toInt(),
      username: json['username'] as String,
      role: json['role'] as String,
      tenantId: (json['tenantId'] as num).toInt(),
      tenantName: json['tenantName'] as String? ?? '',
      permissions: permissions is List
          ? permissions.map((e) => e.toString()).toList()
          : const [],
    );
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        'username': username,
        'role': role,
        'tenantId': tenantId,
        'tenantName': tenantName,
        'permissions': permissions,
      };
}

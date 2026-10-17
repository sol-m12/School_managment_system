class ApiException implements Exception {
  ApiException(this.code, {this.statusCode});

  final String code;
  final int? statusCode;

  @override
  String toString() => 'ApiException($code, status=$statusCode)';
}

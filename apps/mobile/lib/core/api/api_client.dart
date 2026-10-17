import 'dart:async';

import 'package:dio/dio.dart';

import '../auth/token_store.dart';
import 'api_config.dart';
import 'api_exception.dart';
import 'cookie_parser.dart';

typedef OnSessionRevoked = FutureOr<void> Function();

/// Dio client: Bearer access token, X-Client: mobile, one refresh after 401.
class ApiClient {
  ApiClient({
    required TokenStore tokenStore,
    required String baseUrl,
    Dio? dio,
    OnSessionRevoked? onSessionRevoked,
  })  : _tokenStore = tokenStore,
        _onSessionRevoked = onSessionRevoked {
    _dio = dio ??
        Dio(
          BaseOptions(
            baseUrl: baseUrl,
            connectTimeout: const Duration(seconds: 20),
            receiveTimeout: const Duration(seconds: 30),
            headers: {
              'Content-Type': 'application/json',
              'X-Client': apiClientHeader,
            },
          ),
        );
    _dio.interceptors.add(
      InterceptorsWrapper(
        onRequest: (options, handler) async {
          final token = await _tokenStore.readAccessToken();
          if (token != null && token.isNotEmpty) {
            options.headers['Authorization'] = 'Bearer $token';
          }
          options.headers['X-Client'] = apiClientHeader;
          handler.next(options);
        },
        onError: (error, handler) async {
          final response = error.response;
          final path = error.requestOptions.path;
          final isAuthPath =
              path.contains('/auth/login') || path.contains('/auth/refresh');
          if (response?.statusCode == 401 &&
              !isAuthPath &&
              error.requestOptions.extra['retried'] != true) {
            try {
              await refreshAccessToken();
              final req = error.requestOptions;
              req.extra['retried'] = true;
              final token = await _tokenStore.readAccessToken();
              if (token != null) {
                req.headers['Authorization'] = 'Bearer $token';
              }
              final clone = await _dio.fetch(req);
              return handler.resolve(clone);
            } catch (_) {
              await _onSessionRevoked?.call();
              return handler.next(error);
            }
          }
          handler.next(error);
        },
      ),
    );
  }

  late final Dio _dio;
  final TokenStore _tokenStore;
  OnSessionRevoked? _onSessionRevoked;
  Future<String>? _refreshInFlight;

  Dio get raw => _dio;

  void setSessionRevokedHandler(OnSessionRevoked? handler) {
    _onSessionRevoked = handler;
  }

  Future<Response<T>> get<T>(
    String path, {
    Map<String, dynamic>? queryParameters,
  }) =>
      _dio.get<T>(path, queryParameters: queryParameters);

  Future<Response<T>> post<T>(
    String path, {
    Object? data,
    Map<String, dynamic>? queryParameters,
  }) =>
      _dio.post<T>(path, data: data, queryParameters: queryParameters);

  Future<String> refreshAccessToken() {
    _refreshInFlight ??= _doRefresh().whenComplete(() {
      _refreshInFlight = null;
    });
    return _refreshInFlight!;
  }

  Future<String> _doRefresh() async {
    final refresh = await _tokenStore.readRefreshToken();
    if (refresh == null || refresh.isEmpty) {
      throw ApiException('AUTH_UNAUTHORIZED', statusCode: 401);
    }
    final response = await _dio.post<Map<String, dynamic>>(
      '/auth/refresh',
      options: Options(
        headers: {
          'Cookie': '$refreshCookieName=$refresh',
          'X-Client': apiClientHeader,
        },
        extra: {'retried': true},
      ),
    );
    final access = response.data?['accessToken'] as String?;
    if (access == null || access.isEmpty) {
      throw ApiException('AUTH_UNAUTHORIZED', statusCode: 401);
    }
    await _tokenStore.saveAccessToken(access);
    return access;
  }

  String? refreshTokenFromResponse(Response<dynamic> response) {
    return extractCookieValue(
      DioHeadersAdapter(response.headers),
      refreshCookieName,
    );
  }
}

class DioHeadersAdapter implements HeadersLike {
  DioHeadersAdapter(this.headers);

  final Headers headers;

  @override
  List<String> valuesFor(String name) {
    return headers.map[name.toLowerCase()] ??
        headers.map[name] ??
        const <String>[];
  }
}

ApiException mapDioError(Object error) {
  if (error is ApiException) return error;
  if (error is DioException) {
    final data = error.response?.data;
    if (data is Map && data['code'] is String) {
      return ApiException(
        data['code'] as String,
        statusCode: error.response?.statusCode,
      );
    }
    if (error.type == DioExceptionType.connectionError ||
        error.type == DioExceptionType.connectionTimeout ||
        error.type == DioExceptionType.receiveTimeout) {
      return ApiException('NETWORK_ERROR');
    }
    return ApiException(
      'INTERNAL_ERROR',
      statusCode: error.response?.statusCode,
    );
  }
  return ApiException('INTERNAL_ERROR');
}

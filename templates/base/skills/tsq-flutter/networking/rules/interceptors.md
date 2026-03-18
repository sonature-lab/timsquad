---
title: Interceptor Chain Architecture
impact: CRITICAL
impactDescription: "인터셉터 순서 오류 → 인증 누락, 무한 재시도, 에러 미변환"
tags: dio, interceptor, auth, retry, logging, chain
---

## Interceptor Chain Architecture

**Impact: CRITICAL (인터셉터 순서 오류 → 인증 누락, 무한 재시도, 에러 미변환)**

Dio 인터셉터 체인 설계. Auth → Retry → Logging → Error Transform 순서.
각 인터셉터의 책임과 구현 패턴.

### 인터셉터 체인 순서

```
Request Flow:
  Client → Auth → Retry → Logging → Error Transform → Server

Response Flow:
  Server → Error Transform → Logging → Retry → Auth → Client

순서 근거:
1. Auth: 요청에 토큰 주입 (가장 먼저)
2. Retry: 실패 시 재시도 판단 (Auth 뒤 = 토큰 포함 상태로 재시도)
3. Logging: 최종 요청/응답 기록 (디버깅용)
4. Error Transform: DioException → 도메인 에러 변환 (가장 마지막)
```

### Auth Interceptor

**Incorrect (토큰 만료 시 무한 실패):**
```dart
class BadAuthInterceptor extends Interceptor {
  @override
  void onRequest(RequestOptions options, RequestInterceptorHandler handler) {
    options.headers['Authorization'] = 'Bearer $accessToken';
    handler.next(options);
    // → 토큰 만료 시 401 → 재시도 없이 실패
  }
}
```

**Correct (QueuedInterceptorsWrapper로 토큰 리프레시):**
```dart
/// Auth 인터셉터 — 토큰 주입 + 401 리프레시
/// QueuedInterceptorsWrapper: 리프레시 중 다른 요청 큐잉 (중복 리프레시 방지)
class AuthInterceptor extends QueuedInterceptorsWrapper {
  final TokenStorage _tokenStorage;
  final Dio _tokenDio; // 토큰 리프레시 전용 Dio (인터셉터 미적용)

  AuthInterceptor({
    required TokenStorage tokenStorage,
    required Dio tokenDio,
  })  : _tokenStorage = tokenStorage,
        _tokenDio = tokenDio;

  @override
  void onRequest(RequestOptions options, RequestInterceptorHandler handler) async {
    final token = await _tokenStorage.getAccessToken();
    if (token != null) {
      options.headers['Authorization'] = 'Bearer $token';
    }
    handler.next(options);
  }

  @override
  void onError(DioException err, ErrorInterceptorHandler handler) async {
    if (err.response?.statusCode != 401) {
      return handler.next(err);
    }

    // 401 → 토큰 리프레시 시도
    try {
      final refreshToken = await _tokenStorage.getRefreshToken();
      if (refreshToken == null) {
        return handler.next(err); // 리프레시 토큰 없음 → 로그아웃
      }

      final response = await _tokenDio.post('/auth/refresh', data: {
        'refresh_token': refreshToken,
      });

      final newAccessToken = response.data['access_token'] as String;
      final newRefreshToken = response.data['refresh_token'] as String;
      await _tokenStorage.saveTokens(newAccessToken, newRefreshToken);

      // 원래 요청 재시도 (새 토큰으로)
      err.requestOptions.headers['Authorization'] = 'Bearer $newAccessToken';
      final retryResponse = await _tokenDio.fetch(err.requestOptions);
      return handler.resolve(retryResponse);
    } catch (e) {
      // 리프레시 실패 → 로그아웃 이벤트 발행
      return handler.next(err);
    }
  }
}

final authInterceptorProvider = Provider<AuthInterceptor>((ref) {
  return AuthInterceptor(
    tokenStorage: ref.watch(tokenStorageProvider),
    tokenDio: Dio(BaseOptions(
      baseUrl: ref.watch(appConfigProvider).baseUrl,
    )), // 인터셉터 없는 별도 Dio
  );
});
```

### Retry Interceptor

```dart
/// Retry 인터셉터 — 지수 백오프, 5xx/timeout만
class RetryInterceptor extends Interceptor {
  final Dio _dio;
  final int maxRetries;

  RetryInterceptor({required Dio dio, this.maxRetries = 3}) : _dio = dio;

  @override
  void onError(DioException err, ErrorInterceptorHandler handler) async {
    if (!_shouldRetry(err) || _getRetryCount(err) >= maxRetries) {
      return handler.next(err);
    }

    final retryCount = _getRetryCount(err) + 1;
    final delay = Duration(milliseconds: 1000 * pow(2, retryCount - 1).toInt());

    await Future.delayed(delay);

    try {
      err.requestOptions.extra['retryCount'] = retryCount;
      final response = await _dio.fetch(err.requestOptions);
      return handler.resolve(response);
    } catch (e) {
      return handler.next(err);
    }
  }

  bool _shouldRetry(DioException err) {
    return err.type == DioExceptionType.connectionTimeout ||
        err.type == DioExceptionType.sendTimeout ||
        err.type == DioExceptionType.receiveTimeout ||
        (err.response?.statusCode != null && err.response!.statusCode! >= 500);
  }

  int _getRetryCount(DioException err) {
    return err.requestOptions.extra['retryCount'] as int? ?? 0;
  }
}
```

### Logging Interceptor

```dart
/// Logging 인터셉터 — debug 빌드에서만 활성화
class AppLoggingInterceptor extends Interceptor {
  @override
  void onRequest(RequestOptions options, RequestInterceptorHandler handler) {
    debugPrint('→ ${options.method} ${options.uri}');
    if (options.data != null) {
      debugPrint('  Body: ${options.data}');
    }
    handler.next(options);
  }

  @override
  void onResponse(Response response, ResponseInterceptorHandler handler) {
    debugPrint('← ${response.statusCode} ${response.requestOptions.uri}');
    handler.next(response);
  }

  @override
  void onError(DioException err, ErrorInterceptorHandler handler) {
    debugPrint('✗ ${err.type} ${err.requestOptions.uri}');
    debugPrint('  ${err.message}');
    handler.next(err);
  }
}
```

### Error Transform Interceptor

```dart
/// Error Transform — DioException → NetworkFailure
/// (error-handling.md 참조)
class ErrorTransformInterceptor extends Interceptor {
  @override
  void onError(DioException err, ErrorInterceptorHandler handler) {
    // NetworkFailure로 변환 후 그대로 전파
    // Repository 레이어에서 catch하여 Result로 래핑
    handler.next(err);
  }
}
```

### 규칙

- 인터셉터 순서: Auth → Retry → Logging → Error Transform (변경 금지)
- Auth 인터셉터는 `QueuedInterceptorsWrapper` 사용 (동시 리프레시 방지)
- 토큰 리프레시용 Dio는 별도 인스턴스 (인터셉터 미적용, 순환 방지)
- Retry: 지수 백오프 (1s, 2s, 4s), 최대 3회, 5xx/timeout만
- Retry: POST/PUT/DELETE는 멱등성 확인 후 재시도 여부 결정
- Logging: `kDebugMode` 또는 dev 환경에서만 활성화
- 인터셉터 내에서 BuildContext, Navigator 접근 금지

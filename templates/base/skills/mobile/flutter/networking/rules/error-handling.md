---
title: Network Error Handling
impact: CRITICAL
impactDescription: "에러 미변환 → DioException UI 노출, 사용자 혼란, 디버깅 불가"
tags: dio, error, failure, sealed-class, result-pattern
---

## Network Error Handling

**Impact: CRITICAL (에러 미변환 → DioException UI 노출, 사용자 혼란, 디버깅 불가)**

DioException을 앱 도메인 NetworkFailure로 변환.
Repository에서 Result 패턴으로 래핑하여 UI까지 안전하게 전달.

### NetworkFailure Sealed Class

**Incorrect (DioException 직접 노출):**
```dart
class UserRepository {
  Future<User> getUser(String id) async {
    final response = await dio.get('/users/$id');
    return User.fromJson(response.data);
    // → DioException이 그대로 UI까지 전파
    // → try-catch 누락 시 앱 크래시
  }
}
```

**Correct (도메인 에러 변환 + Result 패턴):**
```dart
/// 네트워크 에러 도메인 모델
sealed class NetworkFailure {
  final String message;
  final int? statusCode;
  final dynamic originalError;

  const NetworkFailure({
    required this.message,
    this.statusCode,
    this.originalError,
  });

  /// DioException → NetworkFailure 팩토리
  factory NetworkFailure.fromDioException(DioException e) {
    return switch (e.type) {
      DioExceptionType.connectionTimeout ||
      DioExceptionType.sendTimeout ||
      DioExceptionType.receiveTimeout =>
        TimeoutFailure(
          message: '서버 응답 시간이 초과되었습니다',
          originalError: e,
        ),
      DioExceptionType.connectionError => NoConnectionFailure(
          message: '인터넷 연결을 확인해주세요',
          originalError: e,
        ),
      DioExceptionType.badResponse => ServerFailure(
          message: _extractServerMessage(e.response),
          statusCode: e.response?.statusCode,
          originalError: e,
        ),
      DioExceptionType.cancel => RequestCancelledFailure(
          message: '요청이 취소되었습니다',
          originalError: e,
        ),
      _ => UnknownNetworkFailure(
          message: '알 수 없는 네트워크 오류가 발생했습니다',
          originalError: e,
        ),
    };
  }

  static String _extractServerMessage(Response? response) {
    try {
      final data = response?.data;
      if (data is Map<String, dynamic>) {
        return data['message'] as String? ??
            data['error'] as String? ??
            'Server error';
      }
    } catch (_) {}
    return 'Server error (${response?.statusCode})';
  }
}

class TimeoutFailure extends NetworkFailure {
  const TimeoutFailure({required super.message, super.originalError});
}

class NoConnectionFailure extends NetworkFailure {
  const NoConnectionFailure({required super.message, super.originalError});
}

class ServerFailure extends NetworkFailure {
  const ServerFailure({
    required super.message,
    super.statusCode,
    super.originalError,
  });

  bool get isUnauthorized => statusCode == 401;
  bool get isForbidden => statusCode == 403;
  bool get isNotFound => statusCode == 404;
  bool get isConflict => statusCode == 409;
  bool get isValidationError => statusCode == 422;
  bool get isRateLimited => statusCode == 429;
}

class RequestCancelledFailure extends NetworkFailure {
  const RequestCancelledFailure({required super.message, super.originalError});
}

class UnknownNetworkFailure extends NetworkFailure {
  const UnknownNetworkFailure({required super.message, super.originalError});
}
```

### Result 패턴

```dart
/// 범용 Result 타입
sealed class Result<T> {
  const Result();
}

class Success<T> extends Result<T> {
  final T data;
  const Success(this.data);
}

class Failure<T> extends Result<T> {
  final NetworkFailure failure;
  const Failure(this.failure);
}

/// Repository에서 사용
class UserRepository {
  final Dio _dio;

  UserRepository({required Dio dio}) : _dio = dio;

  Future<Result<User>> getUser(String id) async {
    try {
      final response = await _dio.get('/users/$id');
      final user = User.fromJson(response.data);
      return Success(user);
    } on DioException catch (e) {
      return Failure(NetworkFailure.fromDioException(e));
    }
  }

  Future<Result<List<User>>> getUsers({int page = 1}) async {
    try {
      final response = await _dio.get('/users', queryParameters: {'page': page});
      final users = (response.data as List)
          .map((json) => User.fromJson(json))
          .toList();
      return Success(users);
    } on DioException catch (e) {
      return Failure(NetworkFailure.fromDioException(e));
    }
  }
}
```

### UI에서 Result 처리

```dart
/// Provider에서 Result 소비
class UserNotifier extends AsyncNotifier<User> {
  @override
  Future<User> build() async {
    final result = await ref.read(userRepositoryProvider).getUser('me');
    return switch (result) {
      Success(data: final user) => user,
      Failure(failure: final f) => throw f, // AsyncError로 전환
    };
  }
}

/// Widget에서 에러 표시
Widget build(BuildContext context, WidgetRef ref) {
  final userAsync = ref.watch(userProvider);

  return userAsync.when(
    data: (user) => UserProfile(user: user),
    loading: () => const LoadingIndicator(),
    error: (error, _) {
      if (error is NoConnectionFailure) {
        return const OfflineWidget();
      }
      if (error is ServerFailure && error.isNotFound) {
        return const UserNotFoundWidget();
      }
      return ErrorWidget(message: (error as NetworkFailure).message);
    },
  );
}
```

### 규칙

- DioException을 UI 레이어까지 전파 금지 — 반드시 NetworkFailure로 변환
- `NetworkFailure.fromDioException()` 팩토리 단일 변환 지점
- Repository 메서드는 `Result<T>` 반환 — 절대 throw 하지 않음
- sealed class 사용 — switch 완전성 검사로 누락 방지
- 서버 에러 메시지 추출 → 사용자 친화적 메시지로 매핑
- 401 → 토큰 리프레시는 Auth 인터셉터 담당 (Repository 아님)
- 에러 로깅은 Logging 인터셉터에서 처리 (Repository에서 중복 로깅 금지)

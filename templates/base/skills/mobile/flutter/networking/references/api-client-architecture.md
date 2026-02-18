---
title: API Client Architecture
category: reference
source: internal
tags: architecture, directory, provider, repository, mock, testing
---

# API Client Architecture

네트워크 레이어 전체 아키텍처. 디렉토리 구조, Provider 그래프, Repository 패턴, Mock 테스트 전략.

## Key Concepts

- **중앙화**: 네트워크 관련 코드를 `core/networking/` 에 집중 (feature 횡단 관심사)
- **계층 분리**: Dio → Interceptor → API Client → Repository → Provider → UI
- **테스트 가능성**: API Client 추상화로 Mock 구현 용이
- **오프라인 우선**: 캐시 + 큐 + connectivity 감지를 기본 탑재

## Directory Structure

```
lib/
├── core/
│   └── networking/
│       ├── dio_provider.dart              # Dio 싱글톤 Provider
│       ├── app_config.dart                # 환경 설정 (baseUrl 등)
│       ├── interceptors/
│       │   ├── auth_interceptor.dart       # 토큰 주입 + 401 리프레시
│       │   ├── retry_interceptor.dart      # 지수 백오프 재시도
│       │   ├── logging_interceptor.dart    # 요청/응답 로깅
│       │   └── error_transform_interceptor.dart  # DioException → NetworkFailure
│       ├── errors/
│       │   ├── network_failure.dart        # sealed class 에러 타입
│       │   └── result.dart                # Result<T> 타입
│       ├── cache/
│       │   ├── cache_config.dart           # 캐시 정책 팩토리
│       │   ├── cache_store_provider.dart   # HiveCacheStore Provider
│       │   └── cache_manager.dart          # 캐시 클리어/무효화
│       ├── connectivity/
│       │   ├── connectivity_notifier.dart  # 연결 상태 스트림
│       │   ├── offline_queue.dart          # 오프라인 요청 큐
│       │   └── offline_banner.dart         # 오프라인 UI 위젯
│       └── api/
│           ├── user_api.dart              # @RestApi 클라이언트
│           ├── match_api.dart             # @RestApi 클라이언트
│           └── ...
│
├── features/
│   └── user/
│       ├── data/
│       │   ├── models/
│       │   │   ├── user_response.dart     # freezed 응답 모델
│       │   │   └── create_user_request.dart  # freezed 요청 모델
│       │   └── repositories/
│       │       └── user_repository_impl.dart  # API 호출 + 에러 변환
│       ├── domain/
│       │   ├── entities/
│       │   │   └── user.dart              # 도메인 엔티티
│       │   └── repositories/
│       │       └── user_repository.dart    # abstract
│       └── presentation/
│           └── providers/
│               └── user_provider.dart      # UI 상태 관리
```

## Provider Dependency Graph

```
AppConfig
    │
    ▼
DioProvider ──────────────────────────────────┐
    │                                          │
    ├─ AuthInterceptor ← TokenStorage          │
    ├─ RetryInterceptor                        │
    ├─ LoggingInterceptor (dev only)           │
    ├─ ErrorTransformInterceptor               │
    └─ DioCacheInterceptor ← CacheStore        │
                                               │
    ┌──────────────────────────────────────────┘
    │
    ▼
API Clients (Retrofit)
    │  UserApi, MatchApi, ...
    │
    ▼
Repositories
    │  UserRepository, MatchRepository, ...
    │  (API 호출 + Result<T> 반환)
    │
    ▼
Notifiers / Providers
    │  UserNotifier, MatchNotifier, ...
    │  (비즈니스 로직 + UI 상태)
    │
    ▼
Widgets (UI)

ConnectivityNotifier ────► OfflineQueueManager
       │                         │
       └── OfflineBanner (UI)    └── 연결 복구 시 큐 처리
```

## Provider 코드

```dart
// core/networking/providers.dart — 네트워크 레이어 Provider 모음

/// 앱 설정
final appConfigProvider = Provider<AppConfig>((ref) => AppConfig.dev);

/// Dio 싱글톤
final dioProvider = Provider<Dio>((ref) {
  final config = ref.watch(appConfigProvider);
  final dio = Dio(BaseOptions(
    baseUrl: config.baseUrl,
    connectTimeout: const Duration(seconds: 15),
    receiveTimeout: const Duration(seconds: 15),
    sendTimeout: const Duration(seconds: 15),
    headers: {'Content-Type': 'application/json', 'Accept': 'application/json'},
  ));

  dio.interceptors.addAll([
    ref.watch(authInterceptorProvider),
    ref.watch(retryInterceptorProvider),
    if (config.environment == AppEnvironment.dev)
      ref.watch(loggingInterceptorProvider),
    ref.watch(errorTransformInterceptorProvider),
  ]);

  return dio;
});

/// API Clients
final userApiProvider = Provider<UserApi>((ref) {
  return UserApi(ref.watch(dioProvider));
});

/// Repositories
final userRepositoryProvider = Provider<UserRepository>((ref) {
  return UserRepositoryImpl(api: ref.watch(userApiProvider));
});

/// Connectivity
final connectivityProvider =
    StreamNotifierProvider<ConnectivityNotifier, NetworkStatus>(
  ConnectivityNotifier.new,
);

final isOnlineProvider = Provider<bool>((ref) {
  return ref.watch(connectivityProvider).valueOrNull == NetworkStatus.online;
});
```

## Repository Pattern

```dart
/// Repository 추상 (domain 레이어)
abstract class UserRepository {
  Future<Result<User>> getUser(String id);
  Future<Result<List<User>>> getUsers({int page = 1});
  Future<Result<User>> createUser(CreateUserRequest request);
  Future<Result<void>> deleteUser(String id);
}

/// Repository 구현 (data 레이어)
class UserRepositoryImpl implements UserRepository {
  final UserApi _api;

  UserRepositoryImpl({required UserApi api}) : _api = api;

  @override
  Future<Result<User>> getUser(String id) async {
    try {
      final response = await _api.getUser(id);
      return Success(response.toDomain());
    } on DioException catch (e) {
      return Failure(NetworkFailure.fromDioException(e));
    }
  }

  @override
  Future<Result<List<User>>> getUsers({int page = 1}) async {
    try {
      final response = await _api.getUsers(page, 20);
      return Success(response.data.map((r) => r.toDomain()).toList());
    } on DioException catch (e) {
      return Failure(NetworkFailure.fromDioException(e));
    }
  }

  // ... createUser, deleteUser 동일 패턴
}
```

## Mock Testing Strategy

```dart
/// Mock API Client
class MockUserApi implements UserApi {
  @override
  Future<UserResponse> getUser(String id) async {
    return UserResponse(
      id: id,
      name: 'Test User',
      email: 'test@example.com',
      createdAt: DateTime.now(),
    );
  }

  @override
  Future<PaginatedResponse<UserResponse>> getUsers(int page, int limit) async {
    return PaginatedResponse(
      data: List.generate(limit, (i) => UserResponse(
        id: 'user_$i',
        name: 'User $i',
        email: 'user$i@example.com',
        createdAt: DateTime.now(),
      )),
      total: 100,
      page: page,
      lastPage: 5,
    );
  }

  // ...
}

/// 테스트에서 Provider 오버라이드
void main() {
  group('UserNotifier', () {
    late ProviderContainer container;

    setUp(() {
      container = ProviderContainer(overrides: [
        userApiProvider.overrideWithValue(MockUserApi()),
      ]);
    });

    tearDown(() => container.dispose());

    test('loads user successfully', () async {
      final repository = container.read(userRepositoryProvider);
      final result = await repository.getUser('user_1');

      expect(result, isA<Success<User>>());
      expect((result as Success).data.name, 'Test User');
    });
  });
}

/// 에러 시나리오 Mock
class ErrorUserApi implements UserApi {
  @override
  Future<UserResponse> getUser(String id) async {
    throw DioException(
      requestOptions: RequestOptions(path: '/users/$id'),
      type: DioExceptionType.connectionTimeout,
    );
  }

  // ...
}

/// 에러 테스트
test('returns TimeoutFailure on connection timeout', () async {
  final container = ProviderContainer(overrides: [
    userApiProvider.overrideWithValue(ErrorUserApi()),
  ]);

  final repository = container.read(userRepositoryProvider);
  final result = await repository.getUser('user_1');

  expect(result, isA<Failure<User>>());
  expect((result as Failure).failure, isA<TimeoutFailure>());
});
```

## Initialization Flow

```
앱 시작 (main.dart)
  │
  ├─ 1. WidgetsFlutterBinding.ensureInitialized()
  ├─ 2. AppConfig 결정 (환경 변수 / 빌드 플래그)
  ├─ 3. CacheStore 초기화 (HiveCacheStore)
  ├─ 4. ProviderScope(overrides: [appConfig, cacheStore])
  └─ 5. runApp()
        │
        └─ App 위젯 build
            ├─ DioProvider 자동 생성 (lazy)
            ├─ ConnectivityNotifier 스트림 시작
            └─ OfflineBanner 조건부 표시
```

## Common Pitfalls

1. **Dio 다중 인스턴스**: Feature마다 Dio 생성 → 인터셉터 미적용, 토큰 누락
2. **인터셉터 순서**: Error Transform이 Auth 앞 → 401 리프레시 불가
3. **토큰 리프레시 순환**: Auth 인터셉터가 메인 Dio로 리프레시 → 무한 루프
4. **캐시 + 인증 에러**: 401 응답 캐시 → 로그인 후에도 에러 반환
5. **오프라인 큐 영속성**: 메모리 큐만 사용 → 앱 재시작 시 유실
6. **connectTimeout vs receiveTimeout**: connect는 TCP 연결, receive는 데이터 수신 — 둘 다 설정 필수
7. **validateStatus 미설정**: 4xx도 DioException → 정상 에러 응답 처리 불가
8. **build_runner 미실행**: Retrofit `.g.dart` 미생성 → 컴파일 에러

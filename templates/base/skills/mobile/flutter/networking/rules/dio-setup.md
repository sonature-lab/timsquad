---
title: Dio Setup & Configuration
impact: CRITICAL
impactDescription: "잘못된 Dio 설정 → 타임아웃 누락, 인스턴스 중복 생성, 메모리 낭비"
tags: dio, http, setup, riverpod, baseOptions
---

## Dio Setup & Configuration

**Impact: CRITICAL (잘못된 Dio 설정 → 타임아웃 누락, 인스턴스 중복 생성, 메모리 낭비)**

Dio 싱글톤 인스턴스 관리, BaseOptions 설정, 환경별 분리.
모든 네트워크 통신의 기반이 되는 핵심 인프라.

### 의존성

```yaml
# pubspec.yaml
dependencies:
  dio: ^5.7.0
  flutter_riverpod: ^2.6.0
  # 또는 riverpod (non-Flutter)
```

### Dio 인스턴스 관리

**Incorrect (매번 새 인스턴스 생성):**
```dart
class UserRepository {
  Future<User> getUser(String id) async {
    // 매 호출마다 Dio 생성 → 인터셉터 미적용, 커넥션 풀 미활용
    final dio = Dio();
    final response = await dio.get('https://api.example.com/users/$id');
    return User.fromJson(response.data);
  }
}
```

**Correct (Riverpod Provider로 싱글톤 관리):**
```dart
/// 환경 설정
enum AppEnvironment { dev, staging, prod }

class AppConfig {
  final AppEnvironment environment;
  final String baseUrl;

  const AppConfig({required this.environment, required this.baseUrl});

  static const dev = AppConfig(
    environment: AppEnvironment.dev,
    baseUrl: 'https://dev-api.example.com/v1',
  );

  static const staging = AppConfig(
    environment: AppEnvironment.staging,
    baseUrl: 'https://staging-api.example.com/v1',
  );

  static const prod = AppConfig(
    environment: AppEnvironment.prod,
    baseUrl: 'https://api.example.com/v1',
  );
}

/// 앱 설정 Provider
final appConfigProvider = Provider<AppConfig>((ref) {
  // main.dart에서 ProviderScope overrides로 주입
  return AppConfig.dev;
});

/// Dio Provider — 앱 전역 싱글톤
final dioProvider = Provider<Dio>((ref) {
  final config = ref.watch(appConfigProvider);

  final dio = Dio(BaseOptions(
    baseUrl: config.baseUrl,
    connectTimeout: const Duration(seconds: 15),
    receiveTimeout: const Duration(seconds: 15),
    sendTimeout: const Duration(seconds: 15),
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    validateStatus: (status) => status != null && status < 500,
  ));

  // 인터셉터 체인 (순서 중요)
  dio.interceptors.addAll([
    ref.watch(authInterceptorProvider),
    ref.watch(retryInterceptorProvider),
    if (config.environment == AppEnvironment.dev)
      ref.watch(loggingInterceptorProvider),
    ref.watch(errorTransformInterceptorProvider),
  ]);

  return dio;
});
```

### main.dart 환경 주입

```dart
Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();

  // 환경 결정 (빌드 플래그, .env 등)
  const config = String.fromEnvironment('ENV') == 'prod'
      ? AppConfig.prod
      : AppConfig.dev;

  runApp(
    ProviderScope(
      overrides: [
        appConfigProvider.overrideWithValue(config),
      ],
      child: const MyApp(),
    ),
  );
}
```

### BaseOptions 상세

```dart
BaseOptions(
  // 서버 기본 URL — 환경별 분리 필수
  baseUrl: 'https://api.example.com/v1',

  // 타임아웃 — 15초 권장 (모바일 네트워크 고려)
  connectTimeout: const Duration(seconds: 15),
  receiveTimeout: const Duration(seconds: 15),
  sendTimeout: const Duration(seconds: 15),

  // 기본 헤더
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'X-App-Version': appVersion, // 서버 호환성 체크용
    'X-Platform': Platform.isIOS ? 'ios' : 'android',
  },

  // 응답 타입
  responseType: ResponseType.json,

  // 상태 코드 검증 — 5xx는 DioException으로 처리
  validateStatus: (status) => status != null && status < 500,
)
```

### 규칙

- Dio 인스턴스는 Riverpod Provider로 싱글톤 관리 — 직접 생성 금지
- `connectTimeout`, `receiveTimeout`, `sendTimeout` 모두 15초 설정
- `baseUrl` 은 환경별 분리 (dev/staging/prod) — 하드코딩 금지
- `Content-Type: application/json` 기본 헤더
- `validateStatus` — 5xx만 에러, 4xx는 응답 데이터로 처리
- Interceptor 등록은 Dio Provider 내에서 순서대로
- Logging 인터셉터는 dev 환경에서만 활성화

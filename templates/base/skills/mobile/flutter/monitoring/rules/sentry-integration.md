---
title: Sentry Integration & Breadcrumbs
impact: MEDIUM
impactDescription: "에러 컨텍스트 부족 → 재현 불가, 크래시 원인 추적 지연"
tags: sentry, breadcrumb, scope, dsn, error-tracking
---

## Sentry Integration & Breadcrumbs

**Impact: MEDIUM (에러 컨텍스트 부족 → 재현 불가, 크래시 원인 추적 지연)**

sentry_flutter 초기화, DSN 환경별 분리, breadcrumbs 자동/수동 기록,
scope 설정, Crashlytics와의 공존 전략.

### 의존성

```yaml
# pubspec.yaml
dependencies:
  sentry_flutter: ^8.12.0
  sentry_dio: ^8.12.0        # dio HTTP breadcrumbs
```

### 초기화

**Incorrect (하드코딩된 DSN, 기본 설정만):**
```dart
await SentryFlutter.init((options) {
  options.dsn = 'https://key@sentry.io/123'; // 하드코딩 → 환경 구분 불가
});
```

**Correct (환경별 DSN + 상세 설정):**
```dart
Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await Firebase.initializeApp();

  await SentryFlutter.init(
    (options) {
      // DSN 환경별 분리 (--dart-define으로 주입)
      options.dsn = const String.fromEnvironment(
        'SENTRY_DSN',
        defaultValue: '',  // 빈 문자열 → Sentry 비활성화
      );

      // 환경 태그
      options.environment = const String.fromEnvironment(
        'ENV',
        defaultValue: 'development',
      );

      // 샘플링 (프로덕션에서 100%는 비용 과다)
      options.tracesSampleRate = kDebugMode ? 1.0 : 0.3;
      options.profilesSampleRate = kDebugMode ? 1.0 : 0.1;

      // 릴리스 버전 (소스맵 매핑)
      options.release = '${packageInfo.version}+${packageInfo.buildNumber}';

      // 디버그 모드
      options.debug = kDebugMode;

      // 자동 breadcrumb 수집
      options.enableAutoNativeBreadcrumbs = true;
      options.enableAutoPerformanceTracing = true;

      // PII 전송 비활성화
      options.sendDefaultPii = false;

      // 에러 필터링 (무시할 에러 타입)
      options.beforeSend = (event, hint) {
        // 네트워크 끊김 에러는 무시
        if (event.throwable is SocketException) return null;
        return event;
      };
    },
    appRunner: () => runApp(
      const ProviderScope(child: MyApp()),
    ),
  );
}
```

### Breadcrumbs

```dart
class SentryBreadcrumbService {
  /// 네비게이션 breadcrumb (수동 — go_router 연동)
  static void navigationBreadcrumb({
    required String from,
    required String to,
  }) {
    Sentry.addBreadcrumb(Breadcrumb(
      type: 'navigation',
      category: 'navigation',
      data: {'from': from, 'to': to},
    ));
  }

  /// 사용자 액션 breadcrumb
  static void userActionBreadcrumb({
    required String action,
    required String target,
    Map<String, dynamic>? data,
  }) {
    Sentry.addBreadcrumb(Breadcrumb(
      type: 'user',
      category: 'user.action',
      message: '$action on $target',
      data: data,
    ));
  }

  /// 상태 변경 breadcrumb
  static void stateBreadcrumb({
    required String category,
    required String message,
    Map<String, dynamic>? data,
  }) {
    Sentry.addBreadcrumb(Breadcrumb(
      type: 'info',
      category: category,
      message: message,
      data: data,
      level: SentryLevel.info,
    ));
  }
}

// go_router NavigatorObserver로 자동 네비게이션 breadcrumb
class SentryNavigatorObserver extends NavigatorObserver {
  @override
  void didPush(Route route, Route? previousRoute) {
    SentryBreadcrumbService.navigationBreadcrumb(
      from: previousRoute?.settings.name ?? 'unknown',
      to: route.settings.name ?? 'unknown',
    );
  }

  @override
  void didPop(Route route, Route? previousRoute) {
    SentryBreadcrumbService.navigationBreadcrumb(
      from: route.settings.name ?? 'unknown',
      to: previousRoute?.settings.name ?? 'unknown',
    );
  }
}
```

### Scope 설정

```dart
/// 사용자 정보 + 태그 설정
class SentryScopeManager {
  /// 로그인 시 사용자 설정
  static Future<void> setUser({
    required String id,
    String? email,
    String? username,
    Map<String, String>? extras,
  }) async {
    Sentry.configureScope((scope) {
      scope.setUser(SentryUser(
        id: id,
        email: email,      // PII — sendDefaultPii: true 필요
        username: username,
      ));
      // 태그 (필터링/검색용)
      scope.setTag('subscription_tier', extras?['tier'] ?? 'free');
      scope.setTag('region', extras?['region'] ?? 'unknown');
      // 추가 데이터 (상세 컨텍스트)
      extras?.forEach((key, value) {
        scope.setExtra(key, value);
      });
    });
  }

  /// 로그아웃 시 정리
  static Future<void> clearUser() async {
    Sentry.configureScope((scope) {
      scope.setUser(null);
      scope.removeTag('subscription_tier');
      scope.removeTag('region');
    });
  }
}
```

### Dio HTTP Breadcrumbs

```dart
/// sentry_dio로 HTTP 요청/응답 자동 breadcrumb
final dio = Dio()
  ..addSentry(); // sentry_dio 확장 메서드

// 또는 수동 interceptor
class SentryDioInterceptor extends Interceptor {
  @override
  void onResponse(Response response, ResponseInterceptorHandler handler) {
    Sentry.addBreadcrumb(Breadcrumb(
      type: 'http',
      category: 'http',
      data: {
        'url': response.requestOptions.uri.toString(),
        'method': response.requestOptions.method,
        'status_code': response.statusCode,
        'duration_ms': response.requestOptions.extra['start_time'] != null
            ? DateTime.now().difference(
                response.requestOptions.extra['start_time'] as DateTime,
              ).inMilliseconds
            : null,
      },
    ));
    handler.next(response);
  }
}
```

### Crashlytics + Sentry 공존 전략

```
역할 분리:
┌──────────────┬────────────────────────┬──────────────────────┐
│              │ Firebase Crashlytics   │ Sentry               │
├──────────────┼────────────────────────┼──────────────────────┤
│ 강점         │ 크래시 집계, 안정성 %   │ 에러 컨텍스트, 검색   │
│ 크래시       │ O (primary)            │ O (backup)           │
│ 비치명 에러   │ O (recordError)        │ O (captureException) │
│ Breadcrumbs  │ X (log만 가능)          │ O (풍부한 컨텍스트)  │
│ 알림         │ Firebase Console        │ Slack/Email 통합     │
│ 비용         │ 무료                    │ 무료 (5K 이벤트/월)  │
└──────────────┴────────────────────────┴──────────────────────┘

공존 시 주의:
- 에러를 양쪽 모두에 전송하면 이벤트 쿼터 소모 → 역할 기반 필터링
- Crashlytics = 크래시 대시보드 (안정성 %)
- Sentry = 에러 디버깅 (breadcrumb, context, 검색)
```

### 규칙

- DSN → `--dart-define`으로 환경별 주입, 하드코딩 금지
- `tracesSampleRate` → 프로덕션 0.1~0.3 (비용 절감)
- `beforeSend` → 불필요한 에러 (SocketException 등) 필터링
- Breadcrumb → 네비게이션, HTTP, 사용자 액션 자동 기록
- Scope → 로그인/로그아웃 시 사용자 정보 설정/해제
- PII → `sendDefaultPii: false` 기본, 필요 시 명시적 활성화
- Crashlytics 공존 → 각 도구의 강점에 맞는 역할 분리
- 릴리스 → `options.release` 설정 + 소스맵/디버그 심볼 업로드

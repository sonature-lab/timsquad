---
title: Monitoring Architecture & Dashboard Configuration
category: reference
source: internal
tags: architecture, dashboard, alerting, data-retention, crashlytics, sentry, analytics
---

# Monitoring Architecture & Dashboard Configuration

모니터링 레이어 구조, 대시보드 구성, 알림 설정, 데이터 보존 정책.
프로덕션 운영 시 참조.

## Key Concepts

- **레이어 모델**: crash → error → performance → analytics → logging (우선순위 순)
- **대시보드 분리**: Firebase Console (크래시/성능) + Sentry (에러 컨텍스트)
- **알림 전략**: 크래시 스파이크, ANR, 성능 저하에 대한 자동 알림
- **데이터 보존**: 도구별 보존 기간 + 비용 최적화

## Monitoring Layer Model

```
┌─────────────────────────────────────────────────────────┐
│                    Monitoring Layers                     │
├─────────┬───────────────┬───────────────┬───────────────┤
│ Layer   │ Tool          │ Priority      │ Purpose       │
├─────────┼───────────────┼───────────────┼───────────────┤
│ L1      │ Crashlytics   │ CRITICAL      │ 앱 크래시     │
│ Crash   │               │               │ ANR/프리징    │
│         │               │               │ 안정성 %      │
├─────────┼───────────────┼───────────────┼───────────────┤
│ L2      │ Sentry        │ HIGH          │ 비치명 에러   │
│ Error   │ + Crashlytics │               │ 에러 컨텍스트 │
│         │               │               │ breadcrumbs   │
├─────────┼───────────────┼───────────────┼───────────────┤
│ L3      │ Firebase      │ HIGH          │ 앱 시작 시간  │
│ Perf    │ Performance   │               │ HTTP 응답     │
│         │               │               │ 프레임 렌더링 │
├─────────┼───────────────┼───────────────┼───────────────┤
│ L4      │ Firebase      │ MEDIUM        │ 사용자 행동   │
│ Analyt  │ Analytics     │               │ 전환 퍼널     │
│         │               │               │ 리텐션        │
├─────────┼───────────────┼───────────────┼───────────────┤
│ L5      │ logger +      │ LOW           │ 디버깅 추적   │
│ Logging │ Sentry/Crash  │               │ 원격 컨텍스트 │
│         │               │               │ 감사 로그     │
└─────────┴───────────────┴───────────────┴───────────────┘
```

## Directory Structure

```
lib/
├── core/
│   └── monitoring/
│       ├── monitoring_service.dart           # 통합 초기화 + Facade
│       ├── crashlytics/
│       │   ├── crashlytics_service.dart      # Crashlytics 래퍼
│       │   └── crashlytics_error_handler.dart # 에러 핸들러 체인
│       ├── analytics/
│       │   ├── analytics_service.dart        # Analytics 래퍼
│       │   ├── analytics_events.dart         # 이벤트 상수
│       │   └── analytics_observer.dart       # GoRouter observer
│       ├── performance/
│       │   ├── performance_service.dart      # Custom trace 래퍼
│       │   └── performance_interceptor.dart  # Dio HTTP metric
│       ├── sentry/
│       │   ├── sentry_service.dart           # Sentry 래퍼
│       │   ├── sentry_breadcrumb_service.dart # Breadcrumb 관리
│       │   └── sentry_navigator_observer.dart # 네비게이션 추적
│       ├── logging/
│       │   ├── app_logger.dart               # Logger 래퍼
│       │   ├── log_sanitizer.dart            # 민감 데이터 마스킹
│       │   └── remote_log_output.dart        # 원격 로그 출력
│       └── providers/
│           └── monitoring_providers.dart      # Riverpod providers
```

## Initialization Order

```
main.dart 초기화 순서:
  │
  ├─ 1. WidgetsFlutterBinding.ensureInitialized()
  ├─ 2. Firebase.initializeApp()
  ├─ 3. FlutterError.onError = Crashlytics.recordFlutterFatalError
  ├─ 4. PlatformDispatcher.instance.onError → Crashlytics.recordError
  ├─ 5. SentryFlutter.init(appRunner: ...)
  │     └─ 내부에서 runApp() 호출
  │        │
  │        └─ App 초기화 시:
  │            ├─ MonitoringService.initialize()
  │            │   ├─ CrashlyticsService.setUser()
  │            │   ├─ AnalyticsService.setUserProperties()
  │            │   ├─ PerformanceService.enable()
  │            │   └─ AppLogger.initialize()
  │            └─ GoRouter observers: [AnalyticsObserver, SentryObserver]
```

## Dashboard Configuration

### Firebase Console

```
Firebase Console > Crashlytics:
  ├─ Overview: 크래시 없는 사용자 % (목표: 99.5% 이상)
  ├─ Issues: 크래시 목록 (발생 빈도, 영향 사용자 수)
  ├─ Trends: 버전별 안정성 추이
  └─ Velocity alerts: 크래시 급증 알림

Firebase Console > Performance:
  ├─ Dashboard: 앱 시작 시간, 화면 렌더링
  ├─ Network: HTTP 요청 성능 (응답 시간, 성공률)
  ├─ Custom traces: 비즈니스 로직 성능
  └─ Threshold alerts: 성능 임계값 알림

Firebase Console > Analytics:
  ├─ Dashboard: 활성 사용자, 세션
  ├─ Events: 이벤트 발생 빈도
  ├─ Funnels: 전환 퍼널 (가입 → 매치 생성 → 완료)
  ├─ Retention: 일별/주별 리텐션
  └─ Audiences: 사용자 세그먼트
```

### Sentry Dashboard

```
Sentry > Issues:
  ├─ 에러 목록 (발생 빈도, 영향 사용자, 첫 발생/마지막 발생)
  ├─ 에러 상세 (breadcrumbs, 태그, 디바이스 정보)
  └─ 에러 그룹화 (fingerprint 기반)

Sentry > Performance:
  ├─ 트랜잭션 목록 (p50, p75, p95)
  ├─ 느린 트랜잭션 식별
  └─ Web Vitals (웹뷰 사용 시)

Sentry > Alerts:
  ├─ Issue alerts: 새 에러 발생 시
  ├─ Metric alerts: 에러율 임계값 초과 시
  └─ Integrations: Slack, PagerDuty, Email
```

## Alerting Strategy

```
┌──────────────────┬────────────┬──────────────────────────────┐
│ Alert Type       │ Severity   │ Action                       │
├──────────────────┼────────────┼──────────────────────────────┤
│ Crash spike      │ P0         │ Slack #alerts + PagerDuty    │
│ (>1% 사용자 영향) │            │ 즉시 대응 (핫픽스 검토)       │
├──────────────────┼────────────┼──────────────────────────────┤
│ ANR rate >0.5%   │ P1         │ Slack #alerts                │
│                  │            │ 24시간 내 조사               │
├──────────────────┼────────────┼──────────────────────────────┤
│ New fatal crash  │ P1         │ Slack #alerts                │
│                  │            │ 다음 스프린트 수정            │
├──────────────────┼────────────┼──────────────────────────────┤
│ Performance      │ P2         │ Slack #monitoring            │
│ degradation      │            │ 앱 시작 >3s, API p95 >2s     │
├──────────────────┼────────────┼──────────────────────────────┤
│ Error rate       │ P2         │ Sentry alert                 │
│ spike (비치명)    │            │ 다음 스프린트 우선순위 검토    │
├──────────────────┼────────────┼──────────────────────────────┤
│ Drop in daily    │ P3         │ Weekly review                │
│ active users     │            │ Analytics 퍼널 분석           │
└──────────────────┴────────────┴──────────────────────────────┘
```

## Data Retention Policy

```
┌────────────────┬──────────────┬────────────┬─────────────────┐
│ Tool           │ Free Tier    │ Paid Tier  │ Recommendation  │
├────────────────┼──────────────┼────────────┼─────────────────┤
│ Crashlytics    │ 90일         │ 90일       │ 그대로 사용      │
│ Analytics      │ 14개월       │ 14개월     │ BigQuery 연동    │
│ Performance    │ 자동 관리     │ 자동 관리   │ 그대로 사용      │
│ Sentry (Free)  │ 30일         │ 90일       │ 주요 이슈 북마크  │
│ App logs       │ 세션 내       │ —          │ 원격 로깅 연동   │
└────────────────┴──────────────┴────────────┴─────────────────┘

BigQuery 연동 (Analytics 장기 보존):
  Firebase Console > Project Settings > Integrations > BigQuery
  - 일별 raw event export
  - SQL 쿼리로 커스텀 분석
  - Data Studio / Looker 대시보드 연동
```

## Monitoring Service (Facade)

```dart
/// 모니터링 통합 초기화 Facade
class MonitoringService {
  final CrashlyticsService _crashlytics;
  final AnalyticsService _analytics;
  final PerformanceService _performance;
  final SentryScopeManager _sentry;
  final AppLogger _logger;

  MonitoringService({
    required CrashlyticsService crashlytics,
    required AnalyticsService analytics,
    required PerformanceService performance,
    required SentryScopeManager sentry,
    required AppLogger logger,
  })  : _crashlytics = crashlytics,
        _analytics = analytics,
        _performance = performance,
        _sentry = sentry,
        _logger = logger;

  /// 사용자 로그인 시 모든 서비스에 사용자 설정
  Future<void> identifyUser({
    required String userId,
    String? email,
    Map<String, String>? properties,
  }) async {
    await _crashlytics.setUser(userId);
    await _analytics.setUserId(userId);
    await _sentry.setUser(id: userId, email: email);
    _logger.info('User identified: $userId');

    if (properties != null) {
      await _crashlytics.setContext(
        appVersion: properties['app_version'] ?? '',
        buildNumber: properties['build_number'] ?? '',
        subscriptionTier: properties['tier'],
      );
      for (final entry in properties.entries) {
        await _analytics.setUserProperty(
          name: entry.key,
          value: entry.value,
        );
      }
    }
  }

  /// 로그아웃 시 모든 서비스 정리
  Future<void> clearUser() async {
    await _crashlytics.clearUser();
    await _analytics.setUserId(null);
    await _sentry.clearUser();
    _logger.info('User cleared from monitoring');
  }
}

/// Riverpod Provider
final monitoringServiceProvider = Provider<MonitoringService>((ref) {
  return MonitoringService(
    crashlytics: ref.watch(crashlyticsServiceProvider),
    analytics: ref.watch(analyticsServiceProvider),
    performance: ref.watch(performanceServiceProvider),
    sentry: ref.watch(sentryScopeManagerProvider),
    logger: AppLogger.instance,
  );
});
```

## Common Pitfalls

1. **초기화 순서**: Firebase → Crashlytics 핸들러 → Sentry → 나머지 (순서 중요)
2. **디버그 데이터 오염**: 개발 중 크래시/이벤트가 프로덕션 대시보드에 혼합 → 환경 분리
3. **이벤트 쿼터**: Sentry 무료 5K/월, Analytics 500이벤트/사용자/일 → 필터링 필수
4. **PII 유출**: 로그/이벤트에 이메일/전화번호 포함 → 마스킹 + sendDefaultPii:false
5. **소스맵 미업로드**: 난독화된 스택트레이스 → dSYM/ProGuard mapping 업로드 자동화
6. **과도한 breadcrumb**: Sentry 기본 100개 제한 → 중요한 것만 기록
7. **성능 오버헤드**: 모니터링 SDK 자체가 성능에 영향 → 샘플링률 조절
8. **알림 피로**: 모든 에러에 알림 → 임계값 기반 알림으로 전환

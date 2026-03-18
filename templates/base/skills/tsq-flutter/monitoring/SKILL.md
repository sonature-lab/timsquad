---
name: monitoring
description: |
  Flutter 모니터링 & 분석 가이드라인.
  Firebase Crashlytics, Analytics, Performance Monitoring,
  Sentry 통합, 구조화된 로깅.
version: "1.0.0"
tags: [flutter, crashlytics, analytics, performance, sentry, monitoring, logging]
user-invocable: false
---

# Monitoring & Analytics

Flutter 앱 모니터링 통합 가이드.
Firebase Crashlytics + Analytics + Performance, Sentry, 구조화된 로깅으로
프로덕션 품질을 수치로 관리.

## Philosophy

- 크래시는 0순위 — Crashlytics 비활성화 금지, 모든 비치명 에러도 기록
- 이벤트는 설계 — 무분별한 로깅 금지, 이벤트 택소노미 먼저 정의
- 성능은 측정 — 체감이 아닌 custom trace와 HTTP metric으로 수치화

## Resources

5개 규칙 + 1개 참조. 크래시부터 로깅까지 모니터링 파이프라인 전체를 커버.

| Priority | Type | Resource | Description |
|----------|------|----------|-------------|
| CRITICAL | rule | [crashlytics-setup](rules/crashlytics-setup.md) | Crashlytics 초기화, 에러 캡처, 사용자 식별 |
| HIGH | rule | [analytics](rules/analytics.md) | Analytics 이벤트 택소노미, 사용자 속성, 화면 추적 |
| HIGH | rule | [performance-monitoring](rules/performance-monitoring.md) | Performance custom trace, HTTP metric, 프레임 모니터링 |
| MEDIUM | rule | [sentry-integration](rules/sentry-integration.md) | Sentry 초기화, breadcrumbs, scope, Crashlytics 공존 |
| MEDIUM | rule | [logging](rules/logging.md) | 구조화된 로깅, 레벨 관리, 민감 데이터 마스킹 |
| — | ref | [monitoring-architecture](references/monitoring-architecture.md) | 모니터링 레이어, 대시보드, 알림, 데이터 보존 |

## Quick Rules

### Crashlytics
- `FlutterError.onError = FirebaseCrashlytics.instance.recordFlutterFatalError`
- `PlatformDispatcher.instance.onError` → 비동기 에러 캡처
- 비치명 에러 → `recordError(error, stack, fatal: false)`
- `setUserIdentifier` → 크래시와 사용자 매핑
- `setCustomKey` → 디바이스 상태, 기능 플래그 등 컨텍스트

### Analytics
- 이벤트 택소노미 먼저 정의 (screen_view, button_click, feature_use)
- `setUserProperty` → user_type, subscription_tier 등 세그먼트 기준
- `AnalyticsObserver` → go_router 화면 전환 자동 추적
- 디버그 → `adb shell setprop debug.firebase.analytics.app <package>`

### Performance
- `FirebasePerformance.instance.newTrace('name')` → custom trace
- HTTP metric → 자동 수집 (dio interceptor 또는 http_client)
- 느린 프레임 임계값 16ms (60fps), 8ms (120fps)

### Sentry
- `SentryFlutter.init` → DSN 환경별 분리 (dev/staging/prod)
- `Sentry.addBreadcrumb` → 네비게이션, HTTP, 사용자 액션 추적
- Crashlytics + Sentry 공존 → 각자 역할 분리 (crash vs context)

### Logging
- `logger` 패키지 → 레벨별 색상 출력 (개발), JSON 구조화 (프로덕션)
- 릴리스 빌드 → verbose/debug 레벨 비활성화
- 민감 데이터 (토큰, PII) → 마스킹 필수

## Checklist

| Priority | Item |
|----------|------|
| CRITICAL | `FlutterError.onError` + `PlatformDispatcher.onError` 연동 |
| CRITICAL | Crashlytics 디버그 모드 비활성화 (`setCrashlyticsCollectionEnabled`) |
| CRITICAL | 릴리스 빌드에서 dSYM / ProGuard mapping 업로드 설정 |
| HIGH | Analytics 이벤트 택소노미 문서화 후 구현 |
| HIGH | `AnalyticsObserver` go_router 연동 |
| HIGH | Performance custom trace 핵심 플로우에 적용 |
| HIGH | HTTP metric 수집 (dio interceptor) |
| MEDIUM | Sentry DSN 환경별 분리 |
| MEDIUM | Sentry breadcrumb 네비게이션/HTTP 자동 기록 |
| MEDIUM | 구조화된 로깅 + 릴리스 레벨 필터 |
| MEDIUM | 민감 데이터 마스킹 검증 |

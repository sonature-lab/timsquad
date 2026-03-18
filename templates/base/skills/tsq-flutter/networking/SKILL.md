---
name: networking
description: |
  Flutter 네트워크 통신 가이드라인.
  Dio HTTP 클라이언트, Retrofit 코드 생성, 인터셉터 체인,
  에러 핸들링, 연결 상태 관리, 캐시 전략.
version: "1.0.0"
tags: [flutter, dio, retrofit, http, api, interceptor, connectivity]
user-invocable: false
---

# Networking

Flutter Dio + Retrofit + Interceptor + Connectivity 통합 가이드.
HTTP 클라이언트 설정부터 오프라인 캐시까지, API 통신 전체 파이프라인.

## Philosophy

- API 클라이언트는 서비스 — Feature-first 구조에서 `core/networking/` 중앙화
- 에러는 도메인 타입 — DioException을 앱 도메인 에러(NetworkFailure)로 변환
- 오프라인은 기본 — connectivity 감지 + 캐시 + 재시도를 기본 탑재
- 인터셉터는 레이어 — 인증, 재시도, 로깅, 에러 변환을 체인으로 분리

## Resources

6개 규칙 + 1개 참조. 네트워크 통신 전체를 커버.

| Priority | Type | Resource | Description |
|----------|------|----------|-------------|
| CRITICAL | rule | [dio-setup](rules/dio-setup.md) | Dio 싱글톤, BaseOptions, Riverpod Provider |
| CRITICAL | rule | [interceptors](rules/interceptors.md) | Interceptor chain 순서: Auth → Retry → Logging → Error |
| CRITICAL | rule | [error-handling](rules/error-handling.md) | DioException → NetworkFailure sealed class, Result 패턴 |
| HIGH | rule | [retrofit-patterns](rules/retrofit-patterns.md) | @RestApi, 코드 생성, freezed 모델 연동 |
| HIGH | rule | [connectivity](rules/connectivity.md) | connectivity_plus, 오프라인 큐, 자동 재시도 |
| MEDIUM | rule | [caching](rules/caching.md) | dio_cache_interceptor, ETag, 오프라인 fallback |
| — | ref | [api-client-architecture](references/api-client-architecture.md) | 디렉토리 구조, Provider 구성, Repository 연동, Mock 테스트 |

## Quick Rules

### Dio 설정
- `Dio(BaseOptions(...))` 싱글톤 — Riverpod Provider로 전역 관리
- `connectTimeout: 15s`, `receiveTimeout: 15s` 기본값
- `baseUrl` 은 환경별 분리 (dev/staging/prod)
- `contentType: 'application/json'` 기본 헤더

### 인터셉터 체인
- 순서: Auth → Retry → Logging → Error Transform
- Auth: 토큰 주입 + 401 시 리프레시
- Retry: 지수 백오프, 최대 3회, 5xx/timeout만
- Logging: debug 빌드에서만 활성화

### 에러 핸들링
- `DioException` → `NetworkFailure` sealed class 변환
- `connectionTimeout/sendTimeout` → `TimeoutFailure`
- `badResponse` → `ServerFailure(statusCode, message)`
- `connectionError` → `NoConnectionFailure`
- Repository에서 `Result<T, Failure>` 패턴 반환

### Retrofit 코드 생성
- `@RestApi(baseUrl: '')` — baseUrl은 Dio에서 관리
- 응답 모델은 freezed + json_serializable
- `build_runner watch` 로 개발 중 자동 생성

### 연결 상태
- `connectivity_plus` → 네트워크 상태 실시간 감지
- 오프라인 시 요청 큐잉, 연결 복구 시 자동 재시도
- UI에 오프라인 배너 표시

### 캐시
- `dio_cache_interceptor` → GET 응답 캐시
- `ETag`/`Last-Modified` 헤더 활용
- 오프라인 시 캐시 fallback

## Checklist

| Priority | Item |
|----------|------|
| CRITICAL | Dio 싱글톤 인스턴스 Riverpod Provider로 관리 |
| CRITICAL | Interceptor 순서: Auth → Retry → Logging → Error Transform |
| CRITICAL | DioException → 도메인 NetworkFailure 변환 처리 |
| HIGH | Auth 인터셉터에서 401 → 토큰 리프레시 → 재요청 |
| HIGH | Retry 인터셉터: 지수 백오프, 5xx/timeout만, 최대 3회 |
| HIGH | Retrofit @RestApi 응답 타입을 freezed 모델로 정의 |
| HIGH | connectivity_plus로 오프라인 감지 + UI 배너 |
| MEDIUM | 오프라인 요청 큐 + 연결 복구 시 자동 재시도 |
| MEDIUM | GET 응답 캐시 (dio_cache_interceptor) |
| MEDIUM | 환경별 baseUrl 분리 (dev/staging/prod) |
| MEDIUM | Release 빌드에서 Logging 인터셉터 비활성화 |

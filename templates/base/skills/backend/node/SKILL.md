---
name: node
description: Node.js 백엔드 개발 가이드라인 (Hono Framework). 비동기 우선, Zod 타입 안전, Clean Architecture 레이어 분리.
version: "1.0.0"
tags: [nodejs, hono, backend]
user-invocable: false
---

# Node.js Backend Guidelines (Hono)

Node.js 기반 백엔드 서비스 개발 가이드라인 (Hono 프레임워크 중심).

## Philosophy

- 비동기 우선 - 블로킹 작업 피하기
- 에러는 명시적으로 처리
- 환경 분리 - 설정은 환경변수로
- 타입 안전한 API - Zod로 검증
- 레이어 분리 - Clean Architecture

## Project Structure

아키텍처 설정에 따라 결정:
- Clean Architecture: `architectures/clean/backend.xml`
- Hexagonal Architecture: `architectures/hexagonal/backend.xml`

## Rules

| Priority | Rule | Description |
|----------|------|-------------|
| CRITICAL | [hono-app-setup](rules/hono-app-setup.md) | Hono 앱 설정, 미들웨어, 라우트, Zod 검증 |
| CRITICAL | [error-handling](rules/error-handling.md) | AppError 계층 + 글로벌 에러 핸들러 |
| CRITICAL | [async-patterns](rules/async-patterns.md) | Promise.all, waterfall 방지, 트랜잭션 |
| HIGH | [jwt-auth](rules/jwt-auth.md) | JWT 미들웨어, RBAC, 토큰 생성/갱신 |
| HIGH | [env-config](rules/env-config.md) | Zod 환경변수 검증 |
| MEDIUM | [middleware](rules/middleware.md) | Rate Limiting, Request Logging |
| MEDIUM | [testing](rules/testing.md) | Hono API 테스트 + Service 유닛 테스트 |
| LOW | [deployment](rules/deployment.md) | Graceful Shutdown |

## Quick Rules

### 비동기
- async/await 사용, 콜백 금지
- 독립 작업은 Promise.all로 병렬
- Waterfall 방지 (Promise 먼저 시작, 나중에 await)
- 동기 파일 I/O 금지 (fs.readFileSync)

### 보안
- 환경변수 Zod 검증 (앱 시작 시 실패)
- 입력 검증 (zValidator)
- JWT HttpOnly 쿠키로 Refresh Token 관리
- Rate Limiting 적용
- 에러 메시지에 민감 정보 제외
- 하드코딩된 시크릿 금지

### 구조
- Clean Architecture 레이어 분리
- Repository 패턴 (DI)
- 글로벌 에러 핸들러
- 커스텀 에러 클래스 계층

### Hono
- 타입 안전한 라우트 정의
- zValidator로 요청 검증
- 미들웨어로 공통 로직 처리
- 일관된 응답 형식 `{ success, data, error }`

## Checklist

| Priority | Item |
|----------|------|
| CRITICAL | Zod 입력 검증 (zValidator) |
| CRITICAL | 글로벌 에러 핸들러 |
| CRITICAL | 환경변수 Zod 검증 |
| CRITICAL | Waterfall 제거 (Promise.all) |
| HIGH | Clean Architecture 레이어 분리 |
| HIGH | 커스텀 에러 클래스 |
| HIGH | JWT 인증 (HttpOnly Refresh Token) |
| HIGH | Rate Limiting |
| MEDIUM | Request Logging (구조화 로그) |
| MEDIUM | Graceful Shutdown |

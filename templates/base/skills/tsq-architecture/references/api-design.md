---
title: RESTful API Design Guide
category: guide
source: internal
---

# RESTful API Design Guide

REST API URL 패턴, 응답 형식, 에러 코드 설계 가이드.

## URL Patterns

| Method | Path | 용도 |
|--------|------|------|
| GET | `/api/v1/{resource}` | 목록 조회 |
| GET | `/api/v1/{resource}/:id` | 단일 조회 |
| POST | `/api/v1/{resource}` | 생성 |
| PUT | `/api/v1/{resource}/:id` | 전체 수정 |
| PATCH | `/api/v1/{resource}/:id` | 부분 수정 |
| DELETE | `/api/v1/{resource}/:id` | 삭제 |

## Response Format

### Success
```json
{
  "success": true,
  "data": { ... },
  "error": null,
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 100
  }
}
```

### Error
```json
{
  "success": false,
  "data": null,
  "error": {
    "code": "AUTH_001",
    "message": "Invalid credentials",
    "details": { ... }
  }
}
```

## Key Principles

- 리소스 중심 URL 설계 (동사 X, 명사 O)
- HTTP 메서드로 동작 표현 (GET=조회, POST=생성, PUT/PATCH=수정, DELETE=삭제)
- 일관된 응답 형식 (success/data/error 구조)
- 버전 관리 (`/api/v1/`)
- 적절한 HTTP 상태 코드 사용

## Common Pitfalls

- URL에 동사 사용 (`/api/getUsers` → `/api/v1/users`)
- 일관성 없는 에러 응답 형식
- 페이지네이션 미구현 (대량 데이터 성능 이슈)
- 버전 없는 API → 하위 호환성 깨짐

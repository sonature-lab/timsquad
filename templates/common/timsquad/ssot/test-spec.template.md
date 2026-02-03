---
title: "테스트 명세서 (Test Specification)"
version: 1.0.0
last_updated: {{DATE}}
author: tsq-qa
status: draft
project: {{PROJECT_NAME}}
---

# 테스트 명세서 (Test Specification)

> 테스트 전략, 테스트 케이스, 품질 기준을 정의합니다.
> QA 에이전트와 Developer가 참조하는 테스트 가이드라인입니다.

---

## 1. 테스트 전략

### 1.1 테스트 피라미드

```
         /\
        /E2E\        10%  - 핵심 사용자 흐름
       /──────\
      /Integration\   20%  - API, 서비스 간 연동
     /──────────────\
    /    Unit Tests  \  70%  - 함수, 클래스 단위
   ────────────────────
```

### 1.2 테스트 유형별 목표

| 테스트 유형 | 범위 | 목표 커버리지 | 실행 시점 |
|-----------|------|:-----------:|----------|
| Unit | 함수, 클래스 | 80% | 커밋 전 |
| Integration | API, DB 연동 | 70% | PR 시 |
| E2E | 사용자 시나리오 | 핵심 흐름 100% | 배포 전 |
| Performance | 부하, 응답시간 | NFR 충족 | 릴리스 전 |
| Security | 취약점 | OWASP Top 10 | 릴리스 전 |

### 1.3 테스트 환경

| 환경 | 용도 | DB | 외부 연동 |
|-----|------|-----|----------|
| Local | 개발 중 테스트 | SQLite/Docker | Mock |
| CI | 자동화 테스트 | Test DB | Mock |
| Staging | 통합 테스트 | Staging DB | Sandbox |
| Production | 스모크 테스트 | Prod DB (읽기) | Real |

---

## 2. 테스트 컨벤션

### 2.1 파일 명명 규칙

| 테스트 유형 | 파일 패턴 | 예시 |
|-----------|----------|------|
| Unit | `*.test.ts`, `*.spec.ts` | `user.service.test.ts` |
| Integration | `*.integration.test.ts` | `auth.integration.test.ts` |
| E2E | `*.e2e.test.ts` | `login.e2e.test.ts` |

### 2.2 테스트 구조 (AAA / Given-When-Then)

```typescript
describe('UserService', () => {
  describe('createUser', () => {
    it('should create a user with valid data', () => {
      // Arrange (Given)
      const userData = { email: 'test@example.com', name: 'Test' };

      // Act (When)
      const result = userService.createUser(userData);

      // Assert (Then)
      expect(result).toHaveProperty('id');
      expect(result.email).toBe(userData.email);
    });

    it('should throw error when email is invalid', () => {
      // Arrange
      const invalidData = { email: 'invalid', name: 'Test' };

      // Act & Assert
      expect(() => userService.createUser(invalidData))
        .toThrow('Invalid email format');
    });
  });
});
```

### 2.3 테스트 네이밍

```
[테스트 대상] should [기대 동작] when [조건]
```

| 예시 |
|------|
| `createUser should return user with id when valid data provided` |
| `login should throw AuthError when password is wrong` |
| `getOrders should return empty array when user has no orders` |

---

## 3. 테스트 케이스

### 3.1 기능별 테스트 케이스

#### TC-001: [기능명] 테스트

| 항목 | 내용 |
|-----|------|
| **관련 기능** | [FS-001](./functional-spec.md#FS-001) |
| **관련 API** | [POST /api/auth/login](./service-spec.md) |
| **우선순위** | High |

##### 테스트 시나리오

| TC ID | 시나리오 | 입력 | 기대 결과 | 우선순위 |
|-------|---------|------|----------|:--------:|
| TC-001-01 | 정상 로그인 | 유효한 이메일/비밀번호 | 200 + 토큰 반환 | High |
| TC-001-02 | 잘못된 비밀번호 | 유효한 이메일 + 틀린 비밀번호 | 401 + AUTH_001 | High |
| TC-001-03 | 존재하지 않는 사용자 | 미등록 이메일 | 401 + AUTH_002 | High |
| TC-001-04 | 이메일 형식 오류 | 잘못된 이메일 형식 | 400 + VALIDATION_001 | Medium |
| TC-001-05 | 빈 비밀번호 | 이메일만 입력 | 400 + VALIDATION_002 | Medium |
| TC-001-06 | 계정 잠금 | 5회 실패한 계정 | 403 + AUTH_003 | High |

##### 테스트 데이터

```json
{
  "validUser": {
    "email": "test@example.com",
    "password": "Test1234!"
  },
  "invalidUser": {
    "email": "wrong@example.com",
    "password": "wrong"
  },
  "lockedUser": {
    "email": "locked@example.com",
    "password": "any"
  }
}
```

---

### 3.2 API 테스트 매트릭스

| API | Happy Path | Invalid Input | Auth Error | Not Found | Server Error |
|-----|:----------:|:-------------:|:----------:|:---------:|:------------:|
| POST /auth/login | ✅ | ✅ | ✅ | N/A | ✅ |
| GET /users/:id | ✅ | ✅ | ✅ | ✅ | ✅ |
| POST /orders | ✅ | ✅ | ✅ | N/A | ✅ |

---

## 4. 비기능 테스트

### 4.1 성능 테스트

| 테스트 | 조건 | 기준 | 도구 |
|-------|------|------|------|
| 응답 시간 | 일반 요청 | < 200ms (p95) | k6, Artillery |
| 처리량 | 동시 사용자 1000명 | > 500 RPS | k6 |
| 부하 | 피크 타임 시뮬레이션 | 에러율 < 1% | k6 |

### 4.2 보안 테스트

→ [security-spec.md](./security-spec.md) 참조

| 테스트 | 대상 | 도구 |
|-------|------|------|
| OWASP ZAP 스캔 | API 전체 | ZAP |
| 의존성 취약점 | npm packages | npm audit, Snyk |
| 코드 정적 분석 | 소스 코드 | ESLint security plugin |

---

## 5. 테스트 자동화

### 5.1 CI 파이프라인

```yaml
test:
  stages:
    - lint        # 코드 스타일 검사
    - unit        # 단위 테스트
    - integration # 통합 테스트
    - e2e         # E2E 테스트 (선택적)
    - coverage    # 커버리지 리포트
```

### 5.2 커버리지 기준

| 메트릭 | 최소 기준 | 목표 |
|-------|:--------:|:----:|
| Line Coverage | 80% | 90% |
| Branch Coverage | 70% | 80% |
| Function Coverage | 80% | 90% |

### 5.3 실패 시 조치

| 상황 | 조치 |
|-----|------|
| 커버리지 미달 | PR 머지 차단 |
| 테스트 실패 | PR 머지 차단 |
| 보안 취약점 (High) | 배포 차단 |

---

## 6. 테스트 리포트

### 6.1 리포트 항목

| 항목 | 설명 |
|-----|------|
| 총 테스트 수 | 실행된 테스트 케이스 수 |
| 성공/실패 | 통과/실패 테스트 수 |
| 커버리지 | 라인/브랜치/함수 커버리지 |
| 실행 시간 | 전체 테스트 실행 시간 |
| 실패 상세 | 실패한 테스트 목록 및 원인 |

### 6.2 리포트 템플릿

```markdown
## 테스트 리포트 - {{날짜}}

### 요약
- 총 테스트: XX개
- 성공: XX개 (XX%)
- 실패: XX개
- 스킵: XX개

### 커버리지
- Lines: XX%
- Branches: XX%
- Functions: XX%

### 실패 테스트
1. `test_name` - 실패 원인

### 성능 테스트
- P95 응답시간: XXms
- 처리량: XX RPS
```

---

## 7. 관련 문서

- [기능 명세](./functional-spec.md) - 테스트 대상 기능
- [서비스 명세](./service-spec.md) - API 테스트 기준
- [에러 코드](./error-codes.md) - 예상 에러 응답
- [보안 명세](./security-spec.md) - 보안 테스트 기준

---

## 변경 이력

| 버전 | 날짜 | 작성자 | 변경 내용 |
|------|------|--------|----------|
| 1.0.0 | {{DATE}} | tsq-qa | 초기 작성 |

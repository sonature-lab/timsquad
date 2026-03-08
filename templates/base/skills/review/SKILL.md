---
name: review
description: |
  교차 리뷰(Cross-Review) 스킬. 별도 서브에이전트(Task)로 코드 리뷰를 수행하여
  구조화된 리포트를 반환한다. 6가지 관점(보안, 타입, 에러, API, 테스트, 성능)으로 분석.
  `/review`로 호출하면 현재 변경 사항에 대한 교차 리뷰를 실행한다.
version: "1.0.0"
tags: [review, code-review, cross-review, quality]
depends_on: [coding, testing, security]
conflicts_with: []
user-invocable: true
context: fork
agent: Explore
allowed-tools: Read, Grep, Glob, Bash
argument-hint: "[파일패턴] — 변경 사항 교차 리뷰"
---

# Cross-Review

별도 서브에이전트로 교차 리뷰를 수행하여 자기검증의 맹점을 보완한다.

## Contract

- **Trigger**: `/review` 명시적 호출 시에만 실행 (자동 실행 아님)
- **Input**: `git diff` 변경 내용 또는 staged changes
- **Output**: severity별 구조화된 리뷰 리포트 (파일:라인 참조 포함)
- **Error**: 리뷰 대상 없음 시 "변경 사항 없음" 안내
- **Dependencies**: coding, testing, security

## Protocol

1. **변경 수집**: `git diff` 또는 staged changes로 리뷰 대상 수집
2. **격리 실행**: 별도 컨텍스트에서 리뷰 수행 (context: fork)
   - 리뷰어는 구현자와 독립된 컨텍스트에서 판단
   - 6가지 관점 체크리스트 기반 분석
3. **6가지 관점 분석**:
   - **보안**: OWASP Top 10, 시크릿 노출, injection, XSS
   - **타입 안전성**: any 타입, 타입 단언(as), 미검증 캐스팅
   - **에러 핸들링**: catch 누락, 에러 무시, 불완전한 에러 처리
   - **API 호환성**: 기존 인터페이스 변경, breaking changes
   - **테스트 커버리지**: 변경 코드의 테스트 존재 여부
   - **성능**: N+1 쿼리, 불필요한 리렌더링, 메모리 누수
4. **리포트 생성**: severity별 구조화된 결과 출력

## Verification

| Check | Method | Pass Criteria |
|-------|--------|---------------|
| 리뷰 실행 | 격리 컨텍스트 (fork) | 리포트 반환 |
| 관점 커버리지 | 6가지 관점 체크 | 모든 관점 포함 |
| severity 분류 | 구조화 리포트 | severity 태그 존재 |
| 파일/라인 참조 | 코드 위치 명시 | 정확한 위치 참조 |

## Quick Rules

### Report Format
```
## Review Report
### CRITICAL (즉시 수정)
- [CRITICAL] src/auth.ts:42 — SQL injection 가능성
### HIGH (머지 전 수정)
- [HIGH] src/api.ts:15 — 에러 핸들링 누락
### MEDIUM (개선 권장)
- [MEDIUM] src/utils.ts:8 — any 타입 사용
### LOW (참고)
- [LOW] src/config.ts:3 — 매직넘버 사용
```

### 원칙
- `/review` 명시 호출만 실행 (토큰 절약)
- critical 발견 시 즉시 알림
- 리뷰어는 구현자와 다른 컨텍스트(fork)에서 수행

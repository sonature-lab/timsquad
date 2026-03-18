---
name: tsq-audit
description: |
  코드 감사 스킬. 변경 파일 기반으로 관련 스킬 Verification 자동 실행 + 6관점 분석 + severity별 리포트.
  자기감사(self-audit)와 교차리뷰(cross-review)를 통합.
  Use when: `/tsq-audit` 호출 시, Phase gate 전 품질 확인 시, 코드 리뷰 요청 시, PR 리뷰 시.
version: "2.0.0"
tags: [tsq, audit, review, verification, quality, code-review]
user-invocable: true
context: fork
allowed-tools: Read, Grep, Glob, Bash
argument-hint: "[대상] — 변경 사항 감사/리뷰"
---

# Code Audit

변경 파일 기반 감사를 수행하여 품질 게이트를 통과하도록 돕는다.
별도 컨텍스트(fork)에서 실행하여 구현자와 독립된 판단을 보장한다.

## Contract

- **Trigger**: `/tsq-audit` 호출 또는 Phase gate 전 품질 확인
- **Input**: 현재 변경 파일 목록 + 관련 스킬 Verification
- **Output**: 스킬별 Verification 결과 + 6관점 severity별 리포트
- **Error**: Verification 실패 시 해당 항목 + 수정 가이드 출력
- **Dependencies**: coding, testing, security

## Protocol

1. **변경 수집**: `git diff --name-only` 또는 staged changes로 대상 수집
2. **스킬 매칭**: 변경 파일 확장자/경로 기반으로 관련 스킬 자동 감지
   - `.ts/.tsx` → coding, typescript 스킬
   - `test` 포함 경로 → testing 스킬
   - `security`, `auth`, `middleware` → security 스킬
   - `.sh` 파일 → security 스킬 (shellcheck)
   - `schema`, `migration` → database 스킬
3. **Verification 실행**: 매칭된 각 스킬의 Verification 테이블에서 Command 실행
4. **6관점 분석**: 변경 코드를 아래 관점에서 분석
5. **리포트 생성**: severity별 구조화된 결과 출력

## 6관점 분석

| 관점 | 점검 항목 |
|------|----------|
| **보안** | OWASP Top 10, 시크릿 노출, injection, XSS |
| **타입 안전성** | any 타입, 타입 단언(as), 미검증 캐스팅 |
| **에러 핸들링** | catch 누락, 에러 무시, 불완전한 에러 처리 |
| **API 호환성** | 기존 인터페이스 변경, breaking changes |
| **테스트 커버리지** | 변경 코드의 테스트 존재 여부 |
| **성능** | N+1 쿼리, 불필요한 리렌더링, 메모리 누수 |

## Report Format

```
## Audit Report
### CRITICAL (즉시 수정)
- [CRITICAL] src/auth.ts:42 — SQL injection 가능성
### HIGH (머지 전 수정)
- [HIGH] src/api.ts:15 — 에러 핸들링 누락
### MEDIUM (개선 권장)
- [MEDIUM] src/utils.ts:8 — any 타입 사용
### LOW (참고)
- [LOW] src/config.ts:3 — 매직넘버 사용
```

## Verification

| Check | Command | Pass Criteria |
|-------|---------|---------------|
| 변경 파일 감지 | `git diff --name-only` | 1개 이상 변경 파일 |
| 스킬 Verification | 관련 스킬 체크 실행 | 모든 체크 통과 |
| 6관점 커버리지 | 6가지 관점 체크 | 모든 관점 포함 |
| severity 분류 | 구조화 리포트 | severity 태그 존재 |
| 파일/라인 참조 | 코드 위치 명시 | 정확한 위치 참조 |

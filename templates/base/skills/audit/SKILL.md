---
name: audit
description: |
  자기감사(Self-Audit) 스킬. 현재 변경 파일 기반으로 관련 스킬의 Verification을 실행하고,
  보안/호환성/에지케이스 리마인더를 제공한다. `tsq audit validate`와 연동.
  `/audit`으로 호출하면 변경 사항에 대한 체계적 자기검증을 수행한다.
version: "1.0.0"
tags: [audit, verification, quality, self-check]
depends_on: [coding, testing, security]
conflicts_with: []
user-invocable: true
context: fork
allowed-tools: Read, Grep, Glob, Bash
argument-hint: "[대상] — 변경 파일 자기감사"
---

# Self-Audit

변경 파일 기반 자기감사를 수행하여 품질 게이트를 통과하도록 돕는다.

## Contract

- **Trigger**: `/audit` 호출 또는 Phase gate 전 품질 확인
- **Input**: 현재 변경 파일 목록 + 관련 스킬 Verification
- **Output**: 스킬별 Verification 결과 + 4카테고리 리마인더 + tsq audit 결과
- **Error**: Verification 실패 시 해당 항목 + 수정 가이드 출력
- **Dependencies**: coding, testing, security

## Protocol

1. **변경 감지**: `git diff --name-only` 또는 `git status`로 변경 파일 수집
2. **스킬 매칭**: 변경 파일 확장자/경로 기반으로 관련 스킬 자동 감지
   - `.ts/.tsx` → coding, typescript 스킬
   - `test` 포함 경로 → testing 스킬
   - `security`, `auth`, `middleware` → security 스킬
   - `.sh` 파일 → security 스킬 (shellcheck)
   - `schema`, `migration` → database 스킬
3. **Verification 실행**: 매칭된 각 스킬의 Verification 테이블에서 Command 실행
   - 각 체크의 pass/fail 결과를 구조화하여 출력
4. **tsq audit validate**: 감사 리포트가 존재하면 `tsq audit validate` 실행
5. **리마인더 출력**: 아래 4카테고리를 변경 내용 기준으로 점검
6. **결과 리포트**: pass/fail 요약 + 리마인더를 구조화하여 출력

## Verification

| Check | Command | Pass Criteria |
|-------|---------|---------------|
| 변경 파일 감지 | `git diff --name-only` | 1개 이상 변경 파일 |
| 스킬 Verification | 관련 스킬 체크 실행 | 모든 체크 통과 |
| tsq audit | `tsq audit validate` | exit code 0 |
| 리마인더 | 4카테고리 점검 | 모든 카테고리 확인 |

## Quick Rules

### 리마인더 4카테고리
- **보안**: 시크릿 노출, injection, 권한 검증, OWASP Top 10
- **호환성**: 기존 API/인터페이스 변경, breaking changes, 타입 변경
- **에지케이스**: null/undefined, 빈 배열, 경계값, 동시성
- **성능**: N+1 쿼리, 불필요한 리렌더링, 대용량 처리, 메모리 누수

### 출력 형식
```
[AUDIT] 변경 파일: N개 | 매칭 스킬: {skills}
[CHECK] {skill} — {check}: PASS/FAIL
[REMINDER] 보안: {items} | 호환성: {items} | 에지: {items} | 성능: {items}
```

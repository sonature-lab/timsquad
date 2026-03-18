---
name: tsq-testing
description: |
  테스트 전략·도구·패턴 가이드라인. 테스트 피라미드, Given-When-Then 패턴, 커버리지 기준.
  방법론(Red-Green-Refactor 사이클)은 tsq-tdd 스킬 참조.
  Use when: 테스트 작성, 단위 테스트, 통합 테스트, E2E, 커버리지, 테스트 구조 설계 시.
version: "1.0.0"
tags: [tsq, testing, tdd, quality]
user-invocable: false
---

# Testing

품질 보장을 위한 테스트 작성 가이드라인.

## Philosophy

- Red-Green-Refactor (TDD 사이클) 준수
- 테스트 피라미드: Unit(다수) > Integration(중간) > E2E(소수)
- 행동(behavior) 테스트 — 구현 디테일이 아닌 결과 검증

## Contract

- **Trigger**: 테스트 작성/수정 태스크, 코드 변경 후 테스트 필요 시
- **Input**: 테스트 대상 코드 + 요구사항
- **Output**: Given-When-Then 패턴 테스트 + 커버리지 기준 충족
- **Error**: 커버리지 미달 시 추가 테스트 작성
- **Dependencies**: 없음

## Protocol

1. **Red**: 실패하는 테스트 작성
2. **Green**: 테스트를 통과하는 최소 코드 작성
3. **Refactor**: 코드 정리 (테스트는 계속 통과)
4. **Coverage 확인**: 기준 충족 여부 점검

## Verification

| Check | Command | Pass Criteria |
|-------|---------|---------------|
| 테스트 실행 | `npm test` | exit code 0 |
| 라인 커버리지 | coverage report | >= 80% |
| 브랜치 커버리지 | coverage report | >= 70% |
| 3카테고리 | 수동 검증 | Happy/Edge/Error 포함 |

## Resources

| Priority | Type | Resource | Description |
|----------|------|----------|-------------|
| HIGH | ref | [testing-patterns](references/testing-patterns.md) | Given-When-Then, Mock 가이드 |
| HIGH | ref | [e2e-stability](references/e2e-stability.md) | E2E Viewport, Wait, Retry 가이드 |

## Quick Rules

### Test Naming
- 형식: `should {expected behavior} when {condition}`
- Bad: `test getUser`, `works correctly`

### Test Categories
- **Happy Path** — 정상 흐름
- **Edge Cases** — 경계 조건 (빈 문자열, 0, null, 최대값)
- **Error Cases** — 오류 상황

### Coverage Standards
| Metric | Min | Recommended |
|--------|-----|-------------|
| Line | 80% | 90% |
| Branch | 70% | 80% |
| Function | 80% | 90% |

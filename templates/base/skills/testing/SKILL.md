---
name: testing
description: |
  테스트 작성 규칙 및 패턴 가이드라인.
  TDD 사이클, 테스트 피라미드, Given-When-Then 패턴, 커버리지 기준을 다룸.
  Use when: "테스트 작성, TDD, 단위 테스트, 통합 테스트, E2E, 커버리지"
version: "1.0.0"
tags: [testing, tdd, quality]
user-invocable: false
---

# Testing

품질 보장을 위한 테스트 작성 가이드라인.

## Philosophy

- Red-Green-Refactor (TDD 사이클) 준수
- 테스트 피라미드: Unit(다수) > Integration(중간) > E2E(소수)
- 행동(behavior) 테스트 — 구현 디테일이 아닌 결과 검증

## Resources

| Priority | Type | Resource | Description |
|----------|------|----------|-------------|
| HIGH | ref | [testing-patterns](references/testing-patterns.md) | Given-When-Then, Mock 가이드, 카테고리별 예시 |

## Quick Rules

### TDD Cycle
1. **Red** — 실패하는 테스트 작성
2. **Green** — 테스트를 통과하는 최소 코드 작성
3. **Refactor** — 코드 정리 (테스트는 계속 통과)

### Test Naming
- 형식: `should {expected behavior} when {condition}`
- Good: `should return null when user is not found`
- Bad: `test getUser`, `works correctly`

### Test Categories
모든 테스트는 3가지 카테고리 커버:
- **Happy Path** — 정상 흐름
- **Edge Cases** — 경계 조건 (빈 문자열, 0, null, 최대값)
- **Error Cases** — 오류 상황

### Coverage Standards

| Metric | Minimum | Recommended |
|--------|---------|-------------|
| Line Coverage | 80% | 90% |
| Branch Coverage | 70% | 80% |
| Function Coverage | 80% | 90% |

## Checklist

| Priority | Item |
|----------|------|
| CRITICAL | Given-When-Then 패턴을 따르는가 |
| CRITICAL | Happy path, Edge case, Error case 커버하는가 |
| HIGH | 테스트 이름이 `should...when...` 형식인가 |
| HIGH | 커버리지 기준을 충족하는가 |
| MEDIUM | Mock이 적절히 사용되었는가 (외부 서비스만) |
| MEDIUM | 테스트가 독립적인가 (순서 무관) |

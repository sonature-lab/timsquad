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

## E2E Stability Guide

### Viewport & Selectors
- 테스트 전 `page.setViewportSize({ width: 1280, height: 720 })` 고정
- `data-testid` 셀렉터 사용 — CSS 클래스/태그 기반 셀렉터 금지
- `getByRole`, `getByText` 등 의미 기반 셀렉터 우선

### Serial Execution
- E2E 테스트는 `describe.serial` 또는 `--shard` 사용
- 상태 의존 테스트는 반드시 순서 보장 (`test.describe.configure({ mode: 'serial' })`)

### Wait Strategy
- `waitForSelector` 대신 `waitForLoadState('networkidle')` + assertion
- 하드코딩 `sleep`/`setTimeout` 절대 사용 금지
- 동적 콘텐츠: `expect(locator).toBeVisible({ timeout: 10000 })`

### Retry & Flakiness
- Playwright `retries: 2` 설정 (CI 환경)
- flaky 테스트 발견 시 `test.fixme()` 마킹 후 원인 분석
- 재시도 성공도 flaky로 기록 → `.e2e-passed` 마커에 `flaky` 카운트 포함

### Timeout Standards

| Category | Timeout | Rationale |
|----------|---------|-----------|
| Unit Test | 120s | 빠른 피드백 |
| E2E Test | 300s | 네트워크/렌더링 대기 |
| Build | 180s | 컴파일 + 번들링 |

## Checklist

| Priority | Item |
|----------|------|
| CRITICAL | Given-When-Then 패턴을 따르는가 |
| CRITICAL | Happy path, Edge case, Error case 커버하는가 |
| HIGH | 테스트 이름이 `should...when...` 형식인가 |
| HIGH | 커버리지 기준을 충족하는가 |
| MEDIUM | Mock이 적절히 사용되었는가 (외부 서비스만) |
| MEDIUM | 테스트가 독립적인가 (순서 무관) |

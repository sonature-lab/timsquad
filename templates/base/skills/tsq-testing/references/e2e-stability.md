---
title: E2E Stability Guide
category: reference
---

# E2E Stability Guide

## Viewport & Selectors
- 테스트 전 `page.setViewportSize({ width: 1280, height: 720 })` 고정
- `data-testid` 셀렉터 사용 — CSS 클래스/태그 기반 셀렉터 금지
- `getByRole`, `getByText` 등 의미 기반 셀렉터 우선

## Serial Execution
- E2E 테스트는 `describe.serial` 또는 `--shard` 사용
- 상태 의존 테스트는 반드시 순서 보장 (`test.describe.configure({ mode: 'serial' })`)

## Wait Strategy
- `waitForSelector` 대신 `waitForLoadState('networkidle')` + assertion
- 하드코딩 `sleep`/`setTimeout` 절대 사용 금지
- 동적 콘텐츠: `expect(locator).toBeVisible({ timeout: 10000 })`

## Retry & Flakiness
- Playwright `retries: 2` 설정 (CI 환경)
- flaky 테스트 발견 시 `test.fixme()` 마킹 후 원인 분석
- 재시도 성공도 flaky로 기록 → `.e2e-passed` 마커에 `flaky` 카운트 포함

## Timeout Standards

| Category | Timeout | Rationale |
|----------|---------|-----------|
| Unit Test | 120s | 빠른 피드백 |
| E2E Test | 300s | 네트워크/렌더링 대기 |
| Build | 180s | 컴파일 + 번들링 |

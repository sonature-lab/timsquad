---
name: dart
description: Dart 언어 가이드라인. Sound null safety, 패턴 매칭, sealed class, 비동기 프로그래밍, Effective Dart 스타일.
version: "1.0.0"
tags: [dart, language, null-safety, async]
user-invocable: false
---

# Dart Language Guidelines

Dart 3+ 기반 언어 패턴과 컨벤션. Flutter/서버 공통 적용.

## Philosophy

- Null safety는 타협 없음 — `!` 대신 패턴으로 해결
- 비동기는 구조화 — Future 체이닝보다 async/await
- Sealed class로 불가능한 상태를 불가능하게
- Effective Dart가 스타일 기준

## Rules

| Priority | Rule | Description |
|----------|------|-------------|
| CRITICAL | [null-safety](rules/null-safety.md) | Sound null safety 패턴, late/! 남용 방지 |
| CRITICAL | [async-patterns](rules/async-patterns.md) | Future, Stream, Isolate, 에러 전파 |
| HIGH | [type-system](rules/type-system.md) | Sealed class, 패턴 매칭, Records (Dart 3+) |
| HIGH | [code-style](rules/code-style.md) | Effective Dart, 네이밍, 문서화, linter 규칙 |

## Quick Rules

### Null Safety
- `String?` 사용 시 반드시 null 체크 후 접근
- `!` (bang operator) 금지 — if/case/??로 해결
- `late` 는 lifecycle이 보장될 때만 (initState 등)
- collection은 `whereType<T>()`로 null 필터링

### 비동기
- async/await 우선, then() 체이닝 금지
- 독립 작업은 `Future.wait([])` 로 병렬 실행
- Stream 구독은 반드시 cancel (dispose)
- 무거운 연산은 `Isolate.run()` 또는 `compute()`
- Zone.current로 에러 포착하지 말 것 — try/catch 명시

### 타입 시스템 (Dart 3+)
- `sealed class` 로 상태/에러 모델링 → switch exhaustive 체크
- Records `(int, String)` 로 경량 튜플
- 패턴 매칭 `if (value case Pattern())` 적극 활용
- `extension type` 으로 zero-cost wrapper (ID 타입 등)

### 스타일
- `dart_style` 포매터 + `analysis_options.yaml` strict
- lowerCamelCase (변수/함수), UpperCamelCase (클래스/enum)
- 공개 API에 `///` dartdoc 필수
- `part`/`part of` 금지 — 파일 분리로 해결

## Checklist

| Priority | Item |
|----------|------|
| CRITICAL | Bang operator (!) 없음 |
| CRITICAL | async/await 사용 (then 체이닝 없음) |
| CRITICAL | Stream 구독 dispose 처리 |
| CRITICAL | sealed class로 상태 모델링 |
| HIGH | Future.wait으로 병렬 처리 |
| HIGH | late 사용 최소화 (lifecycle 보장 시만) |
| HIGH | Effective Dart 네이밍 준수 |
| HIGH | 공개 API dartdoc 작성 |
| MEDIUM | extension type으로 ID 타입 래핑 |
| MEDIUM | analysis_options strict 모드 |

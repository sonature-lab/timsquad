---
name: coding
description: |
  코드 작성 규칙 및 패턴 가이드라인.
  네이밍 규칙, 함수 원칙, 에러 핸들링, 금지 패턴을 다룸.
  Use when: "코드 작성, 구현, 리팩토링, 네이밍, 코딩 컨벤션"
version: "1.0.0"
tags: [coding, conventions, naming]
depends_on: []
conflicts_with: []
user-invocable: false
---

# Coding Guidelines

코드 작성 시 일관된 컨벤션과 패턴을 적용한다.

## Philosophy

- 단일 책임: 함수는 한 가지 일만 수행
- 명확한 이름: 코드만 읽고도 동작을 파악 가능
- 명시적 에러 처리: 에러를 삼키지 않는다

## Contract

- **Trigger**: 코드 작성/수정 태스크
- **Input**: 구현 요구사항 + 기존 코드 컨텍스트
- **Output**: 컨벤션 준수 코드
- **Error**: 컨벤션 위반 시 수정 안내
- **Dependencies**: 없음

## Protocol

1. **컨벤션 확인**: 네이밍, 파일 구조 규칙 확인
2. **구현**: 단일 책임 원칙 준수하며 코드 작성
3. **린트**: `tsc --noEmit` + 린트 검증
4. **리뷰**: 금지 패턴(any, 매직넘버, console.log) 제거 확인

## Verification

| Check | Command | Pass Criteria |
|-------|---------|---------------|
| 타입 검사 | `tsc --noEmit` | exit code 0 |
| any 타입 | `grep -r "any" --include="*.ts"` | 0건 (신규 코드) |
| console.log | `grep -r "console.log" --include="*.ts"` | 0건 (신규 코드) |
| 함수 크기 | 수동 검증 | 20줄 이내 권장 |

## Resources

| Priority | Type | Resource | Description |
|----------|------|----------|-------------|
| HIGH | rule | [patterns](rules/patterns.md) | Error Handling, Repository, DTO, Anti-Patterns |

## Quick Rules

### 네이밍
| 대상 | 규칙 | 예시 |
|------|------|------|
| 클래스 | PascalCase | `UserService` |
| 함수/변수 | camelCase | `getUserById` |
| 상수 | UPPER_SNAKE | `MAX_RETRY_COUNT` |
| 파일 | kebab-case | `user-service.ts` |

### 금지
- `any` 타입 사용
- 매직 넘버/문자열 사용
- `console.log` 사용 (logger 사용)

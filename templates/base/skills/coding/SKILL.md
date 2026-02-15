---
name: coding
description: 코드 작성 규칙 및 패턴 가이드라인
version: "1.0.0"
tags: [coding, conventions, naming]
user-invocable: false
---

# Coding Guidelines

## 네이밍 규칙

| 대상 | 규칙 | 예시 |
|------|------|------|
| 클래스 | PascalCase | `UserService`, `OrderRepository` |
| 함수/메서드 | camelCase | `getUserById`, `calculateTotal` |
| 변수 | camelCase | `userName`, `totalAmount` |
| 상수 | UPPER_SNAKE | `MAX_RETRY_COUNT`, `API_BASE_URL` |
| 파일 | kebab-case | `user-service.ts`, `order-repository.ts` |

## 함수 원칙
- **단일 책임**: 함수는 한 가지 일만 수행
- **명확한 이름**: 함수 이름만으로 동작 파악 가능
- **적절한 크기**: 20줄 이내 권장

## Rules

### 필수
- 함수가 단일 책임을 가지는가
- 네이밍이 명확하고 일관적인가
- 에러가 명시적으로 처리되는가

### 금지
- `any` 타입 사용
- 매직 넘버/문자열 사용
- `console.log` 사용 (logger 사용)

## Checklist
- [ ] 함수가 단일 책임
- [ ] 네이밍이 명확하고 일관적
- [ ] 에러가 명시적으로 처리됨
- [ ] any 타입 없음
- [ ] 매직 넘버/문자열 없음
- [ ] console.log 없음

## 참조
- `rules/patterns.md` — Error Handling, Repository, DTO/Entity, 의존성 주입, Anti-Patterns

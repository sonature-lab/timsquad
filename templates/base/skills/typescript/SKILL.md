---
name: typescript
description: TypeScript 개발 가이드라인
version: "1.0.0"
tags: [typescript, types, strict]
user-invocable: false
---

# TypeScript Guidelines

## 철학
- 타입은 문서다 — 코드만 봐도 의도 파악
- 컴파일 타임에 버그를 잡는다
- any는 타입 시스템 포기 선언

## 필수 설정 (tsconfig.json)
```json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true
  }
}
```

## 핵심 패턴 (상세: `rules/type-patterns.md`)

| 패턴 | 용도 |
|------|------|
| Discriminated Union | 상태 표현 (불가능한 상태를 불가능하게) |
| Type Narrowing | typeof, in, type guard로 안전한 접근 |
| Branded Types | 같은 원시 타입이지만 의미 구분 (UserId vs OrderId) |
| Template Literal Types | 문자열 패턴 타입 강제 |
| Infer | 조건부 타입에서 타입 추출 |
| Zod | 외부 입력 런타임 검증 + 타입 추출 |

## Rules

### 필수
- strict 모드 사용
- 함수 반환 타입 명시
- 외부 입력(API, 사용자)은 Zod로 런타임 검증
- Discriminated Union으로 상태 표현
- Branded Types로 ID 타입 구분

### 금지
- `any` 사용 → `unknown` + type guard
- 타입 단언 남용 (`as Type`)
- `@ts-ignore`, `@ts-expect-error` 남용
- `!` non-null assertion 남용

## Checklist
- [ ] strict 모드 활성화
- [ ] any 타입 없음
- [ ] 함수 반환 타입 명시
- [ ] 외부 입력 Zod 검증
- [ ] Discriminated Union으로 상태 표현
- [ ] Branded Types로 ID 구분

## 참조
- `rules/type-patterns.md` — 각 패턴의 코드 예시
- `rules/utility-types.md` — DTO 조합, DeepPartial, 타입 안전 API 클라이언트

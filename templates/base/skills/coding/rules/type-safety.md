---
title: TypeScript Type Safety
impact: HIGH
tags: coding, typescript, type-safety
---

# TypeScript Type Safety

## Strict Mode

```jsonc
// tsconfig.json — 최소 필수 설정
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true
  }
}
```

## Avoid `any`

```typescript
// Bad: any는 타입 검사를 무력화
function process(data: any) { return data.name; }

// Good: 제네릭 또는 unknown 사용
function process<T extends { name: string }>(data: T) { return data.name; }

// Good: unknown + 타입 가드
function process(data: unknown): string {
  if (typeof data === 'object' && data !== null && 'name' in data) {
    return (data as { name: string }).name;
  }
  throw new Error('Invalid data');
}
```

## Discriminated Unions

```typescript
// 상태별 안전한 분기 처리
type Result<T> =
  | { status: 'success'; data: T }
  | { status: 'error'; error: AppError }
  | { status: 'loading' };

function handle(result: Result<User>) {
  switch (result.status) {
    case 'success': return render(result.data);  // data 타입 보장
    case 'error':   return showError(result.error);
    case 'loading': return showSpinner();
  }
  // exhaustiveness check: 누락된 case가 있으면 컴파일 에러
  const _exhaustive: never = result;
}
```

## Branded Types

```typescript
// 같은 string이지만 혼용 방지
type UserId = string & { readonly __brand: 'UserId' };
type OrderId = string & { readonly __brand: 'OrderId' };

function createUserId(id: string): UserId { return id as UserId; }
function createOrderId(id: string): OrderId { return id as OrderId; }

function getUser(id: UserId) { /* ... */ }

const userId = createUserId('u-123');
const orderId = createOrderId('o-456');
getUser(userId);   // OK
// getUser(orderId); // Compile error
```

## Rules

| Rule | Description |
|------|-------------|
| any 사용 금지 | eslint no-explicit-any 활성화 |
| as 캐스팅 최소화 | 타입 가드 또는 제네릭으로 대체 |
| union exhaustiveness | switch문에 never 체크 포함 |
| optional vs undefined | 선택 속성과 undefined 값을 구분 |

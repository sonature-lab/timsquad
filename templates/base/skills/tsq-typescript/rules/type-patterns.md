---
title: TypeScript Type Patterns
impact: HIGH
tags: typescript, types, patterns
---

# TypeScript Type Patterns

## Discriminated Union (상태 표현의 정석)
status 필드로 타입을 구분하여 불가능한 상태를 불가능하게.

```typescript
// Bad: 불가능한 상태가 가능함
interface ApiResponse { data?: User; error?: string; loading: boolean; }

// Good: 불가능한 상태는 타입으로 불가능
type ApiResponse<T> =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; data: T }
  | { status: 'error'; error: Error };

function renderUser(state: ApiResponse<User>) {
  switch (state.status) {
    case 'idle': return null;
    case 'loading': return <Spinner />;
    case 'success': return <UserCard user={state.data} />;
    case 'error': return <ErrorMessage error={state.error} />;
  }
}
```

## Type Narrowing (타입 좁히기)

```typescript
// typeof narrowing
function process(value: string | number) {
  if (typeof value === 'string') return value.toUpperCase();
  return value.toFixed(2);
}

// in narrowing
function move(animal: Fish | Bird) {
  if ('swim' in animal) animal.swim();
  else animal.fly();
}

// Custom Type Guard
function isError(value: unknown): value is Error {
  return value instanceof Error;
}

// Assertion Function
function assertDefined<T>(value: T | null | undefined): asserts value is T {
  if (value === null || value === undefined) throw new Error('Value is not defined');
}
```

## Branded Types (타입 브랜딩)
같은 원시 타입이지만 의미가 다른 값을 구분.

```typescript
type UserId = string & { readonly __brand: 'UserId' };
type OrderId = string & { readonly __brand: 'OrderId' };

function createUserId(id: string): UserId {
  if (!id.startsWith('user-')) throw new Error('Invalid user ID format');
  return id as UserId;
}

function getUser(id: UserId): Promise<User> { ... }
function getOrder(id: OrderId): Promise<Order> { ... }

getUser(userId);   // ✅ OK
getUser(orderId);  // ❌ Type Error!

// 응용
type Money = number & { readonly __brand: 'Money' };
type Email = string & { readonly __brand: 'Email' };
```

## Template Literal Types

```typescript
type ApiPath = `/api/${string}`;
fetchApi('/api/users');  // ✅
fetchApi('/users');      // ❌

type CSSUnit = `${number}${'px' | 'rem' | 'em' | '%'}`;
const width: CSSUnit = '100px';  // ✅
```

## Infer로 타입 추출

```typescript
type Awaited<T> = T extends Promise<infer U> ? U : T;
type ArrayElement<T> = T extends (infer U)[] ? U : never;
type FirstArg<T> = T extends (first: infer F, ...args: any[]) => any ? F : never;

// API 응답에서 data 타입 추출
type ApiResponse<T> = { success: true; data: T } | { success: false; error: string };
type ExtractData<T> = T extends { success: true; data: infer D } ? D : never;
```

## Zod 런타임 검증
외부 입력은 타입만으로 부족, 런타임 검증 필요.

```typescript
import { z } from 'zod';

const userSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  name: z.string().min(2).max(50),
  role: z.enum(['admin', 'user', 'guest']),
});

type User = z.infer<typeof userSchema>;

// API 핸들러
async function createUser(req: Request) {
  const result = userSchema.safeParse(req.body);
  if (!result.success) return { error: result.error.format() };
  const user = result.data;
  await db.user.create({ data: user });
}

// 환경변수 검증
const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  JWT_SECRET: z.string().min(32),
  PORT: z.coerce.number().default(3000),
});
export const env = envSchema.parse(process.env);
```

---
title: TypeScript Utility Types & Advanced Patterns
impact: HIGH
tags: typescript, utility-types, advanced
---

# TypeScript Utility Types & Advanced Patterns

## DTO 타입 조합

```typescript
interface User {
  id: string;
  email: string;
  name: string;
  password: string;
  createdAt: Date;
  updatedAt: Date;
}

type CreateUserDto = Omit<User, 'id' | 'createdAt' | 'updatedAt'>;
type UpdateUserDto = Partial<Omit<User, 'id' | 'createdAt' | 'updatedAt'>>;
type UserResponseDto = Omit<User, 'password'>;

type UsersListDto = {
  users: UserResponseDto[];
  total: number;
  page: number;
  limit: number;
};
```

## DeepPartial / DeepReadonly

```typescript
type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

type DeepReadonly<T> = {
  readonly [P in keyof T]: T[P] extends object ? DeepReadonly<T[P]> : T[P];
};
```

## 타입 안전한 API 클라이언트

```typescript
type ApiEndpoint = {
  '/users': {
    GET: { response: User[]; query?: { page?: number; limit?: number } };
    POST: { response: User; body: CreateUserDto };
  };
  '/users/:id': {
    GET: { response: User; params: { id: string } };
    PUT: { response: User; params: { id: string }; body: UpdateUserDto };
    DELETE: { response: void; params: { id: string } };
  };
};

async function api<
  Path extends keyof ApiEndpoint,
  Method extends keyof ApiEndpoint[Path]
>(
  path: Path,
  method: Method,
  options?: ApiEndpoint[Path][Method] extends { body: infer B } ? { body: B } : never
): Promise<ApiEndpoint[Path][Method] extends { response: infer R } ? R : never> {
  // 구현
}

const users = await api('/users', 'GET');       // User[]
const user = await api('/users', 'POST', {
  body: { email: 'a@b.com', name: 'Test', password: '...' }
}); // User
await api('/users', 'DELETE'); // ❌ DELETE는 /users에 없음
```

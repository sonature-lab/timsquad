---
title: Coding Patterns & Anti-Patterns
impact: HIGH
tags: coding, patterns, error-handling
---

# Coding Patterns & Anti-Patterns

## Error Handling

```typescript
// Good: 명시적 에러 처리
async function getUser(id: string): Promise<User> {
  const user = await userRepository.findById(id);
  if (!user) throw new NotFoundError('USER_NOT_FOUND', `User ${id} not found`);
  return user;
}

// Bad: 에러 무시
async function getUser(id: string): Promise<User | null> {
  try { return await userRepository.findById(id); }
  catch { return null; } // 에러 원인 알 수 없음
}
```

## Repository Pattern

```typescript
interface UserRepository {
  findById(id: string): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
  save(user: User): Promise<User>;
  delete(id: string): Promise<void>;
}

class PostgresUserRepository implements UserRepository {
  async findById(id: string): Promise<User | null> { /* PostgreSQL 구현 */ }
}
```

## DTO/Entity 분리

```typescript
// Entity (도메인)
class User {
  constructor(
    public readonly id: string,
    public email: string,
    public passwordHash: string, // 민감 정보
  ) {}
}

// DTO (외부 노출)
interface UserResponseDto {
  id: string;
  email: string;
  // passwordHash 제외
}
```

## 의존성 주입

```typescript
// Good
class UserService {
  constructor(private userRepository: UserRepository) {}
}

// Bad
class UserService {
  private userRepository = new PostgresUserRepository(); // 하드코딩
}
```

## Anti-Patterns

| 이름 | Bad | Good |
|------|-----|------|
| any 타입 | `function process(data: any)` | `function process<T>(data: T)` |
| 매직 넘버 | `if (status === 1)` | `if (status === Status.ACTIVE)` |
| 콘솔 로그 | `console.log('user:', user)` | `logger.debug('User fetched', { userId })` |

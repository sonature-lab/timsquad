---
title: TDD Real-World Example
impact: HIGH
tags: tdd, testing, best-practices
---

# TDD Real-World Example: 로그인 기능

## 1단계: Starter Test
```typescript
it('should create auth service', () => {
  const authService = new AuthService(mockUserRepo);
  expect(authService).toBeDefined();
});
```

## 2단계: Happy Path
```typescript
it('should return token for valid credentials', async () => {
  // Given
  const mockUser = new UserBuilder()
    .withEmail('user@test.com')
    .withPassword(await hash('password123'))
    .build();
  mockUserRepo.findByEmail.mockResolvedValue(mockUser);

  // When
  const result = await authService.login('user@test.com', 'password123');

  // Then
  expect(result.token).toBeDefined();
  expect(result.user.email).toBe('user@test.com');
});
```

## 3단계: Error Cases (삼각측량)
```typescript
it('should throw for non-existent user', async () => {
  mockUserRepo.findByEmail.mockResolvedValue(null);
  await expect(authService.login('nobody@test.com', 'password'))
    .rejects.toThrow('INVALID_CREDENTIALS');
});

it('should throw for wrong password', async () => {
  const mockUser = new UserBuilder().withPassword(await hash('correct-password')).build();
  mockUserRepo.findByEmail.mockResolvedValue(mockUser);
  await expect(authService.login('user@test.com', 'wrong-password'))
    .rejects.toThrow('INVALID_CREDENTIALS');
});
```

## 4단계: Edge Cases
```typescript
it('should throw for locked account', async () => {
  const lockedUser = new UserBuilder().withStatus('locked').build();
  mockUserRepo.findByEmail.mockResolvedValue(lockedUser);
  await expect(authService.login('locked@test.com', 'password'))
    .rejects.toThrow('ACCOUNT_LOCKED');
});
```

## 5단계: 구현 (테스트가 이끈 설계)
```typescript
class AuthService {
  constructor(private userRepo: UserRepository) {}

  async login(email: string, password: string): Promise<LoginResult> {
    const user = await this.userRepo.findByEmail(email);
    if (!user) throw new AuthError('INVALID_CREDENTIALS');
    if (user.status === 'locked') throw new AuthError('ACCOUNT_LOCKED');

    const isValid = await compare(password, user.password);
    if (!isValid) throw new AuthError('INVALID_CREDENTIALS');

    const token = this.generateToken(user);
    return { token, user: this.toUserDto(user) };
  }
}
```

## Anti-Patterns

| 이름 | 문제 | 해결 |
|------|------|------|
| Test After | 테스트가 설계에 영향 못 줌 | 테스트 먼저, 실패 확인 후 구현 |
| Too Big Step | 실패 원인 파악 어려움 | Starter Test로 시작, 점진적 확장 |
| Test the Implementation | 리팩토링 시 테스트 깨짐 | 동작(behavior)을 테스트, public API만 |
| Skipping Refactor | 기술 부채 누적 | 매 사이클마다 Refactor 필수 |

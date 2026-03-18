---
title: Testing Patterns & Examples
category: guide
source: internal
---

# Testing Patterns & Examples

Given-When-Then 패턴, 테스트 카테고리별 예시, Mock 가이드라인을 다루는 심층 가이드.

## Given-When-Then Pattern

```typescript
describe('UserService', () => {
  describe('createUser', () => {
    it('should create a new user when email is unique', async () => {
      // Given: 테스트 조건 설정
      const userRepository = createMockRepository();
      userRepository.findByEmail.mockResolvedValue(null);
      const service = new UserService(userRepository);

      // When: 테스트 대상 실행
      const result = await service.createUser({
        email: 'test@example.com',
        password: 'password123',
      });

      // Then: 결과 검증
      expect(result.email).toBe('test@example.com');
      expect(userRepository.save).toHaveBeenCalledTimes(1);
    });

    it('should throw error when email already exists', async () => {
      // Given
      const userRepository = createMockRepository();
      userRepository.findByEmail.mockResolvedValue({ id: '1', email: 'test@example.com' });
      const service = new UserService(userRepository);

      // When & Then
      await expect(
        service.createUser({ email: 'test@example.com', password: 'password123' })
      ).rejects.toThrow('EMAIL_ALREADY_EXISTS');
    });
  });
});
```

## Test Categories

### Happy Path
정상적인 흐름 테스트.

```typescript
it('should return user when valid id is provided', async () => {
  const user = await userService.getUser('valid-id');
  expect(user).toBeDefined();
  expect(user.id).toBe('valid-id');
});
```

### Edge Cases
경계 조건: 빈 문자열, 최대 길이 입력, 0 값, null 입력.

### Error Cases
오류 상황 테스트.

```typescript
it('should throw NotFoundError when user does not exist', async () => {
  await expect(userService.getUser('non-existent-id'))
    .rejects
    .toThrow(NotFoundError);
});
```

## Mock Guidelines

### When to Mock
- 외부 서비스 (DB, API, 파일시스템)
- 비결정적 요소 (시간, 랜덤)
- 느린 작업

### Mock Examples

```typescript
// Repository Mock
const mockUserRepository: jest.Mocked<UserRepository> = {
  findById: jest.fn(),
  findByEmail: jest.fn(),
  save: jest.fn(),
  delete: jest.fn(),
};

// 시간 Mock
jest.useFakeTimers();
jest.setSystemTime(new Date('2024-01-01'));
```

## Common Pitfalls

- Mock을 과도하게 사용하면 실제 동작과 괴리 발생
- 테스트 간 상태 공유 → `beforeEach`에서 초기화 필수
- 구현 디테일을 테스트하면 리팩토링 시 깨짐 → 행동(behavior) 테스트
- `any` 타입 mock은 타입 안전성 무력화 → 타입 지정 mock 사용

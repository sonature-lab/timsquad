---
title: Testing Patterns
impact: MEDIUM
tags: testing, vitest, hono
---

## Testing Patterns

### Hono API Test (app.request)

```typescript
// src/interface/routes/user.routes.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import app from '../../app';

describe('User Routes', () => {
  describe('GET /api/v1/users/:id', () => {
    it('사용자를 조회한다', async () => {
      const res = await app.request('/api/v1/users/user-123', {
        method: 'GET',
        headers: { Authorization: 'Bearer valid-token' },
      });

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data).toHaveProperty('id', 'user-123');
    });

    it('존재하지 않는 사용자는 404', async () => {
      const res = await app.request('/api/v1/users/not-exist', {
        method: 'GET',
        headers: { Authorization: 'Bearer valid-token' },
      });

      expect(res.status).toBe(404);
      expect((await res.json()).error.code).toBe('USER_NOT_FOUND');
    });
  });

  describe('POST /api/v1/users', () => {
    it('유효하지 않은 이메일은 400', async () => {
      const res = await app.request('/api/v1/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer valid-token' },
        body: JSON.stringify({ email: 'invalid', name: 'Test', password: 'Password123' }),
      });

      expect(res.status).toBe(400);
      expect((await res.json()).error.code).toBe('VALIDATION_ERROR');
    });
  });
});
```

### Service Unit Test (Mock Repository)

```typescript
// src/domain/user/service.test.ts
const mockRepository: UserRepository = {
  findById: vi.fn(), findByEmail: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn(),
};

describe('UserService', () => {
  let service: UserService;
  beforeEach(() => { vi.clearAllMocks(); service = new UserService(mockRepository); });

  it('존재하는 사용자를 반환', async () => {
    const mockUser = { id: '1', email: 'test@example.com', name: 'Test' };
    vi.mocked(mockRepository.findById).mockResolvedValue(mockUser);

    const result = await service.findById('1');
    expect(result).toEqual(mockUser);
    expect(mockRepository.findById).toHaveBeenCalledWith('1');
  });

  it('존재하지 않으면 NotFoundError', async () => {
    vi.mocked(mockRepository.findById).mockResolvedValue(null);
    await expect(service.findById('x')).rejects.toThrow(NotFoundError);
  });
});
```

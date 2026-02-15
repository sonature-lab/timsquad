---
title: Hono App Setup
impact: CRITICAL
tags: hono, setup, routes, zod
---

## Hono App Setup

### App Configuration

```typescript
// src/app.ts
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { secureHeaders } from 'hono/secure-headers';
import { timing } from 'hono/timing';
import { userRoutes } from './interface/routes/user.routes';
import { errorHandler } from './interface/middleware/error-handler';

const app = new Hono();

// 글로벌 미들웨어
app.use('*', logger());
app.use('*', timing());
app.use('*', secureHeaders());
app.use('*', cors({
  origin: ['http://localhost:3000', 'https://example.com'],
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}));

// 헬스 체크
app.get('/health', (c) => c.json({ status: 'ok', timestamp: new Date().toISOString() }));

// 라우트 마운트
app.route('/api/v1/users', userRoutes);

// 에러 핸들러
app.onError(errorHandler);

// 404
app.notFound((c) => {
  return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'Route not found' } }, 404);
});

export default app;
```

### Typed Routes with zValidator

```typescript
// src/interface/routes/user.routes.ts
import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';

type Variables = { userId: string };
const userRoutes = new Hono<{ Variables: Variables }>();

userRoutes.use('*', authMiddleware);

// 일관된 응답 형식: { success, data, error, pagination }
userRoutes.get('/', async (c) => {
  const page = Number(c.req.query('page') || '1');
  const limit = Number(c.req.query('limit') || '10');
  const result = await UserService.findAll({ page, limit });

  return c.json({
    success: true,
    data: result.users,
    pagination: { page, limit, total: result.total, totalPages: Math.ceil(result.total / limit) },
  });
});

userRoutes.post('/', zValidator('json', createUserSchema), async (c) => {
  const data = c.req.valid('json');
  const user = await UserService.create(data);
  return c.json({ success: true, data: user }, 201);
});
```

### Zod Validation Schemas

```typescript
// src/interface/validators/user.validator.ts
import { z } from 'zod';

export const createUserSchema = z.object({
  email: z.string().email('올바른 이메일 형식이 아닙니다'),
  name: z.string().min(2).max(50),
  password: z.string().min(8).regex(/[A-Z]/, '대문자 필요').regex(/[0-9]/, '숫자 필요'),
  role: z.enum(['USER', 'ADMIN']).default('USER'),
});

export const updateUserSchema = createUserSchema.partial().omit({ password: true });
export type CreateUserDto = z.infer<typeof createUserSchema>;
```

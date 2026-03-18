---
title: Middleware Patterns
impact: MEDIUM
tags: middleware, rate-limit, logging
---

## Middleware Patterns

### Rate Limiting

```typescript
// src/interface/middleware/rate-limit.ts
import { rateLimiter } from 'hono-rate-limiter';

// 일반 API (분당 100회)
export const apiRateLimiter = rateLimiter({
  windowMs: 60 * 1000,
  limit: 100,
  standardHeaders: 'draft-6',
  keyGenerator: (c) => c.req.header('x-forwarded-for') || 'unknown',
  message: { success: false, error: { code: 'RATE_LIMIT', message: 'Too many requests' } },
});

// 인증 (분당 5회)
export const authRateLimiter = rateLimiter({
  windowMs: 60 * 1000,
  limit: 5,
  keyGenerator: (c) => `auth:${c.req.header('x-forwarded-for') || 'unknown'}`,
  message: { success: false, error: { code: 'AUTH_RATE_LIMIT', message: 'Too many login attempts' } },
});
```

### Request Logging (Structured)

```typescript
// src/interface/middleware/logger.ts
export async function requestLogger(c: Context, next: Next) {
  const start = Date.now();
  const requestId = crypto.randomUUID();

  c.set('requestId', requestId);
  c.header('X-Request-ID', requestId);

  console.log(JSON.stringify({
    type: 'request', requestId,
    method: c.req.method, path: c.req.path, ip: c.req.header('x-forwarded-for') || 'unknown',
  }));

  await next();

  console.log(JSON.stringify({
    type: 'response', requestId,
    method: c.req.method, path: c.req.path, status: c.res.status, duration: Date.now() - start,
  }));
}
```

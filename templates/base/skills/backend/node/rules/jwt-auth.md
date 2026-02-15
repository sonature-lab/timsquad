---
title: JWT Authentication
impact: HIGH
tags: jwt, auth, rbac, cookie
---

## JWT Authentication

### Middleware + RBAC

```typescript
// src/interface/middleware/auth.ts
import { jwt } from 'hono/jwt';
import { HTTPException } from 'hono/http-exception';

interface JWTPayload {
  sub: string; email: string; role: 'USER' | 'ADMIN'; iat: number; exp: number;
}

export const authMiddleware = jwt({ secret: config.JWT_SECRET });

export function requireRole(...roles: Array<'USER' | 'ADMIN'>) {
  return async (c: Context, next: Next) => {
    const payload = c.get('jwtPayload') as JWTPayload;
    if (!payload || !roles.includes(payload.role)) {
      throw new HTTPException(403, { message: 'Insufficient permissions' });
    }
    c.set('userId', payload.sub);
    await next();
  };
}
```

### Token Generation

```typescript
import { sign } from 'hono/jwt';

export async function generateTokens(user: { id: string; email: string; role: string }) {
  const now = Math.floor(Date.now() / 1000);
  const accessToken = await sign(
    { sub: user.id, email: user.email, role: user.role, iat: now, exp: now + 60 * 15 }, // 15min
    config.JWT_SECRET
  );
  const refreshToken = await sign(
    { sub: user.id, type: 'refresh', iat: now, exp: now + 60 * 60 * 24 * 7 }, // 7days
    config.JWT_REFRESH_SECRET
  );
  return { accessToken, refreshToken };
}
```

### Login/Refresh Flow

```typescript
// Refresh Token은 HttpOnly 쿠키로 관리
authRoutes.post('/login', zValidator('json', loginSchema), async (c) => {
  const { email, password } = c.req.valid('json');
  const user = await UserService.verifyCredentials(email, password);
  if (!user) throw new AppError('AUTH_001', 'Invalid credentials', 401);

  const { accessToken, refreshToken } = await generateTokens(user);

  setCookie(c, 'refreshToken', refreshToken, {
    httpOnly: true, secure: process.env.NODE_ENV === 'production',
    sameSite: 'Strict', maxAge: 60 * 60 * 24 * 7, path: '/api/v1/auth',
  });

  return c.json({ success: true, data: { accessToken, user: { id: user.id, email: user.email, name: user.name } } });
});

authRoutes.post('/logout', (c) => {
  deleteCookie(c, 'refreshToken', { path: '/api/v1/auth' });
  return c.json({ success: true, message: 'Logged out' });
});
```

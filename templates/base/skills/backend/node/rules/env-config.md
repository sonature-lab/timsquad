---
title: Environment Config
impact: HIGH
tags: config, zod, env
---

## Environment Config (Zod Validation)

앱 시작 시 환경변수를 Zod로 검증. 잘못된 설정이면 즉시 종료.

```typescript
// src/config/index.ts
import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(3000),
  HOST: z.string().default('0.0.0.0'),

  DATABASE_URL: z.string().url(),

  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  JWT_REFRESH_SECRET: z.string().min(32),

  REDIS_URL: z.string().url().optional(),
  SENTRY_DSN: z.string().url().optional(),

  ENABLE_SWAGGER: z.coerce.boolean().default(false),
});

const parseResult = envSchema.safeParse(process.env);

if (!parseResult.success) {
  console.error('Invalid environment variables:', parseResult.error.format());
  process.exit(1);
}

export const config = parseResult.data;
// config.PORT → number (타입 안전)
// config.REDIS_URL → string | undefined
```

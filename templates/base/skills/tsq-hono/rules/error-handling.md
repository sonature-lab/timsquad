---
title: Error Handling
impact: CRITICAL
tags: error, handler, AppError
---

## Error Handling

### Custom Error Hierarchy

```typescript
// src/shared/errors/base-error.ts
export class AppError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly statusCode: number = 500,
    public readonly details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'AppError';
    Error.captureStackTrace(this, this.constructor);
  }

  toJSON() {
    return {
      code: this.code,
      message: this.message,
      ...(this.details && { details: this.details }),
    };
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string, id?: string) {
    super(`${resource.toUpperCase()}_NOT_FOUND`, id ? `${resource} with id ${id} not found` : `${resource} not found`, 404);
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: Record<string, unknown>) {
    super('VALIDATION_ERROR', message, 400, details);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Unauthorized') { super('UNAUTHORIZED', message, 401); }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Forbidden') { super('FORBIDDEN', message, 403); }
}
```

### Global Error Handler

```typescript
// src/interface/middleware/error-handler.ts
export function errorHandler(err: Error, c: Context) {
  console.error('[Error]', { name: err.name, message: err.message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined });

  if (err instanceof AppError) {
    return c.json({ success: false, error: err.toJSON() }, err.statusCode as any);
  }
  if (err instanceof HTTPException) {
    return c.json({ success: false, error: { code: 'HTTP_ERROR', message: err.message } }, err.status);
  }
  if (err instanceof ZodError) {
    return c.json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Request validation failed',
      details: err.errors.map(e => ({ path: e.path.join('.'), message: e.message })) } }, 400);
  }
  // Prisma P2002 (duplicate) → 409, P2025 (not found) → 404
  if (err.name === 'PrismaClientKnownRequestError') {
    const p = err as any;
    if (p.code === 'P2002') return c.json({ success: false, error: { code: 'DUPLICATE_ENTRY', message: 'Resource already exists' } }, 409);
    if (p.code === 'P2025') return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'Resource not found' } }, 404);
  }

  return c.json({ success: false, error: { code: 'INTERNAL_ERROR',
    message: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message } }, 500);
}
```

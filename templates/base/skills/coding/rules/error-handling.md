---
title: Error Handling Patterns
impact: HIGH
tags: coding, error-handling, resilience
---

# Error Handling Patterns

## Custom Error Classes

```typescript
class AppError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly statusCode: number = 500,
    public readonly cause?: Error,
  ) {
    super(message);
    this.name = this.constructor.name;
  }
}

class NotFoundError extends AppError {
  constructor(code: string, message: string) {
    super(code, message, 404);
  }
}

class ValidationError extends AppError {
  constructor(code: string, message: string, public readonly fields: string[]) {
    super(code, message, 400);
  }
}
```

## Never Swallow Errors

```typescript
// Bad: 에러 무시 — 디버깅 불가
try { await save(data); } catch {}

// Bad: 원인 손실
try { await save(data); } catch { throw new Error('save failed'); }

// Good: 원인 체이닝
try { await save(data); } catch (err) {
  throw new AppError('SAVE_FAILED', 'Data save failed', 500, err as Error);
}
```

## Error Boundaries (React)

```typescript
class ErrorBoundary extends React.Component<Props, { error?: Error }> {
  static getDerivedStateFromError(error: Error) {
    return { error };
  }
  componentDidCatch(error: Error, info: React.ErrorInfo) {
    logger.error('UI Error', { error, componentStack: info.componentStack });
  }
  render() {
    if (this.state.error) return this.props.fallback;
    return this.props.children;
  }
}
```

## Rules

| Rule | Description |
|------|-------------|
| 에러 로깅 필수 | catch 블록에서 최소 로깅 또는 re-throw |
| 사용자 메시지 분리 | 내부 에러와 사용자 노출 메시지를 분리 |
| 에러 코드 사용 | 문자열 비교 대신 enum/const 에러 코드 |
| cause 체이닝 | 원본 에러를 cause로 보존 |

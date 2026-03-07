---
title: Async/Await Best Practices
impact: HIGH
tags: coding, async, performance
---

# Async/Await Best Practices

## Avoid Callback Hell

```typescript
// Bad: 중첩 콜백
getUser(id, (user) => {
  getOrders(user.id, (orders) => {
    getItems(orders[0].id, (items) => { /* ... */ });
  });
});

// Good: async/await 플랫 구조
const user = await getUser(id);
const orders = await getOrders(user.id);
const items = await getItems(orders[0].id);
```

## Parallel Execution with Promise.all

```typescript
// Bad: 순차 실행 — 불필요한 대기
const users = await getUsers();
const orders = await getOrders();
const stats = await getStats();

// Good: 독립 작업은 병렬 실행
const [users, orders, stats] = await Promise.all([
  getUsers(),
  getOrders(),
  getStats(),
]);
```

## Error Propagation

```typescript
// Bad: 에러 삼킴
async function fetchData() {
  try { return await api.get('/data'); }
  catch { return []; } // 실패 원인 불명
}

// Good: 의미 있는 에러 변환 후 전파
async function fetchData() {
  try { return await api.get('/data'); }
  catch (err) {
    throw new AppError('FETCH_FAILED', 'Data fetch failed', 500, err as Error);
  }
}
```

## Promise.allSettled for Partial Failures

```typescript
const results = await Promise.allSettled([
  sendEmail(user1),
  sendEmail(user2),
  sendEmail(user3),
]);

const failures = results.filter(
  (r): r is PromiseRejectedResult => r.status === 'rejected',
);
if (failures.length) logger.warn('Partial failures', { count: failures.length });
```

## Rules

| Rule | Description |
|------|-------------|
| 불필요한 await 금지 | return 직전 단일 Promise는 await 생략 가능 |
| for-of + await 주의 | 순차 필요 시만 사용, 아니면 Promise.all |
| void Promise 금지 | fire-and-forget 시 명시적 .catch 또는 void 연산자 |
| async 함수 반환 타입 | Promise<T>를 명시적으로 선언 |

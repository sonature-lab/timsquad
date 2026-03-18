---
title: Async Patterns
impact: CRITICAL
tags: async, promise, waterfall, transaction
---

## Async Patterns

### Promise.all for Independent Operations

**Incorrect:**
```typescript
// Sequential - 3 round trips
const user = await userService.findById(userId);
const orders = await orderService.findByUserId(userId);
const notifications = await notificationService.getUnread(userId);
```

**Correct:**
```typescript
// Parallel - 1 round trip
const [user, orders, notifications] = await Promise.all([
  userService.findById(userId),
  orderService.findByUserId(userId),
  notificationService.getUnread(userId),
]);
```

### API Route Waterfall Prevention

**Incorrect:**
```typescript
app.get('/dashboard', async (c) => {
  const session = await auth();
  const config = await fetchConfig(); // config는 session 불필요
  const data = await fetchData(session.user.id);
  return c.json({ data, config });
});
```

**Correct:**
```typescript
app.get('/dashboard', async (c) => {
  const sessionPromise = auth();
  const configPromise = fetchConfig(); // 즉시 시작

  const session = await sessionPromise;
  const [config, data] = await Promise.all([
    configPromise,
    fetchData(session.user.id), // session에 의존
  ]);
  return c.json({ data, config });
});
```

### Prisma Transaction

```typescript
export async function createOrder(input: CreateOrderInput) {
  return prisma.$transaction(async (tx) => {
    const user = await tx.user.findUnique({ where: { id: input.userId } });
    if (!user) throw new AppError('USER_NOT_FOUND', 'User not found', 404);

    let totalAmount = 0;
    for (const item of input.items) {
      const product = await tx.product.findUnique({ where: { id: item.productId } });
      if (!product || product.stock < item.quantity) {
        throw new AppError('INSUFFICIENT_STOCK', `Insufficient stock for ${item.productId}`, 400);
      }
      await tx.product.update({ where: { id: item.productId }, data: { stock: { decrement: item.quantity } } });
      totalAmount += product.price * item.quantity;
    }

    return tx.order.create({
      data: { userId: input.userId, totalAmount, status: 'PENDING',
        items: { create: input.items.map(i => ({ productId: i.productId, quantity: i.quantity })) } },
      include: { items: true },
    });
  });
}
```

---
title: Prisma Query Patterns
impact: HIGH
tags: prisma, database, queries
---

# Prisma Query Patterns

## 싱글톤 인스턴스

```typescript
// lib/prisma.ts
import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? new PrismaClient({
  log: process.env.NODE_ENV === 'development'
    ? ['query', 'error', 'warn']
    : ['error'],
});

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}
```

## Extensions (소프트 삭제 자동 필터)

```typescript
export const prisma = prismaBase.$extends({
  query: {
    $allModels: {
      async findMany({ model, operation, args, query }) {
        args.where = { ...args.where, deletedAt: null };
        return query(args);
      },
    },
  },
});
```

## 기본 CRUD

```typescript
// Create
const user = await prisma.user.create({
  data: { email: 'test@example.com', name: 'Test', password: hashedPassword },
});

// Read
const user = await prisma.user.findUnique({ where: { id: userId } });
const users = await prisma.user.findMany({
  where: { role: 'USER' },
  orderBy: { createdAt: 'desc' },
  take: 10, skip: 0,
});

// Update
const updated = await prisma.user.update({
  where: { id: userId },
  data: { name: 'New Name' },
});

// Delete
await prisma.user.delete({ where: { id: userId } });

// Upsert
const user = await prisma.user.upsert({
  where: { email: 'test@example.com' },
  update: { name: 'Updated Name' },
  create: { email: 'test@example.com', name: 'New User', password },
});
```

## Relations 로딩

```typescript
// include: 관계 데이터 포함
const userWithPosts = await prisma.user.findUnique({
  where: { id: userId },
  include: { posts: true, profile: true },
});

// select: 특정 필드만 선택 (성능 최적화)
const userWithPosts = await prisma.user.findUnique({
  where: { id: userId },
  select: {
    id: true, name: true,
    posts: { select: { id: true, title: true }, where: { published: true }, take: 5 },
  },
});
```

## 트랜잭션

```typescript
const result = await prisma.$transaction(async (tx) => {
  const user = await tx.user.create({ data: { email, name, password } });
  await tx.profile.create({ data: { userId: user.id, bio: '' } });
  await tx.notification.create({ data: { userId: user.id, message: 'Welcome!' } });
  return user;
});
// 실패 시 모두 롤백
```

## Repository 패턴

```typescript
export interface UserRepository {
  findById(id: string): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
  save(user: User): Promise<User>;
  delete(id: string): Promise<void>;
}

export class PrismaUserRepository implements UserRepository {
  async findById(id: string) {
    return prisma.user.findUnique({ where: { id } });
  }
  async findByEmail(email: string) {
    return prisma.user.findUnique({ where: { email } });
  }
  async save(data: Omit<User, 'id' | 'createdAt' | 'updatedAt'>) {
    return prisma.user.create({ data });
  }
  async delete(id: string) {
    await prisma.user.delete({ where: { id } });
  }
}
```

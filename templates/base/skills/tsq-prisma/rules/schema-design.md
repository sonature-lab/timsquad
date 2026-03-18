---
title: Prisma Schema Design Patterns
impact: HIGH
tags: prisma, database, schema
---

# Prisma Schema Design Patterns

## 기본 모델 정의

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id        String   @id @default(cuid())
  email     String   @unique
  name      String
  password  String
  role      Role     @default(USER)

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  posts     Post[]
  profile   Profile?

  @@index([email])
  @@map("users")
}

model Post {
  id        String   @id @default(cuid())
  title     String
  content   String?
  published Boolean  @default(false)

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  author    User     @relation(fields: [authorId], references: [id])
  authorId  String

  @@index([authorId])
  @@map("posts")
}

enum Role {
  USER
  ADMIN
}
```

## 공통 필드 패턴
모든 모델에 공통으로 들어가는 필드 (Prisma는 상속 미지원, 컨벤션으로 관리):
- `id String @id @default(cuid())`
- `createdAt DateTime @default(now())`
- `updatedAt DateTime @updatedAt`

## 소프트 삭제

```prisma
model User {
  id        String    @id @default(cuid())
  deletedAt DateTime? // null이면 활성, 값 있으면 삭제됨
  @@index([deletedAt])
}
```

```typescript
const activeUsers = await prisma.user.findMany({
  where: { deletedAt: null },
});
```

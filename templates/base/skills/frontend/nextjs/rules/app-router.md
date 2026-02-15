---
title: Next.js App Router Patterns
impact: HIGH
tags: nextjs, frontend, app-router
---

# Next.js App Router Patterns

## 디렉토리 구조

```
app/
├── layout.tsx           # 루트 레이아웃 (필수)
├── page.tsx             # 홈페이지 (/)
├── loading.tsx          # 로딩 UI
├── error.tsx            # 에러 UI
├── not-found.tsx        # 404 UI
│
├── (auth)/              # Route Group (URL에 미포함)
│   ├── login/page.tsx   # /login
│   └── register/page.tsx # /register
│
├── dashboard/
│   ├── layout.tsx       # 대시보드 레이아웃
│   ├── page.tsx         # /dashboard
│   └── settings/page.tsx # /dashboard/settings
│
├── users/
│   ├── page.tsx         # /users (목록)
│   └── [id]/
│       ├── page.tsx     # /users/:id
│       └── edit/page.tsx # /users/:id/edit
│
└── api/users/route.ts   # /api/users
```

## Server vs Client Component

### 판단 기준
```
데이터 페칭 필요? → Server Component
인터랙션/이벤트 필요? → Client Component ('use client')
브라우저 API 필요? → Client Component
그 외 → Server Component (기본)
```

### Server Component (기본)
```typescript
// app/users/page.tsx
import { db } from '@/lib/db';

export default async function UsersPage() {
  const users = await db.user.findMany();
  return (
    <ul>
      {users.map(user => <li key={user.id}>{user.name}</li>)}
    </ul>
  );
}
```

### Client Component
```typescript
// components/counter.tsx
'use client';
import { useState } from 'react';

export function Counter() {
  const [count, setCount] = useState(0);
  return <button onClick={() => setCount(c => c + 1)}>Count: {count}</button>;
}
```

## Data Fetching

### Server Component에서 직접 fetch
```typescript
async function getPosts() {
  const res = await fetch('https://api.example.com/posts', {
    next: { revalidate: 60 },
  });
  return res.json();
}
```

### Server Actions
```typescript
// app/actions/user.ts
'use server';
import { revalidatePath } from 'next/cache';

export async function createUser(formData: FormData) {
  const name = formData.get('name') as string;
  await db.user.create({ data: { name, email: formData.get('email') as string } });
  revalidatePath('/users');
}
```

### 캐싱 전략
| 옵션 | 설명 |
|------|------|
| `force-cache` | 기본값, 캐시 사용 |
| `no-store` | 캐시 안 함, 항상 새로 요청 |
| `revalidate: N` | N초마다 재검증 |
| `revalidatePath()` | 특정 경로 재검증 |
| `revalidateTag()` | 태그로 재검증 |

## Metadata

```typescript
// 정적
export const metadata: Metadata = { title: 'About Us' };

// 동적
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const user = await getUser(id);
  return { title: user.name };
}
```

## Loading & Error

```typescript
// loading.tsx
export default function Loading() { return <DashboardSkeleton />; }

// error.tsx
'use client';
export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div>
      <h2>Something went wrong!</h2>
      <button onClick={reset}>Try again</button>
    </div>
  );
}
```

---
name: nextjs
description: Next.js App Router 개발 가이드라인
user-invocable: false
---

<skill name="nextjs">
  <purpose>Next.js 15+ App Router 기반 개발 가이드라인</purpose>

  <philosophy>
    <principle>Server First - 기본은 서버 컴포넌트</principle>
    <principle>Progressive Enhancement - 필요할 때만 클라이언트</principle>
    <principle>Colocation - 관련 파일은 가까이</principle>
  </philosophy>

  <app-router-structure>
    <structure>
      <![CDATA[
app/
├── layout.tsx           # 루트 레이아웃 (필수)
├── page.tsx             # 홈페이지 (/)
├── loading.tsx          # 로딩 UI
├── error.tsx            # 에러 UI
├── not-found.tsx        # 404 UI
│
├── (auth)/              # Route Group (URL에 미포함)
│   ├── login/
│   │   └── page.tsx     # /login
│   └── register/
│       └── page.tsx     # /register
│
├── dashboard/
│   ├── layout.tsx       # 대시보드 레이아웃
│   ├── page.tsx         # /dashboard
│   └── settings/
│       └── page.tsx     # /dashboard/settings
│
├── users/
│   ├── page.tsx         # /users (목록)
│   └── [id]/
│       ├── page.tsx     # /users/:id (상세)
│       └── edit/
│           └── page.tsx # /users/:id/edit
│
└── api/                 # API Routes
    └── users/
        └── route.ts     # /api/users
      ]]>
    </structure>
  </app-router-structure>

  <server-vs-client>
    <comparison>
      <server-component>
        <use-when>데이터 페칭, DB 접근, 민감한 정보, 정적 콘텐츠</use-when>
        <benefits>번들 크기 감소, SEO, 빠른 초기 로딩</benefits>
        <example>
          <![CDATA[
// app/users/page.tsx (Server Component - 기본)
import { db } from '@/lib/db';

export default async function UsersPage() {
  const users = await db.user.findMany();

  return (
    <ul>
      {users.map(user => (
        <li key={user.id}>{user.name}</li>
      ))}
    </ul>
  );
}
          ]]>
        </example>
      </server-component>
      <client-component>
        <use-when>인터랙션, 브라우저 API, 상태, 이벤트 핸들러</use-when>
        <marker>'use client' 상단에 선언</marker>
        <example>
          <![CDATA[
// components/counter.tsx
'use client';

import { useState } from 'react';

export function Counter() {
  const [count, setCount] = useState(0);

  return (
    <button onClick={() => setCount(c => c + 1)}>
      Count: {count}
    </button>
  );
}
          ]]>
        </example>
      </client-component>
    </comparison>
    <decision-tree>
      <![CDATA[
데이터 페칭 필요? ─────────────► Server Component
        │ No
        ▼
인터랙션/이벤트 필요? ─────────► Client Component ('use client')
        │ No
        ▼
브라우저 API 필요? ───────────► Client Component
        │ No
        ▼
                              Server Component (기본)
      ]]>
    </decision-tree>
  </server-vs-client>

  <data-fetching>
    <pattern name="서버 컴포넌트에서 직접 fetch">
      <example>
        <![CDATA[
// app/posts/page.tsx
async function getPosts() {
  const res = await fetch('https://api.example.com/posts', {
    next: { revalidate: 60 }, // 60초마다 재검증
  });
  return res.json();
}

export default async function PostsPage() {
  const posts = await getPosts();
  return <PostList posts={posts} />;
}
        ]]>
      </example>
    </pattern>
    <pattern name="Server Actions">
      <example>
        <![CDATA[
// app/actions/user.ts
'use server';

import { db } from '@/lib/db';
import { revalidatePath } from 'next/cache';

export async function createUser(formData: FormData) {
  const name = formData.get('name') as string;
  const email = formData.get('email') as string;

  await db.user.create({ data: { name, email } });

  revalidatePath('/users');
}

// 사용 (Client Component에서)
'use client';

import { createUser } from '@/app/actions/user';

export function CreateUserForm() {
  return (
    <form action={createUser}>
      <input name="name" required />
      <input name="email" type="email" required />
      <button type="submit">Create</button>
    </form>
  );
}
        ]]>
      </example>
    </pattern>
    <caching>
      <option name="force-cache">기본값, 캐시 사용</option>
      <option name="no-store">캐시 안 함, 항상 새로 요청</option>
      <option name="revalidate: N">N초마다 재검증</option>
      <option name="revalidatePath()">특정 경로 재검증</option>
      <option name="revalidateTag()">태그로 재검증</option>
    </caching>
  </data-fetching>

  <metadata>
    <pattern name="정적 메타데이터">
      <![CDATA[
// app/about/page.tsx
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'About Us',
  description: 'Learn more about our company',
};
      ]]>
    </pattern>
    <pattern name="동적 메타데이터">
      <![CDATA[
// app/users/[id]/page.tsx
import type { Metadata } from 'next';

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const user = await getUser(id);

  return {
    title: user.name,
    description: `Profile of ${user.name}`,
  };
}
      ]]>
    </pattern>
  </metadata>

  <loading-error>
    <pattern name="loading.tsx">
      <![CDATA[
// app/dashboard/loading.tsx
export default function Loading() {
  return <DashboardSkeleton />;
}
      ]]>
    </pattern>
    <pattern name="error.tsx">
      <![CDATA[
// app/dashboard/error.tsx
'use client';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div>
      <h2>Something went wrong!</h2>
      <button onClick={reset}>Try again</button>
    </div>
  );
}
      ]]>
    </pattern>
  </loading-error>

  <rules>
    <category name="컴포넌트">
      <must>기본은 Server Component</must>
      <must>인터랙션 필요할 때만 'use client'</must>
      <must>Client Component는 작게 유지 (leaf에 배치)</must>
      <must-not>Server Component에서 useState/useEffect</must-not>
      <must-not>불필요한 'use client'</must-not>
    </category>
    <category name="데이터">
      <must>Server Component에서 데이터 페칭</must>
      <must>mutation은 Server Actions 사용</must>
      <must>적절한 캐싱 전략 설정</must>
      <must-not>Client Component에서 직접 DB 접근</must-not>
    </category>
    <category name="라우팅">
      <must>파일 기반 라우팅 규칙 준수</must>
      <must>Route Group으로 레이아웃 관리</must>
      <must>loading.tsx, error.tsx 제공</must>
    </category>
  </rules>

  <performance>
    <optimization name="이미지">next/image 사용, sizes 속성</optimization>
    <optimization name="폰트">next/font로 최적화</optimization>
    <optimization name="링크">next/link로 프리페칭</optimization>
    <optimization name="동적 import">무거운 컴포넌트 지연 로딩</optimization>
  </performance>

  <checklist>
    <item priority="critical">Server Component 기본 사용</item>
    <item priority="critical">'use client' 최소화</item>
    <item priority="critical">Server Actions로 mutation</item>
    <item priority="high">적절한 캐싱 전략</item>
    <item priority="high">loading.tsx, error.tsx 구현</item>
    <item priority="high">Metadata 설정</item>
    <item priority="medium">이미지/폰트 최적화</item>
  </checklist>
</skill>

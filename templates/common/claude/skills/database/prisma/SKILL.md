---
name: prisma
description: Prisma ORM 개발 가이드라인
user-invocable: false
---

<skill name="prisma">
  <purpose>Prisma ORM을 활용한 타입 안전 데이터베이스 개발 가이드라인</purpose>

  <philosophy>
    <principle>Schema as SSOT - 스키마가 진실의 원천</principle>
    <principle>Type Safety - 자동 생성 타입 활용</principle>
    <principle>Migration First - 스키마 변경은 마이그레이션으로</principle>
  </philosophy>

  <schema-design>
    <pattern name="기본 모델 정의">
      <example>
        <![CDATA[
// prisma/schema.prisma

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

  // Relations
  posts     Post[]
  profile   Profile?

  @@index([email])
  @@map("users")  // 테이블명
}

model Post {
  id        String   @id @default(cuid())
  title     String
  content   String?
  published Boolean  @default(false)

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  // Relations
  author    User     @relation(fields: [authorId], references: [id])
  authorId  String

  @@index([authorId])
  @@map("posts")
}

enum Role {
  USER
  ADMIN
}
        ]]>
      </example>
    </pattern>

    <pattern name="공통 필드 패턴">
      <description>모든 모델에 공통으로 들어가는 필드</description>
      <example>
        <![CDATA[
// 공통 필드 패턴 (Prisma는 상속 미지원, 컨벤션으로 관리)
// id        String   @id @default(cuid())
// createdAt DateTime @default(now())
// updatedAt DateTime @updatedAt

model BaseFields {
  // 참고용 - 실제 모델에 복사해서 사용
  id        String   @id @default(cuid())
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
        ]]>
      </example>
    </pattern>

    <pattern name="소프트 삭제">
      <example>
        <![CDATA[
model User {
  id        String    @id @default(cuid())
  // ...
  deletedAt DateTime? // null이면 활성, 값 있으면 삭제됨

  @@index([deletedAt])
}

// 쿼리 시 필터링
const activeUsers = await prisma.user.findMany({
  where: { deletedAt: null },
});
        ]]>
      </example>
    </pattern>
  </schema-design>

  <client-setup>
    <pattern name="싱글톤 인스턴스">
      <example>
        <![CDATA[
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
        ]]>
      </example>
    </pattern>

    <pattern name="확장 (Extensions)">
      <example>
        <![CDATA[
// lib/prisma.ts
import { PrismaClient } from '@prisma/client';

const prismaBase = new PrismaClient();

export const prisma = prismaBase.$extends({
  query: {
    // 모든 findMany에 소프트 삭제 필터 자동 적용
    $allModels: {
      async findMany({ model, operation, args, query }) {
        args.where = { ...args.where, deletedAt: null };
        return query(args);
      },
    },
  },
});
        ]]>
      </example>
    </pattern>
  </client-setup>

  <query-patterns>
    <pattern name="기본 CRUD">
      <example>
        <![CDATA[
// Create
const user = await prisma.user.create({
  data: {
    email: 'test@example.com',
    name: 'Test User',
    password: hashedPassword,
  },
});

// Read
const user = await prisma.user.findUnique({
  where: { id: userId },
});

const users = await prisma.user.findMany({
  where: { role: 'USER' },
  orderBy: { createdAt: 'desc' },
  take: 10,
  skip: 0,
});

// Update
const updated = await prisma.user.update({
  where: { id: userId },
  data: { name: 'New Name' },
});

// Delete
await prisma.user.delete({
  where: { id: userId },
});
        ]]>
      </example>
    </pattern>

    <pattern name="Relations 로딩">
      <example>
        <![CDATA[
// include: 관계 데이터 포함
const userWithPosts = await prisma.user.findUnique({
  where: { id: userId },
  include: {
    posts: true,
    profile: true,
  },
});

// select: 특정 필드만 선택 (성능 최적화)
const userWithPosts = await prisma.user.findUnique({
  where: { id: userId },
  select: {
    id: true,
    name: true,
    posts: {
      select: {
        id: true,
        title: true,
      },
      where: { published: true },
      take: 5,
    },
  },
});
        ]]>
      </example>
    </pattern>

    <pattern name="트랜잭션">
      <example>
        <![CDATA[
// Interactive Transaction
const result = await prisma.$transaction(async (tx) => {
  // 1. 사용자 생성
  const user = await tx.user.create({
    data: { email, name, password },
  });

  // 2. 프로필 생성
  const profile = await tx.profile.create({
    data: { userId: user.id, bio: '' },
  });

  // 3. 웰컴 알림 생성
  await tx.notification.create({
    data: { userId: user.id, message: 'Welcome!' },
  });

  return user;
});

// 실패 시 모두 롤백
        ]]>
      </example>
    </pattern>

    <pattern name="Upsert">
      <example>
        <![CDATA[
// 있으면 업데이트, 없으면 생성
const user = await prisma.user.upsert({
  where: { email: 'test@example.com' },
  update: { name: 'Updated Name' },
  create: { email: 'test@example.com', name: 'New User', password },
});
        ]]>
      </example>
    </pattern>
  </query-patterns>

  <migration>
    <commands>
      <command name="npx prisma migrate dev">개발 환경 마이그레이션 (자동 생성 + 적용)</command>
      <command name="npx prisma migrate deploy">프로덕션 마이그레이션 적용</command>
      <command name="npx prisma migrate reset">DB 초기화 + 모든 마이그레이션 재적용</command>
      <command name="npx prisma db push">빠른 프로토타이핑 (마이그레이션 없이)</command>
      <command name="npx prisma generate">클라이언트 재생성</command>
    </commands>
    <workflow>
      <step>1. schema.prisma 수정</step>
      <step>2. npx prisma migrate dev --name descriptive_name</step>
      <step>3. 생성된 SQL 검토</step>
      <step>4. 커밋 (schema.prisma + migrations/)</step>
    </workflow>
  </migration>

  <repository-pattern>
    <example>
      <![CDATA[
// domain/user/repository.ts
export interface UserRepository {
  findById(id: string): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
  save(user: User): Promise<User>;
  delete(id: string): Promise<void>;
}

// infrastructure/database/prisma-user-repository.ts
import { prisma } from '@/lib/prisma';
import { UserRepository } from '@/domain/user/repository';

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
      ]]>
    </example>
  </repository-pattern>

  <rules>
    <category name="스키마">
      <must>모든 모델에 id, createdAt, updatedAt</must>
      <must>명시적 인덱스 정의</must>
      <must>@@map으로 테이블명 명시</must>
      <must>관계는 명확히 정의</must>
    </category>
    <category name="쿼리">
      <must>select로 필요한 필드만 조회 (성능)</must>
      <must>페이지네이션 적용 (take, skip)</must>
      <must>복잡한 작업은 트랜잭션 사용</must>
      <must-not>N+1 쿼리 (include/select 사용)</must-not>
      <must-not>무한 결과 조회</must-not>
    </category>
    <category name="마이그레이션">
      <must>migrate dev로 개발</must>
      <must>migrate deploy로 배포</must>
      <must>마이그레이션 파일 커밋</must>
      <must-not>프로덕션에서 db push 사용</must-not>
    </category>
  </rules>

  <checklist>
    <item priority="critical">싱글톤 인스턴스 사용</item>
    <item priority="critical">마이그레이션으로 스키마 관리</item>
    <item priority="critical">트랜잭션으로 데이터 정합성</item>
    <item priority="high">select로 필요한 필드만 조회</item>
    <item priority="high">인덱스 적절히 설정</item>
    <item priority="high">Repository 패턴 적용</item>
    <item priority="medium">소프트 삭제 고려</item>
  </checklist>
</skill>

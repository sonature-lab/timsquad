---
title: Supabase Patterns
impact: HIGH
tags: supabase, database, edge-runtime, rls
---

# Supabase Patterns

## JSONB 쿼리

```sql
-- .contains() 사용 시 주의: GIN 인덱스 필수
CREATE INDEX idx_data_gin ON records USING GIN (data);

-- 올바른 사용
SELECT * FROM records WHERE data @> '{"status": "active"}'::jsonb;

-- 피해야 할 패턴: 중첩 키 직접 접근 (인덱스 미사용)
-- SELECT * FROM records WHERE data->'nested'->'key' = '"value"';
-- 대안: jsonb_path_query 또는 표현식 인덱스
```

## RLS (Row Level Security)

```sql
-- 항상 RLS 활성화
ALTER TABLE user_data ENABLE ROW LEVEL SECURITY;

-- 서비스 키와 anon 키 구분
-- anon: 클라이언트 사이드, RLS 적용
-- service_role: 서버 사이드, RLS 바이패스

-- 정책 패턴
CREATE POLICY "Users can view own data"
  ON user_data FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own data"
  ON user_data FOR INSERT
  WITH CHECK (auth.uid() = user_id);
```

## Edge Runtime 초기화

```typescript
// Edge Runtime에서 Supabase 클라이언트 초기화
// 반드시 함수 내부에서 생성 (모듈 레벨 싱글톤 금지)
import { createClient } from '@supabase/supabase-js';

export function getSupabase() {
  return createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_ANON_KEY!
  );
}
```

## USE_MOCK 패턴

```typescript
// 테스트/개발 환경에서 Supabase Mock
const USE_MOCK = process.env.USE_MOCK_DB === 'true';

function getClient() {
  if (USE_MOCK) {
    return createMockClient(); // 인메모리 구현
  }
  return createClient(SUPABASE_URL, SUPABASE_KEY);
}
```

## Edge Runtime 커넥션 풀링

- Supabase는 PgBouncer 내장 (포트 6543)
- Edge Functions에서는 항상 풀링 URL 사용
- `connection_limit=1` 설정 권장 (Edge 인스턴스별)
- 장기 트랜잭션 피하기 (풀 고갈 방지)

```
# 직접 연결 (마이그레이션용)
DATABASE_URL=postgres://...@db.xxx.supabase.co:5432/postgres

# 풀링 연결 (애플리케이션용)
DATABASE_URL=postgres://...@db.xxx.supabase.co:6543/postgres?pgbouncer=true
```

## 소유권 경계

| 영역 | 담당 | 설명 |
|------|------|------|
| 스키마 설계 | Database 스킬 | 테이블, 인덱스, RLS |
| Prisma 스키마 | Prisma 스킬 | schema.prisma, 마이그레이션 |
| 쿼리 로직 | Coding 스킬 | 비즈니스 로직 내 DB 호출 |
| 성능 튜닝 | Database 스킬 | EXPLAIN, 인덱스 최적화 |

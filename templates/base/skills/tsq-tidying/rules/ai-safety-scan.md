---
title: AI Safety Scan
impact: CRITICAL
tags: security, ai-safety, secrets, validation
---

# AI Safety Scan

AI 생성 코드의 5대 조용한 실패를 방지하는 필수 스캔 규칙.

## Scan Checklist (전부 통과해야 PASS)

### 1. Secret Leak Detection

```bash
# 금지 패턴
grep -rn \
  -e "sk_live_" \
  -e "sk_test_" \
  -e "password\s*=\s*['\"]" \
  -e "api[_-]?key\s*=\s*['\"]" \
  -e "secret\s*=\s*['\"]" \
  -e "token\s*=\s*['\"]" \
  src/
```

**위반 시**: FAIL — 즉시 제거, 환경변수로 이동

### 2. SQL Injection Prevention

```typescript
// FAIL: raw query without parameterization
db.execute(`SELECT * FROM users WHERE id = '${userId}'`);

// PASS: parameterized query
db.execute(sql`SELECT * FROM users WHERE id = ${userId}`);
// PASS: Drizzle query builder
db.select().from(users).where(eq(users.id, userId));
```

### 3. Input Validation at Boundary

```typescript
// FAIL: Server Action without Zod validation
export async function createUser(data: unknown) {
  await db.insert(users).values(data as any);
}

// PASS: Zod schema at entry point
export async function createUser(rawData: unknown) {
  const data = createUserSchema.parse(rawData);
  await db.insert(users).values(data);
}
```

### 4. Type Safety (no `any`)

```typescript
// FAIL
function process(data: any) { return data.value; }

// PASS
function process<T extends { value: unknown }>(data: T) { return data.value; }
```

### 5. Auth/Authz Layer Presence

모든 Server Action / API route에 다음 중 하나 필수:
- `middleware.ts`의 auth 체크를 거침
- 함수 시작에 `await requireAuth()` 또는 `await requireRole(...)`
- 명시적 `// @public` 주석 (인증 불필요 엔드포인트)

```typescript
// FAIL: 인증 체크 없음
export async function deleteUser(id: string) {
  await db.delete(users).where(eq(users.id, id));
}

// PASS
export async function deleteUser(id: string) {
  const session = await requireAuth();
  await requireRole(session, 'admin');
  await db.delete(users).where(eq(users.id, id));
}
```

## Co-Authored-By Rule

AI가 생성/수정한 코드를 포함하는 모든 커밋:

```
git commit -m "feat: implement user registration

Co-Authored-By: Claude <noreply@anthropic.com>"
```

## DB Query / External API Review Flag

다음 패턴이 있는 파일은 `// @review-required` 주석 필수:
- `db.execute`, `db.insert`, `db.update`, `db.delete`
- `fetch(`, `axios.`, `httpClient.`
- 외부 서비스 SDK 호출

## On Violation

```
FAIL: AI Safety Scan 위반 [N]건 발견
→ 위반 항목:
  1. [SECRET] src/lib/payment.ts:15 — 하드코딩된 API key
  2. [ANY] src/modules/auth/adapters/drizzle.ts:42 — any 타입 사용
  3. [AUTH] src/app/api/users/route.ts — 인증 체크 누락
→ 수정 후 재실행 필요
```

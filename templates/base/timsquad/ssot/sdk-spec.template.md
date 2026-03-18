---
title: "SDK 명세서 (SDK Specification)"
version: 1.0.0
last_updated: {{DATE}}
author: tsq-architect
status: draft
project: {{PROJECT_NAME}}
---

# SDK 명세서 (SDK Specification)

> 외부 개발자가 사용하는 SDK/라이브러리의 공개 API, 사용법, 버전 정책을 정의합니다.
> 플랫폼/프레임워크 프로젝트에서 사용자 경험의 핵심 문서입니다.

---

## 1. 개요

### 1.1 SDK 정보

| 항목 | 값 |
|-----|-----|
| 패키지명 | `@{{PROJECT_NAME}}/sdk` |
| 버전 | 1.0.0 |
| 지원 런타임 | Node.js 18+, Browser (ESM) |
| 번들 크기 | < 50KB (gzip) |
| 라이선스 | MIT |

### 1.2 설치

```bash
npm install @{{PROJECT_NAME}}/sdk
# or
yarn add @{{PROJECT_NAME}}/sdk
```

### 1.3 빠른 시작

```typescript
import { Client } from '@{{PROJECT_NAME}}/sdk';

const client = new Client({
  apiKey: 'your-api-key',
  baseUrl: 'https://api.example.com',
});

const result = await client.resource.list({ limit: 10 });
console.log(result.data);
```

---

## 2. 공개 API

### 2.1 Client

| 메서드 | 시그니처 | 설명 |
|-------|---------|------|
| `constructor` | `new Client(options: ClientOptions)` | 클라이언트 초기화 |

```typescript
interface ClientOptions {
  apiKey: string;
  baseUrl?: string;          // default: 프로덕션 URL
  timeout?: number;          // default: 30000 (ms)
  retries?: number;          // default: 3
  onError?: (error: SDKError) => void;
}
```

### 2.2 [Resource Name]

| 메서드 | 시그니처 | 설명 |
|-------|---------|------|
| `list` | `list(params?: ListParams): Promise<PaginatedResponse<T>>` | 목록 조회 |
| `get` | `get(id: string): Promise<T>` | 단건 조회 |
| `create` | `create(data: CreateInput): Promise<T>` | 생성 |
| `update` | `update(id: string, data: UpdateInput): Promise<T>` | 수정 |
| `delete` | `delete(id: string): Promise<void>` | 삭제 |

#### 사용 예시

```typescript
// 목록 조회 (페이지네이션)
const items = await client.resource.list({
  page: 1,
  limit: 20,
  sort: 'createdAt',
  order: 'desc',
});

// 단건 조회
const item = await client.resource.get('item_123');

// 생성
const newItem = await client.resource.create({
  name: 'New Item',
  description: 'Description',
});

// 수정
const updated = await client.resource.update('item_123', {
  name: 'Updated Name',
});

// 삭제
await client.resource.delete('item_123');
```

---

## 3. 타입 정의

### 3.1 공통 타입

```typescript
interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

interface SDKError {
  code: string;
  message: string;
  status: number;
  details?: Record<string, unknown>;
}
```

### 3.2 리소스 타입

```typescript
interface Resource {
  id: string;
  name: string;
  description: string;
  createdAt: string;
  updatedAt: string;
}

interface CreateResourceInput {
  name: string;
  description?: string;
}

interface UpdateResourceInput {
  name?: string;
  description?: string;
}
```

---

## 4. 에러 처리

### 4.1 에러 코드

| 코드 | HTTP | 설명 | 대응 |
|-----|:----:|------|------|
| `UNAUTHORIZED` | 401 | API 키 무효 | 키 확인 |
| `FORBIDDEN` | 403 | 권한 없음 | 권한 확인 |
| `NOT_FOUND` | 404 | 리소스 없음 | ID 확인 |
| `RATE_LIMITED` | 429 | 요청 제한 초과 | 재시도 (자동) |
| `SERVER_ERROR` | 500 | 서버 오류 | 재시도 (자동) |

### 4.2 에러 핸들링

```typescript
import { SDKError } from '@{{PROJECT_NAME}}/sdk';

try {
  const item = await client.resource.get('invalid_id');
} catch (error) {
  if (error instanceof SDKError) {
    console.error(`[${error.code}] ${error.message}`);
    // RATE_LIMITED인 경우 자동 재시도됨
  }
}
```

---

## 5. 버전 정책

### 5.1 Semantic Versioning

| 변경 유형 | 버전 | 예시 |
|---------|------|------|
| Breaking change | Major (X.0.0) | 메서드 시그니처 변경 |
| 새 기능 | Minor (0.X.0) | 새 리소스 추가 |
| 버그 수정 | Patch (0.0.X) | 에러 수정 |

### 5.2 지원 정책

| 버전 | 상태 | 지원 종료 |
|-----|:----:|----------|
| v1.x | Active | - |
| v0.x | Deprecated | v1 출시 후 6개월 |

### 5.3 마이그레이션 가이드

Breaking change 시 마이그레이션 가이드를 `MIGRATION.md`에 제공합니다.

---

## 6. 관련 문서

- [서비스 명세](./service-spec.md) — 내부 API 상세
- [연동 명세](./integration-spec.md) — 외부 서비스 연동
- [에러 코드](./error-codes.md) — 전체 에러 코드

---

## 변경 이력

| 버전 | 날짜 | 작성자 | 변경 내용 |
|------|------|--------|----------|
| 1.0.0 | {{DATE}} | tsq-architect | 초기 작성 |

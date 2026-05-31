---
title: Deep Module Gate
impact: CRITICAL
tags: architecture, deep-module, quality-gate
---

# Deep Module Gate

구현이 Deep Module 원칙을 위반하면 TASK 완료를 차단하는 강제 규칙.

## Definition

> 입구(인터페이스)는 매우 단순하고, 복잡한 로직은 안쪽에 깊게 숨겨둔 구조.
> — John Ousterhout, "A Philosophy of Software Design"

## Rules

| Rule | Threshold | Action on Violation |
|------|-----------|-------------------|
| Port 메서드 수 | <= 5개 / 인터페이스 | FAIL: 인터페이스 분할 필요 |
| Adapter LOC ratio | adapter LOC >= port LOC * 3 | FAIL: 구현이 너무 얕음 |
| Export 수 | 모듈 index.ts에서 <= 7개 export | WARN: 모듈 분할 검토 |
| 의존성 깊이 | 모듈 간 import 2단계 이하 | FAIL: 의존성 미로 |

## Incorrect (Shallow Module)

```typescript
// ports.ts - 10개 인터페이스, 각 2메서드
export interface UserReader { findById(id: string): Promise<User | null>; }
export interface UserWriter { save(user: User): Promise<User>; }
export interface UserDeleter { delete(id: string): Promise<void>; }
export interface UserSearcher { search(query: string): Promise<User[]>; }
export interface UserValidator { validate(data: unknown): boolean; }
// ... 5개 더

// adapters/user.repository.ts - 각 20줄
// → 의존성 미로, 인지 과부하
```

## Correct (Deep Module)

```typescript
// ports.ts - 1개 인터페이스, 4메서드
export interface UserRepository {
  findById(id: string): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
  save(user: User): Promise<User>;
  delete(id: string): Promise<void>;
}

// adapters/drizzle.user.repository.ts - 200줄+
// 내부: 트랜잭션 처리, 캐시 전략, 낙관적 잠금, 소프트 삭제...
// → 명확한 계약, 풍부한 내부 로직
```

## Verification Script

```bash
# ports.ts 메서드 수 카운트
grep -c "^\s*\w\+(" src/modules/*/ports.ts

# adapter LOC 대비 port LOC 비율
wc -l src/modules/*/ports.ts src/modules/*/adapters/*.ts
```

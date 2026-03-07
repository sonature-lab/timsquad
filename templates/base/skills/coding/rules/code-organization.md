---
title: Code Organization
impact: MEDIUM
tags: coding, architecture, modules
---

# Code Organization

## Single Responsibility

```typescript
// Bad: 하나의 클래스가 여러 책임
class UserService {
  async createUser(dto: CreateUserDto) { /* ... */ }
  async sendWelcomeEmail(user: User) { /* ... */ }
  async generateReport(userId: string) { /* ... */ }
}

// Good: 책임 분리
class UserService { async createUser(dto: CreateUserDto) { /* ... */ } }
class NotificationService { async sendWelcomeEmail(user: User) { /* ... */ } }
class ReportService { async generateReport(userId: string) { /* ... */ } }
```

## Module Boundaries

```
src/
  modules/
    user/
      user.service.ts
      user.repository.ts
      user.types.ts
      index.ts          # barrel export (public API)
    order/
      order.service.ts
      order.repository.ts
      order.types.ts
      index.ts
```

## Barrel Exports

```typescript
// modules/user/index.ts — 공개 인터페이스만 노출
export { UserService } from './user.service';
export type { User, CreateUserDto } from './user.types';
// user.repository.ts는 내부 구현이므로 export하지 않음

// 외부에서 사용
import { UserService, type User } from '@/modules/user';
```

## Circular Dependency Prevention

```typescript
// Bad: A -> B -> A 순환 참조
// user.service.ts imports order.service.ts
// order.service.ts imports user.service.ts

// Good: 공통 인터페이스 추출
// shared/types.ts
export interface IUserLookup {
  findById(id: string): Promise<User | null>;
}

// order.service.ts — 인터페이스에 의존
class OrderService {
  constructor(private userLookup: IUserLookup) {}
}
```

## Rules

| Rule | Description |
|------|-------------|
| 파일 300줄 제한 | 초과 시 분리 검토 |
| 모듈 간 직접 import 금지 | barrel export(index.ts)를 통해서만 접근 |
| 상위 레이어 import 금지 | domain -> infra 방향 import 불가 |
| 공유 타입은 shared/ | 두 모듈 이상에서 사용되면 shared로 이동 |

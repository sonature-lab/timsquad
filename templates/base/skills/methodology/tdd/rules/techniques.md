---
title: TDD Techniques
impact: HIGH
tags: tdd, testing, techniques
---

# TDD Techniques (Kent Beck)

## Fake It ('Til You Make It)
하드코딩으로 먼저 통과시킨 후, 점진적으로 일반화.
구현 방법이 불확실할 때, 작은 단계로 진행하고 싶을 때 사용.

```typescript
// Step 1: 테스트 작성
it('should add two numbers', () => {
  expect(add(2, 3)).toBe(5);
});

// Step 2: Fake It - 하드코딩으로 통과
function add(a: number, b: number): number {
  return 5;  // ✅ 테스트 통과!
}

// Step 3: 테스트 추가로 일반화 강제
it('should add different numbers', () => {
  expect(add(1, 1)).toBe(2);
});

// Step 4: 이제 일반화 필요
function add(a: number, b: number): number {
  return a + b;
}
```

## Triangulation
2개 이상의 테스트로 일반화를 강제. 일반화 방향이 불명확할 때 사용.

```typescript
// Test 1: 기본 케이스
it('should return 10% discount for $150', () => {
  expect(calculateDiscount(150)).toBe(15);
});

// Test 2: 삼각측량 - 다른 값으로 일반화 강제
it('should return 10% discount for $200', () => {
  expect(calculateDiscount(200)).toBe(20);
});

// Test 3: 경계 조건 삼각측량
it('should return 0 discount for $100 or less', () => {
  expect(calculateDiscount(100)).toBe(0);
});

function calculateDiscount(total: number): number {
  if (total <= 100) return 0;
  return total * 0.1;
}
```

## Obvious Implementation
구현이 명확하면 바로 작성. 자신감이 떨어지면 Fake It으로 돌아가기.

```typescript
it('should return full name', () => {
  const user = { firstName: 'John', lastName: 'Doe' };
  expect(getFullName(user)).toBe('John Doe');
});

function getFullName(user: { firstName: string; lastName: string }): string {
  return `${user.firstName} ${user.lastName}`;
}
```

## One to Many
먼저 단일 항목으로 구현, 그 다음 컬렉션으로 확장.

```typescript
// Step 1: 단일 항목
it('should calculate total for one item', () => {
  expect(calculateTotal([{ price: 100, quantity: 2 }])).toBe(200);
});

// Step 2: 여러 항목으로 확장
it('should calculate total for multiple items', () => {
  expect(calculateTotal([
    { price: 100, quantity: 2 },
    { price: 50, quantity: 1 },
  ])).toBe(250);
});

function calculateTotal(items: Item[]): number {
  return items.reduce((sum, item) => sum + item.price * item.quantity, 0);
}
```

## Assert First
테스트 작성 시 assertion부터 시작, 역방향으로 구성.

```typescript
// Step 1: Assertion 먼저 → Step 2: 함수 호출 → Step 3: Given 구성
it('should complete pending order', () => {
  const order = createOrder({ id: '1', status: 'pending' });
  const result = completeOrder(order);
  expect(result).toEqual({ id: '1', status: 'completed' });
});
```

## Starter Test
가장 단순한 테스트로 시작하여 동작하는 코드 확보. 어디서 시작할지 모를 때 사용.

```typescript
// Good: 가장 단순한 케이스로 시작
it('should create an order', () => {
  const order = createOrder({ userId: '1' });
  expect(order).toBeDefined();
});

// 점진적 확장
it('should add item to order', () => { ... });
it('should calculate subtotal', () => { ... });
```

## Test Data Builder
테스트 데이터 생성을 빌더 패턴으로 추상화. 테스트마다 비슷한 객체 생성이 반복될 때 사용.

```typescript
class UserBuilder {
  private user: Partial<User> = {
    id: 'default-id',
    email: 'test@example.com',
    name: 'Test User',
    role: 'user',
  };

  withRole(role: 'admin' | 'user') { this.user.role = role; return this; }
  build(): User { return this.user as User; }
}

it('should allow admin to delete users', () => {
  const admin = new UserBuilder().withRole('admin').build();
  expect(deleteUser(admin, 'target-123')).toBe(true);
});
```

## Tidying
리팩토링 전 작은 정리. 변수 추출, 메서드 추출 등.

```typescript
// Before: 지저분한 코드
function processOrder(order) {
  if (order.items.reduce((s, i) => s + i.price * i.qty, 0) > 100 && order.user.level === 'gold') {
    return order.items.reduce((s, i) => s + i.price * i.qty, 0) * 0.9;
  }
  return order.items.reduce((s, i) => s + i.price * i.qty, 0);
}

// After: 변수/함수 추출
function calculateSubtotal(items: Item[]): number {
  return items.reduce((sum, item) => sum + item.price * item.qty, 0);
}

function processOrder(order) {
  const subtotal = calculateSubtotal(order.items);
  const qualifiesForDiscount = subtotal > 100 && order.user.level === 'gold';
  return qualifiesForDiscount ? subtotal * 0.9 : subtotal;
}
```

## Learning Test
외부 라이브러리/API 학습용 테스트. 새 라이브러리 사용 전 동작 확인.

```typescript
describe('Prisma Learning Tests', () => {
  it('should create and find user', async () => {
    const user = await prisma.user.create({ data: { email: 'test@test.com', name: 'Test' } });
    const found = await prisma.user.findUnique({ where: { id: user.id } });
    expect(found).toEqual(user);
  });

  it('should return null for non-existent user', async () => {
    const found = await prisma.user.findUnique({ where: { id: 'non-existent' } });
    expect(found).toBeNull();
  });
});
```

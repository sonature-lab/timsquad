---
name: tdd
description: Test-Driven Development 방법론 가이드라인
user-invocable: false
---

<skill name="tdd">
  <purpose>품질 중심 개발을 위한 TDD 방법론 가이드라인 (Kent Beck 기법 포함)</purpose>

  <philosophy>
    <principle>테스트가 설계를 이끈다</principle>
    <principle>작은 단계로 진행한다</principle>
    <principle>리팩토링은 테스트가 보장한다</principle>
    <principle>불확실할 때는 더 작은 단계로</principle>
  </philosophy>

  <cycle>
    <step order="1" name="Red" duration="1-2min">
      <action>실패하는 테스트 작성</action>
      <rules>
        <must>테스트가 실패하는 것을 확인</must>
        <must>한 번에 하나의 기능만 테스트</must>
        <must>테스트 이름으로 의도 명확히 표현</must>
        <must-not>구현 코드 먼저 작성</must-not>
      </rules>
    </step>

    <step order="2" name="Green" duration="3-5min">
      <action>테스트를 통과하는 최소 코드 작성</action>
      <rules>
        <must>테스트 통과만을 목표</must>
        <must>가장 단순한 구현 선택</must>
        <must-not>미래 요구사항 미리 구현</must-not>
        <must-not>완벽한 코드 추구 (아직)</must-not>
      </rules>
    </step>

    <step order="3" name="Refactor" duration="5-10min">
      <action>코드 정리 (테스트는 계속 통과)</action>
      <rules>
        <must>중복 제거</must>
        <must>네이밍 개선</must>
        <must>구조 개선</must>
        <must>테스트 실행하며 진행</must>
        <must-not>기능 변경</must-not>
      </rules>
    </step>
  </cycle>

  <!-- Kent Beck의 TDD 기법들 -->
  <techniques>
    <technique name="Fake It ('Til You Make It)">
      <description>하드코딩으로 먼저 통과시킨 후, 점진적으로 일반화</description>
      <when>구현 방법이 불확실할 때, 작은 단계로 진행하고 싶을 때</when>
      <example>
        <![CDATA[
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
  return a + b;  // ✅ 모든 테스트 통과
}
        ]]>
      </example>
    </technique>

    <technique name="Triangulation">
      <description>2개 이상의 테스트로 일반화를 강제. 하나의 예시로는 부족할 때 사용</description>
      <when>일반화 방향이 불명확할 때, 엣지 케이스 발견하고 싶을 때</when>
      <example>
        <![CDATA[
// 할인 계산기 예시

// Test 1: 기본 케이스
it('should return 10% discount for $150', () => {
  expect(calculateDiscount(150)).toBe(15);
});

// 이 시점에서 하드코딩 가능: return 15;

// Test 2: 삼각측량 - 다른 값으로 일반화 강제
it('should return 10% discount for $200', () => {
  expect(calculateDiscount(200)).toBe(20);
});

// 이제 일반화 필수
function calculateDiscount(total: number): number {
  return total * 0.1;
}

// Test 3: 경계 조건 삼각측량
it('should return 0 discount for $100 or less', () => {
  expect(calculateDiscount(100)).toBe(0);
  expect(calculateDiscount(50)).toBe(0);
});

// 최종 구현
function calculateDiscount(total: number): number {
  if (total <= 100) return 0;
  return total * 0.1;
}
        ]]>
      </example>
    </technique>

    <technique name="Obvious Implementation">
      <description>구현이 명확하면 바로 작성. Fake It이 과할 때</description>
      <when>구현 방법이 명확할 때, 자신감이 있을 때</when>
      <example>
        <![CDATA[
// 구현이 명확한 경우
it('should return full name', () => {
  const user = { firstName: 'John', lastName: 'Doe' };
  expect(getFullName(user)).toBe('John Doe');
});

// Obvious Implementation - 바로 작성
function getFullName(user: { firstName: string; lastName: string }): string {
  return `${user.firstName} ${user.lastName}`;
}

// 주의: 자신감이 떨어지면 Fake It으로 돌아가기
// 테스트 실패하면 → 더 작은 단계로 분해
        ]]>
      </example>
    </technique>

    <technique name="One to Many">
      <description>먼저 단일 항목으로 구현, 그 다음 컬렉션으로 확장</description>
      <when>컬렉션/배열 처리가 필요할 때</when>
      <example>
        <![CDATA[
// Step 1: 단일 항목
it('should calculate total for one item', () => {
  const item = { price: 100, quantity: 2 };
  expect(calculateTotal([item])).toBe(200);
});

function calculateTotal(items: Item[]): number {
  const item = items[0];
  return item.price * item.quantity;
}

// Step 2: 여러 항목으로 확장
it('should calculate total for multiple items', () => {
  const items = [
    { price: 100, quantity: 2 },
    { price: 50, quantity: 1 },
  ];
  expect(calculateTotal(items)).toBe(250);
});

function calculateTotal(items: Item[]): number {
  return items.reduce((sum, item) => sum + item.price * item.quantity, 0);
}

// Step 3: 빈 배열 엣지 케이스
it('should return 0 for empty cart', () => {
  expect(calculateTotal([])).toBe(0);
});
// reduce는 이미 빈 배열 처리함 ✅
        ]]>
      </example>
    </technique>

    <technique name="Assert First">
      <description>테스트 작성 시 assertion부터 시작, 역방향으로 구성</description>
      <when>테스트 구조가 불명확할 때</when>
      <example>
        <![CDATA[
// Step 1: Assertion 먼저
expect(result).toEqual({ id: '1', status: 'completed' });

// Step 2: result는 어디서? → 함수 호출
const result = completeOrder(order);
expect(result).toEqual({ id: '1', status: 'completed' });

// Step 3: order는? → Given 구성
const order = createOrder({ id: '1', status: 'pending' });
const result = completeOrder(order);
expect(result).toEqual({ id: '1', status: 'completed' });

// 최종 테스트
it('should complete pending order', () => {
  // Given
  const order = createOrder({ id: '1', status: 'pending' });

  // When
  const result = completeOrder(order);

  // Then
  expect(result).toEqual({ id: '1', status: 'completed' });
});
        ]]>
      </example>
    </technique>

    <technique name="Starter Test">
      <description>가장 단순한 테스트로 시작하여 동작하는 코드 확보</description>
      <when>어디서 시작할지 모를 때, 새 기능 시작할 때</when>
      <example>
        <![CDATA[
// 주문 시스템 시작하기

// Bad: 너무 복잡한 첫 테스트
it('should process order with discount, tax, and shipping', () => { ... });

// Good: 가장 단순한 케이스로 시작
it('should create an order', () => {
  const order = createOrder({ userId: '1' });
  expect(order).toBeDefined();
  expect(order.userId).toBe('1');
});

// 점진적 확장
it('should add item to order', () => { ... });
it('should calculate subtotal', () => { ... });
it('should apply discount', () => { ... });
it('should calculate tax', () => { ... });
it('should calculate shipping', () => { ... });
        ]]>
      </example>
    </technique>

    <technique name="Test Data Builder">
      <description>테스트 데이터 생성을 빌더 패턴으로 추상화</description>
      <when>테스트마다 비슷한 객체 생성이 반복될 때</when>
      <example>
        <![CDATA[
// Test Data Builder
class UserBuilder {
  private user: Partial<User> = {
    id: 'default-id',
    email: 'test@example.com',
    name: 'Test User',
    role: 'user',
  };

  withId(id: string) {
    this.user.id = id;
    return this;
  }

  withEmail(email: string) {
    this.user.email = email;
    return this;
  }

  withRole(role: 'admin' | 'user') {
    this.user.role = role;
    return this;
  }

  build(): User {
    return this.user as User;
  }
}

// 사용 - 테스트 의도가 명확해짐
it('should allow admin to delete users', () => {
  const admin = new UserBuilder().withRole('admin').build();
  const targetUser = new UserBuilder().withId('target-123').build();

  expect(deleteUser(admin, targetUser.id)).toBe(true);
});

it('should prevent regular user from deleting users', () => {
  const regularUser = new UserBuilder().withRole('user').build();
  const targetUser = new UserBuilder().withId('target-123').build();

  expect(() => deleteUser(regularUser, targetUser.id))
    .toThrow('FORBIDDEN');
});
        ]]>
      </example>
    </technique>

    <technique name="Tidying">
      <description>리팩토링 전 작은 정리. 변수 추출, 메서드 추출 등</description>
      <when>리팩토링 단계에서, 코드가 지저분할 때</when>
      <example>
        <![CDATA[
// Before: 지저분한 코드 (테스트는 통과)
function processOrder(order) {
  if (order.items.reduce((s, i) => s + i.price * i.qty, 0) > 100 && order.user.level === 'gold') {
    return order.items.reduce((s, i) => s + i.price * i.qty, 0) * 0.9;
  }
  return order.items.reduce((s, i) => s + i.price * i.qty, 0);
}

// Tidying Step 1: 변수 추출
function processOrder(order) {
  const subtotal = order.items.reduce((s, i) => s + i.price * i.qty, 0);
  const isGoldMember = order.user.level === 'gold';
  const qualifiesForDiscount = subtotal > 100 && isGoldMember;

  if (qualifiesForDiscount) {
    return subtotal * 0.9;
  }
  return subtotal;
}

// Tidying Step 2: 함수 추출
function calculateSubtotal(items: Item[]): number {
  return items.reduce((sum, item) => sum + item.price * item.qty, 0);
}

function processOrder(order) {
  const subtotal = calculateSubtotal(order.items);
  const qualifiesForDiscount = subtotal > 100 && order.user.level === 'gold';

  return qualifiesForDiscount ? subtotal * 0.9 : subtotal;
}

// 테스트 계속 통과 확인 후 다음 정리
        ]]>
      </example>
    </technique>

    <technique name="Learning Test">
      <description>외부 라이브러리/API 학습용 테스트. 이해도 확인 및 문서화</description>
      <when>새 라이브러리 사용 전, API 동작 확인할 때</when>
      <example>
        <![CDATA[
// Prisma 학습 테스트
describe('Prisma Learning Tests', () => {
  it('should create and find user', async () => {
    // 내가 이해한 대로 동작하는지 확인
    const user = await prisma.user.create({
      data: { email: 'test@test.com', name: 'Test' },
    });

    const found = await prisma.user.findUnique({
      where: { id: user.id },
    });

    expect(found).toEqual(user);
  });

  it('should return null for non-existent user', async () => {
    // findUnique는 null을 반환하나? 에러를 던지나?
    const found = await prisma.user.findUnique({
      where: { id: 'non-existent' },
    });

    expect(found).toBeNull();  // null 반환 확인!
  });

  it('should throw on duplicate email', async () => {
    await prisma.user.create({
      data: { email: 'dup@test.com', name: 'First' },
    });

    // 중복 이메일은 어떤 에러?
    await expect(
      prisma.user.create({
        data: { email: 'dup@test.com', name: 'Second' },
      })
    ).rejects.toThrow(); // PrismaClientKnownRequestError
  });
});
        ]]>
      </example>
    </technique>
  </techniques>

  <real-world-example>
    <title>로그인 기능 TDD로 구현하기</title>
    <scenario>
      <![CDATA[
// === 1단계: Starter Test ===
it('should create auth service', () => {
  const authService = new AuthService(mockUserRepo);
  expect(authService).toBeDefined();
});

// === 2단계: Happy Path ===
it('should return token for valid credentials', async () => {
  // Given
  const mockUser = new UserBuilder()
    .withEmail('user@test.com')
    .withPassword(await hash('password123'))
    .build();
  mockUserRepo.findByEmail.mockResolvedValue(mockUser);

  // When
  const result = await authService.login('user@test.com', 'password123');

  // Then
  expect(result.token).toBeDefined();
  expect(result.user.email).toBe('user@test.com');
});

// === 3단계: Error Cases (삼각측량) ===
it('should throw for non-existent user', async () => {
  mockUserRepo.findByEmail.mockResolvedValue(null);

  await expect(
    authService.login('nobody@test.com', 'password')
  ).rejects.toThrow('INVALID_CREDENTIALS');
});

it('should throw for wrong password', async () => {
  const mockUser = new UserBuilder()
    .withPassword(await hash('correct-password'))
    .build();
  mockUserRepo.findByEmail.mockResolvedValue(mockUser);

  await expect(
    authService.login('user@test.com', 'wrong-password')
  ).rejects.toThrow('INVALID_CREDENTIALS');
});

// === 4단계: Edge Cases ===
it('should throw for locked account', async () => {
  const lockedUser = new UserBuilder()
    .withStatus('locked')
    .build();
  mockUserRepo.findByEmail.mockResolvedValue(lockedUser);

  await expect(
    authService.login('locked@test.com', 'password')
  ).rejects.toThrow('ACCOUNT_LOCKED');
});

// === 5단계: 구현 (테스트가 이끈 설계) ===
class AuthService {
  constructor(private userRepo: UserRepository) {}

  async login(email: string, password: string): Promise<LoginResult> {
    const user = await this.userRepo.findByEmail(email);

    if (!user) {
      throw new AuthError('INVALID_CREDENTIALS');
    }

    if (user.status === 'locked') {
      throw new AuthError('ACCOUNT_LOCKED');
    }

    const isValid = await compare(password, user.password);
    if (!isValid) {
      throw new AuthError('INVALID_CREDENTIALS');
    }

    const token = this.generateToken(user);
    return { token, user: this.toUserDto(user) };
  }
}
      ]]>
    </scenario>
  </real-world-example>

  <anti-patterns>
    <anti-pattern name="Test After">
      <description>구현 후 테스트 작성</description>
      <problem>테스트가 설계에 영향 못 줌, 테스트 커버리지 낮음</problem>
      <solution>테스트 먼저, 실패 확인 후 구현</solution>
    </anti-pattern>
    <anti-pattern name="Too Big Step">
      <description>한 번에 너무 많은 기능 테스트</description>
      <problem>실패 원인 파악 어려움, 피드백 지연</problem>
      <solution>Starter Test로 시작, 점진적 확장</solution>
    </anti-pattern>
    <anti-pattern name="Test the Implementation">
      <description>구현 상세를 테스트 (private 메서드, 내부 상태)</description>
      <problem>리팩토링 시 테스트 깨짐, 유지보수 비용 증가</problem>
      <solution>동작(behavior)을 테스트, public API만 검증</solution>
    </anti-pattern>
    <anti-pattern name="Skipping Refactor">
      <description>Green 후 Refactor 단계 생략</description>
      <problem>기술 부채 누적, 코드 품질 저하</problem>
      <solution>매 사이클마다 Refactor 단계 필수</solution>
    </anti-pattern>
  </anti-patterns>

  <integration-with-ssot>
    <principle>SSOT 명세 → 테스트 케이스 → 구현</principle>
    <workflow>
      <step>1. service-spec.md에서 API 명세 확인</step>
      <step>2. 명세 기반 테스트 케이스 작성 (Starter Test)</step>
      <step>3. 테스트 실패 확인 (Red)</step>
      <step>4. 명세대로 구현 (Green - Fake It 또는 Obvious)</step>
      <step>5. 리팩토링 (Refactor - Tidying)</step>
      <step>6. 삼각측량으로 엣지 케이스 추가</step>
    </workflow>
  </integration-with-ssot>

  <checklist>
    <item priority="critical">테스트 먼저 작성했는가</item>
    <item priority="critical">테스트가 실패하는 것을 확인했는가</item>
    <item priority="critical">최소 코드로 통과했는가 (Fake It OK)</item>
    <item priority="critical">리팩토링 단계를 거쳤는가</item>
    <item priority="high">삼각측량으로 일반화했는가</item>
    <item priority="high">엣지 케이스를 테스트했는가</item>
    <item priority="medium">테스트 이름이 의도를 설명하는가</item>
    <item priority="medium">Test Data Builder를 사용했는가</item>
  </checklist>
</skill>

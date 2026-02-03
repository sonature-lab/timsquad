---
name: coding
description: 코드 작성 규칙 및 패턴 가이드라인
user-invocable: false
---

<skill name="coding">
  <purpose>일관된 고품질 코드 작성을 위한 가이드라인</purpose>

  <naming-conventions>
    <convention target="클래스" rule="PascalCase">
      <example correct="true">UserService, OrderRepository</example>
      <example correct="false">userService, user_service</example>
    </convention>
    <convention target="함수/메서드" rule="camelCase">
      <example correct="true">getUserById, calculateTotal</example>
      <example correct="false">GetUserById, get_user_by_id</example>
    </convention>
    <convention target="변수" rule="camelCase">
      <example correct="true">userName, totalAmount</example>
      <example correct="false">UserName, user_name</example>
    </convention>
    <convention target="상수" rule="UPPER_SNAKE">
      <example correct="true">MAX_RETRY_COUNT, API_BASE_URL</example>
      <example correct="false">maxRetryCount, MaxRetryCount</example>
    </convention>
    <convention target="파일" rule="kebab-case">
      <example correct="true">user-service.ts, order-repository.ts</example>
      <example correct="false">userService.ts, UserService.ts</example>
    </convention>
  </naming-conventions>

  <function-principles>
    <principle name="단일 책임">함수는 한 가지 일만 수행</principle>
    <principle name="명확한 이름">함수 이름만으로 동작 파악 가능</principle>
    <principle name="적절한 크기">20줄 이내 권장</principle>
    <examples>
      <example type="good">
        <![CDATA[
function calculateOrderTotal(items: OrderItem[]): number {
  return items.reduce((sum, item) => sum + item.price * item.quantity, 0);
}
        ]]>
        <description>단일 책임, 명확한 이름</description>
      </example>
      <example type="bad">
        <![CDATA[
function processOrder(order: Order): void {
  // 가격 계산 + 재고 확인 + 결제 처리 + 알림 전송...
}
        ]]>
        <description>여러 책임, 모호한 이름</description>
      </example>
    </examples>
  </function-principles>

  <error-handling>
    <example type="good">
      <![CDATA[
async function getUser(id: string): Promise<User> {
  const user = await userRepository.findById(id);
  if (!user) {
    throw new NotFoundError('USER_NOT_FOUND', `User ${id} not found`);
  }
  return user;
}
      ]]>
      <description>명시적 에러 처리</description>
    </example>
    <example type="bad">
      <![CDATA[
async function getUser(id: string): Promise<User | null> {
  try {
    return await userRepository.findById(id);
  } catch {
    return null; // 에러 원인 알 수 없음
  }
}
      ]]>
      <description>에러 무시</description>
    </example>
  </error-handling>

  <patterns>
    <pattern name="Repository">
      <purpose>데이터 접근 추상화</purpose>
      <example>
        <![CDATA[
interface UserRepository {
  findById(id: string): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
  save(user: User): Promise<User>;
  delete(id: string): Promise<void>;
}

class PostgresUserRepository implements UserRepository {
  async findById(id: string): Promise<User | null> {
    // PostgreSQL 구현
  }
}
        ]]>
      </example>
    </pattern>
    <pattern name="DTO/Entity 분리">
      <purpose>레이어 간 데이터 전달</purpose>
      <example>
        <![CDATA[
// Entity (도메인)
class User {
  constructor(
    public readonly id: string,
    public email: string,
    public passwordHash: string, // 민감 정보
  ) {}
}

// DTO (외부 노출)
interface UserResponseDto {
  id: string;
  email: string;
  // passwordHash 제외
}
        ]]>
      </example>
    </pattern>
    <pattern name="의존성 주입">
      <purpose>테스트 용이성, 유연한 구성</purpose>
      <example type="good">
        <![CDATA[
class UserService {
  constructor(private userRepository: UserRepository) {}
}
        ]]>
      </example>
      <example type="bad">
        <![CDATA[
class UserService {
  private userRepository = new PostgresUserRepository();
}
        ]]>
      </example>
    </pattern>
  </patterns>

  <anti-patterns>
    <anti-pattern name="any 타입">
      <bad>function process(data: any): any { ... }</bad>
      <good>function process&lt;T&gt;(data: T): ProcessedData&lt;T&gt; { ... }</good>
    </anti-pattern>
    <anti-pattern name="매직 넘버">
      <bad>if (status === 1) { ... }</bad>
      <good>
        const Status = { ACTIVE: 1, INACTIVE: 0 } as const;
        if (status === Status.ACTIVE) { ... }
      </good>
    </anti-pattern>
    <anti-pattern name="콘솔 로그">
      <bad>console.log('user:', user);</bad>
      <good>logger.debug('User fetched', { userId: user.id });</good>
    </anti-pattern>
  </anti-patterns>

  <checklist>
    <item>함수가 단일 책임을 가지는가</item>
    <item>네이밍이 명확하고 일관적인가</item>
    <item>에러가 명시적으로 처리되는가</item>
    <item>any 타입이 없는가</item>
    <item>매직 넘버/문자열이 없는가</item>
    <item>console.log가 없는가</item>
  </checklist>
</skill>

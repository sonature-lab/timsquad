---
name: typescript
description: TypeScript 개발 가이드라인
user-invocable: false
---

<skill name="typescript">
  <purpose>타입 안전한 코드 작성을 위한 TypeScript 가이드라인</purpose>

  <philosophy>
    <principle>타입은 문서다 - 코드만 봐도 의도 파악</principle>
    <principle>컴파일 타임에 버그를 잡는다</principle>
    <principle>any는 타입 시스템 포기 선언</principle>
  </philosophy>

  <strict-config>
    <description>tsconfig.json 필수 설정</description>
    <config>
      <![CDATA[
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true
  }
}
      ]]>
    </config>
  </strict-config>

  <type-patterns>
    <pattern name="Discriminated Union (상태 표현의 정석)">
      <description>status 필드로 타입을 구분하여 불가능한 상태를 불가능하게</description>
      <example type="bad">
        <![CDATA[
// Bad: 불가능한 상태가 가능함
interface ApiResponse {
  data?: User;
  error?: string;
  loading: boolean;
}
// { data: undefined, error: "fail", loading: true } 가능 - 의미 없음
        ]]>
      </example>
      <example type="good">
        <![CDATA[
// Good: 불가능한 상태는 타입으로 불가능
type ApiResponse<T> =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; data: T }
  | { status: 'error'; error: Error };

// 사용 - exhaustive check
function renderUser(state: ApiResponse<User>) {
  switch (state.status) {
    case 'idle':
      return null;
    case 'loading':
      return <Spinner />;
    case 'success':
      return <UserCard user={state.data} />; // data 접근 안전
    case 'error':
      return <ErrorMessage error={state.error} />; // error 접근 안전
    // 새 상태 추가 시 컴파일 에러로 알려줌
  }
}
        ]]>
      </example>
    </pattern>

    <pattern name="Type Narrowing (타입 좁히기)">
      <description>조건문으로 타입을 좁혀서 안전하게 사용</description>
      <example>
        <![CDATA[
// 1. typeof narrowing
function process(value: string | number) {
  if (typeof value === 'string') {
    return value.toUpperCase(); // string 메서드 안전
  }
  return value.toFixed(2); // number 메서드 안전
}

// 2. in narrowing
type Fish = { swim: () => void };
type Bird = { fly: () => void };

function move(animal: Fish | Bird) {
  if ('swim' in animal) {
    animal.swim();
  } else {
    animal.fly();
  }
}

// 3. Custom Type Guard
function isError(value: unknown): value is Error {
  return value instanceof Error;
}

function handleResult(result: unknown) {
  if (isError(result)) {
    console.error(result.message); // Error 타입으로 좁혀짐
  }
}

// 4. Assertion Function
function assertDefined<T>(value: T | null | undefined): asserts value is T {
  if (value === null || value === undefined) {
    throw new Error('Value is not defined');
  }
}

function processUser(user: User | null) {
  assertDefined(user);
  console.log(user.name); // user는 이제 User 타입
}
        ]]>
      </example>
    </pattern>

    <pattern name="Branded Types (타입 브랜딩)">
      <description>같은 원시 타입이지만 의미가 다른 값을 구분</description>
      <example>
        <![CDATA[
// 문제: userId와 orderId 둘 다 string이라 실수하기 쉬움
function getUser(id: string) { ... }
function getOrder(id: string) { ... }

const userId = 'user-123';
const orderId = 'order-456';
getUser(orderId); // 컴파일 에러 없음! 버그!

// 해결: Branded Types
type UserId = string & { readonly __brand: 'UserId' };
type OrderId = string & { readonly __brand: 'OrderId' };

// 생성 함수
function createUserId(id: string): UserId {
  // 검증 로직 추가 가능
  if (!id.startsWith('user-')) {
    throw new Error('Invalid user ID format');
  }
  return id as UserId;
}

function createOrderId(id: string): OrderId {
  if (!id.startsWith('order-')) {
    throw new Error('Invalid order ID format');
  }
  return id as OrderId;
}

// 사용
function getUser(id: UserId): Promise<User> { ... }
function getOrder(id: OrderId): Promise<Order> { ... }

const userId = createUserId('user-123');
const orderId = createOrderId('order-456');

getUser(userId);   // ✅ OK
getUser(orderId);  // ❌ Type Error!

// 실전 응용: 금액, 이메일 등
type Money = number & { readonly __brand: 'Money' };
type Email = string & { readonly __brand: 'Email' };
type Password = string & { readonly __brand: 'Password' };
        ]]>
      </example>
    </pattern>

    <pattern name="Template Literal Types">
      <description>문자열 패턴을 타입으로 강제</description>
      <example>
        <![CDATA[
// API 경로 타입
type ApiPath = `/api/${string}`;

function fetchApi(path: ApiPath) { ... }

fetchApi('/api/users');     // ✅ OK
fetchApi('/users');         // ❌ Type Error

// 이벤트 이름 타입
type EventName = `on${Capitalize<string>}`;
// 'onClick', 'onSubmit', 'onChange' 등

// CSS 단위 타입
type CSSUnit = `${number}${'px' | 'rem' | 'em' | '%'}`;
const width: CSSUnit = '100px';  // ✅
const height: CSSUnit = '100';   // ❌

// 환경변수 타입
type EnvVar = `${Uppercase<string>}_${Uppercase<string>}`;
// DATABASE_URL, API_KEY 등
        ]]>
      </example>
    </pattern>

    <pattern name="Infer로 타입 추출">
      <description>조건부 타입에서 타입 추출</description>
      <example>
        <![CDATA[
// Promise에서 내부 타입 추출
type Awaited<T> = T extends Promise<infer U> ? U : T;

type A = Awaited<Promise<string>>; // string
type B = Awaited<Promise<Promise<number>>>; // Promise<number>

// 배열 요소 타입 추출
type ArrayElement<T> = T extends (infer U)[] ? U : never;

type C = ArrayElement<string[]>; // string
type D = ArrayElement<[number, string]>; // number | string

// 함수 첫 번째 인자 타입 추출
type FirstArg<T> = T extends (first: infer F, ...args: any[]) => any ? F : never;

function greet(name: string, age: number) {}
type E = FirstArg<typeof greet>; // string

// 실전: API 응답에서 data 타입 추출
type ApiResponse<T> = { success: true; data: T } | { success: false; error: string };
type ExtractData<T> = T extends { success: true; data: infer D } ? D : never;

type UserResponse = ApiResponse<User>;
type UserData = ExtractData<UserResponse>; // User
        ]]>
      </example>
    </pattern>

    <pattern name="Zod로 런타임 검증">
      <description>외부 입력은 타입만으로 부족, 런타임 검증 필요</description>
      <example>
        <![CDATA[
import { z } from 'zod';

// 스키마 정의 = 타입 + 검증 규칙
const userSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  name: z.string().min(2).max(50),
  age: z.number().int().min(0).max(150).optional(),
  role: z.enum(['admin', 'user', 'guest']),
  createdAt: z.string().datetime(),
});

// 타입 자동 추출
type User = z.infer<typeof userSchema>;
// {
//   id: string;
//   email: string;
//   name: string;
//   age?: number;
//   role: 'admin' | 'user' | 'guest';
//   createdAt: string;
// }

// API 핸들러에서 사용
async function createUser(req: Request) {
  // 런타임 검증 + 타입 안전
  const result = userSchema.safeParse(req.body);

  if (!result.success) {
    return { error: result.error.format() };
  }

  const user = result.data; // User 타입으로 안전하게 사용
  await db.user.create({ data: user });
}

// 환경변수 검증
const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  JWT_SECRET: z.string().min(32),
  PORT: z.coerce.number().default(3000),
});

export const env = envSchema.parse(process.env);
// env.PORT는 number 타입 (coerce로 변환됨)
        ]]>
      </example>
    </pattern>
  </type-patterns>

  <utility-types-advanced>
    <pattern name="DTO 타입 조합">
      <example>
        <![CDATA[
interface User {
  id: string;
  email: string;
  name: string;
  password: string;
  createdAt: Date;
  updatedAt: Date;
}

// Create DTO - id, timestamps 제외
type CreateUserDto = Omit<User, 'id' | 'createdAt' | 'updatedAt'>;
// { email: string; name: string; password: string; }

// Update DTO - id 제외, 나머지 선택적
type UpdateUserDto = Partial<Omit<User, 'id' | 'createdAt' | 'updatedAt'>>;
// { email?: string; name?: string; password?: string; }

// Response DTO - password 제외
type UserResponseDto = Omit<User, 'password'>;
// { id: string; email: string; name: string; createdAt: Date; updatedAt: Date; }

// List Response
type UsersListDto = {
  users: UserResponseDto[];
  total: number;
  page: number;
  limit: number;
};
        ]]>
      </example>
    </pattern>

    <pattern name="DeepPartial / DeepReadonly">
      <example>
        <![CDATA[
// 깊은 곳까지 선택적으로
type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

interface Config {
  database: {
    host: string;
    port: number;
    credentials: {
      user: string;
      password: string;
    };
  };
}

// 부분 설정 가능
const partialConfig: DeepPartial<Config> = {
  database: {
    host: 'localhost',
    // port, credentials 생략 가능
  },
};

// 깊은 곳까지 읽기 전용
type DeepReadonly<T> = {
  readonly [P in keyof T]: T[P] extends object ? DeepReadonly<T[P]> : T[P];
};

const frozenConfig: DeepReadonly<Config> = { ... };
frozenConfig.database.host = 'new'; // ❌ Error
        ]]>
      </example>
    </pattern>
  </utility-types-advanced>

  <real-world-example>
    <title>타입 안전한 API 클라이언트</title>
    <example>
      <![CDATA[
// types/api.ts
type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE';

type ApiEndpoint = {
  '/users': {
    GET: { response: User[]; query?: { page?: number; limit?: number } };
    POST: { response: User; body: CreateUserDto };
  };
  '/users/:id': {
    GET: { response: User; params: { id: string } };
    PUT: { response: User; params: { id: string }; body: UpdateUserDto };
    DELETE: { response: void; params: { id: string } };
  };
};

// 타입 안전한 fetch 래퍼
async function api<
  Path extends keyof ApiEndpoint,
  Method extends keyof ApiEndpoint[Path]
>(
  path: Path,
  method: Method,
  options?: ApiEndpoint[Path][Method] extends { body: infer B } ? { body: B } : never
): Promise<ApiEndpoint[Path][Method] extends { response: infer R } ? R : never> {
  // 구현
}

// 사용 - 자동완성 + 타입 체크
const users = await api('/users', 'GET'); // User[]
const user = await api('/users', 'POST', {
  body: { email: 'a@b.com', name: 'Test', password: '...' }
}); // User

// 잘못된 사용은 컴파일 에러
await api('/users', 'DELETE'); // ❌ DELETE는 /users에 없음
await api('/users', 'POST', { body: { email: 'a@b.com' } }); // ❌ name, password 누락
      ]]>
    </example>
  </real-world-example>

  <rules>
    <category name="필수">
      <must>strict 모드 사용</must>
      <must>함수 반환 타입 명시</must>
      <must>외부 입력(API, 사용자)은 Zod로 런타임 검증</must>
      <must>Discriminated Union으로 상태 표현</must>
      <must>Branded Types로 ID 타입 구분</must>
    </category>
    <category name="금지">
      <must-not>any 사용 (unknown + type guard 대신)</must-not>
      <must-not>타입 단언 남용 (as Type)</must-not>
      <must-not>@ts-ignore, @ts-expect-error 남용</must-not>
      <must-not>! non-null assertion 남용</must-not>
    </category>
  </rules>

  <checklist>
    <item priority="critical">strict 모드 활성화</item>
    <item priority="critical">any 타입 없음</item>
    <item priority="critical">함수 반환 타입 명시</item>
    <item priority="critical">외부 입력 Zod 검증</item>
    <item priority="high">Discriminated Union으로 상태 표현</item>
    <item priority="high">Branded Types로 ID 구분</item>
    <item priority="medium">Utility Types 활용</item>
    <item priority="medium">Template Literal Types 활용</item>
  </checklist>
</skill>

---
name: node
description: Node.js 백엔드 개발 가이드라인 (Hono Framework)
user-invocable: false
---

<skill name="node">
  <purpose>Node.js 기반 백엔드 서비스 개발 가이드라인 (Hono 프레임워크 중심)</purpose>

  <philosophy>
    <principle>비동기 우선 - 블로킹 작업 피하기</principle>
    <principle>에러는 명시적으로 처리</principle>
    <principle>환경 분리 - 설정은 환경변수로</principle>
    <principle>타입 안전한 API - Zod로 검증</principle>
    <principle>레이어 분리 - Clean Architecture</principle>
  </philosophy>

  <project-structure>
    <reference>
      프로젝트 구조는 아키텍처 설정에 따라 결정됩니다.
      - Clean Architecture: architectures/clean/backend.xml
      - Hexagonal Architecture: architectures/hexagonal/backend.xml
    </reference>
  </project-structure>

  <hono-framework>
    <pattern name="기본 앱 설정">
      <example>
        <![CDATA[
// src/app.ts
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { secureHeaders } from 'hono/secure-headers';
import { timing } from 'hono/timing';
import { userRoutes } from './interface/routes/user.routes';
import { orderRoutes } from './interface/routes/order.routes';
import { errorHandler } from './interface/middleware/error-handler';
import { authMiddleware } from './interface/middleware/auth';

const app = new Hono();

// 글로벌 미들웨어
app.use('*', logger());
app.use('*', timing());
app.use('*', secureHeaders());
app.use('*', cors({
  origin: ['http://localhost:3000', 'https://example.com'],
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}));

// 헬스 체크
app.get('/health', (c) => c.json({ status: 'ok', timestamp: new Date().toISOString() }));

// 라우트 마운트
app.route('/api/v1/users', userRoutes);
app.route('/api/v1/orders', orderRoutes);

// 에러 핸들러
app.onError(errorHandler);

// 404 핸들러
app.notFound((c) => {
  return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'Route not found' } }, 404);
});

export default app;
        ]]>
      </example>
    </pattern>

    <pattern name="라우트 정의 (타입 안전)">
      <example>
        <![CDATA[
// src/interface/routes/user.routes.ts
import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { authMiddleware } from '../middleware/auth';
import { UserService } from '../../domain/user/service';
import { createUserSchema, updateUserSchema } from '../validators/user.validator';

// 타입 정의 (Hono 컨텍스트 확장)
type Variables = {
  userId: string;
};

const userRoutes = new Hono<{ Variables: Variables }>();

// 인증이 필요한 라우트
userRoutes.use('*', authMiddleware);

// GET /api/v1/users - 목록 조회
userRoutes.get('/', async (c) => {
  const page = Number(c.req.query('page') || '1');
  const limit = Number(c.req.query('limit') || '10');

  const result = await UserService.findAll({ page, limit });

  return c.json({
    success: true,
    data: result.users,
    pagination: {
      page,
      limit,
      total: result.total,
      totalPages: Math.ceil(result.total / limit),
    },
  });
});

// GET /api/v1/users/:id - 단일 조회
userRoutes.get('/:id', async (c) => {
  const id = c.req.param('id');
  const user = await UserService.findById(id);

  if (!user) {
    return c.json({
      success: false,
      error: { code: 'USER_NOT_FOUND', message: 'User not found' },
    }, 404);
  }

  return c.json({ success: true, data: user });
});

// POST /api/v1/users - 생성
userRoutes.post(
  '/',
  zValidator('json', createUserSchema),
  async (c) => {
    const data = c.req.valid('json');
    const user = await UserService.create(data);

    return c.json({ success: true, data: user }, 201);
  }
);

// PUT /api/v1/users/:id - 수정
userRoutes.put(
  '/:id',
  zValidator('json', updateUserSchema),
  async (c) => {
    const id = c.req.param('id');
    const data = c.req.valid('json');
    const user = await UserService.update(id, data);

    return c.json({ success: true, data: user });
  }
);

// DELETE /api/v1/users/:id - 삭제
userRoutes.delete('/:id', async (c) => {
  const id = c.req.param('id');
  await UserService.delete(id);

  return c.json({ success: true, message: 'User deleted' });
});

export { userRoutes };
        ]]>
      </example>
    </pattern>

    <pattern name="Zod 검증 스키마">
      <example>
        <![CDATA[
// src/interface/validators/user.validator.ts
import { z } from 'zod';

// 생성 스키마
export const createUserSchema = z.object({
  email: z.string().email('올바른 이메일 형식이 아닙니다'),
  name: z.string().min(2, '이름은 2자 이상이어야 합니다').max(50),
  password: z.string()
    .min(8, '비밀번호는 8자 이상이어야 합니다')
    .regex(/[A-Z]/, '대문자를 포함해야 합니다')
    .regex(/[0-9]/, '숫자를 포함해야 합니다'),
  role: z.enum(['USER', 'ADMIN']).default('USER'),
});

// 수정 스키마 (모든 필드 선택적)
export const updateUserSchema = createUserSchema.partial().omit({ password: true });

// 비밀번호 변경 스키마
export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, '현재 비밀번호를 입력하세요'),
  newPassword: z.string()
    .min(8, '비밀번호는 8자 이상이어야 합니다')
    .regex(/[A-Z]/, '대문자를 포함해야 합니다')
    .regex(/[0-9]/, '숫자를 포함해야 합니다'),
  confirmPassword: z.string(),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: '비밀번호가 일치하지 않습니다',
  path: ['confirmPassword'],
});

// 타입 추출
export type CreateUserDto = z.infer<typeof createUserSchema>;
export type UpdateUserDto = z.infer<typeof updateUserSchema>;
export type ChangePasswordDto = z.infer<typeof changePasswordSchema>;
        ]]>
      </example>
    </pattern>
  </hono-framework>

  <authentication-patterns>
    <pattern name="JWT 인증 미들웨어">
      <example>
        <![CDATA[
// src/interface/middleware/auth.ts
import { Context, Next } from 'hono';
import { jwt } from 'hono/jwt';
import { HTTPException } from 'hono/http-exception';
import { config } from '../../config';

// JWT 페이로드 타입
interface JWTPayload {
  sub: string;      // userId
  email: string;
  role: 'USER' | 'ADMIN';
  iat: number;
  exp: number;
}

// 기본 JWT 미들웨어
export const authMiddleware = jwt({
  secret: config.JWT_SECRET,
});

// 역할 기반 접근 제어
export function requireRole(...roles: Array<'USER' | 'ADMIN'>) {
  return async (c: Context, next: Next) => {
    const payload = c.get('jwtPayload') as JWTPayload;

    if (!payload || !roles.includes(payload.role)) {
      throw new HTTPException(403, {
        message: 'Insufficient permissions',
      });
    }

    // 사용자 ID를 컨텍스트에 저장
    c.set('userId', payload.sub);
    c.set('userRole', payload.role);

    await next();
  };
}

// 토큰 생성 유틸리티
import { sign } from 'hono/jwt';

export async function generateTokens(user: { id: string; email: string; role: string }) {
  const now = Math.floor(Date.now() / 1000);

  const accessToken = await sign(
    {
      sub: user.id,
      email: user.email,
      role: user.role,
      iat: now,
      exp: now + 60 * 15, // 15분
    },
    config.JWT_SECRET
  );

  const refreshToken = await sign(
    {
      sub: user.id,
      type: 'refresh',
      iat: now,
      exp: now + 60 * 60 * 24 * 7, // 7일
    },
    config.JWT_REFRESH_SECRET
  );

  return { accessToken, refreshToken };
}
        ]]>
      </example>
    </pattern>

    <pattern name="로그인 라우트">
      <example>
        <![CDATA[
// src/interface/routes/auth.routes.ts
import { Hono } from 'hono';
import { setCookie, getCookie, deleteCookie } from 'hono/cookie';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { UserService } from '../../domain/user/service';
import { generateTokens } from '../middleware/auth';
import { AppError } from '../../shared/errors/base-error';

const authRoutes = new Hono();

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

authRoutes.post('/login', zValidator('json', loginSchema), async (c) => {
  const { email, password } = c.req.valid('json');

  // 사용자 검증
  const user = await UserService.verifyCredentials(email, password);
  if (!user) {
    throw new AppError('AUTH_001', 'Invalid credentials', 401);
  }

  // 토큰 생성
  const { accessToken, refreshToken } = await generateTokens(user);

  // Refresh 토큰은 HttpOnly 쿠키로
  setCookie(c, 'refreshToken', refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'Strict',
    maxAge: 60 * 60 * 24 * 7, // 7일
    path: '/api/v1/auth',
  });

  return c.json({
    success: true,
    data: {
      accessToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    },
  });
});

authRoutes.post('/logout', (c) => {
  deleteCookie(c, 'refreshToken', {
    path: '/api/v1/auth',
  });

  return c.json({ success: true, message: 'Logged out' });
});

authRoutes.post('/refresh', async (c) => {
  const refreshToken = getCookie(c, 'refreshToken');

  if (!refreshToken) {
    throw new AppError('AUTH_003', 'Refresh token required', 401);
  }

  // 토큰 검증 및 갱신 로직
  const tokens = await UserService.refreshTokens(refreshToken);

  setCookie(c, 'refreshToken', tokens.refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'Strict',
    maxAge: 60 * 60 * 24 * 7,
    path: '/api/v1/auth',
  });

  return c.json({
    success: true,
    data: { accessToken: tokens.accessToken },
  });
});

export { authRoutes };
        ]]>
      </example>
    </pattern>
  </authentication-patterns>

  <error-handling>
    <pattern name="커스텀 에러 클래스">
      <example>
        <![CDATA[
// src/shared/errors/base-error.ts
export class AppError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly statusCode: number = 500,
    public readonly details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'AppError';
    Error.captureStackTrace(this, this.constructor);
  }

  toJSON() {
    return {
      code: this.code,
      message: this.message,
      ...(this.details && { details: this.details }),
    };
  }
}

// src/shared/errors/not-found.ts
export class NotFoundError extends AppError {
  constructor(resource: string, id?: string) {
    super(
      `${resource.toUpperCase()}_NOT_FOUND`,
      id ? `${resource} with id ${id} not found` : `${resource} not found`,
      404
    );
  }
}

// src/shared/errors/validation.ts
export class ValidationError extends AppError {
  constructor(message: string, details?: Record<string, unknown>) {
    super('VALIDATION_ERROR', message, 400, details);
  }
}

// src/shared/errors/unauthorized.ts
export class UnauthorizedError extends AppError {
  constructor(message = 'Unauthorized') {
    super('UNAUTHORIZED', message, 401);
  }
}

// src/shared/errors/forbidden.ts
export class ForbiddenError extends AppError {
  constructor(message = 'Forbidden') {
    super('FORBIDDEN', message, 403);
  }
}
        ]]>
      </example>
    </pattern>

    <pattern name="글로벌 에러 핸들러">
      <example>
        <![CDATA[
// src/interface/middleware/error-handler.ts
import { Context } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { ZodError } from 'zod';
import { AppError } from '../../shared/errors/base-error';

export function errorHandler(err: Error, c: Context) {
  console.error('[Error]', {
    name: err.name,
    message: err.message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
  });

  // 커스텀 AppError
  if (err instanceof AppError) {
    return c.json({
      success: false,
      error: err.toJSON(),
    }, err.statusCode as any);
  }

  // Hono HTTPException
  if (err instanceof HTTPException) {
    return c.json({
      success: false,
      error: {
        code: 'HTTP_ERROR',
        message: err.message,
      },
    }, err.status);
  }

  // Zod 검증 에러
  if (err instanceof ZodError) {
    return c.json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Request validation failed',
        details: err.errors.map((e) => ({
          path: e.path.join('.'),
          message: e.message,
        })),
      },
    }, 400);
  }

  // Prisma 에러
  if (err.name === 'PrismaClientKnownRequestError') {
    const prismaError = err as any;
    if (prismaError.code === 'P2002') {
      return c.json({
        success: false,
        error: {
          code: 'DUPLICATE_ENTRY',
          message: 'Resource already exists',
          details: { fields: prismaError.meta?.target },
        },
      }, 409);
    }
    if (prismaError.code === 'P2025') {
      return c.json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Resource not found',
        },
      }, 404);
    }
  }

  // 알 수 없는 에러 (프로덕션에서는 상세 정보 숨김)
  return c.json({
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: process.env.NODE_ENV === 'production'
        ? 'Internal server error'
        : err.message,
    },
  }, 500);
}
        ]]>
      </example>
    </pattern>
  </error-handling>

  <async-patterns>
    <pattern name="Promise.all로 병렬 처리">
      <description>독립적인 작업은 병렬로 실행</description>
      <example type="bad">
        <![CDATA[
// Bad: Sequential - 3 round trips
async function getDashboardData(userId: string) {
  const user = await userService.findById(userId);
  const orders = await orderService.findByUserId(userId);
  const notifications = await notificationService.getUnread(userId);

  return { user, orders, notifications };
}
        ]]>
      </example>
      <example type="good">
        <![CDATA[
// Good: Parallel - 1 round trip
async function getDashboardData(userId: string) {
  const [user, orders, notifications] = await Promise.all([
    userService.findById(userId),
    orderService.findByUserId(userId),
    notificationService.getUnread(userId),
  ]);

  return { user, orders, notifications };
}
        ]]>
      </example>
    </pattern>

    <pattern name="API 라우트에서 Waterfall 방지">
      <example type="bad">
        <![CDATA[
// Bad: config waits for auth, data waits for both
app.get('/dashboard', async (c) => {
  const session = await auth();
  const config = await fetchConfig();
  const data = await fetchData(session.user.id);
  return c.json({ data, config });
});
        ]]>
      </example>
      <example type="good">
        <![CDATA[
// Good: auth and config start immediately
app.get('/dashboard', async (c) => {
  const sessionPromise = auth();
  const configPromise = fetchConfig();

  const session = await sessionPromise;
  const [config, data] = await Promise.all([
    configPromise,
    fetchData(session.user.id),
  ]);

  return c.json({ data, config });
});
        ]]>
      </example>
    </pattern>

    <pattern name="트랜잭션 처리">
      <example>
        <![CDATA[
// src/application/order/create-order.ts
import { prisma } from '../../infrastructure/database/prisma';
import { AppError } from '../../shared/errors/base-error';

interface CreateOrderInput {
  userId: string;
  items: Array<{ productId: string; quantity: number }>;
}

export async function createOrder(input: CreateOrderInput) {
  return prisma.$transaction(async (tx) => {
    // 1. 사용자 확인
    const user = await tx.user.findUnique({ where: { id: input.userId } });
    if (!user) {
      throw new AppError('USER_NOT_FOUND', 'User not found', 404);
    }

    // 2. 재고 확인 및 차감
    let totalAmount = 0;
    for (const item of input.items) {
      const product = await tx.product.findUnique({
        where: { id: item.productId },
      });

      if (!product || product.stock < item.quantity) {
        throw new AppError('INSUFFICIENT_STOCK', `Insufficient stock for ${item.productId}`, 400);
      }

      await tx.product.update({
        where: { id: item.productId },
        data: { stock: { decrement: item.quantity } },
      });

      totalAmount += product.price * item.quantity;
    }

    // 3. 주문 생성
    const order = await tx.order.create({
      data: {
        userId: input.userId,
        totalAmount,
        status: 'PENDING',
        items: {
          create: input.items.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
          })),
        },
      },
      include: { items: true },
    });

    return order;
  });
}
        ]]>
      </example>
    </pattern>
  </async-patterns>

  <config-pattern>
    <pattern name="환경변수 검증 (Zod)">
      <example>
        <![CDATA[
// src/config/index.ts
import { z } from 'zod';

const envSchema = z.object({
  // Server
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(3000),
  HOST: z.string().default('0.0.0.0'),

  // Database
  DATABASE_URL: z.string().url(),

  // JWT
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  JWT_REFRESH_SECRET: z.string().min(32),

  // External Services (선택적)
  REDIS_URL: z.string().url().optional(),
  SENTRY_DSN: z.string().url().optional(),

  // Feature Flags
  ENABLE_SWAGGER: z.coerce.boolean().default(false),
});

// 환경변수 파싱 (앱 시작 시 검증)
const parseResult = envSchema.safeParse(process.env);

if (!parseResult.success) {
  console.error('❌ Invalid environment variables:');
  console.error(parseResult.error.format());
  process.exit(1);
}

export const config = parseResult.data;

// 타입 안전하게 사용
// config.PORT → number
// config.JWT_SECRET → string
// config.REDIS_URL → string | undefined
        ]]>
      </example>
    </pattern>
  </config-pattern>

  <middleware-patterns>
    <pattern name="Rate Limiting">
      <example>
        <![CDATA[
// src/interface/middleware/rate-limit.ts
import { Context, Next } from 'hono';
import { rateLimiter } from 'hono-rate-limiter';

// 일반 API용 (분당 100회)
export const apiRateLimiter = rateLimiter({
  windowMs: 60 * 1000, // 1분
  limit: 100,
  standardHeaders: 'draft-6',
  keyGenerator: (c) => c.req.header('x-forwarded-for') || c.req.header('x-real-ip') || 'unknown',
  message: { success: false, error: { code: 'RATE_LIMIT', message: 'Too many requests' } },
});

// 인증용 (분당 5회)
export const authRateLimiter = rateLimiter({
  windowMs: 60 * 1000,
  limit: 5,
  keyGenerator: (c) => {
    const ip = c.req.header('x-forwarded-for') || 'unknown';
    return `auth:${ip}`;
  },
  message: { success: false, error: { code: 'AUTH_RATE_LIMIT', message: 'Too many login attempts' } },
});
        ]]>
      </example>
    </pattern>

    <pattern name="Request Logging">
      <example>
        <![CDATA[
// src/interface/middleware/logger.ts
import { Context, Next } from 'hono';

export async function requestLogger(c: Context, next: Next) {
  const start = Date.now();
  const requestId = crypto.randomUUID();

  // Request ID 설정
  c.set('requestId', requestId);
  c.header('X-Request-ID', requestId);

  // 요청 로깅
  console.log(JSON.stringify({
    type: 'request',
    requestId,
    method: c.req.method,
    path: c.req.path,
    query: c.req.query(),
    userAgent: c.req.header('user-agent'),
    ip: c.req.header('x-forwarded-for') || 'unknown',
  }));

  await next();

  // 응답 로깅
  const duration = Date.now() - start;
  console.log(JSON.stringify({
    type: 'response',
    requestId,
    method: c.req.method,
    path: c.req.path,
    status: c.res.status,
    duration,
  }));
}
        ]]>
      </example>
    </pattern>
  </middleware-patterns>

  <testing-patterns>
    <pattern name="API 테스트 (Vitest + Hono)">
      <example>
        <![CDATA[
// src/interface/routes/user.routes.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import app from '../../app';

describe('User Routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/v1/users/:id', () => {
    it('사용자를 조회한다', async () => {
      const res = await app.request('/api/v1/users/user-123', {
        method: 'GET',
        headers: {
          Authorization: 'Bearer valid-token',
        },
      });

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data).toHaveProperty('id', 'user-123');
    });

    it('존재하지 않는 사용자는 404를 반환한다', async () => {
      const res = await app.request('/api/v1/users/not-exist', {
        method: 'GET',
        headers: {
          Authorization: 'Bearer valid-token',
        },
      });

      expect(res.status).toBe(404);
      const json = await res.json();
      expect(json.success).toBe(false);
      expect(json.error.code).toBe('USER_NOT_FOUND');
    });
  });

  describe('POST /api/v1/users', () => {
    it('유효한 데이터로 사용자를 생성한다', async () => {
      const res = await app.request('/api/v1/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer valid-token',
        },
        body: JSON.stringify({
          email: 'test@example.com',
          name: 'Test User',
          password: 'Password123',
        }),
      });

      expect(res.status).toBe(201);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data.email).toBe('test@example.com');
    });

    it('유효하지 않은 이메일은 400을 반환한다', async () => {
      const res = await app.request('/api/v1/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer valid-token',
        },
        body: JSON.stringify({
          email: 'invalid-email',
          name: 'Test User',
          password: 'Password123',
        }),
      });

      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error.code).toBe('VALIDATION_ERROR');
    });
  });
});
        ]]>
      </example>
    </pattern>

    <pattern name="Service 테스트 (유닛 테스트)">
      <example>
        <![CDATA[
// src/domain/user/service.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { UserService } from './service';
import { UserRepository } from './repository';
import { NotFoundError } from '../../shared/errors/not-found';

// Repository Mock
const mockRepository: UserRepository = {
  findById: vi.fn(),
  findByEmail: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
};

describe('UserService', () => {
  let service: UserService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new UserService(mockRepository);
  });

  describe('findById', () => {
    it('존재하는 사용자를 반환한다', async () => {
      const mockUser = { id: '1', email: 'test@example.com', name: 'Test' };
      vi.mocked(mockRepository.findById).mockResolvedValue(mockUser);

      const result = await service.findById('1');

      expect(result).toEqual(mockUser);
      expect(mockRepository.findById).toHaveBeenCalledWith('1');
    });

    it('존재하지 않으면 NotFoundError를 던진다', async () => {
      vi.mocked(mockRepository.findById).mockResolvedValue(null);

      await expect(service.findById('not-exist')).rejects.toThrow(NotFoundError);
    });
  });

  describe('create', () => {
    it('새 사용자를 생성한다', async () => {
      const input = { email: 'new@example.com', name: 'New User', password: 'Password123' };
      const mockUser = { id: '1', ...input };
      vi.mocked(mockRepository.create).mockResolvedValue(mockUser);

      const result = await service.create(input);

      expect(result).toEqual(mockUser);
      expect(mockRepository.create).toHaveBeenCalledWith(expect.objectContaining({
        email: input.email,
        name: input.name,
      }));
    });
  });
});
        ]]>
      </example>
    </pattern>
  </testing-patterns>

  <deployment>
    <pattern name="서버 시작 (Graceful Shutdown)">
      <example>
        <![CDATA[
// src/index.ts
import { serve } from '@hono/node-server';
import app from './app';
import { config } from './config';
import { prisma } from './infrastructure/database/prisma';

const server = serve({
  fetch: app.fetch,
  port: config.PORT,
  hostname: config.HOST,
}, (info) => {
  console.log(`🚀 Server running at http://${info.address}:${info.port}`);
});

// Graceful Shutdown
async function shutdown(signal: string) {
  console.log(`\n${signal} received. Shutting down gracefully...`);

  // 새 요청 받지 않기
  server.close(() => {
    console.log('HTTP server closed');
  });

  // DB 연결 종료
  await prisma.$disconnect();
  console.log('Database disconnected');

  process.exit(0);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
        ]]>
      </example>
    </pattern>
  </deployment>

  <rules>
    <category name="비동기">
      <must>async/await 사용</must>
      <must>독립 작업은 Promise.all로 병렬 처리</must>
      <must>에러는 명시적으로 처리</must>
      <must>Waterfall 방지 (Promise 먼저 시작)</must>
      <must-not>동기 파일 I/O (fs.readFileSync)</must-not>
      <must-not>콜백 패턴 사용</must-not>
    </category>
    <category name="보안">
      <must>환경변수로 설정 관리 (Zod 검증)</must>
      <must>입력 검증 (Zod + zValidator)</must>
      <must>에러 메시지에 민감 정보 제외</must>
      <must>JWT는 HttpOnly 쿠키로 Refresh Token 관리</must>
      <must>Rate Limiting 적용</must>
      <must-not>하드코딩된 시크릿</must-not>
      <must-not>검증 없이 사용자 입력 사용</must-not>
    </category>
    <category name="구조">
      <must>레이어 분리 (Clean Architecture)</must>
      <must>의존성 주입 (Repository 패턴)</must>
      <must>글로벌 에러 핸들러 사용</must>
      <must>커스텀 에러 클래스 사용</must>
    </category>
    <category name="Hono 프레임워크">
      <must>타입 안전한 라우트 정의</must>
      <must>zValidator로 요청 검증</must>
      <must>미들웨어로 공통 로직 처리</must>
      <must>일관된 응답 형식 { success, data, error }</must>
    </category>
  </rules>

  <checklist>
    <item priority="critical">async/await 사용</item>
    <item priority="critical">입력 검증 (Zod + zValidator)</item>
    <item priority="critical">글로벌 에러 핸들러</item>
    <item priority="critical">환경변수 Zod 검증</item>
    <item priority="critical">Waterfall 제거 (Promise.all)</item>
    <item priority="high">레이어 분리 (Clean Architecture)</item>
    <item priority="high">커스텀 에러 클래스</item>
    <item priority="high">JWT 인증 (HttpOnly Refresh Token)</item>
    <item priority="high">Rate Limiting</item>
    <item priority="medium">병렬 처리 최적화</item>
    <item priority="medium">Request Logging</item>
    <item priority="medium">Graceful Shutdown</item>
  </checklist>
</skill>

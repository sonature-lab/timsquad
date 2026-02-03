---
title: "환경 설정 (Environment Configuration)"
version: 1.0.0
last_updated: {{DATE}}
author: tsq-planner
status: draft
project: {{PROJECT_NAME}}
---

# 환경 설정 (Environment Configuration)

> 환경별 설정값, 환경변수, 시크릿 관리를 정의합니다.

---

## 1. 환경 개요

### 1.1 환경 목록

| 환경 | 용도 | URL | 비고 |
|-----|------|-----|------|
| **local** | 로컬 개발 | localhost:3000 | 개인 개발 |
| **development** | 개발 서버 | dev.example.com | 통합 테스트 |
| **staging** | QA/테스트 | staging.example.com | Production 유사 |
| **production** | 서비스 운영 | example.com | 실서비스 |

### 1.2 환경별 특성

| 특성 | Local | Development | Staging | Production |
|-----|:-----:|:-----------:|:-------:|:----------:|
| 디버그 모드 | ✅ | ✅ | ❌ | ❌ |
| 로그 레벨 | debug | debug | info | warn |
| 외부 API | Mock | Sandbox | Sandbox | Real |
| DB | Local | Shared | Dedicated | Dedicated |
| SSL | ❌ | ✅ | ✅ | ✅ |

---

## 2. 환경변수 목록

### 2.1 애플리케이션 설정

| 변수명 | 설명 | 타입 | 필수 | 기본값 |
|-------|------|------|:----:|--------|
| `NODE_ENV` | 실행 환경 | string | ✅ | development |
| `PORT` | 서버 포트 | number | ❌ | 3000 |
| `HOST` | 호스트 주소 | string | ❌ | 0.0.0.0 |
| `API_VERSION` | API 버전 | string | ❌ | v1 |
| `LOG_LEVEL` | 로그 레벨 | enum | ❌ | info |
| `TZ` | 타임존 | string | ❌ | UTC |

### 2.2 데이터베이스 설정

| 변수명 | 설명 | 타입 | 필수 | 시크릿 |
|-------|------|------|:----:|:------:|
| `DATABASE_URL` | DB 연결 문자열 | string | ✅ | ✅ |
| `DB_HOST` | DB 호스트 | string | ⚪ | ❌ |
| `DB_PORT` | DB 포트 | number | ⚪ | ❌ |
| `DB_NAME` | DB 이름 | string | ⚪ | ❌ |
| `DB_USER` | DB 사용자 | string | ⚪ | ✅ |
| `DB_PASSWORD` | DB 비밀번호 | string | ⚪ | ✅ |
| `DB_SSL` | SSL 사용 여부 | boolean | ❌ | ❌ |
| `DB_POOL_MIN` | 최소 커넥션 | number | ❌ | ❌ |
| `DB_POOL_MAX` | 최대 커넥션 | number | ❌ | ❌ |

> ⚪ = `DATABASE_URL` 사용 시 불필요

### 2.3 캐시/세션 설정

| 변수명 | 설명 | 타입 | 필수 | 시크릿 |
|-------|------|------|:----:|:------:|
| `REDIS_URL` | Redis 연결 문자열 | string | ⚪ | ✅ |
| `REDIS_HOST` | Redis 호스트 | string | ⚪ | ❌ |
| `REDIS_PORT` | Redis 포트 | number | ❌ | ❌ |
| `REDIS_PASSWORD` | Redis 비밀번호 | string | ⚪ | ✅ |
| `SESSION_SECRET` | 세션 시크릿 | string | ✅ | ✅ |
| `SESSION_TTL` | 세션 만료 (초) | number | ❌ | ❌ |

### 2.4 인증/보안 설정

| 변수명 | 설명 | 타입 | 필수 | 시크릿 |
|-------|------|------|:----:|:------:|
| `JWT_SECRET` | JWT 서명 키 | string | ✅ | ✅ |
| `JWT_EXPIRES_IN` | JWT 만료 시간 | string | ❌ | ❌ |
| `JWT_REFRESH_SECRET` | Refresh 토큰 키 | string | ⚪ | ✅ |
| `JWT_REFRESH_EXPIRES_IN` | Refresh 만료 | string | ❌ | ❌ |
| `BCRYPT_ROUNDS` | 해시 라운드 | number | ❌ | ❌ |
| `CORS_ORIGINS` | 허용 Origin | string | ❌ | ❌ |

### 2.5 외부 서비스 설정

| 변수명 | 설명 | 타입 | 필수 | 시크릿 |
|-------|------|------|:----:|:------:|
| `AWS_REGION` | AWS 리전 | string | ⚪ | ❌ |
| `AWS_ACCESS_KEY_ID` | AWS 액세스 키 | string | ⚪ | ✅ |
| `AWS_SECRET_ACCESS_KEY` | AWS 시크릿 키 | string | ⚪ | ✅ |
| `S3_BUCKET` | S3 버킷명 | string | ⚪ | ❌ |
| `SMTP_HOST` | SMTP 서버 | string | ⚪ | ❌ |
| `SMTP_USER` | SMTP 사용자 | string | ⚪ | ✅ |
| `SMTP_PASSWORD` | SMTP 비밀번호 | string | ⚪ | ✅ |

---

## 3. 환경별 설정값

### 3.1 Local

```env
# .env.local
NODE_ENV=development
PORT=3000
LOG_LEVEL=debug

# Database (Local)
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/{{PROJECT_NAME}}_dev

# Redis (Local)
REDIS_URL=redis://localhost:6379

# Auth
JWT_SECRET=local-dev-secret-change-in-production
JWT_EXPIRES_IN=1d
SESSION_SECRET=local-session-secret

# 기타
CORS_ORIGINS=http://localhost:3000,http://localhost:3001
```

### 3.2 Development

```env
# .env.development
NODE_ENV=development
PORT=3000
LOG_LEVEL=debug

# Database
DATABASE_URL=${DEV_DATABASE_URL}

# Redis
REDIS_URL=${DEV_REDIS_URL}

# Auth (시크릿 매니저에서 관리)
JWT_SECRET=${DEV_JWT_SECRET}
SESSION_SECRET=${DEV_SESSION_SECRET}

# External Services (Sandbox)
AWS_REGION=ap-northeast-2
```

### 3.3 Staging

```env
# .env.staging
NODE_ENV=staging
PORT=3000
LOG_LEVEL=info

# Database
DATABASE_URL=${STAGING_DATABASE_URL}

# Redis
REDIS_URL=${STAGING_REDIS_URL}

# Auth
JWT_SECRET=${STAGING_JWT_SECRET}
SESSION_SECRET=${STAGING_SESSION_SECRET}

# External Services
AWS_REGION=ap-northeast-2
```

### 3.4 Production

```env
# .env.production
NODE_ENV=production
PORT=3000
LOG_LEVEL=warn

# Database (시크릿 매니저)
DATABASE_URL=${PROD_DATABASE_URL}

# Redis
REDIS_URL=${PROD_REDIS_URL}

# Auth
JWT_SECRET=${PROD_JWT_SECRET}
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
SESSION_SECRET=${PROD_SESSION_SECRET}

# External Services
AWS_REGION=ap-northeast-2
```

---

## 4. 시크릿 관리

### 4.1 시크릿 목록

| 시크릿명 | 환경 | 관리 도구 | 비고 |
|---------|------|----------|------|
| `DATABASE_URL` | All | AWS Secrets Manager | DB 연결 |
| `JWT_SECRET` | All | AWS Secrets Manager | 토큰 서명 |
| `SESSION_SECRET` | All | AWS Secrets Manager | 세션 암호화 |
| `REDIS_PASSWORD` | Staging/Prod | AWS Secrets Manager | 캐시 인증 |
| `AWS_SECRET_ACCESS_KEY` | All | IAM Role (권장) | AWS 인증 |
| `SMTP_PASSWORD` | All | AWS Secrets Manager | 이메일 발송 |

### 4.2 시크릿 관리 정책

```yaml
secret_policy:
  rotation:
    DATABASE_URL: 90d
    JWT_SECRET: 30d
    SESSION_SECRET: 30d

  access:
    development:
      - team: developers
        permission: read
    staging:
      - team: developers
        permission: read
      - team: qa
        permission: read
    production:
      - team: devops
        permission: admin
      - team: developers
        permission: none  # CI/CD만 접근
```

### 4.3 시크릿 접근 방법

**Local (dotenv):**
```typescript
// .env.local 파일에서 로드
import 'dotenv/config';

const secret = process.env.JWT_SECRET;
```

**Production (AWS Secrets Manager):**
```typescript
import { SecretsManager } from '@aws-sdk/client-secrets-manager';

const client = new SecretsManager({ region: 'ap-northeast-2' });
const secret = await client.getSecretValue({ SecretId: 'prod/jwt-secret' });
```

---

## 5. 설정 검증

### 5.1 필수 환경변수 검증

```typescript
// config/validation.ts
import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'staging', 'production']),
  PORT: z.coerce.number().default(3000),
  DATABASE_URL: z.string().url(),
  JWT_SECRET: z.string().min(32),
  SESSION_SECRET: z.string().min(32),
});

export const env = envSchema.parse(process.env);
```

### 5.2 시작 시 검증

| 검증 항목 | 실패 시 동작 |
|---------|-------------|
| 필수 변수 누락 | 앱 시작 중단 + 에러 로그 |
| DB 연결 실패 | 앱 시작 중단 + 알림 |
| Redis 연결 실패 | 경고 + 폴백 (in-memory) |
| 시크릿 형식 오류 | 앱 시작 중단 |

---

## 6. Feature Flags

### 6.1 플래그 목록

| 플래그 | 설명 | 기본값 | 환경별 |
|-------|------|:------:|--------|
| `FEATURE_NEW_UI` | 새 UI 활성화 | false | Staging만 true |
| `FEATURE_BETA_API` | Beta API 노출 | false | Dev만 true |
| `FEATURE_MAINTENANCE` | 점검 모드 | false | 필요 시 true |

### 6.2 플래그 사용

```typescript
// 환경변수 방식
if (process.env.FEATURE_NEW_UI === 'true') {
  // 새 UI 렌더링
}

// 설정 서비스 방식 (권장)
if (await featureService.isEnabled('NEW_UI', userId)) {
  // 사용자별 롤아웃 지원
}
```

---

## 7. 배포 시 체크리스트

### 7.1 환경별 체크리스트

| 항목 | Dev | Staging | Prod |
|-----|:---:|:-------:|:----:|
| 환경변수 설정 완료 | ✅ | ✅ | ✅ |
| 시크릿 등록 완료 | ✅ | ✅ | ✅ |
| DB 마이그레이션 | ✅ | ✅ | ✅ |
| SSL 인증서 | ❌ | ✅ | ✅ |
| 모니터링 연동 | ❌ | ✅ | ✅ |
| 알림 설정 | ❌ | ⚪ | ✅ |

### 7.2 롤백 시 주의사항

- 시크릿 변경 후 롤백 시 **이전 시크릿 값 필요**
- Feature flag 롤백은 **즉시 적용됨**
- DB 스키마 변경은 **backwards-compatible 필수**

---

## 8. 관련 문서

- [배포 명세](./deployment-spec.md) - CI/CD 설정
- [보안 명세](./security-spec.md) - 인증/암호화
- [외부 연동 명세](./integration-spec.md) - 외부 서비스

---

## 변경 이력

| 버전 | 날짜 | 작성자 | 변경 내용 |
|------|------|--------|----------|
| 1.0.0 | {{DATE}} | tsq-planner | 초기 작성 |

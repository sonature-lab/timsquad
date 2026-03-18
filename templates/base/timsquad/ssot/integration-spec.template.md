---
title: "외부 연동 명세서 (Integration Specification)"
version: 1.0.0
last_updated: {{DATE}}
author: tsq-architect
status: draft
project: {{PROJECT_NAME}}
required_level: 3
---

# 외부 연동 명세서 (Integration Specification)

> 외부 API, 서드파티 서비스, Webhook 연동을 정의합니다.
> Level 3 (Enterprise) 또는 platform 타입 프로젝트 필수 문서입니다.

---

## 1. 연동 개요

### 1.1 연동 서비스 목록

| 서비스 | 용도 | 제공사 | 우선순위 | 상태 |
|-------|------|--------|:--------:|:----:|
| 결제 | 카드/계좌 결제 | Stripe/Toss | P0 | 📋 |
| 인증 | OAuth 로그인 | Google/Kakao | P1 | 📋 |
| 이메일 | 알림/마케팅 | SendGrid | P1 | 📋 |
| SMS | 인증/알림 | Twilio | P2 | 📋 |
| 스토리지 | 파일 업로드 | AWS S3 | P1 | 📋 |
| 모니터링 | 에러 추적 | Sentry | P1 | 📋 |
| 분석 | 사용자 행동 | Amplitude | P2 | 📋 |

> 상태: 📋 계획 / 🚧 개발 중 / ✅ 완료 / ⏸️ 보류

### 1.2 연동 아키텍처

```
┌─────────────────────────────────────────────────────────────┐
│                     {{PROJECT_NAME}}                         │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                Integration Layer                     │   │
│  │                                                       │   │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐            │   │
│  │  │ Payment  │ │  Auth    │ │ Storage  │ ...        │   │
│  │  │ Adapter  │ │ Adapter  │ │ Adapter  │            │   │
│  │  └────┬─────┘ └────┬─────┘ └────┬─────┘            │   │
│  └───────┼────────────┼────────────┼────────────────────┘   │
│          │            │            │                         │
└──────────┼────────────┼────────────┼─────────────────────────┘
           │            │            │
           ▼            ▼            ▼
    ┌──────────┐ ┌──────────┐ ┌──────────┐
    │  Stripe  │ │  Google  │ │  AWS S3  │
    │  Toss    │ │  Kakao   │ │          │
    └──────────┘ └──────────┘ └──────────┘
```

---

## 2. 결제 연동

### 2.1 서비스 정보

| 항목 | 값 |
|-----|---|
| **제공사** | Stripe / Toss Payments |
| **API 버전** | 2023-10-16 |
| **환경** | Sandbox (Dev/Staging) / Live (Prod) |
| **문서** | https://stripe.com/docs/api |

### 2.2 지원 결제 수단

| 결제 수단 | 지원 | 비고 |
|---------|:----:|------|
| 신용카드 | ✅ | Visa, Master, Amex |
| 체크카드 | ✅ | |
| 계좌이체 | ✅ | 실시간 |
| 가상계좌 | ✅ | 무통장입금 |
| 간편결제 | ⚪ | 카카오페이, 네이버페이 |

### 2.3 API 엔드포인트

| 기능 | Method | Endpoint | 설명 |
|-----|--------|----------|------|
| 결제 생성 | POST | `/v1/payments` | 결제 의도 생성 |
| 결제 확인 | POST | `/v1/payments/{id}/confirm` | 결제 승인 |
| 결제 취소 | POST | `/v1/payments/{id}/cancel` | 전체/부분 취소 |
| 결제 조회 | GET | `/v1/payments/{id}` | 상태 조회 |
| 환불 요청 | POST | `/v1/refunds` | 환불 처리 |

### 2.4 Webhook 이벤트

| 이벤트 | 트리거 | 처리 |
|-------|-------|------|
| `payment.success` | 결제 성공 | 주문 상태 업데이트 |
| `payment.failed` | 결제 실패 | 알림 발송, 재시도 |
| `payment.refunded` | 환불 완료 | 재고 복원 |
| `payment.disputed` | 분쟁 발생 | 관리자 알림 |

### 2.5 에러 처리

| 에러 코드 | 설명 | 대응 |
|----------|------|------|
| `card_declined` | 카드 거절 | 다른 결제 수단 안내 |
| `insufficient_funds` | 잔액 부족 | 금액 확인 안내 |
| `expired_card` | 만료된 카드 | 카드 정보 업데이트 |
| `processing_error` | 처리 오류 | 재시도 (3회) |

---

## 3. 인증 연동 (OAuth)

### 3.1 지원 제공자

| 제공자 | Client ID | Scope | Callback URL |
|-------|-----------|-------|--------------|
| Google | `GOOGLE_CLIENT_ID` | email, profile | `/auth/google/callback` |
| Kakao | `KAKAO_CLIENT_ID` | profile, email | `/auth/kakao/callback` |
| Naver | `NAVER_CLIENT_ID` | name, email | `/auth/naver/callback` |
| Apple | `APPLE_CLIENT_ID` | name, email | `/auth/apple/callback` |

### 3.2 OAuth 플로우

```
┌──────┐     ┌─────────┐     ┌──────────┐     ┌──────────┐
│Client│     │  Server │     │ Provider │     │    DB    │
└──┬───┘     └────┬────┘     └────┬─────┘     └────┬─────┘
   │              │               │                │
   │  1. Login    │               │                │
   │─────────────>│               │                │
   │              │               │                │
   │  2. Redirect │               │                │
   │<─────────────│               │                │
   │              │               │                │
   │  3. Auth Request             │                │
   │─────────────────────────────>│                │
   │              │               │                │
   │  4. Auth Code│               │                │
   │<─────────────────────────────│                │
   │              │               │                │
   │  5. Callback │               │                │
   │─────────────>│               │                │
   │              │  6. Token Exchange             │
   │              │──────────────>│                │
   │              │               │                │
   │              │  7. User Info │                │
   │              │<──────────────│                │
   │              │               │                │
   │              │  8. Create/Update User         │
   │              │────────────────────────────────>
   │              │               │                │
   │  9. JWT      │               │                │
   │<─────────────│               │                │
```

### 3.3 사용자 매핑

| Provider 필드 | 내부 필드 | 비고 |
|--------------|----------|------|
| `sub` / `id` | `provider_id` | 고유 식별자 |
| `email` | `email` | 이메일 검증 필요 |
| `name` / `nickname` | `name` | |
| `picture` / `profile_image` | `avatar_url` | 선택적 |

---

## 4. 이메일 연동

### 4.1 서비스 정보

| 항목 | 값 |
|-----|---|
| **제공사** | SendGrid |
| **API 버전** | v3 |
| **일일 한도** | 10,000 (Free), Unlimited (Paid) |

### 4.2 이메일 템플릿

| 템플릿 ID | 용도 | 트리거 |
|----------|------|--------|
| `welcome` | 회원가입 환영 | 가입 완료 |
| `verify-email` | 이메일 인증 | 가입/변경 요청 |
| `reset-password` | 비밀번호 재설정 | 재설정 요청 |
| `order-confirm` | 주문 확인 | 결제 완료 |
| `order-shipped` | 배송 알림 | 배송 시작 |

### 4.3 API 사용

```typescript
// 이메일 발송
interface SendEmailRequest {
  to: string;
  template_id: string;
  dynamic_template_data: Record<string, any>;
}

// POST /v3/mail/send
```

---

## 5. 파일 스토리지 연동

### 5.1 서비스 정보

| 항목 | 값 |
|-----|---|
| **제공사** | AWS S3 |
| **리전** | ap-northeast-2 |
| **버킷** | `{{PROJECT_NAME}}-{env}` |

### 5.2 폴더 구조

```
s3://{{PROJECT_NAME}}-prod/
├── uploads/              # 사용자 업로드
│   ├── images/
│   ├── documents/
│   └── temp/
├── assets/               # 정적 자산
│   ├── images/
│   └── fonts/
└── backups/              # 백업
```

### 5.3 업로드 정책

| 항목 | 값 |
|-----|---|
| 최대 파일 크기 | 10MB (이미지), 50MB (문서) |
| 허용 형식 | jpg, png, gif, pdf, docx, xlsx |
| 업로드 방식 | Pre-signed URL |
| 만료 시간 | 15분 |

### 5.4 Pre-signed URL 플로우

```
┌──────┐     ┌─────────┐     ┌─────────┐
│Client│     │  Server │     │   S3    │
└──┬───┘     └────┬────┘     └────┬────┘
   │              │               │
   │ 1. Request URL               │
   │─────────────>│               │
   │              │               │
   │              │ 2. Generate   │
   │              │   Pre-signed  │
   │              │               │
   │ 3. Return URL│               │
   │<─────────────│               │
   │              │               │
   │ 4. Direct Upload             │
   │─────────────────────────────>│
   │              │               │
   │ 5. Upload Complete           │
   │<─────────────────────────────│
   │              │               │
   │ 6. Confirm   │               │
   │─────────────>│               │
```

---

## 6. Webhook 수신

### 6.1 공통 설정

| 항목 | 값 |
|-----|---|
| 엔드포인트 | `/webhooks/{provider}` |
| 인증 | Signature 검증 |
| 재시도 | 3회 (exponential backoff) |
| 타임아웃 | 30초 |

### 6.2 Webhook 보안

```typescript
// Signature 검증 예시 (Stripe)
function verifyWebhook(payload: string, signature: string): boolean {
  const expectedSig = crypto
    .createHmac('sha256', process.env.WEBHOOK_SECRET)
    .update(payload)
    .digest('hex');

  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSig)
  );
}
```

### 6.3 멱등성 처리

| 처리 | 설명 |
|-----|------|
| Event ID 저장 | DB에 처리된 이벤트 기록 |
| 중복 체크 | 동일 ID 재수신 시 무시 |
| 순서 보장 | timestamp 기반 처리 |

---

## 7. 모니터링/분석 연동

### 7.1 에러 추적 (Sentry)

```typescript
// 초기화
Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 0.1,
});

// 에러 캡처
Sentry.captureException(error, {
  tags: { module: 'payment' },
  extra: { orderId: order.id },
});
```

### 7.2 분석 (Amplitude)

```typescript
// 이벤트 추적
amplitude.track('purchase_completed', {
  order_id: order.id,
  amount: order.total,
  items: order.items.length,
});
```

---

## 8. Rate Limiting & 재시도

### 8.1 제공사별 한도

| 서비스 | Rate Limit | 초과 시 |
|-------|-----------|---------|
| Stripe | 100 req/s | 429 + Retry-After |
| SendGrid | 600 req/min | 429 |
| S3 | 3,500 PUT/s | 503 |

### 8.2 재시도 전략

```typescript
const retryConfig = {
  maxRetries: 3,
  baseDelay: 1000,      // 1초
  maxDelay: 30000,      // 30초
  factor: 2,            // exponential
  retryableErrors: [429, 500, 502, 503, 504],
};
```

---

## 9. 테스트 전략

### 9.1 환경별 설정

| 환경 | 연동 방식 |
|-----|----------|
| Unit Test | Mock 사용 |
| Integration | Sandbox API |
| Staging | Sandbox API |
| Production | Live API |

### 9.2 테스트 데이터

| 서비스 | 테스트 데이터 |
|-------|-------------|
| Stripe | `4242 4242 4242 4242` (성공) |
| Stripe | `4000 0000 0000 0002` (거절) |
| OAuth | 테스트 계정 사용 |

---

## 10. 관련 문서

- [API 명세](./service-spec.md) - 내부 API
- [환경 설정](./env-config.md) - API 키 관리
- [에러 코드](./error-codes.md) - 에러 정의
- [보안 명세](./security-spec.md) - 인증/암호화

---

## 변경 이력

| 버전 | 날짜 | 작성자 | 변경 내용 |
|------|------|--------|----------|
| 1.0.0 | {{DATE}} | tsq-architect | 초기 작성 |

---
title: DDD Strategic Patterns
impact: HIGH
tags: ddd, architecture, domain-modeling
---

# DDD Strategic Patterns

## Bounded Context
특정 도메인 모델이 적용되는 명시적 경계.
같은 용어도 컨텍스트마다 다른 의미를 가질 수 있음.

### "Product"의 다른 의미
- **Catalog**: 상품 정보, 설명, 이미지
- **Inventory**: 재고 수량, 위치, SKU
- **Pricing**: 가격, 할인, 프로모션
- **Shipping**: 무게, 크기, 배송 제한

### 가이드라인
- 하나의 Bounded Context = 하나의 팀
- 하나의 Bounded Context = 하나의 코드베이스 (또는 모듈)
- 컨텍스트 간 통신은 명시적 인터페이스로

## Subdomain 유형

| 유형 | 설명 | 전략 | 예시 |
|------|------|------|------|
| Core | 비즈니스 핵심 차별화 | 최고 인력, 자체 개발 | 쿠팡 로켓배송 |
| Supporting | Core 지원, 차별화 아님 | 아웃소싱/적당한 품질 | 내부 관리 시스템 |
| Generic | 모든 비즈니스에 공통 | 구매/오픈소스 | 결제, 인증, 이메일 |

## Context Map Relationships

| 관계 | 설명 | 다이어그램 |
|------|------|-----------|
| Partnership | 긴밀한 협력, 함께 성공/실패 | [A] ←Partnership→ [B] |
| Shared Kernel | 공유 모델, 양쪽 합의 필요 (최소화) | [A] ←Shared Kernel→ [B] |
| Customer-Supplier | 공급자가 고객 요구 수용 | [Supplier] → [Customer] |
| Conformist | Downstream이 Upstream 모델 수용 | [Upstream] → [Downstream] |
| ACL | 번역 레이어로 외부 모델로부터 보호 | [External] →ACL→ [Ours] |
| Open Host Service | 잘 정의된 프로토콜로 서비스 제공 | [Context] →OHS→ [Consumers] |

## Anti-Corruption Layer 예시 (Stripe 결제)

```typescript
// 외부 모델 (Stripe)
interface StripePaymentIntent {
  id: string;
  amount: number;           // cents
  status: 'succeeded' | 'pending' | 'failed';
}

// 우리 도메인 모델
interface Payment {
  id: PaymentId;
  amount: Money;            // 우리의 Money Value Object
  status: PaymentStatus;
}

// ACL
class StripePaymentAdapter implements PaymentGateway {
  async processPayment(payment: Payment): Promise<PaymentResult> {
    const intent = await this.stripe.paymentIntents.create({
      amount: payment.amount.toCents(),
      currency: payment.amount.currency.toLowerCase(),
    });
    return this.toPaymentResult(intent);
  }

  private mapStatus(stripeStatus: string): PaymentStatus {
    const mapping: Record<string, PaymentStatus> = {
      'succeeded': PaymentStatus.COMPLETED,
      'pending': PaymentStatus.PROCESSING,
      'failed': PaymentStatus.FAILED,
    };
    return mapping[stripeStatus] ?? PaymentStatus.UNKNOWN;
  }
}
```

## Event Storming
1. Domain Events 도출 (주황색)
2. Commands 식별 (파란색)
3. Aggregates 그룹핑 (노란색)
4. Bounded Context 경계 그리기
5. Context Map 작성

## 디렉토리 구조 (모노레포)

```
packages/
├── catalog/         # Catalog Context
│   └── src/domain/ + application/ + infrastructure/
├── order/           # Order Context
├── inventory/       # Inventory Context
└── shared/          # Shared Kernel (최소화)
    └── src/value-objects/ + events/
```

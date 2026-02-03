---
name: ddd
description: Domain-Driven Design 전략적 설계 가이드라인
user-invocable: false
compatible-with: [tdd, bdd]
note: 전술적 패턴(Aggregate, Entity 등)은 architectures/에 포함됨
---

<skill name="ddd">
  <purpose>복잡한 도메인을 효과적으로 모델링하는 전략적 설계 방법론</purpose>

  <philosophy>
    <principle>도메인 전문가와 개발자의 협업</principle>
    <principle>유비쿼터스 언어 (Ubiquitous Language)</principle>
    <principle>모델 주도 설계 (Model-Driven Design)</principle>
    <principle>경계 컨텍스트로 복잡성 분리</principle>
  </philosophy>

  <strategic-vs-tactical>
    <strategic location="이 스킬">
      <item>Bounded Context (경계 컨텍스트)</item>
      <item>Ubiquitous Language (유비쿼터스 언어)</item>
      <item>Context Map (컨텍스트 맵)</item>
      <item>Subdomain (서브도메인)</item>
    </strategic>
    <tactical location="architectures/ 및 patterns/">
      <item>Aggregate, Entity, Value Object → clean/backend.xml</item>
      <item>Repository → patterns/repository.xml</item>
      <item>Domain Event → patterns/event-sourcing.xml</item>
    </tactical>
  </strategic-vs-tactical>

  <core-concepts>
    <concept name="ubiquitous-language">
      <description>
        도메인 전문가와 개발자가 공유하는 공통 언어.
        코드, 문서, 대화 모두에서 동일한 용어 사용.
      </description>
      <example type="bad">
        <code><![CDATA[
// 개발자 용어로 작성 - 도메인 전문가가 이해 못함
class DataProcessor {
  processRecord(record: Record) {
    if (record.status === 1) {
      this.updateFlag(record, true);
    }
  }
}
        ]]></code>
      </example>
      <example type="good">
        <code><![CDATA[
// 유비쿼터스 언어 사용 - 도메인 전문가도 이해 가능
class OrderFulfillment {
  shipOrder(order: Order) {
    if (order.isPaid()) {
      order.markAsShipped();
    }
  }
}
        ]]></code>
      </example>
      <practice>
        <item>용어 사전 (Glossary) 작성 및 유지</item>
        <item>코드 리뷰 시 도메인 용어 준수 확인</item>
        <item>도메인 전문가와 정기적 용어 검토</item>
      </practice>
    </concept>

    <concept name="bounded-context">
      <description>
        특정 도메인 모델이 적용되는 명시적 경계.
        같은 용어도 컨텍스트마다 다른 의미를 가질 수 있음.
      </description>
      <example>
        <title>"Product"의 다른 의미</title>
        <context name="Catalog">상품 정보, 설명, 이미지</context>
        <context name="Inventory">재고 수량, 위치, SKU</context>
        <context name="Pricing">가격, 할인, 프로모션</context>
        <context name="Shipping">무게, 크기, 배송 제한</context>
      </example>
      <guidelines>
        <guideline>하나의 Bounded Context = 하나의 팀</guideline>
        <guideline>하나의 Bounded Context = 하나의 코드베이스 (또는 모듈)</guideline>
        <guideline>컨텍스트 간 통신은 명시적 인터페이스로</guideline>
      </guidelines>
    </concept>

    <concept name="subdomain">
      <description>비즈니스 도메인의 논리적 분할</description>
      <types>
        <type name="core">
          <description>비즈니스 핵심 차별화 요소</description>
          <strategy>최고 인력 투입, 자체 개발</strategy>
          <example>쿠팡의 로켓배송 시스템</example>
        </type>
        <type name="supporting">
          <description>Core를 지원하지만 차별화 요소 아님</description>
          <strategy>아웃소싱 또는 적당한 품질</strategy>
          <example>내부 관리 시스템</example>
        </type>
        <type name="generic">
          <description>모든 비즈니스에 공통</description>
          <strategy>구매 또는 오픈소스 사용</strategy>
          <example>결제, 인증, 이메일 발송</example>
        </type>
      </types>
    </concept>

    <concept name="context-map">
      <description>Bounded Context 간의 관계를 시각화</description>
      <relationships>
        <relationship name="partnership">
          <description>두 팀이 함께 성공/실패. 긴밀한 협력</description>
          <diagram>[Context A] ←Partnership→ [Context B]</diagram>
        </relationship>
        <relationship name="shared-kernel">
          <description>공유 모델. 양쪽 합의 필요</description>
          <diagram>[Context A] ←Shared Kernel→ [Context B]</diagram>
          <warning>변경 시 양쪽 영향. 최소화 권장</warning>
        </relationship>
        <relationship name="customer-supplier">
          <description>Upstream(공급자)이 Downstream(고객) 요구 수용</description>
          <diagram>[Supplier] →Customer-Supplier→ [Customer]</diagram>
        </relationship>
        <relationship name="conformist">
          <description>Downstream이 Upstream 모델을 그대로 수용</description>
          <diagram>[Upstream] →Conformist→ [Downstream]</diagram>
          <usecase>외부 API 연동 시</usecase>
        </relationship>
        <relationship name="anticorruption-layer">
          <description>번역 레이어로 외부 모델로부터 보호</description>
          <diagram>[External] →ACL→ [Our Context]</diagram>
          <usecase>레거시 시스템 연동, 외부 API</usecase>
        </relationship>
        <relationship name="open-host-service">
          <description>잘 정의된 프로토콜로 서비스 제공</description>
          <diagram>[Context] →OHS/PL→ [Multiple Consumers]</diagram>
        </relationship>
        <relationship name="published-language">
          <description>표준화된 교환 언어 (JSON Schema, Protobuf)</description>
        </relationship>
      </relationships>
    </concept>
  </core-concepts>

  <context-map-example>
    <title>이커머스 Context Map</title>
    <diagram><![CDATA[
┌─────────────────────────────────────────────────────────────────┐
│                        E-Commerce System                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────┐      Partnership      ┌──────────────┐        │
│  │   Catalog    │◄─────────────────────►│   Pricing    │        │
│  │   Context    │                       │   Context    │        │
│  └──────┬───────┘                       └──────────────┘        │
│         │                                                        │
│         │ Customer-Supplier                                      │
│         ▼                                                        │
│  ┌──────────────┐                       ┌──────────────┐        │
│  │    Order     │      Shared Kernel    │  Inventory   │        │
│  │   Context    │◄─────────────────────►│   Context    │        │
│  └──────┬───────┘      (Product ID)     └──────────────┘        │
│         │                                                        │
│         │ ACL                                                    │
│         ▼                                                        │
│  ┌──────────────┐                       ┌──────────────┐        │
│  │   Shipping   │                       │   Payment    │        │
│  │   Context    │                       │   Context    │        │
│  └──────────────┘                       └──────┬───────┘        │
│                                                 │ ACL            │
│                                                 ▼                │
│                                         ┌──────────────┐        │
│                                         │    Stripe    │        │
│                                         │  (External)  │        │
│                                         └──────────────┘        │
└─────────────────────────────────────────────────────────────────┘
    ]]></diagram>
  </context-map-example>

  <anticorruption-layer-pattern>
    <description>외부 모델로부터 도메인 보호</description>
    <example language="typescript">
      <title>Stripe 결제 연동 ACL</title>
      <code><![CDATA[
// 외부 모델 (Stripe)
interface StripePaymentIntent {
  id: string;
  amount: number;           // cents
  currency: string;
  status: 'succeeded' | 'pending' | 'failed';
  payment_method: string;
}

// 우리 도메인 모델
interface Payment {
  id: PaymentId;
  amount: Money;            // 우리의 Money Value Object
  status: PaymentStatus;    // 우리의 enum
  orderId: OrderId;
}

// Anti-Corruption Layer
class StripePaymentAdapter implements PaymentGateway {
  constructor(private stripe: Stripe) {}

  async processPayment(payment: Payment): Promise<PaymentResult> {
    // 도메인 → 외부 모델 변환
    const intent = await this.stripe.paymentIntents.create({
      amount: payment.amount.toCents(),  // Money → cents
      currency: payment.amount.currency.toLowerCase(),
    });

    // 외부 모델 → 도메인 변환
    return this.toPaymentResult(intent);
  }

  private toPaymentResult(intent: StripePaymentIntent): PaymentResult {
    return {
      success: intent.status === 'succeeded',
      transactionId: TransactionId.create(intent.id),
      status: this.mapStatus(intent.status),
    };
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
      ]]></code>
    </example>
  </anticorruption-layer-pattern>

  <event-storming>
    <description>도메인 이벤트를 중심으로 도메인 모델링하는 워크샵 기법</description>
    <steps>
      <step order="1">Domain Events 도출 (주황색 포스트잇)</step>
      <step order="2">Commands 식별 (파란색)</step>
      <step order="3">Aggregates 그룹핑 (노란색)</step>
      <step order="4">Bounded Context 경계 그리기</step>
      <step order="5">Context Map 작성</step>
    </steps>
    <tip>도메인 전문가와 함께 진행</tip>
  </event-storming>

  <directory-structure-by-context>
    <description>Bounded Context별 코드 구조 (모노레포)</description>
    <structure><![CDATA[
packages/
├── catalog/                    # Catalog Context
│   ├── src/
│   │   ├── domain/
│   │   ├── application/
│   │   └── infrastructure/
│   └── package.json
│
├── order/                      # Order Context
│   ├── src/
│   │   ├── domain/
│   │   ├── application/
│   │   └── infrastructure/
│   └── package.json
│
├── inventory/                  # Inventory Context
│   └── ...
│
└── shared/                     # Shared Kernel (최소화)
    ├── src/
    │   ├── value-objects/     # ProductId, Money 등 공유 VO
    │   └── events/            # 통합 이벤트 스키마
    └── package.json
    ]]></structure>
  </directory-structure-by-context>

  <rules>
    <category name="필수">
      <must>용어 사전 (Glossary) 작성 및 유지</must>
      <must>코드에서 유비쿼터스 언어 사용</must>
      <must>Bounded Context 경계 명확히 정의</must>
      <must>컨텍스트 간 통신은 명시적 인터페이스로</must>
      <must>외부 시스템 연동 시 ACL 사용</must>
    </category>
    <category name="권장">
      <should>Core Subdomain에 최고 리소스 투입</should>
      <should>Generic Subdomain은 구매/오픈소스 활용</should>
      <should>Event Storming으로 도메인 모델링</should>
      <should>Context Map 문서화 및 최신 유지</should>
    </category>
    <category name="금지">
      <must-not>Bounded Context 간 도메인 모델 직접 공유</must-not>
      <must-not>하나의 Aggregate가 여러 Context에 걸침</must-not>
      <must-not>기술 용어를 도메인 모델에 사용</must-not>
    </category>
  </rules>

  <checklist>
    <item priority="critical">용어 사전 존재 및 최신화</item>
    <item priority="critical">Bounded Context 경계 정의됨</item>
    <item priority="critical">코드가 유비쿼터스 언어 사용</item>
    <item priority="high">Context Map 문서화</item>
    <item priority="high">외부 연동에 ACL 적용</item>
    <item priority="high">Subdomain 분류 (Core/Supporting/Generic)</item>
    <item priority="medium">Event Storming 워크샵 진행</item>
  </checklist>
</skill>

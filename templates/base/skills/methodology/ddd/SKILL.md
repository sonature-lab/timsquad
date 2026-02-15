---
name: ddd
description: Domain-Driven Design 전략적 설계 가이드라인
version: "1.0.0"
tags: [ddd, methodology, architecture]
user-invocable: false
compatible-with: [tdd, bdd]
---

# DDD (Domain-Driven Design) — Strategic

## 철학
- 도메인 전문가와 개발자의 협업
- 유비쿼터스 언어 (Ubiquitous Language)
- 모델 주도 설계 (Model-Driven Design)
- 경계 컨텍스트로 복잡성 분리

## 전략적 vs 전술적

| 레벨 | 내용 | 위치 |
|------|------|------|
| 전략적 | Bounded Context, Ubiquitous Language, Context Map, Subdomain | 이 스킬 |
| 전술적 | Aggregate, Entity, Value Object, Repository, Domain Event | architectures/ |

## 핵심 개념

### Ubiquitous Language
도메인 전문가와 개발자가 공유하는 공통 언어.
코드, 문서, 대화 모두에서 동일한 용어 사용.

```typescript
// Bad: 개발자 용어
class DataProcessor { processRecord(record: Record) { ... } }

// Good: 유비쿼터스 언어
class OrderFulfillment { shipOrder(order: Order) { ... } }
```

### Bounded Context
특정 도메인 모델이 적용되는 명시적 경계.
같은 "Product"도 Catalog(정보), Inventory(재고), Pricing(가격)에서 다른 의미.

### Subdomain
- **Core**: 비즈니스 핵심 차별화 → 최고 인력, 자체 개발
- **Supporting**: Core 지원, 차별화 아님 → 적당한 품질
- **Generic**: 모든 비즈니스에 공통 → 구매/오픈소스

### Context Map
Bounded Context 간 관계: Partnership, Shared Kernel, Customer-Supplier, Conformist, ACL, Open Host Service

## Rules

### 필수
- 용어 사전 (Glossary) 작성 및 유지
- 코드에서 유비쿼터스 언어 사용
- Bounded Context 경계 명확히 정의
- 컨텍스트 간 통신은 명시적 인터페이스로
- 외부 시스템 연동 시 ACL 사용

### 금지
- Bounded Context 간 도메인 모델 직접 공유
- 하나의 Aggregate가 여러 Context에 걸침
- 기술 용어를 도메인 모델에 사용

## Checklist
- [ ] 용어 사전 존재 및 최신화
- [ ] Bounded Context 경계 정의됨
- [ ] 코드가 유비쿼터스 언어 사용
- [ ] Context Map 문서화
- [ ] 외부 연동에 ACL 적용
- [ ] Subdomain 분류 (Core/Supporting/Generic)

## 참조
- `rules/strategic-patterns.md` — Context Map, ACL 예시, Event Storming, 디렉토리 구조

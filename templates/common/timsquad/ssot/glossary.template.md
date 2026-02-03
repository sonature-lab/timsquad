---
title: "용어 사전 (Glossary)"
version: 1.0.0
last_updated: {{DATE}}
author: tsq-planner
status: draft
project: {{PROJECT_NAME}}
---

# 용어 사전 (Glossary)

> 프로젝트에서 사용하는 도메인 용어를 정의합니다.
> 모든 팀원과 에이전트가 동일한 언어로 소통하기 위한 기준 문서입니다.

---

## 1. 비즈니스 용어

| 용어 | 영문 | 정의 | 예시 | 비고 |
|-----|------|------|------|------|
| | | | | |

<!--
예시:
| 회원 | Member | 서비스에 가입한 사용자 | 이메일로 가입한 사용자 | User와 구분 |
| 고객사 | Customer | B2B 계약을 체결한 업체 | ABC 주식회사 | |
| 구독 | Subscription | 유료 서비스 이용 계약 | 월간 플랜 | |
-->

---

## 2. 기술 용어

| 용어 | 영문 | 정의 | 관련 문서 |
|-----|------|------|----------|
| | | | |

<!--
예시:
| 토큰 | Token | 인증에 사용되는 JWT 문자열 | service-spec.md |
| 세션 | Session | 사용자 로그인 상태 유지 단위 | security-spec.md |
| 트랜잭션 | Transaction | DB 작업의 원자적 단위 | data-design.md |
-->

---

## 3. 도메인 모델

### 3.1 핵심 엔티티

| 엔티티 | 설명 | 주요 속성 | 관계 |
|-------|------|----------|------|
| | | | |

<!--
예시:
| User | 시스템 사용자 | id, email, name | Order (1:N) |
| Order | 주문 | id, status, total | User (N:1), OrderItem (1:N) |
| Product | 상품 | id, name, price | OrderItem (1:N) |
-->

### 3.2 값 객체 (Value Objects)

| 값 객체 | 설명 | 구성 요소 |
|--------|------|----------|
| | | |

<!--
예시:
| Money | 금액 | amount (number), currency (string) |
| Address | 주소 | street, city, zipCode, country |
-->

---

## 4. 상태 정의

### 4.1 [엔티티명] 상태

```
[상태1] → [상태2] → [상태3]
    ↓         ↓
[상태4]   [상태5]
```

| 상태 | 코드 | 설명 | 전이 가능 상태 |
|-----|------|------|--------------|
| | | | |

<!--
예시 (주문 상태):
| 대기 | PENDING | 결제 대기 중 | PAID, CANCELLED |
| 결제완료 | PAID | 결제 완료 | SHIPPING, REFUNDED |
| 배송중 | SHIPPING | 배송 진행 중 | DELIVERED |
| 배송완료 | DELIVERED | 배송 완료 | - |
| 취소 | CANCELLED | 주문 취소 | - |
| 환불 | REFUNDED | 환불 처리됨 | - |
-->

---

## 5. 코드/열거형

### 5.1 [코드명]

| 코드 | 값 | 설명 |
|-----|-----|------|
| | | |

<!--
예시 (회원 등급):
| GUEST | 0 | 비회원 |
| BASIC | 1 | 일반 회원 |
| PREMIUM | 2 | 프리미엄 회원 |
| VIP | 3 | VIP 회원 |
-->

---

## 6. 약어 목록

| 약어 | 전체 표현 | 설명 |
|-----|----------|------|
| | | |

<!--
예시:
| API | Application Programming Interface | |
| JWT | JSON Web Token | 인증 토큰 |
| CRUD | Create, Read, Update, Delete | 기본 데이터 조작 |
| SSO | Single Sign-On | 통합 인증 |
-->

---

## 7. 관련 문서

- [PRD](./prd.md) - 제품 요구사항
- [요구사항](./requirements.md) - 기능/비기능 요건
- [데이터 설계](./data-design.md) - ERD, 테이블 정의

---

## 변경 이력

| 버전 | 날짜 | 작성자 | 변경 내용 |
|------|------|--------|----------|
| 1.0.0 | {{DATE}} | tsq-planner | 초기 작성 |

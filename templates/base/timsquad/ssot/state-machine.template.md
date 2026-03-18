---
title: "상태 머신 명세서 (State Machine Specification)"
version: 1.0.0
last_updated: {{DATE}}
author: tsq-architect
status: draft
project: {{PROJECT_NAME}}
---

# 상태 머신 명세서 (State Machine Specification)

> 시스템 내 주요 엔티티의 상태 전이(State Transition)를 정의합니다.
> 상태 전이 규칙, 가드 조건, 부수 효과를 명확히 하여 일관된 비즈니스 로직을 보장합니다.

---

## 1. 개요

### 1.1 적용 대상

| 엔티티 | 상태 수 | 설명 |
|-------|:------:|------|
| Order | 6 | 주문 생명주기 |
| Payment | 5 | 결제 처리 흐름 |
| User | 4 | 사용자 계정 상태 |

### 1.2 용어

| 용어 | 설명 |
|-----|------|
| State | 엔티티가 가질 수 있는 상태 값 |
| Transition | 한 상태에서 다른 상태로의 전이 |
| Guard | 전이가 허용되는 조건 (사전 검증) |
| Action | 전이 시 실행되는 부수 효과 |
| Event | 전이를 트리거하는 외부/내부 이벤트 |

---

## 2. [Entity Name] 상태 머신

### 2.1 상태 다이어그램

```
                    ┌──────────┐
          ┌─────── │  CREATED  │ ───────┐
          │        └──────────┘        │
          │ cancel       │ confirm     │ expire
          ▼              ▼             ▼
   ┌──────────┐   ┌──────────┐  ┌──────────┐
   │ CANCELLED│   │ CONFIRMED│  │ EXPIRED  │
   └──────────┘   └─────┬────┘  └──────────┘
                        │ process
                        ▼
                  ┌──────────┐
                  │ COMPLETED│
                  └──────────┘
```

### 2.2 상태 정의

| 상태 | 코드 | 설명 | 진입 조건 |
|-----|------|------|----------|
| CREATED | `created` | 초기 생성 상태 | 생성 시 자동 |
| CONFIRMED | `confirmed` | 확인됨 | 검증 통과 |
| COMPLETED | `completed` | 처리 완료 | 모든 작업 완료 |
| CANCELLED | `cancelled` | 취소됨 | 사용자/시스템 취소 |
| EXPIRED | `expired` | 만료됨 | TTL 초과 |

### 2.3 전이 규칙

| From | Event | To | Guard | Action |
|------|-------|----|-------|--------|
| CREATED | `confirm` | CONFIRMED | 필수 필드 충족 | 알림 발송 |
| CREATED | `cancel` | CANCELLED | - | 관련 리소스 해제 |
| CREATED | `expire` | EXPIRED | TTL 초과 | 정리 작업 |
| CONFIRMED | `process` | COMPLETED | 처리 조건 충족 | 완료 알림 |
| CONFIRMED | `cancel` | CANCELLED | 취소 가능 기간 | 환불 처리 |

### 2.4 가드 조건 상세

| Guard | 로직 | 실패 시 |
|-------|------|--------|
| 필수 필드 충족 | `entity.requiredFields.every(f => !!f)` | 400 Bad Request |
| TTL 초과 | `now - entity.createdAt > TTL` | 스케줄러가 자동 전이 |
| 취소 가능 기간 | `now - entity.confirmedAt < CANCEL_WINDOW` | 409 Conflict |

### 2.5 부수 효과

| Action | 트리거 | 처리 | 실패 전략 |
|--------|-------|------|----------|
| 알림 발송 | confirm → CONFIRMED | 이메일/푸시 | 재시도 (3회) |
| 환불 처리 | cancel → CANCELLED | 결제 API 호출 | 수동 처리 큐 |
| 정리 작업 | expire → EXPIRED | 관련 데이터 정리 | 로그 + 재시도 |

---

## 3. 상태 전이 정합성

### 3.1 불변 규칙 (Invariants)

- [ ] 터미널 상태(COMPLETED, CANCELLED, EXPIRED)에서 다른 상태로 전이 불가
- [ ] 모든 전이는 감사 로그에 기록
- [ ] 동시 전이 충돌 시 낙관적 잠금(Optimistic Locking) 적용

### 3.2 동시성 처리

| 시나리오 | 해결 방법 |
|---------|----------|
| 동시 상태 변경 | 버전 기반 낙관적 잠금 |
| 이벤트 순서 역전 | 타임스탬프 검증 |
| 중복 이벤트 | 멱등성 키(idempotency key) |

---

## 4. 관련 문서

- [서비스 명세](./service-spec.md) — API 엔드포인트별 상태 변경
- [에러 코드](./error-codes.md) — 상태 전이 실패 에러 코드
- [데이터 설계](./data-design.md) — 상태 필드 스키마

---

## 변경 이력

| 버전 | 날짜 | 작성자 | 변경 내용 |
|------|------|--------|----------|
| 1.0.0 | {{DATE}} | tsq-architect | 초기 작성 |

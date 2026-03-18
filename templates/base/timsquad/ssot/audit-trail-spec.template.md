---
title: "감사 추적 명세서 (Audit Trail Specification)"
version: 1.0.0
last_updated: {{DATE}}
author: tsq-security
status: draft
project: {{PROJECT_NAME}}
---

# 감사 추적 명세서 (Audit Trail Specification)

> 시스템 내 모든 주요 활동의 감사 추적(Audit Trail)을 설계합니다.
> 보안 사고 대응, 분쟁 해결, 규제 준수를 위한 추적성을 보장합니다.

---

## 1. 감사 대상

### 1.1 이벤트 분류

| 분류 | 이벤트 | 보존 기간 | 필수 |
|-----|--------|:--------:|:----:|
| 인증 | 로그인, 로그아웃, MFA | 5년 | ✅ |
| 인가 | 권한 변경, 역할 부여/회수 | 영구 | ✅ |
| 데이터 접근 | 민감 데이터 조회 | 5년 | ✅ |
| 데이터 변경 | 생성, 수정, 삭제 | 영구 | ✅ |
| 거래 | 주문, 결제, 환불, 정산 | 5년 | ✅ |
| 시스템 | 배포, 설정 변경, 장애 | 3년 | ✅ |
| 관리자 | 관리자 패널 모든 작업 | 영구 | ✅ |

### 1.2 감사 레벨

| 레벨 | 설명 | 적용 |
|-----|------|------|
| L1 | 이벤트 발생 기록 (who, when, what) | 모든 이벤트 |
| L2 | 변경 전/후 데이터 (before/after) | 데이터 변경 |
| L3 | 전체 요청/응답 페이로드 | 금융 거래 |

---

## 2. 감사 로그 스키마

### 2.1 기본 필드

```json
{
  "id": "audit_abc123",
  "timestamp": "2026-01-01T00:00:00.000Z",
  "event_type": "ORDER_CREATED",
  "category": "transaction",
  "level": "L2",
  "actor": {
    "user_id": "user_123",
    "ip_address": "1.2.3.4",
    "user_agent": "Mozilla/5.0...",
    "session_id": "sess_456"
  },
  "target": {
    "entity_type": "order",
    "entity_id": "order_789",
    "path": "/api/orders"
  },
  "changes": {
    "before": null,
    "after": { "status": "created", "amount": 50000 }
  },
  "metadata": {
    "trace_id": "trace_xyz",
    "service": "order-service",
    "version": "1.2.3"
  },
  "result": "success"
}
```

### 2.2 이벤트 타입

| 카테고리 | 이벤트 타입 | 레벨 | 설명 |
|---------|-----------|:----:|------|
| auth | `LOGIN_SUCCESS` | L1 | 로그인 성공 |
| auth | `LOGIN_FAILURE` | L1 | 로그인 실패 (사유 포함) |
| auth | `TOKEN_REFRESH` | L1 | 토큰 갱신 |
| auth | `MFA_VERIFIED` | L1 | MFA 인증 |
| authz | `ROLE_ASSIGNED` | L2 | 역할 부여 |
| authz | `PERMISSION_CHANGED` | L2 | 권한 변경 |
| data | `RECORD_CREATED` | L2 | 데이터 생성 |
| data | `RECORD_UPDATED` | L2 | 데이터 수정 (before/after) |
| data | `RECORD_DELETED` | L2 | 데이터 삭제 (before 포함) |
| data | `SENSITIVE_DATA_ACCESS` | L1 | 민감 데이터 조회 |
| txn | `ORDER_CREATED` | L3 | 주문 생성 |
| txn | `PAYMENT_PROCESSED` | L3 | 결제 처리 |
| txn | `REFUND_ISSUED` | L3 | 환불 처리 |
| system | `CONFIG_CHANGED` | L2 | 시스템 설정 변경 |
| system | `DEPLOYMENT` | L1 | 서비스 배포 |

---

## 3. 저장 아키텍처

### 3.1 저장소 구성

| 저장소 | 용도 | 보존 | 접근 |
|-------|------|------|------|
| Hot (DB) | 최근 로그 조회 | 30일 | 실시간 검색 |
| Warm (Object Storage) | 중기 보관 | 1년 | 일괄 검색 |
| Cold (Archive) | 장기 보관 | 5년+ | 복원 후 검색 |

### 3.2 무결성 보장

| 방법 | 설명 |
|-----|------|
| 쓰기 전용 | 감사 로그는 수정/삭제 불가 (append-only) |
| 해시 체인 | 각 로그에 이전 해시 포함 → 변조 감지 |
| 타임스탬프 | 신뢰할 수 있는 시간 소스 (NTP) |
| 접근 제어 | 쓰기: 시스템만 / 읽기: 감사 권한 필요 |

---

## 4. 검색 및 조회

### 4.1 검색 필드

| 필드 | 인덱스 | 검색 예시 |
|-----|:------:|----------|
| actor.user_id | ✅ | 특정 사용자의 모든 활동 |
| event_type | ✅ | 모든 로그인 실패 |
| target.entity_id | ✅ | 특정 주문의 모든 변경 |
| timestamp | ✅ | 기간별 조회 |
| result | ✅ | 실패한 작업만 |

### 4.2 조회 API

| 엔드포인트 | 용도 | 권한 |
|-----------|------|------|
| `GET /api/audit/search` | 조건부 검색 | AUDITOR+ |
| `GET /api/audit/:id` | 단건 상세 | AUDITOR+ |
| `GET /api/audit/entity/:type/:id` | 엔티티 이력 | AUDITOR+ |
| `GET /api/audit/user/:id` | 사용자 활동 | AUDITOR+ |
| `POST /api/audit/export` | CSV/JSON 내보내기 | ADMIN |

---

## 5. 관련 문서

- [컴플라이언스 매트릭스](./compliance-matrix.md) — 규제 요구사항
- [보안 명세](./security-spec.md) — 접근 제어 정책
- [데이터 설계](./data-design.md) — 감사 테이블 스키마

---

## 변경 이력

| 버전 | 날짜 | 작성자 | 변경 내용 |
|------|------|--------|----------|
| 1.0.0 | {{DATE}} | tsq-security | 초기 작성 |

---
title: "감사 추적 명세서 (Audit Trail Specification) — Fintech"
version: 1.0.0
last_updated: {{DATE}}
author: tsq-security
status: draft
project: {{PROJECT_NAME}}
type_override: fintech
---

# 감사 추적 명세서 (Audit Trail Specification)

> 금융 거래 시스템의 감사 추적을 설계합니다.
> 전자금융거래법 §22 (거래기록 5년 보존), PCI DSS Req 10 (감사 로그) 요구사항이 사전 구성되어 있습니다.

---

## 1. 감사 대상

### 1.1 이벤트 분류

| 분류 | 이벤트 | 보존 기간 | 법적 근거 |
|-----|--------|:--------:|----------|
| 인증 | 로그인, 로그아웃, MFA | 5년 | 전자금융감독규정 §13 |
| 인가 | 권한 변경, 역할 부여/회수 | 영구 | PCI DSS 10.2 |
| 금융 거래 | 주문, 체결, 정산, 입출금 | 5년 | 전자금융거래법 §22 |
| 결제 | 카드 결제, 환불, 취소 | 5년 | PCI DSS 10.2 |
| 자금 이동 | 입금, 출금, 이체 | 5년 | 특정금융정보법 |
| KYC | 본인인증, 서류 제출/검토 | 5년 | 특정금융정보법 §5의2 |
| FDS | 이상거래 탐지, 차단, 해제 | 5년 | 전자금융거래법 §21의3 |
| 데이터 접근 | 민감 데이터 조회 | 5년 | 개인정보보호법 §29 |
| 시스템 | 배포, 설정 변경, 장애 | 3년 | ISMS-P |
| 관리자 | 관리자 패널 모든 작업 | 영구 | PCI DSS 10.2 |

### 1.2 감사 레벨

| 레벨 | 설명 | 적용 |
|-----|------|------|
| L1 | 이벤트 기록 (who, when, what) | 모든 이벤트 |
| L2 | 변경 전/후 데이터 (before/after) | 데이터 변경, 설정 변경 |
| L3 | 전체 요청/응답 페이로드 | 금융 거래, 결제, 자금 이동 |

---

## 2. 감사 로그 스키마

### 2.1 금융 거래 로그

```json
{
  "id": "audit_abc123",
  "timestamp": "2026-01-01T00:00:00.000Z",
  "event_type": "TRADE_EXECUTED",
  "category": "financial_transaction",
  "level": "L3",
  "actor": {
    "user_id": "user_123",
    "ip_address": "1.2.3.4",
    "user_agent": "Mozilla/5.0...",
    "session_id": "sess_456",
    "device_fingerprint": "fp_789",
    "kyc_level": "verified"
  },
  "target": {
    "entity_type": "trade",
    "entity_id": "trade_001",
    "path": "/api/trades"
  },
  "transaction": {
    "type": "buy",
    "asset": "BTC/KRW",
    "quantity": "0.5",
    "price": "50000000",
    "total_amount": "25000000",
    "fee": "25000",
    "currency": "KRW"
  },
  "changes": {
    "before": { "balance": "100000000" },
    "after": { "balance": "74975000" }
  },
  "risk": {
    "fds_score": 15,
    "fds_rules_triggered": [],
    "risk_level": "low"
  },
  "metadata": {
    "trace_id": "trace_xyz",
    "service": "trade-service",
    "version": "1.2.3",
    "correlation_id": "corr_abc"
  },
  "result": "success"
}
```

### 2.2 이벤트 타입 (금융 특화)

| 카테고리 | 이벤트 타입 | 레벨 | 설명 |
|---------|-----------|:----:|------|
| auth | `LOGIN_SUCCESS` | L1 | 로그인 성공 |
| auth | `LOGIN_FAILURE` | L1 | 로그인 실패 (사유 포함) |
| auth | `MFA_VERIFIED` | L1 | MFA 인증 완료 |
| auth | `SESSION_EXPIRED` | L1 | 세션 만료 |
| kyc | `KYC_SUBMITTED` | L2 | KYC 서류 제출 |
| kyc | `KYC_APPROVED` | L2 | KYC 승인 |
| kyc | `KYC_REJECTED` | L2 | KYC 거부 (사유 포함) |
| txn | `ORDER_PLACED` | L3 | 주문 접수 |
| txn | `TRADE_EXECUTED` | L3 | 체결 완료 |
| txn | `ORDER_CANCELLED` | L3 | 주문 취소 |
| payment | `DEPOSIT_REQUESTED` | L3 | 입금 요청 |
| payment | `DEPOSIT_CONFIRMED` | L3 | 입금 확인 |
| payment | `WITHDRAWAL_REQUESTED` | L3 | 출금 요청 |
| payment | `WITHDRAWAL_APPROVED` | L3 | 출금 승인 |
| payment | `WITHDRAWAL_COMPLETED` | L3 | 출금 완료 |
| fds | `FDS_ALERT` | L2 | 이상거래 탐지 |
| fds | `FDS_BLOCKED` | L2 | 거래 차단 |
| fds | `FDS_RELEASED` | L2 | 차단 해제 (심사 후) |
| admin | `BALANCE_ADJUSTED` | L3 | 잔고 수동 조정 |
| admin | `FEE_CHANGED` | L2 | 수수료 변경 |
| admin | `LIMIT_CHANGED` | L2 | 거래 한도 변경 |

---

## 3. 저장 아키텍처

### 3.1 저장소 구성 (5년 법적 보관)

| 저장소 | 용도 | 보존 | 접근 | 비고 |
|-------|------|------|------|------|
| Hot (DB) | 최근 로그 조회 | 90일 | 실시간 검색 | 인덱싱 완전 |
| Warm (Object Storage) | 중기 보관 | 2년 | 일괄 검색 | 압축 저장 |
| Cold (Archive) | 장기 보관 | 5년+ | 복원 후 검색 | 규제 준수 |

### 3.2 무결성 보장 (PCI DSS 10.5)

| 방법 | 설명 | 구현 |
|-----|------|------|
| 쓰기 전용 | append-only, 수정/삭제 불가 | DB trigger + 정책 |
| 해시 체인 | 각 로그에 이전 블록 해시 포함 | SHA-256 체인 |
| 타임스탬프 서명 | 신뢰할 수 있는 시간 + 서명 | NTP + HSM |
| 접근 제어 | 쓰기: 시스템만 / 읽기: 감사 권한 | IAM + RBAC |
| 이중 저장 | 별도 보안 저장소에 복제 | S3 Cross-Region |
| 변조 감지 | 정기 무결성 검증 배치 | 일간 스케줄러 |

---

## 4. FDS 연동

### 4.1 FDS → 감사 로그 흐름

```
거래 요청 → FDS 분석 → 점수 산출 → 감사 로그 기록
                    ├─ 정상 → 거래 실행 → L3 로그
                    ├─ 의심 → 보류 + 알림 → L2 로그
                    └─ 차단 → 거래 거부 → L2 로그 + STR 검토 큐
```

### 4.2 FDS 규칙 감사

| 이벤트 | 기록 항목 | 보존 |
|-------|----------|------|
| 규칙 변경 | 변경자, 이전/이후 규칙, 사유 | 영구 |
| 규칙 트리거 | 거래 ID, 트리거된 규칙, 점수 | 5년 |
| 수동 해제 | 해제자, 사유, 승인자 | 영구 |

---

## 5. 규제 보고용 조회

### 5.1 조회 API

| 엔드포인트 | 용도 | 권한 |
|-----------|------|------|
| `GET /api/audit/search` | 조건부 검색 | AUDITOR+ |
| `GET /api/audit/transaction/:id` | 거래 전체 이력 | AUDITOR+ |
| `GET /api/audit/user/:id/activity` | 사용자 활동 | AUDITOR+ |
| `POST /api/audit/report/str` | STR 보고용 데이터 추출 | COMPLIANCE |
| `POST /api/audit/report/regulatory` | 규제 보고용 데이터 | COMPLIANCE |
| `POST /api/audit/export` | CSV/JSON 내보내기 | ADMIN |

### 5.2 보고서 템플릿

| 보고서 | 대상 | 주기 | 자동화 |
|-------|------|------|:------:|
| 거래 현황 보고 | 경영진 | 일간 | ✅ |
| FDS 탐지 보고 | 보안팀 | 일간 | ✅ |
| 규제 준수 보고 | 금융감독원 | 분기 | 수동 |
| STR 보고 | FIU | 수시 | 반자동 |
| 감사 무결성 검증 | 내부 감사 | 월간 | ✅ |

---

## 6. 관련 문서

- [컴플라이언스 매트릭스](./compliance-matrix.md) — 규제 요구사항 매트릭스
- [보안 명세](./security-spec.md) — 접근 제어 정책
- [상태 머신](./state-machine.md) — 거래 상태 전이
- [데이터 설계](./data-design.md) — 감사 테이블 스키마

---

## 변경 이력

| 버전 | 날짜 | 작성자 | 변경 내용 |
|------|------|--------|----------|
| 1.0.0 | {{DATE}} | tsq-security | 초기 작성 (fintech 특화) |

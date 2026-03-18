---
title: "모니터링 명세서 (Monitoring Specification)"
version: 1.0.0
last_updated: {{DATE}}
author: tsq-architect
status: draft
project: {{PROJECT_NAME}}
---

# 모니터링 명세서 (Monitoring Specification)

> 시스템 관찰 가능성(Observability)을 위한 메트릭, 로그, 트레이스, 알림 정책을 정의합니다.
> SLI/SLO 기반으로 서비스 신뢰성을 측정하고 관리합니다.

---

## 1. SLI / SLO

### 1.1 서비스 수준 지표 (SLI)

| SLI | 측정 방법 | 계산식 |
|-----|---------|--------|
| 가용성 | HTTP 상태 코드 | 성공 응답(2xx) / 전체 요청 |
| 지연 시간 | 응답 시간 P95 | 전체 요청의 95번째 백분위 |
| 처리량 | 초당 요청 수 | 1분 윈도우 평균 |
| 에러율 | 서버 에러 비율 | 5xx / 전체 요청 |

### 1.2 서비스 수준 목표 (SLO)

| SLO | 목표 | 에러 버짓 (월) | 측정 기간 |
|-----|:----:|:----------:|----------|
| 가용성 | 99.9% | 43.2분 | 30일 |
| 지연 시간 (P95) | < 500ms | - | 30일 |
| 에러율 | < 0.1% | - | 30일 |

---

## 2. 메트릭

### 2.1 인프라 메트릭

| 메트릭 | 소스 | 알림 임계값 | 수집 주기 |
|-------|------|-----------|----------|
| CPU 사용률 | 호스트/컨테이너 | > 80% (5분) | 10초 |
| 메모리 사용률 | 호스트/컨테이너 | > 85% (5분) | 10초 |
| 디스크 사용률 | 호스트 | > 90% | 1분 |
| 네트워크 I/O | 호스트 | 이상치 감지 | 10초 |

### 2.2 애플리케이션 메트릭

| 메트릭 | 타입 | 레이블 | 설명 |
|-------|------|-------|------|
| `http_requests_total` | Counter | method, path, status | 총 HTTP 요청 수 |
| `http_request_duration_seconds` | Histogram | method, path | 요청 처리 시간 |
| `db_query_duration_seconds` | Histogram | query_type | DB 쿼리 시간 |
| `active_connections` | Gauge | type | 활성 연결 수 |
| `queue_depth` | Gauge | queue_name | 큐 대기 건수 |
| `cache_hit_ratio` | Gauge | cache_name | 캐시 적중률 |

### 2.3 비즈니스 메트릭

| 메트릭 | 설명 | 알림 조건 |
|-------|------|----------|
| 회원가입 수 | 일간 신규 가입 | 전일 대비 50% 감소 |
| 주문 성공률 | 주문 완료 / 주문 시도 | < 95% |
| 결제 실패율 | 결제 실패 / 결제 시도 | > 5% |

---

## 3. 로깅

### 3.1 로그 레벨 정책

| 레벨 | 용도 | 프로덕션 | 보존 |
|-----|------|:-------:|------|
| ERROR | 시스템 오류, 예외 | ✅ | 90일 |
| WARN | 비정상 동작, 재시도 | ✅ | 30일 |
| INFO | 주요 비즈니스 이벤트 | ✅ | 30일 |
| DEBUG | 디버깅용 상세 정보 | ❌ | 7일 |

### 3.2 구조화 로그 포맷

```json
{
  "timestamp": "2026-01-01T00:00:00.000Z",
  "level": "INFO",
  "service": "{{PROJECT_NAME}}",
  "trace_id": "abc123",
  "span_id": "def456",
  "message": "Order created",
  "context": {
    "user_id": "user_123",
    "order_id": "order_456"
  }
}
```

### 3.3 민감 데이터 필터링

| 필드 | 처리 |
|-----|------|
| password | 로그 제외 |
| token | 마스킹 (`***`) |
| email | 부분 마스킹 |
| IP | 허용 (감사 목적) |

---

## 4. 분산 트레이싱

### 4.1 트레이스 전파

| 항목 | 설정 |
|-----|------|
| 프로토콜 | W3C Trace Context |
| 헤더 | `traceparent`, `tracestate` |
| 샘플링 | 1% (프로덕션), 100% (에러) |

### 4.2 스팬 구조

```
[HTTP Request] ──► [Auth Middleware] ──► [Business Logic] ──► [DB Query]
                                                           ──► [External API]
                                                           ──► [Cache]
```

---

## 5. 알림

### 5.1 알림 정책

| 심각도 | 조건 | 채널 | 응답 시간 |
|-------|------|------|----------|
| P1 (Critical) | 서비스 다운, 데이터 손실 | PagerDuty + Slack | 15분 |
| P2 (High) | 성능 저하, 에러율 상승 | Slack #alerts | 1시간 |
| P3 (Medium) | 임계값 근접 | Slack #monitoring | 4시간 |
| P4 (Low) | 비정상 패턴 감지 | 이메일 리포트 | 다음 영업일 |

### 5.2 알림 규칙

| 규칙 | 조건 | 심각도 |
|-----|------|--------|
| 서비스 다운 | health check 3회 연속 실패 | P1 |
| 높은 에러율 | 5xx > 5% (5분) | P1 |
| 느린 응답 | P95 > 2s (5분) | P2 |
| 디스크 부족 | 사용률 > 90% | P2 |
| 에러 버짓 소진 | SLO 에러 버짓 > 80% | P3 |

### 5.3 온콜 체계

| 항목 | 설정 |
|-----|------|
| 로테이션 | 주간 교대 |
| 에스컬레이션 | 15분 미응답 → 다음 담당자 |
| 사후 분석 | P1/P2 인시던트 필수 |

---

## 6. 대시보드

### 6.1 대시보드 구성

| 대시보드 | 대상 | 주요 패널 |
|---------|------|----------|
| Overview | 전체 팀 | SLI/SLO, 에러율, 트래픽 |
| Infrastructure | DevOps | CPU, 메모리, 디스크, 네트워크 |
| Application | 개발팀 | 응답 시간, 에러, 쿼리 성능 |
| Business | PM/리더 | KPI, 전환율, 사용자 수 |

---

## 7. 관련 문서

- [배포 명세](./deployment-spec.md) — 인프라 리소스
- [성능 예산](./performance-budget.md) — 성능 임계값
- [보안 명세](./security-spec.md) — 감사 로그

---

## 변경 이력

| 버전 | 날짜 | 작성자 | 변경 내용 |
|------|------|--------|----------|
| 1.0.0 | {{DATE}} | tsq-architect | 초기 작성 |

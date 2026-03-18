---
title: "성능 예산 명세서 (Performance Budget)"
version: 1.0.0
last_updated: {{DATE}}
author: tsq-architect
status: draft
project: {{PROJECT_NAME}}
---

# 성능 예산 명세서 (Performance Budget)

> 서비스의 성능 목표, 측정 기준, 허용 임계값을 정의합니다.
> 모든 성능 관련 의사결정의 기준점(baseline)으로 사용됩니다.

---

## 1. 성능 목표

### 1.1 Core Web Vitals

| 메트릭 | 설명 | 목표 (Good) | 허용 (Needs Improvement) | 불가 (Poor) |
|-------|------|:-----------:|:----------------------:|:-----------:|
| LCP | Largest Contentful Paint | < 2.5s | < 4.0s | > 4.0s |
| INP | Interaction to Next Paint | < 200ms | < 500ms | > 500ms |
| CLS | Cumulative Layout Shift | < 0.1 | < 0.25 | > 0.25 |

### 1.2 서버 성능

| 메트릭 | 목표 | 임계값 | 측정 방법 |
|-------|------|--------|----------|
| TTFB | < 200ms | < 600ms | P95 기준 |
| API 응답 시간 | < 100ms | < 500ms | P95 기준 |
| DB 쿼리 시간 | < 50ms | < 200ms | P99 기준 |
| Throughput | > 1000 RPS | > 500 RPS | 피크 시간대 |

### 1.3 리소스 예산

| 리소스 | 예산 | 현재 | 비고 |
|-------|:----:|:----:|------|
| JS 번들 (gzip) | < 200KB | - | 초기 로드 |
| CSS (gzip) | < 50KB | - | 초기 로드 |
| 이미지 (페이지당) | < 500KB | - | 최적화 후 |
| 폰트 | < 100KB | - | woff2 |
| 전체 페이지 | < 1MB | - | 초기 로드 합계 |

---

## 2. 페이지별 예산

| 페이지 | LCP 목표 | JS 예산 | 이미지 예산 |
|-------|:--------:|:------:|:---------:|
| 랜딩 | < 1.5s | < 100KB | < 300KB |
| 대시보드 | < 2.5s | < 200KB | < 200KB |
| 상세 페이지 | < 2.0s | < 150KB | < 500KB |
| 검색 결과 | < 2.0s | < 150KB | < 400KB |

---

## 3. API 성능 예산

### 3.1 엔드포인트별 목표

| 엔드포인트 | P50 | P95 | P99 | 비고 |
|-----------|:---:|:---:|:---:|------|
| `GET /api/health` | 5ms | 10ms | 50ms | 모니터링용 |
| `POST /api/auth/login` | 50ms | 200ms | 500ms | bcrypt 포함 |
| `GET /api/items` | 30ms | 100ms | 300ms | 페이지네이션 |
| `GET /api/items/:id` | 10ms | 50ms | 150ms | 단건 조회 |

### 3.2 데이터베이스

| 쿼리 유형 | P50 | P95 | 최대 허용 |
|---------|:---:|:---:|:--------:|
| 단순 조회 (PK) | 1ms | 5ms | 20ms |
| 인덱스 조회 | 5ms | 20ms | 100ms |
| 집계 쿼리 | 20ms | 100ms | 500ms |
| 풀 스캔 | 금지 | 금지 | 금지 |

---

## 4. 측정 및 모니터링

### 4.1 측정 도구

| 도구 | 용도 | 주기 |
|-----|------|------|
| Lighthouse CI | 빌드 시 성능 검증 | PR마다 |
| Web Vitals (RUM) | 실제 사용자 측정 | 실시간 |
| k6 / Artillery | 부하 테스트 | 릴리스 전 |
| APM (선택) | 서버 트레이싱 | 실시간 |

### 4.2 예산 위반 대응

| 위반 수준 | 대응 | 담당 |
|---------|------|------|
| Warning (90%) | Slack 알림 | 자동 |
| Error (100%) | PR 블로킹 | CI |
| Critical (150%) | 핫픽스 | 개발팀 |

---

## 5. 최적화 전략

### 5.1 프론트엔드

- [ ] 코드 스플리팅 (라우트 기반)
- [ ] 이미지 최적화 (WebP/AVIF, lazy loading)
- [ ] 폰트 최적화 (subset, display: swap)
- [ ] 프리로드/프리페치 전략

### 5.2 백엔드

- [ ] 쿼리 최적화 (인덱스, 페이지네이션)
- [ ] 캐싱 전략 (Redis, HTTP Cache)
- [ ] Connection pooling
- [ ] N+1 쿼리 방지

---

## 6. 관련 문서

- [서비스 명세](./service-spec.md) — API 엔드포인트
- [배포 명세](./deployment-spec.md) — 인프라 스케일링
- [모니터링 명세](./monitoring-spec.md) — 메트릭 수집

---

## 변경 이력

| 버전 | 날짜 | 작성자 | 변경 내용 |
|------|------|--------|----------|
| 1.0.0 | {{DATE}} | tsq-architect | 초기 작성 |

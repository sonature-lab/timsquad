---
title: Performance Checklist
area: "02"
tags: performance, core-web-vitals, lighthouse
standards: Core Web Vitals 2026, Lighthouse v12
---

# 02. Performance Checklist

## Core Web Vitals 기준값

| Metric | Good | Needs Improvement | Poor |
|--------|:----:|:------------------:|:----:|
| LCP (Largest Contentful Paint) | <= 2.5s | 2.5s - 4.0s | > 4.0s |
| INP (Interaction to Next Paint) | <= 200ms | 200ms - 500ms | > 500ms |
| CLS (Cumulative Layout Shift) | <= 0.1 | 0.1 - 0.25 | > 0.25 |

측정: 75th percentile, 28일 필드 데이터 기준.

## A. Core Web Vitals

| # | 항목 | Severity | 근거 |
|---|------|:--------:|------|
| A-1 | LCP <= 2.5s (모바일 75th percentile) | CRITICAL | CWV — 모바일 페이지 38% 미통과 |
| A-2 | INP <= 200ms — 모든 인터랙션 응답 | CRITICAL | CWV — 43% 사이트 미통과, 가장 빈번한 실패 |
| A-3 | CLS <= 0.1 — 이미지/광고 공간 예약 (width/height, aspect-ratio) | CRITICAL | CWV |
| A-4 | Long task (>50ms) 분할 — `scheduler.yield()` 또는 Web Worker 활용 | HIGH | INP 최적화 |
| A-5 | 페이지 로드 중 인터랙션 INP 특별 관리 (로드 후 대비 2.6배 악화) | HIGH | CWV 필드 데이터 |

## B. Bundle & Loading

| # | 항목 | Severity | 근거 |
|---|------|:--------:|------|
| B-1 | 초기 JS 번들 (gzip): <= 300-350KB | HIGH | 100KB당 3G에서 +3.2s |
| B-2 | Critical-path 리소스: <= 170KB | HIGH | 제한된 네트워크 기준 |
| B-3 | Code splitting + tree-shaking 적용 | HIGH | 번들 최적화 |
| B-4 | Below-the-fold 컴포넌트 lazy loading | HIGH | 초기 로딩 최적화 |
| B-5 | 서드파티 스크립트 지연 로딩 (Partytown 등) | MEDIUM | TBT 감소 |
| B-6 | SSR/RSC 적용 (콘텐츠 중심 페이지) — RSC는 클라이언트 JS 40-60% 감소 | MEDIUM | TTI 최적화 |

## C. Rendering

| # | 항목 | Severity | 근거 |
|---|------|:--------:|------|
| C-1 | 불필요한 리렌더 방지 (React.memo, useMemo, useCallback) | MEDIUM | 렌더링 성능 |
| C-2 | DOM 복잡도 관리 — 과도한 DOM은 스타일 재계산·페인트 지연 | MEDIUM | 렌더링 성능 |
| C-3 | 이벤트 핸들러 최적화 — debounce, layout thrashing 방지 | MEDIUM | INP 최적화 |
| C-4 | 이미지 최적화 — WebP/AVIF, srcset, lazy loading | MEDIUM | LCP + 대역폭 |

## D. Monitoring & Budget

| # | 항목 | Severity | 근거 |
|---|------|:--------:|------|
| D-1 | CI에 성능 예산 설정 (경고: 500KB, 에러: 1MB) | MEDIUM | 성능 회귀 방지 |
| D-2 | RUM (Real User Monitoring) 사용 — 랩 데이터만으로 불충분 | LOW | 필드 vs 랩 괴리 |

## Lighthouse v12 점수 가중치 참고

| Metric | Weight |
|--------|:------:|
| Total Blocking Time (TBT) | 30% |
| Largest Contentful Paint (LCP) | 25% |
| Cumulative Layout Shift (CLS) | 25% |
| First Contentful Paint (FCP) | 10% |
| Speed Index (SI) | 10% |

Target: 90+ (green).

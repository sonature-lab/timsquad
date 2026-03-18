---
title: React Rule Categories
---

# React Rule Categories

25개 규칙을 카테고리별로 정리. TimSquad 커스텀 + Vercel react-best-practices 통합.

## TimSquad Custom (tsq-)

**Impact:** HIGH
**Description:** 프로젝트 컨벤션 및 아키텍처 규칙

| Rule | Description |
|------|-------------|
| [component-conventions](component-conventions.md) | 컴포넌트 구조 템플릿, export, 크기 제한 |
| [state-location](state-location.md) | useState/Context/Zustand/React Query 선택 기준 |
| [anti-patterns](anti-patterns.md) | Props Drilling, useEffect 남용, God Component |

## Eliminating Waterfalls (async-)

**Impact:** CRITICAL
**Description:** Waterfalls are the #1 performance killer. Each sequential await adds full network latency.

| Rule | Description |
|------|-------------|
| [async-parallel](async-parallel.md) | Promise.all for independent operations (2-10x) |
| [async-defer-await](async-defer-await.md) | Start async work before awaiting |
| [async-api-routes](async-api-routes.md) | Parallel data fetching in API routes |
| [async-dependencies](async-dependencies.md) | Break async dependency chains |
| [async-suspense-boundaries](async-suspense-boundaries.md) | Granular Suspense boundaries |

## Bundle Size (bundle-)

**Impact:** CRITICAL
**Description:** Reducing initial bundle size improves TTI and LCP.

| Rule | Description |
|------|-------------|
| [bundle-barrel-imports](bundle-barrel-imports.md) | Avoid barrel files, use direct imports |
| [bundle-dynamic-imports](bundle-dynamic-imports.md) | Dynamic import for heavy components |
| [bundle-defer-third-party](bundle-defer-third-party.md) | Defer non-critical third-party scripts |

## Server-Side Performance (server-)

**Impact:** HIGH
**Description:** Optimizing server-side rendering and data fetching.

| Rule | Description |
|------|-------------|
| [server-cache-react](server-cache-react.md) | React cache() for request dedup |
| [server-parallel-fetching](server-parallel-fetching.md) | Parallel server data fetching |
| [server-after-nonblocking](server-after-nonblocking.md) | after() for non-blocking work |

## Re-render Optimization (rerender-)

**Impact:** MEDIUM
**Description:** Reducing unnecessary re-renders.

| Rule | Description |
|------|-------------|
| [rerender-memo](rerender-memo.md) | React.memo for stable components |
| [rerender-defer-reads](rerender-defer-reads.md) | Defer state reads to minimize scope |
| [rerender-derived-state](rerender-derived-state.md) | Derive state instead of syncing |
| [rerender-transitions](rerender-transitions.md) | useTransition for non-urgent updates |

## Rendering Performance (rendering-)

**Impact:** MEDIUM
**Description:** Optimizing the rendering process.

| Rule | Description |
|------|-------------|
| [rendering-content-visibility](rendering-content-visibility.md) | content-visibility: auto for large lists |
| [rendering-hoist-jsx](rendering-hoist-jsx.md) | Hoist JSX out of loops/conditions |
| [rendering-conditional-render](rendering-conditional-render.md) | Efficient conditional rendering |

## JavaScript Performance (js-)

**Impact:** LOW-MEDIUM
**Description:** Micro-optimizations for hot paths.

| Rule | Description |
|------|-------------|
| [js-index-maps](js-index-maps.md) | Pre-index data with Maps |
| [js-early-exit](js-early-exit.md) | Early return for cheaper checks first |
| [js-set-map-lookups](js-set-map-lookups.md) | Set/Map for O(1) lookups |
| [js-combine-iterations](js-combine-iterations.md) | Combine array iterations |

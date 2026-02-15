---
name: react
description: React 컴포넌트 개발 가이드라인. 단일 책임, UI/로직 분리, 명시적 데이터 흐름, 서버/클라이언트 상태 분리.
version: "1.0.0"
tags: [react, components, frontend]
user-invocable: false
---

# React Development Guidelines

프로젝트 전체에서 일관된 React 컴포넌트 개발을 위한 컨벤션.

## Philosophy

- 컴포넌트는 단일 책임
- UI와 로직 분리 (커스텀 훅)
- Props로 명시적 데이터 흐름
- 서버 상태와 클라이언트 상태 분리

## Resources

25개 규칙 (TimSquad 3 + Vercel 22). 카테고리 인덱스: [_sections.md](rules/_sections.md)

| Priority | Type | Resource | Description |
|----------|------|----------|-------------|
| CRITICAL | rule | [async-parallel](rules/async-parallel.md) | Promise.all 병렬 실행 (2-10x) |
| CRITICAL | rule | [bundle-barrel-imports](rules/bundle-barrel-imports.md) | barrel import 피하기 |
| HIGH | rule | [component-conventions](rules/component-conventions.md) | 컴포넌트 구조, export, 크기 제한 |
| HIGH | rule | [state-location](rules/state-location.md) | 상태 관리 선택 기준 |
| HIGH | rule | [server-parallel-fetching](rules/server-parallel-fetching.md) | 서버 병렬 fetch |
| HIGH | rule | [rerender-memo](rules/rerender-memo.md) | React.memo 최적화 |
| MEDIUM | rule | [anti-patterns](rules/anti-patterns.md) | Props Drilling, useEffect 남용 |

## Quick Rules

### 컴포넌트
- 함수형 컴포넌트 + Props interface
- named export (`export function`, default export 금지)
- 200줄 이하
- forwardRef로 ref 전달 지원

### 훅
- 커스텀 훅으로 로직 분리 (`use` 접두사)
- 의존성 배열 정확히 관리
- 함수형 setState로 stale closure 방지
- 조건문/반복문 안에서 훅 호출 금지
- useEffect 남용 금지 (파생 상태는 useMemo)

### 상태 관리
- 서버 상태: React Query (TanStack Query)
- 전역 UI 상태: Zustand
- 로컬 상태: useState
- 복잡한 로직: useReducer
- 비싼 초기값: lazy init (`useState(() => ...)`)
- Props drilling 3단계 이상 → Context 또는 Zustand

### 성능 (vercel-react-best-practices 참조)
- 리스트에 고유 key (index 금지)
- Promise.all로 병렬 fetch
- barrel import 피하기 (직접 import)
- dynamic import로 무거운 컴포넌트 분리
- content-visibility로 대량 리스트 최적화
- toSorted()로 배열 불변성

### 폼
- React Hook Form + Zod (zodResolver)
- onBlur 유효성 검사, submit 시 첫 에러 필드 포커스

## Checklist

| Priority | Item |
|----------|------|
| CRITICAL | 함수형 컴포넌트 + Props 타입 정의 |
| CRITICAL | 커스텀 훅으로 로직 분리 |
| CRITICAL | 서버 상태는 React Query |
| CRITICAL | Error Boundary로 에러 격리 |
| CRITICAL | Waterfall 제거 (Promise.all) |
| CRITICAL | Barrel import 피하기 |
| HIGH | 의존성 배열 정확히 관리 |
| HIGH | 리스트에 고유 key (index 금지) |
| HIGH | 폼은 React Hook Form + Zod |
| HIGH | 함수형 setState 사용 |
| HIGH | Dynamic import 분리 |
| MEDIUM | 대량 리스트 가상화 / content-visibility |
| MEDIUM | 불필요한 useEffect 제거 |
| MEDIUM | RSC 경계에서 필요한 데이터만 전달 |

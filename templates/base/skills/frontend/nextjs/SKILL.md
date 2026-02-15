---
name: nextjs
description: Next.js App Router 개발 가이드라인
version: "1.0.0"
tags: [nextjs, react, frontend]
user-invocable: false
---

# Next.js 15+ App Router

## 철학
- Server First — 기본은 서버 컴포넌트
- Progressive Enhancement — 필요할 때만 클라이언트
- Colocation — 관련 파일은 가까이

## Server vs Client 판단

| 조건 | 컴포넌트 |
|------|---------|
| 데이터 페칭, DB 접근, 민감 정보 | Server (기본) |
| 인터랙션, 이벤트, useState/useEffect | Client (`'use client'`) |
| 브라우저 API 필요 | Client |
| 그 외 | Server |

## Rules

### 컴포넌트
- 기본은 Server Component
- 인터랙션 필요할 때만 `'use client'`
- Client Component는 작게 유지 (leaf에 배치)
- **금지**: Server Component에서 useState/useEffect, 불필요한 `'use client'`

### 데이터
- Server Component에서 데이터 페칭
- mutation은 Server Actions 사용
- 적절한 캐싱 전략 설정
- **금지**: Client Component에서 직접 DB 접근

### 라우팅
- 파일 기반 라우팅 규칙 준수
- Route Group으로 레이아웃 관리
- `loading.tsx`, `error.tsx` 제공

## 성능 최적화
- `next/image`: sizes 속성
- `next/font`: 폰트 최적화
- `next/link`: 프리페칭
- 동적 import: 무거운 컴포넌트 지연 로딩

## Checklist
- [ ] Server Component 기본 사용
- [ ] 'use client' 최소화
- [ ] Server Actions로 mutation
- [ ] 적절한 캐싱 전략
- [ ] loading.tsx, error.tsx 구현
- [ ] Metadata 설정

## 참조
- `rules/app-router.md` — 디렉토리 구조, Server/Client 예시, Data Fetching, Metadata, Loading/Error 패턴

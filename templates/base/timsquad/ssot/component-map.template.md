---
title: "컴포넌트 맵 (Component Map)"
version: 1.0.0
last_updated: {{DATE}}
author: tsq-designer
status: draft
project: {{PROJECT_NAME}}
---

# 컴포넌트 맵 (Component Map)

> UI 컴포넌트의 계층 구조, 재사용 정책, Props 인터페이스를 정의합니다.
> 디자인 시스템과 개발 구현 사이의 일관성을 보장합니다.

---

## 1. 컴포넌트 계층

### 1.1 분류 체계

| 계층 | 설명 | 예시 | 의존성 |
|-----|------|------|--------|
| Primitives | 최소 단위, 스타일만 | Button, Input, Text | 없음 |
| Components | 단일 기능 조합 | SearchBar, Card, Modal | Primitives |
| Composites | 비즈니스 로직 포함 | UserCard, OrderList | Components + 상태 |
| Layouts | 페이지 레이아웃 | AppShell, SidebarLayout | Composites |
| Pages | 라우트 대응 화면 | HomePage, DetailPage | Layouts + 데이터 |

### 1.2 디렉토리 구조

```
src/components/
├── primitives/
│   ├── Button/
│   │   ├── Button.tsx
│   │   ├── Button.test.tsx
│   │   └── index.ts
│   ├── Input/
│   ├── Text/
│   └── Icon/
├── components/
│   ├── SearchBar/
│   ├── Card/
│   ├── Modal/
│   └── Toast/
├── composites/
│   ├── UserCard/
│   ├── OrderList/
│   └── NotificationBell/
└── layouts/
    ├── AppShell/
    ├── AuthLayout/
    └── DashboardLayout/
```

---

## 2. Primitives

### 2.1 Button

| Prop | 타입 | 기본값 | 설명 |
|------|------|--------|------|
| variant | `'primary' \| 'secondary' \| 'ghost' \| 'danger'` | `'primary'` | 스타일 변형 |
| size | `'sm' \| 'md' \| 'lg'` | `'md'` | 크기 |
| disabled | `boolean` | `false` | 비활성화 |
| loading | `boolean` | `false` | 로딩 상태 |
| fullWidth | `boolean` | `false` | 전체 너비 |
| children | `ReactNode` | - | 버튼 내용 |
| onPress | `() => void` | - | 클릭 핸들러 |

### 2.2 Input

| Prop | 타입 | 기본값 | 설명 |
|------|------|--------|------|
| type | `'text' \| 'email' \| 'password' \| 'number'` | `'text'` | 입력 타입 |
| label | `string` | - | 라벨 |
| placeholder | `string` | - | 플레이스홀더 |
| error | `string` | - | 에러 메시지 |
| disabled | `boolean` | `false` | 비활성화 |

### 2.3 Text

| Prop | 타입 | 기본값 | 설명 |
|------|------|--------|------|
| variant | `'h1' \| 'h2' \| 'h3' \| 'body' \| 'caption'` | `'body'` | 타이포그래피 |
| color | `string` | `'text.primary'` | 색상 토큰 |
| align | `'left' \| 'center' \| 'right'` | `'left'` | 정렬 |

---

## 3. Components

### 3.1 Card

| Prop | 타입 | 기본값 | 설명 |
|------|------|--------|------|
| variant | `'elevated' \| 'outlined' \| 'filled'` | `'elevated'` | 스타일 |
| padding | `'none' \| 'sm' \| 'md' \| 'lg'` | `'md'` | 내부 여백 |
| onPress | `() => void` | - | 클릭 가능 여부 |
| children | `ReactNode` | - | 카드 내용 |

### 3.2 Modal

| Prop | 타입 | 기본값 | 설명 |
|------|------|--------|------|
| open | `boolean` | `false` | 표시 여부 |
| onClose | `() => void` | - | 닫기 핸들러 |
| title | `string` | - | 제목 |
| size | `'sm' \| 'md' \| 'lg' \| 'full'` | `'md'` | 크기 |
| closeOnOverlay | `boolean` | `true` | 오버레이 클릭 닫기 |

### 3.3 Toast

| Prop | 타입 | 기본값 | 설명 |
|------|------|--------|------|
| type | `'success' \| 'error' \| 'warning' \| 'info'` | `'info'` | 토스트 타입 |
| message | `string` | - | 메시지 |
| duration | `number` | `3000` | 표시 시간 (ms) |
| action | `{ label: string; onPress: () => void }` | - | 액션 버튼 |

---

## 4. 재사용 정책

### 4.1 규칙

| 규칙 | 설명 |
|-----|------|
| 단방향 의존 | 상위 계층만 하위 계층을 import |
| Props 전용 통신 | 컴포넌트 간 데이터는 Props로만 전달 |
| 비즈니스 로직 분리 | Primitives/Components에 비즈니스 로직 금지 |
| 스타일 토큰 사용 | 하드코딩 색상/크기 금지, 디자인 토큰만 사용 |

### 4.2 신규 컴포넌트 기준

| 기준 | 임계값 |
|-----|--------|
| 재사용 횟수 | 3회 이상 사용 시 컴포넌트화 |
| Props 수 | 10개 초과 시 분리 검토 |
| 중첩 깊이 | 3단계 초과 시 Composite로 승격 |

---

## 5. 디자인 토큰

### 5.1 색상

| 토큰 | Light | Dark | 용도 |
|-----|-------|------|------|
| `colors.primary` | #3B82F6 | #60A5FA | 주요 액션 |
| `colors.secondary` | #6B7280 | #9CA3AF | 보조 액션 |
| `colors.danger` | #EF4444 | #F87171 | 위험/삭제 |
| `colors.text.primary` | #111827 | #F9FAFB | 본문 텍스트 |
| `colors.bg.primary` | #FFFFFF | #111827 | 배경 |

### 5.2 간격

| 토큰 | 값 | 용도 |
|-----|-----|------|
| `spacing.xs` | 4px | 아이콘 간격 |
| `spacing.sm` | 8px | 요소 내부 |
| `spacing.md` | 16px | 섹션 내부 |
| `spacing.lg` | 24px | 섹션 간 |
| `spacing.xl` | 32px | 페이지 여백 |

---

## 6. 관련 문서

- [UI/UX 명세](./ui-ux-spec.md) — 화면 디자인 상세
- [네비게이션 맵](./navigation-map.md) — 화면 구조
- [성능 예산](./performance-budget.md) — 번들 크기 제약

---

## 변경 이력

| 버전 | 날짜 | 작성자 | 변경 내용 |
|------|------|--------|----------|
| 1.0.0 | {{DATE}} | tsq-designer | 초기 작성 |

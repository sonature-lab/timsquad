---
title: "네비게이션 맵 (Navigation Map)"
version: 1.0.0
last_updated: {{DATE}}
author: tsq-designer
status: draft
project: {{PROJECT_NAME}}
---

# 네비게이션 맵 (Navigation Map)

> 앱/웹의 화면 구조와 네비게이션 흐름을 정의합니다.
> 라우트 구조, 화면 간 전환, 딥링크를 일목요연하게 관리합니다.

---

## 1. 네비게이션 구조

### 1.1 전체 구조

```
App
├── Auth Routes (비인증)
│   ├── /welcome
│   ├── /login
│   ├── /register
│   └── /forgot-password
│
├── Main Routes (인증됨)
│   ├── / (Home)
│   │   ├── /items/:id (Detail)
│   │   └── /search (Search)
│   ├── /explore
│   │   └── /explore/:category
│   ├── /notifications
│   └── /profile
│       ├── /profile/settings
│       └── /profile/edit
│
└── Overlays (모달/다이얼로그)
    ├── FilterModal
    ├── ShareModal
    └── AlertDialog

> 모바일 앱: Tab Navigator, Stack Navigator 구조로 매핑
> 웹 SPA: React Router, Next.js App Router 등에 매핑
```

### 1.2 네비게이터 타입

| 네비게이터 | 타입 | 설명 |
|---------|------|------|
| RootNavigator | Stack | 인증 상태에 따라 Auth/Main 분기 |
| AuthStack | Stack | 로그인/회원가입 흐름 |
| MainTab | Bottom Tab | 메인 4개 탭 |
| HomeStack | Stack | Home 탭 내부 화면 |
| ModalStack | Modal | 오버레이 화면 |

---

## 2. 화면 목록

| 화면 ID | 화면명 | 네비게이터 | 인증 필요 | 딥링크 |
|---------|-------|----------|:--------:|-------|
| `welcome` | 웰컴 | Auth | ❌ | - |
| `login` | 로그인 | Auth | ❌ | `/login` |
| `register` | 회원가입 | Auth | ❌ | `/register` |
| `home` | 홈 | MainTab > Home | ✅ | `/home` |
| `detail` | 상세 | MainTab > Home | ✅ | `/items/:id` |
| `search` | 검색 | MainTab > Home | ✅ | `/search` |
| `explore` | 탐색 | MainTab > Explore | ✅ | `/explore` |
| `category` | 카테고리 | MainTab > Explore | ✅ | `/category/:id` |
| `notifications` | 알림 | MainTab > Notifications | ✅ | `/notifications` |
| `profile` | 프로필 | MainTab > Profile | ✅ | `/profile` |
| `settings` | 설정 | MainTab > Profile | ✅ | `/settings` |

---

## 3. 화면 전환 규칙

### 3.1 전환 매트릭스

| From | To | 방식 | 조건 |
|------|----|------|------|
| Welcome | Login | push | 버튼 탭 |
| Welcome | Register | push | 버튼 탭 |
| Login | Home | replace (root) | 로그인 성공 |
| Home | Detail | push | 아이템 탭 |
| Detail | ShareModal | modal | 공유 버튼 |
| Any | Login | replace (root) | 토큰 만료 |

### 3.2 전환 애니메이션

| 전환 유형 | 애니메이션 | 플랫폼 |
|---------|----------|--------|
| Stack push | slide-from-right | iOS/Android |
| Stack pop | slide-to-right | iOS/Android |
| Tab switch | none (instant) | 공통 |
| Modal present | slide-from-bottom | 공통 |
| Modal dismiss | slide-to-bottom | 공통 |

---

## 4. 딥링크

### 4.1 URL 스킴

| 스킴 | 용도 | 예시 |
|-----|------|------|
| `{{PROJECT_NAME}}://` | 앱 스킴 | `{{PROJECT_NAME}}://items/123` |
| `https://example.com` | 유니버설 링크 | `https://example.com/items/123` |

### 4.2 딥링크 라우팅

| 패턴 | 화면 | 파라미터 |
|-----|------|---------|
| `/items/:id` | DetailScreen | `id: string` |
| `/category/:id` | CategoryScreen | `id: string` |
| `/search?q=:query` | SearchScreen | `q: string` |
| `/notifications` | NotificationListScreen | - |
| `/profile` | ProfileScreen | - |

### 4.3 딥링크 미인증 처리

```
딥링크 수신 → 인증 확인 → 미인증 → 로그인 → 원래 딥링크로 리다이렉트
```

---

## 5. 탭 바 설정

| 탭 | 아이콘 | 라벨 | 뱃지 |
|---|-------|------|:----:|
| Home | `home` | 홈 | - |
| Explore | `compass` | 탐색 | - |
| Notifications | `bell` | 알림 | 미읽은 수 |
| Profile | `user` | 프로필 | - |

---

## 6. 관련 문서

- [UI/UX 명세](./ui-ux-spec.md) — 화면 상세 디자인
- [서비스 명세](./service-spec.md) — API 엔드포인트
- [컴포넌트 맵](./component-map.md) — 공유 컴포넌트

---

## 변경 이력

| 버전 | 날짜 | 작성자 | 변경 내용 |
|------|------|--------|----------|
| 1.0.0 | {{DATE}} | tsq-designer | 초기 작성 |

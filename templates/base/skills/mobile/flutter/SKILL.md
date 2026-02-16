---
name: flutter
description: Flutter 개발 가이드라인. Feature-first 아키텍처, Riverpod 상태관리, 위젯 합성, 성능 최적화, 크로스플랫폼 적응형 UI.
version: "1.0.0"
tags: [flutter, mobile, cross-platform, riverpod]
user-invocable: false
---

# Flutter Development Guidelines

Flutter 3.x 기반 크로스플랫폼 앱 개발 가이드라인.
Flutter 공식 아키텍처 가이드 + VGV + Riverpod 커뮤니티 베스트 프랙티스 종합.

## Philosophy

- 위젯은 합성 — 상속보다 조합, 작게 분리
- 상태는 구조화 — Riverpod로 선언적 의존성
- Feature-first — 기능 단위로 코드 구성
- const 는 습관 — 불필요한 리빌드 원천 차단

## Resources

8개 규칙 + 2개 참조. 카테고리별 배치.

| Priority | Type | Resource | Description |
|----------|------|----------|-------------|
| CRITICAL | rule | [widget-conventions](rules/widget-conventions.md) | 위젯 합성, const, Key 사용, 크기 제한 |
| CRITICAL | rule | [state-management](rules/state-management.md) | Riverpod Provider/Notifier 패턴 |
| CRITICAL | rule | [architecture](rules/architecture.md) | Feature-first + MVVM + Data/Domain/UI 레이어 |
| HIGH | rule | [navigation-routing](rules/navigation-routing.md) | go_router 선언적 라우팅, 딥링크 |
| HIGH | rule | [performance](rules/performance.md) | 리빌드 최적화, ListView.builder, Impeller |
| HIGH | rule | [testing](rules/testing.md) | Widget/Golden/Integration 테스트, mocktail |
| MEDIUM | rule | [platform-adaptive](rules/platform-adaptive.md) | 적응형 UI, 반응형 레이아웃, 플랫폼 분기 |
| MEDIUM | rule | [animations](rules/animations.md) | 암시적/명시적 애니메이션, Hero, 모션 가이드라인 |
| — | ref | [project-structure](references/project-structure.md) | Feature-first + melos 모노레포 구조 |
| — | ref | [freezed-patterns](references/freezed-patterns.md) | freezed + json_serializable 불변 모델 |

## Quick Rules

### 위젯
- `const` 생성자 적극 사용 (리빌드 스킵)
- 위젯 200줄 이하 — 초과 시 추출
- build() 안에서 로직 금지 — ViewModel/Notifier로 분리
- `GlobalKey` 남용 금지 — `ValueKey`/`ObjectKey` 사용

### 상태 관리 (Riverpod)
- UI 상태: `NotifierProvider` + `Notifier`
- 서버 데이터: `FutureProvider` / `StreamProvider`
- 파생 상태: `Provider` (computed)
- `ref.watch` (build), `ref.listen` (side effect), `ref.read` (이벤트 핸들러)

### 아키텍처
- Feature-first 구조 (`lib/features/{name}/`)
- 각 feature: `data/` + `domain/` + `presentation/`
- Repository 패턴으로 데이터 소스 추상화
- DTO ↔ Domain Model 변환 레이어

### 네비게이션
- go_router 선언적 라우팅
- 딥링크/유니버설 링크 지원
- 중첩 네비게이션 (ShellRoute)

### 성능
- `const` 위젯 우선
- 리스트는 `ListView.builder` (lazy)
- `RepaintBoundary`로 리빌드 범위 격리
- 이미지: `cached_network_image` + 적절한 크기

### 테스트
- Widget test: `testWidgets` + `pumpWidget`
- Unit test: Notifier/Repository 독립 테스트
- Integration test: `patrol` (네이티브 상호작용)
- Mock: `mocktail` (코드 생성 불필요)

## Checklist

| Priority | Item |
|----------|------|
| CRITICAL | const 생성자 사용 (lint: prefer_const_constructors) |
| CRITICAL | Riverpod Provider 타입 올바르게 선택 |
| CRITICAL | Feature-first 디렉토리 구조 |
| CRITICAL | build() 안에 비즈니스 로직 없음 |
| HIGH | ListView.builder 사용 (10+ 아이템) |
| HIGH | Repository 패턴 (데이터 소스 추상화) |
| HIGH | go_router 선언적 라우팅 |
| HIGH | Widget test 작성 |
| MEDIUM | RepaintBoundary 적용 (복잡한 서브트리) |
| MEDIUM | 적응형 UI (Material + Cupertino) |
| MEDIUM | 이미지 캐싱 + 적절한 리사이징 |

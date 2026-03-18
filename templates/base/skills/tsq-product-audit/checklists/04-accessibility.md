---
title: Accessibility Checklist
area: "04"
tags: accessibility, wcag, eaa, aria
standards: WCAG 2.2 AA, EAA 2025, WAI-ARIA APG
---

# 04. Accessibility Checklist

## A. Perceivable (인식 가능)

| # | 항목 | Severity | 근거 |
|---|------|:--------:|------|
| A-1 | 모든 이미지에 의미 있는 alt 텍스트 (장식용은 alt="") | CRITICAL | WCAG 1.1.1 |
| A-2 | 색상 대비: 일반 텍스트 >= 4.5:1, 대형 텍스트 >= 3:1 | CRITICAL | WCAG 1.4.3 |
| A-3 | 정보를 색상만으로 전달하지 않음 (패턴, 레이블 병행) | HIGH | WCAG 1.4.1 |
| A-4 | 미디어 대안 제공 — 자막, 오디오 설명 | MEDIUM | WCAG 1.2 |
| A-5 | `prefers-reduced-motion` 미디어 쿼리로 애니메이션 제어 | MEDIUM | WCAG 2.3.3 |

## B. Operable (조작 가능)

| # | 항목 | Severity | 근거 |
|---|------|:--------:|------|
| B-1 | 전체 키보드 탐색 — 모든 인터랙티브 요소 접근·조작 가능 | CRITICAL | WCAG 2.1.1 |
| B-2 | 포커스 표시기 — 모든 포커스 가능 요소에 시각적 표시 | CRITICAL | WCAG 2.4.7 |
| B-3 | Focus Not Obscured — 포커스 요소가 sticky 헤더·모달에 가려지지 않음 | CRITICAL | WCAG 2.4.11 (2.2 신규) |
| B-4 | Target Size >= 24×24 CSS px (Google 권장 48×48px) | HIGH | WCAG 2.5.8 (2.2 신규) |
| B-5 | 드래그 대안 — 모든 drag-and-drop에 클릭 기반 대안 제공 | HIGH | WCAG 2.5.7 (2.2 신규) |
| B-6 | Skip navigation 링크 | MEDIUM | WCAG 2.4.1 |
| B-7 | 적절한 헤딩 계층 (h1-h6), 페이지당 h1 하나 | HIGH | WCAG 1.3.1 |

## C. Understandable (이해 가능)

| # | 항목 | Severity | 근거 |
|---|------|:--------:|------|
| C-1 | Accessible Authentication — 비밀번호 붙여넣기 허용, 인지 기능 테스트 대안 | CRITICAL | WCAG 3.3.8 (2.2 신규) |
| C-2 | Consistent Help — 도움말 위치 페이지 간 일관 | HIGH | WCAG 3.2.6 (2.2 신규) |
| C-3 | Redundant Entry — 이전 입력 정보 재입력 요구 금지 | HIGH | WCAG 3.3.7 (2.2 신규) |
| C-4 | 폼 입력에 연결된 `<label>` — 오류 메시지 프로그래밍적 연결 | HIGH | WCAG 3.3.2 |
| C-5 | `lang` 속성 — `<html>`에 설정, 언어 변경 부분에 `lang` 마킹 | MEDIUM | WCAG 3.1.1 |
| C-6 | 오류 메시지: 평문, 해결책 포함 | MEDIUM | WCAG 3.3.3 |

## D. Robust (견고)

| # | 항목 | Severity | 근거 |
|---|------|:--------:|------|
| D-1 | ARIA "철칙": 네이티브 HTML 우선 (`<button>`, `<a>`, `<input>`), ARIA는 HTML 불가 시만 | HIGH | WAI-ARIA APG |
| D-2 | ARIA roles/states/properties — APG 패턴 준수, 잘못된 ARIA > 없는 ARIA | HIGH | WAI-ARIA 1.2 |
| D-3 | Live region (`aria-live`) — 동적 콘텐츠 업데이트 (토스트, 알림, 로딩) | MEDIUM | WAI-ARIA |
| D-4 | 의미 있는 링크 텍스트 — "더 보기" 단독 금지 | MEDIUM | WCAG 2.4.4 |

## E. Testing

| # | 항목 | Severity | 근거 |
|---|------|:--------:|------|
| E-1 | axe-core 자동 검사 통과 (WCAG 이슈 ~57% 탐지) | HIGH | 자동화 기준선 |
| E-2 | 스크린 리더 테스트 (NVDA+Firefox 또는 VoiceOver+Safari) | MEDIUM | 수동 검증 필수 |
| E-3 | CI에 axe-core 통합 | LOW | 회귀 방지 |

## 법적 참고

| 규정 | 기준 | 발효 |
|------|------|------|
| EAA (European Accessibility Act) | WCAG 2.1 AA + EN 301 549 | 2025.06.28 |
| ADA (US) | WCAG 2.2 AA (사실상 표준) | 지속 |
| Section 508 | WCAG 2.2 AA | 업데이트됨 |

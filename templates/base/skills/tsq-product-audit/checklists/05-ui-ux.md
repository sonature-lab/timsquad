---
title: UI/UX Checklist
area: "05"
tags: ui, ux, heuristics, responsive, design-system
standards: Nielsen 10 Heuristics, Responsive Design Best Practices
---

# 05. UI/UX Checklist

## A. Nielsen 10 Usability Heuristics

| # | 항목 | 점검 질문 | Severity |
|---|------|-----------|:--------:|
| A-1 | 시스템 상태 가시성 | 로딩·진행·확인 상태가 표시되는가? | HIGH |
| A-2 | 현실 세계 부합 | 내부 용어 대신 사용자 언어를 사용하는가? | HIGH |
| A-3 | 사용자 통제와 자유 | 실행취소·뒤로가기·취소가 명확한가? | HIGH |
| A-4 | 일관성과 표준 | 버튼·레이블·패턴이 전체적으로 일관된가? | HIGH |
| A-5 | 오류 예방 | 입력 검증, 비활성화, 파괴적 작업 확인이 있는가? | HIGH |
| A-6 | 인식 > 회상 | 필요한 정보가 보이는가, 기억을 요구하지 않는가? | MEDIUM |
| A-7 | 유연성과 효율 | 키보드 단축키, 파워 유저 기능이 있는가? | MEDIUM |
| A-8 | 미적·미니멀 디자인 | 불필요한 요소 없이 목적에 집중하는가? | MEDIUM |
| A-9 | 오류 인식·진단·복구 | 오류 메시지가 평문이고 해결책을 제시하는가? | HIGH |
| A-10 | 도움과 문서 | 검색 가능하고, 작업 지향적이며, 간결한가? | LOW |

평가: 3-5명 평가자 권장 (1인은 ~35% 이슈만 발견).
Severity: 1(외형) ~ 4(재앙) 스케일.

## B. Responsive Design

| # | 항목 | Severity | 근거 |
|---|------|:--------:|------|
| B-1 | Mobile-first 접근 — 모바일 트래픽 > 70% | CRITICAL | 웹 트래픽 통계 |
| B-2 | 터치 타겟 >= 44×44px, 적절한 간격, hover-only 인터랙션 없음 | CRITICAL | 모바일 UX |
| B-3 | 본문 텍스트 >= 16px — 줌 없이 읽기 가능 | CRITICAL | 가독성 |
| B-4 | 수평 스크롤 없음 — 모든 뷰포트에서 콘텐츠가 화면 안에 | HIGH | 레이아웃 |
| B-5 | 콘텐츠 기반 breakpoint — 임의 픽셀 값이 아닌 콘텐츠 기준 | HIGH | 반응형 설계 |
| B-6 | 유동 타이포그래피 — `clamp()` 활용 | MEDIUM | 가독성 |
| B-7 | 실제 기기 테스트 (iOS + Android) + DevTools 에뮬레이션 | HIGH | 디바이스 호환 |
| B-8 | 느린 네트워크 테스트 (3G 스로틀링) | MEDIUM | 저사양 환경 |

## C. Design System

| # | 항목 | Severity | 근거 |
|---|------|:--------:|------|
| C-1 | 컴포넌트가 디자인 토큰 준수 (색상, 간격, 타이포, 그림자) | HIGH | 일관성 |
| C-2 | 하드코딩된 색상/간격 없음 — 모두 토큰 참조 | HIGH | 유지보수 |
| C-3 | 일관된 타이포 스케일 적용 | HIGH | 시각적 위계 |
| C-4 | 일관된 간격 시스템 (4px/8px 기반 그리드) | MEDIUM | 레이아웃 |
| C-5 | 인터랙티브 상태 정의 — default, hover, focus, active, disabled, loading, error | MEDIUM | 상호작용 |
| C-6 | 아이콘 세트 통일 — 일관된 크기와 스타일 | MEDIUM | 시각적 통일 |

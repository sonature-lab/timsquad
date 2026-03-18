---
title: Functional & Requirements Checklist
area: "07"
tags: functional, requirements, rtm, coverage
standards: ISO 29119, Requirements Traceability Matrix
---

# 07. Functional & Requirements Checklist

## A. Requirements Traceability

| # | 항목 | Severity | 근거 |
|---|------|:--------:|------|
| A-1 | 양방향 추적성 — 요구사항 → 테스트 → 결함, 역방향도 가능 | HIGH | RTM 핵심 |
| A-2 | 모든 요구사항에 대응하는 테스트 케이스 존재 | HIGH | 요구사항 커버리지 |
| A-3 | 모든 기능에 대한 인수 조건 명시 | HIGH | 검증 가능성 |
| A-4 | RTM 최신 상태 유지 — 스프린트마다 갱신 | MEDIUM | Living document |
| A-5 | 미구현 요구사항 식별 및 사유 기록 | MEDIUM | 추적성 |

## B. Functional Testing

| # | 항목 | Severity | 근거 |
|---|------|:--------:|------|
| B-1 | Happy path 테스트 — 모든 핵심 기능의 정상 흐름 | CRITICAL | 기본 품질 |
| B-2 | Edge case 테스트 — 경계 조건 (빈 값, 0, null, 최대값) | HIGH | 견고성 |
| B-3 | Error case 테스트 — 오류 상황, 네트워크 장애, 잘못된 입력 | HIGH | 안정성 |
| B-4 | 기능당 5-7개 핵심 테스트 + 3-5개 엣지 케이스 | MEDIUM | 적정 커버리지 |
| B-5 | 자동화 + 탐색적 테스트 병행 | MEDIUM | ISO 29119 |

## C. Test Coverage

| # | 항목 | Severity | 근거 |
|---|------|:--------:|------|
| C-1 | 라인 커버리지 >= 80% | HIGH | 커버리지 기준 |
| C-2 | 브랜치 커버리지 >= 70% | HIGH | 커버리지 기준 |
| C-3 | 함수 커버리지 >= 80% | MEDIUM | 커버리지 기준 |
| C-4 | 커버리지 리포트 CI 통합 — 회귀 감지 | MEDIUM | 자동화 |
| C-5 | 커버리지 하락 시 PR 차단 또는 경고 | MEDIUM | 품질 게이트 |

## D. Integration & E2E

| # | 항목 | Severity | 근거 |
|---|------|:--------:|------|
| D-1 | 핵심 사용자 여정(Critical User Journey) E2E 테스트 | HIGH | 통합 품질 |
| D-2 | API 통합 테스트 — 외부 서비스 연동 검증 | HIGH | 호환성 |
| D-3 | E2E 안정성 — flaky test 비율 < 5% | MEDIUM | 테스트 신뢰도 |
| D-4 | 테스트 데이터 관리 — 독립적, 재현 가능한 테스트 환경 | MEDIUM | 테스트 품질 |

## E. Regression

| # | 항목 | Severity | 근거 |
|---|------|:--------:|------|
| E-1 | 변경 영향 분석 — 코드 변경과 테스트 케이스 매핑 | HIGH | 회귀 방지 |
| E-2 | 회귀 테스트 스위트 CI 통합 | HIGH | 자동화 |
| E-3 | 이전 감사 finding에 대한 회귀 테스트 존재 | MEDIUM | 재발 방지 |

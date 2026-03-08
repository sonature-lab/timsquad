---
name: product-audit
description: |
  통합 제품 감사 스킬. 7개 영역(Security, Performance, SEO, Accessibility, UI/UX, Architecture, Functional)을
  정량 스코어링으로 평가하고, 6단계 사이클(Plan→Audit→Report→Remediation Plan→Fix→Re-audit)로 운영한다.
  Use when: Phase gate 전 품질 확인, 보안 감사, 성능 리뷰, 접근성 점검, 릴리스 전 최종 검증, 코드 감사 요청 시.
version: "2.0.0"
tags: [audit, quality, security, performance, accessibility, seo]
depends_on: [coding, testing]
conflicts_with: []
user-invocable: false
---

# Product Audit

7개 영역을 체계적으로 평가하고, 정량 스코어와 개선 사이클로 품질을 추적한다.

## Philosophy

- 정량 70% + 정성 30% 가중 평균으로 객관적 평가
- 모든 항목에 `source: estimated | measured` 명시
- False Positive는 FP Registry로 관리하여 재감사 시 노이즈 제거
- Closed-loop: 감사 → 개선 → 재감사 사이클로 품질 수렴

## Contract

- **Trigger**: 감사 태스크, Phase gate 전, 릴리스 전 검증
- **Input**: 감사 범위 + FP Registry + 이전 리포트 (재감사 시)
- **Output**: 정량 스코어 보고서 + severity 분류 + 개선 계획
- **Error**: Critical 항목 존재 시 gate 차단
- **Dependencies**: coding, testing

## Protocol — 6단계 사이클

### Phase 1: Plan (감사 계획)
감사 범위, 대상 영역, 기준을 결정하고 계획을 저장한다.
- 프로젝트 타입에 따라 영역별 가중치 조정
- FP Registry 로딩, baseline(이전 감사 결과) 확인
- 계획을 문서로 저장 → 유저 컨펌 후 진행

### Phase 2: Audit (감사 실행)
계획에 따라 7개 영역을 순회하며 체크리스트 기반 평가.
- 각 항목: pass / fail / warning / skip + source 명시
- 자동화 가능 항목은 도구 실행 (Lighthouse, axe-core, eslint 등)
- 수동 항목은 코드 리뷰로 판정

### Phase 3: Report (보고)
감사 결과를 정량 스코어로 집계하고 개선점을 보고한다.
- 영역별 점수 + 가중 평균 종합 점수 산출
- severity별 finding 분류 (Critical/High/Medium/Low)
- 이전 감사 대비 diff (개선/악화 추적)

### Phase 4: Remediation Plan (개선 계획)
보고서를 토대로 개선 계획을 수립한다.
- severity 기준 우선순위 정렬
- 개선 계획 문서 작성 → 유저 컨펌 → 저장
- 컨펌 없이 개선 실시하지 않음

### Phase 5: Fix (개선 실시)
컨펌된 계획에 따라 개선을 실행하고 테스트한다.
- 개선 완료 후 관련 테스트 실행 (unit + integration)
- E2E 테스트까지 통과 확인
- 테스트 실패 시 수정 반복

### Phase 6: Re-audit (재감사)
개선 완료 후 동일 기준으로 재감사를 실시한다.
- Phase 2와 동일 절차, 이전 결과와 diff 비교
- Gate 기준 충족 시 완료, 미충족 시 Phase 4로 복귀

## Verification

| Check | Method | Pass Criteria |
|-------|--------|---------------|
| 종합 점수 | 가중 평균 | >= 60점 (gate) |
| Critical 항목 | severity 확인 | 0건 |
| source 필드 | 리포트 확인 | 모든 항목 존재 |
| 재감사 diff | 이전 대비 비교 | PASS→FAIL 전환 0건 |

## 7개 감사 영역

| # | 영역 | 핵심 기준 | 체크리스트 |
|---|------|-----------|-----------|
| 01 | Security | OWASP Top 10:2025, ASVS v5, CWE Top 25, CVSS 4.0 | [01-security](checklists/01-security.md) |
| 02 | Performance | Core Web Vitals (LCP/INP/CLS), Lighthouse v12 | [02-performance](checklists/02-performance.md) |
| 03 | SEO | E-E-A-T, AI Overview, Schema.org, Mobile-first | [03-seo](checklists/03-seo.md) |
| 04 | Accessibility | WCAG 2.2 AA, EAA 2025, WAI-ARIA APG | [04-accessibility](checklists/04-accessibility.md) |
| 05 | UI/UX | Nielsen 10 Heuristics, 반응형, 디자인 시스템 | [05-ui-ux](checklists/05-ui-ux.md) |
| 06 | Architecture & DB | ISO 25010:2023, 데이터 아키텍처, API 설계 | [06-architecture](checklists/06-architecture.md) |
| 07 | Functional & Requirements | RTM, 테스트 커버리지, 요구사항 추적 | [07-functional-requirements](checklists/07-functional-requirements.md) |

## Severity & SLA

| Severity | Action | SLA |
|----------|--------|-----|
| Critical | 즉시 수정, 배포 차단 | 같은 Phase |
| High | 다음 시퀀스 내 수정 | 현재 Phase |
| Medium | 백로그 등록 | 다음 Phase |
| Low | 선택적 개선 | 스프린트 내 |

## Resources

| Priority | Type | Resource | Description |
|----------|------|----------|-------------|
| HIGH | rule | [audit-protocol](rules/audit-protocol.md) | 6단계 절차 상세, 입출력, 도구 연동 |
| HIGH | rule | [scoring-criteria](rules/scoring-criteria.md) | 영역별 가중치, 점수 산출, gate 기준 |
| HIGH | rule | [false-positive-guard](rules/false-positive-guard.md) | FP Registry, 오탐 방지 규칙, 계층적 검증 |
| MEDIUM | checklist | [01-security](checklists/01-security.md) | OWASP 2025 + ASVS v5 + CWE Top 25 |
| MEDIUM | checklist | [02-performance](checklists/02-performance.md) | CWV 2026 + Lighthouse v12 |
| MEDIUM | checklist | [03-seo](checklists/03-seo.md) | E-E-A-T + AI Overview + Schema |
| MEDIUM | checklist | [04-accessibility](checklists/04-accessibility.md) | WCAG 2.2 AA + EAA 2025 |
| MEDIUM | checklist | [05-ui-ux](checklists/05-ui-ux.md) | Nielsen Heuristics + 반응형 + 디자인 시스템 |
| MEDIUM | checklist | [06-architecture](checklists/06-architecture.md) | ISO 25010 + DB + API 설계 |
| MEDIUM | checklist | [07-functional-requirements](checklists/07-functional-requirements.md) | RTM + 테스트 커버리지 |
| LOW | template | [report-template](templates/report-template.md) | 감사 보고서 양식 |
| LOW | template | [improvement-plan-template](templates/improvement-plan-template.md) | 개선 계획 양식 |

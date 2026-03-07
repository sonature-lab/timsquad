---
name: product-audit
description: |
  제품 감사(Product Audit) 스킬. 프로젝트의 품질, 보안, 성능, 접근성을 체계적으로 평가한다.
  tsq audit CLI와 연동하여 FP Registry, source 추적, 재감사 diff를 지원한다.
  Phase A(계획) -> B(실행) -> C(리포트) -> D(Remediation) 4단계 프로세스.
version: "1.0.0"
tags: [audit, quality, security, performance]
user-invocable: false
---

# Product Audit

제품 품질을 체계적으로 평가하고, 발견된 문제의 심각도별 해결을 추적한다.

## Philosophy

- 모든 감사 항목은 `source: estimated | measured`를 명시한다
- False Positive는 FP Registry로 관리하여 재감사 시 자동 스킵한다
- 재감사 시 이전 결과와 diff를 제공하여 개선/악화를 추적한다

## Phases

### Phase A - Planning
- 감사 범위 결정 (도메인, 카테고리)
- 기존 FP Registry 로딩 (`tsq audit fp list`)
- 이전 감사 리포트 확인 (baseline)

### Phase B - Execution
- 도메인별 항목 평가 (pass/fail/warning/skip)
- 각 항목에 `source` 명시 (estimated vs measured)
- 자동화 가능 항목은 measured, 수동 판단은 estimated 표기

### Phase C - Report
- 구조화된 JSON 리포트 생성
- FP 항목 자동 제외 + 제외 수 기록
- `tsq audit validate` 로 리포트 무결성 검증

### Phase D - Remediation
심각도 기준 우선순위 정렬 및 해결 추적.

#### D-1. Severity Triage
| Severity | Action | SLA |
|----------|--------|-----|
| critical | 즉시 수정, 배포 차단 | 같은 Phase 내 |
| high | 다음 시퀀스 내 수정 | 현재 Phase 내 |
| medium | 백로그 등록, 다음 Phase 가능 | 다음 Phase |
| low | 선택적 개선 | 스프린트 완료 전 |

#### D-2. Verification Type
| Type | Description | When |
|------|-------------|------|
| automated | 단위/통합 테스트로 자동 검증 | test pass 확인 |
| manual | 수동 확인 (UI, UX, 접근성) | 리뷰어 sign-off |
| measured | 도구 기반 측정 (Lighthouse, axe) | 재실행으로 비교 |

#### D-3. Rollback Guide
- critical 수정 실패 시: `git revert` + 이전 안정 버전 배포
- 수정이 회귀를 유발할 경우: 수정 전 상태로 복원 후 재감사
- `tsq audit diff` 로 수정 전후 비교하여 악화 항목 없음을 확인

#### D-4. Re-audit Cycle
1. 수정 완료 후 `tsq audit validate <report>` 실행
2. `tsq audit diff <before> <after>` 로 개선 확인
3. 모든 critical/high 항목 pass 전환 시 Phase Gate 통과 가능

## Quick Rules

### Report Quality
- `source` 필드 없는 항목은 리포트 검증 실패
- `estimated` 항목이 50% 초과 시 경고
- FP 등록 시 반드시 `reason` 기재

### Process
- Phase D 없이 감사 완료로 간주하지 않음
- critical 항목 미해결 시 Phase Gate 차단
- 재감사 diff에서 PASS->FAIL 전환 발견 시 즉시 조사

## Checklist

| Priority | Item |
|----------|------|
| CRITICAL | 모든 항목에 source (estimated/measured) 명시 |
| CRITICAL | critical 항목 0건 확인 후 Phase 전환 |
| HIGH | FP Registry 최신 상태 유지 |
| HIGH | 재감사 시 이전 리포트 대비 diff 확인 |
| MEDIUM | estimated 항목을 measured로 전환 계획 수립 |

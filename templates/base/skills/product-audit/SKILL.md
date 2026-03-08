---
name: product-audit
description: |
  제품 감사(Product Audit) 스킬. 프로젝트의 품질, 보안, 성능, 접근성을 체계적으로 평가한다.
  tsq audit CLI와 연동하여 FP Registry, source 추적, 재감사 diff를 지원한다.
  Phase A(계획) -> B(실행) -> C(리포트) -> D(Remediation) 4단계 프로세스.
  Use when: Phase gate 전 품질 확인, 보안 감사, 성능 리뷰, 접근성 점검, 릴리스 전 최종 검증 시.
version: "1.0.0"
tags: [audit, quality, security, performance]
depends_on: [coding, testing, security]
conflicts_with: []
user-invocable: false
---

# Product Audit

제품 품질을 체계적으로 평가하고, 심각도별 해결을 추적한다.

## Philosophy

- 모든 감사 항목은 `source: estimated | measured`를 명시
- False Positive는 FP Registry로 관리
- 재감사 시 이전 결과와 diff를 제공하여 개선/악화 추적

## Contract

- **Trigger**: 감사 태스크, Phase gate 전 품질 확인 시
- **Input**: 감사 범위 + 기존 FP Registry + 이전 리포트
- **Output**: 구조화된 JSON 감사 리포트 + severity 분류
- **Error**: critical 항목 발견 시 Phase gate 차단
- **Dependencies**: coding, testing, security

## Protocol

1. **Phase A - Planning**: 감사 범위 결정, FP Registry 로딩, baseline 확인
2. **Phase B - Execution**: 도메인별 항목 평가 (pass/fail/warning/skip), source 명시
3. **Phase C - Report**: JSON 리포트 생성, FP 제외, `tsq audit validate` 검증
4. **Phase D - Remediation**: severity 기준 우선순위 정렬 + 해결 추적

## Verification

| Check | Command | Pass Criteria |
|-------|---------|---------------|
| 리포트 무결성 | `tsq audit validate` | exit code 0 |
| source 필드 | 리포트 확인 | 모든 항목 source 존재 |
| critical 해결 | severity 확인 | critical 0건 |
| 재감사 diff | `tsq audit diff` | PASS→FAIL 전환 0건 |

## Quick Rules

### Severity & SLA
| Severity | Action | SLA |
|----------|--------|-----|
| critical | 즉시 수정, 배포 차단 | 같은 Phase |
| high | 다음 시퀀스 내 수정 | 현재 Phase |
| medium | 백로그 등록 | 다음 Phase |
| low | 선택적 개선 | 스프린트 내 |

### Report Quality
- `source` 필드 없는 항목은 검증 실패
- `estimated` 50% 초과 시 경고
- FP 등록 시 반드시 `reason` 기재
- Phase D 없이 감사 완료 불가

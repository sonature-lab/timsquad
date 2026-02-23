---
description: 계획 품질 검증 루프. Full Mode에서 구현 전 필수 수행.
globs:
  - ".timsquad/ssot/**"
  - ".timsquad/state/**"
---

# 계획 품질 검증 (Plan Review Protocol)

## 언제 수행하나
`tsq f`로 Full Mode 진입 시, SSOT 체크 후 / 에이전트 위임 전.

## 검증 축 (3-Axis Plan Review)

### Axis P1: 요구사항 명확성
- 태스크가 구체적 행동(what)과 완료 조건(done-when)을 포함하는가
- 모호한 용어 없이 검증 가능한 기준이 있는가
- SSOT 문서(requirements.md, functional-spec.md)에 근거가 있는가

### Axis P2: 기술 분해 품질
- 단일 시퀀스로 완료 가능한 크기인가 (아니면 분할 필요)
- 에이전트 위임이 명확한가 (developer/dba/qa 중 누구에게)
- 의존성 순서가 올바른가 (DB 먼저 → API → 프론트 등)

### Axis P3: 리스크 & 빠진 것
- 기존 코드에 영향을 주는 부분이 식별되었는가
- 에러/엣지 케이스 대응이 계획에 포함되었는가
- 보안/성능 고려사항이 누락되지 않았는가

## 검증 결과 분류

| 결과 | 조건 | 액션 |
|------|------|------|
| ✅ PASS | 3축 모두 충족 | 구현 진행 |
| 🔄 REVISE (1/2) | 1-2축 미충족, 자체 보완 가능 | PM이 계획 보완 후 재검증 |
| ❌ ESCALATE | 3축 미충족 or 2회 재검토 후에도 미충족 | 사용자에게 확인 요청 (L3) |

## 재검토 규칙
- 최대 2회 재검토 (iteration 1 → 2 → 실패 시 ESCALATE)
- 매 재검토마다 어떤 축이 미충족인지 명시
- REVISE 시 SSOT 보완이 필요하면 먼저 SSOT 수정 후 재검증
- 2회 이내 PASS 시 "Plan Review: PASS (iteration N)" 기록 후 진행

## 상세 체크 항목
knowledge/checklists/plan-quality.md 참조.

---
template: Mini-RFC for vNext Phase
purpose: Each vNext phase (A9~A13) requires a fresh Mini-RFC before implementation. Do NOT start a phase only because it appears in the master roadmap.
related:
  - docs/improvement-plan-2026-05-22.md
  - docs/rfc/vnext-operational-state-runtime.md
copy_to: docs/rfc/phase-{name}-rfc.md
---

# Phase {N} Mini-RFC: {Title}

> 본 RFC 는 Phase 시작 전에 작성/리뷰되어야 하며, **Exit Criteria 가 정의되지 않으면 시작 불가**.

## Prime Directive Check (필수, 6 questions)

작성자는 본 phase 의 모든 산출물에 대해 아래 6 질문에 답해야 한다. 하나라도 "yes" 가 나오면 reject 또는 scope 축소.

1. Does this create a new truth source? → **reject if yes**
2. Can this artifact be deleted and regenerated? → **if no, it is not a projection (reject)**
3. Can PASS/completed be claimed without evidence? → **reject if yes**
4. Does this rely on agent self-report? → **add validator if yes**
5. Does this make hooks the standard instead of adapter? → **reject if yes** *(check at phase exit, not entry — hooks may still be implementation detail during a phase)*
6. Does this require future MCP/daemon to be useful? → **shrink scope if yes**

| # | 답변 | 근거 |
|---|------|------|
| Q1 | yes / no | |
| Q2 | yes / no | |
| Q3 | yes / no | |
| Q4 | yes / no | |
| Q5 | yes / no | |
| Q6 | yes / no | |

---

## 1. Goal

이번 Phase 에서 증명하려는 **단 하나의** 가설. 한 문장.

> 예: "Evidence-bound task complete 가 LLM agent 의 false claim 을 실제로 잡는다."

## 2. Why Now

이전 Phase 결과상 **지금** 해야 하는 이유. 직전 phase 의 dogfood KPI / Exit Criteria 결과 인용.

> 예: "Phase Alpha dogfood 에서 schema 변경 0회, p99 280ms 달성. 다음 단계 (`.glog`) 의 prerequisite 충족."

## 3. External References

유사 이론 / 프레임워크 / 사례. 최소 3개. URL 포함.

- [ ] reference 1
- [ ] reference 2
- [ ] reference 3

## 4. Scope

이번에 **하는 것**. bullet 최대 7개.

## 5. Non-Scope

이번에 **절대 하지 않는 것**. Scope 와 동일한 수준으로 명확히. 작성하지 않으면 scope creep 발생.

## 6. Implementation Slice

작게 자른 구현 단위. 각 slice 는 1~3일 이하.

| Slice | 산출물 | 소요 |
|-------|--------|------|
| S1 | | |
| S2 | | |
| S3 | | |

## 7. Evidence Required

완료/PASS 를 인정할 **증거**. 각 슬라이스마다.

| Slice | Evidence type | Producer | Validator |
|-------|---------------|----------|-----------|
| S1 | | | |

> **원칙**: agent self-issued evidence 금지. CI / test runner / build artifact 등 외부 source 만 허용.

## 8. Performance Budget

| 지표 | 목표 | 측정 방법 |
|------|------|----------|
| p99 latency | | |
| file size growth | | |
| rebuild cost | | |
| 기타 | | |

> Budget 초과 시 즉시 중단 + kill criteria 평가.

## 9. Security / Policy

- secrets handling: ...
- PII / sensitive data: ...
- permission boundaries: ...
- break-glass / override mode: ... (있어야 함)
- redaction filter: ...

## 10. Kill Criteria

이 조건이 충족되면 **즉시 중단**. 최소 3개.

- 예: claim drift 차단 사례 0건 (4주 dogfood 후) → 가설 실패
- 예: schema 변경 ≥ 2회 → schema governance 실패
- 예: p99 latency > 1s 지속 → 아키텍처 결함
- 예: break-glass 사용 ≥ 30% → UX 마찰이 가치 압도

## 11. Exit Criteria

다음 Phase 로 **promote** 하기 위한 조건. 모두 충족해야 함. 측정 가능 + 검증 가능.

- 예: evidence 없는 task complete 가 block 됨 (자동 테스트 PASS)
- 예: valid evidence 있는 task complete 가 append 됨 (자동 테스트 PASS)
- 예: hook latency p99 < 300ms (warm)
- 예: 1주 dogfood 에서 false completion 차단 사례 ≥ 1건 또는 명확한 near-miss 기록

> Exit Criteria 미충족 시 다음 Phase 진입 금지. Kill 또는 re-spike.

## 12. Execution Model

본 phase 에서:

- **Claude Code implements** — slice 단위로 PR / commit.
- **Auditor verifies** — 매 slice 완료 시점에 Prime Directive Check + Exit Criteria 진척도 확인.
- **User decides** — phase promotion 또는 kill criteria 발동 시점에만 의사결정 요청.

---

## 부록: 작성 가이드

- 본 템플릿을 `docs/rfc/phase-{name}-rfc.md` 로 복사하여 사용.
- 모든 필드를 채우기 전에는 phase 시작 금지.
- Mini-RFC 자체가 stale 되지 않도록, phase 진행 중 발견사항은 별도 `docs/rfc/phase-{name}-findings.md` 에 append (RFC 본문 직접 수정 금지 — RFC = canonical decision, findings = generated view).

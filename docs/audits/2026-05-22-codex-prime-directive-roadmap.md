---
type: audit
source: codex-external
date: 2026-05-22
session: 10607571-f6c7-4755-b805-d95daab8c6cc
artifact_kind: prime-directive-roadmap-guidance
---

# 2026-05-22 — Codex Prime Directive + Hypothesis Roadmap Guidance

이 문서는 2026-05-22 vNext 핸드오프 세션에서 외부 감사자(Codex)가 제시한 "Prime Directive + 가설 로드맵 + Mini-RFC + Dogfood gate + 감수 게이트 + 대전제 위반 체크리스트" 지침의 원문이다. 사용자 메시지(uuid `529e3952-1b26-488c-9c31-966027dea27a`)에 Codex 의견으로 직접 인용 전달됐다. 핵심 권고는 7개 항목 — (1) 최상위 문서를 Prime Directive 한 장으로 압축, (2) A9~A13을 확정 계획에서 가설 로드맵으로 격하, (3) Phase별 Mini-RFC 의무화, (4) Dogfood evidence를 Phase 입장권으로, (5) 감수 게이트 (Auditor verifies) 문서화, (6) 대전제 위반 체크리스트 6 questions 추가, (7) 문서 보완 문구. 원문 그대로 — 의역/요약 없음.

---

코덱스의견: 
보완 방향은 “더 자세한 전체 계획”이 아니라 **대전제 중심의 Phase-gated 운영 체계**로 바꾸는 게 좋아 보입니다.

**1. 최상위 문서를 하나로 압축**
지금 문서가 많아지면서 다시 stale risk가 생깁니다. 최상위에는 딱 이것만 남기는 게 좋습니다.

```text
TimSquad vNext Prime Directive

No Evidence, No Commit.
Generated Views Are Never Truth.

Goal:
LLM이 완벽히 기억하게 만드는 것이 아니라,
증거 없는 operational state 변경이 commit되지 못하게 만든다.

Canonical Truth:
- operational-events.jsonl
- verified evidence artifacts
- source code

Generated Views:
- .glog
- current-phase.json
- task-context.json
- reports
- dashboards
- handoff
```

**2. A9~A13을 확정 계획이 아니라 “가설 로드맵”으로 격하**
지금 A9~A13은 너무 구체적입니다. 이걸 확정 계획처럼 두면 Claude Code가 미래 작업을 그대로 밀고 갈 위험이 있어요.

표현을 이렇게 바꾸면 좋습니다.

```text
A9~A13 are roadmap hypotheses.
Each phase requires a fresh mini-RFC before implementation.
No phase may start only because it appears in this roadmap.
```

**3. Phase마다 Mini-RFC를 의무화**
각 Phase 시작 전에 Claude Code가 먼저 리서치 문서를 만들고, 당신/감사자가 리뷰하게 합니다.

Mini-RFC 템플릿은 이렇게요.

```text
# Phase X Mini-RFC

## Goal
이번 Phase에서 증명하려는 단 하나의 가설

## Why Now
이전 Phase 결과상 지금 해야 하는 이유

## External References
유사 이론/프레임워크/사례

## Scope
이번에 하는 것

## Non-Scope
이번에 절대 하지 않는 것

## Implementation Slice
작게 자른 구현 단위

## Evidence Required
완료/PASS를 인정할 증거

## Performance Budget
latency, file size, rebuild cost 등

## Security/Policy
secrets, PII, permissions, break-glass

## Kill Criteria
중단 기준

## Exit Criteria
다음 Phase로 넘어가는 기준
```

**4. Dogfood를 다음 Phase의 입장권으로 만들기**
가장 중요한 보완입니다.

예:

```text
Phase Alpha exit criteria:
- evidence 없는 task complete가 block됨
- valid evidence가 있는 task complete는 append됨
- event verify/tail 동작
- hook latency p99 < 300ms
- 1주 dogfood에서 false completion 차단 사례 1건 이상 또는 명확한 near-miss 기록
```

이걸 통과 못 하면 A11로 못 갑니다.

**5. “감수 게이트”를 문서화**
사용자에게 계속 물어보는 게 아니라, 각 Phase 끝에서 감사자가 실측합니다.

```text
Execution model:
Claude Code implements.
Auditor verifies.
User decides only on phase promotion or kill criteria.
```

**6. 대전제 위반 체크리스트 추가**
각 계획 끝에 이 체크리스트를 넣으면 drift를 줄일 수 있습니다.

```text
Prime Directive Check:
- Does this create a new truth source? If yes, reject.
- Can this artifact be deleted and regenerated? If no, it is not a projection.
- Can PASS/completed be claimed without evidence? If yes, reject.
- Does this rely on agent self-report? If yes, add validator.
- Does this make hooks the standard instead of adapter? If yes, reject.
- Does this require future MCP/daemon to be useful? If yes, shrink scope.
```

**7. 지금 문서들에 넣을 보완 문구**
Claude Code에게는 이런 지시가 좋습니다.

```text
Update the vNext docs so the roadmap is explicitly hypothesis-driven and phase-gated.

Add a Prime Directive section:
No Evidence, No Commit.
Generated Views Are Never Truth.

Add a rule:
A9~A13 are roadmap hypotheses, not implementation commitments.
Each phase requires a fresh Mini-RFC before implementation.
Dogfood evidence is required before promoting to the next phase.

Add Mini-RFC template:
Goal / Why Now / External References / Scope / Non-Scope / Implementation Slice / Evidence Required / Performance Budget / Security Policy / Kill Criteria / Exit Criteria.

Add execution model:
Claude Code implements.
Auditor verifies.
User decides only on phase promotion or kill criteria.

Do not implement code.
Only update docs.
```

**내 최종 추천**
- 지금 문서는 방향성은 좋습니다.
- 하지만 “전체 계획서”가 너무 실행 명령처럼 보입니다.
- 그래서 A9~A13을 **확정 계획**에서 **가설 로드맵**으로 낮추고,
- Phase마다 mini-RFC + dogfood gate를 요구하는 구조로 바꾸면 됩니다.

그러면 팀스쿼드가 추구하는 완성본은 유지하면서, 과설계/장기화/문서 stale 위험을 크게 줄일 수 있습니다.

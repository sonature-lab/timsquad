---
name: vNext Direction — Operational State Runtime
description: TimSquad vNext 핵심 방향 — Evidence 기반 event commit + lazy projection 으로 stale truth 차단. 5-Phase 로드맵, 5개 최소 CLI, Runtime 계층 구조.
type: project
created: 2026-05-22
source: handoff (2026-05-22)
canonical_ssot: docs/rfc/vnext-operational-state-runtime.md
---

# vNext Direction — Operational State Runtime

## 🧭 3-Horizon North Star

- **H1 — Model-agnostic Operational Harness Runtime** (현재). 스킬/훅/문서가 아니라 Runtime 이 프로세스 강제·정보 주입·정보 무결성 담당. Claude/Codex/Cursor 비종속. **vNext A9~A13 은 H1 하위 Operational Runtime Track**.
- **H2 — Harness-native Multi-session Terminal IDE** (deferred). OpenCode/cmux/tmux 참고. H1 완료 전 구현 금지.
- **H3 — Provider-agnostic LLM Execution Backend** (deferred). 독립 LLM / 로컬 모델 / provider adapter. H1 protocol 안정 후.

### H1 시작 순서

```
H1-F0 (Kernel Grammar: TaskRuntime Process + Log Taxonomy + Audit Protocol, 1 RFC / 1~2일)
  → A1~A3 / Wave 0 S3,S4
  → A4 (#50)
  → A9 → A10 → ...
```

**H1-F0 = H1 Foundation 의 첫 공식 slice**. A4/A9/A10 공통 문법. 구현 금지, maximum 1 RFC. Codex audits read-only 는 H1-F0 의 **Audit Protocol** 에서 구체화 예정.

## ⚓ Prime Directive (불변)

```
No Evidence, No Commit.
Generated Views Are Never Truth.
```

## 📜 본 메모의 status

- vNext 5-Phase 는 **roadmap hypotheses, NOT commitments**.
- 각 phase 시작 전 fresh **Mini-RFC** (`docs/rfc/_mini-rfc-template.md`) + 직전 phase **Exit Criteria** 충족 필수.
- vNext 는 별도 트랙이 아니라 **open issue 해소의 방향성** — Stabilization (A1~A3, A5~A8) + Runtime Seed (A4, A9, A10) + Conditional Runtime (A11~A13).

## 🎭 Execution Model

```
Claude Code implements.   — slice 단위
Codex audits read-only.   — Prime Directive Check + Exit Criteria + dogfood KPI event 확인. 수정 권한 없음.
User decides              — phase promotion 또는 kill 시점에만
```

## 🔍 Prime Directive Check (모든 신규 산출물 적용)

1. Does this create a new truth source? → reject if yes
2. Can this artifact be deleted and regenerated? → if no, not a projection
3. Can PASS/completed be claimed without evidence? → reject if yes
4. Does this rely on agent self-report? → add validator if yes
5. Does this make hooks the standard instead of adapter? → reject if yes (check at phase exit)
6. Does this require future MCP/daemon to be useful? → shrink scope if yes

---

## 한 줄 정의

TimSquad vNext 는 문서 하네스가 아니라 **Evidence 기반 event commit 과 lazy projection 재생성으로 stale truth 를 막는 Operational State Runtime** 이다.

## 핵심 목표

1. **트랜잭션 단위 정합성 유지**
2. **핵심 operational context 전달**

## Canonical Truth

- `operational-events.jsonl` (append-only)
- verified evidence artifacts
- source code

## Generated Views (truth 아님, invalidate → regenerate)

- `.glog`
- `current-phase.json`
- `task-context.json`
- phase reports
- dashboards
- handoff

## 절대 원칙

- **Runtime = observer/validator, NOT owner** — src/ 는 Claude/Codex Edit 직접 수정. **Canonical truth (`operational-events.jsonl`) + runtime-owned generated projections (`.glog`, `current-phase.json`, `task-context.json`)** 만 Runtime / `tsq` CLI 가 갱신. Generated projections 는 truth 가 아니며 deletable/regenerable.
- **Event append = 유일한 commit point**
- **Evidence = commit credential** — evidence validate 통과해야 event append 허가
- **Append-only 파일은 Write/Edit 모두 차단** — 갱신은 `tsq event append` / `tsq evidence validate` runtime CLI 만 (legacy fallback: 안전한 append-only shell `cat >>`, `tee -a`. `>` 단일 redirect 는 차단)
- **Report = claim, Event = canonical truth** — PASS/completed/closed 는 evidence 없으면 commit 불가
- **Projection 은 invalidate 후 lazy regenerate** — 동시 업데이트 ❌

## 최소 CLI surface (Hook = adapter, CLI = 공통 surface)

**최종 최소 CLI surface (RFC §11, 5개)**:

```
tsq evidence validate
tsq event append
tsq task complete
tsq context resolve   ← .glog/ProjectMap 의존, A11 에서 구현
tsq file impact       ← ProjectMap 의존, A11 에서 구현
```

**A10 (Phase 1 walking skeleton) 구현 대상**:

```
tsq evidence validate
tsq event append
tsq event verify
tsq event tail
tsq task complete (bridge)
```

`context resolve` / `file impact` 는 A11 (`.glog` + ProjectMap) 이후로 분리됨.

## 5-Phase 로드맵

- **Phase 0** — append-only guard / **Evidence v0.1 수입+재검증** / Entity ID convention (← 현재 위치. Evidence v0.1 은 handoff 보고 기준 완료지만 main repo 미반영 — 수입+재검증 대상)
- **Phase 1** — event schema + minimal tsq CLI
- **Phase 2** — **Ontology Object Model** (Task/Decision/File/Evidence/Phase/Entity/Constraint typed objects + relations) + `.glog` (operational graph / relation substrate) + ProjectMap (object metadata / navigation metadata source) → **Operational Context Chain Resolver** instantiate (task/question 기준) → **Operational Context Chain** (agent input context 대체, generated projection, NOT truth) + **Knowledge Export** to Obsidian / LLM wiki / markdown (export 결과물도 generated projection, NOT truth) + **MetaIndex 격하**
- **Phase 3** — capability boundary + runtime 계층 + convention executable
- **Phase 4** — daemon + MCP + cross-platform runtime

## 가장 중요한 목표

- LLM 이 완벽히 기억한다 ❌
- **잊어도 invalid state 가 commit 되지 못하게 한다 ✅**
- Runtime = transaction gate

## 관련 문서

- 방향성 SSOT: [docs/rfc/vnext-operational-state-runtime.md](../docs/rfc/vnext-operational-state-runtime.md)
- 실행 plan: [docs/improvement-plan-2026-05-22.md](../docs/improvement-plan-2026-05-22.md)
- 원본 이슈: [#56](https://github.com/sonature-lab/timsquad/issues/56), [#57](https://github.com/sonature-lab/timsquad/issues/57)

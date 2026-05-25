---
title: TimSquad vNext — Operational State Runtime
status: Draft (Handoff 정제본)
authors: EricSon
created: 2026-05-22
related_issues: ["#56", "#57", "#50", "#55"]
related_plans: ["docs/improvement-plan-2026-05-22.md"]
supersedes: (none — vNext SSOT 신설)
one_liner: "Evidence 기반 event commit + lazy projection 재생성으로 stale truth 를 막는 Operational State Runtime"
---

# RFC: TimSquad vNext — Operational State Runtime

## 0. 목적

기존 TimSquad 를 "문서 기반 AI 하네스" 에서 **"Operational Truth 기반 Runtime"** 으로 점진 전환.

핵심 목표 2가지:

1. **트랜잭션 단위 정합성 유지**
2. **핵심 operational context 전달**

---

## 0.5. 3-Horizon North Star

vNext 는 단일 event/evidence runtime 구현 계획이 아니다. **모델 비종속 Operational Harness Runtime** 으로 진화하는 3단계 horizon 의 H1 단계다.

### H1 — Model-agnostic Operational Harness Runtime (현재 단계)

- 현재 난잡한 로그 시스템, 3-layer context, controller injection, 사장된 MetaIndex, 과다/저사용 skill, soft hook/protocol 의존을 정리한다.
- **스킬/훅/문서가 아니라 Runtime 이 프로세스 강제, 정보 주입, 정보 무결성을 담당**한다.
- Claude / Codex / Cursor 등 특정 모델/플랫폼에 종속되지 않는 독립 하네스가 1차 목표.
- **현재 vNext A9~A13 은 H1 하위 Operational Runtime Track 이다.**

#### H1-F0 — Kernel Grammar (Foundation 의 첫 공식 slice)

H1 의 7 축이 참조할 공통 문법. **A4 / A9 / A10 이 시작되기 전에 정의**되어야 하며, **maximum 1 RFC, 1~2일 제한, 구현 금지**.

- **TaskRuntime Process**: task 상태 전이 표 (pending → in-progress → blocked → done / failed / aborted 등).
- **Log Taxonomy**: EventLog (canonical, append-only) / Evidence (commit credential) / TaskLog (operational, scoped) / SessionLog (debug trace, NOT truth) / Generated Views (deletable / regenerable) 분리.
- **Audit Protocol**: Codex audits read-only boundary 명세 (어떤 파일/명령은 audit 가능, 어떤 것은 not).

A4 의 append-only 보호 대상은 Log Taxonomy 기준으로 분류, A9/A10 의 event/evidence schema 는 task state invariants 를 참조한다.

#### H1 의 7 축 (scope)

1. **Skill / Controller inventory & pruning** — 과다/저사용 skill 식별 + 격하 (#21 MetaIndex 격하 와 동형).
2. **Log Taxonomy 정리** — EventLog (canonical, append-only) / Evidence (commit credential) / TaskLog (operational, scoped) / SessionLog (debug trace, NOT truth) / Generated Views (deletable / regenerable) 분리.
3. **MetaIndex 격하** → ProjectMap (object metadata) + `.glog` (operational graph) + Operational Context Chain (instantiated per task/question).
4. **TaskRuntime 기본 태스크 프로세스 강제** — soft protocol 이 아니라 Runtime 이 프로세스 진입/완료 검증.
5. **Document/View separation** — source docs (canonical truth) vs generated HTML/report/wiki/markdown export (generated projection).
6. **Multi-platform adapters** — Claude Code / Codex / Cursor / OpenCode 등 어댑터 layer. Runtime API = 표준, hook/skill = adapter.
7. **Runtime enforcement** — hooks / skills are adapters. Runtime owns process gates, context injection, integrity checks.

### H2 — Harness-native Multi-session Terminal IDE (deferred)

- OpenCode, Claude Code 분석 자료, Neovim / Vim / VSCode, cmux / tmux 등을 참고한다.
- 하네스와 결합한 멀티 세션 터미널 기반 IDE.
- **H1 완료 전 구현 금지**. 리서치/후속 horizon 으로만 명시.

### H3 — Provider-agnostic LLM Execution Backend (deferred)

- 독립 LLM 모델 / 로컬 모델 / provider adapter 연결.
- **H1 runtime protocol 안정 후 착수**.

### Right-sized Gate 원칙

- Mini-RFC 와 Phase Gate 는 **목적 비례 (right-sized)** 여야 한다.
- 모든 산출물에 동일 ceremony 적용 금지 — risk 와 reversibility 에 따라 게이트 깊이 조정.
- "fast and focused on the few critical uncertainties" (Stage-Gate 5세대 권고).

---

## 1. 핵심 철학

### 기존 문제

- 문서 과다
- stale projection
- PASS/완료 claim drift
- soft protocol 의존
- agent self-report 신뢰

**결론**: 문서가 많아질수록 agent 가 stale 문서를 truth 처럼 믿음.

### 새로운 방향

- Context as Text ❌
- **Context as Operational State ✅**

즉, "LLM 이 모든 문서를 읽고 기억" 이 아니라 **"Runtime 이 현재 operational truth 를 계산 → 최소 context 만 제공"**.

---

## 2. 최종 구조

```
Canonical Truth
├─ operational-events.jsonl
├─ verified evidence artifacts
└─ source code

Supporting Sources
├─ ADR / reports / session logs
└─ authored SSOT YAML/XML/JSON
        ↓ compile / normalize
.glog
= lazy/generated operational access view
= NOT canonical truth

ProjectMap
= lightweight navigation map
        ↓
Operational State Runtime
(tsq runtime)
        ↓
Claude Code / Codex / Cursor / Antigravity
```

---

## 3. Canonical Truth 정의

### Truth

- `operational-events.jsonl`
- verified evidence
- source code

### Runtime-owned Generated Views (truth 아님)

- `.glog`
- `current-phase.json`
- `task-context.json`
- phase reports
- dashboards
- handoff

**원칙** (RFC 전체에 일관 적용):

- Canonical truth 명칭은 `operational-events.jsonl` 로 통일 (약식 `events.jsonl` 금지).
- Generated views 는 truth 가 아니며 **deletable / regenerable** 해야 함.
- Runtime 만 generated views 를 갱신 (직접 Edit/Write 금지). 갱신 방식은 invalidate → lazy regenerate.

---

## 4. Evidence Matrix

### 핵심 정의

- Evidence ≠ 테스트 결과 문서
- **Evidence = commit credential**

즉, evidence validate 통과 → event append 허가.

### 핵심 불변식

- Report = claim
- **Event = canonical truth**
- PASS/completed/closed 는 evidence 없으면 commit 불가

### 현재 상태

**Evidence v0.1 — handoff 기준 완료 보고 (repo 반영 여부 재검증 필요)**:

- handoff reported: schema / validator / 13 tests / claim drift 차단
- **repo 실측 (2026-05-22)**: `src/lib/evidence-validator.ts`, `src/lib/event-validator.ts`, 관련 unit test **부재**. 외부 RFC / 브랜치 / 별도 산출물 가능성 있음. 본 RFC 가 implementation 으로 진입하기 전 **A9 에서 수입/import + repo 내 재검증 + SSOT 등록** 단계 필수.
- 따라서 본 절에서 "완료" 라는 표현은 **handoff 기준** 이며 main repo 기준으로는 **수입/재검증 대상**.

### 확정된 구조

- Evidence = 재검증 가능한 사실
- Event = canonical transaction envelope
- `.glog` = ledger 기반 generated read model

---

## 5. Event / Transaction 모델

### 핵심 결정

**event append = 유일한 commit point**

### 흐름

```
Agent Action
  → Evidence 생성
  → validate
  → event append
  → projection invalidate
  → lazy rebuild
```

### 중요한 원칙

- projection 동시 업데이트 ❌
- **invalidate + regenerate ✅**

---

## 6. `.glog` 정의

### `.glog` 는 무엇인가

**lazy/generated operational access view**

### `.glog` 는 아닌 것

- 또 하나의 truth ❌
- 영구 저장 graph DB ❌

### `.glog` 역할

- entity → source pointers
- entity → latest relations
- entity → constraints
- entity → projections

### `.glog` 의 Operational Context Chain 관점 역할

`.glog` 는 **operational graph / relation substrate** 다. Ontology Object Model (typed objects + relations) 과 ProjectMap (object metadata) 와 결합되어, **Operational Context Chain Resolver** 가 특정 task/question 기준으로 **Operational Context Chain** 를 인스턴스화하는 base substrate 로 사용된다. `.glog` 자체는 Operational Context Chain 이 아니다.

### 중요한 원칙

`.glog` stale → regenerate 가능해야 함.

---

## 7. ProjectMap

### 역할

lightweight navigation map.

### 포함할 정보

- `path`
- `role`
- `layer`
- `key files`
- `method names`
- `related ADR`
- `dependsOn`
- `related tests`
- `risk`
- `freshness`

### 하지 말아야 할 것

- full AST cache ❌
- huge meta-index ❌
- full import graph ❌

### ProjectMap 의 Operational Context Chain 관점 역할

ProjectMap 은 Operational Context Chain 자체가 아니라 **object metadata / navigation metadata source** 다 (path / role / layer / method names / related ADR / related tests / dependsOn / risk / freshness). **Operational Context Chain Resolver** 가 ProjectMap 을 lookup 해서 source pointer 와 navigation 경로를 결정한다.

### 예시

```yaml
path: src/modules/chat
role: realtime chat module
files:
  - name: chat.service.ts
    methods:
      - sendMessage
      - getChatList
relatedADR:
  - adr:046
```

---

## 8. MetaIndex 재정의

기존 stale giant meta-index 는 **폐기/격하**.

### 새 역할

**on-demand analyzer cache**

- 평소: `grep + ProjectMap + .glog`
- 큰 refactor: ad-hoc analyzer

---

## 9. Operational State Runtime

### 역할

- state validator
- transaction gate
- projection compiler
- context provider

### Runtime 은 owner 가 아님

**Runtime = observer/validator**

#### src/ 코드 파일

- Claude/Codex Edit tool 직접 수정
- Runtime 은 관찰 / 검증 / event append / projection invalidate 만

#### Runtime-owned files (canonical truth + generated projections)

여기는 Runtime / `tsq` CLI 만 수정. 직접 Edit/Write 금지.

**Canonical truth** (append-only ledger):

- `operational-events.jsonl` — 유일한 commit point. append-only.

**Runtime-owned generated projections** (truth 아님 — invalidate → lazy regenerate 가능):

- `.glog`
- `current-phase.json`
- `task-context.json`

#### 분류 원칙 (반드시 일관 유지)

- **Canonical truth** = `operational-events.jsonl` + verified evidence artifacts + source code.
- **Runtime-owned generated views** = `.glog` + `current-phase.json` + `task-context.json` + reports + dashboards.
- Generated views 는 truth 가 아니며 **deletable / regenerable** 해야 함.

---

## 10. Runtime 계층 구조

```
ProjectRuntime
 ├─ PhaseRuntime
 │    ├─ SequenceRuntime
 │    │     ├─ TicketRuntime
 │    │     │     └─ TaskRuntime
```

### 역할

- ProjectRuntime = root coordinator
- Phase/Sequence = aggregate coordinator
- TaskRuntime = execution context

---

## 11. Runtime API / CLI

### 핵심 방향

- Hook = adapter
- **tsq CLI = 실제 공통 surface**

### 최종 최소 CLI surface (5개)

이 목록은 **vNext 가 완성됐을 때 노출되어야 할 최종 CLI surface** 다. 구현 phase 는 별도 (plan A10/A11 참조):

- A10 (Phase 1) walking skeleton 구현 대상: `tsq evidence validate`, `tsq event append`, `tsq event verify`, `tsq event tail`, `tsq task complete` (bridge)
- A11 (Phase 2) 구현 대상: `tsq context resolve`, `tsq file impact` — `.glog` / ProjectMap 위에서 의미 있음

```
tsq evidence validate
tsq event append
tsq task complete
tsq context resolve
tsq file impact
```

### 내부 동작

- validate
- append
- invalidate
- projection refresh

---

## 12. Agent 역할

### Agent 는 직접 state 수정 안 함

- ❌ edit `decisions.jsonl`
- ❌ rewrite `current-phase`
- ✅ `tsq task complete`
- ✅ `tsq evidence validate`

### Agent 역할 재정의

- LLM = worker/executor
- Runtime = transaction authority

---

## 13. Hook 모델

Hook 은 플랫폼마다 다름:

- Claude hook
- Cursor rule
- Codex wrapper

따라서:

- Hook = adapter
- **Runtime API = 진짜 표준**

---

## 14. Multi-agent

### 현재 (Phase 0~3)

advisory + file lock.

### 미래 (Phase 4)

daemon / MCP / full runtime.

---

## 15. Convention / Ubiquitous Docs

### 중요한 개념

- Convention 문서 ❌
- **Executable constraint ✅**

### 예시

```yaml
constraint: convention:service-layer
rules:
  - service must not import route layer
  - repository access via port only
```

### Runtime 연결

TaskRuntime → constrainedBy convention + ADR + PRD

---

## 16. Session Logs

Session logs 는 trace/debugging 용. **canonical truth 아님**.

```
SessionLog ≠ Truth
```

---

## 17. Metrics (나중 추가)

추천:

- waiver ratio
- evidence failure rate
- reopened tasks
- stale projection count
- repeated file touches

---

## 18. 가장 중요한 목표

이 구조의 진짜 목표:

- LLM 이 완벽하게 기억한다 ❌
- **잊어도 invalid state 가 commit 되지 못하게 한다 ✅**

즉, **Runtime = transaction gate**.

---

## 19. 향후 로드맵

### Phase 0

- append-only guard
- Evidence Matrix
- Entity ID convention

### Phase 1

- event schema
- minimal tsq CLI

### Phase 2

- `.glog` lazy view
- generated projections
- ProjectMap
- **Ontology Object Model** — Task / Decision / File / Evidence / Phase / Entity / Constraint 등 **typed objects** + relation vocabulary. Operational Context Chain 의 type system 기반.
- **ProjectMap Object Metadata** — ProjectMap 이 제공하는 **object metadata / navigation metadata** (path / role / layer / method names / related ADR / related tests / dependsOn / risk / freshness). Operational Context Chain 가 참조하는 metadata source (§7 ProjectMap 정의 보강 참조).
- **Operational Context Chain Resolver** — Ontology Object Model + `.glog` (operational graph / relation substrate) + ProjectMap (object metadata) 를 조합해 **특정 task/question 기준으로 instantiate** 하여 **Operational Context Chain** 를 만든다. Operational Context Chain = **agent input context 를 대체하는 제공 단위**. truth 가 아니라 **compiled access object / generated projection** (deletable / regenerable).
- **Knowledge Export Compatibility** — Operational Context Chain 를 Obsidian / LLM wiki / markdown 으로 흡수 가능하게 export. **export 결과물도 generated projection 이며 truth 가 아니다**. Canonical truth = `operational-events.jsonl` + verified evidence + source code 유지.

### Phase 3

- capability boundary
- runtime orchestration 강화

### Phase 4

- daemon
- MCP
- cross-platform runtime

---

## 20. 최종 한 줄

> TimSquad vNext 는 "더 많은 문서를 읽는 하네스" 가 아니라,
> Evidence 기반 event commit 과 lazy projection 재생성으로 stale truth 를 막는
> **Operational State Runtime** 방향으로 진화 중이다.

---

## 부록 A — 기존 자산과의 매핑

| vNext 개념 | 기존 자산 | 처리 방향 |
|---|---|---|
| operational-events.jsonl | `decisions.jsonl` | 마이그레이션 (D9 dual schema) |
| Evidence Matrix | (신규) — v0.1 완료 | v0.2 (#57 §7.1) 로 확장 |
| `.glog` | (신규) | Phase 2 신설 |
| ProjectMap | meta-index 일부 | meta-index 격하 후 신설 |
| MetaIndex | `src/lib/meta-index.ts` + `src/daemon/meta-cache.ts` | **격하** — on-demand analyzer cache 로 |
| Operational State Runtime | `src/daemon/` | 확장 (observer 모드) |
| tsq CLI 5개 | `tsq next`, `tsq status` 등 10개 | 신설 5개 추가 (`evidence/event/task/context/file`) |
| Hook adapter | `templates/platforms/claude-code/scripts/` 16개 | 그대로 유지, runtime CLI 호출 추가 |
| Convention executable | (신규) | Phase 3 |

## 부록 B — 관련 문서

- 본 RFC: `docs/rfc/vnext-operational-state-runtime.md` (이 파일)
- 상위 plan: [docs/improvement-plan-2026-05-22.md](../improvement-plan-2026-05-22.md)
- 원본 이슈 리포트: [docs/issue-report-2026-05-22.md](../issue-report-2026-05-22.md)
- 원본 GitHub 이슈: [#56](https://github.com/sonature-lab/timsquad/issues/56), [#57](https://github.com/sonature-lab/timsquad/issues/57)
- 관련 인시던트: [#50](https://github.com/sonature-lab/timsquad/issues/50), [#55](https://github.com/sonature-lab/timsquad/issues/55)

## 부록 C — 다음 액션

본 RFC 채택 시:

1. `docs/improvement-plan-2026-05-22.md` 의 A9, A10 을 §19 5-Phase 로드맵에 매핑하여 재작성. (완료)
2. `docs/rfc/vnext-evidence-event-schema.md` 신설 — §4, §5 의 schema/validator 명세.
3. `docs/rfc/vnext-runtime-cli.md` 신설 — §11 의 5개 CLI 인터페이스 명세.
4. memory/vnext-direction.md 신설 — 다음 세션 참조용 핵심 요약. (완료)

---

*Document captured from handoff dialog on 2026-05-22. 핸드오프 원본 발화 그대로 구조화. 향후 §4, §5, §11 은 별도 RFC 로 detail 분리 권고.*

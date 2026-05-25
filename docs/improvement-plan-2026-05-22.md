---
title: TimSquad 이슈 개선 계획 (2026-05-22 기반)
generated: 2026-05-22
source_report: docs/issue-report-2026-05-22.md
scope: 30 OPEN issues → 13 actions across 4 phases
total_effort: 6~11 weeks (1인 풀타임 기준)
---

# TimSquad 이슈 개선 계획 (2026-05-22 기반)

## ⚓ Prime Directive (변하지 않는 anchor)

```
No Evidence, No Commit.
Generated Views Are Never Truth.

Goal:
LLM 이 완벽히 기억하게 만드는 것이 아니라,
증거 없는 operational state 변경이 commit 되지 못하게 만든다.

Canonical Truth:
- operational-events.jsonl
- verified evidence artifacts
- source code

Generated Views (deletable / regenerable):
- .glog
- current-phase.json
- task-context.json
- reports
- dashboards
- handoff
```

## 📜 본 문서의 status (중요)

- **A1~A8 (Phase 0/1)**: 확정 실행 계획. 즉시 착수 가능.
- **A9~A13 (vNext 5-Phase)**: **roadmap hypotheses, NOT implementation commitments**. 각 phase 시작 전에 fresh **Mini-RFC** ([docs/rfc/_mini-rfc-template.md](docs/rfc/_mini-rfc-template.md)) 작성 + 직전 phase **dogfood Exit Criteria** 충족 필수.
- **A14~A16 (Methodology)**: A10 이후 hypotheses. 위와 동일 게이트 적용.
- **No phase may start only because it appears in this roadmap**.

## 🔍 Prime Directive Check (모든 신규 산출물에 적용)

모든 신규 코드/문서/스크립트는 아래 6 질문을 통과해야 한다. 하나라도 "yes" 면 reject 또는 scope 축소.

1. Does this create a new truth source? → **reject if yes**
2. Can this artifact be deleted and regenerated? → **if no, it is not a projection**
3. Can PASS/completed be claimed without evidence? → **reject if yes**
4. Does this rely on agent self-report? → **add validator if yes**
5. Does this make hooks the standard instead of adapter? → **reject if yes** *(check at phase exit, not entry)*
6. Does this require future MCP/daemon to be useful? → **shrink scope if yes**

## 🎭 Execution Model (Phase-gated, 3-role)

```
Claude Code implements.   — slice 단위 PR/commit
Codex audits read-only.   — Prime Directive Check + Exit Criteria 진척도 + dogfood KPI event 확인. 코드/문서 수정 권한 없음.
User decides              — phase promotion 또는 kill criteria 발동 시점에만
```

User 는 작업 진행 중 사소한 확인 요청을 받지 않는다. 의사결정은 **phase 경계** (promotion / kill) 에서만.

---

## 🧭 North Star Alignment (3-Horizon)

본 plan 의 16 액션은 모두 **H1 (Model-agnostic Operational Harness Runtime)** 의 하위 트랙이다. H2 / H3 는 deferred horizon 이며 본 plan 의 critical path 에 포함되지 않는다.

### Horizon 매핑

| Horizon | 정의 | 본 plan 과의 관계 |
|---------|------|------------------|
| **H1 — Model-agnostic Operational Harness Runtime** | Skill/Controller pruning + Log Taxonomy + MetaIndex 격하 + TaskRuntime 강제 + Document/View separation + Multi-platform adapters + Runtime enforcement (RFC §0.5 참조) | **현재 단계**. A1~A16 전체가 H1 하위 트랙 |
| **H2 — Harness-native Multi-session Terminal IDE** | OpenCode / cmux / tmux 류 하네스 결합 터미널 IDE | **deferred**. H1 완료 전 구현 금지, 리서치만 |
| **H3 — Provider-agnostic LLM Execution Backend** | 독립 LLM / 로컬 모델 / provider adapter | **deferred**. H1 runtime protocol 안정 후 착수 |

### 액션 → H1 트랙 매핑

| H1 트랙 | 액션 | 비고 |
|---------|------|------|
| **H1-F0 — Kernel Grammar** | (slice, 액션 외) | **H1 Foundation 의 첫 공식 slice**. TaskRuntime Process (task 상태 전이 표) + Log Taxonomy (EventLog / Evidence / TaskLog / SessionLog / Generated Views) + Audit Protocol (Codex audits read-only boundary). **A4 / A9 / A10 이 참조할 공통 문법** 을 먼저 정의. **구현 금지, 최대 1 RFC, 1~2일 제한**. A4 / A9 / A10 에 필요한 불변식만 정의 |
| **H1 stabilization / cleanup** | A1, A2, A3, A5, A6, A7, A8 | 현재 하네스 사고 줄이는 즉시 조치. **H1-F0 의 Log Taxonomy 기준으로 자료 분류** |
| **H1 critical protection slice** | **A4** (#50 append-only-guard) | **단독 critical slice — Wave 1 부속 작업 때문에 지연 금지**. 데이터 손실 risk 노출 기간 최소화. **H1-F0 Log Taxonomy 기준으로 append-only 보호 대상 분류** |
| **H1 Operational Runtime Track** | A9, A10, A11, A12, A13 | event/evidence core → lazy views → capability boundary → daemon/MCP. 각 phase Mini-RFC + Exit Criteria 필수. **A9/A10 의 event/evidence schema 가 H1-F0 의 task state invariants 를 참조** |
| **H1 methodology support** | A14, A15, A16 | Tiered Spec-First / Convergence Score / Hot-fix mode |

### Right-sized Gate 원칙

- Mini-RFC 와 Phase Gate 는 **목적 비례 (right-sized)** 여야 한다.
- 모든 산출물에 동일 ceremony 적용 금지 — risk 와 reversibility 에 따라 게이트 깊이 조정.
- "fast and focused on the few critical uncertainties" (Stage-Gate 5세대 권고).
- Mini-RFC 누적이 1주 초과 시 ceremony 가 가치 압도 신호 → 즉시 검토.

---

## 🔗 Issue Resolution and vNext Integration (Single Track)

**vNext 는 별도 rewrite 트랙이 아니다.** Open issue 해소는 Operational State Runtime 의 씨앗을 심는 방식으로 진행한다.

### 액션 분류 매트릭스

| 구분 | 액션 | 역할 |
|---|---|---|
| **Stabilization** | A1, A2, A3 | 문서/이슈/고아 파일 drift 정리 — Prime Directive 의 SSOT 위생 |
| **Runtime Seed** | A4 | append-only 보호 — #50 해결 + vNext Phase 0 의 첫 단추 |
| **Stabilization** | A5, A6, A7, A8 | 기존 하네스 trigger/gate/parser 안정화 — #24/#35/#37/#49 해소, 동시에 "evidence 없는 PASS 차단" 의 전(前) 단계 |
| **Runtime Seed** | A9, A10 | evidence/event core — #56/#57 의 첫 구현 |
| **Conditional Runtime** | A11, A12, A13 | dogfood 후 조건부 진행 (Mini-RFC + Exit Criteria 필수) |
| **Methodology** | A14, A15, A16 | testing / process / convergence — Runtime 본류 후순위 |

### 4 규칙

1. **Critical field issues 우선** — #50, #24, #35, #37, #49 가 future runtime feature 보다 priority. 사람이 다치는 곳부터.
2. **Prime Directive Check 모든 issue fix 에 적용** — state / completion / gate / projection 을 건드리는 fix 는 6 questions 통과 필수.
3. **새 persistent artifact 분류 의무** — issue fix 가 새 파일/state 를 만들면, canonical truth / generated projection / supporting source 중 어디에 속하는지 명시. 분류 없는 새 artifact = reject.
4. **Stabilization may ship before full vNext** — but must not create another source of truth. Runtime work beyond A10 requires dogfood evidence from issue-resolution work.

### 추천 순서 (의존성 그래프 위에 priority overlay)

```
0. H1-F0  (Kernel Grammar — TaskRuntime Process + Log Taxonomy + Audit Protocol, 1 RFC / 1~2일)
1. A1~A3 / Wave 0 S3, S4  (cleanup + Mini-RFC scaffolder + issue audit, 병렬)
2. A4     (#50, Runtime Seed — H1-F0 Log Taxonomy 기준 보호 대상 분류)
3. A5+A8  (#24/#35/#37/#49 — gate/trigger 강제력)
4. A7     (parser 안정화, #36/#47)
5. A9+A10 (evidence/event MVP — H1-F0 task state invariants 참조)
6. A6     (architect/qa write, 작아서 어디든)
7. A14+A16 (methodology, conditional)
8. A11+   (dogfood Exit Criteria 통과 시에만)
```

### 핵심 한 줄

```
Issue fixes stabilize today.
vNext principles prevent the same class of issue tomorrow.
```

---

## 🤖 Automation Layer (Cross-cutting Matrix)

> 본 섹션은 액션 A1~A16 본문을 **변경하지 않는다**. 자동화 / 템플릿화 / 모듈화 가능 영역을 cross-cut 으로 식별. 모든 항목은 **candidate** 이며 **roadmap hypotheses, NOT implementation commitments**. 각 wave 시작 전에 **Mini-RFC before implementation** 필수.

### Automation Catalog (10 candidates)

| # | Candidate | 대상 액션 | 산출물 후보 | 상태 |
|---|-----------|----------|-----------|------|
| 1 | **Prime Directive Lint** | 모든 신규 PR | (hypothesis) `scripts/prime-directive-lint.sh` + pre-commit hook | requires Mini-RFC |
| 2 | **`/inspect` skill extension** | A2, A3, A16 | (hypothesis) 기존 `tsq-inspect` 에 drift rule 추가 | requires Mini-RFC |
| 3 | **append-only-guard.sh** | A4 | (master plan A4 본문 참조) hook + SSOT yaml | A4 본문에 명세됨 |
| 4 | **Mini-RFC scaffolder** | 모든 vNext phase | (hypothesis) `tsq rfc new <phase>` CLI | requires Mini-RFC |
| 5 | **dogfood KPI measurement** | M3~M6 Exit Criteria | (hypothesis) `scripts/measure-dogfood.sh` | requires Mini-RFC |
| 6 | **Exit Criteria verifier** | M1~M8 | (hypothesis) `tsq phase verify <phase>` | requires Mini-RFC |
| 7 | **issue audit / close assistant** | A1 (#21, #31) | (hypothesis) `scripts/audit-issues.sh` (gh CLI + grep 기반 evidence) | requires Mini-RFC |
| 8 | **Hook chain dispatcher** | A4, A5, A6 (latency 병목 완화) | (hypothesis) `scripts/hook-dispatcher.sh` | requires Mini-RFC |
| 9 | **schema migrate** | A10, A11 (dual-write) | (hypothesis) `scripts/migrate-event-schema.sh` | requires Mini-RFC |
| 10 | **redaction filter** | A4, A10 (secrets/PII) | (hypothesis) `src/lib/redaction.ts` | requires Mini-RFC |

### Templates Catalog (7 candidates)

| # | Template | 위치 후보 | 용도 | 상태 |
|---|---------|----------|------|------|
| T1 | **Mini-RFC** | `docs/rfc/_mini-rfc-template.md` | phase 시작 전 | ✅ 작성 완료 (직전 작업) |
| T2 | **Evidence Producer** | (hypothesis) `templates/base/evidence/{type}.template.json` | CI/test/build/manual 별 schema | requires Mini-RFC |
| T3 | **Hook** | (hypothesis) `templates/base/hooks/{event}.template.sh` | stdin JSON 처리 boilerplate | requires Mini-RFC |
| T4 | **Skill** | (hypothesis) `templates/base/skills/_template.md` | 새 tsq-* 스킬 추가 시 | requires Mini-RFC |
| T5 | **Incident Report** | (hypothesis) `templates/base/incidents/_template.md` | #50 같은 사고 발생 시 형식 보장 | requires Mini-RFC |
| T6 | **Phase Exit Report** | (hypothesis) `templates/base/phase-exit/_template.md` | M1~M8 promotion 시점 | requires Mini-RFC |
| T7 | **Decision ADR** | (hypothesis) `templates/base/decisions/_template.md` | event ledger entry 의 markdown form | requires Mini-RFC |

### Modules Catalog (7 candidates)

| # | Module | Interface | 구현 후보 | 상태 |
|---|--------|-----------|----------|------|
| M1 | **EventStore** | `append / read / tail / snapshot` | jsonl (dev) / SQLite (single-user) / Postgres (multi) | requires Mini-RFC (Agent R8) |
| M2 | **EvidenceProducer** | `kind: ci\|test\|build\|manual` + validator | per-type 별 검증 모듈 | requires Mini-RFC (Agent R4) |
| M3 | **ProjectionGenerator** | `invalidate / regenerate` | `.glog` / `current-phase` / `task-context` 별 | requires Mini-RFC |
| M4 | **PlatformAdapter** | `hook / cli / mcp` 추상 | Claude / Cursor / Codex / MCP | requires Mini-RFC (A13 deferred) |
| M5 | **PolicyChecker** | Convention validator | dependency-cruiser / ts-morph / eslint wrapper | requires Mini-RFC (Agent R6) |
| M6 | **HookDispatcher** | sub-check 등록 / 실행 / 순서 | in-process serial / parallel | requires Mini-RFC |
| M7 | **Redactor** | `redact(artifact)` | secrets / PII / JWT pattern | requires Mini-RFC (Agent §7) |

### Prime Directive 정합 / 충돌

| 원칙 | 자동화에 적용되는 방식 |
|------|----------------------|
| Automation is **not a new truth source** | 모든 자동화 산출물은 **evidence artifact / generated projection / supporting source** 중 하나로 classified. 분류 없는 산출물 = reject |
| **Hook is adapter** | Policy 는 SSOT yaml / CLI / runtime 에 거주. hook 안에 policy 박으면 reject |
| **Dogfood measurement output must be evidence artifact, not truth** | `measure-dogfood.sh` 결과 = evidence (validator 적용 대상), 자체 truth 아님 |
| **Automation items are roadmap hypotheses, not implementation commitments** | 모든 catalog 항목은 candidate. 시점이 와도 implementation 전에 Mini-RFC |
| **Each automation wave requires Mini-RFC before implementation** | Wave 0/1/2/3 각각 별도 Mini-RFC. wave 들 사이에 dogfood 검증 누적 |

### Automation Waves (hypothesis sequence)

| Wave | 시점 | Candidates | 목적 |
|------|------|-----------|------|
| **Wave 0** | A1~A3 와 병렬 | Prime Directive Lint (#1), `/inspect` extension (#2), Mini-RFC scaffolder (#4), issue audit (#7, if repo-evidence based) | 메타 자동화 — 이후 모든 작업의 drift 차단 |
| **Wave 1** | A4 와 동시 | append-only-guard (#3), Hook template (T3), Incident Report template (T5), Redaction filter RFC (M7) | 데이터 손실 차단 + 사고 대응 형식 보장 |
| **Wave 2** | A9 / A10 와 동시 (Runtime Seed) | dogfood KPI (#5), Exit Criteria verifier (#6), Hook chain dispatcher (#8), schema migrate (#9), EventStore (M1), EvidenceProducer (M2) | runtime walking skeleton 측정 + 백엔드 추상 |
| **Wave 3** | A11 이후 조건부 | ProjectionGenerator (M3), PolicyChecker (M5), PlatformAdapter (M4) | Lazy views + cross-platform |

Wave 사이 promotion 은 직전 wave 의 dogfood evidence 누적이 전제.

### Over-engineering 경고

- **Do not build automation before the phase that needs it.** Wave 0 외에는 사전 구현 금지.
- **Automation must not become convenient truth.** 자동 측정값이 곧 PASS 가 되면 self-report 의 새 형태.
- **`/inspect` reports are claims unless backed by events/evidence.** 정기 검사 결과 자체도 evidence/event 화 필요.
- **Generated automation outputs must be classified** (canonical truth / generated projection / supporting source). 분류 없는 산출물 = 새 truth source 위험.
- **Hook implementations are adapters.** Policy 를 hook 안에 박지 마라 — SSOT yaml / CLI / runtime 에 거주.

---

## Executive Summary

- **총 16개 액션** — Phase 0/1 (8) + vNext 5-Phase 로드맵 (5) + Methodology (3). [issue-report](docs/issue-report-2026-05-22.md) §10 기반 + vNext 핸드오프 (2026-05-22) 반영.
- **추정 공수**: 단기 (A1~A8) 약 **3주** / vNext 풀 로드맵 (A9~A13) 약 **3~4개월** / Methodology (A14~A16) 추가 **1~2주**.
- **vNext 방향성 SSOT**: [docs/rfc/vnext-operational-state-runtime.md](docs/rfc/vnext-operational-state-runtime.md). 핵심 원칙 — **Runtime = observer/validator (NOT owner)**, Evidence = commit credential, event append = 유일한 commit point.
- **3대 줄기**:
  1. **Phase 0 (즉시)** — 메모리/문서 정합성 회복 + critical hook 1건 (A1~A4). **A4 (append-only-guard)는 vNext Phase 0 의 첫 단추**.
  2. **Phase 1 (단기, 1~2주)** — Hook 강제력 확장 + 파서/권한 버그 (A5~A8).
  3. **vNext 5-Phase 로드맵 (중장기)** — Operational State Runtime 전환 (A9~A13).
  4. **Methodology Phase (장기)** — Tier/Convergence/Process (A14~A16).
- **의존성 요지**: A1·A4가 다른 작업의 정합성 베이스. A5(trigger chain hook)는 A6·A7·A8의 토대. **vNext A10 (event schema + CLI)이 이후 A11~A13의 토대**. MetaIndex (#21)는 vNext Phase 2 에서 **격하 예정** (ProjectMap 으로 대체).
- **중요 검증 결과**: 메모리상 "완료"로 표시된 #21은 **실제로 코드상 적용 완료** 확인 ([src/daemon/index.ts:96](src/daemon/index.ts#L96) `metaCache.load()`, [:234](src/daemon/index.ts#L234) `metaCache.updateFiles(paths)`, [src/daemon/meta-cache.ts:181](src/daemon/meta-cache.ts#L181) `updateFiles()`). → A1은 close 진행 가능. 다만 vNext §8 에 따라 향후 격하 대상임을 코멘트에 명시.

---

## Phase 0 — 즉시 (이번 주, 4개 액션)

---

### A1. #21 / #31 Close 처리 — 메모리·이슈 정합성 회복

1. **이슈 번호 및 제목**: [#21](https://github.com/sonature-lab/timsquad/issues/21) (Meta Index 스킬 레이어 연결) / [#31](https://github.com/sonature-lab/timsquad/issues/31) (보완계획 #4~#7 완료)
2. **목표 (Outcome)**: GitHub OPEN 30 → 28건. 메모리("완료")와 이슈 상태의 drift 제거. 후속 코멘트로 실증 근거(파일:라인) 남김.
3. **현재 상태 진단** (실증 확인 완료):
   - [src/daemon/index.ts:17](src/daemon/index.ts#L17) `import { MetaCache }` / `:92` 인스턴스 / `:96` `await metaCache.load()` / `:234` `metaCache.updateFiles(paths)` / `:303` `flushToDisk()` — 주석 해제 완료.
   - [src/daemon/meta-cache.ts:35](src/daemon/meta-cache.ts#L35) `class MetaCache` + `:181 updateFiles(changedPaths: string[]): void` — dirty 추적/증분 업데이트 구현 존재.
   - [src/lib/workflow-state.ts:22](src/lib/workflow-state.ts#L22) `completed_tasks: TrackedTask[]` — Wave 디스패치 구조 존재. 별도 `--wave` 옵션은 [src/commands/next.ts:40](src/commands/next.ts#L40)에 등록.
   - #31 산하 4건 중 #4·#5·#7 = 구조적으로 코드 존재 확인. #6 (Script 자동화 6개 bash) = [templates/platforms/claude-code/scripts/](templates/platforms/claude-code/scripts/) 16개 파일 중 6개 fail-open 등록 (settings.json 기준).
4. **변경 대상 파일**: (코드 변경 없음) GitHub 이슈 #21, #31 코멘트 + Close.
5. **구현 단계**:
   1. #21 코멘트 작성 — 근거 파일/라인 인용 (`src/daemon/index.ts:96, :234`; `src/daemon/meta-cache.ts:181`).
   2. #31 코멘트 작성 — #4~#7 각각 근거 (next.ts wave 옵션, MetaCache, scripts 디렉토리 항목).
   3. `gh issue close 21 31` 실행.
   4. MEMORY.md 또는 `docs/improvement-plan-*` 에 "Close 완료" 기록.
6. **검증 방법**: `gh issue list --state open --repo sonature-lab/timsquad | grep -E "^#?(21|31)\b"` → 빈 출력. `gh issue view 21 --json state` = CLOSED.
7. **의존성**: 없음 (선행 가능).
8. **리스크/트레이드오프**: 메모리상 "완료"지만 실제 사용/테스트 부재 시 재오픈 위험 → **완화**: 코멘트에 vitest 테스트 ID(`tests/unit/meta-cache.test.ts`) 인용.
9. **공수**: **S (1~2시간)**.

---

### A2. #32 — 경쟁분석 문서 Drift 수정

1. **이슈 번호 및 제목**: [#32](https://github.com/sonature-lab/timsquad/issues/32) — docs: 경쟁분석 문서 수치 Drift
2. **목표**: [docs/competitive-analysis-2026-03.md](docs/competitive-analysis-2026-03.md) 4개 항목 정정 → MEMORY.md / [docs/inspect-report-2026-03-19.md](docs/inspect-report-2026-03-19.md) 일치.
3. **현재 상태 진단**:
   - `competitive-analysis-2026-03.md:97` "37개 `tsq-*`" — `templates/base/skills/` 실측 37개와 일치하나, tsq-daemon 표기 여부 확인 필요.
   - `:108` "Hook: 13개 (Fail-closed 7 + Fail-open 6)" — 이미 정정된 듯하나 inspect-report L108 "14개 (7+7)" 와 본문 L108 "13개 (7+6)" 가 혼재. 본문 추가 정정 필요.
   - `:145` "5개 hook Fail-closed" / `:151` 동일 (vs 섹션 2-5 7개) — 내부 일관성 깨짐.
   - `:600`, `:684`, `:733` "34개 소프트 → 코드 강제" / `:359` "34개 enforcement gap" — `~20개 전환 완료` 표현으로 정정 필요.
4. **변경 대상 파일**: [docs/competitive-analysis-2026-03.md](docs/competitive-analysis-2026-03.md) (단일).
5. **구현 단계**:
   1. 4건 drift 일괄 정정 (`Edit` 4회) — 정확한 줄 위치는 위 진단 참조.
   2. 변경 직후 `npm run test -- inspect` 또는 `/tsq-inspect` 스킬로 재검증.
   3. [docs/inspect-report-2026-03-19.md](docs/inspect-report-2026-03-19.md) §4 표에 "RESOLVED" 마크 추가.
   4. PR/커밋 메시지: `docs: fix drift in competitive-analysis-2026-03 (DRIFT-01,02,06,12)`.
6. **검증 방법**: `grep -nE "37개|13개|7\\+6|5개 Fail-closed|34개 소프트" docs/competitive-analysis-2026-03.md` → 정정 후 패턴 확인. 가능하면 `/tsq-inspect` 재실행하여 DRIFT-01/02/06/12 카운트 0.
7. **의존성**: 없음. A1과 병렬 가능.
8. **리스크**: 문서만 수정. 영향 없음.
9. **공수**: **S (반나절 미만)**.

---

### A3. #33 — 고아 스크립트 정리

1. **이슈 번호 및 제목**: [#33](https://github.com/sonature-lab/timsquad/issues/33) — chore: 고아 스크립트 정리 (`e2e-commit-gate.sh`, `e2e-marker.sh`)
2. **목표**: [templates/platforms/claude-code/scripts/](templates/platforms/claude-code/scripts/) 디렉토리에서 미사용 스크립트 제거 또는 `settings.json` 등록. 의도 모호 시 결정 기록 (decisions.jsonl).
3. **현재 상태 진단**:
   - 두 파일 존재 확인.
   - `templates/platforms/claude-code/settings.json` 미참조 (전체에 `e2e-` 없음).
   - 다른 스크립트 source 호출 여부 확인 필요 → `grep -rn "e2e-commit-gate\|e2e-marker" templates/ src/` 0건 시 고아 확정.
4. **변경 대상 파일**:
   - 옵션 A (삭제): `templates/platforms/claude-code/scripts/e2e-commit-gate.sh`, `e2e-marker.sh`.
   - 옵션 B (등록): `templates/platforms/claude-code/settings.json` `PreToolUse|Stop` hooks.
5. **구현 단계**:
   1. `grep -rn "e2e-commit-gate\|e2e-marker" .` 로 호출처 0 확인.
   2. 의사 결정: `decisions.jsonl` 에 "DEL-E2E-MARKER" 기록 (#37과 향후 통합 가능성 명시).
   3. 파일 삭제 (`git rm`) — 의도가 #37 (E2E Gate)과 겹치면 별도 PR 코멘트에 "future merge with #37" 메모.
   4. `npm run test`, `tsc` 그린 확인.
6. **검증 방법**: `/tsq-inspect` 재실행 → "고아 스크립트 0건" PASS.
7. **의존성**: A8 (#37 E2E Gate) 보다 선행. A8에서 E2E 스크립트 신규 생성 시 동일 네이밍 회피.
8. **리스크**: 향후 #37 작업자가 같은 이름 재발명 → **완화**: decision 로그에 "Deleted on YYYY-MM-DD; if reintroducing E2E gate via #37, see issue-report §3.#37" 명시.
9. **공수**: **S (30분)**.

---

### A4. #50 F2 — `append-only-guard.sh` PreToolUse Hook 우선 구현

1. **이슈 번호 및 제목**: [#50](https://github.com/sonature-lab/timsquad/issues/50) — Append-only state files vulnerable to Write overwrite (CRITICAL, data loss)
2. **목표**: `Write` **와 `Edit` 둘 다 기본 차단**. `decisions.jsonl`, `phase-memory.md`, `operational-events.jsonl` 등 append-only 파일에 대해 hook 이 **fail-closed**. 허용 경로는 `tsq event append` / `tsq evidence validate` 같은 runtime command (vNext 우선) — legacy 임시 운영에서는 안전한 append-only shell (`cat >> file <<EOF`) 만 낮은 우선순위로 허용. **이유**: Edit 도 기존 라인 수정/삭제로 #50 인시던트 재현 가능. 이번 액션은 F1~F5 중 **F2 만** 1차 구현 (나머지는 후속).
3. **현재 상태 진단**:
   - `templates/platforms/claude-code/scripts/` 에 append-only 보호 hook 부재.
   - `settings.json` PreToolUse matcher `Write|Edit` 에 5개 hook 등록 — 신규 hook 추가 위치 확정.
4. **변경 대상 파일**:
   - 신규: `templates/platforms/claude-code/scripts/append-only-guard.sh`.
   - 수정: `templates/platforms/claude-code/settings.json` (PreToolUse 배열에 추가).
   - 신규: `tests/unit/hooks/append-only-guard.test.ts` (또는 bats 스타일).
   - 문서: `docs/hook-execution-order.md` 갱신.
5. **구현 단계**:
   1. Append-only 파일 목록 SSOT 정의 — `templates/base/knowledge/critical-state-files.yaml` 신설 (`decisions.jsonl`, `phase-memory.md`, `operational-events.jsonl`, `trails/**/*-memory.md`, `logs/**/*.jsonl`).
   2. `append-only-guard.sh` 작성 — stdin JSON → `tool_input.file_path` 추출 → SSOT yaml 과 매칭 → **`Write` / `Edit` 둘 다** `{"decision":"block","reason":"..."}` 반환. 허용 경로 = (a) `tsq event append` / `tsq evidence validate` 등 runtime CLI 발신, (b) `Bash` 의 안전한 append-only 패턴 (`cat >> file`, `tee -a`) 만 fallback 으로 통과.
   3. `settings.json` PreToolUse `Write|Edit` matcher 에 hook 등록 (timeout 3).
   4. 테스트: 모킹된 stdin 으로 (a) Write 차단 (b) Edit 차단 (c) `tsq event append` 통과 (d) `cat >> file` Bash 통과 케이스.
   5. CHANGELOG 항목 + CLAUDE.md "Critical State Files" 섹션 추가 (#50 F5 부분 선행).
6. **검증 방법**:
   - 단위: `vitest run tests/unit/hooks/append-only-guard.test.ts` 그린.
   - 통합: 더미 프로젝트에서 `echo '{"tool_name":"Write","tool_input":{"file_path":".timsquad/state/decisions.jsonl"}}' | bash templates/platforms/claude-code/scripts/append-only-guard.sh` → `decision: block` JSON.
   - Field 검증: 새 프로젝트 `tsq init` → 의도적 Write 시도 → 차단 메시지 확인.
7. **의존성**: A1·A2·A3 와 병렬 가능. **A5 (trigger chain hook) 의 hook 추가 패턴 선례**가 됨.
8. **리스크/트레이드오프**:
   - 차단 너무 강하면 `tsq` CLI 자체 append 동작도 막힐 위험 → **완화**: runtime CLI 발신은 SSOT allowlist 로 통과 (caller 식별 가능 시 `tsq event append` 통과). Bash 의 안전한 append-only 패턴 (`>>`, `tee -a`) 만 fallback 통과, `>` 단일 redirect 는 차단.
   - 사용자 워크플로우 변경 (Write/Edit 모두 차단) → **완화**: 에러 메시지에 `tsq event append` (우선) 또는 `cat >> file <<EOF` (legacy) 가이드 인라인 포함.
9. **공수**: **M (1~2일)** — hook 1개 + SSOT yaml + 테스트 + 문서.

---

## Phase 1 — 단기 (1~2주, 4개 액션)

---

### A5. #24 — Trigger Chain Hook 강제 (Librarian/Phase Gate 미발동 해결)

1. **이슈 번호 및 제목**: [#24](https://github.com/sonature-lab/timsquad/issues/24) — Controller trigger chain not enforced. ([#34](https://github.com/sonature-lab/timsquad/issues/34), [#49](https://github.com/sonature-lab/timsquad/issues/49) 동시 해결 의도)
2. **목표**: Phase 마지막 task 완료 시점에 **SubagentStop hook 또는 completion-guard 확장**이 (a) Phase Gate 트리거, (b) workflow.json sequence 상태 전파, (c) Librarian 호출을 자동 실행.
3. **현재 상태 진단**:
   - `templates/platforms/claude-code/scripts/subagent-stop.sh` — `tsq next --complete <taskId>` 만 호출. Task 종료 처리는 되나 **시퀀스/Phase 전파 누락** (#49 원인).
   - [templates/base/skills/tsq-controller/SKILL.md:36](templates/base/skills/tsq-controller/SKILL.md#L36) "Step 9 Meta Index 쿼리" 등 Step 14까지 존재하지만, **Phase 완료 감지 + Librarian 호출은 컨트롤러 텍스트로만** 명시 (soft).
   - `templates/base/skills/tsq-quick/SKILL.md` Step 8 = "workflow.json 갱신" 뿐. Phase 완료 감지 부재 (#34 원인).
4. **변경 대상 파일**:
   - 수정: `templates/platforms/claude-code/scripts/subagent-stop.sh` — `tsq next --phase-status` 호출 추가, `phase_complete: true` 시 phase-gate trigger.
   - 신규: `templates/platforms/claude-code/scripts/phase-gate-trigger.sh` (또는 기존 `phase-guard.sh`에 trigger 모드 추가).
   - 수정: [src/lib/workflow-state.ts](src/lib/workflow-state.ts) — task 완료 시 sequence/phase cascade 함수 추가 (`propagateCompletion(taskId)`).
   - 수정: [src/commands/next.ts:126](src/commands/next.ts#L126) `handleCompleteTask` — propagateCompletion 호출 후 `logs/phases/P{N}.md` 자동 생성 트리거.
   - 수정: `templates/base/skills/tsq-quick/SKILL.md` — Step 8 뒤에 "Step 9: Phase 완료 감지 → Gate 안내" 추가 (soft fallback, 하드는 hook).
5. **구현 단계**:
   1. `workflow-state.ts` 단위 테스트 추가 (시퀀스 6개 모두 완료 시 phase status 전이).
   2. `propagateCompletion()` 구현 — task → sequence(completed_tasks 모두 채워지면 `status:done`) → phase(sequences 모두 done & wave 종료).
   3. `next.ts handleCompleteTask` 에서 호출 + `logs/phases/P{N}.md` 자동 생성 (templates/base의 마크다운 템플릿 사용).
   4. `subagent-stop.sh` 에 phase-status JSON 분기 — `.phase_complete == true` 일 때 phase-gate-trigger.sh 호출.
   5. phase-gate-trigger.sh — Librarian agent 호출 명령을 stderr/systemMessage 로 emit (Claude Code가 자동 위임할 수 있도록 protocol에 맞춰 메시지 구성).
   6. `tsq-quick` SKILL.md Step 8 보강 (soft 안내 — hook 미동작 환경 대비).
6. **검증 방법**:
   - 단위: `tests/unit/workflow-state.propagation.test.ts` (신규) — 6 sequences × 3 tasks 시뮬레이션.
   - 통합: rallyup 또는 dummy 프로젝트에서 마지막 task 완료 → workflow.json `current_phase` 자동 전이 + `logs/phases/P{N}.md` 생성 확인.
   - Field: #24 본문의 "logs/phases/ 0건" 재현 환경에서 실행 후 1건 생성 확인.
7. **의존성**: A4 (hook 패턴 선례) 권장 선행. **A6/A7과 병렬 가능**.
8. **리스크/트레이드오프**:
   - 자동 Librarian 호출이 사용자 의도 없이 발동 → 토큰 비용 증가. **완화**: `config.yaml` 의 `controller.auto_librarian: true|false` 토글, 기본 `true`.
   - hook timeout 3초 내에 `tsq next --phase-status` 완료 보장 필요 → **완화**: lite mode 캐시 활용 (#43 해결과 묶음).
9. **공수**: **L (3~4일)** — 코드 + 스크립트 + 테스트 + 문서.

---

### A6. #52 — architect/qa Agent Write 권한 부여 (Option A)

1. **이슈 번호 및 제목**: [#52](https://github.com/sonature-lab/timsquad/issues/52) — Research agents (architect, qa) cannot save report files.
2. **목표**: `tsq-architect`, `tsq-qa` 가 `reports/`, `logs/` 만 Write 가능. 토큰 낭비(~10K/리포트) 제거.
3. **현재 상태 진단**:
   - [templates/base/agents/base/tsq-architect.md:7](templates/base/agents/base/tsq-architect.md#L7) `tools: [Read, Bash, Grep, Glob]` (Write 없음).
   - [templates/base/agents/base/tsq-qa.md:8](templates/base/agents/base/tsq-qa.md#L8) 동일.
   - [templates/base/agents/base/tsq-dba.md:7](templates/base/agents/base/tsq-dba.md#L7) `tools: [Read, Write, Edit, Bash, Grep, Glob]` (참조용 비교).
   - [templates/base/agents/base/tsq-librarian.md:7](templates/base/agents/base/tsq-librarian.md#L7) Write/Edit 보유.
   - **Scope rule 강제 기제**: 기존 `check-capability.sh` / `change-scope-guard.sh` hook이 이미 PreToolUse에 등록됨 (settings.json 확인). → 경로 제한은 hook 차원.
4. **변경 대상 파일**:
   - `templates/base/agents/base/tsq-architect.md` frontmatter `tools` 배열.
   - `templates/base/agents/base/tsq-qa.md` 동일.
   - `templates/platforms/claude-code/scripts/check-capability.sh` 또는 신규 `agent-write-scope.sh` — architect/qa 발신 시 `reports/`, `logs/` 외 경로 Write 차단.
   - 문서: `docs/file-structure.md` agent 권한 표 갱신.
5. **구현 단계**:
   1. `tools` 배열에 `Write` 추가 (architect, qa).
   2. scope guard hook 수정 — `${AGENT_NAME}` 환경 변수 또는 stdin payload 기반으로 architect/qa 인 경우 `^reports/|^logs/|^docs/sprint/` 패턴만 허용.
   3. 단위 테스트: 모킹된 stdin 으로 (a) architect+reports/foo.md 통과 (b) architect+src/index.ts 차단.
   4. 실제 시나리오: Wave 0 리서치를 시뮬레이션해서 1회 보고서 저장 성공.
6. **검증 방법**:
   - `vitest tests/unit/hooks/agent-write-scope.test.ts`.
   - 통합: 더미 프로젝트에서 architect agent 호출 → `reports/wave-0-architecture.md` 저장 성공.
7. **의존성**: A4 (hook 패턴) 권장 후. A5와 병렬 가능.
8. **리스크**: scope guard 우회 가능성 (agent가 임의 경로 Write 시도) → fail-closed.
9. **공수**: **S (반나절)**.

---

### A7. #47 + #36 — planning.md parser regex 보강 (Phase ID 소수점 + Bold + H2/H3)

1. **이슈 번호 및 제목**: [#47](https://github.com/sonature-lab/timsquad/issues/47) (parser regex limitation) / [#36](https://github.com/sonature-lab/timsquad/issues/36) (tsq next 신규 Phase 미인식)
2. **목표**: `### Phase 0.5:`, `**P0.5-S001-T001 ...**`, Bold task 형식 모두 인식. 0 phases 시 `error: no phases found` 반환.
3. **현재 상태 진단** (실증):
   - [src/lib/planning-parser.ts:49](src/lib/planning-parser.ts#L49) `const PHASE_HEADING_RE = /^##\s+Phase\s+(\d+)[.:]\s*(.+)$/i;` — H2 + 정수만.
   - `:50 SEQUENCE_HEADING_RE`, `:51 TASK_HEADING_RE` — 동일 정수 제약.
   - `:199 inlineTaskMatch` — `P(\d+)-S(\d+)-T(\d+)` 정수 캡처.
   - `:87 return { projectName, phases };` — 빈 배열 시 호출자 `all_complete` 반환 가능.
   - 단위 테스트: `tests/unit/planning-parser.test.ts` 존재.
4. **변경 대상 파일**:
   - `src/lib/planning-parser.ts` — regex 3종 + inline + 신규 BOLD_TASK_RE.
   - `src/commands/next.ts:87` / `:110` — 빈 phases 분기에서 `status: 'error'` 반환 추가.
   - `tests/unit/planning-parser.test.ts` — 케이스 5개 추가.
   - `tests/unit/next-command.test.ts` — `--wave` 에러 시나리오 + `seq.completed_tasks is not iterable` 회귀 테스트.
5. **구현 단계**:
   1. regex 3종 갱신 — `(\d+(?:\.\d+)?)` 소수점, 헤딩 `^##|^###`, bold `^\*\*...`.
   2. `next.ts` 빈 phases 분기 `status: 'error', message: 'no phases found'` 반환.
   3. workflow.json 스키마 보정 — `seq.completed_tasks` 부재 시 `[]` 보정 (`workflow-state.ts` defensive default).
   4. 단위 테스트 추가 후 `npm test -- planning-parser next-command`.
   5. CHANGELOG 항목.
6. **검증 방법**: 케이스별 vitest 그린 + `tsq next` 가 `Phase 0.5` 함유 planning.md 인식.
7. **의존성**: A5와 독립. A1·A2·A3 후 진행.
8. **리스크**: 과한 regex로 의도치 않은 매칭 → **완화**: 부정 케이스 테스트 (e.g., `## Phase Background:` 미매칭).
9. **공수**: **M (1~2일)**.

---

### A8. #35 + #37 — Visual Gate / E2E Gate 체크리스트 확장

1. **이슈 번호 및 제목**: [#35](https://github.com/sonature-lab/timsquad/issues/35) (Visual Gate 부재) / [#37](https://github.com/sonature-lab/timsquad/issues/37) (Gate에 E2E 의무)
2. **목표**: Phase Gate 통과 조건에 (a) Visual Verification (Playwright screenshot diff or manual), (b) E2E CRUD 플로우, (c) `/exhaustive-qa` 결과 PASS 포함. 디자인 토큰 SSOT 등록 의무화.
3. **현재 상태 진단**:
   - 현재 `build-gate.sh` Stop hook = tsc만. unit test 만.
   - `/exhaustive-qa` 스킬은 이미 존재.
   - DEL-003 트리거 키워드 — `templates/base/agents/` 의 designer 위임 트리거 텍스트는 `tsq-designer.md` 존재 확인.
4. **변경 대상 파일**:
   - 신규: `templates/platforms/claude-code/scripts/visual-gate.sh` (Playwright headless screenshot, fail-open in CI 환경).
   - 신규: `templates/platforms/claude-code/scripts/e2e-gate.sh` (재구현; A3에서 삭제한 e2e-commit-gate.sh 의 의도 계승).
   - 수정: `templates/platforms/claude-code/settings.json` Stop hook 배열에 추가.
   - 수정: `templates/base/skills/tsq-controller/SKILL.md` — Phase Gate 체크리스트에 visual/e2e 추가.
   - 수정: `templates/base/agents/base/tsq-designer.md` — DEL-003 트리거 키워드 (`UI`, `페이지`, `screen`, `route`) 확장.
   - 수정: `src/commands/init.ts` (또는 tsq-init 스킬) — 프로젝트 분석 시 프로토타입(`prototype/**`, `design-tokens.json`)/CSS 프레임워크 자동 감지 → `design-token-spec.md` SSOT 자동 등록.
5. **구현 단계**:
   1. visual-gate.sh — Playwright 가 설치된 프로젝트에서만 screenshot 캡처, 변경된 page 라우트 자동 추출.
   2. e2e-gate.sh — `npm run test:e2e || playwright test --grep @smoke` 실행. 실패 시 block.
   3. settings.json Stop 배열에 추가 (timeout 60, fail-open if no playwright).
   4. Phase Gate 체크리스트 문서 갱신 (controller SKILL.md, `docs/file-structure.md`).
   5. tsq-init에 design-token 감지 로직 (`fs.existsSync('design-tokens.json')`).
   6. 단위/통합 테스트 — gate 차단 시나리오.
6. **검증 방법**: rallyup 또는 dugout-tours 프로젝트에 적용 후 (i) CSS 누락 페이지 → visual-gate 차단, (ii) 라우트 누락 → e2e-gate 차단.
7. **의존성**: A3 (e2e-* 파일 정리 완료) 선행 필수. A5 (trigger chain) 와 보완 관계.
8. **리스크**:
   - CI에서 Playwright 미설치 시 모든 빌드 차단 → **완화**: detect-env.sh 활용, 없으면 fail-open + warning.
   - 사용자 디자인 토큰 부재 시 init 단계에서 강제 시 마찰 → **완화**: 경고만, 강제 X.
9. **공수**: **L (3~5일)**.

---

## Phase 2 — vNext Operational State Runtime (5-Phase 로드맵)

> **방향성 SSOT**: [docs/rfc/vnext-operational-state-runtime.md](docs/rfc/vnext-operational-state-runtime.md) (핸드오프 2026-05-22 정제본)
> **핵심 원칙**: Runtime = observer/validator (NOT owner). src/ 는 Edit tool 직접 수정, **canonical truth (`operational-events.jsonl`) + runtime-owned generated projections (`.glog`, `current-phase.json`, `task-context.json`)** 만 Runtime / `tsq` CLI 가 갱신. Generated projections 는 truth 가 아니며 deletable/regenerable. Evidence = commit credential. event append = 유일한 commit point.
> **로드맵 매핑**: RFC §19 의 Phase 0~4 를 액션 A9~A13 으로 1:1 매핑. A9 는 기존 진행 중인 작업(A4 + Evidence v0.1)을 정리하는 역할, A10 부터가 본격 신규 구현.

---

### A9. vNext Phase 0 — Foundation (Append-only + Evidence import/재검증 + Entity ID)

> 🔬 **STATUS: roadmap hypothesis** — 시작 전에 `docs/rfc/phase-alpha-rfc.md` (Mini-RFC) 작성 + Prime Directive Check 통과 필수. 본 절은 hypothesis scope 정의일 뿐 implementation commitment 가 아님.

1. **범위**: RFC §19 Phase 0 — append-only guard / **Evidence v0.1 산출물 수입(import) + repo 내 재검증** / Entity ID convention
2. **목표 (Milestone)**:
   - M2.0.1: append-only guard 운영 (= **A4 와 동일 작업**, vNext 의 첫 단추로 격상)
   - M2.0.2: **Evidence v0.1 수입 + 재검증 + SSOT 등록** — handoff (#57) 에 reported 된 schema/validator/13 tests 를 main repo 로 import 후 (a) 코드 빌드 통과 (b) 테스트 13건 실측 PASS (c) SSOT 등록. 단순 SSOT 등록 아님.
   - M2.0.3: Entity ID convention 정의 — 모든 evidence/event/projection 의 entity 참조 ID 규약 (예: `entity:src/modules/chat`, `adr:046`, `task:P2-S001-T003`)
3. **현재 상태 진단**:
   - A4 가 본 마일스톤의 핵심 → A4 완료 = M2.0.1 완료
   - **Evidence v0.1 — handoff reported / repo 미반영**: `src/lib/evidence-validator.ts`, `src/lib/event-validator.ts`, 관련 unit test 가 main repo 에 부재 (2026-05-22 실측). 외부 RFC/브랜치/별도 산출물 가능성. **확정 완료로 쓰지 말 것**.
   - Entity ID convention = 신규.
4. **변경 대상 파일**:
   - (A4 의 산출물 그대로)
   - 신규: `src/lib/evidence-validator.ts`, `src/lib/event-validator.ts`, `tests/unit/evidence-*.test.ts`, `tests/unit/event-*.test.ts` (수입 대상)
   - 신규: `docs/rfc/vnext-evidence-event-schema.md` — Evidence v0.1 명세 이관 (#57 §10 부록 활용)
   - 신규: `templates/base/knowledge/entity-id-convention.md` — ID 규약 SSOT
5. **구현 단계**:
   1. A4 완료 → M2.0.1 마크.
   2. **Evidence v0.1 산출물 출처 추적** — #57 핸드오프 본문 §10 부록 / 외부 RFC / 별도 브랜치 중 어디에 있는지 확인.
   3. 산출물 main repo 로 import (`src/lib/`, `tests/unit/`).
   4. **재검증**: 코드 빌드 + 13 tests 실측 PASS 확인.
   5. SSOT 문서 등록 (`docs/rfc/vnext-evidence-event-schema.md`).
   6. Entity ID convention 초안 작성 + RFC PR 리뷰.
6. **검증 방법**: `vitest run tests/unit/evidence-*.test.ts tests/unit/event-*.test.ts` 그린 (handoff reported 13 tests = repo 13 tests 일치) + RFC 리뷰 PASS + entity ID dry-run.
7. **의존성**: A4 선행 필수. **Evidence v0.1 산출물 위치 확인이 첫 step**.
8. **리스크**:
   - Evidence v0.1 산출물이 외부에만 있고 main repo 로 import 불가 → **완화**: 핸드오프 본문 §10 부록 (43KB) 에서 코드 추출하여 직접 작성 fallback. 이 경우 공수 증가.
   - Entity ID convention 이 향후 모든 layer 에 박힘 → 변경 비용 큼. **완화**: RFC 리뷰 단계에서 충분한 brainstorming.
9. **공수**: **M (3~5일)** — A4 외 추가 작업이 단순 SSOT 등록이 아니라 수입+재검증 포함이라 1~2일 → 3~5일로 상향.

---

### A10. vNext Phase 1 — Event / Evidence Core Walking Skeleton

> 🔬 **STATUS: roadmap hypothesis** — 시작 전에 `docs/rfc/phase-beta-rfc.md` (Mini-RFC) 작성 필수. A9 Exit Criteria 충족 + Prime Directive Check 통과해야 진입 가능. 본 절은 hypothesis scope 정의일 뿐 implementation commitment 가 아님.

1. **범위**: RFC §19 Phase 1 — event schema + **event/evidence core CLI**. RFC §11 의 **최종 최소 CLI surface 5개 중 A10 구현 대상은 아래 4개 + bridge**. `tsq context resolve` / `tsq file impact` 는 `.glog` / ProjectMap 없이는 의미 있는 구현이 어려우므로 **A11 이후로 이동**.
2. **목표 (Milestone)**:
   - M2.1.1: `operational-events.jsonl` JSON schema (zod) 확정 + validator 구현. **제약**: schema 는 stable entity/source pointers (entity ID + file:line + commit hash) 를 보존해야 A11 의 Operational Context Chain projection 이 가능. A10 단계에서는 pointer 필드 정의만, Operational Context Chain instantiate 는 A11 범위.
   - M2.1.2: **A10 walking skeleton CLI (구현 대상)**:
     - `tsq evidence validate` — evidence 재검증
     - `tsq event append` — 유일한 commit point
     - `tsq event verify` — append 전 / 사후 검증 (validator wrapper)
     - `tsq event tail` — debugging / 운영 가시성
     - `tsq task complete` — 최소 bridge (`tsq next --complete` 의 alias 로 시작, 향후 A12 에서 full Runtime 통합)
   - M2.1.3: 단위 테스트 — `invalidates ⊆ derivable(evidence)` 불변식 강제 + schema round-trip. (테스트 개수 목표는 30+ 이지만 walking skeleton 단계에서는 "필요한 invariant 가 모두 cover" 가 PASS 기준)
   - **A10 비범위 (별도 액션)**:
     - `tsq context resolve`, `tsq file impact` → A11 (Lazy Views / ProjectMap) 으로 이동
     - `decisions.jsonl` ↔ `operational-events.jsonl` dual-write 1주일 — **A10 완료 조건 아님**. A10 walking skeleton 완료 후 별도 dogfood/compatibility slice 작업
3. **현재 상태 진단**:
   - `src/commands/` 10개 — `event.ts`, `evidence.ts`, `context.ts`, `file.ts` 부재
   - `src/commands/next.ts` 의 `--complete` 옵션은 `tsq task complete` 의 bridge prototype 으로 활용 가능
   - 의존성: zod (이미 사용 중인지 확인) 또는 ajv
4. **변경 대상 파일**:
   - 신규: `src/lib/event-schema.ts`, `src/lib/event-validator.ts`, `src/lib/evidence-validator.ts`
   - 신규: `src/commands/event.ts` (subcommands: `append`, `verify`, `tail`), `src/commands/evidence.ts`, `src/commands/task.ts`
   - 신규: `src/index.ts` 에 새 command 등록
   - 신규: `tests/unit/event-*.test.ts`, `tests/unit/evidence-*.test.ts`
   - 수정: `package.json` (zod/ajv)
5. **구현 단계**:
   1. event schema (zod) 정의 (RFC §4, §5 기반).
   2. evidence validator + event validator 구현 — `invalidates ⊆ derivable(evidence)` 강제 (#57 D9).
   3. walking skeleton CLI 구현 (`evidence validate`, `event append/verify/tail`, `task complete` bridge — 각 ~50 line).
   4. 단위 테스트 (필수 invariant 모두 cover).
6. **검증 방법**: vitest 그린 + 5개 walking skeleton CLI smoke 실행.
7. **의존성**: **A9 (Foundation) 선행 필수**. A5 (trigger chain) 권장.
8. **리스크**: schema 변경 비용 (한번 박히면 마이그레이션 필요) → **완화**: RFC §4, §5 단계 brainstorming 충분히. walking skeleton 단계에서는 schema 단순 유지.
9. **공수**: **L (1~1.5주, 축소됨)** — dual-write/`context resolve`/`file impact` 가 분리되어 작업량 감소.

---

### A11. vNext Phase 2 — Lazy Views (`.glog` + Projections + ProjectMap)

> 🔬 **STATUS: roadmap hypothesis** — 시작 전에 `docs/rfc/phase-gamma-rfc.md` (Mini-RFC) 작성 필수. A10 Exit Criteria (dogfood KPI: claim_drift_caught ≥ 1, schema 변경 ≤ 1회, p99 < 300ms) 충족해야 진입. 본 절은 hypothesis scope 정의일 뿐 implementation commitment 가 아님.

1. **범위**: RFC §19 Phase 2 — `.glog` lazy view + generated projections + ProjectMap. RFC §6, §7 매핑.
2. **목표 (Milestone)**:
   - M2.2.1: `.glog` lazy view generator (`src/lib/glog-generator.ts`) — entity → source pointers / latest relations / constraints / projections
   - M2.2.2: `current-phase.json`, `task-context.json` compiled projection (`src/lib/phase-projection.ts`) — 수동 편집 금지, runtime 만 갱신 (invalidate → lazy regenerate)
   - M2.2.3: ProjectMap navigation layer (`src/lib/project-map.ts`) — lightweight (path/role/layer/key files/method names/related ADR/dependsOn/related tests/risk/freshness)
   - M2.2.4: **A10 에서 deferred 된 CLI 2개 추가** (`.glog` / ProjectMap 위에서 의미 있음):
     - `tsq context resolve` — `.glog` + ProjectMap 기반 minimal operational context 제공
     - `tsq file impact` — ProjectMap dependsOn 기반 파일 변경 영향 분석
   - M2.2.5: **decisions.jsonl ↔ operational-events.jsonl dual-write dogfood** (1~2주 운영 + diff 모니터링) — A10 의 schema 가 실데이터에서 buggy 한지 검증
   - M2.2.6: **MetaIndex 격하** — 기존 `src/lib/meta-index.ts` / `src/daemon/meta-cache.ts` 를 on-demand analyzer cache 로 재정의 (#21 해결의 후속)
   - M2.2.7: **Ontology Object Model** — `Task / Decision / File / Evidence / Phase / Entity / Constraint` 등 **typed objects + relation vocabulary** 정의. Operational Context Chain type system 의 기반. 상세 schema (object 별 field, relation 종류, 제약) 는 A11 Mini-RFC 에서 정의.
   - M2.2.8: **ProjectMap Object Metadata 통합** — 기존 M2.2.3 의 ProjectMap 이 제공하는 object metadata (path/role/layer/methods/ADR/tests/dependsOn/risk/freshness) 가 **Operational Context Chain 의 navigation metadata source 로 역할 정의됨**. ProjectMap 자체는 Operational Context Chain 이 아니라 metadata source.
   - M2.2.9: **Operational Context Chain Resolver** — Ontology Object Model + `.glog` (operational graph / relation substrate) + ProjectMap (object metadata) 를 조합해 **특정 task/question 기준으로 instantiate** 하여 **Operational Context Chain** 를 만든다. Operational Context Chain = **agent input context 를 대체하는 제공 단위**. truth 가 아니라 **compiled access object / generated projection** (deletable / regenerable). 상세 resolver 알고리즘 / instantiation 정책 / cache 전략은 A11 Mini-RFC 에서 정의.
   - M2.2.10: **Knowledge Export Compatibility** — Operational Context Chain 를 Obsidian / LLM wiki / markdown 으로 export 가능한 인터페이스 설계. **원칙**: export 결과물도 generated projection 이며 truth 가 아님. Canonical truth (`operational-events.jsonl` + verified evidence + source code) 는 유지. Export 구현 자체는 A11 Mini-RFC 채택 후 별도 slice.
3. **현재 상태 진단**:
   - `.glog` 미구현
   - `current-phase.json`, `task-context.json` 은 수동 편집 가능한 상태 (vNext 에서 금지 대상)
   - ProjectMap = 신규
   - MetaIndex = `src/daemon/index.ts:96`, `:234`, `src/daemon/meta-cache.ts:181` 에 인메모리 캐시 활성화 완료 — 격하 시 이 코드의 일부는 보존, persistent meta-index 만 제거
4. **변경 대상 파일**:
   - 신규: `src/lib/glog-generator.ts`, `src/lib/phase-projection.ts`, `src/lib/project-map.ts`
   - 신규: `src/commands/context.ts`, `src/commands/file.ts`
   - 신규: `templates/base/knowledge/project-map-spec.md`
   - 수정: `src/daemon/index.ts` — observer 모드 추가 (event 감지 시 projection **invalidate**, eager write 금지)
   - 격하: `src/lib/meta-index.ts` — persistent meta-index 코드 제거, on-demand analyzer 만 남김
   - 수정: `templates/base/skills/tsq-controller/SKILL.md` Step 9 — meta-index 쿼리 → ProjectMap / `tsq context resolve` 로 교체
5. **구현 단계**:
   1. `.glog` schema 정의 + generator 구현 (lazy/regenerate).
   2. projection compiler 구현 (current-phase, task-context — invalidate → lazy rebuild).
   3. ProjectMap spec 작성 + 초기 구현.
   4. `tsq context resolve`, `tsq file impact` CLI 구현 (A10 의 walking skeleton 위에).
   5. dual-write dogfood (decisions.jsonl ↔ operational-events.jsonl 1~2주 + diff 모니터링).
   6. MetaIndex 격하 PR (persistent cache 제거, on-demand analyzer 보존).
   7. Controller SKILL.md Step 9 갱신.
6. **검증 방법**: `.glog` stale 시 regenerate 동작 확인 + ProjectMap dogfood + controller Step 9 가 새 인터페이스로 동작 + dual-write 1~2주 데이터 일치.
7. **의존성**: **A10 (event/evidence core walking skeleton) 선행 필수**.
8. **리스크**:
   - MetaIndex 격하로 #21 작업 사실상 무효화 → **완화**: A1 (#21 close) 코멘트에 "vNext Phase 2 에서 격하 예정" 명시
   - `.glog` regenerate 비용 (대형 프로젝트) → **완화**: 증분 regenerate + cache
   - dual-write 기간 데이터 손실 위험 → **완화**: A4 보호 선행, backup 자동화
9. **공수**: **XL (2.5~3.5주, dual-write + context/file CLI 흡수로 약간 증가)**.

---

### A12. vNext Phase 3 — Capability Boundary + Runtime Orchestration

> 🔬 **STATUS: roadmap hypothesis** — 시작 전에 `docs/rfc/phase-delta-rfc.md` (Mini-RFC) 작성 필수. A11 Exit Criteria 충족 + Runtime 5계층의 정당화 (1인 시나리오에 과한가 vs 필요한가) 가 RFC 에 명시되어야 진입.

1. **범위**: RFC §19 Phase 3 — capability boundary + runtime orchestration 강화. RFC §10, §12, §15 매핑.
2. **목표 (Milestone)**:
   - M2.3.1: Agent capability boundary 강제 — agent 가 직접 state 수정 금지 (`decisions.jsonl`, `current-phase` 등 Write 차단). 대신 `tsq task complete` / `tsq evidence validate` CLI 만 사용 (RFC §12)
   - M2.3.2: Runtime 계층 구조 구현 — ProjectRuntime → PhaseRuntime → SequenceRuntime → TicketRuntime → TaskRuntime (RFC §10)
   - M2.3.3: **Convention as Executable Constraint** — Convention 문서를 executable constraint 로 (RFC §15). 예: `convention:service-layer` 가 "service must not import route layer" 를 정적 검증
3. **현재 상태 진단**:
   - 기존 Hook (`check-capability.sh`, `change-scope-guard.sh`) 는 이미 부분 capability boundary
   - Runtime 계층 구조 = 신규 (현재는 `tsq next` 가 flat 구조로 task 처리)
   - Convention 문서 = 현재 prose 형태 (`.claude/rules/`), executable 변환 신규
4. **변경 대상 파일**:
   - 수정: `templates/platforms/claude-code/scripts/check-capability.sh` — agent state-write 차단 강화
   - 신규: `src/lib/runtime/project-runtime.ts`, `phase-runtime.ts`, `sequence-runtime.ts`, `ticket-runtime.ts`, `task-runtime.ts`
   - 신규: `src/lib/convention-validator.ts` — executable constraint 검증기
   - 신규: `templates/base/conventions/*.yaml` — constraint 정의
5. **구현 단계**:
   1. capability boundary hook 강화 (RFC §12 ❌ 목록 차단).
   2. Runtime 계층 클래스 구현 (단위 테스트 포함).
   3. Convention validator 구현 + 초기 constraint 3~5개 (service-layer, port-only, etc).
   4. dogfood + 회귀 테스트.
6. **검증 방법**: agent 가 의도적으로 `decisions.jsonl` Write 시도 → 차단 + `tsq task complete` 안내. Convention 위반 코드 → validator 차단.
7. **의존성**: **A10, A11 선행 필수**. A4 (append-only-guard) 도 결합.
8. **리스크**: capability boundary 가 너무 강하면 hot-fix 불가능 → **완화**: `config.yaml` 의 `runtime.capability_mode: strict|advisory` 토글.
9. **공수**: **L (1~2주)**.

---

### A13. vNext Phase 4 — Daemon + MCP + Cross-platform Runtime

> 🔬 **STATUS: roadmap hypothesis (deferred)** — MCP 2026 표준 안정화 (Q3 2026+) 전까지 **착수 금지**. 시작 전에 `docs/rfc/phase-epsilon-rfc.md` (Mini-RFC) + MCP 표준 fitness check + cross-platform 비용 재평가 필수.

1. **범위**: RFC §19 Phase 4 — daemon / MCP / cross-platform runtime. RFC §13, §14 매핑.
2. **목표 (Milestone)**:
   - M2.4.1: Runtime daemon 구현 — **event 감지 → projection invalidate** (eager write 금지). Rebuild 는 `tsq context resolve` / projection read 시점에 **lazy** 트리거. Runtime daemon = observer/validator/**invalidator**, owner 아님 (RFC §5, §9 일관)
   - M2.4.2: MCP adapter — Claude/Codex/Cursor/Antigravity 가 동일 Runtime API 사용 (RFC §13)
   - M2.4.3: Cross-platform 검증 — 최소 3개 플랫폼에서 동일 시나리오 PASS
3. **현재 상태 진단**:
   - `src/daemon/index.ts` 가 이미 IPC + 인메모리 캐시 보유 → 확장 기반 존재
   - MCP = `timsquad-mcp` 별도 리포 (메모리 §MCP 매핑 분석) — 신규 작업 필요
4. **변경 대상 파일**:
   - 수정: `src/daemon/index.ts` — observer 모드 확장, event watcher 통합
   - 신규: `src/daemon/event-watcher.ts`, `src/daemon/projection-invalidator.ts`
   - 신규: `src/adapters/claude.ts`, `src/adapters/codex.ts`, `src/adapters/cursor.ts`, `src/adapters/mcp.ts`
   - 신규: `timsquad-mcp` 리포에 RuntimeServer 구현 (별도 PR)
5. **구현 단계**:
   1. Runtime daemon observer 모드.
   2. event-watcher → projection-invalidator 파이프라인.
   3. Claude adapter (가장 먼저).
   4. MCP adapter (timsquad-mcp 리포).
   5. cross-platform 시나리오 테스트.
6. **검증 방법**: 동일 task 시나리오를 Claude / Codex 양쪽에서 실행 → event ledger 일치 확인.
7. **의존성**: **A10, A11, A12 모두 선행 필수**.
8. **리스크**: cross-platform 호환성 = 가장 어려운 부분. **완화**: walking skeleton 부터.
9. **공수**: **XL (3주+)**.

---

## Phase 3 — Methodology (장기, 3개 액션)

---

### A14. #48 — Tiered Spec-First Testing + Mutation Integration

1. **이슈 번호 및 제목**: [#48](https://github.com/sonature-lab/timsquad/issues/48) — Tiered Spec-First Testing
2. **목표**: `tsq next` 응답에 `tier`, `specRequired`, `specPath` 필드 포함. 3계층(full/template/contract) 분류 + Mutation Testing(Stryker) full≥80%, template≥70%.
3. **현재 상태 진단**:
   - `src/commands/next.ts` 응답 스키마는 `status, taskId, completedAt, summary` 위주. tier 필드 부재.
   - Stryker 도입 안 됨 (package.json 의존성 미존재).
4. **변경 대상 파일**:
   - `src/commands/next.ts` — 응답 schema 확장.
   - `src/lib/planning-parser.ts` — task tier 메타데이터 파싱 (`@tier: full|template|contract`).
   - 신규: `templates/base/skills/tsq-spec/` 에 Tier Spec Template.
   - `package.json` — `@stryker-mutator/core` devDependency.
   - 신규: `stryker.config.mjs`.
   - 수정: `templates/platforms/claude-code/scripts/tdd-guard.sh` — tier 인식 + spec 부재 시 차단.
5. **구현 단계**:
   1. Tier 메타데이터 문법 결정 + 파서 확장.
   2. `tsq next` 응답 확장.
   3. tdd-guard.sh Spec-First Gate 통합.
   4. Stryker 설정 + CI 통합.
   5. 단위 테스트 + sample template spec.
6. **검증 방법**: Stryker 실행 → mutation score ≥80% (full tier sample).
7. **의존성**: A7 (planning-parser 보강) 선행 권장.
8. **리스크**: Stryker 실행 비용 (수십분). → 야간 CI 또는 changed-files 모드.
9. **공수**: **L (1주)**.

---

### A15. #26 — Goal Convergence Score (5계층 메트릭 뷰)

1. **이슈 번호 및 제목**: [#26](https://github.com/sonature-lab/timsquad/issues/26) — Goal Convergence Score
2. **목표**: `tsq status --convergence` → 5계층(Spec/Plan/Impl/Test/Gate) 연결률을 단일 점수로 출력.
3. **현재 상태 진단**: 인프라 의존. A5(workflow propagation), A8(gate), **A10(event ledger)** 이 데이터 소스. `src/commands/status.ts` 이미 `--memory` 옵션 있어 확장 베이스 존재. **본 액션은 A10 이후 작업**이며 vNext 제외 Critical Path 에는 포함되지 않음.
4. **변경 대상 파일**: `src/commands/status.ts`, 신규 `src/lib/convergence-score.ts`.
5. **구현 단계**:
   1. 5계층 메트릭 수집기 (`spec coverage`, `plan ID 매칭`, `impl AST`, `test ID 추적`, `gate PASS`).
   2. 가중치 + 종합 점수 계산.
   3. CLI 출력 (테이블 + JSON).
   4. 단위 테스트.
6. **검증 방법**: dogfood — TimSquad 자기 점수 ≥70% 목표.
7. **의존성**: A5, A8, A10 인프라 후. **A10 (event schema + CLI) 이후가 이상적** (event ledger 기반 추적성).
8. **리스크**: Test ID 추적이 코드 컨벤션 의존 → **완화**: 메타데이터 도입.
9. **공수**: **M (2~3일, 인프라 완료 후)**.

---

### A16. #53, #54, #55 — 프로세스 개선 (Hot-fix / 검증 매트릭스 / Contract Evidence)

1. **이슈 번호 및 제목**: [#53](https://github.com/sonature-lab/timsquad/issues/53) (Hot-fix 모드 + self-check + Tier) / [#54](https://github.com/sonature-lab/timsquad/issues/54) (검증 범위 자동) / [#55](https://github.com/sonature-lab/timsquad/issues/55) (SSOT drift Contract Evidence)
2. **목표**: 세 이슈 공통 — soft 프로토콜 → 강제 메커니즘.
3. **현재 상태 진단**:
   - `templates/base/skills/tsq-quick` 존재. Hot-fix 별도 모드 미정의.
   - `build-gate.sh` 현재 tsc만. 변경 분류 매트릭스 부재 (#54).
   - Closeout drift sweep 자동화 없음 (#55).
4. **변경 대상 파일**:
   - 신규: `templates/base/skills/tsq-hotfix/SKILL.md` (#53).
   - 수정: `templates/platforms/claude-code/scripts/build-gate.sh` (#54 — `git diff --name-only` 기반 변경 분류 → 단위/통합/전체 매핑).
   - 신규: `templates/platforms/claude-code/scripts/contract-evidence-guard.sh` (#55 — agent report PASS 전 grep/line/실행 증명 강제).
   - 수정: `templates/base/skills/tsq-protocol/SKILL.md` — 판단 우선순위 명시 (Production code > Tests > Runtime > SSOT > Logs).
   - 수정: `templates/base/agents/base/tsq-qa.md` / architect — self-check 4단계 추가.
5. **구현 단계**:
   1. `tsq-hotfix` 스킬 분리 (#53).
   2. build-gate.sh 매트릭스 (#54) — file → test scope 매핑 함수.
   3. contract-evidence-guard hook (#55).
   4. Protocol/Agent 텍스트 갱신.
   5. 회귀 테스트.
6. **검증 방법**: medivance-v2-be / rallyup 시나리오 재현 → 동일 결함 차단 확인.
7. **의존성**: A4·A5 hook 패턴 확립 후. A14 (Tier) 와 시너지.
8. **리스크**: hook 누적으로 PreToolUse/Stop 체인 비대 → **완화**: 각 hook timeout/순서 명시.
9. **공수**: **L (5~7일)**.

---

## 의존성 그래프

```
Phase 0 (병렬 가능):
  A1 (close)
  A2 (drift)
  A3 (orphan)
  A4 (append-only-guard)  ─┐ Phase 0 의 핵심, vNext A9 의 첫 단추
                           │
Phase 1 (Hook 강제력 + Bug):
  A5 (trigger chain)  ←── A4 (hook 패턴)
  A6 (architect Write) ←── A4
  A7 (parser)         ←── (A1~A3)
  A8 (visual/E2E)     ←── A3 (orphan 정리), A5

vNext 5-Phase (RFC §19 매핑):
  A9  (Phase 0 — Foundation)         ←── A4 (= 사실상 A4 + Entity ID)
  A10 (Phase 1 — Event + CLI 5개)    ←── A9
  A11 (Phase 2 — .glog/Projections)  ←── A10
  A12 (Phase 3 — Capability + Runtime ←── A10, A11
        계층 + Convention executable)
  A13 (Phase 4 — Daemon + MCP)       ←── A10, A11, A12

Methodology (Phase 3):
  A14 (Tiered Spec + Mutation)       ←── A7
  A15 (Convergence Score)            ←── A5, A8, **A10 필수** (event ledger 기반, vNext 제외 critical path 에서 제거)
  A16 (Hot-fix/Matrix/Contract)      ←── A4, A5, A14
```

**Critical Path (vNext 제외)**: A1·A2·A3·A4 (1주) → A5 (3~4일) → A8 (3~5일) = **약 2.5주**.
**Critical Path (vNext 포함)**: 위 + A9 (M, A4와 부분 중첩) + A10 (L, 1~1.5주, 축소됨) + A11 (XL, 2.5~3.5주, dual-write/context resolve/file impact 흡수) + A12 (L, 1~2주) + A13 (XL, 3주+) = **약 12~15주 (3~4개월)**.
**Methodology (vNext 와 부분 병렬 가능)**: A14 (L, 1주, A7 후) + A15 (M, **A10 이후 필수**) + A16 (L, 1주) = 추가 **약 2~3주**.

**중요**: A15 (Goal Convergence Score) 는 event ledger 기반이므로 **A10 이후 작업**. vNext 제외 Critical Path 에서 제거됨.

---

## 리스크 매트릭스

| 액션 | 주요 리스크 | 영향 | 완화 방안 |
|---|---|---|---|
| **H1-F0** | **Kernel Grammar 가 또 하나의 ceremony 문서가 되어 A4 (#50 CRITICAL) 를 지연** | **중간** | **maximum 1 RFC, 1~2일 제한**. 구현 금지. A4/A9/A10 에 필요한 불변식만 정의. 초안 작성 후 1~2일 내 A4 진입 못 하면 H1-F0 scope 축소 또는 Kill 후 A4 우선 |
| A1 | 메모리상 완료지만 실제 미작동 (재오픈) | 낮음 | 코멘트에 파일:라인 인용; A1 후 즉시 inspect 재실행 |
| A2 | 문서 정정 외 영향 없음 | 매우 낮음 | inspect로 재검증 |
| A3 | 의도 모호한 스크립트 삭제 후 재발명 | 중간 | decisions.jsonl에 결정 기록 + #37 작업자 핸드오프 |
| A4 | 사용자 워크플로우 차단 (Write/Edit 모두 차단) | 중간 | 에러 메시지에 `tsq event append` (우선) / `cat >>` (legacy) 가이드 인라인; runtime CLI 발신은 SSOT allowlist 통과 |
| A5 | 자동 Librarian 호출 토큰 폭증 | 중간 | `config.yaml` 토글; phase 종료 시만 발동 |
| A6 | scope guard 우회 가능 | 낮음 | fail-closed; 단위 테스트 |
| A7 | 과도한 regex로 오매칭 | 낮음 | 부정 케이스 테스트 |
| A8 | CI에서 Playwright 미설치로 빌드 차단 | 중간 | detect-env.sh, 없으면 fail-open + warning |
| **vNext** | | | |
| A9 | Entity ID convention 변경 비용 | 중간 | RFC 단계 brainstorming 충분히 |
| A10 | event ledger 데이터 손실 (마이그레이션 중) | **높음** | dual-write 1~2주; backup 자동화; A4 보호 선행 |
| A11 | MetaIndex 격하로 #21 무효화 + `.glog` regenerate 비용 | 중간 | A1 코멘트에 격하 예정 명시; 증분 regenerate |
| A12 | capability boundary 너무 강하면 hot-fix 불가 | 중간 | `runtime.capability_mode: strict\|advisory` 토글 |
| A13 | cross-platform 호환성 | **높음** | walking skeleton 부터; Claude → Codex → Cursor 순 |
| **Methodology** | | | |
| A14 | Stryker 실행 비용 (수십 분) | 중간 | 야간 CI; changed-files 모드 |
| A15 | Test ID 추적 컨벤션 의존 | 낮음 | 메타데이터 강제 (#48과 연계) |
| A16 | PreToolUse/Stop hook 비대 | 중간 | 각 hook timeout/순서 docs/hook-execution-order.md 갱신 |

---

## 마일스톤

> **시점 표현 정책 (right-sized gate)**: 아래 "Target sizing" 컬럼은 **rough estimate** 일 뿐 commitment 가 아니다. Phase promotion 은 시점이 아니라 **Exit Criteria evidence** 가 게이트. 미충족 시 Kill 또는 re-spike.

| 마일스톤 | Target sizing | 진입 조건 | 액션 | 산출물 | Exit Criteria (promotion gate) |
|---|---|---|---|---|---|
| **M0 — H1-F0 Kernel Grammar** | Target ~1~2일 | 즉시 진입 가능 (H1 Foundation 의 첫 공식 slice) | (slice, 액션 외) | 단일 RFC `docs/rfc/h1-f0-kernel-grammar.md` 에 (a) TaskRuntime Process 상태 전이 표 (b) Log Taxonomy 표 (EventLog / Evidence / TaskLog / SessionLog / Generated Views) (c) Audit Protocol read-only boundary (Codex audits) 정의. **구현 금지, 불변식만**. | TaskRuntime 상태 전이 표 존재 + Log Taxonomy 표 존재 + Audit Protocol read-only boundary 존재 + A4 append-only 보호 대상이 taxonomy 기준으로 분류 가능 + A9/A10 event/evidence schema 가 참조할 task state invariants 존재 |
| **M1 — Phase 0 완료** | Target ~1주 | Conditional on M0 Exit pass | A1, A2, A3, A4 | OPEN 30 → 26; append-only-guard.sh 운영; 문서 drift 0건 | append-only-guard 가 Write/Edit 둘 다 block (자동 테스트 PASS) + break-glass mode 동작 + 1주 운영 중 data loss 0건 |
| **M2 — Phase 1 완료** | Target ~2주 | Conditional on M1 Exit pass | A5, A6, A7, A8 | trigger chain hook; architect/qa Write; parser 보강; visual/E2E gate | Phase Gate 자동 트리거 (수동 호출 0회) + Visual/E2E Gate 가 false PASS 차단 사례 ≥ 1건 + parser 가 `Phase 0.5` / bold task 인식 |
| **M3 — vNext Phase 0 Foundation** | Target ~1주 | Conditional on M2 + `phase-alpha-rfc.md` 채택 + **Evidence 산출물 출처 추적 spike 완료** | A9 (Mini-RFC pending) | **A9 첫 작업 = Evidence 산출물 출처 추적 spike** (구현 아님). 그 후 import + 재검증 + Entity ID convention RFC | `vitest run tests/unit/evidence-*.test.ts tests/unit/event-*.test.ts` 그린 (handoff reported = repo 일치) + Entity ID dry-run + Prime Directive Check 6/6 통과 |
| **M4 — vNext Phase 1 Event/Evidence Core** | Target ~2주 | Conditional on M3 + `phase-beta-rfc.md` 채택 | A10 (Mini-RFC pending) | `tsq evidence validate / event append/verify/tail / task complete` walking skeleton + EventStore 인터페이스 추상화 + invariant tests | 가짜 PASS claim 100% 차단 + 진짜 PASS claim 100% 통과 + p99 < 300ms (warm) + schema 변경 ≤ 1회 + claim_drift_caught ≥ 1건 |
| **M5 — vNext Phase 2 Lazy Views** | Target ~3주 | Conditional on M4 + `phase-gamma-rfc.md` 채택 | A11 (Mini-RFC pending) | `.glog` 생성기 + projection compiler + ProjectMap + `context resolve`/`file impact` + dual-write + MetaIndex 격하 | `.glog` stale 시 regenerate < 1s + ProjectMap dogfood + dual-write 1~2주 divergence ≤ 0.1% + controller Step 9 가 새 인터페이스로 동작 |
| **M6 — vNext Phase 3 Runtime Orchestration** | Target ~2주 | Conditional on M5 + `phase-delta-rfc.md` 채택 | A12 (Mini-RFC pending) | capability boundary 강제 + Runtime 계층 + Convention executable | agent 가 `decisions.jsonl` Write 시도 → 차단 + Convention validator 위반 코드 차단 + Runtime 계층 정당화 RFC 채택 |
| **M7 — vNext Phase 4 Daemon + MCP** | **DEFERRED** (H2/H3 인접 영역) | Conditional on MCP ecosystem fitness + `phase-epsilon-rfc.md` 채택 | A13 | runtime daemon (invalidator) + MCP adapter + cross-platform 검증 | 동일 시나리오 Claude/Codex 양쪽 event ledger 일치 |
| **M8 — Methodology 정착** | Conditional, after gate pass | After M4 Exit pass | A14, A15, A16 | Tiered Spec-First + Convergence Score + Hot-fix mode | Stryker mutation ≥ 80% (full tier) + `tsq status --convergence` 자기 점수 ≥ 70% |

**누적 sizing 합계 (rough estimate, NOT commitment)**: M1~M6 약 **11~12주 target**. 실제 진행은 Exit Criteria 통과 시점에 따라 가변. **commitment 가 아니라 hypothesis-driven roadmap**.

---

## 부록: vNext 클러스터(#56, #57) RFC 처리 상태

- **방향성 SSOT 작성 완료**: [docs/rfc/vnext-operational-state-runtime.md](docs/rfc/vnext-operational-state-runtime.md) (2026-05-22, 핸드오프 정제본).
- **본 plan 의 A9~A13 = RFC §19 의 Phase 0~4 와 1:1 매핑**.
- **추가 분리 권고 RFC** (작업 진행에 따라 신설):
  - `docs/rfc/vnext-evidence-event-schema.md` — RFC §4, §5 의 schema/validator 명세 (#57 §10 부록 이관).
  - `docs/rfc/vnext-runtime-cli.md` — RFC §11 의 5개 CLI 인터페이스 명세.
  - `docs/rfc/vnext-runtime-architecture.md` — RFC §9, §10 의 Runtime 계층 구조 명세.
- **메모리 연동**: [memory/vnext-direction.md](memory/vnext-direction.md) 및 [MEMORY.md](MEMORY.md) (작업 디렉토리) 신설 — **다음 세션 참조용 인덱스** (Claude Code 가 작업 디렉토리의 MEMORY.md 를 자동 로드한다는 보장은 없음; 새 세션 시 명시적 참조 필요).

---

## Critical Files for Implementation

다음 5개 파일이 본 plan 실행에 가장 결정적입니다.

- [src/lib/planning-parser.ts](src/lib/planning-parser.ts)
- [src/lib/workflow-state.ts](src/lib/workflow-state.ts)
- [templates/platforms/claude-code/settings.json](templates/platforms/claude-code/settings.json)
- [templates/platforms/claude-code/scripts/subagent-stop.sh](templates/platforms/claude-code/scripts/subagent-stop.sh)
- [templates/base/skills/tsq-controller/SKILL.md](templates/base/skills/tsq-controller/SKILL.md)

추가 핵심 참고:
- [src/daemon/index.ts](src/daemon/index.ts) (A1 검증 완료 — 변경 불필요)
- [src/daemon/meta-cache.ts](src/daemon/meta-cache.ts) (A1 검증 완료)
- [docs/competitive-analysis-2026-03.md](docs/competitive-analysis-2026-03.md) (A2 대상)
- [templates/base/agents/base/tsq-architect.md](templates/base/agents/base/tsq-architect.md), [templates/base/agents/base/tsq-qa.md](templates/base/agents/base/tsq-qa.md) (A6 대상)
- [src/commands/next.ts](src/commands/next.ts) (A5, A7, A11)

---

*Plan generated by Plan agent (read-only research), saved by Claude (Opus 4.7, 1M context). 데이터는 2026-05-22 기준 코드베이스 실증 탐색.*

---
type: review
source: claude-code-independent-reviewer
date: 2026-05-22
session: 10607571-f6c7-4755-b805-d95daab8c6cc
artifact_kind: 10-section-architecture-review
verdict: 조건부 진행 (Conditional Proceed)
scores: { 현실성: 6/10, 가치: 5/10, 기술리스크: 7/10, adoption: 8/10 }
---

# 2026-05-22 — Independent Architecture Review (1st)

이 문서는 2026-05-22 Claude Code 세션에서 "독립 아키텍처 리뷰어/감사자" 역할로 수행한 vNext 계획 1차 독립 리뷰의 전문이다. 사용자 메시지(uuid `2fc09c7e-e2a9-4034-b1c2-7a567c9f8b93`)가 read-only 모드에서 현실성/기술 타당성/이론적 정합성/성능·운영·정책 리스크/유사 사례 비교를 10개 섹션 형식으로 평가하도록 지시했고, Claude Code의 응답(uuid `40af633b-1450-49d9-9ca3-a5bd984bd5ef`)이 외부 사례 30여 건을 인용하며 보고서를 생성했다. 원문 그대로 — 의역/요약 없음.

---

독립 리뷰어 agent 가 외부 사례 30여 건 인용 + 10개 섹션 모두 충족하여 보고서를 완성했습니다. 본문 그대로 전달합니다.

---

# TimSquad vNext 독립 아키텍처 감사 보고서

작성일: 2026-05-22 / 작성자: 독립 아키텍처 리뷰어 (read-only)
범위: `docs/rfc/vnext-operational-state-runtime.md`, `docs/improvement-plan-2026-05-22.md`, `memory/vnext-direction.md`

---

## 1. Executive Verdict

**판정: 조건부 진행 (Conditional Proceed)**

- 현실성 점수: **6 / 10**
- 복잡도 대비 가치 점수: **5 / 10**
- 기술 리스크 점수: **7 / 10**
- adoption 리스크 점수: **8 / 10**

요약: 문제 진단(stale doc, claim drift, soft protocol, self-report 신뢰)은 **AI 에이전트 개발 환경의 본질적 문제**가 맞으며, 2026년 학술/산업 트렌드(EviBound, OPA runtime governance, LangGraph durable execution, SLSA/in-toto)와 정확히 같은 방향이다. 그러나 **A9~A13 풀스코프(12~15주)** 는 1인 개발자가 짊어지기엔 과다하고, "event append = 유일한 commit point" 와 "Hook = adapter / tsq CLI = surface" 의 cross-platform 통합 비용을 과소평가했다. **A4 + A9 + A10 walking skeleton (4~6주) 까지만 강하게 밀고, A11~A13 은 dogfood 결과를 보고 조건부 진행** 하는 단계적 진행을 권고한다.

---

## 2. Strong Points

1. **문제 진단이 학술/산업과 정합**. "agents report false claims: tasks marked complete despite missing artifacts" 는 EviBound 논문(arXiv 2511.05524)이 동일 언어로 정의한 문제다. 즉 vNext 는 임의 가설이 아니라 **현재 LLM 에이전트의 알려진 failure mode** 를 정조준한다.

2. **"Evidence = commit credential"** 는 EviBound 의 dual gate (Approval Gate + Verification Gate) 와 거의 동형이고, SLSA in-toto attestation 의 "tamper evidence + auditability + automated policy" 와도 동형이다. 즉 **단순 SSOT 관리가 아니라 공급망 보안의 검증 패턴을 개발 프로세스로 끌어온 것**. 이게 차별점이 될 수 있다.

3. **"Projection 은 invalidate → lazy regenerate"** 는 CQRS read model 의 정통 패턴. 산업계 합의는 "projections as disposable, rebuildable caches" 이며 vNext 가 정확히 그 표현을 쓴다 (RFC §6 ".glog stale → regenerate 가능해야 함").

4. **Hook = adapter / Runtime API = 표준** 결정 (RFC §13) 은 cross-platform 시대(Claude Code / Cursor / Codex / Antigravity)에서 옳다. Claude Code 자체가 "permission rules refer to tool names ... that means the tool namespace is the vocabulary of governance" 라고 정의해 놨으니, **tool namespace 위에 추상 surface 를 둔다는 발상 자체는 정합**.

5. **A4 (append-only-guard) 를 vNext 첫 단추로 격상**한 결정은 옳다. Write/Edit 둘 다 차단해야 #50 같은 데이터 손실 인시던트가 재현되지 않는다. RFC §9 "직접 Edit/Write 금지" 와 정합.

6. **MetaIndex 격하 결정** (A11 M2.2.6) 은 자기부정처럼 보이지만 실제로는 옳다. 영구 meta-index 캐시는 "또 하나의 truth" 가 되며, ProjectMap (lightweight navigation) + on-demand analyzer 조합이 LSP / IDE 가 이미 풀어놓은 방식과 더 가깝다.

7. **handoff reported 와 repo 실측을 분리해 명시한 점** (RFC §4 "handoff 기준 완료 — repo 반영 여부 재검증 필요") 은 SSOT 위생 측면에서 이례적으로 정직하다. 보통 이 차이가 누락되어 drift 가 시작된다.

8. **"잊어도 invalid state 가 commit 되지 못하게 한다"** (RFC §18) — 이 한 줄이 vNext 의 진짜 가치 명제다. "Better memory" 가 아니라 "Better gate" 로 frame 한 것이 LangGraph 류 (memory/checkpoint 중심) 와 차별화된다.

---

## 3. Critical Risks

### P0 — 즉시 mitigation 없으면 실패

**R1 (P0) — 1인 풀타임 12~15주 timeline 은 비현실적.**
Plan 본문 자체가 "vNext 풀 로드맵 (A9~A13) 약 3~4개월" + "Methodology 추가 1~2주" 라고 적었으나, A10 만 봐도 schema 정의, 5 CLI 구현, invariant 테스트, zod 통합, decisions.jsonl ↔ operational-events.jsonl 호환 검증을 "L (1~1.5주)" 로 잡았다. EventStoreDB / Axon 같은 프로덕션 event sourcing 시스템이 schema 거버넌스 비용을 어떻게 잡아먹는지 보면, **schema 미스 1회로 전체 ledger 재마이그레이션이 강제**된다. 1.5주는 *최선의 경우*에만 성립하며, dogfood 회귀까지 포함하면 3~4주가 현실적.

**R2 (P0) — "Event append = 유일한 commit point" 는 source code 와 operational state 의 경계 정의가 모호.**
RFC §9 가 "src/ 는 Edit tool 직접 수정 / canonical truth + generated projections 만 Runtime 갱신" 이라 명시했지만, 실제 작업 흐름에서 "task complete" 같은 이벤트는 src/ 변경과 동시에 발생한다. 그렇다면:
- src/ 변경(Edit) → 누가 "task complete event" 를 append 하는가?
- agent self-report ? → claim drift 재발
- pre-commit hook ? → git 통합 비용 + cross-platform 불일치
- `tsq task complete` CLI 수동 호출 ? → agent 가 "잊으면" 그대로 silent drift

이 부분에 대한 답이 RFC/plan 에 없다. **Evidence validator 가 git diff / test result / build artifact 같은 객관 산출물을 "derivable" 한 지 검증** 하지 않으면, evidence 가 또 다른 self-report 가 된다.

**R3 (P0) — Evidence v0.1 산출물 위치 불명 = 기반이 공중에 떠 있음.**
RFC §4 와 A9 M2.0.2 가 모두 "handoff reported / repo 미반영, 외부 RFC/브랜치/별도 산출물 가능성" 이라고 적어둔 상태. 즉 vNext 의 토대인 evidence schema/validator 자체가 **현재 검증 가능한 형태로 존재하지 않는다**. A10 의 "재검증 PASS" 가 fallback (handoff §10 부록에서 코드 추출) 으로 가면 공수는 plan 상의 추정치(3~5일)를 훌쩍 넘는다.

### P1 — 설계 결함 가능성

**R4 (P1) — `invalidates ⊆ derivable(evidence)` 의 derivable 정의가 비어 있다.**
RFC §4·§5 그리고 A10 M2.1.3 이 이 불변식을 강제한다고 했지만, "derivable" 이 무엇인지 명세가 없다. 예:
- test artifact 의 어느 필드까지가 "claim 의 근거" 인가
- 부분 PASS (예: 12/13 tests) 가 "task complete" claim 을 derivable 하게 만드는가
- "manual approval" evidence 가 derivable 한 base 인가? → **남용 위험**: agent 가 self-issued approval evidence 로 모든 gate 우회

EviBound 의 Verification Gate 가 "MLflow API queries + run_id + FINISHED status" 처럼 **수단을 제한**한 이유가 이것이다. vNext 는 어떤 store 가 evidence 를 host 하고 어떤 검증 protocol 을 강제할지 미정의.

**R5 (P1) — Cross-platform 동등성 (A13) 의 비용 과소평가.**
RFC §13 "Hook = adapter / Runtime API = 표준" 는 옳지만, 실제 어댑터 구현 비용은 다음과 같이 다르다:
- Claude Code: hooks JSON + stdin 프로토콜 (가장 쉬움)
- Cursor: rules.mdc, hook 시스템 없음 → CLI wrapper 필요
- Codex CLI: 자체 wrapper 필요
- MCP: stateful session, 2026년 현재 state management 표준이 막 정해지는 중. "stateful sessions collide with load balancers, no standard for enterprise authentication"

MCP 2026 roadmap 자체가 stateful session 표준화를 진행 중인 상황에서 vNext A13 이 "동일 시나리오 PASS" 를 목표로 잡으면 **이동 표적을 쫓는 꼴**. plan 상 XL (3주+)은 낙관적이며 실제는 분기 단위.

**R6 (P1) — Convention as Executable Constraint (A12 M2.3.3) 는 LSP/AST 기반 정적 분석 toolchain 을 사실상 재구현해야 한다.**
"service must not import route layer" 류 규칙은 ts-morph / eslint-plugin-boundaries / dependency-cruiser 같은 도구가 이미 풀어 둔 영역이다. vNext 가 자체 convention validator 를 새로 만들면 (a) AST 비용 (b) 언어별 가산 (c) IDE 미통합 등 비용이 빠르게 누적된다. **이 영역은 기존 정적 분석 도구를 호출하는 thin wrapper 가 되어야지 자체 구현이면 안 된다**.

**R7 (P1) — `.glog` 가 "또 다른 stale truth" 가 될 가능성 (자기 모순 위험).**
RFC §6 가 ".glog ≠ truth" 라 강조하지만, 실제로 `tsq context resolve` 가 `.glog` 를 읽어 LLM 컨텍스트를 구성한다면 agent 입장에서 `.glog` 가 **사실상 truth 처럼 소비**된다. CQRS 문헌의 경고가 정확히 이 지점이다: "Eventual consistency means your read models may lag behind. For some systems, that's fine. For others, it's not". **lazy regenerate 의 staleness 윈도우 동안 LLM 이 stale projection 으로 결정** 하면 vNext 가 막으려는 stale truth 가 다른 형태로 재발.

**R8 (P1) — Append-only ledger + projection rebuild 비용은 시간이 갈수록 단조 증가.**
Temporal/EventStore 등이 "snapshots become essential as event streams grow ... rebuilding from 10,000 events is computationally expensive" 라고 경고한다. plan A11 의 ".glog regenerate 비용" 완화로 "증분 regenerate + cache" 만 적혀 있는데, snapshot strategy + event versioning + upcasting 함수 설계가 누락. **이걸 사후 도입하면 ledger 마이그레이션 비용이 폭발**.

**R9 (P1) — Runtime 5계층 (ProjectRuntime → TaskRuntime, A12 M2.3.2) 은 framework over-engineering 신호.**
1인 개발자 + 단일 워크플로우(`tsq next`) 환경에서 5단계 계층은 정당화가 필요한데, RFC §10 에 그 정당화가 없다. flat coordinator + capability boundary 만으로도 동일 효과 가능. **5계층은 enterprise multi-team 시나리오에서만 가치**.

### P2 — 주의

**R10 (P2) — adoption barrier.**
Plan 도입 후 사용자는 (a) Write/Edit 가 차단됨 (b) `tsq event append` 를 항상 호출해야 함 (c) evidence artifact 를 매번 생성/검증 (d) `.glog` regenerate 대기. **1인 vibe-coding 사용자에겐 명백히 과한 마찰**. Claude Code 시장 1위 어드밴티지는 *가벼움* 에서 나온다. vNext 가 enterprise 향이면 brand/CLI 분리 필요.

**R11 (P2) — Evidence artifact 에 secrets 포함 위험.**
test output / build log / curl response 가 evidence 라면 자연스럽게 API key / token / PII 가 evidence artifact 에 박힌다. RFC/plan 에 redaction 정책 부재. Kubernetes audit log 가 "secrets level: Metadata" 로 처리하는 이유와 같다.

**R12 (P2) — Hook latency 누적 (PreToolUse/Stop chain 비대).**
plan A16 도 같은 걱정을 언급. settings.json PreToolUse 매처 `Write|Edit` 에 이미 5개 등록 + A4 추가 + A5 + A6 = **각 Edit 마다 7~8 hook serial 실행**. timeout 3초 × 8 = 24초 잠재 latency. Claude Code hooks 가 "exit code 2 = blocked. No discussion" 이라는 deterministic 보장이 강점인 만큼, latency 폭증 시 UX 가 무너진다.

**R13 (P2) — `tsq context resolve` 가 hook timeout (3초) 안에 끝나야 한다는 제약.**
plan A5 가 이미 "hook timeout 3초 내에 tsq next --phase-status 완료 보장" 을 risk 로 적었다. `.glog` lazy regenerate + ProjectMap freshness 계산이 cold path 에서 3초를 넘기면 hook이 fail-open 으로 떨어져 강제력 소실.

---

## 4. Theory Alignment

| 개념 | 대응되는 기존 이론/패턴 | 정합성 | 주의점 |
|---|---|---|---|
| `operational-events.jsonl` append-only | Event Sourcing (EventStore, Kafka append log) | **High** | snapshot 전략 미정의 — rebuild 비용 단조 증가 |
| Evidence = commit credential | EviBound dual gate / SLSA provenance attestation | **High** | "derivable" 정의 부재 — manual approval evidence 남용 위험 |
| `.glog` lazy generated view | CQRS read model / materialized view | **High** | staleness window 동안 LLM 이 stale 소비 가능 |
| Runtime = observer/validator (not owner) | OPA runtime governance / admission controller | **High** | OPA 와 달리 standalone policy 언어 없음 — Rego 같은 명세 부재 |
| Hook = adapter / CLI = surface | LSP (Language Server Protocol) / MCP | **Mid** | MCP 자체가 state management 표준화 중, 이동 표적 |
| Runtime 계층 (Project → Task) | DDD aggregate boundary / Saga / Process Manager | **Mid** | 1인 개발 시나리오엔 과한 계층. Temporal Workflow 가 process manager 를 흡수한 트렌드와 역행 |
| Convention as Executable Constraint | OPA Rego / dependency-cruiser / ts-morph rules | **Mid** | 자체 구현하면 toolchain 재발명. 기존 정적 분석 wrapper 권장 |
| Capability boundary hook | Capability-based security / OPA Gatekeeper | **High** | Hook timeout 누적이 latency 병목 |
| Projection invalidate + lazy regenerate | LangGraph checkpointer / DynamoDBSaver | **Mid** | LangGraph 1.2 는 checkpoint를 mandatory durable execution 으로 격상. vNext 의 "lazy" 정책은 그 반대 — staleness 트레이드오프 의식 필요 |
| daemon + MCP cross-platform | Temporal worker + MCP server | **Mid** | Temporal/Restate 가 이미 durable execution engine 시장 점유. vNext 가 동일 영역에 들어가면 차별화 어려움 |

---

## 5. Comparable Frameworks / Cases

| 사례 | 닮은 점 | 다른 점 | TimSquad 가 배울 점 | TimSquad 가 피해야 할 점 |
|---|---|---|---|---|
| **EviBound** (arXiv 2511.05524) | Evidence-bound completion, false claim 차단 | dual gate (pre + post), MLflow 같은 외부 evidence store 활용 | Verification Gate 의 "queryable run_id + required artifacts + FINISHED status" 처럼 evidence 의 derivable 범위를 좁고 명확하게 정의 | evidence store 를 jsonl 한 줄로 모든 걸 표현하려는 단순화 — schema 복잡도가 곧 다시 올라옴 |
| **Temporal** | 내부적으로 event sourcing 사용, 이벤트가 truth | durable execution engine + workflow 추상, signal/query, sleep months | "Temporal is event sourcing made developer-friendly" 의 슬로건이 핵심. **vNext 도 사용자에게 raw event ledger 를 노출하지 말고 `tsq task complete` 같은 workflow primitive 로 감싸야** | event ledger 를 직접 사용자가 운영하게 하면 schema governance / snapshot / upcasting 부담을 사용자에게 전가 |
| **LangGraph 1.2 + DynamoDBSaver** | 모든 step persistence, pause/resume, time-travel | checkpoint 단위가 graph node, mandatory durable | 90M monthly download 의 production scale 이 보여주듯 **plug-in 가능한 storage backend (Postgres/SQLite/DynamoDB)** 추상화가 필수 | jsonl 파일 한 개를 storage 로 못 박으면 멀티 사용자 / CI / cloud 가 곧바로 막힘 |
| **SLSA + in-toto** | attestation = signed evidence of process step | 공급망 보안, OCI 분산, 서명 / 키 관리 | "tamper evidence" + "automated policy" 의 분리, predicate type 별 schema 등록 | 서명/검증 인프라 없이 evidence 만 모으면 evidence 자체가 변조 가능 — vNext 도 git commit signing / sigstore 등과 결합 검토 |
| **OPA + Gatekeeper** | runtime governance, agent action 차단 | Rego policy DSL, OCI registry distribution | "platform agnostic by design" + "policies as versioned artifacts on OCI" — vNext 도 convention 을 별도 distributable bundle 로 | hook bash 안에 policy 를 그대로 박으면 cross-platform 시 모두 재구현. 정책은 코드 밖에 |
| **Claude Code 4-layer architecture** | hooks (deterministic) + skills (advisory) + subagents (isolation) + MCP (tools) | 이미 시장 표준 + 46% adoption + tool namespace 가 governance vocabulary | "Plugins extend what Claude can touch; subagents extend how Claude reasons" 의 구분 — vNext 도 "tsq CLI 가 무엇을 do 하는가 vs runtime 이 어떻게 reason 하는가" 분리 명확히 | Claude Code 의 4-layer 위에 또 4-layer 를 얹으면 **메타-메타** 가 됨. 사용자는 두 시스템 모두 학습해야 함 |
| **MCP 2026 roadmap** | stateful runtime, persistent context | 3-tier session management (sticky / Redis / migration) 표준화 중 | "remote 80% by March 2026" — vNext A13 daemon/MCP 도 local stdio 만으로는 부족 | 표준 미정 상태에서 MCP adapter 구현하면 매 분기 재작업 |
| **CloudTrail + S3 Object Lock** | append-only audit, immutable | WORM 스토리지 강제, 7년+ 보관, SCP 보호 | "logs older than 90 days are deleted by default" 처럼 retention 명시 + 분리 계정 보호 | local jsonl 파일은 `rm` 한 번에 사라짐 — A4 가 막아도 git checkout / disk failure 는 못 막음. WORM 의식 필요 |
| **Bazel / Nix reproducibility** | source → artifact 의 결정론적 매핑 | hash-based content addressing, hermetic build | content-addressed evidence (hash 기반 ID) 가 entity ID convention 의 기반이 될 수 있음 | 결정론 부재 → evidence reverify 가 의미를 잃음 |

---

## 6. Performance Review

### 예상 병목

1. **`tsq context resolve` cold path latency** — `.glog` regen + ProjectMap freshness + event tail 합산. 3초 hook timeout 안에 안 끝나면 fail-open → 강제력 소실.
2. **`.glog` 증분 regenerate 비용** — 큰 모노레포에서 event 100건/일 × 30일 = 3000 이벤트 replay. snapshot 없이는 선형 증가.
3. **`operational-events.jsonl` append + fsync** — concurrent agent 가 동시에 append 하면 file lock 경쟁. SQLite/Postgres 백엔드로 추상화 필요.
4. **Hook chain PreToolUse latency** — 8 hook × timeout 3초 = 최악 24초. Edit 1회마다 발생 가능.
5. **Evidence validator cold start** — Node.js + zod schema load + I/O. 매 `tsq event append` 마다 ~200ms 고정 비용 가능.
6. **dual-write 기간 (A11 M2.2.5)** — decisions.jsonl + operational-events.jsonl 동시 append + diff 모니터링. 1~2주 운영 중 write throughput 두 배.
7. **`tsq file impact` ProjectMap 의존** — dependsOn 그래프 전수 순회. 모노레포에서 수천 파일 traverse.

### 완화 전략

- snapshot at every N events (예: 100), 초기부터 도입
- event schema versioning + upcasting 함수 day-1
- evidence validator daemonize (cold start 제거) → A13 이 아니라 A10 단계에 미리
- Hook chain 을 단일 dispatcher 로 통합 (각 sub-check 는 in-process)
- ProjectMap freshness 를 file mtime 기반 incremental 로
- jsonl 백엔드 추상화 인터페이스 (`EventStore` interface) 부터 A10 에 박기 — 나중에 SQLite/Postgres 로 교체 가능

### 반드시 측정해야 할 지표

- `event_append_p50_ms`, `event_append_p99_ms`
- `glog_regen_duration_ms_by_event_count`
- `context_resolve_p99_ms` (hook timeout 위반율)
- `evidence_validation_failure_rate`
- `projection_staleness_window_ms` (event append → projection ready)
- `hook_chain_total_latency_ms` (PreToolUse end-to-end)
- `event_replay_cost_per_1k_events` (snapshot 평가용)
- `dual_write_divergence_count` (A11 dogfood)
- `claim_drift_caught_count` vs `claim_drift_escaped_count` (vNext 의 진짜 KPI)

---

## 7. Policy / Security Review

### 위험

1. **Append-only state 가 disk-level 에선 보호 안 됨**. A4 가 Write/Edit 차단해도 사용자 shell `rm logs/operational-events.jsonl` 한 번에 truth 가 사라진다. → **WORM storage 또는 git-backed (signed commit) 백엔드 필요**.

2. **Write/Edit 차단의 UX 리스크**. 사용자가 `decisions.jsonl` 한 줄 수정하려고 했을 때 "용서 없이 차단" + "`tsq event append` 가이드" 만 보여주면 마찰 큼. → **break-glass 모드 + audit 로그** 필요. OPA 의 strict|advisory 토글 (plan A12 가 이미 언급) 을 A4 단계에 적용.

3. **Agent capability 가 evidence 자체 위조 가능**. agent 가 `tsq evidence validate` 를 호출해 evidence 를 만들고 즉시 `tsq event append` 하면, self-issued evidence chain. → **Evidence 는 agent 외부 source (CI, test runner, build artifact) 가 만들어야 한다** 는 원칙을 schema 강제. evidence type 별 허용 producer 화이트리스트.

4. **Evidence artifact 에 secrets 포함**. test output / curl response / env dump 가 자연스럽게 들어감. → **redaction filter** (env var, base64 잠재 키 패턴, JWT 패턴) + Kubernetes audit Metadata level 같은 "what NOT to capture" 정책 명시.

5. **PII / 민감정보가 event ledger 에 박힘**. operational-events 가 immutable 이면 GDPR 우측 (right to erasure) 위반 가능. → **선택적 redaction + cryptographic erasure (per-record key, key shred) 패턴 검토**.

6. **Cross-platform adapter 가 권한을 과하게 요구**. MCP server 가 file system 전체 access 를 요구하면 사용자가 거부. → **adapter 별 minimal scope 명세** + audit.

### Mitigation 제안

- evidence schema 에 `producer: ci|test|build|manual` 필드 + manual 은 별도 강한 검증
- redaction filter 가 evidence import 전에 default-on
- break-glass `tsq event override --reason=...` + 별도 event type 으로 추적
- WORM 검토: 최소 `git add -A logs/ && git commit -S` 로 GPG-signed snapshot
- per-record cryptographic erasure 패턴 RFC 추가

---

## 8. Roadmap Review

### 순서 평가

| 단계 | plan 순서 | 평가 |
|---|---|---|
| A4 (append-only-guard) 선행 | 옳다. data loss 방지가 모든 evidence 의 prerequisite | OK |
| A9 (Evidence import + 재검증) | **위험**. 현재 evidence v0.1 산출물 위치 불명. 사실상 from-scratch 가능성 | **A9 를 두 개로 쪼개라**: A9a (산출물 위치 추적 + 가용성 결정) → A9b (import or rewrite) |
| A10 (event/evidence core walking skeleton) | OK. 단 dual-write 분리 결정은 옳다 | OK, 단 **schema versioning + snapshot 전략 명시** 추가 필요 |
| A11 (.glog / ProjectMap / dual-write / MetaIndex 격하) | **너무 크다**. 4가지 작업이 한 sprint | **쪼개라**: A11a (.glog + projection compiler) / A11b (ProjectMap + context/file CLI) / A11c (dual-write dogfood) / A11d (MetaIndex 격하) |
| A12 (capability boundary + Runtime 5계층 + Convention executable) | **너무 크다**. Runtime 5계층은 별도 정당화 필요 | **쪼개라**: A12a (capability boundary 강화) / A12b (Runtime 2~3계층, 5는 보류) / A12c (Convention validator = 기존 정적 분석 wrapper) |
| A13 (daemon + MCP + cross-platform) | MCP 2026 표준이 흐르는 중. **시기상조** | **A13 보류** — MCP 2026 roadmap 안정화 후 (Q3 2026 이후) 착수 |
| A15 (Convergence Score) 를 A10 이후로 | 옳다. event ledger 기반이라야 의미 | OK |

### 권고: 단계적 진행 (Phased Conditional)

- **Phase Alpha (4~6주, hard commitment)**: A1~A4 + A9 + A10 walking skeleton. **목표: "evidence-bound task complete" 1개 시나리오 dogfood 성공**.
- **Phase Beta (4주, conditional on Alpha PASS)**: A11a + A11b — `.glog` + ProjectMap + 2개 CLI. dogfood KPI (claim drift caught > 0, projection staleness < 1s) 측정.
- **Phase Gamma (8주+, conditional on Beta KPI)**: A11c + A11d + A12a. dual-write 운영 + MetaIndex 격하.
- **Phase Delta (보류)**: A12b/c + A13. MCP 표준 + 사용자 요구 확인 후.

### "이 작업은 너무 크다 / 쪼개라" 항목

- A9 → A9a (Evidence 산출물 위치 결정) + A9b (import or rewrite)
- A11 → A11a/b/c/d 4분할
- A12 → A12a/b/c 3분할
- A13 → 보류

---

## 9. MVP Recommendation

### 2주 안에 증명할 최소 실험 (Spike)

**가설**: "Evidence-bound task complete 가 LLM agent 의 false claim 을 실제로 잡는다"

**최소 산출물**:
- `templates/platforms/claude-code/scripts/append-only-guard.sh` (A4) + critical-state-files.yaml SSOT
- `src/lib/evidence-validator.ts` 최소 schema (zod 5 필드: `kind`, `producer`, `artifact_path`, `hash`, `produced_at`)
- `src/commands/event.ts append` 만 (verify/tail 후순위)
- `src/commands/task.ts complete` bridge
- evidence type 1개만: `test-run` (vitest output → hash → validator)

**검증 기준**:
- 가짜 PASS claim (test 실패인데 task complete 시도) 100% 차단
- 진짜 PASS claim 100% 통과
- end-to-end p99 < 500ms (cold), < 200ms (warm)

### 4주 안에 증명할 최소 runtime

- 위 + A10 4 CLI (`evidence validate`, `event append/verify/tail`, `task complete`)
- jsonl backend behind `EventStore` interface (나중에 SQLite 로 교체 가능)
- entity ID convention 초안 + 3개 entity type 만 (`task:`, `file:`, `evidence:`)
- TimSquad 자기 repo dogfood — 본인이 4주간 사용

### dogfood 성공 기준

- 4주간 본인 작업에서 **"PASS 라고 보고했는데 사실 실패였던" 사례 ≥ 1건 차단 기록**
- 작업 마찰 (Write/Edit 차단으로 인한 break-glass 사용) ≤ 5%
- 평균 `tsq event append` latency p99 ≤ 300ms
- evidence schema 가 dogfood 중 1회 미만 변경 (변경 잦으면 schema governance 실패 신호)

### 중단 기준 (Kill Criteria)

- 4주 dogfood 종료 시점에:
  - claim drift 차단 사례 0건 → 문제 자체가 가공된 가설이었음. **중단**
  - schema 변경 ≥ 2회 → schema governance 비용이 통제 불가. **재설계**
  - break-glass 사용 ≥ 30% → UX 마찰이 가치를 압도. **단순화 후 재시작**
  - p99 latency > 1s 지속 → 아키텍처 결함. **storage 백엔드 재검토**

---

## 10. Final Recommendation

**이 계획을 계속 밀어야 하는가?** — 조건부 Yes.
다만 plan 의 "A9~A13 통째로 12~15주" 가 아니라 **Phase Alpha (A4+A9+A10 walking skeleton, 4~6주) 만 hard-commit** 하고 나머지는 Phase Alpha dogfood 결과에 조건부.

**어떤 전제에서만 성공하는가?**

1. **Evidence 산출물이 외부 객관 source (CI, test runner, build artifact) 에서 나온다** 는 원칙을 schema-level 강제. agent self-issued evidence 는 별도 type + audit.
2. **Schema governance + snapshot/versioning 을 day-1 도입** — 사후 도입 불가.
3. **EventStore 인터페이스로 백엔드 추상화** — jsonl 은 dev backend 일 뿐. 실서비스는 SQLite/Postgres.
4. **Convention validator 는 자체 구현 금지** — 기존 정적 분석 도구 (ts-morph, eslint, dependency-cruiser, OPA) wrapper.
5. **MCP 어댑터는 표준 안정화 (Q3 2026+) 후 착수** — 지금은 Claude Code 단일 플랫폼.
6. **break-glass 모드 + audit 가 A4 와 동시 출시** — 차단 only 는 UX 실패.
7. **본인 repo 4주 dogfood 가 사전 게이트**. 그 전엔 외부 PR 받지 않는다.

**완성본이 어떤 사용자에게 가장 가치 있는가?**

- **Enterprise / fintech / compliance 팀** (EU AI Act 2026-08-02 발효 대응, NIST AI RMF, ISO 42001). evidence trail = audit-ready evidence.
- **AI agent 기반 자동화를 production 으로 운영하는 팀** — claim drift 가 사고로 이어지는 영역 (인프라 자동화, 데이터 마이그레이션, 결제). 즉 AI Agent Gateway 패턴 적용 대상.
- **Multi-agent 환경에서 책임 추적이 필요한 팀** — agent drift 측정이 KPI 인 조직.

**반대로 어떤 사용자에게는 과한가?**

- **1인 vibe-coding 개발자** — A4 의 Write/Edit 차단부터 마찰. Claude Code 의 "가벼움" 어드밴티지와 충돌.
- **prototype / hackathon 사용자** — evidence 생성 비용 > 작업 비용.
- **단일 phase / 단기 프로젝트** — projection / ledger 의 시간축 가치가 발생하지 않음.

**시장 차별화 평가**:
LangGraph (state 중심) / Temporal (durable execution 중심) / Claude Code skills (productivity 중심) / OPA (policy 중심) 의 *교집합* 에 vNext 가 들어간다. 차별점 후보: **"agent self-report → derivable evidence → event commit"** 의 closed-loop 을 *개발 프로세스 (PRD → spec → code → test → done)* 라는 도메인에 맞춰 표준화한 사례가 (EviBound 논문 외) 산업에 거의 없다는 점. 단, EviBound + OPA + Claude Code hooks 의 조합으로 사용자가 직접 만들 수 있는 영역이라는 점이 adoption barrier 의 본질이다.

**결론**:
방향은 학술/산업 트렌드와 정합하고 문제 진단도 정확하나, **scope 가 1인 풀타임 12~15주에 맞지 않는다**. Phase Alpha (4~6주) 까지 dogfood 로 가설을 검증한 뒤 Phase Beta 진입을 결정하는 단계적 진행, 그리고 enterprise / compliance segment 로 포지셔닝 분리를 권고한다.

---

## Sources

- [SQLServerCentral — CQRS & Event Sourcing in high-concurrency systems](https://www.sqlservercentral.com/articles/why-cqrs-and-event-sourcing-are-gaining-ground-in-high-concurrency-web-systems)
- [Java Code Geeks — CQRS and Event Sourcing in Practice (2025-10)](https://www.javacodegeeks.com/2025/10/cqrs-and-event-sourcing-in-practice-building-scalable-systems.html)
- [SLSA — in-toto and SLSA](https://slsa.dev/blog/2023/05/in-toto-and-slsa)
- [SLSA — Distributing provenance](https://slsa.dev/spec/v1.0/distributing-provenance)
- [oneuptime — Supply Chain Attestations with In-Toto (2026-02)](https://oneuptime.com/blog/post/2026-02-09-supply-chain-attestations-in-toto/view)
- [Temporal — Beyond State Machines for Reliable Distributed Applications](https://temporal.io/blog/temporal-replaces-state-machines-for-distributed-applications)
- [AWS APN — Orchestrating AI Agents with AgentCore and Temporal](https://aws.amazon.com/blogs/apn/how-temporal-uses-amazon-bedrock-agentcore-to-create-robust-ai-systems/)
- [Kai Waehner — The Rise of the Durable Execution Engine](https://www.kai-waehner.de/blog/2025/06/05/the-rise-of-the-durable-execution-engine-temporal-restate-in-an-event-driven-architecture-apache-kafka/)
- [LangChain — Durable execution docs](https://docs.langchain.com/oss/python/langgraph/durable-execution)
- [LangGraph GitHub](https://github.com/langchain-ai/langgraph)
- [AWS — Build durable AI agents with LangGraph and DynamoDB](https://aws.amazon.com/blogs/database/build-durable-ai-agents-with-langgraph-and-amazon-dynamodb/)
- [Diagrid — Checkpoints Are Not Durable Execution](https://www.diagrid.io/blog/checkpoints-are-not-durable-execution-why-langgraph-crewai-google-adk-and-others-fall-short-for-production-agent-workflows)
- [Open Policy Agent — Homepage](https://www.openpolicyagent.org/)
- [Gökhan Gökalp — Runtime Governance for AI Agents with OPA](https://gokhan-gokalp.com/runtime-governance-for-ai-agents-policy-as-code-with-opa/)
- [InfoQ — Building a Least-Privilege AI Agent Gateway with MCP, OPA, Ephemeral Runners](https://www.infoq.com/articles/building-ai-agent-gateway-mcp/)
- [Anthropic — Model Context Protocol](https://www.anthropic.com/news/model-context-protocol)
- [MCP Specification 2025-11-25](https://modelcontextprotocol.io/specification/2025-11-25)
- [CallSphere — MCP 2026 Roadmap](https://callsphere.ai/blog/model-context-protocol-mcp-2026-roadmap-scalability-enterprise-auth)
- [Anthropic — Code execution with MCP](https://www.anthropic.com/engineering/code-execution-with-mcp)
- [Obvious Works — CLAUDE.md 2026 architecture](https://www.obviousworks.ch/en/designing-claude-md-right-the-2026-architecture-that-finally-makes-claude-code-work/)
- [Ofox.ai — Claude Code: Hooks, Subagents, Skills](https://ofox.ai/blog/claude-code-hooks-subagents-skills-complete-guide-2026/)
- [alexop.dev — Claude Code Full Stack](https://alexop.dev/posts/understanding-claude-code-full-stack/)
- [AWS — CloudTrail Security Best Practices](https://docs.aws.amazon.com/awscloudtrail/latest/userguide/best-practices-security.html)
- [Kubernetes — Auditing docs](https://kubernetes.io/docs/tasks/debug/debug-cluster/audit/)
- [hoop.dev — Immutable Audit Logs for kubectl](https://hoop.dev/blog/immutable-audit-logs-for-kubectl-in-kubernetes)
- [Confluent — Real-Time Compliance & Audit Logging with Kafka](https://www.confluent.io/blog/build-real-time-compliance-audit-logging-kafka/)
- [EviBound (arXiv 2511.05524)](https://arxiv.org/pdf/2511.05524)
- [VoltAgent — Awesome AI Agent Papers 2026](https://github.com/VoltAgent/awesome-ai-agent-papers)
- [Future AGI — AI Agent Compliance and Governance 2026](https://futureagi.com/blog/ai-agent-compliance-governance-2026)

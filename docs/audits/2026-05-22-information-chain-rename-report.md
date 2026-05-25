---
type: execution-report
source: claude-code
date: 2026-05-22
session: 10607571-f6c7-4755-b805-d95daab8c6cc
artifact_kind: terminology-rename-information-chain-then-operational-context-chain
parts: 2
---

# 2026-05-22 — Information Chain / Operational Context Chain Terminology Rename Reports

이 문서는 2026-05-22(KST 5/23) vNext 핸드오프 세션에서 "Information Object" 용어를 점진적으로 보정해 나간 두 단계 작업의 Claude Code 실행 완료 보고를 통합 보존한 것이다. (1) Part 1은 "Information Object → Information Chain / Context Graph" 1차 보정 (트리거: 사용자 메시지 uuid `5af5bfd0-76be-4827-8451-77f101df6071`, 응답: uuid `9550e2bf-4790-4095-afb5-5cce76fc1e48`). (2) Part 2는 이후 2차 독립 리뷰의 발견 (Information Chain 용어가 attestation 문맥에 점유 + Context Graph는 시장에서 95% 의미 중복) 을 반영하여 주 용어를 "Operational Context Chain"으로 변경한 작업 (트리거: 사용자 메시지 uuid `ff8f14b7-4632-405c-a65b-c19a62d7502d`, 응답: uuid `0c61a52d-a9b1-46bc-880d-f8329dfa2657`). Part 2 보고는 동시에 3-Horizon + North Star Alignment 도입까지 포함한다. 원문 그대로 — 의역/요약 없음.

---

## Part 1 — Information Object → Information Chain / Context Graph 보정 (assistant uuid 9550e2bf)

## 최종 보고

### 1. 변경 파일과 줄수

| 파일 | 줄수 | 변경 |
|------|------|------|
| `docs/rfc/vnext-operational-state-runtime.md` | **503** | 6곳 in-place 교체 (헤더 2 + 본문 4) |
| `docs/improvement-plan-2026-05-22.md` | **799** | 4곳 in-place 교체 (M2.1.1 / M2.2.7 / M2.2.8 / M2.2.9 / M2.2.10) |
| `memory/vnext-direction.md` | **119** | Phase 2 한 줄 in-place 교체 |
| `docs/rfc/wave-0-automation-rfc.md` | 265 | **무수정** (지시 준수) |

### 2. "Information Object" 제거 결과

- `rg -n "Information Object" ...` → **0건** (clean)
- `rg -n "정보객체" ...` (한국어 번역어) → **0건** (clean)
- 새 용어 매칭 (Information Chain | Context Graph): RFC 8건, plan 5건, memory 1건 = **총 14곳에 정상 부착**
- "deprecated/avoid" 표기 없이 **완전 교체** 채택 (사용자 권고 "가능하면 제거" 우선)

### 3. `.glog` / ProjectMap / Ontology / Information Chain / Context Graph 역할 분리 위치

| 개념 | 정의 위치 | 역할 |
|------|----------|------|
| **`.glog`** | RFC §6 (L171~173) | **operational graph / relation substrate** — Information Chain 의 base substrate, **자체는 Information Chain 이 아님** |
| **ProjectMap** | RFC §7 (L206~208) | **object metadata / navigation metadata source** — Information Chain Resolver 가 lookup, **자체는 Information Chain 이 아님** |
| **Ontology Object Model** | RFC §19 Phase 2 (L444), plan M2.2.7 (L519) | **typed objects + relation vocabulary** (Task/Decision/File/Evidence/Phase/Entity/Constraint), Information Chain type system 기반 |
| **Information Chain Resolver** | RFC §19 Phase 2 (L446), plan M2.2.9 (L521) | Ontology + `.glog` + ProjectMap 을 task/question 기준 instantiate |
| **Information Chain / Context Graph** | RFC §19 Phase 2 (L446), plan M2.2.9 (L521), memory L105 | **agent input context 를 대체하는 제공 단위**, generated projection, NOT truth |
| **Knowledge Export** | RFC §19 Phase 2 (L447), plan M2.2.10 (L522), memory L105 | Information Chain / Context Graph → Obsidian / LLM wiki / markdown, export 결과물도 generated projection |

### 4. Canonical Truth 원칙 유지 검증

- RFC L273 (§9): `Canonical truth = operational-events.jsonl + verified evidence artifacts + source code`
- RFC L447 (§19 Knowledge Export): `Canonical truth = operational-events.jsonl + verified evidence + source code 유지`
- plan L427 (Phase 2 헤더), L522 (M2.2.10)
- memory L70 (Runtime 원칙), L105 (Phase 2 — Information Chain = generated projection, NOT truth + export 결과물도 generated projection, NOT truth)

**충돌 없음**. Information Chain Resolver 와 Knowledge Export 모두 generated projection 명시, 새 truth source 신설 없음.

### 5. A11 로 deferred 된 상세 설계 항목

- **Ontology**: 각 typed object 의 field schema, relation 종류 (uses / produces / invalidates / dependsOn / etc), relation 제약
- **Information Chain Resolver**: instantiation 알고리즘 (task/question parsing → entity 선택 → graph traversal depth → cache 전략), cold/warm latency 정책, context size 제한
- **Knowledge Export**: Obsidian frontmatter / wikilink 매핑 규칙, LLM wiki round-trip 정책, export 결과물 갱신 주기, redaction 적용 단계
- 모두 **A11 Mini-RFC (`docs/rfc/phase-gamma-rfc.md`)** 에서 정의.

### 잔존 리스크

없음 — 용어 정정만, 구현/scope 변경 없음, Wave 0/1 작업 무영향.

---

## Part 2 — Information Chain → Operational Context Chain + 3-Horizon Alignment (assistant uuid 0c61a52d)

## 최종 보고

### 1. 변경 파일과 줄수

| 파일 | 줄수 | 변경 |
|------|------|------|
| `docs/rfc/vnext-operational-state-runtime.md` | **543** (+40) | §0.5 3-Horizon North Star + H1 7축 신설, Operational Context Chain 용어 보정 |
| `docs/improvement-plan-2026-05-22.md` | **831** (+32) | 🧭 North Star Alignment 섹션 신설, Execution Model (Codex audits read-only), milestone 표 시점 표현 완화 + 진입 조건 컬럼 추가, A9 첫 작업 = Evidence 출처 추적 spike 명시 |
| `memory/vnext-direction.md` | **125** (+6) | 3-Horizon 한 섹션 + Codex audits read-only |
| `MEMORY.md` | **87** (+6) | 3-Horizon 한 섹션 + Execution Model 보정 + right-sized gate |
| `docs/rfc/wave-0-automation-rfc.md` | **306** (+41) | §12 Execution Model 보정 + §13 Go 조건 (S3+S4 우선, S1/S2 보강 후) + §14 Dogfood KPI Event Types 4종 + §15 "정당화된 yes"/Override 정책 |

### 2. 3-Horizon North Star 반영 위치

| Horizon | RFC | plan | memory | MEMORY |
|---------|-----|------|--------|--------|
| **H1** Model-agnostic Operational Harness Runtime | §0.5 (L25~46) | 🧭 §North Star Alignment | §3-Horizon | §3-Horizon |
| **H2** Harness-native Multi-session Terminal IDE | §0.5 (L48~52) | 동 | 동 | 동 |
| **H3** Provider-agnostic LLM Execution Backend | §0.5 (L54~57) | 동 | 동 | 동 |
| **현재 vNext A9~A13 = H1 하위 Operational Runtime Track** | §0.5 명시 | North Star Alignment 표에서 명시 | 한 줄 | 한 줄 |

### 3. H1 7 축 반영 위치

RFC §0.5 의 "H1 의 7 축 (scope)" 블록에 list 형태로 모두 명시:

1. Skill / Controller inventory & pruning
2. Log Taxonomy 정리 (EventLog / Evidence / TaskLog / SessionLog / Generated Views)
3. MetaIndex 격하 → ProjectMap / `.glog` / Operational Context Chain
4. TaskRuntime 기본 태스크 프로세스 강제
5. Document/View separation (source docs vs generated export)
6. Multi-platform adapters (Claude Code / Codex / Cursor / OpenCode)
7. Runtime enforcement (hooks/skills = adapters)

### 4. 2차 리뷰 Go 조건 반영 여부

| Go 조건 | 반영 상태 | 위치 |
|---------|----------|------|
| N4 해소 (dogfood KPI 자동 측정) | ✅ Wave 0 RFC §14 — 4 event types 정의 (lint_blocked_missing_prime_directive / inspect_detected_stale_claim / issue_audit_prevented_false_close / manual_override_with_reason) |
| N7 해소 (Auditor 정의) | ✅ Wave 0 RFC §12 + plan §🎭 + memory + MEMORY — **Codex audits read-only** 명시 |
| S1 escape hatch 정의 | ✅ Wave 0 RFC §15 — Q1~Q4 무조건 block / Q5 phase exit 시점 mandatory / Q6 fallback 강제 / `--override --reason=` flag + `manual_override_with_reason` event |
| Wave 0 동시 진행 금지, S3+S4 먼저 | ✅ Wave 0 RFC §13.1 (S3 + S4 즉시) + §13.2 (S1 + S2 정의 보강 후) |
| Milestone 절대 시점 → conditional | ✅ plan milestone 표 헤더: Target sizing / 진입 조건 컬럼 분리. "1주차 / 3주차" → "Target ~1주 / Conditional on M1 Exit pass" |
| A4 단독 critical slice 유지 | ✅ plan 🧭 North Star Alignment 표에 명시 — "H1 critical protection slice — Wave 1 부속 작업 때문에 지연 금지" |
| Evidence v0.1 = A9 첫 작업 spike | ✅ plan M3 행 산출물 컬럼 — "A9 첫 작업 = Evidence 산출물 출처 추적 spike (구현 아님)" |
| 12~15주 commitment 표현 완화 | ✅ plan milestone 표 후미 — "누적 sizing (rough estimate, NOT commitment)" + "hypothesis-driven roadmap" |

### 5. 용어 보정 결과

| 검사 | 결과 |
|------|------|
| `Information Object` / `정보객체` | **0 건** ✅ |
| `Information Chain / Context Graph` 병기 | **0 건** ✅ |
| `Information Chain` 단독 | **0 건** ✅ |
| `Operational Context Chain` 신규 | **15 건** (RFC + plan + memory 에 일관 부착) |
| `Context Graph` 단독 (설명어 용법) | RFC §0.5 H1 트랙 설명에 한 번 등장 — `.glog` (operational graph / relation substrate) 형태로 graph-shaped 설명만 |

### 6. canonical truth / generated projection 원칙 유지

- RFC §3 (L92~93), §9, §19 Phase 2 (Knowledge Export Compatibility) — 모두 `Canonical truth = operational-events.jsonl + verified evidence + source code` 일관 유지
- plan §🎭 Execution Model (Codex audits read-only) + §🤖 Automation Layer + §🔗 Issue Resolution Integration — 모든 산출물 분류 의무 (canonical / projection / supporting) 유지
- memory L70 + MEMORY 헤더 — `Generated projections 는 truth 가 아니며 deletable/regenerable`
- Wave 0 RFC §14 dogfood event types — 모두 "evidence type" 으로 분류, 자체 truth 아님

**충돌 없음**. 3-Horizon / H1 7축 / Operational Context Chain / Dogfood KPI events 모두 generated projection 또는 evidence artifact 로 명시.

### 7. 구현하지 않은 항목 (지시 준수)

- ❌ 새 script / CLI / source 파일 생성 0건 (`scripts/prime-directive-lint.sh`, `src/commands/rfc.ts`, `scripts/audit-issues.sh` 등 모두 미작성)
- ❌ A9~A13 폐기/재정의 없음 — H1 하위 Operational Runtime Track 으로 **재배치만**
- ❌ H2 / H3 세부 설계 / 구현 없음 — deferred horizon 으로만 명시
- ❌ Mini-RFC 추가 작성 없음 — right-sized gate 원칙만 명시
- ❌ A1~A16 본문 무수정 (cross-cutting 섹션 신설만)
- ❌ git add / commit / 파일 삭제 없음

### 8. 잔존 리스크

1. **Codex audits read-only 라는 역할이 운영 시점에 실효성을 가지려면 별도 Codex 세션의 read access 정책 + audit 결과 보고 채널이 필요** — 본 문서에 절차 부재. Wave 0 시작 시점에 별도 short spec (`docs/rfc/audit-protocol.md` 후보) 작성 권고.
2. **Mini-RFC 누적 ceremony 1주 초과 시 검토 트리거**는 plan 에 명시됐지만 자동 측정 부재 — Wave 0 dogfood KPI 에 `mini_rfc_authoring_time_per_phase` event 추가 검토 필요 (후속 RFC 보강).

---
type: audit
source: codex-external
date: 2026-05-22
session: 10607571-f6c7-4755-b805-d95daab8c6cc
artifact_kind: drift-report + 6-finding-followup
---

# 2026-05-22 — Codex External Auditor Drift Findings

이 문서는 2026-05-22 vNext 핸드오프 세션에서 외부 감사자(Codex)가 Claude Code의 산출물 보고와 repo 실측 간 불일치를 지적한 원본 메시지를 그대로 보존한 것이다. 두 부분으로 구성된다 — (1) `memory/vnext-direction.md`/`MEMORY.md` 부재로 인한 claim drift 지적 및 누락 산출물 보정 지시, (2) 같은 감사 흐름에서 이어진 6개 finding(canonical/generated 분류, Write/Edit 차단, daemon lazy invalidate, A10 축소, Evidence v0.1 톤다운, A15 critical path 모순)에 대한 후속 정리 지시. 출처: transcript JSONL의 사용자 메시지 uuid `0575c3b4-d0cf-421b-968e-d189bda2aa82` 및 `40913e21-3977-4316-9fbc-f040b0576a6b`. 원문 그대로 — 의역/요약 없음.

---

## Part 1 — Drift 지적 및 누락 산출물 보정 지시 (uuid 0575c3b4)

<ide_opened_file>The user opened the file /Users/ericson/Dev/timsquad/AGENTS.md in the IDE. This may or may not be related to the current task.</ide_opened_file>
아래 그대로 Claude Code에 붙여 넣으면 됩니다.

```text
너는 실행자다. 사용자는 감사자에게 실측을 맡겼고, 네 산출물 보고에 불일치가 발견됐다.

목표:
클로드코드 이전 보고에서 누락된 산출물을 보정하고, 기존 산출물과 계획 문서의 claim drift를 제거하라.

중요 원칙:
- 사용자에게 사소한 확인을 요구하지 마라.
- 합리적으로 판단 가능한 것은 직접 판단하고 실행하라.
- 선택지가 있어도 결과가 명백히 안전하고 되돌리기 쉬우면 묻지 말고 진행하라.
- 질문은 destructive action, 외부 서비스 상태 변경, 스펙 방향 변경처럼 되돌리기 어렵거나 의미가 큰 경우에만 하라.
- 작업 전후로 실측 명령을 실행하고, 최종 보고는 “실측 결과” 중심으로 하라.
- 새 claim을 만들면 반드시 파일 경로와 줄 수/검색 결과로 검증하라.
- 감사자가 지적한 불일치를 우선 해결하라.

감사 결과:
- 존재/줄수 일치:
  - docs/rfc/vnext-operational-state-runtime.md = 471 lines
  - docs/improvement-plan-2026-05-22.md = 593 lines
- 존재하지 않음:
  - memory/vnext-direction.md
  - MEMORY.md
- docs/improvement-plan-2026-05-22.md 안에는 memory/vnext-direction.md 신설 claim이 있음.
- 따라서 “다음 세션 자동 참조” claim은 현재 거짓이다.

해야 할 일:
1. 현재 상태 실측
   - git status --short
   - wc -l docs/rfc/vnext-operational-state-runtime.md docs/improvement-plan-2026-05-22.md
   - test -f memory/vnext-direction.md; test -f MEMORY.md
   - rg -n "vNext|Runtime = observer|NOT owner|memory/vnext-direction|A9|A10|A11|A12|A13|A14|A15|A16" docs/rfc/vnext-operational-state-runtime.md docs/improvement-plan-2026-05-22.md MEMORY.md memory/vnext-direction.md 2>/dev/null || true

2. 누락 파일 생성
   - memory/ 디렉토리가 없으면 생성하라.
   - memory/vnext-direction.md 생성.
   - MEMORY.md 생성 또는 기존 파일이 있으면 vNext 섹션과 토픽 인덱스만 갱신하라.
   - 목표 줄수는 이전 보고와 맞추되, 줄수 자체보다 “다음 세션 참조에 충분한 핵심 요약”을 우선하라.

3. memory/vnext-direction.md에 포함할 내용
   - 한 줄 정의:
     TimSquad vNext는 문서 하네스가 아니라 Evidence 기반 event commit과 lazy projection 재생성으로 stale truth를 막는 Operational State Runtime이다.
   - 핵심 목표:
     1. 트랜잭션 단위 정합성 유지
     2. 핵심 operational context 전달
   - Canonical Truth:
     operational-events.jsonl, verified evidence artifacts, source code
   - Generated Views:
     .glog, current-phase.json, task-context.json, phase reports, dashboards, handoff
   - 절대 원칙:
     Runtime = observer/validator, NOT owner
     Event append = 유일한 commit point
     Evidence = commit credential
     Report = claim, Event = canonical truth
     Projection은 invalidate 후 lazy regenerate
   - 최소 CLI:
     tsq evidence validate
     tsq event append
     tsq task complete
     tsq context resolve
     tsq file impact
   - 로드맵:
     Phase 0 append-only/evidence/entity ID
     Phase 1 event schema/minimal CLI
     Phase 2 .glog/projections/ProjectMap/MetaIndex 격하
     Phase 3 capability boundary/runtime 계층/convention executable
     Phase 4 daemon/MCP/cross-platform
   - 관련 문서 링크:
     docs/rfc/vnext-operational-state-runtime.md
     docs/improvement-plan-2026-05-22.md

4. MEMORY.md에 포함할 내용
   - vNext 방향 섹션 추가
   - topic index에 vNext / Operational State Runtime / Evidence / Event / .glog / ProjectMap / MetaIndex 격하 추가
   - memory/vnext-direction.md와 docs/rfc/vnext-operational-state-runtime.md로 연결
   - “다음 세션은 memory/vnext-direction.md를 우선 참조”라고 명시

5. claim drift 정리
   - docs/improvement-plan-2026-05-22.md의 “memory/vnext-direction.md 신설” claim이 실제 파일 생성 후 참이 되게 하라.
   - 만약 MEMORY.md 자동 로드 보장이 현재 프레임워크상 확실하지 않다면 “항상 로드”라고 쓰지 말고 “다음 세션 참조용 인덱스”로 표현을 낮춰라.

6. 검증
   - wc -l docs/rfc/vnext-operational-state-runtime.md memory/vnext-direction.md MEMORY.md docs/improvement-plan-2026-05-22.md
   - rg -n "Runtime = observer/validator|NOT owner|Evidence = commit credential|event append|tsq evidence validate|A9|A16|memory/vnext-direction" memory/vnext-direction.md MEMORY.md docs/improvement-plan-2026-05-22.md
   - git status --short

최종 보고 형식:
- 변경 파일과 실측 줄수 표
- 감사자가 지적한 불일치 2건이 어떻게 해소됐는지
- 검증 명령 결과 요약
- 남은 리스크가 있으면 1~2개만
- 불필요한 장황한 설명 금지
```

---

## Part 2 — 6 Finding 후속 정리 지시 (uuid 40913e21)

다음 지시에 대해서 어떻게 생각해? 코덱스 의견임 

"너는 실행자다. 사용자는 감사자 리뷰를 받았고, 이번 작업은 문서 계획의 claim drift와 실행 리스크를 줄이는 정리 작업이다.

목표:
vNext RFC / improvement plan / memory 문서에서 다음 5개 리뷰 finding을 반영하라.
코드 구현은 하지 말고 문서 정합성만 고쳐라.

사용자 확인 최소화 지침:
- 사소한 문구/구조 정리는 묻지 말고 직접 반영하라.
- 방향을 바꾸는 결정이 아니라 감사자가 지적한 drift 해소이므로 승인 질문하지 마라.
- destructive action 금지. 파일 삭제/대규모 재작성/기존 계획 폐기는 하지 마라.
- 새 claim을 만들면 반드시 파일/라인/검색 결과로 최종 검증하라.
- 최종 보고는 실측 중심으로 짧게 하라.

반영해야 할 리뷰 finding:

1. Canonical truth vs generated projection 분류 정리
문제:
- RFC는 .glog/current-phase/task-context를 generated view라고 하면서, 다른 곳에서는 canonical state처럼 표현한다.
- ledger 이름도 operational-events.jsonl / events.jsonl 이 섞여 있다.

수정 지침:
- canonical truth 명칭은 반드시 operational-events.jsonl 로 통일.
- .glog, current-phase.json, task-context.json은 모두 “runtime-owned generated projection/view”로 표현.
- “canonical state 파일”이라는 표현이 .glog/current-phase/task-context에 붙어 있으면 “runtime-owned generated state/projection” 등으로 변경.
- 원칙 문구 추가:
  Canonical truth = operational-events.jsonl + verified evidence artifacts + source code.
  Runtime-owned generated views = .glog + current-phase.json + task-context.json.
  Generated views are never truth and must be deletable/regenerable.

수정 대상 후보:
- docs/rfc/vnext-operational-state-runtime.md
- docs/improvement-plan-2026-05-22.md
- memory/vnext-direction.md
- MEMORY.md

2. Append-only guard 범위 강화
문제:
- A4가 Write만 block하고 Edit는 통과시키는 설계다.
- append-only 파일에서 Edit도 기존 라인 수정/삭제/전체 교체가 가능하므로 data loss 재발 가능.

수정 지침:
- A4 설명을 “Write 차단”에서 “Write/Edit 기본 차단”으로 변경.
- 허용 경로는 안전한 append-only command 또는 tsq event append 계열로 표현.
- Bash append를 무조건 권장하지 말고, vNext 기준으로는 tsq event append / tsq evidence validate 같은 runtime command를 우선 표기.
- 단, legacy 임시 운영에서는 안전한 append-only shell 사용 가능하다고 낮은 우선순위로 언급 가능.

수정 대상:
- docs/improvement-plan-2026-05-22.md A4
- 필요 시 memory/vnext-direction.md 절대 원칙

3. Daemon lazy projection 원칙 명확화
문제:
- RFC는 projection 동시 업데이트 금지, invalidate + regenerate 원칙.
- A13은 “canonical state 변경 감지 → projection 자동 갱신”처럼 표현되어 eager projection write로 오해될 수 있다.

수정 지침:
- daemon의 기본 역할은 “event 감지 → projection invalidate”로 명시.
- refresh/rebuild는 context resolve 또는 projection read 시 lazy rebuild라고 표현.
- “자동 갱신”이라는 표현은 “자동 invalidate” 또는 “lazy rebuild 트리거”로 낮춰라.
- Runtime daemon은 owner가 아니라 observer/validator/invalidator임을 유지.

수정 대상:
- docs/improvement-plan-2026-05-22.md A13
- docs/rfc/vnext-operational-state-runtime.md daemon/MCP/Phase 4 문구
- memory/vnext-direction.md 필요 시

4. A10 범위 축소 및 분리
문제:
- A10이 event schema, evidence/event validator, CLI 5개, 30+ tests, dual-write까지 한 액션에 묶여 너무 크다.
- tsq context resolve / tsq file impact는 .glog/ProjectMap 없이는 의미 있는 구현이 어렵다.

수정 지침:
- A10은 “event/evidence core walking skeleton”으로 축소.
- A10 필수 CLI는 다음으로 제한:
  - tsq evidence validate
  - tsq event append
  - tsq event verify
  - tsq event tail
  - tsq task complete 최소 bridge
- tsq context resolve / tsq file impact는 A11 또는 A11 이후로 이동/명시.
- “최소 CLI 5개” 문구가 남아야 한다면 “최종 최소 CLI surface 5개”와 “A10 구현 대상 CLI”를 구분하라.
- dual-write 1주일 시범은 A10 완료 조건이 아니라 후속 dogfood/compatibility slice로 낮춰라.

수정 대상:
- docs/improvement-plan-2026-05-22.md A10, A11, milestone M4/M5
- docs/rfc/vnext-operational-state-runtime.md §11/§19는 유지 가능하되, 구현 phase 구분을 명확히
- memory/vnext-direction.md 최소 CLI는 그대로 두되 “A10에서 모두 완성한다”는 뉘앙스가 있으면 제거

5. Evidence v0.1 완료 claim 톤다운
문제:
- 문서는 Evidence v0.1 완료를 전제로 하지만 repo 실측상 src/lib/evidence-validator.ts, event-validator.ts, 관련 unit test는 없음.
- 외부 이슈 본문/핸드오프 기준 완료일 수 있으나 현재 repo 기준으로는 “수입/재검증 대상”이다.

수정 지침:
- “Evidence v0.1 완료”를 “handoff 기준 완료 보고 / repo 반영 여부 재검증 필요”로 톤다운.
- A9를 “SSOT 등록만”이 아니라 “Evidence v0.1 산출물 수입/import + repo 내 재검증 + SSOT 등록”으로 변경.
- 13 tests claim은 “handoff reported 13 tests”로 표현하고, repo 내 테스트 확인 전에는 확정 완료로 쓰지 마라.

수정 대상:
- docs/rfc/vnext-operational-state-runtime.md §4
- docs/improvement-plan-2026-05-22.md A9
- memory/vnext-direction.md Phase 0 문구

6. A15 dependency / critical path 모순 수정
문제:
- A15는 event ledger 기반이면 A10 이후인데, vNext 제외 critical path에 포함되어 있다.

수정 지침:
- 둘 중 하나로 정리:
  Option A 권장: A15를 A10 이후 작업으로 명확히 하고 vNext 제외 critical path에서 제거.
  Option B: A15 v0은 legacy workflow/log 기반으로 제한한다고 명시.
- 감사자 의견은 Option A가 더 안전하다는 것.
- Critical Path와 milestone 문구를 이에 맞춰 수정하라.

수정 대상:
- docs/improvement-plan-2026-05-22.md A15, dependency graph, Critical Path, milestone

검증 명령:
실행 후 아래를 반드시 실행하고 결과를 최종 보고에 요약하라.

1. 줄수:
wc -l docs/rfc/vnext-operational-state-runtime.md docs/improvement-plan-2026-05-22.md memory/vnext-direction.md MEMORY.md

2. canonical 명칭 혼재 확인:
rg -n "events\\.jsonl|canonical state|automatic.*projection|projection 자동 갱신|Write.*통과|Edit.*통과|Evidence v0\\.1 완료|최소 CLI \\(5개\\)|tsq context resolve|tsq file impact|Critical Path" docs/rfc/vnext-operational-state-runtime.md docs/improvement-plan-2026-05-22.md memory/vnext-direction.md MEMORY.md

3. 원하는 정리 문구 확인:
rg -n "operational-events\\.jsonl|runtime-owned generated|generated projection|Write/Edit|tsq event verify|tsq event tail|lazy rebuild|수입|재검증|A15|A10 이후" docs/rfc/vnext-operational-state-runtime.md docs/improvement-plan-2026-05-22.md memory/vnext-direction.md MEMORY.md

4. git 상태:
git status --short

최종 보고 형식:
- 변경 파일 목록 + 줄수
- 리뷰 finding 1~6 각각 “반영됨/부분 반영/미반영” 판정
- 검증 명령 요약
- 남은 리스크 1~2개만"

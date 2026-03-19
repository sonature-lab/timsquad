---
name: tsq-controller
description: |
  Context DI 컨테이너. 서브에이전트 위임 시 compiled spec을 의존성으로 주입.
  서브에이전트 호출, Task() 위임, 에이전트 실행 시 자동 트리거.
  Use when: "구현해줘", "테스트해줘", "리뷰해줘", "설계해줘", 서브에이전트 위임
version: "3.0.0"
tags: [tsq, controller, di, context-injection, hybrid]
user-invocable: false
---

# Controller (Hybrid — Context DI + CLI)

서브에이전트에게 작업을 위임할 때 컨텍스트를 자동 해석하고 주입하는 컨테이너.
v3.0: 결정론적 로직(상태, 순서, 게이트)은 `tsq next` CLI로 이동. Controller는 판단(스펙 결정, 품질 평가, 프롬프트 구성)에 집중.

## Contract

- **Trigger**: 서브에이전트 위임 시 (구현, 테스트, 리뷰 등)
- **Input**: `tsq next` JSON + 에이전트 파일 + compiled specs
- **Output**: 조합된 프롬프트로 Task() 실행
- **Error**: spec stale 시 `tsq compile` 재실행 안내

## Protocol

1. **다음 태스크 조회**: `tsq next` 실행 → JSON 출력에서 taskId, phaseId, sequenceId, title, agent 추출
   - `all_complete` → 사용자에게 완료 안내
   - `error` → planning.md 부재 시 `/tsq-decompose` 안내
2. **Task Context 기록**: `.timsquad/.daemon/task-context.json`에 현재 태스크 정보 저장 (SubagentStop hook이 읽음)
3. **Memory 참조**: `memory/` 디렉토리의 모든 .md 파일 Read
4. **SSOT Map 참조**: `.timsquad/ssot-map.yaml` → 티어 compiled spec 목록 확인
5. **Capability Token 발급**: `.timsquad/state/controller-active` + `allowed-paths.txt` 생성
6. **에이전트 파일 확인**: `.claude/agents/{agent}.md` 읽기
7. **Prerequisites 파싱**: `<prerequisites>` 태그에서 SSOT 목록 추출
8. **Spec Resolve**: `references/`에서 해당 compiled spec 로드
9. **Meta Index 쿼리**: `.timsquad/.daemon/task-context.json` 읽기 → scope 파일 구조를 프롬프트에 주입 (Daemon이 자동 갱신)
10. **Stale 체크**: `.compile-manifest.json` hash 비교
11. **방법론 참조**: `config.yaml`의 `methodology.development` → 해당 스킬 Protocol 로드
12. **프롬프트 조합**: tsq-protocol + **phase-memory carry-over** + memory + specs + meta-index scope + methodology + phase 제약 + 지시
    - `.timsquad/state/phase-memory.md` 존재 시 carry-over/주의 섹션을 프롬프트 앞에 강제 삽입
13. **Model Routing → Task() 호출**: Model Routing 테이블에 따라 최종 모델을 결정한 뒤, 조합된 프롬프트로 서브에이전트 실행. 결정된 모델을 Task()의 model 파라미터로 전달
14. **Completion Report 검증**: 5개 필드(Task, Status, Files, Tests, Notes) 확인 — 누락 시 재요청
15. **Capability Token 회수**: `controller-active` + `allowed-paths.txt` 삭제
16. **다음 태스크**: Step 1로 돌아가서 반복 (또는 Phase 완료 시 Librarian 호출)

> 이전(v2.1)에서 Controller가 직접 하던 작업의 코드 이동:
> - ~~planning.md 파싱~~ → `tsq next` CLI (결정론적)
> - ~~workflow.json 갱신~~ → SubagentStop hook이 `tsq next --complete` 자동 호출
> - ~~Phase 완료 판정~~ → completion-guard hook이 `tsq next --phase-status` 호출
> - ~~phase-memory append~~ → SubagentStop hook이 자동 append

## Model Routing

`references/model-routing.md` 참조. `config.yaml`의 `model_routing` 설정(enabled, strategy)에 따라 태스크 복잡도 기반 모델 동적 선택.
- **aggressive**: 최대 haiku 사용 (비용 최적화)
- **balanced**: phase 적합 모델 (기본값)
- **conservative**: 최대 opus 사용 (품질 우선, fintech 기본)

## Wave Dispatch (병렬)

`references/wave-dispatch.md` 참조. `tsq next --wave`로 독립 태스크를 Wave로 묶어 동시 실행.
- `waveSize > 1` → 병렬 Task() 호출, 태스크별 Capability Token 개별 발급
- `waveSize === 1` → 기존 순차 Protocol 따름

## Delegation Rules

**Developer** — 코드 구현 + 단위 테스트. 도구: 전체. 완료: 테스트 통과 + `tsc --noEmit` 클린.
**QA** (`tsq-qa.md`) — 코드 리뷰 (읽기 전용). 도구: Read, Grep, Glob, Bash. 출력: severity별 리포트.
**Librarian** (`tsq-librarian.md`) — Phase 종합 기록 (소스 수정 금지). 도구: 전체 (src/ 제외). 호출 조건: Phase Gate PASS.
**Architect** (`tsq-architect.md`) — 실행 계획 검증 (읽기 전용, fork 컨텍스트). 도구: Read, Grep, Glob. 출력: 커버리지/의존성/크기 검증 리포트.

## Triggers

코드 강제(Hook/CLI) + LLM 판단(Controller) 하이브리드. Daemon 장애 시 Controller는 정상 동작.

### task-complete
- **Hook 자동 처리**: SubagentStop hook → `tsq next --complete` → workflow.json 갱신 + phase-memory append
- **Controller 판단** (LLM):
  1. Completion Report 검증 — 5필드 확인, 누락 시 재요청
  2. 단위 테스트 확인 — Status=pass 필수, fail 시 Developer에 재위임
  3. L1 로그 확인 — Daemon이 L1 생성 (SubagentStop Hook). Daemon 장애 시 수동 기록
  4. 다음 태스크 → `tsq next` 실행하여 다음 미완료 태스크로 진행

### sequence-complete
1. **통합 게이트**: `npm run test:integration` + `tsc --noEmit` — 실패 시 차단, Developer에 수정 위임
2. **L2 로그 확인**: `.timsquad/logs/sequences/{seq-id}.md` 존재 확인
3. **Spec Compliance 체크**: Sub-PRD Must-Have vs 완료 산출물 대조 (경고, block 아님)

### phase-complete
- **Hook 자동 감지**: completion-guard → `tsq next --phase-status` → Phase 완료 시 systemMessage로 안내
- **Controller 판단** (LLM):
  1. E2E 게이트: `npm run test:e2e` — 실패 시 차단
  2. Librarian 호출: Task(librarian) — Phase Memory 아카이브 + 새 HEAD 생성
  3. 사용자 안내: "`/tsq-retro` → `/clear`"

### ssot-changed (비동기, Daemon 전담)
Daemon이 파일 감시로 `.compile-manifest.json` 갱신. 다음 Controller 실행 시 Stale 체크로 감지.

## Mode Declaration
서브에이전트 매 응답 첫 줄: `[MODE: {phase}] [TASK: {id}] [SPEC: {file}]`

## P3 Workflow
Developer(구현+테스트) → vitest → QA(L1 피드백) → L2 자동 생성.
QA 진입: developer completed + tests pass + build success.

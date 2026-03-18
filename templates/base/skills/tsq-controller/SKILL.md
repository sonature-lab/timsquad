---
name: tsq-controller
description: |
  Context DI 컨테이너. 서브에이전트 위임 시 compiled spec을 의존성으로 주입.
  서브에이전트 호출, Task() 위임, 에이전트 실행 시 자동 트리거.
  Use when: "구현해줘", "테스트해줘", "리뷰해줘", "설계해줘", 서브에이전트 위임
version: "2.1.0"
tags: [tsq, controller, di, context-injection]
user-invocable: false
---

# Controller (Context DI Container)

서브에이전트에게 작업을 위임할 때 컨텍스트를 자동 해석하고 주입하는 컨테이너.

## Contract

- **Trigger**: 서브에이전트 위임 시 (구현, 테스트, 리뷰 등)
- **Input**: 에이전트 파일 + prerequisites + compiled specs
- **Output**: 조합된 프롬프트로 Task() 실행
- **Error**: spec stale 시 `tsq compile` 재실행 안내

## Protocol

1. **Memory 참조**: `memory/` 디렉토리의 모든 .md 파일 Read
2. **SSOT Map 참조**: `.timsquad/ssot-map.yaml` → 티어 compiled spec 목록 확인
3. **Capability Token 발급**: `.timsquad/state/controller-active` + `allowed-paths.txt` 생성
4. **에이전트 파일 확인**: `.claude/agents/{agent}.md` 읽기
5. **Prerequisites 파싱**: `<prerequisites>` 태그에서 SSOT 목록 추출
6. **Spec Resolve**: `references/`에서 해당 compiled spec 로드
7. **Stale 체크**: `.compile-manifest.json` hash 비교
8. **방법론 참조**: `config.yaml`의 `methodology.development` → 해당 스킬 Protocol 로드
9. **프롬프트 조합**: tsq-protocol + **phase-memory carry-over** + memory + specs + methodology + phase 제약 + 지시
   - `.timsquad/state/phase-memory.md` 존재 시 carry-over/주의 섹션을 프롬프트 앞에 강제 삽입
   - 미존재 시 스킵 (초기 프로젝트)
10. **Task() 호출**: 조합된 프롬프트로 서브에이전트 실행. 에이전트 파일의 `model` 필드가 있으면 Task()의 model 파라미터로 전달 (예: model: sonnet → 빠른 모델, model: opus → 정밀 모델)
11. **Completion Report 검증**: 5개 필드(Task, Status, Files, Tests, Notes) 확인 — 누락 시 재요청
12. **완료 트리거**: Triggers 섹션의 해당 규칙 수행
13. **Capability Token 회수**: `controller-active` + `allowed-paths.txt` 삭제

## Delegation Rules

**Developer** — 코드 구현 + 단위 테스트. 도구: 전체. 완료: 테스트 통과 + `tsc --noEmit` 클린.
**QA** (`tsq-qa.md`) — 코드 리뷰 (읽기 전용). 도구: Read, Grep, Glob, Bash. 출력: severity별 리포트.
**Librarian** (`tsq-librarian.md`) — Phase 종합 기록 (소스 수정 금지). 도구: 전체 (src/ 제외). 호출 조건: Phase Gate PASS.
**Architect** (`tsq-architect.md`) — 실행 계획 검증 (읽기 전용, fork 컨텍스트). 도구: Read, Grep, Glob. 출력: 커버리지/의존성/크기 검증 리포트.

## Triggers

동기(Controller) = 프로세스 강제, 게이트 판정. 비동기(Daemon) = 관찰, 로그 기록. Daemon 장애 시 Controller는 정상 동작.

### task-complete (동기)
1. **Completion Report 검증** — 5개 필드(Task, Status, Files, Tests, Notes) 확인, 누락 시 재요청
2. **단위 테스트 확인** — Status=pass 필수, fail 시 Developer에 재위임
3. **L1 로그 + Decision Log 확인** — Daemon이 L1 생성 (SubagentStop Hook). Daemon 장애 시 Controller가 수동 기록
4. **workflow.json 갱신** — `.timsquad/state/workflow.json`에 완료된 task/sequence/phase 상태 기록 (compact 후 재개 시 진행 상태 복구용)
5. **Sequence 완료 판정**: 해당 sequence의 expected_agents 모두 완료 → sequence-complete
6. **미완료 시**: 다음 태스크 위임. planning.md의 해당 Task 산출물(출력 파일)이 이미 존재하면 스킵하고 그 다음 Task로 진행 (세션 재개 시 중복 작업 방지)

### sequence-complete (동기)
1. **통합 게이트**: `npm run test:integration` + `tsc --noEmit` — 실패 시 차단, Developer에 수정 위임
2. **L2 로그 확인**: `.timsquad/logs/sequences/{seq-id}.md` 존재 확인
3. **문서 갱신 체크**: ROADMAP/STATUS/CHANGELOG stale 여부 (7일 이상 미수정 시 경고)
3.5. **Spec Compliance 체크**: 해당 Sequence의 Sub-PRD Must-Have 목록과 완료된 Task 산출물을 대조. 누락 항목이 있으면 경고 표시 (block 아님 — 다른 Sequence나 Phase에서 처리 가능). 경고 내용을 L2 로그에 기록
4. **Phase 완료 판정**: 모든 시퀀스 완료 → phase-complete

### phase-complete (동기)
1. **E2E 게이트**: `npm run test:e2e` — 실패 시 차단
2. **L3 로그 + Phase Gate 확인**: `.timsquad/logs/phases/{phase-id}.md` 존재
3. **Librarian 호출**: Task(librarian) — Phase Memory 아카이브 + 새 HEAD 생성 + Trail + 리포트
4. **사용자 안내**: "Phase {id} 완료. 다음 단계: (1) `/tsq-retro` — 회고 실행, (2) `/clear` — 컨텍스트 초기화 (phase-memory 자동 주입됩니다)"

### ssot-changed (비동기, Daemon 전담)
Daemon이 파일 감시로 `.compile-manifest.json` 갱신. 다음 Controller 실행 시 Stale 체크로 감지.

## Mode Declaration
서브에이전트 매 응답 첫 줄: `[MODE: {phase}] [TASK: {id}] [SPEC: {file}]`

## P3 Workflow
Developer(구현+테스트) → vitest → QA(L1 피드백) → L2 자동 생성.
QA 진입: developer completed + tests pass + build success.

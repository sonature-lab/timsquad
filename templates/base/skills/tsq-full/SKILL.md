---
name: tsq-full
description: |
  Controller 경유 풀 파이프라인 실행. Phase-Sequence-Task DAG를 순차적으로 진행하며
  각 단계마다 게이트 검증(unit→integration→e2e), Librarian 기록, Phase Memory carry-over를 수행한다.
  세션이 끊겨도 workflow.json에서 마지막 위치를 복원하여 이어서 진행한다.
  Use when: "/tsq-full", "전체 구현", "풀 파이프라인", "본격적으로 시작",
  "새 기능 개발", "인증 시스템 구현", "결제 모듈 만들어", "대규모 리팩토링",
  "Phase 진행", "Phase 2부터", "파이프라인 재개", "이어서 진행",
  또는 planning.md 기반으로 여러 태스크를 연속 실행해야 할 때.
  다단계 기능, 여러 파일/모듈에 걸친 구현, 아키텍처 변경이면 이 스킬을 사용한다.
version: "1.0.0"
tags: [tsq, full, controller, pipeline]
user-invocable: true
---

# /tsq-full — Controller 경유 풀 파이프라인

Phase-Sequence-Task 전체 워크플로우를 Controller 경유로 실행한다.
planning.md 기반으로 체계적 구현, 게이트 검증, Librarian 기록까지 수행하는 이유:
다단계 작업에서 각 Phase의 산출물이 다음 Phase의 입력이 되므로, 게이트로 품질을 보장하지 않으면
후속 작업에서 누적 결함이 발생하기 때문이다.

## Pre-conditions

1. **planning.md 필수**: `.timsquad/ssot/planning.md` 존재 확인
   - 없으면 → "`/tsq-decompose`로 실행 계획을 먼저 생성하세요" 안내
2. **SSOT 충족**: PRD + requirements 최소 작성 완료
   - 미충족 → "`/tsq-start`로 온보딩을 먼저 진행하세요" 안내

## Protocol

1. **다음 태스크 조회**: `tsq next` CLI 실행 → 다음 미완료 태스크 JSON 확인
   - `all_complete` → 모든 태스크 완료. 사용자에게 안내
   - `error: planning.md not found` → `/tsq-decompose` 안내
2. **Controller 풀 실행** (tsq-controller Protocol 전체 수행):
   - `tsq next`가 반환한 태스크부터 순차 진행
   - Sequence 내 Task 위임 (Developer → QA)
   - 게이트 검증: unit → integration → e2e
   - Librarian 호출 (Phase 완료 시)
   - Phase Memory carry-over
3. **Phase 완료 안내**: "`/tsq-retro` 회고 → `/clear` 컨텍스트 초기화"

> workflow.json 갱신은 SubagentStop hook이 `tsq next --complete`를 자동 호출하여 처리.
> Phase 완료 감지는 completion-guard hook이 `tsq next --phase-status`를 호출하여 처리.

## Resumption

세션이 끊긴 후 `/tsq-full`을 다시 실행하면:
- `tsq next`가 workflow.json 기반으로 다음 미완료 Task를 자동 결정
- 이미 완료된 Task는 자동 스킵
- 컨텍스트 압축 후에도 phase-memory.md의 Progress 섹션에서 진행 상황 복원

## vs /tsq-quick

| 항목 | /tsq-full | /tsq-quick |
|------|-----------|-----------|
| Phase-Sequence-Task | O (전체) | X (단일) |
| Controller 경유 | O | O |
| SSOT/메모리 참조 | O | O |
| 게이트 | unit → integration → e2e | unit만 |
| Librarian 호출 | O | X |
| planning.md 필요 | O | X |

## Usage

```
/tsq-full
/tsq-full Phase 2부터 재개
```

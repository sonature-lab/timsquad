---
title: Wave Dispatch
category: reference
---

# Wave Dispatch — 병렬 서브에이전트 실행

## 개요

`tsq next --wave` 실행 시 의존성이 충족된 독립 태스크를 Wave로 반환.
Controller는 Wave 내 태스크를 동시에 Task() 호출하여 속도를 3-5x 향상.

## 프로토콜

1. `tsq next --wave` 실행 → `{ wave: [...tasks], waveSize, parallel }` JSON
2. `waveSize === 1` → 단일 태스크, 기존 순차 Protocol 12-16 따름
3. `waveSize > 1` → 병렬 디스패치:
   a. 각 태스크에 대해 개별 Capability Token 발급 (`.timsquad/state/cap-{taskId}`)
   b. 각 태스크의 Model Routing 독립 수행
   c. 모든 Task()를 동시 호출 (Agent tool 병렬 호출)
   d. 모든 완료 후 각 Completion Report 검증
   e. 개별 Capability Token 회수
4. Wave 완료 → 다시 Step 1로 (다음 Wave 조회)

## 의존성 분석 규칙

- `dependencies` 없는 태스크: 즉시 실행 가능
- `dependencies` 있는 태스크: 모든 선행 태스크 완료 후 실행 가능
- 같은 Sequence 내 태스크도 의존성 없으면 병렬 가능
- 순환 의존성 감지 시: fallback으로 첫 번째 태스크만 반환

## Capability Token (병렬)

```
# 순차 (기존)
.timsquad/state/controller-active
.timsquad/state/allowed-paths.txt

# 병렬 (Wave)
.timsquad/state/cap-P1-S001-T001
.timsquad/state/cap-P1-S001-T002
```

병렬 실행 시 각 태스크에 독립 토큰을 발급하여 격리. 완료 시 개별 회수.

## 제약

- 같은 Phase 내 태스크만 Wave로 묶음 (Phase 간 병렬 불가)
- Wave 내 태스크가 같은 파일을 수정하면 충돌 가능 — outputs 필드로 사전 감지
- Wave 크기 상한: 5 (Claude Code 동시 에이전트 제한)

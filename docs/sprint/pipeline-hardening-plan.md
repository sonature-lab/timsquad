# Pipeline Hardening Plan v2

> 경쟁 하네스(Superpowers, OMC, Claude Harness) 베스트 프랙티스 적용 + 3개 에이전트 교차 리뷰 반영
>
> **상태**: Phase 1 + Phase 2 완료 (2026-03-18)

## 목표

기존 파이프라인 강화 및 단순화. TimSquad 고유 강점(SSOT, 4계층 메모리, 타입별 맞춤) 유지하면서 검증된 패턴 흡수.

## 핵심 차별화 포인트 (유지/강화)

1. **Document-Code Coherence** — SSOT 역추적 + Drift Detection
2. **Anti-Amnesia Development** — 4계층 메모리 + phase-memory 링크드리스트
3. **SSOT-Aware Process** — 의존성 그래프 기반 검증

---

## Phase 1: SKILL.md + Hook 수정만 (TypeScript 변경 없음)

### 1-A. SSOT Plan Validator

**출처**: Superpowers Plan Review → SSOT 역추적 검증으로 재정의
**작업**:
- `tsq-decompose/SKILL.md` Step 6 → Step 6.5 추가: Controller에 Reviewer 위임 요청
- `tsq-controller/SKILL.md` Delegation Rules에 Plan Reviewer 추가
- Reviewer(fork 컨텍스트)가 planning.md 검증:
  - Sub-PRD Must-Have 100% 커버리지
  - DAG 의존성 무결성
  - Task 크기 적절성 (1 에이전트 1 세션)
- Reviewer 결과를 Human Checkpoint(Step 7)에서 함께 제시
**변경 파일**: tsq-decompose/SKILL.md, tsq-controller/SKILL.md
**난이도**: 낮음

### 1-B. TDD Gate 강화

**출처**: Superpowers TDD 강제 → 블록 + 우회 가능으로 조정
**작업**:
- `completion-guard.sh`: implementation phase에서 소스 변경 + 테스트 파일 미변경 → block
  - `git diff --cached` + `git diff` + `git ls-files --others` union (untracked 포함)
  - Completion Report Notes에 "refactor-only" 명시 시 우회 허용
- tsq-tdd Hook은 현행 prompt 유지 (코드 삭제 강제 없음)
**변경 파일**: completion-guard.sh (~15줄 추가)
**난이도**: 낮음
**주의**: false positive — 리팩토링 시 테스트 미변경은 정당. escape hatch 필수

### 1-D. 모델 필드 전달

**출처**: OMC 모델 라우팅 → 정적 매핑으로 축소
**작업**:
- Controller Protocol Step 10에 1줄 추가: "에이전트 파일의 `model` 필드를 Task() 호출 시 model 파라미터로 전달하라"
- 동적 complexity 라우팅 안 함 — 에이전트 파일의 정적 model 필드로 충분
**변경 파일**: tsq-controller/SKILL.md (1줄)
**난이도**: 최소

### 1-E. Spec Compliance 경고 (sequence-complete)

**출처**: Superpowers 2단계 리뷰 → sequence-complete로 이동, 경고로 축소
**작업**:
- Controller sequence-complete 트리거에 추가:
  - Sub-PRD Must-Have vs Sequence 산출물 매핑 → 누락 시 경고(systemMessage)
  - block 아님 — 다음 Phase에서 처리 가능
- 전체 tsq-audit는 수동 호출 유지 (자동 호출 안 함)
**변경 파일**: tsq-controller/SKILL.md (sequence-complete에 3줄)
**난이도**: 낮음

### 1-C'. 멱등성 재개 (병렬 디스패치 대안)

**원안 1-C 보류 사유**: Capability Token 단일 에이전트 가정, 파일 충돌, LLM 병렬 호출 비보장
**대안 작업**:
- Controller에 "이미 산출물이 존재하는 Task는 스킵하고 다음 Task로" 지시 추가
- 세션 끊김 후 재개 시 완료된 Task를 반복하지 않음
**변경 파일**: tsq-controller/SKILL.md (1줄)
**난이도**: 최소
**재개 조건**: Claude Code concurrent subagent 공식 지원 시 1-C 원안으로 복귀

---

## Phase 2: TypeScript 변경 포함

### 2-B'. 토큰 메트릭 (회고용)

**출처**: OMC 토큰 HUD → 실시간 아닌 회고 메트릭으로 조정
**작업**:
- `session-state.ts`: 기존 tokenInput/tokenOutput 필드를 세션별 누적 (~5줄)
- `tsq-status/SKILL.md`: 출력에 `Tokens (est): {total}` 추가
- 실시간 HUD 아님 — /tsq-status 호출 시에만 표시
**변경 파일**: src/daemon/session-state.ts, tsq-status/SKILL.md
**난이도**: 낮음

### 2-F. SSOT Drift Detection (신규)

**출처**: 차별화 리뷰어 제안 — 경쟁 하네스 0개 보유 기능
**작업**:
- Daemon이 git diff로 소스 변경 감지 시, 관련 SSOT 문서 last_reviewed 비교
- 7일 이상 미갱신 → /tsq-status에 "Drift Warning" 표시
- phase-complete에서 Librarian이 drift 항목을 carry-over로 기록
**변경 파일**: src/daemon/event-queue.ts (~20줄), tsq-status/SKILL.md, tsq-librarian/SKILL.md
**난이도**: 중간

---

## 삭제 항목

| 항목 | 삭제 사유 | 리뷰어 판정 |
|------|-----------|-------------|
| 1-C 병렬 디스패치 | Capability Token 충돌, 플랫폼 미지원 | CONCERN + RISKY |
| 2-A 동적 complexity 라우팅 | 에이전트 파일 정적 model로 충분 | DROP |
| 2-C 매 task-complete 리뷰 | 기존 3단계 검증과 중복, 비용 과다 | DROP + CONCERN |
| 3-A Visual Brainstorm | CLI 프레임워크 정체성 불일치 | DROP |

---

## 실행 순서

```
Phase 1 (SKILL.md + Hook만)
  1. 1-B  TDD Gate 강화        ← 의존성 없음
  2. 1-D  모델 필드 전달         ← 의존성 없음
  3. 1-C' 멱등성 재개           ← 의존성 없음
  4. 1-A  SSOT Plan Validator   ← decompose + controller
  5. 1-E  Spec Compliance 경고  ← controller (1-A 이후)

Phase 2 (TypeScript)
  6. 2-B' 토큰 메트릭
  7. 2-F  SSOT Drift Detection
```

---

## 교차 리뷰 요약

### 아키텍처 리뷰
- 1-A, 1-B: PASS. 기존 패턴(context:fork, completion-guard) 확장
- 1-C: CONCERN. Capability Token 단일 에이전트 가정 위반 → 보류
- 2-B: PASS. session-state.ts 인프라 이미 존재
- 2-C: CONCERN. task-complete 단계 과다 → sequence-complete로 이동

### 실현가능성 리뷰
- 1-A: FEASIBLE. context:fork 패턴 검증됨. Controller 경유로 구조화
- 1-B: FEASIBLE. git diff untracked 보완 필요 (ls-files --others)
- 1-C: RISKY. LLM 병렬 Agent tool 호출 강제 불가
- 2-A: FEASIBLE. 에이전트 파일 model 필드 이미 존재, 정적 매핑 충분
- 2-B: INFEASIBLE(hook 직접). Daemon 간접 경로로 변경

### 차별화 리뷰
- 1-A: ADAPT → SSOT 역추적 검증으로 재정의
- 1-B: ADAPT → 강제 삭제 아닌 블록 + 우회
- 1-C: ADOPT → 보류 (플랫폼 대기)
- 2-A: DROP → 플랫폼 종속, 정체성 희석
- 2-B: ADAPT → 회고 메트릭으로
- 2-C: DROP → 기존 3단계 검증 충분
- 추가 제안: SSOT Drift Detection, Cross-Session Learning, Project Type Intelligence

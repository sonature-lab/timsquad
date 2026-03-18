---
name: tsq-decompose
description: |
  Sub-PRD에서 Phase-Sequence-Task 계획을 자동 생성하는 스킬.
  기능 요구사항을 의존성 분석하여 DAG 기반 실행 계획으로 분해.
  Use when: "태스크 분해", "계획 생성", "decompose", "분해", "플래닝",
  "실행 계획", "Phase 계획", 또는 Sub-PRD가 작성된 후 실행 계획이 필요할 때.
version: "1.0.0"
tags: [tsq, planning, decompose, task, dag]
user-invocable: true
---

# /tsq-decompose — 자동 태스크 분해

Sub-PRD의 요구사항을 분석하여 Phase-Sequence-Task 구조의 실행 계획을 자동 생성한다.

## Concepts

```
Phase   = Topological Layer (순차 실행, 이전 Phase 완료 필요)
Sequence = Parallel Batch (동일 Phase 내 병렬 실행 가능 단위)
Task     = Atomic Work Unit (단일 에이전트가 수행하는 최소 작업)
```

- Phase ID: `P{N}` (P1, P2, ...)
- Sequence ID: `P{N}-S{NNN}` (P1-S001, P1-S002, ...)
- Task ID: `P{N}-S{NNN}-T{NNN}` (P1-S001-T001, ...)

## Process

### Step 1: Sub-PRD 스캔

1. `.timsquad/ssot/prd/` 하위 Sub-PRD 파일 전체 읽기
2. 각 Sub-PRD에서 Must-Have(P0) 요구사항 추출
3. Should-Have(P1)는 별도 Phase 후순위 배치

### Step 2: 의존성 분석

요구사항 간 의존성 그래프 구성:

```
데이터 모델 → API 구현 → UI 구현
인증 → 권한 기반 기능
공통 컴포넌트 → 화면별 구현
```

의존성 판단 기준:
- **데이터 의존**: 테이블/스키마가 필요한 기능은 DB 설계 후
- **API 의존**: API가 필요한 UI는 API 구현 후
- **기능 의존**: Sub-PRD 간 명시적 참조

### Step 3: DAG 정렬 → Phase 배치

1. Topological sort로 의존성 레이어 계산
2. 같은 레이어 = 같은 Phase
3. Phase 내에서 독립적인 작업 그룹 = Sequence
4. Sequence 내 개별 작업 = Task

Phase 배치 관례:
| Phase | 일반적 내용 |
|:---:|------|
| P1 | 인프라/DB 스키마/공통 설정 |
| P2 | 핵심 API + 비즈니스 로직 |
| P3 | UI/UX 구현 |
| P4 | 통합 + E2E 테스트 |
| P5+ | 보안 감사, 성능 최적화, 배포 |

### Step 4: Task 상세화

각 Task에 포함할 정보: Task ID, 설명, 담당 에이전트, 입력(SSOT refs, 선행 산출물), 출력(코드, 테스트, 문서), 완료 기준.

### Step 5: Traceability 매핑 (Layer A)

각 Sub-PRD의 Mapped Artifacts 테이블에 생성된 Task ID를 역링크:

```markdown
| Type | ID | Link |
|------|----|------|
| Tasks | P1-S001-T001~T003 | [planning.md](../planning.md#P1-S001) |
```

### Step 6: planning.md 생성

`.timsquad/ssot/planning.md`에 Phase-Sequence-Task 전체 계획 작성.
각 Sequence에 PRD 역방향 링크 포함 (Layer B):

```markdown
### Sequence S001: Authentication (PRD: [prd/auth](./prd/auth.md))
| Task ID | Description | Agent | PRD Ref | FR Ref |
|---------|-------------|-------|---------|--------|
| P1-S001-T001 | DB schema | dba | prd/auth | FR-AUTH-001 |
```

### Step 6.5: Plan Review (자동)

planning.md 생성 후 Controller에 Plan Reviewer 위임 요청. Reviewer(fork 컨텍스트)가 Sub-PRD 커버리지 100%, DAG 무결성, Task 크기(1에이전트 1세션), Phase 배치 순서를 검증. 결과를 Step 7에서 함께 제시.

### Step 7: Human Checkpoint

생성된 계획을 사용자에게 제시하고 컨펌을 받는다:
- Phase별 요약 (목표, 예상 Task 수, 핵심 산출물)
- 의존성 그래프 (mermaid)
- 수정/추가/삭제 요청 반영 후 확정

## Output

- `.timsquad/ssot/planning.md` — 확정된 실행 계획
- Sub-PRD Mapped Artifacts 업데이트 (Layer A 링크)
- 의존성 그래프 (mermaid diagram in planning.md)

## Rules

- Sub-PRD가 없으면 실행 불가 → `/tsq-grill` 먼저 안내
- 사용자 컨펌 없이 실행 계획 확정 금지
- Task 1개 = 에이전트 1명이 1회 세션에 완료 가능한 크기
- 순환 의존성 발견 시 사용자에게 알리고 해결책 제시
- planning.md 이외 SSOT 문서는 Mapped Artifacts 테이블만 수정

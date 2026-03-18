# Daemon Improvement & Phase Memory — 구현 계획

Issue #20 (스킬 주도 파이프라인 안정화)과 연계된 데몬 개선 + Decision Log + Phase Memory 통합 계획.

## 배경

### 현재 문제
1. **Daemon이 Controller 역할 중복 수행** — event-queue.ts가 sequence gate, phase gate, workflow 자동 진행을 실행하여 Controller를 우회 (#20)
2. **L1 로그 semantic 비어있음** — `semantic: {}` 항상 빈 객체, 서브에이전트의 의사결정 이유 소실
3. **Phase 간 컨텍스트 단절** — Phase 완료 후 /clear 시 이전 사고과정이 완전히 소실
4. **서브에이전트 Lossy Handoff** — Completion Report의 5필드만 반환, 판단 근거/보류 항목/대안 검토 내용 유실

### 설계 원칙
- **Daemon = 관찰자 + 수집자** (workflow 진행은 Controller만)
- **파일시스템 = 공유 메모리** (서브에이전트가 작업 중 decisions.jsonl에 기록)
- **슬라이딩 윈도우 기억** (현재 Phase + 직전 Phase 요약만 유지)

---

## 메모리 계층

```
작업 기억 (Phase 진행 중)
  └── .timsquad/state/decisions.jsonl     ← 에이전트가 매 결정마다 append

최근 기억 (다음 Phase에 주입)
  └── .timsquad/state/phase-memory.md     ← Phase 완료 시 Librarian이 생성 (~50줄)

중기 기억 (필요 시 참조)
  └── .timsquad/trails/phase-{id}.md      ← Phase 전체 사고과정 아카이브

장기 기억 (영구)
  └── L1/L2/L3 로그 + 메트릭 + 회고        ← 기존 유지
```

## 전체 흐름

```
Phase N 진행 중:
  서브에이전트 작업 → decisions.jsonl에 append (Protocol 규칙)
  Daemon 관찰 → L1 로그 생성 (semantic에 decisions 포함) + session-notes

Phase N 완료 시 (Controller phase-complete trigger):
  Controller: Phase Gate 판정 (동기, 유일한 workflow 진행자)
  Librarian:
    1. Phase Trail 추출 → trails/phase-{id}.md
    2. Phase Memory 생성 → state/phase-memory.md (~50줄)
    3. decisions.jsonl 아카이브 → trails/에 이동, 새 파일 생성
    4. 종합 리포트 + Context Note (기존)
  /clear 또는 새 세션

Phase N+1 시작 시:
  context-restore.sh → phase-memory.md 읽어서 systemMessage 주입
```

---

## Part A: Daemon 역할 정리 (관찰 전용으로 축소)

### A1. event-queue.ts — Controller 중복 로직 제거

**파일**: `src/daemon/event-queue.ts` (489줄 → ~200줄 목표)

**제거할 로직**:

| 메서드 | 줄 | 제거 대상 | 이유 |
|--------|-----|----------|------|
| `handleSequenceComplete` | 209-325 | Gate 실행 (tsc, integration test), workflow 상태 변경, architect auto-invoke | Controller 역할 |
| `handlePhaseComplete` | 329-398 | Phase gate 체크, phase transition, Librarian auto-invoke | Controller 역할 |
| task-complete 내 | 177-204 | 자동 sequence-complete 큐잉 (`this.enqueue`) | Controller 역할 |

**유지할 로직**:

| 메서드 | 역할 |
|--------|------|
| `handleTaskComplete` (축소) | L1 JSON 생성 (git diff + mechanical + semantic) + pending.jsonl |
| `handleSourceChanged` | 메타인덱스 마킹 (기존) |
| `handleSSOTChanged` | SSOT 자동 recompile (기존) |
| `handleSessionEnd` | shutdown 호출 (기존) |

**축소 후 handleTaskComplete**:
```
1. Git diff → mechanical 데이터 수집
2. decisions.jsonl에서 해당 agent 결정 추출 → semantic 필드
3. L1 JSON 생성 (.timsquad/logs/tasks/)
4. pending.jsonl 기록 (메타인덱스용)
5. (끝 — workflow 상태 변경, sequence 자동 큐잉 하지 않음)
```

**handleSequenceComplete, handlePhaseComplete**:
- 메서드 자체를 삭제하거나 로그 생성(L2/L3 JSON)만 남기고 gate/transition 로직 제거
- Gate 실행, workflow 진행, Librarian/Architect 호출은 모두 Controller trigger에서 수행

### A2. DaemonEvent 타입 축소

**파일**: `src/daemon/event-queue.ts`

```typescript
// 변경 전
export type DaemonEvent =
  | { type: 'task-complete'; ... }
  | { type: 'sequence-complete'; ... }  // 제거
  | { type: 'phase-complete'; ... }     // 제거
  | { type: 'source-changed'; ... }
  | { type: 'ssot-changed'; ... }
  | { type: 'session-end' };

// 변경 후
export type DaemonEvent =
  | { type: 'task-complete'; agent: string; timestamp: string; baseline?: SubagentBaseline }
  | { type: 'source-changed'; paths: string[] }
  | { type: 'ssot-changed'; paths: string[] }
  | { type: 'session-end' };
```

sequence-complete, phase-complete는 Controller의 동기 trigger로만 처리.

### A3. Controller trigger 보강

**파일**: `templates/base/skills/tsq-controller/SKILL.md`

Triggers 섹션에서 Controller가 유일한 workflow 진행자임을 명확히:

```markdown
### task-complete (동기)
1. Completion Report 검증 — 5개 필드 확인
2. 단위 테스트 확인
3. **L1 로그 + Decision Log 확인** — semantic 필드에 결정 포함 여부
4. Sequence 완료 판정 → sequence-complete 진행 여부 결정
5. 다음 태스크 위임

### sequence-complete (동기)
1. 통합 게이트: `npm run test:integration` + `tsc --noEmit`
2. L2 로그 확인
3. 문서 갱신 체크
4. Phase 완료 판정 → phase-complete 진행 여부 결정

### phase-complete (동기)
1. E2E 게이트
2. L3 로그 + Phase Gate 확인
3. **Librarian 호출** (Trail 추출 + Memory 생성 + 리포트)
4. 회고 안내: `/tsq-retro`
```

---

## Part B: Decision Log 시스템

### B1. Protocol에 Decision Log 규칙 추가

**파일**: `templates/base/skills/tsq-protocol/SKILL.md`

서브에이전트 Protocol 섹션에 추가:

```markdown
## Decision Log

중요한 판단이 있을 때 `.timsquad/state/decisions.jsonl`에 한 줄 append한다.
모든 판단을 기록할 필요 없음 — 아래 기준에 해당할 때만.

기록 기준:
- 기술 선택 (라이브러리, 패턴, 아키텍처)
- 대안을 검토하고 하나를 선택한 경우
- 의도적으로 보류하거나 스킵한 항목
- 예상과 다른 동작을 발견한 경우
- 리스크를 인지하고 수용한 경우

형식 (JSON, 한 줄):
{"agent":"developer","decision":"JWT 선택","reason":"stateless, MSA 확장","alternatives":["session"],"carry_over":false}

필드:
| 필드 | 필수 | 설명 |
|------|------|------|
| agent | Yes | 에이전트 이름 |
| decision | Yes | 무엇을 결정했는지 (1줄) |
| reason | Yes | 왜 그렇게 했는지 (1줄) |
| alternatives | No | 검토한 대안 목록 |
| carry_over | No | 다음 Phase에서 처리 필요 시 true |
| risk | No | 인지된 리스크 |
```

### B2. L1 로그 semantic 필드 활용

**파일**: `src/daemon/event-queue.ts`

handleTaskComplete에서 decisions.jsonl의 해당 에이전트 항목을 L1 로그 semantic에 포함:

```typescript
private async getAgentDecisions(agent: string): Promise<object[]> {
  const decisionsPath = path.join(this.projectRoot, '.timsquad', 'state', 'decisions.jsonl');
  if (!await fs.pathExists(decisionsPath)) return [];
  const content = await fs.readFile(decisionsPath, 'utf-8');
  return content.split('\n')
    .filter(l => l.trim())
    .map(l => { try { return JSON.parse(l); } catch { return null; } })
    .filter(d => d && d.agent === agent);
}

// handleTaskComplete 내:
const decisions = await this.getAgentDecisions(agent);
const taskLog = {
  ...기존 필드,
  semantic: { decisions },
};
```

---

## Part C: Phase Memory 시스템

### C1. Librarian Trail 추출 + Memory 생성

**파일**: `templates/base/skills/tsq-librarian/SKILL.md`

Protocol 4단계 → 7단계로 확장:

```markdown
## Protocol

1. **L1/L2 로그 수집**: `.timsquad/logs/` 하위 해당 Phase 로그 전체 읽기
2. **Decision Log 수집**: `.timsquad/state/decisions.jsonl` 읽기
3. **SSOT 상태 확인**: `.compile-manifest.json` hash 비교 → stale 목록 식별
4. **Phase Trail 작성**: `.timsquad/trails/phase-{id}.md` 생성
   - 작업 요약 (L1/L2/L3에서 뭘 했는지)
   - 주요 의사결정 (decisions.jsonl에서 추출, 이유 포함)
   - 막혔던 점과 해결 방법
   - 보류/carry-over 항목 (carry_over: true인 결정들)
5. **Phase Memory 생성**: `.timsquad/state/phase-memory.md` (~50줄)
   - 이전 Phase 한 줄 요약
   - 핵심 결정 (최대 5개, carry_over 우선)
   - 주의사항 (risk 있는 결정)
   - carry-over 항목 (다음 Phase에서 처리할 것)
6. **Decision Log 아카이브**:
   - decisions.jsonl → trails/phase-{id}-decisions.jsonl 복사
   - decisions.jsonl 초기화 (빈 파일)
7. **종합 리포트 + Context Note 작성** (기존)
```

### C2. context-restore.sh Phase Memory 주입

**파일**: `templates/platforms/claude-code/scripts/context-restore.sh`

기존 4단계 뒤에 Phase Memory 주입 추가:

```bash
# 5. Phase Memory (이전 Phase 요약)
PHASE_MEMORY="$PROJECT_ROOT/.timsquad/state/phase-memory.md"
if [ -f "$PHASE_MEMORY" ]; then
  MEMORY_CONTENT=$(head -50 "$PHASE_MEMORY" 2>/dev/null || echo "")
  if [ -n "$MEMORY_CONTENT" ]; then
    CONTEXT="$CONTEXT
[Phase Memory]
$MEMORY_CONTENT"
  fi
fi
```

### C3. trails/ 디렉토리 초기화

**파일**: `scripts/init.sh`, `src/lib/template.ts`

`.timsquad/trails/` 디렉토리 생성 추가.

---

## Part D: 문서 업데이트

### D1. file-structure 문서

**파일**: `docs/file-structure.md`, `docs/file-structure.en.md`

trails/, decisions.jsonl, phase-memory.md 추가:

```
.timsquad/
  ├── /state
  │   ├── decisions.jsonl              # Decision Log (Phase 중 누적)
  │   ├── phase-memory.md              # 이전 Phase 요약 (슬라이딩 윈도우)
  │   └── ...
  ├── /trails                          # Phase별 사고과정 아카이브
  │   ├── phase-planning.md
  │   ├── phase-planning-decisions.jsonl
  │   └── ...
```

### D2. SDCA 문서 반영

**파일**: `docs/sdca-architecture.md`

Daemon 역할 정의를 "관찰 + 수집"으로 업데이트, Phase Memory 계층 추가.

### D3. architecture-review 결과 반영

**파일**: `docs/architecture-review-2026-03-17.md`

#20 관련 데몬 개선 상태 업데이트.

---

## 작업 순서

```
Part A: Daemon 역할 정리
  A1. event-queue.ts Controller 중복 제거 (489→~200줄)
  A2. DaemonEvent 타입 축소
  A3. Controller trigger 보강
  → npm test

Part B: Decision Log
  B1. tsq-protocol Decision Log 규칙
  B2. event-queue.ts semantic 필드 활용
  → npm test

Part C: Phase Memory
  C1. tsq-librarian Trail + Memory 확장
  C2. context-restore.sh Phase Memory 주입
  C3. trails/ 디렉토리 초기화
  → npm test

Part D: 문서
  D1. file-structure 업데이트
  D2. SDCA 반영
  D3. architecture-review 반영
  → 최종 npm test → 커밋
```

## 영향 범위

| Part | 파일 | 변경 유형 | 리스크 |
|------|------|----------|--------|
| A1 | src/daemon/event-queue.ts | ~300줄 삭제 | 중간 (기존 자동화 동작 변경) |
| A2 | src/daemon/event-queue.ts | 타입 축소 | 낮음 |
| A3 | tsq-controller/SKILL.md | trigger 보강 | 낮음 |
| B1 | tsq-protocol/SKILL.md | 섹션 추가 | 낮음 |
| B2 | src/daemon/event-queue.ts | semantic 필드 | 낮음 |
| C1 | tsq-librarian/SKILL.md | Protocol 확장 | 낮음 |
| C2 | context-restore.sh | 주입 추가 | 낮음 |
| C3 | scripts/init.sh, template.ts | mkdir 추가 | 낮음 |
| D* | docs/ | 문서만 | 없음 |

## 테스트 영향

- **A1이 가장 큰 변경**: event-queue 관련 테스트가 있다면 수정 필요
- 스킬 수정(A3, B1, C1)은 SKILL.md만이므로 테스트 영향 없음
- init/template 변경(C3)은 통합 테스트에서 디렉토리 확인 가능
- semantic 필드 변경(B2)은 필드 추가이므로 기존 테스트 깨지지 않음

## 완료 기준

- [x] Daemon이 workflow 진행하지 않음 (L1 생성 + 관찰만) — event-queue.ts 489→186줄
- [x] Controller가 유일한 sequence/phase 진행자 — tsq-controller SKILL.md trigger 보강
- [x] 서브에이전트가 decisions.jsonl에 판단 기록 — tsq-protocol Decision Log 규칙 추가
- [x] L1 로그 semantic에 decisions 포함 — getAgentDecisions() 구현
- [x] Phase 완료 시 Trail + Memory 생성 — tsq-librarian v2.0 Protocol 7단계
- [x] 다음 Phase에서 phase-memory.md 자동 주입 — context-restore.sh Step 4
- [x] trails/ 디렉토리에 Phase별 아카이브 누적 — template.ts + init.sh
- [x] 전체 테스트 통과 — 636/636 (2026-03-17)

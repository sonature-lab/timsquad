# Sprint Context Notes (시방서) — 2026-03-09

**작성일**: 2026-03-09
**스프린트**: v4 Architecture — SSOT Pipeline + Methodology Enforcement
**문서 목적**: 결정의 이유와 관련 자료의 위치를 기록

---

## 1. 결정 기록 (Decision Log)

### D-001: 3-Phase 구조 (SSOT 인프라 → 방법론+게이트 → 기록+통합)

- **결정**: Phase 0 (SSOT 인프라) → Phase 1 (방법론+테스트게이트) → Phase 2 (기록+통합)
- **이유**: SSOT Map 티어링(#23)이 Controller 주입(#24)과 Tier 0 Hook(#25)의 전제조건. 방법론 강제(#28)는 Controller Protocol(#24)과 Init(#27) 완료 후에만 가능. Librarian(#29)과 통합검증(#33)은 모든 구성요소 완료 후
- **대안 검토**: 2-Phase (인프라+방법론 / 기록+통합) 가능했으나, 테스트 게이트(#30)가 방법론에 의존하므로 Phase 1에서 순차 필요
- **관련 자료**: `docs/sprint/sprint-2026-03-09.md` Dependency Map

### D-002: SSOT Map 4-Tier 설계

- **결정**: Tier 0 (상시/Hook) → Tier 1 (Phase/Controller) → Tier 2 (Sequence) → Tier 3 (Task)
- **이유**: 모든 문서를 항상 주입하면 토큰 예산 초과. 빈도와 범위에 따라 분류하여 필요한 것만 주입
- **제약**: Tier 0 합계 500자 이하 (Hook systemMessage 예산), Tier 1-3 합계 2000자 이하
- **참조**: proposal-v4-architecture.md Section 3

### D-003: 데몬 역할 분담 — 센서 + 기계적 작업

- **결정**: 데몬 = 감지(FileWatcher) + 기계적 실행(tsq compile build, 로그 생성). AI 판단 필요 작업 = Controller → Librarian
- **이유**: 데몬은 Node.js 프로세스로 Claude 서브에이전트를 호출할 수 없음. AI 판단이 필요한 문서 작성/갱신은 Controller가 Librarian 서브에이전트를 호출
- **대안 검토**: 데몬에서 Claude API 직접 호출 가능하나, 토큰 비용 + 아키텍처 복잡도 증가로 불필요
- **관련 자료**: Sprint Design Discussion (2026-03-08)

### D-004: Librarian 권한 — Write/Edit 허용, src/ 금지

- **결정**: `allowed-tools: Read, Write, Edit, Grep, Glob, Bash` + .claude/rules/로 소스 코드 수정 금지
- **이유**: Librarian이 리포트와 SSOT 상태 문서를 작성해야 하므로 Write/Edit 필수. 소스 코드 수정은 Developer 역할이므로 rules/로 경로 제한
- **대안 검토**: Read-only(Explore agent) → 수정 불가능하여 기록 역할 수행 불가
- **참조**: proposal Section 6.3

### D-005: 테스트 게이트 — 방법론 무관 공통

- **결정**: Task(unit), Sequence(integration+build), Phase(e2e) 3단계 게이트는 방법론(TDD/BDD/None)과 무관하게 항상 적용
- **이유**: 테스트 검증은 개발 방법론에 관계없이 코드 품질의 기본 보장. TDD는 "언제 테스트를 작성하는가"이고, 게이트는 "테스트가 통과하는가"
- **참조**: proposal Section 5

### D-006: Init 프롬프트 확장 — 점진적 선택

- **결정**: 기존 5개 질문 + 방법론(#6) + 아키텍처(#7) + Stack 인터랙티브(#8) 추가
- **이유**: 이 선택들이 스킬 배포와 controller 행동에 직접 영향. 하드코딩 제거
- **제약**: `-y` 옵션 시 기본값 사용 (tdd, none, empty stack). 질문이 과다해지지 않도록 아키텍처는 optional
- **참조**: proposal Section 7

### D-007: Controller triggers/delegation 구조

- **결정**: controller SKILL.md 아래에 `triggers/` (상황별 행동) + `delegation/` (역할별 위임 규칙)
- **이유**: 모든 로직을 SKILL.md 본문에 넣으면 120줄 제한 초과. 상황별 파일로 분리하면 필요 시에만 참조 가능
- **참조**: Sprint Design Discussion

### D-008: SSOT 자동 컴파일 디바운스

- **결정**: SSOT 파일 변경 감지 후 2초 디바운스, 마지막 변경 후 1회만 compile 실행
- **이유**: 에디터에서 저장 시 연속 이벤트 발생 가능. 매번 compile 실행하면 불필요한 리소스 소모
- **제약**: compiled spec은 `.claude/skills/controller/` 경로에 출력 → `.timsquad/ssot/` 밖이므로 무한 루프 없음

---

## 2. 관련 자료 위치 (Resource Map)

### 스프린트 문서
| 파일 | 설명 |
|------|------|
| `docs/sprint/sprint-2026-03-09.md` | 스프린트 총괄 |
| `docs/sprint/2026-03-09/phase-0-plan.md` | Phase 0 상세 |
| `docs/sprint/2026-03-09/phase-1-plan.md` | Phase 1 상세 |
| `docs/sprint/2026-03-09/phase-2-plan.md` | Phase 2 상세 |
| `docs/sprint/2026-03-09/context-notes.md` | 본 문서 (시방서) |
| `docs/proposal-v4-architecture.md` | 설계 근거 (전체) |
| `docs/sprint/work-protocol.md` | 작업 프로세스 프로토콜 (재사용) |

### 핵심 변경 대상 파일

#### Phase 0
| 파일 | 역할 | 관련 이슈 |
|------|------|-----------|
| `src/types/ssot-map.ts` | SSOT Map 타입 정의 (신규) | #23 |
| `src/lib/ssot-map.ts` | SSOT Map 로더/파서 (신규) | #23 |
| `templates/base/ssot-map.yaml` | 기본 템플릿 (신규) | #23 |
| `src/commands/compile.ts` | compile에 ssot-map 통합 | #23 |
| `src/commands/init.ts` | ssot-map.yaml 배치 | #23 |
| `templates/base/skills/controller/SKILL.md` | Protocol 개선 | #24 |
| `templates/base/skills/controller/triggers/` | 상황별 트리거 (신규) | #24 |
| `templates/base/skills/controller/delegation/` | 위임 규칙 (신규) | #24 |
| `templates/platforms/claude-code/scripts/skill-inject.sh` | Tier 0 주입 확장 | #25 |
| `templates/base/skills/review/SKILL.md` | context:fork 적용 | #26 |
| `templates/base/skills/audit/SKILL.md` | context:fork 적용 | #26 |
| `templates/base/skills/spec/SKILL.md` | argument-hint 추가 | #26 |

#### Phase 1
| 파일 | 역할 | 관련 이슈 |
|------|------|-----------|
| `src/commands/init.ts` | 방법론/아키텍처/Stack 프롬프트 | #27 |
| `src/lib/skill-generator.ts` | getMethodologySkills() | #27 |
| `src/types/config.ts` | methodology.architecture 타입 | #27 |
| `templates/base/skills/controller/SKILL.md` | 방법론 참조 Protocol | #28 |
| `templates/base/skills/controller/delegation/developer.md` | 방법론 주입 규칙 | #28 |
| `templates/base/skills/methodology/tdd/SKILL.md` | 스킬 레벨 hooks | #28 |
| `templates/platforms/claude-code/scripts/completion-guard.sh` | Task 게이트 | #30 |
| `src/daemon/event-queue.ts` | Sequence 게이트 | #30 |
| `src/commands/log.ts` | Phase 게이트 (buildPhaseGateData) | #30 |
| `templates/base/ssot/test-strategy.md` | 테스트 전략 SSOT (신규) | #30 |
| `templates/platforms/claude-code/rules/` | 경로별 규칙 (신규) | #32 |

#### Phase 2
| 파일 | 역할 | 관련 이슈 |
|------|------|-----------|
| `templates/base/agents/tsq-librarian.md` | Librarian 에이전트 (신규) | #29 |
| `templates/base/skills/librarian/SKILL.md` | Librarian 스킬 (신규) | #29 |
| `src/daemon/event-queue.ts` | ssot-changed 핸들러 | #31 |
| `src/daemon/index.ts` | SSOT FileWatcher 경로 | #31 |

---

## 3. 이슈 간 교차 참조

```
#23 <-> #24: SSOT Map 스키마 → Controller가 참조하는 기준
#23 <-> #25: SSOT Map tier-0 → skill-inject.sh가 주입하는 문서 목록
#24 <-> #28: Controller Protocol → 방법론 참조 단계 추가
#26 <-> #29: context:fork 패턴 → Librarian에 동일 적용
#27 <-> #28: Init 방법론 선택 → Controller가 읽는 config 값
#28 <-> #30: 방법론 강제 → 테스트 게이트와 무관 (공통 적용)
#29 <-> #31: Librarian 에이전트 → SSOT 자동 컴파일과 역할 분담
#30 <-> #33: 테스트 게이트 → 통합 시나리오 C에서 검증
```

---

## 4. 미결 사항 (Open Items)

| ID | 내용 | 결정 시점 | 담당 | 상태 |
|----|------|-----------|------|------|
| O-001 | SSOT Map 초기 문서 목록 — proposal 기준 vs 프로젝트별 커스텀 | Phase 0 시작 시 | Architect | 미결 |
| O-002 | 아키텍처 패턴 선택지 확정 (layered/clean/hexagonal vs monolith/modular/microservice) | Phase 1 #27 | PM | 미결 |
| O-003 | 테스트 게이트 실패 정책 — hard block vs warning + override | Phase 1 #30 | PM | 미결 |
| O-004 | Librarian 호출 빈도 — Phase 완료 시만 vs Sequence 완료 시도 포함 | Phase 2 #29 | PM | 미결 |
| O-005 | 스킬 레벨 hooks Claude Code 지원 여부 확인 | Phase 1 #28-C | Developer | 미결 |

---

## 5. 이전 스프린트와의 연속성

| 스프린트 | 핵심 성과 | 이번 스프린트에서 활용 |
|----------|-----------|----------------------|
| 2026-03-07 (13 issues) | 데몬 L2/L3, Phase Gate, Controller 전제조건 | 테스트 게이트(#30) workflow.ts 확장 |
| 2026-03-08 (5 issues) | skill-inject.sh, 스킬 표준화, completion-guard | Tier 0 확장(#25), 게이트 확장(#30) |

### 변경하지 않는 것 (이전 스프린트 보존)
- 기존 Hook 순서 (append-only 원칙)
- 스킬 표준화 구조 (Contract/Protocol/Verification)
- 데몬 L1/L2/L3 자동화 (event-queue.ts 기존 핸들러)
- SSOT 컴파일러 핵심 로직 (compiler.ts, compile-rules.ts)
- Phase Gate 시스템 (phase-checklist.yaml)

---

## 6. 외부 참조 (Research Sources)

| 소스 | 내용 | 적용 |
|------|------|------|
| proposal-v4-architecture.md | v4 전체 설계안 (13 섹션) | 전체 스프린트 방향 |
| Claude Code Skills Docs | context:fork, allowed-tools, argument-hint, rules/ | #26, #29, #32 |
| Claude Code Hooks Reference | 스킬 레벨 hooks, UserPromptSubmit | #28-C, #25 |
| 이전 스프린트 work-protocol.md | 역할 배치, CCTV, 리마인더, 교차 검증 | 전체 작업 프로세스 |
| Sprint Design Discussion (03-08) | 데몬 역할, Librarian 권한, SSOT Map + Meta Index | D-003, D-004 |

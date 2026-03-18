# Pipeline Total Audit Report

> 2026-03-18 | 6-Agent Parallel Audit + 5-Agent Cross-Verification
> Phase 1: Dead Code, Hook Scenario, SKILL.md Cross-Ref, Daemon Deep, CLI & Template, E2E Pipeline
> Phase 2: 5 Cross-Verification Agents on all 18 Critical items

---

## Executive Summary

| Severity | Initial | After Cross-Verify | Description |
|----------|---------|-------------------|-------------|
| **CRITICAL** | 18 | **14** | 파이프라인 깨짐, 데이터 손실, 보안 우회 |
| **WARNING** | 33 | 33 | 잠재적 문제, 엣지케이스 미처리 |
| **INFO** | 23+ | 23+ | 개선 권장, 스타일, 문서 불일치 |
| **Coverage Gap** | 20 files | 20 files | src/ 37개 중 20개 테스트 0건 |
| **Dead Code** | — | ~1,400 lines | 72 unused exports, 17 dead files |

교차 검증으로 4건 재분류:
- C-06 `rm -rf /` 정규식: CRITICAL → **기각** (첫 번째 대안이 매칭함)
- C-12 `updateFiles()`: CRITICAL → **INFO** (의도적 스텁)
- C-13 `pending.jsonl`: CRITICAL → **WARNING** (소비자 존재, `tsq mi update`로 수동 소비)
- C-10, C-11: CRITICAL → **WARNING** (이론적 TOCTOU, 발현 확률 낮음)

---

## CRITICAL Issues — 교차 검증 완료 (14건)

### P0: 파이프라인 실제 깨진 경로 (5) — 전부 확인됨

| ID | 위치 | 문제 | 교차 검증 |
|----|------|------|----------|
| C-01 | `template.ts:37` vs `daemon/index.ts:27` | CLAUDE.md에서 `.timsquad/.daemon/daemon.pid` 안내, 실제는 `.timsquad/.daemon.pid` | **확인**. .gitignore(L562)는 올바른 경로. 오류는 CLAUDE.md 안내 텍스트 1곳 |
| C-02 | `pre-compact.sh:37`, `context-restore.sh:42` | `workflow.json`의 `.currentPhase` 읽기 — 이중 오류: 잘못된 파일 + 잘못된 키 | **확인**. 올바른 소스는 `current-phase.json`의 `.current // .current_phase // .phase` |
| C-03 | `event-queue.ts:232` | auto-compile 대상 `skills/controller` — 실제는 `skills/tsq-controller` | **확인**. `'controller'` → `'tsq-controller'` 수정 필요 |
| C-04 | `safe-guard.sh:12`, `phase-guard.sh:14` | `read -t 1 -r line` — multi-line JSON 시 첫 줄만 읽고 나머지 버림 | **확인**. `cat` 방식으로 통일 필요. completion-guard, check-capability는 이미 `cat` 사용 |
| C-05 | `workflow-state.ts` vs Controller | workflow.json 파이프라인에서 갱신 안 됨 | **확인** (E2E 시나리오에서 발견). 설계 이슈 — 단기 수정보다 아키텍처 결정 필요 |

### P1: 보안 및 데이터 무결성 (4) — 확인됨

| ID | 위치 | 문제 | 교차 검증 |
|----|------|------|----------|
| C-07 | `check-capability.sh:17` | `INPUT=$(cat)` stdin timeout 없음 | **확인** (초기 감사). Claude Code가 pipe를 닫으면 문제 없으나 구조적 취약점 |
| C-08 | `check-capability.sh:60-63` | deny 출력에 `hookSpecificOutput` 래퍼 누락 | **확인**. 다른 모든 hook은 `hookSpecificOutput` 사용 |
| C-09 | `index.ts:318-326` | SIGTERM 이중 수신 시 gracefulStop 중복 실행 | **확인**. `shuttingDown` 플래그 추가 필요 |
| C-15 | `compiler.ts:477` | SSOT Map Tier 0 `exists()` 상대경로 호출 — CWD 의존적 | **확인**. `path.join(controllerDir, srcFile)` 등 절대경로 변환 필요 |

### P2: 데드코드 및 잘못된 연결 (2) — 확인됨

| ID | 위치 | 문제 | 교차 검증 |
|----|------|------|----------|
| C-14 | 3 scripts in `scripts/` | `e2e-marker.sh`, `change-scope-guard.sh`, `e2e-commit-gate.sh` 배포되지만 settings.json 미등록 | **확인**. 의도적 비활성화인지 누락인지 결정 필요 |
| ~~C-06~~ | ~~`safe-guard.sh:33`~~ | ~~`rm -rf /` 정규식 우회~~ | **기각**. 첫 번째 대안 `-[a-zA-Z]*f[a-zA-Z]*\s+/*$`가 매칭함 |

### P3: 스킬 참조 깨짐 (3) — 이름 불일치 확인됨

| ID | 위치 | 문제 | 교차 검증 |
|----|------|------|----------|
| C-16 | Controller Delegation Rules L44 | "Reviewer" 에이전트 참조 — `tsq-reviewer.md` 없음 | **확인**. 실제 매핑 대상: `tsq-qa.md` |
| C-17 | Controller Delegation Rules L46 | "Plan Reviewer" 에이전트 참조 — 에이전트 파일 없음 | **확인**. 실제 매핑 대상: `tsq-architect.md` (fork 컨텍스트) |
| C-18 | Controller P3 Workflow L79-80 | "QA" 역할 사용하지만 Delegation Rules에 미등록 | **확인**. C-16과 동일 근본 원인 — "Reviewer"와 "QA"가 같은 `tsq-qa.md`를 가리킴 |

### 재분류된 항목 (4건: CRITICAL → WARNING/INFO)

| ID | 원래 | 변경 | 사유 |
|----|------|------|------|
| C-06 | CRITICAL | **기각** | `rm -rf /` 첫 번째 정규식 대안이 매칭. 오보 |
| C-10 | CRITICAL | **WARNING** | session-state TOCTOU — 이론적 위험, 발현 확률 낮음 |
| C-11 | CRITICAL | **WARNING** | PID 파일 TOCTOU — 이론적 위험, 사용자 동시 실행 희박 |
| C-12 | CRITICAL | **INFO** | `updateFiles()` 빈 함수 — 의도적 스텁 (주석 명시) |
| C-13 | CRITICAL | **WARNING** | `pending.jsonl` 소비자 존재 (`tsq mi update`로 수동). 자동 소비 없을 뿐 |

---

## WARNING Issues (33 + 3 재분류 = 36)

### Hook 관련 (10)

| ID | 위치 | 문제 |
|----|------|------|
| W-01 | `safe-guard.sh` | base64 인코딩 우회 가능 |
| W-02 | `safe-guard.sh` | 문자열 리터럴 false positive (`echo "rm -rf /"` 차단) |
| W-03 | `safe-guard.sh:39` | `git push origin main --force` (flag 위치 다르면 우회) |
| W-04 | `completion-guard.sh:93` | `refactor-only` 바이패스가 `.transcript` 필드 의존 — Stop hook input에 없을 수 있음 |
| W-05 | `check-capability.sh` | allow 시 JSON 미출력 (빈 stdout) |
| W-06 | `check-capability.sh:61` | deny 메시지에 이스케이프 안 된 내용 → JSON 깨짐 가능 |
| W-07 | `context-restore.sh:72` | TOTAL_LINES=0 시 0 나누기 → script crash |
| W-08 | `build-gate.sh:33` | staged-only 변경 미감지 (`--cached` 누락) |
| W-09 | Cross-hook | 훅 간 stdin 읽기 방식 불일치 (read vs cat) |
| W-10 | Cross-hook | Phase 상태 파일 소스 불일치 (`current-phase.json` vs `workflow.json`) |

### Daemon 관련 (9 + 2 재분류 = 11)

| ID | 위치 | 문제 |
|----|------|------|
| W-10b | `session-state.ts:41-133` | read-modify-write 이론적 레이스 (재분류: C-10→W) |
| W-10c | `index.ts:50-53` | PID 파일 TOCTOU (재분류: C-11→W) |
| W-11 | `event-queue.ts:85-86` | `eventLog` 배열 무한 성장 (메모리 누수) |
| W-12 | `event-queue.ts:166-178` | `decisions.jsonl` 전체 읽기 per task-complete (대형 파일 시 병목) |
| W-13 | `meta-cache.ts:204-222` | IPC 메시지 크기 제한 없음 (메모리 고갈 벡터) |
| W-13b | `pending.jsonl` | 자동 소비 없음, 파일 무한 성장 가능 (재분류: C-13→W) |
| W-14 | `meta-cache.ts:224` | IPC 서버 `EADDRINUSE` 에러 미처리 |
| W-15 | `index.ts:64` | `appendFileSync` 동기 I/O — 이벤트 루프 차단 |
| W-16 | `index.ts:262` | `baseline as undefined` 타입 캐스팅 — 타입 안전성 소실 |
| W-17 | `shutdown.ts:148-153` | 토큰 메트릭 세션별만 기록 — 누적 아님 |
| W-18 | `jsonl-watcher.ts:102-128` | 파일 truncate 시 offset > size → 영구 미처리 |
| W-19 | `session-state.ts:87-93` | `recentTools`, `recentFiles` 무한 성장 |

### CLI & Template 관련 (7)

| ID | 위치 | 문제 |
|----|------|------|
| W-20 | `init.ts:64-66` | 잘못된 `--type` + `-y` → 비대화형 환경에서 hang |
| W-21 | `template.ts:485-487` | 마커 하나만 존재 시 → 중복 블록 생성 |
| W-22 | `template.ts:482-484` | end 마커가 start 앞에 오면 CLAUDE.md 깨짐 |
| W-23 | `update.ts:255` | CLAUDE.md 변경 없어도 항상 "synced" 보고 |
| W-24 | `compiler.ts:395-398` | 200자 미만 SSOT 문서 무조건 스킵 |
| W-25 | `utils/fs.ts:84-87` | 중복 `getTemplatesDir()` (ESM 비호환 + 데드코드) |
| W-26 | package.json | `@swc/core` (~150MB) production dependency — optional이 적절 |

### SKILL.md 관련 (7)

| ID | 위치 | 문제 |
|----|------|------|
| W-27 | `tsq-protocol` | 120줄 — 테스트 한계치 도달 |
| W-28 | `tsq-controller` | `tsq compile` CLI 참조 — 현재 CLI에 없을 수 있음 |
| W-29 | `tsq-audit` vs `tsq-product-audit` | "Phase gate 전 품질 확인" 트리거 중복 |
| W-30 | `tsq-testing` | tsq-tdd 참조하면서 TDD 사이클 중복 서술 |
| W-31 | `tsq-tdd` frontmatter | `hooks` 필드 — 파싱 안 될 수 있는 데드 설정 |
| W-32 | `tsq-start` | `onboarding-progress.json` 경로 불일치 (bare vs full path) |
| W-33 | `tsq-grill`, `tsq-decompose` | 파이프라인 핵심 스킬이면서 tsq-protocol 미참조 |

---

## Dead Code Findings

### Dead Files (17)

| 카테고리 | 파일/디렉토리 | 규모 |
|---------|-------------|------|
| SSOT Compiler 클러스터 | `compiler.ts`, `compile-rules.ts`, `ssot-map.ts` | ~963줄 |
| 레거시 스크립트 | `scripts/` 디렉토리 (12파일) | ~200줄+ |
| 레거시 설치 | `install/install.sh` | 1파일 |
| 미등록 Hook | `e2e-marker.sh`, `change-scope-guard.sh`, `e2e-commit-gate.sh` | 3파일 |

> 주의: `compiler.ts`는 `event-queue.ts:231`에서 dynamic import됨. 그러나 C-03(잘못된 경로)으로 사실상 무효.

### Unused Exports (72개)

| 모듈 | 미사용 export 수 |
|------|----------------|
| `utils/` (colors, date, fs, yaml, prompts) | 22 |
| `lib/meta-index.ts` | 9 |
| `lib/project.ts` | 7 |
| `daemon/context-writer.ts` | 6 |
| `lib/log-utils.ts` | 5 |
| `lib/config.ts` | 3 |
| 기타 (types, workflow-state, skill-generator, upgrade-backup 등) | 20 |

---

## Meta Index 현황

| 컴포넌트 | 상태 |
|---------|------|
| `rebuildIndex()` (init/update) | 작동 |
| `MetaCache` IPC 서버 | 작동 (스킬에서 쿼리하는 곳 없음) |
| `updateFiles()` | 의도적 스텁 (향후 구현 예정) |
| `pending.jsonl` | daemon이 기록, `tsq mi update`로 수동 소비 |
| **34개 스킬 중 meta-index 참조** | **0개** |
| **Controller에서 meta-index 주입** | **없음** |

결론: 인프라는 완성, 스킬 레이어 연결 끊어짐. 데몬이 IPC 서버를 띄우지만 아무도 쿼리하지 않는 상태.

---

## Test Coverage Map

### 테스트 0건 파일 (20개)

| 영역 | 파일 |
|------|------|
| Commands | `update.ts`, `daemon.ts` |
| Daemon | `index.ts`, `meta-cache.ts`, `jsonl-watcher.ts`, `file-watcher.ts`, `session-state.ts`, `context-writer.ts`, `shutdown.ts`, `entry.ts` |
| Lib | `ssot-map.ts`, `meta-index.ts`, `update-check.ts`, `ast-parser.ts`, `ui-parser.ts`, `ui-index.ts` |
| Utils | `colors.ts`, `fs.ts`, `date.ts`, `yaml.ts`, `prompts.ts` |

### 기존 테스트 이슈
- `event-queue.test.ts`: Drift Detection만 테스트. task-complete, session-end, concurrent enqueue 미테스트
- `feedback.test.ts`: 파일명이 삭제된 피드백 라우팅 시스템 이름 — 실제는 workflow integration 테스트
- `template.test.ts`: mock에 삭제된 `ACTIVE_AGENTS`/`DELEGATION_RULES` 필드 잔존

---

## Fail Strategy 문서 vs 실제

| 문서 (MEMORY.md) | 실제 |
|-------------------|------|
| "Fail-closed 5 + Fail-open 2" | 정책 위반 시 Fail-closed 맞음. **입력 파싱 실패 시** 7개 모두 fail-open |
| safe-guard: Fail-closed | 정책 위반=deny, 입력 없음=allow |
| phase-guard: Fail-closed | 정책 위반=deny, 입력 없음=allow |
| check-capability: Fail-closed | 정책 위반=deny, controller-active 없음=allow |

---

## 수정 우선순위 (교차 검증 반영)

### Tier 1: 즉시 수정 (실제 깨진 파이프라인 복구)

| # | ID | 작업 | 파일 | 난이도 |
|---|-----|------|------|--------|
| 1 | C-01 | PID 경로 `.daemon/daemon.pid` → `.daemon.pid` | `template.ts:37` | 1줄 |
| 2 | C-02 | Phase 읽기: workflow.json → current-phase.json + jq 키 수정 | `pre-compact.sh:37`, `context-restore.sh:42` | 각 2줄 |
| 3 | C-03 | auto-compile 경로 `controller` → `tsq-controller` | `event-queue.ts:232` | 1줄 |
| 4 | C-04 | stdin 읽기 `read -t 1` → `INPUT=$(cat 2>/dev/null)` | `safe-guard.sh:12`, `phase-guard.sh:14` | 각 1줄 |
| 5 | C-08 | deny 출력 `hookSpecificOutput` 래퍼 추가 | `check-capability.sh:60-63` | 3줄 |
| 6 | C-16~18 | Delegation Rules 역할명 통일 (Reviewer→QA, Plan Reviewer→Architect) | `tsq-controller/SKILL.md` | 5줄 |

### Tier 2: 안정성 강화

| # | ID | 작업 | 파일 | 난이도 |
|---|-----|------|------|--------|
| 7 | C-09 | `shuttingDown` 플래그 추가 | `daemon/index.ts` | 5줄 |
| 8 | C-15 | exists() 절대경로 변환 | `compiler.ts:477` | 1줄 |
| 9 | W-07 | TOTAL_LINES=0 가드 추가 | `context-restore.sh:72` | 1줄 |
| 10 | W-11 | eventLog 크기 제한 (MAX 1000) | `event-queue.ts:85` | 3줄 |
| 11 | C-14 | 미등록 3개 스크립트 삭제 | `scripts/` | 파일 삭제 |

### Tier 3: 정리 및 개선

| # | 작업 | 난이도 |
|---|------|--------|
| 12 | `scripts/` 레거시 디렉토리 삭제 | 파일 삭제 |
| 13 | 72개 미사용 export 정리 | 중 |
| 14 | `feedback.test.ts` 파일명 변경 | 1줄 |
| 15 | `template.test.ts` stale mock 정리 | 3줄 |
| 16 | C-05: workflow.json 갱신 아키텍처 결정 | 설계 필요 |
| 17 | Meta Index 스킬 연결 또는 비활성화 결정 | 설계 필요 |

---

## Appendix: Agent Results

### Phase 1: Initial Audit (6 agents)

| Agent | Status | Findings |
|-------|--------|----------|
| Dead Code Auditor | DONE | 17 dead files, 72 unused exports, ~1,400 dead lines |
| Hook Scenario Tester | DONE | 25 scenarios, 23 issues (critical 5) |
| SKILL.md Cross-Reference | DONE | 40 skills, 22 issues (critical 3) |
| Daemon Deep Audit | DONE | 16 files, critical 7, warnings 19 |
| CLI & Template Engine | DONE | 45+ files, critical 3, warnings 10 |
| E2E Pipeline Simulator | DONE | 7 scenarios, 68 steps, 18 gaps |

### Phase 2: Cross-Verification (5 agents)

| Agent | Target IDs | Result |
|-------|-----------|--------|
| PID Path Verify | C-01 | **Confirmed** |
| Phase Reading Verify | C-02 | **Confirmed** (이중 오류: 파일+키) |
| Hook Guards Verify | C-03, C-04, C-06, C-08 | C-03 **Confirmed**, C-04 **Confirmed**, C-06 **Rejected**, C-08 **Confirmed** |
| Daemon/Compiler Verify | C-09~C-15 | C-09 **Confirmed**, C-10 **Downgraded**, C-11 **Downgraded**, C-12 **Downgraded**, C-13 **Downgraded**, C-14 **Confirmed**, C-15 **Confirmed** |
| Skill Refs Verify | C-16~C-18 | All **Confirmed** (이름 불일치 근본 원인) |

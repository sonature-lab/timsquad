---
title: TimSquad GitHub 이슈 통합 리포트
generated: 2026-05-22
scope: sonature-lab/timsquad — OPEN issues only
total_open: 30
total_closed: 27
report_type: 상세 리포트 (의사결정용)
---

# TimSquad GitHub 이슈 통합 리포트 (2026-05-22)

## Executive Summary

현재 OPEN 30건. 가장 큰 줄기는 **세 가지**다:

1. **vNext Architecture 전환** (#56, #57) — "Operational State Runtime" 으로의 패러다임 전환. Evidence Matrix v0.1 완료, v0.2 명세 확정. **이 두 이슈가 가장 큰 미해결 작업이며 다른 이슈 다수의 상위 컨테이너 역할**.
2. **Hook/Gate 강제력 부재** (#24, #34, #35, #37, #49, #50, #54) — soft protocol 의존으로 인한 drift/data loss 사고가 반복. claim drift, visual gate 부재, append-only 보호 부재 등 **TimSquad의 가장 큰 약점이 반복적으로 field에서 노출됨**.
3. **CLI/Parser 안정성** (#36, #43, #47) — `tsq next`, daemon lite mode, planning.md parser 가 실 사용 환경에서 break. 워크어라운드(수동 workflow.json 편집)로 운영 중.

**즉시 Close 후보 2건**: #21, #31 — 메모리상 이미 완료된 작업 (Meta Index 인메모리 캐시 활성화, 보완계획 #4~#7).

## 우선순위 매트릭스

| Priority | 카운트 | 이슈 |
|----------|------|------|
| 🔴 Critical (data loss / 시연 불가) | 2 | #50, #35 |
| 🟠 High (roadmap / 영향 큰 버그) | 3 | #57, #56, #52 |
| 🟡 Medium (운영 자동화 결함) | 6 | #24, #34, #36, #43, #47, #49 |
| 🟢 Process/Methodology | 5 | #53, #54, #55, #37, #48 |
| 🔵 Feature/Architecture 제안 | 9 | #26, #38, #39, #41, #44, #45, #46, #51, #26 |
| ⚪ Docs/Verify | 3 | #32, #40, #42 |
| 🗑 Hygiene | 1 | #33 |
| ♻️ Close 후보 | 2 | #21, #31 |

---

## 1. 🔴 Critical (즉시 해결 권고)

### [#50](https://github.com/sonature-lab/issues/50) — Append-only state files vulnerable to Write overwrite (data loss incident)

- **라벨**: `bug`, `priority:critical`, `field-report`
- **인시던트**: `decisions.jsonl` 124줄(127 decisions) 영구 유실. agent 의 `Write` 도구 오용 + Read 부분 반환 misinterpret.
- **근본 원인**:
  - R1. Write 도구가 append-only state 파일을 보호하지 않음
  - R2. JSONL rotation 정책 부재 → 무한 성장 → Read token 한계 → partial read
  - R3. agent 가이드라인 공백 (대형 append 파일 처리 지침 없음)
  - R4. State mutation 자동 백업 없음
- **제안 (F1~F5)**:
  - F1. JSONL Rotation (`decisions-D001-D100.jsonl` 자동 분할)
  - F2. `append-only-guard.sh` PreToolUse hook — Write 차단
  - F3. Librarian agent 프롬프트 개정 — `cat >> file <<EOF` 강제
  - F4. PostToolUse 자동 백업 (`.bak.timestamp`)
  - F5. CLAUDE.md 템플릿에 Critical State Files 섹션
- **현재**: 손상 파일 backup 완료. 24% 복구. 76% 영구 유실.

### [#35](https://github.com/sonature-lab/issues/35) — Visual Gate 부재로 디자인 시스템 7 Phase 동안 미이식

- **라벨**: `bug`, `priority:critical`, `field-report`
- **사례**: RallyUp 프로젝트, 7 Phase 동안 27개 페이지가 전부 순수 HTML. CSS 0%. 사용자가 브라우저에서 직접 발견.
- **근본 원인**:
  - Phase Gate 에 Visual Verification 단계 없음 (turbo build + vitest = 완성 판정)
  - tsq-designer 에이전트 위임 트리거 미발동 (7 Phase 동안 0회)
  - 프로토타입 참조 의무 부재 (`design-token-spec.md` SSOT 미등록)
- **제안**: Gate 체크리스트에 Visual Verification 추가, DEL-003 트리거 키워드 확장, tsq-init 에서 프로토타입/CSS 프레임워크 스캔
- **관련**: #24 (Controller trigger chain), #37 (E2E Gate)

---

## 2. 🟠 High Priority — vNext Roadmap

### [#56](https://github.com/sonature-lab/issues/56) — [Architecture] TimSquad vNext: Operational State Runtime

- **라벨**: `enhancement`, `roadmap`, `priority:high`, `field-report`
- **TL;DR**: "더 큰 context 시스템"이 아니라 **"더 정확한 operational truth 시스템"**으로 재정렬. **Context as Operational State**.
- **6-layer 아키텍처**:
  - Canonical Truth: `operational-events.jsonl` (append-only) + evidence artifacts + source code
  - Generated Views: `.glog` (lazy, NOT canonical), current-phase.json (compiled projection)
  - Navigation: ProjectMap
  - Execution: `tsq` CLI / Operational State Runtime
  - Adapters: Claude/Cursor/Codex/MCP
- **실측 근거**: L38(P15 GREEN PASS claim drift), INC-2026-04-20(decisions.jsonl loss = #50), D-349(dual schema reality), meta-index 28일 stale
- **진단**: "기억이 부족한 것이 아니라 진실의 소유자가 없다"

### [#57](https://github.com/sonature-lab/issues/57) — [Handoff] Evidence Matrix v0.1 complete → v0.2 + event schema + tsq CLI walking skeleton

- **라벨**: `enhancement`, `roadmap`, `priority:high`
- **본문 분량 43KB** — 자기완결 핸드오프 문서, §10 부록에 schema/validator/test 전문 인라인
- **핵심 결정 사항 (D1~D10)**:
  - D1: event ledger = truth, .glog = lazy/generated view
  - D2: Runtime = observer/validator (owner 아님)
  - D3: 우선순위 Evidence Matrix → Event schema → tsq CLI → .glog lazy → projection → runtime daemon
  - D4: tsq CLI = 실제 공통 surface, Hook = adapter
  - D8: effects/invalidates는 event envelope (evidence 아님) — 검증 의미론 분리
  - D9: Event validator MUST enforce `invalidates ⊆ derivable(evidence)` — 강제 규칙
  - D10: 원자 경계 = event append (Phase 4 이전 tx manager 불필요)
- **Status**: Evidence Matrix v0.1 완료. v0.2 명세 확정. event schema·CLI 명세 확정 / 미구현.
- **다음 액션**: §7.1 구현 명세로 v0.2 진입

### [#52](https://github.com/sonature-lab/issues/52) — Research agents (architect, qa) cannot save report files

- **라벨**: `bug`, `priority:high`, `field-report`
- **문제**: `tsq-architect`, `tsq-qa` 가 `Read, Bash, Grep, Glob` 만 보유. Write 부재로 리포트 저장 실패 → assistant message 로 반환 → 메인 세션이 수동 저장 (토큰 낭비 ~10K/리포트)
- **비교**: tsq-dba 는 Write/Edit 보유 → 정상 저장. tsq-librarian 은 reports/logs 만 허용 패턴
- **2026-04-21 사례**: Wave 0 리서치 3건 중 2건 저장 실패 (1/3 성공률)
- **Option A (권장)**: architect/qa 에 Write 추가 + scope rule (`reports/`, `logs/` 만 허용)
- **Option B**: 전용 report-writer 중계 에이전트
- **Option C**: Bash tee 우회 + scope guard

---

## 3. 🟡 Medium — Bug / 운영 자동화 결함

### [#24](https://github.com/sonature-lab/issues/24) — Controller trigger chain not enforced (Librarian never called)

- **라벨**: `bug`
- **증거 (rallyup)**: workflow.json 없음, logs/phases/ 0건, logs/sequences/ 0건, phase-memory 정지, trails 아카이브 없음, decisions.jsonl 미아카이브
- **근본**: Controller trigger 가 **soft protocol** (LLM 이 기억해야 작동) — 컨텍스트 압축 시 소실
- **제안**:
  - Option 1: completion-guard hook 확장 (권장)
  - Option 2: 전용 phase-gate hook
  - Option 3: SubagentStop hook 에서 trigger 강제 (이상적)
- **이 이슈가 #34, #35, #49 등 다수의 상위 원인**

### [#49](https://github.com/sonature-lab/issues/49) — Phase 완료 시 workflow.json 시퀀스 상태 + Phase 로그 자동 갱신 실패

- **라벨**: 없음 (bug 추가 권장)
- **문제**: `completed_phases` 에 P1 추가됐는데 sequences 6개 전부 `in_progress`, `current_phase` 도 P1 그대로, `logs/phases/P1.md` 미생성
- **부분 실행 단계 (1~3)**: completed_phases 추가, trails memory 생성, completion log
- **누락 (4~7)**: 시퀀스 status 전환, l2_created, L3 로그, current_phase 전환
- **추정**: SubagentStop hook `tsq next --complete` 가 task 만 처리, sequence/phase 전파 누락

### [#43](https://github.com/sonature-lab/issues/43) — Daemon "lite mode" does not generate task-context.json (Meta Index)

- **라벨**: `bug`, `documentation`
- **문제**: Controller SKILL.md Step 9 가 `.timsquad/.daemon/task-context.json` 을 전제하지만 실제로는 생성 안 됨. `tsq daemon start` 가 `[lite mode]` 만 시작, full mode 플래그 없음
- **실제 상태**: `.daemon/` 에 compact-summary.md 만 있음. `.compile-manifest.json` 도 없음. `meta-index/ui-index/` 빈 디렉토리
- **영향**: SKILL.md Step 9 가 사실상 no-op
- **연관**: #21 (Meta Index 스킬 레이어 연결)

### [#36](https://github.com/sonature-lab/issues/36) — tsq next CLI 가 planning.md 신규 Phase 태스크 미인식

- **라벨**: `bug`, `field-report`
- **재현**: planning.md 에 Phase 6 추가 → tsq next 가 이전 Phase 만 인식 → 수동 workflow.json 편집으로 우회
- **연관**: #47 (parser 형식 이슈)

### [#47](https://github.com/sonature-lab/issues/47) — tsq next: planning.md parser fails on non-standard heading formats

- **라벨**: 없음 (bug 추가 권장)
- **재현**: `### Phase 0.5:` (H3 + 소수점) 미매칭, `**P0.5-S001-T001 ...**` (bold) 미매칭 → `all_complete` 잘못 반환
- **Root**: regex 가 H2 + 정수 + H4 만 인식
- **Suggested Fix**:
  - Phase ID 소수점 지원 `(\d+(?:\.\d+)?)`
  - H2/H3 모두 인식
  - Bold pattern 인식
  - 0 phases 일 때 `error: no phases found` (현재는 잘못 `all_complete`)
- **Side effect**: `tsq next --wave` 호출 시 `seq.completed_tasks is not iterable` 에러 (workflow.json 스키마 불일치)

### [#34](https://github.com/sonature-lab/issues/34) — [tsq-quick] Phase Gate not triggered on phase completion

- **라벨**: 없음
- **문제**: `/tsq-quick` 으로 마지막 태스크 완료 시 Phase Gate 자동 트리거 안 됨. 사용자가 "페이즈 게이트는?" 물어봐야 실행
- **원인**: 스킬 비교표의 "Librarian X / 게이트 unit만" 이 PM 에 의해 Phase 완료 시점까지 면제로 오해됨
- **제안**: tsq-quick Step 8 이후에 Phase 완료 감지 + 자동 Gate 안내 로직 추가
- **연관**: #24 (trigger chain 미강제)

---

## 4. 🟢 Process / Methodology

### [#53](https://github.com/sonature-lab/issues/53) — Task 프로세스 개선 (Hot-fix 모드 + self-check + Tier 자동 결정)

- **배경**: medivance-v2-be 에서 동일 세션 3회 정정 사이클. 사용자 "거짓말/토큰 낭비" 강한 비판
- **공통 결함**: 답변 전 결정 로그/carry/memory 미참조 → 단정 표현 → 사용자 매번 검증
- **세션 회고**: 풀 파이프라인 X, hot-fix 70% 즉흥. TDD 역순, Mutation/Review/Audit 생략
- **제안**:
  - Hot-fix 모드 명시 분리 (full pipeline 과 구분)
  - 답변 전 self-check 4 단계 (memory grep / decisions grep / carry grep / runtime 검증)
  - Tier 기반 자동 결정 매트릭스

### [#54](https://github.com/sonature-lab/issues/54) — 검증 범위 자동 결정 부재 (매번 타입검증만)

- **사례**: ChatRoomEntity expiryDate 필드 추가 (10 파일 cascade) → tsc 만 실행 → "Phase A 완료" → 사용자 3차례 지적 → vitest 14 회귀 발견
- **검증 매트릭스 (제안)**: 작업 종류별 (오타 / 인터페이스 변경 / Public API / Routes / DB schema / 신기능) tsc/단위/통합/API 스펙/전체 vitest 자동 매핑
- **구현**: build-gate.sh 강화 — `git diff --name-only HEAD` 로 변경 분류 → 인터페이스/Type 파일 시 단위 mandatory, schema 시 전체 vitest

### [#55](https://github.com/sonature-lab/issues/55) — P15 회고: SSOT drift 및 보고-실측 정합성 저하

- **사례 (P15 WebSocket SessionPrincipal Migration)**: 모든 산출물 생성 + agent GREEN 보고 → 후속 review 에서 다수 drift 발견
  - `wsManager.addConnection` signature 미전환, `assertCanAccess` 우회 가능, closeout drift, JWT fallback 누락, workflow/current-phase 불일치
- **가설**: agent 가 production code 보다 planning/closeout/agent report 를 더 신뢰
- **제안 (4개)**:
  - 1. 판단 우선순위 명시 (Production code > Tests > Runtime evidence > SSOT docs > Logs/reports)
  - 2. Contract Evidence Matrix (PASS 보고 전 grep/line/실행 결과 증명 필수)
  - 3. Closeout artifact drift sweep (코드 추출 + grep diff 함께 포함)
  - 4. Agent 보고서 PASS 기준 강화

### [#37](https://github.com/sonature-lab/issues/37) — Gate 검증에 동적 검증(E2E/브라우저) 필수 포함

- **사례 (rallyup)**: Phase 9~13 Gate 모두 통과 (915 unit PASS, tsc 0, build OK) — 실제로는 Session 폼 미동작, InMemory HMR 리셋, 상세 404, Region 기본값 미적용, revalidatePath 누락
- **제안**: Gate 필수 항목에 E2E (CRUD 플로우) + exhaustive-qa (Dead Link/JS Error) 추가
- **연관**: #35 (Visual Gate 부재)

### [#48](https://github.com/sonature-lab/issues/48) — [Feature] Tiered Spec-First Testing

- **라벨**: `enhancement`
- **문제**: AI 에이전트가 TDD 시 confirmation bias → "통과만 하는 테스트" 생성
- **연구 근거**: Microsoft Research(mutation -30~40%), Meta TestGen-LLM, Google Testing Blog(Test Oracle Problem), ICSE/ASE(스펙 제공 시 30~60% 향상)
- **제안 (4개)**:
  - 1. Controller Protocol 에 Spec-First Gate 내장 (`tsq next` 가 tier/specRequired/specPath 반환)
  - 2. 3계층 태스크 분류 (full / template / contract)
  - 3. Mutation Testing 통합 (Stryker, full≥80%, template≥70%)
  - 4. Template Spec 관리

---

## 5. 🔵 Feature / Architecture 제안

### [#26](https://github.com/sonature-lab/issues/26) — Goal Convergence Score

- **라벨**: `enhancement`
- **개념**: GQM(Goal-Question-Metric) + RTM(Requirements Traceability Matrix). PRD 목표 → 기능 → Sub-PRD → Task → 구현 → 테스트 → 게이트 각 레이어 연결률을 단일 점수로
- **5계층 메트릭**: Spec Coverage / Plan / Impl / Test / Gate
- **출력 예시**: `tsq status --convergence` → 85.5%
- **차별점**: tsq-product-audit("품질")과 달리 "목표 수렴"에 초점

### [#39](https://github.com/sonature-lab/issues/39) — [RFC] SDV (Skill Driven Vibecoding)

- **라벨**: `enhancement`, `field-report`
- **제안**: 파이프라인 스킬(`tsq-full`, `tsq-quick`)에 protocol + controller 핵심 규칙 embed → 스킬 호출 시 자동 컨텍스트 주입
- **장점**: 스크립트/훅 불필요, 자기완결, rules/ 처럼 항상 로드 안 됨
- **관련**: #40 (rules vs skills 문서화), #41 (UserPromptSubmit 훅 대안)

### [#41](https://github.com/sonature-lab/issues/41) — [Feature] UserPromptSubmit 훅으로 컨텍스트 주입

- **라벨**: `enhancement`
- **#39 의 대안**: 훅 기반. `/tsq-full|/tsq-quick|tsq f|tsq q` 패턴 감지 → protocol/controller stdout 으로 주입
- **비교**: 더 이른 시점 트리거, 스크립트 필요, 커맨드 패턴별 다른 컨텍스트 가능
- **권고**: #39 먼저, 필요 시 본 훅 추가

### [#38](https://github.com/sonature-lab/issues/38) — Add /tsq-stop skill for session teardown

- **라벨**: 없음
- **문제**: `/tsq-start` 있지만 대칭 종료 스킬 없음
- **제안**: `/tsq-close` — 데몬 중지, workspace.xml 동기화, 미완료 작업 요약, 세션 로그
- **목표**: `/tsq-start` ↔ `/tsq-close` 대칭 라이프사이클

### [#44](https://github.com/sonature-lab/issues/44) — codebase-analyze 스킬

- **라벨**: 없음
- **목적**: 자동화 도구가 정확한 데이터 → Claude 가 해석 → 압축 Markdown 맵 (Claude 의 40-50파일 한계 보완)
- **구성**: scripts/analyze.sh (dependency-cruiser/madge/knip/ts-morph) → scripts/analyze-codebase.ts (AST) → /codebase-analyze 스킬 → `.timsquad/ssot/module-map.md`
- **시나리오**: 모놀리스→마이크로서비스, 레거시 리팩토링, 온보딩, 마이그레이션 영향 분석
- **연관**: #45 (포맷 표준화), #46 (자동 설치)

### [#45](https://github.com/sonature-lab/issues/45) — module-map 산출물 포맷 표준화

- **라벨**: 없음
- **제안 포맷**: 분류 태그(BACKEND/ELECTRON/SPLIT/SHARED), 필수 필드(path/lines/depends-on/depended-by), 선택 필드(migration-priority/split-strategy), 요약 섹션
- **프레임워크 통합**: tsq init 시 템플릿 생성, SSOT Level 2+, ssot-map.yaml 등록
- **연관**: #44

### [#46](https://github.com/sonature-lab/issues/46) — tsq init 분석 도구 자동 설치 옵션

- **라벨**: 없음
- **제안**: tsq init 시 `? Enable codebase analysis tools? (Y/n)` → dependency-cruiser/madge/knip/ts-morph 설치 + scripts/ 복사
- **프로젝트 타입별 매핑**: web-service/web-app/api → ts-morph 등, mobile → dart_dependency_validator
- **config.yaml 에 analysis 섹션 추가**
- **연관**: #44, #45

### [#51](https://github.com/sonature-lab/issues/51) — phase-memory.md lifecycle enforce Phase transition rotation

- **라벨**: `documentation`, `enhancement`, `field-report`
- **문제**: phase-memory.md frontmatter 의 `prev:` 필드가 rotation 을 암시하지만 자동화 부재. 현재 프로젝트 714줄 (Phase 1/2 혼재). trails/ 에 *-memory.md 없음. → #50 인시던트와 동일 위험
- **제안 (P1~P3)**:
  - P1. 파일 구조 계약 (current 전용 ~400-600줄 + trails/phase-{N-1}-memory.md)
  - P2. `tsq phase rotate` CLI or Phase 완료 훅 (mv + chmod 444)
  - P3. (생략)
- **연관**: #50

---

## 6. ⚪ Docs / Verify

### [#32](https://github.com/sonature-lab/issues/32) — docs: 경쟁분석 문서 수치 Drift

- **라벨**: `bug`
- **수정 항목**:
  - DRIFT-01: 스킬 "37개" (tsq-daemon 포함) → tsq-daemon 삭제, tsq-inspect/tsq-typescript 반영
  - DRIFT-02: Hook "14개 (7+7)" → "13개 (7+6)"
  - DRIFT-06: "5개 Fail-closed" → "7개"
  - DRIFT-12: "34개 소프트 → 코드 강제" → "~20개 전환 완료"
- **검증 필요**: MEMORY.md 와 일관성 (Hook 13개, 스킬 37개로 메모리는 일치)

### [#40](https://github.com/sonature-lab/issues/40) — rules/ vs skills/ 로딩 메커니즘 명확화

- **라벨**: `documentation`, `field-report`
- **검증된 동작**:
  - `.claude/rules/*.md` → 자동 로드 (매 대화)
  - `skills/*.md` → 명시적 호출 시만
  - `knowledge/`, `scripts/` → 로드 안 됨
- **흔한 오해**: CLAUDE.md 의 "관련 작업 시 자동 로드" 문구가 파일 로딩으로 오해됨 (실제는 attention 의미)
- **요청**: README/공식 문서에 차이 명시 + subfolder 동작 검증 (→ #42)

### [#42](https://github.com/sonature-lab/issues/42) — [Verify] rules/ 하위 폴더(subfolder) 자동 로드 여부 검증

- **라벨**: `question`
- **현재 알려진 것**: 1단계 *.md 자동 로드 확인. 2단계 미검증
- **검증 방법**: `.claude/rules/test-sub/test.md` 생성 후 새 대화에서 system-reminder 확인
- **의의**: 로드되면 카테고리 구조화 가능 (pipeline/quality/reporting). 안 되면 #39 (skill embed) 방식 강제

---

## 7. 🗑 Hygiene

### [#33](https://github.com/sonature-lab/issues/33) — chore: 고아 스크립트 정리

- **라벨**: `bug`
- **대상**: `templates/platforms/claude-code/scripts/e2e-commit-gate.sh`, `e2e-marker.sh`
- **상태**: settings.json 미등록 + 호출처 없음
- **조치**: 사용 의도 확인 후 삭제 또는 등록
- **근거**: docs/inspect-report-2026-03-19.md §1

---

## 8. ♻️ Close 후보 (메모리상 완료)

### [#31](https://github.com/sonature-lab/issues/31) — 후순위 보완계획 (#4~#7)

- **메모리**: "보완계획 #0~#7 전체 완료 (#31)"
- **이슈 범위**:
  - #4 모델 라우팅 → ✅ (메모리: "Controller v3.0.0 하이브리드 + Model Routing + Wave 병렬 디스패치")
  - #5 Meta Index → ✅ (메모리: "인메모리 캐시 활성화, dirty 추적 + 증분 업데이트")
  - #6 Script 자동화 → ✅ (메모리: "Script 자동화: 6개 bash")
  - #7 병렬 디스패치 → ✅ (메모리: "tsq next --wave 병렬 디스패치")
- **권고**: 구현 확인 후 Close + 완료 코멘트

### [#21](https://github.com/sonature-lab/issues/21) — Meta Index 스킬 레이어 연결 (인메모리 캐시 활성화)

- **메모리**: "Meta Index: 인메모리 캐시 활성화, dirty 추적 + 증분 업데이트"
- **권고**: `src/daemon/index.ts` 주석 해제 여부 + `meta-cache.ts updateFiles()` 구현 여부 확인 후 Close

---

## 9. 주제별 클러스터링

### 9.1 "Hook/Gate 강제력 부재" 클러스터 (가장 큰 약점)

**연관 이슈**: #24 (Controller trigger chain), #34 (tsq-quick Phase Gate), #35 (Visual Gate), #37 (E2E Gate), #49 (workflow.json 전파), #50 (append-only 보호), #54 (검증 범위 자동 결정)

**공통 패턴**: TimSquad 의 soft protocol 이 long-running 세션에서 LLM context 압축 시 소실 → field 에서 반복 노출.

**해결 방향**:
- Hook 으로 시스템 강제 (PreToolUse / PostToolUse / SubagentStop)
- 변경 종류별 자동 검증 매트릭스
- Visual / Dynamic verification 의무화

### 9.2 "vNext Operational State Runtime" 클러스터

**연관**: #56, #57, #50, #55

**핵심 통찰**: "기억 부족" 이 아니라 "진실의 소유자 부재". append-only event ledger + evidence-based projection + lazy view 로 패러다임 전환.

### 9.3 "Codebase Analysis" 클러스터

**연관**: #44, #45, #46

**일관된 비전**: 자동화 도구 → Claude 해석 → 표준 module-map. 마이그레이션/리팩토링 인프라.

### 9.4 "스킬 로딩 메커니즘" 클러스터

**연관**: #39, #40, #41, #42

**미결 질문**: 파이프라인 스킬에 어떻게 컨텍스트를 강제 주입할 것인가? Skill embed (#39) vs Hook (#41) vs subfolder (#42 검증 후 결정).

---

## 10. 권고 액션 플랜

### 즉시 (이번 주)

1. **#21, #31 Close 처리** — 구현 확인 코멘트 + close. 메모리 정합성 확보.
2. **#32 Drift 수정** — 경쟁분석 문서 수치 정정. MEMORY.md 와 동기화.
3. **#33 고아 스크립트 정리** — 삭제 또는 등록.
4. **#50 F2 (append-only-guard hook)** 우선 구현 — data loss 재발 차단.

### 단기 (1~2주)

5. **#24 Trigger chain Hook 강제** — completion-guard 확장. #34, #49 동시 해결.
6. **#52 architect/qa Write 권한** — Option A 적용.
7. **#47 planning-parser regex 보강** — `#36` 동시 해결.
8. **#35 Visual Gate / #37 E2E Gate** — Gate 체크리스트 확장.

### 중기 (vNext 전환)

9. **#57 v0.2 구현** — Evidence Matrix v0.2 + event schema + tsq CLI walking skeleton (§7.1 구현 명세 따라)
10. **#56 6-layer 아키텍처 단계 적용** — D3 우선순위 따라 Evidence → Event → CLI → .glog → projection → daemon

### 장기 (방법론)

11. **#48 Tiered Spec-First Testing** — Mutation Testing 통합
12. **#26 Goal Convergence Score** — #1~#3 인프라 기반 뷰 레이어
13. **#53, #54, #55 프로세스 개선** — Hot-fix 모드 분리 + 검증 매트릭스 + Contract Evidence Matrix

---

## 11. 부록: 통계

- **OPEN 총합**: 30
- **CLOSED 총합**: 27 (#30, #29, #28, #27, #25, #23, #22, #20, #19, #18, #17, #16, #15, #14, #13, #12, #11, #10, #9, #8, #7, #6, #5, #4, #3, #2, #1)
- **라벨 분포 (OPEN)**:
  - `bug`: 7 (#24, #32, #33, #35, #36, #43, #49, #50, #52)
  - `enhancement`: 10
  - `field-report`: 11
  - `priority:critical`: 2 (#35, #50)
  - `priority:high`: 4 (#52, #56, #57, ...)
  - `roadmap`: 2 (#56, #57)
  - `documentation`: 3 (#40, #43, #51)
  - `question`: 1 (#42)
- **무라벨 OPEN**: 14건 — 라벨링 캠페인 필요
- **최장 본문**: #57 (43.9KB, self-contained 핸드오프)
- **최단 본문**: #36 (380자)

---

*Report generated by Claude (Opus 4.7, 1M context) — 30 issues read with full body. 데이터는 2026-05-22 기준 gh CLI fetch.*

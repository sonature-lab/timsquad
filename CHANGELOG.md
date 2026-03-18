# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [3.7.0] - 2026-03-18

### Breaking Changes
- **CLI 22개 커맨드 삭제**: `tsq status`, `tsq q`, `tsq f`, `tsq log`, `tsq feedback`, `tsq retro`, `tsq metrics`, `tsq mi`, `tsq knowledge`, `tsq wf`, `tsq compile`, `tsq audit`, `tsq session`, `tsq skills`, `tsq watch`, `tsq improve`, `tsq upgrade`, `tsq git commit/pr/release/sync` 삭제
  - CLI는 핵심 3개만 유지: `tsq init`, `tsq update`, `tsq daemon`
  - 모든 기능은 Claude Code 슬래시 커맨드(스킬)로 전환: `/tsq-status`, `/tsq-log`, `/tsq-retro` 등
- **스킬 namespace 전환**: `coding/`, `testing/`, `controller/` 등 → `tsq-coding/`, `tsq-testing/`, `tsq-controller/` flat namespace
- **레거시 삭제**: `scripts/` 디렉토리 (12파일), `install/` 디렉토리, CLAUDE.md.template, Feedback Routing (~900줄)

### Added
- **스킬 주도 파이프라인 아키텍처** (#20)
  - 5-Layer 강제성: Hook Gate → Skill Protocol → CLAUDE.md → Slash Commands → Audit
  - Capability Token 검증: `check-capability.sh` — controller 미경유 시 파일 쓰기 차단
  - 변경 범위 추적: `change-scope-guard.sh` — 3파일 경고, 6파일 차단, 100줄 경고
  - SSOT Readiness Guard: `context-restore.sh` — PRD 미작성 시 자동 안내
  - SSOT Drift Detection: Daemon event-queue에서 7일 초과 미갱신 문서 감지
- **35개 `tsq-*` 스킬**: 슬래시 커맨드 통합, 각 스킬에 description + "Use when" 트리거 조건 포함
  - 신규: `tsq-start`, `tsq-status`, `tsq-update`, `tsq-delete`, `tsq-log`, `tsq-grill`, `tsq-decompose`, `tsq-hono`
  - 통합: `tsq-audit` (감사+리뷰), `tsq-controller` (triggers/delegation 통합)
- **8개 Hook Gate**: Fail-closed 5개 + Fail-open 3개
  - `safe-guard.sh`, `phase-guard.sh`, `check-capability.sh`, `change-scope-guard.sh`, `completion-guard.sh`, `build-gate.sh`, `pre-compact.sh`, `context-restore.sh`
- **4계층 메모리**: `decisions.jsonl` → `phase-memory.md` → `trails/` → `logs/`
- **CLAUDE.md 주입블록**: `<!-- tsq:start/end -->` 마커로 PM 역할 자동 주입 (~15줄)

### Changed
- **Daemon 경량화**: 관찰자 전용 (event-queue 489→186줄), L1 + Decision Log 수집만 담당
  - Meta Index 인메모리 캐시 비활성화 (IPC notify는 유지, 디스크 인덱스는 유지)
- **Controller v2.1**: Delegation Rules 역할명 통일 (QA→`tsq-qa.md`, Architect→`tsq-architect.md`), workflow.json 갱신 프로토콜 추가
- **tsq-protocol v2.1**: 메인세션/서브에이전트 분기, Completion Report 필수화

### Fixed
- **파이프라인 감사 14 Critical 전수정** (6-Agent 병렬 감사 + 5-Agent 교차 검증)
  - PID 경로 불일치: `.daemon/daemon.pid` → `.daemon.pid`
  - Phase 읽기 버그: `workflow.json` → `current-phase.json`
  - SSOT auto-compile 경로: `'controller'` → `'tsq-controller'`
  - Hook stdin 읽기: `read -t 1 -r line` → `cat 2>/dev/null` (4개 스크립트)
  - check-capability deny 포맷: `hookSpecificOutput` 래퍼 누락
  - compiler exists() 상대경로 → 절대경로 변환
  - SIGTERM 이중 실행 방지: `shuttingDown` guard 추가
  - eventLog 무한 증가: 1000건 초과 시 500건으로 trim
  - build-gate staged 파일 감지: `--cached` 추가
  - context-restore division by zero 방어

### Removed
- CLI 22개 커맨드 (→ 스킬 전환)
- 레거시 스킬 181개 파일 (→ `tsq-*` namespace 재구성)
- `scripts/` 디렉토리 12개 파일, `install/` 디렉토리
- `CLAUDE.md.template` (→ 동적 주입블록)
- Feedback Routing 시스템 (~900줄)

---

## [3.6.0] - 2026-03-08

### Added
- **product-audit 스킬 v2.0 전면 재설계**: 최신 표준 기반 통합 제품 감사 스킬
  - 6단계 사이클: Plan → Audit → Report → Remediation Plan → Fix → Re-audit
  - 7개 감사 영역: Security, Performance, SEO, Accessibility, UI/UX, Architecture & DB, Functional & Requirements
  - 정량 스코어링: 영역별 가중 평균 + 등급(A-F) + gate 기준
  - 프로젝트 타입별 가중치 프리셋: Web Service, Fintech, E-commerce, Internal Tool
  - 156개 체크리스트 항목 (최신 표준 반영)
  - 12개 리소스 파일: rules/ 3개 + checklists/ 7개 + templates/ 2개
  - 반영 표준: OWASP Top 10:2025, ASVS v5.0, CWE Top 25 2025, CVSS 4.0, Core Web Vitals 2026, Lighthouse v12, WCAG 2.2 AA, EAA 2025, ISO 25010:2023, SLSA v1.2

### Changed
- **스킬 품질 개선** (Anthropic skill-creator 가이드라인 기반)
  - prompt-engineering: XML → Markdown, 104줄 → 84줄
  - retrospective: improvement-format → references/ 분리, 102줄 → 77줄
  - typescript: "Use when:" 트리거 추가, 중복 Checklist 제거
  - testing: 중복 TDD Cycle 제거
  - database: query optimization → rules/ 분리
  - product-audit, librarian: "Use when:" 트리거 추가

---

## [3.5.0] - 2026-02-23

### Fixed
- **npm v11 bin 경로 호환성**: `./bin/tsq.js` → `bin/tsq.js` (`npm pkg fix` 적용)
  - npm v11의 엄격해진 bin 경로 검증으로 publish 시 bin 엔트리가 제거되던 문제 해결
- **데몬 JIT 베이스라인**: Task proxy fallback 시 JIT 베이스라인 누락 수정 (#4)
- **스택 설정 정규화**: skill mapping 시 stack config 정규화 오류 수정 (#3)
- **상태 표시 크래시 방지**: 잘못된 phase JSON 파싱 시 status 명령 크래시 수정 (#2)

### Added
- **파이프라인 안정성 검증 리포트**: 6-Layer 8-method 분석, 7.8/10 점수

---

## [3.4.0] - 2026-02-18

### Fixed
- **데몬 JSONL 디커플링**: `tsq daemon start`가 `CLAUDE_TRANSCRIPT_PATH` 없이도 실행 가능 (#1)
  - 메타 인덱스, 파일 워처, IPC가 JSONL 없이 즉시 동작
  - `tsq daemon notify` 서브커맨드: 훅 기반 이벤트 알림 (subagent-start/stop, tool-use, stop, session-end)
  - settings.json 훅 7종 확장 (SubagentStart/Stop, PostToolUse/Failure, Stop, SessionEnd)
  - 파일 기반 세션 상태 (`session-state.ts`): 메트릭/베이스라인 영속화
  - IPC `notify` 프로토콜: 향후 모든 이벤트 소스(MCP, Cursor, CI/CD)의 공통 인터페이스

### Added
- **`mobile-app` 프로젝트 타입**: `tsq init --type mobile-app` 으로 모바일 앱 프로젝트 초기화
  - 에이전트 프리셋: architect, developer, designer, qa
  - 스킬 프리셋: mobile/flutter, mobile/dart, security, methodology/tdd
  - domain 기본값 `mobile` 자동 설정
  - 템플릿: config.yaml + workflow.xml (Feature/Core 병렬 트랙, 스토어 배포)
  - 모바일 도메인 오버레이 (Material Design/HIG, 오프라인, 배터리 효율)
- **`tsq skills` 커맨드**: 프로젝트 스킬 관리 CLI
  - `tsq skills list` — 배치된 스킬 목록 (이름, 버전, rules/refs 수)
  - `tsq skills search <query>` — 외부 스킬 검색 (skills.sh 연동)
  - `tsq skills add <source>` — GitHub URL 또는 레지스트리에서 스킬 설치
  - `tsq skills remove <name>` — 스킬 제거
- **Flutter 인프라/운영 서브스킬 5종** (D2 Phase 2):
  - `mobile/flutter/networking` (6 rules + 1 ref): Dio, Retrofit, interceptors, connectivity, caching
  - `mobile/flutter/security` (6 rules + 1 ref): secure storage, biometric, SSL pinning, obfuscation
  - `mobile/flutter/i18n` (5 rules + 1 ref): flutter_localizations, ARB, RTL, plural/gender
  - `mobile/flutter/ci-cd` (6 rules + 1 ref): code signing, Fastlane, Codemagic, store deployment
  - `mobile/flutter/monitoring` (5 rules + 1 ref): Crashlytics, Analytics, performance, Sentry
- **모노레포 라이트**: `--workspaces` 옵션으로 workspace glob 설정 (Phase A 선행 작업)
- **mobile/dart 스킬**: Dart 언어 가이드라인 (4 rules)
  - `null-safety` (CRITICAL): Sound null safety 패턴, bang operator 금지
  - `async-patterns` (CRITICAL): async/await 우선, Stream dispose, Isolate
  - `type-system` (HIGH): Sealed class, 패턴 매칭, Records, Extension type
  - `code-style` (HIGH): Effective Dart, 네이밍, import 정리
- **mobile/flutter 스킬**: Flutter 개발 가이드라인 (8 rules + 2 refs)
  - `architecture` (CRITICAL): Feature-first + MVVM + 3계층
  - `state-management` (CRITICAL): Riverpod Provider/Notifier 패턴
  - `widget-conventions` (CRITICAL): const 생성자, 위젯 분리 기준
  - `navigation-routing` (HIGH): go_router 선언적 라우팅
  - `performance` (HIGH): 리빌드 최적화, ListView.builder
  - `testing` (HIGH): Unit/Widget/Integration (mocktail, Patrol)
  - `platform-adaptive` (MEDIUM): iOS/Android 적응형 UI
  - `animations` (MEDIUM): 암시적/명시적 애니메이션 선택 기준
  - `project-structure` (REF): Feature-first + melos 모노레포
  - `freezed-patterns` (REF): 불변 모델 + JSON 직렬화
- **mobile/flutter/push-notifications 서브스킬**: 푸시 알림 + 백그라운드 (7 rules + 2 refs)
  - `fcm-setup` (CRITICAL): FCM 초기화, 토큰 관리, 토픽 구독
  - `notification-handling` (CRITICAL): 포그라운드/백그라운드/종료 상태별 처리
  - `local-notifications` (CRITICAL): 로컬 알림 채널, 스케줄
  - `notification-permissions` (HIGH): 권한 요청 타이밍, 프리프롬프트
  - `deep-linking` (HIGH): 알림 탭 → 네비게이션, 인증 가드
  - `rich-notifications` (HIGH): 이미지, 액션 버튼, 그룹
  - `background-processing` (HIGH): Workmanager, Isolate
  - `platform-setup` (REF): iOS APNs + Android 채널 설정
  - `notification-architecture` (REF): 서비스 아키텍처, 테스트
- **경쟁 분석 문서**: OmO/OMC/OMX 비교 분석 (`docs/competitive-analysis-2026-02.md`)
- **`tsq compile` — SSOT 컴파일러**: SSOT 문서를 에이전트용 spec 파일로 변환
  - `tsq compile` — 전체 SSOT → compiled specs 변환
  - `tsq compile --validate` — 컴파일 없이 schema + 의존성 그래프 검증
  - `tsq compile --status` — stale 여부 확인 (hash 비교)
  - 컴파일 규칙: service-spec(H3 분할), data-design(H2 분할), error-codes/requirements(전체)
  - section marker 자동 삽입 (`<!-- source: ... -->`, `<!-- ssot-hash: ... -->`)
  - `.compile-manifest.json` — stale detection용 해시 매니페스트
- **controller 스킬 (Context DI)**: 서브에이전트 위임 시 compiled spec 의존성 주입
  - 에이전트 prerequisites 파싱 → spec resolve → phase 제약 로드 → 프롬프트 조합
  - Mode Declaration: 서브에이전트 응답마다 `[MODE: {phase}] [TASK: {id}] [SPEC: {spec}]`
  - Rationalization Prevention Table
- **Phase Guard 훅**: phase별 파일 쓰기 제한 (PreToolUse)
  - planning/design phase → 코드 수정 deny
  - implementation phase → SSOT 수정 deny
- **Completion Guard 훅**: implementation phase 종료 시 테스트 실행 여부 확인 (Stop)
- **작업 모드 분류**: `tsq f`/`tsq q` 없이 직접 지시 시 PM이 Quick/Full 자동 분류
- **실행 품질 강화 (Q1~Q7)**:
  - Q1: **Plan Review** — 3축 계획 검증 (요구사항/기술분해/리스크), Full Mode Step 0
  - Q2: **Session Notes** — 데몬 자동 스냅샷 + Stop 훅 systemMessage 주입, 컨텍스트 압축 후 상태 복원
  - Q3: **Context Window 모니터** — 85% 경고, 70% 표시, `lastTurnInput` 기반 사용률 추적
  - Q4: **Safe Guard** — PreToolUse/Bash 파괴적 명령 차단 (rm -rf, force push, reset --hard 등)
  - Q5: **완료 검증 루프** — Stop 훅 `decision:block`으로 테스트 미실행 시 강제 속행
  - Q6: **런타임 스킬 제안** — UserPromptSubmit 훅, 키워드/패턴 매칭 → 관련 스킬 추천
  - Q7: **Build Gate** — Stop 훅에서 변경 파일 tsc 체크, 에러 시 차단

### Changed
- `DOMAIN_SKILL_MAP`: mobile 도메인에 `mobile/flutter`, `mobile/dart` 매핑
- `STACK_SKILL_MAP`: flutter → `mobile/flutter`, dart → `mobile/dart` 매핑

---

## [3.3.0] - 2026-02-15

### Added
- **`tsq upgrade` 범용 버전 동기화**: npm 업데이트 후 프로젝트 템플릿 자동 동기화
  - `--dry-run`: 변경 미리보기
  - `--rollback`: 직전 로컬 버전으로 복원
  - `framework_version` 필드로 버전 추적
- **upgrade-backup 모듈**: `.timsquad/.upgrade-backup/`에 자동 백업 + manifest
- **version.ts 중앙화**: `getInstalledVersion()`, `parseSemver()`, `isNewer()` 공유 유틸리티
- **L2/L3 피드백 자동 액션**: 피드백 분류 후 워크플로우 상태에 자동 반영
  - L2: `in_review` 상태 전환, `pending_feedback`에 추가, Phase Gate 차단
  - L3: `open` 상태, 사용자 `approve`/`reject` 대기, Phase Gate 차단
- **Feedback 서브커맨드**: `tsq feedback route/list/resolve/approve/reject`
- **데몬→피드백 연동**: 태스크 완료 시 semantic.issues에서 L2+ 이슈 자동 피드백 생성
- **브랜드 에셋**: favicon, logo, banner (assets/ 디렉토리)
- **공개 문서 8개 신규**: cli.md, core-concepts.md, feedback-and-retrospective.md, token-efficiency.md, file-structure.md 등
- `FeedbackStatus` 타입: `open | in_review | resolved | approved | rejected`

### Changed
- `tsq feedback <message>` → `tsq feedback route <message>`로 구조화 (하위 호환 유지)
- `AutomationConfig`에 `feedback` 토글 추가
- `WorkflowState`에 `pending_feedback: string[]` 추가
- Phase Gate에 미해결 피드백 체크 로직 추가
- templates 디렉토리: `common/` → `base/` + `platforms/` + `project-types/` 리팩토링
- 하드코딩 버전 `'3.0.0'` 제거 → `version.ts` 중앙화 (index.ts, update-check.ts)
- `package.json` files 화이트리스트 세분화 (templates/domains/ 제외)
- 공개용 docs 정리 (비즈니스 전략, 내부 분석 문서 gitignore 처리)
- README.md 전면 재작성 (882줄 → 279줄, 배너 + "Vibe Development Framework" 태그라인)

---

## [3.2.0] - 2026-02-14

### Added
- **고급 스킬 아키텍처**: 3종 하위 디렉토리 체계 (`rules/` + `references/` + `scripts/`)
- **확장 frontmatter**: `version`, `tags`, `impact` 모든 스킬/룰에 적용
- **Vercel react-best-practices 22개 룰** 도입 (보안 감사 PASS)
- `methodology/debugging` 신규 스킬
- `prompt-engineering` 신규 스킬
- `ui-design` 신규 스킬
- `skill-generator.ts`: `.sh` chmod 755 자동 설정, `validateSkillStructure()`
- `prompt-quality.test.ts`: 120줄 제한, frontmatter 검증, rules/references 검증
- 스킬 템플릿: `skills/_template/` (SKILL.md + rules/_template.md)

---

## [3.1.0] - 2026-02-13

### Added
- **tsq-protocol 공유 스킬**: 에이전트 공통 TSQ CLI 프로토콜 분리
- **에이전트 Overlay 구조**: `base/` + `overlays/platform/` + `overlays/domain/`

### Changed
- **CLAUDE.md 슬리밍**: 900줄 → 550줄 (규칙만 남기고 지식은 스킬로 분리)
- **에이전트 완전 재작성**: XML 구조 표준화, 9개 → 6개 슬림화
  - 현재: architect, developer, qa, security, dba, designer
  - 삭제: planner (PM/CLAUDE.md로 통합), prompter (스킬로 전환), retro (스킬로 전환)
- **스킬 분할**: 과대 SKILL.md → rules/ 하위 디렉토리 분리

---

## [3.0.0] - 2026-02-12

### Added
- **데몬 기반 자동화 파이프라인**: Hook 방식에서 백그라운드 데몬으로 전환
  - JSONL 실시간 감시 (`jsonl-watcher.ts`)
  - 이벤트 큐 처리 (`event-queue.ts`)
  - Meta Index 인메모리 캐시 (`meta-cache.ts`)
  - Task context 자동 생성 (`context-writer.ts`)
- **3계층 로그 시스템**: L1 Task → L2 Sequence → L3 Phase 자동 집계
- **Phase Gate**: 미해결 이슈 시 Phase 전환 차단
- **Meta Index**: AST(@swc/core) 기반 코드/UI 구조 인덱싱
  - 2계층 모델 (Mechanical + Semantic)
  - Directory 레벨 인덱싱
  - Health Score + UI Health Score
- **Knowledge 시스템**: checklists, templates, platforms, domains
- **Workflow 자동화**: `tsq wf` (Phase/Sequence 관리)
- **Domain/Stack 기반 스킬 선택**: `tsq init` 시 domain에 따라 스킬 활성화
- 311개 테스트 (단위 ~250 + 통합 24 + E2E 10 + 프롬프트 ~27)

### Changed
- templates 구조 전면 개편: project-types/ 도입

### Removed
- `tsq-planner` 에이전트 (PM/CLAUDE.md로 통합)
- `tsq-prompter` 에이전트 (prompt-engineering 스킬로 전환)
- `tsq-retro` 에이전트 (retrospective 스킬로 전환)
- Hook 스크립트 3종 (event-logger.sh, auto-worklog.sh, auto-metrics.sh)

---

## [2.1.0] - 2026-02-10

### Added

#### 자동화 파이프라인
- **auto-metrics.sh** - 세션 종료 시 메트릭 자동 수집 (토큰 비용 0)
  - 세션 수, 이벤트 수, 도구 사용/실패, 서브에이전트, 토큰 통계
  - `latest.json`에 누적 갱신 방식으로 트렌드 추적
- **품질 경고 (Quality Alerts)** - `auto-worklog.sh`에 threshold 기반 자동 감지 추가
  - Tool Failure Rate > 10% → 경고 생성
  - Cache Hit Rate < 60% → 경고 생성
  - `.timsquad/logs/{date}-alerts.md`에 자동 기록
- **자동 피드백 생성** - 도구 실패 3회 이상 시 `FB-XXXX.json` 자동 생성
- **event-logger.sh 체인 실행** - SessionEnd 시 auto-worklog + auto-metrics 병렬 실행

#### 새 CLI 명령어
- **`tsq retro auto`** - 회고 사이클 원클릭 자동 실행
  - `--local` 옵션으로 GitHub Issue 생성 생략 가능
  - 완료 후 `tsq improve fetch` + `tsq improve analyze` 자동 연결
- **`tsq log compact`** - 오래된 로그 압축/아카이빙
  - `--days <n>` 옵션 (기본 30일), `--dry-run` 미리보기

#### 프로젝트 초기화
- **`.gitignore` 자동 생성** - `tsq init` 시 프로젝트 맞춤 `.gitignore` 생성

### Changed
- 메트릭 시스템 대폭 강화 (토큰 추적, 캐시 적중률, CLI 채택률, 트렌드)
- 회고 시스템 확장 (자동화 파이프라인 + retro → improve 자동 연결)

---

## [2.0.0] - 2026-02-08

### Added
- **Node.js CLI 구현** (`tsq` / `timsquad` 명령어, npm 배포)
- 15개 CLI 명령어 그룹 (init, status, q, f, log, feedback, retro, metrics, improve, watch, session, commit, pr, release, sync)
- 8개 전문 에이전트 (planner, developer, qa, security, dba, designer, prompter, retro)
- 14개 SSOT 문서 템플릿 (레벨별 자동 선택)
- 12+ 스킬 파일 (Node.js, React, Next.js, Prisma, TDD, BDD, DDD 등)
- Claude Code Hook 시스템 (event-logger.sh, auto-worklog.sh)
- 피드백 라우팅 (Level 1/2/3 자동 분류, 15개 트리거)
- 분수(Fountain) 모델: SSOT 순차 + 작업 병렬
- CLAUDE.md 템플릿 (PM 역할 정의, 위임 규칙)
- XML 문서 생성기 (PRD, Data Design, Service Spec, Requirements)
- 프로젝트 타입별 워크플로우 (6개 타입)

---

## [1.0.0] - 2026-02-01

### Added
- 초기 bash 스크립트 기반 프레임워크
- 기본 에이전트 구조 설계
- SSOT 문서 체계 초안

---

[3.7.0]: https://github.com/sonature-lab/timsquad/compare/v3.6.0...v3.7.0
[3.6.0]: https://github.com/sonature-lab/timsquad/compare/v3.5.0...v3.6.0
[3.5.0]: https://github.com/sonature-lab/timsquad/compare/v3.4.0...v3.5.0
[3.4.0]: https://github.com/sonature-lab/timsquad/compare/v3.3.0...v3.4.0
[3.3.0]: https://github.com/sonature-lab/timsquad/compare/v3.2.0...v3.3.0
[3.2.0]: https://github.com/sonature-lab/timsquad/compare/v3.1.0...v3.2.0
[3.1.0]: https://github.com/sonature-lab/timsquad/compare/v3.0.0...v3.1.0
[3.0.0]: https://github.com/sonature-lab/timsquad/compare/v2.1.0...v3.0.0
[2.1.0]: https://github.com/sonature-lab/timsquad/compare/v2.0.0...v2.1.0
[2.0.0]: https://github.com/sonature-lab/timsquad/releases/tag/v2.0.0
[1.0.0]: https://github.com/sonature-lab/timsquad/releases/tag/v1.0.0

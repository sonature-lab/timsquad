# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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

[3.3.0]: https://github.com/sonature-lab/timsquad/compare/v3.2.0...v3.3.0
[3.2.0]: https://github.com/sonature-lab/timsquad/compare/v3.1.0...v3.2.0
[3.1.0]: https://github.com/sonature-lab/timsquad/compare/v3.0.0...v3.1.0
[3.0.0]: https://github.com/sonature-lab/timsquad/compare/v2.1.0...v3.0.0
[2.1.0]: https://github.com/sonature-lab/timsquad/compare/v2.0.0...v2.1.0
[2.0.0]: https://github.com/sonature-lab/timsquad/releases/tag/v2.0.0
[1.0.0]: https://github.com/sonature-lab/timsquad/releases/tag/v1.0.0

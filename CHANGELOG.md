# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.1.0] - 2026-02-13

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
  - `type: "auto-feedback"`, `trigger: "tool_failure"` 태그
  - 수동 개입 없이 문제 패턴 자동 축적
- **event-logger.sh 체인 실행** - SessionEnd 시 auto-worklog + auto-metrics 병렬 실행

#### 새 CLI 명령어
- **`tsq retro auto`** - 회고 사이클 원클릭 자동 실행
  - start → collect → report → apply 전체 파이프라인
  - `--local` 옵션으로 GitHub Issue 생성 생략 가능
  - 완료 후 `tsq improve fetch` + `tsq improve analyze` 자동 연결
  - 기존 진행 중 사이클 감지 시 이어서 진행
- **`tsq log compact`** - 오래된 로그 압축/아카이빙
  - 세션 JSONL → 월별 summary JSON (통계 보존, 원본 삭제)
  - 작업 로그 MD → 월별 archive MD (내용 병합, 원본 삭제)
  - `--days <n>` 옵션 (기본 30일)
  - `--dry-run` 미리보기 지원

#### 프로젝트 초기화
- **`.gitignore` 자동 생성** - `tsq init` 시 프로젝트 맞춤 `.gitignore` 생성
  - `.timsquad/`, `.claude/`, `CLAUDE.md`는 git 추적 대상
  - 런타임 로그/세션 데이터만 제외
  - 기존 `.gitignore`가 있으면 건드리지 않음

### Changed

- **메트릭 시스템 대폭 강화** - 토큰 추적, 캐시 적중률, CLI 채택률, 트렌드 분석
- **회고 시스템 확장** - 자동화 파이프라인 + retro → improve 자동 연결
- **에이전트 프롬프트** - CLI 사용 의무 조항 추가 (`tsq` 명령어 우선 사용)
- **워크플로우 프로세스** - state-machine.xml, workflow-base.xml 추가

## [2.0.0] - 2026-02-03

### Added

- Node.js CLI 구현 (`tsq` / `timsquad` 명령어)
- npm 패키지 배포 구조 (`bin/tsq.js`, `dist/`, `templates/`)
- **15개 CLI 명령어 그룹:**
  - `tsq init` - 프로젝트 초기화 (6개 타입, 3개 레벨)
  - `tsq status` - 프로젝트 상태 확인
  - `tsq q` / `tsq quick` - Quick 모드 (간단한 작업)
  - `tsq f` / `tsq full` - Full 모드 (SSOT 검증)
  - `tsq log` - 작업 로그 관리 (add, list, view, today, search, summary)
  - `tsq feedback` - 피드백 라우팅 (3레벨, 15개 트리거)
  - `tsq retro` - 회고 시스템 (phase, start, collect, analyze, report, apply, status)
  - `tsq metrics` - 메트릭 (collect, summary, trend, export)
  - `tsq improve` - 개선 분석 (fetch, analyze, summary)
  - `tsq watch` - SSOT 파일 감시
  - `tsq session` - 세션 관리
  - `tsq commit` - Git 커밋 (Co-Author 자동)
  - `tsq pr` - Pull Request 생성
  - `tsq release` - 릴리즈 생성
  - `tsq sync` - 브랜치 동기화
- **8개 전문 에이전트** (planner, developer, qa, security, dba, designer, prompter, retro)
- **14개 SSOT 문서 템플릿** (PRD, Planning, Requirements, Service Spec 등)
- **3개 아키텍처 패턴** (Hexagonal, FSD, Clean Architecture)
- **12+ 스킬 파일** (Node.js, React, Next.js, Prisma, TDD, BDD, DDD 등)
- **Claude Code Hook 시스템** (event-logger.sh, auto-worklog.sh)
- **피드백 라우팅** (Level 1/2/3 자동 분류, 15개 트리거)
- CLAUDE.md 템플릿 (PM 역할 정의, 위임 규칙, 금지 행동)
- XML 문서 생성기 (PRD, Data Design, Service Spec, Requirements)
- 프로젝트 타입별 워크플로우 (web-service, web-app, api-backend, platform, fintech, infra)

[2.1.0]: https://github.com/sonature-lab/timsquad/compare/v2.0.0...v2.1.0
[2.0.0]: https://github.com/sonature-lab/timsquad/releases/tag/v2.0.0

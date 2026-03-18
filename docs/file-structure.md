[English](file-structure.en.md) | [**한국어**](file-structure.md)

# File Structure

> PRD Section 8에서 분리된 문서. v3.7 기준.

## 템플릿 구조

```
/timsquad
├── /templates
│   ├── /base                              # 플랫폼 무관 공통 템플릿
│   │   ├── config.template.yaml           # TimSquad 설정 템플릿
│   │   │
│   │   ├── /agents                        # 에이전트 정의
│   │   │   ├── /base                      # 기본 에이전트 (7개)
│   │   │   │   ├── tsq-architect.md       # 아키텍처 설계
│   │   │   │   ├── tsq-developer.md       # 코드 구현
│   │   │   │   ├── tsq-qa.md              # 검증/리뷰
│   │   │   │   ├── tsq-security.md        # 보안 검토
│   │   │   │   ├── tsq-dba.md             # DB 설계
│   │   │   │   ├── tsq-designer.md        # UI/UX 설계
│   │   │   │   └── tsq-librarian.md       # Phase 기록 전담
│   │   │   └── /overlays                  # 에이전트 오버레이
│   │   │       ├── /platform              # 플랫폼별 오버레이
│   │   │       │   └── claude-code.md
│   │   │       └── /domain                # 도메인별 오버레이
│   │   │           ├── general-web/
│   │   │           └── mobile/
│   │   │
│   │   ├── /skills                        # tsq-* flat namespace 스킬 (34개)
│   │   │   ├── _template/                 # 스킬 생성 템플릿
│   │   │   ├── _shared/                   # 공통 참조 자료
│   │   │   │
│   │   │   │  # --- 핵심 프로토콜 ---
│   │   │   ├── tsq-protocol/              # 에이전트 공통 프로토콜
│   │   │   ├── tsq-controller/            # Context DI 컨트롤러
│   │   │   │
│   │   │   │  # --- 코딩/테스트 ---
│   │   │   ├── tsq-coding/                # 코딩 규칙
│   │   │   ├── tsq-testing/               # 테스트 전략
│   │   │   ├── tsq-typescript/            # TypeScript 패턴
│   │   │   ├── tsq-hono/                  # Hono 웹 프레임워크
│   │   │   │
│   │   │   │  # --- 설계/기획 ---
│   │   │   ├── tsq-architecture/          # 아키텍처 설계
│   │   │   ├── tsq-planning/              # 기획
│   │   │   ├── tsq-spec/                  # 스펙 작성 (/spec)
│   │   │   ├── tsq-security/              # 보안
│   │   │   ├── tsq-database/              # DB 설계
│   │   │   ├── tsq-prisma/                # Prisma ORM
│   │   │   │
│   │   │   │  # --- 프론트엔드 ---
│   │   │   ├── tsq-react/                 # React
│   │   │   ├── tsq-nextjs/                # Next.js + Vercel 룰
│   │   │   ├── tsq-ui/                    # UI 디자인
│   │   │   │
│   │   │   │  # --- 모바일 ---
│   │   │   ├── tsq-dart/                  # Dart 언어
│   │   │   ├── tsq-flutter/               # Flutter
│   │   │   │
│   │   │   │  # --- 방법론 ---
│   │   │   ├── tsq-tdd/                   # TDD
│   │   │   ├── tsq-bdd/                   # BDD
│   │   │   ├── tsq-ddd/                   # DDD
│   │   │   ├── tsq-debugging/             # 디버깅
│   │   │   │
│   │   │   │  # --- 품질/감사 ---
│   │   │   ├── tsq-product-audit/         # 제품 감사 (7영역, 정량 스코어링)
│   │   │   │   ├── rules/                 # audit-protocol, scoring, FP guard
│   │   │   │   ├── checklists/            # 01-security ~ 07-functional
│   │   │   │   └── templates/             # 보고서 + 개선 계획 양식
│   │   │   ├── tsq-audit/                 # 감사 실행 (/audit, /review 통합)
│   │   │   ├── tsq-stability/             # 안정성 검증
│   │   │   │
│   │   │   │  # --- 운영/기록 ---
│   │   │   ├── tsq-librarian/             # Librarian (Phase 기록)
│   │   │   ├── tsq-log/                   # 로깅
│   │   │   ├── tsq-retro/                 # 회고
│   │   │   ├── tsq-prompt/                # 프롬프트 최적화
│   │   │   │
│   │   │   │  # --- 슬래시 커맨드 ---
│   │   │   ├── tsq-start/                 # /start
│   │   │   ├── tsq-status/                # /status
│   │   │   ├── tsq-update/                # /update
│   │   │   └── tsq-delete/                # /delete
│   │   │
│   │   ├── /knowledge                     # 에이전트 참조 지식
│   │   │   ├── /checklists                # 보안, 접근성, SSOT 검증
│   │   │   ├── /templates                 # 출력 형식 (task-result 등)
│   │   │   ├── /platforms                 # 플랫폼별 지식
│   │   │   └── /domains                   # 도메인별 지식
│   │   │
│   │   └── /timsquad                      # -> .timsquad/ 로 복사
│   │       ├── ssot-map.template.yaml     # SSOT 맵 템플릿
│   │       ├── /ssot                      # SSOT 문서 템플릿 (14개)
│   │       │   ├── prd.template.md
│   │       │   ├── planning.template.md
│   │       │   ├── requirements.template.md
│   │       │   ├── service-spec.template.md
│   │       │   ├── functional-spec.template.md
│   │       │   ├── data-design.template.md
│   │       │   ├── ui-ux-spec.template.md
│   │       │   ├── test-spec.template.md
│   │       │   ├── security-spec.template.md
│   │       │   ├── deployment-spec.template.md
│   │       │   ├── integration-spec.template.md
│   │       │   ├── env-config.template.md
│   │       │   ├── glossary.template.md
│   │       │   ├── error-codes.template.md
│   │       │   └── /adr
│   │       │       ├── ADR-000-template.md
│   │       │       └── ADR-001-example.md
│   │       ├── /architectures             # 아키텍처 패턴 템플릿
│   │       │   ├── clean/
│   │       │   ├── hexagonal/
│   │       │   └── fsd/
│   │       ├── /generators                # 문서 생성기 (XML)
│   │       ├── /process                   # 워크플로우 정의
│   │       ├── /constraints               # 제약조건
│   │       ├── /retrospective             # 회고 시스템
│   │       ├── /patterns                  # 성공/실패 패턴
│   │       ├── /logs                      # 로그 템플릿
│   │       └── /state                     # 상태 관리
│   │           └── workspace.xml
│   │
│   ├── /platforms                         # 플랫폼별 확장
│   │   └── /claude-code
│   │       ├── /rules                     # 경로별 규칙 (.claude/rules/) — 15개
│   │       └── /scripts                   # Hook 스크립트 — 12개
│   │           ├── build-gate.sh          # 빌드 게이트
│   │           ├── change-scope-guard.sh  # 변경 범위 초과 차단
│   │           ├── check-capability.sh    # Capability Token 검증
│   │           ├── completion-guard.sh    # 완료 검증
│   │           ├── context-restore.sh     # 컨텍스트 복원
│   │           ├── e2e-commit-gate.sh     # E2E 커밋 게이트
│   │           ├── e2e-marker.sh          # E2E 결과 마커
│   │           ├── phase-guard.sh         # Phase 파일 제약
│   │           ├── pre-compact.sh         # Compact 전 상태 저장
│   │           └── safe-guard.sh          # 파괴적 명령 차단
│   │
│   ├── /project-types                     # 프로젝트 타입별 설정
│   │   ├── web-service/                   # SaaS, 풀스택
│   │   ├── web-app/                       # BaaS 기반
│   │   ├── api-backend/                   # API 서버
│   │   ├── platform/                      # 프레임워크/SDK
│   │   ├── fintech/                       # 거래소/결제 (Level 3 강제)
│   │   ├── mobile-app/                    # 모바일 앱
│   │   └── infra/                         # DevOps
│   │
│   └── /domains                           # 도메인 오버레이 (npm 제외)
│
├── /src                                   # CLI 소스 코드
│   ├── index.ts                           # 진입점
│   ├── /commands                          # CLI 명령어 (3개)
│   │   ├── init.ts                        # tsq init — 프로젝트 초기화
│   │   ├── update.ts                      # tsq update — 스킬/에이전트 업데이트
│   │   └── daemon.ts                      # tsq daemon — 백그라운드 데몬
│   ├── /daemon                            # 백그라운드 데몬
│   ├── /lib                               # 핵심 라이브러리
│   ├── /types                             # TypeScript 타입
│   └── /utils                             # 유틸리티
│
├── /tests                                 # 테스트 (vitest)
│   ├── /helpers
│   ├── /unit
│   ├── /integration
│   └── /e2e
│
└── /docs                                  # 설계 문서
```

## 프로젝트 초기화 후 구조

`tsq init -t web-service -l 2` 실행 후:

```
/my-project
├── CLAUDE.md                              # PM 역할 정의 (<!-- tsq:start/end --> 마커 주입)
│
├── /.claude                               # Claude Code 네이티브 구조
│   ├── settings.json                      # Claude Code 설정 (hooks 포함)
│   ├── /rules                             # 경로별 규칙 (platforms/claude-code/)
│   ├── /agents                            # 7개 전문 에이전트
│   │   ├── tsq-architect.md               # 아키텍처 설계 (Sonnet)
│   │   ├── tsq-developer.md               # 코드 구현 (Sonnet)
│   │   ├── tsq-qa.md                      # 검증/리뷰 (Sonnet)
│   │   ├── tsq-security.md                # 보안 검토 (Sonnet)
│   │   ├── tsq-dba.md                     # DB 설계 (Sonnet)
│   │   ├── tsq-designer.md                # UI/UX 설계 (Sonnet)
│   │   └── tsq-librarian.md               # Phase 기록 전담 (Sonnet)
│   │
│   ├── /skills                            # tsq-* 스킬 (프로젝트 타입에 따라 선택 배치)
│   │   ├── tsq-protocol/                  # 에이전트 공통 프로토콜
│   │   ├── tsq-controller/                # Context DI + SSOT 주입
│   │   ├── tsq-coding/                    # 코딩 규칙
│   │   ├── tsq-testing/                   # 테스트 전략
│   │   ├── tsq-typescript/                # TypeScript 패턴
│   │   ├── tsq-react/                     # React (config에 따라)
│   │   ├── tsq-nextjs/                    # Next.js + Vercel 룰 (config에 따라)
│   │   ├── tsq-database/                  # DB 설계
│   │   ├── tsq-product-audit/             # 제품 감사 (7영역, 정량 스코어링)
│   │   │   ├── rules/                     # 감사 프로토콜, 스코어링, FP 가드
│   │   │   ├── checklists/               # 01-security ~ 07-functional
│   │   │   └── templates/                # 보고서 + 개선 계획
│   │   ├── tsq-tdd/                       # 선택된 방법론 (config에 따라)
│   │   └── ...                            # 기타 (config에 따라)
│   │
│   └── /knowledge                         # 에이전트 참조 지식
│       ├── /checklists                    # 보안, 접근성, SSOT 검증
│       └── /templates                     # 출력 형식 (task-result 등)
│
└── /.timsquad                             # TimSquad 전용 구조
    ├── config.yaml                        # 프로젝트 설정 (name, type, level, domain, stack)
    │
    ├── /ssot                              # SSOT 문서 (레벨별 5~14개)
    │   ├── prd.md
    │   ├── planning.md
    │   ├── requirements.md
    │   ├── service-spec.md
    │   ├── data-design.md
    │   ├── test-spec.md (L2+)
    │   ├── glossary.md (L2+)
    │   ├── error-codes.md (L2+)
    │   ├── security-spec.md (L3+)
    │   └── /adr
    │       └── ADR-000-template.md
    │
    ├── /process                           # 워크플로우 정의
    │   ├── workflow.xml
    │   └── phase-checklist.yaml
    │
    ├── /constraints                       # 제약조건
    │   ├── ssot-schema.xml
    │   └── competency-framework.xml
    │
    ├── /state                             # 상태 관리
    │   ├── current-phase.json
    │   ├── decisions.jsonl                # Decision Log (Phase 중 누적)
    │   ├── phase-memory.md               # 이전 Phase 요약 (슬라이딩 윈도우)
    │   ├── onboarding-progress.json      # 온보딩 진행 상태 (grill 큐, SSOT 충족도)
    │   └── /meta-index                    # 코드/UI 구조 인덱스
    │
    ├── /trails                            # Phase별 사고과정 아카이브
    │   ├── phase-{id}.md                  # Phase Trail (작업/결정/보류 요약)
    │   └── phase-{id}-decisions.jsonl     # Decision Log 아카이브
    │
    ├── /retrospective                     # 회고 데이터
    │   ├── /cycles
    │   ├── /metrics
    │   ├── /patterns
    │   └── /improvements
    │
    ├── /.daemon                             # 데몬 런타임 상태 (gitignore)
    │   ├── daemon.pid                       # 데몬 PID
    │   ├── session-state.json               # 세션 메트릭 (토큰, 이벤트)
    │   └── drift-warnings.json              # SSOT Drift 경고 (7일+ 미갱신 문서)
    │
    └── /logs                              # 3계층 로그 (L1->L2->L3)
```

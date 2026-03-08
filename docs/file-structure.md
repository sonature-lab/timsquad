[English](file-structure.en.md) | [**한국어**](file-structure.md)

# File Structure

> PRD Section 8에서 분리된 문서. v3.5 기준.

## 템플릿 구조

```
/timsquad
├── /templates
│   ├── /base                              # 플랫폼 무관 공통 템플릿
│   │   ├── CLAUDE.md.template             # PM 역할 정의 템플릿
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
│   │   │       └── /domain                # 도메인별 오버레이
│   │   │
│   │   ├── /skills                        # 도메인별 스킬셋
│   │   │   ├── _template/                 # 스킬 생성 템플릿
│   │   │   ├── _shared/                   # 공통 참조 자료
│   │   │   ├── tsq-protocol/              # 에이전트 공통 프로토콜
│   │   │   ├── tsq-cli/                   # TSQ CLI 사용법
│   │   │   ├── main-session-constraints/  # 메인 세션 제약
│   │   │   ├── controller/                # Context DI 컨트롤러
│   │   │   │   ├── rules/
│   │   │   │   ├── triggers/
│   │   │   │   ├── delegation/
│   │   │   │   ├── memory/
│   │   │   │   └── references/
│   │   │   ├── coding/                    # 코딩 규칙 + rules/
│   │   │   ├── testing/                   # 테스트 전략 + references/
│   │   │   ├── typescript/                # TypeScript 패턴 + rules/
│   │   │   ├── architecture/              # 아키텍처 설계 + references/
│   │   │   ├── planning/                  # 기획 + references/
│   │   │   ├── security/                  # 보안 + rules/ + scripts/
│   │   │   ├── database/                  # DB 설계 + rules/
│   │   │   │   └── prisma/               # Prisma ORM
│   │   │   ├── frontend/                  # 프론트엔드
│   │   │   │   ├── react/                # React
│   │   │   │   └── nextjs/              # Next.js + Vercel 22개 룰
│   │   │   ├── backend/node/              # Node.js 백엔드
│   │   │   ├── mobile/                    # 모바일
│   │   │   │   ├── dart/                 # Dart 언어 + rules/
│   │   │   │   └── flutter/              # Flutter + rules/ + refs/
│   │   │   │       └── push-notifications/ # FCM + 로컬 + 백그라운드
│   │   │   ├── product-audit/             # 제품 감사 (7영역, 156항목)
│   │   │   │   ├── rules/                # audit-protocol, scoring, FP guard
│   │   │   │   ├── checklists/           # 01-security ~ 07-functional
│   │   │   │   └── templates/            # 보고서 + 개선 계획 양식
│   │   │   ├── audit/                     # 감사 실행 스킬
│   │   │   ├── review/                    # 코드 리뷰 스킬
│   │   │   ├── spec/                      # 스펙 작성 스킬
│   │   │   ├── librarian/                 # Librarian 스킬
│   │   │   ├── prompt-engineering/        # 프롬프트 최적화
│   │   │   ├── retrospective/             # 회고 + references/
│   │   │   ├── ui-design/                 # UI 디자인
│   │   │   ├── stability-verification/    # 안정성 검증 + scripts/
│   │   │   └── methodology/               # 개발 방법론
│   │   │       ├── tdd/
│   │   │       ├── bdd/
│   │   │       ├── ddd/
│   │   │       └── debugging/
│   │   │
│   │   ├── /knowledge                     # 에이전트 참조 지식
│   │   │   ├── /checklists                # 보안, 접근성, SSOT 검증
│   │   │   ├── /templates                 # 출력 형식 (task-result 등)
│   │   │   ├── /platforms                 # 플랫폼별 지식
│   │   │   └── /domains                   # 도메인별 지식
│   │   │
│   │   └── /timsquad                      # → .timsquad/ 로 복사
│   │       ├── /ssot                      # SSOT 문서 템플릿
│   │       │   ├── prd.template.md
│   │       │   ├── planning.template.md
│   │       │   ├── requirements.template.md
│   │       │   ├── service-spec.template.md
│   │       │   ├── data-design.template.md
│   │       │   ├── test-spec.template.md
│   │       │   └── adr/
│   │       ├── /architectures             # 아키텍처 패턴 템플릿
│   │       │   ├── clean/
│   │       │   ├── hexagonal/
│   │       │   └── fsd/
│   │       ├── /generators                # 문서 생성기 (XML)
│   │       ├── /process                   # 워크플로우 정의
│   │       ├── /constraints               # 제약조건
│   │       ├── /feedback                  # 피드백 라우팅
│   │       ├── /retrospective             # 회고 시스템
│   │       ├── /patterns                  # 성공/실패 패턴
│   │       ├── /logs                      # 로그 템플릿
│   │       └── /state                     # 상태 관리
│   │
│   ├── /platforms                         # 플랫폼별 확장
│   │   └── /claude-code
│   │       ├── /rules                     # 경로별 규칙 (.claude/rules/)
│   │       └── /scripts                   # Hook 스크립트
│   │           ├── skill-inject.sh        # 스킬 자동 주입
│   │           ├── completion-guard.sh    # 완료 검증
│   │           ├── build-gate.sh          # 빌드 게이트
│   │           ├── phase-guard.sh         # Phase 파일 제약
│   │           ├── safe-guard.sh          # 파괴적 명령 차단
│   │           └── e2e-marker.sh          # E2E 결과 마커
│   │
│   ├── /project-types                     # 프로젝트 타입별 설정
│   │   ├── web-service/                   # SaaS, 풀스택
│   │   ├── web-app/                       # BaaS 기반
│   │   ├── api-backend/                   # API 서버 + agents/
│   │   ├── platform/                      # 프레임워크/SDK + agents/
│   │   ├── fintech/                       # 거래소/결제 (Level 3 강제)
│   │   ├── mobile-app/                    # 모바일 앱
│   │   └── infra/                         # DevOps + agents/
│   │
│   └── /domains                           # 도메인 오버레이 (npm 제외)
│
├── /src                                   # CLI 소스 코드
│   ├── index.ts                           # 진입점
│   ├── /commands                          # CLI 명령어
│   ├── /daemon                            # 백그라운드 데몬
│   ├── /lib                               # 핵심 라이브러리
│   ├── /types                             # TypeScript 타입
│   └── /utils                             # 유틸리티
│
├── /tests                                 # 테스트 (vitest)
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
├── CLAUDE.md                              # PM 역할 정의 (에이전트 지시사항)
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
│   ├── /skills                            # 도메인별 스킬셋 (프로젝트 타입에 따라 선택 배치)
│   │   ├── tsq-protocol/                  # 에이전트 공통 프로토콜
│   │   ├── controller/                    # Context DI + SSOT 주입
│   │   ├── coding/                        # 코딩 규칙 + rules/
│   │   ├── testing/                       # 테스트 전략 + references/
│   │   ├── typescript/                    # TypeScript 패턴 + rules/
│   │   ├── frontend/(react|nextjs)/       # 프론트엔드 + Vercel 룰
│   │   ├── backend/node/                  # Node.js 백엔드
│   │   ├── database/                      # DB 설계 + rules/
│   │   ├── product-audit/                 # 제품 감사 (7영역, 156항목)
│   │   │   ├── rules/                     # 감사 프로토콜, 스코어링, FP 가드
│   │   │   ├── checklists/               # 01-security ~ 07-functional
│   │   │   └── templates/                # 보고서 + 개선 계획
│   │   ├── methodology/(tdd|bdd)/         # 선택된 방법론
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
    │   └── /meta-index                    # 코드/UI 구조 인덱스
    │
    ├── /feedback                          # 피드백 저장소
    │   └── routing-rules.yaml
    │
    ├── /retrospective                     # 회고 데이터
    │   ├── /cycles
    │   ├── /metrics
    │   ├── /patterns
    │   └── /improvements
    │
    └── /logs                              # 3계층 로그 (L1→L2→L3)
```

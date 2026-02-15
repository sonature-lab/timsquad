# File Structure

> PRD Section 8에서 분리된 문서

## 템플릿 구조

```
/timsquad
├── /templates
│   ├── /common
│   │   ├── CLAUDE.md.template           # 프로젝트 CLAUDE.md 템플릿
│   │   ├── config.template.yaml         # TimSquad 설정 템플릿
│   │   │
│   │   ├── /claude                      # → .claude/ 로 복사
│   │   │   ├── /agents                  # 에이전트 정의 (Markdown)
│   │   │   │   ├── tsq-planner.md
│   │   │   │   ├── tsq-developer.md
│   │   │   │   ├── tsq-qa.md
│   │   │   │   ├── tsq-security.md
│   │   │   │   ├── tsq-dba.md
│   │   │   │   ├── tsq-designer.md
│   │   │   │   ├── tsq-prompter.md
│   │   │   │   └── tsq-retro.md
│   │   │   │
│   │   │   └── /skills                  # 스킬 정의 (SKILL.md)
│   │   │       ├── coding/
│   │   │       ├── testing/
│   │   │       ├── architecture/
│   │   │       ├── planning/
│   │   │       ├── database/
│   │   │       ├── security/
│   │   │       ├── ui-ux/
│   │   │       ├── retrospective/
│   │   │       └── methodology/
│   │   │           ├── tdd/
│   │   │           ├── bdd/
│   │   │           └── ddd/
│   │   │
│   │   └── /timsquad                    # → .timsquad/ 로 복사
│   │       ├── /ssot                    # SSOT 문서 템플릿
│   │       │   ├── prd.template.md
│   │       │   ├── planning.template.md
│   │       │   ├── requirements.template.md
│   │       │   ├── service-spec.template.md
│   │       │   ├── data-design.template.md
│   │       │   ├── test-spec.template.md
│   │       │   └── adr/
│   │       │
│   │       ├── /generators              # 문서 생성기 (XML)
│   │       │   ├── prd.xml              # PRD 생성기
│   │       │   ├── requirements.xml     # 요구사항 생성기
│   │       │   ├── service-spec.xml     # API 명세 생성기
│   │       │   └── data-design.xml      # 데이터 설계 생성기
│   │       │
│   │       ├── /process                 # 프로세스 정의
│   │       │   ├── workflow-base.xml
│   │       │   ├── validation-rules.xml
│   │       │   └── state-machine.xml
│   │       │
│   │       ├── /constraints             # 제약조건
│   │       │   ├── ssot-schema.xml
│   │       │   └── competency-framework.xml
│   │       │
│   │       ├── /feedback                # 피드백 라우팅
│   │       │   └── routing-rules.yaml
│   │       │
│   │       ├── /retrospective           # 회고 시스템
│   │       │   ├── cycle-report.template.md
│   │       │   ├── metrics-schema.json
│   │       │   └── patterns/
│   │       │
│   │       ├── /logs                    # 로그 템플릿
│   │       │   ├── _template.md
│   │       │   └── _example.md
│   │       │
│   │       └── /state                   # 상태 관리
│   │           └── workspace.xml
│   │
│   ├── /web-service
│   │   ├── /process
│   │   └── config.yaml
│   │
│   ├── /fintech
│   │   ├── /process
│   │   └── config.yaml                  # consensus: always
│   │
│   └── /...
│
├── /scripts
│   ├── init.sh                          # tsq init
│   ├── log.sh                           # tsq log
│   ├── status.sh                        # tsq status
│   ├── retro.sh                         # tsq retro
│   └── feedback.sh                      # tsq feedback
│
├── /install
│   └── install.sh                       # 설치 스크립트
│
└── /cli
    └── index.js
```

## 프로젝트 초기화 후 구조

```
/my-project
├── CLAUDE.md                            # 프로젝트 컨텍스트 (PM 역할 정의)
│
├── /.claude                             # Claude Code 네이티브 구조
│   ├── /agents                          # 에이전트 정의
│   │   ├── tsq-planner.md               # 기획/설계
│   │   ├── tsq-developer.md             # 구현
│   │   ├── tsq-qa.md                    # 검증/리뷰
│   │   ├── tsq-security.md              # 보안
│   │   ├── tsq-dba.md                   # DB 설계
│   │   ├── tsq-designer.md              # UI/UX 설계
│   │   ├── tsq-prompter.md              # 프롬프트 최적화
│   │   └── tsq-retro.md                 # 회고 분석
│   │
│   └── /skills                          # 스킬 파일
│       ├── coding/SKILL.md
│       ├── testing/SKILL.md
│       ├── architecture/SKILL.md
│       ├── planning/SKILL.md
│       ├── database/SKILL.md
│       ├── security/SKILL.md
│       ├── ui-ux/SKILL.md
│       ├── retrospective/SKILL.md
│       └── methodology/
│           ├── tdd/SKILL.md
│           ├── bdd/SKILL.md
│           └── ddd/SKILL.md
│
└── /.timsquad                           # TimSquad 전용 구조
    ├── config.yaml                      # 프로젝트 설정 (name, type, level + v4.0: domain, platform, stack)
    │
    ├── /ssot                            # SSOT 문서
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
    ├── /generators                      # 문서 생성기 (XML)
    │   ├── prd.xml
    │   ├── requirements.xml
    │   ├── service-spec.xml
    │   └── data-design.xml
    │
    ├── /process                         # 프로세스 정의
    │   ├── workflow-base.xml
    │   ├── validation-rules.xml
    │   └── state-machine.xml
    │
    ├── /constraints                     # 제약조건
    │   ├── ssot-schema.xml
    │   └── competency-framework.xml
    │
    ├── /state                           # 현재 상태
    │   ├── current-phase.json
    │   └── workspace.xml
    │
    ├── /knowledge                       # 프로젝트 지식
    │   ├── tribal.md
    │   ├── lessons.md
    │   └── constraints.md
    │
    ├── /feedback                        # 피드백 시스템
    │   └── routing-rules.yaml
    │
    ├── /retrospective                   # 회고 시스템
    │   ├── /cycles                      # 사이클별 리포트
    │   ├── /metrics                     # 메트릭 데이터
    │   ├── /patterns                    # 성공/실패 패턴
    │   └── /improvements                # 개선 이력
    │       ├── /prompts
    │       └── /templates
    │
    └── /logs                            # 작업 로그
        └── _template.md
```

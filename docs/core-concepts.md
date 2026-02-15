# Core Concepts

> PRD Section 2에서 분리된 문서

## 2.1 분수(Fountain) 모델

기존 워터폴의 순차적 한계와 애자일의 문서 부재 문제를 해결하는 하이브리드 모델.

```
┌─────────────────────────────────────────────────────────────┐
│                    SSOT (순차적 의존성)                      │
│  진실의 원천 - 모든 에이전트가 참조하는 단일 문서 체계         │
└─────────────────────────────────────────────────────────────┘
                              │
     ┌────────────────────────┼────────────────────────┐
     ▼                        ▼                        ▼
┌─────────┐            ┌─────────┐            ┌─────────┐
│화면설계  │            │요건정의  │            │서비스명세│  ← 병렬 작업
└────┬────┘            └────┬────┘            └────┬────┘
     │                      │                      │
     └──────────────────────┼──────────────────────┘
                            ▼
                ┌───────────┴───────────┐
                │   ERD + 구현 (병렬)    │
                └───────────┬───────────┘
                            ▼
                      ┌─────────┐
                      │ QA/Test │
                      └────┬────┘
                           │
              ┌────────────┼────────────┐
              ▼            ▼            ▼
         Level 1      Level 2      Level 3
        구현 수정     설계 수정    PRD/기획 수정
                           │
                           ▼
                  ┌─────────────────┐
                  │ Retrospective   │  ← 회고적 학습
                  │ Learning        │
                  └────────┬────────┘
                           ▼
              템플릿/프롬프트 자동 개선
```

**핵심 원칙:**
- SSOT 문서는 순차적 의존성 (PRD → 기획 → 설계 → 구현)
- 실제 작업은 병렬 실행 가능 (분수처럼 퍼짐)
- 피드백은 레벨에 따라 적절한 단계로 라우팅
- **매 사이클 종료 시 회고적 학습으로 개선**

## 2.2 SSOT (Single Source of Truth) 문서 체계

```
/ssot
├── prd.md              # 제품 요구사항 (Why)
├── planning.md         # 기획서 (Overview)
├── glossary.md         # 용어 사전
│
├── requirements.md     # 요건 정의 (What)
├── functional-spec.md  # 기능 명세 (How - 사용자 관점)
├── ui-ux-spec.md       # 화면 설계
│
├── service-spec.md     # API 명세 (프론트-백 계약서)
├── error-codes.md      # 에러 코드 통합
├── data-design.md      # ERD, 데이터 설계
│
├── env-config.md       # 환경 설정
├── deployment-spec.md  # 배포 명세
├── integration-spec.md # 외부 연동 명세
│
├── test-spec.md        # 테스트 명세
├── security-spec.md    # 보안 명세
│
└── adr/                # Architecture Decision Records
    └── ADR-XXX.md
```

**문서별 역할:**

| 문서 | 역할 | 작성 에이전트 |
|-----|------|-------------|
| prd.md | 왜 만드는지, 목표, 성공 지표 | Planner (PM) |
| planning.md | 전체 계획, 마일스톤, 일정 | Planner (PM) |
| glossary.md | 도메인 용어 정의 | Planner (Planning) |
| requirements.md | 기능/비기능 요건 | Planner (Planning) |
| functional-spec.md | 기능 시나리오, 예외처리 | Planner (Planning) |
| ui-ux-spec.md | 화면 설계, 와이어프레임, 플로우 | Designer |
| service-spec.md | API 엔드포인트, Request/Response | Planner (Architect) |
| error-codes.md | 에러 코드, 메시지, HTTP 상태 | Planner (Architect) |
| data-design.md | ERD, 테이블 정의, 인덱스 | DBA |
| env-config.md | 환경변수, 시크릿 목록 | Planner (Architect) |
| deployment-spec.md | 인프라, CI/CD, 배포 환경 | DevOps |
| integration-spec.md | 외부 API 연동, Webhook | Planner (Architect) |
| test-spec.md | 테스트 케이스, 시나리오 | QA |
| security-spec.md | 보안 요건, 인증/인가, 암호화 | Security |
| adr/ | 아키텍처 결정 기록 | Planner (Architect) |

**프로젝트 레벨별 필수 문서:**

| 문서 | Level 1 (MVP) | Level 2 (Standard) | Level 3 (Enterprise) |
|-----|:-------------:|:------------------:|:--------------------:|
| prd.md | ✅ | ✅ | ✅ |
| planning.md | ✅ | ✅ | ✅ |
| glossary.md | ⚪ | ✅ | ✅ |
| requirements.md | ✅ | ✅ | ✅ |
| functional-spec.md | ⚪ | ✅ | ✅ |
| ui-ux-spec.md | ⚪ | ✅ | ✅ |
| service-spec.md | ✅ | ✅ | ✅ |
| error-codes.md | ⚪ | ✅ | ✅ |
| data-design.md | ✅ | ✅ | ✅ |
| env-config.md | ⚪ | ✅ | ✅ |
| deployment-spec.md | ⚪ | ⚪ | ✅ |
| integration-spec.md | ⚪ | ⚪ | ✅ |
| test-spec.md | ⚪ | ✅ | ✅ |
| security-spec.md | ⚪ | ⚪ | ✅ |
| adr/ | ⚪ | ✅ | ✅ |

✅ 필수 / ⚪ 선택

**프로젝트 타입별 추가 필수:**

| 타입 | 추가 필수 문서 |
|-----|--------------|
| web-service | ui-ux-spec.md |
| api-backend | - |
| platform | integration-spec.md, glossary.md |
| fintech | security-spec.md, error-codes.md, deployment-spec.md |
| infra | deployment-spec.md, env-config.md |

**레벨 선택 기준:**

```yaml
# timsquad.config.yaml
project:
  name: "my-project"
  type: web-service
  level: 2  # 1=MVP, 2=Standard, 3=Enterprise
  # v4.0 Composition Layer 확장 (선택)
  domain: general-web       # general-web | ml-engineering | fintech | mobile | gamedev | systems
  platform: claude-code     # claude-code | cursor | mcp | gemini | windsurf (auto-detect)
  stack: react              # react | python | rust | go 등 (auto-detect)
```

| Level | 설명 | 대상 |
|-------|-----|-----|
| **1 (MVP)** | 최소 문서, 빠른 개발 | 사이드 프로젝트, PoC |
| **2 (Standard)** | 표준 문서, 균형 | 일반 프로젝트, 스타트업 |
| **3 (Enterprise)** | 전체 문서, 완전한 추적 | 엔터프라이즈, fintech |

**문서 간 흐름:**

```
prd.md (왜)
    ↓
planning.md (계획) + glossary.md (용어)
    ↓
requirements.md (무엇을)
    ↓
┌───────────────┼───────────────┐
↓               ↓               ↓
functional    ui-ux          data-design
-spec.md      -spec.md       .md
    ↓
service-spec.md + error-codes.md (프론트-백 계약)
    ↓
┌───┴───┐
↓       ↓
Frontend Backend
    ↓
test-spec.md (검증)
    ↓
deployment-spec.md + env-config.md (배포)
```

**규칙:**
- 모든 에이전트는 SSOT를 참조
- SSOT 수정 시 Lock 기반 동시 접근 제어
- 변경 이력 추적 필수
- **프로젝트 레벨에 따라 필수 문서 자동 선택**
- service-spec.md는 Frontend/Backend 모두 참조하는 계약서
- error-codes.md는 service-spec.md에서 참조

## 2.3 에이전트 구조 (Agentsway 적용)

```
┌─────────────────────────────────────────────────────────────┐
│                    사용자 (Leader)                          │
│              확인, 승인, 최종 피드백                         │
└───────────────────────────┬─────────────────────────────────┘
                            │ 직접 소통
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                   Planner (기획자)                          │
│                                                             │
│  ┌─────────┐  ┌──────────┐  ┌───────────┐                  │
│  │ PM 모드 │  │Planning  │  │Architect  │                  │
│  │         │  │  모드    │  │  모드     │                  │
│  └─────────┘  └──────────┘  └───────────┘                  │
│                                                             │
│  - PRD 작성 및 관리                                         │
│  - 기획, 요건 정의                                          │
│  - 아키텍처 설계                                            │
│  - 피드백 분석 및 라우팅                                    │
│  - 회고 분석 및 개선 지시                                   │
└───────────────────────────┬─────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                 Prompter (프롬프트 최적화)                   │  ← NEW (Agentsway)
│                                                             │
│  - Planner 의도를 최적화된 프롬프트로 변환                   │
│  - 프롬프트 템플릿 관리                                     │
│  - 프롬프트 버전 관리                                       │
│  - 회고 결과 기반 프롬프트 개선                             │
└───────────────────────────┬─────────────────────────────────┘
                            │ 최적화된 프롬프트
    ┌───────────┬───────────┼───────────┬───────────┐
    ▼           ▼           ▼           ▼           ▼
┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐
│designer│ │developer│ │  dba   │ │   qa   │ │  ...   │
└────────┘ └────────┘ └────────┘ └────────┘ └────────┘
     │           │         │         │           │
     └───────────┴─────────┴─────────┴───────────┘
                           │
                 (최대 7개 동시 실행)
```

**소통 규칙:**
- 사용자 ↔ Planner만 직접 소통
- Planner → Prompter → 서브에이전트 (프롬프트 최적화 레이어)
- 서브에이전트 간 직접 소통 금지
- 모든 결정은 Planner가 사용자에게 보고

## 2.4 에이전트 구조 (Claude Code 2.1+ 서브에이전트 + Skills)

> **Note:** 서브에이전트가 Skills를 로드하는 방식. 완전한 컨트롤 가능.
> 서브에이전트는 **Markdown 파일** (YAML frontmatter 포함)로 정의됨.

```
/my-project
├── CLAUDE.md                        # 프로젝트 전체 설정 (PM 역할)
│
├── .claude/
│   ├── settings.json                # hooks, permissions
│   │
│   ├── agents/                      # 서브에이전트 정의 (Markdown)
│   │   ├── tsq-planner.md
│   │   ├── tsq-developer.md
│   │   ├── tsq-qa.md
│   │   ├── tsq-security.md
│   │   ├── tsq-dba.md
│   │   ├── tsq-designer.md
│   │   ├── tsq-prompter.md
│   │   └── tsq-retro.md
│   │
│   └── skills/                      # 스킬 정의 (SKILL.md)
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
└── .timsquad/
    ├── config.yaml                  # TimSquad 설정
    ├── ssot/                        # SSOT 문서들
    ├── generators/                  # 문서 생성기 (XML)
    ├── logs/                        # 작업 로그
    └── knowledge/                   # 프로젝트 지식
        ├── tribal.md
        ├── lessons.md
        └── constraints.md
```

### 서브에이전트 정의 예시

**tsq-developer.md:**
```markdown
---
name: tsq-developer
description: |
  TimSquad Developer 에이전트.
  SSOT 기반 코드 구현, 테스트 작성 담당.
model: sonnet
tools: [Read, Write, Edit, Bash, Grep, Glob]
---

# Developer Agent

## 페르소나
15년 경력의 시니어 풀스택 개발자
- Clean Architecture, DDD 전문가
- TDD/BDD 실천자
- 성능 최적화 경험 풍부

## 작업 전 필수
1. `.timsquad/ssot/service-spec.md` API 명세 확인
2. `.timsquad/ssot/data-design.md` 데이터 설계 확인
3. `.timsquad/knowledge/` 프로젝트 컨벤션 참조

## 작업 원칙
- SSOT와 다르면 구현 중단, Planner에게 보고
- 테스트 먼저 작성 (TDD)
- 작업 완료 후 로그 기록

## 금지 사항
- any 타입 사용 금지
- console.log 커밋 금지
- 하드코딩 금지
```

**tsq-planner.md:**
```markdown
---
name: tsq-planner
description: |
  TimSquad Planner 에이전트.
  PRD 분석, 기획, 아키텍처 설계 담당.
model: opus
tools: [Read, Write, Edit, WebSearch, Task]
---

# Planner Agent

## 페르소나
20년 경력의 테크 리드 / 솔루션 아키텍트
- 대규모 시스템 설계 경험
- 비즈니스-기술 간 통역 능력
- ADR 작성 전문가

## 모드
- **PM 모드**: PRD 작성, 요건 정의
- **Planning 모드**: 기획서, 기능 명세
- **Architect 모드**: 설계, ADR 작성

## 원칙
  - 모든 문서는 .timsquad/ssot/에 저장
  - 주요 결정은 ADR로 기록
  - 사용자 승인 후 다음 단계 진행
```

**tsq-qa.md:**
```markdown
---
name: tsq-qa
description: |
  TimSquad QA 에이전트.
  코드 리뷰, 테스트 검증, 품질 체크 담당.
model: sonnet
tools: [Read, Bash, Grep]
---

# QA Agent

## 페르소나
12년 경력의 QA/테스트 엔지니어
- 자동화 테스트 전문가
- 보안 취약점 분석 경험
- 성능 테스트 도구 활용 능력

## 검증 항목
1. SSOT와 구현 일치 여부
2. 테스트 커버리지 (80% 이상)
3. 보안 취약점 (OWASP Top 10)
4. 성능 이슈

## 피드백 분류
- **Level 1** (구현 수정): Developer에게 → 코드 버그, 테스트 실패
- **Level 2** (설계 수정): Planner에게 → API 불일치, 아키텍처 이슈
- **Level 3** (기획 수정): 사용자에게 → 요구사항 모호, 스코프 변경
```

### 스킬 정의 예시

**skills/coding/SKILL.md:**
```markdown
---
name: coding
description: 코드 작성 규칙 및 패턴
---

# Coding Skill

## 코드 스타일
- Clean Architecture 준수
- 함수는 단일 책임
- 명확한 네이밍

## 필수 패턴
- Repository 패턴 사용
- DTO/Entity 분리
- 에러 핸들링 통일

## 금지 사항
- any 타입 사용 금지
- console.log 커밋 금지
- 하드코딩 금지
```

**skills/testing/SKILL.md:**
```markdown
---
name: testing
description: 테스트 작성 규칙
---

# Testing Skill

## 테스트 구조
- Given-When-Then 패턴
- 테스트 파일: *.test.ts 또는 *.spec.ts

## 커버리지 기준
- 라인 커버리지: 80% 이상
- 브랜치 커버리지: 70% 이상

## 필수 테스트
- Happy path
- Edge cases
- Error cases
```

### 서브에이전트 사용 방식

```bash
# 명시적 호출
@tsq-developer "로그인 API 구현해줘"
@tsq-qa "방금 구현한 코드 리뷰해줘"

# 자동 위임 (description 기반)
"코드 구현해줘" → Claude가 tsq-developer 자동 선택
"리뷰해줘" → Claude가 tsq-qa 자동 선택
```

### 서브에이전트 장점

| 항목 | 설명 |
|-----|------|
| **컨텍스트 격리** | 각 에이전트 별도 200k 컨텍스트 |
| **도구 제한** | 역할에 맞는 도구만 허용 |
| **모델 선택** | 작업별 최적 모델 (Opus/Sonnet/Haiku) |
| **스킬 조합** | 여러 스킬 로드 가능 |
| **비용 최적화** | QA는 Haiku로 비용 절감 가능 |

### 프로젝트 지식 파일 (.timsquad/knowledge/)

**tribal.md** (조직 지식):
```markdown
# Tribal Knowledge

## 코딩 컨벤션
- API 응답: `{ success, data, error }` 형식
- 날짜: ISO 8601 형식
- 에러 코드: `{DOMAIN}_{NUMBER}` 형식

## 아키텍처 패턴
- Clean Architecture 사용
- Repository 패턴 적용
```

**lessons.md** (학습된 교훈):
```markdown
# Lessons Learned

## [2026-01-15] JWT 갱신 이슈
- 문제: 토큰 만료 시 무한 리다이렉트
- 해결: Refresh 토큰 검증 로직 추가

## [2026-01-20] N+1 쿼리 문제
- 문제: 목록 조회 시 성능 저하
- 해결: Eager loading 적용
```

### SSOT 문서 템플릿 예시

**service-spec.md 템플릿:**

```markdown
# 서비스 명세서 (API Specification)

## 1. Auth

### 1.1 Login

| 항목 | 값 |
|-----|---|
| **서비스명** | Login |
| **URL** | `POST /api/v1/auth/login` |
| **설명** | 로그인 및 사용자/메뉴 정보 반환 |

#### Request

| Field | Type | Description | Required |
|-------|------|-------------|----------|
| email | String | 사용자 이메일 | O |
| password | String | 암호 | O |

#### Response

| Field | Type | Description |
|-------|------|-------------|
| status | Number | 결과 (0=OK, 1=Error) |
| data.user | Object | 사용자 정보 |

#### Errors
→ error-codes.md 참조: AUTH_001, AUTH_002
```

**error-codes.md 템플릿:**

```markdown
# Error Codes

## Auth
| Code | HTTP | Message | 설명 |
|------|------|---------|-----|
| AUTH_001 | 401 | Invalid credentials | 로그인 실패 |
| AUTH_002 | 403 | Account locked | 5회 실패 잠금 |
| AUTH_003 | 401 | Token expired | 토큰 만료 |

## Order
| Code | HTTP | Message | 설명 |
|------|------|---------|-----|
| ORD_001 | 400 | Invalid quantity | 수량 오류 |
```

**env-config.md 템플릿:**

```markdown
# Environment Configuration

## 환경변수
| 변수 | 설명 | Development | Production |
|-----|------|-------------|------------|
| API_URL | API 주소 | localhost:3000 | api.example.com |
| DB_HOST | DB 호스트 | localhost | prod-db |

## 시크릿 (키만 정의, 값은 별도 관리)
| 변수 | 설명 | 필수 |
|-----|------|:----:|
| JWT_SECRET | JWT 서명 키 | ✅ |
| DB_PASSWORD | DB 비밀번호 | ✅ |
```

**glossary.md 템플릿:**

```markdown
# Glossary (용어 사전)

| 용어 | 영문 | 정의 |
|-----|------|-----|
| 회원 | Member | 서비스에 가입한 사용자 |
| 고객사 | Customer | B2B 계약 업체 |
| 권한 | Permission | 기능 접근 제어 단위 |
```

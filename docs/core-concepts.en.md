[**English**](core-concepts.en.md) | [한국어](core-concepts.md)

# Core Concepts

> Extracted from PRD Section 2

## 2.1 Fountain Model

A hybrid model that solves the sequential limitations of waterfall and the lack of documentation in agile.

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

**Key Principles:**
- SSOT documents have sequential dependencies (PRD -> Planning -> Design -> Implementation)
- Actual work can be executed in parallel (spreading out like a fountain)
- Feedback is routed to the appropriate stage based on its level
- **Retrospective learning drives improvement at the end of each cycle**

## 2.2 SSOT (Single Source of Truth) Document System

```
/ssot
├── prd.md              # Product Requirements (Why)
├── planning.md         # Planning Document (Overview)
├── glossary.md         # Glossary
│
├── requirements.md     # Requirements Definition (What)
├── functional-spec.md  # Functional Specification (How - User Perspective)
├── ui-ux-spec.md       # UI/UX Design
│
├── service-spec.md     # API Specification (Frontend-Backend Contract)
├── error-codes.md      # Unified Error Codes
├── data-design.md      # ERD, Data Design
│
├── env-config.md       # Environment Configuration
├── deployment-spec.md  # Deployment Specification
├── integration-spec.md # External Integration Specification
│
├── test-spec.md        # Test Specification
├── security-spec.md    # Security Specification
│
└── adr/                # Architecture Decision Records
    └── ADR-XXX.md
```

**Role of Each Document:**

| Document | Role | Authoring Agent |
|----------|------|-----------------|
| prd.md | Why we're building it, goals, success metrics | Planner (PM) |
| planning.md | Overall plan, milestones, schedule | Planner (PM) |
| glossary.md | Domain terminology definitions | Planner (Planning) |
| requirements.md | Functional/non-functional requirements | Planner (Planning) |
| functional-spec.md | Functional scenarios, exception handling | Planner (Planning) |
| ui-ux-spec.md | UI design, wireframes, flows | Designer |
| service-spec.md | API endpoints, Request/Response | Planner (Architect) |
| error-codes.md | Error codes, messages, HTTP status | Planner (Architect) |
| data-design.md | ERD, table definitions, indexes | DBA |
| env-config.md | Environment variables, secrets list | Planner (Architect) |
| deployment-spec.md | Infrastructure, CI/CD, deployment environment | DevOps |
| integration-spec.md | External API integration, Webhooks | Planner (Architect) |
| test-spec.md | Test cases, scenarios | QA |
| security-spec.md | Security requirements, authentication/authorization, encryption | Security |
| adr/ | Architecture Decision Records | Planner (Architect) |

**Required Documents by Project Level:**

| Document | Level 1 (MVP) | Level 2 (Standard) | Level 3 (Enterprise) |
|----------|:-------------:|:------------------:|:--------------------:|
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

✅ Required / ⚪ Optional

**Additional Required Documents by Project Type:**

| Type | Additional Required Documents |
|------|------------------------------|
| web-service | ui-ux-spec.md |
| api-backend | - |
| platform | integration-spec.md, glossary.md |
| fintech | security-spec.md, error-codes.md, deployment-spec.md |
| infra | deployment-spec.md, env-config.md |

**Level Selection Criteria:**

```yaml
# timsquad.config.yaml
project:
  name: "my-project"
  type: web-service
  level: 2  # 1=MVP, 2=Standard, 3=Enterprise
  # v4.0 Composition Layer extension (optional)
  domain: general-web       # general-web | ml-engineering | fintech | mobile | gamedev | systems
  platform: claude-code     # claude-code | cursor | mcp | gemini | windsurf (auto-detect)
  stack: react              # react | python | rust | go etc. (auto-detect)
```

| Level | Description | Target |
|-------|-------------|--------|
| **1 (MVP)** | Minimal documentation, rapid development | Side projects, PoC |
| **2 (Standard)** | Standard documentation, balanced | General projects, startups |
| **3 (Enterprise)** | Full documentation, complete traceability | Enterprise, fintech |

**Document Flow:**

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

**Rules:**
- All agents reference the SSOT
- Lock-based concurrency control when modifying SSOT
- Change history tracking is mandatory
- **Required documents are automatically selected based on project level**
- service-spec.md is the contract referenced by both Frontend and Backend
- error-codes.md is referenced from service-spec.md

## 2.3 Agent Structure (Agentsway Applied)

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

**Communication Rules:**
- Only the User <-> Planner communicate directly
- Planner -> Prompter -> Sub-agents (prompt optimization layer)
- Direct communication between sub-agents is prohibited
- All decisions are reported by the Planner to the user

## 2.4 Agent Structure (Claude Code 2.1+ Sub-agents + Skills)

> **Note:** This is the approach where sub-agents load Skills. Provides full control.
> Sub-agents are defined as **Markdown files** (with YAML frontmatter).

```
/my-project
├── CLAUDE.md                        # Project-wide settings (PM role)
│
├── .claude/
│   ├── settings.json                # hooks, permissions
│   │
│   ├── agents/                      # Sub-agent definitions (Markdown)
│   │   ├── tsq-planner.md
│   │   ├── tsq-developer.md
│   │   ├── tsq-qa.md
│   │   ├── tsq-security.md
│   │   ├── tsq-dba.md
│   │   ├── tsq-designer.md
│   │   ├── tsq-prompter.md
│   │   └── tsq-retro.md
│   │
│   └── skills/                      # Skill definitions (SKILL.md)
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
    ├── config.yaml                  # TimSquad settings
    ├── ssot/                        # SSOT documents
    ├── generators/                  # Document generators (XML)
    ├── logs/                        # Work logs
    └── knowledge/                   # Project knowledge
        ├── tribal.md
        ├── lessons.md
        └── constraints.md
```

### Sub-agent Definition Examples

**tsq-developer.md:**
```markdown
---
name: tsq-developer
description: |
  TimSquad Developer agent.
  Responsible for SSOT-based code implementation and test writing.
model: sonnet
tools: [Read, Write, Edit, Bash, Grep, Glob]
---

# Developer Agent

## Persona
Senior full-stack developer with 15 years of experience
- Expert in Clean Architecture, DDD
- TDD/BDD practitioner
- Extensive performance optimization experience

## Pre-work Requirements
1. Check `.timsquad/ssot/service-spec.md` API specification
2. Check `.timsquad/ssot/data-design.md` data design
3. Reference `.timsquad/knowledge/` project conventions

## Working Principles
- If implementation differs from SSOT, stop and report to Planner
- Write tests first (TDD)
- Record logs after completing work

## Prohibitions
- No use of `any` type
- No committing `console.log`
- No hardcoding
```

**tsq-planner.md:**
```markdown
---
name: tsq-planner
description: |
  TimSquad Planner agent.
  Responsible for PRD analysis, planning, and architecture design.
model: opus
tools: [Read, Write, Edit, WebSearch, Task]
---

# Planner Agent

## Persona
Tech Lead / Solutions Architect with 20 years of experience
- Large-scale system design experience
- Ability to translate between business and technology
- Expert in writing ADRs

## Modes
- **PM Mode**: PRD writing, requirements definition
- **Planning Mode**: Planning documents, functional specifications
- **Architect Mode**: Design, ADR writing

## Principles
  - All documents are stored in .timsquad/ssot/
  - Major decisions are recorded as ADRs
  - Proceed to the next stage only after user approval
```

**tsq-qa.md:**
```markdown
---
name: tsq-qa
description: |
  TimSquad QA agent.
  Responsible for code review, test verification, and quality checks.
model: sonnet
tools: [Read, Bash, Grep]
---

# QA Agent

## Persona
QA/Test Engineer with 12 years of experience
- Test automation expert
- Security vulnerability analysis experience
- Proficient with performance testing tools

## Verification Items
1. Consistency between SSOT and implementation
2. Test coverage (80% or higher)
3. Security vulnerabilities (OWASP Top 10)
4. Performance issues

## Feedback Classification
- **Level 1** (Implementation fix): To Developer -> Code bugs, test failures
- **Level 2** (Design fix): To Planner -> API inconsistencies, architecture issues
- **Level 3** (Planning fix): To User -> Ambiguous requirements, scope changes
```

### Skill Definition Examples

**skills/coding/SKILL.md:**
```markdown
---
name: coding
description: Code writing rules and patterns
---

# Coding Skill

## Code Style
- Follow Clean Architecture
- Single responsibility per function
- Clear naming

## Required Patterns
- Use Repository pattern
- Separate DTO/Entity
- Unified error handling

## Prohibitions
- No use of `any` type
- No committing `console.log`
- No hardcoding
```

**skills/testing/SKILL.md:**
```markdown
---
name: testing
description: Test writing rules
---

# Testing Skill

## Test Structure
- Given-When-Then pattern
- Test files: *.test.ts or *.spec.ts

## Coverage Standards
- Line coverage: 80% or higher
- Branch coverage: 70% or higher

## Required Tests
- Happy path
- Edge cases
- Error cases
```

### Sub-agent Usage

```bash
# Explicit invocation
@tsq-developer "로그인 API 구현해줘"
@tsq-qa "방금 구현한 코드 리뷰해줘"

# Automatic delegation (description-based)
"코드 구현해줘" → Claude가 tsq-developer 자동 선택
"리뷰해줘" → Claude가 tsq-qa 자동 선택
```

### Sub-agent Advantages

| Item | Description |
|------|-------------|
| **Context Isolation** | Each agent gets a separate 200k context |
| **Tool Restriction** | Only role-appropriate tools are allowed |
| **Model Selection** | Optimal model per task (Opus/Sonnet/Haiku) |
| **Skill Composition** | Multiple skills can be loaded |
| **Cost Optimization** | QA can use Haiku for cost savings |

### Project Knowledge Files (.timsquad/knowledge/)

**tribal.md** (Organizational Knowledge):
```markdown
# Tribal Knowledge

## Coding Conventions
- API response format: `{ success, data, error }`
- Dates: ISO 8601 format
- Error codes: `{DOMAIN}_{NUMBER}` format

## Architecture Patterns
- Uses Clean Architecture
- Applies Repository pattern
```

**lessons.md** (Lessons Learned):
```markdown
# Lessons Learned

## [2026-01-15] JWT Renewal Issue
- Problem: Infinite redirect on token expiration
- Solution: Added refresh token validation logic

## [2026-01-20] N+1 Query Problem
- Problem: Performance degradation on list queries
- Solution: Applied eager loading
```

### SSOT Document Template Examples

**service-spec.md Template:**

```markdown
# Service Specification (API Specification)

## 1. Auth

### 1.1 Login

| Item | Value |
|------|-------|
| **Service Name** | Login |
| **URL** | `POST /api/v1/auth/login` |
| **Description** | Login and return user/menu information |

#### Request

| Field | Type | Description | Required |
|-------|------|-------------|----------|
| email | String | User email | O |
| password | String | Password | O |

#### Response

| Field | Type | Description |
|-------|------|-------------|
| status | Number | Result (0=OK, 1=Error) |
| data.user | Object | User information |

#### Errors
→ See error-codes.md: AUTH_001, AUTH_002
```

**error-codes.md Template:**

```markdown
# Error Codes

## Auth
| Code | HTTP | Message | Description |
|------|------|---------|-------------|
| AUTH_001 | 401 | Invalid credentials | Login failure |
| AUTH_002 | 403 | Account locked | Locked after 5 failures |
| AUTH_003 | 401 | Token expired | Token expired |

## Order
| Code | HTTP | Message | Description |
|------|------|---------|-------------|
| ORD_001 | 400 | Invalid quantity | Quantity error |
```

**env-config.md Template:**

```markdown
# Environment Configuration

## Environment Variables
| Variable | Description | Development | Production |
|----------|-------------|-------------|------------|
| API_URL | API address | localhost:3000 | api.example.com |
| DB_HOST | DB host | localhost | prod-db |

## Secrets (keys only; values managed separately)
| Variable | Description | Required |
|----------|-------------|:--------:|
| JWT_SECRET | JWT signing key | ✅ |
| DB_PASSWORD | DB password | ✅ |
```

**glossary.md Template:**

```markdown
# Glossary

| Term | English | Definition |
|------|---------|------------|
| 회원 | Member | A user who has signed up for the service |
| 고객사 | Customer | B2B contracted company |
| 권한 | Permission | Unit of access control for features |
```

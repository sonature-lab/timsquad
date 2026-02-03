# TimSquad PRD v2.0
**AI Agent Development Process Framework**
(AI 에이전트 개발 프로세스 프레임워크)

Version: 2.0
Last Updated: 2026-02-03
Author: Eric

---

## 1. 개요

### 1.1 한 줄 정의
> **"AI 시대의 소프트웨어 개발 표준 프로세스"** — SSOT 기반 문서 체계, 최적화된 에이전트 롤, 회고적 학습을 통해 Claude Code에서 지속적으로 개선되는 고품질 소프트웨어 생성 프레임워크

**CLI 커맨드:** `tsq` (또는 `timsquad`)

```bash
tsq init --type web-service   # 프로젝트 초기화
tsq status                    # 현재 상태 확인
tsq retro                     # 회고 실행
tsq log                       # 작업 로그 확인
```

### 1.2 핵심 공식
```
최적화된 롤 정의 + 고도화된 스킬 + 회고적 학습 = 지속적으로 개선되는 고품질 결과물
```

### 1.3 타겟 사용자

> **"For developers who want structure, not magic."**

**Primary:**
- 체계적인 프로세스를 원하는 시니어 개발자
- 1인 CTO / 테크 리드 (혼자서 팀 수준의 품질 필요)
- 문서화와 일관성을 중시하는 개발자

**Secondary:**
- 사이드 프로젝트를 제대로 하고 싶은 개발자
- AI 에이전트 활용을 체계화하고 싶은 팀

**NOT for:**
- "알아서 해줘" 원하는 사람 → oh-my-claudecode 추천
- 코딩만 빠르게 하고 싶은 사람 → Claude Code 그냥 사용
- 학습 곡선 싫은 사람

**요구 역량:**
- Claude Code 기본 사용 경험
- 소프트웨어 개발 프로세스 이해
- 문서화의 가치를 아는 사람

### 1.4 철학

| oh-my-* | **TimSquad** |
|---------|--------------|
| "Zero learning curve" | **"체계를 세우면 더 잘 된다"** |
| 알아서 해줌 | **개발자가 컨트롤** |
| 속도 최우선 | **품질 + 일관성 최우선** |
| Magic | **Structure** |

### 1.4 이론적 기반
| 이론/논문 | 핵심 개념 | TimSquad 적용 |
|---------|---------|--------------|
| **Agentsway** (2025) | Prompting Agent, Retrospective Learning, LLM Consortium | 프롬프트 최적화 레이어, 회고적 학습, 핵심 결정 합의 |
| **ACM TOSEM** (2025) | Competency Mapping, Performance Evaluation | 역량 프레임워크, 성과 지표 |
| **Agentic SE** (2025) | AGENT.md, Meta-Prompt Files | 계층화된 메타-프롬프트 구조 |
| **FRAME** (2025) | Feedback-Driven Refinement | 레벨별 피드백 라우팅 |

### 1.5 기존 솔루션과의 차별점

| 구분 | CrewAI/LangGraph | Superpowers | Agentsway | **TimSquad** |
|-----|-----------------|-------------|-----------|--------------|
| 목적 | 범용 AI 에이전트 | 코딩 규율 | 학술적 방법론 | **전체 SDLC + 실용적 템플릿** |
| 문서 | 선택적 | 코드 중심 | 형식적 | **SSOT (진실의 원천)** |
| 학습 | 없음 | 없음 | LLM 파인튜닝 | **회고적 학습 (프롬프트/템플릿)** |
| 프롬프트 | 직접 작성 | 스킬 기반 | Prompting Agent | **Prompter + 계층화된 AGENT.md** |
| 피드백 | 단순 | 코드 리뷰 | 형식적 | **레벨별 라우팅** |
| 즉시 사용 | 학습 필요 | 설치 후 사용 | 구현 없음 | **프로젝트 타입별 템플릿** |

### 1.6 oh-my-opencode / oh-my-claudecode와의 차별점

| 구분 | oh-my-* | **TimSquad** |
|-----|---------|--------------|
| **타입** | 실행 플러그인 | 방법론 + 오케스트레이션 |
| **오케스트레이션** | LLM이 판단 (토큰 소비) | **프로그램이 판단 (토큰 0)** |
| **강점** | 병렬 실행, 속도 | **문서화, 프로세스, 토큰 효율** |
| **문서** | 없음 | **SSOT 전체 체계** |
| **피드백** | 없음 | **레벨별 라우팅** |
| **학습** | 없음 | **회고적 학습** |
| **토큰 효율** | 보통 | **높음 (40-60% 절약)** |

**관계:** 경쟁이 아닌 **보완재**. TimSquad(프로세스) + oh-my-*(실행 최적화) 조합 가능.

### 1.7 토큰 효율성 설계

#### 설계 철학
> **"LLM은 생각하는 일에만, 반복 작업은 프로그램에게"**

#### 아키텍처

```
┌─────────────────────────────────────────────────────────────┐
│  프로그램 레이어 (토큰 0)                                   │
│                                                             │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐           │
│  │피드백 라우터 │ │로그 자동화  │ │에이전트     │           │
│  │(YAML 규칙)  │ │(bash pipe)  │ │스케줄러     │           │
│  └─────────────┘ └─────────────┘ └─────────────┘           │
│                                                             │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐           │
│  │SSOT 관리    │ │회고 메트릭  │ │프롬프트     │           │
│  │(파일시스템) │ │(JSON 집계)  │ │템플릿 로더  │           │
│  └─────────────┘ └─────────────┘ └─────────────┘           │
└───────────────────────────┬─────────────────────────────────┘
                            │ 필요할 때만 호출
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  LLM 레이어 (최소 토큰)                                     │
│                                                             │
│  - 실제 코드 작성                                          │
│  - 설계 결정                                                │
│  - 문서 작성                                                │
│  - 회고 패턴 분석 (Haiku로 최적화)                         │
└─────────────────────────────────────────────────────────────┘
```

#### 토큰 절약 포인트

| 작업 | oh-my-* 방식 | TimSquad 방식 | 절약률 |
|-----|-------------|--------------|-------|
| 피드백 분류 | LLM 판단 | YAML 규칙 | **100%** |
| 로그 저장 | "저장해" 프롬프트 | bash 파이프 | **100%** |
| 에이전트 선택 | LLM 오케스트레이터 | 프로그램 스케줄러 | **100%** |
| SSOT 변경 감지 | LLM diff | 파일 시스템 watch | **100%** |
| 회고 메트릭 수집 | LLM 로그 파싱 | 프로그램 JSON | **100%** |
| 오케스트레이션 전체 | ~12,000 토큰 | ~0 토큰 | **100%** |

#### 토큰 흐름 비교

**기존 방식 (oh-my-*):**
```
"로그인 기능 만들어"
    → Orchestrator 프롬프트 [~2,000 토큰]
    → Planner 호출 [~3,000 토큰]
    → Worker 호출 x N [~5,000 토큰 x N]
    → 결과 종합 [~2,000 토큰]
    
총: ~20,000+ 토큰
```

**TimSquad 방식:**
```
"로그인 기능 만들어"
    → [프로그램] SSOT 확인, 에이전트 선택 [0 토큰]
    → [프로그램] 프롬프트 템플릿 로드 [0 토큰]
    → Developer 호출 (최적화된 SKILL.md) [~8,000 토큰]
    → [프로그램] 로그 자동 저장 [0 토큰]
    
총: ~8,000 토큰 (60% 절약)
```

#### 프로그램 자동화 목록

```yaml
automation:
  feedback_router:      # 피드백 → 적절한 에이전트
    type: program
    logic: yaml_rules
    tokens: 0
    
  log_automation:       # 출력 → 파일 저장
    type: bash_script
    trigger: stdout_pipe
    tokens: 0
    
  agent_scheduler:      # 의존성 기반 에이전트 스케줄링
    type: program
    logic: dependency_graph
    tokens: 0
    
  ssot_manager:         # 문서 버전 관리, Lock
    type: program
    actions: [file_lock, version_control, change_detection]
    tokens: 0
    
  retrospective_metrics: # 회고 데이터 수집
    type: program
    actions: [log_parsing, json_aggregation]
    tokens: 0
    
  prompt_template:      # 프롬프트 템플릿 로딩
    type: file_system
    actions: [template_loading, variable_substitution]
    tokens: 0

  document_generator:   # SSOT 문서 생성기 (NEW)
    type: xml_template
    actions: [question_prompting, input_refinement, document_generation]
    tokens: "입력 정제만 (템플릿 구조는 0 토큰)"
```

#### 문서 생성기 (XML Generators)

SSOT 문서 작성 시 토큰을 절약하기 위한 XML 기반 템플릿 시스템.

**흐름:**
```
메인 세션이 XML 템플릿 읽음 (구조 파악)
    ↓
섹션별로 사용자에게 질문 (<prompt> 태그 사용)
    ↓
사용자 입력을 정제 규칙에 따라 변환 (<refinement> 태그)
    ↓
output-template에 맞춰 최종 문서 생성
```

**생성기 종류:**
| 생성기 | 파일 | 출력 | 의존성 |
|--------|------|------|--------|
| PRD | prd.xml | prd.md | - |
| 요구사항 | requirements.xml | requirements.md | prd.md |
| API 명세 | service-spec.xml | service-spec.md | prd.md, requirements.md |
| 데이터 설계 | data-design.xml | data-design.md | prd.md, service-spec.md |

**XML 구조:**
```xml
<generator name="prd" output=".timsquad/ssot/prd.md">
  <metadata>...</metadata>
  <instructions>정제 원칙</instructions>

  <section id="basic" title="기본 정보">
    <field name="project_name" type="text" required="true">
      <prompt>프로젝트 이름?</prompt>
      <refinement>영문 소문자, 하이픈 허용</refinement>
    </field>
  </section>

  <output-template>
    # {{basic.project_name}} PRD
    ...
  </output-template>
</generator>
```

**토큰 효율:**
- 템플릿 구조 자체는 LLM이 한 번만 읽음
- 사용자 입력 정제에만 토큰 사용
- 반복적인 문서 형식 생성 비용 제거

#### 예상 효과

| 지표 | 기존 | TimSquad | 개선 |
|-----|-----|----------|-----|
| 오케스트레이션 토큰 | ~12,000/작업 | 0 | **100%** |
| 로그/문서화 토큰 | ~2,000/작업 | 0 | **100%** |
| 전체 토큰 | 100% | 40-60% | **40-60% 절약** |
| 품질 일관성 | 변동 | 높음 | **향상** |

---

## 2. 핵심 개념

### 2.1 분수(Fountain) 모델

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

### 2.2 SSOT (Single Source of Truth) 문서 체계

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

**규칙:**
- 모든 에이전트는 SSOT를 참조
- SSOT 수정 시 Lock 기반 동시 접근 제어
- 변경 이력 추적 필수
- **프로젝트 레벨에 따라 필수 문서 자동 선택**
- service-spec.md는 Frontend/Backend 모두 참조하는 계약서
- error-codes.md는 service-spec.md에서 참조

### 2.3 에이전트 구조 (Agentsway 적용)

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

### 2.4 에이전트 구조 (Claude Code 2.1+ 서브에이전트 + Skills)

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

**서브에이전트 정의 (tsq-developer.md):**
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

**서브에이전트 정의 (tsq-planner.md):**
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

**서브에이전트 정의 (tsq-qa.md):**
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

**스킬 정의 (skills/coding/SKILL.md):**
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

**스킬 정의 (skills/testing/SKILL.md):**
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

**서브에이전트 사용 방식:**

```bash
# 명시적 호출
@tsq-developer "로그인 API 구현해줘"
@tsq-qa "방금 구현한 코드 리뷰해줘"

# 자동 위임 (description 기반)
"코드 구현해줘" → Claude가 tsq-developer 자동 선택
"리뷰해줘" → Claude가 tsq-qa 자동 선택
```

**서브에이전트 장점:**

| 항목 | 설명 |
|-----|------|
| **컨텍스트 격리** | 각 에이전트 별도 200k 컨텍스트 |
| **도구 제한** | 역할에 맞는 도구만 허용 |
| **모델 선택** | 작업별 최적 모델 (Opus/Sonnet/Haiku) |
| **스킬 조합** | 여러 스킬 로드 가능 |
| **비용 최적화** | QA는 Haiku로 비용 절감 가능 |

**프로젝트 지식 파일 (.timsquad/knowledge/):**

`tribal.md` (조직 지식):
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

`lessons.md` (학습된 교훈):
```markdown
# Lessons Learned

## [2026-01-15] JWT 갱신 이슈
- 문제: 토큰 만료 시 무한 리다이렉트
- 해결: Refresh 토큰 검증 로직 추가

## [2026-01-20] N+1 쿼리 문제
- 문제: 목록 조회 시 성능 저하
- 해결: Eager loading 적용
```

---

## 3. 피드백 라우팅 시스템

### 3.1 피드백 레벨 정의

```
┌─────────────────────────────────────────────────────────────┐
│                    피드백 발생                              │
└───────────────────────────┬─────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                   피드백 분류기                             │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ 트리거 분석                                          │   │
│  │ - test_failure, lint_error, type_error              │   │
│  │ - architecture_issue, api_mismatch                  │   │
│  │ - requirement_ambiguity, scope_change               │   │
│  └─────────────────────────────────────────────────────┘   │
└───────────────────────────┬─────────────────────────────────┘
                            │
          ┌─────────────────┼─────────────────┐
          ▼                 ▼                 ▼
    ┌──────────┐     ┌──────────┐     ┌──────────┐
    │ Level 1  │     │ Level 2  │     │ Level 3  │
    │ 구현 수정 │     │ 설계 수정 │     │ 기획 수정 │
    └────┬─────┘     └────┬─────┘     └────┬─────┘
         │                │                │
         ▼                ▼                ▼
    ┌──────────┐     ┌──────────┐     ┌──────────┐
    │developer │     │ planner  │     │ planner  │
    │          │     │(architect)│    │(planning)│
    └──────────┘     └──────────┘     └────┬─────┘
                                           │
                                           ▼
                                    ┌──────────┐
                                    │  User    │
                                    │ Approval │
                                    └──────────┘
```

### 3.2 피드백 라우팅 규칙

```yaml
feedback_routing:
  level_1:
    name: "구현 수정"
    triggers:
      - test_failure
      - lint_error
      - type_error
      - runtime_error
      - code_style_violation
    route_to: developer
    approval_required: false
    
  level_2:
    name: "설계 수정"
    triggers:
      - architecture_issue
      - api_mismatch
      - performance_problem
      - scalability_concern
      - security_vulnerability
    route_to: planner (architect mode)
    approval_required: false
    ssot_update: true
    
  level_3:
    name: "기획/PRD 수정"
    triggers:
      - requirement_ambiguity
      - scope_change
      - business_logic_error
      - feature_request
      - stakeholder_feedback
    route_to: planner (planning mode)
    approval_required: true  # 반드시 사용자 승인
    ssot_update: true
```

### 3.3 피드백 패턴 학습

```yaml
feedback_patterns:
  tracking:
    - feedback_type
    - root_cause
    - resolution
    - time_to_resolve
    - recurrence_count
    
  learning:
    # 같은 패턴 3회 이상 발생 시
    threshold: 3
    actions:
      - update_agent_skill
      - update_prompt_template
      - add_to_lessons_learned
```

---

## 4. 회고적 학습 시스템 (Retrospective Learning)

### 4.1 개요

Agentsway의 핵심 개념을 TimSquad에 맞게 적용. LLM 파인튜닝 대신 **프롬프트/템플릿 개선**으로 실용화.

```
┌─────────────────────────────────────────────────────────────┐
│                   개발 사이클 완료                          │
└───────────────────────────┬─────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                   로그 수집                                 │
│  - 에이전트별 작업 로그                                     │
│  - 피드백 이력                                              │
│  - 성공/실패 메트릭                                         │
└───────────────────────────┬─────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                   패턴 분석                                 │
│  - 반복 실패 패턴                                           │
│  - 성공 패턴                                                │
│  - 병목 지점                                                │
└───────────────────────────┬─────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                   개선 제안 생성                            │
│  - 프롬프트 개선안                                          │
│  - 템플릿 개선안                                            │
│  - AGENT.md 업데이트                                        │
└───────────────────────────┬─────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                   사용자 승인                               │
└───────────────────────────┬─────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                   적용                                      │
│  - 프롬프트 템플릿 업데이트                                 │
│  - SSOT 템플릿 업데이트                                     │
│  - Lessons Learned 추가                                     │
└─────────────────────────────────────────────────────────────┘
```

### 4.2 회고 디렉토리 구조

```
/retrospective
├── cycles/
│   ├── cycle-001.md          # 사이클별 회고 리포트
│   ├── cycle-002.md
│   └── ...
│
├── metrics/
│   ├── agent-performance.json    # 에이전트별 성과
│   ├── feedback-stats.json       # 피드백 통계
│   └── improvement-history.json  # 개선 이력
│
├── improvements/
│   ├── prompts/                  # 프롬프트 개선 이력
│   │   ├── developer-v1.md
│   │   ├── developer-v2.md
│   │   └── changelog.md
│   │
│   └── templates/                # 템플릿 개선 이력
│       ├── prd-v1.md
│       ├── prd-v2.md
│       └── changelog.md
│
└── patterns/
    ├── failure-patterns.md       # 실패 패턴 모음
    └── success-patterns.md       # 성공 패턴 모음
```

### 4.3 회고 리포트 템플릿

```markdown
# Cycle {N} Retrospective Report

## 기간
- 시작: {start_date}
- 종료: {end_date}

## 메트릭 요약
| 지표 | 값 | 이전 대비 |
|-----|-----|---------|
| 총 작업 수 | {n} | +{diff} |
| 성공률 | {rate}% | +{diff}% |
| 평균 수정 횟수 | {n} | -{diff} |
| Level 3 피드백 수 | {n} | -{diff} |

## 에이전트별 성과
| 에이전트 | 성공률 | 평균 수정 횟수 | 주요 이슈 |
|---------|-------|--------------|----------|
| developer | {rate}% | {n} | {issue} |
| dba | {rate}% | {n} | {issue} |
| qa | {rate}% | {n} | {issue} |

## 발견된 패턴

### 실패 패턴
1. **{패턴명}**
   - 빈도: {n}회
   - 원인: {cause}
   - 제안: {suggestion}

### 성공 패턴
1. **{패턴명}**
   - 빈도: {n}회
   - 요인: {factor}
   - 적용 확대: {recommendation}

## 개선 조치
| 조치 | 대상 | 상태 |
|-----|-----|-----|
| 프롬프트 수정 | developer | ✅ 적용됨 |
| 템플릿 수정 | prd.template.md | ✅ 적용됨 |
| Lessons Learned 추가 | AGENT.md | ✅ 적용됨 |

## 다음 사이클 목표
- [ ] {goal_1}
- [ ] {goal_2}
```

### 4.4 자동화 스크립트

```bash
#!/bin/bash
# timsquad-retrospective.sh

# 1. 로그 수집
collect_logs() {
  find ./agents -name "*.log" -exec cat {} \; > ./retrospective/raw-logs.txt
}

# 2. 메트릭 계산
calculate_metrics() {
  # 성공률, 수정 횟수, 피드백 통계 등
  node ./scripts/calculate-metrics.js
}

# 3. 패턴 분석 (Claude API 호출)
analyze_patterns() {
  # Claude에게 로그 분석 요청
  # 실패/성공 패턴 추출
  node ./scripts/analyze-patterns.js
}

# 4. 개선안 생성
generate_improvements() {
  # 프롬프트/템플릿 개선안 생성
  node ./scripts/generate-improvements.js
}

# 5. 리포트 생성
generate_report() {
  node ./scripts/generate-report.js
}

# 실행
collect_logs
calculate_metrics
analyze_patterns
generate_improvements
generate_report

echo "회고 완료. ./retrospective/cycles/cycle-{N}.md 확인"
```

---

## 5. 역량 프레임워크 (Competency Framework)

### 5.1 개요

ACM TOSEM 논문의 Competency Mapping을 적용하여 에이전트 성능을 측정 가능하게 함.

### 5.2 역량 정의 템플릿

```yaml
# agents/developer/competency.yaml

agent: developer

technical_skills:
  clean_architecture:
    level: expert
    description: "클린 아키텍처, DDD 원칙 적용"
    
  testing:
    level: expert
    description: "TDD, 단위/통합/E2E 테스트"
    
  performance_optimization:
    level: advanced
    description: "병목 분석, 최적화"
    
  security:
    level: intermediate
    description: "기본 보안 원칙, OWASP Top 10"

soft_skills:
  problem_decomposition:
    level: expert
    description: "복잡한 문제를 작은 단위로 분해"
    
  documentation:
    level: advanced
    description: "코드 문서화, README 작성"
    
  code_review:
    level: expert
    description: "건설적인 코드 리뷰"

performance_metrics:
  test_coverage:
    target: ">= 80%"
    weight: 0.3
    
  code_review_pass_rate:
    target: ">= 95%"
    weight: 0.3
    
  bug_introduction_rate:
    target: "<= 5%"
    weight: 0.2
    
  documentation_completeness:
    target: ">= 90%"
    weight: 0.2
```

### 5.3 성과 측정

```yaml
# retrospective/metrics/agent-performance.json

{
  "cycle": 5,
  "period": "2026-01-15 ~ 2026-01-30",
  "agents": {
    "developer": {
      "tasks_completed": 45,
      "success_rate": 91.1,
      "metrics": {
        "test_coverage": 85.2,
        "code_review_pass_rate": 97.8,
        "bug_introduction_rate": 3.2,
        "documentation_completeness": 92.0
      },
      "score": 92.3,
      "trend": "+2.1"
    },
    "dba": {
      "tasks_completed": 12,
      "success_rate": 100.0,
      "metrics": {
        "schema_quality": 95.0,
        "query_performance": 88.0,
        "documentation_completeness": 90.0
      },
      "score": 91.0,
      "trend": "+0.5"
    }
  }
}
```

### 5.4 역량 기반 개선

```
성과 점수 < 80% → 해당 역량 관련 프롬프트 강화
반복 실패 패턴 → Lessons Learned + 안티패턴 추가
성과 점수 > 95% → 성공 패턴 문서화
```

---

## 6. LLM Consortium (선택적)

### 6.1 개요

Agentsway의 다중 LLM 합의 시스템. **핵심 결정에만 선택적 적용**.

### 6.2 적용 범위

```yaml
consensus_mode:
  enabled: true
  
  # 합의가 필요한 결정 유형
  critical_decisions:
    - architecture_choice
    - security_design
    - data_model
    - api_design
    - technology_selection
    
  # 합의 불필요 (단일 에이전트)
  standard_decisions:
    - code_implementation
    - bug_fix
    - refactoring
    - documentation
```

### 6.3 합의 프로세스

```
┌─────────────────────────────────────────────────────────────┐
│                   핵심 결정 필요                            │
└───────────────────────────┬─────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                   다중 모델 질의                            │
│                                                             │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐                  │
│  │ Claude   │  │ Claude   │  │ Claude   │                  │
│  │ Sonnet   │  │ Opus     │  │ Haiku    │                  │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘                  │
│       │             │             │                         │
│       └─────────────┼─────────────┘                         │
│                     │                                       │
│                     ▼                                       │
│            ┌──────────────┐                                 │
│            │   응답 수집   │                                 │
│            └──────┬───────┘                                 │
└───────────────────┼─────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────────────┐
│                Reasoning Model (Opus)                       │
│                                                             │
│  - 각 응답 분석                                             │
│  - 합의점 도출                                              │
│  - 트레이드오프 분석                                        │
│  - 최종 결정 + 근거                                         │
└───────────────────────────┬─────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                   ADR 생성                                  │
│  - 결정 사항                                                │
│  - 대안들                                                   │
│  - 선택 근거                                                │
│  - 모델별 의견                                              │
└─────────────────────────────────────────────────────────────┘
```

### 6.4 설정

```yaml
# timsquad.config.yaml

consensus:
  enabled: true
  
  models:
    primary: claude-sonnet-4
    secondary: claude-opus-4
    fast: claude-haiku-4
    
  reasoning_model: claude-opus-4
  
  # 비용 최적화
  cost_optimization:
    use_haiku_for_simple: true
    use_opus_for_critical: true
    
  # 프로젝트 타입별 설정
  project_overrides:
    fintech:
      always_use_consensus: true  # 모든 결정에 합의
    web-service:
      consensus_only_for: [architecture_choice, security_design]
```

---

## 7. 프로젝트 타입

### 7.1 지원 타입 (Phase 1)

| 타입 | 설명 | 추가 SSOT | 추가 에이전트 | Consensus 기본값 |
|-----|------|----------|-------------|-----------------|
| **web-service** | SaaS, 웹앱 | ui-ux-spec, screen-flow | designer, frontend, backend | 선택적 |
| **platform** | 프레임워크, SDK | api-design, integration-spec | api-designer, doc-writer | 선택적 |
| **api-backend** | API 서버, 마이크로서비스 | api-design | api-designer | 선택적 |
| **fintech** | 거래소, 결제 | security-spec, compliance | security, compliance, auditor | **필수** |
| **infra** | DevOps, 자동화 | infra-spec | devops, sre | 선택적 |

### 7.2 공통 에이전트

```
┌── planner      # PRD, 기획, 아키텍처
├── prompter     # 프롬프트 최적화 (NEW)
├── developer    # 구현
├── dba          # DB 설계
└── qa           # 테스트
```

---

## 8. 파일 구조

### 8.1 템플릿 구조

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
│   │       ├── /generators              # 문서 생성기 (XML) ← NEW
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

### 8.2 프로젝트 초기화 후 구조

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
    ├── config.yaml                      # 프로젝트 설정
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
    ├── /generators                      # 문서 생성기 (XML) ← NEW
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

---

## 9. Prompter Agent (NEW)

### 9.1 역할

Agentsway의 Prompting Agent 개념 적용. Planner의 의도를 최적화된 프롬프트로 변환.

### 9.2 SKILL.md

```markdown
---
name: prompter
description: 프롬프트 최적화 및 관리
---

# Prompter Agent

## 페르소나
10년 경력의 프롬프트 엔지니어
- LLM 프롬프트 최적화 전문가
- 다양한 도메인 프롬프트 설계 경험
- Anthropic 프롬프트 가이드 숙지

## 역할
1. Planner 의도를 서브에이전트용 프롬프트로 변환
2. 프롬프트 템플릿 관리 및 버전 관리
3. 회고 결과 기반 프롬프트 개선
4. 프롬프트 품질 검증

## When to Use
- Planner가 서브에이전트에게 작업 지시 시
- 새로운 작업 유형 발생 시
- 회고 후 프롬프트 개선 시

## 프롬프트 최적화 원칙
1. **명확성**: 모호함 제거, 구체적 지시
2. **구조화**: 역할 → 컨텍스트 → 작업 → 출력 형식
3. **예시 포함**: Good/Bad 예시로 기대치 명확화
4. **제약 명시**: 하지 않아야 할 것 명시

## 템플릿 구조
```
# {Task Type} Prompt

## Context
{SSOT 참조 내용}

## Task
{구체적 작업 내용}

## Constraints
{제약사항}

## Output Format
{출력 형식}

## Examples
### Good
{좋은 예시}

### Bad
{나쁜 예시}
```

## 버전 관리
- 모든 프롬프트 변경 이력 기록
- 성능 저하 시 롤백 가능
- A/B 테스트 지원
```

### 9.3 프롬프트 템플릿 디렉토리

```
/agents/prompter/templates/
├── developer/
│   ├── implement-feature.md
│   ├── fix-bug.md
│   ├── refactor.md
│   └── write-test.md
├── dba/
│   ├── design-schema.md
│   ├── optimize-query.md
│   └── migration.md
├── qa/
│   ├── write-test-cases.md
│   ├── review-code.md
│   └── security-audit.md
└── changelog.md
```

---

## 10. 로그 자동화

### 10.1 문제
Claude 출력 → "이거 저장해" → 다시 처리 → 토큰 낭비

### 10.2 해결

```bash
# 출력과 동시에 파일 저장 (토큰 추가 사용 없음)
timsquad-log.sh <agent> <log_type>

# 사용 예시
echo "계획: API 설계 시작" | timsquad-log planner work
claude_output | timsquad-log developer work
```

### 10.3 로그 타입

| 타입 | 용도 | 회고 분석 대상 |
|-----|------|-------------|
| work | 작업 내용 | ✅ |
| error | 에러/이슈 | ✅ |
| decision | 결정 사항 | ✅ |
| status | 현재 상태 | - |
| feedback | 피드백 내용 | ✅ |

---

## 11. 비즈니스 모델

### 11.1 무료 (오픈소스)

```
/timsquad-core
├── 기본 에이전트 프레임워크
├── common 템플릿 (SSOT, 프롬프트)
├── CLI 도구
├── 회고 시스템 기본
└── 문서
```

### 11.2 유료 (프로젝트 타입별 템플릿)

```
/templates/web-service         $29
├── SSOT 전략 (monorepo 기준)
├── 에이전트 롤 (frontend/backend/db)
├── 프롬프트 템플릿 (최적화됨)
├── 자동화 스크립트
└── 워크플로우 MD

/templates/fintech             $49
├── SSOT 전략 (컴플라이언스 고려)
├── 에이전트 롤 (audit/crypto/compliance)
├── Consensus 설정 (필수)
├── 보안 프롬프트 템플릿
└── 워크플로우 MD
```

### 11.3 판매 채널
- Phase 1: Gumroad / Lemon Squeezy
- Phase 2: PRMS 플랫폼에서 직접 판매

---

## 12. 기술 스택

| 구분 | 기술 |
|-----|------|
| CLI | Node.js (npm/npx 배포) |
| 프롬프트 | Markdown + YAML frontmatter |
| 설정 | YAML (timsquad.config.yaml) |
| 표준 | Anthropic Agent Skills 표준 |
| 배포 | GitHub → npm registry |
| CI/CD | GitHub Actions |
| 회고 분석 | Claude API (Haiku for cost) |

---

## 13. 로드맵

### Phase 0 (2-4주) - MVP
```
Week 1-2:
├── common 템플릿 완성
│   ├── prd.template.md
│   ├── process.md
│   ├── AGENT.md.template
│   └── planner SKILL.md (3개 모드)
│
├── prompter 에이전트 구현 (NEW)
│   ├── SKILL.md
│   └── 기본 템플릿
│
├── 공통 에이전트 완성
│   ├── developer/ (SKILL.md, AGENT.md, competency.yaml)
│   ├── dba/
│   └── qa/
│
├── 피드백 라우팅 기본 구현
│
└── 로그 자동화 스크립트

Week 3-4:
├── 회고 시스템 기본 구현
│   ├── 로그 수집
│   ├── 패턴 분석 (기본)
│   └── 리포트 생성
│
├── web-service 타입 완성
│
└── 실제 프로젝트로 테스트 (dugout.tours)
```

### Phase 1 (1-2개월) - 확장
```
├── 나머지 타입 확장
│   ├── fintech (consensus 필수)
│   ├── platform
│   ├── api-backend
│   └── infra
│
├── 회고 시스템 고도화
│   ├── 자동 프롬프트 개선 제안
│   └── 역량 기반 분석
│
├── LLM Consensus 구현
│
├── CLI 도구 완성
│
└── npm 배포
```

### Phase 2 (3개월+) - 생태계
```
├── 유료 템플릿 판매 시작
├── 문서화 및 튜토리얼
├── 커뮤니티 템플릿 기여 시스템
├── 회고 대시보드 (선택적)
└── game, system 타입 (제한적)
```

---

## 14. 성공 지표

### 14.1 정량적
| 지표 | 6개월 목표 | 12개월 목표 |
|-----|----------|-----------|
| GitHub Stars | 1,000+ | 3,000+ |
| npm 주간 다운로드 | 500+ | 2,000+ |
| 유료 템플릿 판매 | 100+ | 500+ |
| 평균 회고 개선률 | 10%+ | 15%+ |

### 14.2 정성적
- 사용자 피드백: "혼자서도 팀처럼 개발 가능"
- 코드 품질: 베스트 프랙티스 준수율 80%+
- 문서화: 모든 결정 사항 추적 가능
- 학습 곡선: 30분 내 첫 프로젝트 시작

---

## 15. 리스크 및 대응

| 리스크 | 영향 | 대응 |
|-------|-----|------|
| Claude 정책 변경 | 높음 | 다른 LLM 지원 가능한 구조 |
| 경쟁 프레임워크 | 중간 | SSOT + 회고 + 템플릿으로 차별화 |
| 토큰 비용 증가 | 중간 | 로그 자동화 + Haiku 활용 |
| 복잡한 학습 곡선 | 낮음 | 프롬프트만 이해하면 사용 가능 |
| 회고 분석 부정확 | 중간 | 사용자 승인 필수 + 수동 검토 옵션 |

---

## 16. 부록

### 16.1 관련 프로젝트
- 인증 서버 (OCI, JWT/PASETO)
- PRMS (Personal Resource Management System)
- dugout.tours (일본 여행 SaaS - 테스트 대상)

### 16.2 참고 자료
- Anthropic Skills: https://github.com/anthropics/skills
- Agentsway 논문: https://arxiv.org/abs/2510.23664
- ACM TOSEM LLM-Based Multi-Agent Systems: https://dl.acm.org/doi/10.1145/3712003
- Agentic SE 논문: https://arxiv.org/abs/2509.06216
- Superpowers: https://github.com/obra/superpowers

### 16.3 용어 정의
| 용어 | 정의 |
|-----|------|
| SSOT | Single Source of Truth - 진실의 원천 |
| 분수 모델 | SSOT 순차 + 작업 병렬의 하이브리드 |
| Planner | PM/기획/설계를 통합한 메인 에이전트 |
| Prompter | 프롬프트 최적화 전담 에이전트 (Agentsway) |
| 회고적 학습 | 사이클 종료 후 템플릿/프롬프트 개선 |
| LLM Consortium | 핵심 결정 시 다중 모델 합의 |
| 피드백 라우팅 | 피드백 레벨에 따른 적절한 담당자 배정 |
| 역량 프레임워크 | 에이전트별 기술/성과 측정 체계 |
| ADR | Architecture Decision Record - 아키텍처 결정 기록 |

---

## 17. 확장 계획 (Phase 2+)

### 17.1 멀티 LLM 지원

현재 설계가 프로그램 레이어 중심이라 LLM은 "교체 가능한 부품".

**지원 예정:**
| 제공자 | 용도 |
|-------|-----|
| Claude API | 기본 |
| OpenAI (GPT) | 대안 |
| Google (Gemini) | 빠른 검증 |
| Local (Ollama) | 프라이버시 |
| OpenCode | oh-my-opencode 호환 |

**설정 예시:**
```yaml
# timsquad.config.yaml
providers:
  default: claude-code
  
  agents:
    planner: claude/opus       # 복잡한 판단
    developer: claude/sonnet   # 코딩
    qa: gemini/flash           # 빠른 검증
    retrospective: claude/haiku # 비용 최적화
```

### 17.2 프로젝트 결과물 기반 자동 개선

완성된 프로젝트의 결과물과 문서를 분석하여 템플릿/프롬프트 자동 개선.

**흐름:**
```
프로젝트 완료
    ↓
결과물 분석 (코드 품질, 테스트 커버리지, 문서 완성도)
    ↓
SSOT 문서와 실제 결과물 비교
    ↓
개선점 도출
    ↓
템플릿/프롬프트 자동 업데이트 제안
    ↓
사용자 승인 후 적용
```

**저장 대상:**
- 성공 패턴 → 템플릿에 반영
- 효과적인 프롬프트 → Prompter 템플릿 업데이트
- 자주 발생한 피드백 → SKILL.md 안티패턴 추가

### 17.3 특성화된 롤 저장 및 공유

프로젝트별로 최적화된 에이전트 롤을 저장하고 재사용.

**구조:**
```
/timsquad-hub (또는 로컬)
├── /roles
│   ├── /fintech-senior-developer
│   │   ├── SKILL.md
│   │   ├── AGENT.md
│   │   ├── competency.yaml
│   │   └── meta.json  # 성과 데이터, 적합한 프로젝트 타입
│   │
│   ├── /startup-fullstack
│   │   └── ...
│   │
│   └── /enterprise-architect
│       └── ...
│
└── /templates
    ├── /saas-mvp
    └── /enterprise-api
```

**기능:**
- 내 프로젝트에서 최적화된 롤 → 저장
- 다른 프로젝트에서 → 불러오기
- 커뮤니티 공유 (선택적)
- 롤 성과 비교 (어떤 롤이 더 효과적이었나)

### 17.4 인젝션 방법 발전 계획

Claude Code에 TimSquad를 주입하는 방법의 발전 단계.

> **Note:** Claude Code 2.1+ 기준. Slash Commands와 Skills가 통합됨.

**Phase별 인젝션 방법:**

| Phase | 방법 | 복잡도 | 자동화 수준 |
|-------|-----|-------|-----------|
| **MVP** | CLAUDE.md + Skills 기반 | 낮음 | 수동 |
| **1.0** | Hooks + Settings 추가 | 중간 | 반자동 |
| **1.5** | Plugin 배포 | 중간 | 자동 |
| **2.0** | MCP 서버 | 높음 | 완전 자동 |

**MVP: CLAUDE.md + Skills 기반**
```bash
tsq init --type web-service

# 결과 구조
/my-project
├── CLAUDE.md                      # 프로젝트 컨텍스트
├── .claude/
│   ├── settings.json              # hooks, permissions
│   └── skills/                    # 에이전트 스킬 (Claude Code 2.1+)
│       ├── tsq-planner/
│       │   └── SKILL.md
│       ├── tsq-developer/
│       │   └── SKILL.md
│       └── tsq-qa/
│           └── SKILL.md
│
└── .timsquad/
    ├── config.yaml                # TimSquad 설정
    ├── ssot/                      # SSOT 문서들
    └── logs/                      # 작업 로그
```

**SKILL.md 형식 (Claude Code 2.1+ 표준):**
```markdown
---
name: tsq-developer
description: TimSquad Developer 에이전트. 코드 구현, 테스트 작성 담당.
user-invocable: true
---

# Developer Agent

## 페르소나
15년 경력의 시니어 풀스택 개발자...

## 작업 전 필수
1. SSOT 문서 확인 (.timsquad/ssot/)
2. service-spec.md의 API 명세 참조
3. 기존 코드 패턴 분석

## 작업 원칙
- Clean Architecture 준수
- 테스트 먼저 (TDD)
- 에지 케이스 우선 고려
```

**1.0: Hooks + Settings 추가**

`.claude/settings.json`:
```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Write|Edit",
        "command": "node .timsquad/scripts/check-ssot.js"
      }
    ],
    "PostToolUse": [
      {
        "matcher": "Write|Edit|Bash",
        "command": "node .timsquad/scripts/auto-log.js"
      }
    ],
    "Stop": [
      {
        "command": "node .timsquad/scripts/session-summary.js"
      }
    ]
  },
  "permissions": {
    "allow": [
      "Read(**)",
      "Write(.timsquad/logs/**)"
    ],
    "ask": [
      "Write(**)",
      "Bash(**)"
    ]
  }
}
```

**1.5: Plugin 배포**
```bash
/plugin marketplace add timsquad/timsquad
/plugin install timsquad

# Skills가 자동으로 추가됨
# /tsq-planner, /tsq-developer, /tsq-qa 사용 가능
```

**2.0: MCP 서버**
```bash
tsq serve
claude mcp add timsquad http://localhost:3000

# MCP Tools
- timsquad:get_ssot
- timsquad:route_feedback
- timsquad:log
- timsquad:retrospective
```

### 17.5 확장 로드맵 종합

| Phase | 기능 | 예상 시기 |
|-------|-----|----------|
| **MVP** | CLAUDE.md 기반 인젝션 | 즉시 |
| **1.0** | Hooks 자동화 | MVP 후 2주 |
| **1.5** | Plugin 배포 | 1.0 후 2주 |
| **2.0** | MCP 서버 (선택적) | 1.5 후 1개월 |
| **2.1** | 멀티 LLM Adapter | 2.0 후 1개월 |
| **2.2** | 프로젝트 결과물 분석 | 2.1 후 1개월 |
| **2.3** | 특성화 롤 저장/불러오기 | 2.2 후 1개월 |
| **2.4** | 커뮤니티 허브 | 2.3 후 2개월 |
| **2.5** | Quick Mode 파이프라인 | 1.0과 병행 |

### 17.6 Quick Mode (경량 파이프라인)

간단한 작업을 위한 경량 실행 모드. 전체 프로세스 없이 서브에이전트가 직접 실행.

#### 설계 철학
> **"간단한 건 간단하게, 복잡한 건 체계적으로"**

#### 흐름

```
"버튼 색상 파란색으로 바꿔"
    ↓
[프로그램] Quick 조건 판단 (0 토큰)
    ↓
서브에이전트 직접 호출 (Developer)
    ↓
작업 실행
    ↓
[프로그램] 버그픽스 로그 자동 기록 (0 토큰)
    ↓
완료
```

#### Quick 조건 (자동 판단)

```yaml
quick_mode:
  triggers:
    keywords:
      - "수정", "고쳐", "바꿔", "변경"
      - "fix", "change", "update"
      - "오타", "typo", "색상", "텍스트"

    conditions:
      - single_file_change: true
      - ssot_update_required: false
      - new_feature: false
      - api_change: false
```

#### CLI

```bash
# 명시적 Quick
tsq q "버튼 텍스트 수정"
tsq quick "console.log 제거"

# 명시적 Full (기존 프로세스)
tsq f "결제 기능 추가"

# 자동 판단 (기본)
tsq "로그인 버튼 색상 변경"  # → Quick 자동
tsq "새 API 엔드포인트"      # → Full 자동
```

#### 로그 구조

Quick 모드는 간단한 작업일지만 남김:

```
/.timsquad/logs/quick/
└── 2026-02-03.md
```

```markdown
# Quick Mode Log - 2026-02-03

## 14:32 - Developer
- **작업**: 버튼 색상 파란색으로 변경
- **파일**: src/components/Button.tsx
- **변경**: `bg-gray-500` → `bg-blue-500`

## 15:10 - Developer
- **작업**: 로그인 텍스트 오타 수정
- **파일**: src/pages/Login.tsx
- **변경**: "로그이" → "로그인"
```

#### Quick vs Full 비교

| 항목 | Quick Mode | Full Mode |
|-----|-----------|-----------|
| SSOT 확인 | ❌ | ✅ |
| Planner 경유 | ❌ | ✅ |
| 에이전트 | Developer 직접 | Planner가 배정 |
| 로그 | 간단 (작업일지) | 상세 |
| QA 검증 | ❌ | ✅ (설정 따라) |
| 회고 대상 | ❌ | ✅ |
| 토큰 사용 | 최소 | 표준 |

#### 강제 Full 전환

Quick 중 복잡도 감지 시 자동 전환:

```
"버튼 색상 바꿔" (Quick 시작)
    ↓
[분석] 여러 파일 영향, API 변경 필요
    ↓
"이 작업은 Full 모드가 적합합니다. 전환할까요?"
    ↓
사용자 승인 → Full 모드 전환
```

---

**Document End**

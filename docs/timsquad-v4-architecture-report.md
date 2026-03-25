# TimSquad v4.0 Architecture Report: From Prompt-Led Framework to Governed Agent Harness
## 종합 진단 및 진화 방향 — 학술 근거, 업계 가이드, 코드베이스 분석 기반

> 작성일: 2026-03-25
> 대상: TimSquad v3.8.0 (npm: timsquad)
> 범위: 제품 정체성, 현 구조 진단, 진화 방향, 이론적 근거

---

## 목차

1. [Executive Summary](#1-executive-summary)
2. [제품 정체성 재정의](#2-제품-정체성-재정의)
3. [Non-Goals — 이번 버전에서 하지 않는 것](#3-non-goals)
4. [현 구조 진단 (코드베이스 기반)](#4-현-구조-진단)
5. [이론적 근거 — 학술 논문 및 업계 가이드](#5-이론적-근거)
6. [핵심 진화 방향: Grill-First PRD Workspace](#6-핵심-진화-방향-grill-first-prd-workspace)
7. [Core Loop: Research → Plan → Review Gate](#7-core-loop-research--plan--review-gate)
8. [Tri-Plane Execution Model](#8-tri-plane-execution-model)
9. [Session Lifecycle: Initialize → Work → Handoff](#9-session-lifecycle)
10. [Document Trace Graph — 문서 관계 모델](#10-document-trace-graph)
11. [Execution Trace — Eval 체계](#11-execution-trace--eval-체계)
12. [스킬 주도 파이프라인 강화](#12-스킬-주도-파이프라인-강화)
13. [인프라 안정화 (병렬 진행)](#13-인프라-안정화)
14. [보안 체계 강화](#14-보안-체계-강화)
15. [성공 지표 (KPI)](#15-성공-지표-kpi)
16. [구현 우선순위 및 로드맵](#16-구현-우선순위-및-로드맵)
17. [Sources](#17-sources)

---

## 1. Executive Summary

TimSquad는 **AI 에이전트 하네스(harness) 프레임워크**다. Claude Code 위에서 동작하며, LLM이 코드를 작성할 때 구조적으로 잘못된 행동을 하지 못하게 막는 **프로세스 강제 레이어**가 핵심 가치다.

현재 v3.8.0은 CLI 10개, 데몬 10모듈, 스킬 37개, Hook 13개, 테스트 782개로 기능적으로는 완성 단계다. 그러나 다음 세 가지 구조적 전환이 필요하다:

1. **시작점 전환**: `prd.md` 단일 파일 → grill이 만드는 PRD workspace (폴더형)
2. **프로세스 골자 확립**: 모든 단계에 Research → Plan → Review Gate 공통 루프 강제
3. **복합 파이프라인 강제**: Task/Sequence/Phase 각 레벨에서 작업(Do) + 검증(Verify) + 동기화(Sync)가 하나의 프로세스로 실행
4. **측정 가능성 확보**: Document Trace Graph + Execution Trace (Eval) 이원 체계

이 방향은 Anthropic, OpenAI, ACM TOSEM, OWASP의 최신 가이드와 정합하며, TimSquad의 기존 강점(Hook Gate, Capability Token, 결정론적 DAG)을 그대로 활용한 자연스러운 진화다.

**TimSquad v4.0의 목표는 더 많은 자동화가 아니라, 더 적은 재작업과 더 높은 결정 신뢰도를 만드는 것이다.**

---

## 2. 제품 정체성 재정의

### 2.1 현재 정체성

"Vibe Development Framework" — AI 시대의 소프트웨어 개발 표준 프로세스 프레임워크.

### 2.2 실질적 정체성

**AI 에이전트 거버넌스 하네스.**

TimSquad는 모델 성능을 증폭시키는 것이 아니라, **모델 변동성을 관리 가능한 프로세스로 감싼다.** 구체적으로:

| 레이어 | 역할 | 메커니즘 |
|--------|------|----------|
| 문서 (SSOT) | 요구사항의 진실의 원천 | prd/, trd/, erd/, ia/ |
| 상태 (Workflow) | 진행 상태 추적 | workflow.json, phase-memory |
| 실행 (Controller) | 태스크 위임 + Context DI | tsq next + tsq-controller 스킬 |
| 감사 (Audit) | 사후 품질 + 보안 검증 | Hook Gate, Capability Token, audit |

### 2.3 포지셔닝

Anthropic은 agentic coding eval에서 **인프라/하네스 구성이 결과를 여러 퍼센트포인트, 때로는 상위 모델 간 리더보드 격차보다 더 크게 흔들 수 있다**고 설명한다[1][4]. 2025년이 에이전트의 해였다면, 2026년은 에이전트 하네스의 해다. TimSquad의 핵심 차별화는 모델 자체가 아니라 **하네스 설계**다.

---

## 3. Non-Goals

Agentless[14] 논문이 경고하듯 "불필요한 복잡성"은 단순한 접근보다 나쁠 수 있다. TimSquad v4.0이 **하지 않는 것**을 명확히 한다:

- 범용 웹 검색 에이전트 플랫폼이 아니다
- 범용 멀티모델 orchestration 플랫폼이 아니다
- 모든 IDE용 추상화 레이어가 아니다 (Claude Code 전용 하네스)
- 완전 자동 프로젝트 매니저 대체가 아니다
- 에이전트가 알아서 코딩하는 "마법 도구"가 아니다

TimSquad는 **구조를 세우면 에이전트가 더 잘 된다**는 가설 위에 있다. 에이전트를 대체하거나 범용화하는 것이 아니라, 에이전트가 일하는 **환경을 통제**하는 것이다.

---

## 4. 현 구조 진단

### 4.1 코드베이스 규모

```
src/           54 파일 (commands 10 + daemon 10 + lib 21 + types 8 + utils 5)
templates/     37 스킬 + 7 에이전트 + 16 Hook/Script
tests/         23 파일, 782 테스트 케이스, 4.28초
```

### 4.2 스킬 주도 파이프라인 강제 구조 (코드 확인 완료)

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Layer 0: tsq-protocol  (모든 에이전트 skills[0], 자동 활성)
           tsq-controller (BASE_SKILLS, 무조건 배포)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Layer 1: 에이전트별 역할 스킬
           developer: [tsq-coding, tsq-testing, tsq-typescript]
           qa:        [tsq-testing, tsq-security]
           architect: [tsq-architecture]
           ...
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Layer 2: 프로젝트별 동적 스킬 (타입/도메인/스택/방법론)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

- `src/types/config.ts:224` — `BASE_SKILLS` 배열에 protocol + controller 하드코딩
- `src/lib/agent-generator.ts:41` — `injectSkillsIntoFrontmatter()`로 스택 기반 스킬 자동 주입
- `src/lib/skill-generator.ts:42` — `getActiveSkills()`가 BASE + type + domain + stack + methodology 합산
- 모든 에이전트 frontmatter에서 `skills[0] = tsq-protocol` 확인

### 4.3 강점 5개

| # | 강점 | 근거 |
|---|------|------|
| S1 | **Capability Token** — 업계 유일 런타임 권한 시스템 | OWASP ASI08(Uncontrolled Autonomy) 직접 대응[8] |
| S2 | **Fail-closed Hook Gate** — 프롬프트 무시 불가 | Anthropic "하네스 설계가 성능을 좌우"[1]와 정합 |
| S3 | **DAG 기반 결정론적 태스크 추출** | 비결정론적 LLM 위 결정론적 레이어 |
| S4 | **782개 테스트 + prompt-quality 자동 검증** | 프레임워크 자체 품질 보증 |
| S5 | **실전 검증 사례** (dugout-tours.jp) | Lighthouse 95/96/100/100 |

### 4.4 구조적 위험 5개

| # | 위험 | 영향 |
|---|------|------|
| R1 | **동시성 보호 전무** — session-state.json, pending.jsonl race condition | Wave 디스패치 시 메트릭 손실 |
| R2 | **에러 삼킴 16곳** — 빈 catch 블록 | "신뢰할 수 있는" 포지셔닝과 충돌 |
| R3 | **Claude Code 단일 종속** — Hook API 변경 시 Layer 1 무력화 | 플랫폼 리스크 |
| R4 | **Daemon 운영 미성숙** — 헬스체크 없음, 소켓 정리 불완전 | 좀비 프로세스, 포트 충돌 |
| R5 | **초기 요구사항 품질 미강제** — prd.md 빈 파일 생성 후 방치 | 드리프트의 근본 원인 |

---

## 5. 이론적 근거

> **출처 위계**: 본문 핵심 논증은 Tier 1(공식 문서, 학술 논문, 표준)에만 기반한다. Tier 2(산업 리포트, 벤더 연구)와 Tier 3(블로그, 해설, 커뮤니티)은 보강 사례로만 사용한다.

### 5.1 Anthropic — 하네스와 컨텍스트 설계 [Tier 1]

**"Building Effective Agents"[T1-1]** — Anthropic은 단순 패턴(augmented LLM, prompt chaining)부터 시작해 복잡한 에이전트 프레임워크로 확장하라고 권고. 핵심 원칙:

- **context engineering**: 프롬프트 엔지니어링의 자연스러운 진화. "가장 작은 고신호 토큰 집합이 원하는 결과를 최대화한다"[T1-2]
- **context rot**: 토큰이 많아질수록 모델의 집중력이 약해짐. 1M 토큰 부근에서 성능 천정[T1-2]
- **compaction + progress file**: 장시간 에이전트의 핵심 패턴[T1-3]

**"Effective Harnesses for Long-Running Agents"[T1-3]** — 2-에이전트 하네스(initializer + coder), 3-에이전트 하네스(planner + generator + evaluator). 핵심 발견:

> "작업을 수행하는 에이전트와 판단하는 에이전트를 분리하는 것이 강력한 레버다. 독립적인 evaluator를 회의적으로 튜닝하는 것이, generator를 자기비판적으로 만드는 것보다 훨씬 다루기 쉽다."[T1-3]

**"Harness Design for Long-Running Application Development"[T1-4]** — 장시간 앱 개발용 하네스 설계. initializer / worker / handoff 패턴을 제시.

**TimSquad 적용**: Controller(planner/generator) + Hook Gate(evaluator) 구조가 Anthropic의 3-에이전트 패턴과 정합. 그러나 현재 evaluator 역할이 Hook의 pass/fail 판단에 한정되어 있어, **eval 체계로 확장**해야 한다. Session lifecycle(initializer/worker/handoff)도 명시적으로 설계해야 한다.

### 5.2 OpenAI — Eval-Driven Development [Tier 1]

**"Working with Evals"[T1-5]** — OpenAI는 eval-driven development를 공식 권고. "eval이 먼저 — 프롬프트, 파이프라인, 모델 선택보다 먼저." eval을 "structured tests"로 정의하며, 비결정론적 시스템에서 반복 가능한 측정을 핵심으로 본다.

**"Agent Evals & Trace Grading"[T1-6]** — 워크플로우 수준 평가:

- **Trace grading**: 에이전트의 전체 step-by-step 과정을 검사. 최종 결과만이 아닌 '어떻게, 왜'를 평가
- **4가지 신규 기능**: Datasets, Trace grading, Automated prompt optimization, Third-party model support
- "vibe-based evals"(감으로 평가) 경고
- 결정론적 평가 우선, LLM-as-Judge는 보충 수단

**"Testing Agent Skills Systematically with Evals"[T1-7]** — 에이전트 스킬도 테스트 가능한 artifact로 만들라고 별도 가이드. TimSquad처럼 skill/controller/hook 중심 프레임워크에서 이 축이 핵심 경쟁력이 될 수 있다.

**TimSquad 적용**: `tsq audit`이 7영역 점수를 내지만, 이것은 **정적 체크**다. OpenAI가 말하는 trace grading — 에이전트가 "왜 이 파일을 수정했는가"를 추적하는 동적 평가 — 가 빠져있다.

### 5.3 Eval-Driven Development (EDD) — 학술 프레임워크 [Tier 1]

**"EDDOps: Evaluation-Driven Development and Operations of LLM Agents"[T1-8]** (arXiv, 2025):

> "전통적 TDD/BDD는 안정적 명세, 실행 가능한 오라클, 배포 전 테스트 단계를 가정한다. 반면 LLM 에이전트는 비결정론적이고, 불완전한 목표를 추구하며, 배포 후에도 계속 적응한다."[T1-8]

핵심 원칙:
- **eval harness를 먼저 만들어라** — 코드보다 먼저
- **계층적 평가**: 결정론적 단위 테스트(상태, API, 도구) + 확률적 행동 테스트(계획 생성, 사용자 대면 출력)
- **연속 평가**: 프로덕션에서도 rolling 7일/30일 성공률 모니터링, 10% 이상 하락 시 경보
- **행동 드리프트 감지**: 응답 길이 변화, 신뢰도 점수 변화, 추론 패턴 차이 추적

**TimSquad 적용**: TimSquad의 Completion Report(pass/fail)는 EDD의 가장 기초적 형태. 이것을 **구조적 eval 체계**로 확장해야 한다.

> 참고: evaldriven.org 선언문[T3-1]은 "엔지니어의 역할은 작동한다는 것이 무엇을 의미하는지 정의하고, 측정하고, 그 정의를 고수하는 것"이라는 철학적 프레이밍을 제공하지만, 본 문서의 핵심 논증은 OpenAI 공식 가이드[T1-5][T1-6]와 EDDOps 논문[T1-8]에 기반한다.

### 5.4 ACM TOSEM — LLM 멀티에이전트 시스템 [Tier 1]

**"LLM-Based Multi-Agent Systems for Software Engineering: Literature Review, Vision, and the Road Ahead"[T1-9]** (ACM TOSEM):

- LLM 기반 자율 에이전트의 SE 통합은 "자율적 문제 해결, 견고성 향상, 확장 가능한 솔루션"을 가능하게 함
- SDLC 전체에 걸친 LMA(LLM-based Multi-Agent) 프레임워크 체계적 리뷰
- 핵심 과제: 멀티에이전트 오케스트레이션, 인간-에이전트 조율, 연산 비용 최적화

**"ALMAS: Autonomous LLM-based Multi-Agent SE Framework"[T1-10]** (arXiv, 2025-10):
- SDLC 철학을 따르며, **애자일 역할에 에이전트를 정렬**
- 모듈식으로 인간 개발자와 통합

**"Agentless: Demystifying LLM-based SE Agents"[T1-11]** (FSE 2025):
- "복잡한 자율 에이전트가 정말 필요한가?" 질문
- 3단계(localization → repair → validation)로 SWE-bench Lite 32% 달성, $0.70
- **단순한 접근이 복잡한 에이전트 프레임워크를 이길 수 있다**

**TimSquad 적용**: ALMAS의 "애자일 역할 = 에이전트 역할" 패턴은 TimSquad의 7-에이전트 구조(architect, developer, qa...)와 정확히 동일. Agentless의 경고("불필요한 복잡성")는 섹션 3의 Non-Goals로 반영.

### 5.5 요구사항 추적성 (Traceability) [Tier 1 + Tier 2]

**IBM Engineering DOORS[T1-12]** [Tier 1]:
- 요구사항 관리의 핵심은 개별 문서가 아니라 **문서 간 관계와 추적성**
- V-Model 전체에 걸친 lifecycle linking

**Jama Software — 4 Best Practices for Requirements Traceability[T2-1]** [Tier 2]:
- 4가지 추적성 유형: Forward, Backward, Bidirectional, Horizontal
- "모든 요구사항에 소유자, 우선순위, 출처 참조가 있어야 한다"
- 자동화된 양방향 추적이 리스크를 최소화

**TimSquad 적용**: 현재 TimSquad는 planning.md → workflow.json 단방향 추적만 존재. PRD → Sub-PRD → TRD/ERD/IA → Task → Test의 **양방향 추적 그래프**가 필요하다.

### 5.6 정보 구조 (Information Architecture) [Tier 2]

**Atlassian — Information Architecture Strategy[T2-2]**:
- "정보 구조는 지식을 조직하는 실천이다"
- 규모가 커질수록 정보구조 전략이 없으면 지식이 흩어지고 낡는다
- "North Star 목표 없이 시작하면 콘텐츠 묘지가 된다"

**TimSquad 적용**: 현재 `.timsquad/ssot/`은 플랫 파일 목록. 콘텐츠 묘지 위험. prd/ 폴더형 전환 + frontmatter 관계 + Document Trace Graph가 이를 해결.

### 5.7 OWASP — Agentic AI 보안 [Tier 1]

#### 5.7.1 Application-Level Risks

**"OWASP Top 10 for Agentic Applications 2026"[T1-13]** — 시스템 전체 수준의 보안 리스크:

| 순위 | 위협 | TimSquad 대응 현황 |
|------|------|-------------------|
| ASI01 | Agent Goal Hijacking | Hook Gate로 부분 대응 |
| ASI02 | Tool Misuse | safe-guard.sh로 대응 |
| ASI03 | Identity & Privilege Abuse | **Capability Token으로 직접 대응** |
| ASI05 | Unexpected Code Execution | safe-guard.sh + build-gate.sh |
| ASI06 | Memory & Context Poisoning | phase-memory 구조로 부분 대응 |
| ASI08 | Uncontrolled Autonomy | **Capability Token + change-scope-guard** |
| ASI07 | Insecure Inter-Agent Communication | 미대응 (IPC 인증 없음) |
| ASI10 | Cascading Failures | 미대응 (데몬 헬스체크 없음) |

> "Least Agency 원칙: AI 에이전트에게 의도된 작업에 필요한 최소한의 자율성, 도구 접근, 자격 범위만 부여하라."[T1-13]

TimSquad의 Capability Token이 이 원칙과 **직접 대응**.

#### 5.7.2 Skill-Level Risks

**Snyk ToxicSkills 연구[T2-3]** (2026-02) — 개별 스킬 수준의 보안 리스크:

- 3,984개 에이전트 스킬 중 **13.4%가 최소 1개 critical 보안 이슈**
- **36%에 prompt injection** 기법 포함
- "에이전트 스킬 생태계는 초기 npm/PyPI와 동일한 상태"
- 스킬은 에이전트의 전체 권한으로 실행 — 전통적 SAST로 감지 불가

TimSquad 대응: ASI04(Supply Chain) 관련. 사용자 설치 스킬에 대한 보안 스캔이 필요하다 (timsquad-mcp 시점에 구현).

---

## 6. 핵심 진화 방향: Grill-First PRD Workspace

### 6.1 문제 정의

현재 `tsq init`은 빈 `prd.md`를 생성하고 사용자가 채우길 기대한다. 이것은:

- **에이전틱 SE의 최대 드리프트 원인**인 "초기 요구사항 모호성"을 방치
- Hook Gate가 코드 실행을 강제하면서 **가장 중요한 입력(요구사항)은 강제하지 않는** 비대칭
- Anthropic이 경고하는 "vague, high-level guidance"[T1-2] 그 자체

### 6.2 해결: PRD를 폴더형 workspace로 전환

Anthropic의 context engineering 관점에서, 한 덩어리 문서보다 **역할이 분리된 고신호 문서 묶음**이 더 유리하다[T1-2]. 장시간 에이전트에서는 필요한 정보만 점진적으로 제공하고, compaction과 handoff artifact를 통해 문맥을 유지하는 방식이 효과적이다[T1-3].

```
.timsquad/ssot/
  prd/
    index.md              <- 요약 허브 (~200 토큰)
    vision.md             <- 비전/목적
    users-and-personas.md <- 사용자 정의
    problem.md            <- 문제 정의
    scope.md              <- 범위/비범위
    success-metrics.md    <- 성공 기준 (측정 가능)
    constraints.md        <- 기술/시간/예산/규제 제약
    risks.md              <- 알려진 리스크
    open-questions.md     <- 아직 모르는 것
    decisions/
      DEC-001.md          <- 의사결정 기록
```

### 6.3 Grill 3모드 진입

| 모드 | 트리거 | 동작 |
|------|--------|------|
| **Cold Start** | PRD 없음 | 백지에서 5단계 소크라틱 인터뷰 |
| **Gap Fill** | PRD 불완전 (프롬프트/파일 입력) | 빈 섹션 식별 -> 해당 부분만 집중 질문 |
| **Validate Only** | PRD 기준 충족 | 구조 검증 + 모순 체크 -> 통과 시 decompose |

입력 채널 3개 (출력은 동일한 prd/ workspace):
- 프롬프트 텍스트 입력
- 파일 입력 (기획서, 슬랙 정리 등)
- 아무것도 없이 시작

모드 결정은 **결정론적** (frontmatter + 섹션 존재 여부를 코드로 체크):

```
prd/index.md 존재?
  -> NO: Cold Start
  -> YES: 5개 필수 섹션 채워졌나?
    -> 3개 이하: Gap Fill
    -> 4개 이상: Validate Only
```

### 6.4 Cold Start 질문 설계

핵심: "자기가 뭘 원하는지 모르는" 사용자를 위한 추출형 인터뷰.

```
단계 1: Problem Discovery
  "누가 불편한가?" -> "어떤 상황에서?" -> "지금은 어떻게 해결하나?"

단계 2: Success Definition
  "이게 잘 되면 뭐가 달라지나?" -> "어떻게 측정하나?"

단계 3: Scope Negotiation
  "반드시 있어야 하는 건?" -> "없어도 되는 건?" -> "나중에 해도 되는 건?"

단계 4: Constraint Surfacing
  "기술적 제약?" -> "시간/예산?" -> "팀 역량?" -> "규제?"

단계 5: Unknown Acknowledgment
  "아직 모르는 건?" -> "확인하려면 뭐가 필요한가?"
```

5단계 완료 후 grill이 답변 기반으로 prd/ 파일들을 **자동 생성**. 사용자는 PRD를 "쓰지" 않는다. 대화를 통해 PRD가 "만들어진다."

### 6.5 SSOT Gate — 개발 파이프라인 진입 차단

**문서가 준비 안 됐으면 코드를 못 쓴다:**

```
tsq init -> grill -> prd/ validate -> PASS?
  +-- NO -> grill 루프
  | YES
ssot scaffold -> ssot validate -> PASS?
  +-- NO -> grill 루프 (해당 도메인 추가 질문)
  | YES
decompose -> plan validate -> PASS?
  +-- NO -> planning 루프
  | YES
=============================
  개발 파이프라인 진입 허용
=============================
```

구현: `tsq next`가 태스크 반환 전 SSOT 준비 상태 체크. `blocked: true` 시 grill로 리다이렉트.

---

## 7. Core Loop: Research -> Plan -> Review Gate

### 7.1 패턴 정의

모든 레이어에 동일하게 적용되는 공통 루프:

```
+-----------------------------+
|  +----------+               |
|  | Research  | <- 자동      |
|  +----+-----+               |
|       v                     |
|  +----------+               |
|  |   Plan   | <- 구조화    |
|  +----+-----+               |
|       v                     |
|  +----------+    FAIL       |
|  |  Review  | --------------+
|  +----+-----+
|       | PASS
|       v
|    Proceed
+-----------------------------
```

### 7.2 레이어별 적용 — 목적이 다르다

같은 패턴이지만 **각 레이어의 목적은 구분**된다:

| 레이어 | 목적 | Research (자동) | Plan | Review Gate |
|--------|------|----------------|------|-------------|
| **PRD** | **Ambiguity Reduction** — 모호성 제거 | 프로젝트 루트 스캔, 스택 제약 조사 | grill -> prd/ 생성 | prd validate |
| **SSOT** | **Completeness Assurance** — 파생 문서 완성 | 메타인덱스 기반 기존 코드 분석 | derive docs (trd/erd/ia) | ssot validate |
| **Planning** | **Execution Feasibility** — 실행 가능성 검증 | 의존성 파악, 리스크 탐색 | decompose -> planning.md | plan validate |
| **Task** | **Local Correctness** — 개별 구현 정확성 | 관련 코드/스펙/테스트 읽기 | 구현 방안 수립 | 테스트 + 리뷰 |

### 7.3 이론적 근거

Anthropic의 3-에이전트 패턴[T1-3]:
- Planner (= Research + Plan)
- Generator (= 실행)
- Evaluator (= Review Gate)

> "작업을 수행하는 에이전트와 판단하는 에이전트를 분리하는 것이 강력한 레버다."[T1-3]

OpenAI의 eval-driven 접근[T1-5]:
- "eval이 먼저" = Review Gate를 먼저 정의
- trace grading = Review 시 과정 전체를 평가

EDDOps[T1-8]:
- "전통적 TDD는 안정적 명세를 가정하지만 LLM 에이전트는 비결정론적"
- "연속 평가가 필수" = Review Gate는 일회성이 아닌 반복

### 7.4 Review Gate 결과 유형

```
PASS   -> 다음 단계 진행
REVISE -> 같은 단계 재실행 (Plan 수정)
RESET  -> Research부터 다시 (새로운 정보 필요)
```

### 7.5 Auto Research 상세

PRD 레벨:
```
자동 수집:
1. 프로젝트 루트 스캔 (package.json -> 스택, .env.example -> 외부 서비스)
2. 스택 기반 제약 조사 (Supabase -> RLS 제한 등)
3. 사용자 입력 분석 (키워드 추출 -> 도메인 식별)

출력: .timsquad/ssot/research/
  context.md, constraints.md, questions.md
```

Planning 레벨:
```
자동 수집:
1. 메타인덱스 -> 재사용 가능 모듈/컴포넌트
2. PRD -> 기술적 복잡도 추정
3. 외부 API 의존성, 마이그레이션 필요 여부

출력: research/ 갱신
```

Task 레벨:
```
자동 수집:
1. Document Trace Graph 기반 관련 파일
2. 관련 테스트 확인
3. 이전 태스크 carry-over

출력: context-writer가 서브에이전트에 주입
```

---

## 8. Tri-Plane Execution Model

태스크 추출 이후의 **모든 실행 과정은 강제**된다. 이것은 단일 파이프라인이 아니라, 서로 다른 목적을 가진 **3개의 동시 제어면(Plane)**이 하나의 프로세스 안에서 돌아가는 구조다.

```
Execution Plane (Do)   — 가치를 생산한다 (value production)
Validation Plane (Verify) — 가치가 올바른지 판정한다 (correctness enforcement)
State Plane (Sync)     — 가치를 시스템 상태로 확정한다 (knowledge state commit)
```

> **TimSquad는 코드를 생성하는 시스템이 아니라, 작업(Do), 판정(Verify), 상태 확정(Sync)을 병렬로 수행해 drift 없이 장기 개발을 가능하게 만드는 하네스다.**

### 8.1 Tri-Plane 정의

| Plane | 역할 | 성격 |
|-------|------|------|
| **Execution (Do)** | 코드 작성, 테스트 코드 작성, 구현 | 가치 생산 |
| **Validation (Verify)** | 테스트 실행, acceptance criteria 대조, workflow correctness 확인 | 정합성 판정 |
| **State (Sync)** | Meta-Index 갱신, 로그 작성, SSOT 갱신, Document Trace 갱신, Report 제출 | 상태 확정 (commit) |

**3개는 대체 관계가 아니라 동시 필수 조건이다.** 하나라도 완료되지 않으면 해당 레벨이 완료되지 않는다.

### 8.2 Hook Gate와 Validation Plane의 역할 분리

TimSquad에는 이미 Hook Gate(13개)가 실시간 guardrails로 동작한다. Validation Plane과 중복되지 않도록 역할을 명확히 분리한다.

OpenAI는 guardrails와 evals를 명확히 구분한다: "Guardrails는 런타임에 unsafe 행동을 차단하고, Evals는 품질을 측정하고 개선한다. 둘은 대안이 아니라 보완 관계다."[T1-5] Anthropic도 "프롬프트는 제안이지만, Hook은 exit code 2로 차단한다. 협상 없음"이라고 설명한다[T1-3].

```
Hook Gate (Guardrails) — 실시간, PreToolUse (<100ms)
  "하면 안 되는 것을 막는다" (preventive)
  ├── 변경 범위 초과 → change-scope-guard.sh
  ├── capability 위반 → check-capability.sh
  ├── 파괴적 명령 → safe-guard.sh
  ├── phase 위반 → phase-guard.sh
  └── TDD 순서 위반 → tdd-guard.sh

Validation Plane (Evals) — 태스크/시퀀스/페이즈 완료 시
  "해야 하는 것이 됐는지 확인한다" (detective)
  ├── 테스트 통과 → build-gate, completion-guard
  ├── acceptance criteria 충족 → prd/domains/*/acceptance.md 대조
  ├── workflow correctness → 올바른 파일을 올바른 이유로 수정했는가
  └── 문서-구현 커버리지 → Document Trace Graph 대조
```

Hook Gate는 **빠르고 결정론적**이다. Validation Plane은 **깊고 포괄적**이다. 역할이 겹치지 않는다.

### 8.3 State Plane — Knowledge State Commit Layer

**State Plane은 "로그 기록"이 아니라 "상태 전이 게이트"다.** Sync가 완료되지 않으면 다음 단계로 넘어갈 수 없다. 이것은 분산 시스템의 2-Phase Commit과 동일한 원리다.

State Plane이 수행하는 것:
- Meta-Index 갱신 (구조 + 의도 + 연결)
- Task/Sequence/Phase 로그 작성
- Completion Report / Sequence Report / Phase Report 생성
- SSOT 정합성 갱신
- Document Trace Graph 갱신
- 다음 Phase 문서 준비

이것은 **knowledge-state mutation**이다. "나중에 정리하는 문서화"가 아니라, 하네스의 상태를 다음 단계로 넘길 수 있게 만드는 **커밋 계층**이다.

### 8.4 3-Level 강제 구조

```
Phase (L3)
+-- Phase 시작: SSOT Gate + Document Trace Graph 검증
+-- Sequence (L2)
|   +-- Sequence 시작: Meta-Index 최신화 (강제)
|   +-- Task (L1)
|   |   +-- Step 0: Meta-Index 경유 Research (인덱스 통해 파일 접근)
|   |   +-- Step 1: Plan
|   |   +-- Step 2: Implement (테스트 코드 먼저 작성)
|   |   +-- Step 3: 테스트 실행 + Review Gate
|   |   |     FAIL -> Step 1 루프
|   |   +-- Step 4: Meta-Index 갱신 (추가/수정/삭제 파일 반영)
|   |   +-- Step 5: Completion Report + L1 Task Log
|   +-- Task (L1) ...반복
|   +-- Sequence 검증: 유닛테스트 + 통합테스트 전체 통과
|   |     FAIL -> 해당 Task 루프
|   +-- Sequence 완료: L2 Sequence Log (L1 집계) + Sequence Report
|   +-- Meta-Index 정합성 최종 확인
+-- Sequence (L2) ...반복
+-- Phase 검증: 통합테스트 + E2E + 시나리오 테스트
|     FAIL -> 해당 Sequence 루프
+-- Phase 완료: L3 Phase Log (L2 집계)
+-- Phase Gate: 산출물 검증 + SSOT 정합성 + Document Trace 갱신 + Phase Report
+-- 다음 Phase 전이
```

### 8.5 각 레벨별 Tri-Plane 적용

| 레벨 | Execution (Do) | Validation (Verify) | State (Sync) |
|------|----------------|--------------------|--------------|
| **Task (L1)** | 테스트 코드 작성 -> 구현 코딩 | 테스트 통과 + acceptance criteria | Meta-Index 갱신, Task Log, Completion Report |
| **Sequence (L2)** | Task 묶음 실행 | 유닛 + 통합테스트 전체 + 계약 일관성 | Sequence Log (L1 집계), Sequence Review + Report |
| **Phase (L3)** | Sequence 묶음 실행 | 통합 + E2E + 시나리오 + 문서-구현 커버리지 + Harness QA | Phase Log (L2 집계), SSOT 갱신, Document Trace 갱신, Phase Report |

### 8.5.1 Validation Plane 상세: 6층 검증 체계

하네스는 단위 테스트만으로 신뢰할 수 있는 시스템이 아니다. OpenAI는 "생성형 시스템은 비결정론적이므로 전통적 테스트만으로는 부족하고 evals가 필요하다"고 설명한다[T1-5]. Validation Plane은 6개 검증 계층으로 구성된다:

**Layer 1: Deterministic Core Test** — 하네스 엔진 테스트
- planning.md → DAG 파싱이 항상 동일
- workflow.json 상태 전이가 불법 전이를 허용하지 않음
- tsq next가 같은 상태에서 같은 태스크를 반환
- capability token 범위 밖 작업 차단
- meta-index 갱신이 누락/중복 없이 동작
- *적용*: Task/Sequence/Phase 모든 레벨 (현재 782개 테스트가 여기에 해당)

**Layer 2: Schema / Contract Test** — 문서/상태/실행 접점 검증
- prd/ workspace frontmatter 스키마
- workflow.json, task-context.json 구조
- Completion Report, Sequence Report 구조
- requirements-graph/ 생성 결과 스키마
- *적용*: 주로 Sequence 레벨 (task 간 계약 일관성)

**Layer 3: Prompt / Skill Regression Test** — 스킬 일관성 검증
- OpenAI는 "skill도 테스트 가능한 artifact로 다뤄야 한다"고 설명한다[T1-7]
- 각 스킬별: should trigger / should not trigger / must produce / must not produce
- 예: /tsq-grill은 PRD 비어 있으면 Cold Start, 거의 완성이면 Validate Only
- 현재 prompt-quality.test.ts는 구조적 품질만 검증 — **행동 회귀 테스트 추가 필요**
- **주의**: 비결정론적 LLM 출력이므로 vitest가 아닌 eval 방식(dataset + grader + threshold)으로 구현
- *적용*: Sequence 레벨

**Layer 4: Trace-based Eval** — 실행/문서 추적 평가
- **A. Execution Trace Eval**: 왜 이 태스크를 선택했는가, 왜 이 파일을 수정했는가, 왜 REVISE/RESET이 났는가
- **B. Document Trace Eval**: PRD→Sub-PRD 추적 가능 여부, 문서→Task→Test 커버리지, stale 문서 영향 분석
- OpenAI: "trace eval은 에이전트가 왜 성공/실패했는지 이해할 수 있는 더 많은 데이터를 제공"[T1-6]
- *적용*: Phase 레벨

**Layer 5: Long-running Harness QA** — 장시간 실행 안정성
- 세션 중단 후 resume 성공 여부
- compact 후 context recovery 정확도
- handoff 문서만으로 다음 세션이 이어갈 수 있는지
- stuck loop / no-progress 탐지
- daemon 재시작 후 상태 복원
- wave 실행 중 일부 실패 시 나머지 상태 보존
- Anthropic: "initializer + coding agent + clear artifacts for next session"[T1-3]
- *적용*: Phase 레벨

**Layer 6: Security / Red-Team Audit** — 에이전트 행동 오염 테스트
- PRD/문서에 숨겨진 prompt injection
- capability token 우회 시도
- stale SSOT를 최신 사실처럼 사용하게 만드는 유도
- inter-agent communication 오염
- daemon/queue 실패의 연쇄 실패 여부
- OWASP Agentic Top 10[T1-13] 전체 시나리오
- *적용*: Phase 레벨 (릴리스 전)

### 8.6 Completion Rule — 3중 승인

**Task/Sequence/Phase는 코딩이 끝났다고 완료가 아니다.**

```
Done = Do complete + Verify pass + Sync committed
```

셋 다 만족해야 해당 레벨이 Done 상태로 전이한다. 이것이 "코드는 끝났는데 문서가 안 맞음", "문서는 맞는데 테스트 실패" 같은 반쯤 완료된 상태를 방지한다.

### 8.7 상태 머신

각 레벨은 동일한 상태 머신을 따른다:

```
Task:
  DOING
    -> VERIFYING
      +-- FAIL -> DOING (재구현)
      +-- PASS -> SYNCING
                    +-- FAIL -> PROVISIONAL (Do+Verify 완료, Sync 미완료)
                    |            +-- SYNC-RETRY -> SYNCING
                    +-- PASS -> DONE

Sequence:
  EXECUTING_TASKS
    -> SEQUENCE_VERIFY
      +-- FAIL -> TASK_LOOP (해당 Task 재진입)
      +-- PASS -> SEQUENCE_SYNC
                    +-- FAIL -> SYNC-RETRY
                    +-- PASS -> DONE

Phase:
  EXECUTING_SEQUENCES
    -> PHASE_VERIFY
      +-- FAIL -> SEQUENCE_LOOP (해당 Sequence 재진입)
      +-- PASS -> PHASE_SYNC
                    +-- FAIL -> SYNC-RETRY
                    +-- PASS -> NEXT_PHASE_READY
```

### 8.8 PROVISIONAL 상태와 Sync 복구

코드는 됐고 테스트도 통과했는데 **Sync가 실패**한 경우(예: Meta-Index 갱신 파일 I/O 오류), 처음부터 다시 하지 않는다.

```
PROVISIONAL 상태:
  - Do: complete (유지)
  - Verify: pass (유지)
  - Sync: pending (재시도)
```

**규칙:**
- PROVISIONAL 상태에서 Sync-Retry 허용
- 다음 Task 시작 전까지 해소되어야 함 (최대 허용 시간)
- 해소 실패 시 Sequence 레벨에서 escalation

이것은 분산 시스템의 compensating transaction 패턴과 유사하다. Sync 실패 때문에 완료된 작업을 롤백하지 않되, 다음 단계로 stale 상태를 넘기지도 않는다.

### 8.9 Fail 되돌림 범위 (Rollback Scope)

| 레벨 | Do 실패 | Verify 실패 | Sync 실패 |
|------|---------|------------|-----------|
| **Task** | 같은 Task 재시도 | 같은 Task의 Do로 복귀 | PROVISIONAL -> Sync-Retry |
| **Sequence** | 해당 Task로 하향 | 해당 Task로 하향 | Sequence 완료 차단 -> Sync 복구 후 진행 |
| **Phase** | 해당 Sequence 재진입 | 해당 Sequence 재진입 | 다음 Phase 진입 차단 |

### 8.10 Meta-Index as Gateway

에이전트는 파일에 직접 탐색(Glob/Read 난사)하지 않고 **Meta-Index를 먼저 조회**해서 관련 파일을 식별한 후 접근한다.

```
현재:  Agent -> "파일 뭐 있지?" -> Glob/Read 난사 -> 토큰 낭비 + context rot
변경:  Agent -> Meta-Index 조회 -> 관련 파일 목록 -> 필요한 것만 Read
```

이것이 Anthropic이 말하는 "가장 작은 고신호 토큰 집합"[T1-2]의 실현이다. Meta-Index가 **토큰 필터** 역할을 한다.

현재 Meta-Index는 AST 기반 구조(파일, 클래스, 메서드)만 있다. v4.0에서 **semantic layer**를 추가한다:

| 레이어 | 생성 방식 | 내용 |
|--------|----------|------|
| 구조 (Structure) | 자동 — AST 파싱 | 파일, 클래스, 메서드, 인터페이스 (현재) |
| 의도 (Purpose) | 반자동 — 첫 생성 시 LLM, 이후 변경 시 갱신 | 파일/모듈 수준 한 줄 설명 |
| 연결 (Linkage) | 자동 — Document Trace Graph | 이 파일이 어떤 요구사항을 구현하는지 |

### 8.11 현재 구현과의 갭

| 구현 | 현재 | v4.0 추가 |
|------|------|----------|
| L1/L2/L3 Log | 있음 (`tsq log`) | 그대로 유지 |
| Phase Gate | 있음 (`completion-guard.sh`) | E2E/시나리오 검증 강화 |
| TDD Guard | 있음 (`tdd-guard.sh`) | 그대로 유지 |
| Build Gate | 있음 (`build-gate.sh`) | 그대로 유지 |
| Hook Gate vs Verify 분리 | 암묵적 | **역할 명시적 분리** (preventive vs detective) |
| Acceptance criteria 검증 | 없음 | **prd/domains/*/acceptance.md 대조** |
| Workflow correctness | 없음 | **"올바른 파일을 올바른 이유로 수정했는가" 검증** |
| Meta-Index 자동 갱신 | 있음 (데몬 비동기) | **시퀀스 진입 시 동기 갱신** + **태스크 완료 조건에 추가** |
| Meta-Index 경유 접근 | 없음 (자유 탐색) | **Protocol에서 강제** |
| Meta-Index semantic layer | 없음 (구조만) | **purpose + linkage 추가** |
| 상태 머신 (DOING→DONE) | 암묵적 | **PROVISIONAL 상태 + Sync-Retry 명시** |
| 3중 승인 완료 조건 | 암묵적 | **Do + Verify + Sync committed 강제** |
| Sequence 레벨 검증 | 암묵적 | **유닛+통합 테스트 통과 강제** |
| Phase 레벨 시나리오 테스트 | 암묵적 | **E2E+시나리오 통과 강제** |

---

## 9. Session Lifecycle: Initialize -> Work -> Handoff

Anthropic의 장기 실행 하네스 글[T1-3][T1-4]에서, initializer / worker / handoff는 주변 기능이 아니라 **성능과 안정성의 핵심 패턴**이다. TimSquad는 daemon, session-state, session-notes가 이미 있으므로 이를 공식화한다.

### 9.1 3-Phase 세션 모델

```
Phase 1: Initialize
  - 프로젝트 상태 로드 (workflow.json, phase-memory)
  - 메타인덱스 로드 (daemon 캐시 또는 cold start)
  - SSOT Gate 검증 (문서 준비 상태 체크)
  - 이전 세션 carry-over 읽기
  - "에이전트가 fresh context에서 빠르게 상태를 파악하는 것"[T1-3]

Phase 2: Work
  - Core Loop 반복 (Research -> Plan -> Review)
  - tsq next -> 태스크 할당 -> 서브에이전트 위임
  - session-notes 기록 (데몬)
  - 컨텍스트 압축(compaction) 시 progress file 갱신

Phase 3: Handoff
  - phase-memory 갱신 (carry-over 정보)
  - session metrics 저장
  - worklog 생성
  - 다음 세션을 위한 "what was completed, in progress, or blocked"[T1-3] 기록
```

### 9.2 현재 구현과의 매핑

| 세션 단계 | 현재 구현 | 공식화 필요 사항 |
|----------|----------|----------------|
| Initialize | daemon start + session-state 로드 | SSOT Gate 통합, carry-over 표준화 |
| Work | controller + tsq next 루프 | Core Loop 패턴 명시, Research 단계 추가 |
| Handoff | shutdown.ts + worklog | phase-memory 표준 포맷, 다음 세션 프리로드 정보 |

### 9.3 Anthropic의 핵심 인사이트

> "핵심 발견은 에이전트가 fresh context window로 시작할 때 작업 상태를 빠르게 이해하는 방법을 찾는 것이었다. 이것은 git history와 함께 progress file(claude-progress.txt)로 달성한다."[T1-3]

TimSquad의 phase-memory.md가 이 역할을 하지만, 현재는 비정형 텍스트. **구조화된 handoff artifact**로 공식화해야 한다.

---

## 10. Document Trace Graph — 문서 관계 모델

> **용어 구분**: "Document Trace Graph"는 요구사항-설계-문서 간 관계 추적이다. "Execution Trace"(섹션 10)는 에이전트 실행 과정의 동적 평가다. 이 둘은 전혀 다른 것이며 명시적으로 분리한다.

### 10.1 SSOT 폴더 통일 원칙

**모든 SSOT 문서 타입은 동일한 폴더형 구조(index.md + 역할별 세부 파일)를 따른다.** 폴더 구조는 통일하되 깊이는 프로젝트 복잡도에 따라 유연하게 결정한다.

- 필수: `index.md` (항상 — 요약 허브, ~200 토큰)
- 선택: 나머지 세부 파일 (파생 규칙 + grill이 결정)
- Sub-PRD는 `prd/domains/` 하위에 위치 (별도 최상위 폴더가 아님)

### 10.2 파생 문서 구조

```
.timsquad/ssot/
  prd/                    <- Root PRD workspace
    index.md
    problem.md
    scope.md
    ...
    domains/              <- Sub-PRDs (도메인별 하위 요구사항)
      payments/
        index.md
        requirements.md
        acceptance.md
        constraints.md
      auth/
        index.md
        requirements.md

  trd/                    <- Technical Requirements (폴더형)
    index.md
    system-boundaries.md
    external-integrations.md
    ...

  erd/                    <- Entity Relationship (폴더형)
    index.md
    entities.md
    relationships.md
    ...

  ia/                     <- Information Architecture (폴더형)
    index.md
    navigation.md
    page-structure.md
    ...

  research/               <- Auto Research 결과
  requirements-graph/     <- 자동 생성 문서 관계 그래프
    requirements-map.yaml
    document-graph.yaml
    task-coverage.yaml
```

### 10.3 컴파일 파이프라인 호환성

현재 `compiler.ts`는 이미 폴더 기반 sub-document 컴파일을 지원한다 (`src/lib/compiler.ts:368-457`). SSOT 하위 폴더 내 `.md` 파일을 자동으로 `{parent}-{name}.spec.md`로 컴파일하며, `prd/` 폴더는 기획 문서이므로 명시적으로 skip한다. **trd/, erd/, ia/ 폴더를 만들면 기존 컴파일 파이프라인에 자동으로 편입된다.**

v4.0에서 추가 조정이 필요한 부분:
- `compile-rules.ts`의 source 매핑을 단일 파일명 기반에서 폴더 기반으로 확장
- 데몬의 auto-compile 트리거가 폴더 내 개별 파일 변경을 감지하도록 `file-watcher.ts` 패턴 조정
- `prd/domains/` 내 acceptance.md 등은 컴파일 대상으로 포함 여부 결정 필요

### 10.4 Frontmatter 관계 스키마

모든 SSOT 문서의 필수 frontmatter:

```yaml
id: TRD-003
derived_from:
  - PRD-CORE-007
  - PRD-FEATURE-012
supports:
  - NFR-PERF-002
  - NFR-SEC-001
related_to:
  - ERD-002
  - IA-004
status: draft | active | stale | archived
owner: tsq-architect | tsq-developer | ...
last_validated_at: 2026-03-25
```

### 10.5 파생 규칙 — 3분리 원칙

파생 문서 생성은 3단계로 분리한다:

| 단계 | 주체 | 역할 |
|------|------|------|
| **1. 생성 여부 결정** | 규칙 엔진 (결정론적) | PRD 키워드/스택 기반으로 TRD/ERD/IA 필요 여부 판단 |
| **2. 문서 초안 작성** | LLM (grill/derive) | 결정된 문서의 내용을 PRD 기반으로 초안 생성 |
| **3. 관계 검증** | validator (결정론적) | frontmatter 무결성, orphan 링크, 순환 참조 검사 |

**생성 조건 (규칙 엔진이 결정):**

```
TRD 생성 조건:
  - external_systems[] 항목 >= 1, 또는
  - constraints에 "성능/보안/SLA" 키워드

ERD 생성 조건:
  - scope에 "저장/상태/엔티티/관계" 키워드, 또는
  - DB 스택 존재 (prisma, postgresql 등)

IA 생성 조건:
  - scope에 "화면/페이지/내비게이션" 키워드 >= 3, 또는
  - UI 스택 존재 (react, nextjs, flutter 등)

Sub-PRD 생성 조건:
  - /tsq-decompose가 도메인 2개 이상 식별
```

이 3분리는 TimSquad의 "가장 신뢰할 수 있는" 포지셔닝에 핵심이다. **LLM이 문서 필요 여부를 판단하지 않는다. 규칙이 결정하고, LLM은 내용만 채우고, validator가 검증한다.**

### 10.6 requirements-graph/ 자동 생성

requirements-graph/ 폴더는 **generated artifact** (authored document가 아님):

```
frontmatter의 derived_from, related_to, supports
  -> tsq trace rebuild 가 파싱
  -> requirements-graph/*.yaml 자동 생성
  -> tsq prd validate 가 검증 (orphan 문서, 끊어진 링크)
```

최소 관리 대상 3개 추적:
- PRD -> Sub-PRD
- Sub-PRD -> TRD/ERD/IA
- 문서 -> 태스크 -> 테스트

IBM DOORS가 말하는 V-Model 전체 추적[T1-12]과 동일한 원리를, **markdown frontmatter + yaml**로 경량 구현.

### 10.7 이론적 근거

IBM DOORS[T1-12]:
> "요구사항 관리는 개별 문서보다 문서들 간 관계와 추적성을 유지하는 게 핵심"

Jama Software[T2-1]:
> "양방향 추적성 자동화가 리스크를 최소화한다"

---

## 11. Execution Trace — Eval 체계

> **용어 구분**: "Execution Trace"는 에이전트 실행 과정의 동적 평가다. "Document Trace Graph"(섹션 10)와는 별개다.

### 11.1 현재 상태

- `tsq audit`: 7영역 정적 점수 (존재 여부 체크)
- Completion Report: pass/fail 2단계
- 데몬 메트릭: toolUses, tokenInput 등 수치 수집

**문제**: 정적 체크만 존재. OpenAI가 말하는 워크플로우 수준 trace grading[T1-6] — 에이전트가 "왜 이 파일을 수정했는가"를 추적하는 동적 평가 — 가 빠져있다.

### 11.2 목표 구조

```
.timsquad/evals/
  definitions/
    prd-completeness.yaml    <- PRD 5개 필수 섹션 존재 + 충실도
    plan-coverage.yaml       <- planning -> PRD 커버리지
    task-success.yaml        <- 태스크 pass/fail 비율
    drift-detection.yaml     <- 문서 stale 비율
    token-efficiency.yaml    <- 토큰 사용량 비교
  execution-traces/
    session-{id}.json        <- 세션별 실행 트레이스
  results/
    session-{id}-eval.json   <- 세션별 eval 결과
  baselines/
    v3.8.0.json              <- 버전별 베이스라인
```

### 11.3 Eval 유형

| 유형 | 평가 대상 | 방법 | 빈도 |
|------|----------|------|------|
| **구조적** | PRD 완성도, SSOT 커버리지, 스키마 무결성 | 결정론적 파싱 | 매 validate |
| **프로세스** | 태스크 성공률, 루프 횟수, gate bypass 여부 | 메트릭 집계 | 매 세션 |
| **품질** | 코드 품질, 테스트 커버리지, 스킬 회귀 | 자동화 도구 + eval | 매 Phase |
| **효율** | 토큰 사용량, 시간, handoff 정보 재조사율 | 세션 비교 | 주간 |
| **드리프트** | 문서 vs 코드 불일치, plan vs task 불일치 | Document Trace Graph + diff | 매일 |

### 11.4 5종 상시 감사 (Continuous Audit)

테스트(Validation Plane)와 별개로, 하네스에는 **항상 돌아가는 감사 계층**이 필요하다. 이것은 사후 리포트가 아니라 실행 통제 루프에 연결된다.

**테스트는 Verify 중심, 감사는 Sync + Process 중심, eval은 Do/Verify/Sync 전체 관통.**

| 감사 유형 | 대상 | 체크 항목 |
|----------|------|---------|
| **A. Structural Audit** | 문서/상태 준비 상태 | PRD workspace 완성도, 필수 섹션 누락, frontmatter 관계 무결성, orphan 문서, stale 비율, planning↔workflow 불일치 |
| **B. Process Audit** | 프로세스 준수 여부 | grill 없이 decompose 진입, review gate 건너뛰기, verify fail 후 phase 넘어감, sync commit 없이 complete 처리 |
| **C. Execution Audit** | 실행 품질 | task success rate, sequence rollback rate, phase pass rate, token per task, 평균 grill 재진입 횟수, 평균 RESET 사유 |
| **D. Security Audit** | OWASP 리스크 | privilege misuse 시도 수, blocked command 수, capability violation 수, stale-context 위험 수, cascading failure 징후 |
| **E. Drift Audit** | 정합성 | 문서-코드 불일치율, plan-task 불일치율, handoff 후 동일 내용 재조사율, PRD success criteria의 테스트 반영률 |

감사 결과는 KPI(섹션 15)로 집계되어 로드맵 우선순위에 직접 반영된다.

### 11.5 이론적 근거

OpenAI Trace Grading[T1-6]:
> "Trace eval은 블랙박스 평가와 달리 에이전트가 왜 성공/실패했는지 이해할 수 있는 더 많은 데이터를 제공한다"

OpenAI Evaluation Best Practices[T1-5]:
> "eval을 structured tests로 정의하라. 반복 가능한 측정이 핵심이다."

OpenAI Testing Agent Skills[T1-7]:
> "skill도 테스트 가능한 artifact로 다뤄야 한다. trigger 조건, 산출물, 종료 기준을 체계적으로 평가하라."

EDDOps[T1-8]:
> "eval harness를 먼저 만들어라. 코드보다 먼저."
> "결정론적 평가를 우선하라. LLM-as-Judge는 측정하려는 바로 그 불확실성을 도입한다."

---

## 12. 스킬 주도 파이프라인 강화

### 12.1 현재 강제 구조 (확인 완료)

```
Protocol (모든 에이전트 skills[0])
  -> 작업 원칙 + Completion Report 양식 + SSOT 참조 강제

Controller (BASE_SKILLS, 무조건 배포)
  -> 태스크 위임 + Context DI + tsq next CLI 호출

에이전트별 역할 스킬
  -> frontmatter skills[] 배열로 하드코딩
  -> injectSkillsIntoFrontmatter()로 스택 기반 자동 주입
```

### 12.2 확장 포인트

Core Loop와 Session Lifecycle을 기존 강제 구조에 자연스럽게 추가:

```
Protocol에 추가:
  - Research 단계 필수화 ("계획 전에 자동 리서치를 먼저 하라")
  - Review Gate 준수 ("Review 결과에 따라 PASS/REVISE/RESET")

Controller에 추가:
  - SSOT Gate 검증 (tsq next 호출 시 문서 준비 상태 체크)
  - Meta-Index 동기 갱신 (시퀀스 진입 전 최신화 강제)
  - Meta-Index 경유 파일 접근 (직접 탐색 금지, 인덱스 조회 우선)
  - Auto Research 트리거 (태스크 할당 전 관련 정보 수집)
  - 복합 파이프라인 강제 (Do + Verify + Sync 완료 조건 검증)
  - Session Handoff 프로토콜 (compaction 시 progress 기록)
  - blocked 시 grill 루프로 리다이렉트
```

새 레이어 불필요. **Protocol과 Controller 내용 업데이트**로 충분.

### 12.3 Progressive Disclosure 유지

문서가 폴더로 분리되면 토큰 비용 증가 위험:

```
Level 1: index.md만 로드 (~200 토큰)
Level 2: 해당 태스크의 관련 섹션만 로드 (~1K 토큰)
Level 3: 전체 prd/ + 관련 trd/erd/ (~5K 토큰)
```

Anthropic[T1-2]:
> "좋은 context engineering은 가장 작은 고신호 토큰 집합을 찾는 것. 가장 많은 토큰이 아니라 올바른 토큰."

---

## 13. 인프라 안정화

PRD workspace 전환과 **병렬로** 진행해야 하는 인프라 과제:

### 13.1 동시성 보호 (CRITICAL)

| 대상 | 현재 | 수정 |
|------|------|------|
| session-state.json | 락 없음 (race condition) | 파일 기반 advisory lock |
| workflow.json | 락 없음 | 동일 |
| pending.jsonl | 단순 appendFile | atomic write (tmp -> rename) |
| EventQueue | 재귀 호출 (stack overflow) | while 루프 전환 |

### 13.2 에러 핸들링 (HIGH)

16개 빈 catch 블록 -> 최소 로깅 + 메트릭 카운터:

```typescript
// Before
catch { /* ignore */ }

// After
catch (err) {
  this.log('operation-name', 'error', {
    error: (err as Error).message,
    stack: (err as Error).stack
  });
}
```

### 13.3 Daemon 경량화

- JSONL Watcher 제거 (200줄, 레거시)
- Hook IPC 모드만 유지
- 헬스체크 추가 (IPC ping-pong)

### 13.4 Observability

```
$ tsq daemon status
PID: 12345 | Uptime: 2h 15m | Memory: 45MB
Events: 234 processed | 0 failed | 0 queued
Errors: 2 (meta-cache write x1, git diff x1)
Meta Index: 156 files | 1,247 methods | Last update: 3m ago
Drift: 1 warning (api-spec.md stale 8d)
```

---

## 14. 보안 체계 강화

### 14.1 Application-Level: OWASP Agentic Top 10 대응

현재 대응률: **6/10** (ASI01, ASI02, ASI03, ASI05, ASI06, ASI08)

미대응 항목:
- ASI04 (Supply Chain): 스킬 보안 스캔 미구현
- ASI07 (Insecure Inter-Agent Communication): IPC 인증 없음
- ASI09 (Sensitive Data Disclosure): 제한적
- ASI10 (Cascading Failures): 데몬 헬스체크 없음

### 14.2 Skill-Level: Hook 보안 강화

| 항목 | 현재 | 필요 |
|------|------|------|
| safe-guard.sh 정규식 | `rm -rf.` 탈출 가능 | 정규식 재검토 + 네거티브 테스트 |
| check-capability.sh | `..` 감지만 | symlink 우회 방지 (realpath) |
| /tmp 상태 파일 | change-scope-guard | .timsquad/runtime/으로 이동 |
| Capability Token 파일 | 권한 미설정 | chmod 600 |

### 14.3 Red-Team 시나리오

보안 감사는 "취약점 스캔"만이 아니라 **에이전트 행동 오염 테스트**여야 한다:

| 시나리오 | 공격 벡터 | 검증 방법 |
|---------|----------|----------|
| PRD에 숨겨진 prompt injection | 문서 내 악성 지시 삽입 | grill/decompose가 무시하는지 확인 |
| stale SSOT를 최신처럼 유도 | 오래된 문서를 참조하게 만드는 입력 | stale-guard + SSOT Gate가 차단하는지 |
| capability token 우회 시도 | symlink, path traversal | check-capability.sh 네거티브 테스트 |
| scope hijack | 태스크 범위 밖 파일 수정 유도 | change-scope-guard + capability token |
| inter-agent message 오염 | IPC 메시지 변조 | 현재 미대응 — v4.0 대응 필요 |
| daemon 연쇄 실패 | event-queue 과부하, socket 충돌 | daemon health + cascading failure 탐지 |

### 14.4 Skill Supply Chain 보안

Snyk ToxicSkills 연구[T2-3]에서 도출된 과제:
- 사용자 설치 스킬에 대한 **8카테고리 위협 스캔** (timsquad-mcp 시점)
- prompt injection 감지 (전통적 SAST로는 불가)
- toxic flow 감지 (private data access + untrusted instruction + external communication)

---

## 15. 성공 지표 (KPI)

OpenAI는 eval을 "structured tests"로 정의하며, 반복 가능한 측정이 핵심이라고 한다[T1-5]. TimSquad의 차별화는 측정 가능한 개선으로 보여야 한다.

### 15.1 Requirements Quality

| 지표 | 정의 | 목표 |
|------|------|------|
| **PRD validate first-pass rate** | grill 1회차에 validate 통과하는 비율 | > 60% |
| **Grill re-entry rate** | SSOT Gate에서 grill로 돌아가는 비율 | < 30% |
| **SSOT derive acceptance rate** | 자동 파생 문서가 수정 없이 통과하는 비율 | > 70% |

### 15.2 Process Efficiency

| 지표 | 정의 | 목표 |
|------|------|------|
| **Next blockage rate** | stale/invalid 문서로 인한 태스크 차단 비율 | < 10% |
| **Token per completed task** | 태스크 1개 완료에 소모된 평균 토큰 | 기준선 대비 -20% |
| **Drift-induced rework incidents** | 문서 드리프트로 인한 재작업 건수 | 세션당 < 1 |

### 15.3 Session Quality

| 지표 | 정의 | 목표 |
|------|------|------|
| **Session handoff recovery rate** | 새 세션이 이전 상태를 올바르게 복원하는 비율 | > 90% |
| **Task success rate (rolling 7d)** | 최근 7일 태스크 pass 비율 | > 85% |
| **Review Gate loop count** | 평균 REVISE/RESET 횟수 | < 2 per layer |

### 15.4 Audit Metrics

| 지표 | 정의 | 목표 |
|------|------|------|
| **Process audit: gate bypass count** | review gate/sync 건너뛴 건수 | 0 |
| **Process audit: sync 누락 count** | Sync committed 없이 Done 처리된 건수 | 0 |
| **Drift audit: doc-code mismatch rate** | 문서-코드 불일치 비율 | < 5% |
| **Drift audit: plan-task mismatch rate** | planning과 실제 태스크 불일치 비율 | < 5% |
| **Security audit: privilege violation count** | capability 위반 시도 수 | 모니터링 (기준선 확립 후 감소 목표) |
| **Security audit: blocked dangerous command** | safe-guard 차단 건수 | 모니터링 |
| **Skill regression: trigger accuracy** | 스킬 trigger/non-trigger 정확도 | > 90% (eval 기반) |

---

## 16. 구현 우선순위 및 로드맵

### Phase 1 (Week 1-4): 기초 전환 + 인프라 안정화

| # | 항목 | 근거 |
|---|------|------|
| 1a | **PRD grill-first workspace** + SSOT Gate | 드리프트 근본 원인 제거[T1-2][T2-2] |
| 1b | **동시성 보호** + 에러 핸들링 (병렬) | Wave 디스패치 안전성 확보 |

### Phase 2 (Week 5-8): 관계 모델 + Core Loop + Session

| # | 항목 | 근거 |
|---|------|------|
| 2a | **derive docs** + frontmatter 관계 (3분리 원칙) | 문서 그래프화[T1-12][T2-1] |
| 2b | **Research -> Plan -> Review** 루프 프로토콜 반영 | Anthropic 3-agent 패턴[T1-3] |
| 2c | **Session lifecycle** 공식화 (Initialize/Work/Handoff) | Anthropic harness pattern[T1-3][T1-4] |
| 2d | **JSONL Watcher 제거** + Daemon 경량화 | 유지보수 부담 감소 |

### Phase 3 (Week 9-12): Eval + Audit + Trace + 보안

| # | 항목 | 근거 |
|---|------|------|
| 3a | **Document Trace Graph** (requirements-graph/) | IBM traceability[T1-12] |
| 3b | **Execution Trace + 5종 감사** (.timsquad/evals/) | OpenAI EDD[T1-5][T1-6], EDDOps[T1-8] |
| 3c | **Skill Regression Test 프레임워크** (eval 방식) | OpenAI skill evals[T1-7] |
| 3d | **Hook 보안 강화** + Red-Team suite | OWASP Agentic Top 10[T1-13] |
| 3e | **KPI 수집 + Observability 대시보드** | 섹션 15 지표 |

**Phase 3 신규 CLI:**

```
tsq validate prd          — PRD workspace 완성도 + grill 재진입 필요 여부
tsq validate ssot         — TRD/ERD/IA/frontmatter 관계/trace graph 무결성
tsq eval run              — grill/decompose/next/audit의 trace eval 실행
tsq eval diff             — 버전/프롬프트/스킬 변경 전후 회귀 비교
tsq skill test <skill>    — 개별 skill trigger/output regression (eval 방식)
tsq audit process         — review gate bypass, sync 누락, stale execution 감지
tsq audit security        — OWASP Agentic Top 10 + Red-Team 시나리오
tsq audit drift           — 문서-코드-태스크 드리프트 분석
tsq handoff verify        — handoff artifact만으로 다음 세션 진행 가능 여부
tsq daemon health         — queue backlog, socket, 이벤트 실패율, cascading failure
```

### Phase 4 (Week 13+): MCP + 확장

| # | 항목 | 근거 |
|---|------|------|
| 4a | **timsquad-mcp** 스킬 보안 스캔 | Snyk ToxicSkills[T2-3] |
| 4b | **KPI 베이스라인 확립** (v4.0 vs v3.8.0 비교) | 측정 가능한 개선 증명 |
| 4c | **Long-running Harness QA suite** | Anthropic harness pattern[T1-3] |

---

## 17. Sources

### Tier 1 — 공식 문서, 학술 논문, 표준

#### Anthropic 공식
- [T1-1] [Building Effective AI Agents](https://resources.anthropic.com/building-effective-ai-agents) — Anthropic
- [T1-2] [Effective Context Engineering for AI Agents](https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents) — Anthropic Engineering
- [T1-3] [Effective Harnesses for Long-Running Agents](https://www.anthropic.com/engineering/effective-harnesses-for-long-running-agents) — Anthropic Engineering
- [T1-4] [Harness Design for Long-Running Application Development](https://www.anthropic.com/engineering/harness-design-long-running-apps) — Anthropic Engineering

#### OpenAI 공식
- [T1-5] [Working with Evals / Evaluation Best Practices](https://platform.openai.com/docs/guides/evals) — OpenAI API Docs
- [T1-6] [Agent Evals & Trace Grading](https://developers.openai.com/api/docs/guides/agent-evals) — OpenAI API Docs
- [T1-7] [Testing Agent Skills Systematically with Evals](https://developers.openai.com/blog/eval-skills) — OpenAI Developers Blog

#### 학술 논문
- [T1-8] [EDDOps: Evaluation-Driven Development and Operations of LLM Agents](https://arxiv.org/html/2411.13768v3) — arXiv, 2025
- [T1-9] [LLM-Based Multi-Agent Systems for SE: Literature Review, Vision, and the Road Ahead](https://dl.acm.org/doi/10.1145/3712003) — ACM TOSEM
- [T1-10] [ALMAS: Autonomous LLM-based Multi-Agent SE Framework](https://arxiv.org/abs/2510.03463) — arXiv, Oct 2025
- [T1-11] [Agentless: Demystifying LLM-based SE Agents](https://arxiv.org/abs/2407.01489) — FSE 2025

#### 요구사항 관리 / 보안 표준
- [T1-12] [IBM Engineering Requirements Management DOORS](https://www.ibm.com/products/requirements-management) — IBM
- [T1-13] [OWASP Top 10 for Agentic Applications 2026](https://genai.owasp.org/resource/owasp-top-10-for-agentic-applications-for-2026/) — OWASP

### Tier 2 — 산업 리포트, 벤더 연구

- [T2-1] [Four Best Practices for Requirements Traceability](https://www.jamasoftware.com/requirements-management-guide/requirements-traceability/four-best-practices-for-requirements-traceability/) — Jama Software
- [T2-2] [Information Architecture Strategy for Confluence](https://www.atlassian.com/blog/confluence/how-to-build-an-information-architecture-strategy-for-confluence) — Atlassian
- [T2-3] [ToxicSkills: Malicious AI Agent Skills Study](https://snyk.io/blog/toxicskills-malicious-ai-agent-skills-clawhub/) — Snyk, Feb 2026
- [T2-4] [LangChain State of Agent Engineering](https://www.langchain.com/state-of-agent-engineering) — LangChain, 2025

### Tier 3 — 블로그, 해설, 커뮤니티

- [T3-1] [Eval-Driven Development Manifesto](https://evaldriven.org/) — Feb 2026
- [T3-2] [2025 Was Agents. 2026 Is Agent Harnesses](https://aakashgupta.medium.com/2025-was-agents-2026-is-agent-harnesses-heres-why-that-changes-everything-073e9877655e) — Aakash Gupta, Medium
- [T3-3] [The Agent Harness Is the Architecture](https://medium.com/@epappas/the-agent-harness-is-the-architecture-and-your-model-is-not-the-bottleneck-5ae5fd067bb2) — Evangelos Pappas, Medium
- [T3-4] [4 Frameworks to Test Non-Deterministic AI Agents](https://datagrid.com/blog/4-frameworks-test-non-deterministic-ai-agents) — Datagrid, Dec 2025
- [T3-5] [AWS: Lessons from Building DevOps Agent](https://aws.amazon.com/blogs/devops/from-ai-agent-prototype-to-product-lessons-from-building-aws-devops-agent/) — AWS, Jan 2026

[English](PRD.en.md) | [**한국어**](PRD.md)

# TimSquad PRD v2.0
**AI Agent Development Process Framework**
(AI 에이전트 개발 프로세스 프레임워크)

Version: 2.0
Last Updated: 2026-02-15
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

### 1.5 이론적 기반
| 이론/논문 | 핵심 개념 | TimSquad 적용 |
|---------|---------|--------------|
| **Agentsway** (2025) | Prompting Agent, Retrospective Learning, LLM Consortium | 프롬프트 최적화 레이어, 회고적 학습, 핵심 결정 합의 |
| **ACM TOSEM** (2025) | Competency Mapping, Performance Evaluation | 역량 프레임워크, 성과 지표 |
| **Agentic SE** (2025) | AGENT.md, Meta-Prompt Files | 계층화된 메타-프롬프트 구조 |
| **FRAME** (2025) | Feedback-Driven Refinement | 레벨별 피드백 라우팅 |

### 1.6 기존 솔루션과의 차별점

| 구분 | CrewAI/LangGraph | Superpowers | Agentsway | **TimSquad** |
|-----|-----------------|-------------|-----------|--------------|
| 목적 | 범용 AI 에이전트 | 코딩 규율 | 학술적 방법론 | **전체 SDLC + 실용적 템플릿** |
| 문서 | 선택적 | 코드 중심 | 형식적 | **SSOT (진실의 원천)** |
| 학습 | 없음 | 없음 | LLM 파인튜닝 | **회고적 학습 (프롬프트/템플릿)** |
| 프롬프트 | 직접 작성 | 스킬 기반 | Prompting Agent | **Prompter + 계층화된 AGENT.md** |
| 피드백 | 단순 | 코드 리뷰 | 형식적 | **레벨별 라우팅** |
| 즉시 사용 | 학습 필요 | 설치 후 사용 | 구현 없음 | **프로젝트 타입별 템플릿** |

### 1.7 oh-my-opencode / oh-my-claudecode와의 차별점

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

### 1.8 토큰 효율성 설계

> **"LLM은 생각하는 일에만, 반복 작업은 프로그램에게"** — 오케스트레이션 토큰 100% 절약, 전체 40-60% 절약.

**상세:** [docs/token-efficiency.md](token-efficiency.md)

---

## 2. 핵심 개념

### 2.1 분수(Fountain) 모델

SSOT 문서는 순차적 의존성, 실제 작업은 병렬 실행. 피드백은 레벨에 따라 라우팅되며, 매 사이클 종료 시 회고적 학습으로 개선.

### 2.2 SSOT (Single Source of Truth) 문서 체계

15종의 문서로 구성. 프로젝트 레벨(1=MVP, 2=Standard, 3=Enterprise)과 타입에 따라 필수 문서가 자동 결정됨.

### 2.3 에이전트 구조

| 에이전트 | 역할 | 모델 |
|---------|------|------|
| Planner | PM/기획/설계 통합, 사용자와 직접 소통 | Opus |
| Developer | SSOT 기반 코드 구현, TDD | Sonnet |
| QA | 코드 리뷰, 테스트 검증, 피드백 분류 | Sonnet |
| DBA | DB 설계, 쿼리 최적화 | Sonnet |
| Designer | UI/UX 설계, 접근성 | Sonnet |
| Security | 보안 검증, OWASP | Sonnet |
| Architect | 아키텍처 설계, ADR | Sonnet |

**상세:** [docs/core-concepts.md](core-concepts.md)

---

## 3. 피드백 & 회고

### 3.1 피드백 라우팅

| Level | 이름 | 트리거 예시 | 라우팅 | 승인 |
|-------|------|-----------|-------|------|
| 1 | 구현 수정 | test_failure, lint_error, type_error | Developer | 불필요 |
| 2 | 설계 수정 | architecture_issue, api_mismatch, security | Planner (Architect) | 불필요 |
| 3 | 기획 수정 | requirement_ambiguity, scope_change | Planner (Planning) → User | **필수** |

### 3.2 회고적 학습

개발 사이클 완료 → 로그 수집 → 패턴 분석 → 개선 제안 → 사용자 승인 → 프롬프트/템플릿 업데이트. LLM 파인튜닝 대신 프롬프트/템플릿 개선으로 실용화.

**상세:** [docs/feedback-and-retrospective.md](feedback-and-retrospective.md)

---

## 4. 역량 & Consortium

- **역량 프레임워크**: ACM TOSEM 기반 에이전트 성능 측정 (기술/소프트 스킬 + 성과 메트릭)
- **LLM Consortium**: 핵심 결정에만 다중 모델 합의 적용 (fintech: 필수, 나머지: 선택)

---

## 5. 프로젝트 타입

### 5.1 지원 타입

| 타입 | 설명 | 추가 SSOT | 추가 에이전트 | Consensus 기본값 |
|-----|------|----------|-------------|-----------------|
| **web-service** | SaaS, 웹앱 | ui-ux-spec, screen-flow | designer, frontend, backend | 선택적 |
| **platform** | 프레임워크, SDK | api-design, integration-spec | api-designer, doc-writer | 선택적 |
| **api-backend** | API 서버, 마이크로서비스 | api-design | api-designer | 선택적 |
| **fintech** | 거래소, 결제 | security-spec, compliance | security, compliance, auditor | **필수** |
| **infra** | DevOps, 자동화 | infra-spec | devops, sre | 선택적 |

### 5.2 공통 에이전트

```
┌── planner      # PRD, 기획, 아키텍처
├── prompter     # 프롬프트 최적화
├── developer    # 구현
├── dba          # DB 설계
└── qa           # 테스트
```

---

## 6. 파일 구조

프로젝트 초기화(`tsq init`) 후 생성되는 구조:

```
/my-project
├── CLAUDE.md                   # PM 역할 정의
├── .claude/
│   ├── agents/                 # 에이전트 (tsq-*.md)
│   ├── skills/                 # 스킬 (SKILL.md)
│   └── settings.json
└── .timsquad/
    ├── config.yaml             # 설정 (name, type, level, domain, platform, stack)
    ├── ssot/                   # SSOT 문서
    ├── generators/             # XML 문서 생성기
    ├── state/                  # 워크플로우 상태
    ├── knowledge/              # tribal, lessons, constraints
    ├── feedback/               # 라우팅 규칙
    ├── retrospective/          # 회고 시스템
    └── logs/                   # 작업 로그
```

**상세:** [docs/file-structure.md](file-structure.md)

---

## 7. Prompter Agent

Agentsway의 Prompting Agent 개념 적용. Planner의 의도를 최적화된 프롬프트로 변환.

- 프롬프트 템플릿 관리 및 버전 관리
- 회고 결과 기반 프롬프트 개선
- 구조: Context → Task → Constraints → Output Format → Examples

---

## 8. 로그 자동화

프로그램 레이어에서 토큰 0으로 자동 처리. 상세: [docs/log-architecture.md](log-architecture.md)

| 타입 | 용도 | 회고 분석 대상 |
|-----|------|-------------|
| work | 작업 내용 | ✅ |
| error | 에러/이슈 | ✅ |
| decision | 결정 사항 | ✅ |
| status | 현재 상태 | - |
| feedback | 피드백 내용 | ✅ |

---

## 9. 핵심 가치 제안

**"혼자 해도 팀 프로세스를 거친 수준이 나온다"** — 에이전트 멀티 패스 검증(Architect + Developer + QA + Security + DBA)이 코드 리뷰와 설계 검토를 대신한다.

---

## 10. 기술 스택

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

## 11. 버전 히스토리

| 버전 | 핵심 변화 |
|------|----------|
| v3.1 | 프롬프트 아키텍처 최적화 (CLAUDE.md 슬리밍, XML 표준화, tsq-protocol 분리) |
| v3.2 | 고급 스킬 아키텍처 (rules/references/scripts 체계, Vercel 22개 룰) |
| v3.3 | 멀티 플랫폼 기반 (templates/ 리팩토링, L2/L3 피드백 자동 액션) |
| v3.4 | 독포딩 + JSONL 디커플링 + 실행 품질 강화 (세션 노트, 품질 가드 7종, 빌드 게이트) |
| v3.5 | npm v11 호환성 수정, 이슈 #2/#3/#4 핫픽스, 파이프라인 안정성 검증 |

---

## 12. 부록

### 12.1 참고 자료
- Anthropic Skills: https://github.com/anthropics/skills
- Agentsway 논문: https://arxiv.org/abs/2510.23664
- ACM TOSEM LLM-Based Multi-Agent Systems: https://dl.acm.org/doi/10.1145/3712003
- Agentic SE 논문: https://arxiv.org/abs/2509.06216
- Superpowers: https://github.com/obra/superpowers
- Andrej Karpathy Skills (CLAUDE.md behavioral guidelines): https://github.com/forrestchang/andrej-karpathy-skills

### 12.2 용어 정의
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

## 13. 관련 문서

| 문서 | 설명 |
|------|------|
| [core-concepts.md](core-concepts.md) | 분수 모델, SSOT, 에이전트/스킬 구조 상세 |
| [token-efficiency.md](token-efficiency.md) | 토큰 효율성 설계 |
| [feedback-and-retrospective.md](feedback-and-retrospective.md) | 피드백 라우팅 + 회고적 학습 시스템 |
| [file-structure.md](file-structure.md) | 템플릿 구조 + 초기화 후 구조 |
| [log-architecture.md](log-architecture.md) | 3계층 로그 체계 (L1→L2→L3) |
| [knowledge-architecture.md](knowledge-architecture.md) | Knowledge 시스템 설계 |
| [meta-index-architecture.md](meta-index-architecture.md) | Meta Index 설계 |
| [authoring-guide.md](authoring-guide.md) | 에이전트/스킬/Knowledge 작성 가이드 |

---

**Document End**

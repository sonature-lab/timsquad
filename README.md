# TimSquad

> **"AI 시대의 소프트웨어 개발 표준 프로세스"**

SSOT 기반 문서 체계, 최적화된 에이전트 롤, 회고적 학습을 통해 Claude Code에서 지속적으로 개선되는 고품질 소프트웨어 생성 프레임워크

```
최적화된 롤 정의 + 고도화된 스킬 + 회고적 학습 = 지속적으로 개선되는 고품질 결과물
```

---

## Why TimSquad?

| oh-my-* | **TimSquad** |
|---------|--------------|
| "Zero learning curve" | **"체계를 세우면 더 잘 된다"** |
| 알아서 해줌 | **개발자가 컨트롤** |
| 속도 최우선 | **품질 + 일관성 최우선** |
| Magic | **Structure** |

**For developers who want structure, not magic.**

### 타겟 사용자

- 체계적인 프로세스를 원하는 시니어 개발자
- 1인 CTO / 테크 리드 (혼자서 팀 수준의 품질 필요)
- 문서화와 일관성을 중시하는 개발자

### NOT for

- "알아서 해줘" 원하는 사람 → oh-my-claudecode 추천
- 코딩만 빠르게 하고 싶은 사람 → Claude Code 그냥 사용

---

## Features

### SSOT (Single Source of Truth)

모든 에이전트가 참조하는 단일 문서 체계

```
.timsquad/ssot/
├── prd.md              # 제품 요구사항 (Why)
├── requirements.md     # 요건 정의 (What)
├── service-spec.md     # API 명세 (프론트-백 계약서)
├── data-design.md      # ERD, 데이터 설계
└── ...
```

### 분수(Fountain) 모델

SSOT는 순차적 의존성, 실제 작업은 병렬 실행

```
SSOT (순차: PRD → 기획 → 설계)
         │
    ┌────┼────┐
    ↓    ↓    ↓
  화면  요건  API    ← 병렬 작업
    │    │    │
    └────┼────┘
         ↓
    ERD + 구현 (병렬)
         ↓
      QA/Test
         │
    ┌────┼────┐
    ↓    ↓    ↓
  L1   L2   L3      ← 피드백 라우팅
         ↓
   회고적 학습 → 템플릿/프롬프트 자동 개선
```

### 서브에이전트 시스템

```
.claude/agents/
├── tsq-planner.md      # 기획/설계 (Opus)
├── tsq-developer.md    # 코드 구현 (Sonnet)
├── tsq-qa.md           # 검증/리뷰 (Sonnet)
├── tsq-security.md     # 보안 검토
├── tsq-dba.md          # DB 설계
├── tsq-designer.md     # UI/UX 설계
├── tsq-prompter.md     # 프롬프트 최적화
└── tsq-retro.md        # 회고 분석
```

### 토큰 효율성

| 작업 | oh-my-* 방식 | TimSquad 방식 | 절약률 |
|-----|-------------|--------------|-------|
| 피드백 분류 | LLM 판단 | YAML 규칙 | **100%** |
| 로그 저장 | "저장해" 프롬프트 | bash 파이프 | **100%** |
| 에이전트 선택 | LLM 오케스트레이터 | 프로그램 스케줄러 | **100%** |
| **전체** | 100% | 40-60% | **40-60% 절약** |

### XML 문서 생성기

토큰 효율적인 SSOT 문서 작성

```xml
<generator name="prd" output=".timsquad/ssot/prd.md">
  <section id="basic" title="기본 정보">
    <field name="project_name" type="text" required="true">
      <prompt>프로젝트 이름?</prompt>
      <refinement>영문 소문자, 하이픈 허용</refinement>
    </field>
  </section>
  <output-template>...</output-template>
</generator>
```

---

## Installation

```bash
# 설치 스크립트 실행
curl -fsSL https://raw.githubusercontent.com/your-repo/timsquad/main/install/install.sh | bash

# 또는 직접 클론
git clone https://github.com/your-repo/timsquad.git
cd timsquad
./install/install.sh
```

---

## Quick Start

### 1. 프로젝트 초기화

```bash
# 새 프로젝트 생성
tsq init -n my-app -t web-service -l 2

# 옵션
#   -n, --name   프로젝트 이름
#   -t, --type   프로젝트 타입 (web-service, api-backend, platform, fintech, infra)
#   -l, --level  프로젝트 레벨 (1=MVP, 2=Standard, 3=Enterprise)
```

### 2. 생성된 구조

```
my-app/
├── CLAUDE.md                   # PM 역할 정의
├── .claude/
│   ├── agents/                 # 에이전트 정의
│   └── skills/                 # 스킬 파일
└── .timsquad/
    ├── config.yaml             # 프로젝트 설정
    ├── ssot/                   # SSOT 문서
    ├── generators/             # 문서 생성기 (XML)
    ├── state/                  # 현재 상태
    ├── knowledge/              # 프로젝트 지식
    ├── feedback/               # 피드백 시스템
    ├── retrospective/          # 회고 시스템
    └── logs/                   # 작업 로그
```

### 3. Claude Code에서 작업 시작

```bash
# Claude Code 실행
claude

# 에이전트 호출
@tsq-planner "PRD 작성 시작해줘"
@tsq-developer "로그인 API 구현해줘"
@tsq-qa "코드 리뷰해줘"
```

---

## CLI Commands

```bash
tsq init     # 프로젝트 초기화
tsq status   # 현재 상태 확인
tsq log      # 작업 로그 기록
tsq feedback # 피드백 라우팅
tsq retro    # 회고 실행
```

---

## Project Types

| 타입 | 설명 | 추가 문서 | Consensus |
|-----|------|----------|-----------|
| **web-service** | SaaS, 웹앱 | ui-ux-spec | 선택적 |
| **api-backend** | API 서버, 마이크로서비스 | - | 선택적 |
| **platform** | 프레임워크, SDK | integration-spec | 선택적 |
| **fintech** | 거래소, 결제 | security-spec | **필수** |
| **infra** | DevOps, 자동화 | deployment-spec | 선택적 |

---

## Project Levels

| Level | 설명 | 필수 문서 | 대상 |
|-------|-----|----------|-----|
| **1 (MVP)** | 최소 문서 | prd, requirements, service-spec, data-design | 사이드 프로젝트, PoC |
| **2 (Standard)** | 표준 문서 | L1 + glossary, error-codes, test-spec, ADR | 일반 프로젝트, 스타트업 |
| **3 (Enterprise)** | 전체 문서 | L2 + security-spec, deployment-spec | 엔터프라이즈, fintech |

---

## Feedback Routing

피드백 레벨에 따라 적절한 담당자에게 자동 라우팅

| Level | 유형 | 트리거 | 라우팅 |
|-------|-----|--------|--------|
| **1** | 구현 수정 | test_failure, lint_error, type_error | → Developer |
| **2** | 설계 수정 | api_mismatch, architecture_issue | → Planner (Architect) |
| **3** | 기획 수정 | requirement_ambiguity, scope_change | → Planner → **User 승인** |

---

## Retrospective Learning

개발 사이클 완료 후 자동 회고 및 개선

```bash
tsq retro
```

1. **로그 수집** - 에이전트별 작업 로그, 피드백 이력
2. **패턴 분석** - 반복 실패/성공 패턴, 병목 지점
3. **개선 제안** - 프롬프트/템플릿 개선안 생성
4. **사용자 승인** - 검토 후 적용
5. **적용** - Lessons Learned 추가, 템플릿 업데이트

---

## Theoretical Background

| 이론/논문 | 핵심 개념 | TimSquad 적용 |
|---------|---------|--------------|
| **Agentsway** (2025) | Prompting Agent, Retrospective Learning | 프롬프트 최적화, 회고적 학습 |
| **ACM TOSEM** (2025) | Competency Mapping | 역량 프레임워크, 성과 지표 |
| **Agentic SE** (2025) | AGENT.md, Meta-Prompt Files | 계층화된 메타-프롬프트 구조 |
| **FRAME** (2025) | Feedback-Driven Refinement | 레벨별 피드백 라우팅 |

---

## Configuration

`.timsquad/config.yaml`:

```yaml
project:
  name: "my-app"
  type: web-service
  level: 2

agents:
  planner:
    model: opus
  developer:
    model: sonnet
  qa:
    model: sonnet

methodology:
  development: tdd
  process: agile
  branching: github-flow
```

---

## Roadmap

- [x] **Phase 0 (MVP)** - common 템플릿, 기본 에이전트, CLI
- [ ] **Phase 1** - 타입별 템플릿 확장, 회고 시스템 고도화
- [ ] **Phase 2** - Plugin 배포, MCP 서버, 멀티 LLM 지원

---

## Contributing

기여를 환영합니다! 다음을 참고해주세요:

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## License

MIT License - see [LICENSE](LICENSE) for details.

---

## Related Projects

- [Anthropic Skills](https://github.com/anthropics/skills)
- [Superpowers](https://github.com/obra/superpowers)

---

**TimSquad v2.0** - AI Agent Development Process Framework

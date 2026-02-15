[**English**](token-efficiency.en.md) | [한국어](token-efficiency.md)

# Token Efficiency Design

> Extracted from PRD Section 1.7

## Design Philosophy
> **"Let LLMs focus on thinking; leave repetitive work to programs."**

## Architecture

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

## Token Savings Points

| Task | Typical LLM Orchestration | TimSquad Approach | Savings |
|------|---------------------------|-------------------|---------|
| Feedback classification | LLM judgment | YAML rules | **100%** |
| Log storage | "Save it" prompt | bash pipe | **100%** |
| Agent selection | LLM orchestrator | Program scheduler | **100%** |
| SSOT change detection | LLM diff | File system watch | **100%** |
| Retrospective metrics collection | LLM log parsing | Program JSON | **100%** |
| Overall orchestration | ~12,000 tokens | ~0 tokens | **100%** |

## Token Flow Comparison

**Typical LLM Orchestration:**
```
"로그인 기능 만들어"
    → Orchestrator 프롬프트 [~2,000 토큰]
    → Planner 호출 [~3,000 토큰]
    → Worker 호출 x N [~5,000 토큰 x N]
    → 결과 종합 [~2,000 토큰]

총: ~20,000+ 토큰
```

**TimSquad Approach:**
```
"로그인 기능 만들어"
    → [프로그램] SSOT 확인, 에이전트 선택 [0 토큰]
    → [프로그램] 프롬프트 템플릿 로드 [0 토큰]
    → Developer 호출 (최적화된 SKILL.md) [~8,000 토큰]
    → [프로그램] 로그 자동 저장 [0 토큰]

총: ~8,000 토큰 (60% 절약)
```

## Program Automation List

```yaml
automation:
  feedback_router:      # Feedback → appropriate agent
    type: program
    logic: yaml_rules
    tokens: 0

  log_automation:       # JSONL stream watch → event-driven processing
    type: daemon_process
    trigger: jsonl_stream_watch
    tokens: 0

  agent_scheduler:      # Dependency-based agent scheduling
    type: program
    logic: dependency_graph
    tokens: 0

  ssot_manager:         # Document version control, Lock
    type: program
    actions: [file_lock, version_control, change_detection]
    tokens: 0

  retrospective_metrics: # Retrospective data collection
    type: program
    actions: [log_parsing, json_aggregation]
    tokens: 0

  prompt_template:      # Prompt template loading
    type: file_system
    actions: [template_loading, variable_substitution]
    tokens: 0

  document_generator:   # SSOT document generator (NEW)
    type: xml_template
    actions: [question_prompting, input_refinement, document_generation]
    tokens: "Input refinement only (template structure costs 0 tokens)"
```

## Document Generators (XML Generators)

An XML-based template system for saving tokens when writing SSOT documents.

**Flow:**
```
메인 세션이 XML 템플릿 읽음 (구조 파악)
    ↓
섹션별로 사용자에게 질문 (<prompt> 태그 사용)
    ↓
사용자 입력을 정제 규칙에 따라 변환 (<refinement> 태그)
    ↓
output-template에 맞춰 최종 문서 생성
```

**Generator Types:**
| Generator | File | Output | Dependencies |
|-----------|------|--------|--------------|
| PRD | prd.xml | prd.md | - |
| Requirements | requirements.xml | requirements.md | prd.md |
| API Specification | service-spec.xml | service-spec.md | prd.md, requirements.md |
| Data Design | data-design.xml | data-design.md | prd.md, service-spec.md |

**XML Structure:**
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

**Token Efficiency:**
- The template structure is read by the LLM only once
- Tokens are spent only on refining user input
- Eliminates the cost of repeatedly generating document formats

## Expected Results

| Metric | Typical Approach | TimSquad | Improvement |
|--------|------------------|----------|-------------|
| Orchestration tokens | ~12,000/task | 0 | **100%** |
| Logging/documentation tokens | ~2,000/task | 0 | **100%** |
| Total tokens | 100% | 40-60% | **40-60% savings** |
| Quality consistency | Variable | High | **Improved** |

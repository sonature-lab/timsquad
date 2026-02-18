[English](token-efficiency.en.md) | [**한국어**](token-efficiency.md)

# Token Efficiency Design

> PRD Section 1.7에서 분리된 문서

## 설계 철학
> **"LLM은 생각하는 일에만, 반복 작업은 프로그램에게"**

## 아키텍처

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

## 토큰 절약 포인트

| 작업 | 일반적 LLM 오케스트레이션 | TimSquad 방식 | 절약률 |
|-----|-------------------------|--------------|-------|
| 피드백 분류 | LLM 판단 | YAML 규칙 | **100%** |
| 로그 저장 | "저장해" 프롬프트 | bash 파이프 | **100%** |
| 에이전트 선택 | LLM 오케스트레이터 | 프로그램 스케줄러 | **100%** |
| SSOT 변경 감지 | LLM diff | 파일 시스템 watch | **100%** |
| 회고 메트릭 수집 | LLM 로그 파싱 | 프로그램 JSON | **100%** |
| 오케스트레이션 전체 | ~12,000 토큰 | ~0 토큰 | **100%** |

## 토큰 흐름 비교

**일반적 LLM 오케스트레이션:**
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

## 프로그램 자동화 목록

```yaml
automation:
  feedback_router:      # 피드백 → 적절한 에이전트
    type: program
    logic: yaml_rules
    tokens: 0

  log_automation:       # IPC notify 또는 JSONL 감시 → 이벤트 기반 처리
    type: daemon_process
    trigger: ipc_notify | jsonl_stream_watch
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

## 문서 생성기 (XML Generators)

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

## 예상 효과

| 지표 | 일반적 방식 | TimSquad | 개선 |
|-----|-----------|----------|-----|
| 오케스트레이션 토큰 | ~12,000/작업 | 0 | **100%** |
| 로그/문서화 토큰 | ~2,000/작업 | 0 | **100%** |
| 전체 토큰 | 100% | 40-60% | **40-60% 절약** |
| 품질 일관성 | 변동 | 높음 | **향상** |

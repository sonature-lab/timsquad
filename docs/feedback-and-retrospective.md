# Feedback Routing & Retrospective Learning

> PRD Section 3, 4에서 분리된 문서

---

## 1. 피드백 라우팅 시스템

### 1.1 피드백 레벨 정의

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

### 1.2 피드백 라우팅 규칙

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

### 1.3 피드백 패턴 학습

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

## 2. 회고적 학습 시스템 (Retrospective Learning)

### 2.1 개요

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

### 2.2 회고 디렉토리 구조

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

### 2.3 회고 리포트 템플릿

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

### 2.4 자동화 스크립트

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

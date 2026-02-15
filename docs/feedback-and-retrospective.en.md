[**English**](feedback-and-retrospective.en.md) | [한국어](feedback-and-retrospective.md)

# Feedback Routing & Retrospective Learning

> Separated from PRD Sections 3 and 4

---

## 1. Feedback Routing System

### 1.1 Feedback Level Definitions

```
┌─────────────────────────────────────────────────────────────┐
│                    Feedback Occurred                         │
└───────────────────────────┬─────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                   Feedback Classifier                       │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Trigger Analysis                                     │   │
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
    │Impl. Fix │     │Design Fix│     │Plan. Fix │
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

### 1.2 Feedback Routing Rules

```yaml
feedback_routing:
  level_1:
    name: "Implementation Fix"
    triggers:
      - test_failure
      - lint_error
      - type_error
      - runtime_error
      - code_style_violation
    route_to: developer
    approval_required: false

  level_2:
    name: "Design Fix"
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
    name: "Planning/PRD Fix"
    triggers:
      - requirement_ambiguity
      - scope_change
      - business_logic_error
      - feature_request
      - stakeholder_feedback
    route_to: planner (planning mode)
    approval_required: true  # User approval mandatory
    ssot_update: true
```

### 1.3 Feedback Pattern Learning

```yaml
feedback_patterns:
  tracking:
    - feedback_type
    - root_cause
    - resolution
    - time_to_resolve
    - recurrence_count

  learning:
    # When the same pattern occurs 3+ times
    threshold: 3
    actions:
      - update_agent_skill
      - update_prompt_template
      - add_to_lessons_learned
```

---

## 2. Retrospective Learning System

### 2.1 Overview

Adapts the core concept of Agentsway for TimSquad. Pragmatically implemented through **prompt/template improvement** instead of LLM fine-tuning.

```
┌─────────────────────────────────────────────────────────────┐
│                   Development Cycle Complete                 │
└───────────────────────────┬─────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                   Log Collection                            │
│  - Per-agent work logs                                      │
│  - Feedback history                                         │
│  - Success/failure metrics                                  │
└───────────────────────────┬─────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                   Pattern Analysis                          │
│  - Recurring failure patterns                               │
│  - Success patterns                                         │
│  - Bottleneck points                                        │
└───────────────────────────┬─────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                   Improvement Suggestion Generation          │
│  - Prompt improvements                                      │
│  - Template improvements                                    │
│  - AGENT.md updates                                         │
└───────────────────────────┬─────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                   User Approval                             │
└───────────────────────────┬─────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                   Application                               │
│  - Update prompt templates                                  │
│  - Update SSOT templates                                    │
│  - Add to Lessons Learned                                   │
└─────────────────────────────────────────────────────────────┘
```

### 2.2 Retrospective Directory Structure

```
/retrospective
├── cycles/
│   ├── cycle-001.md          # Per-cycle retrospective report
│   ├── cycle-002.md
│   └── ...
│
├── metrics/
│   ├── agent-performance.json    # Per-agent performance
│   ├── feedback-stats.json       # Feedback statistics
│   └── improvement-history.json  # Improvement history
│
├── improvements/
│   ├── prompts/                  # Prompt improvement history
│   │   ├── developer-v1.md
│   │   ├── developer-v2.md
│   │   └── changelog.md
│   │
│   └── templates/                # Template improvement history
│       ├── prd-v1.md
│       ├── prd-v2.md
│       └── changelog.md
│
└── patterns/
    ├── failure-patterns.md       # Collection of failure patterns
    └── success-patterns.md       # Collection of success patterns
```

### 2.3 Retrospective Report Template

```markdown
# Cycle {N} Retrospective Report

## Period
- Start: {start_date}
- End: {end_date}

## Metrics Summary
| Metric | Value | vs. Previous |
|--------|-------|-------------|
| Total Tasks | {n} | +{diff} |
| Success Rate | {rate}% | +{diff}% |
| Avg. Revisions | {n} | -{diff} |
| Level 3 Feedback Count | {n} | -{diff} |

## Per-Agent Performance
| Agent | Success Rate | Avg. Revisions | Key Issues |
|-------|-------------|----------------|------------|
| developer | {rate}% | {n} | {issue} |
| dba | {rate}% | {n} | {issue} |
| qa | {rate}% | {n} | {issue} |

## Discovered Patterns

### Failure Patterns
1. **{pattern_name}**
   - Frequency: {n} times
   - Cause: {cause}
   - Suggestion: {suggestion}

### Success Patterns
1. **{pattern_name}**
   - Frequency: {n} times
   - Factor: {factor}
   - Scale-up: {recommendation}

## Improvement Actions
| Action | Target | Status |
|--------|--------|--------|
| Prompt revision | developer | Applied |
| Template revision | prd.template.md | Applied |
| Lessons Learned added | AGENT.md | Applied |

## Next Cycle Goals
- [ ] {goal_1}
- [ ] {goal_2}
```

### 2.4 Automation Script

```bash
#!/bin/bash
# timsquad-retrospective.sh

# 1. Collect logs
collect_logs() {
  find ./agents -name "*.log" -exec cat {} \; > ./retrospective/raw-logs.txt
}

# 2. Calculate metrics
calculate_metrics() {
  # Success rate, revision count, feedback statistics, etc.
  node ./scripts/calculate-metrics.js
}

# 3. Analyze patterns (Claude API call)
analyze_patterns() {
  # Request log analysis from Claude
  # Extract failure/success patterns
  node ./scripts/analyze-patterns.js
}

# 4. Generate improvements
generate_improvements() {
  # Generate prompt/template improvement proposals
  node ./scripts/generate-improvements.js
}

# 5. Generate report
generate_report() {
  node ./scripts/generate-report.js
}

# Execute
collect_logs
calculate_metrics
analyze_patterns
generate_improvements
generate_report

echo "Retrospective complete. See ./retrospective/cycles/cycle-{N}.md"
```

[**English**](feedback-and-retrospective.en.md) | [한국어](feedback-and-retrospective.md)

# Feedback & Retrospective Learning

> Separated from PRD Section 4

---

## Feedback Collection

Feedback during work is classified into **L1/L2/L3 levels** using `/tsq-retro feedback`.

| Level | Description | Handling |
|-------|-------------|----------|
| **L1** (Implementation) | Bugs, missing tests, code quality | Fix immediately in current Task |
| **L2** (Design) | API changes, schema modifications, architecture issues | Architect review after Sequence completion |
| **L3** (Planning) | Requirement changes, spec conflicts, priority shifts | Addressed in Phase retrospective |

Feedback is accumulated in `.timsquad/retrospective/feedback.jsonl` and used as input data during retrospectives.

For detailed classification criteria, see `references/feedback-guide.md` in the `tsq-retro` skill.

---

## Retrospective Learning System

### Overview

Adapts the core concept of Agentsway for TimSquad. Pragmatically implemented through **prompt/template improvement** instead of LLM fine-tuning.

### Full Cycle

```
Issue discovered during work
  → /tsq-retro feedback "message"    ← L1/L2/L3 classification & recording

Phase complete
  → /tsq-retro                       ← KPT retrospective, pattern analysis, improvement proposals

Apply approved improvements
  → /tsq-retro improve               ← Skill patches, pattern registration, lessons recording

Measure effectiveness in next retro   ← Loop complete
```

### Retrospective Flow

```
┌─────────────────────────────────────────────────────────────┐
│                   Development Cycle Complete                 │
└───────────────────────────┬─────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                   Data Collection                           │
│  - Work logs (.timsquad/logs/)                              │
│  - Feedback history (feedback.jsonl)                        │
│  - Metrics data                                             │
└───────────────────────────┬─────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                   KPT Analysis + Pattern Identification      │
│  - Keep / Problem / Try classification                      │
│  - Failure patterns (FP, 3+ occurrences)                    │
│  - Success patterns (SP, verified effective)                │
└───────────────────────────┬─────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                   Improvement Suggestion Generation          │
│  - Skill patches (SKILL.md rule modifications)              │
│  - Template updates (agents, config)                        │
│  - Pattern registration (FP/SP)                             │
└───────────────────────────┬─────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                   User Approval                             │
└───────────────────────────┬─────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                   Application (/tsq-retro improve)          │
│  - Apply skill/template changes                             │
│  - Record in lessons.md                                     │
│  - Measure effectiveness in next cycle                      │
└─────────────────────────────────────────────────────────────┘
```

### Retrospective Directory Structure

```
.timsquad/retrospective/
├── feedback.jsonl              # Feedback entries (L1/L2/L3)
├── retro-{phase}.md            # Per-phase retrospective reports
├── lessons.md                  # Applied improvement history
├── metrics/
│   ├── agent-performance.json  # Per-agent performance
│   └── improvement-history.json # Improvement history
└── patterns/
    ├── FP-{NNN}.md             # Failure patterns
    └── SP-{NNN}.md             # Success patterns
```

### Retrospective Report Structure

1. Metrics summary (task count, success rate, revision count)
2. Per-agent performance
3. Feedback analysis (L1/L2/L3 counts)
4. Discovered patterns (FP/SP)
5. Improvement actions
6. Next cycle goals

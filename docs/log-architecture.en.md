[**English**](log-architecture.en.md) | [한국어](log-architecture.md)

# TimSquad 3-Layer Log Architecture

> v3.0 log system design specification. Finalized 2026-02-14.
> Implementation status: L1 Hook + CLI enrich + L1/L2/L3 view/management/gate fully implemented.

---

## 1. Design Principles

### 1.1 Purpose of Logs

Logs are not mere records but **core infrastructure for program quality monitoring, improvement data, and troubleshooting**.
Think of it as a combination of DB binlogs, message queue event logs, and custom logs.
In TimSquad, logging is **mandatory** across all work units and operates as a **transaction**.

### 1.2 Theoretical Foundations

| Theory/Standard | Application | Reference |
|-----------------|-------------|-----------|
| **OpenTelemetry Distributed Tracing** | Phase→Sequence→Task hierarchy = Trace→Span→Child Span | [OTel Traces](https://opentelemetry.io/docs/concepts/signals/traces/) |
| **W3C Trace Context** | Trace reconstruction via parent references only (child→parent direction) | [W3C Spec](https://www.w3.org/TR/trace-context/) |
| **Event Sourcing** | Logs are append-only, immutable. State is reconstructed via replay | [MS Event Sourcing](https://learn.microsoft.com/en-us/azure/architecture/patterns/event-sourcing) |
| **DORA Metrics** | Lead Time, Change Failure Rate, Recovery Time, Rework Rate | [DORA](https://dora.dev/guides/dora-metrics/) |
| **AI Agent Observability** | Token usage, tool call tracing, agent efficiency | [OTel AI Agent](https://opentelemetry.io/blog/2025/ai-agent-observability/) |
| **GQM (Goal-Question-Metric)** | Every field is traceable back to Goal→Question→Metric | [GQM Framework](https://www.geeksforgeeks.org/goal-question-metric-approach-in-software-quality/) |

### 1.3 Core Rules

1. **Parent reference tree**: Only child logs hold parent information (no bidirectional references)
2. **Append-only**: Created logs cannot be modified (even on failure, the error field is populated and logged)
3. **Transaction**: No work can be declared complete without a log
4. **Snapshot aggregation**: Parent logs aggregate child data at completion time (not real-time synchronization)

---

## 2. Hierarchy Structure

```
Phase Log (L3)          ← PM creates when Phase completes
  │                        Comprehensive diagnosis: sequence results + plan comparison + retrospective
  │
  ├── Sequence Log (L2) ← PM creates after receiving Architect report
  │     │                  Analysis results: 3-axis verification + DORA-derived metrics
  │     │
  │     ├── Task Log (L1) ← Hook(mechanical) + Agent(semantic)
  │     ├── Task Log (L1)    Minimum work unit record
  │     └── Task Log (L1)
  │
  ├── Sequence Log (L2)
  │     ├── Task Log (L1)
  │     └── Task Log (L1)
  └── ...
```

### Reference Direction

```
Task    →  trace.sequence_id: "SEQ-01-auth"   (parent reference)
            trace.phase_id: "implementation"   (parent reference)

Sequence →  trace.phase_id: "implementation"   (parent reference)
            (no child task array — retrieved via directory scan)

Phase   →  (no child sequence array — retrieved via directory scan)
            holds only trace.phase_id
```

**Rationale**: W3C Trace Context model. Children hold `traceparent` and reference the parent.
On a file system, bidirectional references carry consistency risks (this is not a DB). Parent references are the source of truth.

---

## 3. L1: Task Log

### Overview

| Item | Value |
|------|-------|
| File path | `.timsquad/logs/tasks/{SEQ-ID}/TASK-{nn}-{agent}.json` |
| Created by | Hook (mechanical) + Sub-agent return (semantic) |
| Created at | SubagentStop event |
| Immutability | Append-only, cannot be modified after creation |
| Size | ~50-100 lines (JSON) |

### Schema

```json
{
  "schema_version": "1.0",

  "trace": {
    "phase_id": "string",
    "sequence_id": "string",
    "task_id": "string",
    "session_id": "string"
  },

  "execution": {
    "agent": "string (developer|qa|security|dba|designer|architect)",
    "model": "string (opus|sonnet|haiku)",
    "status": "string (success|failure|error|partial)",
    "started_at": "ISO 8601",
    "completed_at": "ISO 8601",
    "duration_ms": "number"
  },

  "mechanical": {
    "files": [
      { "action": "string (A|M|D|R)", "path": "string" }
    ],
    "git_range": "string (commit_hash..commit_hash)",
    "commands": [
      { "cmd": "string", "exit_code": "number" }
    ],
    "tool_calls": {
      "total": "number",
      "by_tool": { "Read": "n", "Edit": "n", "Bash": "n", "Grep": "n", "Glob": "n", "Write": "n" }
    }
  },

  "semantic": {
    "summary": "string (one-line summary)",
    "techniques": [
      { "name": "string", "reason": "string" }
    ],
    "ssot_refs": [
      { "doc": "string", "section": "string", "status": "string (aligned|misaligned|partial)" }
    ],
    "decisions": [
      { "decision": "string", "rationale": "string", "adr": "string|null" }
    ],
    "issues": [
      { "level": "number (1|2|3)", "description": "string", "filed_as": "string|null" }
    ]
  },

  "error": {
    "type": "string (build_failure|test_failure|lint_failure|runtime_error|ssot_mismatch|timeout|context_overflow)",
    "message": "string",
    "stack": "string|null",
    "recovery": {
      "attempted": "boolean",
      "strategy": "string|null",
      "result": "string (resolved|unresolved|escalated)"
    }
  }
}
```

### GQM Rationale by Field

| Field | Goal (Why needed) | Question (What question it answers) | Metric |
|-------|-------------------|-------------------------------------|--------|
| `trace.*` | Traceability | "Which sequence/phase does this task belong to?" | ID mapping |
| `execution.status` | Quality measurement | "What is the task success rate?" | success count / total |
| `execution.duration_ms` | Performance measurement | "How long does each task take?" | Duration in ms |
| `execution.model` | Cost tracking | "Which model is being used and how often?" | Call frequency per model |
| `mechanical.files` | Change tracking | "What changed?" | File list + action |
| `mechanical.git_range` | Reproducibility | "Can this change be reverted or diffed?" | commit range |
| `mechanical.commands` | Troubleshooting | "Which command failed?" | exit_code |
| `mechanical.tool_calls` | Agent efficiency | "How efficiently did the agent work?" | Tool call count by tool |
| `semantic.summary` | Readability | "What was done in one line?" | Text |
| `semantic.techniques` | Pattern analysis | "What techniques were applied?" | Technique list |
| `semantic.ssot_refs` | Conformance | "Does it align with the SSOT?" | Aligned ratio |
| `semantic.decisions` | Decision tracking | "Why was this choice made?" | ADR linkage |
| `semantic.issues` | Feedback loop | "Are discovered issues being tracked?" | Issue count by level |
| `error.*` | Troubleshooting | "Why did it fail? Can it be recovered?" | Error type + recovery result |

### error.type Definitions

| type | Description | Common Causes |
|------|-------------|---------------|
| `build_failure` | Compilation/build failure | Type errors, missing imports |
| `test_failure` | Test failure | Logic errors, environment misconfiguration |
| `lint_failure` | Lint rule violation | Code style, unused variables |
| `runtime_error` | Runtime error | Null reference, API errors |
| `ssot_mismatch` | SSOT inconsistency detected | Gap between specification and implementation |
| `timeout` | Agent timeout | Excessive task scope, infinite loops |
| `context_overflow` | Context window exceeded | Excessive file reads, long conversations |

### Example: Success

```json
{
  "schema_version": "1.0",
  "trace": {
    "phase_id": "implementation",
    "sequence_id": "SEQ-01-auth",
    "task_id": "TASK-01",
    "session_id": "abc12345"
  },
  "execution": {
    "agent": "developer",
    "model": "sonnet",
    "status": "success",
    "started_at": "2026-02-14T10:00:00Z",
    "completed_at": "2026-02-14T10:15:23Z",
    "duration_ms": 923000
  },
  "mechanical": {
    "files": [
      { "action": "A", "path": "src/auth/login.ts" },
      { "action": "M", "path": "src/routes/index.ts" }
    ],
    "git_range": "abc1234..def5678",
    "commands": [
      { "cmd": "npm test", "exit_code": 0 },
      { "cmd": "npm run lint", "exit_code": 0 }
    ],
    "tool_calls": {
      "total": 12,
      "by_tool": { "Read": 5, "Edit": 4, "Bash": 2, "Grep": 1 }
    }
  },
  "semantic": {
    "summary": "Implemented login endpoint (POST /api/auth/login)",
    "techniques": [
      { "name": "JWT stateless auth", "reason": "No server session needed, easy horizontal scaling" }
    ],
    "ssot_refs": [
      { "doc": "service-spec.md", "section": "auth#login", "status": "aligned" }
    ],
    "decisions": [
      { "decision": "bcrypt hashing", "rationale": "Better ecosystem compatibility compared to argon2", "adr": null }
    ],
    "issues": []
  },
  "error": null
}
```

### Example: Failure

```json
{
  "schema_version": "1.0",
  "trace": {
    "phase_id": "implementation",
    "sequence_id": "SEQ-01-auth",
    "task_id": "TASK-03",
    "session_id": "abc12345"
  },
  "execution": {
    "agent": "qa",
    "model": "sonnet",
    "status": "failure",
    "started_at": "2026-02-14T11:00:00Z",
    "completed_at": "2026-02-14T11:08:45Z",
    "duration_ms": 525000
  },
  "mechanical": {
    "files": [
      { "action": "A", "path": "tests/auth.test.ts" }
    ],
    "git_range": "def5678..ghi9012",
    "commands": [
      { "cmd": "npm test", "exit_code": 1 }
    ],
    "tool_calls": {
      "total": 8,
      "by_tool": { "Read": 3, "Edit": 2, "Bash": 3 }
    }
  },
  "semantic": {
    "summary": "Login API test authoring - tests failed",
    "techniques": [],
    "ssot_refs": [
      { "doc": "service-spec.md", "section": "auth#login", "status": "partial" }
    ],
    "decisions": [],
    "issues": [
      { "level": 1, "description": "Token generation failed due to missing JWT_SECRET environment variable", "filed_as": null }
    ]
  },
  "error": {
    "type": "test_failure",
    "message": "auth.test.ts:45 - Expected 200, received 401",
    "stack": "src/auth/login.ts:23 → src/middleware/jwt.ts:12",
    "recovery": {
      "attempted": false,
      "strategy": null,
      "result": "unresolved"
    }
  }
}
```

---

## 4. L2: Sequence Log

### Overview

| Item | Value |
|------|-------|
| File path | `.timsquad/logs/sequences/{SEQ-ID}.json` |
| Report path | `.timsquad/reports/{SEQ-ID}-report.md` |
| Created by | PM (after receiving Architect report) |
| Created at | After all tasks in the sequence complete + Architect analysis completes |
| Immutability | Append-only, cannot be modified after creation |

### Schema

```json
{
  "schema_version": "1.0",

  "trace": {
    "phase_id": "string",
    "sequence_id": "string"
  },

  "execution": {
    "status": "string (completed|blocked|partial|aborted)",
    "started_at": "ISO 8601",
    "completed_at": "ISO 8601",
    "duration_ms": "number"
  },

  "tasks": {
    "total": "number",
    "success": "number",
    "failure": "number",
    "error": "number",
    "rework": "number",
    "first_pass_success_rate": "number (0~1)",
    "final_success_rate": "number (0~1)"
  },

  "analysis": {
    "axis_1_consistency": {
      "verdict": "string (pass|warn|fail)",
      "details": "string",
      "issues": [
        { "level": "number", "description": "string", "file_ref": "string" }
      ]
    },
    "axis_2_ssot_conformance": {
      "verdict": "string (pass|warn|fail)",
      "details": "string",
      "issues": [
        { "level": "number", "ssot_doc": "string", "section": "string", "description": "string", "resolution": "string" }
      ]
    },
    "axis_3_cross_sequence": {
      "verdict": "string (pass|warn|fail|n/a)",
      "prev_sequence": "string|null",
      "details": "string",
      "issues": [
        { "level": "number", "prev_decision": "string", "conflict": "string" }
      ]
    }
  },

  "dora_derived": {
    "change_failure_rate": "number (0~1)",
    "rework_rate": "number (0~1)",
    "mean_task_duration_ms": "number",
    "recovery_time_ms": "number|null"
  },

  "verdict": {
    "proceed": "boolean",
    "conditions": ["string"],
    "report_path": "string"
  }
}
```

### GQM Rationale by Field

| Field | Goal | Question | Metric |
|-------|------|----------|--------|
| `tasks.first_pass_success_rate` | Quality trend | "Is the first-pass success rate improving?" | Successful tasks / total (before retries) |
| `tasks.rework` | Rework cost | "How many tasks were re-executed?" | Re-execution count |
| `analysis.axis_*` | Structural health | "Are architecture/SSOT/continuity being maintained?" | pass/warn/fail |
| `dora_derived.change_failure_rate` | Delivery quality | "What percentage of changes fail?" | failure / total |
| `dora_derived.recovery_time_ms` | Resilience | "How quickly is recovery achieved after failure?" | Failure→success retry time |
| `verdict.conditions` | Gatekeeping | "What are the conditions to proceed to the next sequence?" | Condition list |

### Example

```json
{
  "schema_version": "1.0",
  "trace": {
    "phase_id": "implementation",
    "sequence_id": "SEQ-01-auth"
  },
  "execution": {
    "status": "completed",
    "started_at": "2026-02-14T09:00:00Z",
    "completed_at": "2026-02-14T14:30:00Z",
    "duration_ms": 19800000
  },
  "tasks": {
    "total": 4,
    "success": 3,
    "failure": 1,
    "error": 0,
    "rework": 1,
    "first_pass_success_rate": 0.67,
    "final_success_rate": 1.0
  },
  "analysis": {
    "axis_1_consistency": {
      "verdict": "pass",
      "details": "Error handling and naming conventions unified",
      "issues": []
    },
    "axis_2_ssot_conformance": {
      "verdict": "warn",
      "details": "Refresh token endpoint not yet implemented",
      "issues": [
        {
          "level": 1,
          "ssot_doc": "service-spec.md",
          "section": "auth#refresh",
          "description": "Refresh token endpoint not yet implemented",
          "resolution": "Deferred to SEQ-02"
        }
      ]
    },
    "axis_3_cross_sequence": {
      "verdict": "n/a",
      "prev_sequence": null,
      "details": "First sequence, no comparison target",
      "issues": []
    }
  },
  "dora_derived": {
    "change_failure_rate": 0.25,
    "rework_rate": 0.25,
    "mean_task_duration_ms": 660000,
    "recovery_time_ms": 180000
  },
  "verdict": {
    "proceed": true,
    "conditions": ["Refresh token implementation required in SEQ-02"],
    "report_path": ".timsquad/reports/SEQ-01-auth-report.md"
  }
}
```

---

## 5. L3: Phase Log

### Overview

| Item | Value |
|------|-------|
| File path | `.timsquad/logs/phases/{phase-name}.json` |
| Created by | PM (main session) |
| Created at | Just before Phase transition (prerequisite for transition) |
| Immutability | Append-only, cannot be modified after creation |

### Schema

```json
{
  "schema_version": "1.0",

  "trace": {
    "phase_id": "string (planning|implementation|review|security)"
  },

  "execution": {
    "status": "string (completed|aborted)",
    "started_at": "ISO 8601",
    "completed_at": "ISO 8601",
    "duration_ms": "number",
    "sessions_count": "number"
  },

  "sequences": {
    "total": "number",
    "completed": "number",
    "blocked": "number",
    "ids": ["string"]
  },

  "aggregate_metrics": {
    "total_tasks": "number",
    "task_success_rate": "number (0~1)",
    "task_rework_rate": "number (0~1)",
    "total_files_changed": "number",
    "total_issues": {
      "level_1": "number",
      "level_2": "number",
      "level_3": "number"
    },
    "ssot_conformance_rate": "number (0~1)",
    "mean_sequence_duration_ms": "number"
  },

  "dora_derived": {
    "lead_time_ms": "number",
    "change_failure_rate": "number (0~1)",
    "mean_recovery_time_ms": "number|null"
  },

  "planning": {
    "original_sequences": ["string"],
    "added_sequences": ["string"],
    "removed_sequences": ["string"],
    "scope_changes": [
      { "description": "string", "reason": "string", "impact": "string" }
    ],
    "plan_adherence_rate": "number (0~1)"
  },

  "workflow_adjustments": [
    {
      "trigger": "string",
      "adjustment": "string",
      "impact": "string"
    }
  ],

  "retrospective": {
    "keep": ["string"],
    "problem": ["string"],
    "try": ["string"]
  },

  "knowledge_extracted": [
    {
      "type": "string (pattern|lesson|constraint)",
      "content": "string",
      "target": "string (knowledge file path)"
    }
  ]
}
```

### GQM Rationale by Field

| Field | Goal | Question | Metric |
|-------|------|----------|--------|
| `aggregate_metrics.task_success_rate` | Process quality | "What is the overall success rate for this phase?" | success / total |
| `aggregate_metrics.ssot_conformance_rate` | SSOT effectiveness | "Is the SSOT actually guiding implementation?" | aligned / total refs |
| `dora_derived.lead_time_ms` | Delivery speed | "How long did this phase take?" | Start to completion |
| `dora_derived.change_failure_rate` | Delivery quality | "What is the change failure rate?" | Failed tasks / total |
| `planning.plan_adherence_rate` | Predictability | "Is execution proceeding according to plan?" | Original sequences / final sequences |
| `planning.scope_changes` | Scope management | "What changes occurred and why?" | Change history |
| `workflow_adjustments` | Adaptability | "How quickly were adjustments made when problems arose?" | Adjustment history |
| `retrospective` | Learning loop | "What was learned and how will it be applied next?" | KPT items |
| `knowledge_extracted` | Knowledge accumulation | "Was reusable knowledge produced?" | Number of extracted items |

### Example

```json
{
  "schema_version": "1.0",
  "trace": {
    "phase_id": "implementation"
  },
  "execution": {
    "status": "completed",
    "started_at": "2026-02-14T09:00:00Z",
    "completed_at": "2026-02-16T18:00:00Z",
    "duration_ms": 205200000,
    "sessions_count": 5
  },
  "sequences": {
    "total": 3,
    "completed": 3,
    "blocked": 0,
    "ids": ["SEQ-01-auth", "SEQ-02-crud", "SEQ-03-ui"]
  },
  "aggregate_metrics": {
    "total_tasks": 9,
    "task_success_rate": 0.89,
    "task_rework_rate": 0.22,
    "total_files_changed": 34,
    "total_issues": { "level_1": 3, "level_2": 1, "level_3": 0 },
    "ssot_conformance_rate": 0.92,
    "mean_sequence_duration_ms": 18000000
  },
  "dora_derived": {
    "lead_time_ms": 205200000,
    "change_failure_rate": 0.11,
    "mean_recovery_time_ms": 240000
  },
  "planning": {
    "original_sequences": ["SEQ-01-auth", "SEQ-02-crud", "SEQ-03-ui"],
    "added_sequences": [],
    "removed_sequences": [],
    "scope_changes": [],
    "plan_adherence_rate": 1.0
  },
  "workflow_adjustments": [
    {
      "trigger": "SEQ-01 TASK-03 test failure",
      "adjustment": "Missing environment variable config → added .env.example",
      "impact": "Zero occurrences of the same issue in subsequent sequences"
    }
  ],
  "retrospective": {
    "keep": [
      "Zero spec omissions with SSOT-based implementation",
      "Cross-sequence consistency maintained via Architect 3-axis analysis"
    ],
    "problem": [
      "First QA task failed (environment setup incomplete)",
      "data-design.md update delayed in SEQ-02"
    ],
    "try": [
      "Verify environment setup checklist before starting each sequence",
      "Enforce immediate reflection of SSOT changes"
    ]
  },
  "knowledge_extracted": [
    {
      "type": "pattern",
      "content": "Separating JWT refresh token into a dedicated sequence reduces complexity",
      "target": ".timsquad/knowledge/lessons.md"
    }
  ]
}
```

---

## 6. Directory Structure

```
.timsquad/logs/
├── tasks/                         ← L1: Task logs (directory per sequence)
│   ├── SEQ-01-auth/
│   │   ├── TASK-01-developer.json
│   │   ├── TASK-02-developer.json
│   │   ├── TASK-03-qa.json        (includes failure log)
│   │   └── TASK-03-qa-r1.json     (retry log, r1 = retry 1)
│   └── SEQ-02-crud/
│       └── ...
│
├── sequences/                     ← L2: Sequence metadata
│   ├── SEQ-01-auth.json
│   └── SEQ-02-crud.json
│
├── phases/                        ← L3: Phase comprehensive logs
│   ├── planning.json
│   └── implementation.json
│
├── sessions/                      ← Hook event logs (raw, existing)
└── quick/                         ← Quick mode logs (existing)

.timsquad/reports/                 ← Architect sequence reports (.md)
├── SEQ-01-auth-report.md
└── SEQ-02-crud-report.md
```

### Retry File Naming

```
TASK-03-qa.json        ← Initial execution (failure)
TASK-03-qa-r1.json     ← 1st retry
TASK-03-qa-r2.json     ← 2nd retry (if applicable)
```

Retry logs are also append-only. The original failure log is not modified; a new file is created instead.
The `rework` count is calculated as: number of files with the same TASK-ID minus 1.

---

## 7. Transaction Policy

### Principle

> **"If there is no log, the work is not complete."**

### Transactions by Layer

| Layer | Transaction Condition | Failure Handling |
|-------|----------------------|------------------|
| **L1 Task** | JSON must be created on SubagentStop. Even on failure, it is created with the `error` field populated. | PM creates a manual log or re-executes the task |
| **L2 Sequence** | Verify all L1 logs exist → Architect analysis → PM saves JSON + report.md | Sequence marked "incomplete", blocks next sequence |
| **L3 Phase** | Verify all L2 logs exist → PM writes comprehensive JSON | Phase transition blocked |

### Transaction Flow

```
L1 Creation:
  SubagentStart Hook → record baseline HEAD (/tmp/tsq-task-baseline-{SESSION}-{AGENT})
  Sub-agent executes work
  SubagentStop Hook → auto-collect mechanical data → create JSON (semantic: {})
  Sub-agent → tsq log enrich {agent} --json '{...}' → merge semantic data
  ✓ L1 complete

L2 Creation:
  Verify all task L1 logs exist (tsq log sequence check {SEQ-ID})
  PM → invoke Architect (input contract: seq_id, task_logs, ssot_refs, prev_reports)
  Architect → 3-axis analysis → return report
  PM → save .timsquad/reports/{SEQ-ID}-report.md
  PM → tsq log sequence create {SEQ-ID} --phase {phase} --report {path} --verdict proceed
  ✓ L2 complete

L3 Creation:
  tsq log phase gate {phase-id} → confirm PASSED
  PM → execute retro skill (KPT)
  PM → tsq log phase create {phase-id} --sequences "SEQ-01,SEQ-02,..."
  ✓ L3 complete → Phase transition enabled
```

### Integrity Verification

```
L1 verification: ls .timsquad/logs/tasks/{SEQ-ID}/ has expected number of task files
L2 verification: .timsquad/logs/sequences/{SEQ-ID}.json exists + report.md exists
L3 verification: .timsquad/logs/phases/{phase-name}.json exists
```

---

## 8. .gitignore Policy

```gitignore
# L1: Task logs (runtime-generated, high volume)
.timsquad/logs/tasks/

# L2: Sequence meta JSON (runtime-generated)
.timsquad/logs/sequences/

# L3: Phase logs (runtime-generated)
.timsquad/logs/phases/

# Session/Quick logs (runtime)
.timsquad/logs/sessions/
.timsquad/logs/quick/

# Architect reports are tracked in git (reviewable documents)
# .timsquad/reports/ → tracked
```

---

## 9. CLI Implementation Status

### Implemented

| Command | Description | Layer |
|---------|-------------|:-----:|
| `tsq log enrich <agent> --json '{...}'` | Merge semantic data into the most recent task log | L1 |
| `tsq log task list [--agent <name>]` | List task logs (shows status/semantic presence) | L1 |
| `tsq log task view <file>` | Task log detail (mechanical + semantic) | L1 |
| `tsq log task stats` | Statistics (success rate, semantic coverage, per agent) | L1 |
| `tsq log sequence list` | List sequence logs | L2 |
| `tsq log sequence view <seq-id>` | Sequence log detail (3-axis + DORA + verdict) | L2 |
| `tsq log sequence create <seq-id> --phase <id> --report <path>` | Aggregate L1 → create L2 JSON | L2 |
| `tsq log sequence check <seq-id>` | Verify task semantic completeness within a sequence | L2 |
| `tsq log phase list` | List phase logs | L3 |
| `tsq log phase view <phase-id>` | Phase log detail (metrics + retrospective) | L3 |
| `tsq log phase create <phase-id> --sequences "..."` | Aggregate L2 → create L3 JSON | L3 |
| `tsq log phase gate <phase-id>` | Verify phase transition eligibility (PASSED/BLOCKED) | L3 |

### Semantic Enrichment Protocol

Since the Hook (SubagentStop) cannot access the agent's text output, semantic data is populated by the agent directly invoking the CLI.

```
Hook creates → task JSON {mechanical: {...}, semantic: {}}
                                                  ↓
Agent invokes → tsq log enrich {agent} --json '{summary, techniques, ...}'
                                                  ↓
                task JSON {mechanical: {...}, semantic: {summary, techniques, ...}}
```

All agents include a `tsq log enrich` call in their `<on-task-complete>` / `<on-review-complete>` / `<on-analysis-complete>` protocols.

---

## 10. Future Expansion Possibilities

| Expansion | Description | Timing |
|-----------|-------------|--------|
| Token cost tracking | Add `execution.tokens` field (input/output/cache) | When transcript parsing is available in Hooks |
| Dashboard | Log-based visualization (DORA charts, success rate trends) | Phase 3 |
| Log compression/archiving | gzip compression for old logs | After project maturity |

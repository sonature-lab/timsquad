---
title: TimSquad vNext Operational State Runtime
status: draft
created: 2026-05-22
scope: model-agnostic runtime architecture
related:
  - docs/improvement-plan-2026-05-22.md
  - docs/context-di-architecture-review.md
  - docs/context-di-harness-diagram.md
---

# TimSquad vNext Operational State Runtime

## One-Line Definition

TimSquad vNext is not a bigger document harness. It is a model-agnostic Operational State Runtime that prevents invalid state from being committed by requiring evidence-backed event transactions and regenerating all projections from canonical truth.

## Why This Exists

The current TimSquad harness improved structure, but it still relies too much on text projections and agent self-report:

- too many documents
- stale projections
- PASS/completed claim drift
- soft protocol dependence
- agent self-report treated as truth
- model-specific adapters leaking into the core process

The failure mode is simple:

> The more documents we create, the easier it becomes for an agent to believe a stale document is truth.

vNext changes the center of gravity:

```text
Context as Text           -> no
Context as Operational State -> yes
```

The runtime computes the current operational truth and gives the agent the minimum context needed for the current transaction.

## Core Goals

1. Keep transaction-level consistency.
2. Deliver only the operational context needed for the current work.
3. Make TimSquad independent of any single model, IDE, or hook system.
4. Ensure an agent can forget context without being able to commit invalid state.

## Canonical Truth

Only these are canonical truth:

| Source | Role |
|---|---|
| `operational-events.jsonl` | append-only transaction ledger |
| verified evidence artifacts | reproducible facts that authorize claims |
| source code | implementation reality |

Everything else is a generated, authored, or supporting source.

## Supporting Sources

Supporting sources are useful, but they are not the commit point:

| Source | Role |
|---|---|
| ADRs | design rationale |
| reports | analysis and review history |
| session logs | trace/debug information |
| authored SSOT YAML/XML/JSON/Markdown | human intent and requirements |

Supporting sources can be compiled, normalized, and referenced. They cannot override the canonical event ledger, verified evidence, or source code.

## Generated Views

Generated views are not truth. They must be safe to invalidate and regenerate:

| Generated View | Role |
|---|---|
| `.glog` | lazy operational access view |
| `current-phase.json` | phase projection |
| `task-context.json` | task-scoped runtime context |
| phase reports | summarized status |
| dashboards | human-readable projections |
| handoffs | convenience transfer documents |

Invariant:

```text
If a generated view is stale, delete it and rebuild it from canonical truth.
```

## Six-Layer Architecture

```text
Canonical Truth
  - operational-events.jsonl
  - verified evidence artifacts
  - source code

Supporting Sources
  - ADR / reports / session logs
  - authored SSOT YAML/XML/JSON/Markdown
        |
        | compile / normalize
        v
.glog
  - lazy/generated operational access view
  - not canonical truth

ProjectMap
  - lightweight navigation map
        |
        v
Operational State Runtime
  - state validator
  - transaction gate
  - projection compiler
  - context provider
        |
        v
Adapters
  - Claude Code
  - Codex
  - Cursor
  - Antigravity
  - MCP / daemon
```

## Runtime Role

The runtime is an observer, validator, transaction gate, projection compiler, and context provider.

The runtime is not the owner of source code edits. Agents and IDE tools still edit source code directly.

Runtime-owned canonical/generated state:

- `operational-events.jsonl`
- evidence indexes and validation metadata
- `.glog`
- generated projections such as `current-phase.json`
- generated task context such as `task-context.json`

Agent-owned or editor-owned work:

- source code edits
- tests
- implementation artifacts
- human-authored requirements and ADR drafts

## Evidence Matrix

Evidence is not a test-result document. Evidence is a commit credential.

```text
Report = claim
Evidence = reproducible fact
Event = canonical transaction envelope
```

PASS/completed/closed claims are not canonical unless an event carrying valid evidence is appended.

Invariant:

```text
No evidence -> no completed/PASS/closed event.
```

## Event Transaction Model

The only commit point is event append:

```text
Agent Action
  -> Evidence generated
  -> Evidence validated
  -> Event validated
  -> Event appended
  -> Projections invalidated
  -> Lazy rebuild on demand
```

Projection files must not be updated alongside the event as a second truth write.

Correct:

```text
append event -> invalidate projections -> regenerate projections
```

Incorrect:

```text
append event -> manually mutate workflow/current-phase/.glog at the same time
```

## Event Envelope

The event envelope should own transaction metadata:

- event id
- event type
- timestamp
- actor
- task/phase/entity references
- evidence references
- effects
- invalidates
- source pointers

Evidence should prove claims. The event envelope should describe state effects.

Validator invariant:

```text
invalidates must be derivable from evidence-backed effects.
```

## .glog

`.glog` is a lazy/generated operational access view.

It is not:

- another source of truth
- a permanent graph database
- a human-edited state file

It should provide:

- entity to source pointers
- entity to latest relations
- entity constraints
- generated projections
- event-derived navigation hints

If `.glog` is stale, it must be safe to delete and regenerate.

## ProjectMap

ProjectMap is a lightweight navigation map, not a full AST cache.

Recommended fields:

| Field | Meaning |
|---|---|
| `path` | module or directory path |
| `role` | what the module does |
| `layer` | application layer |
| `keyFiles` | small list of important files |
| `methods` | important methods/functions only |
| `relatedADR` | ADR pointers |
| `dependsOn` | coarse dependencies |
| `relatedTests` | test pointers |
| `risk` | known risk |
| `freshness` | last observed freshness |

Non-goals:

- full AST cache
- giant meta-index
- full import graph

## MetaIndex Repositioning

The old giant stale meta-index should be demoted.

New role:

```text
MetaIndex = on-demand analyzer cache
```

Default flow:

```text
grep + ProjectMap + .glog
```

Large refactor flow:

```text
ad-hoc analyzer -> temporary cache -> discard/regenerate
```

## Runtime Hierarchy

```text
ProjectRuntime
  PhaseRuntime
    SequenceRuntime
      TicketRuntime
        TaskRuntime
```

Responsibilities:

| Runtime | Responsibility |
|---|---|
| ProjectRuntime | root coordination and project-level invariants |
| PhaseRuntime | phase state, gates, phase constraints |
| SequenceRuntime | sequence readiness and completion rules |
| TicketRuntime | issue/ticket scoped constraints |
| TaskRuntime | current execution context and evidence requirements |

## CLI Surface

Hooks are adapters. The `tsq` CLI is the common runtime surface.

Minimum vNext CLI:

```bash
tsq evidence validate
tsq event append
tsq task complete
tsq context resolve
tsq file impact
```

Internal sequence:

```text
validate -> append -> invalidate -> refresh on demand
```

## Model-Agnostic Adapter Boundary

TimSquad core must not depend on Claude-specific, Codex-specific, Cursor-specific, or Antigravity-specific behavior.

Adapter responsibilities:

- translate platform hooks/events into runtime CLI/API calls
- pass current user/task metadata
- surface blocking messages in platform-native format
- fail closed only when the runtime explicitly rejects a transaction

Core runtime responsibilities:

- validate evidence
- validate event envelope
- append canonical event
- invalidate projections
- resolve context
- compute file/task impact

## Agent Responsibilities

Agents do not directly edit canonical state.

Forbidden:

```text
edit decisions.jsonl
rewrite current-phase.json
rewrite operational-events.jsonl
rewrite .glog
claim PASS without evidence
```

Allowed:

```text
edit source code
run tests
create evidence artifacts through approved commands
call tsq evidence validate
call tsq task complete
call tsq context resolve
```

LLM role:

```text
worker / executor
```

Runtime role:

```text
transaction authority
```

## Conventions as Executable Constraints

Convention documents should become executable constraints.

Example:

```yaml
constraint: convention:service-layer
rules:
  - service must not import route layer
  - repository access must go through a port
```

Runtime connection:

```text
TaskRuntime -> constrainedBy convention + ADR + PRD
```

## Session Logs

Session logs are trace/debug artifacts.

They are not canonical truth.

```text
SessionLog != Truth
```

## Metrics

Candidate vNext metrics:

- waiver ratio
- evidence failure rate
- reopened tasks
- stale projection count
- repeated file touches
- invalid event rejection count
- projection rebuild latency

## Roadmap

### Phase 0

- append-only guard
- Evidence Matrix v0.1/v0.2
- entity id convention
- protect canonical state files

### Phase 1

- event schema
- minimal `tsq event` CLI
- evidence validator integration
- task completion through event append

### Phase 2

- `.glog` lazy view
- generated projections
- ProjectMap
- projection invalidation/rebuild protocol

### Phase 3

- capability boundary
- stronger runtime orchestration
- executable conventions
- impact analysis

### Phase 4

- daemon
- MCP
- cross-platform runtime
- richer transaction manager if needed

## Migration From Current TimSquad

Current assets should not be discarded. They should be reclassified:

| Current Asset | vNext Role |
|---|---|
| SSOT docs | supporting authored sources |
| controller skill | adapter/workflow guidance |
| hooks | platform adapters |
| daemon | observer/runtime host |
| workflow.json | generated projection or legacy compatibility view |
| current-phase.json | generated projection |
| task-context.json | generated task context |
| reports | claims/debug/supporting sources |
| decisions.jsonl | supporting trace, later migrated into event-backed decisions |

## Acceptance Criteria

This RFC is implemented only when:

1. A completed/PASS/closed claim cannot be committed without valid evidence.
2. `operational-events.jsonl` is the only state commit point.
3. Generated projections can be deleted and rebuilt.
4. Hooks call runtime APIs/CLI instead of mutating canonical state.
5. The same runtime core can serve Claude Code, Codex, Cursor, Antigravity, and MCP adapters.
6. Agents can forget context without being able to commit invalid state.

## Final Principle

The goal is not to make the LLM remember perfectly.

The goal is to make invalid state uncommittable even when the LLM forgets.

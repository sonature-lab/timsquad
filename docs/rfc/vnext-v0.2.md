---
title: TimSquad vNext v0.2 Walking Skeleton
status: draft
created: 2026-05-22
scope: evidence matrix, event schema, minimal CLI, lazy projection invalidation
depends_on:
  - docs/rfc/vnext-architecture-6layer.md
---

# TimSquad vNext v0.2 Walking Skeleton

## Purpose

v0.2 creates the smallest useful runtime path:

```text
evidence validate -> event append -> projection invalidate
```

This is intentionally smaller than the full Operational State Runtime. The goal is to prove the transaction model before building daemon/MCP orchestration.

## Non-Goals

v0.2 does not implement:

- full daemon runtime
- MCP server
- full `.glog` graph query engine
- cross-platform adapter packages
- automated migration of every legacy state file
- full transaction manager

## Validation First

Before implementation, v0.2 must pass these validation criteria:

1. Invalid evidence is rejected before event creation.
2. `completed`, `PASS`, `closed`, and `phase-complete` claims require evidence.
3. Event append is append-only.
4. Event validator enforces that `invalidates` is justified by event effects and evidence.
5. Projection files are invalidated, not synchronously trusted as truth.
6. Existing v3/v4 commands keep working unless explicitly routed through new vNext commands.

## Target File Layout

```text
src/
  commands/
    evidence.ts
    event.ts
    task.ts
    context.ts
  lib/
    runtime/
      evidence-schema.ts
      evidence-validator.ts
      event-schema.ts
      event-validator.ts
      event-ledger.ts
      projection-invalidator.ts
      entity-id.ts
      project-map.ts
tests/
  unit/
    runtime/
      evidence-validator.test.ts
      event-validator.test.ts
      event-ledger.test.ts
      projection-invalidator.test.ts
docs/
  rfc/
    vnext-architecture-6layer.md
    vnext-v0.2.md
```

## Canonical Runtime Paths

Within an initialized TimSquad project:

```text
.timsquad/
  state/
    operational-events.jsonl
    projections/
      invalidated.json
      current-phase.json
      task-context.json
    evidence/
      artifacts/
      index.json
```

Compatibility note:

- Existing `.timsquad/state/current-phase.json` can remain as a legacy mirror during migration.
- v0.2 should prefer the new projection path when present.
- Any legacy mirror must be regenerated from events, not manually edited by agents.

## Evidence Model

Evidence is a reproducible fact that authorizes a claim.

Minimum evidence fields:

| Field | Required | Meaning |
|---|---:|---|
| `id` | yes | stable evidence id |
| `kind` | yes | evidence type |
| `createdAt` | yes | ISO timestamp |
| `producer` | yes | command/tool that produced the evidence |
| `subject` | yes | task/entity/file/phase being evidenced |
| `claim` | yes | claim being supported |
| `artifact` | yes | file path, command output pointer, or digest |
| `verifier` | yes | verifier name/version |
| `result` | yes | `pass`, `fail`, or `unknown` |
| `digest` | recommended | artifact digest |

Recommended evidence kinds:

```text
test-run
typecheck-run
lint-run
build-run
review-finding
visual-check
e2e-run
source-grep
schema-validate
manual-approval
```

Claims requiring evidence:

```text
task.completed
phase.completed
sequence.completed
gate.pass
issue.closed
claim.pass
projection.refreshed
```

## Event Model

Event append is the only commit point.

Minimum event fields:

| Field | Required | Meaning |
|---|---:|---|
| `id` | yes | stable event id |
| `type` | yes | event type |
| `schemaVersion` | yes | event schema version |
| `createdAt` | yes | ISO timestamp |
| `actor` | yes | user/agent/runtime actor |
| `subject` | yes | task/entity/phase/file subject |
| `evidence` | yes | evidence ids or inline references |
| `effects` | yes | state effects being committed |
| `invalidates` | yes | projections/views invalidated by this event |
| `sourcePointers` | no | pointers into source/docs/reports |

Core event types:

```text
task.completed
task.blocked
sequence.completed
phase.completed
gate.passed
gate.failed
source.changed
projection.invalidated
projection.rebuilt
decision.recorded
constraint.waived
```

## Validator Invariants

### Evidence Before Claim

If an event commits a completion/pass/closed claim, it must reference passing evidence.

```text
event.effects contains completed/pass/closed
  -> event.evidence must contain at least one valid passing evidence item
```

### Invalidates Must Be Justified

`invalidates` cannot be an arbitrary list.

```text
invalidates subsetOf derivableProjections(effects, evidence.subject)
```

Example:

```json
{
  "type": "task.completed",
  "subject": { "kind": "task", "id": "P1-S001-T001" },
  "effects": [{ "kind": "taskStatus", "id": "P1-S001-T001", "status": "completed" }],
  "invalidates": ["current-phase", "task-context", "glog"]
}
```

This is valid because task completion affects phase status, task context, and operational graph views.

### Projection Is Not Truth

Projection rebuild evidence can prove that a projection was refreshed, but the projection itself remains generated.

### Append-Only Ledger

The event ledger must only append newline-delimited JSON.

Disallowed:

- rewrite ledger
- truncate ledger
- sort ledger in place
- edit old event lines

Allowed:

- append event
- create backup
- create compacted snapshot only if it references source event range and digest

## Minimal CLI

### `tsq evidence validate`

Purpose:

```text
Validate one evidence artifact or evidence JSON payload.
```

Example:

```bash
tsq evidence validate --file .timsquad/state/evidence/artifacts/test-run-001.json
```

Output:

```json
{
  "status": "valid",
  "evidenceId": "ev_test_001",
  "claim": "task.completed",
  "result": "pass"
}
```

### `tsq event append`

Purpose:

```text
Validate event envelope, validate referenced evidence, append to operational-events.jsonl, and invalidate projections.
```

Example:

```bash
tsq event append --file .timsquad/tmp/events/task-completed.json
```

Output:

```json
{
  "status": "appended",
  "eventId": "evt_task_001",
  "ledger": ".timsquad/state/operational-events.jsonl",
  "invalidated": ["current-phase", "task-context", "glog"]
}
```

### `tsq event verify`

Purpose:

```text
Replay and validate the event ledger without mutating state.
```

Example:

```bash
tsq event verify
```

### `tsq event tail`

Purpose:

```text
Print recent canonical events for debugging.
```

Example:

```bash
tsq event tail --limit 20
```

### `tsq task complete`

Purpose:

```text
High-level task completion command that creates/validates evidence and appends a task.completed event.
```

Example:

```bash
tsq task complete P1-S001-T001 --evidence ev_test_001 --summary "login API implemented"
```

Internal flow:

```text
load task runtime
validate evidence
construct event
append event
invalidate projections
return next context hint
```

### `tsq context resolve`

Purpose:

```text
Return minimal operational context for the current task.
```

Example:

```bash
tsq context resolve --task P1-S001-T001
```

Output should include:

- task objective
- current phase/sequence
- relevant source pointers
- relevant constraints
- required evidence
- recent canonical events
- projection freshness

### `tsq file impact`

Purpose:

```text
Compute likely operational impact of changed files.
```

Example:

```bash
tsq file impact src/modules/chat/chat.service.ts
```

Output should include:

- impacted tasks
- related tests
- invalidated projections
- constraints to re-check

## Projection Invalidation

v0.2 invalidation file:

```json
{
  "updatedAt": "2026-05-22T00:00:00.000Z",
  "invalidated": {
    "current-phase": {
      "reason": "task.completed",
      "eventId": "evt_task_001"
    },
    "task-context": {
      "reason": "task.completed",
      "eventId": "evt_task_001"
    },
    "glog": {
      "reason": "task.completed",
      "eventId": "evt_task_001"
    }
  }
}
```

Lazy rebuild can be implemented later. v0.2 only needs to mark projections stale deterministically.

## Compatibility Strategy

During migration, maintain a compatibility layer:

| Legacy command/file | v0.2 behavior |
|---|---|
| `tsq next --complete` | may remain legacy, but should warn when vNext runtime is enabled |
| `workflow.json` | compatibility projection |
| `current-phase.json` | generated projection |
| `decisions.jsonl` | supporting trace; later migrated to `decision.recorded` events |
| daemon task-complete | observer only; should not commit truth directly |

Recommended feature flag:

```yaml
runtime:
  mode: legacy | vnext
```

Default for existing projects:

```yaml
runtime:
  mode: legacy
```

Default for experimental projects:

```yaml
runtime:
  mode: vnext
```

## Test Plan

Minimum test groups:

1. Evidence schema accepts valid evidence.
2. Evidence schema rejects missing `claim`.
3. Evidence schema rejects non-pass evidence for completed claims.
4. Event schema accepts valid task completion event.
5. Event validator rejects completed event without evidence.
6. Event validator rejects invalidates not derivable from effects.
7. Event ledger appends exactly one JSON line.
8. Event ledger verify rejects malformed JSONL.
9. Projection invalidator marks `current-phase`, `task-context`, and `glog`.
10. `tsq task complete` smoke test appends event and invalidates projections.

Target:

```text
30+ unit tests before enabling vnext mode by default.
```

## Implementation Slices

### Slice 1: Schemas

- `evidence-schema.ts`
- `event-schema.ts`
- schema tests

### Slice 2: Validators

- `evidence-validator.ts`
- `event-validator.ts`
- invalidates derivation rules

### Slice 3: Ledger

- `event-ledger.ts`
- append-only writer
- ledger verifier

### Slice 4: CLI

- `tsq evidence validate`
- `tsq event append`
- `tsq event verify`
- `tsq event tail`

### Slice 5: Task Completion

- `tsq task complete`
- bridge from task completion to event envelope
- projection invalidation

### Slice 6: Context

- `tsq context resolve`
- minimal task context from event ledger + supporting sources

## Done Criteria

v0.2 is done when:

1. `tsq evidence validate` rejects bad evidence.
2. `tsq event append` rejects completion/pass events without valid evidence.
3. `tsq task complete` appends a canonical event instead of directly mutating workflow state.
4. Projection invalidation is deterministic and tested.
5. Existing legacy mode still passes current tests.
6. The RFC examples can be executed as smoke tests or are mirrored by automated tests.

## Open Decisions

| ID | Decision | Default |
|---|---|---|
| OD-001 | schema library: custom TypeScript vs zod/ajv | start custom, add dependency only if needed |
| OD-002 | evidence artifact digest required at v0.2? | recommended, not required |
| OD-003 | dual-write duration for legacy state | 1-2 weeks of dogfood |
| OD-004 | `.glog` physical format | defer to v0.3 |
| OD-005 | event id format | `evt_<kind>_<timestamp/hash>` initially |

## Design Bias

Prefer a small, boring, append-only path over a clever runtime.

The first win is not richer context. The first win is making false completion hard to commit.

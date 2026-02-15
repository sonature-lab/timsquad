[**English**](cli.en.md) | [한국어](cli.md)

# CLI Reference

> Complete reference for the `tsq` (or `timsquad`) command

---

## Project Management

### `tsq init`

Initialize a project. Configure via interactive prompts or CLI options.

```bash
tsq init                                              # Interactive
tsq init -n my-app -t web-service -l 2 -y             # Non-interactive
tsq init -n my-app -t web-service --domain fintech --stack react,node,prisma -y
```

| Option | Description | Default |
|--------|-------------|---------|
| `-n, --name <name>` | Project name (lowercase, hyphens) | Current directory name |
| `-t, --type <type>` | Project type | Interactive selection |
| `-l, --level <1\|2\|3>` | Project level | Interactive selection |
| `--domain <domain>` | Domain | `general-web` |
| `--stack <items>` | Tech stack (comma-separated) | - |
| `-d, --dir <path>` | Target directory | `.` |
| `-y, --yes` | Skip confirmation prompts | `false` |

**Project types**: `web-service`, `web-app`, `api-backend`, `platform`, `fintech`, `infra`

**Domains**: `general-web`, `ml-engineering`, `fintech`, `mobile`, `gamedev`, `systems`

**Stacks**: `react`, `nextjs`, `node`, `prisma`, `typescript`, `postgresql`, `mysql`

### `tsq status`

Check project status.

```bash
tsq status                # Full summary
tsq status --all          # Full details
tsq status --ssot         # SSOT document status only
tsq status --phase        # Current Phase only
tsq status --metrics      # Metrics only
```

### `tsq upgrade`

Migrate from v2.x to v3.x.

```bash
tsq upgrade               # Interactive migration
tsq upgrade --yes         # Skip confirmation
tsq upgrade --dry-run     # Preview (no changes made)
tsq upgrade --rollback    # Undo migration
```

---

## Work Modes

### `tsq q` (Quick)

Lightweight mode for simple tasks. Skips SSOT validation, goes directly to `@tsq-developer`.

```bash
tsq q "버튼 색상을 파란색으로 변경"
tsq quick "오타 수정"
```

When complex keywords are detected ("API change", "DB schema", "authentication", etc.), a Full mode switch is suggested.

### `tsq f` (Full)

Full-featured work mode. Includes SSOT validation, routed through `@tsq-planner`.

```bash
tsq f "사용자 인증 기능 추가"
tsq full "결제 모듈 구현"
```

| | Quick (`tsq q`) | Full (`tsq f`) |
|---|---|---|
| SSOT Validation | Skipped | Required |
| Routing | Direct to Developer | Via PM |
| Suitable For | CSS fixes, typos, simple bugs | New features, API changes, DB changes |
| Log Location | `logs/quick/` | `logs/tasks/` |

---

## Log Management

### `tsq log`

3-tier log system (L1 Task -> L2 Sequence -> L3 Phase).

#### Basic Logs

```bash
tsq log add <agent> <type> [message]          # Add log
tsq log list [agent]                          # List logs
tsq log view <file>                           # View log
tsq log today [agent]                         # Today's logs
tsq log search <keyword>                      # Search by keyword
tsq log summary [date]                        # Daily summary
tsq log compact [--days <n>] [--dry-run]      # Compact old logs
tsq log enrich <agent> --json '<data>'        # Merge semantic data
```

**Log types**: `work`, `decision`, `error`, `feedback`, `handoff`

#### L1 Task Logs

```bash
tsq log task list [--agent <name>]            # List task logs
tsq log task view <file>                      # View task log details
tsq log task stats                            # Task statistics
```

#### L2 Sequence Logs

```bash
tsq log sequence create <seq-id> --phase <id> --report <path>   # Create
tsq log sequence list                         # List
tsq log sequence view <seq-id>                # View details
tsq log sequence check <seq-id>               # Check L1 completeness
```

#### L3 Phase Logs

```bash
tsq log phase create <phase-id> --sequences "s001,s002"        # Create
tsq log phase list                            # List
tsq log phase view <phase-id>                 # View details
tsq log phase gate <phase-id>                 # Phase Gate check
```

Phase Gate blocks transitions when there are unresolved feedback items (L2/L3).

---

## Feedback System

### `tsq feedback`

Automatically classifies feedback into 3 levels (L1/L2/L3) and executes actions.

```bash
tsq feedback route <message>                  # Classify + log + auto-action
tsq feedback list [--status <status>]         # List feedback
tsq feedback resolve <id>                     # Mark L2 as resolved
tsq feedback approve <id>                     # Approve L3 (user)
tsq feedback reject <id>                      # Reject L3
```

**Backward compatible**: `tsq feedback <message>` automatically falls back to `route`.

#### Auto-Classification Triggers (15 types)

| Level | Trigger | Keyword Examples |
|-------|---------|-----------------|
| **1** (Implementation) | `test_failure` | test failure, test fail |
| **1** | `lint_error` | lint, eslint, prettier |
| **1** | `type_error` | type error, TS2304 |
| **1** | `runtime_error` | runtime error, crash, 500, timeout |
| **1** | `code_style_violation` | code style, convention |
| **2** (Design) | `architecture_issue` | architecture, structural change, layer |
| **2** | `api_mismatch` | API mismatch, interface, spec |
| **2** | `performance_problem` | performance, slow, N+1, memory |
| **2** | `scalability_concern` | scalability, scaling, load |
| **2** | `security_vulnerability` | security, vulnerability, XSS, SQL injection |
| **3** (Planning) | `requirement_ambiguity` | ambiguous requirement, unclear spec |
| **3** | `scope_change` | scope change, additional feature, schedule change |
| **3** | `business_logic_error` | business logic, policy, rule |
| **3** | `feature_request` | feature request, new feature |
| **3** | `stakeholder_feedback` | feedback, review result, customer opinion |

#### Auto-Actions

- **L1**: Log only (developer handles inline)
- **L2**: Set `status='in_review'`, add to `workflow.pending_feedback`, block Phase Gate
- **L3**: Set `status='open'`, add to `workflow.pending_feedback`, wait for user approve/reject

---

## Retrospective System

### `tsq retro`

Analyzes accumulated data to generate improvement suggestions.

#### Manual Cycle (5 steps)

```bash
tsq retro start             # 1. Start new cycle
tsq retro collect           # 2. Collect logs and metrics
tsq retro analyze           # 3. Analyze patterns
tsq retro report            # 4. Generate report + GitHub Issue
tsq retro apply             # 5. Apply improvements (archive feedback)
tsq retro status            # Check current cycle status
```

#### Auto Cycle

```bash
tsq retro auto              # Full auto execution (5 steps in one click)
tsq retro auto --local      # Skip GitHub Issue creation
```

Auto execution also chains `tsq improve fetch` + `tsq improve analyze`.

#### Phase Retrospective (KPT)

```bash
tsq retro phase planning          # Planning phase retrospective
tsq retro phase implementation    # Implementation phase retrospective
tsq retro phase review            # Review phase retrospective
```

### `tsq improve`

Analyzes GitHub Issues generated from retrospectives to derive improvement patterns.

```bash
tsq improve fetch [--limit <n>] [--repo <org/repo>]    # Collect Issues
tsq improve analyze                                     # Analyze patterns + suggest improvements
tsq improve summary                                     # View results
```

**Analysis categories**: `agent-prompt`, `ssot-template`, `workflow`, `feedback-routing`, `config`, `tooling`

---

## Metrics

### `tsq metrics`

```bash
tsq metrics collect [--days <n>]    # Collect metrics
tsq metrics summary                 # Latest metrics summary
tsq metrics trend [--n <count>]     # Period-based trend comparison
tsq metrics export [--output <file>]  # Export as JSON
```

**Collected items**: Log Activity, Decision Ratio, Error Rate, Feedback Level Distribution, SSOT Completion Rate, Tool Efficiency, Cache Hit Rate, CLI Adoption

---

## Meta Index

### `tsq mi` (meta-index)

Codebase structure indexing. Two-tier: AST (mechanical) + agent (semantic).

```bash
tsq mi rebuild [--exclude <pattern>]    # Full rebuild (code + UI)
tsq mi update [--quiet]                 # Re-parse changed files only
tsq mi stats                            # Health Score + UI Health statistics
tsq mi stage <file> [options]           # Stage semantic data
tsq mi find <keyword> [--json]          # Search
tsq mi check                            # Drift detection + interface validation
```

#### stage Options

```bash
# Code semantic
tsq mi stage "src/auth/login.ts" \
  --method execute --algo hash-compare --tc "O(1)" --fn authenticate

# UI semantic
tsq mi stage "src/components/LoginForm.tsx" \
  --layout flex-column --color-scheme primary --spacing compact \
  --state "loading:form submit:button disabled + spinner:API 응답"

# Directory semantic
tsq mi stage "src/payment/" \
  --desc "결제 도메인 핵심 로직" --purpose domain-logic --domain fintech
```

---

## Knowledge

### `tsq knowledge`

Manage Knowledge files (checklists, platforms, domains).

```bash
tsq knowledge create <category> <name>    # Create (platforms/domains/checklists)
tsq knowledge validate                    # Validate required sections
tsq knowledge list                        # List (with completeness)
```

---

## Workflow Automation

### `tsq wf` (workflow)

```bash
tsq wf set-phase <phase-id>                            # Set current Phase
tsq wf add-sequence <seq-id> --agents "developer,dba"  # Register sequence
tsq wf remove-sequence <seq-id>                        # Remove sequence
tsq wf status                                          # Workflow status
tsq wf config <key> <on|off>                           # Automation toggle
```

**Automation toggle keys**: `sequence_log`, `phase_log`, `phase_gate`, `metrics`, `retro`, `feedback`

#### Internal Commands (auto-invoked by daemon/hooks)

```bash
tsq wf task-start --agent <type> [--scope <scope>]     # Create task context
tsq wf track-task <agent> <path>                       # Track task completion
tsq wf check                                           # Run automation check + execute
```

---

## Daemon

### `tsq daemon`

Background daemon. JSONL real-time monitoring, L1/L2/L3 log automation, Meta Index cache, etc.

```bash
tsq daemon start [--jsonl <path>]    # Start daemon
tsq daemon stop                      # Stop daemon
tsq daemon status                    # Daemon status
```

---

## Git Integration

```bash
tsq commit                              # Interactive commit
tsq commit -m "feat: 로그인 추가"        # Specify message
tsq commit -a -m "fix: 버그 수정"        # Stage all + commit
tsq pr                                  # Create Pull Request
tsq sync                                # fetch + rebase
tsq release                             # Tag + GitHub Release
```

---

## Miscellaneous

### `tsq watch`

Watch SSOT file changes.

```bash
tsq watch start       # Start watching
tsq watch stop        # Stop watching
tsq watch status      # Watch status
```

### `tsq session`

Session management.

```bash
tsq session list                  # List sessions
tsq session view <id>             # View session details
```

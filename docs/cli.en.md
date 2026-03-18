[**English**](cli.en.md) | [한국어](cli.md)

# CLI Reference

> Complete reference for the `tsq` (or `timsquad`) command
>
> Since v3.7, the CLI retains only 3 core commands. All other features have been migrated to slash commands (skills).

---

## `tsq init`

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
| `--workspaces <pattern>` | Monorepo workspace glob patterns (comma-separated) | - |
| `-d, --dir <path>` | Target directory | `.` |
| `-y, --yes` | Skip confirmation prompts | `false` |

**Project types**: `web-service`, `web-app`, `api-backend`, `platform`, `fintech`, `infra`, `mobile-app`

**Domains**: `general-web`, `ml-engineering`, `fintech`, `mobile`, `gamedev`, `systems`

**Stacks**: `react`, `nextjs`, `node`, `prisma`, `typescript`, `postgresql`, `mysql`

After initialization, start the pipeline with `/tsq-start` in Claude Code.

---

## `tsq update`

Sync project templates with the installed TimSquad version.
Updates CLAUDE.md injection block, agents, skills, rules, scripts, knowledge, and workflow definitions.

```bash
tsq update                # Interactive upgrade
tsq update --yes          # Skip confirmation
tsq update --dry-run      # Preview (no changes made)
tsq update --rollback     # Restore previous version
```

| Option | Description |
|--------|-------------|
| `-y, --yes` | Skip confirmation prompts |
| `--dry-run` | Preview changes only (no actual changes) |
| `--rollback` | Restore to state before last upgrade |

**Preserved items** (files that update never touches):
- `.timsquad/config.yaml` (project settings)
- `.timsquad/ssot/` (SSOT documents)
- `.timsquad/logs/` (all logs)
- `.timsquad/state/` (workflow state, meta-index)
- `.timsquad/knowledge/` (user knowledge)
- `.timsquad/retrospective/` (metrics, cycles)

---

## `tsq daemon`

Background daemon process management. Handles file watcher, Meta Index cache, IPC server, and session metrics collection.
Works without JSONL (lite mode), receives events via hook-based IPC notify.

```bash
tsq daemon start [--jsonl <path>]    # Start daemon (JSONL optional)
tsq daemon stop                      # Stop daemon
tsq daemon status                    # Daemon status + session metrics
```

### `tsq daemon notify`

Event notification subcommand auto-invoked by hooks. No need to call directly.

```bash
tsq daemon notify subagent-start [--agent <type>]    # Subagent start notification
tsq daemon notify subagent-stop  [--agent <type>]    # Subagent stop notification
tsq daemon notify tool-use [--tool <name>] [--status <status>]  # Tool use notification
tsq daemon notify stop                               # Session stop notification (token usage)
tsq daemon notify session-end                        # Session end notification
```

---

## Skill Migration Guide

Since v3.7, the following CLI commands have been removed and replaced with Claude Code slash commands (skills).

| Removed CLI | Replacement | Description |
|-------------|-------------|-------------|
| `tsq q` / `tsq f` | `/tsq-start` | Start work (Quick/Full unified) |
| `tsq status` | `/tsq-status` | Project status check |
| `tsq log` | `/tsq-log` | Log management |
| `tsq feedback` | `/tsq-retro feedback` | Feedback L1/L2/L3 classification & recording |
| `tsq retro` | `/tsq-retro` | Retrospective cycle |
| `tsq metrics` | `/tsq-status` | Metrics (merged into status) |
| `tsq mi` | daemon meta-index | Meta Index (daemon auto-manages) |
| `tsq wf` | Controller | Workflow (managed by Controller) |
| `tsq improve` | `/tsq-retro improve` | Retrospective improvement application |
| `tsq knowledge` | - | Removed |
| `tsq commit/pr/sync/release` | - | Removed |
| `tsq watch` | - | Removed |
| `tsq session` | - | Removed |
| `tsq upgrade` | `tsq update` | Replaced with update |

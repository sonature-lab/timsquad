<p align="center">
  <img src="assets/timsquad_banner.png" alt="TimSquad" width="100%">
</p>

<p align="center">
  <strong>Vibe Development Framework</strong><br>
  A high-quality software development framework powered by SSOT-based documentation, optimized agent roles, and retrospective learning — continuously improving within Claude Code.
</p>

<p align="center">
  <strong>English</strong> | <a href="README.ko.md">한국어</a>
</p>

```
Optimized Role Definitions + Advanced Skills + Retrospective Learning = Continuously Improving High-Quality Output
```

---

## Why TimSquad?

| | Typical Approach | **TimSquad** |
|---|---------|------------|
| Philosophy | "Zero learning curve" | **"Structure leads to better results"** |
| Decision Making | LLM decides everything | **Developer stays in control** |
| Priority | Speed | **Quality + Consistency** |
| Enforcement | Prompt only (soft) | **Hook Gate + Capability Token (hard)** |
| Learning | None | **Retrospective learning for continuous improvement** |

**For developers who want structure, not magic.**

### Target Users

- Senior developers who value structured processes
- Solo CTOs / Tech Leads (need team-level quality working alone)
- Developers who prioritize documentation and consistency

---

## Installation

```bash
# Global install
npm install -g timsquad

# Or run directly with npx
npx timsquad init
```

**Requirements:**
- Node.js >= 18.0.0
- [Claude Code](https://claude.ai/claude-code) (agent execution environment)

---

## Quick Start

### 1. Initialize a Project

```bash
tsq init                                      # Interactive setup
tsq init -n my-app -t web-service -l 2 -y     # Non-interactive
```

### 2. Generated Structure

```
my-app/
├── CLAUDE.md                      # PM role (auto-injected ~15 lines)
├── .claude/
│   ├── settings.json              # Claude Code settings (8 hooks)
│   ├── rules/                     # Path-specific rules (15)
│   ├── agents/                    # 7 specialized agents
│   │   ├── tsq-architect.md       # Architecture design
│   │   ├── tsq-developer.md       # Code implementation
│   │   ├── tsq-qa.md              # Verification/review
│   │   ├── tsq-security.md        # Security audit
│   │   ├── tsq-dba.md             # DB design
│   │   ├── tsq-designer.md        # UI/UX design
│   │   └── tsq-librarian.md       # Phase recording
│   ├── skills/                    # tsq-* skills (selected by project type)
│   │   ├── tsq-protocol/          # Shared agent protocol
│   │   ├── tsq-controller/        # Context DI + delegation
│   │   ├── tsq-coding/            # Coding rules
│   │   ├── tsq-testing/           # Test strategies
│   │   ├── tsq-typescript/        # TypeScript patterns
│   │   ├── tsq-react/             # React (if configured)
│   │   ├── tsq-nextjs/            # Next.js + Vercel rules
│   │   ├── tsq-database/          # DB design
│   │   ├── tsq-product-audit/     # Product audit (7 areas)
│   │   ├── tsq-tdd/               # TDD methodology
│   │   └── ...                    # Others (per config)
│   └── knowledge/                 # Agent reference knowledge
└── .timsquad/
    ├── config.yaml                # Project configuration
    ├── ssot/                      # SSOT documents (5–14 per level)
    ├── process/                   # Workflow definitions
    ├── state/                     # State management
    ├── trails/                    # Phase thinking archives
    ├── logs/                      # 3-tier logs (L1→L2→L3)
    └── retrospective/             # Retrospective data
```

### 3. Work in Claude Code

```bash
claude                                    # Launch Claude Code

# Use slash commands for all operations
/tsq-start                               # Start pipeline + onboarding
/tsq-quick fix login button color        # Single task via Controller
/tsq-full                                # Full pipeline (Phase-Sequence-Task)
/tsq-status                              # Check current status
/tsq-grill                               # Deep interview for Sub-PRD
/tsq-decompose                           # Generate Phase-Sequence-Task plan
```

### 4. CLI Commands

```bash
tsq init                          # Initialize project
tsq update                        # Update skills/agents to latest
tsq daemon start                  # Start background daemon
```

> All other operations use Claude Code slash commands. See [CLI Reference](docs/cli.en.md).

---

## Key Features

### 5-Layer Enforcement Architecture

```
Layer 1: Hook Gate (100% enforced)
  └ PreToolUse hooks + Capability Token — system-level blocking

Layer 2: Skill Protocol (90-95% compliance)
  └ tsq-protocol + controller — process guidance
  └ Agent-specific skills preloaded via skills: field

Layer 3: CLAUDE.md (role definition only)
  └ PM role + pipeline prerequisites (~15 lines)

Layer 4: Slash Commands (explicit process)
  └ /tsq-start, /tsq-quick, /tsq-full, /tsq-status, /tsq-grill, /tsq-retro

Layer 5: Audit (async post-tracking)
  └ Daemon observes → session logs, metrics
  └ Daemon failure doesn't affect main pipeline
```

### SSOT Document System

Required documents are automatically determined by project level:

| Level | Required Documents | Target |
|-------|-------------------|--------|
| **Level 1** (MVP) | PRD, Planning, Requirements, Service Spec, Data Design (5) | Side projects, PoC |
| **Level 2** (Standard) | Level 1 + 6 more (11) | General projects, Startups |
| **Level 3** (Enterprise) | Level 2 + 3 more (14) | Enterprise, Fintech |

### Agent System

7 specialized agents with Controller-based delegation:

| Agent | Role |
|-------|------|
| `@tsq-architect` | Architecture design, ADR, plan review |
| `@tsq-developer` | SSOT-driven code implementation, TDD |
| `@tsq-qa` | Code review, test verification, SSOT compliance |
| `@tsq-security` | Security audit, OWASP, vulnerability analysis |
| `@tsq-dba` | DB design, query optimization, migrations |
| `@tsq-designer` | UI/UX design, accessibility, design tokens |
| `@tsq-librarian` | Phase recording, memory management |

### 37 Skills (Slash Commands)

All skills use `tsq-*` flat namespace and are available as slash commands:

| Category | Skills |
|----------|--------|
| **Core** | `tsq-protocol`, `tsq-controller`, `tsq-start`, `tsq-quick`, `tsq-full`, `tsq-status` |
| **Coding** | `tsq-coding`, `tsq-testing`, `tsq-typescript`, `tsq-hono` |
| **Planning** | `tsq-planning`, `tsq-spec`, `tsq-grill`, `tsq-decompose` |
| **Frontend** | `tsq-react`, `tsq-nextjs`, `tsq-ui` |
| **Backend** | `tsq-database`, `tsq-prisma`, `tsq-security` |
| **Mobile** | `tsq-dart`, `tsq-flutter` (+ 6 sub-skills) |
| **Quality** | `tsq-product-audit`, `tsq-audit`, `tsq-stability` |
| **Methodology** | `tsq-tdd`, `tsq-bdd`, `tsq-ddd`, `tsq-debugging` |
| **Operations** | `tsq-librarian`, `tsq-log`, `tsq-retro`, `tsq-prompt` |

### 8 Hook Gates

| Hook | Script | Role | Strategy |
|------|--------|------|----------|
| PreToolUse (Bash) | `safe-guard.sh` | Block destructive commands | Fail-closed |
| PreToolUse (Write\|Edit) | `phase-guard.sh` | Phase file restrictions | Fail-closed |
| PreToolUse (Write\|Edit) | `check-capability.sh` | Capability Token verification | Fail-closed |
| PreToolUse (Write\|Edit) | `change-scope-guard.sh` | Change scope tracking | Fail-open |
| Stop | `completion-guard.sh` | Test + TDD + SSOT check | Fail-closed |
| Stop | `build-gate.sh` | TypeScript build errors | Fail-closed |
| PreCompact | `pre-compact.sh` | Save state before compact | Fail-open |
| SessionStart (compact) | `context-restore.sh` | Restore context + SSOT readiness | Fail-open |

### Daemon-Based Automation

**Observer-only daemon** — no token cost:

```
Claude Code session → Daemon observes via IPC
  → L1 task logs recorded (SubagentStop hook)
  → Decision Log accumulated (decisions.jsonl)
  → SSOT Drift detection (7-day stale warning)
  → Session metrics tracked
  → Daemon failure doesn't block pipeline
```

---

## Project Types

| Type | Description |
|------|-------------|
| `web-service` | SaaS, full-stack web services |
| `web-app` | BaaS-based (Supabase/Firebase) |
| `api-backend` | API servers, microservices |
| `platform` | Frameworks, SDKs |
| `fintech` | Exchanges, payments (Level 3 enforced) |
| `mobile-app` | Cross-platform mobile apps |
| `infra` | DevOps, automation |

---

## Documentation

| Document | Description |
|----------|-------------|
| [PRD](docs/PRD.en.md) | Full framework specification |
| [Core Concepts](docs/core-concepts.en.md) | Fountain model, SSOT, agent/skill architecture |
| [CLI Reference](docs/cli.en.md) | CLI command reference |
| [File Structure](docs/file-structure.en.md) | Templates + post-init structure |
| [Hook Execution Order](docs/hook-execution-order.md) | Hook sequence, fail strategy |
| [Log Architecture](docs/log-architecture.en.md) | 3-tier log system (L1→L2→L3) |
| [Feedback & Retrospective](docs/feedback-and-retrospective.en.md) | Feedback routing + retrospective |
| [SDCA Architecture](docs/sdca-architecture.md) | Skill-Driven Controller Architecture |

---

## Theoretical Background

| Theory/Paper | Key Concept | TimSquad Application |
|-------------|-------------|---------------------|
| **Agentsway** (2025) | Prompting Agent, Retrospective Learning | Prompt optimization, retrospective learning |
| **ACM TOSEM** (2025) | Competency Mapping | Competency framework, performance metrics |
| **Agentic SE** (2025) | AGENT.md, Meta-Prompt Files | Layered meta-prompt architecture |
| **FRAME** (2025) | Feedback-Driven Refinement | Tiered feedback routing |

---

## Contributing

Contributions are welcome!

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'feat: add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## License

MIT License - see [LICENSE](LICENSE) for details.

---

## Related

- [Anthropic Skills](https://github.com/anthropics/skills)
- [Claude Code](https://claude.ai/claude-code)

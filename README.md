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
| Repetitive Tasks | LLM handles (token cost) | **Program handles (zero tokens)** |
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
├── CLAUDE.md                      # PM role definition (agent instructions)
├── .claude/
│   ├── settings.json              # Claude Code settings
│   ├── rules/                     # Main session rules
│   ├── agents/                    # 6 specialized agents
│   │   ├── tsq-architect.md       # Architecture design (Sonnet)
│   │   ├── tsq-developer.md       # Code implementation (Sonnet)
│   │   ├── tsq-qa.md              # Verification/review (Sonnet)
│   │   ├── tsq-security.md        # Security audit (Sonnet)
│   │   ├── tsq-dba.md             # DB design (Sonnet)
│   │   └── tsq-designer.md        # UI/UX design (Sonnet)
│   ├── skills/                    # Domain-specific skillsets
│   │   ├── tsq-protocol/          # Shared agent protocol
│   │   ├── coding/                # Coding rules + rules/
│   │   ├── testing/               # Test strategies + references/
│   │   ├── typescript/            # TypeScript patterns + rules/
│   │   ├── frontend/(react|nextjs)/ # Frontend + 22 Vercel rules
│   │   ├── backend/node/          # Node.js backend + rules/
│   │   ├── database/prisma/       # Prisma ORM + rules/
│   │   ├── mobile/dart/             # Dart language + rules/
│   │   ├── mobile/flutter/          # Flutter dev + rules/ + refs/
│   │   │   └── push-notifications/  # FCM + local + background
│   │   ├── methodology/(tdd|bdd|ddd|debugging)/
│   │   └── ...
│   └── knowledge/                 # Agent reference knowledge
│       ├── checklists/            # Security, accessibility, SSOT validation
│       └── templates/             # Output formats (task-result, etc.)
└── .timsquad/
    ├── config.yaml                # Project configuration
    ├── ssot/                      # SSOT documents (5–14 per level)
    ├── process/                   # Workflow definitions
    ├── state/                     # State management + Meta Index
    ├── feedback/                  # Feedback store
    ├── logs/                      # 3-tier logs (L1→L2→L3)
    └── retrospective/             # Retrospective data
```

### 3. Work in Claude Code

```bash
claude                                    # Launch Claude Code

# PM (CLAUDE.md) automatically classifies tasks and delegates to agents
@tsq-architect "Design the system architecture"
@tsq-developer "Implement the login API"
@tsq-qa "Review the code"
```

### 4. Manage Tasks via CLI

```bash
tsq status                        # Check current status
tsq q "change button color"       # Quick mode (simple tasks)
tsq f "add payment feature"       # Full mode (SSOT validation)
tsq retro auto                    # Run retrospective automatically
```

---

## Key Features

### SSOT Document System

Required documents are automatically determined by project level:

| Level | Required Documents | Target |
|-------|-------------------|--------|
| **Level 1** (MVP) | PRD, Planning, Requirements, Service Spec, Data Design (5) | Side projects, PoC |
| **Level 2** (Standard) | Level 1 + 6 more (11) | General projects, Startups |
| **Level 3** (Enterprise) | Level 2 + 3 more (14) | Enterprise, Fintech |

### Agent System

The PM (CLAUDE.md) orchestrates and delegates to 6 specialized agents. Each agent features XML-structured prompts, mandatory skill injection, and 3-tier feedback routing.

| Agent | Role |
|-------|------|
| `@tsq-architect` | Architecture design, ADR, code structure review |
| `@tsq-developer` | SSOT-driven code implementation, TDD |
| `@tsq-qa` | Code review, test verification, SSOT compliance |
| `@tsq-security` | Security audit, OWASP, vulnerability analysis |
| `@tsq-dba` | DB design, query optimization, migrations |
| `@tsq-designer` | UI/UX design, accessibility, design tokens |

### Feedback Routing (L1/L2/L3)

Feedback is automatically classified into 3 tiers with appropriate actions:

```
L1 (Implementation fix) → Developer auto-handles     → No approval needed
L2 (Design change)      → Transitions to in_review   → Phase Gate blocks
L3 (Planning change)    → Awaits user approval        → approve/reject required
```

> Details: [docs/feedback-and-retrospective.en.md](docs/feedback-and-retrospective.en.md)

### Retrospective Learning

Task logs → Pattern analysis → Improvement suggestions → Prompt/template updates. Instead of LLM fine-tuning, we improve through prompt/template refinement.

```bash
tsq retro auto              # Collect → Analyze → Report → Apply (one-click)
tsq improve analyze          # Pattern analysis + improvement suggestions
```

> Details: [docs/feedback-and-retrospective.en.md](docs/feedback-and-retrospective.en.md)

### Daemon-Based Automation Pipeline

**All orchestration at zero token cost** — the program decides:

```
Claude Code session → Daemon watches JSONL in real-time
  → L1 task logs recorded automatically
  → L2 sequence logs aggregated automatically
  → L3 phase logs generated automatically
  → Phase Gate checked automatically
  → Metrics accumulated in-memory → flushed at session end
  → Meta Index updated automatically
```

> Details: [docs/token-efficiency.en.md](docs/token-efficiency.en.md)

### Meta Index (Code Structure Index)

AST-based code/UI structure auto-indexing + agent semantic data merging:

```bash
tsq mi rebuild              # Build full code+UI index
tsq mi stats                # Health Score + UI Health
```

> Details: [docs/meta-index-architecture.en.md](docs/meta-index-architecture.en.md)

---

## CLI Commands

| Command | Description |
|---------|-------------|
| `tsq init` | Initialize project (interactive/non-interactive) |
| `tsq status` | Check project status |
| `tsq q "task"` | Quick mode (simple tasks) |
| `tsq f "task"` | Full mode (SSOT validation) |
| `tsq log` | 3-tier task log management (L1/L2/L3) |
| `tsq feedback` | Feedback classification + auto actions |
| `tsq retro` | Run retrospective (manual/auto) |
| `tsq metrics` | Metrics collection/trends |
| `tsq mi` | Meta Index management (rebuild/stats) |
| `tsq knowledge` | Knowledge file management |
| `tsq wf` | Workflow automation |
| `tsq daemon` | Background daemon management |

> Full CLI reference: [docs/cli.en.md](docs/cli.en.md)

---

## Project Types

| Type | Description |
|------|-------------|
| `web-service` | SaaS, full-stack web services |
| `web-app` | BaaS-based (Supabase/Firebase) |
| `api-backend` | API servers, microservices |
| `platform` | Frameworks, SDKs |
| `fintech` | Exchanges, payments (Level 3 enforced) |
| `infra` | DevOps, automation |

---

## Documentation

| Document | Description |
|----------|-------------|
| [PRD](docs/PRD.en.md) | Full framework specification |
| [Core Concepts](docs/core-concepts.en.md) | Fountain model, SSOT, agent/skill architecture |
| [CLI Reference](docs/cli.en.md) | Complete CLI command reference |
| [Authoring Guide](docs/authoring-guide.en.md) | Agent/skill/knowledge authoring guide |
| [Log Architecture](docs/log-architecture.en.md) | 3-tier log system (L1→L2→L3) |
| [Feedback & Retrospective](docs/feedback-and-retrospective.en.md) | Feedback routing + retrospective learning |
| [Token Efficiency](docs/token-efficiency.en.md) | Token efficiency design |
| [Knowledge Architecture](docs/knowledge-architecture.en.md) | Knowledge system |
| [Meta Index Architecture](docs/meta-index-architecture.en.md) | Code/UI structure index |
| [File Structure](docs/file-structure.en.md) | Templates + post-init structure |

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

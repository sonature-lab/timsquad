[**English**](file-structure.en.md) | [한국어](file-structure.md)

# File Structure

> Document separated from PRD Section 8. As of v3.7.

## Template Structure

```
/timsquad
├── /templates
│   ├── /base                              # Platform-agnostic common templates
│   │   ├── CLAUDE.md.template             # PM role definition template
│   │   ├── config.template.yaml           # TimSquad config template
│   │   │
│   │   ├── /agents                        # Agent definitions
│   │   │   ├── /base                      # Base agents (7)
│   │   │   │   ├── tsq-architect.md       # Architecture design
│   │   │   │   ├── tsq-developer.md       # Code implementation
│   │   │   │   ├── tsq-qa.md              # Verification/review
│   │   │   │   ├── tsq-security.md        # Security audit
│   │   │   │   ├── tsq-dba.md             # DB design
│   │   │   │   ├── tsq-designer.md        # UI/UX design
│   │   │   │   └── tsq-librarian.md       # Phase recording specialist
│   │   │   └── /overlays                  # Agent overlays
│   │   │       ├── /platform              # Platform-specific overlays
│   │   │       └── /domain                # Domain-specific overlays
│   │   │
│   │   ├── /skills                        # Domain-specific skillsets
│   │   │   ├── _template/                 # Skill creation template
│   │   │   ├── _shared/                   # Shared references
│   │   │   ├── tsq-protocol/              # Agent common protocol
│   │   │   ├── tsq-cli/                   # TSQ CLI usage
│   │   │   ├── main-session-constraints/  # Main session constraints
│   │   │   ├── controller/                # Context DI controller
│   │   │   │   ├── rules/
│   │   │   │   ├── triggers/
│   │   │   │   ├── delegation/
│   │   │   │   ├── memory/
│   │   │   │   └── references/
│   │   │   ├── coding/                    # Coding rules + rules/
│   │   │   ├── testing/                   # Test strategies + references/
│   │   │   ├── typescript/                # TypeScript patterns + rules/
│   │   │   ├── architecture/              # Architecture design + references/
│   │   │   ├── planning/                  # Planning + references/
│   │   │   ├── security/                  # Security + rules/ + scripts/
│   │   │   ├── database/                  # DB design + rules/
│   │   │   │   └── prisma/               # Prisma ORM
│   │   │   ├── frontend/                  # Frontend
│   │   │   │   ├── react/                # React
│   │   │   │   └── nextjs/              # Next.js + 22 Vercel rules
│   │   │   ├── backend/node/              # Node.js backend
│   │   │   ├── mobile/                    # Mobile
│   │   │   │   ├── dart/                 # Dart language + rules/
│   │   │   │   └── flutter/              # Flutter dev + rules/ + refs/
│   │   │   │       └── push-notifications/ # FCM + local + background
│   │   │   ├── product-audit/             # Product audit (7 areas, 156 items)
│   │   │   │   ├── rules/                # audit-protocol, scoring, FP guard
│   │   │   │   ├── checklists/           # 01-security ~ 07-functional
│   │   │   │   └── templates/            # Report + improvement plan
│   │   │   ├── audit/                     # Audit execution skill
│   │   │   ├── review/                    # Code review skill
│   │   │   ├── spec/                      # Spec writing skill
│   │   │   ├── librarian/                 # Librarian skill
│   │   │   ├── prompt-engineering/        # Prompt optimization
│   │   │   ├── retrospective/             # Retrospective + references/
│   │   │   ├── ui-design/                 # UI design
│   │   │   ├── stability-verification/    # Stability verification + scripts/
│   │   │   └── methodology/               # Development methodology
│   │   │       ├── tdd/
│   │   │       ├── bdd/
│   │   │       ├── ddd/
│   │   │       └── debugging/
│   │   │
│   │   ├── /knowledge                     # Agent reference knowledge
│   │   │   ├── /checklists                # Security, accessibility, SSOT validation
│   │   │   ├── /templates                 # Output formats (task-result, etc.)
│   │   │   ├── /platforms                 # Platform-specific knowledge
│   │   │   └── /domains                   # Domain-specific knowledge
│   │   │
│   │   └── /timsquad                      # → Copied to .timsquad/
│   │       ├── /ssot                      # SSOT document templates
│   │       │   ├── prd.template.md
│   │       │   ├── planning.template.md
│   │       │   ├── requirements.template.md
│   │       │   ├── service-spec.template.md
│   │       │   ├── data-design.template.md
│   │       │   ├── test-spec.template.md
│   │       │   └── adr/
│   │       ├── /architectures             # Architecture pattern templates
│   │       │   ├── clean/
│   │       │   ├── hexagonal/
│   │       │   └── fsd/
│   │       ├── /generators                # Document generators (XML)
│   │       ├── /process                   # Workflow definitions
│   │       ├── /constraints               # Constraints
│   │       ├── /retrospective             # Retrospective system
│   │       ├── /patterns                  # Success/failure patterns
│   │       ├── /logs                      # Log templates
│   │       └── /state                     # State management
│   │
│   ├── /platforms                         # Platform-specific extensions
│   │   └── /claude-code
│   │       ├── /rules                     # Path-specific rules (.claude/rules/)
│   │       └── /scripts                   # Hook scripts
│   │           ├── skill-inject.sh        # Auto skill injection
│   │           ├── completion-guard.sh    # Completion verification
│   │           ├── build-gate.sh          # Build gate
│   │           ├── phase-guard.sh         # Phase file constraints
│   │           ├── safe-guard.sh          # Destructive command blocking
│   │           └── e2e-marker.sh          # E2E result marker
│   │
│   ├── /project-types                     # Project type-specific config
│   │   ├── web-service/                   # SaaS, full-stack
│   │   ├── web-app/                       # BaaS-based
│   │   ├── api-backend/                   # API servers + agents/
│   │   ├── platform/                      # Frameworks/SDKs + agents/
│   │   ├── fintech/                       # Exchange/payment (Level 3 enforced)
│   │   ├── mobile-app/                    # Mobile apps
│   │   └── infra/                         # DevOps + agents/
│   │
│   └── /domains                           # Domain overlays (excluded from npm)
│
├── /src                                   # CLI source code
│   ├── index.ts                           # Entry point
│   ├── /commands                          # CLI commands
│   ├── /daemon                            # Background daemon
│   ├── /lib                               # Core library
│   ├── /types                             # TypeScript types
│   └── /utils                             # Utilities
│
├── /tests                                 # Tests (vitest)
│   ├── /unit
│   ├── /integration
│   └── /e2e
│
└── /docs                                  # Design documents
```

## Post-Initialization Project Structure

After running `tsq init -t web-service -l 2`:

```
/my-project
├── CLAUDE.md                              # PM role definition (agent instructions)
│
├── /.claude                               # Claude Code native structure
│   ├── settings.json                      # Claude Code settings (hooks included)
│   ├── /rules                             # Path-specific rules (platforms/claude-code/)
│   ├── /agents                            # 7 specialized agents
│   │   ├── tsq-architect.md               # Architecture design (Sonnet)
│   │   ├── tsq-developer.md               # Code implementation (Sonnet)
│   │   ├── tsq-qa.md                      # Verification/review (Sonnet)
│   │   ├── tsq-security.md                # Security audit (Sonnet)
│   │   ├── tsq-dba.md                     # DB design (Sonnet)
│   │   ├── tsq-designer.md                # UI/UX design (Sonnet)
│   │   └── tsq-librarian.md               # Phase recording specialist (Sonnet)
│   │
│   ├── /skills                            # Domain skillsets (selected by project type)
│   │   ├── tsq-protocol/                  # Agent common protocol
│   │   ├── controller/                    # Context DI + SSOT injection
│   │   ├── coding/                        # Coding rules + rules/
│   │   ├── testing/                       # Test strategies + references/
│   │   ├── typescript/                    # TypeScript patterns + rules/
│   │   ├── frontend/(react|nextjs)/       # Frontend + Vercel rules
│   │   ├── backend/node/                  # Node.js backend
│   │   ├── database/                      # DB design + rules/
│   │   ├── product-audit/                 # Product audit (7 areas, 156 items)
│   │   │   ├── rules/                     # Audit protocol, scoring, FP guard
│   │   │   ├── checklists/               # 01-security ~ 07-functional
│   │   │   └── templates/                # Report + improvement plan
│   │   ├── methodology/(tdd|bdd)/         # Selected methodology
│   │   └── ...                            # Others (per config)
│   │
│   └── /knowledge                         # Agent reference knowledge
│       ├── /checklists                    # Security, accessibility, SSOT validation
│       └── /templates                     # Output formats (task-result, etc.)
│
└── /.timsquad                             # TimSquad dedicated structure
    ├── config.yaml                        # Project settings (name, type, level, domain, stack)
    │
    ├── /ssot                              # SSOT documents (5-14 per level)
    │   ├── prd.md
    │   ├── planning.md
    │   ├── requirements.md
    │   ├── service-spec.md
    │   ├── data-design.md
    │   ├── test-spec.md (L2+)
    │   ├── glossary.md (L2+)
    │   ├── error-codes.md (L2+)
    │   ├── security-spec.md (L3+)
    │   └── /adr
    │       └── ADR-000-template.md
    │
    ├── /process                           # Workflow definitions
    │   ├── workflow.xml
    │   └── phase-checklist.yaml
    │
    ├── /constraints                       # Constraints
    │   ├── ssot-schema.xml
    │   └── competency-framework.xml
    │
    ├── /state                             # State management
    │   ├── current-phase.json
    │   ├── decisions.jsonl                # Decision Log (accumulated during Phase)
    │   ├── phase-memory.md               # Previous Phase summary (sliding window)
    │   ├── onboarding-progress.json      # Onboarding state (grill queue, SSOT readiness)
    │   └── /meta-index                    # Code/UI structure index
    │
    ├── /trails                            # Per-phase thinking process archive
    │   ├── phase-{id}.md                  # Phase Trail (work/decision/carry-over summary)
    │   └── phase-{id}-decisions.jsonl     # Decision Log archive
    │
    ├── /feedback                          # Feedback store (created at runtime)
    │
    ├── /retrospective                     # Retrospective data
    │   ├── /cycles
    │   ├── /metrics
    │   ├── /patterns
    │   └── /improvements
    │
    ├── /.daemon                             # Daemon runtime state (gitignored)
    │   ├── daemon.pid                       # Daemon PID
    │   ├── session-state.json               # Session metrics (tokens, events)
    │   └── drift-warnings.json              # SSOT Drift warnings (docs >7 days stale)
    │
    └── /logs                              # 3-tier logs (L1→L2→L3)
```

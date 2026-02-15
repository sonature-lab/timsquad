[**English**](file-structure.en.md) | [한국어](file-structure.md)

# File Structure

> Document separated from PRD Section 8

## Template Structure

```
/timsquad
├── /templates
│   ├── /common
│   │   ├── CLAUDE.md.template           # Project CLAUDE.md template
│   │   ├── config.template.yaml         # TimSquad configuration template
│   │   │
│   │   ├── /claude                      # → Copied to .claude/
│   │   │   ├── /agents                  # Agent definitions (Markdown)
│   │   │   │   ├── tsq-planner.md
│   │   │   │   ├── tsq-developer.md
│   │   │   │   ├── tsq-qa.md
│   │   │   │   ├── tsq-security.md
│   │   │   │   ├── tsq-dba.md
│   │   │   │   ├── tsq-designer.md
│   │   │   │   ├── tsq-prompter.md
│   │   │   │   └── tsq-retro.md
│   │   │   │
│   │   │   └── /skills                  # Skill definitions (SKILL.md)
│   │   │       ├── coding/
│   │   │       ├── testing/
│   │   │       ├── architecture/
│   │   │       ├── planning/
│   │   │       ├── database/
│   │   │       ├── security/
│   │   │       ├── ui-ux/
│   │   │       ├── retrospective/
│   │   │       └── methodology/
│   │   │           ├── tdd/
│   │   │           ├── bdd/
│   │   │           └── ddd/
│   │   │
│   │   └── /timsquad                    # → Copied to .timsquad/
│   │       ├── /ssot                    # SSOT document templates
│   │       │   ├── prd.template.md
│   │       │   ├── planning.template.md
│   │       │   ├── requirements.template.md
│   │       │   ├── service-spec.template.md
│   │       │   ├── data-design.template.md
│   │       │   ├── test-spec.template.md
│   │       │   └── adr/
│   │       │
│   │       ├── /generators              # Document generators (XML)
│   │       │   ├── prd.xml              # PRD generator
│   │       │   ├── requirements.xml     # Requirements generator
│   │       │   ├── service-spec.xml     # API spec generator
│   │       │   └── data-design.xml      # Data design generator
│   │       │
│   │       ├── /process                 # Process definitions
│   │       │   ├── workflow-base.xml
│   │       │   ├── validation-rules.xml
│   │       │   └── state-machine.xml
│   │       │
│   │       ├── /constraints             # Constraints
│   │       │   ├── ssot-schema.xml
│   │       │   └── competency-framework.xml
│   │       │
│   │       ├── /feedback                # Feedback routing
│   │       │   └── routing-rules.yaml
│   │       │
│   │       ├── /retrospective           # Retrospective system
│   │       │   ├── cycle-report.template.md
│   │       │   ├── metrics-schema.json
│   │       │   └── patterns/
│   │       │
│   │       ├── /logs                    # Log templates
│   │       │   ├── _template.md
│   │       │   └── _example.md
│   │       │
│   │       └── /state                   # State management
│   │           └── workspace.xml
│   │
│   ├── /web-service
│   │   ├── /process
│   │   └── config.yaml
│   │
│   ├── /fintech
│   │   ├── /process
│   │   └── config.yaml                  # consensus: always
│   │
│   └── /...
│
├── /scripts
│   ├── init.sh                          # tsq init
│   ├── log.sh                           # tsq log
│   ├── status.sh                        # tsq status
│   ├── retro.sh                         # tsq retro
│   └── feedback.sh                      # tsq feedback
│
├── /install
│   └── install.sh                       # Installation script
│
└── /cli
    └── index.js
```

## Post-Initialization Project Structure

```
/my-project
├── CLAUDE.md                            # Project context (PM role definition)
│
├── /.claude                             # Claude Code native structure
│   ├── /agents                          # Agent definitions
│   │   ├── tsq-planner.md               # Planning/design
│   │   ├── tsq-developer.md             # Implementation
│   │   ├── tsq-qa.md                    # Verification/review
│   │   ├── tsq-security.md              # Security
│   │   ├── tsq-dba.md                   # DB design
│   │   ├── tsq-designer.md              # UI/UX design
│   │   ├── tsq-prompter.md              # Prompt optimization
│   │   └── tsq-retro.md                 # Retrospective analysis
│   │
│   └── /skills                          # Skill files
│       ├── coding/SKILL.md
│       ├── testing/SKILL.md
│       ├── architecture/SKILL.md
│       ├── planning/SKILL.md
│       ├── database/SKILL.md
│       ├── security/SKILL.md
│       ├── ui-ux/SKILL.md
│       ├── retrospective/SKILL.md
│       └── methodology/
│           ├── tdd/SKILL.md
│           ├── bdd/SKILL.md
│           └── ddd/SKILL.md
│
└── /.timsquad                           # TimSquad dedicated structure
    ├── config.yaml                      # Project settings (name, type, level + v4.0: domain, platform, stack)
    │
    ├── /ssot                            # SSOT documents
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
    ├── /generators                      # Document generators (XML)
    │   ├── prd.xml
    │   ├── requirements.xml
    │   ├── service-spec.xml
    │   └── data-design.xml
    │
    ├── /process                         # Process definitions
    │   ├── workflow-base.xml
    │   ├── validation-rules.xml
    │   └── state-machine.xml
    │
    ├── /constraints                     # Constraints
    │   ├── ssot-schema.xml
    │   └── competency-framework.xml
    │
    ├── /state                           # Current state
    │   ├── current-phase.json
    │   └── workspace.xml
    │
    ├── /knowledge                       # Project knowledge
    │   ├── tribal.md
    │   ├── lessons.md
    │   └── constraints.md
    │
    ├── /feedback                        # Feedback system
    │   └── routing-rules.yaml
    │
    ├── /retrospective                   # Retrospective system
    │   ├── /cycles                      # Per-cycle reports
    │   ├── /metrics                     # Metrics data
    │   ├── /patterns                    # Success/failure patterns
    │   └── /improvements                # Improvement history
    │       ├── /prompts
    │       └── /templates
    │
    └── /logs                            # Work logs
        └── _template.md
```

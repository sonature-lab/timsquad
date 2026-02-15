[**English**](knowledge-architecture.en.md) | [한국어](knowledge-architecture.md)

# Knowledge Architecture

## Overview

Knowledge is **specific, project-tailored information** that agents and skills reference.
It contains only **project-specific decisions, concrete metrics, stack configurations, and distilled expertise** -- not the general theories or patterns that Claude already knows.

### Core Principle

> **"Don't include what Claude already knows. Include only what it doesn't."**

---

## Distribution Model

### Knowledge Structure Within the npm Package (Separated by Type)

```
templates/common/claude/knowledge/
├── common/                         <- Common to all project types
│   ├── checklists/
│   │   ├── security.md
│   │   ├── accessibility.md
│   │   ├── ssot-validation.md
│   │   └── architecture-review.md
│   ├── templates/
│   │   ├── task-result.md
│   │   └── sequence-report.md
│   └── conventions/
│       └── api-standards.md
├── web-service/                    <- web-service specific
│   ├── design-system/
│   │   ├── tokens.md
│   │   ├── components.md
│   │   ├── interactions.md
│   │   └── forms.md
│   └── checklists/
│       └── accessibility.md        <- More detailed frontend version
├── api-backend/                    <- api-backend specific
│   ├── conventions/
│   │   └── logging.md
│   └── checklists/
│       └── database-standards.md
├── fintech/                        <- fintech specific
│   ├── domains/
│   │   └── regulations.md          <- PCI-DSS, financial regulations
│   └── checklists/
│       └── compliance.md
├── web-app/                        <- web-app specific
│   └── design-system/
│       └── ...
├── platform/                       <- platform specific
│   └── infrastructure/
│       └── ...
└── infra/                          <- infra specific
    └── infrastructure/
        └── ...
```

### Local Project Structure

```
tsq init --type fintech
-> common/* + fintech/* copied as empty shells

Local .claude/knowledge/
├── checklists/security.md          <- From common (empty shell)
├── checklists/compliance.md        <- From fintech (empty shell)
├── templates/task-result.md        <- From common (empty shell)
├── domains/regulations.md          <- From fintech (empty shell)
├── conventions/api-standards.md    <- From common (empty shell)
└── ml/custom-loss.md               <- Created locally during work (populated)
```

### Flow

1. On `tsq init --type {type}`, merge `common/` + `{type}/` knowledge and copy to local as empty shells
2. Agents/skills reference via knowledge-refs, populating content as needed during work
3. When new knowledge is needed during a project, create locally using `distillation skill` + `tsq knowledge` CLI
4. (Future) The Retrospective system sends project-generated knowledge as GitHub PRs for review/sharing

---

## config.yaml Knowledge Section

```yaml
knowledge:
  # Automatically selected (based on common + type)
  # Knowledge from common/ and the corresponding type/ is automatically included
  sources:
    - common       # Always included
    - fintech      # Determined by tsq init --type

  # Knowledge additionally created locally during the project
  local:
    - ml/custom-architecture
    - domains/additional-regulations
```

On `tsq init --type fintech`:
- `common/*` -> All copied (empty shells)
- `fintech/*` -> All copied (empty shells)
- When type-specific knowledge overlaps with common, the **type-specific version takes priority** (override)

Operates with the same pattern as AGENT_PRESETS, but knowledge is merged at the **directory level**:

```typescript
// Knowledge copy logic (pseudo)
async function deployKnowledge(type: ProjectType, destDir: string) {
  // 1. Copy all of common/
  await copyKnowledgeDir('common', destDir);
  // 2. Copy type-specific (overrides files overlapping with common)
  await copyKnowledgeDir(type, destDir);
}
```

---

## Knowledge Types

### 1. Curated Knowledge (npm Distribution)

Distilled and verified, included in the npm package. Copied locally based on config during `tsq init`.

| Category | Content | Target Agents |
|----------|---------|---------------|
| `checklists/` | Validation checklists (security, accessibility, SSOT, DB, architecture) | QA, Security, Architect |
| `templates/` | Output formats (task-result, sequence-report) | All |
| `design-system/` | Tokens, component anatomy, interactions, form UX | Designer |
| `platforms/` | Stack-specific configurations (Supabase RLS, Vercel headers, etc.) | Developer, Security |
| `conventions/` | API response formats, naming, logging standards | Developer, QA |
| `infrastructure/` | CI/CD, monitoring SLO, containers | DevOps role |
| `domains/` | Domain regulations (fintech, healthcare, etc.) | Security, Developer |

### 2. Local Knowledge (Project-Generated)

Generated during the project using the `distillation skill`. Project-specific.

| Category | Content | When Generated |
|----------|---------|----------------|
| `ml/` | ML/DL paper distillation, formulas-to-code, hyperparameters | Before project start or during implementation |
| `math/` | Specialized mathematical formulas used in the project | During implementation |
| `theory/` | CS theory such as distributed systems, compilers | During implementation |
| `mobile/` | Platform differences, offline patterns | For mobile projects |
| Project ADR | Architecture Decision Records | After Architect sequence analysis |

### 3. (Future) Shared Knowledge

When the Retrospective system determines that "this knowledge is generally useful," it submits a GitHub PR.
After review and approval, it is included as curated knowledge in the next npm version.

```
Local knowledge -> Retro analysis -> GitHub PR -> Review -> Merged into npm package
```

---

## Knowledge Distillation

### Skill: `skills/knowledge-distillation/SKILL.md`

A methodology skill used when creating new knowledge.

**Process:**

| Step | Content | Output |
|------|---------|--------|
| 1. Source Identification | Papers, official docs, experience | Source type + URL/reference |
| 2. Core Extraction | Filter only "what Claude doesn't know" | Core contribution in 1-2 sentences |
| 3. Formulas to Code | Convert mathematical formulas to implementable code | Python/TS code blocks |
| 4. Algorithm Extraction | pseudo-code -> actual code | Implementable code |
| 5. Parameter Organization | Paper values + experimental values | Baseline/warning/danger table |
| 6. Comparative Analysis | Differences from existing techniques | Diff table |
| 7. Pitfall Identification | Common mistakes during implementation, tricks not in the paper | Caveats list |

**Source-Specific Strategies:**

| Source | Extraction Points |
|--------|-------------------|
| Papers (PDF/URL) | Formulas, algorithms, hyperparameters, ablation results |
| Official Documentation | Configuration code, constraints, migration guides |
| Team Experience | Patterns, anti-patterns, specific metric thresholds, troubleshooting |
| Existing Codebase | Established conventions, recurring patterns, dependency rules |

### CLI: `tsq knowledge`

```bash
# Generate scaffold with empty template
tsq knowledge create ml/architectures/mqa
# -> .claude/knowledge/ml/architectures/mqa.md

# Validate required sections
tsq knowledge validate
# -> ❌ ml/architectures/mqa.md: "Formulas to Code" is empty
# -> ✅ checklists/security.md: Complete

# Check inventory
tsq knowledge list
# -> 12 files (8 complete, 3 incomplete, 1 empty)
#    Sources: 9 from npm, 3 local
```

---

## Knowledge File Standard Format

Common structure for all knowledge files:

```markdown
# {Knowledge Title}

## Metadata
- Category: {checklists | design-system | platforms | ...}
- Target Agents: {developer, qa, ...}
- Source: {npm | local}
- Version: {semver}

## Applicability
- Project Type: {web-service | api-backend | fintech | ...}
- Stack: {Related technology stack}

## Core Rules
{Rules/criteria specific to this project that Claude doesn't know}

## Concrete Examples

### ✅ Correct Pattern
\```{lang}
// Specific code example
\```

### ❌ Incorrect Pattern
\```{lang}
// Common mistakes Claude tends to make
\```

## Numeric Thresholds
| Item | Baseline | Warning | Danger |
|------|:--------:|:-------:|:------:|

## Checklist
- [ ] {Specific verification item}
```

### Additional Sections for ML/Theory

```markdown
## Formulas to Code
$$L = ...$$
\```python
def compute_loss(...):
    ...
\```

## Hyperparameters
| param | Paper Value | Experimental Value | Notes |
|-------|:-----------:|:------------------:|-------|

## vs Existing Techniques
| | Existing | This Technique |
|--|----------|----------------|

## Caveats
- {Important tricks not written in the paper}
```

---

## Agent/Skill Integration

### Agent -> Knowledge References

How agents reference knowledge in their .md files:

```xml
<knowledge-refs>
  <ref path="knowledge/checklists/security.md">Stack-specific security checklist</ref>
  <ref path="knowledge/platforms/supabase.md">Supabase RLS, Auth configuration</ref>
</knowledge-refs>
```

Agents read and reference the files specified in `<knowledge-refs>` at work start.
Knowledge uses on-demand loading (not included in agent description -> saves context).

### Skill Structure (Progressive Disclosure Similar to Knowledge)

Skills with 500+ lines also apply the same on-demand structure as knowledge:

```
skills/{name}/
├── SKILL.md           <- Index (~100 lines, always loaded)
└── rules/             <- Individual patterns (on-demand, same principle as knowledge)
    └── {pattern}.md   <- frontmatter + Incorrect/Correct examples
```

- **Agent**: Always loaded -> identity/rules only (91-131 lines)
- **Skill SKILL.md**: Always loaded -> index only (80-100 lines)
- **Skill rules/**: On-demand -> detailed patterns (20-80 lines/file)
- **Knowledge**: On-demand -> reference data (checklists, standards, templates)

When creating a new skill: refer to `skills/_template/` (SKILL.md + rules/_template.md)

---

## Implementation Status

### Completed

| Item | Status |
|------|:------:|
| Knowledge directory structure | ✅ |
| Basic checklists/templates | ✅ (7 files) |
| Agent knowledge-refs integration | ✅ |
| config.yaml knowledge section | ✅ |
| `tsq knowledge` CLI (create/validate/list) | ✅ |

### Future Plans

| Item | Description |
|------|-------------|
| Distillation Skill | Automated distillation from papers/docs to Knowledge |
| design-system/ knowledge expansion | UI/UX domain checklists |
| Retrospective -> Knowledge integration | Automatically suggest patterns discovered in retrospectives as Knowledge |
| Knowledge version management (semver) | Introduce after validating usage patterns |

---

## Knowledge Plans by Domain

Details: see `memory/knowledge-plan.md`

| Tier | Domain | Priority |
|:----:|--------|:--------:|
| 1 | UI/UX Design (Claude's weakest area), Security (stack-specific) | Phase 2 |
| 2 | Frontend, Backend, DevOps (project-tailored) | At project start |
| 3 | Architecture ADR, Mobile | As needed |
| 4 | Kernel, VM, Network | Relevant projects only |
| Special | ML/Math/Theory (distillation required) | Relevant projects only |

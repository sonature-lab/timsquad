[**English**](authoring-guide.en.md) | [한국어](authoring-guide.md)

# TimSquad Authoring Guide

> A comprehensive guide for writing agent prompts, skills, and Knowledge files.
> Refer to this document when creating new agents or skills.

---

## 1. Agent Prompt Design

### 1.1 File Location and Naming

```
templates/common/claude/agents/tsq-{role}.md
```

- The role should be a single lowercase English word (e.g., `developer`, `qa`, `security`)
- Filename = `tsq-` + role name + `.md`

### 1.2 Required Structure (v3.1+)

```yaml
# Front Matter
---
name: tsq-{role}
description: |
  TimSquad {role} agent.
  {One-line description}.
  Use when: "{list of trigger keywords}"
model: sonnet              # sonnet (default) | opus (when advanced reasoning is needed)
tools: [Read, Write, Edit, Bash, Grep, Glob]
skills: [tsq-protocol, {domain1}, {domain2}]   # Required skill injection (tsq-protocol is mandatory)
---
```

```xml
<agent role="{role}">

  <!-- 1. Role Summary -->
  <role-summary>
    {Core role and responsibilities of this agent, 1-2 lines}
  </role-summary>

  <!-- 2. Required References (SSOT, Knowledge) -->
  <prerequisites>
    - `.timsquad/.daemon/task-context.json` — Refer to this first when exploring code
    - `knowledge/checklists/{name}.md` — {description}
    - `knowledge/platforms/{name}.md` — {description}
  </prerequisites>

  <!-- 3-6: Role-specific optional sections (see 1.3 below) -->

  <!-- 7. Input Contract -->
  <input-contract priority="critical">
    <required>
      <field name="task_id">Task ID (e.g., P3-S001-T001)</field>
      <field name="description">{Task description}</field>
      <field name="ssot_refs">SSOT documents to reference (e.g., service-spec.md#section)</field>
    </required>
    <optional>
      <field name="{name}">{description}</field>
    </optional>
  </input-contract>

  <!-- 8. Rules -->
  <rules>
    <must>{Things that must be done}</must>
    <must-not>{Things that must never be done}</must-not>
  </rules>

  <!-- 9. Completion Protocol -->
  <task-completion-protocol priority="critical">
    Return in knowledge/templates/task-result.md format.
  </task-completion-protocol>

  <!-- 10. Feedback Routing -->
  <feedback-routing>
    <!-- See 1.6 -->
  </feedback-routing>

</agent>
```

> **v3.1 Changes**: `<mandatory-skills>` replaced with frontmatter `skills:` array.
> `<persona>` removed. TSQ CLI protocol separated into `tsq-protocol` shared skill.
> `<file-access-rule>` merged into `<prerequisites>`.

### 1.3 Role-Specific Optional Sections

Additional sections inserted between the required structure elements depending on the agent type:

| Type | Additional Sections | Purpose |
|------|---------------------|---------|
| Implementation (developer, dba) | `<responsibilities>` | Scope of responsibility |
| Review (architect, qa) | `<analysis-axes>`, `<role-definition>` | Review criteria axes, does/does-not |
| Specialist (security) | `<role-definition>`, `<analysis-axes>` | Analysis scope + reporting criteria |
| Design (designer) | `<responsibilities>`, `<ui-meta-index-update>` | Scope of responsibility + UI meta output |

**`<role-definition>` example:**
```xml
<role-definition priority="critical">
  <hierarchy>
    <position>QA Engineer (sub-agent)</position>
    <reports-to>PM (main session)</reports-to>
    <scope>Sequence-level review</scope>
  </hierarchy>
  <does>
    <item>Cross-validation between code and SSOT</item>
  </does>
  <does-not>
    <item>Direct code modification (provides feedback only)</item>
  </does-not>
</role-definition>
```

**`<analysis-axes>` example:**
```xml
<analysis-axes>
  <axis id="1" name="Intra-sequence consistency">Conflict/duplication checks between tasks</axis>
  <axis id="2" name="SSOT conformance">Implementation vs. specification alignment verification</axis>
  <axis id="3" name="Cross-sequence continuity">Connectivity with preceding/following sequences</axis>
</analysis-axes>
```

### 1.4 Priority Attribute Rules

| Value | Meaning | Usage Criteria |
|-------|---------|----------------|
| `priority="critical"` | Violation invalidates deliverables | input-contract, task-completion-protocol |
| `priority="high"` | Strongly recommended; violation degrades quality | prerequisites |
| (none) | Recommended | role-summary, general rules |

### 1.5 TSQ CLI Integration Protocol

> **v3.1+**: The TSQ CLI protocol has been separated into the `tsq-protocol` shared skill.
> Since all agents automatically receive it via frontmatter `skills: [tsq-protocol, ...]`,
> there is no need to write a `<tsq-cli>` section directly in the agent prompt.
>
> Details: `templates/common/claude/skills/tsq-protocol/SKILL.md`

### 1.6 Feedback Routing Design

A 3-level structure. Customize triggers to fit your domain.

```xml
<feedback-routing>
  <level id="1" severity="Minor">
    <triggers>{Issues that can be self-fixed immediately}</triggers>
    <route>Fix immediately</route>
  </level>
  <level id="2" severity="Major">
    <triggers>{Issues requiring design changes or SSOT modifications}</triggers>
    <route>Main session (PM)</route>
  </level>
  <level id="3" severity="Critical">
    <triggers>{Requirement changes or data loss risks}</triggers>
    <route>Main session (PM) -> User approval</route>
    <requires-approval>true</requires-approval>
  </level>
</feedback-routing>
```

**Level Classification Criteria:**

| Level | Decision Question | Examples |
|-------|-------------------|----------|
| L1 | Can the agent fix it immediately? | Lint errors, type errors, naming violations, missing tests |
| L2 | Does it require SSOT or design document changes? | API spec mismatches, schema changes needed, architecture issues |
| L3 | Does it require a user business decision? | Missing requirements, scope changes, data loss risk, compliance |

### 1.7 Base Agent vs Overlay Structure (In Design, Not Yet Implemented)

> **Note**: This section describes the Composition Layer design planned for v4.0. It is not yet implemented and may change in the future.

In v4.0, agent prompts will be generated using a composition approach.

#### Directory Structure

```
agents/
  base/                    # Role-specific base processes (L1)
    tsq-developer.md       # Common processes, feedback routing
  overlays/
    platform/              # Platform-specific protocols (L2)
      claude-code.md
    domain/                # Domain-specific thinking models (L3)
      ml/
        _common.md         # Common to all roles
        developer.md       # developer x ML (optional)
```

#### Base Agent Writing Rules

- Include only **processes and role definitions** that are platform/domain-agnostic
- Claude Code-specific content (tsq wf, JSONL, etc.) goes in platform overlay
- ML/Fintech-specific rules go in domain overlay

#### Overlay File Format

```markdown
---
type: platform-overlay | domain-overlay
target: claude-code | ml | fintech | ...
version: 1.0.0
---

<overlay>
  <section strategy="REPLACE|APPEND|MERGE|KEEP">
    content
  </section>
</overlay>
```

#### Merge Strategies

| strategy | Behavior | Used For |
|----------|----------|----------|
| REPLACE | Replace base section with overlay | role-summary, input-contract, task-completion-protocol |
| APPEND | Append overlay to end of base section | rules, does-not |
| MERGE | Combine file lists (deduplicate) | prerequisites, knowledge-refs |
| KEEP | Keep base, ignore overlay | feedback-routing |

#### Domain Overlay Writing Guide

1. `_common.md` -- Domain rules that apply to all roles (required)
2. `{role}.md` -- Rules that apply only to a specific role (optional; if absent, only _common applies)
3. If rules are 3 lines or fewer, consolidate into `_common.md`
4. If role-specific rules are 5 lines or more, separate into `{role}.md`

#### Platform Overlay Writing Guide

1. Include all role-common rules in a single `.md` file
2. `<task-completion-protocol strategy="REPLACE">` is required -- platform-specific completion protocol
3. Include only tools/file paths/protocols; no domain logic

---

## 2. Skill File Authoring

### 2.1 File Location and Structure (v3.2+)

```
templates/common/claude/skills/
  {domain}/
    {skill-name}/
      SKILL.md              # Required -- Index (<120 lines, always loaded)
      rules/                # Coding rules ("do this / don't do that")
      | +-- _sections.md    # Optional -- Category definitions (when 5+ rules)
      | +-- {rule-name}.md  # Individual rules (20-80 lines, impact level)
      references/           # In-depth guides ("know this")
      | +-- {topic}.md      # Comprehensive guides (50-200 lines)
      scripts/              # Executable automation ("run this")
        +-- {verb-noun}.sh  # Shell scripts (0 tokens)
```

**Subdirectory Role Comparison:**

| Directory | Purpose | Loading Method | Example |
|-----------|---------|----------------|---------|
| `rules/` | "Do this / Don't do that" -- Incorrect/Correct patterns | Read (on-demand) | `async-parallel.md` |
| `references/` | "Know this" -- Comprehensive knowledge, external docs | Read (on-demand) | `owasp-2025-guide.md` |
| `scripts/` | "Run this" -- Validation, generation, analysis | Bash (on-demand) | `check-secrets.sh` |

### 2.2 SKILL.md Required Structure (v3.2+)

```markdown
---
name: {skill-name}
description: |
  {What it does + when to use it, 1024 characters or less.}
  {The agent determines whether the skill is needed based on this description alone.}
version: "1.0.0"
tags: [{tag1}, {tag2}]
user-invocable: false
---

# {Skill Title}

{1-2 line purpose description}

## Philosophy

- {Core principle 1}
- {Core principle 2}
- {Core principle 3}

## Resources

| Priority | Type | Resource | Description |
|----------|------|----------|-------------|
| CRITICAL | rule | [{rule-name}](rules/{rule-name}.md) | {1-line description} |
| HIGH | ref | [{topic}](references/{topic}.md) | {1-line description} |
| MEDIUM | script | [{script}](scripts/{script}.sh) | {1-line description} |

## Quick Rules

### {Category 1}
- {Inline rule}
- {Inline rule}

## Checklist

| Priority | Item |
|----------|------|
| CRITICAL | {Mandatory check item} |
| HIGH | {Important check item} |
```

> **v3.2 Changes**: XML wrapper (`<skill>`) removed -> pure Markdown.
> Resources table serves as the unified index for rules/references/scripts.
> `version` and `tags` added to frontmatter.

### 2.3 Design Principles

**120-Line Rule:** SKILL.md should be an index of 120 lines or fewer. Since it is always loaded, token efficiency takes priority.

**Progressive Disclosure (3 stages):**
1. **frontmatter** (~100 tokens) -- Matching decision in skill listing
2. **SKILL.md** (<2000 tokens) -- Loaded on activation
3. **rules/references/scripts** (on-demand) -- Only when needed

**Priority System:**
- `CRITICAL` -- Deliverable rejected on violation (Vercel impact compatible)
- `HIGH` -- Strongly recommended; violation degrades quality
- `MEDIUM` -- Optionally applied
- `LOW` -- For reference

**Reference Model:** [vercel-react-best-practices](https://github.com/anthropics/skills) (132.9K installs, SKILL.md index + 45 rules files)

### 2.4 How to Write rules/ Files

Files that teach coding pattern "dos and don'ts" through Incorrect/Correct code examples.

```markdown
---
title: {Rule Title}
impact: HIGH                    # CRITICAL | HIGH | MEDIUM | LOW
impactDescription: {Impact metric}  # e.g., "2-10x improvement", "200-800ms reduction"
tags: {tag1}, {tag2}
---

## {Rule Title}

**Impact: {LEVEL} ({impact metric})**

{Why this rule is needed, 1-2 lines}

**Incorrect ({what's wrong}):**
```{lang}
// Wrong pattern
```

**Correct ({what's right}):**
```{lang}
// Correct pattern
```
```

**Writing Guidelines:**
- 20-80 lines (keep it concise)
- Frontmatter required: `title`, `impact`, `tags`
- `impactDescription` with quantified metrics recommended
- Incorrect/Correct code examples required
- Omit "things Claude already knows" -> include only project-specific patterns
- Filename: kebab-case (e.g., `async-parallel.md`, `error-handling.md`)

**Add `_sections.md` when there are 5+ rules:** A category index to help agents navigate.

### 2.5 How to Write references/ Files

In-depth guides, external document summaries, migration instructions, etc. that agents should reference during work.

```markdown
---
title: {Reference Title}
category: guide                 # guide | api | migration | external
source: internal                # URL (if based on external source) or "internal" (self-authored)
---

# {Reference Title}

{1-2 lines on what this reference covers}

## Key Concepts
{Core concepts}

## Detailed Guide
{Detailed guide}

## Common Pitfalls
{Common mistakes}

## Examples
{Specific code/configuration examples}
```

**Writing Guidelines:**
- 50-200 lines (in-depth guide)
- Frontmatter required: `title`, `category`
- `source` recommended: record the original URL if based on external material
- Difference from rules/: not rules but "knowledge to know"
- Agents load via Read only when needed (on-demand)
- Filename: kebab-case (e.g., `nextjs-migration.md`, `auth-patterns.md`)

### 2.6 How to Write scripts/ Files

Automation scripts that agents execute via Bash. They are not loaded into context, so they incur 0 token cost.

```bash
#!/bin/bash
# @name {script-name}
# @description {What this script does, 1 line}
# @args {Required argument descriptions}
# @output {Output format (text | json | exit-code)}

set -euo pipefail

PROJECT_ROOT="${1:-.}"
# Script logic...
```

**Writing Guidelines:**
- `set -euo pipefail` is required (safe execution)
- No external URL calls (security)
- Header metadata required: `@name`, `@description`, `@args`, `@output`
- Filename: `{verb}-{noun}.sh` (e.g., `check-secrets.sh`, `validate-schema.sh`)

### 2.7 Decision Flowchart: rules vs references vs scripts

Criteria for deciding which subdirectory to place content in:

```
[When adding new content]
  +-- "Run this and check the result" -> scripts/
  +-- "Use this pattern instead of that one" (Incorrect/Correct) -> rules/
  +-- "You need to know this topic in depth" (guide/reference) -> references/
  +-- "Can be summarized in 3 lines or fewer" -> Inline in SKILL.md Quick Rules
```

| Question | Yes -> | No -> |
|----------|--------|-------|
| Is it an executable script? | `scripts/` | Next question |
| Can it be expressed as an Incorrect/Correct pattern? | `rules/` | Next question |
| Is it in-depth knowledge of 50+ lines? | `references/` | Inline in SKILL.md |

### 2.8 External Skill Import Guide

Procedure for importing external skills from sources like [skills.sh](https://skills.sh) (operated by Vercel, 58K+ skills).

#### Security Inspection Protocol (Required)

All external skill files must be inspected before import:

| Risk Level | Target | Inspection Items |
|------------|--------|------------------|
| **Highest** | scripts/ | `curl`, `wget`, `eval`, `exec`, `base64 -d`, external URLs, filesystem manipulation, environment variable exfiltration, obfuscation |
| **Medium** | references/, rules/ | Prompt injection (`ignore previous instructions`), agent behavior manipulation, hidden instructions |
| **Low** | SKILL.md | Excessive permissions in `allowed-tools`, description prompt injection |

#### Import Procedure

1. **Verify source**: Check install count, repository stars, recent updates
2. **Expert review**: Review all files directly with Read
3. **Security scan**: Automated Grep scan for risky patterns + manual verification
4. **Customize**: Unify to TimSquad frontmatter/format, remove unnecessary content
5. **Place**: Place in `templates/common/claude/skills/{domain}/`
6. **Audit record**: Record inspection results in `docs/external-skill-audit.en.md`

---

## 3. Knowledge File Authoring

### 3.1 Directory Structure

```
templates/common/claude/knowledge/
  checklists/       # Validation checklists (referenced by agents during work)
  templates/        # Output format templates (task-result, sequence-report)
  platforms/        # Platform-specific knowledge (Supabase, Vercel, etc.)
  domains/          # Domain-specific knowledge (fintech, healthcare, etc.)
```

### 3.2 How to Write checklists/

```markdown
# {Checklist Name}

## {Category 1}

| Item | Verification Criteria | Severity |
|------|----------------------|----------|
| {Check item} | {Specific verification method} | {Critical/Major/Minor} |
```

**Core Principles:**
- Each item must be answerable with yes/no
- Specify severity to connect with feedback routing
- Separate stack-specific sections conditionally (e.g., `## Supabase Projects`)

### 3.3 How to Write templates/

Output format templates are referenced from the agent's `<task-completion-protocol>`.

```markdown
# {Template Name}

## Structure

### Summary
{1-2 line summary}

### Changes
| File | Change | Reason |
|------|--------|--------|
| {file:line} | {Change description} | {SSOT rationale} |

### TSQ Log Enrich
```bash
tsq log enrich {agent} --json '{...}'
```

## Few-shot Example
{Including a concrete completed example significantly improves agent output quality}
```

### 3.4 How to Write platforms/ & domains/

`_template.md` provides the standard structure:

```markdown
# {Platform/Domain} Reference

## Core Concepts
{Fundamental knowledge that agents need to know}

## Common Patterns
{Code patterns, API usage}

## Caveats and Pitfalls
{Common mistakes, anti-patterns}

## Project Application Checklist
- [ ] {Verification item}
```

---

## 4. XML Tag Conventions

### 4.1 Tag Usage Principles

- Use structural XML **only in agent prompts**
- Skills/Knowledge use Markdown-based format with minimal XML
- No HTML tags (use Markdown tables)

### 4.2 Custom Tag Creation Rules

| Rule | Description |
|------|-------------|
| Lowercase kebab-case | `<file-access-rule>`, `<task-completion-protocol>` |
| Clear meaning | `<rules>` (O), `<r>` (X) |
| priority attribute | Only 3 levels: critical / high / (none) |
| id attribute | When unique identification is needed (feedback level, axis) |
| Self-descriptive | Purpose should be identifiable from the tag name alone |

### 4.3 Tag Hierarchy Rules

```
<agent>                          # Top-level (1 per file)
  <file-access-rule>             # Configuration (priority attribute)
  <mandatory-skills>             # References
    <skill path="...">           # Individual skill
  <knowledge-refs>               # References
    <ref path="...">             # Individual document
  <persona>                      # Text block
  <input-contract>               # Structured data
    <required>/<optional>        # Field groups
      <field name="...">        # Individual field
  <rules>                        # List
    <must>/<must-not>            # Individual rules
  <tsq-cli>                      # Protocol
    <on-task-start>              # Event handler
    <forbidden>                  # Prohibited actions
  <task-completion-protocol>     # Output format
  <feedback-routing>             # Routing
    <level id="N" severity=".."> # Individual level
</agent>
```

---

## 5. ID System and Naming

### 5.1 ID Patterns

| Target | Pattern | Example |
|--------|---------|---------|
| Phase | `P{N}` | P1, P2, P3 |
| Sequence | `P{N}-S{NNN}` | P3-S001, P3-S002 |
| Task | `P{N}-S{NNN}-T{NNN}` | P3-S001-T001 |
| Feedback | `FB-{NNN}` | FB-001 |
| Blocker | `BLK-{NNN}` | BLK-001 |
| Approval | `APV-{NNN}` | APV-001 |

### 5.2 Phase Numbers

| Phase | ID | Description |
|-------|----|-------------|
| Planning | P1 | PRD, requirements definition |
| Design | P2 | Architecture, UI/UX, DB design |
| Implementation | P3 | Implementation |
| Review | P4 | QA, code review |
| Security | P5 | Security audit |
| Deployment | P6 | Deployment |

### 5.3 File Naming

| File Type | Pattern | Example |
|-----------|---------|---------|
| Agent | `tsq-{role}.md` | `tsq-developer.md` |
| Skill | `{domain}/{skill}/SKILL.md` | `testing/tdd/SKILL.md` |
| Checklist | `{domain}-{name}.md` | `security.md` |
| SSOT | `{english-name}.md` (kebab-case) | `service-spec.md` |
| Log | `{task-id}.json` | `P3-S001-T001.json` |

---

## 6. Anti-Patterns

Patterns to avoid when writing new agents or skills.

### 6.1 Agent Prompts

| Anti-Pattern | Problem | Correct Approach |
|--------------|---------|------------------|
| Rules without SSOT references | Baseless instructions -> hallucination risk | Specify SSOT via `<prerequisites>` |
| Missing tsq-cli section | No log recording -> retrospective impossible | Must be included |
| No input-contract | PM doesn't know what to provide | Specify required/optional |
| No feedback-routing | Ambiguous behavior criteria when issues are found | Always define 3 levels |
| Overly detailed persona | Token waste | Keep to 3-4 lines |
| Mixing multiple roles | Ambiguous responsibility -> quality degradation | 1 agent = 1 role |

### 6.2 Skills

| Anti-Pattern | Problem | Correct Approach |
|--------------|---------|------------------|
| SKILL.md exceeding 120 lines | Full load every time -> token waste | Separate into rules/references/ |
| Abstract rules ("write good code") | Not actionable | Specific criteria (Incorrect/Correct patterns) |
| rules/ files without examples | Interpretation differences | Incorrect/Correct code examples required |
| Project-specific content | Not reusable | Separate into knowledge/ |
| Guide-style docs in rules/ | Purpose confusion | Separate into references/ (rules != knowledge) |
| External URL calls in scripts/ | Security risk | Allow local execution only |
| rules/references/ without frontmatter | Cannot be indexed | title, impact/category required |

### 6.3 Knowledge

| Anti-Pattern | Problem | Correct Approach |
|--------------|---------|------------------|
| Listing generic knowledge ("What is REST API...") | The model already knows this | Project-specific rules only |
| Non-verifiable checklist items | "Is performance good?" -> ambiguous criteria | "Is response under 100ms?" |
| Missing severity in checklists | Cannot connect to feedback routing | Specify Critical/Major/Minor |

---

## 7. New Agent Addition Checklist

When creating a new agent, verify the following items in order.

### Design Phase

- [ ] Does the role not overlap with existing agents?
- [ ] Does it follow the 1 agent = 1 role principle?
- [ ] Do the skill files needed for this role exist? (If not, write them first)
- [ ] Do the checklists needed for this role exist?

### Prompt Writing

- [ ] frontmatter: name, description, model, tools, `skills: [tsq-protocol, ...]`
- [ ] `<role-summary>` -- 1-2 line role summary
- [ ] `<prerequisites>` -- task-context.json + SSOT + knowledge references
- [ ] Role-specific optional sections (see 1.3)
- [ ] `<input-contract>` -- required/optional field definitions
- [ ] `<rules>` -- at least 3 must/must-not each
- [ ] `<task-completion-protocol>` -- references task-result.md
- [ ] `<feedback-routing>` -- 3 levels (triggers + route)

### Registration

- [ ] Create `templates/common/claude/agents/tsq-{role}.md` file
- [ ] `src/types/project.ts` -- Add to `AgentType` union
- [ ] `src/types/config.ts` -- Add to `AgentsConfig`
- [ ] `src/lib/agent-generator.ts` -- Add to `AGENT_PRESETS`
- [ ] `CLAUDE.md.template` -- Add delegation rule to delegation-rules

### Verification

- [ ] `npm run build` passes
- [ ] Agent file is generated during `tsq init`
- [ ] input-contract fields are provided when invoking the agent
- [ ] Returns task-result.md format on completion
- [ ] tsq log enrich call confirmed

---

## 8. New Skill Addition Checklist

### SKILL.md

- [ ] Create `templates/common/claude/skills/{domain}/{skill}/SKILL.md`
- [ ] frontmatter: `name`, `description` (1024 chars or less), `version`, `tags`, `user-invocable`
- [ ] Philosophy section -- 3-5 core principles
- [ ] Resources table -- Unified index for rules/references/scripts
- [ ] Quick Rules -- Inline core rules
- [ ] Checklist -- CRITICAL/HIGH/MEDIUM check items
- [ ] **Maintain 120 lines or fewer**

### Subdirectories (as needed)

- [ ] `rules/` -- Individual rules (frontmatter: title, impact, tags, Incorrect/Correct examples)
- [ ] `references/` -- In-depth guides (frontmatter: title, category, source)
- [ ] `scripts/` -- Automation (metadata header: @name, @description, set -euo pipefail)
- [ ] Create `rules/_sections.md` category index when there are 5+ rules

### Registration

- [ ] Add to agent frontmatter `skills: [...]` array
- [ ] `src/types/config.ts` -- Add to `SkillsConfig` (if applicable)
- [ ] `src/lib/skill-generator.ts` -- Add to `SKILL_PRESETS` (if applicable)

### Verification

- [ ] `npm run build` passes
- [ ] `npm run test:prompt` -- frontmatter + structure validation passes
- [ ] Confirm SKILL.md is <= 120 lines
- [ ] Security inspection completed for external skill imports (see section 2.8)

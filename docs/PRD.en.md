[**English**](PRD.en.md) | [한국어](PRD.md)

# TimSquad PRD v2.0
**AI Agent Development Process Framework**

Version: 2.0
Last Updated: 2026-02-15
Author: Eric

---

## 1. Overview

### 1.1 One-Line Definition
> **"The standard process for software development in the AI era"** — A framework for continuously improving high-quality software generation in Claude Code through SSOT-based documentation, optimized agent roles, and retrospective learning.

**CLI Command:** `tsq` (or `timsquad`)

```bash
tsq init --type web-service   # Initialize project
tsq status                    # Check current status
tsq retro                     # Run retrospective
tsq log                       # View work logs
```

### 1.2 Core Formula
```
Optimized Role Definitions + Advanced Skills + Retrospective Learning = Continuously Improving High-Quality Output
```

### 1.3 Target Users

> **"For developers who want structure, not magic."**

**Primary:**
- Senior developers who want a structured process
- Solo CTOs / Tech leads (need team-level quality alone)
- Developers who value documentation and consistency

**Secondary:**
- Developers who want to do side projects properly
- Teams looking to systematize AI agent usage

**NOT for:**
- People who want "just do it for me" → Recommend oh-my-claudecode
- People who just want to code fast → Use Claude Code directly
- People who dislike learning curves

**Required Skills:**
- Basic Claude Code usage experience
- Understanding of software development processes
- Someone who values documentation

### 1.4 Philosophy

| oh-my-* | **TimSquad** |
|---------|--------------|
| "Zero learning curve" | **"Structure leads to better results"** |
| Does it for you | **Developer stays in control** |
| Speed first | **Quality + consistency first** |
| Magic | **Structure** |

### 1.5 Theoretical Foundations
| Theory/Paper | Core Concept | TimSquad Application |
|---------|---------|--------------|
| **Agentsway** (2025) | Prompting Agent, Retrospective Learning, LLM Consortium | Prompt optimization layer, retrospective learning, consensus on key decisions |
| **ACM TOSEM** (2025) | Competency Mapping, Performance Evaluation | Competency framework, performance metrics |
| **Agentic SE** (2025) | AGENT.md, Meta-Prompt Files | Layered meta-prompt structure |
| **FRAME** (2025) | Feedback-Driven Refinement | Level-based feedback routing |

### 1.6 Differentiation from Existing Solutions

| Category | CrewAI/LangGraph | Superpowers | Agentsway | **TimSquad** |
|-----|-----------------|-------------|-----------|--------------|
| Purpose | General-purpose AI agents | Coding discipline | Academic methodology | **Full SDLC + practical templates** |
| Documentation | Optional | Code-centric | Formal | **SSOT (Single Source of Truth)** |
| Learning | None | None | LLM fine-tuning | **Retrospective learning (prompts/templates)** |
| Prompts | Write manually | Skill-based | Prompting Agent | **Prompter + layered AGENT.md** |
| Feedback | Simple | Code review | Formal | **Level-based routing** |
| Ready to use | Requires learning | Install and use | No implementation | **Project type-specific templates** |

### 1.7 Differentiation from oh-my-opencode / oh-my-claudecode

| Category | oh-my-* | **TimSquad** |
|-----|---------|--------------|
| **Type** | Execution plugin | Methodology + orchestration |
| **Orchestration** | LLM decides (token consumption) | **Program decides (0 tokens)** |
| **Strengths** | Parallel execution, speed | **Documentation, process, token efficiency** |
| **Documentation** | None | **Full SSOT system** |
| **Feedback** | None | **Level-based routing** |
| **Learning** | None | **Retrospective learning** |
| **Token efficiency** | Average | **High (40-60% savings)** |

**Relationship:** Not competition but **complementary**. Can combine TimSquad (process) + oh-my-* (execution optimization).

### 1.8 Token Efficiency Design

> **"LLMs should only think — repetitive work goes to programs"** — 100% savings on orchestration tokens, 40-60% overall savings.

**Details:** [docs/token-efficiency.en.md](token-efficiency.en.md)

---

## 2. Core Concepts

### 2.1 Fountain Model

SSOT documents have sequential dependencies; actual work runs in parallel. Feedback is routed by level, and retrospective learning improves the process at the end of each cycle.

### 2.2 SSOT (Single Source of Truth) Document System

Composed of 15 document types. Required documents are automatically determined based on the project level (1=MVP, 2=Standard, 3=Enterprise) and type.

### 2.3 Agent Structure

| Agent | Role | Model |
|---------|------|------|
| Planner | Integrated PM/planning/design, direct user communication | Opus |
| Developer | SSOT-based code implementation, TDD | Sonnet |
| QA | Code review, test verification, feedback classification | Sonnet |
| DBA | DB design, query optimization | Sonnet |
| Designer | UI/UX design, accessibility | Sonnet |
| Security | Security verification, OWASP | Sonnet |
| Architect | Architecture design, ADR | Sonnet |

**Details:** [docs/core-concepts.en.md](core-concepts.en.md)

---

## 3. Feedback & Retrospective

### 3.1 Feedback Routing

| Level | Name | Trigger Examples | Routing | Approval |
|-------|------|-----------|-------|------|
| 1 | Implementation fix | test_failure, lint_error, type_error | Developer | Not required |
| 2 | Design fix | architecture_issue, api_mismatch, security | Planner (Architect) | Not required |
| 3 | Planning fix | requirement_ambiguity, scope_change | Planner (Planning) → User | **Required** |

### 3.2 Retrospective Learning

Development cycle completion → Log collection → Pattern analysis → Improvement suggestions → User approval → Prompt/template updates. Practical implementation through prompt/template improvements instead of LLM fine-tuning.

**Details:** [docs/feedback-and-retrospective.en.md](feedback-and-retrospective.en.md)

---

## 4. Competency & Consortium

- **Competency Framework**: ACM TOSEM-based agent performance measurement (technical/soft skills + performance metrics)
- **LLM Consortium**: Multi-model consensus applied only to key decisions (fintech: mandatory, others: optional)

---

## 5. Project Types

### 5.1 Supported Types

| Type | Description | Additional SSOT | Additional Agents | Consensus Default |
|-----|------|----------|-------------|-----------------|
| **web-service** | SaaS, web apps | ui-ux-spec, screen-flow | designer, frontend, backend | Optional |
| **platform** | Frameworks, SDKs | api-design, integration-spec | api-designer, doc-writer | Optional |
| **api-backend** | API servers, microservices | api-design | api-designer | Optional |
| **fintech** | Exchanges, payments | security-spec, compliance | security, compliance, auditor | **Mandatory** |
| **infra** | DevOps, automation | infra-spec | devops, sre | Optional |

### 5.2 Common Agents

```
┌── planner      # PRD, planning, architecture
├── prompter     # Prompt optimization
├── developer    # Implementation
├── dba          # DB design
└── qa           # Testing
```

---

## 6. File Structure

Structure generated after project initialization (`tsq init`):

```
/my-project
├── CLAUDE.md                   # PM role definition
├── .claude/
│   ├── agents/                 # Agents (tsq-*.md)
│   ├── skills/                 # Skills (SKILL.md)
│   └── settings.json
└── .timsquad/
    ├── config.yaml             # Settings (name, type, level, domain, platform, stack)
    ├── ssot/                   # SSOT documents
    ├── generators/             # XML document generators
    ├── state/                  # Workflow state
    ├── knowledge/              # tribal, lessons, constraints
    ├── feedback/               # Routing rules
    ├── retrospective/          # Retrospective system
    └── logs/                   # Work logs
```

**Details:** [docs/file-structure.en.md](file-structure.en.md)

---

## 7. Prompter Agent

Applies the Prompting Agent concept from Agentsway. Transforms the Planner's intent into optimized prompts.

- Prompt template management and version control
- Prompt improvement based on retrospective results
- Structure: Context → Task → Constraints → Output Format → Examples

---

## 8. Log Automation

Automatically handled at the program layer with 0 tokens. Details: [docs/log-architecture.en.md](log-architecture.en.md)

| Type | Purpose | Retrospective Analysis Target |
|-----|------|-------------|
| work | Work content | Yes |
| error | Errors/issues | Yes |
| decision | Decisions made | Yes |
| status | Current status | - |
| feedback | Feedback content | Yes |

---

## 9. Core Value Proposition

**"Even working solo, the output matches team-process quality"** — Agent multi-pass verification (Architect + Developer + QA + Security + DBA) substitutes for code reviews and design reviews.

---

## 10. Tech Stack

| Category | Technology |
|-----|------|
| CLI | Node.js (npm/npx distribution) |
| Prompts | Markdown + YAML frontmatter |
| Configuration | YAML (timsquad.config.yaml) |
| Standard | Anthropic Agent Skills standard |
| Distribution | GitHub → npm registry |
| CI/CD | GitHub Actions |
| Retrospective analysis | Claude API (Haiku for cost) |

---

## 11. Version History

| Version | Key Changes |
|------|----------|
| v3.1 | Prompt architecture optimization (CLAUDE.md slimming, XML standardization, tsq-protocol separation) |
| v3.2 | Advanced skill architecture (rules/references/scripts system, Vercel 22 rules) |
| v3.3 | Multi-platform foundation (templates/ refactoring, L2/L3 feedback auto-actions) |

---

## 12. Appendix

### 12.1 References
- Anthropic Skills: https://github.com/anthropics/skills
- Agentsway Paper: https://arxiv.org/abs/2510.23664
- ACM TOSEM LLM-Based Multi-Agent Systems: https://dl.acm.org/doi/10.1145/3712003
- Agentic SE Paper: https://arxiv.org/abs/2509.06216
- Superpowers: https://github.com/obra/superpowers
- Andrej Karpathy Skills (CLAUDE.md behavioral guidelines): https://github.com/forrestchang/andrej-karpathy-skills

### 12.2 Glossary
| Term | Definition |
|-----|------|
| SSOT | Single Source of Truth |
| Fountain Model | Hybrid of sequential SSOT + parallel work |
| Planner | Main agent integrating PM/planning/design |
| Prompter | Dedicated prompt optimization agent (Agentsway) |
| Retrospective Learning | Template/prompt improvement after cycle completion |
| LLM Consortium | Multi-model consensus on key decisions |
| Feedback Routing | Assigning appropriate handlers based on feedback level |
| Competency Framework | Per-agent technical/performance measurement system |
| ADR | Architecture Decision Record |

---

## 13. Related Documents

| Document | Description |
|------|------|
| [core-concepts.en.md](core-concepts.en.md) | Fountain model, SSOT, agent/skill structure details |
| [token-efficiency.en.md](token-efficiency.en.md) | Token efficiency design |
| [feedback-and-retrospective.en.md](feedback-and-retrospective.en.md) | Feedback routing + retrospective learning system |
| [file-structure.en.md](file-structure.en.md) | Template structure + post-initialization structure |
| [log-architecture.en.md](log-architecture.en.md) | 3-tier log system (L1→L2→L3) |
| [knowledge-architecture.en.md](knowledge-architecture.en.md) | Knowledge system design |
| [meta-index-architecture.en.md](meta-index-architecture.en.md) | Meta Index design |
| [authoring-guide.en.md](authoring-guide.en.md) | Agent/skill/knowledge authoring guide |

---

**Document End**

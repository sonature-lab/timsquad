[**English**](meta-index-architecture.en.md) | [한국어](meta-index-architecture.md)

# Meta Index Architecture

> Finalized as of v2.1.0+ implementation. Confirmed 2026-02-14.

---

## 1. Overview

A **structural map** of the codebase: manages file/method-level mechanical data (auto-extracted via AST) + semantic data (provided by agents) in JSON format.
Frontend components are indexed separately as a **UI layer** to preserve design intent.

### Purpose

- Enable the Architect to understand structure, quality, and dependencies without directly reading code
- Serve as a framework improvement asset when collecting patterns across projects
- Preserve UI structure + design intent of frontend components (for scaffolding future projects)

File format: JSON (machine-generated and machine-read files)

---

## 2. Storage Location

```
.timsquad/state/meta-index/
├── summary.json              ← Overall summary (~2KB, Architect reads this first)
├── {module}.json             ← Detailed code structure per module
├── pending.jsonl             ← Code semantic queue
├── ui-pending.jsonl          ← UI semantic queue
└── ui-index/
    └── components.json       ← UI component index
```

- `.timsquad/` contains runtime-generated data
- Module-level splitting enables partial loading even in large-scale projects
- `.gitignore` target (runtime data)
- `tsq init` automatically creates the `ui-index/` directory

---

## 3. 2-Layer Model (Mechanical + Semantic)

All indexing is split into two layers: mechanical (AST automatic) + semantic (provided by agent/user).

### Code Index (Existing)

| Layer | Extraction Method | Token Cost | Data |
|-------|-------------------|:----------:|------|
| **Mechanical** | @swc/core AST parser | 0 | File line count, classes, interfaces, exports, imports, methods (name/params/returnType/startLine/endLine) |
| **Semantic** | Developer agent return or `tsq mi stage` | During LLM work | description, pattern, semanticTag, algorithm, complexity, etc. |

### UI Index (New)

| Layer | Extraction Method | Token Cost | Data |
|-------|-------------------|:----------:|------|
| **Mechanical** | @swc/core JSX AST parser | 0 | componentName, componentType, props, slots, hooks, eventHandlers, conditionalRenders, forwardRef/Suspense/ErrorBoundary detection |
| **Semantic** | Designer agent return or `tsq mi stage` | During LLM work | layout, designTokens, states, animations, accessibility, responsive |

---

## 4. Directory-Level Indexing

### 4.1 Purpose

File/method-level indexing alone cannot answer **"what role does this directory serve?"**.
In particular, in a monorepo, the agent cannot know whether `packages/payment/` is a domain requiring fintech-level security
or whether `packages/shared/` is a shared library where backward compatibility matters.

The Directory level fills the gap between File and Module (Summary):

```
Summary (overall)
  └── Module (directory) → DirectoryEntry (mechanical + semantic) ← New
       └── File (mechanical + semantic)
            └── Method (mechanical + semantic)
```

### 4.2 Types

> Source: `src/types/meta-index.ts`

```typescript
interface DirectoryMechanical {
  fileCount: number;
  subdirectories: string[];
  primaryLanguage: string;        // Based on file extension statistics (e.g. "typescript")
  topExports: string[];           // Top exports from child files (top 5)
  totalLines: number;             // Sum of child files
}

interface DirectorySemantic {
  description?: string;           // "Payment domain core logic"
  purpose?: string;               // "domain-logic" | "infrastructure" | "ui-components" | "shared-utils" | "api-routes"
  domain?: string;                // "payment" | "auth" — monorepo workspace mapping
  boundaryType?: string;          // "module" | "package" | "app" | "library"
  tags?: string[];
  owner?: string;                 // Owner/team
}

interface DirectoryEntry {
  path: string;
  mechanical: DirectoryMechanical;
  semantic?: DirectorySemantic;
  indexedAt: string;
}
```

### 4.3 Storage Structure

Included as a `directory` field in `ModuleIndex`:

```typescript
interface ModuleIndex {
  generatedAt: string;
  directory?: DirectoryEntry;     // Metadata for the directory itself
  files: Record<string, FileEntry>;
}
```

Also exposed as semantic in `ModuleSummaryEntry` of `MetaIndexSummary`:

```typescript
interface ModuleSummaryEntry {
  files: number;
  methods: number;
  patterns?: Record<string, number>;
  semantic?: DirectorySemantic;   // Immediately visible in summary
}
```

### 4.4 Data Sources

| Source | Auto/Manual | Data |
|--------|-------------|------|
| Aggregation during AST parsing | Automatic (mechanical) | fileCount, subdirectories, primaryLanguage, topExports, totalLines |
| `tsq mi stage <dir>` | Manual (semantic) | description, purpose, domain, boundaryType, tags, owner |
| `timsquad.config.yaml` workspaces | Automatic (semantic) | domain, boundaryType — auto-injected from config |
| Agent task-log | Semi-automatic (semantic) | Recorded when the directory's purpose is identified during work |

### 4.5 Monorepo Workspace Integration

When `timsquad.config.yaml` has a `workspaces` field, it is automatically mapped to DirectorySemantic during meta-index rebuild:

```yaml
# timsquad.config.yaml
workspaces:
  apps/web:
    domain: general-web
    stack: [nextjs, typescript]
    level: 2
  packages/payment:
    domain: fintech
    stack: [node, typescript]
    level: 3
    tags: [pci-dss, encryption]
```

During rebuild, the DirectorySemantic for the `packages/payment/` module is auto-injected:
```json
{
  "domain": "fintech",
  "boundaryType": "package",
  "tags": ["pci-dss", "encryption"]
}
```

### 4.6 Usage

| Consumer | Usage |
|----------|-------|
| **Architect** | Reads summary → directory semantic to instantly understand module roles |
| **Developer** | Checks purpose/domain of the target directory, then auto-applies appropriate skills |
| **Security** | Directories with `domain: "fintech"` automatically get enhanced security rules applied |
| **Composition Layer** | Workspace domain mapping → enables different overlays per directory *(planned for v4.0)* |

---

## 5. Code Index Type System

> Source: `src/types/meta-index.ts`

### FileEntry

```typescript
interface FileEntry {
  path: string;
  mechanical: FileMechanical;     // AST auto-extracted
  semantic?: FileSemantic;         // Agent-provided
  indexedAt: string;               // ISO timestamp
  mtime: number;                   // epoch ms (for drift detection)
  lastTaskRef?: string;            // task log reference
}
```

### FileMechanical (AST Automatic)

```typescript
interface FileMechanical {
  totalLines: number;
  classes: string[];
  interfaces: string[];
  exports: string[];
  imports: Array<{ module: string; names: string[] }>;
  dependencies: string[];
  methods: Record<string, MethodEntry>;
}
```

### MethodEntry

```typescript
interface MethodEntry {
  mechanical: MethodMechanical;    // startLine, endLine, params, returnType, isAsync, isExported, decorators
  semantic?: MethodSemantic;       // function, algorithm, timeComplexity, spaceComplexity, description
}
```

### MetaIndexSummary

```typescript
interface MetaIndexSummary {
  generatedAt: string;
  schemaVersion: string;
  totalFiles: number;
  totalMethods: number;
  totalClasses: number;
  totalInterfaces: number;
  modules: Record<string, ModuleSummaryEntry>;
  alerts: MetaIndexAlerts;
  health: MetaHealthScore;
  uiHealth?: UIHealthScore;        // UI layer (present only when applicable)
}
```

### Health Score

```typescript
interface MetaHealthScore {
  overall: number;                 // 0-100
  freshness: number;               // % files with current mtime
  semanticCoverage: number;        // % files with semantic data
  interfaceHealth: number;         // % clean exports/imports
  alertCount: number;
  uiHealthScore?: number;          // UI layer overall (present only when applicable)
}
```

---

## 6. UI Index Type System

> Source: `src/types/ui-meta.ts`

### ComponentMechanical (AST Auto-Extracted)

```typescript
interface ComponentMechanical {
  componentName: string;           // Function/class name
  componentType: string;           // JSX top-level tag (form, div, section, etc.)
  propsInterface?: string;         // Props type name (e.g. "LoginFormProps")
  propsFields?: PropsField[];      // Props field list
  slots: SlotMechanical[];         // JSX child components
  hooks: HookUsage[];              // useState, useEffect, etc.
  eventHandlers: string[];         // onClick, onChange, etc.
  conditionalRenders: ConditionalRender[];
  hasForwardRef: boolean;
  hasSuspense: boolean;
  hasErrorBoundary: boolean;
  contextUsage: string[];          // useContext references
}
```

### SlotMechanical

```typescript
interface SlotMechanical {
  name: string;                    // JSX tag name (Button, TextInput, etc.)
  props: Record<string, string>;   // Passed props
  compositionType: 'direct' | 'compound' | 'render-prop' | 'conditional' | 'passthrough';
  condition?: string;              // Condition variable name (for conditional type)
  children?: SlotMechanical[];     // Nested (for compound type)
  renderProp?: string;             // Prop name (for render-prop type)
}
```

### ComponentSemantic (Provided by Designer Agent)

```typescript
interface ComponentSemantic {
  semanticTag?: string;            // "authentication", "navigation", etc.
  layout?: LayoutIntent;           // type + containerWidth
  designTokens?: DesignTokens;     // intent + token dual structure
  slots?: Record<string, SlotSemantic>;
  states?: Record<string, StateDefinition>;  // trigger + visual + exit 3-tuple
  animations?: Record<string, AnimationIntent>;
  accessibility?: AccessibilityMeta;
  responsive?: string[];
}
```

### Design Token Dual Structure

```typescript
interface TokenPair {
  intent: string;                  // L1 Semantic: "primary", "compact"
  token: string;                   // L2 Design System: "blue-500", "space-4"
}

interface DesignTokens {
  color?: TokenPair;
  spacing?: TokenPair;
  typography?: TokenPair;
  borderRadius?: TokenPair;
  shadow?: TokenPair;
}
```

### State 3-Tuple

```typescript
interface StateDefinition {
  trigger: string;                 // "form submit", "API error"
  visual: string;                  // "button disabled + spinner"
  exit: string;                    // "API response received"
}
```

### UI Health Score

```typescript
interface UIHealthScore {
  overall: number;                 // 0-100, weighted
  componentCount: number;
  semanticCoverage: number;        // % with semantic data (weight: 40%)
  accessibilityCoverage: number;   // % with accessibility meta (weight: 35%)
  statesCoverage: number;          // % with states defined (weight: 25%)
}
```

---

## 7. AST Parser Implementation

### Code Parser (`src/lib/ast-parser.ts`)

Parses TypeScript/JavaScript files using @swc/core. The `parseFile()` function extracts `FileMechanical`.

- Detects classes, interfaces, exports, imports
- Extracts function/method signatures (params, returnType, isAsync, isExported)
- Extracts decorators

### UI Parser (`src/lib/ui-parser.ts`)

Parses JSX/TSX files using @swc/core. The `parseComponent()` function extracts `ComponentMechanical`.

- **Component detection**: An exported function that returns a JSXElement is a React component
  - Detects FunctionDeclaration, ArrowFunction, and forwardRef wrapping
- **componentType**: Top-level tag name of the JSX return (form, div, fragment, etc.)
- **Slot extraction**: Recursive JSX children traversal
  - Tags starting with uppercase = component slots
  - `Comp.Sub` pattern → compositionType: 'compound'
  - `{children}` → compositionType: 'passthrough'
  - `renderXxx` prop → compositionType: 'render-prop'
  - `{condition && <Comp/>}` → compositionType: 'conditional'
- **Hook extraction**: Searches for `useXxx()` calls, useState destructuring, useContext name extraction
- **eventHandlers**: `onXxx` props from JSX attributes
- **conditionalRenders**: `&&` (logical-and), `?:` (ternary)
- **Props extraction**: TsTypeReference (named), TsTypeLiteral (inline), ObjectPattern (destructured)
- Non-component files → returns `null`

### Parser Selection Rationale

| Parser | Init Time | Per File | Memory | Selected |
|--------|:---------:|:--------:|:------:|:--------:|
| ts-morph | 2~5s | 50~200ms | 100~300MB | No (unusable in Hooks) |
| @swc/core | ~100ms | 5~20ms | ~50MB | Yes |
| tree-sitter | ~10ms | 1~5ms | ~20MB | Yes (for multi-language support) |

---

## 8. Index Core Logic

### Code Index (`src/lib/meta-index.ts`)

- `rebuildIndex(projectRoot)`: Full rebuild
  1. Collect `.ts/.js` files via glob (with exclude patterns)
  2. Classify by module (directory-based)
  3. AST parse each file → FileMechanical
  4. Merge semantic data from pending.jsonl
  5. **Run UI index together** (when tsx/jsx files exist)
  6. Save per-module JSON
  7. Generate summary.json (including alerts, health, uiHealth)
- `updateIndex(projectRoot, changedFiles?)`: Re-parse only changed files
- `generateSummary(modules, uiHealth?)`: Calculate statistics + alerts + health

### UI Index (`src/lib/ui-index.ts`)

- `rebuildUIIndex(projectRoot, metaDir)`: Full rebuild
  1. Target only `.tsx/.jsx` files
  2. `parseComponent()` for each file → skip if null
  3. Merge UI semantic data from ui-pending.jsonl
  4. Save `ui-index/components.json`
  5. Clear ui-pending.jsonl
- `updateUIIndex(projectRoot, metaDir, changedFiles?)`: Changed files only
- `calculateUIHealth(components)`: Weighted average
  - semanticCoverage 40% + accessibilityCoverage 35% + statesCoverage 25%
- `appendUIPending(metaDir, entry)`: Append to JSONL queue

### Code Index <-> UI Index Integration

`rebuildIndex()` and `updateIndex()` **run the UI index together**:

```
rebuildIndex()
  ├── Step 1~5: Build code index (existing)
  ├── Step 5.5: rebuildUIIndex() (UI layer)
  ├── Step 6: Save per-module JSON
  └── Step 7: Generate summary.json (including uiHealth)
```

UI failures are isolated with try/catch so they do not block the code index.

---

## 9. Alerts System

### MetaIndexAlerts

| Alert Type | Detection Criteria | Purpose |
|------------|-------------------|---------|
| `oversizedFiles` | totalLines > 300 | Refactoring candidates |
| `missingSemantics` | Files without semantic data (max 10) | Encourage semantic population |
| `driftDetected` | mtime mismatch (index time vs. current) | Re-indexing needed |
| `interfaceMismatches` | unused_export / missing_import | Consistency issues |

### Drift Detection

```typescript
interface DriftEntry {
  path: string;
  type: 'mtime_changed' | 'content_changed' | 'lines_changed' | 'deleted';
  indexedMtime: number;
  currentMtime: number;
}
```

---

## 10. CLI Commands

> `tsq meta-index` (alias: `tsq mi`)

### rebuild

Full rebuild. Builds code index + UI index simultaneously.

```bash
tsq mi rebuild
# → ✅ Meta index rebuilt: 42 files, 5 modules, 23 components
```

### update

Reflect only changes (based on pending queue + drift).

```bash
tsq mi update
```

### stats

Display overall statistics.

```bash
tsq mi stats
```

Output example:
```
  Meta Index Stats
  ─────────────────
  Overview
    Files indexed:       142
    Methods:             523
    Classes:              18
    Interfaces:           35
    Health Score:         87%

  UI Components
    Components:            23
    Semantic Coverage:     48%  (11/23)
    Accessibility:         65%  (15/23)
    States Defined:        39%  (9/23)
    UI Health Score:       52%

  Alerts
    Oversized files:        2
    Missing semantics:      8
    Drift detected:         0
```

### stage

Add semantic data to the pending queue.

```bash
# Code semantic (file)
tsq mi stage "src/auth/login.ts" \
  --method execute --algo hash-compare --tc "O(1)" --fn authenticate

# UI semantic (component)
tsq mi stage "src/components/LoginForm.tsx" \
  --layout flex-column --color-scheme primary --spacing compact \
  --responsive "mobile-first,md" \
  --state "loading:form submit:button disabled + spinner:API response"

# Directory semantic (new)
tsq mi stage "src/payment/" \
  --desc "Payment domain core logic" \
  --purpose domain-logic \
  --domain fintech \
  --boundary module \
  --tags "pci-dss,encryption" \
  --owner "payment-team"
```

File/UI-related options:

| Option | Description | Example |
|--------|-------------|---------|
| `--layout` | Layout intent | flex-column, grid, stack |
| `--color-scheme` | Color scheme intent | primary, secondary, danger |
| `--spacing` | Spacing intent | compact, normal, spacious |
| `--responsive` | Responsive breakpoints | mobile-first,md,lg |
| `--state` | State definition (name:trigger:visual:exit) | loading:submit:spinner:response |

Directory-related options:

| Option | Description | Example |
|--------|-------------|---------|
| `--desc` | Directory description | "Payment domain core logic" |
| `--purpose` | Role classification | domain-logic, infrastructure, ui-components, shared-utils, api-routes |
| `--domain` | Domain mapping | fintech, auth, general-web |
| `--boundary` | Boundary type | module, package, app, library |
| `--tags` | Tags (comma-separated) | pci-dss,encryption |
| `--owner` | Owner/team | payment-team |

### query / validate

```bash
tsq mi query --pattern "clean-*"       # Pattern filter
tsq mi query --alert oversized         # Alert items
tsq mi validate                        # Semantic validation
```

---

## 11. Designer Agent Integration

When the Designer agent completes component work, it includes a UI Meta Index table in the task-completion-protocol:

```markdown
### UI Meta Index Updates
| component | layout | colorScheme | spacing | states | responsive |
|-----------|--------|-------------|---------|--------|------------|
| LoginForm | flex-column | primary | compact | loading,error | mobile-first,md |

### Component States
| component | state | trigger | visual | exit |
|-----------|-------|---------|--------|------|
| LoginForm | loading | form submit | button disabled + spinner | API response |

### Accessibility
| component | ariaLabels | tabOrder | focusTrap | wcagLevel |
|-----------|------------|----------|-----------|-----------|
| LoginForm | yes | email,password,submit | no | AA |
```

The Hook parses this data and automatically records it to `ui-pending.jsonl` → reflected in the next `mi update`.

---

## 12. Metrics Integration

`tsq metrics` output includes Meta Index + UI statistics:

```
  Meta Index Health:       87%
  UI Components:           23
  UI Health Score:         52%
  UI Semantic:             48%
  Accessibility:           65%
```

Trend comparison:
```
  Meta Health:  87%  →  89%  (+2%)
  UI Health:    52%  →  58%  (+6%)
```

---

## 13. Integration Points

| Consumer | Usage |
|----------|-------|
| **Architect** | Accesses summary → module detail → code in order |
| **Designer** | Understands component structure via UI index, records semantic data |
| **QA** | Filters for pattern non-compliance/performance risks, checks accessibility coverage |
| **`tsq status`** | Displays file count, pattern distribution, Health Score |
| **`tsq metrics`** | Health score + UI Health trends |
| **Retro** | Tracks code quality changes per sequence/phase |
| **Developer** | Records semantic data via `tsq mi stage` |

---

## 14. Implementation File Map

### Types

| File | Role |
|------|------|
| `src/types/meta-index.ts` | Code index types (FileEntry, MethodEntry, Summary, Alerts, Health, Drift) |
| `src/types/ui-meta.ts` | UI index types (ComponentMechanical, ComponentSemantic, UIHealthScore) |

### Libraries

| File | Role |
|------|------|
| `src/lib/ast-parser.ts` | Code AST parser (@swc/core, FileMechanical extraction) |
| `src/lib/ui-parser.ts` | UI AST parser (@swc/core, ComponentMechanical extraction) |
| `src/lib/meta-index.ts` | Code index core (rebuild, update, summary, merge) |
| `src/lib/ui-index.ts` | UI index core (rebuild, update, health, pending) |

### CLI

| File | Role |
|------|------|
| `src/commands/meta-index.ts` | `tsq mi` subcommands (rebuild, update, stats, stage, query, validate) |
| `src/commands/metrics.ts` | Meta/UI statistics integrated into `tsq metrics` |

### Templates/Agents

| File | Role |
|------|------|
| `templates/base/agents/tsq-designer.md` | UI Meta Index completion protocol |
| `templates/base/knowledge/templates/task-result.md` | Optional UI section |
| `src/lib/template.ts` | Creates `ui-index/` directory during `tsq init` |

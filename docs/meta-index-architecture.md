[English](meta-index-architecture.en.md) | [**한국어**](meta-index-architecture.md)

# Meta Index Architecture

> v2.1.0+ 구현 완료 기준. 2026-02-14 확정.

---

## 1. 개요

코드베이스의 **구조적 맵**: 파일/메소드 수준 mechanical 데이터(AST 자동 추출) + semantic 데이터(에이전트 제공)를 JSON으로 관리.
프론트엔드 컴포넌트는 **UI 계층**으로 별도 인덱싱하여 디자인 의도까지 보존.

### 목적

- Architect가 코드를 직접 읽지 않고 구조, 품질, 의존성을 파악
- 프로젝트 간 패턴 수집 시 프레임워크 개선 에셋으로 활용
- 프론트엔드 컴포넌트의 UI 구조 + 디자인 의도 보존 (다음 프로젝트 스캐폴딩)

파일 형식: JSON (기계가 생성하고 기계가 읽는 파일)

---

## 2. 저장 위치

```
.timsquad/state/meta-index/
├── summary.json              ← 전체 요약 (~2KB, Architect가 먼저 읽음)
├── {module}.json             ← 모듈별 코드 구조 상세
├── pending.jsonl             ← 코드 semantic 대기열
├── ui-pending.jsonl          ← UI semantic 대기열
└── ui-index/
    └── components.json       ← UI 컴포넌트 인덱스
```

- `.timsquad/`는 런타임 생성 데이터
- 모듈별 분할로 대규모 프로젝트에서도 부분 로딩 가능
- `.gitignore` 대상 (런타임 데이터)
- `tsq init` 시 `ui-index/` 디렉토리 자동 생성

---

## 3. 2계층 모델 (Mechanical + Semantic)

모든 인덱싱은 mechanical(AST 자동) + semantic(에이전트/사용자 제공) 2계층으로 분리.

### 코드 인덱스 (기존)

| 계층 | 추출 방법 | 토큰 비용 | 데이터 |
|------|---------|:--------:|--------|
| **Mechanical** | @swc/core AST 파서 | 0 | 파일 라인수, 클래스, 인터페이스, exports, imports, 메소드(이름/파라미터/리턴타입/시작줄/끝줄) |
| **Semantic** | Developer 에이전트 리턴 또는 `tsq mi stage` | LLM 작업 중 | description, pattern, semanticTag, algorithm, complexity 등 |

### UI 인덱스 (신규)

| 계층 | 추출 방법 | 토큰 비용 | 데이터 |
|------|---------|:--------:|--------|
| **Mechanical** | @swc/core JSX AST 파서 | 0 | componentName, componentType, props, slots, hooks, eventHandlers, conditionalRenders, forwardRef/Suspense/ErrorBoundary 감지 |
| **Semantic** | Designer 에이전트 리턴 또는 `tsq mi stage` | LLM 작업 중 | layout, designTokens, states, animations, accessibility, responsive |

---

## 4. Directory 레벨 인덱싱

### 4.1 목적

파일/메소드 단위 인덱싱만으로는 **"이 디렉토리가 무슨 역할인지"** 파악할 수 없다.
특히 모노레포에서 `packages/payment/`가 fintech 수준 보안이 필요한 도메인인지,
`packages/shared/`가 하위 호환성이 중요한 공용 라이브러리인지 에이전트가 알 수 없다.

Directory 레벨은 File과 Module(Summary) 사이의 빈 레이어를 채운다:

```
Summary (전체)
  └── Module (디렉토리) → DirectoryEntry (mechanical + semantic) ← 신규
       └── File (mechanical + semantic)
            └── Method (mechanical + semantic)
```

### 4.2 타입

> 소스: `src/types/meta-index.ts`

```typescript
interface DirectoryMechanical {
  fileCount: number;
  subdirectories: string[];
  primaryLanguage: string;        // 파일 확장자 통계 기반 (e.g. "typescript")
  topExports: string[];           // 하위 파일의 주요 exports (상위 5개)
  totalLines: number;             // 하위 파일 합산
}

interface DirectorySemantic {
  description?: string;           // "결제 도메인 핵심 로직"
  purpose?: string;               // "domain-logic" | "infrastructure" | "ui-components" | "shared-utils" | "api-routes"
  domain?: string;                // "payment" | "auth" — monorepo workspace 매핑
  boundaryType?: string;          // "module" | "package" | "app" | "library"
  tags?: string[];
  owner?: string;                 // 담당자/팀
}

interface DirectoryEntry {
  path: string;
  mechanical: DirectoryMechanical;
  semantic?: DirectorySemantic;
  indexedAt: string;
}
```

### 4.3 저장 구조

`ModuleIndex`에 `directory` 필드로 포함:

```typescript
interface ModuleIndex {
  generatedAt: string;
  directory?: DirectoryEntry;     // 디렉토리 자체의 메타데이터
  files: Record<string, FileEntry>;
}
```

`MetaIndexSummary`의 `ModuleSummaryEntry`에도 semantic 노출:

```typescript
interface ModuleSummaryEntry {
  files: number;
  methods: number;
  patterns?: Record<string, number>;
  semantic?: DirectorySemantic;   // summary에서 즉시 확인 가능
}
```

### 4.4 데이터 소스

| 소스 | 자동/수동 | 데이터 |
|------|----------|--------|
| AST 파싱 시 집계 | 자동 (mechanical) | fileCount, subdirectories, primaryLanguage, topExports, totalLines |
| `tsq mi stage <dir>` | 수동 (semantic) | description, purpose, domain, boundaryType, tags, owner |
| `timsquad.config.yaml` workspaces | 자동 (semantic) | domain, boundaryType — config에서 자동 주입 |
| 에이전트 task-log | 반자동 (semantic) | 작업 중 디렉토리 목적 파악 시 기록 |

### 4.5 모노레포 workspace 연동

`timsquad.config.yaml`에 `workspaces` 필드가 있으면 meta-index rebuild 시 자동으로 DirectorySemantic에 매핑:

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

rebuild 시 `packages/payment/` 모듈의 DirectorySemantic에 자동 주입:
```json
{
  "domain": "fintech",
  "boundaryType": "package",
  "tags": ["pci-dss", "encryption"]
}
```

### 4.6 활용

| 소비자 | 활용 |
|--------|------|
| **Architect** | summary → directory semantic 읽고 모듈 역할 즉시 파악 |
| **Developer** | 작업 대상 디렉토리의 purpose/domain 확인 후 적절한 스킬 자동 적용 |
| **Security** | `domain: "fintech"` 디렉토리는 자동으로 보안 강화 룰 적용 |
| **Composition Layer** | workspace domain 매핑 → 디렉토리별 다른 overlay 적용 가능 *(v4.0 예정)* |

---

## 5. 코드 인덱스 타입 시스템

> 소스: `src/types/meta-index.ts`

### FileEntry

```typescript
interface FileEntry {
  path: string;
  mechanical: FileMechanical;     // AST 자동 추출
  semantic?: FileSemantic;         // 에이전트 제공
  indexedAt: string;               // ISO timestamp
  mtime: number;                   // epoch ms (drift 감지용)
  lastTaskRef?: string;            // task log 참조
}
```

### FileMechanical (AST 자동)

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
  uiHealth?: UIHealthScore;        // UI 계층 (있을 때만)
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
  uiHealthScore?: number;          // UI 계층 overall (있을 때만)
}
```

---

## 6. UI 인덱스 타입 시스템

> 소스: `src/types/ui-meta.ts`

### ComponentMechanical (AST 자동 추출)

```typescript
interface ComponentMechanical {
  componentName: string;           // 함수/클래스명
  componentType: string;           // JSX 최상위 태그 (form, div, section 등)
  propsInterface?: string;         // Props 타입명 (e.g. "LoginFormProps")
  propsFields?: PropsField[];      // Props 필드 목록
  slots: SlotMechanical[];         // JSX 자식 컴포넌트
  hooks: HookUsage[];              // useState, useEffect 등
  eventHandlers: string[];         // onClick, onChange 등
  conditionalRenders: ConditionalRender[];
  hasForwardRef: boolean;
  hasSuspense: boolean;
  hasErrorBoundary: boolean;
  contextUsage: string[];          // useContext 참조
}
```

### SlotMechanical

```typescript
interface SlotMechanical {
  name: string;                    // JSX 태그명 (Button, TextInput 등)
  props: Record<string, string>;   // 전달된 props
  compositionType: 'direct' | 'compound' | 'render-prop' | 'conditional' | 'passthrough';
  condition?: string;              // conditional인 경우 조건 변수명
  children?: SlotMechanical[];     // compound인 경우 중첩
  renderProp?: string;             // render-prop인 경우 prop명
}
```

### ComponentSemantic (Designer 에이전트 제공)

```typescript
interface ComponentSemantic {
  semanticTag?: string;            // "authentication", "navigation" 등
  layout?: LayoutIntent;           // type + containerWidth
  designTokens?: DesignTokens;     // intent + token 2중 구조
  slots?: Record<string, SlotSemantic>;
  states?: Record<string, StateDefinition>;  // trigger + visual + exit 3-tuple
  animations?: Record<string, AnimationIntent>;
  accessibility?: AccessibilityMeta;
  responsive?: string[];
}
```

### Design Token 2중 구조

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
  exit: string;                    // "API 응답 수신"
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

## 7. AST 파서 구현

### 코드 파서 (`src/lib/ast-parser.ts`)

@swc/core로 TypeScript/JavaScript 파일 파싱. `parseFile()` 함수가 `FileMechanical` 추출.

- 클래스, 인터페이스, exports, imports 감지
- 함수/메소드 시그니처 추출 (params, returnType, isAsync, isExported)
- decorator 추출

### UI 파서 (`src/lib/ui-parser.ts`)

@swc/core로 JSX/TSX 파일 파싱. `parseComponent()` 함수가 `ComponentMechanical` 추출.

- **컴포넌트 감지**: export된 함수가 JSXElement를 리턴하면 React 컴포넌트
  - FunctionDeclaration, ArrowFunction, forwardRef 래핑 모두 감지
- **componentType**: JSX return의 최상위 태그명 (form, div, fragment 등)
- **slots 추출**: JSX children 재귀 순회
  - 대문자 시작 태그 = 컴포넌트 슬롯
  - `Comp.Sub` 패턴 → compositionType: 'compound'
  - `{children}` → compositionType: 'passthrough'
  - `renderXxx` prop → compositionType: 'render-prop'
  - `{condition && <Comp/>}` → compositionType: 'conditional'
- **hooks 추출**: `useXxx()` 호출 탐색, useState destructuring, useContext 이름 추출
- **eventHandlers**: JSX attribute에서 `onXxx` prop
- **conditionalRenders**: `&&` (logical-and), `?:` (ternary)
- **Props 추출**: TsTypeReference(named), TsTypeLiteral(inline), ObjectPattern(destructured)
- 비컴포넌트 파일 → `null` 리턴

### 파서 선택 근거

| 파서 | 초기화 | 파일당 | 메모리 | 선택 |
|------|:------:|:-----:|:------:|:----:|
| ts-morph | 2~5초 | 50~200ms | 100~300MB | ❌ Hook에서 사용 불가 |
| @swc/core | ~100ms | 5~20ms | ~50MB | ✅ 선택 |
| tree-sitter | ~10ms | 1~5ms | ~20MB | ✅ 멀티언어 시 |

---

## 8. 인덱스 코어 로직

### 코드 인덱스 (`src/lib/meta-index.ts`)

- `rebuildIndex(projectRoot)`: 전체 재구축
  1. `.ts/.js` 파일 glob 수집 (exclude 패턴 적용)
  2. 모듈별 분류 (디렉토리 기반)
  3. 각 파일 AST 파싱 → FileMechanical
  4. pending.jsonl에서 semantic 데이터 merge
  5. **UI 인덱스 함께 실행** (tsx/jsx 파일 있을 때)
  6. 모듈별 JSON 저장
  7. summary.json 생성 (alerts, health, uiHealth 포함)
- `updateIndex(projectRoot, changedFiles?)`: 변경분만 재파싱
- `generateSummary(modules, uiHealth?)`: 통계 + alerts + health 계산

### UI 인덱스 (`src/lib/ui-index.ts`)

- `rebuildUIIndex(projectRoot, metaDir)`: 전체 재구축
  1. `.tsx/.jsx` 파일만 대상
  2. 각 파일 `parseComponent()` → null이면 skip
  3. ui-pending.jsonl에서 UI semantic 데이터 merge
  4. `ui-index/components.json` 저장
  5. ui-pending.jsonl 클리어
- `updateUIIndex(projectRoot, metaDir, changedFiles?)`: 변경분만
- `calculateUIHealth(components)`: weighted average
  - semanticCoverage 40% + accessibilityCoverage 35% + statesCoverage 25%
- `appendUIPending(metaDir, entry)`: JSONL 대기열에 추가

### 코드 인덱스 ↔ UI 인덱스 통합

`rebuildIndex()`와 `updateIndex()`에서 UI 인덱스를 **함께 실행**:

```
rebuildIndex()
  ├── Step 1~5: 코드 인덱스 빌드 (기존)
  ├── Step 5.5: rebuildUIIndex() (UI 계층)
  ├── Step 6: 모듈별 JSON 저장
  └── Step 7: summary.json 생성 (uiHealth 포함)
```

UI 실패가 코드 인덱스를 블로킹하지 않도록 try/catch로 격리.

---

## 9. Alerts 시스템

### MetaIndexAlerts

| Alert 유형 | 감지 기준 | 용도 |
|-----------|---------|------|
| `oversizedFiles` | totalLines > 300 | 리팩토링 후보 |
| `missingSemantics` | semantic 없는 파일 (최대 10개) | semantic 채우기 유도 |
| `driftDetected` | mtime 불일치 (인덱스 시점 vs 현재) | 재인덱싱 필요 |
| `interfaceMismatches` | unused_export / missing_import | 정합성 문제 |

### Drift 감지

```typescript
interface DriftEntry {
  path: string;
  type: 'mtime_changed' | 'content_changed' | 'lines_changed' | 'deleted';
  indexedMtime: number;
  currentMtime: number;
}
```

---

## 10. CLI 명령어

> `tsq meta-index` (별칭: `tsq mi`)

### rebuild

전체 재구축. 코드 인덱스 + UI 인덱스 동시 빌드.

```bash
tsq mi rebuild
# → ✅ Meta index rebuilt: 42 files, 5 modules, 23 components
```

### update

변경분만 반영 (pending queue + drift 기반).

```bash
tsq mi update
```

### stats

전체 통계 표시.

```bash
tsq mi stats
```

출력 예시:
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

semantic 데이터를 pending queue에 추가.

```bash
# 코드 semantic (파일)
tsq mi stage "src/auth/login.ts" \
  --method execute --algo hash-compare --tc "O(1)" --fn authenticate

# UI semantic (컴포넌트)
tsq mi stage "src/components/LoginForm.tsx" \
  --layout flex-column --color-scheme primary --spacing compact \
  --responsive "mobile-first,md" \
  --state "loading:form submit:button disabled + spinner:API 응답"

# 디렉토리 semantic (신규)
tsq mi stage "src/payment/" \
  --desc "결제 도메인 핵심 로직" \
  --purpose domain-logic \
  --domain fintech \
  --boundary module \
  --tags "pci-dss,encryption" \
  --owner "payment-team"
```

파일/UI 관련 옵션:

| 옵션 | 설명 | 예시 |
|------|------|------|
| `--layout` | 레이아웃 의도 | flex-column, grid, stack |
| `--color-scheme` | 컬러 스킴 의도 | primary, secondary, danger |
| `--spacing` | 스페이싱 의도 | compact, normal, spacious |
| `--responsive` | 반응형 브레이크포인트 | mobile-first,md,lg |
| `--state` | 상태 정의 (name:trigger:visual:exit) | loading:submit:spinner:response |

디렉토리 관련 옵션:

| 옵션 | 설명 | 예시 |
|------|------|------|
| `--desc` | 디렉토리 설명 | "결제 도메인 핵심 로직" |
| `--purpose` | 역할 분류 | domain-logic, infrastructure, ui-components, shared-utils, api-routes |
| `--domain` | 도메인 매핑 | fintech, auth, general-web |
| `--boundary` | 경계 타입 | module, package, app, library |
| `--tags` | 태그 (쉼표 구분) | pci-dss,encryption |
| `--owner` | 담당자/팀 | payment-team |

### query / validate

```bash
tsq mi query --pattern "clean-*"       # 패턴 필터
tsq mi query --alert oversized         # 경고 항목
tsq mi validate                        # semantic 검증
```

---

## 11. Designer 에이전트 연동

Designer 에이전트가 컴포넌트 작업 완료 시 task-completion-protocol에 UI Meta Index 테이블 포함:

```markdown
### UI Meta Index Updates
| component | layout | colorScheme | spacing | states | responsive |
|-----------|--------|-------------|---------|--------|------------|
| LoginForm | flex-column | primary | compact | loading,error | mobile-first,md |

### Component States
| component | state | trigger | visual | exit |
|-----------|-------|---------|--------|------|
| LoginForm | loading | form submit | button disabled + spinner | API 응답 |

### Accessibility
| component | ariaLabels | tabOrder | focusTrap | wcagLevel |
|-----------|------------|----------|-----------|-----------|
| LoginForm | yes | email,password,submit | no | AA |
```

Hook이 이 데이터를 파싱하여 `ui-pending.jsonl`에 자동 기록 → 다음 `mi update`에서 반영.

---

## 12. 메트릭 통합

`tsq metrics` 출력에 Meta Index + UI 통계 포함:

```
  Meta Index Health:       87%
  UI Components:           23
  UI Health Score:         52%
  UI Semantic:             48%
  Accessibility:           65%
```

트렌드 비교:
```
  Meta Health:  87%  →  89%  (+2%)
  UI Health:    52%  →  58%  (+6%)
```

---

## 13. 연동 포인트

| 소비자 | 사용 방식 |
|--------|---------|
| **Architect** | summary → 모듈 상세 → 코드 순으로 접근 |
| **Designer** | UI 인덱스로 컴포넌트 구조 파악, semantic 데이터 기록 |
| **QA** | 패턴 미준수/성능 위험 필터링, 접근성 커버리지 확인 |
| **`tsq status`** | 파일 수, 패턴 분포, Health Score 표시 |
| **`tsq metrics`** | Health 점수 + UI Health 트렌드 |
| **Retro** | 시퀀스/페이즈별 코드 품질 변화 추적 |
| **Developer** | `tsq mi stage`로 semantic 데이터 기록 |

---

## 14. 구현 파일 맵

### 타입

| 파일 | 역할 |
|------|------|
| `src/types/meta-index.ts` | 코드 인덱스 타입 (FileEntry, MethodEntry, Summary, Alerts, Health, Drift) |
| `src/types/ui-meta.ts` | UI 인덱스 타입 (ComponentMechanical, ComponentSemantic, UIHealthScore) |

### 라이브러리

| 파일 | 역할 |
|------|------|
| `src/lib/ast-parser.ts` | 코드 AST 파서 (@swc/core, FileMechanical 추출) |
| `src/lib/ui-parser.ts` | UI AST 파서 (@swc/core, ComponentMechanical 추출) |
| `src/lib/meta-index.ts` | 코드 인덱스 코어 (rebuild, update, summary, merge) |
| `src/lib/ui-index.ts` | UI 인덱스 코어 (rebuild, update, health, pending) |

### CLI

| 파일 | 역할 |
|------|------|
| `src/commands/meta-index.ts` | `tsq mi` 서브커맨드 (rebuild, update, stats, stage, query, validate) |
| `src/commands/metrics.ts` | `tsq metrics`에 Meta/UI 통계 통합 |

### 템플릿/에이전트

| 파일 | 역할 |
|------|------|
| `templates/base/agents/tsq-designer.md` | UI Meta Index 완료 프로토콜 |
| `templates/base/knowledge/templates/task-result.md` | 선택적 UI 섹션 |
| `src/lib/template.ts` | `tsq init` 시 `ui-index/` 디렉토리 생성 |

/**
 * UI Meta Index types for frontend component indexing
 * Mechanical (JSX AST) + Semantic (Designer) 2-layer model
 * 저장소: .timsquad/state/meta-index/ui-index/
 */

// ── Component Mechanical (AST 자동 추출) ──

export interface ComponentMechanical {
  componentName: string;              // 함수/클래스명
  componentType: string;              // JSX 최상위 태그 (form, div, section 등)
  propsInterface?: string;            // Props 타입명 (e.g. "LoginFormProps")
  propsFields?: PropsField[];         // Props 필드 목록
  slots: SlotMechanical[];            // JSX 자식 컴포넌트
  hooks: HookUsage[];                 // useState, useEffect 등
  eventHandlers: string[];            // onClick, onChange 등
  conditionalRenders: ConditionalRender[];
  hasForwardRef: boolean;
  hasSuspense: boolean;
  hasErrorBoundary: boolean;
  contextUsage: string[];             // useContext 참조
}

export interface PropsField {
  name: string;
  type: string;
  required: boolean;
  defaultValue?: string;
}

export interface SlotMechanical {
  name: string;                       // JSX 태그명 (Button, TextInput 등)
  props: Record<string, string>;      // 전달된 props
  compositionType: 'direct' | 'compound' | 'render-prop' | 'conditional' | 'passthrough';
  condition?: string;                 // conditional인 경우 조건 변수명
  children?: SlotMechanical[];        // compound인 경우 중첩
  renderProp?: string;                // render-prop인 경우 prop명
}

export interface HookUsage {
  hook: string;                       // useState, useQuery, useRouter 등
  variable?: string;                  // const [xxx, setXxx] 의 xxx
  dependencies?: number;              // deps 배열 길이 (useEffect 등)
}

export interface ConditionalRender {
  condition: string;                  // 변수명 (isLoading, error 등)
  type: 'ternary' | 'logical-and' | 'switch';
  renderedComponent?: string;         // 조건 참일 때 렌더링되는 컴포넌트
}

// ── Component Semantic (designer 에이전트 제공) ──

export interface ComponentSemantic {
  semanticTag?: string;               // "authentication", "navigation" 등
  layout?: LayoutIntent;
  designTokens?: DesignTokens;
  slots?: Record<string, SlotSemantic>;
  states?: Record<string, StateDefinition>;
  animations?: Record<string, AnimationIntent>;
  accessibility?: AccessibilityMeta;
  responsive?: string[];              // ["mobile-first", "breakpoint-md"]
}

export interface LayoutIntent {
  type: string;                       // "flex-column", "grid-2col", "stack"
  containerWidth?: string;            // "narrow", "medium", "full"
}

export interface DesignTokens {
  color?: TokenPair;
  spacing?: TokenPair;
  typography?: TokenPair;
  borderRadius?: TokenPair;
  shadow?: TokenPair;
}

export interface TokenPair {
  intent: string;                     // L1: "primary", "compact"
  token: string;                      // L2: "blue-500", "space-4"
}

export interface SlotSemantic {
  variant?: string;                   // "primary", "ghost"
  size?: string;                      // "sm", "md", "lg"
  fullWidth?: boolean;
  icon?: string;
  validation?: string;
}

export interface StateDefinition {
  trigger: string;                    // "form submit", "API error"
  visual: string;                     // "button disabled + spinner"
  exit: string;                       // "API 응답 수신"
}

export interface AnimationIntent {
  type: string;                       // "fadeIn", "shake", "pulse"
  timing: 'fast' | 'normal' | 'slow';
}

export interface AccessibilityMeta {
  ariaLabels?: boolean;
  tabOrder?: string[];
  focusTrap?: boolean;
  errorAnnounce?: boolean;
  wcagLevel?: 'A' | 'AA' | 'AAA';
}

// ── Component Entry (파일 단위) ──

export interface ComponentEntry {
  path: string;
  mechanical: ComponentMechanical;
  semantic?: ComponentSemantic;
  indexedAt: string;
  mtime: number;
}

// ── UI Index JSON ──

export interface UIModuleIndex {
  generatedAt: string;
  schemaVersion: string;
  components: Record<string, ComponentEntry>;
}

// ── UI Health ──

export interface UIHealthScore {
  overall: number;                    // 0-100
  componentCount: number;
  semanticCoverage: number;           // % with semantic data
  accessibilityCoverage: number;      // % with accessibility meta
  statesCoverage: number;             // % with states defined
}

// ── UI Pending Queue ──

export interface UIPendingEntry {
  timestamp: string;
  filePath: string;
  component?: string;
  semantic: Partial<ComponentSemantic>;
  source: 'cli' | 'designer' | 'hook';
}

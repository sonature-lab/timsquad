/**
 * Compile rules for SSOT → agent-facing spec transformation.
 *
 * Rules are declarative: define source, split strategy, output location,
 * and required fields for schema validation.
 * No AI interpretation — deterministic structural extraction only.
 */

/** How to split a source document into multiple spec files */
export type SplitStrategy = 'h2' | 'h3' | 'none';

/** Where compiled output goes within controller skill */
export type OutputTarget = 'references' | 'rules';

/** A single compile rule mapping SSOT source → spec output */
export interface CompileRule {
  /** SSOT filename without extension (e.g., 'service-spec') */
  source: string;
  /** Output target directory within controller skill */
  output: OutputTarget;
  /** How to split the document */
  splitBy: SplitStrategy;
  /** Output filename pattern. Available vars: {section}, {method}, {path}, {entity} */
  filenamePattern: string;
  /** Required fields in each section for schema validation */
  requiredFields: string[];
  /** Human-readable description */
  description: string;
}

/** Metadata embedded in compiled spec files */
export interface CompileMarker {
  /** Original SSOT file path (relative to .timsquad/) */
  source: string;
  /** Section anchor in source (e.g., 'POST-auth-login') */
  section: string;
  /** MD5 hash of source section content */
  ssotHash: string;
  /** ISO 8601 compilation timestamp */
  compiledAt: string;
}

/** Manifest entry for stale detection */
export interface ManifestEntry {
  source: string;
  ssotHash: string;
  compiledAt: string;
  outputFiles: string[];
}

/** Full compile manifest */
export interface CompileManifest {
  version: string;
  compiledAt: string;
  entries: ManifestEntry[];
}

/**
 * Default compile rules for all SSOT document types.
 * Rules match SSOT template structure (H2=domain, H3=endpoint, H4=detail).
 */
export const COMPILE_RULES: CompileRule[] = [
  {
    source: 'service-spec',
    output: 'references',
    splitBy: 'h3',
    filenamePattern: '{section}.spec.md',
    requiredFields: ['Endpoint', 'Request', 'Response'],
    description: 'API 엔드포인트별 분할 (H3 = 개별 API)',
  },
  {
    source: 'data-design',
    output: 'references',
    splitBy: 'h2',
    filenamePattern: '{section}.spec.md',
    requiredFields: ['Fields'],
    description: '엔티티별 분할 (H2 = 테이블/모델)',
  },
  {
    source: 'error-codes',
    output: 'references',
    splitBy: 'none',
    filenamePattern: 'error-codes.spec.md',
    requiredFields: ['Code', 'HTTP', 'Description'],
    description: '에러 코드 전체 (분할 없음)',
  },
  {
    source: 'requirements',
    output: 'rules',
    splitBy: 'none',
    filenamePattern: 'completion-criteria.md',
    requiredFields: ['ID', 'Priority'],
    description: '요건 목록 → 완료 기준 규칙',
  },
  {
    source: 'functional-spec',
    output: 'references',
    splitBy: 'h2',
    filenamePattern: '{section}.spec.md',
    requiredFields: [],
    description: '기능 시나리오별 분할',
  },
  {
    source: 'ui-ux-spec',
    output: 'references',
    splitBy: 'h2',
    filenamePattern: '{section}.spec.md',
    requiredFields: [],
    description: 'UI/UX 화면별 분할',
  },
  {
    source: 'security-spec',
    output: 'rules',
    splitBy: 'none',
    filenamePattern: 'security-constraints.md',
    requiredFields: [],
    description: '보안 요건 → 제약 규칙',
  },
  {
    source: 'test-spec',
    output: 'references',
    splitBy: 'none',
    filenamePattern: 'test-spec.spec.md',
    requiredFields: [],
    description: '테스트 명세 (분할 없음)',
  },
  {
    source: 'data-design',
    output: 'references',
    splitBy: 'h2',
    filenamePattern: '{section}.spec.md',
    requiredFields: ['Fields'],
    description: '데이터 모델별 분할',
  },
];

/**
 * Get compile rules for a given set of SSOT documents.
 * Filters rules to only include sources that exist.
 */
export function getCompileRules(availableSsotDocs: string[]): CompileRule[] {
  // Deduplicate rules by source (first rule wins)
  const seen = new Set<string>();
  return COMPILE_RULES.filter((rule) => {
    if (seen.has(rule.source)) return false;
    seen.add(rule.source);
    return availableSsotDocs.includes(rule.source);
  });
}

/**
 * Get the default compile rule for SSOT documents not in COMPILE_RULES.
 * Falls back to a generic no-split rule.
 */
export function getDefaultRule(source: string): CompileRule {
  return {
    source,
    output: 'references',
    splitBy: 'none',
    filenamePattern: `${source}.spec.md`,
    requiredFields: [],
    description: `${source} (기본 규칙, 분할 없음)`,
  };
}

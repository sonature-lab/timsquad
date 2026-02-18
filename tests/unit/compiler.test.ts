import { describe, it, expect } from 'vitest';
import {
  parseMarkdownSections,
  slugify,
  validateSectionFields,
  generateMarkers,
  computeHash,
  parseAgentPrerequisites,
} from '../../src/lib/compiler.js';
import { getCompileRules, getDefaultRule } from '../../src/lib/compile-rules.js';

// ─── Markdown Parser ────────────────────────────────────────────

describe('parseMarkdownSections', () => {
  it('should split by H2 headings', () => {
    const content = `# Title

## Section A
Content A

## Section B
Content B

## Section C
Content C
`;
    const sections = parseMarkdownSections(content, 'h2');
    expect(sections).toHaveLength(3);
    expect(sections[0].heading).toBe('Section A');
    expect(sections[1].heading).toBe('Section B');
    expect(sections[2].heading).toBe('Section C');
  });

  it('should split by H3 headings', () => {
    const content = `# Title

## Auth

### Login
Login content

### Register
Register content

## Users

### Get User
Get user content
`;
    const sections = parseMarkdownSections(content, 'h3');
    expect(sections).toHaveLength(3);
    expect(sections[0].heading).toBe('Login');
    expect(sections[0].parent).toBe('Auth');
    expect(sections[1].heading).toBe('Register');
    expect(sections[1].parent).toBe('Auth');
    expect(sections[2].heading).toBe('Get User');
    expect(sections[2].parent).toBe('Users');
  });

  it('should preserve section content', () => {
    const content = `# Title

## Section A
Line 1
Line 2

| Col1 | Col2 |
|------|------|
| A    | B    |

## Section B
Other content
`;
    const sections = parseMarkdownSections(content, 'h2');
    expect(sections[0].content).toContain('Line 1');
    expect(sections[0].content).toContain('| Col1 | Col2 |');
  });

  it('should handle empty document', () => {
    const sections = parseMarkdownSections('', 'h2');
    expect(sections).toHaveLength(0);
  });

  it('should handle document without target headings', () => {
    const content = `# Title Only\n\nSome text without H2`;
    const sections = parseMarkdownSections(content, 'h2');
    expect(sections).toHaveLength(0);
  });
});

// ─── Slugify ────────────────────────────────────────────────────

describe('slugify', () => {
  it('should handle Korean text', () => {
    expect(slugify('2.1 로그인')).toBe('2-1-로그인');
  });

  it('should handle URL paths', () => {
    expect(slugify('POST /auth/login')).toBe('post-auth-login');
  });

  it('should handle spaces and dots', () => {
    expect(slugify('Section 3.2 Name')).toBe('section-3-2-name');
  });

  it('should remove special characters', () => {
    expect(slugify('Auth (JWT)')).toBe('auth-jwt');
  });
});

// ─── Section Field Validation ───────────────────────────────────

describe('validateSectionFields', () => {
  it('should detect present fields in tables', () => {
    const content = `
| Field | Type | Required |
|-------|------|----------|
| email | string | yes |
`;
    const missing = validateSectionFields(content, ['Field', 'Type']);
    expect(missing).toHaveLength(0);
  });

  it('should detect missing fields', () => {
    const content = `Some content without the required fields`;
    const missing = validateSectionFields(content, ['Endpoint', 'Request', 'Response']);
    expect(missing).toContain('Endpoint');
  });

  it('should detect fields in H4 headings', () => {
    const content = `
#### Request
| Field | Type |
|-------|------|

#### Response
| Field | Type |
|-------|------|
`;
    const missing = validateSectionFields(content, ['Request', 'Response']);
    expect(missing).toHaveLength(0);
  });

  it('should return empty for no required fields', () => {
    const missing = validateSectionFields('any content', []);
    expect(missing).toHaveLength(0);
  });
});

// ─── Compile Markers ────────────────────────────────────────────

describe('generateMarkers', () => {
  it('should generate valid HTML comments', () => {
    const markers = generateMarkers({
      source: 'ssot/service-spec.md',
      section: 'POST-auth-login',
      ssotHash: 'abc12345',
      compiledAt: '2026-02-18T10:30:00Z',
    });

    expect(markers).toContain('<!-- source: ssot/service-spec.md#POST-auth-login -->');
    expect(markers).toContain('<!-- ssot-hash: abc12345 -->');
    expect(markers).toContain('<!-- compiled: 2026-02-18T10:30:00Z -->');
  });
});

describe('computeHash', () => {
  it('should return 8-char hex string', () => {
    const hash = computeHash('test content');
    expect(hash).toMatch(/^[0-9a-f]{8}$/);
  });

  it('should be deterministic', () => {
    expect(computeHash('same')).toBe(computeHash('same'));
  });

  it('should differ for different content', () => {
    expect(computeHash('a')).not.toBe(computeHash('b'));
  });
});

// ─── Agent Prerequisites Parser ─────────────────────────────────

describe('parseAgentPrerequisites', () => {
  it('should extract prerequisites from XML tag', () => {
    const content = `
<prerequisites>
  \`.timsquad/ssot/service-spec.md\` — API 명세
  \`.timsquad/ssot/data-design.md\` — 데이터 설계
  \`.timsquad/ssot/error-codes.md\` — 에러 코드
</prerequisites>
`;
    const prereqs = parseAgentPrerequisites(content);
    expect(prereqs).toEqual(['service-spec', 'data-design', 'error-codes']);
  });

  it('should return empty for no prerequisites', () => {
    const content = `<agent>No prerequisites here</agent>`;
    expect(parseAgentPrerequisites(content)).toEqual([]);
  });

  it('should handle optional prerequisites', () => {
    const content = `
<prerequisites>
  \`.timsquad/ssot/data-design.md\` — 데이터 설계
  \`.timsquad/knowledge/tribal.md\` — 코딩 컨벤션 (있는 경우)
</prerequisites>
`;
    const prereqs = parseAgentPrerequisites(content);
    // Only ssot/ paths should be extracted
    expect(prereqs).toEqual(['data-design']);
  });
});

// ─── Compile Rules ──────────────────────────────────────────────

describe('getCompileRules', () => {
  it('should filter rules by available SSOT docs', () => {
    const rules = getCompileRules(['service-spec', 'data-design']);
    expect(rules.length).toBeGreaterThanOrEqual(2);
    expect(rules.some(r => r.source === 'service-spec')).toBe(true);
    expect(rules.some(r => r.source === 'data-design')).toBe(true);
  });

  it('should not include rules for missing docs', () => {
    const rules = getCompileRules(['service-spec']);
    expect(rules.some(r => r.source === 'error-codes')).toBe(false);
  });

  it('should deduplicate by source', () => {
    const rules = getCompileRules(['data-design']);
    const dataSources = rules.filter(r => r.source === 'data-design');
    expect(dataSources).toHaveLength(1);
  });
});

describe('getDefaultRule', () => {
  it('should create a no-split rule', () => {
    const rule = getDefaultRule('custom-doc');
    expect(rule.source).toBe('custom-doc');
    expect(rule.splitBy).toBe('none');
    expect(rule.output).toBe('references');
    expect(rule.filenamePattern).toBe('custom-doc.spec.md');
  });
});

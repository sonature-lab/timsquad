import { describe, it, expect } from 'vitest';
import {
  parseMarkdownSections,
  slugify,
  validateSectionFields,
  generateMarkers,
  computeHash,
  parseAgentPrerequisites,
} from '../../src/lib/compiler.js';
import { getCompileRules, getDefaultRule, COMPILE_RULES } from '../../src/lib/compile-rules.js';

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

  it('should exclude metadata headings (관련 문서, 변경 이력)', () => {
    const content = `# Title

## 1. 기능 A
기능 A 내용

## 2. 기능 B
기능 B 내용

## 관련 문서
- [참고](./ref.md)

## 변경 이력
| 버전 | 날짜 |
`;
    const sections = parseMarkdownSections(content, 'h2');
    expect(sections).toHaveLength(2);
    expect(sections[0].heading).toBe('1. 기능 A');
    expect(sections[1].heading).toBe('2. 기능 B');
  });

  it('should exclude numbered metadata headings (7. 참고)', () => {
    const content = `# Title

## 3. 핵심 기능
내용

## 7. 참고
참고 자료
`;
    const sections = parseMarkdownSections(content, 'h2');
    expect(sections).toHaveLength(1);
    expect(sections[0].heading).toBe('3. 핵심 기능');
  });

  it('should not exclude non-metadata headings containing similar words', () => {
    const content = `# Title

## 문서 관리 시스템
관리 시스템 내용

## 이력 추적 기능
이력 추적 내용
`;
    const sections = parseMarkdownSections(content, 'h2');
    expect(sections).toHaveLength(2);
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

  it('requirements rule should use Korean field name 우선순위', () => {
    const rules = getCompileRules(['requirements']);
    const reqRule = rules.find(r => r.source === 'requirements');
    expect(reqRule?.requiredFields).toContain('우선순위');
    expect(reqRule?.requiredFields).not.toContain('Priority');
  });

  it('should not have duplicate data-design rules in COMPILE_RULES', () => {
    const dataSources = COMPILE_RULES.filter(r => r.source === 'data-design');
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

// ─── E2E Impact Analysis (5-B) ─────────────────────────────────

describe('affected_e2e field', () => {
  it('service-spec rule should have affected_e2e pattern', () => {
    const rule = COMPILE_RULES.find(r => r.source === 'service-spec');
    expect(rule?.affected_e2e).toBe('__tests__/e2e/{section}.test.ts');
  });

  it('ui-ux-spec rule should have affected_e2e pattern', () => {
    const rule = COMPILE_RULES.find(r => r.source === 'ui-ux-spec');
    expect(rule?.affected_e2e).toBe('__tests__/e2e/{section}.test.ts');
  });

  it('rules without E2E mapping should have undefined affected_e2e', () => {
    const rule = COMPILE_RULES.find(r => r.source === 'error-codes');
    expect(rule?.affected_e2e).toBeUndefined();
  });

  it('default rule should not have affected_e2e', () => {
    const rule = getDefaultRule('custom');
    expect(rule.affected_e2e).toBeUndefined();
  });
});

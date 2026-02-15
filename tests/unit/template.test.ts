import { describe, it, expect } from 'vitest';
import { substituteVariables, createTemplateVariables, getRequiredDocuments } from '../../src/lib/template.js';
import type { TemplateVariables } from '../../src/lib/template.js';
import type { ProjectType, ProjectLevel } from '../../src/types/project.js';

const mockVariables: TemplateVariables = {
  PROJECT_NAME: 'test-app',
  PROJECT_TYPE: 'web-service',
  PROJECT_LEVEL: '2',
  DATE: '2026-02-15',
  TIMESTAMP: '20260215_120000',
  INIT_DATE: '2026-02-15T12:00:00.000Z',
  ACTIVE_AGENTS: '@tsq-architect, @tsq-developer',
  DELEGATION_RULES: '<rule>test</rule>',
};

describe('substituteVariables', () => {
  it('should replace single variable', () => {
    const result = substituteVariables('Project: {{PROJECT_NAME}}', mockVariables);
    expect(result).toBe('Project: test-app');
  });

  it('should replace multiple variables', () => {
    const content = '{{PROJECT_NAME}} ({{PROJECT_TYPE}}) Level {{PROJECT_LEVEL}}';
    const result = substituteVariables(content, mockVariables);
    expect(result).toBe('test-app (web-service) Level 2');
  });

  it('should replace all occurrences of same variable', () => {
    const content = '{{PROJECT_NAME}} is called {{PROJECT_NAME}}';
    const result = substituteVariables(content, mockVariables);
    expect(result).toBe('test-app is called test-app');
  });

  it('should leave unrecognized patterns unchanged', () => {
    const content = '{{UNKNOWN_VAR}} stays';
    const result = substituteVariables(content, mockVariables);
    expect(result).toBe('{{UNKNOWN_VAR}} stays');
  });

  it('should handle empty content', () => {
    expect(substituteVariables('', mockVariables)).toBe('');
  });

  it('should handle content with no variables', () => {
    const content = 'No variables here';
    expect(substituteVariables(content, mockVariables)).toBe('No variables here');
  });
});

describe('createTemplateVariables', () => {
  it('should set project fields', () => {
    const vars = createTemplateVariables('myapp', 'web-service', 2);
    expect(vars.PROJECT_NAME).toBe('myapp');
    expect(vars.PROJECT_TYPE).toBe('web-service');
    expect(vars.PROJECT_LEVEL).toBe('2');
  });

  it('should set date fields', () => {
    const vars = createTemplateVariables('myapp', 'web-service', 2);
    expect(vars.DATE).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(vars.INIT_DATE).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it('should handle config with agents', () => {
    const config = {
      project: { name: 'test', type: 'web-service' as ProjectType, level: 2 as ProjectLevel, created: '' },
      methodology: { development: 'tdd' as const, process: 'agile' as const, branching: 'github-flow' as const, review: 'required' as const },
      stack: { language: 'typescript' as const, database: 'postgresql' as const },
      agents: {
        architect: { model: 'opus' as const, enabled: true },
        developer: { model: 'sonnet' as const, enabled: true },
      },
      knowledge: { platforms: [], domains: [], checklists: [] },
      quality: { test_coverage: { minimum: 80, recommended: 90 }, security_review: 'optional' as const },
    };

    const vars = createTemplateVariables('test', 'web-service', 2, config);
    expect(vars.ACTIVE_AGENTS).toContain('@tsq-architect');
    expect(vars.ACTIVE_AGENTS).toContain('@tsq-developer');
    expect(vars.DELEGATION_RULES).toContain('<rule');
  });
});

describe('getRequiredDocuments', () => {
  it('should return minimum docs for level 1', () => {
    const docs = getRequiredDocuments('web-service', 1);
    expect(docs).toContain('prd');
    expect(docs).toContain('planning');
    expect(docs).toContain('requirements');
  });

  it('should include more docs for level 2', () => {
    const docs = getRequiredDocuments('web-service', 2);
    expect(docs).toContain('glossary');
    expect(docs).toContain('functional-spec');
    expect(docs).toContain('test-spec');
  });

  it('should include enterprise docs for level 3', () => {
    const docs = getRequiredDocuments('web-service', 3);
    expect(docs).toContain('deployment-spec');
    expect(docs).toContain('integration-spec');
    expect(docs).toContain('security-spec');
  });

  it('should add type-specific docs', () => {
    const webDocs = getRequiredDocuments('web-service', 1);
    expect(webDocs).toContain('ui-ux-spec');

    const fintechDocs = getRequiredDocuments('fintech', 1);
    expect(fintechDocs).toContain('security-spec');
    expect(fintechDocs).toContain('error-codes');
  });

  it('should deduplicate documents', () => {
    const docs = getRequiredDocuments('fintech', 3);
    const unique = [...new Set(docs)];
    expect(docs.length).toBe(unique.length);
  });
});

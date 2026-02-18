import { describe, it, expect } from 'vitest';
import { createDefaultConfig, validateConfig } from '../../src/lib/config.js';
import { buildAgentsConfig, AGENT_PRESETS, SKILL_PRESETS, KNOWLEDGE_PRESETS, BASE_SKILLS, BASE_KNOWLEDGE } from '../../src/types/config.js';
import type { ProjectType, ProjectLevel } from '../../src/types/project.js';

const ALL_TYPES: ProjectType[] = ['web-service', 'web-app', 'api-backend', 'platform', 'fintech', 'infra', 'mobile-app'];
const ALL_LEVELS: ProjectLevel[] = [1, 2, 3];

describe('createDefaultConfig', () => {
  it.each(ALL_TYPES)('should create valid config for type: %s', (type) => {
    const config = createDefaultConfig('test-project', type, 2);

    expect(config.project.name).toBe('test-project');
    expect(config.project.type).toBe(type);
    expect(config.methodology).toBeDefined();
    expect(config.stack).toBeDefined();
    expect(config.agents).toBeDefined();
    expect(config.quality).toBeDefined();
    expect(config.naming).toBeDefined();
  });

  it('should force level 3 for fintech', () => {
    const config = createDefaultConfig('bank', 'fintech', 1);
    expect(config.project.level).toBe(3);
  });

  it('should set gitflow for fintech', () => {
    const config = createDefaultConfig('bank', 'fintech', 1);
    expect(config.methodology.branching).toBe('gitflow');
  });

  it('should require security review for fintech', () => {
    const config = createDefaultConfig('bank', 'fintech', 1);
    expect(config.quality.security_review).toBe('required');
  });

  it('should enable consensus for fintech', () => {
    const config = createDefaultConfig('bank', 'fintech', 1);
    expect(config.consensus).toBeDefined();
    expect(config.consensus?.enabled).toBe(true);
  });

  it('should preserve original level for non-fintech', () => {
    for (const type of ALL_TYPES.filter(t => t !== 'fintech')) {
      const config = createDefaultConfig('test', type, 1);
      expect(config.project.level).toBe(1);
    }
  });
});

describe('validateConfig', () => {
  it('should accept valid config', () => {
    const config = createDefaultConfig('test', 'web-service', 2);
    expect(validateConfig(config)).toBe(true);
  });

  it('should reject null', () => {
    expect(validateConfig(null)).toBe(false);
  });

  it('should reject empty object', () => {
    expect(validateConfig({})).toBe(false);
  });

  it('should reject missing project.name', () => {
    expect(validateConfig({ project: { type: 'web-service', level: 1 } })).toBe(false);
  });

  it('should reject invalid project type', () => {
    expect(validateConfig({ project: { name: 'test', type: 'invalid', level: 1 } })).toBe(false);
  });

  it('should reject invalid project level', () => {
    expect(validateConfig({ project: { name: 'test', type: 'web-service', level: 5 } })).toBe(false);
  });
});

describe('buildAgentsConfig', () => {
  it.each(ALL_TYPES)('should build agents for type: %s', (type) => {
    const agents = buildAgentsConfig(type);
    const preset = AGENT_PRESETS[type];

    // All preset agents should be enabled
    for (const agent of preset) {
      expect(agents[agent]?.enabled).toBe(true);
    }
  });

  it('should include security agent for fintech', () => {
    const agents = buildAgentsConfig('fintech');
    expect(agents.security?.enabled).toBe(true);
  });

  it('should not include designer for api-backend', () => {
    const agents = buildAgentsConfig('api-backend');
    expect(agents.designer?.enabled).toBe(false);
  });

  it('should assign opus to architect', () => {
    const agents = buildAgentsConfig('web-service');
    expect(agents.architect?.model).toBe('opus');
  });
});

describe('SKILL_PRESETS', () => {
  it('should have presets for all project types', () => {
    for (const type of ALL_TYPES) {
      expect(SKILL_PRESETS[type]).toBeDefined();
      expect(Array.isArray(SKILL_PRESETS[type])).toBe(true);
    }
  });

  it('should not include frontend skills for api-backend', () => {
    const skills = SKILL_PRESETS['api-backend'];
    expect(skills.some(s => s.startsWith('frontend/'))).toBe(false);
    expect(skills).not.toContain('ui-design');
  });

  it('should not include frontend skills for infra', () => {
    const skills = SKILL_PRESETS['infra'];
    expect(skills.some(s => s.startsWith('frontend/'))).toBe(false);
    expect(skills.some(s => s.startsWith('database'))).toBe(false);
  });

  it('should include frontend skills for web-service', () => {
    const skills = SKILL_PRESETS['web-service'];
    expect(skills).toContain('frontend/react');
    expect(skills).toContain('frontend/nextjs');
  });

  it('should include security for fintech', () => {
    expect(SKILL_PRESETS['fintech']).toContain('security');
  });
});

describe('KNOWLEDGE_PRESETS', () => {
  it('should have presets for all project types', () => {
    for (const type of ALL_TYPES) {
      expect(KNOWLEDGE_PRESETS[type]).toBeDefined();
    }
  });

  it('should include security checklist for all types', () => {
    for (const type of ALL_TYPES) {
      expect(KNOWLEDGE_PRESETS[type]).toContain('checklists/security');
    }
  });

  it('should include design-reference only for UI-heavy types', () => {
    expect(KNOWLEDGE_PRESETS['web-service']).toContain('checklists/design-reference');
    expect(KNOWLEDGE_PRESETS['web-app']).toContain('checklists/design-reference');
    expect(KNOWLEDGE_PRESETS['api-backend']).not.toContain('checklists/design-reference');
    expect(KNOWLEDGE_PRESETS['infra']).not.toContain('checklists/design-reference');
  });
});

describe('BASE constants', () => {
  it('BASE_SKILLS should include core skills', () => {
    expect(BASE_SKILLS).toContain('coding');
    expect(BASE_SKILLS).toContain('testing');
    expect(BASE_SKILLS).toContain('typescript');
    expect(BASE_SKILLS).toContain('planning');
    expect(BASE_SKILLS).toContain('architecture');
  });

  it('BASE_KNOWLEDGE should include ssot-validation', () => {
    expect(BASE_KNOWLEDGE).toContain('checklists/ssot-validation');
  });

  it('BASE_KNOWLEDGE should include templates', () => {
    expect(BASE_KNOWLEDGE).toContain('templates/task-result');
    expect(BASE_KNOWLEDGE).toContain('templates/sequence-report');
  });
});

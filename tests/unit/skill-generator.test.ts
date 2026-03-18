import { describe, it, expect } from 'vitest';
import { getActiveSkills, getActiveKnowledge } from '../../src/lib/skill-generator.js';
import { createDefaultConfig } from '../../src/lib/config.js';
import { BASE_SKILLS, BASE_KNOWLEDGE, DOMAIN_SKILL_MAP, DOMAIN_KNOWLEDGE_MAP } from '../../src/types/config.js';
import type { ProjectType } from '../../src/types/project.js';
import type { Domain } from '../../src/types/project.js';

const ALL_TYPES: ProjectType[] = ['web-service', 'web-app', 'api-backend', 'platform', 'fintech', 'infra', 'mobile-app'];

describe('getActiveSkills', () => {
  it.each(ALL_TYPES)('should always include BASE_SKILLS for %s', (type) => {
    const config = createDefaultConfig('test', type, 2);
    const skills = getActiveSkills(config);

    for (const base of BASE_SKILLS) {
      expect(skills).toContain(base);
    }
  });

  it('should include frontend skills for web-service', () => {
    const config = createDefaultConfig('test', 'web-service', 2);
    const skills = getActiveSkills(config);

    expect(skills).toContain('tsq-react');
    expect(skills).toContain('tsq-nextjs');
    expect(skills).toContain('tsq-ui');
  });

  it('should NOT include frontend skills for api-backend', () => {
    const config = createDefaultConfig('test', 'api-backend', 2);
    const skills = getActiveSkills(config);

    expect(skills).not.toContain('tsq-react');
    expect(skills).not.toContain('tsq-nextjs');
    expect(skills).not.toContain('tsq-ui');
  });

  it('should have minimal skills for infra', () => {
    const config = createDefaultConfig('test', 'infra', 2);
    const skills = getActiveSkills(config);

    // Only BASE_SKILLS + security
    expect(skills).toContain('tsq-security');
    expect(skills).not.toContain('tsq-database');
    expect(skills).not.toContain('tsq-hono');
  });

  it('should include methodology skill based on config', () => {
    const config = createDefaultConfig('test', 'platform', 2, { methodology: 'tdd' });
    const skills = getActiveSkills(config);

    expect(skills).toContain('tsq-tdd');
    expect(skills).not.toContain('tsq-bdd');
  });

  it('should exclude methodology skills when none', () => {
    const config = createDefaultConfig('test', 'platform', 2, { methodology: 'none' });
    const skills = getActiveSkills(config);

    expect(skills).not.toContain('tsq-tdd');
    expect(skills).not.toContain('tsq-bdd');
  });

  it('should have no duplicates', () => {
    for (const type of ALL_TYPES) {
      const config = createDefaultConfig('test', type, 2);
      const skills = getActiveSkills(config);
      const unique = [...new Set(skills)];
      expect(skills.length).toBe(unique.length);
    }
  });

  it('should include stack-specific skills when stack is set', () => {
    const config = createDefaultConfig('test', 'infra', 2, {
      stack: ['react', 'prisma'],
    });
    const skills = getActiveSkills(config);

    expect(skills).toContain('tsq-react');
    expect(skills).toContain('tsq-prisma');
  });

  it('should include domain-specific skills when domain has entries', () => {
    const original = DOMAIN_SKILL_MAP['ml-engineering'];
    DOMAIN_SKILL_MAP['ml-engineering'] = ['tsq-ml-debug'];

    const config = createDefaultConfig('test', 'infra', 2, {
      domain: 'ml-engineering',
    });
    const skills = getActiveSkills(config);

    expect(skills).toContain('tsq-ml-debug');

    // Restore
    DOMAIN_SKILL_MAP['ml-engineering'] = original;
  });

  it('should combine domain + stack + type skills without duplicates', () => {
    const config = createDefaultConfig('test', 'web-service', 2, {
      domain: 'general-web',
      stack: ['react', 'node'],
    });
    const skills = getActiveSkills(config);

    // react from both SKILL_PRESETS and STACK_SKILL_MAP — should not duplicate
    const reactCount = skills.filter(s => s === 'tsq-react').length;
    expect(reactCount).toBe(1);

    // hono from both sources — no duplication
    const honoCount = skills.filter(s => s === 'tsq-hono').length;
    expect(honoCount).toBe(1);
  });

  it('should handle empty stack gracefully', () => {
    const config = createDefaultConfig('test', 'web-service', 2, {
      stack: [],
    });
    const skills = getActiveSkills(config);

    // Should still have type-based skills
    expect(skills).toContain('tsq-react');
  });

  it('should handle undefined stack gracefully', () => {
    const config = createDefaultConfig('test', 'web-service', 2);
    config.project.stack = undefined;
    const skills = getActiveSkills(config);

    for (const base of BASE_SKILLS) {
      expect(skills).toContain(base);
    }
  });

  it('should add database skill via postgresql stack entry', () => {
    const config = createDefaultConfig('test', 'infra', 2, {
      stack: ['postgresql'],
    });
    const skills = getActiveSkills(config);

    expect(skills).toContain('tsq-database');
  });

  it('should add typescript skill via stack entry', () => {
    const config = createDefaultConfig('test', 'infra', 2, {
      stack: ['typescript'],
    });
    const skills = getActiveSkills(config);

    // tsq-typescript is already in BASE_SKILLS — no error, just dedup
    const tsCount = skills.filter(s => s === 'tsq-typescript').length;
    expect(tsCount).toBe(1);
  });
});

describe('getActiveKnowledge', () => {
  it.each(ALL_TYPES)('should always include BASE_KNOWLEDGE for %s', (type) => {
    const config = createDefaultConfig('test', type, 2);
    const knowledge = getActiveKnowledge(config);

    for (const base of BASE_KNOWLEDGE) {
      expect(knowledge).toContain(base);
    }
  });

  it('should include accessibility for web-facing types', () => {
    const webConfig = createDefaultConfig('test', 'web-service', 2);
    const webKnow = getActiveKnowledge(webConfig);
    expect(webKnow).toContain('checklists/accessibility');

    const apiConfig = createDefaultConfig('test', 'api-backend', 2);
    const apiKnow = getActiveKnowledge(apiConfig);
    expect(apiKnow).not.toContain('checklists/accessibility');
  });

  it('should include database-standards for db-heavy types', () => {
    const apiConfig = createDefaultConfig('test', 'api-backend', 2);
    expect(getActiveKnowledge(apiConfig)).toContain('checklists/database-standards');

    const infraConfig = createDefaultConfig('test', 'infra', 2);
    expect(getActiveKnowledge(infraConfig)).not.toContain('checklists/database-standards');
  });

  it('should have no duplicates', () => {
    for (const type of ALL_TYPES) {
      const config = createDefaultConfig('test', type, 2);
      const knowledge = getActiveKnowledge(config);
      const unique = [...new Set(knowledge)];
      expect(knowledge.length).toBe(unique.length);
    }
  });

  it('should include domain-specific knowledge when domain has entries', () => {
    const original = DOMAIN_KNOWLEDGE_MAP['fintech'];
    DOMAIN_KNOWLEDGE_MAP['fintech'] = ['checklists/compliance'];

    const config = createDefaultConfig('test', 'infra', 2, {
      domain: 'fintech',
    });
    const knowledge = getActiveKnowledge(config);

    expect(knowledge).toContain('checklists/compliance');

    // Restore
    DOMAIN_KNOWLEDGE_MAP['fintech'] = original;
  });

  it('should handle domain with empty knowledge map', () => {
    const config = createDefaultConfig('test', 'web-service', 2, {
      domain: 'general-web',
    });
    const knowledge = getActiveKnowledge(config);

    // Should still include type-based knowledge
    expect(knowledge).toContain('checklists/security');
    for (const base of BASE_KNOWLEDGE) {
      expect(knowledge).toContain(base);
    }
  });

  it('should handle undefined domain gracefully', () => {
    const config = createDefaultConfig('test', 'web-service', 2);
    config.project.domain = undefined;
    const knowledge = getActiveKnowledge(config);

    for (const base of BASE_KNOWLEDGE) {
      expect(knowledge).toContain(base);
    }
  });
});

import { describe, it, expect } from 'vitest';
import { getActiveAgents, generateDelegationRules, formatActiveAgentsList, injectSkillsIntoFrontmatter } from '../../src/lib/agent-generator.js';
import { getActiveSkills } from '../../src/lib/skill-generator.js';
import { AGENT_PRESETS } from '../../src/types/config.js';
import { createDefaultConfig } from '../../src/lib/config.js';
import type { TimsquadConfig } from '../../src/types/config.js';
import type { ProjectType } from '../../src/types/project.js';
import type { AgentType } from '../../src/types/index.js';

const ALL_TYPES: ProjectType[] = ['web-service', 'web-app', 'api-backend', 'platform', 'fintech', 'infra', 'mobile-app'];

describe('getActiveAgents', () => {
  it.each(ALL_TYPES)('should return preset agents for %s', (type) => {
    const config = createDefaultConfig('test', type, 2);
    const agents = getActiveAgents(config);
    const expected = AGENT_PRESETS[type];

    expect(agents).toEqual(expected);
  });

  it('should filter out disabled agents', () => {
    const config = createDefaultConfig('test', 'web-service', 2);
    // Disable designer
    config.agents.designer = { model: 'sonnet', enabled: false };

    const agents = getActiveAgents(config);
    expect(agents).not.toContain('designer');
  });

  it('should include security for fintech', () => {
    const config = createDefaultConfig('test', 'fintech', 3);
    const agents = getActiveAgents(config);
    expect(agents).toContain('security');
    expect(agents).toContain('dba');
  });

  it('should not include dba for web-app', () => {
    const config = createDefaultConfig('test', 'web-app', 2);
    const agents = getActiveAgents(config);
    expect(agents).not.toContain('dba');
  });
});

describe('generateDelegationRules', () => {
  it('should generate rules for active agents', () => {
    const rules = generateDelegationRules(['architect', 'developer', 'qa']);
    expect(rules).toContain('@tsq-architect');
    expect(rules).toContain('@tsq-developer');
    expect(rules).toContain('@tsq-qa');
  });

  it('should not include inactive agents', () => {
    const rules = generateDelegationRules(['developer']);
    expect(rules).not.toContain('@tsq-architect');
    expect(rules).toContain('@tsq-developer');
  });

  it('should always include default rule', () => {
    const rules = generateDelegationRules([]);
    expect(rules).toContain('직접 처리');
  });

  it('should have sequential rule IDs', () => {
    const rules = generateDelegationRules(['architect', 'developer', 'qa']);
    expect(rules).toContain('DEL-001');
    expect(rules).toContain('DEL-002');
    expect(rules).toContain('DEL-003');
  });

  it('should include plan review triggers in architect rule', () => {
    const rules = generateDelegationRules(['architect']);
    expect(rules).toContain('계획 검증');
    expect(rules).toContain('plan review');
  });
});

describe('formatActiveAgentsList', () => {
  it('should format as @tsq-{name} list', () => {
    const result = formatActiveAgentsList(['architect', 'developer']);
    expect(result).toBe('@tsq-architect, @tsq-developer');
  });

  it('should handle single agent', () => {
    const result = formatActiveAgentsList(['developer']);
    expect(result).toBe('@tsq-developer');
  });

  it('should handle empty list', () => {
    const result = formatActiveAgentsList([]);
    expect(result).toBe('');
  });
});

describe('injectSkillsIntoFrontmatter', () => {
  const makeFrontmatter = (skills: string[]) =>
    `---\nname: tsq-developer\nskills: [${skills.join(', ')}]\n---\n\nBody content here.`;

  it('should inject matching stack skills for developer', () => {
    const content = makeFrontmatter(['tsq-protocol', 'tsq-coding', 'tsq-testing']);
    const result = injectSkillsIntoFrontmatter(
      content, 'developer' as AgentType, ['tsq-react', 'tsq-nextjs', 'tsq-hono', 'tsq-prisma'],
    );
    expect(result).toContain('tsq-react');
    expect(result).toContain('tsq-nextjs');
    expect(result).toContain('tsq-hono');
    expect(result).toContain('tsq-prisma');
    // existing skills preserved
    expect(result).toContain('tsq-protocol');
    expect(result).toContain('tsq-coding');
  });

  it('should inject only database skills for dba', () => {
    const content = makeFrontmatter(['tsq-protocol', 'tsq-database']);
    const result = injectSkillsIntoFrontmatter(
      content, 'dba' as AgentType, ['tsq-react', 'tsq-prisma', 'tsq-hono'],
    );
    expect(result).toContain('tsq-prisma');
    expect(result).not.toContain('tsq-react');
    expect(result).not.toContain('tsq-hono');
  });

  it('should inject only frontend skills for designer', () => {
    const content = makeFrontmatter(['tsq-protocol', 'tsq-ui']);
    const result = injectSkillsIntoFrontmatter(
      content, 'designer' as AgentType, ['tsq-react', 'tsq-hono', 'tsq-prisma'],
    );
    expect(result).toContain('tsq-react');
    expect(result).not.toContain('tsq-hono');
    expect(result).not.toContain('tsq-prisma');
  });

  it('should not inject skills for architect (empty keywords)', () => {
    const content = makeFrontmatter(['tsq-protocol', 'tsq-architecture']);
    const result = injectSkillsIntoFrontmatter(
      content, 'architect' as AgentType, ['tsq-react', 'tsq-hono'],
    );
    expect(result).toBe(content);
  });

  it('should not inject skills for qa (empty keywords)', () => {
    const content = makeFrontmatter(['tsq-protocol', 'tsq-testing']);
    const result = injectSkillsIntoFrontmatter(
      content, 'qa' as AgentType, ['tsq-react'],
    );
    expect(result).toBe(content);
  });

  it('should deduplicate skills', () => {
    const content = makeFrontmatter(['tsq-protocol', 'tsq-database']);
    const result = injectSkillsIntoFrontmatter(
      content, 'dba' as AgentType, ['tsq-database', 'tsq-prisma'],
    );
    expect(result).toContain('tsq-prisma');
    // tsq-database should appear only once (already existed)
    const matches = result.match(/tsq-database/g);
    expect(matches!.length).toBe(1);
  });

  it('should return content unchanged when no matching skills', () => {
    const content = makeFrontmatter(['tsq-protocol', 'tsq-coding']);
    const result = injectSkillsIntoFrontmatter(
      content, 'developer' as AgentType, ['tsq-typescript', 'tsq-protocol'],
    );
    // tsq-typescript doesn't match developer keywords (react, nextjs, node, prisma, database, flutter, dart, ui)
    // tsq-protocol doesn't match either
    expect(result).toBe(content);
  });

  it('should return content unchanged when no frontmatter', () => {
    const content = 'No frontmatter content';
    const result = injectSkillsIntoFrontmatter(
      content, 'developer' as AgentType, ['tsq-react'],
    );
    expect(result).toBe(content);
  });

  it('should return content unchanged when no skills field in frontmatter', () => {
    const content = '---\nname: tsq-developer\nmodel: sonnet\n---\n\nBody';
    const result = injectSkillsIntoFrontmatter(
      content, 'developer' as AgentType, ['tsq-react'],
    );
    expect(result).toBe(content);
  });

  it('should return content unchanged with empty active skills', () => {
    const content = makeFrontmatter(['tsq-protocol', 'tsq-coding']);
    const result = injectSkillsIntoFrontmatter(
      content, 'developer' as AgentType, [],
    );
    expect(result).toBe(content);
  });

  it('should preserve body content after frontmatter', () => {
    const body = '\n## Agent Instructions\n\nDo stuff here.';
    const content = `---\nname: tsq-developer\nskills: [tsq-protocol, tsq-coding]\n---${body}`;
    const result = injectSkillsIntoFrontmatter(
      content, 'developer' as AgentType, ['tsq-react'],
    );
    expect(result).toContain('tsq-react');
    expect(result).toContain('## Agent Instructions');
    expect(result).toContain('Do stuff here.');
  });
});

describe('getActiveSkills — stack normalization', () => {
  it('should derive skills from project.stack array', () => {
    const config = createDefaultConfig('test', 'web-service', 2, { stack: ['react', 'node'] });
    const skills = getActiveSkills(config);
    expect(skills).toContain('tsq-react');
    expect(skills).toContain('tsq-hono');
  });

  it('should not add stack-derived skills when project.stack is empty array', () => {
    const config = createDefaultConfig('test', 'api-backend', 2, { stack: [] });
    const skills = getActiveSkills(config);
    expect(skills).not.toContain('tsq-nextjs');
  });

  it('should derive skills from top-level stack when project.stack is missing', () => {
    const config = createDefaultConfig('test', 'web-service', 2);
    (config.project as Record<string, unknown>).stack = undefined;
    const skills = getActiveSkills(config);
    expect(skills.length).toBeGreaterThan(0);
  });

  it('should handle object-shaped project.stack gracefully', () => {
    const config = createDefaultConfig('test', 'web-service', 2);
    (config.project as Record<string, unknown>).stack = { language: 'typescript', frontend: 'react' };
    const skills = getActiveSkills(config);
    expect(skills).toContain('tsq-react');
  });
});

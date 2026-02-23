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
    const content = makeFrontmatter(['tsq-protocol', 'coding', 'testing']);
    const result = injectSkillsIntoFrontmatter(
      content, 'developer' as AgentType, ['frontend/react', 'frontend/nextjs', 'backend/node', 'database/prisma'],
    );
    expect(result).toContain('frontend/react');
    expect(result).toContain('frontend/nextjs');
    expect(result).toContain('backend/node');
    expect(result).toContain('database/prisma');
    // 기존 스킬 유지
    expect(result).toContain('tsq-protocol');
    expect(result).toContain('coding');
  });

  it('should inject only database skills for dba', () => {
    const content = makeFrontmatter(['tsq-protocol', 'database']);
    const result = injectSkillsIntoFrontmatter(
      content, 'dba' as AgentType, ['frontend/react', 'database/prisma', 'backend/node'],
    );
    expect(result).toContain('database/prisma');
    expect(result).not.toContain('frontend/react');
    expect(result).not.toContain('backend/node');
  });

  it('should inject only frontend skills for designer', () => {
    const content = makeFrontmatter(['tsq-protocol', 'ui-design']);
    const result = injectSkillsIntoFrontmatter(
      content, 'designer' as AgentType, ['frontend/react', 'backend/node', 'database/prisma'],
    );
    expect(result).toContain('frontend/react');
    expect(result).not.toContain('backend/node');
    expect(result).not.toContain('database/prisma');
  });

  it('should not inject skills for architect (empty categories)', () => {
    const content = makeFrontmatter(['tsq-protocol', 'architecture']);
    const result = injectSkillsIntoFrontmatter(
      content, 'architect' as AgentType, ['frontend/react', 'backend/node'],
    );
    // 변경 없어야 함
    expect(result).toBe(content);
  });

  it('should not inject skills for qa (empty categories)', () => {
    const content = makeFrontmatter(['tsq-protocol', 'testing']);
    const result = injectSkillsIntoFrontmatter(
      content, 'qa' as AgentType, ['frontend/react'],
    );
    expect(result).toBe(content);
  });

  it('should deduplicate skills', () => {
    const content = makeFrontmatter(['tsq-protocol', 'database']);
    const result = injectSkillsIntoFrontmatter(
      content, 'dba' as AgentType, ['database', 'database/prisma'],
    );
    // 'database'는 카테고리 매칭되지 않음 (category === skill 전체)
    // 'database/prisma'만 추가
    expect(result).toContain('database/prisma');
    const matches = result.match(/database/g);
    // 'database' (기존) + 'database/prisma' (신규) = 최소 2회
    expect(matches!.length).toBeGreaterThanOrEqual(2);
  });

  it('should return content unchanged when no matching skills', () => {
    const content = makeFrontmatter(['tsq-protocol', 'coding']);
    const result = injectSkillsIntoFrontmatter(
      content, 'developer' as AgentType, ['typescript', 'tsq-protocol'],
    );
    // 'typescript'와 'tsq-protocol'은 카테고리에 `/` 없어서 매칭 안 됨
    expect(result).toBe(content);
  });

  it('should return content unchanged when no frontmatter', () => {
    const content = 'No frontmatter content';
    const result = injectSkillsIntoFrontmatter(
      content, 'developer' as AgentType, ['frontend/react'],
    );
    expect(result).toBe(content);
  });

  it('should return content unchanged when no skills field in frontmatter', () => {
    const content = '---\nname: tsq-developer\nmodel: sonnet\n---\n\nBody';
    const result = injectSkillsIntoFrontmatter(
      content, 'developer' as AgentType, ['frontend/react'],
    );
    expect(result).toBe(content);
  });

  it('should return content unchanged with empty active skills', () => {
    const content = makeFrontmatter(['tsq-protocol', 'coding']);
    const result = injectSkillsIntoFrontmatter(
      content, 'developer' as AgentType, [],
    );
    expect(result).toBe(content);
  });

  it('should preserve body content after frontmatter', () => {
    const body = '\n## Agent Instructions\n\nDo stuff here.';
    const content = `---\nname: tsq-developer\nskills: [tsq-protocol, coding]\n---${body}`;
    const result = injectSkillsIntoFrontmatter(
      content, 'developer' as AgentType, ['frontend/react'],
    );
    expect(result).toContain('frontend/react');
    expect(result).toContain('## Agent Instructions');
    expect(result).toContain('Do stuff here.');
  });
});

describe('getActiveSkills — stack normalization', () => {
  it('should derive skills from project.stack array', () => {
    const config = createDefaultConfig('test', 'web-service', 2, { stack: ['react', 'node'] });
    const skills = getActiveSkills(config);
    expect(skills).toContain('frontend/react');
    expect(skills).toContain('backend/node');
  });

  it('should not add stack-derived skills when project.stack is empty array', () => {
    const config = createDefaultConfig('test', 'api-backend', 2, { stack: [] });
    // Empty array = intentional "no stack skills" (type preset only)
    const skills = getActiveSkills(config);
    // api-backend preset does NOT include frontend/nextjs, but top-level stack has nextjs
    // With empty array, stack fallback should NOT activate
    expect(skills).not.toContain('frontend/nextjs');
  });

  it('should derive skills from top-level stack when project.stack is missing', () => {
    const config = createDefaultConfig('test', 'web-service', 2);
    (config.project as Record<string, unknown>).stack = undefined;
    const skills = getActiveSkills(config);
    // Should fallback to top-level stack config values
    expect(skills.length).toBeGreaterThan(0);
  });

  it('should handle object-shaped project.stack gracefully', () => {
    const config = createDefaultConfig('test', 'web-service', 2);
    (config.project as Record<string, unknown>).stack = { language: 'typescript', frontend: 'react' };
    const skills = getActiveSkills(config);
    expect(skills).toContain('frontend/react');
  });
});

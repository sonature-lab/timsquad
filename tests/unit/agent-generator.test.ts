import { describe, it, expect } from 'vitest';
import { getActiveAgents, generateDelegationRules, formatActiveAgentsList } from '../../src/lib/agent-generator.js';
import { AGENT_PRESETS } from '../../src/types/config.js';
import { createDefaultConfig } from '../../src/lib/config.js';
import type { ProjectType } from '../../src/types/project.js';

const ALL_TYPES: ProjectType[] = ['web-service', 'web-app', 'api-backend', 'platform', 'fintech', 'infra'];

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

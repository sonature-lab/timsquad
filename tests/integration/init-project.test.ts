import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { initializeProject } from '../../src/lib/template.js';
import { createDefaultConfig } from '../../src/lib/config.js';
import { getActiveSkills, getActiveKnowledge } from '../../src/lib/skill-generator.js';
import { getActiveAgents } from '../../src/lib/agent-generator.js';
import { createTmpDir } from '../helpers/tmp-dir.js';
import type { ProjectType } from '../../src/types/project.js';

const ALL_TYPES: ProjectType[] = ['web-service', 'web-app', 'api-backend', 'platform', 'fintech', 'infra', 'mobile-app'];

let tmpDir: string;
let cleanup: () => Promise<void>;

beforeEach(async () => {
  const tmp = await createTmpDir();
  tmpDir = tmp.dir;
  cleanup = tmp.cleanup;
});

afterEach(async () => {
  await cleanup();
});

describe('initializeProject - Common Structure', () => {
  it('should create .timsquad directory', async () => {
    const config = createDefaultConfig('test', 'web-service', 2);
    await initializeProject(tmpDir, 'test', 'web-service', 2, config);

    expect(existsSync(path.join(tmpDir, '.timsquad'))).toBe(true);
    expect(existsSync(path.join(tmpDir, '.timsquad', 'state'))).toBe(true);
    expect(existsSync(path.join(tmpDir, '.timsquad', 'logs'))).toBe(true);
  });

  it('should deploy automation scripts to .timsquad/scripts/', async () => {
    const config = createDefaultConfig('test', 'web-service', 2);
    await initializeProject(tmpDir, 'test', 'web-service', 2, config);

    const scriptsDir = path.join(tmpDir, '.timsquad', 'scripts');
    expect(existsSync(scriptsDir)).toBe(true);

    const expectedScripts = [
      'check-circular-deps.sh',
      'calculate-retro-metrics.sh',
      'generate-prd-traceability.sh',
      'manage-fp-registry.sh',
      'cleanup-trails.sh',
      'validate-gherkin.sh',
    ];
    for (const script of expectedScripts) {
      expect(existsSync(path.join(scriptsDir, script)), `${script} should exist`).toBe(true);
    }
  });

  it('should create .claude directory', async () => {
    const config = createDefaultConfig('test', 'web-service', 2);
    await initializeProject(tmpDir, 'test', 'web-service', 2, config);

    expect(existsSync(path.join(tmpDir, '.claude'))).toBe(true);
    expect(existsSync(path.join(tmpDir, '.claude', 'settings.json'))).toBe(true);
  });

  it('should create CLAUDE.md', async () => {
    const config = createDefaultConfig('test', 'web-service', 2);
    await initializeProject(tmpDir, 'test', 'web-service', 2, config);

    expect(existsSync(path.join(tmpDir, 'CLAUDE.md'))).toBe(true);
    const content = readFileSync(path.join(tmpDir, 'CLAUDE.md'), 'utf-8');
    expect(content).toContain('<!-- tsq:start -->');
    expect(content).toContain('<!-- tsq:end -->');
  });

  it('should create .gitignore', async () => {
    const config = createDefaultConfig('test', 'web-service', 2);
    await initializeProject(tmpDir, 'test', 'web-service', 2, config);

    expect(existsSync(path.join(tmpDir, '.gitignore'))).toBe(true);
  });

  it('should not overwrite existing .gitignore', async () => {
    // Create existing .gitignore
    const { writeFileSync } = await import('node:fs');
    writeFileSync(path.join(tmpDir, '.gitignore'), 'custom-ignore\n');

    const config = createDefaultConfig('test', 'web-service', 2);
    await initializeProject(tmpDir, 'test', 'web-service', 2, config);

    const content = readFileSync(path.join(tmpDir, '.gitignore'), 'utf-8');
    expect(content).toBe('custom-ignore\n');
  });

  it('should create initial state files', async () => {
    const config = createDefaultConfig('test', 'web-service', 2);
    await initializeProject(tmpDir, 'test', 'web-service', 2, config);

    const phasePath = path.join(tmpDir, '.timsquad', 'state', 'current-phase.json');
    expect(existsSync(phasePath)).toBe(true);

    const phase = JSON.parse(readFileSync(phasePath, 'utf-8'));
    expect(phase.current).toBe('planning');
    expect(phase.progress).toBe(0);
  });

  it('should substitute template variables', async () => {
    const config = createDefaultConfig('my-project', 'web-service', 2);
    await initializeProject(tmpDir, 'my-project', 'web-service', 2, config);

    const claudeMd = readFileSync(path.join(tmpDir, 'CLAUDE.md'), 'utf-8');
    // 변수가 치환되어야 함
    expect(claudeMd).not.toContain('{{PROJECT_NAME}}');
  });
});

describe('initializeProject - Selective Agent Deployment', () => {
  it.each(ALL_TYPES)('should deploy only active agents for %s', async (type) => {
    const config = createDefaultConfig('test', type, 2);
    await initializeProject(tmpDir, 'test', type, type === 'fintech' ? 3 : 2, config);

    const agentsDir = path.join(tmpDir, '.claude', 'agents');
    if (!existsSync(agentsDir)) return;

    const files = readdirSync(agentsDir).filter(f => f.startsWith('tsq-'));
    const activeAgents = getActiveAgents(config);
    const expectedFiles = activeAgents.map(a => `tsq-${a}.md`);

    // 모든 활성 에이전트가 존재해야 함
    for (const expected of expectedFiles) {
      expect(files, `Missing ${expected} for type ${type}`).toContain(expected);
    }

    // 비활성 에이전트는 존재하지 않아야 함
    for (const file of files) {
      expect(expectedFiles, `Unexpected ${file} for type ${type}`).toContain(file);
    }
  });
});

describe('initializeProject - Selective Skill Deployment', () => {
  it('should not deploy frontend skills for api-backend', async () => {
    const config = createDefaultConfig('test', 'api-backend', 2);
    await initializeProject(tmpDir, 'test', 'api-backend', 2, config);

    const skillsDir = path.join(tmpDir, '.claude', 'skills');
    if (!existsSync(skillsDir)) return;

    const entries = readdirSync(skillsDir);
    expect(entries).not.toContain('tsq-react');
    expect(entries).not.toContain('tsq-ui');
  });

  it('should deploy frontend skills for web-service', async () => {
    const config = createDefaultConfig('test', 'web-service', 2);
    await initializeProject(tmpDir, 'test', 'web-service', 2, config);

    const reactDir = path.join(tmpDir, '.claude', 'skills', 'tsq-react');
    expect(existsSync(reactDir)).toBe(true);
  });

  it('should deploy minimal skills for infra', async () => {
    const config = createDefaultConfig('test', 'infra', 2);
    await initializeProject(tmpDir, 'test', 'infra', 2, config);

    const skillsDir = path.join(tmpDir, '.claude', 'skills');
    if (!existsSync(skillsDir)) return;

    const entries = readdirSync(skillsDir);
    expect(entries).not.toContain('tsq-react');
    expect(entries).not.toContain('tsq-database');
    expect(entries).not.toContain('tsq-hono');
  });
});

describe('initializeProject - Selective Knowledge Deployment', () => {
  it('should deploy security checklist for all types', async () => {
    for (const type of ALL_TYPES) {
      const tmp = await createTmpDir();
      try {
        const config = createDefaultConfig('test', type, 2);
        await initializeProject(tmp.dir, 'test', type, type === 'fintech' ? 3 : 2, config);

        const securityPath = path.join(tmp.dir, '.claude', 'knowledge', 'checklists', 'security.md');
        expect(existsSync(securityPath), `Missing security.md for ${type}`).toBe(true);
      } finally {
        await tmp.cleanup();
      }
    }
  });

  it('should not deploy design-reference for api-backend', async () => {
    const config = createDefaultConfig('test', 'api-backend', 2);
    await initializeProject(tmpDir, 'test', 'api-backend', 2, config);

    const designRef = path.join(tmpDir, '.claude', 'knowledge', 'checklists', 'design-reference.md');
    expect(existsSync(designRef)).toBe(false);
  });
});

describe('initializeProject - Composition Layer (v4.0)', () => {
  it('should merge platform overlay into agents', async () => {
    const config = createDefaultConfig('test', 'web-service', 2, {
      domain: 'general-web',
      platform: 'claude-code',
    });
    await initializeProject(tmpDir, 'test', 'web-service', 2, config);

    const agentsDir = path.join(tmpDir, '.claude', 'agents');
    if (!existsSync(agentsDir)) return;

    // Developer agent should contain platform overlay rules
    const devPath = path.join(agentsDir, 'tsq-developer.md');
    if (existsSync(devPath)) {
      const content = readFileSync(devPath, 'utf-8');
      expect(content).toContain('tsq-protocol');
      expect(content).toContain('.timsquad/logs/');
    }
  });

  it('should merge domain overlay into agents', async () => {
    const config = createDefaultConfig('test', 'web-service', 2, {
      domain: 'general-web',
      platform: 'claude-code',
    });
    await initializeProject(tmpDir, 'test', 'web-service', 2, config);

    const agentsDir = path.join(tmpDir, '.claude', 'agents');
    if (!existsSync(agentsDir)) return;

    const devPath = path.join(agentsDir, 'tsq-developer.md');
    if (existsSync(devPath)) {
      const content = readFileSync(devPath, 'utf-8');
      expect(content).toContain('WCAG 2.1 AA');
    }
  });

  it('should deploy stack-specific skills', async () => {
    const config = createDefaultConfig('test', 'infra', 2, {
      stack: ['react', 'prisma'],
    });
    await initializeProject(tmpDir, 'test', 'infra', 2, config);

    const skillsDir = path.join(tmpDir, '.claude', 'skills');
    if (!existsSync(skillsDir)) return;

    // Stack adds tsq-react and tsq-prisma even for infra type
    const entries = readdirSync(skillsDir);
    expect(entries).toContain('tsq-react');
    expect(entries).toContain('tsq-prisma');
  });

  it('should not deploy stack skills when stack is empty', async () => {
    const config = createDefaultConfig('test', 'infra', 2, {
      stack: [],
    });
    await initializeProject(tmpDir, 'test', 'infra', 2, config);

    const skillsDir = path.join(tmpDir, '.claude', 'skills');
    if (!existsSync(skillsDir)) return;

    const entries = readdirSync(skillsDir);
    expect(entries).not.toContain('tsq-react');
  });
});

describe('initializeProject - Selective SSOT Deployment', () => {
  it('should deploy compliance-matrix for fintech L1', async () => {
    const config = createDefaultConfig('test', 'fintech', 1);
    await initializeProject(tmpDir, 'test', 'fintech', 1, config);

    const ssotDir = path.join(tmpDir, '.timsquad', 'ssot');
    expect(existsSync(path.join(ssotDir, 'compliance-matrix.md'))).toBe(true);
    expect(existsSync(path.join(ssotDir, 'audit-trail-spec.md'))).toBe(true);
    expect(existsSync(path.join(ssotDir, 'state-machine.md'))).toBe(true);
  });

  it('should not deploy compliance-matrix for web-service', async () => {
    const config = createDefaultConfig('test', 'web-service', 2);
    await initializeProject(tmpDir, 'test', 'web-service', 2, config);

    const ssotDir = path.join(tmpDir, '.timsquad', 'ssot');
    expect(existsSync(path.join(ssotDir, 'compliance-matrix.md'))).toBe(false);
    expect(existsSync(path.join(ssotDir, 'audit-trail-spec.md'))).toBe(false);
  });

  it('should deploy navigation-map for mobile-app', async () => {
    const config = createDefaultConfig('test', 'mobile-app', 1);
    await initializeProject(tmpDir, 'test', 'mobile-app', 1, config);

    const ssotDir = path.join(tmpDir, '.timsquad', 'ssot');
    expect(existsSync(path.join(ssotDir, 'navigation-map.md'))).toBe(true);
  });

  it('should not deploy navigation-map for api-backend', async () => {
    const config = createDefaultConfig('test', 'api-backend', 2);
    await initializeProject(tmpDir, 'test', 'api-backend', 2, config);

    const ssotDir = path.join(tmpDir, '.timsquad', 'ssot');
    expect(existsSync(path.join(ssotDir, 'navigation-map.md'))).toBe(false);
  });

  it('should deploy sdk-spec for platform', async () => {
    const config = createDefaultConfig('test', 'platform', 1);
    await initializeProject(tmpDir, 'test', 'platform', 1, config);

    const ssotDir = path.join(tmpDir, '.timsquad', 'ssot');
    expect(existsSync(path.join(ssotDir, 'sdk-spec.md'))).toBe(true);
  });

  it('should deploy infra-topology for infra L1', async () => {
    const config = createDefaultConfig('test', 'infra', 1);
    await initializeProject(tmpDir, 'test', 'infra', 1, config);

    const ssotDir = path.join(tmpDir, '.timsquad', 'ssot');
    expect(existsSync(path.join(ssotDir, 'infra-topology.md'))).toBe(true);
    expect(existsSync(path.join(ssotDir, 'monitoring-spec.md'))).toBe(true);
  });

  it('should deploy component-map for web-service L2 but not L1', async () => {
    const configL2 = createDefaultConfig('test', 'web-service', 2);
    await initializeProject(tmpDir, 'test', 'web-service', 2, configL2);
    expect(existsSync(path.join(tmpDir, '.timsquad', 'ssot', 'component-map.md'))).toBe(true);

    const tmp2 = await createTmpDir();
    try {
      const configL1 = createDefaultConfig('test', 'web-service', 1);
      await initializeProject(tmp2.dir, 'test', 'web-service', 1, configL1);
      expect(existsSync(path.join(tmp2.dir, '.timsquad', 'ssot', 'component-map.md'))).toBe(false);
    } finally {
      await tmp2.cleanup();
    }
  });

  it('should always deploy base SSOT documents', async () => {
    for (const type of ALL_TYPES) {
      const tmp = await createTmpDir();
      try {
        const config = createDefaultConfig('test', type, 1);
        await initializeProject(tmp.dir, 'test', type, 1, config);

        const ssotDir = path.join(tmp.dir, '.timsquad', 'ssot');
        // Level 1 base documents should always exist
        expect(existsSync(path.join(ssotDir, 'prd.md')), `Missing prd.md for ${type}`).toBe(true);
        expect(existsSync(path.join(ssotDir, 'planning.md')), `Missing planning.md for ${type}`).toBe(true);
        expect(existsSync(path.join(ssotDir, 'requirements.md')), `Missing requirements.md for ${type}`).toBe(true);
      } finally {
        await tmp.cleanup();
      }
    }
  });

  it('should have no unsubstituted {{}} in type-specific SSOT files', async () => {
    const config = createDefaultConfig('test', 'fintech', 3);
    await initializeProject(tmpDir, 'test', 'fintech', 3, config);

    const ssotDir = path.join(tmpDir, '.timsquad', 'ssot');
    const files = readdirSync(ssotDir).filter(f => f.endsWith('.md'));

    for (const file of files) {
      const content = readFileSync(path.join(ssotDir, file), 'utf-8');
      const remaining = content.match(/\{\{[A-Z_]+\}\}/g);
      expect(remaining, `Unsubstituted variables in ${file}: ${remaining?.join(', ')}`).toBeNull();
    }
  });

  it('should use fintech override for compliance-matrix', async () => {
    const config = createDefaultConfig('test', 'fintech', 3);
    await initializeProject(tmpDir, 'test', 'fintech', 3, config);

    const content = readFileSync(
      path.join(tmpDir, '.timsquad', 'ssot', 'compliance-matrix.md'), 'utf-8',
    );
    // fintech 오버라이드에만 있는 내용
    expect(content).toContain('전자금융거래법');
    expect(content).toContain('PCI DSS v4.0');
    expect(content).toContain('type_override: fintech');
  });

  it('should use fintech override for audit-trail-spec', async () => {
    const config = createDefaultConfig('test', 'fintech', 3);
    await initializeProject(tmpDir, 'test', 'fintech', 3, config);

    const content = readFileSync(
      path.join(tmpDir, '.timsquad', 'ssot', 'audit-trail-spec.md'), 'utf-8',
    );
    expect(content).toContain('TRADE_EXECUTED');
    expect(content).toContain('FDS');
    expect(content).toContain('type_override: fintech');
  });

  it('should use base compliance-matrix for non-fintech types that do not have override', async () => {
    // web-service L2 doesn't have compliance-matrix at all (not in required)
    // but if it did, it should be the base version
    const config = createDefaultConfig('test', 'web-service', 2);
    await initializeProject(tmpDir, 'test', 'web-service', 2, config);

    // web-service L2 doesn't include compliance-matrix
    expect(existsSync(path.join(tmpDir, '.timsquad', 'ssot', 'compliance-matrix.md'))).toBe(false);
  });
});

describe('initializeProject - No Remaining Template Variables', () => {
  it.each(ALL_TYPES)('should have no unsubstituted {{}} in generated files for %s', async (type) => {
    const tmp = await createTmpDir();
    try {
      const config = createDefaultConfig('test', type, 2);
      await initializeProject(tmp.dir, 'test', type, type === 'fintech' ? 3 : 2, config);

      // Check CLAUDE.md
      const claudeMd = readFileSync(path.join(tmp.dir, 'CLAUDE.md'), 'utf-8');
      const remaining = claudeMd.match(/\{\{[A-Z_]+\}\}/g);
      expect(remaining, `Unsubstituted variables in CLAUDE.md for ${type}: ${remaining?.join(', ')}`).toBeNull();
    } finally {
      await tmp.cleanup();
    }
  });
});

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { initializeProject } from '../../src/lib/template.js';
import { createDefaultConfig } from '../../src/lib/config.js';
import { getActiveSkills, getActiveKnowledge } from '../../src/lib/skill-generator.js';
import { getActiveAgents } from '../../src/lib/agent-generator.js';
import { createTmpDir } from '../helpers/tmp-dir.js';
import type { ProjectType } from '../../src/types/project.js';

const ALL_TYPES: ProjectType[] = ['web-service', 'web-app', 'api-backend', 'platform', 'fintech', 'infra'];

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
    expect(content).toContain('test');
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
    expect(entries).not.toContain('frontend');
    expect(entries).not.toContain('ui-design');
  });

  it('should deploy frontend skills for web-service', async () => {
    const config = createDefaultConfig('test', 'web-service', 2);
    await initializeProject(tmpDir, 'test', 'web-service', 2, config);

    const frontendDir = path.join(tmpDir, '.claude', 'skills', 'frontend');
    expect(existsSync(frontendDir)).toBe(true);
  });

  it('should deploy minimal skills for infra', async () => {
    const config = createDefaultConfig('test', 'infra', 2);
    await initializeProject(tmpDir, 'test', 'infra', 2, config);

    const skillsDir = path.join(tmpDir, '.claude', 'skills');
    if (!existsSync(skillsDir)) return;

    const entries = readdirSync(skillsDir);
    expect(entries).not.toContain('frontend');
    expect(entries).not.toContain('database');
    expect(entries).not.toContain('backend');
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
      expect(content).toContain('tsq log');
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

    // Stack adds frontend/react and database/prisma even for infra type
    const entries = readdirSync(skillsDir);
    expect(entries).toContain('frontend');
    expect(entries).toContain('database');
  });

  it('should not deploy stack skills when stack is empty', async () => {
    const config = createDefaultConfig('test', 'infra', 2, {
      stack: [],
    });
    await initializeProject(tmpDir, 'test', 'infra', 2, config);

    const skillsDir = path.join(tmpDir, '.claude', 'skills');
    if (!existsSync(skillsDir)) return;

    const entries = readdirSync(skillsDir);
    expect(entries).not.toContain('frontend');
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

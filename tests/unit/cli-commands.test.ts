import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import path from 'path';
import fs from 'fs-extra';
import os from 'os';
import { execSync } from 'child_process';

const CLI_PATH = path.resolve(__dirname, '../../dist/index.js');

describe('CLI command registration', () => {
  it('tsq --help should list all commands', () => {
    const output = execSync(`node "${CLI_PATH}" --help`, { encoding: 'utf-8' });
    expect(output).toContain('init');
    expect(output).toContain('update');
    expect(output).toContain('daemon');
    expect(output).toContain('next');
    expect(output).toContain('plan');
    expect(output).toContain('spec');
    expect(output).toContain('log');
    expect(output).toContain('status');
    expect(output).toContain('retro');
    expect(output).toContain('audit');
  });

  it('tsq plan --help should show validate subcommand', () => {
    const output = execSync(`node "${CLI_PATH}" plan --help`, { encoding: 'utf-8' });
    expect(output).toContain('validate');
  });

  it('tsq spec --help should show check subcommand', () => {
    const output = execSync(`node "${CLI_PATH}" spec --help`, { encoding: 'utf-8' });
    expect(output).toContain('check');
  });

  it('tsq log --help should show sequence and phase subcommands', () => {
    const output = execSync(`node "${CLI_PATH}" log --help`, { encoding: 'utf-8' });
    expect(output).toContain('sequence');
    expect(output).toContain('phase');
  });

  it('tsq status --help should show --drift and --memory flags', () => {
    const output = execSync(`node "${CLI_PATH}" status --help`, { encoding: 'utf-8' });
    expect(output).toContain('--drift');
    expect(output).toContain('--memory');
  });

  it('tsq retro --help should show metrics subcommand', () => {
    const output = execSync(`node "${CLI_PATH}" retro --help`, { encoding: 'utf-8' });
    expect(output).toContain('metrics');
  });

  it('tsq audit --help should show score subcommand', () => {
    const output = execSync(`node "${CLI_PATH}" audit --help`, { encoding: 'utf-8' });
    expect(output).toContain('score');
  });
});

describe('tsq plan validate', () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'tsq-plan-'));
    await fs.ensureDir(path.join(tmpDir, '.timsquad', 'ssot'));
    await fs.writeJson(path.join(tmpDir, '.timsquad', 'config.json'), {
      project: { name: 'test', type: 'web-service', level: 'standard', created: new Date().toISOString() },
    });
  });

  afterEach(async () => {
    await fs.remove(tmpDir);
  });

  it('should validate a well-formed planning.md', async () => {
    await fs.writeFile(path.join(tmpDir, '.timsquad', 'ssot', 'planning.md'), `# Test 기획서

## Phase 1: MVP

### Sequence 1: Core

#### Task 1: Setup
#### Task 2: Implement

## Phase 2: Beta

### Sequence 1: Polish

#### Task 1: Refactor
`);

    const output = execSync(`node "${CLI_PATH}" plan validate`, {
      encoding: 'utf-8',
      cwd: tmpDir,
    });
    const result = JSON.parse(output);
    expect(result.valid).toBe(true);
    expect(result.phases).toBe(2);
    expect(result.totalTasks).toBe(3);
    expect(result.issues).toHaveLength(0);
  });

  it('should report error when planning.md is missing', () => {
    try {
      execSync(`node "${CLI_PATH}" plan validate`, {
        encoding: 'utf-8',
        cwd: tmpDir,
      });
      expect.unreachable();
    } catch (err: any) {
      const output = err.stdout || '';
      expect(output).toContain('planning.md not found');
    }
  });
});

describe('tsq audit score', () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'tsq-audit-'));
    await fs.ensureDir(path.join(tmpDir, '.timsquad', 'ssot'));
    await fs.ensureDir(path.join(tmpDir, '.timsquad', 'state'));
    await fs.writeJson(path.join(tmpDir, '.timsquad', 'config.json'), {
      project: { name: 'test', type: 'web-service', level: 'standard', created: new Date().toISOString() },
    });
  });

  afterEach(async () => {
    await fs.remove(tmpDir);
  });

  it('should return 7-area score matrix', () => {
    const output = execSync(`node "${CLI_PATH}" audit score`, {
      encoding: 'utf-8',
      cwd: tmpDir,
    });
    const result = JSON.parse(output);
    expect(result).toHaveProperty('overallScore');
    expect(result).toHaveProperty('areas');
    expect(result.areas).toHaveLength(7);
    expect(result.areas[0]).toHaveProperty('area');
    expect(result.areas[0]).toHaveProperty('score');
    expect(result.areas[0]).toHaveProperty('checks');
  });
});

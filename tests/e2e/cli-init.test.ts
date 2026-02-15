import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { createTmpDir } from '../helpers/tmp-dir.js';

const TSQ_BIN = path.resolve(import.meta.dirname, '../../bin/tsq.js');

let tmpDir: string;
let cleanup: () => Promise<void>;

function runTsq(args: string[], cwd: string): { stdout: string; exitCode: number } {
  try {
    const stdout = execFileSync('node', [TSQ_BIN, ...args], {
      cwd,
      encoding: 'utf-8',
      timeout: 20000,
      env: { ...process.env, FORCE_COLOR: '0', NO_COLOR: '1' },
    });
    return { stdout, exitCode: 0 };
  } catch (error: unknown) {
    const e = error as { stdout?: string; stderr?: string; status?: number };
    return {
      stdout: (e.stdout || '') + (e.stderr || ''),
      exitCode: e.status ?? 1,
    };
  }
}

beforeEach(async () => {
  const tmp = await createTmpDir('tsq-e2e-');
  tmpDir = tmp.dir;
  cleanup = tmp.cleanup;
});

afterEach(async () => {
  await cleanup();
});

describe('tsq init - Non-interactive', () => {
  it('should initialize web-service project', () => {
    const { exitCode } = runTsq(
      ['init', '-n', 'test-ws', '-t', 'web-service', '-l', '1', '-y'],
      tmpDir,
    );

    expect(exitCode).toBe(0);
    expect(existsSync(path.join(tmpDir, '.timsquad'))).toBe(true);
    expect(existsSync(path.join(tmpDir, '.claude'))).toBe(true);
    expect(existsSync(path.join(tmpDir, 'CLAUDE.md'))).toBe(true);
    expect(existsSync(path.join(tmpDir, '.timsquad', 'config.yaml'))).toBe(true);
  });

  it('should initialize api-backend project', () => {
    const { exitCode } = runTsq(
      ['init', '-n', 'test-api', '-t', 'api-backend', '-l', '1', '-y'],
      tmpDir,
    );

    expect(exitCode).toBe(0);

    // api-backend에는 frontend 스킬이 없어야 함
    const skillsDir = path.join(tmpDir, '.claude', 'skills');
    if (existsSync(skillsDir)) {
      const entries = readdirSync(skillsDir);
      expect(entries).not.toContain('frontend');
      expect(entries).not.toContain('ui-design');
    }
  });

  it('should initialize fintech project with level 3 forced', () => {
    const { exitCode } = runTsq(
      ['init', '-n', 'test-bank', '-t', 'fintech', '-l', '1', '-y'],
      tmpDir,
    );

    expect(exitCode).toBe(0);

    // config에서 level이 3으로 강제되어야 함
    const configPath = path.join(tmpDir, '.timsquad', 'config.yaml');
    const configContent = readFileSync(configPath, 'utf-8');
    expect(configContent).toMatch(/level:\s*3/);
  });

  it('should initialize infra project with minimal agents', () => {
    const { exitCode } = runTsq(
      ['init', '-n', 'test-infra', '-t', 'infra', '-l', '1', '-y'],
      tmpDir,
    );

    expect(exitCode).toBe(0);

    const agentsDir = path.join(tmpDir, '.claude', 'agents');
    if (existsSync(agentsDir)) {
      const files = readdirSync(agentsDir);
      // infra: architect, developer, security
      expect(files).toContain('tsq-architect.md');
      expect(files).toContain('tsq-developer.md');
      expect(files).toContain('tsq-security.md');
      expect(files).not.toContain('tsq-designer.md');
      expect(files).not.toContain('tsq-dba.md');
    }
  });
});

describe('tsq init - Composition Layer (v4.0)', () => {
  it('should accept --domain option', () => {
    const { exitCode } = runTsq(
      ['init', '-n', 'test-ml', '-t', 'api-backend', '-l', '2', '--domain', 'ml-engineering', '-y'],
      tmpDir,
    );

    expect(exitCode).toBe(0);

    const configPath = path.join(tmpDir, '.timsquad', 'config.yaml');
    const configContent = readFileSync(configPath, 'utf-8');
    expect(configContent).toContain('ml-engineering');
  });

  it('should accept --stack option', () => {
    const { exitCode } = runTsq(
      ['init', '-n', 'test-stack', '-t', 'infra', '-l', '1', '--stack', 'react,prisma', '-y'],
      tmpDir,
    );

    expect(exitCode).toBe(0);

    // Stack skills should be deployed
    const skillsDir = path.join(tmpDir, '.claude', 'skills');
    if (existsSync(skillsDir)) {
      const entries = readdirSync(skillsDir);
      expect(entries).toContain('frontend');
      expect(entries).toContain('database');
    }
  });

  it('should include domain and platform in config.yaml', () => {
    runTsq(
      ['init', '-n', 'test-conf', '-t', 'web-service', '-l', '2', '-y'],
      tmpDir,
    );

    const configPath = path.join(tmpDir, '.timsquad', 'config.yaml');
    const configContent = readFileSync(configPath, 'utf-8');
    expect(configContent).toContain('domain:');
    expect(configContent).toContain('platform:');
  });
});

describe('tsq init - Generated File Quality', () => {
  it('should have no unsubstituted template variables', () => {
    runTsq(['init', '-n', 'test-app', '-t', 'web-service', '-l', '2', '-y'], tmpDir);

    // Check CLAUDE.md
    const claudeMd = readFileSync(path.join(tmpDir, 'CLAUDE.md'), 'utf-8');
    expect(claudeMd).not.toMatch(/\{\{[A-Z_]+\}\}/);

    // Check agent files
    const agentsDir = path.join(tmpDir, '.claude', 'agents');
    if (existsSync(agentsDir)) {
      for (const file of readdirSync(agentsDir)) {
        const content = readFileSync(path.join(agentsDir, file), 'utf-8');
        expect(content, `Unsubstituted var in ${file}`).not.toMatch(/\{\{[A-Z_]+\}\}/);
      }
    }
  });

  it('should write valid JSON state files', () => {
    runTsq(['init', '-n', 'test-app', '-t', 'web-service', '-l', '1', '-y'], tmpDir);

    // current-phase.json
    const phasePath = path.join(tmpDir, '.timsquad', 'state', 'current-phase.json');
    expect(() => JSON.parse(readFileSync(phasePath, 'utf-8'))).not.toThrow();

    // workflow.json
    const workflowPath = path.join(tmpDir, '.timsquad', 'state', 'workflow.json');
    expect(() => JSON.parse(readFileSync(workflowPath, 'utf-8'))).not.toThrow();
  });

  it('should create valid settings.json', () => {
    runTsq(['init', '-n', 'test-app', '-t', 'web-service', '-l', '1', '-y'], tmpDir);

    const settingsPath = path.join(tmpDir, '.claude', 'settings.json');
    expect(existsSync(settingsPath)).toBe(true);
    const settings = JSON.parse(readFileSync(settingsPath, 'utf-8'));
    expect(settings).toHaveProperty('hooks');
  });
});

describe('tsq status - Error Handling', () => {
  it('should fail gracefully in non-timsquad directory', () => {
    const { exitCode } = runTsq(['status'], tmpDir);
    expect(exitCode).not.toBe(0);
  });
});

describe('tsq --help', () => {
  it('should show help text', () => {
    const { stdout, exitCode } = runTsq(['--help'], tmpDir);
    expect(exitCode).toBe(0);
    expect(stdout).toContain('init');
    expect(stdout).toContain('status');
  });

  it('should show version', () => {
    const { stdout, exitCode } = runTsq(['--version'], tmpDir);
    expect(exitCode).toBe(0);
    expect(stdout).toMatch(/\d+\.\d+\.\d+/);
  });
});

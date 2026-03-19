import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import path from 'path';
import fs from 'fs-extra';
import os from 'os';
import { execSync } from 'child_process';

const SCRIPTS_DIR = path.resolve(__dirname, '../../templates/platforms/claude-code/scripts');

describe('A-1: check-capability.sh — Capability Token + Agent Gate', () => {
  let tmpDir: string;
  let stateDir: string;
  let scriptPath: string;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'tsq-cap-'));
    stateDir = path.join(tmpDir, '.timsquad', 'state');
    await fs.ensureDir(stateDir);
    await fs.ensureDir(path.join(tmpDir, '.timsquad', '.daemon'));
    scriptPath = path.join(SCRIPTS_DIR, 'check-capability.sh');
  });

  afterEach(async () => {
    await fs.remove(tmpDir);
  });

  function runHook(filePath: string): { stdout: string; exitCode: number } {
    const input = JSON.stringify({ tool_input: { file_path: filePath } });
    try {
      const stdout = execSync(`echo '${input}' | bash "${scriptPath}"`, {
        cwd: tmpDir,
        encoding: 'utf-8',
        timeout: 5000,
      });
      return { stdout, exitCode: 0 };
    } catch (err: any) {
      return { stdout: err.stdout || '', exitCode: err.status || 1 };
    }
  }

  it('should allow when controller is not active', () => {
    // No controller-active file → allow
    const result = runHook('src/index.ts');
    expect(result.exitCode).toBe(0);
    expect(result.stdout).not.toContain('deny');
  });

  it('should deny when file is outside allowed-paths', async () => {
    await fs.writeFile(path.join(stateDir, 'controller-active'), '1');
    await fs.writeFile(path.join(stateDir, 'allowed-paths.txt'), 'src/auth/*\nsrc/lib/*\n');

    const result = runHook('src/payments/stripe.ts');
    expect(result.stdout).toContain('deny');
    expect(result.stdout).toContain('Capability Gate');
  });

  it('should allow when file matches allowed-paths', async () => {
    await fs.writeFile(path.join(stateDir, 'controller-active'), '1');
    await fs.writeFile(path.join(stateDir, 'allowed-paths.txt'), 'src/auth/*\n');

    const result = runHook('src/auth/login.ts');
    expect(result.exitCode).toBe(0);
    expect(result.stdout).not.toContain('deny');
  });

  it('should always allow .timsquad/ files', async () => {
    await fs.writeFile(path.join(stateDir, 'controller-active'), '1');
    await fs.writeFile(path.join(stateDir, 'allowed-paths.txt'), 'src/*\n');

    const result = runHook('.timsquad/state/workflow.json');
    expect(result.exitCode).toBe(0);
    expect(result.stdout).not.toContain('deny');
  });

  it('should deny librarian writing to src/', async () => {
    await fs.writeFile(path.join(stateDir, 'controller-active'), '1');
    await fs.writeFile(path.join(stateDir, 'allowed-paths.txt'), 'src/*\n');
    await fs.writeJson(path.join(tmpDir, '.timsquad', '.daemon', 'task-context.json'), {
      taskId: 'P1-S001-T001',
      agent: 'librarian',
    });

    const result = runHook('src/lib/compiler.ts');
    expect(result.stdout).toContain('deny');
    expect(result.stdout).toContain('Agent Gate');
    expect(result.stdout).toContain('Librarian');
  });

  it('should allow librarian writing to docs/', async () => {
    await fs.writeFile(path.join(stateDir, 'controller-active'), '1');
    await fs.writeFile(path.join(stateDir, 'allowed-paths.txt'), '*\n');
    await fs.writeJson(path.join(tmpDir, '.timsquad', '.daemon', 'task-context.json'), {
      taskId: 'P1-S001-T001',
      agent: 'librarian',
    });

    const result = runHook('docs/report.md');
    expect(result.exitCode).toBe(0);
    expect(result.stdout).not.toContain('deny');
  });

  it('should deny qa agent from writing any file', async () => {
    await fs.writeFile(path.join(stateDir, 'controller-active'), '1');
    await fs.writeFile(path.join(stateDir, 'allowed-paths.txt'), '*\n');
    await fs.writeJson(path.join(tmpDir, '.timsquad', '.daemon', 'task-context.json'), {
      taskId: 'P1-S001-T001',
      agent: 'qa',
    });

    const result = runHook('docs/review.md');
    expect(result.stdout).toContain('deny');
    expect(result.stdout).toContain('Agent Gate');
    expect(result.stdout).toContain('읽기 전용');
  });

  it('should deny architect agent from writing any file', async () => {
    await fs.writeFile(path.join(stateDir, 'controller-active'), '1');
    await fs.writeFile(path.join(stateDir, 'allowed-paths.txt'), '*\n');
    await fs.writeJson(path.join(tmpDir, '.timsquad', '.daemon', 'task-context.json'), {
      taskId: 'P1-S001-T001',
      agent: 'architect',
    });

    const result = runHook('src/index.ts');
    expect(result.stdout).toContain('deny');
  });
});

describe('A-2: validate-completion-report.sh — Completion Report 스키마 검증', () => {
  let tmpDir: string;
  let scriptPath: string;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'tsq-cr-'));
    await fs.ensureDir(path.join(tmpDir, '.timsquad', '.daemon'));
    await fs.ensureDir(path.join(tmpDir, '.timsquad', 'logs'));
    await fs.ensureDir(path.join(tmpDir, '.timsquad', 'state'));
    scriptPath = path.join(SCRIPTS_DIR, 'validate-completion-report.sh');
  });

  afterEach(async () => {
    await fs.remove(tmpDir);
  });

  function runValidation(): { stderr: string; exitCode: number } {
    try {
      execSync(`bash "${scriptPath}" "${tmpDir}"`, {
        encoding: 'utf-8',
        timeout: 5000,
      });
      return { stderr: '', exitCode: 0 };
    } catch (err: any) {
      return { stderr: err.stderr || '', exitCode: err.status || 1 };
    }
  }

  it('should pass when no task-context exists (non-pipeline)', () => {
    const result = runValidation();
    expect(result.exitCode).toBe(0);
  });

  it('should pass when all 5 fields present', async () => {
    const contextFile = path.join(tmpDir, '.timsquad', '.daemon', 'task-context.json');
    await fs.writeJson(contextFile, { taskId: 'P1-S001-T001' });

    // Create log file newer than context
    await new Promise(r => setTimeout(r, 100));
    const logFile = path.join(tmpDir, '.timsquad', 'logs', '2026-03-19-developer.md');
    await fs.writeFile(logFile, `## Completion Report
- Task: Login UI 구현
- Status: pass
- Files changed: src/auth/login.ts
- Tests: passed 5
- Notes: none
`);

    const result = runValidation();
    expect(result.exitCode).toBe(0);
  });

  it('should fail when Status field is missing', async () => {
    const contextFile = path.join(tmpDir, '.timsquad', '.daemon', 'task-context.json');
    await fs.writeJson(contextFile, { taskId: 'P1-S001-T001' });

    await new Promise(r => setTimeout(r, 100));
    const logFile = path.join(tmpDir, '.timsquad', 'logs', '2026-03-19-developer.md');
    await fs.writeFile(logFile, `## Completion Report
- Task: Login UI
- Files changed: src/auth/login.ts
- Tests: passed 5
- Notes: none
`);

    const result = runValidation();
    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain('Status');
  });
});

/**
 * tsq audit score — 7영역 감사 점수 자동 계산
 */

import { Command } from 'commander';
import path from 'path';
import { findProjectRoot } from '../lib/project.js';
import { exists } from '../utils/fs.js';
import fs from 'fs-extra';

export function registerAuditCommand(program: Command): void {
  const cmd = program.command('audit').description('Audit management');

  cmd
    .command('score')
    .description('Calculate 7-area audit score matrix')
    .action(async () => {
      try {
        await runScore();
      } catch (error) {
        console.log(JSON.stringify({ error: (error as Error).message }));
        process.exit(1);
      }
    });
}

interface AreaScore {
  area: string;
  score: number;
  maxScore: number;
  checks: Array<{ name: string; passed: boolean }>;
}

async function runScore(): Promise<void> {
  const projectRoot = await findProjectRoot();
  if (!projectRoot) throw new Error('TimSquad project not found.');

  const areas: AreaScore[] = [
    await checkSSOT(projectRoot),
    await checkTesting(projectRoot),
    await checkSecurity(projectRoot),
    await checkProcess(projectRoot),
    await checkDocumentation(projectRoot),
    await checkArchitecture(projectRoot),
    await checkMaintainability(projectRoot),
  ];

  const totalScore = areas.reduce((s, a) => s + a.score, 0);
  const totalMax = areas.reduce((s, a) => s + a.maxScore, 0);

  console.log(JSON.stringify({
    overallScore: totalMax > 0 ? Math.round((totalScore / totalMax) * 100) : 0,
    areas,
  }, null, 2));
}

async function checkSSOT(root: string): Promise<AreaScore> {
  const checks: Array<{ name: string; passed: boolean }> = [];
  const ssotDir = path.join(root, '.timsquad', 'ssot');

  checks.push({ name: 'prd.md 존재', passed: await exists(path.join(ssotDir, 'prd.md')) });
  checks.push({ name: 'requirements.md 존재', passed: await exists(path.join(ssotDir, 'requirements.md')) });
  checks.push({ name: 'planning.md 존재', passed: await exists(path.join(ssotDir, 'planning.md')) });

  const score = checks.filter(c => c.passed).length;
  return { area: 'SSOT', score, maxScore: checks.length, checks };
}

async function checkTesting(root: string): Promise<AreaScore> {
  const checks: Array<{ name: string; passed: boolean }> = [];

  const hasPkg = await exists(path.join(root, 'package.json'));
  if (hasPkg) {
    const pkg = await fs.readJson(path.join(root, 'package.json')).catch(() => ({}));
    const scripts = pkg.scripts || {};
    checks.push({ name: 'test 스크립트 존재', passed: !!scripts.test });
    checks.push({ name: 'test:unit 존재', passed: !!scripts['test:unit'] });
    checks.push({ name: 'test:e2e 존재', passed: !!scripts['test:e2e'] });
  }

  const score = checks.filter(c => c.passed).length;
  return { area: 'Testing', score, maxScore: checks.length, checks };
}

async function checkSecurity(root: string): Promise<AreaScore> {
  const checks: Array<{ name: string; passed: boolean }> = [];

  checks.push({ name: 'safe-guard.sh 존재', passed: await exists(path.join(root, '.claude', 'scripts', 'safe-guard.sh')) });
  checks.push({ name: 'check-capability.sh 존재', passed: await exists(path.join(root, '.claude', 'scripts', 'check-capability.sh')) });
  checks.push({ name: '.env가 .gitignore에 포함', passed: await checkGitignore(root, '.env') });

  const score = checks.filter(c => c.passed).length;
  return { area: 'Security', score, maxScore: checks.length, checks };
}

async function checkProcess(root: string): Promise<AreaScore> {
  const checks: Array<{ name: string; passed: boolean }> = [];

  checks.push({ name: 'workflow.json 존재', passed: await exists(path.join(root, '.timsquad', 'state', 'workflow.json')) });
  checks.push({ name: 'config.json 존재', passed: await exists(path.join(root, '.timsquad', 'config.json')) });
  checks.push({ name: 'ssot-map.yaml 존재', passed: await exists(path.join(root, '.timsquad', 'ssot-map.yaml')) });

  const score = checks.filter(c => c.passed).length;
  return { area: 'Process', score, maxScore: checks.length, checks };
}

async function checkDocumentation(root: string): Promise<AreaScore> {
  const checks: Array<{ name: string; passed: boolean }> = [];

  checks.push({ name: 'README.md 존재', passed: await exists(path.join(root, 'README.md')) });
  checks.push({ name: 'CLAUDE.md 존재', passed: await exists(path.join(root, 'CLAUDE.md')) });

  const score = checks.filter(c => c.passed).length;
  return { area: 'Documentation', score, maxScore: checks.length, checks };
}

async function checkArchitecture(root: string): Promise<AreaScore> {
  const checks: Array<{ name: string; passed: boolean }> = [];

  checks.push({ name: 'tsconfig.json 존재', passed: await exists(path.join(root, 'tsconfig.json')) });
  checks.push({ name: '.claude/agents/ 존재', passed: await exists(path.join(root, '.claude', 'agents')) });

  const score = checks.filter(c => c.passed).length;
  return { area: 'Architecture', score, maxScore: checks.length, checks };
}

async function checkMaintainability(root: string): Promise<AreaScore> {
  const checks: Array<{ name: string; passed: boolean }> = [];

  const logsDir = path.join(root, '.timsquad', 'logs');
  checks.push({ name: '태스크 로그 존재', passed: await exists(logsDir) });

  const retroDir = path.join(root, '.timsquad', 'retrospective');
  checks.push({ name: '회고 디렉토리 존재', passed: await exists(retroDir) });

  const score = checks.filter(c => c.passed).length;
  return { area: 'Maintainability', score, maxScore: checks.length, checks };
}

async function checkGitignore(root: string, pattern: string): Promise<boolean> {
  const gitignorePath = path.join(root, '.gitignore');
  if (!await exists(gitignorePath)) return false;
  const content = await fs.readFile(gitignorePath, 'utf-8');
  return content.includes(pattern);
}

/**
 * tsq status --drift / --memory — 드리프트 요약 + phase-memory 구조화 출력
 */

import { Command } from 'commander';
import path from 'path';
import { findProjectRoot } from '../lib/project.js';
import { exists, readFile } from '../utils/fs.js';

interface StatusOptions {
  drift?: boolean;
  memory?: boolean;
}

export function registerStatusCommand(program: Command): void {
  program
    .command('status')
    .description('Project status and diagnostics')
    .option('--drift', 'Show SSOT drift warnings')
    .option('--memory', 'Show structured phase-memory carry-over')
    .action(async (options: StatusOptions) => {
      try {
        await runStatus(options);
      } catch (error) {
        console.log(JSON.stringify({ error: (error as Error).message }));
        process.exit(1);
      }
    });
}

async function runStatus(options: StatusOptions): Promise<void> {
  const projectRoot = await findProjectRoot();
  if (!projectRoot) throw new Error('TimSquad project not found.');

  if (options.drift) {
    await showDrift(projectRoot);
  } else if (options.memory) {
    await showMemory(projectRoot);
  } else {
    // 기본: 둘 다 출력
    const drift = await getDrift(projectRoot);
    const memory = await getMemory(projectRoot);
    console.log(JSON.stringify({ drift, memory }, null, 2));
  }
}

async function showDrift(projectRoot: string): Promise<void> {
  const drift = await getDrift(projectRoot);
  console.log(JSON.stringify(drift, null, 2));
}

async function getDrift(projectRoot: string): Promise<object> {
  const driftFile = path.join(projectRoot, '.timsquad', 'state', 'drift-warnings.json');
  if (await exists(driftFile)) {
    const content = await readFile(driftFile);
    try {
      return JSON.parse(content);
    } catch {
      return { error: 'drift-warnings.json parse error' };
    }
  }

  // compile-manifest 기반 간이 drift 체크
  const { checkStale } = await import('../lib/compiler.js');
  const controllerDir = path.join(projectRoot, '.claude', 'skills', 'tsq-controller');
  const stale = await checkStale(projectRoot, controllerDir);
  return { staleSpecs: stale, warningCount: stale.length };
}

async function showMemory(projectRoot: string): Promise<void> {
  const memory = await getMemory(projectRoot);
  console.log(JSON.stringify(memory, null, 2));
}

async function getMemory(projectRoot: string): Promise<object> {
  const memoryPath = path.join(projectRoot, '.timsquad', 'state', 'phase-memory.md');
  if (!await exists(memoryPath)) {
    return { exists: false, progress: [], carryOver: null };
  }

  const content = await readFile(memoryPath);
  const lines = content.split('\n');

  // Progress 섹션 파싱
  const progress: string[] = [];
  let inProgress = false;
  let carryOver: string | null = null;

  for (const line of lines) {
    if (line.startsWith('## Progress')) {
      inProgress = true;
      continue;
    }
    if (line.startsWith('## ') && inProgress) {
      inProgress = false;
    }
    if (inProgress && line.startsWith('- ')) {
      progress.push(line.replace(/^- /, '').trim());
    }
    if (line.startsWith('## Carry-over') || line.startsWith('## 주의')) {
      const idx = lines.indexOf(line);
      carryOver = lines.slice(idx + 1).join('\n').trim();
    }
  }

  return {
    exists: true,
    progressCount: progress.length,
    progress: progress.slice(-10), // 최근 10개
    carryOver,
  };
}

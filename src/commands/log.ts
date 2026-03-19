/**
 * tsq log sequence <id> / tsq log phase <id> — L1→L2→L3 로그 집계
 */

import { Command } from 'commander';
import path from 'path';
import { findProjectRoot } from '../lib/project.js';
import { exists, readFile } from '../utils/fs.js';
import fs from 'fs-extra';

export function registerLogCommand(program: Command): void {
  const cmd = program.command('log').description('Log aggregation');

  cmd
    .command('sequence <id>')
    .description('Aggregate L1 task logs into L2 sequence summary')
    .action(async (id: string) => {
      try {
        await runLogAggregate('sequence', id);
      } catch (error) {
        console.log(JSON.stringify({ error: (error as Error).message }));
        process.exit(1);
      }
    });

  cmd
    .command('phase <id>')
    .description('Aggregate L2 sequence logs into L3 phase summary')
    .action(async (id: string) => {
      try {
        await runLogAggregate('phase', id);
      } catch (error) {
        console.log(JSON.stringify({ error: (error as Error).message }));
        process.exit(1);
      }
    });
}

async function runLogAggregate(level: 'sequence' | 'phase', id: string): Promise<void> {
  const projectRoot = await findProjectRoot();
  if (!projectRoot) throw new Error('TimSquad project not found.');

  const logsDir = path.join(projectRoot, '.timsquad', 'logs');
  if (!await exists(logsDir)) throw new Error('Logs directory not found.');

  if (level === 'sequence') {
    // L1 → L2: 특정 시퀀스의 태스크 로그 집계
    const taskLogs = await findLogsByPattern(logsDir, id);
    console.log(JSON.stringify({
      level: 'L2',
      sequenceId: id,
      taskCount: taskLogs.length,
      logs: taskLogs,
    }, null, 2));
  } else {
    // L2 → L3: 특정 Phase의 시퀀스 로그 집계
    const seqDir = path.join(logsDir, 'sequences');
    const seqLogs = await exists(seqDir)
      ? await findLogsByPattern(seqDir, id)
      : [];

    console.log(JSON.stringify({
      level: 'L3',
      phaseId: id,
      sequenceCount: seqLogs.length,
      logs: seqLogs,
    }, null, 2));
  }
}

async function findLogsByPattern(
  dir: string,
  pattern: string,
): Promise<Array<{ file: string; summary: string }>> {
  const results: Array<{ file: string; summary: string }> = [];
  const entries = await fs.readdir(dir).catch(() => [] as string[]);

  for (const entry of entries) {
    if (!entry.endsWith('.md')) continue;
    const filePath = path.join(dir, entry);
    const stat = await fs.stat(filePath);
    if (!stat.isFile()) continue;

    // 파일명이나 내용에 패턴(시퀀스/페이즈 ID) 포함 여부
    if (entry.includes(pattern)) {
      const content = await readFile(filePath);
      const firstLine = content.split('\n').find(l => l.trim().length > 0) || '';
      results.push({ file: entry, summary: firstLine.replace(/^#+\s*/, '').slice(0, 100) });
    }
  }

  return results;
}

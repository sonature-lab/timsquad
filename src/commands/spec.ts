/**
 * tsq spec check — SSOT 존재 + 신선도 감지
 */

import { Command } from 'commander';
import path from 'path';
import { findProjectRoot } from '../lib/project.js';
import { checkStale } from '../lib/compiler.js';
import { exists } from '../utils/fs.js';
import fs from 'fs-extra';

export function registerSpecCommand(program: Command): void {
  const cmd = program.command('spec').description('SSOT specification management');

  cmd
    .command('check')
    .description('Check SSOT document existence and freshness')
    .action(async () => {
      try {
        await runCheck();
      } catch (error) {
        console.log(JSON.stringify({ error: (error as Error).message }));
        process.exit(1);
      }
    });
}

async function runCheck(): Promise<void> {
  const projectRoot = await findProjectRoot();
  if (!projectRoot) throw new Error('TimSquad project not found.');

  const ssotDir = path.join(projectRoot, '.timsquad', 'ssot');
  const controllerDir = path.join(projectRoot, '.claude', 'skills', 'tsq-controller');

  // 1. SSOT 문서 존재 확인
  const documents: Array<{ name: string; exists: boolean; size: number }> = [];
  if (await exists(ssotDir)) {
    const files = await fs.readdir(ssotDir);
    for (const file of files) {
      if (!file.endsWith('.md')) continue;
      const filePath = path.join(ssotDir, file);
      const stat = await fs.stat(filePath);
      documents.push({
        name: file.replace('.md', ''),
        exists: true,
        size: stat.size,
      });
    }
  }

  // 2. 신선도 체크
  const stale = await checkStale(projectRoot, controllerDir);

  console.log(JSON.stringify({
    documents,
    stale,
    totalDocuments: documents.length,
    filledDocuments: documents.filter(d => d.size > 500).length,
    staleCount: stale.length,
  }, null, 2));
}

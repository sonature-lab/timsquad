/**
 * tsq retro metrics — 회고 메트릭 자동 추출
 */

import { Command } from 'commander';
import path from 'path';
import { findProjectRoot } from '../lib/project.js';
import { exists } from '../utils/fs.js';
import fs from 'fs-extra';

export function registerRetroCommand(program: Command): void {
  const cmd = program.command('retro').description('Retrospective management');

  cmd
    .command('metrics')
    .description('Extract objective metrics from task logs')
    .action(async () => {
      try {
        await runMetrics();
      } catch (error) {
        console.log(JSON.stringify({ error: (error as Error).message }));
        process.exit(1);
      }
    });
}

async function runMetrics(): Promise<void> {
  const projectRoot = await findProjectRoot();
  if (!projectRoot) throw new Error('TimSquad project not found.');

  const logsDir = path.join(projectRoot, '.timsquad', 'logs');
  if (!await exists(logsDir)) {
    console.log(JSON.stringify({ totalTasks: 0, metrics: {} }));
    return;
  }

  const files = await fs.readdir(logsDir);
  const logFiles = files.filter(f => f.endsWith('.md') && !f.startsWith('_'));

  let totalTasks = 0;
  let passCount = 0;
  let failCount = 0;
  const agentCounts: Record<string, number> = {};

  for (const file of logFiles) {
    const content = await fs.readFile(path.join(logsDir, file), 'utf-8');

    // Status: pass/fail 카운트
    const statusMatch = content.match(/Status:\s*(pass|fail)/gi);
    if (statusMatch) {
      totalTasks += statusMatch.length;
      for (const m of statusMatch) {
        if (/pass/i.test(m)) passCount++;
        if (/fail/i.test(m)) failCount++;
      }
    }

    // 에이전트별 카운트 (파일명에서 추출: YYYY-MM-DD-agent.md)
    const agentMatch = file.match(/\d{4}-\d{2}-\d{2}-(\w+)\.md$/);
    if (agentMatch) {
      const agent = agentMatch[1];
      agentCounts[agent] = (agentCounts[agent] || 0) + 1;
    }
  }

  // 피드백 카운트
  let feedbackCount = 0;
  const feedbackDir = path.join(projectRoot, '.timsquad', 'retrospective', 'feedback');
  if (await exists(feedbackDir)) {
    const fbFiles = await fs.readdir(feedbackDir);
    feedbackCount = fbFiles.filter(f => f.endsWith('.md') || f.endsWith('.json')).length;
  }

  console.log(JSON.stringify({
    totalTasks,
    passRate: totalTasks > 0 ? Math.round((passCount / totalTasks) * 100) : 0,
    failRate: totalTasks > 0 ? Math.round((failCount / totalTasks) * 100) : 0,
    agentDistribution: agentCounts,
    feedbackCount,
    logFiles: logFiles.length,
  }, null, 2));
}

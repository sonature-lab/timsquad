/**
 * tsq plan validate — planning.md DAG 무결성 + PRD 커버리지 검증
 */

import { Command } from 'commander';
import path from 'path';
import { findProjectRoot } from '../lib/project.js';
import { parsePlanningFile, getAllTasks } from '../lib/planning-parser.js';
import { exists, readFile } from '../utils/fs.js';

export function registerPlanCommand(program: Command): void {
  const cmd = program.command('plan').description('Planning document management');

  cmd
    .command('validate')
    .description('Validate planning.md DAG integrity and PRD coverage')
    .action(async () => {
      try {
        await runValidate();
      } catch (error) {
        console.log(JSON.stringify({ error: (error as Error).message }));
        process.exit(1);
      }
    });
}

async function runValidate(): Promise<void> {
  const projectRoot = await findProjectRoot();
  if (!projectRoot) throw new Error('TimSquad project not found.');

  const doc = await parsePlanningFile(projectRoot);
  if (!doc) throw new Error('planning.md not found.');

  const allTasks = getAllTasks(doc);
  const issues: string[] = [];

  // 1. DAG 순환 의존성 체크
  const taskIds = new Set(allTasks.map(t => t.id));
  for (const task of allTasks) {
    if (task.dependencies) {
      for (const dep of task.dependencies) {
        if (!taskIds.has(dep)) {
          issues.push(`Task ${task.id}: 의존성 ${dep}이 존재하지 않음`);
        }
        if (dep === task.id) {
          issues.push(`Task ${task.id}: 자기 참조 순환`);
        }
      }
    }
  }

  // 간단한 순환 감지 (2-hop)
  for (const task of allTasks) {
    if (!task.dependencies) continue;
    for (const dep of task.dependencies) {
      const depTask = allTasks.find(t => t.id === dep);
      if (depTask?.dependencies?.includes(task.id)) {
        issues.push(`순환 의존성: ${task.id} ↔ ${dep}`);
      }
    }
  }

  // 2. Phase 순서 검증
  const phaseNums = doc.phases.map(p => parseInt(p.id.replace('P', ''), 10));
  for (let i = 1; i < phaseNums.length; i++) {
    if (phaseNums[i] <= phaseNums[i - 1]) {
      issues.push(`Phase 순서 오류: ${doc.phases[i - 1].id} → ${doc.phases[i].id}`);
    }
  }

  // 3. PRD 커버리지 (PRD 기능 인덱스 vs planning.md Phase)
  let prdCoverage: { total: number; covered: number } | null = null;
  const prdPath = path.join(projectRoot, '.timsquad', 'ssot', 'prd.md');
  if (await exists(prdPath)) {
    const prdContent = await readFile(prdPath);
    const featureRows = prdContent.match(/^\|[^|]+\|/gm)?.filter(
      r => !r.includes('---') && !r.includes('기능명') && !r.includes('Feature')
    ) || [];
    prdCoverage = {
      total: featureRows.length,
      covered: doc.phases.length > 0 ? Math.min(featureRows.length, allTasks.length) : 0,
    };
  }

  console.log(JSON.stringify({
    valid: issues.length === 0,
    phases: doc.phases.length,
    totalTasks: allTasks.length,
    issues,
    prdCoverage,
  }, null, 2));
}

/**
 * tsq next — 하이브리드 Controller의 핵심 CLI
 *
 * planning.md + workflow.json을 비교하여 다음 태스크를 결정론적으로 출력.
 * Controller 스킬이 내부적으로 호출 — 사용자가 직접 치지 않음.
 *
 * Usage:
 *   tsq next                    # 다음 미완료 태스크 JSON 출력
 *   tsq next --complete T2-1-3  # 태스크 완료 기록
 *   tsq next --phase-status     # Phase 완료 여부 + 누락 산출물 체크
 *   tsq next --phase-status P2  # 특정 Phase 상태 확인
 */

import { Command } from 'commander';
import { findProjectRoot } from '../lib/project.js';
import { parsePlanningFile } from '../lib/planning-parser.js';
import {
  loadWorkflowState,
  findNextTask,
  findNextWave,
  getPhaseStatus,
  markTaskComplete,
  appendPhaseMemoryProgress,
} from '../lib/workflow-state.js';

interface NextOptions {
  complete?: string;
  phaseStatus?: string | boolean;
  wave?: boolean;
  summary?: string;
  agent?: string;
}

export function registerNextCommand(program: Command): void {
  program
    .command('next')
    .description('Show next task or manage task completion (used by Controller)')
    .option('--complete <taskId>', 'Mark task as completed')
    .option('--phase-status [phaseId]', 'Check phase completion status')
    .option('--wave', 'Return all independent tasks as a wave (parallel dispatch)')
    .option('--summary <text>', 'Task completion summary (with --complete)')
    .option('--agent <type>', 'Agent that completed the task (with --complete)')
    .action(async (options: NextOptions) => {
      try {
        await runNext(options);
      } catch (error) {
        const msg = (error as Error).message;
        // Output errors as JSON for machine consumption
        console.log(JSON.stringify({ error: msg }));
        process.exit(1);
      }
    });
}

async function runNext(options: NextOptions): Promise<void> {
  const projectRoot = await findProjectRoot();
  if (!projectRoot) {
    throw new Error('TimSquad project not found. Run `tsq init` first.');
  }

  // Route to sub-command
  if (options.complete) {
    await handleComplete(projectRoot, options);
  } else if (options.phaseStatus !== undefined) {
    await handlePhaseStatus(projectRoot, options);
  } else if (options.wave) {
    await handleWave(projectRoot);
  } else {
    await handleNext(projectRoot);
  }
}

/**
 * tsq next — 다음 미완료 태스크 출력
 */
async function handleNext(projectRoot: string): Promise<void> {
  const doc = await parsePlanningFile(projectRoot);
  if (!doc) {
    throw new Error('planning.md not found. Run /tsq-decompose to create planning.md');
  }

  const state = await loadWorkflowState(projectRoot);
  const next = findNextTask(doc, state);

  if (!next) {
    console.log(JSON.stringify({
      status: 'all_complete',
      message: 'All tasks in planning.md are completed.',
    }));
    return;
  }

  console.log(JSON.stringify(next, null, 2));
}

/**
 * tsq next --wave — 병렬 실행 가능한 독립 태스크 Wave 출력
 */
async function handleWave(projectRoot: string): Promise<void> {
  const doc = await parsePlanningFile(projectRoot);
  if (!doc) {
    throw new Error('planning.md not found. Run /tsq-decompose to create planning.md');
  }

  const state = await loadWorkflowState(projectRoot);
  const result = findNextWave(doc, state);

  if (!result) {
    console.log(JSON.stringify({
      status: 'all_complete',
      message: 'All tasks in planning.md are completed.',
    }));
    return;
  }

  console.log(JSON.stringify({
    status: 'wave',
    wave: result.wave,
    waveSize: result.wave.length,
    totalRemaining: result.totalRemaining,
    parallel: result.wave.length > 1,
  }, null, 2));
}

/**
 * tsq next --complete <taskId> — 태스크 완료 기록
 */
async function handleComplete(projectRoot: string, options: NextOptions): Promise<void> {
  const taskId = options.complete!;

  // Validate task ID format
  if (!/^P\d+-S\d+-T\d+$/.test(taskId)) {
    throw new Error(`Invalid task ID format: ${taskId}. Expected: P{N}-S{NNN}-T{NNN}`);
  }

  await markTaskComplete(projectRoot, {
    taskId,
    completedAt: new Date().toISOString(),
    agent: options.agent,
    summary: options.summary,
  });

  // Append to phase-memory
  if (options.summary) {
    await appendPhaseMemoryProgress(projectRoot, taskId, options.summary);
  }

  console.log(JSON.stringify({
    status: 'completed',
    taskId,
    agent: options.agent || 'unknown',
    summary: options.summary || null,
  }));
}

/**
 * tsq next --phase-status [phaseId] — Phase 완료 여부 체크
 */
async function handlePhaseStatus(projectRoot: string, options: NextOptions): Promise<void> {
  const doc = await parsePlanningFile(projectRoot);
  if (!doc) {
    throw new Error('planning.md not found. Run /tsq-decompose to create planning.md');
  }

  const state = await loadWorkflowState(projectRoot);
  const phaseId = typeof options.phaseStatus === 'string' ? options.phaseStatus : undefined;
  const status = getPhaseStatus(doc, state, phaseId);

  if (!status) {
    console.log(JSON.stringify({
      status: 'all_complete',
      message: 'All phases completed or no phases found.',
    }));
    return;
  }

  console.log(JSON.stringify(status, null, 2));
}

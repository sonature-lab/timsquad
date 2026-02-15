import { Command } from 'commander';
import path from 'path';
import fs from 'fs-extra';
import { colors, printHeader, printError, printSuccess, printKeyValue } from '../utils/colors.js';
import { findProjectRoot } from '../lib/project.js';
import { getTimestamp } from '../utils/date.js';
import type { AutomationConfig } from '../types/config.js';
import {
  loadWorkflowState, saveWorkflowState, isSequenceComplete, findSequenceForAgent,
  type WorkflowState,
} from '../lib/workflow-state.js';
import {
  getSequencesDir, getPhasesDir, buildSequenceLogData, buildPhaseGateData,
  loadSequenceTaskLogs, hasSemantic,
} from './log.js';
import { queryDaemon } from '../daemon/meta-cache.js';
import { writeContext } from '../daemon/context-writer.js';
import type { ScopedContext } from '../daemon/meta-cache.js';
import type { SequenceLogEntry, PhaseLogEntry } from '../types/task-log.js';

const LOG_SCHEMA_VERSION = '1.0.0';

export function registerWorkflowCommand(program: Command): void {
  const wfCmd = program
    .command('workflow')
    .alias('wf')
    .description('Manage automated workflow (sequences, phases, automation toggles)');

  // tsq workflow set-phase <phase-id>
  wfCmd
    .command('set-phase <phase-id>')
    .description('Set the current active phase')
    .action(async (phaseId: string) => {
      try {
        await setPhase(phaseId);
      } catch (error) {
        printError((error as Error).message);
        process.exit(1);
      }
    });

  // tsq workflow add-sequence <seq-id>
  wfCmd
    .command('add-sequence <seq-id>')
    .description('Register a sequence for workflow tracking')
    .requiredOption('--agents <list>', 'Comma-separated expected agent types (e.g. developer,dba)')
    .option('--phase <id>', 'Phase ID (defaults to current phase)')
    .action(async (seqId: string, options: { agents: string; phase?: string }) => {
      try {
        await addSequence(seqId, options);
      } catch (error) {
        printError((error as Error).message);
        process.exit(1);
      }
    });

  // tsq workflow remove-sequence <seq-id>
  wfCmd
    .command('remove-sequence <seq-id>')
    .description('Remove a sequence from tracking')
    .action(async (seqId: string) => {
      try {
        await removeSequence(seqId);
      } catch (error) {
        printError((error as Error).message);
        process.exit(1);
      }
    });

  // tsq workflow status
  wfCmd
    .command('status')
    .description('Show workflow state and automation status')
    .action(async () => {
      try {
        await showStatus();
      } catch (error) {
        printError((error as Error).message);
        process.exit(1);
      }
    });

  // tsq workflow config <key> <value>
  wfCmd
    .command('config <key> <value>')
    .description('Toggle automation settings (e.g. sequence_log on/off)')
    .action(async (key: string, value: string) => {
      try {
        await setConfig(key, value);
      } catch (error) {
        printError((error as Error).message);
        process.exit(1);
      }
    });

  // tsq task start --agent <agent> --scope <paths>
  wfCmd
    .command('task-start')
    .description('Prepare task context for a sub-agent (creates task-context.json)')
    .requiredOption('--agent <type>', 'Agent type (developer, qa, dba, etc.)')
    .option('--scope <paths>', 'Comma-separated scope paths (e.g. "src/auth,src/models")')
    .action(async (options: { agent: string; scope?: string }) => {
      try {
        await taskStart(options);
      } catch (error) {
        printError((error as Error).message);
        process.exit(1);
      }
    });

  // tsq workflow track-task <agent> <task-log-path> (internal — called by hook)
  wfCmd
    .command('track-task <agent> <task-log-path>')
    .description('(internal) Track a completed task in workflow state')
    .action(async (agent: string, taskLogPath: string) => {
      try {
        await trackTask(agent, taskLogPath);
      } catch {
        // Silent fail for hook usage — don't break the hook chain
        process.exit(0);
      }
    });

  // tsq workflow check (internal — called by hook on SessionEnd)
  wfCmd
    .command('check')
    .description('(internal) Check workflow state and auto-create L2/L3/gate/retro')
    .action(async () => {
      try {
        await checkAndAutomate();
      } catch {
        // Silent fail for hook usage
        process.exit(0);
      }
    });
}

// ============================================================
// Commands
// ============================================================

async function setPhase(phaseId: string): Promise<void> {
  const projectRoot = await findProjectRoot();
  if (!projectRoot) throw new Error('Not a TimSquad project');

  const state = await loadWorkflowState(projectRoot);

  // Archive current phase if exists
  if (state.current_phase && state.current_phase.id !== phaseId) {
    state.completed_phases.push(state.current_phase.id);
  }

  state.current_phase = {
    id: phaseId,
    started_at: getTimestamp(),
    sequences: [],
  };

  await saveWorkflowState(projectRoot, state);

  printSuccess(`Phase set: ${phaseId}`);
  printKeyValue('Automation', formatAutomation(state.automation));
}

async function addSequence(
  seqId: string,
  options: { agents: string; phase?: string },
): Promise<void> {
  const projectRoot = await findProjectRoot();
  if (!projectRoot) throw new Error('Not a TimSquad project');

  const state = await loadWorkflowState(projectRoot);
  const phaseId = options.phase || state.current_phase?.id;

  if (!phaseId) {
    throw new Error('No active phase. Run `tsq workflow set-phase <phase-id>` first.');
  }

  if (state.sequences[seqId]) {
    throw new Error(`Sequence ${seqId} already exists. Remove it first to re-add.`);
  }

  const agents = options.agents.split(',').map(a => a.trim());

  state.sequences[seqId] = {
    status: 'pending',
    phase: phaseId,
    expected_agents: agents,
    completed_tasks: [],
    report_path: null,
    l2_created: false,
  };

  // Add to current phase's sequence list
  if (state.current_phase && !state.current_phase.sequences.includes(seqId)) {
    state.current_phase.sequences.push(seqId);
  }

  await saveWorkflowState(projectRoot, state);

  printSuccess(`Sequence added: ${seqId}`);
  printKeyValue('Phase', phaseId);
  printKeyValue('Expected agents', agents.join(', '));
}

async function removeSequence(seqId: string): Promise<void> {
  const projectRoot = await findProjectRoot();
  if (!projectRoot) throw new Error('Not a TimSquad project');

  const state = await loadWorkflowState(projectRoot);

  if (!state.sequences[seqId]) {
    throw new Error(`Sequence ${seqId} not found`);
  }

  delete state.sequences[seqId];

  if (state.current_phase) {
    state.current_phase.sequences = state.current_phase.sequences.filter(s => s !== seqId);
  }

  await saveWorkflowState(projectRoot, state);
  printSuccess(`Sequence removed: ${seqId}`);
}

async function showStatus(): Promise<void> {
  const projectRoot = await findProjectRoot();
  if (!projectRoot) throw new Error('Not a TimSquad project');

  const state = await loadWorkflowState(projectRoot);

  printHeader('Workflow Status');

  // Automation toggles
  console.log(colors.subheader('  Automation'));
  for (const [key, val] of Object.entries(state.automation)) {
    const icon = val ? colors.success('ON') : colors.dim('OFF');
    console.log(`    ${key.padEnd(16)} ${icon}`);
  }

  // Current phase
  console.log(colors.subheader('\n  Phase'));
  if (state.current_phase) {
    printKeyValue('  Current', state.current_phase.id);
    printKeyValue('  Started', state.current_phase.started_at);
    printKeyValue('  Sequences', state.current_phase.sequences.join(', ') || '(none)');
  } else {
    console.log(colors.dim('    No active phase. Run `tsq wf set-phase <id>`'));
  }

  // Sequences
  const seqEntries = Object.entries(state.sequences);
  if (seqEntries.length > 0) {
    console.log(colors.subheader('\n  Sequences'));
    for (const [seqId, seq] of seqEntries) {
      const statusIcon = seq.status === 'completed'
        ? colors.success('✓')
        : seq.status === 'in_progress'
          ? colors.warning('▸')
          : colors.dim('○');
      const l2Icon = seq.l2_created ? colors.success('[L2]') : colors.dim('[--]');
      const completedAgents = seq.completed_tasks.map(t => t.agent);
      const remaining = seq.expected_agents.filter(a => !completedAgents.includes(a));

      console.log(`    ${statusIcon} ${colors.agent(seqId)} ${l2Icon} ${colors.dim(`[${seq.phase}]`)}`);
      console.log(`      agents: ${seq.expected_agents.map(a =>
        completedAgents.includes(a) ? colors.success(a) : colors.dim(a)
      ).join(', ')}`);

      if (remaining.length > 0 && seq.status !== 'completed') {
        console.log(`      ${colors.dim(`waiting: ${remaining.join(', ')}`)}`);
      }
    }
  }

  // Completed phases
  if (state.completed_phases.length > 0) {
    console.log(colors.subheader('\n  Completed Phases'));
    console.log(`    ${state.completed_phases.join(', ')}`);
  }
}

async function setConfig(key: string, value: string): Promise<void> {
  const projectRoot = await findProjectRoot();
  if (!projectRoot) throw new Error('Not a TimSquad project');

  const state = await loadWorkflowState(projectRoot);
  const validKeys = Object.keys(state.automation);

  if (!validKeys.includes(key)) {
    throw new Error(`Invalid key: ${key}. Valid: ${validKeys.join(', ')}`);
  }

  const boolVal = value === 'on' || value === 'true' || value === '1';
  (state.automation as unknown as Record<string, boolean>)[key] = boolVal;

  await saveWorkflowState(projectRoot, state);
  printSuccess(`${key} = ${boolVal ? 'ON' : 'OFF'}`);
}

// ============================================================
// Internal: Called by hooks
// ============================================================

/**
 * Prepare task context for a sub-agent.
 * Queries daemon IPC (or disk fallback) for scope data and writes task-context.json.
 */
async function taskStart(options: { agent: string; scope?: string }): Promise<void> {
  const projectRoot = await findProjectRoot();
  if (!projectRoot) throw new Error('Not a TimSquad project');

  const scopePaths = options.scope?.split(',').map(s => s.trim()) || [];

  if (scopePaths.length === 0) {
    printSuccess(`Task started for ${options.agent} (no scope filter)`);
    return;
  }

  // 데몬 IPC로 scope 쿼리
  let scopedData: ScopedContext | null = null;
  try {
    const response = await queryDaemon(projectRoot, 'scope', { paths: scopePaths }) as { context: ScopedContext };
    scopedData = response.context;
  } catch {
    // 데몬 미실행 — fallback으로 MetaCache 사용
    const { MetaCache } = await import('../daemon/meta-cache.js');
    const cache = new MetaCache(projectRoot);
    await cache.load();
    scopedData = cache.filterByScope(scopePaths);
  }

  if (scopedData && Object.keys(scopedData.files).length > 0) {
    const ctxPath = await writeContext(projectRoot, options.agent, scopedData);
    printSuccess(`Task context created for ${options.agent}`);
    printKeyValue('  Context', ctxPath);
    printKeyValue('  Files', String(Object.keys(scopedData.files).length));
  } else {
    console.log(colors.dim(`  No files matched scope: ${scopePaths.join(', ')}`));
  }
}

/**
 * Track a completed task in workflow state.
 * Called by SubagentStop hook: tsq workflow track-task <agent> <task-log-path>
 */
async function trackTask(agent: string, taskLogPath: string): Promise<void> {
  const projectRoot = await findProjectRoot();
  if (!projectRoot) return;

  const state = await loadWorkflowState(projectRoot);

  // Find matching sequence
  const seqId = findSequenceForAgent(state, agent);
  if (!seqId) return; // No match or ambiguous — skip silently

  const seq = state.sequences[seqId];
  seq.completed_tasks.push({
    agent,
    task_log: taskLogPath,
    completed_at: getTimestamp(),
  });

  // Update status
  if (seq.status === 'pending') {
    seq.status = 'in_progress';
  }

  if (isSequenceComplete(seq)) {
    seq.status = 'completed';
  }

  await saveWorkflowState(projectRoot, state);
}

/**
 * Check workflow state and auto-create L2/L3/gate/retro.
 * Called by SessionEnd hook: tsq workflow check
 */
async function checkAndAutomate(): Promise<void> {
  const projectRoot = await findProjectRoot();
  if (!projectRoot) return;

  const state = await loadWorkflowState(projectRoot);
  let stateChanged = false;

  // 1. Auto-create L2 for completed sequences
  if (state.automation.sequence_log) {
    for (const [seqId, seq] of Object.entries(state.sequences)) {
      if (seq.status === 'completed' && !seq.l2_created) {
        try {
          const entry = await buildSequenceLogData(projectRoot, seqId, {
            phase: seq.phase,
            report: seq.report_path || `(auto) no report`,
            verdict: 'proceed',
          });

          const seqDir = getSequencesDir(projectRoot);
          await fs.ensureDir(seqDir);
          await fs.writeJson(path.join(seqDir, `${seqId}.json`), entry, { spaces: 2 });

          seq.l2_created = true;
          stateChanged = true;

          // Log the automation
          await appendWorkflowLog(projectRoot, `[AUTO] L2 sequence log created: ${seqId}`);
        } catch { /* skip on error */ }
      }
    }
  }

  // 2. Check if all sequences in current phase are completed
  if (state.current_phase && (state.automation.phase_log || state.automation.phase_gate)) {
    const phaseSeqs = state.current_phase.sequences;
    const allCompleted = phaseSeqs.length > 0 && phaseSeqs.every(id => {
      const seq = state.sequences[id];
      return seq && seq.status === 'completed' && seq.l2_created;
    });

    if (allCompleted) {
      const phaseId = state.current_phase.id;

      // 2a. Auto phase gate
      if (state.automation.phase_gate) {
        try {
          const gateResult = await buildPhaseGateData(projectRoot, phaseId);
          await appendWorkflowLog(projectRoot,
            `[AUTO] Phase gate ${phaseId}: ${gateResult.can_transition ? 'PASSED' : 'BLOCKED'}`
          );
        } catch { /* skip */ }
      }

      // 2b. Auto create L3 phase log
      if (state.automation.phase_log) {
        const phaseDir = getPhasesDir(projectRoot);
        const phaseLogPath = path.join(phaseDir, `${phaseId}.json`);

        if (!await fs.pathExists(phaseLogPath)) {
          try {
            const phaseLog = await buildPhaseLogData(projectRoot, phaseId, phaseSeqs);
            await fs.ensureDir(phaseDir);
            await fs.writeJson(phaseLogPath, phaseLog, { spaces: 2 });
            await appendWorkflowLog(projectRoot, `[AUTO] L3 phase log created: ${phaseId}`);
            stateChanged = true;
          } catch { /* skip */ }
        }
      }

      // 2c. Auto retro (basic KPT collection)
      if (state.automation.retro) {
        try {
          await autoRetro(projectRoot, phaseId, phaseSeqs, state);
          await appendWorkflowLog(projectRoot, `[AUTO] Retro generated: ${phaseId}`);
        } catch { /* skip */ }
      }
    }
  }

  // 3. Auto metrics (already handled by auto-metrics.sh, but log)
  if (state.automation.metrics) {
    // auto-metrics.sh handles this — no-op here
  }

  // 4. Pending feedback cleanup
  if (state.automation.feedback) {
    const feedbackDir = path.join(projectRoot, '.timsquad', 'feedback');
    const cleanedPending: string[] = [];
    for (const fbId of state.pending_feedback || []) {
      const fbPath = path.join(feedbackDir, `${fbId}.json`);
      if (await fs.pathExists(fbPath)) {
        try {
          const fb = await fs.readJson(fbPath);
          if (fb.status === 'open' || fb.status === 'in_review') {
            cleanedPending.push(fbId);
          }
        } catch { /* skip */ }
      }
    }
    if (cleanedPending.length !== (state.pending_feedback || []).length) {
      state.pending_feedback = cleanedPending;
      stateChanged = true;
    }
    if (cleanedPending.length > 0) {
      await appendWorkflowLog(projectRoot,
        `[AUTO] ${cleanedPending.length} pending feedback(s) blocking phase gate`);
    }
  }

  if (stateChanged) {
    await saveWorkflowState(projectRoot, state);
  }
}

// ============================================================
// Internal helpers
// ============================================================

async function buildPhaseLogData(
  projectRoot: string,
  phaseId: string,
  seqIds: string[],
): Promise<PhaseLogEntry> {
  const seqDir = getSequencesDir(projectRoot);
  const now = getTimestamp();

  const seqLogs: SequenceLogEntry[] = [];
  let completed = 0, blocked = 0;

  for (const id of seqIds) {
    const seqPath = path.join(seqDir, `${id}.json`);
    if (await fs.pathExists(seqPath)) {
      const data: SequenceLogEntry = await fs.readJson(seqPath);
      seqLogs.push(data);
      if (data.execution.status === 'completed') completed++;
      else blocked++;
    } else {
      blocked++;
    }
  }

  let totalTasks = 0, totalSuccess = 0, totalRework = 0, totalFiles = 0;
  let totalIssues1 = 0, totalIssues2 = 0, totalIssues3 = 0;
  const durations: number[] = [];

  for (const seq of seqLogs) {
    totalTasks += seq.tasks.total;
    totalSuccess += seq.tasks.success;
    totalRework += seq.tasks.rework;
    durations.push(seq.execution.duration_ms);

    for (const axis of Object.values(seq.analysis)) {
      const r = axis as { issues: Array<{ level: number }> };
      for (const issue of r.issues || []) {
        if (issue.level === 1) totalIssues1++;
        else if (issue.level === 2) totalIssues2++;
        else totalIssues3++;
      }
    }
  }

  for (const seqId of seqIds) {
    const taskLogs = await loadSequenceTaskLogs(projectRoot, seqId);
    for (const { data } of taskLogs) {
      totalFiles += data.mechanical?.files?.length || 0;
    }
  }

  const timestamps = seqLogs
    .map(s => [new Date(s.execution.started_at).getTime(), new Date(s.execution.completed_at).getTime()])
    .flat()
    .filter(t => t > 0);
  const leadTime = timestamps.length >= 2 ? Math.max(...timestamps) - Math.min(...timestamps) : 0;

  return {
    schema_version: LOG_SCHEMA_VERSION,
    trace: { phase_id: phaseId },
    execution: {
      status: blocked > 0 ? 'aborted' : 'completed',
      started_at: seqLogs[0]?.execution.started_at || now,
      completed_at: now,
      duration_ms: leadTime,
      sessions_count: seqLogs.length,
    },
    sequences: { total: seqIds.length, completed, blocked, ids: seqIds },
    aggregate_metrics: {
      total_tasks: totalTasks,
      task_success_rate: totalTasks > 0 ? totalSuccess / totalTasks : 0,
      task_rework_rate: totalTasks > 0 ? totalRework / totalTasks : 0,
      total_files_changed: totalFiles,
      total_issues: { level_1: totalIssues1, level_2: totalIssues2, level_3: totalIssues3 },
      ssot_conformance_rate: 0,
      mean_sequence_duration_ms: durations.length > 0 ? durations.reduce((a, b) => a + b, 0) / durations.length : 0,
    },
    dora_derived: {
      lead_time_ms: leadTime,
      change_failure_rate: totalTasks > 0 ? (totalTasks - totalSuccess) / totalTasks : 0,
      mean_recovery_time_ms: null,
    },
    planning: {
      original_sequences: seqIds,
      added_sequences: [],
      removed_sequences: [],
      scope_changes: [],
      plan_adherence_rate: 1,
    },
    retrospective: { keep: [], problem: [], try: [] },
    knowledge_extracted: [],
  };
}

/**
 * Auto-generate a basic retrospective from task/sequence data
 */
async function autoRetro(
  projectRoot: string,
  phaseId: string,
  seqIds: string[],
  state: WorkflowState,
): Promise<void> {
  const retroDir = path.join(projectRoot, '.timsquad', 'retrospective', 'cycles');
  await fs.ensureDir(retroDir);

  const retroPath = path.join(retroDir, `${phaseId}-auto.md`);
  if (await fs.pathExists(retroPath)) return; // Already exists

  const keep: string[] = [];
  const problem: string[] = [];
  const tryItems: string[] = [];

  // Analyze task logs for patterns
  let totalTasks = 0, tasksWithSemantic = 0, totalRework = 0;

  for (const seqId of seqIds) {
    const taskLogs = await loadSequenceTaskLogs(projectRoot, seqId);
    for (const { data } of taskLogs) {
      totalTasks++;
      if (hasSemantic(data.semantic)) tasksWithSemantic++;
      if (data.semantic?.issues?.length) {
        for (const issue of data.semantic.issues) {
          if (issue.level >= 2) {
            problem.push(`[${seqId}] ${issue.description}`);
          }
        }
      }
    }

    const seq = state.sequences[seqId];
    if (seq) {
      const reworkCount = seq.completed_tasks.length - seq.expected_agents.length;
      if (reworkCount > 0) totalRework += reworkCount;
    }
  }

  // Generate observations
  const semanticCoverage = totalTasks > 0 ? Math.round((tasksWithSemantic / totalTasks) * 100) : 0;

  if (semanticCoverage >= 80) {
    keep.push(`Semantic coverage ${semanticCoverage}% — good documentation discipline`);
  } else if (semanticCoverage < 50) {
    problem.push(`Semantic coverage ${semanticCoverage}% — agents not consistently enriching logs`);
    tryItems.push('Enforce tsq log enrich in agent protocols');
  }

  if (totalRework === 0) {
    keep.push('No rework detected — first-pass quality was high');
  } else {
    problem.push(`${totalRework} rework tasks detected`);
    tryItems.push('Review SSOT alignment before implementation starts');
  }

  if (seqIds.length > 0) {
    keep.push(`${seqIds.length} sequences completed in phase ${phaseId}`);
  }

  // Write retro markdown
  const content = `# Retrospective: ${phaseId} (Auto-generated)

> Generated at ${getTimestamp()} by tsq workflow check

## Keep
${keep.map(k => `- ${k}`).join('\n') || '- (none detected)'}

## Problem
${problem.map(p => `- ${p}`).join('\n') || '- (none detected)'}

## Try
${tryItems.map(t => `- ${t}`).join('\n') || '- (no suggestions)'}

---

## Metrics
- Total tasks: ${totalTasks}
- Semantic coverage: ${semanticCoverage}%
- Rework tasks: ${totalRework}
- Sequences: ${seqIds.join(', ')}
`;

  await fs.writeFile(retroPath, content, 'utf-8');
}

/**
 * Append to workflow automation log (for debugging/auditing)
 */
async function appendWorkflowLog(projectRoot: string, message: string): Promise<void> {
  const logDir = path.join(projectRoot, '.timsquad', 'logs');
  const logFile = path.join(logDir, 'workflow-automation.log');
  await fs.ensureDir(logDir);
  const line = `${getTimestamp()} ${message}\n`;
  await fs.appendFile(logFile, line, 'utf-8');
}

function formatAutomation(auto: AutomationConfig): string {
  const enabled = Object.entries(auto).filter(([, v]) => v).map(([k]) => k);
  return enabled.length > 0 ? enabled.join(', ') : 'all OFF';
}

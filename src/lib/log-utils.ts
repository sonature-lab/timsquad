/**
 * Log utility functions extracted from commands/log.ts and commands/workflow.ts
 * for use by the daemon event-queue (which cannot depend on CLI commands).
 */

import path from 'path';
import fs from 'fs-extra';
import { exists, listFiles } from '../utils/fs.js';
import { getTimestamp } from '../utils/date.js';
import { loadWorkflowState } from './workflow-state.js';
import type {
  TaskLogEntry, SequenceLogEntry, AxisResult, PhaseLogEntry, PhaseGateResult,
} from '../types/task-log.js';
import type { FeedbackEntry } from '../types/feedback.js';

const LOG_SCHEMA_VERSION = '1.0.0';

// ── Directory helpers ──

export function getTasksDir(projectRoot: string): string {
  return path.join(projectRoot, '.timsquad', 'logs', 'tasks');
}

export function getSequencesDir(projectRoot: string): string {
  return path.join(projectRoot, '.timsquad', 'logs', 'sequences');
}

export function getPhasesDir(projectRoot: string): string {
  return path.join(projectRoot, '.timsquad', 'logs', 'phases');
}

// ── Task log loading ──

export async function loadSequenceTaskLogs(
  projectRoot: string,
  seqId: string,
): Promise<Array<{ file: string; data: TaskLogEntry }>> {
  const tasksDir = getTasksDir(projectRoot);
  if (!await exists(tasksDir)) return [];

  const results: Array<{ file: string; data: TaskLogEntry }> = [];

  // 1. Check nested directory: tasks/{SEQ-ID}/*.json
  const seqDir = path.join(tasksDir, seqId);
  if (await exists(seqDir)) {
    const files = await listFiles('*.json', seqDir);
    for (const file of files) {
      try {
        const data = await fs.readJson(path.join(seqDir, file));
        results.push({ file: path.join(seqId, file), data });
      } catch { /* skip */ }
    }
  }

  // 2. Check flat files with trace.sequence_id matching
  const flatFiles = await listFiles('*.json', tasksDir);
  for (const file of flatFiles) {
    try {
      const data: TaskLogEntry = await fs.readJson(path.join(tasksDir, file));
      if (data.trace?.sequence_id === seqId) {
        if (!results.some(r => r.file === file)) {
          results.push({ file, data });
        }
      }
    } catch { /* skip */ }
  }

  return results.sort((a, b) => a.file.localeCompare(b.file));
}

// ── Axis placeholder ──

export function makeAxisPlaceholder(): AxisResult {
  return { verdict: 'n/a', details: 'See architect report', issues: [] };
}

// ── Sequence stats aggregation ──

function aggregateSequenceStats(
  taskLogs: Array<{ file: string; data: TaskLogEntry }>,
): SequenceLogEntry['tasks'] & { durations: number[] } {
  let success = 0, failure = 0, error = 0, rework = 0;
  const durations: number[] = [];

  for (const { file, data } of taskLogs) {
    const s = data.status;
    if (s === 'completed' || s === 'success') success++;
    else if (s === 'failure') failure++;
    else if (s === 'error') error++;

    if (data.duration_ms) durations.push(data.duration_ms);

    const changedFiles = new Set(data.mechanical?.files?.map(f => f.path) || []);
    for (const other of taskLogs) {
      if (other.file === file) continue;
      if (other.data.agent === data.agent && other.file < file) {
        const otherFiles = other.data.mechanical?.files?.map(f => f.path) || [];
        if (otherFiles.some(f => changedFiles.has(f))) {
          rework++;
          break;
        }
      }
    }
  }

  const total = taskLogs.length;
  return {
    total, success, failure, error, rework,
    first_pass_success_rate: total > 0 ? Math.round(((success) / total) * 100) / 100 : 0,
    final_success_rate: total > 0 ? Math.round(((success) / total) * 100) / 100 : 0,
    durations,
  };
}

// ── Build L2 Sequence Log ──

export async function buildSequenceLogData(
  projectRoot: string,
  seqId: string,
  options: { phase: string; report: string; verdict: string; conditions?: string },
): Promise<SequenceLogEntry> {
  const taskLogs = await loadSequenceTaskLogs(projectRoot, seqId);

  if (taskLogs.length === 0) {
    const tasksDir = getTasksDir(projectRoot);
    if (await exists(tasksDir)) {
      const allFiles = await listFiles('*.json', tasksDir);
      for (const file of allFiles) {
        if (file.toLowerCase().includes(seqId.toLowerCase())) {
          try {
            const data = await fs.readJson(path.join(tasksDir, file));
            taskLogs.push({ file, data });
          } catch { /* skip */ }
        }
      }
    }
  }

  const stats = aggregateSequenceStats(taskLogs);
  const now = getTimestamp();

  const timestamps = taskLogs
    .map(t => t.data.completed_at ? new Date(t.data.completed_at).getTime() : 0)
    .filter(t => t > 0);
  const startedAt = taskLogs[0]?.data.started_at || taskLogs[0]?.data.completed_at || now;
  const duration = timestamps.length >= 2
    ? Math.max(...timestamps) - Math.min(...timestamps)
    : 0;

  const meanDuration = stats.durations.length > 0
    ? stats.durations.reduce((a, b) => a + b, 0) / stats.durations.length
    : 0;

  return {
    schema_version: LOG_SCHEMA_VERSION,
    trace: { phase_id: options.phase, sequence_id: seqId },
    execution: {
      status: stats.failure > 0 ? 'partial' : 'completed',
      started_at: startedAt,
      completed_at: now,
      duration_ms: duration,
    },
    tasks: {
      total: stats.total,
      success: stats.success,
      failure: stats.failure,
      error: stats.error,
      rework: stats.rework,
      first_pass_success_rate: stats.first_pass_success_rate,
      final_success_rate: stats.final_success_rate,
    },
    analysis: {
      axis_1_consistency: makeAxisPlaceholder(),
      axis_2_ssot_conformance: makeAxisPlaceholder(),
      axis_3_cross_sequence: { ...makeAxisPlaceholder(), prev_sequence: null },
    },
    dora_derived: {
      change_failure_rate: stats.total > 0 ? stats.failure / stats.total : 0,
      rework_rate: stats.total > 0 ? stats.rework / stats.total : 0,
      mean_task_duration_ms: meanDuration,
      recovery_time_ms: null,
    },
    verdict: {
      proceed: options.verdict !== 'hold',
      conditions: options.conditions ? options.conditions.split(',').map(c => c.trim()) : [],
      report_path: options.report,
    },
  };
}

// ── Build Phase Gate ──

export async function buildPhaseGateData(
  projectRoot: string,
  phaseId: string,
): Promise<PhaseGateResult> {
  const seqDir = getSequencesDir(projectRoot);
  const result: PhaseGateResult = {
    phase_id: phaseId,
    can_transition: true,
    missing_sequences: [],
    missing_reports: [],
    blocking_conditions: [],
  };

  if (!await exists(seqDir)) {
    result.can_transition = false;
    result.blocking_conditions.push('No sequence logs directory');
    return result;
  }

  const files = await listFiles('*.json', seqDir);
  const phaseSeqs: SequenceLogEntry[] = [];

  for (const file of files) {
    try {
      const data: SequenceLogEntry = await fs.readJson(path.join(seqDir, file));
      if (data.trace.phase_id === phaseId) {
        phaseSeqs.push(data);
      }
    } catch { /* skip */ }
  }

  if (phaseSeqs.length === 0) {
    result.can_transition = false;
    result.blocking_conditions.push('No sequence logs found for this phase');
    return result;
  }

  for (const seq of phaseSeqs) {
    if (!seq.verdict.proceed) {
      result.can_transition = false;
      result.blocking_conditions.push(`${seq.trace.sequence_id}: verdict is HOLD`);
    }
    if (seq.verdict.report_path) {
      const reportPath = path.resolve(projectRoot, seq.verdict.report_path);
      if (!await exists(reportPath)) {
        result.can_transition = false;
        result.missing_reports.push(seq.verdict.report_path);
      }
    }
    if (seq.verdict.conditions.length > 0) {
      for (const c of seq.verdict.conditions) {
        result.blocking_conditions.push(`${seq.trace.sequence_id}: condition "${c}"`);
      }
    }
  }

  // Check E2E test gate
  try {
    const pkgPath = path.join(projectRoot, 'package.json');
    if (await exists(pkgPath)) {
      const pkg = await fs.readJson(pkgPath);
      if (pkg.scripts?.['test:e2e']) {
        const e2eMarker = path.join(projectRoot, '.e2e-passed');
        if (await exists(e2eMarker)) {
          const markerContent = await fs.readFile(e2eMarker, 'utf-8');
          try {
            const marker = JSON.parse(markerContent);
            if (marker.exit_code != null && marker.exit_code !== 0) {
              result.can_transition = false;
              result.blocking_conditions.push(`E2E tests failed (exit_code=${marker.exit_code})`);
            } else if (marker.expires_at && new Date(marker.expires_at) < new Date()) {
              result.can_transition = false;
              result.blocking_conditions.push('E2E marker expired — re-run E2E tests');
            }
          } catch {
            // bare touch fallback
          }
        } else {
          result.can_transition = false;
          result.blocking_conditions.push('E2E tests not passed (missing .e2e-passed marker)');
        }
      }
    }
  } catch { /* skip E2E gate */ }

  // Check unresolved L2/L3 feedback
  try {
    const state = await loadWorkflowState(projectRoot);
    if (state.pending_feedback?.length > 0) {
      const feedbackDir = path.join(projectRoot, '.timsquad', 'feedback');
      for (const fbId of state.pending_feedback) {
        const fbPath = path.join(feedbackDir, `${fbId}.json`);
        if (await exists(fbPath)) {
          const fb: FeedbackEntry = await fs.readJson(fbPath);
          if (!fb.status || fb.status === 'open' || fb.status === 'in_review') {
            result.can_transition = false;
            result.blocking_conditions.push(
              `Unresolved L${fb.level} feedback: ${fbId} (${fb.trigger})`,
            );
          }
        }
      }
    }
  } catch { /* skip feedback check */ }

  return result;
}

// ── Build L3 Phase Log ──

export async function buildPhaseLogData(
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

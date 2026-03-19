import path from 'path';
import fs from 'fs-extra';
import type { AutomationConfig } from '../types/config.js';
import type { PlanningDocument } from './planning-parser.js';

/**
 * Tracked task in a sequence
 */
export interface TrackedTask {
  agent: string;
  task_log: string;
  completed_at: string;
}

/**
 * Sequence state within workflow
 */
export interface SequenceWorkflowState {
  status: 'pending' | 'in_progress' | 'completed' | 'blocked';
  phase: string;
  expected_agents: string[];
  completed_tasks: TrackedTask[];
  report_path: string | null;
  l2_created: boolean;
}

/**
 * Full workflow state
 */
export interface WorkflowState {
  schema_version: string;
  automation: AutomationConfig;
  current_phase: {
    id: string;
    started_at: string;
    sequences: string[];
  } | null;
  sequences: Record<string, SequenceWorkflowState>;
  completed_phases: string[];
  pending_feedback: string[];
}

const DEFAULT_AUTOMATION: AutomationConfig = {
  sequence_log: true,
  phase_log: true,
  phase_gate: true,
  metrics: true,
  retro: true,
  feedback: true,
};

const DEFAULT_STATE: WorkflowState = {
  schema_version: '1.0.0',
  automation: DEFAULT_AUTOMATION,
  current_phase: null,
  sequences: {},
  completed_phases: [],
  pending_feedback: [],
};

export function getWorkflowStatePath(projectRoot: string): string {
  return path.join(projectRoot, '.timsquad', 'state', 'workflow.json');
}

export async function loadWorkflowState(projectRoot: string): Promise<WorkflowState> {
  const statePath = getWorkflowStatePath(projectRoot);
  if (await fs.pathExists(statePath)) {
    const data = await fs.readJson(statePath);
    return {
      ...DEFAULT_STATE,
      ...data,
      automation: { ...DEFAULT_AUTOMATION, ...(data.automation || {}) },
    };
  }
  return { ...DEFAULT_STATE };
}

export async function saveWorkflowState(projectRoot: string, state: WorkflowState): Promise<void> {
  const statePath = getWorkflowStatePath(projectRoot);
  await fs.ensureDir(path.dirname(statePath));
  await fs.writeJson(statePath, state, { spaces: 2 });
}

/**
 * Check if a sequence is complete (all expected agents have tasks)
 */
export function isSequenceComplete(seq: SequenceWorkflowState): boolean {
  if (seq.expected_agents.length === 0) return false;
  const completedAgents = new Set(seq.completed_tasks.map(t => t.agent));
  return seq.expected_agents.every(a => completedAgents.has(a));
}

/**
 * Find matching active sequence for an agent
 * Returns null if 0 or multiple matches (ambiguous)
 */
export function findSequenceForAgent(
  state: WorkflowState,
  agent: string,
): string | null {
  const matches: string[] = [];

  for (const [seqId, seq] of Object.entries(state.sequences)) {
    if (seq.status === 'completed' || seq.status === 'blocked') continue;
    if (!seq.expected_agents.includes(agent)) continue;
    // Agent hasn't completed a task in this sequence yet
    const alreadyDone = seq.completed_tasks.some(t => t.agent === agent);
    if (alreadyDone) continue;
    matches.push(seqId);
  }

  return matches.length === 1 ? matches[0] : null;
}

// ─── Task ID normalization ───────────────────────────────────────

/**
 * Normalize task ID to 3-digit padded canonical form.
 * P1-S1-T1 → P1-S001-T001
 */
export function normalizeTaskId(taskId: string): string {
  const match = taskId.match(/^P(\d+)-S(\d+)-T(\d+)$/);
  if (!match) return taskId;
  return `P${match[1]}-S${match[2].padStart(3, '0')}-T${match[3].padStart(3, '0')}`;
}

// ─── Task-level tracking (Hybrid Controller) ────────────────────

/**
 * Completed task record for tsq next --complete
 */
export interface CompletedTaskRecord {
  taskId: string;
  completedAt: string;
  agent?: string;
  summary?: string;
}

/**
 * Phase status result for tsq next --phase-status
 */
export interface PhaseStatus {
  phaseId: string;
  totalTasks: number;
  completedTasks: number;
  isComplete: boolean;
  missingTasks: string[];
  actionRequired?: 'phase-complete' | 'continue';
}

/**
 * Next task result for tsq next
 */
export interface NextTaskResult {
  taskId: string;
  phaseId: string;
  sequenceId: string;
  title: string;
  description: string;
  agent?: string;
  outputs?: string[];
  dependencies?: string[];
}

/**
 * Get the set of completed task IDs from workflow state
 */
export function getCompletedTaskIds(state: WorkflowState): Set<string> {
  const ids = new Set<string>();
  for (const seq of Object.values(state.sequences)) {
    for (const task of seq.completed_tasks) {
      // Only treat task_log as ID if it matches the canonical format
      if (task.task_log && /^P\d+-S\d+-T\d+$/.test(task.task_log)) {
        ids.add(normalizeTaskId(task.task_log));
      }
    }
  }
  // Also check the dedicated completed_tasks field
  const v2 = state as WorkflowStateV2;
  if (Array.isArray(v2.completed_task_ids)) {
    for (const id of v2.completed_task_ids) {
      ids.add(id);
    }
  }
  return ids;
}

/**
 * Extended workflow state with task-level tracking
 */
export interface WorkflowStateV2 extends WorkflowState {
  completed_task_ids: string[];
}

/**
 * Mark a task as complete in workflow state
 */
export async function markTaskComplete(
  projectRoot: string,
  record: CompletedTaskRecord,
): Promise<void> {
  const state = await loadWorkflowState(projectRoot) as WorkflowStateV2;

  // Initialize completed_task_ids if not present
  if (!state.completed_task_ids) {
    state.completed_task_ids = [];
  }

  // Normalize task ID to 3-digit padded form (P1-S1-T1 → P1-S001-T001)
  const normalizedId = normalizeTaskId(record.taskId);

  // Add task ID if not already present
  if (!state.completed_task_ids.includes(normalizedId)) {
    state.completed_task_ids.push(normalizedId);
  }

  // Also track in sequence if applicable (extract sequence ID from task ID)
  const seqIdMatch = normalizedId.match(/^(P\d+-S\d+)-T\d+$/);
  if (seqIdMatch) {
    const seqId = seqIdMatch[1];
    if (!state.sequences[seqId]) {
      const phaseMatch = normalizedId.match(/^(P\d+)/);
      state.sequences[seqId] = {
        status: 'in_progress',
        phase: phaseMatch ? phaseMatch[1] : 'unknown',
        expected_agents: [],
        completed_tasks: [],
        report_path: null,
        l2_created: false,
      };
    }
    state.sequences[seqId].completed_tasks.push({
      agent: record.agent || 'developer',
      task_log: normalizedId,
      completed_at: record.completedAt,
    });
  }

  await saveWorkflowState(projectRoot, state);
}

/**
 * Find the next incomplete task based on planning document and workflow state
 */
export function findNextTask(
  doc: PlanningDocument,
  state: WorkflowState,
): NextTaskResult | null {
  const completedIds = getCompletedTaskIds(state);

  for (const phase of doc.phases) {
    for (const seq of phase.sequences) {
      for (const task of seq.tasks) {
        if (!completedIds.has(task.id)) {
          return {
            taskId: task.id,
            phaseId: phase.id,
            sequenceId: seq.id,
            title: task.title,
            description: task.description,
            agent: task.agent,
            outputs: task.outputs,
            dependencies: task.dependencies,
          };
        }
      }
    }
  }

  return null; // All tasks complete
}

/**
 * Get phase status based on planning document and workflow state
 */
export function getPhaseStatus(
  doc: PlanningDocument,
  state: WorkflowState,
  phaseId?: string,
): PhaseStatus | null {
  const completedIds = getCompletedTaskIds(state);

  // Determine which phase to check
  const targetPhaseId = phaseId || state.current_phase?.id;
  if (!targetPhaseId) {
    // Find first phase with incomplete tasks
    for (const phase of doc.phases) {
      const allTasks = phase.sequences.flatMap(s => s.tasks);
      const incomplete = allTasks.filter(t => !completedIds.has(t.id));
      if (incomplete.length > 0) {
        return buildPhaseStatus(phase, completedIds);
      }
    }
    return null;
  }

  const phase = doc.phases.find(p => p.id === targetPhaseId);
  if (!phase) return null;

  return buildPhaseStatus(phase, completedIds);
}

function buildPhaseStatus(
  phase: { id: string; sequences: Array<{ tasks: Array<{ id: string }> }> },
  completedIds: Set<string>,
): PhaseStatus {
  const allTaskIds = phase.sequences.flatMap(s => s.tasks.map(t => t.id));
  const missingTasks = allTaskIds.filter(id => !completedIds.has(id));

  return {
    phaseId: phase.id,
    totalTasks: allTaskIds.length,
    completedTasks: allTaskIds.length - missingTasks.length,
    isComplete: missingTasks.length === 0,
    missingTasks,
    actionRequired: missingTasks.length === 0 ? 'phase-complete' : 'continue',
  };
}

/**
 * Append a one-line progress entry to phase-memory.md
 */
export async function appendPhaseMemoryProgress(
  projectRoot: string,
  taskId: string,
  summary: string,
): Promise<void> {
  const memoryPath = path.join(projectRoot, '.timsquad', 'state', 'phase-memory.md');
  const progressLine = `- [${new Date().toISOString().slice(0, 16)}] ${taskId}: ${summary}\n`;

  if (await fs.pathExists(memoryPath)) {
    const content = await fs.readFile(memoryPath, 'utf-8');
    // Find or create ## Progress section
    if (content.includes('## Progress')) {
      const updated = content.replace(
        /## Progress\n/,
        `## Progress\n${progressLine}`,
      );
      await fs.writeFile(memoryPath, updated, 'utf-8');
    } else {
      await fs.appendFile(memoryPath, `\n## Progress\n${progressLine}`, 'utf-8');
    }
  } else {
    await fs.ensureDir(path.dirname(memoryPath));
    await fs.writeFile(memoryPath, `# Phase Memory\n\n## Progress\n${progressLine}`, 'utf-8');
  }
}

import path from 'path';
import fs from 'fs-extra';
import type { AutomationConfig } from '../types/config.js';

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
  status: 'pending' | 'in_progress' | 'completed';
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
    if (seq.status === 'completed') continue;
    if (!seq.expected_agents.includes(agent)) continue;
    // Agent hasn't completed a task in this sequence yet
    const alreadyDone = seq.completed_tasks.some(t => t.agent === agent);
    if (alreadyDone) continue;
    matches.push(seqId);
  }

  return matches.length === 1 ? matches[0] : null;
}

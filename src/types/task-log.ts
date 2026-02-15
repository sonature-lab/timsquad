/**
 * Task Log types for L1 Task JSON (Hook SubagentStop 생성)
 * 스키마 참조: docs/log-architecture.md
 */

export interface TaskLogEntry {
  // Hook이 현재 생성하는 필드
  agent: string;
  session: string;
  completed_at: string;
  status: string;  // "completed" | "success" | "failure" | "error" | "partial"
  mechanical: TaskMechanical;
  semantic: TaskSemantic;
  // Hook 개선으로 추가된 필드
  started_at?: string;
  duration_ms?: number;
  // Full L1 확장 (향후)
  schema_version?: string;
  trace?: {
    phase_id?: string;
    sequence_id?: string;
    task_id?: string;
    session_id?: string;
  };
  execution?: {
    agent?: string;
    model?: string;
    status?: string;
    duration_ms?: number;
  };
  error?: TaskError | null;
}

export interface TaskMechanical {
  files: Array<{ action: string; path: string }>;
  git_range?: string;
  commands?: Array<{ cmd: string; exit_code: number }>;
  tool_calls?: {
    total: number;
    by_tool: Record<string, number>;
  };
}

export interface TaskSemantic {
  summary?: string;
  techniques?: Array<{ name: string; reason: string }>;
  ssot_refs?: Array<{ doc: string; section: string; status: string }>;
  decisions?: Array<{ decision: string; rationale: string; adr?: string | null }>;
  issues?: Array<{ level: number; description: string; filed_as?: string | null }>;
}

export interface TaskError {
  type: string;
  message: string;
  stack?: string | null;
  recovery?: {
    attempted: boolean;
    strategy?: string | null;
    result: string;
  };
}

export interface TaskStats {
  total: number;
  completed: number;
  failed: number;
  successRate: number;
  byAgent: Record<string, { total: number; completed: number; failed: number }>;
  totalFilesChanged: number;
  avgFilesPerTask: number;
  fileActions: Record<string, number>;
  withErrors: number;
  errorTypes: Record<string, number>;
  withSemantic: number;
  semanticCoverage: number;
}

// ── L2: Sequence Log ──

export interface AxisResult {
  verdict: 'pass' | 'warn' | 'fail' | 'n/a';
  details: string;
  issues: Array<{ level: number; description: string; [key: string]: unknown }>;
}

export interface SequenceLogEntry {
  schema_version: string;
  trace: { phase_id: string; sequence_id: string };
  execution: {
    status: 'completed' | 'blocked' | 'partial' | 'aborted';
    started_at: string;
    completed_at: string;
    duration_ms: number;
  };
  tasks: {
    total: number;
    success: number;
    failure: number;
    error: number;
    rework: number;
    first_pass_success_rate: number;
    final_success_rate: number;
  };
  analysis: {
    axis_1_consistency: AxisResult;
    axis_2_ssot_conformance: AxisResult;
    axis_3_cross_sequence: AxisResult & { prev_sequence: string | null };
  };
  dora_derived: {
    change_failure_rate: number;
    rework_rate: number;
    mean_task_duration_ms: number;
    recovery_time_ms: number | null;
  };
  verdict: { proceed: boolean; conditions: string[]; report_path: string };
}

// ── L3: Phase Log ──

export interface PhaseLogEntry {
  schema_version: string;
  trace: { phase_id: string };
  execution: {
    status: 'completed' | 'aborted';
    started_at: string;
    completed_at: string;
    duration_ms: number;
    sessions_count: number;
  };
  sequences: { total: number; completed: number; blocked: number; ids: string[] };
  aggregate_metrics: {
    total_tasks: number;
    task_success_rate: number;
    task_rework_rate: number;
    total_files_changed: number;
    total_issues: { level_1: number; level_2: number; level_3: number };
    ssot_conformance_rate: number;
    mean_sequence_duration_ms: number;
  };
  dora_derived: {
    lead_time_ms: number;
    change_failure_rate: number;
    mean_recovery_time_ms: number | null;
  };
  planning: {
    original_sequences: string[];
    added_sequences: string[];
    removed_sequences: string[];
    scope_changes: Array<{ description: string; reason: string; impact: string }>;
    plan_adherence_rate: number;
  };
  retrospective: { keep: string[]; problem: string[]; try: string[] };
  knowledge_extracted: Array<{ type: string; content: string; target: string }>;
}

// ── Phase Gate ──

export interface PhaseGateResult {
  phase_id: string;
  can_transition: boolean;
  missing_sequences: string[];
  missing_reports: string[];
  blocking_conditions: string[];
}

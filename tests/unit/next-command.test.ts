import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import path from 'path';
import fs from 'fs-extra';
import os from 'os';
import {
  loadWorkflowState,
  findNextTask,
  findNextWave,
  getPhaseStatus,
  markTaskComplete,
  appendPhaseMemoryProgress,
  getCompletedTaskIds,
  type WorkflowState,
  type WorkflowStateV2,
} from '../../src/lib/workflow-state.js';
import { parsePlanningContent, type PlanningDocument } from '../../src/lib/planning-parser.js';

// ─── Test fixtures ──────────────────────────────────────────────

const SAMPLE_PLANNING = `# TestApp 기획서

## Phase 1: 인증

### Sequence 1: 로그인

#### Task 1: 로그인 UI
#### Task 2: 로그인 API

### Sequence 2: 회원가입

#### Task 1: 가입 폼

## Phase 2: 결제

### Sequence 1: PG연동

#### Task 1: PG 연동 구현
#### Task 2: 결제 테스트
`;

const EMPTY_STATE: WorkflowState = {
  schema_version: '1.0.0',
  automation: { sequence_log: true, phase_log: true, phase_gate: true, metrics: true, retro: true, feedback: true },
  current_phase: null,
  sequences: {},
  completed_phases: [],
  pending_feedback: [],
};

// ─── findNextTask ───────────────────────────────────────────────

describe('findNextTask', () => {
  let doc: PlanningDocument;

  beforeEach(() => {
    doc = parsePlanningContent(SAMPLE_PLANNING);
  });

  it('should return first task when nothing is complete', () => {
    const next = findNextTask(doc, EMPTY_STATE);
    expect(next).not.toBeNull();
    expect(next!.taskId).toBe('P1-S001-T001');
    expect(next!.phaseId).toBe('P1');
    expect(next!.sequenceId).toBe('P1-S001');
    expect(next!.title).toBe('로그인 UI');
  });

  it('should skip completed tasks', () => {
    const state: WorkflowStateV2 = {
      ...EMPTY_STATE,
      completed_task_ids: ['P1-S001-T001', 'P1-S001-T002'],
    };
    const next = findNextTask(doc, state);
    expect(next).not.toBeNull();
    expect(next!.taskId).toBe('P1-S002-T001');
  });

  it('should cross phase boundary', () => {
    const state: WorkflowStateV2 = {
      ...EMPTY_STATE,
      completed_task_ids: ['P1-S001-T001', 'P1-S001-T002', 'P1-S002-T001'],
    };
    const next = findNextTask(doc, state);
    expect(next).not.toBeNull();
    expect(next!.taskId).toBe('P2-S001-T001');
    expect(next!.phaseId).toBe('P2');
  });

  it('should return null when all tasks complete', () => {
    const state: WorkflowStateV2 = {
      ...EMPTY_STATE,
      completed_task_ids: [
        'P1-S001-T001', 'P1-S001-T002',
        'P1-S002-T001',
        'P2-S001-T001', 'P2-S001-T002',
      ],
    };
    const next = findNextTask(doc, state);
    expect(next).toBeNull();
  });
});

// ─── findNextWave ────────────────────────────────────────────────

const PLANNING_WITH_DEPS = `# TestApp

## Phase 1: 구현

### Sequence 1: 기반

#### Task 1: DB 스키마
- agent: dba

#### Task 2: API 서버 설정
- agent: developer

#### Task 3: API 엔드포인트
- agent: developer
- Depends: P1-S001-T001, P1-S001-T002

#### Task 4: UI 컴포넌트
- agent: designer
- Depends: P1-S001-T003
`;

describe('findNextWave', () => {
  it('should return all independent tasks in a wave', () => {
    const doc = parsePlanningContent(SAMPLE_PLANNING);
    const result = findNextWave(doc, EMPTY_STATE);
    expect(result).not.toBeNull();
    // All tasks in SAMPLE_PLANNING have no dependencies, so all P1 tasks are in wave
    expect(result!.wave.length).toBeGreaterThanOrEqual(2);
    expect(result!.totalRemaining).toBe(5);
  });

  it('should respect dependencies', () => {
    const doc = parsePlanningContent(PLANNING_WITH_DEPS);
    const result = findNextWave(doc, EMPTY_STATE);
    expect(result).not.toBeNull();
    // T001 and T002 have no deps → parallel
    // T003 depends on T001+T002, T004 depends on T003
    expect(result!.wave).toHaveLength(2);
    expect(result!.wave.map(t => t.taskId)).toContain('P1-S001-T001');
    expect(result!.wave.map(t => t.taskId)).toContain('P1-S001-T002');
  });

  it('should unlock dependent tasks after completion', () => {
    const doc = parsePlanningContent(PLANNING_WITH_DEPS);
    const state: WorkflowStateV2 = {
      ...EMPTY_STATE,
      completed_task_ids: ['P1-S001-T001', 'P1-S001-T002'],
    };
    const result = findNextWave(doc, state);
    expect(result).not.toBeNull();
    // T003 is now unlocked (deps met), T004 still blocked
    expect(result!.wave).toHaveLength(1);
    expect(result!.wave[0].taskId).toBe('P1-S001-T003');
  });

  it('should unlock T004 after T003 completes', () => {
    const doc = parsePlanningContent(PLANNING_WITH_DEPS);
    const state: WorkflowStateV2 = {
      ...EMPTY_STATE,
      completed_task_ids: ['P1-S001-T001', 'P1-S001-T002', 'P1-S001-T003'],
    };
    const result = findNextWave(doc, state);
    expect(result).not.toBeNull();
    expect(result!.wave).toHaveLength(1);
    expect(result!.wave[0].taskId).toBe('P1-S001-T004');
  });

  it('should return null when all tasks complete', () => {
    const doc = parsePlanningContent(PLANNING_WITH_DEPS);
    const state: WorkflowStateV2 = {
      ...EMPTY_STATE,
      completed_task_ids: ['P1-S001-T001', 'P1-S001-T002', 'P1-S001-T003', 'P1-S001-T004'],
    };
    const result = findNextWave(doc, state);
    expect(result).toBeNull();
  });

  it('should return single task wave for no-dep planning', () => {
    const doc = parsePlanningContent(SAMPLE_PLANNING);
    const result = findNextWave(doc, EMPTY_STATE);
    expect(result).not.toBeNull();
    expect(result!.wave.length).toBeGreaterThan(0);
    expect(result!.totalRemaining).toBe(5);
  });
});

// ─── getPhaseStatus ─────────────────────────────────────────────

describe('getPhaseStatus', () => {
  let doc: PlanningDocument;

  beforeEach(() => {
    doc = parsePlanningContent(SAMPLE_PLANNING);
  });

  it('should show phase incomplete status', () => {
    const state: WorkflowStateV2 = {
      ...EMPTY_STATE,
      current_phase: { id: 'P1', started_at: '2026-01-01T00:00:00Z', sequences: [] },
      completed_task_ids: ['P1-S001-T001'],
    };
    const status = getPhaseStatus(doc, state, 'P1');
    expect(status).not.toBeNull();
    expect(status!.phaseId).toBe('P1');
    expect(status!.totalTasks).toBe(3);
    expect(status!.completedTasks).toBe(1);
    expect(status!.isComplete).toBe(false);
    expect(status!.missingTasks).toEqual(['P1-S001-T002', 'P1-S002-T001']);
    expect(status!.actionRequired).toBe('continue');
  });

  it('should show phase complete status', () => {
    const state: WorkflowStateV2 = {
      ...EMPTY_STATE,
      current_phase: { id: 'P1', started_at: '2026-01-01T00:00:00Z', sequences: [] },
      completed_task_ids: ['P1-S001-T001', 'P1-S001-T002', 'P1-S002-T001'],
    };
    const status = getPhaseStatus(doc, state, 'P1');
    expect(status).not.toBeNull();
    expect(status!.isComplete).toBe(true);
    expect(status!.missingTasks).toEqual([]);
    expect(status!.actionRequired).toBe('phase-complete');
  });

  it('should auto-detect current phase from state', () => {
    const state: WorkflowStateV2 = {
      ...EMPTY_STATE,
      current_phase: { id: 'P2', started_at: '2026-01-01T00:00:00Z', sequences: [] },
      completed_task_ids: ['P2-S001-T001'],
    };
    const status = getPhaseStatus(doc, state);
    expect(status).not.toBeNull();
    expect(status!.phaseId).toBe('P2');
  });

  it('should return null for unknown phase', () => {
    const status = getPhaseStatus(doc, EMPTY_STATE, 'P99');
    expect(status).toBeNull();
  });
});

// ─── getCompletedTaskIds ────────────────────────────────────────

describe('getCompletedTaskIds', () => {
  it('should read from completed_task_ids field', () => {
    const state: WorkflowStateV2 = {
      ...EMPTY_STATE,
      completed_task_ids: ['P1-S001-T001', 'P1-S001-T002'],
    };
    const ids = getCompletedTaskIds(state);
    expect(ids.has('P1-S001-T001')).toBe(true);
    expect(ids.has('P1-S001-T002')).toBe(true);
  });

  it('should also read from sequence completed_tasks.task_log', () => {
    const state: WorkflowState = {
      ...EMPTY_STATE,
      sequences: {
        'P1-S001': {
          status: 'in_progress',
          phase: 'P1',
          expected_agents: ['developer'],
          completed_tasks: [
            { agent: 'developer', task_log: 'P1-S001-T001', completed_at: '2026-01-01T00:00:00Z' },
          ],
          report_path: null,
          l2_created: false,
        },
      },
    };
    const ids = getCompletedTaskIds(state);
    expect(ids.has('P1-S001-T001')).toBe(true);
  });
});

// ─── markTaskComplete (file I/O) ────────────────────────────────

describe('markTaskComplete', () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'tsq-next-'));
    await fs.ensureDir(path.join(tmpDir, '.timsquad', 'state'));
  });

  afterEach(async () => {
    await fs.remove(tmpDir);
  });

  it('should create completed_task_ids in workflow.json', async () => {
    await markTaskComplete(tmpDir, {
      taskId: 'P1-S001-T001',
      completedAt: '2026-01-01T00:00:00Z',
      agent: 'developer',
      summary: 'Login UI done',
    });

    const state = await loadWorkflowState(tmpDir) as WorkflowStateV2;
    expect(state.completed_task_ids).toContain('P1-S001-T001');
  });

  it('should not duplicate task IDs', async () => {
    await markTaskComplete(tmpDir, {
      taskId: 'P1-S001-T001',
      completedAt: '2026-01-01T00:00:00Z',
    });
    await markTaskComplete(tmpDir, {
      taskId: 'P1-S001-T001',
      completedAt: '2026-01-02T00:00:00Z',
    });

    const state = await loadWorkflowState(tmpDir) as WorkflowStateV2;
    expect(state.completed_task_ids.filter(id => id === 'P1-S001-T001')).toHaveLength(1);
  });

  it('should auto-create sequence entry', async () => {
    await markTaskComplete(tmpDir, {
      taskId: 'P2-S001-T003',
      completedAt: '2026-01-01T00:00:00Z',
      agent: 'developer',
    });

    const state = await loadWorkflowState(tmpDir);
    expect(state.sequences['P2-S001']).toBeDefined();
    expect(state.sequences['P2-S001'].phase).toBe('P2');
    expect(state.sequences['P2-S001'].completed_tasks).toHaveLength(1);
  });
});

// ─── appendPhaseMemoryProgress ──────────────────────────────────

describe('appendPhaseMemoryProgress', () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'tsq-mem-'));
    await fs.ensureDir(path.join(tmpDir, '.timsquad', 'state'));
  });

  afterEach(async () => {
    await fs.remove(tmpDir);
  });

  it('should create phase-memory.md if not exists', async () => {
    await appendPhaseMemoryProgress(tmpDir, 'P1-S001-T001', 'Login UI complete');
    const content = await fs.readFile(
      path.join(tmpDir, '.timsquad', 'state', 'phase-memory.md'),
      'utf-8',
    );
    expect(content).toContain('# Phase Memory');
    expect(content).toContain('## Progress');
    expect(content).toContain('P1-S001-T001: Login UI complete');
  });

  it('should append to existing Progress section', async () => {
    const memPath = path.join(tmpDir, '.timsquad', 'state', 'phase-memory.md');
    await fs.writeFile(memPath, '# Phase Memory\n\n## Progress\n- existing entry\n', 'utf-8');

    await appendPhaseMemoryProgress(tmpDir, 'P1-S001-T002', 'Login API done');
    const content = await fs.readFile(memPath, 'utf-8');
    expect(content).toContain('existing entry');
    expect(content).toContain('P1-S001-T002: Login API done');
  });
});

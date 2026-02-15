import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import path from 'path';
import fs from 'fs-extra';
import os from 'os';
import { classifyFeedback, getTriggerPatterns } from '../../src/commands/feedback.js';
import { DEFAULT_ROUTING_RULES } from '../../src/types/feedback.js';
import { loadWorkflowState, saveWorkflowState } from '../../src/lib/workflow-state.js';
import { buildPhaseGateData } from '../../src/commands/log.js';
import type { FeedbackEntry } from '../../src/types/feedback.js';

// ── classifyFeedback ──

describe('classifyFeedback', () => {
  const rules = DEFAULT_ROUTING_RULES;

  describe('Level 1 triggers', () => {
    it('should classify test failure messages as L1', () => {
      const result = classifyFeedback('test fail in auth module', rules);
      expect(result.level).toBe(1);
      expect(result.trigger).toBe('test_failure');
      expect(result.routeTo).toBe('developer');
    });

    it('should classify lint error messages as L1', () => {
      const result = classifyFeedback('eslint found 5 errors', rules);
      expect(result.level).toBe(1);
      expect(result.trigger).toBe('lint_error');
    });

    it('should classify type error messages as L1', () => {
      const result = classifyFeedback('type error in UserService', rules);
      expect(result.level).toBe(1);
      expect(result.trigger).toBe('type_error');
    });

    it('should classify runtime error messages as L1', () => {
      const result = classifyFeedback('runtime exception on login', rules);
      expect(result.level).toBe(1);
      expect(result.trigger).toBe('runtime_error');
    });

    it('should classify code style violations as L1', () => {
      const result = classifyFeedback('naming convention violation', rules);
      expect(result.level).toBe(1);
      expect(result.trigger).toBe('code_style_violation');
    });
  });

  describe('Level 2 triggers', () => {
    it('should classify architecture issues as L2', () => {
      const result = classifyFeedback('architecture issue in payment module', rules);
      expect(result.level).toBe(2);
      expect(result.trigger).toBe('architecture_issue');
      expect(result.routeTo).toBe('architect');
    });

    it('should classify API mismatch as L2', () => {
      const result = classifyFeedback('api endpoint returns wrong schema', rules);
      expect(result.level).toBe(2);
      expect(result.trigger).toBe('api_mismatch');
    });

    it('should classify performance problems as L2', () => {
      const result = classifyFeedback('performance degradation on dashboard', rules);
      expect(result.level).toBe(2);
      expect(result.trigger).toBe('performance_problem');
    });

    it('should classify security vulnerabilities as L2', () => {
      const result = classifyFeedback('security vulnerability found in auth', rules);
      expect(result.level).toBe(2);
      expect(result.trigger).toBe('security_vulnerability');
    });

    it('should classify scalability concerns as L2', () => {
      const result = classifyFeedback('bottleneck in database queries', rules);
      expect(result.level).toBe(2);
      expect(result.trigger).toBe('scalability_concern');
    });
  });

  describe('Level 3 triggers', () => {
    it('should classify requirement ambiguity as L3', () => {
      const result = classifyFeedback('requirement unclear for checkout flow', rules);
      expect(result.level).toBe(3);
      expect(result.trigger).toBe('requirement_ambiguity');
      expect(result.routeTo).toBe('user');
      expect(result.approvalRequired).toBe(true);
    });

    it('should classify scope change as L3', () => {
      const result = classifyFeedback('scope change requested for mobile', rules);
      expect(result.level).toBe(3);
      expect(result.trigger).toBe('scope_change');
    });

    it('should classify business logic errors as L3', () => {
      const result = classifyFeedback('business logic issue in pricing', rules);
      expect(result.level).toBe(3);
      expect(result.trigger).toBe('business_logic_error');
    });

    it('should classify feature requests as L3', () => {
      const result = classifyFeedback('feature request for dark mode', rules);
      expect(result.level).toBe(3);
      expect(result.trigger).toBe('feature_request');
    });

    it('should classify stakeholder feedback as L3', () => {
      const result = classifyFeedback('client needs different layout', rules);
      expect(result.level).toBe(3);
      expect(result.trigger).toBe('stakeholder_feedback');
    });
  });

  describe('default classification', () => {
    it('should default to L1 when no trigger matches', () => {
      const result = classifyFeedback('random unrelated message xyz', rules);
      expect(result.level).toBe(1);
      expect(result.trigger).toBe('default');
      expect(result.routeTo).toBe('developer');
      expect(result.approvalRequired).toBe(false);
    });
  });

  describe('Korean language triggers', () => {
    it('should match Korean L1 keywords', () => {
      const result = classifyFeedback('테스트 실패 발생', rules);
      expect(result.level).toBe(1);
      expect(result.trigger).toBe('test_failure');
    });

    it('should match Korean L2 keywords', () => {
      const result = classifyFeedback('아키텍처 개선 필요', rules);
      expect(result.level).toBe(2);
      expect(result.trigger).toBe('architecture_issue');
    });

    it('should match Korean L3 keywords', () => {
      const result = classifyFeedback('요구사항 변경됨', rules);
      expect(result.level).toBe(3);
      expect(result.trigger).toBe('requirement_ambiguity');
    });
  });
});

// ── getTriggerPatterns ──

describe('getTriggerPatterns', () => {
  it('should return patterns for known triggers', () => {
    const patterns = getTriggerPatterns('test_failure');
    expect(patterns).toContain('test fail');
    expect(patterns).toContain('테스트 실패');
  });

  it('should return fallback pattern for unknown triggers', () => {
    const patterns = getTriggerPatterns('unknown_trigger');
    expect(patterns).toEqual(['unknown trigger']);
  });
});

// ── Auto-actions & Workflow Integration ──

describe('feedback auto-actions', () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = path.join(os.tmpdir(), `tsq-feedback-test-${Date.now()}`);
    await fs.ensureDir(path.join(tmpDir, '.timsquad', 'feedback'));
    await fs.ensureDir(path.join(tmpDir, '.timsquad', 'state'));
  });

  afterEach(async () => {
    await fs.remove(tmpDir);
  });

  describe('workflow state pending_feedback', () => {
    it('should initialize with empty pending_feedback', async () => {
      const state = await loadWorkflowState(tmpDir);
      expect(state.pending_feedback).toEqual([]);
      expect(state.automation.feedback).toBe(true);
    });

    it('should persist pending_feedback across save/load', async () => {
      const state = await loadWorkflowState(tmpDir);
      state.pending_feedback.push('FB-0001', 'FB-0002');
      await saveWorkflowState(tmpDir, state);

      const loaded = await loadWorkflowState(tmpDir);
      expect(loaded.pending_feedback).toEqual(['FB-0001', 'FB-0002']);
    });

    it('should remove feedback from pending after resolve', async () => {
      const state = await loadWorkflowState(tmpDir);
      state.pending_feedback = ['FB-0001', 'FB-0002', 'FB-0003'];
      await saveWorkflowState(tmpDir, state);

      // Simulate resolve
      const reloaded = await loadWorkflowState(tmpDir);
      const idx = reloaded.pending_feedback.indexOf('FB-0002');
      reloaded.pending_feedback.splice(idx, 1);
      await saveWorkflowState(tmpDir, reloaded);

      const final = await loadWorkflowState(tmpDir);
      expect(final.pending_feedback).toEqual(['FB-0001', 'FB-0003']);
    });
  });

  describe('FeedbackEntry status', () => {
    it('should support all status values', async () => {
      const statuses: Array<FeedbackEntry['status']> = ['open', 'in_review', 'resolved', 'approved', 'rejected'];

      for (const status of statuses) {
        const entry: FeedbackEntry = {
          id: `FB-${status}`,
          timestamp: new Date().toISOString(),
          type: 'feedback',
          level: 2,
          trigger: 'architecture_issue',
          message: 'test',
          routeTo: 'architect',
          status,
        };

        const fbPath = path.join(tmpDir, '.timsquad', 'feedback', `FB-${status}.json`);
        await fs.writeJson(fbPath, entry, { spaces: 2 });

        const loaded: FeedbackEntry = await fs.readJson(fbPath);
        expect(loaded.status).toBe(status);
      }
    });

    it('should track resolvedAt and resolvedBy', async () => {
      const entry: FeedbackEntry = {
        id: 'FB-0001',
        timestamp: new Date().toISOString(),
        type: 'feedback',
        level: 3,
        trigger: 'scope_change',
        message: 'scope changed',
        routeTo: 'user',
        status: 'approved',
        resolvedAt: new Date().toISOString(),
        resolvedBy: 'user',
      };

      const fbPath = path.join(tmpDir, '.timsquad', 'feedback', 'FB-0001.json');
      await fs.writeJson(fbPath, entry, { spaces: 2 });

      const loaded: FeedbackEntry = await fs.readJson(fbPath);
      expect(loaded.resolvedAt).toBeDefined();
      expect(loaded.resolvedBy).toBe('user');
    });
  });
});

// ── Phase Gate Integration ──

describe('phase gate feedback integration', () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = path.join(os.tmpdir(), `tsq-gate-test-${Date.now()}`);
    await fs.ensureDir(path.join(tmpDir, '.timsquad', 'feedback'));
    await fs.ensureDir(path.join(tmpDir, '.timsquad', 'state'));
    await fs.ensureDir(path.join(tmpDir, '.timsquad', 'logs', 'sequences'));
  });

  afterEach(async () => {
    await fs.remove(tmpDir);
  });

  it('should block phase gate when unresolved L2 feedback exists', async () => {
    // Setup: sequence log for phase
    const seqDir = path.join(tmpDir, '.timsquad', 'logs', 'sequences');
    await fs.writeJson(path.join(seqDir, 'seq-1.json'), {
      schema_version: '1.0.0',
      trace: { phase_id: 'phase-1', sequence_id: 'seq-1' },
      execution: { status: 'completed', started_at: '', completed_at: '', duration_ms: 0 },
      tasks: { total: 1, success: 1, failure: 0, error: 0, rework: 0, first_pass_success_rate: 1, final_success_rate: 1 },
      analysis: {
        axis_1_consistency: { verdict: 'pass', details: '', issues: [] },
        axis_2_ssot_conformance: { verdict: 'pass', details: '', issues: [] },
        axis_3_cross_sequence: { verdict: 'pass', details: '', issues: [], prev_sequence: null },
      },
      dora_derived: { change_failure_rate: 0, rework_rate: 0, mean_task_duration_ms: 0, recovery_time_ms: null },
      verdict: { proceed: true, conditions: [], report_path: '' },
    }, { spaces: 2 });

    // Setup: pending L2 feedback
    const fb: FeedbackEntry = {
      id: 'FB-0001',
      timestamp: new Date().toISOString(),
      type: 'feedback',
      level: 2,
      trigger: 'architecture_issue',
      message: 'architecture issue',
      routeTo: 'architect',
      status: 'in_review',
    };
    await fs.writeJson(path.join(tmpDir, '.timsquad', 'feedback', 'FB-0001.json'), fb, { spaces: 2 });

    // Setup: workflow state with pending feedback
    const state = await loadWorkflowState(tmpDir);
    state.pending_feedback = ['FB-0001'];
    await saveWorkflowState(tmpDir, state);

    // Test: phase gate should be blocked
    const result = await buildPhaseGateData(tmpDir, 'phase-1');
    expect(result.can_transition).toBe(false);
    expect(result.blocking_conditions).toEqual(
      expect.arrayContaining([expect.stringContaining('Unresolved L2 feedback: FB-0001')]),
    );
  });

  it('should block phase gate when unresolved L3 feedback exists', async () => {
    // Setup: sequence log
    const seqDir = path.join(tmpDir, '.timsquad', 'logs', 'sequences');
    await fs.writeJson(path.join(seqDir, 'seq-1.json'), {
      schema_version: '1.0.0',
      trace: { phase_id: 'phase-1', sequence_id: 'seq-1' },
      execution: { status: 'completed', started_at: '', completed_at: '', duration_ms: 0 },
      tasks: { total: 1, success: 1, failure: 0, error: 0, rework: 0, first_pass_success_rate: 1, final_success_rate: 1 },
      analysis: {
        axis_1_consistency: { verdict: 'pass', details: '', issues: [] },
        axis_2_ssot_conformance: { verdict: 'pass', details: '', issues: [] },
        axis_3_cross_sequence: { verdict: 'pass', details: '', issues: [], prev_sequence: null },
      },
      dora_derived: { change_failure_rate: 0, rework_rate: 0, mean_task_duration_ms: 0, recovery_time_ms: null },
      verdict: { proceed: true, conditions: [], report_path: '' },
    }, { spaces: 2 });

    // Setup: pending L3 feedback
    const fb: FeedbackEntry = {
      id: 'FB-0002',
      timestamp: new Date().toISOString(),
      type: 'feedback',
      level: 3,
      trigger: 'scope_change',
      message: 'scope changed',
      routeTo: 'user',
      status: 'open',
    };
    await fs.writeJson(path.join(tmpDir, '.timsquad', 'feedback', 'FB-0002.json'), fb, { spaces: 2 });

    const state = await loadWorkflowState(tmpDir);
    state.pending_feedback = ['FB-0002'];
    await saveWorkflowState(tmpDir, state);

    const result = await buildPhaseGateData(tmpDir, 'phase-1');
    expect(result.can_transition).toBe(false);
    expect(result.blocking_conditions).toEqual(
      expect.arrayContaining([expect.stringContaining('Unresolved L3 feedback: FB-0002')]),
    );
  });

  it('should not block phase gate when all feedback is resolved', async () => {
    // Setup: sequence log
    const seqDir = path.join(tmpDir, '.timsquad', 'logs', 'sequences');
    await fs.writeJson(path.join(seqDir, 'seq-1.json'), {
      schema_version: '1.0.0',
      trace: { phase_id: 'phase-1', sequence_id: 'seq-1' },
      execution: { status: 'completed', started_at: '', completed_at: '', duration_ms: 0 },
      tasks: { total: 1, success: 1, failure: 0, error: 0, rework: 0, first_pass_success_rate: 1, final_success_rate: 1 },
      analysis: {
        axis_1_consistency: { verdict: 'pass', details: '', issues: [] },
        axis_2_ssot_conformance: { verdict: 'pass', details: '', issues: [] },
        axis_3_cross_sequence: { verdict: 'pass', details: '', issues: [], prev_sequence: null },
      },
      dora_derived: { change_failure_rate: 0, rework_rate: 0, mean_task_duration_ms: 0, recovery_time_ms: null },
      verdict: { proceed: true, conditions: [], report_path: '' },
    }, { spaces: 2 });

    // Setup: resolved feedback (not in pending)
    const fb: FeedbackEntry = {
      id: 'FB-0003',
      timestamp: new Date().toISOString(),
      type: 'feedback',
      level: 2,
      trigger: 'api_mismatch',
      message: 'api mismatch',
      routeTo: 'architect',
      status: 'resolved',
      resolvedAt: new Date().toISOString(),
      resolvedBy: 'user',
    };
    await fs.writeJson(path.join(tmpDir, '.timsquad', 'feedback', 'FB-0003.json'), fb, { spaces: 2 });

    // No pending feedback
    const state = await loadWorkflowState(tmpDir);
    state.pending_feedback = [];
    await saveWorkflowState(tmpDir, state);

    const result = await buildPhaseGateData(tmpDir, 'phase-1');
    expect(result.can_transition).toBe(true);
    expect(result.blocking_conditions).not.toEqual(
      expect.arrayContaining([expect.stringContaining('feedback')]),
    );
  });
});

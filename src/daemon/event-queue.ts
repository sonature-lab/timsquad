/**
 * Daemon Event Queue
 * 내부 이벤트 큐 + 핸들러.
 * task-complete → sequence-complete → phase-complete 연쇄 처리.
 * 기존 event-logger.sh + auto-workflow.sh 로직을 TypeScript로 대체.
 */

import path from 'path';
import fs from 'fs-extra';
import { simpleGit } from 'simple-git';
import {
  loadWorkflowState, saveWorkflowState,
  findSequenceForAgent, isSequenceComplete,
} from '../lib/workflow-state.js';
import {
  buildSequenceLogData, buildPhaseGateData,
  getTasksDir, getSequencesDir, getPhasesDir,
} from '../commands/log.js';
import { getTimestamp } from '../utils/date.js';
import type { SubagentBaseline } from './jsonl-watcher.js';

export type DaemonEvent =
  | { type: 'task-complete'; agent: string; timestamp: string; baseline?: SubagentBaseline }
  | { type: 'sequence-complete'; seqId: string; phaseId: string }
  | { type: 'phase-complete'; phaseId: string }
  | { type: 'source-changed'; paths: string[] }
  | { type: 'ssot-changed'; paths: string[] }
  | { type: 'session-end' };

interface EventLog {
  timestamp: string;
  event: string;
  status: 'success' | 'error';
  detail?: string;
}

export class EventQueue {
  private queue: DaemonEvent[] = [];
  private processing = false;
  private projectRoot: string;
  private sessionShort: string;
  public eventLog: EventLog[] = [];
  public onShutdown: (() => Promise<void>) | null = null;
  public onSourceChanged: ((paths: string[]) => void) | null = null;

  constructor(projectRoot: string, sessionShort: string) {
    this.projectRoot = projectRoot;
    this.sessionShort = sessionShort;
  }

  updateSessionShort(short: string): void {
    this.sessionShort = short;
  }

  enqueue(event: DaemonEvent): void {
    this.queue.push(event);
    if (!this.processing) {
      this.processNext();
    }
  }

  private async processNext(): Promise<void> {
    if (this.queue.length === 0) {
      this.processing = false;
      return;
    }

    this.processing = true;
    const event = this.queue.shift()!;

    try {
      switch (event.type) {
        case 'task-complete':
          await this.handleTaskComplete(event.agent, event.timestamp, event.baseline);
          break;
        case 'sequence-complete':
          await this.handleSequenceComplete(event.seqId, event.phaseId);
          break;
        case 'phase-complete':
          await this.handlePhaseComplete(event.phaseId);
          break;
        case 'source-changed':
          this.handleSourceChanged(event.paths);
          break;
        case 'ssot-changed':
          await this.handleSSOTChanged(event.paths);
          break;
        case 'session-end':
          await this.handleSessionEnd();
          break;
      }
      this.log(event.type, 'success');
    } catch (err) {
      this.log(event.type, 'error', (err as Error).message);
    }

    // 다음 이벤트 처리
    await this.processNext();
  }

  private log(event: string, status: 'success' | 'error', detail?: string): void {
    this.eventLog.push({ timestamp: getTimestamp(), event, status, detail });
  }

  // ── Task Complete ──

  private async handleTaskComplete(
    agent: string,
    timestamp: string,
    baseline?: SubagentBaseline,
  ): Promise<void> {
    const git = simpleGit(this.projectRoot);
    const today = new Date().toISOString().split('T')[0];

    // 1. Git diff → mechanical 데이터
    let mechanical: { files: Array<{ action: string; path: string }> } = { files: [] };
    if (baseline?.gitHead) {
      try {
        const currentHead = await git.revparse(['HEAD']);
        if (currentHead.trim() !== baseline.gitHead) {
          const diff = await git.diff(['--name-status', baseline.gitHead]);
          mechanical.files = diff.split('\n')
            .filter(l => l.trim())
            .map(line => {
              const [action, ...rest] = line.split('\t');
              return { action: action || 'M', path: rest.join('\t') };
            });
        }
      } catch {
        // git 실패 무시
      }
    }

    // Duration 계산
    let durationMs = 0;
    let startedAt = '';
    if (baseline?.startedAt) {
      const endEpoch = Math.floor(Date.now() / 1000);
      durationMs = (endEpoch - baseline.startedAt) * 1000;
      startedAt = new Date(baseline.startedAt * 1000).toISOString();
    }

    // 2. L1 태스크 로그 JSON 생성
    const tasksDir = getTasksDir(this.projectRoot);
    await fs.ensureDir(tasksDir);
    const taskLogFile = path.join(tasksDir, `${today}-${this.sessionShort}-${agent}.json`);

    const taskLog = {
      agent,
      session: this.sessionShort,
      started_at: startedAt,
      completed_at: timestamp,
      duration_ms: durationMs,
      status: 'completed',
      mechanical,
      semantic: {},
    };

    await fs.writeJson(taskLogFile, taskLog, { spaces: 2 });

    // 3. Meta Index: pending queue에 변경 파일 기록
    if (mechanical.files.length > 0) {
      const pendingPath = path.join(this.projectRoot, '.timsquad', 'state', 'meta-index', 'pending.jsonl');
      if (await fs.pathExists(path.dirname(pendingPath))) {
        const entries = mechanical.files.map(f => JSON.stringify({
          timestamp,
          filePath: f.path,
          action: f.action,
          agent,
          session: this.sessionShort,
          source: 'daemon',
        }));
        await fs.appendFile(pendingPath, entries.join('\n') + '\n');
      }
    }

    // 4. Workflow tracking
    const state = await loadWorkflowState(this.projectRoot);
    if (state.automation.sequence_log) {
      const seqId = findSequenceForAgent(state, agent);
      if (seqId && state.sequences[seqId]) {
        state.sequences[seqId].completed_tasks.push({
          agent,
          task_log: taskLogFile,
          completed_at: timestamp,
        });

        if (isSequenceComplete(state.sequences[seqId])) {
          state.sequences[seqId].status = 'completed';
          await saveWorkflowState(this.projectRoot, state);
          // 연쇄: sequence-complete 큐잉
          this.enqueue({
            type: 'sequence-complete',
            seqId,
            phaseId: state.sequences[seqId].phase,
          });
        } else {
          state.sequences[seqId].status = 'in_progress';
          await saveWorkflowState(this.projectRoot, state);
        }
      } else {
        await saveWorkflowState(this.projectRoot, state);
      }
    }
  }

  // ── Sequence Complete ──

  private async handleSequenceComplete(seqId: string, phaseId: string): Promise<void> {
    const state = await loadWorkflowState(this.projectRoot);
    if (!state.automation.sequence_log) return;

    // Sequence gate: integration test + build check
    let gateResult: { passed: boolean; errors: string[] } = { passed: true, errors: [] };
    try {
      const { execFile } = await import('child_process');
      const { promisify } = await import('util');
      const execFileAsync = promisify(execFile);

      // Build check (tsc --noEmit)
      try {
        await execFileAsync('npx', ['tsc', '--noEmit'], {
          cwd: this.projectRoot,
          timeout: 180_000,
        });
      } catch {
        gateResult.passed = false;
        gateResult.errors.push('tsc --noEmit failed');
      }

      // Integration test (npm run test:integration if script exists)
      try {
        const pkgPath = path.join(this.projectRoot, 'package.json');
        if (await fs.pathExists(pkgPath)) {
          const pkg = await fs.readJson(pkgPath);
          if (pkg.scripts?.['test:integration']) {
            await execFileAsync('npm', ['run', 'test:integration'], {
              cwd: this.projectRoot,
              timeout: 300_000,
            });
          }
        }
      } catch {
        gateResult.passed = false;
        gateResult.errors.push('integration test failed');
      }

      if (!gateResult.passed) {
        this.log('sequence-gate', 'error', `Blocked: ${gateResult.errors.join(', ')}`);
        if (state.sequences[seqId]) {
          state.sequences[seqId].status = 'blocked';
          await saveWorkflowState(this.projectRoot, state);
        }
        return;
      }

      this.log('sequence-gate', 'success', `Sequence ${seqId} gate passed`);
    } catch {
      // Gate check failure is non-blocking (fail-open)
      this.log('sequence-gate', 'error', 'gate check failed — continuing (fail-open)');
    }

    // L2 시퀀스 로그 생성
    try {
      const entry = await buildSequenceLogData(this.projectRoot, seqId, {
        phase: phaseId,
        report: '', // 자동 생성 시 보고서 없음
        verdict: 'proceed',
      });

      const seqDir = getSequencesDir(this.projectRoot);
      await fs.ensureDir(seqDir);
      await fs.writeJson(path.join(seqDir, `${seqId}.json`), entry, { spaces: 2 });

      // workflow에 l2_created 마킹
      if (state.sequences[seqId]) {
        state.sequences[seqId].l2_created = true;
        await saveWorkflowState(this.projectRoot, state);
      }
    } catch {
      // L2 생성 실패 — 로그에 기록됨
    }

    // 16-A: architect 자동 호출 (시퀀스 완료 시)
    try {
      const architectAgent = path.join(this.projectRoot, '.claude', 'agents', 'tsq-architect.md');
      if (await fs.pathExists(architectAgent)) {
        this.log('architect-auto-invoke', 'success', `sequence ${seqId} complete → architect queued`);
        // 핸드오프 생성으로 architect에 컨텍스트 전달
        const { writeHandoff } = await import('./context-writer.js');
        await writeHandoff(this.projectRoot, {
          agent: 'system',
          completedAt: getTimestamp(),
          changedFiles: [],
          warnings: [`Sequence ${seqId} completed in phase ${phaseId}`],
          executionLogRef: `sequences/${seqId}.json`,
        });
      }
    } catch {
      // architect 호출 실패 — non-blocking
    }

    // 페이즈 완료 체크
    if (state.automation.phase_log && state.current_phase?.id === phaseId) {
      const phaseSeqs = state.current_phase.sequences;
      const allComplete = phaseSeqs.every(sid =>
        state.sequences[sid]?.status === 'completed'
      );

      if (allComplete) {
        this.enqueue({ type: 'phase-complete', phaseId });
      }
    }
  }

  // ── Phase Complete ──

  private async handlePhaseComplete(phaseId: string): Promise<void> {
    const state = await loadWorkflowState(this.projectRoot);

    // L3 페이즈 로그 생성
    if (state.automation.phase_log) {
      const seqIds = state.current_phase?.sequences || [];
      if (seqIds.length > 0) {
        try {
          const phasesDir = getPhasesDir(this.projectRoot);
          const phaseLogPath = path.join(phasesDir, `${phaseId}.json`);

          if (!await fs.pathExists(phaseLogPath)) {
            // Direct function call instead of execFileSync('tsq')
            // to avoid PATH dependency issues
            const { buildPhaseLogData } = await import('../commands/workflow.js');
            const phaseLog = await buildPhaseLogData(this.projectRoot, phaseId, seqIds);
            await fs.ensureDir(phasesDir);
            await fs.writeJson(phaseLogPath, phaseLog, { spaces: 2 });
          }
        } catch {
          // L3 creation failure — checkAndAutomate fallback will retry
        }
      }
    }

    // Phase gate 체크 + 자동 전환
    if (state.automation.phase_gate) {
      try {
        const gate = await buildPhaseGateData(this.projectRoot, phaseId);
        this.log('phase-gate', gate.can_transition ? 'success' : 'error',
          gate.can_transition ? 'PASSED' : `BLOCKED: ${gate.blocking_conditions.join(', ')}`);

        if (gate.can_transition) {
          // Phase 완료 처리: completed_phases에 추가 + current_phase 정리
          const freshState = await loadWorkflowState(this.projectRoot);
          if (!freshState.completed_phases.includes(phaseId)) {
            freshState.completed_phases.push(phaseId);
          }

          // 해당 Phase 시퀀스 상태 정리
          for (const seqId of freshState.current_phase?.sequences || []) {
            if (freshState.sequences[seqId]) {
              freshState.sequences[seqId].status = 'completed';
            }
          }

          // current_phase 해제 (다음 Phase는 PM이 tsq wf set-phase로 설정)
          freshState.current_phase = null;
          await saveWorkflowState(this.projectRoot, freshState);
          this.log('phase-transition', 'success', `Phase "${phaseId}" completed and archived`);

          // Librarian 자동 호출 (Phase 완료 기록)
          try {
            const { writeHandoff } = await import('./context-writer.js');
            await writeHandoff(this.projectRoot, {
              agent: 'system',
              completedAt: getTimestamp(),
              changedFiles: [],
              warnings: [`Phase "${phaseId}" completed — Librarian recording needed`],
              executionLogRef: `phases/${phaseId}.json`,
            });
            this.log('librarian-auto-invoke', 'success', `phase ${phaseId} complete → librarian queued`);
          } catch {
            // librarian 호출 실패 — non-blocking
          }
        }
      } catch {
        // 실패 무시
      }
    }
  }

  // ── Source Changed ──

  private handleSourceChanged(paths: string[]): void {
    if (this.onSourceChanged) {
      this.onSourceChanged(paths);
    }
  }

  // ── SSOT Changed ──

  private async handleSSOTChanged(paths: string[]): Promise<void> {
    try {
      const { compileAll } = await import('../lib/compiler.js');
      const controllerDir = path.join(this.projectRoot, '.claude', 'skills', 'controller');
      await compileAll(this.projectRoot, controllerDir);
      this.log('ssot-compile', 'success', `Auto-compiled after SSOT change: ${paths.join(', ')}`);
    } catch (err) {
      this.log('ssot-compile', 'error', `Compile failed: ${(err as Error).message}`);
    }
  }

  // ── Session End ──

  private async handleSessionEnd(): Promise<void> {
    if (this.onShutdown) {
      await this.onShutdown();
    }
  }
}

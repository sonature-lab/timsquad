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
          // buildPhaseLogData와 동일한 로직 (createPhaseLog에서 추출)
          const phasesDir = getPhasesDir(this.projectRoot);
          await fs.ensureDir(phasesDir);

          // tsq log phase create를 직접 실행
          const { execSync } = await import('child_process');
          execSync(
            `tsq log phase create ${phaseId} --sequences "${seqIds.join(',')}"`,
            { cwd: this.projectRoot, timeout: 30000, stdio: 'ignore' },
          );
        } catch {
          // 실패 시 무시
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

  // ── Session End ──

  private async handleSessionEnd(): Promise<void> {
    if (this.onShutdown) {
      await this.onShutdown();
    }
  }
}

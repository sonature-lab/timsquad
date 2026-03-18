/**
 * Daemon Event Queue
 * 내부 이벤트 큐 + 핸들러.
 * Daemon = 관찰자 + 수집자. Workflow 진행은 Controller만 담당.
 */

import path from 'path';
import fs from 'fs-extra';
import { simpleGit } from 'simple-git';
import { getTasksDir } from '../lib/log-utils.js';
import { getTimestamp } from '../utils/date.js';
import type { SubagentBaseline } from './jsonl-watcher.js';

export type DaemonEvent =
  | { type: 'task-complete'; agent: string; timestamp: string; baseline?: SubagentBaseline }
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

    await this.processNext();
  }

  private log(event: string, status: 'success' | 'error', detail?: string): void {
    this.eventLog.push({ timestamp: getTimestamp(), event, status, detail });
    if (this.eventLog.length > 1000) {
      this.eventLog = this.eventLog.slice(-500);
    }
  }

  // ── Task Complete (L1 생성 + 관찰만) ──

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

    // 2. Decision Log에서 해당 에이전트 결정 추출 → semantic 필드
    const decisions = await this.getAgentDecisions(agent);

    // 3. L1 태스크 로그 JSON 생성
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
      semantic: { decisions },
    };

    await fs.writeJson(taskLogFile, taskLog, { spaces: 2 });

    // 4. Meta Index: pending queue에 변경 파일 기록
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
  }

  // ── Decision Log 읽기 ──

  private async getAgentDecisions(agent: string): Promise<object[]> {
    const decisionsPath = path.join(this.projectRoot, '.timsquad', 'state', 'decisions.jsonl');
    if (!await fs.pathExists(decisionsPath)) return [];
    try {
      const content = await fs.readFile(decisionsPath, 'utf-8');
      return content.split('\n')
        .filter(l => l.trim())
        .map(l => { try { return JSON.parse(l); } catch { return null; } })
        .filter(d => d && d.agent === agent);
    } catch {
      return [];
    }
  }

  // ── Source Changed ──

  private handleSourceChanged(paths: string[]): void {
    if (this.onSourceChanged) {
      this.onSourceChanged(paths);
    }
    // SSOT Drift Detection: 소스 변경 시 관련 SSOT 문서 미갱신 체크
    this.checkSSOTDrift().catch(() => { /* fail-open */ });
  }

  // ── SSOT Drift Detection ──

  private async checkSSOTDrift(): Promise<void> {
    const ssotDir = path.join(this.projectRoot, '.timsquad', 'ssot');
    if (!await fs.pathExists(ssotDir)) return;

    const now = Date.now();
    const DRIFT_THRESHOLD_MS = 7 * 24 * 60 * 60 * 1000; // 7일
    const warnings: Array<{ doc: string; lastModified: string; daysAgo: number }> = [];

    try {
      const files = await fs.readdir(ssotDir);
      for (const file of files) {
        if (!file.endsWith('.md')) continue;
        const filePath = path.join(ssotDir, file);
        const stat = await fs.stat(filePath);
        const ageMs = now - stat.mtimeMs;
        if (ageMs > DRIFT_THRESHOLD_MS) {
          warnings.push({
            doc: file,
            lastModified: stat.mtime.toISOString(),
            daysAgo: Math.floor(ageMs / (24 * 60 * 60 * 1000)),
          });
        }
      }
    } catch {
      return;
    }

    const driftPath = path.join(this.projectRoot, '.timsquad', '.daemon', 'drift-warnings.json');
    if (warnings.length > 0) {
      await fs.writeJson(driftPath, { updated: getTimestamp(), warnings }, { spaces: 2 });
    } else {
      await fs.remove(driftPath).catch(() => {});
    }
  }

  // ── SSOT Changed ──

  private async handleSSOTChanged(paths: string[]): Promise<void> {
    try {
      const { compileAll } = await import('../lib/compiler.js');
      const controllerDir = path.join(this.projectRoot, '.claude', 'skills', 'tsq-controller');
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

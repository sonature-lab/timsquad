/**
 * JSONL Stream Watcher
 * Claude Code 세션 JSONL 파일을 tail -f 방식으로 감시하여
 * SubagentStart/Stop, SessionEnd 등 이벤트를 감지한다.
 * 또한 event-logger.sh의 세션 로깅 기능을 대체한다.
 */

import { EventEmitter } from 'events';
import fs from 'fs-extra';
import path from 'path';
import chokidar from 'chokidar';
import { getTimestamp } from '../utils/date.js';

export interface IncrementalMetrics {
  toolUses: number;
  toolFailures: number;
  subagentCount: number;
  tokenInput: number;
  tokenOutput: number;
  tokenCacheCreate: number;
  tokenCacheRead: number;
  bashCommands: number;
  tsqCommands: number;
}

export interface SubagentBaseline {
  agent: string;
  gitHead: string;
  startedAt: number; // epoch seconds
}

export class JsonlWatcher extends EventEmitter {
  private offset = 0;
  private watcher: chokidar.FSWatcher | null = null;
  private jsonlPath: string;
  private projectRoot: string;
  private sessionLogPath: string | null = null;
  private sessionShort = 'unknown';
  private activeBaselines: Map<string, SubagentBaseline> = new Map();

  public metrics: IncrementalMetrics = {
    toolUses: 0,
    toolFailures: 0,
    subagentCount: 0,
    tokenInput: 0,
    tokenOutput: 0,
    tokenCacheCreate: 0,
    tokenCacheRead: 0,
    bashCommands: 0,
    tsqCommands: 0,
  };

  constructor(jsonlPath: string, projectRoot: string) {
    super();
    this.jsonlPath = jsonlPath;
    this.projectRoot = projectRoot;
  }

  async start(): Promise<void> {
    // JSONL 파일이 아직 없을 수 있음 — 생길 때까지 감시
    const dir = path.dirname(this.jsonlPath);

    // 이미 존재하면 현재 크기를 offset으로 설정 (기존 내용 스킵)
    if (await fs.pathExists(this.jsonlPath)) {
      const stat = await fs.stat(this.jsonlPath);
      this.offset = stat.size;
    }

    this.watcher = chokidar.watch(this.jsonlPath, {
      persistent: true,
      awaitWriteFinish: { stabilityThreshold: 100, pollInterval: 50 },
      // 파일이 없으면 디렉토리 감시하다 생기면 잡음
      ignoreInitial: true,
      cwd: dir,
    });

    this.watcher.on('change', () => this.readNewLines());
    this.watcher.on('add', () => this.readNewLines());
    this.watcher.on('error', (err) => this.emit('error', err));
  }

  async stop(): Promise<void> {
    if (this.watcher) {
      await this.watcher.close();
      this.watcher = null;
    }
  }

  getSessionShort(): string {
    return this.sessionShort;
  }

  getSessionLogPath(): string | null {
    return this.sessionLogPath;
  }

  getBaseline(agent: string): SubagentBaseline | undefined {
    return this.activeBaselines.get(agent);
  }

  private async readNewLines(): Promise<void> {
    try {
      const stat = await fs.stat(this.jsonlPath);
      if (stat.size <= this.offset) return;

      const fd = await fs.open(this.jsonlPath, 'r');
      const buf = Buffer.alloc(stat.size - this.offset);
      await fs.read(fd, buf, 0, buf.length, this.offset);
      await fs.close(fd);

      this.offset = stat.size;

      const text = buf.toString('utf-8');
      const lines = text.split('\n').filter(l => l.trim());

      for (const line of lines) {
        try {
          const event = JSON.parse(line);
          this.handleEvent(event);
        } catch {
          // 불완전한 줄 — skip
        }
      }
    } catch {
      // 파일 접근 실패 — skip
    }
  }

  private handleEvent(event: Record<string, unknown>): void {
    const hookName = (event.hook_event_name as string) || '';
    const sessionId = (event.session_id as string) || 'unknown';
    this.sessionShort = sessionId.substring(0, 8);

    // 세션 로그 경로 설정
    if (!this.sessionLogPath) {
      const today = new Date().toISOString().split('T')[0];
      const sessionsDir = path.join(this.projectRoot, '.timsquad', 'logs', 'sessions');
      this.sessionLogPath = path.join(sessionsDir, `${today}-${this.sessionShort}.jsonl`);
    }

    switch (hookName) {
      case 'SessionStart':
        this.handleSessionStart(event);
        break;
      case 'PostToolUse':
        this.handlePostToolUse(event, 'success');
        break;
      case 'PostToolUseFailure':
        this.handlePostToolUse(event, 'failure');
        break;
      case 'Stop':
        this.handleStop(event);
        break;
      case 'SubagentStart':
        this.handleSubagentStart(event);
        break;
      case 'SubagentStop':
        this.handleSubagentStop(event);
        break;
      case 'SessionEnd':
        this.handleSessionEnd(event);
        break;
    }
  }

  private handleSessionStart(event: Record<string, unknown>): void {
    const entry = {
      timestamp: getTimestamp(),
      event: 'SessionStart',
      session: this.sessionShort,
      source: event.source || 'unknown',
      cwd: event.cwd || '',
    };
    this.appendSessionLog(entry);
  }

  private handlePostToolUse(event: Record<string, unknown>, status: string): void {
    const toolName = (event.tool_name as string) || 'unknown';
    const toolInput = (event.tool_input as Record<string, unknown>) || {};

    // 도구 요약 추출
    let summary: Record<string, unknown> = { action: toolName };
    switch (toolName) {
      case 'Write': case 'Edit': case 'Read':
        summary = { file_path: toolInput.file_path, action: toolName };
        break;
      case 'Bash': {
        const cmd = String(toolInput.command || '').substring(0, 200);
        summary = { command: cmd, action: 'Bash' };
        // CLI 채택률 추적
        this.metrics.bashCommands++;
        if (cmd.startsWith('tsq ') || cmd.startsWith('npx tsq')) {
          this.metrics.tsqCommands++;
        }
        break;
      }
      case 'Glob': case 'Grep':
        summary = { pattern: toolInput.pattern, path: toolInput.path, action: toolName };
        break;
      case 'Task':
        summary = { description: toolInput.description, subagent_type: toolInput.subagent_type, action: 'Task' };
        break;
    }

    // 메트릭 누적
    if (status === 'success') this.metrics.toolUses++;
    else this.metrics.toolFailures++;

    const entry = {
      timestamp: getTimestamp(),
      event: status === 'success' ? 'PostToolUse' : 'PostToolUseFailure',
      session: this.sessionShort,
      tool: toolName,
      status,
      detail: summary,
    };
    this.appendSessionLog(entry);
  }

  private handleStop(event: Record<string, unknown>): void {
    // Stop 이벤트에서 usage 객체 추출 (있으면)
    const usage = event.usage as Record<string, number> | undefined;
    if (usage) {
      this.metrics.tokenInput += usage.input_tokens || usage.input || 0;
      this.metrics.tokenOutput += usage.output_tokens || usage.output || 0;
      this.metrics.tokenCacheCreate += usage.cache_creation_input_tokens || usage.cache_create || 0;
      this.metrics.tokenCacheRead += usage.cache_read_input_tokens || usage.cache_read || 0;
    }

    const entry = {
      timestamp: getTimestamp(),
      event: 'Stop',
      session: this.sessionShort,
      ...(usage ? { usage } : {}),
    };
    this.appendSessionLog(entry);
  }

  private handleSubagentStart(event: Record<string, unknown>): void {
    const agent = (event.subagent_type as string) || 'unknown';
    const description = String(event.description || '').substring(0, 200);

    // baseline 기록 (git HEAD + 시작 시각)
    this.activeBaselines.set(agent, {
      agent,
      gitHead: '', // 데몬의 event-queue에서 git rev-parse 실행
      startedAt: Math.floor(Date.now() / 1000),
    });

    this.metrics.subagentCount++;

    const entry = {
      timestamp: getTimestamp(),
      event: 'SubagentStart',
      session: this.sessionShort,
      detail: { subagent_type: agent, description },
    };
    this.appendSessionLog(entry);

    this.emit('subagent-start', { agent, description, timestamp: getTimestamp() });
  }

  private handleSubagentStop(event: Record<string, unknown>): void {
    const agent = (event.subagent_type as string) || 'unknown';
    const baseline = this.activeBaselines.get(agent);

    const entry = {
      timestamp: getTimestamp(),
      event: 'SubagentStop',
      session: this.sessionShort,
      detail: { subagent_type: agent },
    };
    this.appendSessionLog(entry);

    this.emit('subagent-stop', {
      agent,
      timestamp: getTimestamp(),
      baseline,
    });

    this.activeBaselines.delete(agent);
  }

  private handleSessionEnd(_event: Record<string, unknown>): void {
    const entry = {
      timestamp: getTimestamp(),
      event: 'SessionEnd',
      session: this.sessionShort,
    };
    this.appendSessionLog(entry);

    this.emit('session-end', { timestamp: getTimestamp() });
  }

  private appendSessionLog(entry: Record<string, unknown>): void {
    if (!this.sessionLogPath) return;
    try {
      fs.ensureDirSync(path.dirname(this.sessionLogPath));
      fs.appendFileSync(this.sessionLogPath, JSON.stringify(entry) + '\n');
    } catch {
      // 로깅 실패는 무시
    }
  }
}

/**
 * Session State Manager
 * 훅 기반 로깅 모드에서 세션 상태를 파일로 영속화한다.
 * JsonlWatcher의 인메모리 상태(metrics, baselines, session log)를 대체.
 */

import path from 'path';
import fs from 'fs-extra';
import { simpleGit } from 'simple-git';
import { getTimestamp } from '../utils/date.js';
import type { IncrementalMetrics, SubagentBaseline } from './jsonl-watcher.js';

const STATE_DIR = '.timsquad/.daemon';
const SESSION_STATE_FILE = 'session-state.json';
const BASELINES_DIR = 'baselines';

export interface SessionState {
  sessionShort: string;
  sessionId: string;
  sessionLogPath: string;
  metrics: IncrementalMetrics;
  startedAt: string;
}

// ── Session State ──

export async function loadSessionState(projectRoot: string): Promise<SessionState | null> {
  const filePath = path.join(projectRoot, STATE_DIR, SESSION_STATE_FILE);
  if (!await fs.pathExists(filePath)) return null;
  try {
    return await fs.readJson(filePath);
  } catch {
    return null;
  }
}

export async function updateSessionState(
  projectRoot: string,
  event: Record<string, unknown>,
): Promise<void> {
  const stateDir = path.join(projectRoot, STATE_DIR);
  await fs.ensureDir(stateDir);
  const filePath = path.join(stateDir, SESSION_STATE_FILE);

  let state = await loadSessionState(projectRoot);
  const sessionShort = String(event.sessionShort || state?.sessionShort || 'unknown');

  if (!state) {
    const today = new Date().toISOString().split('T')[0];
    const sessionsDir = path.join(projectRoot, '.timsquad', 'logs', 'sessions');
    state = {
      sessionShort,
      sessionId: String(event.sessionId || 'unknown'),
      sessionLogPath: path.join(sessionsDir, `${today}-${sessionShort}.jsonl`),
      metrics: {
        toolUses: 0, toolFailures: 0, subagentCount: 0,
        tokenInput: 0, tokenOutput: 0,
        tokenCacheCreate: 0, tokenCacheRead: 0,
        bashCommands: 0, tsqCommands: 0,
      },
      startedAt: getTimestamp(),
    };
  }

  // 이벤트 타입별 메트릭 갱신
  const eventType = String(event.event || '');
  switch (eventType) {
    case 'PostToolUse': {
      state.metrics.toolUses++;
      const tool = String(event.tool || '');
      if (tool === 'Bash') {
        state.metrics.bashCommands++;
        const cmd = String((event.detail as Record<string, unknown>)?.command || '');
        if (cmd.startsWith('tsq ') || cmd.startsWith('npx tsq')) {
          state.metrics.tsqCommands++;
        }
      }
      break;
    }
    case 'PostToolUseFailure':
      state.metrics.toolFailures++;
      break;
    case 'SubagentStart':
      state.metrics.subagentCount++;
      break;
    case 'Stop': {
      const usage = event.usage as Record<string, number> | undefined;
      if (usage) {
        state.metrics.tokenInput += usage.input_tokens || usage.input || 0;
        state.metrics.tokenOutput += usage.output_tokens || usage.output || 0;
        state.metrics.tokenCacheCreate += usage.cache_creation_input_tokens || usage.cache_create || 0;
        state.metrics.tokenCacheRead += usage.cache_read_input_tokens || usage.cache_read || 0;
      }
      break;
    }
  }

  // 세션 JSONL 로그에 append
  appendSessionLog(state.sessionLogPath, {
    timestamp: getTimestamp(),
    event: eventType,
    session: sessionShort,
    ...(event.tool ? { tool: event.tool } : {}),
    ...(event.detail ? { detail: event.detail } : {}),
    ...(event.usage ? { usage: event.usage } : {}),
  });

  await fs.writeJson(filePath, state, { spaces: 2 });
}

function appendSessionLog(logPath: string, entry: Record<string, unknown>): void {
  try {
    fs.ensureDirSync(path.dirname(logPath));
    fs.appendFileSync(logPath, JSON.stringify(entry) + '\n');
  } catch { /* ignore */ }
}

// ── Baselines (파일 기반) ──

export async function saveBaseline(projectRoot: string, agent: string): Promise<void> {
  const dir = path.join(projectRoot, STATE_DIR, BASELINES_DIR);
  await fs.ensureDir(dir);

  let gitHead = '';
  try {
    const git = simpleGit(projectRoot);
    gitHead = (await git.revparse(['HEAD'])).trim();
  } catch { /* git not available */ }

  const baseline: SubagentBaseline = {
    agent,
    gitHead,
    startedAt: Math.floor(Date.now() / 1000),
  };

  await fs.writeJson(path.join(dir, `${agent}.json`), baseline, { spaces: 2 });
}

export async function loadBaseline(
  projectRoot: string,
  agent: string,
): Promise<SubagentBaseline | undefined> {
  const filePath = path.join(projectRoot, STATE_DIR, BASELINES_DIR, `${agent}.json`);
  if (!await fs.pathExists(filePath)) return undefined;
  try {
    return await fs.readJson(filePath);
  } catch {
    return undefined;
  }
}

export async function clearBaseline(projectRoot: string, agent: string): Promise<void> {
  const filePath = path.join(projectRoot, STATE_DIR, BASELINES_DIR, `${agent}.json`);
  try { await fs.remove(filePath); } catch { /* ok */ }
}

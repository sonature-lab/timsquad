/**
 * Session Notes — 컨텍스트 생존 메모
 * 매 Stop 이벤트마다 mechanical 스냅샷을 JSONL에 기록하고,
 * completion-guard.sh가 최신 엔트리를 systemMessage로 주입한다.
 */

import path from 'path';
import fs from 'fs-extra';
import { getTimestamp } from '../utils/date.js';
import type { SessionState } from './session-state.js';

const STATE_DIR = '.timsquad/.daemon';
const NOTES_FILE = 'session-notes.jsonl';

// 기본 컨텍스트 윈도우 크기 (200K, Sonnet 3.5 기준)
export const DEFAULT_CONTEXT_WINDOW = 200_000;

export interface SessionNote {
  timestamp: string;
  type: 'snapshot';
  turn: number;
  metrics: { tools: number; fails: number; subagents: number };
  contextPct: number;
  activeAgents: string[];
  recentFiles: string[];
}

/**
 * Stop 이벤트마다 스냅샷을 JSONL에 append
 */
export function appendSnapshot(
  projectRoot: string,
  state: SessionState,
  activeAgents: string[],
): void {
  const contextPct = state.lastTurnInput > 0
    ? Math.round((state.lastTurnInput / DEFAULT_CONTEXT_WINDOW) * 100)
    : 0;

  const note: SessionNote = {
    timestamp: getTimestamp(),
    type: 'snapshot',
    turn: state.turnCount,
    metrics: {
      tools: state.metrics.toolUses,
      fails: state.metrics.toolFailures,
      subagents: state.metrics.subagentCount,
    },
    contextPct,
    activeAgents,
    recentFiles: (state.recentFiles || []).slice(0, 10),
  };

  const filePath = path.join(projectRoot, STATE_DIR, NOTES_FILE);
  try {
    fs.ensureDirSync(path.dirname(filePath));
    fs.appendFileSync(filePath, JSON.stringify(note) + '\n');
  } catch { /* ignore */ }
}

/**
 * 최신 노트 1건 조회 (파일 마지막 줄)
 */
export function getLatestNote(projectRoot: string): SessionNote | null {
  const filePath = path.join(projectRoot, STATE_DIR, NOTES_FILE);
  try {
    if (!fs.pathExistsSync(filePath)) return null;
    const content = fs.readFileSync(filePath, 'utf-8').trim();
    if (!content) return null;
    const lines = content.split('\n');
    return JSON.parse(lines[lines.length - 1]) as SessionNote;
  } catch {
    return null;
  }
}

/**
 * systemMessage용 한 줄 요약 생성
 */
export function formatForSystemMessage(note: SessionNote): string {
  const parts: string[] = [`[Session] Turn ${note.turn}`];

  const { tools, fails } = note.metrics;
  parts.push(`Tools: ${tools}${fails > 0 ? ` (Fail: ${fails})` : ''}`);

  if (note.activeAgents.length > 0) {
    parts.push(`Active: ${note.activeAgents.join(', ')}`);
  }

  if (note.recentFiles.length > 0) {
    const files = note.recentFiles.slice(0, 5).map(f => path.basename(f));
    parts.push(`Files: ${files.join(', ')}`);
  }

  return parts.join(' | ');
}

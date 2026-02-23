import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import path from 'path';
import fs from 'fs-extra';
import os from 'os';
import { appendSnapshot, getLatestNote, formatForSystemMessage } from '../../src/daemon/session-notes.js';
import type { SessionNote } from '../../src/daemon/session-notes.js';
import type { SessionState } from '../../src/daemon/session-state.js';

function makeState(overrides: Partial<SessionState> = {}): SessionState {
  return {
    sessionShort: 'abc12345',
    sessionId: 'abc12345-full-session-id',
    sessionLogPath: '/tmp/test.jsonl',
    metrics: {
      toolUses: 10, toolFailures: 1, subagentCount: 2,
      tokenInput: 5000, tokenOutput: 3000,
      tokenCacheCreate: 0, tokenCacheRead: 0,
      bashCommands: 3, tsqCommands: 1,
    },
    startedAt: '2026-02-21T09:00:00.000Z',
    turnCount: 5,
    lastTurnInput: 50000,
    recentFiles: ['/project/src/api/auth.ts', '/project/tests/auth.test.ts'],
    recentTools: ['Edit', 'Bash', 'Read'],
    ...overrides,
  };
}

describe('session-notes', () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'tsq-notes-'));
    await fs.ensureDir(path.join(tmpDir, '.timsquad', '.daemon'));
  });

  afterEach(async () => {
    await fs.remove(tmpDir);
  });

  describe('appendSnapshot', () => {
    it('should create session-notes.jsonl if not exists', () => {
      const state = makeState();
      appendSnapshot(tmpDir, state, ['developer']);

      const filePath = path.join(tmpDir, '.timsquad', '.daemon', 'session-notes.jsonl');
      expect(fs.pathExistsSync(filePath)).toBe(true);
    });

    it('should write valid JSONL entry', () => {
      const state = makeState();
      appendSnapshot(tmpDir, state, ['developer', 'dba']);

      const filePath = path.join(tmpDir, '.timsquad', '.daemon', 'session-notes.jsonl');
      const content = fs.readFileSync(filePath, 'utf-8').trim();
      const note = JSON.parse(content) as SessionNote;

      expect(note.type).toBe('snapshot');
      expect(note.turn).toBe(5);
      expect(note.metrics.tools).toBe(10);
      expect(note.metrics.fails).toBe(1);
      expect(note.metrics.subagents).toBe(2);
      expect(note.activeAgents).toEqual(['developer', 'dba']);
      expect(note.recentFiles).toHaveLength(2);
      expect(note.timestamp).toBeDefined();
    });

    it('should append multiple entries', () => {
      const state1 = makeState({ turnCount: 1 });
      const state2 = makeState({ turnCount: 2 });
      appendSnapshot(tmpDir, state1, []);
      appendSnapshot(tmpDir, state2, ['developer']);

      const filePath = path.join(tmpDir, '.timsquad', '.daemon', 'session-notes.jsonl');
      const lines = fs.readFileSync(filePath, 'utf-8').trim().split('\n');
      expect(lines).toHaveLength(2);
      expect(JSON.parse(lines[0]).turn).toBe(1);
      expect(JSON.parse(lines[1]).turn).toBe(2);
    });

    it('should calculate contextPct from lastTurnInput', () => {
      const state = makeState({ lastTurnInput: 170000 }); // 85% of 200K
      appendSnapshot(tmpDir, state, []);

      const note = getLatestNote(tmpDir)!;
      expect(note.contextPct).toBe(85);
    });

    it('should set contextPct to 0 when no token data', () => {
      const state = makeState({ lastTurnInput: 0 });
      appendSnapshot(tmpDir, state, []);

      const note = getLatestNote(tmpDir)!;
      expect(note.contextPct).toBe(0);
    });

    it('should limit recentFiles to 10', () => {
      const manyFiles = Array.from({ length: 15 }, (_, i) => `/file${i}.ts`);
      const state = makeState({ recentFiles: manyFiles });
      appendSnapshot(tmpDir, state, []);

      const note = getLatestNote(tmpDir)!;
      expect(note.recentFiles.length).toBeLessThanOrEqual(10);
    });
  });

  describe('getLatestNote', () => {
    it('should return null when file does not exist', () => {
      expect(getLatestNote(tmpDir)).toBeNull();
    });

    it('should return null for empty file', () => {
      const filePath = path.join(tmpDir, '.timsquad', '.daemon', 'session-notes.jsonl');
      fs.writeFileSync(filePath, '');
      expect(getLatestNote(tmpDir)).toBeNull();
    });

    it('should return last entry', () => {
      const state1 = makeState({ turnCount: 3 });
      const state2 = makeState({ turnCount: 7 });
      appendSnapshot(tmpDir, state1, []);
      appendSnapshot(tmpDir, state2, ['architect']);

      const note = getLatestNote(tmpDir)!;
      expect(note.turn).toBe(7);
      expect(note.activeAgents).toEqual(['architect']);
    });

    it('should handle malformed last line gracefully', () => {
      const filePath = path.join(tmpDir, '.timsquad', '.daemon', 'session-notes.jsonl');
      fs.writeFileSync(filePath, '{"turn":1}\nnot valid json\n');
      // malformed last line (after trim the empty line is removed, so "not valid json" is last)
      expect(getLatestNote(tmpDir)).toBeNull();
    });
  });

  describe('formatForSystemMessage', () => {
    it('should format basic snapshot', () => {
      const note: SessionNote = {
        timestamp: '2026-02-21T09:30:00.000Z',
        type: 'snapshot',
        turn: 12,
        metrics: { tools: 34, fails: 0, subagents: 1 },
        contextPct: 45,
        activeAgents: [],
        recentFiles: [],
      };
      const result = formatForSystemMessage(note);
      expect(result).toContain('[Session] Turn 12');
      expect(result).toContain('Tools: 34');
      expect(result).not.toContain('Fail');
    });

    it('should include failure count when > 0', () => {
      const note: SessionNote = {
        timestamp: '2026-02-21T09:30:00.000Z',
        type: 'snapshot',
        turn: 5,
        metrics: { tools: 20, fails: 3, subagents: 0 },
        contextPct: 30,
        activeAgents: [],
        recentFiles: [],
      };
      const result = formatForSystemMessage(note);
      expect(result).toContain('Fail: 3');
    });

    it('should include active agents', () => {
      const note: SessionNote = {
        timestamp: '2026-02-21T09:30:00.000Z',
        type: 'snapshot',
        turn: 8,
        metrics: { tools: 15, fails: 0, subagents: 2 },
        contextPct: 50,
        activeAgents: ['developer', 'dba'],
        recentFiles: [],
      };
      const result = formatForSystemMessage(note);
      expect(result).toContain('Active: developer, dba');
    });

    it('should include file basenames (max 5)', () => {
      const note: SessionNote = {
        timestamp: '2026-02-21T09:30:00.000Z',
        type: 'snapshot',
        turn: 10,
        metrics: { tools: 25, fails: 0, subagents: 0 },
        contextPct: 60,
        activeAgents: [],
        recentFiles: [
          '/project/src/api/auth.ts',
          '/project/src/models/user.ts',
          '/project/tests/auth.test.ts',
          '/project/src/utils/hash.ts',
          '/project/src/routes/index.ts',
          '/project/src/extra/file.ts',
        ],
      };
      const result = formatForSystemMessage(note);
      expect(result).toContain('Files: auth.ts, user.ts, auth.test.ts, hash.ts, index.ts');
      expect(result).not.toContain('file.ts');
    });

    it('should omit sections when empty', () => {
      const note: SessionNote = {
        timestamp: '2026-02-21T09:30:00.000Z',
        type: 'snapshot',
        turn: 1,
        metrics: { tools: 0, fails: 0, subagents: 0 },
        contextPct: 0,
        activeAgents: [],
        recentFiles: [],
      };
      const result = formatForSystemMessage(note);
      expect(result).toBe('[Session] Turn 1 | Tools: 0');
      expect(result).not.toContain('Active');
      expect(result).not.toContain('Files');
    });
  });
});

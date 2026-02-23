import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import path from 'path';
import fs from 'fs-extra';
import os from 'os';
import { getCurrentPhase } from '../../src/lib/project.js';

describe('getCurrentPhase', () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'tsq-test-'));
    await fs.ensureDir(path.join(tmpDir, '.timsquad', 'state'));
  });

  afterEach(async () => {
    await fs.remove(tmpDir);
  });

  it('should return defaults when file does not exist', async () => {
    const result = await getCurrentPhase(tmpDir);
    expect(result.current).toBe('planning');
    expect(result.startedAt).toBeDefined();
    expect(result.progress).toBe(0);
  });

  it('should read new-format JSON (camelCase)', async () => {
    const data = {
      current: 'implementation',
      startedAt: '2026-01-15T10:00:00.000Z',
      progress: 50,
    };
    await fs.writeJson(
      path.join(tmpDir, '.timsquad', 'state', 'current-phase.json'),
      data,
      { spaces: 2 },
    );

    const result = await getCurrentPhase(tmpDir);
    expect(result.current).toBe('implementation');
    expect(result.startedAt).toBe('2026-01-15T10:00:00.000Z');
    expect(result.progress).toBe(50);
  });

  it('should normalize legacy-format JSON (snake_case)', async () => {
    const data = {
      current_phase: 'review',
      entered_at: '2025-12-01T08:00:00.000Z',
      transition_history: [],
    };
    await fs.writeJson(
      path.join(tmpDir, '.timsquad', 'state', 'current-phase.json'),
      data,
      { spaces: 2 },
    );

    const result = await getCurrentPhase(tmpDir);
    expect(result.current).toBe('review');
    expect(result.startedAt).toBe('2025-12-01T08:00:00.000Z');
    expect(result.progress).toBe(0);
  });

  it('should handle empty JSON object gracefully', async () => {
    await fs.writeJson(
      path.join(tmpDir, '.timsquad', 'state', 'current-phase.json'),
      {},
      { spaces: 2 },
    );

    const result = await getCurrentPhase(tmpDir);
    expect(result.current).toBeTruthy(); // 'planning' fallback
    expect(result.startedAt).toBeDefined();
    expect(result.progress).toBe(0);
  });

  it('should handle non-ISO startedAt value', async () => {
    await fs.writeJson(
      path.join(tmpDir, '.timsquad', 'state', 'current-phase.json'),
      { current: 'design', startedAt: 12345, progress: 10 },
      { spaces: 2 },
    );

    const result = await getCurrentPhase(tmpDir);
    expect(result.current).toBe('design');
    expect(result.startedAt).toContain('T'); // must be valid ISO format
    expect(result.progress).toBe(10);
  });

  it('should handle null startedAt value', async () => {
    await fs.writeJson(
      path.join(tmpDir, '.timsquad', 'state', 'current-phase.json'),
      { current: 'review', startedAt: null, progress: 0 },
      { spaces: 2 },
    );

    const result = await getCurrentPhase(tmpDir);
    expect(result.current).toBe('review');
    expect(result.startedAt).toContain('T');
    expect(result.progress).toBe(0);
  });

  it('should handle malformed JSON gracefully', async () => {
    await fs.writeFile(
      path.join(tmpDir, '.timsquad', 'state', 'current-phase.json'),
      'not valid json!!!',
    );

    const result = await getCurrentPhase(tmpDir);
    expect(result.current).toBe('planning');
    expect(result.startedAt).toBeDefined();
    expect(result.progress).toBe(0);
  });
});

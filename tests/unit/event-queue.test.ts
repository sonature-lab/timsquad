import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import path from 'path';
import fs from 'fs-extra';
import os from 'os';
import { EventQueue } from '../../src/daemon/event-queue.js';

describe('EventQueue - SSOT Drift Detection', () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = path.join(os.tmpdir(), `tsq-eq-test-${Date.now()}`);
    await fs.ensureDir(path.join(tmpDir, '.timsquad', 'ssot'));
    await fs.ensureDir(path.join(tmpDir, '.timsquad', '.daemon'));
    await fs.ensureDir(path.join(tmpDir, '.timsquad', 'logs', 'tasks'));
    await fs.ensureDir(path.join(tmpDir, '.timsquad', 'state'));
  });

  afterEach(async () => {
    await fs.remove(tmpDir);
  });

  it('should detect SSOT documents older than 7 days', async () => {
    // Create an old SSOT doc (10 days ago)
    const oldDoc = path.join(tmpDir, '.timsquad', 'ssot', 'prd.md');
    await fs.writeFile(oldDoc, '# PRD\nSome content');
    const tenDaysAgo = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000);
    await fs.utimes(oldDoc, tenDaysAgo, tenDaysAgo);

    // Create a recent SSOT doc
    const recentDoc = path.join(tmpDir, '.timsquad', 'ssot', 'requirements.md');
    await fs.writeFile(recentDoc, '# Requirements\nRecent');

    const eq = new EventQueue(tmpDir, 'test123');

    // Trigger source-changed which calls checkSSOTDrift
    eq.enqueue({ type: 'source-changed', paths: ['src/foo.ts'] });

    // Wait for async processing
    await new Promise(resolve => setTimeout(resolve, 200));

    const driftPath = path.join(tmpDir, '.timsquad', '.daemon', 'drift-warnings.json');
    expect(await fs.pathExists(driftPath)).toBe(true);

    const drift = await fs.readJson(driftPath);
    expect(drift.warnings).toHaveLength(1);
    expect(drift.warnings[0].doc).toBe('prd.md');
    expect(drift.warnings[0].daysAgo).toBeGreaterThanOrEqual(10);
  });

  it('should not create drift file when all docs are recent', async () => {
    const doc = path.join(tmpDir, '.timsquad', 'ssot', 'prd.md');
    await fs.writeFile(doc, '# PRD\nFresh content');

    const eq = new EventQueue(tmpDir, 'test123');
    eq.enqueue({ type: 'source-changed', paths: ['src/bar.ts'] });

    await new Promise(resolve => setTimeout(resolve, 200));

    const driftPath = path.join(tmpDir, '.timsquad', '.daemon', 'drift-warnings.json');
    expect(await fs.pathExists(driftPath)).toBe(false);
  });

  it('should remove drift file when drift is resolved', async () => {
    // Pre-create a drift file
    const driftPath = path.join(tmpDir, '.timsquad', '.daemon', 'drift-warnings.json');
    await fs.writeJson(driftPath, { warnings: [{ doc: 'old.md' }] });

    // Only recent docs exist
    const doc = path.join(tmpDir, '.timsquad', 'ssot', 'prd.md');
    await fs.writeFile(doc, '# PRD');

    const eq = new EventQueue(tmpDir, 'test123');
    eq.enqueue({ type: 'source-changed', paths: ['src/baz.ts'] });

    await new Promise(resolve => setTimeout(resolve, 200));

    expect(await fs.pathExists(driftPath)).toBe(false);
  });
});

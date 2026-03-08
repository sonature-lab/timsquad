/**
 * File Watcher
 * 소스 코드 변경 → meta-index update (source-changed)
 * SSOT 문서 변경 → 자동 compile (ssot-changed)
 * chokidar 기반, 경로별 debounce 분리.
 */

import path from 'path';
import chokidar from 'chokidar';
import type { EventQueue } from './event-queue.js';

const SOURCE_PATTERNS = [
  'src/**/*.{ts,tsx,js,jsx}',
  'lib/**/*.{ts,tsx,js,jsx}',
  'app/**/*.{ts,tsx,js,jsx}',
  'pages/**/*.{ts,tsx,js,jsx}',
  'components/**/*.{ts,tsx,js,jsx}',
];

const SSOT_PATTERNS = [
  '.timsquad/ssot/**/*.md',
];

const SOURCE_IGNORE = [
  '**/node_modules/**',
  '**/dist/**',
  '**/build/**',
  '**/.next/**',
  '**/coverage/**',
  '**/*.test.*',
  '**/*.spec.*',
  '**/__tests__/**',
  '**/*.d.ts',
];

const SOURCE_DEBOUNCE_MS = 5000;
const SSOT_DEBOUNCE_MS = 2000;

export class FileWatcher {
  private sourceWatcher: chokidar.FSWatcher | null = null;
  private ssotWatcher: chokidar.FSWatcher | null = null;
  private sourceTimer: NodeJS.Timeout | null = null;
  private ssotTimer: NodeJS.Timeout | null = null;
  private pendingSourcePaths: Set<string> = new Set();
  private pendingSSOTPaths: Set<string> = new Set();
  private projectRoot: string;
  private eventQueue: EventQueue;

  constructor(projectRoot: string, eventQueue: EventQueue) {
    this.projectRoot = projectRoot;
    this.eventQueue = eventQueue;
  }

  start(): void {
    // Source code watcher
    const sourcePaths = SOURCE_PATTERNS.map(p => path.join(this.projectRoot, p));
    this.sourceWatcher = chokidar.watch(sourcePaths, {
      persistent: true,
      ignoreInitial: true,
      ignored: SOURCE_IGNORE,
      awaitWriteFinish: { stabilityThreshold: 500, pollInterval: 100 },
    });

    const onSourceChange = (filePath: string) => {
      const rel = path.relative(this.projectRoot, filePath);
      this.pendingSourcePaths.add(rel);
      this.scheduleSourceBatch();
    };

    this.sourceWatcher.on('change', onSourceChange);
    this.sourceWatcher.on('add', onSourceChange);
    this.sourceWatcher.on('unlink', onSourceChange);

    // SSOT watcher
    const ssotPaths = SSOT_PATTERNS.map(p => path.join(this.projectRoot, p));
    this.ssotWatcher = chokidar.watch(ssotPaths, {
      persistent: true,
      ignoreInitial: true,
      awaitWriteFinish: { stabilityThreshold: 500, pollInterval: 100 },
    });

    const onSSOTChange = (filePath: string) => {
      const rel = path.relative(this.projectRoot, filePath);
      this.pendingSSOTPaths.add(rel);
      this.scheduleSSOTBatch();
    };

    this.ssotWatcher.on('change', onSSOTChange);
    this.ssotWatcher.on('add', onSSOTChange);
  }

  async stop(): Promise<void> {
    if (this.pendingSourcePaths.size > 0) this.flushSourceBatch();
    if (this.pendingSSOTPaths.size > 0) this.flushSSOTBatch();

    if (this.sourceTimer) { clearTimeout(this.sourceTimer); this.sourceTimer = null; }
    if (this.ssotTimer) { clearTimeout(this.ssotTimer); this.ssotTimer = null; }

    if (this.sourceWatcher) { await this.sourceWatcher.close(); this.sourceWatcher = null; }
    if (this.ssotWatcher) { await this.ssotWatcher.close(); this.ssotWatcher = null; }
  }

  private scheduleSourceBatch(): void {
    if (this.sourceTimer) clearTimeout(this.sourceTimer);
    this.sourceTimer = setTimeout(() => this.flushSourceBatch(), SOURCE_DEBOUNCE_MS);
  }

  private scheduleSSOTBatch(): void {
    if (this.ssotTimer) clearTimeout(this.ssotTimer);
    this.ssotTimer = setTimeout(() => this.flushSSOTBatch(), SSOT_DEBOUNCE_MS);
  }

  private flushSourceBatch(): void {
    if (this.pendingSourcePaths.size === 0) return;
    const paths = Array.from(this.pendingSourcePaths);
    this.pendingSourcePaths.clear();
    this.eventQueue.enqueue({ type: 'source-changed', paths });
  }

  private flushSSOTBatch(): void {
    if (this.pendingSSOTPaths.size === 0) return;
    const paths = Array.from(this.pendingSSOTPaths);
    this.pendingSSOTPaths.clear();
    this.eventQueue.enqueue({ type: 'ssot-changed', paths });
  }
}

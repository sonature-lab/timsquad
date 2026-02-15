/**
 * Source File Watcher
 * 소스 코드 변경을 감지하여 메타인덱스 incremental update를 트리거.
 * chokidar 기반, debounce 5초.
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

const IGNORE_PATTERNS = [
  '**/node_modules/**',
  '**/dist/**',
  '**/build/**',
  '**/.next/**',
  '**/coverage/**',
  '**/*.test.*',
  '**/*.spec.*',
  '**/__tests__/**',
  '**/*.d.ts',
  '**/.timsquad/**',
  '**/.claude/**',
];

const DEBOUNCE_MS = 5000;

export class FileWatcher {
  private watcher: chokidar.FSWatcher | null = null;
  private debounceTimer: NodeJS.Timeout | null = null;
  private pendingPaths: Set<string> = new Set();
  private projectRoot: string;
  private eventQueue: EventQueue;

  constructor(projectRoot: string, eventQueue: EventQueue) {
    this.projectRoot = projectRoot;
    this.eventQueue = eventQueue;
  }

  start(): void {
    const watchPaths = SOURCE_PATTERNS.map(p => path.join(this.projectRoot, p));

    this.watcher = chokidar.watch(watchPaths, {
      persistent: true,
      ignoreInitial: true,
      ignored: IGNORE_PATTERNS,
      awaitWriteFinish: {
        stabilityThreshold: 500,
        pollInterval: 100,
      },
    });

    const onChange = (filePath: string) => {
      const rel = path.relative(this.projectRoot, filePath);
      this.pendingPaths.add(rel);
      this.scheduleBatch();
    };

    this.watcher.on('change', onChange);
    this.watcher.on('add', onChange);
    this.watcher.on('unlink', onChange);
  }

  async stop(): Promise<void> {
    // 남은 pending 처리
    if (this.pendingPaths.size > 0) {
      this.flushBatch();
    }
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }
    if (this.watcher) {
      await this.watcher.close();
      this.watcher = null;
    }
  }

  private scheduleBatch(): void {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }
    this.debounceTimer = setTimeout(() => this.flushBatch(), DEBOUNCE_MS);
  }

  private flushBatch(): void {
    if (this.pendingPaths.size === 0) return;
    const paths = Array.from(this.pendingPaths);
    this.pendingPaths.clear();
    this.eventQueue.enqueue({ type: 'source-changed', paths });
  }
}

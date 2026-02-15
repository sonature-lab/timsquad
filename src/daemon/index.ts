/**
 * TimSquad Daemon
 * 백그라운드 프로세스로 실행되며 자동화 파이프라인을 관리한다.
 * - JSONL 스트림 감시 (SubagentStart/Stop, SessionEnd 감지)
 * - 소스 파일 변경 감시 (메타인덱스 갱신)
 * - 이벤트 큐 (task → sequence → phase 연쇄)
 * - 인메모리 메타인덱스 + IPC 쿼리
 */

import path from 'path';
import fs from 'fs-extra';
import { simpleGit } from 'simple-git';
import { JsonlWatcher } from './jsonl-watcher.js';
import { EventQueue } from './event-queue.js';
import { FileWatcher } from './file-watcher.js';
import { MetaCache } from './meta-cache.js';
import { clearContext } from './context-writer.js';
import { generateWorklog, updateMetrics, cleanupDaemonFiles } from './shutdown.js';

const PID_FILE = '.timsquad/.daemon.pid';
const LOG_FILE = '.timsquad/.daemon.log';

export interface DaemonOptions {
  jsonlPath: string;
  projectRoot: string;
}

function getPidPath(projectRoot: string): string {
  return path.join(projectRoot, PID_FILE);
}

function getLogPath(projectRoot: string): string {
  return path.join(projectRoot, LOG_FILE);
}

/**
 * 데몬 프로세스 메인 (fork된 자식에서 실행)
 */
export async function runDaemon(options: DaemonOptions): Promise<void> {
  const { jsonlPath, projectRoot } = options;

  // PID 파일 생성
  const pidPath = getPidPath(projectRoot);
  await fs.ensureDir(path.dirname(pidPath));
  await fs.writeFile(pidPath, String(process.pid));

  // 로그 파일
  const logPath = getLogPath(projectRoot);
  const log = (msg: string) => {
    const ts = new Date().toISOString();
    fs.appendFileSync(logPath, `[${ts}] ${msg}\n`);
  };

  log(`Daemon started (PID: ${process.pid})`);
  log(`JSONL: ${jsonlPath}`);
  log(`Project: ${projectRoot}`);

  // Git 사용 가능 여부 확인
  try {
    const git = simpleGit(projectRoot);
    await git.revparse(['--git-dir']);
  } catch {
    log('WARNING: git not available — mechanical.files in task logs will be empty');
  }

  // 1. 이벤트 큐
  const eventQueue = new EventQueue(projectRoot, 'unknown');

  // 2. JSONL 워처
  const jsonlWatcher = new JsonlWatcher(jsonlPath, projectRoot);

  // 3. 파일 워처
  const fileWatcher = new FileWatcher(projectRoot, eventQueue);

  // 4. 메타 캐시
  const metaCache = new MetaCache(projectRoot);

  // 메타인덱스 로드
  try {
    await metaCache.load();
    log(`Meta cache loaded: ${metaCache.totalFiles} files, ${metaCache.totalMethods} methods`);
  } catch (err) {
    log(`Meta cache load failed: ${(err as Error).message}`);
  }

  // IPC 서버 시작
  metaCache.startIPC();
  log('IPC server started');

  // 소스 변경 → 메타 캐시 갱신
  eventQueue.onSourceChanged = (paths: string[]) => {
    metaCache.updateFiles(paths);
    log(`Source changed: ${paths.join(', ')}`);
  };

  // SubagentStart → baseline 기록 (git HEAD)
  jsonlWatcher.on('subagent-start', async (data: { agent: string }) => {
    const baseline = jsonlWatcher.getBaseline(data.agent);
    if (baseline) {
      try {
        const git = simpleGit(projectRoot);
        const head = await git.revparse(['HEAD']);
        baseline.gitHead = head.trim();
      } catch {
        // git 실패 무시
      }
    }
    eventQueue.updateSessionShort(jsonlWatcher.getSessionShort());
    log(`SubagentStart: ${data.agent}`);
  });

  // SubagentStop → task-complete 큐잉
  jsonlWatcher.on('subagent-stop', (data: { agent: string; timestamp: string; baseline?: unknown }) => {
    eventQueue.updateSessionShort(jsonlWatcher.getSessionShort());
    eventQueue.enqueue({
      type: 'task-complete',
      agent: data.agent,
      timestamp: data.timestamp,
      baseline: data.baseline as undefined,
    });
    log(`SubagentStop: ${data.agent} → task-complete queued`);
  });

  // SessionEnd → shutdown
  jsonlWatcher.on('session-end', () => {
    log('SessionEnd detected');
    eventQueue.enqueue({ type: 'session-end' });
  });

  // Shutdown 핸들러
  eventQueue.onShutdown = async () => {
    log('Shutdown sequence starting...');

    // 1. worklog 생성
    await generateWorklog(
      projectRoot,
      jsonlWatcher.getSessionLogPath(),
      jsonlWatcher.getSessionShort(),
    );
    log('Worklog generated');

    // 2. 메트릭 갱신
    await updateMetrics(projectRoot, jsonlWatcher.metrics, jsonlWatcher.getSessionShort());
    log('Metrics updated');

    // 3. 메타 캐시 디스크 flush
    await metaCache.flushToDisk();
    log('Meta cache flushed');

    // 4. 정리
    await fileWatcher.stop();
    await jsonlWatcher.stop();
    metaCache.stopIPC();
    await clearContext(projectRoot);
    await cleanupDaemonFiles(projectRoot);

    log('Daemon stopped gracefully');
    process.exit(0);
  };

  // SIGTERM/SIGINT 핸들러
  const gracefulStop = async () => {
    log('Signal received, shutting down...');
    if (eventQueue.onShutdown) {
      await eventQueue.onShutdown();
    }
  };

  process.on('SIGTERM', gracefulStop);
  process.on('SIGINT', gracefulStop);

  // 워처 시작
  await jsonlWatcher.start();
  fileWatcher.start();
  log('All watchers started');
}

/**
 * 좀비 프로세스 정리
 */
export async function killZombie(projectRoot: string): Promise<boolean> {
  const pidPath = getPidPath(projectRoot);
  if (!await fs.pathExists(pidPath)) return false;

  try {
    const pid = parseInt(await fs.readFile(pidPath, 'utf-8'), 10);
    if (isNaN(pid)) {
      await fs.remove(pidPath);
      return false;
    }

    // 프로세스 존재 확인
    try {
      process.kill(pid, 0); // signal 0 = 존재 확인만
      // 살아있으면 kill
      process.kill(pid, 'SIGTERM');
      // 정리 시간
      await new Promise(r => setTimeout(r, 1000));
    } catch {
      // 이미 죽은 프로세스
    }

    await fs.remove(pidPath);
    // 소켓도 정리
    const sockPath = path.join(projectRoot, '.timsquad', '.daemon.sock');
    try { await fs.remove(sockPath); } catch { /* ok */ }

    return true;
  } catch {
    return false;
  }
}

/**
 * 데몬 실행 중인지 확인
 */
export async function isDaemonRunning(projectRoot: string): Promise<{ running: boolean; pid?: number }> {
  const pidPath = getPidPath(projectRoot);
  if (!await fs.pathExists(pidPath)) return { running: false };

  try {
    const pid = parseInt(await fs.readFile(pidPath, 'utf-8'), 10);
    if (isNaN(pid)) return { running: false };

    // 프로세스 존재 확인
    process.kill(pid, 0);
    return { running: true, pid };
  } catch {
    // 프로세스 없음 — 좀비 PID 정리
    try { await fs.remove(pidPath); } catch { /* ok */ }
    return { running: false };
  }
}

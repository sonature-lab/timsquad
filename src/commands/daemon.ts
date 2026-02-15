/**
 * tsq daemon start/stop/status
 * 데몬 프로세스 관리 CLI.
 */

import { Command } from 'commander';
import path from 'path';
import { fork } from 'child_process';
import { colors, printHeader, printError, printSuccess, printKeyValue } from '../utils/colors.js';
import { findProjectRoot } from '../lib/project.js';
import { isDaemonRunning, killZombie } from '../daemon/index.js';
import { queryDaemon } from '../daemon/meta-cache.js';

export function registerDaemonCommand(program: Command): void {
  const cmd = program
    .command('daemon')
    .description('Background daemon process management');

  // tsq daemon start
  cmd
    .command('start')
    .description('Start background daemon')
    .option('--jsonl <path>', 'JSONL transcript path (usually auto-detected)')
    .action(async (options: { jsonl?: string }) => {
      try {
        await startDaemon(options);
      } catch (error) {
        printError((error as Error).message);
        process.exit(1);
      }
    });

  // tsq daemon stop
  cmd
    .command('stop')
    .description('Stop background daemon')
    .action(async () => {
      try {
        await stopDaemon();
      } catch (error) {
        printError((error as Error).message);
        process.exit(1);
      }
    });

  // tsq daemon status
  cmd
    .command('status')
    .description('Show daemon status')
    .action(async () => {
      try {
        await showStatus();
      } catch (error) {
        printError((error as Error).message);
        process.exit(1);
      }
    });
}

async function startDaemon(options: { jsonl?: string }): Promise<void> {
  const projectRoot = await findProjectRoot();
  if (!projectRoot) throw new Error('Not a TimSquad project');

  // 이미 실행 중인지 확인
  const status = await isDaemonRunning(projectRoot);
  if (status.running) {
    printSuccess(`Daemon already running (PID: ${status.pid})`);
    return;
  }

  // 좀비 정리
  await killZombie(projectRoot);

  const jsonlPath = options.jsonl || process.env.CLAUDE_TRANSCRIPT_PATH || '';
  if (!jsonlPath) {
    throw new Error('JSONL path required. Use --jsonl or set CLAUDE_TRANSCRIPT_PATH.');
  }

  // fork로 데몬 프로세스 시작
  const daemonEntry = path.join(path.dirname(new URL(import.meta.url).pathname), '..', 'daemon', 'entry.js');
  const child = fork(daemonEntry, [], {
    detached: true,
    stdio: 'ignore',
    env: {
      ...process.env,
      TSQ_DAEMON_JSONL: jsonlPath,
      TSQ_DAEMON_PROJECT: projectRoot,
    },
  });

  child.unref();
  printSuccess(`Daemon started (PID: ${child.pid})`);
}

async function stopDaemon(): Promise<void> {
  const projectRoot = await findProjectRoot();
  if (!projectRoot) throw new Error('Not a TimSquad project');

  const status = await isDaemonRunning(projectRoot);
  if (!status.running) {
    console.log(colors.dim('  Daemon not running'));
    // 좀비 정리만 수행
    await killZombie(projectRoot);
    return;
  }

  // SIGTERM 전송
  try {
    process.kill(status.pid!, 'SIGTERM');
    printSuccess(`Daemon stopped (PID: ${status.pid})`);
  } catch {
    // 이미 종료된 경우
    await killZombie(projectRoot);
    printSuccess('Daemon stopped');
  }
}

async function showStatus(): Promise<void> {
  const projectRoot = await findProjectRoot();
  if (!projectRoot) throw new Error('Not a TimSquad project');

  const status = await isDaemonRunning(projectRoot);

  printHeader('Daemon Status');

  if (!status.running) {
    console.log(colors.dim('  Not running'));
    return;
  }

  printKeyValue('  PID', String(status.pid));
  printKeyValue('  Status', colors.success('running'));

  // IPC로 상세 정보 조회
  try {
    const info = await queryDaemon(projectRoot, 'status') as {
      loadedAt?: string;
      totalFiles?: number;
      totalMethods?: number;
      modules?: string[];
    };

    if (info.loadedAt) {
      printKeyValue('  Index Loaded', info.loadedAt);
    }
    if (info.totalFiles !== undefined) {
      printKeyValue('  Indexed Files', String(info.totalFiles));
    }
    if (info.totalMethods !== undefined) {
      printKeyValue('  Indexed Methods', String(info.totalMethods));
    }
    if (info.modules?.length) {
      printKeyValue('  Modules', info.modules.join(', '));
    }
  } catch {
    console.log(colors.dim('  (IPC not available)'));
  }
}

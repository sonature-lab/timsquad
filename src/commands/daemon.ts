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
import { loadSessionState } from '../daemon/session-state.js';
import { loadWorkflowState } from '../lib/workflow-state.js';

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

  // tsq daemon notify <event>
  const notify = cmd
    .command('notify')
    .description('Send event notification to running daemon (called by hooks)');

  notify
    .command('subagent-start')
    .description('Notify daemon of subagent start')
    .option('--agent <type>', 'Subagent type')
    .action(async (options: { agent?: string }) => {
      await notifyDaemon('subagent-start', options);
    });

  notify
    .command('subagent-stop')
    .description('Notify daemon of subagent stop')
    .option('--agent <type>', 'Subagent type')
    .action(async (options: { agent?: string }) => {
      await notifyDaemon('subagent-stop', options);
    });

  notify
    .command('tool-use')
    .description('Notify daemon of tool use')
    .option('--tool <name>', 'Tool name')
    .option('--status <status>', 'success or failure', 'success')
    .action(async (options: { tool?: string; status: string }) => {
      await notifyDaemon('tool-use', options);
    });

  notify
    .command('stop')
    .description('Notify daemon of session stop (token usage)')
    .action(async () => {
      await notifyDaemon('stop', {});
    });

  notify
    .command('session-end')
    .description('Notify daemon of session end')
    .action(async () => {
      await notifyDaemon('session-end', {});
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

  // fork로 데몬 프로세스 시작
  const daemonEntry = path.join(path.dirname(new URL(import.meta.url).pathname), '..', 'daemon', 'entry.js');
  const child = fork(daemonEntry, [], {
    detached: true,
    stdio: 'ignore',
    env: {
      ...process.env,
      ...(jsonlPath ? { TSQ_DAEMON_JSONL: jsonlPath } : {}),
      TSQ_DAEMON_PROJECT: projectRoot,
    },
  });

  child.unref();
  printSuccess(`Daemon started (PID: ${child.pid})${jsonlPath ? '' : ' [lite mode]'}`);
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

async function notifyDaemon(event: string, params: Record<string, unknown>): Promise<void> {
  try {
    const projectRoot = await findProjectRoot();
    if (!projectRoot) return;

    // stdin에서 훅 컨텍스트 읽기 (non-blocking)
    const stdinData = await readStdinWithTimeout(200);
    let hookContext: Record<string, unknown> = {};
    if (stdinData) {
      try {
        hookContext = JSON.parse(stdinData);
      } catch { /* non-JSON stdin — ignore */ }
    }

    // stdin 컨텍스트에서 기본값 추출 (CLI 옵션이 우선)
    const toolInput = (hookContext.tool_input || {}) as Record<string, unknown>;
    const merged = {
      ...hookContext,
      event,
      agent: params.agent || toolInput.subagent_type || hookContext.subagent_type || 'unknown',
      tool: params.tool || hookContext.tool_name || 'unknown',
      status: params.status || 'success',
      session_id: hookContext.session_id || 'unknown',
      usage: hookContext.usage,
    };

    await queryDaemon(projectRoot, 'notify', merged);
  } catch {
    // 훅은 절대 실패하면 안 됨 — 무조건 exit 0
  }
}

function readStdinWithTimeout(timeoutMs: number): Promise<string> {
  return new Promise((resolve) => {
    if (process.stdin.isTTY) {
      resolve('');
      return;
    }
    let data = '';
    const timer = setTimeout(() => {
      process.stdin.removeAllListeners();
      process.stdin.pause();
      resolve(data);
    }, timeoutMs);
    process.stdin.setEncoding('utf-8');
    process.stdin.on('data', (chunk: string) => { data += chunk; });
    process.stdin.on('end', () => {
      clearTimeout(timer);
      resolve(data);
    });
    process.stdin.resume();
  });
}

async function showStatus(): Promise<void> {
  const projectRoot = await findProjectRoot();
  if (!projectRoot) throw new Error('Not a TimSquad project');

  const status = await isDaemonRunning(projectRoot);

  printHeader('Daemon Status');

  if (!status.running) {
    console.log(colors.dim('  Not running'));

    // Still show session state if available
    const session = await loadSessionState(projectRoot);
    if (session) {
      console.log(colors.subheader('\n  Last Session'));
      printKeyValue('  Session', session.sessionShort);
      printKeyValue('  Started', session.startedAt);
      printKeyValue('  Turns', String(session.turnCount));
    }
    return;
  }

  printKeyValue('  PID', String(status.pid));
  printKeyValue('  Status', colors.success('running'));

  // Session state (file-based — always available)
  const session = await loadSessionState(projectRoot);
  if (session) {
    const uptimeMs = Date.now() - new Date(session.startedAt).getTime();
    const uptimeMin = Math.floor(uptimeMs / 60000);
    const uptimeSec = Math.floor((uptimeMs % 60000) / 1000);
    printKeyValue('  Uptime', `${uptimeMin}m ${uptimeSec}s`);
    printKeyValue('  Session', session.sessionShort);

    console.log(colors.subheader('\n  Session Metrics'));
    printKeyValue('  Turns', String(session.turnCount));
    printKeyValue('  Tool Uses', String(session.metrics.toolUses));
    if (session.metrics.toolFailures > 0) {
      printKeyValue('  Tool Failures', colors.error(String(session.metrics.toolFailures)));
    }
    printKeyValue('  Subagents', String(session.metrics.subagentCount));
    printKeyValue('  Bash Commands', String(session.metrics.bashCommands));
    printKeyValue('  TSQ Commands', String(session.metrics.tsqCommands));

    if (session.metrics.tokenDataReceived) {
      console.log(colors.subheader('\n  Token Usage'));
      printKeyValue('  Input', session.metrics.tokenInput.toLocaleString());
      printKeyValue('  Output', session.metrics.tokenOutput.toLocaleString());
      printKeyValue('  Cache Create', session.metrics.tokenCacheCreate.toLocaleString());
      printKeyValue('  Cache Read', session.metrics.tokenCacheRead.toLocaleString());
    }
  }

  // Automation toggles
  try {
    const wfState = await loadWorkflowState(projectRoot);
    console.log(colors.subheader('\n  Automation'));
    for (const [key, val] of Object.entries(wfState.automation)) {
      const icon = val ? colors.success('ON') : colors.dim('OFF');
      console.log(`    ${key.padEnd(16)} ${icon}`);
    }
  } catch { /* skip */ }

  // IPC로 메타인덱스 정보 조회
  try {
    const info = await queryDaemon(projectRoot, 'status') as {
      loadedAt?: string;
      totalFiles?: number;
      totalMethods?: number;
      modules?: string[];
      mode?: string;
    };

    console.log(colors.subheader('\n  Meta Index'));
    if (info.mode) {
      printKeyValue('  Mode', info.mode);
    }
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
    console.log(colors.dim('\n  (IPC not available — meta index info unavailable)'));
  }
}

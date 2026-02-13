import { Command } from 'commander';
import path from 'path';
import fs from 'fs-extra';
import { colors, printHeader, printError, printKeyValue } from '../utils/colors.js';
import { findProjectRoot } from '../lib/project.js';
import { exists, readFile, listFiles } from '../utils/fs.js';
import { getDateString } from '../utils/date.js';

interface SessionEvent {
  timestamp: string;
  event: string;
  session: string;
  tool?: string;
  status?: string;
  detail?: Record<string, unknown>;
  source?: string;
  cwd?: string;
  usage?: Record<string, number>;
  cumulative?: Record<string, number>;
  total_usage?: Record<string, number>;
}

export function registerSessionCommand(program: Command): void {
  const sessionCmd = program
    .command('session')
    .description('View Claude session event logs');

  // tsq session list
  sessionCmd
    .command('list')
    .description('List session log files')
    .option('-n <count>', 'Number of files to show', '10')
    .action(async (options: { n: string }) => {
      try {
        await listSessions(parseInt(options.n, 10));
      } catch (error) {
        printError((error as Error).message);
        process.exit(1);
      }
    });

  // tsq session view [file]
  sessionCmd
    .command('view [file]')
    .description('View session events (default: today)')
    .option('--tool <name>', 'Filter by tool name')
    .option('--event <type>', 'Filter by event type')
    .option('-n <count>', 'Last N events', '50')
    .action(async (file: string | undefined, options: { tool?: string; event?: string; n: string }) => {
      try {
        await viewSession(file, options);
      } catch (error) {
        printError((error as Error).message);
        process.exit(1);
      }
    });

  // tsq session summary [file]
  sessionCmd
    .command('summary [file]')
    .description('Show session summary (default: today)')
    .action(async (file?: string) => {
      try {
        await showSummary(file);
      } catch (error) {
        printError((error as Error).message);
        process.exit(1);
      }
    });
}

function getSessionsDir(projectRoot: string): string {
  return path.join(projectRoot, '.timsquad', 'logs', 'sessions');
}

async function loadEvents(filePath: string): Promise<SessionEvent[]> {
  const content = await readFile(filePath);
  const events: SessionEvent[] = [];

  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    try {
      events.push(JSON.parse(trimmed));
    } catch {
      // skip malformed lines
    }
  }

  return events;
}

async function resolveLogFile(projectRoot: string, file?: string): Promise<string | null> {
  const sessionsDir = getSessionsDir(projectRoot);

  if (file) {
    const fullPath = file.includes('/') ? file : path.join(sessionsDir, file);
    if (await exists(fullPath)) return fullPath;
    // try adding .jsonl
    if (await exists(fullPath + '.jsonl')) return fullPath + '.jsonl';
    return null;
  }

  // Default: today's files
  const today = getDateString();
  const files = await listFiles(`${today}-*.jsonl`, sessionsDir);

  if (files.length === 0) return null;
  // Return the most recent (last modified)
  return path.join(sessionsDir, files[files.length - 1]);
}

// ============================================================
// List sessions
// ============================================================

async function listSessions(count: number): Promise<void> {
  const projectRoot = await findProjectRoot();
  if (!projectRoot) throw new Error('Not a TimSquad project');

  const sessionsDir = getSessionsDir(projectRoot);
  if (!await exists(sessionsDir)) {
    console.log(colors.dim('\nNo session logs yet.'));
    console.log(colors.dim('Session events are recorded automatically via Claude Code hooks.'));
    return;
  }

  const files = await listFiles('*.jsonl', sessionsDir);
  files.sort().reverse();

  printHeader('Session Logs');

  if (files.length === 0) {
    console.log(colors.dim('  No session log files found.'));
    return;
  }

  for (const file of files.slice(0, count)) {
    const filePath = path.join(sessionsDir, file);
    const stat = await fs.stat(filePath);
    const events = await loadEvents(filePath);
    const toolEvents = events.filter(e => e.event === 'PostToolUse');

    const dateStr = file.split('-').slice(0, 3).join('-');
    const sessionId = file.replace(/\.jsonl$/, '').split('-').slice(3).join('-');

    console.log(`  ${colors.primary(dateStr)} ${colors.dim(sessionId)} ${colors.dim(`(${events.length} events, ${toolEvents.length} tools, ${formatBytes(stat.size)})`)}`);
  }

  console.log('');
  console.log(colors.dim(`  Total: ${files.length} session logs`));
}

// ============================================================
// View session events
// ============================================================

async function viewSession(
  file: string | undefined,
  options: { tool?: string; event?: string; n: string }
): Promise<void> {
  const projectRoot = await findProjectRoot();
  if (!projectRoot) throw new Error('Not a TimSquad project');

  const logFile = await resolveLogFile(projectRoot, file);
  if (!logFile) {
    console.log(colors.dim('\nNo session log found for today.'));
    console.log(colors.dim('Tip: tsq session list'));
    return;
  }

  let events = await loadEvents(logFile);

  // Filter
  if (options.tool) {
    events = events.filter(e => e.tool?.toLowerCase().includes(options.tool!.toLowerCase()));
  }
  if (options.event) {
    events = events.filter(e => e.event.toLowerCase().includes(options.event!.toLowerCase()));
  }

  const limit = parseInt(options.n, 10);
  const shown = events.slice(-limit);

  printHeader(`Session Events (${shown.length}/${events.length})`);
  console.log(colors.dim(`  File: ${path.basename(logFile)}\n`));

  for (const ev of shown) {
    const time = ev.timestamp.split('T')[1]?.replace('Z', '') || '';
    const icon = getEventIcon(ev.event);
    const toolStr = ev.tool ? colors.primary(ev.tool) : '';
    const statusStr = ev.status === 'failure' ? colors.error(' FAIL') : '';

    let detail = '';
    if (ev.detail) {
      if (ev.detail.file_path) detail = colors.dim(` ${ev.detail.file_path}`);
      else if (ev.detail.command) detail = colors.dim(` ${String(ev.detail.command).substring(0, 80)}`);
      else if (ev.detail.pattern) detail = colors.dim(` ${ev.detail.pattern}`);
      else if (ev.detail.description) detail = colors.dim(` ${ev.detail.description}`);
    }

    console.log(`  ${colors.dim(time)} ${icon} ${toolStr}${statusStr}${detail}`);
  }
}

// ============================================================
// Session summary
// ============================================================

async function showSummary(file?: string): Promise<void> {
  const projectRoot = await findProjectRoot();
  if (!projectRoot) throw new Error('Not a TimSquad project');

  const logFile = await resolveLogFile(projectRoot, file);
  if (!logFile) {
    console.log(colors.dim('\nNo session log found for today.'));
    return;
  }

  const events = await loadEvents(logFile);

  printHeader('Session Summary');
  console.log(colors.dim(`  File: ${path.basename(logFile)}\n`));

  // Basic counts
  const toolEvents = events.filter(e => e.event === 'PostToolUse');
  const failures = events.filter(e => e.event === 'PostToolUseFailure');
  const stops = events.filter(e => e.event === 'Stop');
  const subagentStarts = events.filter(e => e.event === 'SubagentStart');

  console.log(colors.subheader('  Activity:'));
  console.log(colors.dim('  세션 내 에이전트 활동량 요약\n'));
  printKeyValue('  Total events', String(events.length));
  printKeyValue('  Tool uses', String(toolEvents.length));
  printKeyValue('  Failures', String(failures.length));

  // Tool efficiency
  const totalAttempts = toolEvents.length + failures.length;
  if (totalAttempts > 0) {
    const efficiency = Math.round((toolEvents.length / totalAttempts) * 100);
    printKeyValue('  Tool Efficiency', `${efficiency}%`);
    if (efficiency < 90) {
      console.log(colors.dim('    90% 미만 - 도구 실패가 잦음. 에이전트 프롬프트나 권한 설정 점검'));
    }
  }

  printKeyValue('  Turns', String(stops.length));
  if (subagentStarts.length > 0) {
    printKeyValue('  Subagents', String(subagentStarts.length));
  }

  // Tool breakdown
  const toolCounts: Record<string, number> = {};
  for (const ev of toolEvents) {
    if (ev.tool) {
      toolCounts[ev.tool] = (toolCounts[ev.tool] || 0) + 1;
    }
  }

  const sortedTools = Object.entries(toolCounts).sort(([, a], [, b]) => b - a);

  if (sortedTools.length > 0) {
    console.log('');
    console.log(colors.subheader('  Tool Usage:'));
    for (const [tool, count] of sortedTools) {
      const bar = '█'.repeat(Math.min(count, 30));
      console.log(`    ${colors.primary(tool.padEnd(12))} ${colors.dim(bar)} ${count}`);
    }
  }

  // Subagent details
  if (subagentStarts.length > 0) {
    console.log('');
    console.log(colors.subheader('  Subagents:'));
    for (const ev of subagentStarts) {
      const atype = (ev.detail?.subagent_type as string) || 'unknown';
      const desc = (ev.detail?.description as string) || '';
      console.log(`    ${colors.warning('⧫')} ${colors.primary(atype)} ${colors.dim(desc)}`);
    }
  }

  // Files touched
  const filesModified = new Set<string>();
  const filesRead = new Set<string>();

  for (const ev of toolEvents) {
    const fp = ev.detail?.file_path as string | undefined;
    if (!fp) continue;

    if (ev.tool === 'Write' || ev.tool === 'Edit') {
      filesModified.add(fp);
    } else if (ev.tool === 'Read') {
      filesRead.add(fp);
    }
  }

  if (filesModified.size > 0) {
    console.log('');
    console.log(colors.subheader('  Files Modified:'));
    for (const f of filesModified) {
      console.log(`    ${colors.warning('M')} ${colors.dim(f)}`);
    }
  }

  // Token usage (from Stop/SessionEnd events)
  const sessionEnd = events.find(e => e.event === 'SessionEnd' && e.total_usage);
  const tokenUsage = sessionEnd?.total_usage ?? null;

  // Fallback: aggregate from Stop events
  const stopEvents = events.filter(e => e.event === 'Stop' && e.cumulative);
  const lastStop = stopEvents[stopEvents.length - 1];
  const cumulative = lastStop?.cumulative ?? tokenUsage;

  if (cumulative && Object.keys(cumulative).length > 0) {
    const totalInput = cumulative.total_input || 0;
    const totalOutput = cumulative.total_output || 0;
    const cacheCreate = cumulative.total_cache_create || 0;
    const cacheRead = cumulative.total_cache_read || 0;
    const allInput = totalInput + cacheCreate + cacheRead;
    const cacheHitRate = allInput > 0 ? Math.round((cacheRead / allInput) * 100) : 0;

    console.log('');
    console.log(colors.subheader('  Token Usage:'));
    console.log(colors.dim('  세션에서 소모된 토큰. Cache Read가 높을수록 비용 효율적\n'));
    printKeyValue('  Input', formatTokens(totalInput));
    console.log(colors.dim('    새로 처리된 입력 토큰 (캐시 미스)'));
    printKeyValue('  Output', formatTokens(totalOutput));
    console.log(colors.dim('    생성된 출력 토큰 (비용의 주요 부분)'));
    printKeyValue('  Cache Create', formatTokens(cacheCreate));
    console.log(colors.dim('    새로 캐시에 저장된 토큰 (첫 턴에 높음, 이후 감소가 정상)'));
    printKeyValue('  Cache Read', formatTokens(cacheRead));
    console.log(colors.dim('    캐시에서 재사용된 토큰 (높을수록 비용 절감)'));
    printKeyValue('  Cache Hit Rate', `${cacheHitRate}%`);
    if (cacheHitRate >= 80) {
      console.log(colors.dim('    우수 - 프롬프트 구조 안정, 캐시 활용 높음'));
    } else if (cacheHitRate >= 60) {
      console.log(colors.dim('    보통 - 프롬프트 변경으로 일부 캐시 미스'));
    } else {
      console.log(colors.dim('    주의 - 캐시 효율 낮음. CLAUDE.md나 에이전트 프롬프트 구조 검토'));
    }
  }

  // Per-turn token tracking (from Stop events)
  if (stopEvents.length > 0) {
    const turnUsages = stopEvents
      .filter(e => e.usage)
      .map(e => e.usage!);

    if (turnUsages.length > 0) {
      const avgOutput = Math.round(
        turnUsages.reduce((sum, u) => sum + (u.output || 0), 0) / turnUsages.length
      );
      const maxOutput = Math.max(...turnUsages.map(u => u.output || 0));

      console.log('');
      printKeyValue('  Avg Output/Turn', formatTokens(avgOutput));
      console.log(colors.dim('    턴당 평균 출력. 비정상적으로 높으면 응답이 불필요하게 장황'));
      printKeyValue('  Max Output/Turn', formatTokens(maxOutput));
      console.log(colors.dim('    이상치 감지용. 특정 턴에서 토큰 폭발 여부 확인'));
    }
  }

  // Timeline
  if (events.length >= 2) {
    const first = events[0].timestamp;
    const last = events[events.length - 1].timestamp;
    const durationMs = new Date(last).getTime() - new Date(first).getTime();
    const durationMin = Math.round(durationMs / 60000);

    console.log('');
    printKeyValue('Duration', `~${durationMin}min`);
    printKeyValue('Started', first.split('T')[1]?.replace('Z', '') || first);
    printKeyValue('Last event', last.split('T')[1]?.replace('Z', '') || last);
  }
}

// ============================================================
// Helpers
// ============================================================

function getEventIcon(event: string): string {
  const icons: Record<string, string> = {
    SessionStart: colors.success('▶'),
    SessionEnd: colors.error('■'),
    PostToolUse: colors.info('●'),
    PostToolUseFailure: colors.error('✗'),
    Stop: colors.dim('◆'),
    SubagentStart: colors.warning('⧫'),
    SubagentStop: colors.warning('⧫'),
  };
  return icons[event] || colors.dim('○');
}

function formatTokens(tokens: number): string {
  if (tokens < 1000) return String(tokens);
  if (tokens < 1000000) return `${(tokens / 1000).toFixed(1)}K`;
  return `${(tokens / 1000000).toFixed(2)}M`;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

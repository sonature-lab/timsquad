import { Command } from 'commander';
import path from 'path';
import fs from 'fs-extra';
import { colors, printHeader, printError, printSuccess, printKeyValue } from '../utils/colors.js';
import { findProjectRoot } from '../lib/project.js';
import { exists, readFile, writeFile, listFiles } from '../utils/fs.js';
import { getDateString, getTimeString, getTimestamp } from '../utils/date.js';
import type {
  TaskLogEntry, TaskSemantic, TaskStats,
  SequenceLogEntry, AxisResult, PhaseLogEntry, PhaseGateResult,
} from '../types/task-log.js';
import type { FeedbackEntry } from '../types/feedback.js';
import { loadWorkflowState } from '../lib/workflow-state.js';
const LOG_TYPES = ['work', 'decision', 'error', 'feedback', 'handoff'] as const;
type LogType = typeof LOG_TYPES[number];

const LOG_SCHEMA_VERSION = '1.0.0';

export function registerLogCommand(program: Command): void {
  const logCmd = program
    .command('log')
    .description('Manage work logs');

  // tsq log add <agent> <type> [message]
  logCmd
    .command('add <agent> <type> [message]')
    .description('Add a log entry')
    .action(async (agent: string, type: string, message?: string) => {
      try {
        await addLog(agent, type as LogType, message);
      } catch (error) {
        printError((error as Error).message);
        process.exit(1);
      }
    });

  // tsq log list [agent]
  logCmd
    .command('list [agent]')
    .description('List log files')
    .action(async (agent?: string) => {
      try {
        await listLogs(agent);
      } catch (error) {
        printError((error as Error).message);
        process.exit(1);
      }
    });

  // tsq log view <file>
  logCmd
    .command('view <file>')
    .description('View a log file')
    .action(async (file: string) => {
      try {
        await viewLog(file);
      } catch (error) {
        printError((error as Error).message);
        process.exit(1);
      }
    });

  // tsq log today [agent]
  logCmd
    .command('today [agent]')
    .description('Show today\'s logs')
    .action(async (agent?: string) => {
      try {
        await showTodayLogs(agent);
      } catch (error) {
        printError((error as Error).message);
        process.exit(1);
      }
    });

  // tsq log search <keyword>
  logCmd
    .command('search <keyword>')
    .description('Search logs')
    .action(async (keyword: string) => {
      try {
        await searchLogs(keyword);
      } catch (error) {
        printError((error as Error).message);
        process.exit(1);
      }
    });

  // tsq log summary [date]
  logCmd
    .command('summary [date]')
    .description('Generate daily summary')
    .action(async (date?: string) => {
      try {
        await generateSummary(date);
      } catch (error) {
        printError((error as Error).message);
        process.exit(1);
      }
    });

  // tsq log compact
  logCmd
    .command('compact')
    .description('Compress old logs (session JSONL → summary, merge old md)')
    .option('--days <n>', 'Keep logs newer than N days', '7')
    .option('--dry-run', 'Show what would be compacted without changes')
    .action(async (options: { days: string; dryRun?: boolean }) => {
      try {
        await compactLogs(parseInt(options.days, 10), !!options.dryRun);
      } catch (error) {
        printError((error as Error).message);
        process.exit(1);
      }
    });

  // ── tsq log enrich <agent> ──
  logCmd
    .command('enrich <agent>')
    .description('Enrich latest task log with semantic data')
    .requiredOption('--json <data>', 'Semantic data as JSON string')
    .action(async (agent: string, options: { json: string }) => {
      try {
        await enrichTaskLog(agent, options.json);
      } catch (error) {
        printError((error as Error).message);
        process.exit(1);
      }
    });

  // ── tsq log task <subcommand> ──
  const taskCmd = logCmd
    .command('task')
    .description('L1 Task log management');

  taskCmd
    .command('list')
    .description('List task logs')
    .option('--agent <name>', 'Filter by agent')
    .action(async (options: { agent?: string }) => {
      try {
        await listTaskLogs(options.agent);
      } catch (error) {
        printError((error as Error).message);
        process.exit(1);
      }
    });

  taskCmd
    .command('view <file>')
    .description('View a task log')
    .action(async (file: string) => {
      try {
        await viewTaskLog(file);
      } catch (error) {
        printError((error as Error).message);
        process.exit(1);
      }
    });

  taskCmd
    .command('stats')
    .description('Task log statistics')
    .action(async () => {
      try {
        await showTaskStats();
      } catch (error) {
        printError((error as Error).message);
        process.exit(1);
      }
    });

  // ── tsq log sequence <subcommand> ──
  const seqCmd = logCmd
    .command('sequence')
    .description('L2 Sequence log management');

  seqCmd
    .command('list')
    .description('List sequence logs')
    .action(async () => {
      try {
        await listSequenceLogs();
      } catch (error) {
        printError((error as Error).message);
        process.exit(1);
      }
    });

  seqCmd
    .command('view <seq-id>')
    .description('View a sequence log')
    .action(async (seqId: string) => {
      try {
        await viewSequenceLog(seqId);
      } catch (error) {
        printError((error as Error).message);
        process.exit(1);
      }
    });

  seqCmd
    .command('create <seq-id>')
    .description('Create sequence log from task logs')
    .requiredOption('--phase <id>', 'Phase ID')
    .requiredOption('--report <path>', 'Architect report path')
    .option('--verdict <v>', 'proceed or hold', 'proceed')
    .option('--conditions <c>', 'Comma-separated conditions')
    .action(async (seqId: string, options: { phase: string; report: string; verdict: string; conditions?: string }) => {
      try {
        await createSequenceLog(seqId, options);
      } catch (error) {
        printError((error as Error).message);
        process.exit(1);
      }
    });

  seqCmd
    .command('check <seq-id>')
    .description('Check task log completeness for a sequence')
    .action(async (seqId: string) => {
      try {
        await checkSequence(seqId);
      } catch (error) {
        printError((error as Error).message);
        process.exit(1);
      }
    });

  // ── tsq log phase <subcommand> ──
  const phaseCmd = logCmd
    .command('phase')
    .description('L3 Phase log management');

  phaseCmd
    .command('list')
    .description('List phase logs')
    .action(async () => {
      try {
        await listPhaseLogs();
      } catch (error) {
        printError((error as Error).message);
        process.exit(1);
      }
    });

  phaseCmd
    .command('view <phase-id>')
    .description('View a phase log')
    .action(async (phaseId: string) => {
      try {
        await viewPhaseLog(phaseId);
      } catch (error) {
        printError((error as Error).message);
        process.exit(1);
      }
    });

  phaseCmd
    .command('create <phase-id>')
    .description('Create phase log')
    .requiredOption('--sequences <ids>', 'Comma-separated sequence IDs')
    .option('--retro-keep <items>', 'Retrospective: keep (comma-separated)')
    .option('--retro-problem <items>', 'Retrospective: problems (comma-separated)')
    .option('--retro-try <items>', 'Retrospective: try (comma-separated)')
    .action(async (phaseId: string, options: {
      sequences: string;
      retroKeep?: string; retroProblem?: string; retroTry?: string;
    }) => {
      try {
        await createPhaseLog(phaseId, options);
      } catch (error) {
        printError((error as Error).message);
        process.exit(1);
      }
    });

  phaseCmd
    .command('gate <phase-id>')
    .description('Check phase transition gate')
    .action(async (phaseId: string) => {
      try {
        await checkPhaseGate(phaseId);
      } catch (error) {
        printError((error as Error).message);
        process.exit(1);
      }
    });
}

async function addLog(agent: string, type: LogType, message?: string): Promise<void> {
  const projectRoot = await findProjectRoot();
  if (!projectRoot) {
    throw new Error('Not a TimSquad project');
  }

  if (!LOG_TYPES.includes(type)) {
    throw new Error(`Invalid log type. Use: ${LOG_TYPES.join(', ')}`);
  }

  // Read message from stdin if not provided
  let logMessage = message;
  if (!logMessage) {
    // Check if stdin has data
    if (!process.stdin.isTTY) {
      logMessage = await readFromStdin();
    }
    if (!logMessage) {
      throw new Error('Message is required');
    }
  }

  const date = getDateString();
  const time = getTimeString();
  const logDir = path.join(projectRoot, '.timsquad', 'logs');
  const logFile = path.join(logDir, `${date}-${agent}.md`);

  // Create or append to log file
  let content = '';
  if (await exists(logFile)) {
    content = await readFile(logFile);
  } else {
    content = `# ${agent} Log - ${date}\n\n`;
  }

  // Add entry
  const typeIcon = getTypeIcon(type);
  content += `## ${time} [${type}] ${typeIcon}\n\n${logMessage}\n\n---\n\n`;

  await writeFile(logFile, content);
  printSuccess(`Log added: ${date}-${agent}.md`);
}

async function listLogs(agent?: string): Promise<void> {
  const projectRoot = await findProjectRoot();
  if (!projectRoot) {
    throw new Error('Not a TimSquad project');
  }

  const logDir = path.join(projectRoot, '.timsquad', 'logs');
  const pattern = agent ? `*-${agent}.md` : '*.md';
  const files = await listFiles(pattern, logDir);

  // Filter out templates
  const logFiles = files.filter(f => !f.startsWith('_'));

  if (logFiles.length === 0) {
    console.log(colors.dim('No logs found'));
    return;
  }

  printHeader('Log Files');
  logFiles.sort().reverse().forEach(file => {
    console.log(`  ${colors.path(file)}`);
  });
}

async function viewLog(file: string): Promise<void> {
  const projectRoot = await findProjectRoot();
  if (!projectRoot) {
    throw new Error('Not a TimSquad project');
  }

  const logFile = path.join(projectRoot, '.timsquad', 'logs', file);
  if (!await exists(logFile)) {
    throw new Error(`Log file not found: ${file}`);
  }

  const content = await readFile(logFile);
  console.log(content);
}

async function showTodayLogs(agent?: string): Promise<void> {
  const projectRoot = await findProjectRoot();
  if (!projectRoot) {
    throw new Error('Not a TimSquad project');
  }

  const date = getDateString();
  const logDir = path.join(projectRoot, '.timsquad', 'logs');
  const pattern = agent ? `${date}-${agent}.md` : `${date}-*.md`;
  const files = await listFiles(pattern, logDir);

  if (files.length === 0) {
    console.log(colors.dim('No logs for today'));
    return;
  }

  printHeader(`Today's Logs (${date})`);
  for (const file of files) {
    const content = await readFile(path.join(logDir, file));
    console.log(colors.subheader(file));
    console.log(content);
    console.log('');
  }
}

async function searchLogs(keyword: string): Promise<void> {
  const projectRoot = await findProjectRoot();
  if (!projectRoot) {
    throw new Error('Not a TimSquad project');
  }

  const logDir = path.join(projectRoot, '.timsquad', 'logs');
  const files = await listFiles('*.md', logDir);
  const logFiles = files.filter(f => !f.startsWith('_'));

  let found = 0;
  const lowerKeyword = keyword.toLowerCase();

  for (const file of logFiles) {
    const content = await readFile(path.join(logDir, file));
    const lines = content.split('\n');

    lines.forEach((line, index) => {
      if (line.toLowerCase().includes(lowerKeyword)) {
        if (found === 0) {
          printHeader(`Search Results: "${keyword}"`);
        }
        console.log(`${colors.path(file)}:${index + 1}`);
        console.log(`  ${highlightKeyword(line, keyword)}`);
        found++;
      }
    });
  }

  if (found === 0) {
    console.log(colors.dim(`No results for "${keyword}"`));
  } else {
    console.log(colors.dim(`\nFound ${found} matches`));
  }
}

async function generateSummary(date?: string): Promise<void> {
  const projectRoot = await findProjectRoot();
  if (!projectRoot) {
    throw new Error('Not a TimSquad project');
  }

  const targetDate = date || getDateString();
  const logDir = path.join(projectRoot, '.timsquad', 'logs');
  const files = await listFiles(`${targetDate}-*.md`, logDir);

  if (files.length === 0) {
    console.log(colors.dim(`No logs for ${targetDate}`));
    return;
  }

  printHeader(`Summary for ${targetDate}`);

  const stats: Record<string, Record<LogType, number>> = {};

  for (const file of files) {
    const agent = file.replace(`${targetDate}-`, '').replace('.md', '');
    const content = await readFile(path.join(logDir, file));

    stats[agent] = { work: 0, decision: 0, error: 0, feedback: 0, handoff: 0 };

    LOG_TYPES.forEach(type => {
      const regex = new RegExp(`\\[${type}\\]`, 'gi');
      const matches = content.match(regex);
      stats[agent][type] = matches ? matches.length : 0;
    });
  }

  // Display stats
  Object.entries(stats).forEach(([agent, counts]) => {
    console.log(colors.agent(`\n  ${agent}:`));
    Object.entries(counts).forEach(([type, count]) => {
      if (count > 0) {
        console.log(`    ${type}: ${count}`);
      }
    });
  });
  console.log('');
}

function getTypeIcon(type: LogType): string {
  const icons: Record<LogType, string> = {
    work: '📝',
    decision: '🎯',
    error: '❌',
    feedback: '💬',
    handoff: '🤝',
  };
  return icons[type] || '';
}

function highlightKeyword(text: string, keyword: string): string {
  const regex = new RegExp(`(${keyword})`, 'gi');
  return text.replace(regex, colors.highlight('$1'));
}

async function readFromStdin(): Promise<string> {
  return new Promise((resolve) => {
    let data = '';
    process.stdin.on('data', chunk => {
      data += chunk;
    });
    process.stdin.on('end', () => {
      resolve(data.trim());
    });
    setTimeout(() => resolve(''), 100);
  });
}

// ============================================================
// Log Compact (오래된 로그 압축)
// ============================================================
//
// 1. 세션 JSONL: N일 이상 된 파일 → 통계 JSON 1개로 합쳐 원본 삭제
// 2. 작업 로그 MD: N일 이상 된 파일 → 월별 1파일로 병합
// 토큰 비용: 0 (순수 파일 I/O)

interface SessionSummary {
  file: string;
  date: string;
  session: string;
  events: number;
  toolUses: number;
  failures: number;
  subagents: number;
  tokens: {
    input: number;
    output: number;
    cacheCreate: number;
    cacheRead: number;
  };
}

async function compactLogs(days: number, dryRun: boolean): Promise<void> {
  const projectRoot = await findProjectRoot();
  if (!projectRoot) {
    throw new Error('Not a TimSquad project');
  }

  printHeader('Log Compact');
  printKeyValue('Keep newer than', `${days} days`);
  if (dryRun) {
    console.log(colors.warning('DRY RUN - no files will be modified\n'));
  }

  const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const cutoffStr = cutoffDate.toISOString().split('T')[0];

  let jsonlCompacted = 0;
  let mdMerged = 0;
  let bytesFreed = 0;

  // ── 1. 세션 JSONL 압축 ──
  const sessionsDir = path.join(projectRoot, '.timsquad', 'logs', 'sessions');
  if (await exists(sessionsDir)) {
    const jsonlFiles = await listFiles('*.jsonl', sessionsDir);
    const oldJsonl = jsonlFiles.filter(f => {
      const dateStr = f.split('-').slice(0, 3).join('-');
      return dateStr < cutoffStr;
    });

    if (oldJsonl.length > 0) {
      console.log(colors.subheader(`\n  Session JSONL: ${oldJsonl.length} files to compact`));

      const summaries: SessionSummary[] = [];

      for (const file of oldJsonl) {
        const filePath = path.join(sessionsDir, file);
        const stat = await fs.stat(filePath);
        bytesFreed += stat.size;

        try {
          const content = await readFile(filePath);
          const lines = content.split('\n').filter(l => l.trim());

          let toolUses = 0;
          let failures = 0;
          let subagents = 0;
          let tokenInput = 0;
          let tokenOutput = 0;
          let cacheCreate = 0;
          let cacheRead = 0;

          for (const line of lines) {
            try {
              const ev = JSON.parse(line);
              if (ev.event === 'PostToolUse') toolUses++;
              if (ev.event === 'PostToolUseFailure') failures++;
              if (ev.event === 'SubagentStart') subagents++;
              if (ev.event === 'SessionEnd' && ev.total_usage) {
                tokenInput += ev.total_usage.total_input || 0;
                tokenOutput += ev.total_usage.total_output || 0;
                cacheCreate += ev.total_usage.total_cache_create || 0;
                cacheRead += ev.total_usage.total_cache_read || 0;
              }
            } catch { /* skip */ }
          }

          const dateStr = file.split('-').slice(0, 3).join('-');
          const sessionId = file.replace(/\.jsonl$/, '').split('-').slice(3).join('-');

          summaries.push({
            file,
            date: dateStr,
            session: sessionId,
            events: lines.length,
            toolUses,
            failures,
            subagents,
            tokens: { input: tokenInput, output: tokenOutput, cacheCreate, cacheRead },
          });

          if (!dryRun) {
            await fs.remove(filePath);
          }

          jsonlCompacted++;
          console.log(colors.dim(`    ${dryRun ? '[dry-run] ' : ''}${file} (${lines.length} events, ${formatSize(stat.size)})`));
        } catch {
          // skip unreadable files
        }
      }

      // 압축 요약 저장
      if (!dryRun && summaries.length > 0) {
        const archiveDir = path.join(sessionsDir, 'archive');
        await fs.ensureDir(archiveDir);

        const monthGroups: Record<string, SessionSummary[]> = {};
        for (const s of summaries) {
          const month = s.date.slice(0, 7); // YYYY-MM
          if (!monthGroups[month]) monthGroups[month] = [];
          monthGroups[month].push(s);
        }

        for (const [month, group] of Object.entries(monthGroups)) {
          const archivePath = path.join(archiveDir, `${month}-summary.json`);

          let existing: SessionSummary[] = [];
          if (await exists(archivePath)) {
            try {
              const data = await fs.readJson(archivePath);
              existing = data.sessions || [];
            } catch { /* start fresh */ }
          }

          await fs.writeJson(archivePath, {
            compactedAt: getTimestamp(),
            month,
            sessions: [...existing, ...group],
            totals: {
              sessions: existing.length + group.length,
              events: [...existing, ...group].reduce((a, s) => a + s.events, 0),
              toolUses: [...existing, ...group].reduce((a, s) => a + s.toolUses, 0),
              failures: [...existing, ...group].reduce((a, s) => a + s.failures, 0),
            },
          }, { spaces: 2 });
        }
      }
    }
  }

  // ── 2. 작업 로그 MD 병합 ──
  const logsDir = path.join(projectRoot, '.timsquad', 'logs');
  if (await exists(logsDir)) {
    const mdFiles = await listFiles('????-??-??-*.md', logsDir);
    const oldMd = mdFiles.filter(f => {
      const match = f.match(/^(\d{4}-\d{2}-\d{2})-/);
      return match && match[1] < cutoffStr;
    });

    if (oldMd.length > 0) {
      console.log(colors.subheader(`\n  Work Logs MD: ${oldMd.length} files to merge`));

      // 월별 그룹핑
      const monthGroups: Record<string, string[]> = {};
      for (const file of oldMd) {
        const month = file.slice(0, 7);
        if (!monthGroups[month]) monthGroups[month] = [];
        monthGroups[month].push(file);
      }

      for (const [month, files] of Object.entries(monthGroups)) {
        const mergedPath = path.join(logsDir, `${month}-archive.md`);

        let mergedContent = '';
        if (await exists(mergedPath)) {
          mergedContent = await readFile(mergedPath);
        } else {
          mergedContent = `# Archive - ${month}\n\n> ${files.length} log files merged by tsq log compact\n\n---\n`;
        }

        for (const file of files.sort()) {
          const filePath = path.join(logsDir, file);
          const stat = await fs.stat(filePath);
          bytesFreed += stat.size;

          try {
            const content = await readFile(filePath);
            mergedContent += `\n\n<!-- ${file} -->\n${content}`;

            if (!dryRun) {
              await fs.remove(filePath);
            }
            mdMerged++;
            console.log(colors.dim(`    ${dryRun ? '[dry-run] ' : ''}${file} → ${month}-archive.md`));
          } catch { /* skip */ }
        }

        if (!dryRun) {
          await writeFile(mergedPath, mergedContent);
        }
      }
    }
  }

  // ── 결과 ──
  console.log('');
  if (jsonlCompacted + mdMerged === 0) {
    console.log(colors.dim('No files older than threshold. Nothing to compact.'));
  } else {
    printSuccess(`Compacted: ${jsonlCompacted} JSONL + ${mdMerged} MD files`);
    printKeyValue('Space freed', `~${formatSize(bytesFreed)}`);
    if (dryRun) {
      console.log(colors.dim('\nRun without --dry-run to apply changes.'));
    }
  }
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

// ============================================================
// Task Log Helpers
// ============================================================

export function getTasksDir(projectRoot: string): string {
  return path.join(projectRoot, '.timsquad', 'logs', 'tasks');
}

export function getSequencesDir(projectRoot: string): string {
  return path.join(projectRoot, '.timsquad', 'logs', 'sequences');
}

export function getPhasesDir(projectRoot: string): string {
  return path.join(projectRoot, '.timsquad', 'logs', 'phases');
}

async function findLatestTaskLog(projectRoot: string, agent: string): Promise<string | null> {
  const tasksDir = getTasksDir(projectRoot);
  if (!await exists(tasksDir)) return null;

  // Flat structure: *-{agent}.json
  const flatFiles = await listFiles(`*-${agent}.json`, tasksDir);

  // Nested structure: look inside subdirectories
  const nestedFiles: string[] = [];
  try {
    const entries = await fs.readdir(tasksDir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isDirectory()) {
        const subFiles = await listFiles(`*-${agent}.json`, path.join(tasksDir, entry.name));
        nestedFiles.push(...subFiles.map(f => path.join(entry.name, f)));
      }
    }
  } catch { /* no subdirectories */ }

  const allFiles = [...flatFiles, ...nestedFiles].sort().reverse();
  return allFiles.length > 0 ? allFiles[0] : null;
}

export async function loadAllTaskLogs(projectRoot: string, agent?: string): Promise<Array<{ file: string; data: TaskLogEntry }>> {
  const tasksDir = getTasksDir(projectRoot);
  if (!await exists(tasksDir)) return [];

  const pattern = agent ? `*-${agent}.json` : '*.json';
  const files = await listFiles(pattern, tasksDir);

  const results: Array<{ file: string; data: TaskLogEntry }> = [];
  for (const file of files) {
    try {
      const data = await fs.readJson(path.join(tasksDir, file));
      results.push({ file, data });
    } catch { /* skip malformed */ }
  }

  return results.sort((a, b) => a.file.localeCompare(b.file));
}

function mergeSemantic(existing: TaskSemantic, incoming: Partial<TaskSemantic>): TaskSemantic {
  return {
    summary: incoming.summary ?? existing.summary,
    techniques: incoming.techniques ?? existing.techniques,
    ssot_refs: incoming.ssot_refs ?? existing.ssot_refs,
    decisions: incoming.decisions ?? existing.decisions,
    issues: incoming.issues ?? existing.issues,
  };
}

export function hasSemantic(sem: TaskSemantic | undefined): boolean {
  if (!sem) return false;
  return !!(sem.summary || sem.techniques?.length || sem.ssot_refs?.length ||
            sem.decisions?.length || sem.issues?.length);
}

// ============================================================
// Step 2: tsq log enrich
// ============================================================

async function enrichTaskLog(agent: string, jsonData: string): Promise<void> {
  const projectRoot = await findProjectRoot();
  if (!projectRoot) throw new Error('Not a TimSquad project');

  const latestFile = await findLatestTaskLog(projectRoot, agent);
  if (!latestFile) {
    throw new Error(`No task log found for agent: ${agent}`);
  }

  const filePath = path.join(getTasksDir(projectRoot), latestFile);

  let incoming: Partial<TaskSemantic>;
  try {
    incoming = JSON.parse(jsonData);
  } catch {
    throw new Error('Invalid JSON data');
  }

  const taskLog: TaskLogEntry = await fs.readJson(filePath);
  taskLog.semantic = mergeSemantic(taskLog.semantic || {}, incoming);

  await fs.writeJson(filePath, taskLog, { spaces: 2 });
  printSuccess(`Enriched: ${latestFile}`);

  if (taskLog.semantic.summary) {
    printKeyValue('Summary', taskLog.semantic.summary);
  }
  if (taskLog.semantic.techniques?.length) {
    printKeyValue('Techniques', taskLog.semantic.techniques.map(t => t.name).join(', '));
  }

  // Auto-feedback: L2/L3 이슈 → 자동 피드백 라우팅
  await autoFeedbackFromIssues(projectRoot, taskLog.semantic);
}

// ============================================================
// Step 3: tsq log task (L1 views)
// ============================================================

async function listTaskLogs(agent?: string): Promise<void> {
  const projectRoot = await findProjectRoot();
  if (!projectRoot) throw new Error('Not a TimSquad project');

  const logs = await loadAllTaskLogs(projectRoot, agent);

  if (logs.length === 0) {
    console.log(colors.dim('No task logs found'));
    return;
  }

  printHeader(`Task Logs (${logs.length})`);

  for (const { file, data } of logs.reverse()) {
    const sem = hasSemantic(data.semantic) ? '✓' : '○';
    const status = data.status === 'completed' ? colors.success('✓') : colors.error('✗');
    const agentName = colors.agent(data.agent || '?');
    const date = file.slice(0, 10);

    console.log(`  ${status} ${sem} ${colors.dim(date)} ${agentName}  ${colors.dim(file)}`);
    if (data.semantic?.summary) {
      console.log(`      ${colors.dim(data.semantic.summary.slice(0, 80))}`);
    }
  }
}

async function viewTaskLog(file: string): Promise<void> {
  const projectRoot = await findProjectRoot();
  if (!projectRoot) throw new Error('Not a TimSquad project');

  const filePath = path.join(getTasksDir(projectRoot), file);
  if (!await exists(filePath)) {
    throw new Error(`Task log not found: ${file}`);
  }

  const data: TaskLogEntry = await fs.readJson(filePath);

  printHeader(`Task Log: ${file}`);

  // Basic info
  printKeyValue('Agent', data.agent);
  printKeyValue('Status', data.status);
  printKeyValue('Completed', data.completed_at || 'N/A');
  if (data.duration_ms) printKeyValue('Duration', `${(data.duration_ms / 1000).toFixed(1)}s`);

  // Mechanical
  console.log(colors.subheader('\n  Mechanical'));
  if (data.mechanical?.files?.length) {
    for (const f of data.mechanical.files) {
      console.log(`    ${f.action}: ${colors.path(f.path)}`);
    }
  } else {
    console.log(colors.dim('    (no file changes)'));
  }

  // Semantic
  console.log(colors.subheader('\n  Semantic'));
  if (hasSemantic(data.semantic)) {
    if (data.semantic.summary) printKeyValue('  Summary', data.semantic.summary);
    if (data.semantic.techniques?.length) {
      console.log('    Techniques:');
      for (const t of data.semantic.techniques) {
        console.log(`      - ${t.name}: ${colors.dim(t.reason)}`);
      }
    }
    if (data.semantic.ssot_refs?.length) {
      console.log('    SSOT Refs:');
      for (const r of data.semantic.ssot_refs) {
        const icon = r.status === 'aligned' ? '✓' : r.status === 'misaligned' ? '✗' : '~';
        console.log(`      ${icon} ${r.doc} → ${r.section} (${r.status})`);
      }
    }
    if (data.semantic.decisions?.length) {
      console.log('    Decisions:');
      for (const d of data.semantic.decisions) {
        console.log(`      - ${d.decision}`);
        console.log(`        ${colors.dim(d.rationale)}`);
      }
    }
    if (data.semantic.issues?.length) {
      console.log('    Issues:');
      for (const i of data.semantic.issues) {
        console.log(`      L${i.level}: ${i.description}`);
      }
    }
  } else {
    console.log(colors.dim('    (empty — run tsq log enrich to populate)'));
  }
}

async function showTaskStats(): Promise<void> {
  const projectRoot = await findProjectRoot();
  if (!projectRoot) throw new Error('Not a TimSquad project');

  const logs = await loadAllTaskLogs(projectRoot);

  if (logs.length === 0) {
    console.log(colors.dim('No task logs found'));
    return;
  }

  const stats: TaskStats = {
    total: logs.length,
    completed: 0, failed: 0, successRate: 0,
    byAgent: {},
    totalFilesChanged: 0, avgFilesPerTask: 0, fileActions: {},
    withErrors: 0, errorTypes: {},
    withSemantic: 0, semanticCoverage: 0,
  };

  for (const { data } of logs) {
    // Status
    if (data.status === 'completed' || data.status === 'success') stats.completed++;
    else stats.failed++;

    // By agent
    const a = data.agent || 'unknown';
    if (!stats.byAgent[a]) stats.byAgent[a] = { total: 0, completed: 0, failed: 0 };
    stats.byAgent[a].total++;
    if (data.status === 'completed' || data.status === 'success') stats.byAgent[a].completed++;
    else stats.byAgent[a].failed++;

    // Files
    const files = data.mechanical?.files || [];
    stats.totalFilesChanged += files.length;
    for (const f of files) {
      stats.fileActions[f.action] = (stats.fileActions[f.action] || 0) + 1;
    }

    // Errors
    if (data.error) {
      stats.withErrors++;
      const t = data.error.type || 'unknown';
      stats.errorTypes[t] = (stats.errorTypes[t] || 0) + 1;
    }

    // Semantic
    if (hasSemantic(data.semantic)) stats.withSemantic++;
  }

  stats.successRate = Math.round((stats.completed / stats.total) * 100);
  stats.avgFilesPerTask = Math.round((stats.totalFilesChanged / stats.total) * 10) / 10;
  stats.semanticCoverage = Math.round((stats.withSemantic / stats.total) * 100);

  printHeader('Task Log Statistics');
  printKeyValue('Total Tasks', String(stats.total));
  printKeyValue('Success Rate', `${stats.successRate}% (${stats.completed}/${stats.total})`);
  printKeyValue('Semantic Coverage', `${stats.semanticCoverage}% (${stats.withSemantic}/${stats.total})`);
  printKeyValue('Files Changed', `${stats.totalFilesChanged} (avg ${stats.avgFilesPerTask}/task)`);

  if (Object.keys(stats.byAgent).length > 1) {
    console.log(colors.subheader('\n  By Agent'));
    for (const [agent, s] of Object.entries(stats.byAgent)) {
      const rate = Math.round((s.completed / s.total) * 100);
      console.log(`    ${colors.agent(agent)}: ${s.total} tasks, ${rate}% success`);
    }
  }

  if (stats.withErrors > 0) {
    console.log(colors.subheader('\n  Errors'));
    printKeyValue('  Tasks with errors', String(stats.withErrors));
    for (const [type, count] of Object.entries(stats.errorTypes)) {
      console.log(`    ${type}: ${count}`);
    }
  }
}

// ============================================================
// Step 4: tsq log sequence (L2)
// ============================================================

export async function loadSequenceTaskLogs(projectRoot: string, seqId: string): Promise<Array<{ file: string; data: TaskLogEntry }>> {
  const tasksDir = getTasksDir(projectRoot);
  if (!await exists(tasksDir)) return [];

  const results: Array<{ file: string; data: TaskLogEntry }> = [];

  // 1. Check nested directory: tasks/{SEQ-ID}/*.json
  const seqDir = path.join(tasksDir, seqId);
  if (await exists(seqDir)) {
    const files = await listFiles('*.json', seqDir);
    for (const file of files) {
      try {
        const data = await fs.readJson(path.join(seqDir, file));
        results.push({ file: path.join(seqId, file), data });
      } catch { /* skip */ }
    }
  }

  // 2. Check flat files with trace.sequence_id matching
  const flatFiles = await listFiles('*.json', tasksDir);
  for (const file of flatFiles) {
    try {
      const data: TaskLogEntry = await fs.readJson(path.join(tasksDir, file));
      if (data.trace?.sequence_id === seqId) {
        // Avoid duplicates from nested
        if (!results.some(r => r.file === file)) {
          results.push({ file, data });
        }
      }
    } catch { /* skip */ }
  }

  return results.sort((a, b) => a.file.localeCompare(b.file));
}

function aggregateSequenceStats(
  taskLogs: Array<{ file: string; data: TaskLogEntry }>,
): SequenceLogEntry['tasks'] & { durations: number[] } {
  let success = 0, failure = 0, error = 0, rework = 0;
  const durations: number[] = [];

  for (const { file, data } of taskLogs) {
    const s = data.status;
    if (s === 'completed' || s === 'success') success++;
    else if (s === 'failure') failure++;
    else if (s === 'error') error++;

    if (data.duration_ms) durations.push(data.duration_ms);

    // Simple rework detection: same agent + file overlap with earlier task
    const changedFiles = new Set(data.mechanical?.files?.map(f => f.path) || []);
    for (const other of taskLogs) {
      if (other.file === file) continue;
      if (other.data.agent === data.agent && other.file < file) {
        const otherFiles = other.data.mechanical?.files?.map(f => f.path) || [];
        if (otherFiles.some(f => changedFiles.has(f))) {
          rework++;
          break;
        }
      }
    }
  }

  const total = taskLogs.length;
  return {
    total, success, failure, error, rework,
    first_pass_success_rate: total > 0 ? Math.round(((success) / total) * 100) / 100 : 0,
    final_success_rate: total > 0 ? Math.round(((success) / total) * 100) / 100 : 0,
    durations,
  };
}

export function makeAxisPlaceholder(): AxisResult {
  return { verdict: 'n/a', details: 'See architect report', issues: [] };
}

async function listSequenceLogs(): Promise<void> {
  const projectRoot = await findProjectRoot();
  if (!projectRoot) throw new Error('Not a TimSquad project');

  const seqDir = getSequencesDir(projectRoot);
  if (!await exists(seqDir)) {
    console.log(colors.dim('No sequence logs found'));
    return;
  }

  const files = await listFiles('*.json', seqDir);
  if (files.length === 0) {
    console.log(colors.dim('No sequence logs found'));
    return;
  }

  printHeader(`Sequence Logs (${files.length})`);

  for (const file of files.sort()) {
    try {
      const data: SequenceLogEntry = await fs.readJson(path.join(seqDir, file));
      const seqId = data.trace.sequence_id;
      const status = data.execution.status;
      const verdict = data.verdict.proceed ? colors.success('PROCEED') : colors.error('HOLD');
      const tasks = `${data.tasks.success}/${data.tasks.total} tasks`;
      console.log(`  ${verdict} ${colors.agent(seqId)} [${status}] ${tasks} ${colors.dim(data.trace.phase_id)}`);
    } catch {
      console.log(`  ${colors.dim(file)} (unreadable)`);
    }
  }
}

async function viewSequenceLog(seqId: string): Promise<void> {
  const projectRoot = await findProjectRoot();
  if (!projectRoot) throw new Error('Not a TimSquad project');

  const filePath = path.join(getSequencesDir(projectRoot), `${seqId}.json`);
  if (!await exists(filePath)) {
    throw new Error(`Sequence log not found: ${seqId}`);
  }

  const data: SequenceLogEntry = await fs.readJson(filePath);

  printHeader(`Sequence: ${seqId}`);
  printKeyValue('Phase', data.trace.phase_id);
  printKeyValue('Status', data.execution.status);
  printKeyValue('Duration', `${(data.execution.duration_ms / 1000).toFixed(1)}s`);
  printKeyValue('Verdict', data.verdict.proceed ? 'PROCEED' : 'HOLD');

  console.log(colors.subheader('\n  Tasks'));
  printKeyValue('  Total', String(data.tasks.total));
  printKeyValue('  Success', String(data.tasks.success));
  printKeyValue('  Failure', String(data.tasks.failure));
  printKeyValue('  Rework', String(data.tasks.rework));
  printKeyValue('  Success Rate', `${(data.tasks.final_success_rate * 100).toFixed(0)}%`);

  console.log(colors.subheader('\n  Analysis'));
  for (const [axis, result] of Object.entries(data.analysis)) {
    const r = result as AxisResult;
    const icon = r.verdict === 'pass' ? '✓' : r.verdict === 'fail' ? '✗' : r.verdict === 'warn' ? '!' : '–';
    console.log(`    ${icon} ${axis}: ${r.verdict} — ${colors.dim(r.details)}`);
  }

  console.log(colors.subheader('\n  DORA'));
  printKeyValue('  Change Failure Rate', `${(data.dora_derived.change_failure_rate * 100).toFixed(0)}%`);
  printKeyValue('  Rework Rate', `${(data.dora_derived.rework_rate * 100).toFixed(0)}%`);
  printKeyValue('  Mean Task Duration', `${(data.dora_derived.mean_task_duration_ms / 1000).toFixed(1)}s`);

  if (data.verdict.conditions.length > 0) {
    console.log(colors.subheader('\n  Conditions'));
    for (const c of data.verdict.conditions) {
      console.log(`    - ${c}`);
    }
  }

  printKeyValue('\n  Report', data.verdict.report_path);
}

/**
 * Core: build SequenceLogEntry data (no I/O side effects except reading task logs)
 */
export async function buildSequenceLogData(
  projectRoot: string,
  seqId: string,
  options: { phase: string; report: string; verdict: string; conditions?: string },
): Promise<SequenceLogEntry> {
  const taskLogs = await loadSequenceTaskLogs(projectRoot, seqId);

  if (taskLogs.length === 0) {
    const tasksDir = getTasksDir(projectRoot);
    if (await exists(tasksDir)) {
      const allFiles = await listFiles('*.json', tasksDir);
      for (const file of allFiles) {
        if (file.toLowerCase().includes(seqId.toLowerCase())) {
          try {
            const data = await fs.readJson(path.join(tasksDir, file));
            taskLogs.push({ file, data });
          } catch { /* skip */ }
        }
      }
    }
  }

  const stats = aggregateSequenceStats(taskLogs);
  const now = getTimestamp();

  const timestamps = taskLogs
    .map(t => t.data.completed_at ? new Date(t.data.completed_at).getTime() : 0)
    .filter(t => t > 0);
  const startedAt = taskLogs[0]?.data.started_at || taskLogs[0]?.data.completed_at || now;
  const duration = timestamps.length >= 2
    ? Math.max(...timestamps) - Math.min(...timestamps)
    : 0;

  const meanDuration = stats.durations.length > 0
    ? stats.durations.reduce((a, b) => a + b, 0) / stats.durations.length
    : 0;

  return {
    schema_version: LOG_SCHEMA_VERSION,
    trace: { phase_id: options.phase, sequence_id: seqId },
    execution: {
      status: stats.failure > 0 ? 'partial' : 'completed',
      started_at: startedAt,
      completed_at: now,
      duration_ms: duration,
    },
    tasks: {
      total: stats.total,
      success: stats.success,
      failure: stats.failure,
      error: stats.error,
      rework: stats.rework,
      first_pass_success_rate: stats.first_pass_success_rate,
      final_success_rate: stats.final_success_rate,
    },
    analysis: {
      axis_1_consistency: makeAxisPlaceholder(),
      axis_2_ssot_conformance: makeAxisPlaceholder(),
      axis_3_cross_sequence: { ...makeAxisPlaceholder(), prev_sequence: null },
    },
    dora_derived: {
      change_failure_rate: stats.total > 0 ? stats.failure / stats.total : 0,
      rework_rate: stats.total > 0 ? stats.rework / stats.total : 0,
      mean_task_duration_ms: meanDuration,
      recovery_time_ms: null,
    },
    verdict: {
      proceed: options.verdict !== 'hold',
      conditions: options.conditions ? options.conditions.split(',').map(c => c.trim()) : [],
      report_path: options.report,
    },
  };
}

/**
 * Auto-feedback: L2/L3 이슈가 enrich로 들어오면 자동 피드백 라우팅
 */
async function autoFeedbackFromIssues(projectRoot: string, semantic: TaskSemantic): Promise<void> {
  const issues = semantic.issues || [];
  const l2l3Issues = issues.filter(i => i.level >= 2);
  if (l2l3Issues.length === 0) return;

  try {
    const state = await loadWorkflowState(projectRoot);
    if (!state.automation.feedback) return;

    for (const issue of l2l3Issues) {
      try {
        const { execFileSync } = await import('child_process');
        execFileSync(
          'npx',
          ['tsq', 'feedback', 'route', issue.description],
          { cwd: projectRoot, timeout: 10000, stdio: 'ignore' },
        );
      } catch { /* 피드백 라우팅 실패 무시 */ }
    }
  } catch { /* 자동 피드백 실패 무시 */ }
}

/**
 * Core: build PhaseGateResult (no I/O side effects except reading sequence logs)
 */
export async function buildPhaseGateData(
  projectRoot: string,
  phaseId: string,
): Promise<PhaseGateResult> {
  const seqDir = getSequencesDir(projectRoot);
  const result: PhaseGateResult = {
    phase_id: phaseId,
    can_transition: true,
    missing_sequences: [],
    missing_reports: [],
    blocking_conditions: [],
  };

  if (!await exists(seqDir)) {
    result.can_transition = false;
    result.blocking_conditions.push('No sequence logs directory');
    return result;
  }

  const files = await listFiles('*.json', seqDir);
  const phaseSeqs: SequenceLogEntry[] = [];

  for (const file of files) {
    try {
      const data: SequenceLogEntry = await fs.readJson(path.join(seqDir, file));
      if (data.trace.phase_id === phaseId) {
        phaseSeqs.push(data);
      }
    } catch { /* skip */ }
  }

  if (phaseSeqs.length === 0) {
    result.can_transition = false;
    result.blocking_conditions.push('No sequence logs found for this phase');
    return result;
  }

  for (const seq of phaseSeqs) {
    if (!seq.verdict.proceed) {
      result.can_transition = false;
      result.blocking_conditions.push(`${seq.trace.sequence_id}: verdict is HOLD`);
    }
    if (seq.verdict.report_path) {
      const reportPath = path.resolve(projectRoot, seq.verdict.report_path);
      if (!await exists(reportPath)) {
        result.can_transition = false;
        result.missing_reports.push(seq.verdict.report_path);
      }
    }
    if (seq.verdict.conditions.length > 0) {
      for (const c of seq.verdict.conditions) {
        result.blocking_conditions.push(`${seq.trace.sequence_id}: condition "${c}"`);
      }
    }
  }

  // Check unresolved L2/L3 feedback
  try {
    const state = await loadWorkflowState(projectRoot);
    if (state.pending_feedback?.length > 0) {
      const feedbackDir = path.join(projectRoot, '.timsquad', 'feedback');
      for (const fbId of state.pending_feedback) {
        const fbPath = path.join(feedbackDir, `${fbId}.json`);
        if (await exists(fbPath)) {
          const fb: FeedbackEntry = await fs.readJson(fbPath);
          if (!fb.status || fb.status === 'open' || fb.status === 'in_review') {
            result.can_transition = false;
            result.blocking_conditions.push(
              `Unresolved L${fb.level} feedback: ${fbId} (${fb.trigger})`,
            );
          }
        }
      }
    }
  } catch { /* workflow state unavailable — skip feedback check */ }

  return result;
}

async function createSequenceLog(
  seqId: string,
  options: { phase: string; report: string; verdict: string; conditions?: string },
): Promise<void> {
  const projectRoot = await findProjectRoot();
  if (!projectRoot) throw new Error('Not a TimSquad project');

  const entry = await buildSequenceLogData(projectRoot, seqId, options);

  const seqDir = getSequencesDir(projectRoot);
  await fs.ensureDir(seqDir);
  await fs.writeJson(path.join(seqDir, `${seqId}.json`), entry, { spaces: 2 });

  printSuccess(`Sequence log created: ${seqId}.json`);
  printKeyValue('Tasks', `${entry.tasks.success}/${entry.tasks.total} success`);
  printKeyValue('Verdict', entry.verdict.proceed ? 'PROCEED' : 'HOLD');
}

async function checkSequence(seqId: string): Promise<void> {
  const projectRoot = await findProjectRoot();
  if (!projectRoot) throw new Error('Not a TimSquad project');

  const taskLogs = await loadSequenceTaskLogs(projectRoot, seqId);

  printHeader(`Sequence Check: ${seqId}`);
  printKeyValue('Task Logs Found', String(taskLogs.length));

  if (taskLogs.length === 0) {
    console.log(colors.dim('  No task logs found for this sequence'));
    return;
  }

  let withSemantic = 0;
  for (const { file, data } of taskLogs) {
    const sem = hasSemantic(data.semantic) ? colors.success('✓ semantic') : colors.warning('○ no semantic');
    const status = data.status === 'completed' ? '✓' : '✗';
    console.log(`  ${status} ${colors.agent(data.agent || '?')} ${sem} ${colors.dim(file)}`);
    if (hasSemantic(data.semantic)) withSemantic++;
  }

  const coverage = Math.round((withSemantic / taskLogs.length) * 100);
  console.log('');
  printKeyValue('Semantic Coverage', `${coverage}% (${withSemantic}/${taskLogs.length})`);

  if (coverage < 100) {
    console.log(colors.warning('\n  ⚠ Run tsq log enrich for tasks missing semantic data'));
  }
}

// ============================================================
// Step 5: tsq log phase (L3) + Gate
// ============================================================

async function listPhaseLogs(): Promise<void> {
  const projectRoot = await findProjectRoot();
  if (!projectRoot) throw new Error('Not a TimSquad project');

  const phaseDir = getPhasesDir(projectRoot);
  if (!await exists(phaseDir)) {
    console.log(colors.dim('No phase logs found'));
    return;
  }

  const files = await listFiles('*.json', phaseDir);
  if (files.length === 0) {
    console.log(colors.dim('No phase logs found'));
    return;
  }

  printHeader(`Phase Logs (${files.length})`);

  for (const file of files.sort()) {
    try {
      const data: PhaseLogEntry = await fs.readJson(path.join(phaseDir, file));
      const phaseId = data.trace.phase_id;
      const status = data.execution.status;
      const seqs = `${data.sequences.completed}/${data.sequences.total} sequences`;
      console.log(`  ${colors.agent(phaseId)} [${status}] ${seqs}`);
    } catch {
      console.log(`  ${colors.dim(file)} (unreadable)`);
    }
  }
}

async function viewPhaseLog(phaseId: string): Promise<void> {
  const projectRoot = await findProjectRoot();
  if (!projectRoot) throw new Error('Not a TimSquad project');

  const filePath = path.join(getPhasesDir(projectRoot), `${phaseId}.json`);
  if (!await exists(filePath)) {
    throw new Error(`Phase log not found: ${phaseId}`);
  }

  const data: PhaseLogEntry = await fs.readJson(filePath);

  printHeader(`Phase: ${phaseId}`);
  printKeyValue('Status', data.execution.status);
  printKeyValue('Duration', `${(data.execution.duration_ms / 1000 / 60).toFixed(1)} min`);
  printKeyValue('Sessions', String(data.execution.sessions_count));

  console.log(colors.subheader('\n  Sequences'));
  printKeyValue('  Total', String(data.sequences.total));
  printKeyValue('  Completed', String(data.sequences.completed));
  printKeyValue('  Blocked', String(data.sequences.blocked));
  console.log(`    IDs: ${data.sequences.ids.join(', ')}`);

  console.log(colors.subheader('\n  Metrics'));
  printKeyValue('  Tasks', String(data.aggregate_metrics.total_tasks));
  printKeyValue('  Success Rate', `${(data.aggregate_metrics.task_success_rate * 100).toFixed(0)}%`);
  printKeyValue('  Rework Rate', `${(data.aggregate_metrics.task_rework_rate * 100).toFixed(0)}%`);
  printKeyValue('  Files Changed', String(data.aggregate_metrics.total_files_changed));
  printKeyValue('  SSOT Conformance', `${(data.aggregate_metrics.ssot_conformance_rate * 100).toFixed(0)}%`);

  console.log(colors.subheader('\n  DORA'));
  printKeyValue('  Lead Time', `${(data.dora_derived.lead_time_ms / 1000 / 60).toFixed(1)} min`);
  printKeyValue('  Change Failure Rate', `${(data.dora_derived.change_failure_rate * 100).toFixed(0)}%`);

  if (data.retrospective.keep.length || data.retrospective.problem.length || data.retrospective.try.length) {
    console.log(colors.subheader('\n  Retrospective'));
    if (data.retrospective.keep.length) {
      console.log('    Keep:');
      data.retrospective.keep.forEach(k => console.log(`      + ${k}`));
    }
    if (data.retrospective.problem.length) {
      console.log('    Problem:');
      data.retrospective.problem.forEach(p => console.log(`      - ${p}`));
    }
    if (data.retrospective.try.length) {
      console.log('    Try:');
      data.retrospective.try.forEach(t => console.log(`      → ${t}`));
    }
  }
}

async function createPhaseLog(
  phaseId: string,
  options: { sequences: string; retroKeep?: string; retroProblem?: string; retroTry?: string },
): Promise<void> {
  const projectRoot = await findProjectRoot();
  if (!projectRoot) throw new Error('Not a TimSquad project');

  const seqIds = options.sequences.split(',').map(s => s.trim());
  const seqDir = getSequencesDir(projectRoot);
  const now = getTimestamp();

  // Load sequence logs
  const seqLogs: SequenceLogEntry[] = [];
  let completed = 0, blocked = 0;

  for (const id of seqIds) {
    const seqPath = path.join(seqDir, `${id}.json`);
    if (await exists(seqPath)) {
      const data: SequenceLogEntry = await fs.readJson(seqPath);
      seqLogs.push(data);
      if (data.execution.status === 'completed') completed++;
      else blocked++;
    } else {
      blocked++;
    }
  }

  // Aggregate
  let totalTasks = 0, totalSuccess = 0, totalRework = 0, totalFiles = 0;
  let totalIssues1 = 0, totalIssues2 = 0, totalIssues3 = 0;
  const durations: number[] = [];

  for (const seq of seqLogs) {
    totalTasks += seq.tasks.total;
    totalSuccess += seq.tasks.success;
    totalRework += seq.tasks.rework;
    durations.push(seq.execution.duration_ms);

    // Count issues from analysis axes
    for (const axis of Object.values(seq.analysis)) {
      const r = axis as AxisResult;
      for (const issue of r.issues) {
        if (issue.level === 1) totalIssues1++;
        else if (issue.level === 2) totalIssues2++;
        else totalIssues3++;
      }
    }
  }

  // Collect total files from task logs
  for (const seqId of seqIds) {
    const taskLogs = await loadSequenceTaskLogs(projectRoot, seqId);
    for (const { data } of taskLogs) {
      totalFiles += data.mechanical?.files?.length || 0;
    }
  }

  const timestamps = seqLogs
    .map(s => [new Date(s.execution.started_at).getTime(), new Date(s.execution.completed_at).getTime()])
    .flat()
    .filter(t => t > 0);
  const leadTime = timestamps.length >= 2 ? Math.max(...timestamps) - Math.min(...timestamps) : 0;

  const entry: PhaseLogEntry = {
    schema_version: LOG_SCHEMA_VERSION,
    trace: { phase_id: phaseId },
    execution: {
      status: blocked > 0 ? 'aborted' : 'completed',
      started_at: seqLogs[0]?.execution.started_at || now,
      completed_at: now,
      duration_ms: leadTime,
      sessions_count: seqLogs.length,
    },
    sequences: { total: seqIds.length, completed, blocked, ids: seqIds },
    aggregate_metrics: {
      total_tasks: totalTasks,
      task_success_rate: totalTasks > 0 ? totalSuccess / totalTasks : 0,
      task_rework_rate: totalTasks > 0 ? totalRework / totalTasks : 0,
      total_files_changed: totalFiles,
      total_issues: { level_1: totalIssues1, level_2: totalIssues2, level_3: totalIssues3 },
      ssot_conformance_rate: 0, // Placeholder — from architect reports
      mean_sequence_duration_ms: durations.length > 0 ? durations.reduce((a, b) => a + b, 0) / durations.length : 0,
    },
    dora_derived: {
      lead_time_ms: leadTime,
      change_failure_rate: totalTasks > 0 ? (totalTasks - totalSuccess) / totalTasks : 0,
      mean_recovery_time_ms: null,
    },
    planning: {
      original_sequences: seqIds,
      added_sequences: [],
      removed_sequences: [],
      scope_changes: [],
      plan_adherence_rate: 1,
    },
    retrospective: {
      keep: options.retroKeep ? options.retroKeep.split(',').map(s => s.trim()) : [],
      problem: options.retroProblem ? options.retroProblem.split(',').map(s => s.trim()) : [],
      try: options.retroTry ? options.retroTry.split(',').map(s => s.trim()) : [],
    },
    knowledge_extracted: [],
  };

  const phaseDir = getPhasesDir(projectRoot);
  await fs.ensureDir(phaseDir);
  await fs.writeJson(path.join(phaseDir, `${phaseId}.json`), entry, { spaces: 2 });

  printSuccess(`Phase log created: ${phaseId}.json`);
  printKeyValue('Sequences', `${completed}/${seqIds.length} completed`);
  printKeyValue('Tasks', `${totalSuccess}/${totalTasks} success`);
}

async function checkPhaseGate(phaseId: string): Promise<void> {
  const projectRoot = await findProjectRoot();
  if (!projectRoot) throw new Error('Not a TimSquad project');

  const result = await buildPhaseGateData(projectRoot, phaseId);

  printHeader(`Phase Gate: ${phaseId}`);

  if (result.can_transition) {
    console.log(colors.success('\n  ✓ PASSED — Phase transition allowed'));
  } else {
    console.log(colors.error('\n  ✗ BLOCKED — Phase transition denied'));

    if (result.missing_reports.length > 0) {
      console.log(colors.subheader('\n  Missing Reports'));
      for (const r of result.missing_reports) {
        console.log(`    - ${r}`);
      }
    }

    if (result.blocking_conditions.length > 0) {
      console.log(colors.subheader('\n  Blocking Conditions'));
      for (const c of result.blocking_conditions) {
        console.log(`    - ${c}`);
      }
    }
  }
}

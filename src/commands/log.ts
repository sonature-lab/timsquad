import { Command } from 'commander';
import path from 'path';
import fs from 'fs-extra';
import { colors, printHeader, printError, printSuccess, printKeyValue } from '../utils/colors.js';
import { findProjectRoot } from '../lib/project.js';
import { exists, readFile, writeFile, listFiles } from '../utils/fs.js';
import { getDateString, getTimeString, getTimestamp } from '../utils/date.js';
const LOG_TYPES = ['work', 'decision', 'error', 'feedback', 'handoff'] as const;
type LogType = typeof LOG_TYPES[number];

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

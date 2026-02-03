import { Command } from 'commander';
import path from 'path';
import { colors, printHeader, printError, printSuccess } from '../utils/colors.js';
import { findProjectRoot } from '../lib/project.js';
import { exists, readFile, writeFile, listFiles } from '../utils/fs.js';
import { getDateString, getTimeString } from '../utils/date.js';
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

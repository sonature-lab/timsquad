import { Command } from 'commander';
import path from 'path';
import chokidar from 'chokidar';
import { colors, printHeader, printError, printSuccess, printKeyValue } from '../utils/colors.js';
import { findProjectRoot } from '../lib/project.js';
import { exists, writeFile, readFile } from '../utils/fs.js';
import { getTimestamp } from '../utils/date.js';

interface WatchState {
  running: boolean;
  startedAt?: string;
  watchedPaths: string[];
  changeCount: number;
}

export function registerWatchCommand(program: Command): void {
  const watchCmd = program
    .command('watch')
    .description('SSOT file watcher');

  // tsq watch start
  watchCmd
    .command('start')
    .description('Start watching SSOT files')
    .action(async () => {
      try {
        await startWatch();
      } catch (error) {
        printError((error as Error).message);
        process.exit(1);
      }
    });

  // tsq watch stop
  watchCmd
    .command('stop')
    .description('Stop watching')
    .action(async () => {
      try {
        await stopWatch();
      } catch (error) {
        printError((error as Error).message);
        process.exit(1);
      }
    });

  // tsq watch status
  watchCmd
    .command('status')
    .description('Show watch status')
    .action(async () => {
      try {
        await showWatchStatus();
      } catch (error) {
        printError((error as Error).message);
        process.exit(1);
      }
    });
}

async function getWatchState(projectRoot: string): Promise<WatchState> {
  const statePath = path.join(projectRoot, '.timsquad', 'state', 'watch-state.json');

  if (!await exists(statePath)) {
    return {
      running: false,
      watchedPaths: [],
      changeCount: 0,
    };
  }

  try {
    const content = await readFile(statePath);
    return JSON.parse(content);
  } catch {
    return {
      running: false,
      watchedPaths: [],
      changeCount: 0,
    };
  }
}

async function saveWatchState(projectRoot: string, state: WatchState): Promise<void> {
  const statePath = path.join(projectRoot, '.timsquad', 'state', 'watch-state.json');
  await writeFile(statePath, JSON.stringify(state, null, 2));
}

async function startWatch(): Promise<void> {
  const projectRoot = await findProjectRoot();
  if (!projectRoot) {
    throw new Error('Not a TimSquad project');
  }

  const state = await getWatchState(projectRoot);

  if (state.running) {
    console.log(colors.warning('Watch already running'));
    console.log(colors.dim(`Started at: ${state.startedAt}`));
    return;
  }

  printHeader('SSOT File Watcher');

  const ssotDir = path.join(projectRoot, '.timsquad', 'ssot');
  const watchPaths = [
    path.join(ssotDir, '**/*.md'),
    path.join(ssotDir, '**/*.yaml'),
  ];

  console.log(colors.subheader('Watching:'));
  console.log(colors.path(`  ${ssotDir}`));
  console.log('');

  // Initialize watcher
  const watcher = chokidar.watch(watchPaths, {
    persistent: true,
    ignoreInitial: true,
    awaitWriteFinish: {
      stabilityThreshold: 500,
      pollInterval: 100,
    },
  });

  let changeCount = 0;
  const changeLog: string[] = [];

  watcher
    .on('change', (filePath) => {
      changeCount++;
      const relativePath = path.relative(projectRoot, filePath);
      const timestamp = getTimestamp();
      const logEntry = `[${timestamp}] Modified: ${relativePath}`;

      console.log(colors.warning(`📝 ${logEntry}`));
      changeLog.push(logEntry);

      // Log to file
      logChange(projectRoot, 'modified', relativePath);
    })
    .on('add', (filePath) => {
      changeCount++;
      const relativePath = path.relative(projectRoot, filePath);
      const timestamp = getTimestamp();
      const logEntry = `[${timestamp}] Added: ${relativePath}`;

      console.log(colors.success(`➕ ${logEntry}`));
      changeLog.push(logEntry);

      logChange(projectRoot, 'added', relativePath);
    })
    .on('unlink', (filePath) => {
      changeCount++;
      const relativePath = path.relative(projectRoot, filePath);
      const timestamp = getTimestamp();
      const logEntry = `[${timestamp}] Deleted: ${relativePath}`;

      console.log(colors.error(`➖ ${logEntry}`));
      changeLog.push(logEntry);

      logChange(projectRoot, 'deleted', relativePath);
    })
    .on('error', (error) => {
      printError(`Watcher error: ${error.message}`);
    });

  // Update state
  state.running = true;
  state.startedAt = getTimestamp();
  state.watchedPaths = watchPaths;
  state.changeCount = 0;
  await saveWatchState(projectRoot, state);

  printSuccess('Watcher started');
  console.log(colors.dim('\nPress Ctrl+C to stop'));
  console.log(colors.dim('Or run: tsq watch stop'));

  // Handle process termination
  const cleanup = async () => {
    console.log(colors.dim('\n\nStopping watcher...'));
    await watcher.close();

    state.running = false;
    state.changeCount = changeCount;
    await saveWatchState(projectRoot, state);

    printSuccess(`Watcher stopped. ${changeCount} changes detected.`);
    process.exit(0);
  };

  process.on('SIGINT', cleanup);
  process.on('SIGTERM', cleanup);
}

async function stopWatch(): Promise<void> {
  const projectRoot = await findProjectRoot();
  if (!projectRoot) {
    throw new Error('Not a TimSquad project');
  }

  const state = await getWatchState(projectRoot);

  if (!state.running) {
    console.log(colors.dim('No watcher running'));
    return;
  }

  // Mark as stopped (actual process should handle cleanup)
  state.running = false;
  await saveWatchState(projectRoot, state);

  printSuccess('Watcher marked as stopped');
  console.log(colors.dim('If the process is still running, press Ctrl+C'));
}

async function showWatchStatus(): Promise<void> {
  const projectRoot = await findProjectRoot();
  if (!projectRoot) {
    throw new Error('Not a TimSquad project');
  }

  const state = await getWatchState(projectRoot);

  printHeader('Watch Status');
  printKeyValue('Status', state.running ? 'Running' : 'Stopped');

  if (state.startedAt) {
    printKeyValue('Started at', state.startedAt);
  }

  printKeyValue('Changes detected', String(state.changeCount));

  if (state.watchedPaths.length > 0) {
    console.log(colors.subheader('\nWatched paths:'));
    state.watchedPaths.forEach(p => {
      console.log(colors.dim(`  ${p}`));
    });
  }
}

async function logChange(
  projectRoot: string,
  action: string,
  filePath: string
): Promise<void> {
  const logDir = path.join(projectRoot, '.timsquad', 'logs');
  const logFile = path.join(logDir, 'ssot-changes.log');

  const timestamp = getTimestamp();
  const logEntry = `${timestamp} | ${action.toUpperCase().padEnd(8)} | ${filePath}\n`;

  try {
    let content = '';
    if (await exists(logFile)) {
      content = await readFile(logFile);
    }
    content += logEntry;
    await writeFile(logFile, content);
  } catch {
    // Ignore logging errors
  }
}

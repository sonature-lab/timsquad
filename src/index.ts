#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import { registerInitCommand } from './commands/init.js';
import { registerStatusCommand } from './commands/status.js';
import { registerLogCommand } from './commands/log.js';
import { registerRetroCommand } from './commands/retro.js';
import { registerFeedbackCommand } from './commands/feedback.js';
import { registerQuickCommand } from './commands/quick.js';
import { registerFullCommand } from './commands/full.js';
import { registerCommitCommand } from './commands/git/commit.js';
import { registerPRCommand } from './commands/git/pr.js';
import { registerReleaseCommand } from './commands/git/release.js';
import { registerSyncCommand } from './commands/git/sync.js';
import { registerWatchCommand } from './commands/watch.js';
import { registerMetricsCommand } from './commands/metrics.js';

const program = new Command();

program
  .name('tsq')
  .description('TimSquad - AI Agent Development Process Framework')
  .version('2.0.0');

// Register all commands
registerInitCommand(program);
registerStatusCommand(program);
registerLogCommand(program);
registerRetroCommand(program);
registerFeedbackCommand(program);
registerQuickCommand(program);
registerFullCommand(program);
registerCommitCommand(program);
registerPRCommand(program);
registerReleaseCommand(program);
registerSyncCommand(program);
registerWatchCommand(program);
registerMetricsCommand(program);

// Default action (show help)
program.action(() => {
  console.log(chalk.cyan.bold('\n  TimSquad v2.0.0'));
  console.log(chalk.gray('  AI Agent Development Process Framework\n'));
  program.help();
});

// Parse arguments
program.parse(process.argv);

// Show help if no arguments
if (process.argv.length === 2) {
  console.log(chalk.cyan.bold('\n  TimSquad v2.0.0'));
  console.log(chalk.gray('  AI Agent Development Process Framework\n'));
  program.help();
}

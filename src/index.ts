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
import { registerImproveCommand } from './commands/improve.js';
import { registerSessionCommand } from './commands/session.js';
import { registerMetaIndexCommand } from './commands/meta-index.js';
import { registerKnowledgeCommand } from './commands/knowledge.js';
import { registerWorkflowCommand } from './commands/workflow.js';
import { registerDaemonCommand } from './commands/daemon.js';
import { registerUpgradeCommand } from './commands/upgrade.js';
import { checkForUpdates } from './lib/update-check.js';
import { getInstalledVersion } from './lib/version.js';

const program = new Command();
const VERSION = getInstalledVersion();

program
  .name('tsq')
  .description('TimSquad - AI Agent Development Process Framework')
  .version(VERSION);

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
registerImproveCommand(program);
registerSessionCommand(program);
registerMetaIndexCommand(program);
registerKnowledgeCommand(program);
registerWorkflowCommand(program);
registerDaemonCommand(program);
registerUpgradeCommand(program);

// Default action (show help)
program.action(() => {
  console.log(chalk.cyan.bold(`\n  TimSquad v${VERSION}`));
  console.log(chalk.gray('  AI Agent Development Process Framework\n'));
  program.help();
});

// Check for updates (non-blocking, after command execution)
program.hook('postAction', async () => {
  await checkForUpdates();
});

// Parse arguments
program.parse(process.argv);

// Show help if no arguments
if (process.argv.length === 2) {
  console.log(chalk.cyan.bold(`\n  TimSquad v${VERSION}`));
  console.log(chalk.gray('  AI Agent Development Process Framework\n'));
  program.help();
}

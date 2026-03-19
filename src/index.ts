#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import { registerInitCommand } from './commands/init.js';
import { registerUpdateCommand } from './commands/update.js';
import { registerDaemonCommand } from './commands/daemon.js';
import { registerNextCommand } from './commands/next.js';
import { registerPlanCommand } from './commands/plan.js';
import { registerSpecCommand } from './commands/spec.js';
import { registerLogCommand } from './commands/log.js';
import { registerStatusCommand } from './commands/status.js';
import { registerRetroCommand } from './commands/retro.js';
import { registerAuditCommand } from './commands/audit.js';
import { checkForUpdates } from './lib/update-check.js';
import { getInstalledVersion } from './lib/version.js';

const program = new Command();
const VERSION = getInstalledVersion();

program
  .name('tsq')
  .description('TimSquad - AI Agent Development Process Framework')
  .version(VERSION);

// Register commands
registerInitCommand(program);
registerUpdateCommand(program);
registerDaemonCommand(program);
registerNextCommand(program);
registerPlanCommand(program);
registerSpecCommand(program);
registerLogCommand(program);
registerStatusCommand(program);
registerRetroCommand(program);
registerAuditCommand(program);

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

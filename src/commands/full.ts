import { Command } from 'commander';
import path from 'path';
import { colors, printHeader, printError, printSuccess, printKeyValue } from '../utils/colors.js';
import { findProjectRoot, getSSOTStatus, getCurrentPhase } from '../lib/project.js';
import { exists, writeFile, readFile } from '../utils/fs.js';
import { getDateString, getTimeString } from '../utils/date.js';

export function registerFullCommand(program: Command): void {
  program
    .command('f <task>')
    .alias('full')
    .description('Full mode with SSOT checks and Planner routing')
    .action(async (task: string) => {
      try {
        await runFullMode(task);
      } catch (error) {
        printError((error as Error).message);
        process.exit(1);
      }
    });
}

async function runFullMode(task: string): Promise<void> {
  const projectRoot = await findProjectRoot();
  if (!projectRoot) {
    throw new Error('Not a TimSquad project. Run "tsq init" first.');
  }

  printHeader('Full Mode');

  printKeyValue('Task', task);

  // Get current phase
  const phase = await getCurrentPhase(projectRoot);
  printKeyValue('Current Phase', phase.current);

  // Check SSOT status
  const ssotDocs = await getSSOTStatus(projectRoot);
  const filledDocs = ssotDocs.filter(d => d.filled && d.required);
  const requiredDocs = ssotDocs.filter(d => d.required);

  printKeyValue('SSOT Status', `${filledDocs.length}/${requiredDocs.length} documents ready`);

  console.log('');

  // Warn about incomplete SSOT
  const missingDocs = requiredDocs.filter(d => !d.filled);
  if (missingDocs.length > 0) {
    console.log(colors.warning('⚠ Missing required SSOT documents:'));
    missingDocs.forEach(doc => {
      console.log(colors.dim(`  - ${doc.name}.md`));
    });
    console.log('');
  }

  // Log the full task
  await logFullTask(projectRoot, task, phase.current);

  printSuccess('Full task logged');

  console.log('');
  console.log(colors.subheader('Instructions for Claude:'));
  console.log(colors.dim('─'.repeat(50)));
  console.log(`Execute this task with full SSOT compliance:\n`);
  console.log(colors.highlight(`  ${task}\n`));
  console.log(colors.subheader('Required Steps:'));
  console.log(colors.dim('  0. Plan Review — 3축 검증 후 PASS/REVISE/ESCALATE 판정'));
  console.log(colors.dim('  1. Check SSOT documents for requirements'));
  console.log(colors.dim('  2. Validate against service-spec.md'));
  console.log(colors.dim('  3. Follow architecture patterns'));
  console.log(colors.dim('  4. Write tests (TDD)'));
  console.log(colors.dim('  5. Request QA review'));
  console.log(colors.dim('─'.repeat(50)));

  console.log('');
  console.log(colors.dim('SSOT documents:'));
  console.log(colors.path('  .timsquad/ssot/prd.md'));
  console.log(colors.path('  .timsquad/ssot/service-spec.md'));
  console.log(colors.path('  .timsquad/ssot/data-design.md'));
}

async function logFullTask(
  projectRoot: string,
  task: string,
  currentPhase: string
): Promise<void> {
  const date = getDateString();
  const time = getTimeString();
  const logDir = path.join(projectRoot, '.timsquad', 'logs');
  const logFile = path.join(logDir, `${date}-pm.md`);

  let content = '';
  if (await exists(logFile)) {
    content = await readFile(logFile);
  } else {
    content = `# PM Log - ${date}\n\n`;
  }

  content += `## ${time} [work] 📝\n\n`;
  content += `**Task**: ${task}\n`;
  content += `**Phase**: ${currentPhase}\n`;
  content += `**Mode**: Full (SSOT compliance)\n`;
  content += `**Status**: Pending assignment\n`;
  content += `\n---\n\n`;

  await writeFile(logFile, content);
}

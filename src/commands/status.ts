import { Command } from 'commander';
import { colors, printHeader, printError, printKeyValue } from '../utils/colors.js';
import { findProjectRoot, getProjectStatus } from '../lib/project.js';
import type { ProjectStatus } from '../types/index.js';
import { PROJECT_TYPE_DESCRIPTIONS, PROJECT_LEVEL_DESCRIPTIONS } from '../types/project.js';

interface StatusOptions {
  all?: boolean;
  ssot?: boolean;
  phase?: boolean;
  metrics?: boolean;
}

export function registerStatusCommand(program: Command): void {
  program
    .command('status')
    .description('Show project status')
    .option('-a, --all', 'Show all details')
    .option('-s, --ssot', 'Show SSOT status only')
    .option('-p, --phase', 'Show phase status only')
    .option('-m, --metrics', 'Show metrics only')
    .action(async (options: StatusOptions) => {
      try {
        await runStatus(options);
      } catch (error) {
        printError((error as Error).message);
        process.exit(1);
      }
    });
}

async function runStatus(options: StatusOptions): Promise<void> {
  // Find project root
  const projectRoot = await findProjectRoot();
  if (!projectRoot) {
    throw new Error('Not a TimSquad project. Run "tsq init" first.');
  }

  // Get full status
  const status = await getProjectStatus(projectRoot);

  // Show based on options
  if (options.ssot) {
    showSSOTStatus(status);
  } else if (options.phase) {
    showPhaseStatus(status);
  } else if (options.metrics) {
    showMetrics(status);
  } else {
    // Show all or default
    showFullStatus(status, options.all);
  }
}

function showFullStatus(status: ProjectStatus, showAll = false): void {
  printHeader('TimSquad Project Status');

  // Project info
  console.log(colors.subheader('Project'));
  printKeyValue('Name', status.project.name);
  printKeyValue('Type', `${status.project.type} (${PROJECT_TYPE_DESCRIPTIONS[status.project.type]})`);
  printKeyValue('Level', `${status.project.level} (${PROJECT_LEVEL_DESCRIPTIONS[status.project.level]})`);
  console.log('');

  // Phase
  showPhaseStatus(status);

  // SSOT
  showSSOTStatus(status);

  // Agents
  if (showAll || status.agents.length > 0) {
    console.log(colors.subheader('Agents'));
    if (status.agents.length === 0) {
      console.log(colors.dim('  No agents configured'));
    } else {
      status.agents.forEach(agent => {
        const modelColor = agent.model === 'opus' ? colors.primary : colors.dim;
        console.log(`  ${colors.agent(agent.name)} ${modelColor(`(${agent.model})`)}`);
      });
    }
    console.log('');
  }

  // Logs
  if (showAll || status.logs.total > 0) {
    console.log(colors.subheader('Logs'));
    printKeyValue('Total', String(status.logs.total));
    if (status.logs.recent.length > 0) {
      console.log(colors.dim('  Recent:'));
      status.logs.recent.forEach(log => {
        console.log(`    ${colors.path(log)}`);
      });
    }
    console.log('');
  }

  // Retrospective
  if (showAll) {
    showMetrics(status);
  }
}

function showPhaseStatus(status: ProjectStatus): void {
  console.log(colors.subheader('Phase'));

  const { phase } = status;
  const progressBar = createProgressBar(phase.progress);

  printKeyValue('Current', colors.phase(phase.current));
  printKeyValue('Started', phase.startedAt.split('T')[0]);
  console.log(`  ${colors.label('Progress:')} ${progressBar} ${phase.progress}%`);
  console.log('');
}

function showSSOTStatus(status: ProjectStatus): void {
  console.log(colors.subheader('SSOT Documents'));

  const required = status.ssot.filter(d => d.required);
  const optional = status.ssot.filter(d => !d.required);

  const filledCount = required.filter(d => d.filled).length;
  console.log(`  Required: ${colors.success(String(filledCount))}/${required.length}`);

  // Show required documents
  required.forEach(doc => {
    const icon = doc.filled ? colors.success('✓') : colors.warning('○');
    const name = doc.filled ? colors.value(doc.name) : colors.dim(doc.name);
    console.log(`    ${icon} ${name}`);
  });

  if (optional.length > 0) {
    const optionalFilled = optional.filter(d => d.filled).length;
    console.log(`  Optional: ${optionalFilled}/${optional.length}`);
  }

  console.log('');
}

function showMetrics(status: ProjectStatus): void {
  console.log(colors.subheader('Retrospective'));
  printKeyValue('Completed Cycles', String(status.retrospective.cycles));
  printKeyValue('Success Patterns', String(status.retrospective.patterns.success));
  printKeyValue('Failure Patterns', String(status.retrospective.patterns.failure));
  console.log('');
}

function createProgressBar(progress: number, width = 20): string {
  const filled = Math.round((progress / 100) * width);
  const empty = width - filled;
  return colors.success('█'.repeat(filled)) + colors.dim('░'.repeat(empty));
}

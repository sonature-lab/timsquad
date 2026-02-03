import { Command } from 'commander';
import path from 'path';
import fs from 'fs-extra';
import { colors, printHeader, printError, printSuccess, printKeyValue } from '../utils/colors.js';
import { findProjectRoot } from '../lib/project.js';
import { exists, writeFile, listFiles } from '../utils/fs.js';
import { getTimestamp } from '../utils/date.js';

interface RetroState {
  currentCycle: number;
  status: 'idle' | 'collecting' | 'analyzing' | 'reporting' | 'applying';
  startedAt?: string;
  collectedAt?: string;
  analyzedAt?: string;
}

export function registerRetroCommand(program: Command): void {
  const retroCmd = program
    .command('retro')
    .description('Retrospective learning system');

  // tsq retro start
  retroCmd
    .command('start')
    .description('Start a new retrospective cycle')
    .action(async () => {
      try {
        await startRetro();
      } catch (error) {
        printError((error as Error).message);
        process.exit(1);
      }
    });

  // tsq retro collect
  retroCmd
    .command('collect')
    .description('Collect logs and metrics')
    .action(async () => {
      try {
        await collectRetro();
      } catch (error) {
        printError((error as Error).message);
        process.exit(1);
      }
    });

  // tsq retro analyze
  retroCmd
    .command('analyze')
    .description('Analyze patterns (requires Claude)')
    .action(async () => {
      try {
        await analyzeRetro();
      } catch (error) {
        printError((error as Error).message);
        process.exit(1);
      }
    });

  // tsq retro report
  retroCmd
    .command('report')
    .description('Generate retrospective report')
    .action(async () => {
      try {
        await generateReport();
      } catch (error) {
        printError((error as Error).message);
        process.exit(1);
      }
    });

  // tsq retro apply
  retroCmd
    .command('apply')
    .description('Apply improvements')
    .action(async () => {
      try {
        await applyImprovements();
      } catch (error) {
        printError((error as Error).message);
        process.exit(1);
      }
    });

  // tsq retro status
  retroCmd
    .command('status')
    .description('Show retrospective status')
    .action(async () => {
      try {
        await showRetroStatus();
      } catch (error) {
        printError((error as Error).message);
        process.exit(1);
      }
    });
}

async function getRetroState(projectRoot: string): Promise<RetroState> {
  const statePath = path.join(projectRoot, '.timsquad', 'retrospective', 'state.json');

  if (!await exists(statePath)) {
    return { currentCycle: 0, status: 'idle' };
  }

  return fs.readJson(statePath);
}

async function saveRetroState(projectRoot: string, state: RetroState): Promise<void> {
  const statePath = path.join(projectRoot, '.timsquad', 'retrospective', 'state.json');
  await fs.ensureDir(path.dirname(statePath));
  await fs.writeJson(statePath, state, { spaces: 2 });
}

async function startRetro(): Promise<void> {
  const projectRoot = await findProjectRoot();
  if (!projectRoot) {
    throw new Error('Not a TimSquad project');
  }

  const state = await getRetroState(projectRoot);

  if (state.status !== 'idle') {
    throw new Error(`Retrospective cycle ${state.currentCycle} is already in progress (${state.status})`);
  }

  state.currentCycle += 1;
  state.status = 'collecting';
  state.startedAt = getTimestamp();

  await saveRetroState(projectRoot, state);

  printSuccess(`Started retrospective cycle ${state.currentCycle}`);
  console.log(colors.dim('\nNext: Run "tsq retro collect" to collect metrics'));
}

async function collectRetro(): Promise<void> {
  const projectRoot = await findProjectRoot();
  if (!projectRoot) {
    throw new Error('Not a TimSquad project');
  }

  const state = await getRetroState(projectRoot);

  if (state.status !== 'collecting') {
    throw new Error('No active retrospective. Run "tsq retro start" first');
  }

  printHeader(`Collecting Metrics - Cycle ${state.currentCycle}`);

  // Collect log stats
  const logsDir = path.join(projectRoot, '.timsquad', 'logs');
  const logFiles = await listFiles('*.md', logsDir);
  const recentLogs = logFiles.filter(f => !f.startsWith('_'));

  // Count by agent
  const agentStats: Record<string, number> = {};
  for (const file of recentLogs) {
    const match = file.match(/-([a-z]+)\.md$/);
    if (match) {
      const agent = match[1];
      agentStats[agent] = (agentStats[agent] || 0) + 1;
    }
  }

  // Create metrics JSON
  const metrics = {
    cycle: state.currentCycle,
    collectedAt: getTimestamp(),
    raw_data: {
      log_files: recentLogs.length,
      agents: agentStats,
    },
    summary: {
      total_logs: recentLogs.length,
      agents_active: Object.keys(agentStats).length,
    },
  };

  const metricsPath = path.join(
    projectRoot,
    '.timsquad',
    'retrospective',
    'metrics',
    `cycle-${state.currentCycle}.json`
  );
  await fs.ensureDir(path.dirname(metricsPath));
  await fs.writeJson(metricsPath, metrics, { spaces: 2 });

  state.status = 'analyzing';
  state.collectedAt = getTimestamp();
  await saveRetroState(projectRoot, state);

  printSuccess('Metrics collected');
  printKeyValue('Log files', String(recentLogs.length));
  printKeyValue('Active agents', String(Object.keys(agentStats).length));
  console.log(colors.dim('\nNext: Run "tsq retro analyze" to analyze patterns'));
}

async function analyzeRetro(): Promise<void> {
  const projectRoot = await findProjectRoot();
  if (!projectRoot) {
    throw new Error('Not a TimSquad project');
  }

  const state = await getRetroState(projectRoot);

  if (state.status !== 'analyzing') {
    throw new Error('Collect metrics first. Run "tsq retro collect"');
  }

  console.log(colors.warning('\n⚠ Pattern analysis requires Claude integration'));
  console.log(colors.dim('  This feature will analyze logs and suggest improvements'));
  console.log(colors.dim('  For now, marking as analyzed for manual review\n'));

  state.status = 'reporting';
  state.analyzedAt = getTimestamp();
  await saveRetroState(projectRoot, state);

  printSuccess('Analysis phase completed (manual review mode)');
  console.log(colors.dim('\nNext: Run "tsq retro report" to generate report'));
}

async function generateReport(): Promise<void> {
  const projectRoot = await findProjectRoot();
  if (!projectRoot) {
    throw new Error('Not a TimSquad project');
  }

  const state = await getRetroState(projectRoot);

  if (state.status !== 'reporting') {
    throw new Error('Analyze patterns first. Run "tsq retro analyze"');
  }

  // Load metrics
  const metricsPath = path.join(
    projectRoot,
    '.timsquad',
    'retrospective',
    'metrics',
    `cycle-${state.currentCycle}.json`
  );
  const metrics = await fs.readJson(metricsPath);

  // Generate report
  const report = `# Cycle ${state.currentCycle} Retrospective Report

## Period
- Started: ${state.startedAt}
- Collected: ${state.collectedAt}
- Generated: ${getTimestamp()}

## Metrics Summary

| Metric | Value |
|--------|-------|
| Total Logs | ${metrics.summary.total_logs} |
| Active Agents | ${metrics.summary.agents_active} |

## Agent Activity

${Object.entries(metrics.raw_data.agents).map(([agent, count]) => `- ${agent}: ${count} logs`).join('\n')}

## Patterns Identified

### Success Patterns
_Manual review required_

### Failure Patterns
_Manual review required_

## Improvement Suggestions
_Manual review required_

## Next Cycle Goals
- [ ] Review and update SSOT documents
- [ ] Address identified patterns
- [ ] Apply approved improvements

---
Generated by TimSquad v2.0.0
`;

  const reportPath = path.join(
    projectRoot,
    '.timsquad',
    'retrospective',
    'cycles',
    `cycle-${state.currentCycle}.md`
  );
  await fs.ensureDir(path.dirname(reportPath));
  await writeFile(reportPath, report);

  state.status = 'applying';
  await saveRetroState(projectRoot, state);

  printSuccess(`Report generated: cycle-${state.currentCycle}.md`);
  console.log(colors.path(`  ${reportPath}`));
  console.log(colors.dim('\nNext: Review report and run "tsq retro apply" to complete'));
}

async function applyImprovements(): Promise<void> {
  const projectRoot = await findProjectRoot();
  if (!projectRoot) {
    throw new Error('Not a TimSquad project');
  }

  const state = await getRetroState(projectRoot);

  if (state.status !== 'applying') {
    throw new Error('Generate report first. Run "tsq retro report"');
  }

  console.log(colors.warning('\n⚠ Improvement application requires manual review'));
  console.log(colors.dim('  1. Review the generated report'));
  console.log(colors.dim('  2. Update templates/prompts as needed'));
  console.log(colors.dim('  3. This cycle will be marked as complete\n'));

  state.status = 'idle';
  await saveRetroState(projectRoot, state);

  printSuccess(`Retrospective cycle ${state.currentCycle} completed!`);
}

async function showRetroStatus(): Promise<void> {
  const projectRoot = await findProjectRoot();
  if (!projectRoot) {
    throw new Error('Not a TimSquad project');
  }

  const state = await getRetroState(projectRoot);

  printHeader('Retrospective Status');
  printKeyValue('Current Cycle', String(state.currentCycle));
  printKeyValue('Status', state.status);

  if (state.startedAt) {
    printKeyValue('Started', state.startedAt.split('T')[0]);
  }

  // List completed cycles
  const cyclesDir = path.join(projectRoot, '.timsquad', 'retrospective', 'cycles');
  if (await exists(cyclesDir)) {
    const cycles = await listFiles('cycle-*.md', cyclesDir);
    if (cycles.length > 0) {
      console.log(colors.dim(`\nCompleted cycles: ${cycles.length}`));
    }
  }
}

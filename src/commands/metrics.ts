import { Command } from 'commander';
import path from 'path';
import fs from 'fs-extra';
import { colors, printHeader, printError, printSuccess, printKeyValue } from '../utils/colors.js';
import { findProjectRoot } from '../lib/project.js';
import { exists, readFile, listFiles } from '../utils/fs.js';
import { getDateString, getTimestamp } from '../utils/date.js';

interface MetricsData {
  collectedAt: string;
  period: {
    start: string;
    end: string;
  };
  logs: {
    total: number;
    byAgent: Record<string, number>;
    byType: Record<string, number>;
  };
  feedback: {
    total: number;
    byLevel: Record<string, number>;
  };
  ssot: {
    documentsCount: number;
    filledCount: number;
    completionRate: number;
  };
}

export function registerMetricsCommand(program: Command): void {
  const metricsCmd = program
    .command('metrics')
    .description('Collect and view project metrics');

  // tsq metrics collect
  metricsCmd
    .command('collect')
    .description('Collect metrics from logs')
    .option('-d, --days <days>', 'Days to analyze', '7')
    .action(async (options: { days: string }) => {
      try {
        await collectMetrics(parseInt(options.days, 10));
      } catch (error) {
        printError((error as Error).message);
        process.exit(1);
      }
    });

  // tsq metrics summary
  metricsCmd
    .command('summary')
    .description('Show metrics summary')
    .action(async () => {
      try {
        await showMetricsSummary();
      } catch (error) {
        printError((error as Error).message);
        process.exit(1);
      }
    });

  // tsq metrics export
  metricsCmd
    .command('export')
    .description('Export metrics to JSON')
    .option('-o, --output <file>', 'Output file path')
    .action(async (options: { output?: string }) => {
      try {
        await exportMetrics(options.output);
      } catch (error) {
        printError((error as Error).message);
        process.exit(1);
      }
    });
}

async function collectMetrics(days: number): Promise<void> {
  const projectRoot = await findProjectRoot();
  if (!projectRoot) {
    throw new Error('Not a TimSquad project');
  }

  printHeader('Collecting Metrics');
  printKeyValue('Period', `Last ${days} days`);

  const now = new Date();
  const startDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

  // Collect log statistics
  const logsDir = path.join(projectRoot, '.timsquad', 'logs');
  const logStats = await collectLogStats(logsDir, startDate);

  // Collect feedback statistics
  const feedbackStats = await collectFeedbackStats(logsDir, startDate);

  // Collect SSOT statistics
  const ssotDir = path.join(projectRoot, '.timsquad', 'ssot');
  const ssotStats = await collectSSOTStats(ssotDir);

  // Create metrics data
  const metrics: MetricsData = {
    collectedAt: getTimestamp(),
    period: {
      start: startDate.toISOString().split('T')[0],
      end: now.toISOString().split('T')[0],
    },
    logs: logStats,
    feedback: feedbackStats,
    ssot: ssotStats,
  };

  // Save metrics
  const metricsDir = path.join(projectRoot, '.timsquad', 'retrospective', 'metrics');
  await fs.ensureDir(metricsDir);

  const metricsFile = path.join(metricsDir, `metrics-${getDateString()}.json`);
  await fs.writeJson(metricsFile, metrics, { spaces: 2 });

  printSuccess('Metrics collected');
  console.log(colors.path(`\nSaved to: ${metricsFile}`));

  // Show summary
  console.log('');
  await displayMetrics(metrics);
}

async function collectLogStats(
  logsDir: string,
  startDate: Date
): Promise<MetricsData['logs']> {
  const stats: MetricsData['logs'] = {
    total: 0,
    byAgent: {},
    byType: {},
  };

  if (!await exists(logsDir)) {
    return stats;
  }

  const files = await listFiles('*.md', logsDir);
  const startDateStr = startDate.toISOString().split('T')[0];

  for (const file of files) {
    // Skip templates
    if (file.startsWith('_')) continue;

    // Parse filename: YYYY-MM-DD-agent.md
    const match = file.match(/^(\d{4}-\d{2}-\d{2})-([a-z]+)\.md$/);
    if (!match) continue;

    const [, dateStr, agent] = match;

    // Check date range
    if (dateStr < startDateStr) continue;

    stats.total++;
    stats.byAgent[agent] = (stats.byAgent[agent] || 0) + 1;

    // Count entries in the file
    try {
      const content = await readFile(path.join(logsDir, file));
      const workEntries = (content.match(/## \d{2}:\d{2}:\d{2} \[work\]/g) || []).length;
      const errorEntries = (content.match(/## \d{2}:\d{2}:\d{2} \[error\]/g) || []).length;
      const decisionEntries = (content.match(/## \d{2}:\d{2}:\d{2} \[decision\]/g) || []).length;

      stats.byType['work'] = (stats.byType['work'] || 0) + workEntries;
      stats.byType['error'] = (stats.byType['error'] || 0) + errorEntries;
      stats.byType['decision'] = (stats.byType['decision'] || 0) + decisionEntries;
    } catch {
      // Ignore read errors
    }
  }

  return stats;
}

async function collectFeedbackStats(
  logsDir: string,
  startDate: Date
): Promise<MetricsData['feedback']> {
  const stats: MetricsData['feedback'] = {
    total: 0,
    byLevel: {},
  };

  if (!await exists(logsDir)) {
    return stats;
  }

  const files = await listFiles('*-feedback.md', logsDir);
  const startDateStr = startDate.toISOString().split('T')[0];

  for (const file of files) {
    // Parse filename: YYYY-MM-DD-feedback.md
    const match = file.match(/^(\d{4}-\d{2}-\d{2})-feedback\.md$/);
    if (!match) continue;

    const [, dateStr] = match;

    // Check date range
    if (dateStr < startDateStr) continue;

    // Count feedback entries
    try {
      const content = await readFile(path.join(logsDir, file));

      const level1 = (content.match(/\[Level 1\]/g) || []).length;
      const level2 = (content.match(/\[Level 2\]/g) || []).length;
      const level3 = (content.match(/\[Level 3\]/g) || []).length;

      stats.byLevel['1'] = (stats.byLevel['1'] || 0) + level1;
      stats.byLevel['2'] = (stats.byLevel['2'] || 0) + level2;
      stats.byLevel['3'] = (stats.byLevel['3'] || 0) + level3;
      stats.total += level1 + level2 + level3;
    } catch {
      // Ignore read errors
    }
  }

  return stats;
}

async function collectSSOTStats(ssotDir: string): Promise<MetricsData['ssot']> {
  const stats: MetricsData['ssot'] = {
    documentsCount: 0,
    filledCount: 0,
    completionRate: 0,
  };

  if (!await exists(ssotDir)) {
    return stats;
  }

  const files = await listFiles('*.md', ssotDir);

  for (const file of files) {
    // Skip templates
    if (file.includes('template')) continue;

    stats.documentsCount++;

    // Check if document has content
    try {
      const content = await readFile(path.join(ssotDir, file));
      // Consider filled if more than 200 characters of non-template content
      const cleanContent = content
        .replace(/^#.*$/gm, '')
        .replace(/^\s*$/gm, '')
        .trim();

      if (cleanContent.length > 200) {
        stats.filledCount++;
      }
    } catch {
      // Ignore read errors
    }
  }

  stats.completionRate = stats.documentsCount > 0
    ? Math.round((stats.filledCount / stats.documentsCount) * 100)
    : 0;

  return stats;
}

async function showMetricsSummary(): Promise<void> {
  const projectRoot = await findProjectRoot();
  if (!projectRoot) {
    throw new Error('Not a TimSquad project');
  }

  printHeader('Metrics Summary');

  // Load latest metrics
  const metricsDir = path.join(projectRoot, '.timsquad', 'retrospective', 'metrics');

  if (!await exists(metricsDir)) {
    console.log(colors.dim('No metrics collected yet'));
    console.log(colors.dim('\nRun: tsq metrics collect'));
    return;
  }

  const files = await listFiles('metrics-*.json', metricsDir);
  files.sort().reverse();

  if (files.length === 0) {
    console.log(colors.dim('No metrics collected yet'));
    console.log(colors.dim('\nRun: tsq metrics collect'));
    return;
  }

  // Load latest metrics
  const latestFile = path.join(metricsDir, files[0]);
  const metrics: MetricsData = await fs.readJson(latestFile);

  await displayMetrics(metrics);
}

async function displayMetrics(metrics: MetricsData): Promise<void> {
  printKeyValue('Collected at', metrics.collectedAt);
  printKeyValue('Period', `${metrics.period.start} ~ ${metrics.period.end}`);

  console.log(colors.subheader('\n📊 Log Statistics'));
  printKeyValue('Total log files', String(metrics.logs.total));

  if (Object.keys(metrics.logs.byAgent).length > 0) {
    console.log(colors.dim('\nBy Agent:'));
    Object.entries(metrics.logs.byAgent)
      .sort((a, b) => b[1] - a[1])
      .forEach(([agent, count]) => {
        console.log(`  ${agent.padEnd(12)} ${colors.highlight(String(count))}`);
      });
  }

  if (Object.keys(metrics.logs.byType).length > 0) {
    console.log(colors.dim('\nBy Type:'));
    Object.entries(metrics.logs.byType)
      .sort((a, b) => b[1] - a[1])
      .forEach(([type, count]) => {
        console.log(`  ${type.padEnd(12)} ${colors.highlight(String(count))}`);
      });
  }

  console.log(colors.subheader('\n📝 Feedback Statistics'));
  printKeyValue('Total feedback', String(metrics.feedback.total));

  if (Object.keys(metrics.feedback.byLevel).length > 0) {
    console.log(colors.dim('\nBy Level:'));
    ['1', '2', '3'].forEach(level => {
      const count = metrics.feedback.byLevel[level] || 0;
      const label = level === '1' ? '구현 수정' : level === '2' ? '설계 수정' : '기획 수정';
      console.log(`  Level ${level} (${label.padEnd(6)}) ${colors.highlight(String(count))}`);
    });
  }

  console.log(colors.subheader('\n📄 SSOT Status'));
  printKeyValue('Documents', String(metrics.ssot.documentsCount));
  printKeyValue('Filled', String(metrics.ssot.filledCount));
  printKeyValue('Completion rate', `${metrics.ssot.completionRate}%`);
}

async function exportMetrics(outputPath?: string): Promise<void> {
  const projectRoot = await findProjectRoot();
  if (!projectRoot) {
    throw new Error('Not a TimSquad project');
  }

  // Load all metrics
  const metricsDir = path.join(projectRoot, '.timsquad', 'retrospective', 'metrics');

  if (!await exists(metricsDir)) {
    throw new Error('No metrics collected yet. Run: tsq metrics collect');
  }

  const files = await listFiles('metrics-*.json', metricsDir);
  if (files.length === 0) {
    throw new Error('No metrics collected yet. Run: tsq metrics collect');
  }

  // Load all metrics files
  const allMetrics: MetricsData[] = [];
  for (const file of files.sort()) {
    const data = await fs.readJson(path.join(metricsDir, file));
    allMetrics.push(data);
  }

  // Determine output path
  const output = outputPath || path.join(projectRoot, `timsquad-metrics-export-${getDateString()}.json`);

  // Export
  const exportData = {
    exportedAt: getTimestamp(),
    projectRoot,
    metricsCount: allMetrics.length,
    metrics: allMetrics,
  };

  await fs.writeJson(output, exportData, { spaces: 2 });

  printSuccess('Metrics exported');
  console.log(colors.path(`\n${output}`));
}

import { Command } from 'commander';
import path from 'path';
import fs from 'fs-extra';
import chalk from 'chalk';
import { colors, printHeader, printError, printSuccess, printKeyValue } from '../utils/colors.js';
import { findProjectRoot } from '../lib/project.js';
import { exists } from '../utils/fs.js';
import { getTimestamp } from '../utils/date.js';
import {
  rebuildIndex, updateIndex, detectDrift, appendPending,
  getMetaIndexDir, validateInterfaces,
} from '../lib/meta-index.js';
import { appendUIPending } from '../lib/ui-index.js';
import { queryDaemon, MetaCache, type SearchResult } from '../daemon/meta-cache.js';
import type { PendingEntry, MetaIndexSummary, DriftReport } from '../types/meta-index.js';
import type { UIPendingEntry } from '../types/ui-meta.js';

export function registerMetaIndexCommand(program: Command): void {
  const miCmd = program
    .command('meta-index')
    .alias('mi')
    .description('Code structure meta index management');

  // tsq mi rebuild
  miCmd
    .command('rebuild')
    .description('Full codebase AST parse and index rebuild')
    .option('--exclude <patterns>', 'Additional exclude patterns (comma-separated)')
    .action(async (options: { exclude?: string }) => {
      try {
        await runRebuild(options);
      } catch (error) {
        printError((error as Error).message);
        process.exit(1);
      }
    });

  // tsq mi update
  miCmd
    .command('update')
    .description('Incremental update (changed files only)')
    .option('--quiet', 'Suppress output')
    .action(async (options: { quiet?: boolean }) => {
      try {
        await runUpdate(options);
      } catch (error) {
        if (!options.quiet) printError((error as Error).message);
        process.exit(1);
      }
    });

  // tsq mi check
  miCmd
    .command('check')
    .description('Check for drift and interface consistency')
    .action(async () => {
      try {
        await runCheck();
      } catch (error) {
        printError((error as Error).message);
        process.exit(1);
      }
    });

  // tsq mi stage <file>
  miCmd
    .command('stage <file>')
    .description('Stage semantic data for a file/method')
    .option('--method <name>', 'Method name')
    .option('--algo <algorithm>', 'Algorithm used')
    .option('--tc <complexity>', 'Time complexity')
    .option('--sc <complexity>', 'Space complexity')
    .option('--fn <function>', 'Function classification')
    .option('--desc <description>', 'Description')
    .option('--pattern <pattern>', 'Architecture pattern')
    .option('--tag <tag>', 'Semantic tag')
    .option('--layout <type>', 'UI layout intent (flex-column, grid, stack)')
    .option('--color-scheme <scheme>', 'UI color scheme (primary, secondary)')
    .option('--spacing <level>', 'UI spacing (compact, normal, spacious)')
    .option('--responsive <breakpoints>', 'Responsive breakpoints (comma-separated)')
    .option('--state <definition>', 'UI state (name:trigger:visual:exit)')
    .action(async (file: string, options: StageOptions) => {
      try {
        await runStage(file, options);
      } catch (error) {
        printError((error as Error).message);
        process.exit(1);
      }
    });

  // tsq mi find <keyword>
  miCmd
    .command('find <keyword>')
    .description('Search meta index for classes, methods, interfaces')
    .option('--json', 'Output as JSON')
    .action(async (keyword: string, options: { json?: boolean }) => {
      try {
        await runFind(keyword, options);
      } catch (error) {
        printError((error as Error).message);
        process.exit(1);
      }
    });

  // tsq mi stats
  miCmd
    .command('stats')
    .description('Show meta index statistics and health score')
    .action(async () => {
      try {
        await runStats();
      } catch (error) {
        printError((error as Error).message);
        process.exit(1);
      }
    });
}

interface StageOptions {
  method?: string;
  algo?: string;
  tc?: string;
  sc?: string;
  fn?: string;
  desc?: string;
  pattern?: string;
  tag?: string;
  // UI options
  layout?: string;
  colorScheme?: string;
  spacing?: string;
  responsive?: string;
  state?: string;
}

// ── Find ──

async function runFind(keyword: string, options: { json?: boolean }): Promise<void> {
  const projectRoot = await findProjectRoot();
  if (!projectRoot) throw new Error('Not a TimSquad project');

  let results: SearchResult[];

  // 데몬 실행 중이면 IPC로 쿼리 (fast path)
  try {
    const response = await queryDaemon(projectRoot, 'find', { keyword }) as { results: SearchResult[] };
    results = response.results || [];
  } catch {
    // 데몬 미실행 → 디스크에서 직접 검색 (fallback)
    const cache = new MetaCache(projectRoot);
    await cache.load();
    results = cache.find(keyword);
  }

  if (options.json) {
    console.log(JSON.stringify(results, null, 2));
    return;
  }

  if (results.length === 0) {
    console.log(colors.dim(`  No results for "${keyword}"`));
    return;
  }

  printHeader(`Search: "${keyword}"`);
  console.log(colors.dim(`  ${results.length} result${results.length > 1 ? 's' : ''}\n`));

  for (const r of results) {
    const icon = r.type === 'class' ? 'C' : r.type === 'interface' ? 'I' : r.type === 'function' ? 'F' : r.type === 'method' ? 'M' : '·';
    const sig = r.signature ? colors.dim(` ${r.signature}`) : '';
    console.log(`  ${colors.primary(icon)} ${r.name}${sig}`);
    console.log(`    ${colors.path(r.path)}:${r.line} ${colors.dim(`[${r.module}]`)}`);
  }
}

// ── Rebuild ──

async function runRebuild(options: { exclude?: string }): Promise<void> {
  const projectRoot = await findProjectRoot();
  if (!projectRoot) {
    throw new Error('Not a TimSquad project. Run "tsq init" first.');
  }

  const excludePatterns = options.exclude?.split(',').map(s => s.trim());

  printHeader('Meta Index Rebuild');
  console.log(colors.dim('  Full codebase AST parsing...\n'));

  const summary = await rebuildIndex(projectRoot, excludePatterns);

  displaySummary(summary);
  const uiStr = summary.uiHealth ? `, ${summary.uiHealth.componentCount} components` : '';
  printSuccess(`\n  Index rebuilt: ${summary.totalFiles} files, ${summary.totalMethods} methods${uiStr}`);
}

// ── Update ──

async function runUpdate(options: { quiet?: boolean }): Promise<void> {
  const projectRoot = await findProjectRoot();
  if (!projectRoot) {
    throw new Error('Not a TimSquad project. Run "tsq init" first.');
  }

  const metaDir = getMetaIndexDir(projectRoot);
  if (!await exists(path.join(metaDir, 'summary.json'))) {
    if (!options.quiet) {
      console.log(colors.dim('  No existing index. Run "tsq mi rebuild" first.'));
    }
    return;
  }

  const summary = await updateIndex(projectRoot);

  if (!options.quiet) {
    printHeader('Meta Index Update');
    displaySummary(summary);
    printSuccess('  Index updated');
  }
}

// ── Check ──

async function runCheck(): Promise<void> {
  const projectRoot = await findProjectRoot();
  if (!projectRoot) {
    throw new Error('Not a TimSquad project. Run "tsq init" first.');
  }

  const metaDir = getMetaIndexDir(projectRoot);
  if (!await exists(path.join(metaDir, 'summary.json'))) {
    console.log(colors.dim('  No existing index. Run "tsq mi rebuild" first.'));
    return;
  }

  printHeader('Meta Index Check');

  // 1. Drift detection
  const drift = await detectDrift(projectRoot);
  displayDrift(drift);

  // 2. Interface validation
  console.log('');
  console.log(colors.subheader('  Interface Health'));
  const mismatches = await validateInterfaces(projectRoot);

  if (mismatches.length === 0) {
    console.log(chalk.green('  ✓ All exports properly imported'));
  } else {
    const unused = mismatches.filter(m => m.issue === 'unused_export');
    const missing = mismatches.filter(m => m.issue === 'missing_import');

    if (unused.length > 0) {
      console.log(chalk.yellow(`  ⚠ ${unused.length} unused export${unused.length > 1 ? 's' : ''}:`));
      for (const u of unused.slice(0, 10)) {
        console.log(colors.dim(`    ${u.exportFile}:${u.exportName}`));
      }
      if (unused.length > 10) {
        console.log(colors.dim(`    ... and ${unused.length - 10} more`));
      }
    }

    if (missing.length > 0) {
      console.log(chalk.red(`  ✗ ${missing.length} missing import${missing.length > 1 ? 's' : ''}:`));
      for (const m of missing.slice(0, 10)) {
        console.log(colors.dim(`    ${m.exportFile}:${m.exportName}`));
      }
    }
  }

  if (drift.drifted.length > 0) {
    console.log('');
    console.log(colors.dim('  → Run `tsq mi update` to re-index drifted files'));
  }
}

// ── Stage ──

async function runStage(file: string, options: StageOptions): Promise<void> {
  const projectRoot = await findProjectRoot();
  if (!projectRoot) {
    throw new Error('Not a TimSquad project. Run "tsq init" first.');
  }

  const entry: PendingEntry = {
    timestamp: getTimestamp(),
    filePath: file,
    ...(options.method ? { method: options.method } : {}),
    semantic: {
      ...(options.desc ? { description: options.desc } : {}),
      ...(options.pattern ? { pattern: options.pattern } : {}),
      ...(options.tag ? { semanticTag: options.tag } : {}),
      ...(options.fn ? { function: options.fn } : {}),
      ...(options.algo ? { algorithm: options.algo } : {}),
      ...(options.tc ? { timeComplexity: options.tc } : {}),
      ...(options.sc ? { spaceComplexity: options.sc } : {}),
    },
    source: 'cli',
  };

  await appendPending(projectRoot, entry);

  // UI semantic staging (layout, colorScheme, spacing, responsive, state)
  const hasUIOptions = options.layout || options.colorScheme || options.spacing || options.responsive || options.state;
  if (hasUIOptions) {
    const metaDir = getMetaIndexDir(projectRoot);
    const uiEntry: UIPendingEntry = {
      timestamp: getTimestamp(),
      filePath: file,
      semantic: {
        ...(options.layout ? { layout: { type: options.layout } } : {}),
        ...(options.colorScheme ? { designTokens: { color: { intent: options.colorScheme, token: options.colorScheme } } } : {}),
        ...(options.spacing ? { designTokens: { spacing: { intent: options.spacing, token: options.spacing } } } : {}),
        ...(options.responsive ? { responsive: options.responsive.split(',').map(s => s.trim()) } : {}),
        ...(options.state ? parseStateOption(options.state) : {}),
      },
      source: 'cli',
    };
    await appendUIPending(metaDir, uiEntry);
  }

  printSuccess(`  Staged semantic data for ${file}`);
  if (options.method) {
    console.log(colors.dim(`    method: ${options.method}`));
  }
  if (hasUIOptions) {
    console.log(colors.dim('    + UI design intent staged'));
  }
  console.log(colors.dim('  → Run `tsq mi update` to apply'));
}

// ── Stats ──

async function runStats(): Promise<void> {
  const projectRoot = await findProjectRoot();
  if (!projectRoot) {
    throw new Error('Not a TimSquad project. Run "tsq init" first.');
  }

  const metaDir = getMetaIndexDir(projectRoot);
  const summaryPath = path.join(metaDir, 'summary.json');
  if (!await exists(summaryPath)) {
    console.log(colors.dim('  No existing index. Run "tsq mi rebuild" first.'));
    return;
  }

  const summary: MetaIndexSummary = await fs.readJson(summaryPath);

  printHeader('Meta Index Stats');
  displaySummary(summary);

  // Health breakdown
  console.log(colors.subheader('  Health Score Breakdown'));
  const h = summary.health;
  printKeyValue('  Overall', `${h.overall}%`);
  printKeyValue('  Freshness', `${h.freshness}% (files with current index)`);
  printKeyValue('  Semantic Coverage', `${h.semanticCoverage}% (files with semantic data)`);
  printKeyValue('  Interface Health', `${h.interfaceHealth}% (clean exports/imports)`);
  printKeyValue('  Alert Count', String(h.alertCount));

  // UI Health (있을 때만)
  if (summary.uiHealth) {
    displayUIHealth(summary);
  }
}

// ── Display Helpers ──

function displaySummary(summary: MetaIndexSummary): void {
  console.log(colors.subheader('  Overview'));
  printKeyValue('  Files indexed', String(summary.totalFiles));
  printKeyValue('  Methods', String(summary.totalMethods));
  printKeyValue('  Classes', String(summary.totalClasses));
  printKeyValue('  Interfaces', String(summary.totalInterfaces));
  printKeyValue('  Health Score', `${summary.health.overall}%`);
  console.log('');

  // Modules
  console.log(colors.subheader('  Modules'));
  for (const [name, mod] of Object.entries(summary.modules)) {
    const patternStr = mod.patterns
      ? ` (${Object.entries(mod.patterns).map(([p, c]) => `${p}: ${c}`).join(', ')})`
      : '';
    console.log(`  ${colors.primary(name)}: ${mod.files} files, ${mod.methods} methods${colors.dim(patternStr)}`);
  }

  // Alerts
  const alertCount = summary.alerts.oversizedFiles.length +
    summary.alerts.missingSemantics.length +
    summary.alerts.driftDetected.length +
    summary.alerts.interfaceMismatches.length;

  if (alertCount > 0) {
    console.log('');
    console.log(colors.subheader('  Alerts'));
    if (summary.alerts.oversizedFiles.length > 0) {
      console.log(chalk.yellow(`  ⚠ ${summary.alerts.oversizedFiles.length} oversized file${summary.alerts.oversizedFiles.length > 1 ? 's' : ''} (>200 lines)`));
      for (const f of summary.alerts.oversizedFiles.slice(0, 5)) {
        console.log(colors.dim(`    ${f}`));
      }
    }
    if (summary.alerts.missingSemantics.length > 0) {
      console.log(chalk.yellow(`  ⚠ ${summary.alerts.missingSemantics.length} file${summary.alerts.missingSemantics.length > 1 ? 's' : ''} without semantic data`));
    }
  }
}

function displayDrift(drift: DriftReport): void {
  console.log(colors.subheader('  Drift Detection'));

  if (drift.drifted.length === 0) {
    console.log(chalk.green(`  ✓ ${drift.totalFiles} files up to date`));
    return;
  }

  console.log(chalk.green(`  ✓ ${drift.upToDate} files up to date`));
  console.log(chalk.yellow(`  ⚠ ${drift.drifted.length} file${drift.drifted.length > 1 ? 's' : ''} modified outside pipeline:`));

  for (const d of drift.drifted.slice(0, 15)) {
    let detail = '';
    switch (d.type) {
      case 'deleted':
        detail = chalk.red('(deleted)');
        break;
      case 'lines_changed':
        if (d.indexedLines && d.currentLines) {
          const diff = d.currentLines - d.indexedLines;
          detail = `${diff > 0 ? '+' : ''}${diff} lines`;
        } else {
          detail = 'lines changed';
        }
        break;
      case 'mtime_changed':
        detail = 'reformatted (no line diff)';
        break;
      default:
        detail = 'modified';
    }

    const attribution = d.lastModifiedBy
      ? colors.dim(` (${d.lastModifiedBy}${d.lastCommitMessage ? `: "${d.lastCommitMessage.substring(0, 40)}"` : ''})`)
      : '';

    console.log(`    ${colors.path(d.path)}  ${chalk.yellow(detail)}${attribution}`);
  }

  if (drift.drifted.length > 15) {
    console.log(colors.dim(`    ... and ${drift.drifted.length - 15} more`));
  }
}

function displayUIHealth(summary: MetaIndexSummary): void {
  const ui = summary.uiHealth;
  if (!ui || ui.componentCount === 0) return;

  console.log('');
  console.log(colors.subheader('  UI Components'));
  printKeyValue('  Components', String(ui.componentCount));
  printKeyValue('  Semantic Coverage', `${ui.semanticCoverage}%`);
  printKeyValue('  Accessibility', `${ui.accessibilityCoverage}%`);
  printKeyValue('  States Defined', `${ui.statesCoverage}%`);
  printKeyValue('  UI Health Score', `${ui.overall}%`);
}

function parseStateOption(stateStr: string): { states?: Record<string, { trigger: string; visual: string; exit: string }> } {
  // Format: "name:trigger:visual:exit"
  const parts = stateStr.split(':');
  if (parts.length < 4) return {};

  const [name, trigger, visual, exit] = parts;
  return {
    states: {
      [name]: { trigger, visual, exit },
    },
  };
}

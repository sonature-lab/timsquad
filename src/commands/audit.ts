/**
 * tsq audit — Product audit commands
 * FP Registry, source field validation, audit diff
 */

import { Command } from 'commander';
import path from 'path';
import fs from 'fs-extra';
import { colors, printHeader, printError, printSuccess } from '../utils/colors.js';
import { findProjectRoot } from '../lib/project.js';
import { getTimestamp } from '../utils/date.js';

// ── Types ──

interface FpEntry {
  id: string;
  domain: string;
  item: string;
  reason: string;
  addedAt: string;
}

interface FpRegistry {
  version: string;
  entries: FpEntry[];
}

export interface AuditReportItem {
  domain: string;
  item: string;
  status: 'pass' | 'fail' | 'warning' | 'skip';
  score?: number;
  source: 'estimated' | 'measured';
  details?: string;
}

export interface AuditReport {
  version: string;
  generatedAt: string;
  phaseId?: string;
  items: AuditReportItem[];
  excludedFp: number;
}

interface AuditDiffEntry {
  domain: string;
  item: string;
  previous: string;
  current: string;
  delta?: number;
}

// ── Paths ──

function getAuditDir(projectRoot: string): string {
  return path.join(projectRoot, '.timsquad', 'state', 'audit');
}

function getFpRegistryPath(projectRoot: string): string {
  return path.join(getAuditDir(projectRoot), 'fp-registry.json');
}

// ── FP Registry ──

async function loadFpRegistry(projectRoot: string): Promise<FpRegistry> {
  const fpPath = getFpRegistryPath(projectRoot);
  if (await fs.pathExists(fpPath)) {
    return await fs.readJson(fpPath);
  }
  return { version: '1.0.0', entries: [] };
}

async function saveFpRegistry(projectRoot: string, registry: FpRegistry): Promise<void> {
  const fpPath = getFpRegistryPath(projectRoot);
  await fs.ensureDir(path.dirname(fpPath));
  await fs.writeJson(fpPath, registry, { spaces: 2 });
}

// ── Command Registration ──

export function registerAuditCommand(program: Command): void {
  const cmd = program
    .command('audit')
    .description('Product audit: FP registry, reports, diff');

  // tsq audit fp add <domain> <item>
  const fpCmd = cmd
    .command('fp')
    .description('Manage false positive registry');

  fpCmd
    .command('add <domain> <item>')
    .description('Mark an audit item as false positive')
    .option('--reason <reason>', 'Reason for FP classification', 'Manual classification')
    .action(async (domain: string, item: string, options: { reason: string }) => {
      try {
        const projectRoot = await findProjectRoot();
        if (!projectRoot) throw new Error('Not a TimSquad project');

        const registry = await loadFpRegistry(projectRoot);
        const id = `${domain}/${item}`;

        if (registry.entries.some(e => e.id === id)) {
          console.log(colors.dim(`  Already registered: ${id}`));
          return;
        }

        registry.entries.push({
          id,
          domain,
          item,
          reason: options.reason,
          addedAt: getTimestamp(),
        });

        await saveFpRegistry(projectRoot, registry);
        printSuccess(`FP registered: ${id}`);
      } catch (error) {
        printError((error as Error).message);
        process.exit(1);
      }
    });

  fpCmd
    .command('remove <domain> <item>')
    .description('Remove a false positive entry')
    .action(async (domain: string, item: string) => {
      try {
        const projectRoot = await findProjectRoot();
        if (!projectRoot) throw new Error('Not a TimSquad project');

        const registry = await loadFpRegistry(projectRoot);
        const id = `${domain}/${item}`;
        const before = registry.entries.length;
        registry.entries = registry.entries.filter(e => e.id !== id);

        if (registry.entries.length === before) {
          console.log(colors.dim(`  Not found: ${id}`));
          return;
        }

        await saveFpRegistry(projectRoot, registry);
        printSuccess(`FP removed: ${id}`);
      } catch (error) {
        printError((error as Error).message);
        process.exit(1);
      }
    });

  fpCmd
    .command('list')
    .description('List all false positive entries')
    .action(async () => {
      try {
        const projectRoot = await findProjectRoot();
        if (!projectRoot) throw new Error('Not a TimSquad project');

        const registry = await loadFpRegistry(projectRoot);

        printHeader('FP Registry');
        if (registry.entries.length === 0) {
          console.log(colors.dim('  No entries'));
          return;
        }

        for (const entry of registry.entries) {
          console.log(`  ${colors.agent(entry.id)} ${colors.dim(`(${entry.reason})`)}`);
          console.log(`    ${colors.dim(`Added: ${entry.addedAt}`)}`);
        }
        console.log(`\n  Total: ${registry.entries.length} entries`);
      } catch (error) {
        printError((error as Error).message);
        process.exit(1);
      }
    });

  // tsq audit validate <report-path>
  cmd
    .command('validate <report>')
    .description('Validate audit report (check source field)')
    .action(async (reportPath: string) => {
      try {
        const projectRoot = await findProjectRoot();
        if (!projectRoot) throw new Error('Not a TimSquad project');

        const fullPath = path.resolve(projectRoot, reportPath);
        if (!await fs.pathExists(fullPath)) {
          throw new Error(`Report not found: ${reportPath}`);
        }

        const report: AuditReport = await fs.readJson(fullPath);
        let errors = 0;
        let warnings = 0;

        for (const item of report.items) {
          if (!item.source) {
            printError(`  Missing source field: ${item.domain}/${item.item}`);
            errors++;
          } else if (item.source === 'estimated') {
            console.log(colors.warning(`  ⚠ Estimated: ${item.domain}/${item.item}`));
            warnings++;
          }
        }

        if (errors > 0) {
          throw new Error(`Validation failed: ${errors} items missing source field`);
        }

        printSuccess(`Report valid (${warnings} estimated, ${report.items.length - warnings} measured)`);
      } catch (error) {
        printError((error as Error).message);
        process.exit(1);
      }
    });

  // tsq audit diff <report1> <report2>
  cmd
    .command('diff <report1> <report2>')
    .description('Compare two audit reports')
    .action(async (report1Path: string, report2Path: string) => {
      try {
        const projectRoot = await findProjectRoot();
        if (!projectRoot) throw new Error('Not a TimSquad project');

        const r1: AuditReport = await fs.readJson(path.resolve(projectRoot, report1Path));
        const r2: AuditReport = await fs.readJson(path.resolve(projectRoot, report2Path));

        const diffs: AuditDiffEntry[] = [];
        const r1Map = new Map(r1.items.map(i => [`${i.domain}/${i.item}`, i]));
        const r2Map = new Map(r2.items.map(i => [`${i.domain}/${i.item}`, i]));

        // Items in both reports
        for (const [key, item2] of r2Map) {
          const item1 = r1Map.get(key);
          if (item1 && item1.status !== item2.status) {
            diffs.push({
              domain: item2.domain,
              item: item2.item,
              previous: item1.status,
              current: item2.status,
              delta: (item2.score ?? 0) - (item1.score ?? 0),
            });
          }
        }

        // New items in r2
        for (const [key, item2] of r2Map) {
          if (!r1Map.has(key)) {
            diffs.push({
              domain: item2.domain,
              item: item2.item,
              previous: '(new)',
              current: item2.status,
            });
          }
        }

        // Removed items
        for (const [key, item1] of r1Map) {
          if (!r2Map.has(key)) {
            diffs.push({
              domain: item1.domain,
              item: item1.item,
              previous: item1.status,
              current: '(removed)',
            });
          }
        }

        printHeader('Audit Diff');

        if (diffs.length === 0) {
          console.log(colors.dim('  No changes'));
          return;
        }

        console.log(`  ${'Item'.padEnd(40)} ${'Previous'.padEnd(12)} ${'Current'.padEnd(12)} Delta`);
        console.log(`  ${'─'.repeat(40)} ${'─'.repeat(12)} ${'─'.repeat(12)} ${'─'.repeat(6)}`);

        for (const d of diffs) {
          const icon = d.current === 'pass' ? colors.success('✓') :
                       d.current === 'fail' ? colors.error('✗') : ' ';
          const delta = d.delta !== undefined ? (d.delta > 0 ? `+${d.delta}` : `${d.delta}`) : '';
          console.log(`  ${icon} ${`${d.domain}/${d.item}`.padEnd(38)} ${d.previous.padEnd(12)} ${d.current.padEnd(12)} ${delta}`);
        }

        console.log(`\n  Total changes: ${diffs.length}`);
      } catch (error) {
        printError((error as Error).message);
        process.exit(1);
      }
    });

  // tsq audit run (placeholder for future)
  cmd
    .command('run')
    .description('Run product audit (placeholder)')
    .option('--phase <id>', 'Phase ID')
    .action(async (options: { phase?: string }) => {
      console.log(colors.dim(`  Audit run (phase: ${options.phase || 'current'}) — not yet implemented`));
      console.log(colors.dim('  Use tsq audit fp/validate/diff for manual audit workflow'));
    });
}

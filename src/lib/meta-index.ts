/**
 * Meta Index core library
 * 코드베이스 구조 인덱싱, drift 감지, health 점수 관리
 * 저장소: .timsquad/state/meta-index/
 */

import path from 'path';
import fs from 'fs-extra';
import { simpleGit } from 'simple-git';
import { parseFile } from './ast-parser.js';
import { exists, readFile, listFiles } from '../utils/fs.js';
import { getTimestamp } from '../utils/date.js';
import type {
  MetaIndexSummary, ModuleIndex, FileEntry, FileSemantic,
  DriftReport, DriftEntry, MetaHealthScore,
  PendingEntry, InterfaceMismatch, ModuleSummaryEntry,
} from '../types/meta-index.js';
import type { UIHealthScore } from '../types/ui-meta.js';
import type { TaskLogEntry } from '../types/task-log.js';
import { rebuildUIIndex, updateUIIndex, calculateUIHealth } from './ui-index.js';

const META_INDEX_DIR = '.timsquad/state/meta-index';
const SCHEMA_VERSION = '1.0.0';
const OVERSIZED_THRESHOLD = 200;

// Default exclude patterns
const DEFAULT_EXCLUDES = [
  '**/node_modules/**',
  '**/dist/**',
  '**/build/**',
  '**/.next/**',
  '**/coverage/**',
  '**/*.test.*',
  '**/*.spec.*',
  '**/__tests__/**',
  '**/*.d.ts',
];

// ── Paths ──

export function getMetaIndexDir(projectRoot: string): string {
  return path.join(projectRoot, META_INDEX_DIR);
}

// ── Module Resolution ──

const DEFAULT_MODULE_MAP: Record<string, string> = {
  'domain': 'domain',
  'core': 'domain',
  'models': 'domain',
  'entities': 'domain',
  'services': 'domain',
  'usecases': 'domain',
  'use-cases': 'domain',
  'infra': 'infrastructure',
  'infrastructure': 'infrastructure',
  'db': 'infrastructure',
  'database': 'infrastructure',
  'adapters': 'infrastructure',
  'lib': 'infrastructure',
  'utils': 'infrastructure',
  'helpers': 'infrastructure',
  'api': 'interface',
  'routes': 'interface',
  'controllers': 'interface',
  'pages': 'interface',
  'components': 'interface',
  'views': 'interface',
  'ui': 'interface',
  'commands': 'interface',
};

export function resolveModule(filePath: string): string {
  const parts = filePath.split(path.sep);
  // Skip 'src/' prefix if present
  const startIdx = parts[0] === 'src' ? 1 : 0;

  for (let i = startIdx; i < parts.length - 1; i++) {
    const dir = parts[i].toLowerCase();
    if (DEFAULT_MODULE_MAP[dir]) {
      return DEFAULT_MODULE_MAP[dir];
    }
  }

  return 'default';
}

// ── Full Rebuild ──

export async function rebuildIndex(
  projectRoot: string,
  excludePatterns?: string[],
): Promise<MetaIndexSummary> {
  const metaDir = getMetaIndexDir(projectRoot);
  await fs.ensureDir(metaDir);

  // 1. Discover source files
  const patterns = ['**/*.ts', '**/*.tsx', '**/*.js', '**/*.jsx'];
  const excludes = [...DEFAULT_EXCLUDES, ...(excludePatterns || [])];
  const srcDir = path.join(projectRoot, 'src');
  const searchDir = await exists(srcDir) ? srcDir : projectRoot;

  let allFiles: string[] = [];
  for (const pattern of patterns) {
    const files = await listFiles(pattern, searchDir);
    allFiles.push(...files);
  }

  // Filter out excluded
  allFiles = allFiles.filter(f => {
    const rel = path.relative(projectRoot, path.resolve(searchDir, f));
    return !excludes.some(ex => {
      const exParts = ex.replace(/\*\*/g, '').replace(/\*/g, '').replace(/\//g, path.sep);
      return rel.includes(exParts.replace(/^\//, ''));
    });
  });

  // 2. Load existing semantic data
  const existingSemantics = await loadExistingSemantics(metaDir);
  const pendingEntries = await loadPending(projectRoot);
  const taskLogEntries = await extractFromTaskLogs(projectRoot);

  // 3. Parse each file and build entries
  const modules: Record<string, ModuleIndex> = {};

  for (const file of allFiles) {
    const absPath = path.resolve(searchDir, file);
    const relPath = path.relative(projectRoot, absPath);

    try {
      const mechanical = await parseFile(absPath);
      const stat = await fs.stat(absPath);

      // Merge semantic data from various sources
      const semantic = mergeSemantics(
        relPath,
        existingSemantics[relPath],
        pendingEntries,
        taskLogEntries,
      );

      const entry: FileEntry = {
        path: relPath,
        mechanical,
        ...(semantic ? { semantic } : {}),
        indexedAt: getTimestamp(),
        mtime: stat.mtimeMs,
      };

      // Assign to module
      const moduleName = resolveModule(relPath);
      if (!modules[moduleName]) {
        modules[moduleName] = { generatedAt: getTimestamp(), files: {} };
      }
      modules[moduleName].files[relPath] = entry;
    } catch {
      // Skip unparseable files
    }
  }

  // 4. Write module JSONs
  for (const [name, index] of Object.entries(modules)) {
    await fs.writeJson(path.join(metaDir, `${name}.json`), index, { spaces: 2 });
  }

  // 5. UI Index rebuild (tsx/jsx 컴포넌트)
  let uiHealth: UIHealthScore | undefined;
  try {
    const uiIndex = await rebuildUIIndex(projectRoot, metaDir, excludePatterns);
    if (Object.keys(uiIndex.components).length > 0) {
      uiHealth = calculateUIHealth(uiIndex.components);
    }
  } catch {
    // UI 인덱스 실패 시 code 인덱스는 정상 진행
  }

  // 6. Generate and write summary
  const summary = generateSummary(modules, uiHealth);
  await fs.writeJson(path.join(metaDir, 'summary.json'), summary, { spaces: 2 });

  // 7. Clear pending
  const pendingFile = path.join(metaDir, 'pending.jsonl');
  if (await exists(pendingFile)) {
    await fs.writeFile(pendingFile, '', 'utf-8');
  }

  return summary;
}

// ── Incremental Update ──

export async function updateIndex(
  projectRoot: string,
  changedFiles?: string[],
): Promise<MetaIndexSummary> {
  const metaDir = getMetaIndexDir(projectRoot);

  // Load existing modules
  const modules = await loadAllModules(metaDir);

  // Determine which files to re-parse
  let filesToUpdate: string[] = [];

  if (changedFiles?.length) {
    filesToUpdate = changedFiles;
  } else {
    // From pending queue
    const pending = await loadPending(projectRoot);
    const pendingFiles = [...new Set(pending.map(p => p.filePath))];

    // From drift detection
    const drift = await detectDrift(projectRoot);
    const driftedFiles = drift.drifted.map(d => d.path);

    filesToUpdate = [...new Set([...pendingFiles, ...driftedFiles])];
  }

  if (filesToUpdate.length === 0) {
    // Nothing to update, return existing summary
    const summaryPath = path.join(metaDir, 'summary.json');
    if (await exists(summaryPath)) {
      return await fs.readJson(summaryPath);
    }
    return generateSummary(modules);
  }

  // Load semantic sources
  const pendingEntries = await loadPending(projectRoot);
  const taskLogEntries = await extractFromTaskLogs(projectRoot);

  // Re-parse changed files
  for (const relPath of filesToUpdate) {
    const absPath = path.join(projectRoot, relPath);

    if (!await exists(absPath)) {
      // File deleted — remove from modules
      for (const mod of Object.values(modules)) {
        delete mod.files[relPath];
      }
      continue;
    }

    try {
      const mechanical = await parseFile(absPath);
      const stat = await fs.stat(absPath);

      // Get existing semantic
      let existingSemantic: FileSemantic | undefined;
      for (const mod of Object.values(modules)) {
        if (mod.files[relPath]) {
          existingSemantic = mod.files[relPath].semantic;
          delete mod.files[relPath]; // Remove from old module (might have moved)
          break;
        }
      }

      const semantic = mergeSemantics(relPath, existingSemantic, pendingEntries, taskLogEntries);

      const entry: FileEntry = {
        path: relPath,
        mechanical,
        ...(semantic ? { semantic } : {}),
        indexedAt: getTimestamp(),
        mtime: stat.mtimeMs,
      };

      const moduleName = resolveModule(relPath);
      if (!modules[moduleName]) {
        modules[moduleName] = { generatedAt: getTimestamp(), files: {} };
      }
      modules[moduleName].files[relPath] = entry;
    } catch {
      // Skip unparseable files
    }
  }

  // Write updated modules
  for (const [name, index] of Object.entries(modules)) {
    index.generatedAt = getTimestamp();
    await fs.writeJson(path.join(metaDir, `${name}.json`), index, { spaces: 2 });
  }

  // UI Index update (tsx/jsx 변경분)
  let uiHealth: UIHealthScore | undefined;
  try {
    const jsxChanged = filesToUpdate.filter(f => f.endsWith('.tsx') || f.endsWith('.jsx'));
    const uiIndex = await updateUIIndex(projectRoot, metaDir, jsxChanged.length > 0 ? jsxChanged : undefined);
    if (Object.keys(uiIndex.components).length > 0) {
      uiHealth = calculateUIHealth(uiIndex.components);
    }
  } catch {
    // UI 인덱스 실패 시 code 인덱스는 정상 진행
  }

  // Regenerate summary
  const summary = generateSummary(modules, uiHealth);
  await fs.writeJson(path.join(metaDir, 'summary.json'), summary, { spaces: 2 });

  // Clear pending
  const pendingFile = path.join(metaDir, 'pending.jsonl');
  if (await exists(pendingFile)) {
    await fs.writeFile(pendingFile, '', 'utf-8');
  }

  return summary;
}

// ── Drift Detection ──

export async function detectDrift(projectRoot: string): Promise<DriftReport> {
  const metaDir = getMetaIndexDir(projectRoot);
  const report: DriftReport = {
    checkedAt: getTimestamp(),
    totalFiles: 0,
    upToDate: 0,
    drifted: [],
  };

  const modules = await loadAllModules(metaDir);
  const allFiles: FileEntry[] = [];
  for (const mod of Object.values(modules)) {
    allFiles.push(...Object.values(mod.files));
  }

  report.totalFiles = allFiles.length;
  if (allFiles.length === 0) return report;

  const git = simpleGit(projectRoot);

  for (const entry of allFiles) {
    const absPath = path.join(projectRoot, entry.path);

    // File deleted?
    if (!await exists(absPath)) {
      report.drifted.push({
        path: entry.path,
        type: 'deleted',
        indexedMtime: entry.mtime,
        currentMtime: 0,
      });
      continue;
    }

    const stat = await fs.stat(absPath);
    const currentMtime = stat.mtimeMs;

    // Step 1: mtime comparison (±1s tolerance)
    if (Math.abs(currentMtime - entry.mtime) < 1000) {
      report.upToDate++;
      continue;
    }

    // Step 2: line count comparison
    const content = await readFile(absPath);
    const currentLines = content.split('\n').length;
    const indexedLines = entry.mechanical.totalLines;

    let driftType: DriftEntry['type'] = 'mtime_changed';
    if (currentLines !== indexedLines) {
      driftType = 'lines_changed';
    }

    // Step 3: git log for attribution
    let lastModifiedBy: string | undefined;
    let lastCommitMessage: string | undefined;
    try {
      const log = await git.log({ file: entry.path, maxCount: 1 });
      if (log.latest) {
        lastModifiedBy = log.latest.author_name;
        lastCommitMessage = log.latest.message;
      }
    } catch {
      // Not in git or no commits
    }

    report.drifted.push({
      path: entry.path,
      type: driftType,
      indexedMtime: entry.mtime,
      currentMtime,
      indexedLines,
      currentLines,
      lastModifiedBy,
      lastCommitMessage,
    });
  }

  return report;
}

// ── Pending Queue ──

export async function appendPending(
  projectRoot: string,
  entry: PendingEntry,
): Promise<void> {
  const pendingFile = path.join(getMetaIndexDir(projectRoot), 'pending.jsonl');
  await fs.ensureDir(path.dirname(pendingFile));
  await fs.appendFile(pendingFile, JSON.stringify(entry) + '\n');
}

export async function loadPending(projectRoot: string): Promise<PendingEntry[]> {
  const pendingFile = path.join(getMetaIndexDir(projectRoot), 'pending.jsonl');
  if (!await exists(pendingFile)) return [];

  const content = await readFile(pendingFile);
  return content.split('\n')
    .filter(l => l.trim())
    .map(l => {
      try { return JSON.parse(l); }
      catch { return null; }
    })
    .filter(Boolean);
}

// ── Task Log Reference ──

export async function extractFromTaskLogs(
  projectRoot: string,
): Promise<PendingEntry[]> {
  const tasksDir = path.join(projectRoot, '.timsquad', 'logs', 'tasks');
  if (!await exists(tasksDir)) return [];

  const taskFiles = await listFiles('*.json', tasksDir);
  const entries: PendingEntry[] = [];

  for (const tf of taskFiles) {
    try {
      const task: TaskLogEntry = await fs.readJson(path.join(tasksDir, tf));
      const techniques = task.semantic?.techniques || [];
      const files = task.mechanical?.files || [];

      if (techniques.length === 0 || files.length === 0) continue;

      for (const f of files) {
        if (f.action === 'D') continue;

        const patternTech = techniques.find(t =>
          t.name.toLowerCase().includes('pattern') ||
          t.name.toLowerCase().includes('architecture'),
        );

        entries.push({
          timestamp: task.completed_at || getTimestamp(),
          filePath: f.path,
          semantic: {
            ...(patternTech ? { pattern: patternTech.name } : {}),
            ...(task.semantic?.summary ? { description: task.semantic.summary } : {}),
          },
          source: 'task-log',
        });
      }
    } catch {
      // Skip malformed task logs
    }
  }

  return entries;
}

// ── Interface Validation ──

export async function validateInterfaces(
  projectRoot: string,
): Promise<InterfaceMismatch[]> {
  const metaDir = getMetaIndexDir(projectRoot);
  const modules = await loadAllModules(metaDir);
  const mismatches: InterfaceMismatch[] = [];

  // Build export map: exportName -> filePath
  const exportMap: Record<string, string> = {};
  // Build import map: module -> importedNames[]
  const importMap: Record<string, Set<string>> = {};
  // Re-export files to exclude from unused check
  const reExportFiles = new Set<string>();

  for (const mod of Object.values(modules)) {
    for (const [filePath, entry] of Object.entries(mod.files)) {
      // Track exports
      for (const exp of entry.mechanical.exports) {
        exportMap[`${filePath}:${exp}`] = filePath;
      }

      // Track imports
      for (const imp of entry.mechanical.imports) {
        if (!importMap[imp.module]) {
          importMap[imp.module] = new Set();
        }
        for (const name of imp.names) {
          importMap[imp.module].add(name);
        }
      }

      // Detect re-export files (index.ts pattern)
      const basename = path.basename(filePath);
      if (basename === 'index.ts' || basename === 'index.js') {
        reExportFiles.add(filePath);
      }
    }
  }

  // Check for unused exports (excluding re-export files)
  for (const mod of Object.values(modules)) {
    for (const [filePath, entry] of Object.entries(mod.files)) {
      if (reExportFiles.has(filePath)) continue;

      for (const exp of entry.mechanical.exports) {
        // Check if any file imports this export
        let isImported = false;
        for (const [importModule, importNames] of Object.entries(importMap)) {
          // Simple check: does any import module path match this file?
          const normalizedImport = importModule
            .replace(/\.js$/, '.ts')
            .replace(/^\.\//, '');
          if (filePath.endsWith(normalizedImport) || filePath.includes(normalizedImport)) {
            if (importNames.has(exp) || importNames.has('*') || importNames.has('default')) {
              isImported = true;
              break;
            }
          }
        }

        if (!isImported && exp !== 'default') {
          mismatches.push({
            exportFile: filePath,
            exportName: exp,
            issue: 'unused_export',
          });
        }
      }
    }
  }

  return mismatches;
}

// ── Health Score ──

export function calculateHealth(
  totalFiles: number,
  driftCount: number,
  semanticCount: number,
  interfaceMismatches: number,
  totalExports: number,
  alertCount: number,
): MetaHealthScore {
  const freshness = totalFiles > 0
    ? Math.round(((totalFiles - driftCount) / totalFiles) * 100)
    : 100;
  const semanticCoverage = totalFiles > 0
    ? Math.round((semanticCount / totalFiles) * 100)
    : 0;
  const interfaceHealth = totalExports > 0
    ? Math.round(((totalExports - interfaceMismatches) / totalExports) * 100)
    : 100;

  // Weighted average: freshness 40%, semantic 30%, interface 20%, alerts penalty 10%
  const alertPenalty = Math.min(alertCount * 2, 30);
  const overall = Math.max(0, Math.min(100, Math.round(
    freshness * 0.4 + semanticCoverage * 0.3 + interfaceHealth * 0.2 + (100 - alertPenalty) * 0.1,
  )));

  return { overall, freshness, semanticCoverage, interfaceHealth, alertCount };
}

// ── Summary Generation ──

export function generateSummary(
  modules: Record<string, ModuleIndex>,
  uiHealth?: UIHealthScore,
): MetaIndexSummary {
  let totalFiles = 0;
  let totalMethods = 0;
  let totalClasses = 0;
  let totalInterfaces = 0;
  let totalExports = 0;
  let semanticCount = 0;
  const oversizedFiles: string[] = [];
  const missingSemantics: string[] = [];
  const moduleSummaries: Record<string, ModuleSummaryEntry> = {};

  for (const [name, mod] of Object.entries(modules)) {
    let modFiles = 0;
    let modMethods = 0;
    const patterns: Record<string, number> = {};

    for (const [filePath, entry] of Object.entries(mod.files)) {
      modFiles++;
      totalFiles++;

      const methodCount = Object.keys(entry.mechanical.methods).length;
      modMethods += methodCount;
      totalMethods += methodCount;
      totalClasses += entry.mechanical.classes.length;
      totalInterfaces += entry.mechanical.interfaces.length;
      totalExports += entry.mechanical.exports.length;

      if (entry.semantic) {
        semanticCount++;
        if (entry.semantic.pattern) {
          patterns[entry.semantic.pattern] = (patterns[entry.semantic.pattern] || 0) + 1;
        }
      } else {
        missingSemantics.push(filePath);
      }

      if (entry.mechanical.totalLines > OVERSIZED_THRESHOLD) {
        oversizedFiles.push(filePath);
      }
    }

    moduleSummaries[name] = {
      files: modFiles,
      methods: modMethods,
      ...(Object.keys(patterns).length > 0 ? { patterns } : {}),
    };
  }

  const health = calculateHealth(
    totalFiles, 0, semanticCount, 0, totalExports,
    oversizedFiles.length + missingSemantics.length,
  );

  return {
    generatedAt: getTimestamp(),
    schemaVersion: SCHEMA_VERSION,
    totalFiles,
    totalMethods,
    totalClasses,
    totalInterfaces,
    modules: moduleSummaries,
    alerts: {
      oversizedFiles,
      missingSemantics,
      driftDetected: [],
      interfaceMismatches: [],
    },
    health,
    ...(uiHealth ? { uiHealth } : {}),
  };
}

// ── Internal Helpers ──

async function loadAllModules(metaDir: string): Promise<Record<string, ModuleIndex>> {
  const modules: Record<string, ModuleIndex> = {};
  if (!await exists(metaDir)) return modules;

  const files = await listFiles('*.json', metaDir);
  for (const file of files) {
    if (file === 'summary.json') continue;
    const name = path.basename(file, '.json');
    try {
      modules[name] = await fs.readJson(path.join(metaDir, file));
    } catch {
      // Skip malformed
    }
  }
  return modules;
}

async function loadExistingSemantics(
  metaDir: string,
): Promise<Record<string, FileSemantic | undefined>> {
  const result: Record<string, FileSemantic | undefined> = {};
  const modules = await loadAllModules(metaDir);
  for (const mod of Object.values(modules)) {
    for (const [filePath, entry] of Object.entries(mod.files)) {
      if (entry.semantic) {
        result[filePath] = entry.semantic;
      }
    }
  }
  return result;
}

function mergeSemantics(
  filePath: string,
  existing: FileSemantic | undefined,
  pending: PendingEntry[],
  taskLogs: PendingEntry[],
): FileSemantic | undefined {
  // Priority: CLI pending > task-log pending > existing
  const cliEntry = pending.find(p => p.filePath === filePath && p.source === 'cli');
  const taskEntry = taskLogs.find(p => p.filePath === filePath);

  const merged: FileSemantic = { ...existing };

  if (taskEntry?.semantic) {
    if (taskEntry.semantic.pattern) merged.pattern = taskEntry.semantic.pattern;
    if (taskEntry.semantic.description) merged.description = taskEntry.semantic.description;
    if (taskEntry.semantic.semanticTag) merged.semanticTag = taskEntry.semantic.semanticTag;
  }

  if (cliEntry?.semantic) {
    if (cliEntry.semantic.pattern) merged.pattern = cliEntry.semantic.pattern;
    if (cliEntry.semantic.description) merged.description = cliEntry.semantic.description;
    if (cliEntry.semantic.semanticTag) merged.semanticTag = cliEntry.semantic.semanticTag;
  }

  return Object.keys(merged).length > 0 ? merged : undefined;
}

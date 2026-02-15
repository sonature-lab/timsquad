/**
 * UI Index core library
 * 프론트엔드 컴포넌트 구조 인덱싱, health 점수 관리
 * 저장소: .timsquad/state/meta-index/ui-index/
 */

import path from 'path';
import fs from 'fs-extra';
import { parseComponent } from './ui-parser.js';
import { exists, readFile, listFiles } from '../utils/fs.js';
import { getTimestamp } from '../utils/date.js';
import type {
  UIModuleIndex, ComponentEntry, ComponentSemantic,
  UIHealthScore, UIPendingEntry,
} from '../types/ui-meta.js';

const UI_INDEX_DIR = 'ui-index';
const UI_SCHEMA_VERSION = '1.0.0';

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
  '**/*.stories.*',
];

// ── Paths ──

export function getUIIndexDir(metaDir: string): string {
  return path.join(metaDir, UI_INDEX_DIR);
}

// ── Full Rebuild ──

export async function rebuildUIIndex(
  projectRoot: string,
  metaDir: string,
  excludePatterns?: string[],
): Promise<UIModuleIndex> {
  const uiDir = getUIIndexDir(metaDir);
  await fs.ensureDir(uiDir);

  // 1. Discover .tsx/.jsx files only
  const patterns = ['**/*.tsx', '**/*.jsx'];
  const excludes = [...DEFAULT_EXCLUDES, ...(excludePatterns || [])];
  const srcDir = path.join(projectRoot, 'src');
  const searchDir = await exists(srcDir) ? srcDir : projectRoot;

  let allFiles: string[] = [];
  for (const pattern of patterns) {
    const files = await listFiles(pattern, searchDir);
    allFiles.push(...files);
  }

  // Filter excludes
  allFiles = allFiles.filter(f => {
    const rel = path.relative(projectRoot, path.resolve(searchDir, f));
    return !excludes.some(ex => {
      const exParts = ex.replace(/\*\*/g, '').replace(/\*/g, '').replace(/\//g, path.sep);
      return rel.includes(exParts.replace(/^\//, ''));
    });
  });

  // 2. Load existing UI semantic data
  const existingSemantics = await loadExistingUISemantics(uiDir);
  const pendingEntries = await loadUIPending(metaDir);

  // 3. Parse each file
  const components: Record<string, ComponentEntry> = {};

  for (const file of allFiles) {
    const absPath = path.resolve(searchDir, file);
    const relPath = path.relative(projectRoot, absPath);

    try {
      const mechanical = await parseComponent(absPath);
      if (!mechanical) continue; // Not a component file

      const stat = await fs.stat(absPath);

      // Merge semantic
      const semantic = mergeUISemantics(
        existingSemantics[relPath],
        pendingEntries.filter(p => p.filePath === relPath),
      );

      components[relPath] = {
        path: relPath,
        mechanical,
        ...(semantic ? { semantic } : {}),
        indexedAt: getTimestamp(),
        mtime: stat.mtimeMs,
      };
    } catch {
      // Skip unparseable
    }
  }

  const result: UIModuleIndex = {
    generatedAt: getTimestamp(),
    schemaVersion: UI_SCHEMA_VERSION,
    components,
  };

  // 4. Write components.json
  await fs.writeJson(path.join(uiDir, 'components.json'), result, { spaces: 2 });

  // 5. Clear UI pending
  const pendingFile = path.join(metaDir, 'ui-pending.jsonl');
  if (await exists(pendingFile)) {
    await fs.writeFile(pendingFile, '', 'utf-8');
  }

  return result;
}

// ── Incremental Update ──

export async function updateUIIndex(
  projectRoot: string,
  metaDir: string,
  changedFiles?: string[],
): Promise<UIModuleIndex> {
  const uiDir = getUIIndexDir(metaDir);
  const componentsPath = path.join(uiDir, 'components.json');

  // Load existing
  let existing: UIModuleIndex = {
    generatedAt: getTimestamp(),
    schemaVersion: UI_SCHEMA_VERSION,
    components: {},
  };
  if (await exists(componentsPath)) {
    existing = await fs.readJson(componentsPath);
  }

  // Determine files to update
  let filesToUpdate: string[] = [];
  if (changedFiles?.length) {
    filesToUpdate = changedFiles.filter(f => f.endsWith('.tsx') || f.endsWith('.jsx'));
  } else {
    // From UI pending
    const pending = await loadUIPending(metaDir);
    filesToUpdate = [...new Set(pending.map(p => p.filePath))];
  }

  if (filesToUpdate.length === 0) return existing;

  const pendingEntries = await loadUIPending(metaDir);

  for (const relPath of filesToUpdate) {
    const absPath = path.join(projectRoot, relPath);

    if (!await exists(absPath)) {
      delete existing.components[relPath];
      continue;
    }

    try {
      const mechanical = await parseComponent(absPath);
      if (!mechanical) {
        delete existing.components[relPath];
        continue;
      }

      const stat = await fs.stat(absPath);
      const existingSemantic = existing.components[relPath]?.semantic;
      const semantic = mergeUISemantics(
        existingSemantic,
        pendingEntries.filter(p => p.filePath === relPath),
      );

      existing.components[relPath] = {
        path: relPath,
        mechanical,
        ...(semantic ? { semantic } : {}),
        indexedAt: getTimestamp(),
        mtime: stat.mtimeMs,
      };
    } catch {
      // Skip
    }
  }

  existing.generatedAt = getTimestamp();
  await fs.ensureDir(uiDir);
  await fs.writeJson(componentsPath, existing, { spaces: 2 });

  // Clear pending
  const pendingFile = path.join(metaDir, 'ui-pending.jsonl');
  if (await exists(pendingFile)) {
    await fs.writeFile(pendingFile, '', 'utf-8');
  }

  return existing;
}

// ── Health Score ──

export function calculateUIHealth(
  components: Record<string, ComponentEntry>,
): UIHealthScore {
  const entries = Object.values(components);
  const count = entries.length;
  if (count === 0) {
    return { overall: 0, componentCount: 0, semanticCoverage: 0, accessibilityCoverage: 0, statesCoverage: 0 };
  }

  const withSemantic = entries.filter(e => e.semantic).length;
  const withAccessibility = entries.filter(e => e.semantic?.accessibility).length;
  const withStates = entries.filter(e =>
    e.semantic?.states && Object.keys(e.semantic.states).length > 0,
  ).length;

  const semanticCoverage = Math.round((withSemantic / count) * 100);
  const accessibilityCoverage = Math.round((withAccessibility / count) * 100);
  const statesCoverage = Math.round((withStates / count) * 100);

  // Weighted: semantic 40% + accessibility 35% + states 25%
  const overall = Math.round(
    semanticCoverage * 0.4 + accessibilityCoverage * 0.35 + statesCoverage * 0.25,
  );

  return { overall, componentCount: count, semanticCoverage, accessibilityCoverage, statesCoverage };
}

// ── Pending Queue ──

export async function appendUIPending(
  metaDir: string,
  entry: UIPendingEntry,
): Promise<void> {
  const pendingFile = path.join(metaDir, 'ui-pending.jsonl');
  await fs.ensureDir(path.dirname(pendingFile));
  await fs.appendFile(pendingFile, JSON.stringify(entry) + '\n');
}

async function loadUIPending(metaDir: string): Promise<UIPendingEntry[]> {
  const pendingFile = path.join(metaDir, 'ui-pending.jsonl');
  if (!await exists(pendingFile)) return [];

  const content = await readFile(pendingFile);
  return content.split('\n')
    .filter(l => l.trim())
    .map(l => { try { return JSON.parse(l); } catch { return null; } })
    .filter(Boolean);
}

// ── Semantic Merge ──

function mergeUISemantics(
  existing: ComponentSemantic | undefined,
  pending: UIPendingEntry[],
): ComponentSemantic | undefined {
  if (!existing && pending.length === 0) return undefined;

  const merged: ComponentSemantic = { ...existing };

  // Apply pending entries (later entries override)
  for (const entry of pending) {
    const s = entry.semantic;
    if (s.semanticTag) merged.semanticTag = s.semanticTag;
    if (s.layout) merged.layout = s.layout;
    if (s.designTokens) merged.designTokens = { ...merged.designTokens, ...s.designTokens };
    if (s.slots) merged.slots = { ...merged.slots, ...s.slots };
    if (s.states) merged.states = { ...merged.states, ...s.states };
    if (s.animations) merged.animations = { ...merged.animations, ...s.animations };
    if (s.accessibility) merged.accessibility = { ...merged.accessibility, ...s.accessibility };
    if (s.responsive) merged.responsive = s.responsive;
  }

  return Object.keys(merged).length > 0 ? merged : undefined;
}

// ── Internal Helpers ──

async function loadExistingUISemantics(
  uiDir: string,
): Promise<Record<string, ComponentSemantic | undefined>> {
  const result: Record<string, ComponentSemantic | undefined> = {};
  const componentsPath = path.join(uiDir, 'components.json');
  if (!await exists(componentsPath)) return result;

  try {
    const index: UIModuleIndex = await fs.readJson(componentsPath);
    for (const [filePath, entry] of Object.entries(index.components)) {
      if (entry.semantic) {
        result[filePath] = entry.semantic;
      }
    }
  } catch {
    // Skip malformed
  }

  return result;
}

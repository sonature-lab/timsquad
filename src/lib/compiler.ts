/**
 * SSOT Compiler: Transforms human-written SSOT documents into
 * agent-facing spec files for the controller skill (Context DI).
 *
 * Design principles:
 * - Deterministic extraction only (no AI interpretation)
 * - Section markers for traceability (source, hash, timestamp)
 * - Schema validation for completeness checking
 * - Stale detection via compile manifest
 */

import path from 'path';
import crypto from 'crypto';
import fs from 'fs-extra';
import {
  type CompileRule,
  type CompileManifest,
  type ManifestEntry,
  type CompileMarker,
  getCompileRules,
  getDefaultRule,
} from './compile-rules.js';
import { exists, readFile, writeFile } from '../utils/fs.js';

// ─── Parsed Section ─────────────────────────────────────────────

/** A parsed section from an SSOT markdown document */
export interface ParsedSection {
  /** Heading text (e.g., "2.1 로그인") */
  heading: string;
  /** Heading level (2 = H2, 3 = H3) */
  level: number;
  /** Full content including heading and body */
  content: string;
  /** Slugified anchor (e.g., "POST-auth-login") */
  anchor: string;
  /** Parent section heading (for H3 under H2) */
  parent?: string;
}

/** Validation result for a compiled spec */
export interface ValidationResult {
  source: string;
  totalSections: number;
  validSections: number;
  missingFields: Array<{ section: string; fields: string[] }>;
  score: number;
}

/** Overall compile result */
export interface CompileResult {
  success: boolean;
  compiled: Array<{ source: string; outputFiles: string[] }>;
  validations: ValidationResult[];
  skipped: string[];
  errors: string[];
}

// ─── Markdown Parser ────────────────────────────────────────────

/**
 * Parse a markdown document into sections by heading level.
 */
export function parseMarkdownSections(
  content: string,
  splitBy: 'h2' | 'h3',
): ParsedSection[] {
  const lines = content.split('\n');
  const targetLevel = splitBy === 'h2' ? 2 : 3;
  const sections: ParsedSection[] = [];

  let currentSection: ParsedSection | null = null;
  let currentH2 = '';
  const contentLines: string[] = [];

  for (const line of lines) {
    const headingMatch = line.match(/^(#{2,4})\s+(.+)$/);

    if (headingMatch) {
      const level = headingMatch[1].length;
      const heading = headingMatch[2].trim();

      // Track parent H2 for H3 sections
      if (level === 2) {
        currentH2 = heading;
      }

      if (level === targetLevel) {
        // Save previous section
        if (currentSection) {
          currentSection.content = contentLines.join('\n').trim();
          sections.push(currentSection);
          contentLines.length = 0;
        }

        currentSection = {
          heading,
          level,
          content: '',
          anchor: slugify(heading),
          parent: level === 3 ? currentH2 : undefined,
        };
      }
    }

    if (currentSection) {
      contentLines.push(line);
    }
  }

  // Don't forget the last section
  if (currentSection) {
    currentSection.content = contentLines.join('\n').trim();
    sections.push(currentSection);
  }

  return sections;
}

/**
 * Slugify a heading into a URL-safe anchor.
 * "2.1 로그인" → "2-1-로그인"
 * "POST /auth/login" → "POST-auth-login"
 */
export function slugify(text: string): string {
  return text
    .replace(/\./g, '-')
    .replace(/\//g, '-')
    .replace(/\s+/g, '-')
    .replace(/[^a-zA-Z0-9가-힣-_]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase();
}

// ─── Schema Validation ─────────────────────────────────────────

/**
 * Check if a section contains the required fields.
 * Looks for field names in table headers or bold text.
 */
export function validateSectionFields(
  content: string,
  requiredFields: string[],
): string[] {
  if (requiredFields.length === 0) return [];

  const missing: string[] = [];
  const contentLower = content.toLowerCase();

  for (const field of requiredFields) {
    const fieldLower = field.toLowerCase();
    // Check in table headers (| Field |) or bold text (**Field**)
    const hasInTable = contentLower.includes(`| **${fieldLower}**`) ||
      contentLower.includes(`| ${fieldLower} |`);
    const hasAsBold = contentLower.includes(`**${fieldLower}**`);
    const hasAsHeading = contentLower.includes(`#### ${field}`);
    const hasAsText = contentLower.includes(fieldLower);

    if (!hasInTable && !hasAsBold && !hasAsHeading && !hasAsText) {
      missing.push(field);
    }
  }

  return missing;
}

// ─── Compile Markers ────────────────────────────────────────────

/** Generate section markers as HTML comments */
export function generateMarkers(marker: CompileMarker): string {
  return [
    `<!-- source: ${marker.source}#${marker.section} -->`,
    `<!-- ssot-hash: ${marker.ssotHash} -->`,
    `<!-- compiled: ${marker.compiledAt} -->`,
  ].join('\n');
}

/** Compute MD5 hash of content */
export function computeHash(content: string): string {
  return crypto.createHash('md5').update(content).digest('hex').slice(0, 8);
}

// ─── Compiler Core ──────────────────────────────────────────────

/**
 * Compile a single SSOT document according to its rule.
 * Returns list of output file paths (relative to controller skill dir).
 */
export async function compileSsotDocument(
  ssotPath: string,
  rule: CompileRule,
  controllerDir: string,
  sourceName: string,
): Promise<{ outputFiles: string[]; validation: ValidationResult }> {
  const content = await readFile(ssotPath);
  const now = new Date().toISOString();
  const outputDir = path.join(controllerDir, rule.output);
  await fs.ensureDir(outputDir);

  const outputFiles: string[] = [];
  const validation: ValidationResult = {
    source: sourceName,
    totalSections: 0,
    validSections: 0,
    missingFields: [],
    score: 0,
  };

  if (rule.splitBy === 'none') {
    // No splitting — compile entire document as one spec
    const hash = computeHash(content);
    const markers = generateMarkers({
      source: `ssot/${sourceName}.md`,
      section: 'full',
      ssotHash: hash,
      compiledAt: now,
    });

    const outputFilename = rule.filenamePattern;
    const outputPath = path.join(outputDir, outputFilename);
    const compiled = `${markers}\n\n${content}`;
    await writeFile(outputPath, compiled);
    outputFiles.push(path.join(rule.output, outputFilename));

    // Validate
    validation.totalSections = 1;
    const missing = validateSectionFields(content, rule.requiredFields);
    if (missing.length === 0) {
      validation.validSections = 1;
    } else {
      validation.missingFields.push({ section: 'full', fields: missing });
    }
  } else {
    // Split by heading level
    const sections = parseMarkdownSections(content, rule.splitBy);
    validation.totalSections = sections.length;

    for (const section of sections) {
      const hash = computeHash(section.content);
      const markers = generateMarkers({
        source: `ssot/${sourceName}.md`,
        section: section.anchor,
        ssotHash: hash,
        compiledAt: now,
      });

      const outputFilename = rule.filenamePattern.replace(
        '{section}',
        section.anchor,
      );
      const outputPath = path.join(outputDir, outputFilename);
      const compiled = `${markers}\n\n${section.content}`;
      await writeFile(outputPath, compiled);
      outputFiles.push(path.join(rule.output, outputFilename));

      // Validate each section
      const missing = validateSectionFields(
        section.content,
        rule.requiredFields,
      );
      if (missing.length === 0) {
        validation.validSections++;
      } else {
        validation.missingFields.push({
          section: section.heading,
          fields: missing,
        });
      }
    }
  }

  validation.score =
    validation.totalSections > 0
      ? Math.round((validation.validSections / validation.totalSections) * 100)
      : 0;

  return { outputFiles, validation };
}

// ─── Full Compile Pipeline ──────────────────────────────────────

/**
 * Compile all SSOT documents in a project.
 *
 * @param projectRoot Project root directory
 * @param controllerDir Path to controller skill dir (.claude/skills/controller)
 * @returns CompileResult with all outputs and validation
 */
export async function compileAll(
  projectRoot: string,
  controllerDir: string,
): Promise<CompileResult> {
  const ssotDir = path.join(projectRoot, '.timsquad', 'ssot');
  const result: CompileResult = {
    success: true,
    compiled: [],
    validations: [],
    skipped: [],
    errors: [],
  };

  // Find all SSOT documents
  if (!await exists(ssotDir)) {
    result.success = false;
    result.errors.push('.timsquad/ssot/ 디렉토리가 존재하지 않습니다.');
    return result;
  }

  const ssotFiles = (await fs.readdir(ssotDir))
    .filter((f) => f.endsWith('.md') && !f.startsWith('adr'))
    .map((f) => f.replace('.md', ''));

  // Get applicable rules
  const rules = getCompileRules(ssotFiles);
  const ruledSources = new Set(rules.map((r) => r.source));

  // Compile each SSOT document
  for (const ssotName of ssotFiles) {
    const ssotPath = path.join(ssotDir, `${ssotName}.md`);

    // Skip empty/template files
    const content = await readFile(ssotPath);
    if (content.length < 200) {
      result.skipped.push(ssotName);
      continue;
    }

    const rule = ruledSources.has(ssotName)
      ? rules.find((r) => r.source === ssotName)!
      : getDefaultRule(ssotName);

    try {
      const { outputFiles, validation } = await compileSsotDocument(
        ssotPath,
        rule,
        controllerDir,
        ssotName,
      );
      result.compiled.push({ source: ssotName, outputFiles });
      result.validations.push(validation);
    } catch (err) {
      result.success = false;
      result.errors.push(
        `${ssotName} 컴파일 실패: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  // Save manifest
  await saveManifest(projectRoot, controllerDir, result);

  return result;
}

// ─── Manifest (Stale Detection) ─────────────────────────────────

const MANIFEST_FILENAME = '.compile-manifest.json';

/**
 * Save compile manifest for stale detection.
 */
async function saveManifest(
  projectRoot: string,
  controllerDir: string,
  result: CompileResult,
): Promise<void> {
  const ssotDir = path.join(projectRoot, '.timsquad', 'ssot');
  const entries: ManifestEntry[] = [];

  for (const compiled of result.compiled) {
    const ssotPath = path.join(ssotDir, `${compiled.source}.md`);
    const content = await readFile(ssotPath);
    entries.push({
      source: `ssot/${compiled.source}.md`,
      ssotHash: computeHash(content),
      compiledAt: new Date().toISOString(),
      outputFiles: compiled.outputFiles,
    });
  }

  const manifest: CompileManifest = {
    version: '1.0',
    compiledAt: new Date().toISOString(),
    entries,
  };

  await writeFile(
    path.join(controllerDir, MANIFEST_FILENAME),
    JSON.stringify(manifest, null, 2),
  );
}

/**
 * Load existing manifest. Returns null if not found.
 */
export async function loadManifest(
  controllerDir: string,
): Promise<CompileManifest | null> {
  const manifestPath = path.join(controllerDir, MANIFEST_FILENAME);
  if (!await exists(manifestPath)) return null;

  try {
    const content = await readFile(manifestPath);
    return JSON.parse(content) as CompileManifest;
  } catch {
    return null;
  }
}

/**
 * Check which SSOT documents are stale (changed since last compile).
 */
export async function checkStale(
  projectRoot: string,
  controllerDir: string,
): Promise<Array<{ source: string; reason: string }>> {
  const manifest = await loadManifest(controllerDir);
  const ssotDir = path.join(projectRoot, '.timsquad', 'ssot');
  const stale: Array<{ source: string; reason: string }> = [];

  if (!manifest) {
    stale.push({ source: '*', reason: '컴파일 이력 없음 (tsq compile 실행 필요)' });
    return stale;
  }

  for (const entry of manifest.entries) {
    const ssotPath = path.join(projectRoot, '.timsquad', entry.source);
    if (!await exists(ssotPath)) {
      stale.push({ source: entry.source, reason: 'SSOT 파일 삭제됨' });
      continue;
    }

    const currentContent = await readFile(ssotPath);
    const currentHash = computeHash(currentContent);

    if (currentHash !== entry.ssotHash) {
      stale.push({ source: entry.source, reason: 'SSOT 변경됨 (hash 불일치)' });
    }
  }

  // Check for new SSOT files not in manifest
  if (await exists(ssotDir)) {
    const ssotFiles = (await fs.readdir(ssotDir))
      .filter((f) => f.endsWith('.md') && !f.startsWith('adr'));

    const compiledSources = new Set(
      manifest.entries.map((e) => e.source.replace('ssot/', '').replace('.md', '')),
    );

    for (const file of ssotFiles) {
      const name = file.replace('.md', '');
      if (!compiledSources.has(name)) {
        stale.push({ source: `ssot/${file}`, reason: '새 SSOT 파일 (미컴파일)' });
      }
    }
  }

  return stale;
}

// ─── Dependency Graph Validation ────────────────────────────────

/**
 * Parse agent prerequisites from agent markdown files.
 * Extracts from <prerequisites> XML tag.
 */
export function parseAgentPrerequisites(content: string): string[] {
  const match = content.match(/<prerequisites>([\s\S]*?)<\/prerequisites>/);
  if (!match) return [];

  return match[1]
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.startsWith('`'))
    .map((line) => {
      // Extract path: `.timsquad/ssot/service-spec.md` → 'service-spec'
      const pathMatch = line.match(/`\.timsquad\/ssot\/([^`]+)\.md`/);
      return pathMatch ? pathMatch[1] : null;
    })
    .filter((v): v is string => v !== null);
}

/**
 * Validate that all agent prerequisites can be resolved from compiled specs.
 */
export async function validateDependencyGraph(
  projectRoot: string,
  controllerDir: string,
): Promise<Array<{ agent: string; missing: string[] }>> {
  const agentsDir = path.join(projectRoot, '.claude', 'agents');
  const unresolved: Array<{ agent: string; missing: string[] }> = [];

  if (!await exists(agentsDir)) return unresolved;

  const agentFiles = (await fs.readdir(agentsDir)).filter((f) =>
    f.endsWith('.md'),
  );

  // Get compiled spec sources from manifest
  const manifest = await loadManifest(controllerDir);
  const compiledSources = new Set(
    manifest?.entries.map((e) =>
      e.source.replace('ssot/', '').replace('.md', ''),
    ) ?? [],
  );

  for (const file of agentFiles) {
    const content = await readFile(path.join(agentsDir, file));
    const prereqs = parseAgentPrerequisites(content);
    const agent = file.replace('.md', '');

    const missing = prereqs.filter((p) => !compiledSources.has(p));
    if (missing.length > 0) {
      unresolved.push({ agent, missing });
    }
  }

  return unresolved;
}

import path from 'path';
import fs from 'fs-extra';
import type { AgentType, Platform, Domain } from '../types/index.js';

/**
 * Merge strategies for XML sections
 */
export type MergeStrategy = 'REPLACE' | 'APPEND' | 'MERGE' | 'KEEP';

/**
 * Parsed XML section from overlay file
 */
export interface XmlSection {
  name: string;
  content: string;
  strategy: MergeStrategy;
}

/**
 * Default merge strategies per section (from composition-layer-architecture.md §7)
 */
const DEFAULT_STRATEGIES: Record<string, MergeStrategy> = {
  'role-summary': 'REPLACE',
  'rules': 'APPEND',
  'prerequisites': 'MERGE',
  'input-contract': 'REPLACE',
  'does-not': 'APPEND',
  'knowledge-refs': 'MERGE',
};

/**
 * Parse XML sections from an overlay file.
 * Extracts sections like: <section-name strategy="APPEND">content</section-name>
 * Ignores frontmatter and the outer <agent> wrapper.
 */
export function parseXmlSections(content: string): XmlSection[] {
  const sections: XmlSection[] = [];

  // Remove frontmatter
  let body = content.replace(/^---[\s\S]*?---\s*/m, '');

  // Unwrap outer <overlay> and <agent> wrappers to expose inner sections
  body = body.replace(/<(?:overlay|agent)(?:\s[^>]*)?>\s*([\s\S]*?)\s*<\/(?:overlay|agent)>/g, '$1');

  // Match XML sections with optional strategy attribute
  // Captures: <name strategy="STRATEGY">content</name>
  const sectionRegex = /<(\w[\w-]*?)(?:\s+strategy="(\w+)")?\s*>([\s\S]*?)<\/\1>/g;
  let match: RegExpExecArray | null;

  while ((match = sectionRegex.exec(body)) !== null) {
    const [, name, strategyAttr, innerContent] = match;

    const strategy = (strategyAttr as MergeStrategy) ??
      DEFAULT_STRATEGIES[name] ??
      'KEEP';

    sections.push({
      name,
      content: innerContent.trim(),
      strategy,
    });
  }

  return sections;
}

/**
 * Apply a single overlay section to a base document.
 */
export function mergeSection(baseContent: string, overlay: XmlSection): string {
  const { name, content: overlayContent, strategy } = overlay;

  // Find the section in base
  const sectionRegex = new RegExp(
    `(<${name}(?:\\s[^>]*)?>)([\\s\\S]*?)(<\\/${name}>)`,
  );
  const match = sectionRegex.exec(baseContent);

  if (!match) {
    if (strategy === 'KEEP') return baseContent;

    // Section doesn't exist in base — insert before </agent> closing tag
    const insertPoint = baseContent.lastIndexOf('</agent>');
    if (insertPoint === -1) return baseContent;

    const newSection = `\n  <${name}>\n    ${overlayContent}\n  </${name}>\n`;
    return baseContent.slice(0, insertPoint) + newSection + baseContent.slice(insertPoint);
  }

  const [fullMatch, openTag, baseSection, closeTag] = match;

  switch (strategy) {
    case 'REPLACE':
      return baseContent.replace(fullMatch, `${openTag}\n    ${overlayContent}\n  ${closeTag}`);

    case 'APPEND':
      return baseContent.replace(
        fullMatch,
        `${openTag}${baseSection}\n    ${overlayContent}\n  ${closeTag}`,
      );

    case 'MERGE': {
      // Combine lines, deduplicate
      const baseLines = baseSection.trim().split('\n').map(l => l.trim()).filter(Boolean);
      const overlayLines = overlayContent.trim().split('\n').map(l => l.trim()).filter(Boolean);
      const merged = [...new Set([...baseLines, ...overlayLines])];
      const indent = '    ';
      return baseContent.replace(
        fullMatch,
        `${openTag}\n${merged.map(l => indent + l).join('\n')}\n  ${closeTag}`,
      );
    }

    case 'KEEP':
    default:
      return baseContent;
  }
}

/**
 * Compose an agent by merging base + platform overlay + domain overlay(s).
 *
 * Load order (from composition-layer-architecture.md §8):
 * 1. base/tsq-{role}.md
 * 2. overlays/platform/{platform}.md
 * 3. overlays/domain/{domain}/_common.md
 * 4. overlays/domain/{domain}/{role}.md (if exists)
 */
export async function composeAgent(
  templatesDir: string,
  options: {
    role: AgentType;
    platform: Platform;
    domain?: Domain;
  },
): Promise<string> {
  const agentsDir = path.join(templatesDir, 'base', 'agents');
  const { role, platform, domain } = options;

  // 1. Load base
  const basePath = path.join(agentsDir, 'base', `tsq-${role}.md`);
  if (!await fs.pathExists(basePath)) {
    throw new Error(`Base agent file not found: tsq-${role}.md`);
  }
  let result = await fs.readFile(basePath, 'utf-8');

  // 2. Apply platform overlay
  const platformPath = path.join(agentsDir, 'overlays', 'platform', `${platform}.md`);
  if (await fs.pathExists(platformPath)) {
    const overlayContent = await fs.readFile(platformPath, 'utf-8');
    const sections = parseXmlSections(overlayContent);
    for (const section of sections) {
      result = mergeSection(result, section);
    }
  }

  // 3. Apply domain common overlay
  if (domain) {
    const domainCommonPath = path.join(agentsDir, 'overlays', 'domain', domain, '_common.md');
    if (await fs.pathExists(domainCommonPath)) {
      const overlayContent = await fs.readFile(domainCommonPath, 'utf-8');
      const sections = parseXmlSections(overlayContent);
      for (const section of sections) {
        result = mergeSection(result, section);
      }
    }

    // 4. Apply domain role-specific overlay
    const domainRolePath = path.join(agentsDir, 'overlays', 'domain', domain, `${role}.md`);
    if (await fs.pathExists(domainRolePath)) {
      const overlayContent = await fs.readFile(domainRolePath, 'utf-8');
      const sections = parseXmlSections(overlayContent);
      for (const section of sections) {
        result = mergeSection(result, section);
      }
    }
  }

  return result;
}

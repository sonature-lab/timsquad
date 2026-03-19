/**
 * Skill & Knowledge selective deployment.
 * Mirrors agent-generator.ts pattern — only deploy what the project type needs.
 */

import path from 'path';
import fs from 'fs-extra';
import type { TimsquadConfig } from '../types/config.js';
import {
  BASE_SKILLS, SKILL_PRESETS,
  BASE_KNOWLEDGE, KNOWLEDGE_PRESETS,
  DOMAIN_SKILL_MAP, DOMAIN_KNOWLEDGE_MAP, STACK_SKILL_MAP,
} from '../types/config.js';
import type { TemplateVariables } from './template.js';
import { substituteVariables } from './template.js';

// ─────────────────────────────────────────────────
// Skills
// ─────────────────────────────────────────────────

/**
 * Get skills to deploy for a project.
 * Combines BASE_SKILLS + type-specific + domain-specific + stack-specific skills.
 */
/**
 * Get methodology skills based on config.
 * Dynamically includes methodology/tdd, methodology/bdd etc. based on config.methodology.development.
 */
function getMethodologySkills(config: TimsquadConfig): string[] {
  const skills: string[] = [];
  const dev = config.methodology?.development;
  if (dev && dev !== 'none') skills.push(`tsq-${dev}`);
  const arch = config.methodology?.architecture;
  if (arch && arch !== 'none') skills.push(`tsq-${arch}`);
  return skills;
}

/**
 * Get skills to deploy for a project.
 * Combines BASE_SKILLS + type-specific + domain-specific + stack-specific + methodology skills.
 */
export function getActiveSkills(config: TimsquadConfig): string[] {
  const typeSkills = SKILL_PRESETS[config.project.type] || [];
  const domainSkills = config.project.domain
    ? (DOMAIN_SKILL_MAP[config.project.domain] || [])
    : [];
  const stackSkills = normalizeStack(config)
    .flatMap(s => STACK_SKILL_MAP[s] || []);
  const methodologySkills = getMethodologySkills(config);

  return [...new Set([...BASE_SKILLS, ...typeSkills, ...domainSkills, ...stackSkills, ...methodologySkills])];
}

/**
 * Normalize stack to string[].
 * Handles: string[] (v3.3+), missing (derive from top-level stack), object (legacy v2).
 */
function normalizeStack(config: TimsquadConfig): string[] {
  const projectStack = config.project.stack;

  // Normal case: already an array (empty = intentional "no stack skills")
  if (Array.isArray(projectStack)) {
    return projectStack;
  }

  // Legacy: object format ({language: 'typescript', frontend: 'nextjs'})
  if (projectStack && typeof projectStack === 'object') {
    return Object.values(projectStack as Record<string, string>).filter(Boolean);
  }

  // Fallback: project.stack is undefined → derive from top-level stack config
  if (projectStack === undefined && config.stack) {
    return Object.values(config.stack)
      .filter((v): v is string => typeof v === 'string' && v !== 'none');
  }

  return [];
}

/**
 * Deploy only active skills from templates to project.
 * Each skill is a directory: SKILL.md + optional rules/
 */
export async function deploySkills(
  templatesDir: string,
  destSkillsDir: string,
  activeSkills: string[],
  variables: TemplateVariables,
): Promise<void> {
  const srcSkillsDir = path.join(templatesDir, 'base', 'skills');

  if (!await fs.pathExists(srcSkillsDir)) return;

  // Always deploy _template/
  const templateDir = path.join(srcSkillsDir, '_template');
  if (await fs.pathExists(templateDir)) {
    await copySkillDir(templateDir, path.join(destSkillsDir, '_template'), variables);
  }

  // Deploy active skills
  for (const skill of activeSkills) {
    const srcPath = path.join(srcSkillsDir, skill);
    const destPath = path.join(destSkillsDir, skill);

    if (!await fs.pathExists(srcPath)) continue;

    await copySkillDir(srcPath, destPath, variables);
  }

  // Remove inactive skills (if re-deploying / upgrading)
  await removeInactiveSkills(destSkillsDir, activeSkills);
}

/**
 * Copy a skill directory (SKILL.md + rules/ + references/ + scripts/)
 */
async function copySkillDir(
  srcDir: string,
  destDir: string,
  variables: TemplateVariables,
): Promise<void> {
  await fs.ensureDir(destDir);
  const entries = await fs.readdir(srcDir, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(srcDir, entry.name);
    const destPath = path.join(destDir, entry.name);

    if (entry.isDirectory()) {
      await copySkillDir(srcPath, destPath, variables);
    } else {
      const ext = path.extname(entry.name).toLowerCase();
      const textExts = ['.md', '.yaml', '.yml', '.json', '.xml', '.txt'];

      if (textExts.includes(ext)) {
        const content = await fs.readFile(srcPath, 'utf-8');
        const processed = substituteVariables(content, variables);
        await fs.writeFile(destPath, processed, 'utf-8');
      } else {
        await fs.copy(srcPath, destPath);
        // Set executable permission for shell scripts
        if (ext === '.sh') {
          await fs.chmod(destPath, 0o755);
        }
      }
    }
  }
}

/**
 * Validate skill structure and return warnings.
 * - SKILL.md should be ≤120 lines (concise index, not exhaustive doc)
 */
export function validateSkillStructure(skillDir: string): string[] {
  const warnings: string[] = [];
  const skillMd = path.join(skillDir, 'SKILL.md');

  if (!fs.pathExistsSync(skillMd)) return warnings;

  const content = fs.readFileSync(skillMd, 'utf-8');
  const lineCount = content.split('\n').length;

  if (lineCount > 120) {
    warnings.push(
      `${skillDir}: SKILL.md is ${lineCount} lines (max 120). ` +
      `Consider moving detailed content to references/ or rules/.`
    );
  }

  return warnings;
}

/**
 * Remove skill directories that are not in the active list.
 * All skills are flat (tsq-* prefix), no nested structure.
 */
async function removeInactiveSkills(
  destSkillsDir: string,
  activeSkills: string[],
): Promise<void> {
  if (!await fs.pathExists(destSkillsDir)) return;

  const keepSet = new Set<string>(['_template', '_shared', ...activeSkills]);
  const entries = await fs.readdir(destSkillsDir, { withFileTypes: true });

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    if (keepSet.has(entry.name)) continue;
    await fs.remove(path.join(destSkillsDir, entry.name));
  }
}

// ─────────────────────────────────────────────────
// Knowledge
// ─────────────────────────────────────────────────

/**
 * Get knowledge files to deploy for a project.
 * Combines BASE_KNOWLEDGE + type-specific + domain-specific knowledge.
 */
export function getActiveKnowledge(config: TimsquadConfig): string[] {
  const typeKnowledge = KNOWLEDGE_PRESETS[config.project.type] || [];
  const domainKnowledge = config.project.domain
    ? (DOMAIN_KNOWLEDGE_MAP[config.project.domain] || [])
    : [];

  return [...new Set([...BASE_KNOWLEDGE, ...typeKnowledge, ...domainKnowledge])];
}

/**
 * Deploy only active knowledge files from templates to project.
 * Each knowledge item maps to a .md file under knowledge/.
 */
export async function deployKnowledge(
  templatesDir: string,
  destKnowledgeDir: string,
  activeKnowledge: string[],
  variables: TemplateVariables,
): Promise<void> {
  const srcKnowledgeDir = path.join(templatesDir, 'base', 'knowledge');

  if (!await fs.pathExists(srcKnowledgeDir)) return;

  for (const item of activeKnowledge) {
    // item = 'checklists/security' → file = 'checklists/security.md'
    const srcPath = path.join(srcKnowledgeDir, item + '.md');
    const destPath = path.join(destKnowledgeDir, item + '.md');

    if (!await fs.pathExists(srcPath)) continue;

    const content = await fs.readFile(srcPath, 'utf-8');
    const processed = substituteVariables(content, variables);
    await fs.ensureDir(path.dirname(destPath));
    await fs.writeFile(destPath, processed, 'utf-8');
  }
}

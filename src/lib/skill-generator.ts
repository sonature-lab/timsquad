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
export function getActiveSkills(config: TimsquadConfig): string[] {
  const typeSkills = SKILL_PRESETS[config.project.type] || [];
  const domainSkills = config.project.domain
    ? (DOMAIN_SKILL_MAP[config.project.domain] || [])
    : [];
  const stackSkills = normalizeStack(config)
    .flatMap(s => STACK_SKILL_MAP[s] || []);

  return [...new Set([...BASE_SKILLS, ...typeSkills, ...domainSkills, ...stackSkills])];
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
 * Preserves _template/ always.
 */
async function removeInactiveSkills(
  destSkillsDir: string,
  activeSkills: string[],
): Promise<void> {
  if (!await fs.pathExists(destSkillsDir)) return;

  // Build a set of top-level directories to keep
  const keepSet = new Set<string>();
  keepSet.add('_template');
  for (const skill of activeSkills) {
    // For nested skills like 'frontend/react', keep the top-level 'frontend'
    const topLevel = skill.split('/')[0];
    keepSet.add(topLevel);
  }

  const entries = await fs.readdir(destSkillsDir, { withFileTypes: true });
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    if (keepSet.has(entry.name)) {
      // For parent dirs like 'frontend/', check subdirectories
      await removeInactiveSubSkills(
        path.join(destSkillsDir, entry.name),
        activeSkills,
        entry.name,
      );
      continue;
    }
    // Completely inactive top-level skill
    await fs.remove(path.join(destSkillsDir, entry.name));
  }
}

/**
 * For parent skill directories (e.g. frontend/, methodology/),
 * remove inactive sub-skills while keeping active ones.
 */
async function removeInactiveSubSkills(
  parentDir: string,
  activeSkills: string[],
  parentName: string,
): Promise<void> {
  const entries = await fs.readdir(parentDir, { withFileTypes: true });

  // Check if this directory itself is a skill (has SKILL.md)
  const hasSelfSkill = entries.some(e => e.name === 'SKILL.md');
  const isParentActive = activeSkills.includes(parentName);

  // If parent itself is an active skill, keep it
  if (hasSelfSkill && !isParentActive) {
    // Remove only SKILL.md and rules/ from parent, keep subdirs
  }

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    if (['rules', 'references', 'scripts'].includes(entry.name)) continue; // belongs to parent skill

    const subSkillPath = `${parentName}/${entry.name}`;
    if (!activeSkills.includes(subSkillPath)) {
      await fs.remove(path.join(parentDir, entry.name));
    }
  }

  // If parent directory is now empty (no SKILL.md, no subdirs), remove it
  const remaining = await fs.readdir(parentDir);
  if (remaining.length === 0) {
    await fs.remove(parentDir);
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

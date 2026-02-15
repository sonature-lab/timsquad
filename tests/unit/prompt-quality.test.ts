import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import path from 'node:path';
import { parseFrontmatter, extractXmlTags } from '../helpers/frontmatter.js';
import { AGENT_PRESETS, SKILL_PRESETS, KNOWLEDGE_PRESETS, BASE_SKILLS, BASE_KNOWLEDGE } from '../../src/types/config.js';
import type { ProjectType } from '../../src/types/project.js';

const TEMPLATES_DIR = path.resolve(import.meta.dirname, '../../templates');
const AGENTS_DIR = path.join(TEMPLATES_DIR, 'base', 'agents', 'base');
const SKILLS_DIR = path.join(TEMPLATES_DIR, 'base', 'skills');
const KNOWLEDGE_DIR = path.join(TEMPLATES_DIR, 'base', 'knowledge');

// ─────────────────────────────────────────
// Agent Prompt Quality
// ─────────────────────────────────────────

const agentFiles = readdirSync(AGENTS_DIR)
  .filter(f => f.startsWith('tsq-') && f.endsWith('.md'))
  .map(f => path.join(AGENTS_DIR, f));

describe('Agent Prompt - Frontmatter', () => {
  it.each(agentFiles)('should have valid frontmatter: %s', (file) => {
    const content = readFileSync(file, 'utf-8');
    const fm = parseFrontmatter(content);

    expect(fm).not.toBeNull();
    expect(fm).toHaveProperty('name');
    expect(fm).toHaveProperty('description');
    expect(fm).toHaveProperty('model');
    expect(['opus', 'sonnet', 'haiku']).toContain(fm!.model);
  });
});

describe('Agent Prompt - Required Sections', () => {
  it.each(agentFiles)('should have core XML sections: %s', (file) => {
    const content = readFileSync(file, 'utf-8');

    // 필수 섹션: <agent role="..."> 루트 + 구조적 섹션
    expect(content).toMatch(/<agent\s+role="/);
    expect(content).toMatch(/<role-summary>|<rules>|<prerequisites>/);
  });

  it.each(agentFiles)('should inject tsq-protocol via frontmatter skills: %s', (file) => {
    const content = readFileSync(file, 'utf-8');
    const fm = parseFrontmatter(content);

    // tsq-protocol 스킬이 frontmatter skills 배열에 포함되어야 함
    expect(fm).toHaveProperty('skills');
    expect(fm!.skills).toContain('tsq-protocol');
  });
});

describe('Agent Prompt - XML Tag Balance', () => {
  it.each(agentFiles)('should have balanced custom XML tags: %s', (file) => {
    const content = readFileSync(file, 'utf-8');
    const { open, close } = extractXmlTags(content);

    // 커스텀 태그 (HTML 표준 태그 제외)
    const htmlTags = new Set(['p', 'br', 'hr', 'li', 'ul', 'ol', 'code', 'pre', 'strong', 'em', 'a', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'table', 'tr', 'td', 'th', 'thead', 'tbody', 'div', 'span', 'img', 'blockquote']);

    const customOpen = open.filter(t => !htmlTags.has(t));
    const customClose = close.filter(t => !htmlTags.has(t));

    // 각 open tag에 대응하는 close tag가 존재해야 함
    const openCounts = new Map<string, number>();
    const closeCounts = new Map<string, number>();

    for (const tag of customOpen) {
      openCounts.set(tag, (openCounts.get(tag) || 0) + 1);
    }
    for (const tag of customClose) {
      closeCounts.set(tag, (closeCounts.get(tag) || 0) + 1);
    }

    for (const [tag, count] of openCounts) {
      const closeCount = closeCounts.get(tag) || 0;
      expect(closeCount, `Tag <${tag}> opened ${count} times but closed ${closeCount} times in ${path.basename(file)}`).toBe(count);
    }
  });
});

// ─────────────────────────────────────────
// Skill Prompt Quality
// ─────────────────────────────────────────

function findSkillFiles(dir: string, prefix = ''): string[] {
  const results: string[] = [];
  if (!existsSync(dir)) return results;

  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      results.push(...findSkillFiles(path.join(dir, entry.name), `${prefix}${entry.name}/`));
    } else if (entry.name === 'SKILL.md') {
      results.push(path.join(dir, entry.name));
    }
  }
  return results;
}

const skillFiles = findSkillFiles(SKILLS_DIR);

describe('Skill Prompt - Frontmatter', () => {
  it.each(skillFiles)('should have valid frontmatter: %s', (file) => {
    const content = readFileSync(file, 'utf-8');
    const fm = parseFrontmatter(content);

    expect(fm).not.toBeNull();
    expect(fm).toHaveProperty('name');
    expect(fm).toHaveProperty('description');
  });

  // _template은 플레이스홀더이므로 제외
  const realSkillFrontmatter = skillFiles.filter(f => !f.includes('_template'));

  it.each(realSkillFrontmatter)('should have version and tags: %s', (file) => {
    const content = readFileSync(file, 'utf-8');
    const fm = parseFrontmatter(content);

    expect(fm).not.toBeNull();
    expect(fm).toHaveProperty('version');
    expect(fm).toHaveProperty('tags');
    expect(Array.isArray(fm!.tags), `tags should be an array in ${path.basename(file)}`).toBe(true);
  });
});

describe('Skill Prompt - Structure', () => {
  // _template은 플레이스홀더이므로 제외
  const realSkillFiles = skillFiles.filter(f => !f.includes('_template'));

  it.each(realSkillFiles)('should have meaningful structure (heading or XML root): %s', (file) => {
    const content = readFileSync(file, 'utf-8');
    // 스킬 파일은 markdown heading 또는 <skill> XML 루트 중 하나
    expect(content).toMatch(/^#{1,2}\s+.+|<skill[\s>]/m);
  });

  it.each(realSkillFiles)('should have at least 20 lines of content: %s', (file) => {
    const content = readFileSync(file, 'utf-8');
    const lines = content.split('\n').length;
    expect(lines).toBeGreaterThanOrEqual(20);
  });

  it.each(realSkillFiles)('should not exceed 120 lines (use references/ for details): %s', (file) => {
    const content = readFileSync(file, 'utf-8');
    const lines = content.split('\n').length;
    expect(lines, `SKILL.md is ${lines} lines, max 120`).toBeLessThanOrEqual(120);
  });
});

// ─────────────────────────────────────────
// Rules & References File Quality
// ─────────────────────────────────────────

function findFilesInSubdir(dir: string, subdir: string): string[] {
  const results: string[] = [];
  if (!existsSync(dir)) return results;

  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      // Check if this directory contains the target subdir
      const subPath = path.join(fullPath, subdir);
      if (existsSync(subPath)) {
        for (const file of readdirSync(subPath)) {
          if (file.endsWith('.md') && !file.startsWith('_')) {
            results.push(path.join(subPath, file));
          }
        }
      }
      // Recurse into subdirectories (for nested skills like frontend/react)
      results.push(...findFilesInSubdir(fullPath, subdir));
    }
  }
  return results;
}

const ruleFiles = findFilesInSubdir(SKILLS_DIR, 'rules');
const referenceFiles = findFilesInSubdir(SKILLS_DIR, 'references');

describe('Rules Files - Frontmatter', () => {
  if (ruleFiles.length === 0) return;

  it.each(ruleFiles)('should have title in frontmatter: %s', (file) => {
    const content = readFileSync(file, 'utf-8');
    const fm = parseFrontmatter(content);

    expect(fm, `Missing frontmatter in ${path.basename(file)}`).not.toBeNull();
    expect(fm).toHaveProperty('title');
  });
});

describe('References Files - Frontmatter', () => {
  if (referenceFiles.length === 0) return;

  it.each(referenceFiles)('should have title and category in frontmatter: %s', (file) => {
    const content = readFileSync(file, 'utf-8');
    const fm = parseFrontmatter(content);

    expect(fm, `Missing frontmatter in ${path.basename(file)}`).not.toBeNull();
    expect(fm).toHaveProperty('title');
    expect(fm).toHaveProperty('category');
    const validCategories = ['guide', 'api', 'migration', 'external', 'template', 'reference'];
    expect(validCategories, `Invalid category "${fm!.category}" in ${path.basename(file)}`).toContain(fm!.category);
  });
});

// ─────────────────────────────────────────
// Cross-Reference Integrity
// ─────────────────────────────────────────

const ALL_TYPES: ProjectType[] = ['web-service', 'web-app', 'api-backend', 'platform', 'fintech', 'infra'];

describe('Cross-Reference - Agent Presets → Template Files', () => {
  it.each(ALL_TYPES)('all agents for %s should have template files', (type) => {
    const agents = AGENT_PRESETS[type];

    for (const agent of agents) {
      const filePath = path.join(AGENTS_DIR, `tsq-${agent}.md`);
      expect(existsSync(filePath), `Missing agent template: tsq-${agent}.md for type ${type}`).toBe(true);
    }
  });
});

describe('Cross-Reference - Skill Presets → Template Files', () => {
  it.each(ALL_TYPES)('all skills for %s should have template directories', (type) => {
    const skills = SKILL_PRESETS[type];

    for (const skill of skills) {
      const filePath = path.join(SKILLS_DIR, skill, 'SKILL.md');
      expect(existsSync(filePath), `Missing skill template: ${skill}/SKILL.md for type ${type}`).toBe(true);
    }
  });

  it('all BASE_SKILLS should have template directories', () => {
    for (const skill of BASE_SKILLS) {
      const filePath = path.join(SKILLS_DIR, skill, 'SKILL.md');
      expect(existsSync(filePath), `Missing base skill template: ${skill}/SKILL.md`).toBe(true);
    }
  });
});

describe('Cross-Reference - Knowledge Presets → Template Files', () => {
  it.each(ALL_TYPES)('all knowledge for %s should have template files', (type) => {
    const knowledge = KNOWLEDGE_PRESETS[type];

    for (const item of knowledge) {
      const filePath = path.join(KNOWLEDGE_DIR, item + '.md');
      expect(existsSync(filePath), `Missing knowledge template: ${item}.md for type ${type}`).toBe(true);
    }
  });

  it('all BASE_KNOWLEDGE should have template files', () => {
    for (const item of BASE_KNOWLEDGE) {
      const filePath = path.join(KNOWLEDGE_DIR, item + '.md');
      expect(existsSync(filePath), `Missing base knowledge template: ${item}.md`).toBe(true);
    }
  });
});

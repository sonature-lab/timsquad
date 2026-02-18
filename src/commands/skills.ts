import { Command } from 'commander';
import path from 'path';
import os from 'os';
import fs from 'fs-extra';
import { execSync } from 'child_process';
import { colors, printHeader, printError, printSuccess, printWarning } from '../utils/colors.js';
import { findProjectRoot } from '../lib/project.js';
import { exists } from '../utils/fs.js';

interface SkillInfo {
  name: string;
  version: string;
  description: string;
  tags: string[];
  path: string;
  ruleCount: number;
  refCount: number;
}

export function registerSkillsCommand(program: Command): void {
  const skillsCmd = program
    .command('skills')
    .description('Manage project skills (.claude/skills/)');

  skillsCmd
    .command('list')
    .description('List deployed skills in current project')
    .action(async () => {
      try {
        await listSkills();
      } catch (error) {
        printError((error as Error).message);
        process.exit(1);
      }
    });

  skillsCmd
    .command('search <query>')
    .description('Search external skills (skills.sh)')
    .action(async (query: string) => {
      try {
        await searchSkills(query);
      } catch (error) {
        printError((error as Error).message);
        process.exit(1);
      }
    });

  skillsCmd
    .command('add <source>')
    .description('Install a skill from URL or skills.sh registry')
    .action(async (source: string) => {
      try {
        await addSkill(source);
      } catch (error) {
        printError((error as Error).message);
        process.exit(1);
      }
    });

  skillsCmd
    .command('remove <name>')
    .description('Remove a deployed skill')
    .action(async (name: string) => {
      try {
        await removeSkill(name);
      } catch (error) {
        printError((error as Error).message);
        process.exit(1);
      }
    });
}

// ─────────────────────────────────────────────────
// Subcommand implementations
// ─────────────────────────────────────────────────

async function listSkills(): Promise<void> {
  const projectRoot = await findProjectRoot();
  if (!projectRoot) {
    throw new Error('Not a TimSquad project. Run `tsq init` first.');
  }

  const skillsDir = path.join(projectRoot, '.claude', 'skills');
  if (!await exists(skillsDir)) {
    throw new Error('Skills directory not found. Run `tsq init` first.');
  }

  printHeader('Deployed Skills');

  const skills = await findAllSkills(skillsDir);

  if (skills.length === 0) {
    console.log(colors.dim('  No skills deployed.\n'));
    return;
  }

  for (const skill of skills) {
    const relPath = path.relative(skillsDir, path.dirname(skill.path));
    const version = skill.version ? `v${skill.version}` : '';
    const counts = `${skill.ruleCount} rules, ${skill.refCount} refs`;

    console.log(
      `  ${colors.success('●')} ${colors.path(relPath.padEnd(35))} ` +
      `${colors.dim(counts.padEnd(18))} ` +
      `${colors.dim(version)}`
    );
  }

  console.log(`\n  ${colors.dim(`Total: ${skills.length} skill(s)`)}\n`);
}

async function searchSkills(query: string): Promise<void> {
  printHeader(`Searching Skills: "${query}"`);

  try {
    const sanitized = query.replace(/["`$\\]/g, '');
    const result = execSync(
      `npx --yes @anthropic-ai/skills find "${sanitized}"`,
      { encoding: 'utf-8', timeout: 30000, stdio: ['pipe', 'pipe', 'pipe'] }
    );
    console.log(result);
  } catch {
    printWarning('Failed to search skills. Ensure npm/npx is available.');
    console.log(colors.dim(`  Manual: npx @anthropic-ai/skills find "${query}"\n`));
  }
}

async function addSkill(source: string): Promise<void> {
  const projectRoot = await findProjectRoot();
  if (!projectRoot) {
    throw new Error('Not a TimSquad project. Run `tsq init` first.');
  }

  const skillsDir = path.join(projectRoot, '.claude', 'skills');
  await fs.ensureDir(skillsDir);

  if (source.startsWith('http://') || source.startsWith('https://')) {
    await addFromGitHub(source, skillsDir);
  } else {
    await addFromRegistry(source, skillsDir);
  }
}

async function addFromRegistry(name: string, destDir: string): Promise<void> {
  printHeader(`Installing Skill: ${name}`);

  try {
    const sanitized = name.replace(/["`$\\]/g, '');
    execSync(
      `npx --yes @anthropic-ai/skills install "${sanitized}"`,
      { encoding: 'utf-8', timeout: 60000, stdio: ['pipe', 'pipe', 'pipe'] }
    );
    printSuccess(`Skill "${name}" installed.`);
    console.log(colors.dim(`  Location: ${destDir}\n`));
  } catch {
    printError(`Failed to install skill "${name}".`);
    console.log(colors.dim(`  Manual: npx @anthropic-ai/skills install "${name}"\n`));
  }
}

async function addFromGitHub(url: string, destDir: string): Promise<void> {
  printHeader(`Installing Skill from: ${url}`);

  const tmpDir = path.join(os.tmpdir(), `tsq-skill-${Date.now()}`);

  try {
    const sanitizedUrl = url.replace(/["`$\\]/g, '');
    execSync(
      `git clone --depth 1 "${sanitizedUrl}" "${tmpDir}"`,
      { encoding: 'utf-8', timeout: 60000, stdio: ['pipe', 'pipe', 'pipe'] }
    );

    const skillMd = path.join(tmpDir, 'SKILL.md');
    if (!await fs.pathExists(skillMd)) {
      throw new Error('No SKILL.md found in repository root.');
    }

    const content = await fs.readFile(skillMd, 'utf-8');
    const frontmatter = parseSkillFrontmatter(content);
    const skillName = frontmatter.name || path.basename(url, '.git');
    const destPath = path.join(destDir, skillName);

    await fs.ensureDir(destPath);
    await fs.copy(skillMd, path.join(destPath, 'SKILL.md'));

    for (const subdir of ['rules', 'references', 'scripts']) {
      const src = path.join(tmpDir, subdir);
      if (await fs.pathExists(src)) {
        await fs.copy(src, path.join(destPath, subdir));
      }
    }

    printSuccess(`Skill "${skillName}" installed to .claude/skills/${skillName}/`);
  } finally {
    await fs.remove(tmpDir);
  }
}

async function removeSkill(name: string): Promise<void> {
  const projectRoot = await findProjectRoot();
  if (!projectRoot) {
    throw new Error('Not a TimSquad project. Run `tsq init` first.');
  }

  const skillPath = path.join(projectRoot, '.claude', 'skills', name);
  if (!await exists(skillPath)) {
    throw new Error(`Skill not found: ${name}`);
  }

  await fs.remove(skillPath);
  printSuccess(`Skill "${name}" removed.`);
}

// ─────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────

/**
 * Parse SKILL.md YAML frontmatter
 */
export function parseSkillFrontmatter(content: string): {
  name: string;
  version: string;
  description: string;
  tags: string[];
} {
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match) {
    return { name: '', version: '', description: '', tags: [] };
  }

  const yaml = match[1];
  const name = yaml.match(/^name:\s*(.+)$/m)?.[1]?.trim() ?? '';
  const version = yaml.match(/^version:\s*["']?(.+?)["']?\s*$/m)?.[1]?.trim() ?? '';
  const description = yaml.match(/^description:\s*(.+)$/m)?.[1]?.trim() ?? '';

  const tagsMatch = yaml.match(/^tags:\s*\[([^\]]*)\]/m);
  const tags = tagsMatch
    ? tagsMatch[1].split(',').map(t => t.trim()).filter(Boolean)
    : [];

  return { name, version, description, tags };
}

/**
 * Recursively find all SKILL.md files in a directory
 */
async function findAllSkills(dir: string): Promise<SkillInfo[]> {
  const skills: SkillInfo[] = [];
  await scanSkillDir(dir, skills);
  return skills.sort((a, b) => a.path.localeCompare(b.path));
}

async function scanSkillDir(dir: string, skills: SkillInfo[]): Promise<void> {
  if (!await fs.pathExists(dir)) return;

  const entries = await fs.readdir(dir, { withFileTypes: true });
  const skillMdPath = path.join(dir, 'SKILL.md');

  if (await fs.pathExists(skillMdPath)) {
    const content = await fs.readFile(skillMdPath, 'utf-8');
    const frontmatter = parseSkillFrontmatter(content);
    const ruleCount = await countFiles(path.join(dir, 'rules'));
    const refCount = await countFiles(path.join(dir, 'references'));

    skills.push({
      name: frontmatter.name,
      version: frontmatter.version,
      description: frontmatter.description,
      tags: frontmatter.tags,
      path: skillMdPath,
      ruleCount,
      refCount,
    });
  }

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    if (['rules', 'references', 'scripts'].includes(entry.name)) continue;
    await scanSkillDir(path.join(dir, entry.name), skills);
  }
}

async function countFiles(dir: string): Promise<number> {
  if (!await fs.pathExists(dir)) return 0;
  const entries = await fs.readdir(dir);
  return entries.filter(f => f.endsWith('.md')).length;
}

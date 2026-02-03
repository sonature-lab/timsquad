import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs-extra';
import type { ProjectType, ProjectLevel } from '../types/index.js';
import { REQUIRED_SSOT_BY_LEVEL, REQUIRED_SSOT_BY_TYPE } from '../types/project.js';
import { getDateString, getTimestamp } from '../utils/date.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Template variables for substitution
 */
export interface TemplateVariables {
  PROJECT_NAME: string;
  PROJECT_TYPE: string;
  PROJECT_LEVEL: string;
  DATE: string;
  TIMESTAMP: string;
  INIT_DATE: string;
}

/**
 * Get templates directory path
 */
export function getTemplatesDir(): string {
  // Resolve from package root (dist/lib -> templates)
  return path.resolve(__dirname, '..', '..', 'templates');
}

/**
 * Create template variables
 */
export function createTemplateVariables(
  name: string,
  type: ProjectType,
  level: ProjectLevel
): TemplateVariables {
  const now = new Date();
  return {
    PROJECT_NAME: name,
    PROJECT_TYPE: type,
    PROJECT_LEVEL: String(level),
    DATE: getDateString(),
    TIMESTAMP: getTimestamp(),
    INIT_DATE: now.toISOString(),
  };
}

/**
 * Substitute variables in content
 */
export function substituteVariables(content: string, variables: TemplateVariables): string {
  let result = content;

  for (const [key, value] of Object.entries(variables)) {
    const pattern = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
    result = result.replace(pattern, value);
  }

  return result;
}

/**
 * Copy and process a single file
 */
async function copyAndProcessFile(
  src: string,
  dest: string,
  variables: TemplateVariables
): Promise<void> {
  const content = await fs.readFile(src, 'utf-8');
  const processed = substituteVariables(content, variables);

  await fs.ensureDir(path.dirname(dest));
  await fs.writeFile(dest, processed, 'utf-8');
}

/**
 * Copy directory recursively with variable substitution
 */
async function copyDirectoryWithSubstitution(
  srcDir: string,
  destDir: string,
  variables: TemplateVariables
): Promise<void> {
  const entries = await fs.readdir(srcDir, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(srcDir, entry.name);
    let destName = entry.name;

    // Remove .template suffix
    if (destName.endsWith('.template.md')) {
      destName = destName.replace('.template.md', '.md');
    } else if (destName.endsWith('.template.yaml')) {
      destName = destName.replace('.template.yaml', '.yaml');
    }

    const destPath = path.join(destDir, destName);

    if (entry.isDirectory()) {
      await copyDirectoryWithSubstitution(srcPath, destPath, variables);
    } else {
      // Process text files, copy binary files as-is
      const ext = path.extname(entry.name).toLowerCase();
      const textExtensions = ['.md', '.yaml', '.yml', '.json', '.xml', '.sh', '.txt'];

      if (textExtensions.includes(ext)) {
        await copyAndProcessFile(srcPath, destPath, variables);
      } else {
        await fs.copy(srcPath, destPath);
      }
    }
  }
}

/**
 * Get required SSOT documents for project
 */
export function getRequiredDocuments(type: ProjectType, level: ProjectLevel): string[] {
  const byLevel = REQUIRED_SSOT_BY_LEVEL[level];
  const byType = REQUIRED_SSOT_BY_TYPE[type];
  return [...new Set([...byLevel, ...byType])];
}

/**
 * Initialize project from templates
 */
export async function initializeProject(
  projectRoot: string,
  name: string,
  type: ProjectType,
  level: ProjectLevel
): Promise<void> {
  const templatesDir = getTemplatesDir();
  const variables = createTemplateVariables(name, type, level);

  // Adjust level for fintech
  const effectiveLevel = type === 'fintech' ? 3 : level;
  const effectiveVariables = { ...variables, PROJECT_LEVEL: String(effectiveLevel) };

  // 1. Copy common/.claude to .claude
  const commonClaudeDir = path.join(templatesDir, 'common', 'claude');
  const destClaudeDir = path.join(projectRoot, '.claude');
  await copyDirectoryWithSubstitution(commonClaudeDir, destClaudeDir, effectiveVariables);

  // 2. Copy common/timsquad to .timsquad
  const commonTimsquadDir = path.join(templatesDir, 'common', 'timsquad');
  const destTimsquadDir = path.join(projectRoot, '.timsquad');
  await copyDirectoryWithSubstitution(commonTimsquadDir, destTimsquadDir, effectiveVariables);

  // 3. Copy type-specific workflow
  const typeWorkflowDir = path.join(templatesDir, type, 'process');
  if (await fs.pathExists(typeWorkflowDir)) {
    const destProcessDir = path.join(destTimsquadDir, 'process');
    await copyDirectoryWithSubstitution(typeWorkflowDir, destProcessDir, effectiveVariables);
  }

  // 4. Create CLAUDE.md from template
  const claudeMdTemplate = path.join(templatesDir, 'common', 'CLAUDE.md.template');
  if (await fs.pathExists(claudeMdTemplate)) {
    await copyAndProcessFile(
      claudeMdTemplate,
      path.join(projectRoot, 'CLAUDE.md'),
      effectiveVariables
    );
  }

  // 5. Create additional directories
  const additionalDirs = [
    '.timsquad/logs',
    '.timsquad/logs/quick',
    '.timsquad/state',
    '.timsquad/knowledge',
    '.timsquad/retrospective/cycles',
    '.timsquad/retrospective/metrics',
    '.timsquad/retrospective/improvements/prompts',
    '.timsquad/retrospective/improvements/templates',
  ];

  for (const dir of additionalDirs) {
    await fs.ensureDir(path.join(projectRoot, dir));
  }

  // 6. Create initial state files
  await createInitialStateFiles(projectRoot, name, type, effectiveLevel);
}

/**
 * Create initial state files
 */
async function createInitialStateFiles(
  projectRoot: string,
  _name: string,
  _type: ProjectType,
  _level: ProjectLevel
): Promise<void> {
  // current-phase.json
  const phaseData = {
    current: 'planning',
    startedAt: new Date().toISOString(),
    progress: 0,
  };
  await fs.writeJson(
    path.join(projectRoot, '.timsquad', 'state', 'current-phase.json'),
    phaseData,
    { spaces: 2 }
  );

  // knowledge files
  const knowledgeDir = path.join(projectRoot, '.timsquad', 'knowledge');

  await fs.writeFile(
    path.join(knowledgeDir, 'tribal.md'),
    `# Tribal Knowledge\n\n## 코딩 컨벤션\n\n## 아키텍처 패턴\n`,
    'utf-8'
  );

  await fs.writeFile(
    path.join(knowledgeDir, 'lessons.md'),
    `# Lessons Learned\n\n`,
    'utf-8'
  );

  await fs.writeFile(
    path.join(knowledgeDir, 'constraints.md'),
    `# Project Constraints\n\n`,
    'utf-8'
  );
}

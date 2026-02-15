import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs-extra';
import type { ProjectType, ProjectLevel } from '../types/index.js';
import type { TimsquadConfig } from '../types/config.js';
import { REQUIRED_SSOT_BY_LEVEL, REQUIRED_SSOT_BY_TYPE } from '../types/project.js';
import { getDateString, getTimestamp } from '../utils/date.js';
import { getActiveAgents, generateAgentFiles, generateDelegationRules, formatActiveAgentsList } from './agent-generator.js';
import { getActiveSkills, deploySkills, getActiveKnowledge, deployKnowledge } from './skill-generator.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Template variables for substitution
 */
export interface TemplateVariables {
  PROJECT_NAME: string;
  PROJECT_TYPE: string;
  PROJECT_LEVEL: string;
  PROJECT_DOMAIN: string;
  PROJECT_PLATFORM: string;
  PROJECT_STACK: string;
  DATE: string;
  TIMESTAMP: string;
  INIT_DATE: string;
  ACTIVE_AGENTS: string;
  DELEGATION_RULES: string;
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
  level: ProjectLevel,
  config?: TimsquadConfig
): TemplateVariables {
  const now = new Date();

  // 에이전트 관련 변수 생성
  let activeAgentsText = '';
  let delegationRulesText = '';

  if (config) {
    const activeAgents = getActiveAgents(config);
    activeAgentsText = formatActiveAgentsList(activeAgents);
    delegationRulesText = generateDelegationRules(activeAgents);
  }

  return {
    PROJECT_NAME: name,
    PROJECT_TYPE: type,
    PROJECT_LEVEL: String(level),
    PROJECT_DOMAIN: config?.project?.domain ?? 'general-web',
    PROJECT_PLATFORM: config?.project?.platform ?? 'claude-code',
    PROJECT_STACK: config?.project?.stack?.join(', ') ?? '',
    DATE: getDateString(),
    TIMESTAMP: getTimestamp(),
    INIT_DATE: now.toISOString(),
    ACTIVE_AGENTS: activeAgentsText,
    DELEGATION_RULES: delegationRulesText,
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
export async function copyAndProcessFile(
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
export async function copyDirectoryWithSubstitution(
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
        // Preserve executable permission for shell scripts
        if (ext === '.sh') {
          await fs.chmod(destPath, 0o755);
        }
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
  level: ProjectLevel,
  config?: TimsquadConfig,
  automationEnabled = true,
): Promise<void> {
  const templatesDir = getTemplatesDir();

  // Adjust level for fintech
  const effectiveLevel = type === 'fintech' ? 3 : level;
  const variables = createTemplateVariables(name, type, effectiveLevel, config);

  // 1. Copy .claude/settings.json (개별 파일만)
  const platformDir = path.join(templatesDir, 'platforms', 'claude-code');
  const destClaudeDir = path.join(projectRoot, '.claude');
  await fs.ensureDir(destClaudeDir);
  const settingsPath = path.join(platformDir, 'settings.json');
  if (await fs.pathExists(settingsPath)) {
    await copyAndProcessFile(settingsPath, path.join(destClaudeDir, 'settings.json'), variables);
  }

  // 2. Deploy .claude/rules/ (메인 세션 전용 상세 규칙)
  const srcRulesDir = path.join(platformDir, 'rules');
  const destRulesDir = path.join(destClaudeDir, 'rules');
  if (await fs.pathExists(srcRulesDir)) {
    await copyDirectoryWithSubstitution(srcRulesDir, destRulesDir, variables);
  }

  // 3. Config 기반 에이전트 동적 생성 (활성 에이전트만 배치)
  if (config) {
    const activeAgents = getActiveAgents(config);
    const destAgentsDir = path.join(destClaudeDir, 'agents');
    await generateAgentFiles(templatesDir, destAgentsDir, activeAgents, variables, config);

    // 3. Config 기반 스킬 선택적 배치 (타입에 맞는 스킬만)
    const activeSkills = getActiveSkills(config);
    await deploySkills(templatesDir, path.join(destClaudeDir, 'skills'), activeSkills, variables);

    // 4. Config 기반 knowledge 선택적 배치 (타입에 맞는 체크리스트만)
    const activeKnowledge = getActiveKnowledge(config);
    await deployKnowledge(templatesDir, path.join(destClaudeDir, 'knowledge'), activeKnowledge, variables);
  } else {
    // config 없이 호출된 경우 전체 복사 (fallback)
    await copyDirectoryWithSubstitution(platformDir, destClaudeDir, variables);
    const baseAgentsDir = path.join(templatesDir, 'base', 'agents');
    if (await fs.pathExists(baseAgentsDir)) {
      await copyDirectoryWithSubstitution(baseAgentsDir, path.join(destClaudeDir, 'agents'), variables);
    }
    const baseSkillsDir = path.join(templatesDir, 'base', 'skills');
    if (await fs.pathExists(baseSkillsDir)) {
      await copyDirectoryWithSubstitution(baseSkillsDir, path.join(destClaudeDir, 'skills'), variables);
    }
    const baseKnowledgeDir = path.join(templatesDir, 'base', 'knowledge');
    if (await fs.pathExists(baseKnowledgeDir)) {
      await copyDirectoryWithSubstitution(baseKnowledgeDir, path.join(destClaudeDir, 'knowledge'), variables);
    }
  }

  // 3. Copy common/timsquad to .timsquad
  const commonTimsquadDir = path.join(templatesDir, 'base', 'timsquad');
  const destTimsquadDir = path.join(projectRoot, '.timsquad');
  await copyDirectoryWithSubstitution(commonTimsquadDir, destTimsquadDir, variables);

  // 4. Copy type-specific workflow
  const typeWorkflowDir = path.join(templatesDir, 'project-types', type, 'process');
  if (await fs.pathExists(typeWorkflowDir)) {
    const destProcessDir = path.join(destTimsquadDir, 'process');
    await copyDirectoryWithSubstitution(typeWorkflowDir, destProcessDir, variables);
  }

  // 5. Create CLAUDE.md from template
  const claudeMdTemplate = path.join(templatesDir, 'platforms', 'claude-code', 'CLAUDE.md.template');
  if (await fs.pathExists(claudeMdTemplate)) {
    await copyAndProcessFile(
      claudeMdTemplate,
      path.join(projectRoot, 'CLAUDE.md'),
      variables
    );
  }

  // 5. Create additional directories
  const additionalDirs = [
    '.timsquad/logs',
    '.timsquad/logs/quick',
    '.timsquad/logs/sessions',
    '.timsquad/logs/tasks',
    '.timsquad/logs/sequences',
    '.timsquad/logs/phases',
    '.timsquad/reports',
    '.timsquad/state',
    '.timsquad/state/meta-index',
    '.timsquad/state/meta-index/ui-index',
    '.timsquad/.daemon',
    '.timsquad/knowledge',
    '.timsquad/retrospective/cycles',
    '.timsquad/retrospective/metrics',
    '.timsquad/retrospective/improvements/prompts',
    '.timsquad/retrospective/improvements/templates',
    '.claude/knowledge/platforms',
    '.claude/knowledge/domains',
    '.claude/knowledge/checklists',
    '.claude/knowledge/templates',
  ];

  for (const dir of additionalDirs) {
    await fs.ensureDir(path.join(projectRoot, dir));
  }

  // 6. Create initial state files
  await createInitialStateFiles(projectRoot, name, type, effectiveLevel, automationEnabled);

  // 7. Create .gitignore (기존 파일이 없을 때만)
  await createGitignore(projectRoot);
}

/**
 * Create initial state files
 */
async function createInitialStateFiles(
  projectRoot: string,
  _name: string,
  _type: ProjectType,
  _level: ProjectLevel,
  automationEnabled = true,
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

  // workflow.json (자동화 워크플로우 상태)
  const workflowData = {
    schema_version: '1.0.0',
    automation: {
      sequence_log: automationEnabled,
      phase_log: automationEnabled,
      phase_gate: automationEnabled,
      metrics: automationEnabled,
      retro: automationEnabled,
    },
    current_phase: null,
    sequences: {},
    completed_phases: [],
  };
  await fs.writeJson(
    path.join(projectRoot, '.timsquad', 'state', 'workflow.json'),
    workflowData,
    { spaces: 2 }
  );

  // knowledge files (이하 기존 로직)
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

/**
 * Create .gitignore for TimSquad project
 * .timsquad/, .claude/, CLAUDE.md 는 git 추적 대상으로 포함
 * 런타임 생성 파일과 일반적 무시 대상만 제외
 */
async function createGitignore(projectRoot: string): Promise<void> {
  const gitignorePath = path.join(projectRoot, '.gitignore');

  // 기존 .gitignore가 있으면 건드리지 않음
  if (await fs.pathExists(gitignorePath)) {
    return;
  }

  const content = `# OS
.DS_Store
Thumbs.db

# Editor
.vscode/
.idea/
*.swp
*.swo

# Node
node_modules/
npm-debug.log*
yarn-error.log*
pnpm-debug.log*

# Build output
dist/
build/
.next/
out/

# Environment
.env
.env.local
.env.*.local

# Temp
*.tmp
*.temp

# ============================================================
# TimSquad - 아래 항목은 git에 포함됨 (ignore하지 않음)
# ============================================================
# CLAUDE.md          → 프로젝트 에이전트 지시사항 (추적)
# .claude/           → 에이전트, 스킬, 훅 설정 (추적)
# .timsquad/         → SSOT, 설정, 프로세스 (추적)
#
# 단, 런타임 생성 로그/세션 데이터는 제외:
.timsquad/logs/sessions/
.timsquad/logs/quick/
.timsquad/logs/tasks/
.timsquad/logs/sequences/
.timsquad/logs/phases/
.timsquad/logs/*-session.md
.timsquad/logs/*-alerts.md
.timsquad/logs/workflow-automation.log
.timsquad/retrospective/metrics/latest.json
.timsquad/state/meta-index/
.timsquad/state/workflow.json
.timsquad/.daemon/
.timsquad/.daemon.pid
.timsquad/.daemon.log
.timsquad/.daemon.sock
.timsquad/.upgrade-backup/
`;

  await fs.writeFile(gitignorePath, content, 'utf-8');
}

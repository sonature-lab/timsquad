import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs-extra';
import type { ProjectType, ProjectLevel } from '../types/index.js';
import type { TimsquadConfig } from '../types/config.js';
import { REQUIRED_SSOT_BY_LEVEL, REQUIRED_SSOT_BY_TYPE, SSOT_TYPE_LEVEL_MAP } from '../types/project.js';
import { getDateString, getTimestamp } from '../utils/date.js';
import { getActiveAgents, generateAgentFiles } from './agent-generator.js';
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
}

/**
 * TimSquad CLAUDE.md injection block
 */
const TIMSQUAD_BLOCK = `<!-- tsq:start -->
## TimSquad

### 파이프라인 사전 조건
사용자가 구현/설계/테스트 등 작업을 지시하면 아래를 먼저 확인:
1. **데몬 미기동**: \`.timsquad/.daemon.pid\` 없으면 → "\`/tsq-start\`로 파이프라인을 시작해주세요" 안내
2. **SSOT 미충족**: \`.timsquad/ssot/prd.md\`가 placeholder만이면 → "\`/tsq-start\`로 온보딩을 진행해주세요 (PRD 작성 + 기능별 /tsq-grill 인터뷰)" 안내
3. 위 조건 충족 시 정상 파이프라인 진행

### 작업 원칙
- 요구사항에 여러 해석이 가능하면 선택지를 제시
- 구현 전에 검증 기준을 먼저 명시
<!-- tsq:end -->`;

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
  variables: TemplateVariables,
  options?: { exclude?: string[] },
): Promise<void> {
  const entries = await fs.readdir(srcDir, { withFileTypes: true });
  const excludeSet = new Set(options?.exclude ?? []);

  for (const entry of entries) {
    if (excludeSet.has(entry.name)) continue;
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
      await copyDirectoryWithSubstitution(srcPath, destPath, variables, options);
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
  const byTypeLevel = Object.entries(SSOT_TYPE_LEVEL_MAP)
    .filter(([, typeMap]) => {
      const minLevel = typeMap[type];
      return minLevel !== undefined && level >= minLevel;
    })
    .map(([name]) => name);
  return [...new Set([...byLevel, ...byType, ...byTypeLevel])];
}

/**
 * Deploy SSOT templates selectively based on type and level.
 * 1) base/timsquad/ssot/ 에서 required 문서만 배포
 * 2) project-types/{type}/ssot/ 가 있으면 오버라이드 (타입 특화 내용)
 */
async function deploySSOT(
  srcSSOTDir: string,
  destSSOTDir: string,
  type: ProjectType,
  level: ProjectLevel,
  variables: TemplateVariables,
): Promise<void> {
  const required = getRequiredDocuments(type, level);

  // adr/ 디렉토리는 항상 복사
  const adrSrc = path.join(srcSSOTDir, 'adr');
  if (await fs.pathExists(adrSrc)) {
    await copyDirectoryWithSubstitution(adrSrc, path.join(destSSOTDir, 'adr'), variables);
  }

  // base SSOT 배포 (required 목록 기반)
  const entries = await fs.readdir(srcSSOTDir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.isDirectory()) {
      // Sub-document 폴더 (prd/, service-spec/ 등): 해당 SSOT가 required이면 함께 배포
      if (required.includes(entry.name)) {
        await copyDirectoryWithSubstitution(
          path.join(srcSSOTDir, entry.name),
          path.join(destSSOTDir, entry.name),
          variables,
        );
      }
      continue;
    }
    const name = entry.name;
    if (name.endsWith('.template.md')) {
      const ssotName = name.replace('.template.md', '');
      if (!required.includes(ssotName)) continue;
      await copyAndProcessFile(
        path.join(srcSSOTDir, name),
        path.join(destSSOTDir, `${ssotName}.md`),
        variables,
      );
    } else {
      let destName = name;
      if (destName.endsWith('.template.yaml')) {
        destName = destName.replace('.template.yaml', '.yaml');
      }
      await copyAndProcessFile(
        path.join(srcSSOTDir, name),
        path.join(destSSOTDir, destName),
        variables,
      );
    }
  }

  // project-types/{type}/ssot/ 오버라이드 (타입 특화 버전으로 덮어쓰기)
  const templatesDir = getTemplatesDir();
  const typeSSOTDir = path.join(templatesDir, 'project-types', type, 'ssot');
  if (await fs.pathExists(typeSSOTDir)) {
    const typeEntries = await fs.readdir(typeSSOTDir, { withFileTypes: true });
    for (const entry of typeEntries) {
      if (entry.isDirectory()) {
        // 하위 디렉토리 (예: adr/) 머지
        await copyDirectoryWithSubstitution(
          path.join(typeSSOTDir, entry.name),
          path.join(destSSOTDir, entry.name),
          variables,
        );
        continue;
      }
      const name = entry.name;
      if (name.endsWith('.template.md')) {
        const ssotName = name.replace('.template.md', '');
        // 오버라이드는 required 체크 없이 배포 (타입이 명시적으로 제공한 것)
        await copyAndProcessFile(
          path.join(typeSSOTDir, name),
          path.join(destSSOTDir, `${ssotName}.md`),
          variables,
        );
      } else {
        let destName = name;
        if (destName.endsWith('.template.yaml')) {
          destName = destName.replace('.template.yaml', '.yaml');
        }
        await copyAndProcessFile(
          path.join(typeSSOTDir, name),
          path.join(destSSOTDir, destName),
          variables,
        );
      }
    }
  }
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

  // 2.5. Deploy .claude/scripts/ (enforcement hooks)
  const srcScriptsDir = path.join(platformDir, 'scripts');
  const destScriptsDir = path.join(destClaudeDir, 'scripts');
  if (await fs.pathExists(srcScriptsDir)) {
    await copyDirectoryWithSubstitution(srcScriptsDir, destScriptsDir, variables);
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

  // 3. Copy common/timsquad to .timsquad (ssot/ is deployed selectively)
  const commonTimsquadDir = path.join(templatesDir, 'base', 'timsquad');
  const destTimsquadDir = path.join(projectRoot, '.timsquad');
  await copyDirectoryWithSubstitution(commonTimsquadDir, destTimsquadDir, variables, { exclude: ['ssot'] });

  // 3.5. Deploy SSOT selectively based on type + level
  const srcSSOTDir = path.join(commonTimsquadDir, 'ssot');
  const destSSOTDir = path.join(destTimsquadDir, 'ssot');
  await deploySSOT(srcSSOTDir, destSSOTDir, type, effectiveLevel, variables);

  // 4. Copy type-specific workflow
  const typeWorkflowDir = path.join(templatesDir, 'project-types', type, 'process');
  if (await fs.pathExists(typeWorkflowDir)) {
    const destProcessDir = path.join(destTimsquadDir, 'process');
    await copyDirectoryWithSubstitution(typeWorkflowDir, destProcessDir, variables);
  }

  // 5. Inject TimSquad block into CLAUDE.md
  await injectTimsquadBlock(path.join(projectRoot, 'CLAUDE.md'));

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
    '.timsquad/trails',
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

  // onboarding-progress.json (tsq-start에서 참조)
  await fs.writeJson(
    path.join(projectRoot, '.timsquad', 'state', 'onboarding-progress.json'),
    { completed: [], current: null, startedAt: null },
    { spaces: 2 }
  );

  // phase-memory.md (초기 HEAD — Librarian이 Phase 완료 시 갱신)
  await fs.writeFile(
    path.join(projectRoot, '.timsquad', 'state', 'phase-memory.md'),
    `---\nphase: initial\nprev: null\ncreated: ${new Date().toISOString()}\n---\n\n## Phase Memory\n프로젝트 초기화. 아직 Phase 작업 없음.\n`,
    'utf-8'
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
 * Inject or update TimSquad block in CLAUDE.md
 * - If file exists with markers: replace between markers
 * - If file exists without markers: prepend block
 * - If file doesn't exist: create with block only
 */
export async function injectTimsquadBlock(claudeMdPath: string): Promise<void> {
  const startMarker = '<!-- tsq:start -->';
  const endMarker = '<!-- tsq:end -->';

  if (await fs.pathExists(claudeMdPath)) {
    let content = await fs.readFile(claudeMdPath, 'utf-8');
    const startIdx = content.indexOf(startMarker);
    const endIdx = content.indexOf(endMarker);

    if (startIdx !== -1 && endIdx !== -1) {
      // Replace between markers
      content = content.substring(0, startIdx) + TIMSQUAD_BLOCK + content.substring(endIdx + endMarker.length);
    } else {
      // Prepend block
      content = TIMSQUAD_BLOCK + '\n\n' + content;
    }

    await fs.writeFile(claudeMdPath, content, 'utf-8');
  } else {
    // Create new file with block only
    await fs.ensureDir(path.dirname(claudeMdPath));
    await fs.writeFile(claudeMdPath, TIMSQUAD_BLOCK + '\n', 'utf-8');
  }
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
.timsquad/.daemon.jsonl
.timsquad/.daemon.sock
.timsquad/.upgrade-backup/
`;

  await fs.writeFile(gitignorePath, content, 'utf-8');
}

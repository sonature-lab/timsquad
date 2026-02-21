import path from 'path';
import fs from 'fs-extra';
import type { AgentType } from '../types/index.js';
import type { TimsquadConfig } from '../types/config.js';
import { AGENT_PRESETS } from '../types/config.js';
import type { TemplateVariables } from './template.js';
import { substituteVariables } from './template.js';
import { composeAgent } from './agent-composer.js';
import { getActiveSkills } from './skill-generator.js';

/**
 * Agent file name mapping
 */
const AGENT_FILE_MAP: Record<AgentType, string> = {
  architect: 'tsq-architect.md',
  developer: 'tsq-developer.md',
  qa: 'tsq-qa.md',
  security: 'tsq-security.md',
  dba: 'tsq-dba.md',
  designer: 'tsq-designer.md',
};

/**
 * Stack skill categories each agent role should receive
 */
const AGENT_SKILL_CATEGORIES: Record<AgentType, string[]> = {
  developer: ['frontend', 'backend', 'database', 'mobile'],
  designer:  ['frontend'],
  dba:       ['database'],
  architect: [],
  qa:        [],
  security:  [],
};

/**
 * Inject active stack skills into agent YAML frontmatter
 */
export function injectSkillsIntoFrontmatter(
  content: string,
  agent: AgentType,
  activeSkills: string[],
): string {
  const categories = AGENT_SKILL_CATEGORIES[agent] || [];
  if (categories.length === 0) return content;

  // Filter active skills matching this agent's categories
  const agentSkills = activeSkills.filter(skill => {
    const category = skill.split('/')[0];
    return categories.includes(category);
  });

  if (agentSkills.length === 0) return content;

  // Parse YAML frontmatter
  const fmMatch = content.match(/^---\n([\s\S]*?)\n---/);
  if (!fmMatch) return content;

  const frontmatter = fmMatch[1];

  // Extract existing skills
  const skillsMatch = frontmatter.match(/^skills:\s*\[([^\]]*)\]/m);
  if (!skillsMatch) return content;

  const existingSkills = skillsMatch[1]
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);

  // Merge and deduplicate
  const mergedSkills = [...new Set([...existingSkills, ...agentSkills])];

  // Replace skills line in frontmatter
  const newFm = frontmatter.replace(
    /^skills:\s*\[([^\]]*)\]/m,
    `skills: [${mergedSkills.join(', ')}]`,
  );

  return content.replace(/^---\n[\s\S]*?\n---/, `---\n${newFm}\n---`);
}

/**
 * Get active agents from config
 */
export function getActiveAgents(config: TimsquadConfig): AgentType[] {
  const preset = AGENT_PRESETS[config.project.type];
  if (!preset) return AGENT_PRESETS['web-service'];

  // config.agents에서 enabled 체크 (커스텀 오버라이드 지원)
  return preset.filter(agent => {
    const agentConfig = config.agents[agent];
    return agentConfig ? agentConfig.enabled !== false : true;
  });
}

/**
 * Generate agent .md files - only deploy active agents.
 * v4.0: If base/ directory exists, uses AgentComposer for overlay merging.
 * v3.x fallback: Direct copy from agents/ directory.
 */
export async function generateAgentFiles(
  templatesDir: string,
  destAgentsDir: string,
  activeAgents: AgentType[],
  variables: TemplateVariables,
  config?: TimsquadConfig,
): Promise<void> {
  const srcAgentsDir = path.join(templatesDir, 'base', 'agents');
  const baseDir = path.join(srcAgentsDir, 'base');
  const useComposition = await fs.pathExists(baseDir);
  const activeSkills = config ? getActiveSkills(config) : [];

  // 1. 활성 에이전트 배포
  for (const agent of activeAgents) {
    const fileName = AGENT_FILE_MAP[agent];
    if (!fileName) continue;

    let content: string;

    if (useComposition) {
      // v4.0: base + overlays 합성
      content = await composeAgent(templatesDir, {
        role: agent,
        platform: config?.project?.platform ?? 'claude-code',
        domain: config?.project?.domain,
      });
    } else {
      // v3.x fallback: 직접 읽기
      const srcPath = path.join(srcAgentsDir, fileName);
      if (!await fs.pathExists(srcPath)) continue;
      content = await fs.readFile(srcPath, 'utf-8');
    }

    const processed = substituteVariables(content, variables);
    const withSkills = activeSkills.length > 0
      ? injectSkillsIntoFrontmatter(processed, agent, activeSkills)
      : processed;
    const destPath = path.join(destAgentsDir, fileName);

    await fs.ensureDir(path.dirname(destPath));
    await fs.writeFile(destPath, withSkills, 'utf-8');
  }

  // 2. 비활성 에이전트 파일이 있으면 제거
  if (await fs.pathExists(destAgentsDir)) {
    const existingFiles = await fs.readdir(destAgentsDir);
    const activeFileNames = new Set(activeAgents.map(a => AGENT_FILE_MAP[a]));

    for (const file of existingFiles) {
      if (file.startsWith('tsq-') && file.endsWith('.md') && !activeFileNames.has(file)) {
        await fs.remove(path.join(destAgentsDir, file));
      }
    }
  }
}

/**
 * Generate delegation rules XML based on active agents
 */
export function generateDelegationRules(activeAgents: AgentType[]): string {
  const rules: string[] = [];
  let ruleId = 1;

  // Architect rule (시퀀스 분석)
  if (activeAgents.includes('architect')) {
    rules.push(`  <rule id="DEL-${String(ruleId).padStart(3, '0')}">
    <trigger>시퀀스 분석, 아키텍처 리뷰, 태스크 로그 분석, 구조 검토</trigger>
    <delegate-to>@tsq-architect</delegate-to>
    <context>시퀀스 완료 후 로그 분석 및 보고서 작성</context>
  </rule>`);
    ruleId++;
  }

  // Developer rule
  if (activeAgents.includes('developer')) {
    rules.push(`  <rule id="DEL-${String(ruleId).padStart(3, '0')}">
    <trigger>코드 구현, 테스트 작성, 리팩토링, 버그 수정</trigger>
    <delegate-to>@tsq-developer</delegate-to>
    <precondition>Implementation Phase이고 SSOT 문서 존재</precondition>
  </rule>`);
    ruleId++;
  }

  // DBA rule
  if (activeAgents.includes('dba')) {
    rules.push(`  <rule id="DEL-${String(ruleId).padStart(3, '0')}">
    <trigger>DB 설계, 스키마 변경, 쿼리 최적화, 마이그레이션</trigger>
    <delegate-to>@tsq-dba</delegate-to>
    <precondition>data-design.md 존재</precondition>
  </rule>`);
    ruleId++;
  }

  // Designer rule
  if (activeAgents.includes('designer')) {
    rules.push(`  <rule id="DEL-${String(ruleId).padStart(3, '0')}">
    <trigger>UI/UX 설계, 와이어프레임, 디자인 시스템, 접근성</trigger>
    <delegate-to>@tsq-designer</delegate-to>
    <precondition>ui-ux-spec.md 참조</precondition>
  </rule>`);
    ruleId++;
  }

  // QA rule
  if (activeAgents.includes('qa')) {
    rules.push(`  <rule id="DEL-${String(ruleId).padStart(3, '0')}">
    <trigger>코드 리뷰, 테스트 검증, 품질 체크, SSOT 대조</trigger>
    <delegate-to>@tsq-qa</delegate-to>
    <precondition>구현 완료 후 Review Phase</precondition>
  </rule>`);
    ruleId++;
  }

  // Security rule
  if (activeAgents.includes('security')) {
    rules.push(`  <rule id="DEL-${String(ruleId).padStart(3, '0')}">
    <trigger>보안 검토, 취약점 분석, 컴플라이언스</trigger>
    <delegate-to>@tsq-security</delegate-to>
    <precondition>Security Phase 또는 보안 관련 요청</precondition>
  </rule>`);
    ruleId++;
  }

  // Default rule (직접 처리)
  rules.push(`  <rule id="DEL-${String(ruleId).padStart(3, '0')}">
    <trigger>위 조건에 해당하지 않는 일반 질문/요청</trigger>
    <delegate-to>직접 처리</delegate-to>
    <action>컨텍스트 파악 후 응답 또는 적절한 에이전트 선택</action>
  </rule>`);

  return rules.join('\n\n');
}

/**
 * Format active agents list for display
 */
export function formatActiveAgentsList(activeAgents: AgentType[]): string {
  return activeAgents.map(a => `@tsq-${a}`).join(', ');
}

import path from 'path';
import type { ProjectInfo, PhaseInfo, ProjectStatus, SSOTDocument, AgentInfo } from '../types/index.js';
import { REQUIRED_SSOT_BY_LEVEL, REQUIRED_SSOT_BY_TYPE } from '../types/project.js';
import { loadConfig, configExists } from './config.js';
import { exists, listFiles, isFileFilled, countLines } from '../utils/fs.js';
import { loadYaml } from '../utils/yaml.js';

const TIMSQUAD_DIR = '.timsquad';
const CLAUDE_DIR = '.claude';

/**
 * Find project root by looking for .timsquad directory
 */
export async function findProjectRoot(startDir?: string): Promise<string | null> {
  let dir = startDir || process.cwd();

  while (dir !== path.parse(dir).root) {
    if (await exists(path.join(dir, TIMSQUAD_DIR))) {
      return dir;
    }
    dir = path.dirname(dir);
  }

  return null;
}

/**
 * Check if directory is a TimSquad project
 */
export async function isTimsquadProject(dir: string): Promise<boolean> {
  return await exists(path.join(dir, TIMSQUAD_DIR)) && await configExists(dir);
}

/**
 * Get project info from config
 */
export async function getProjectInfo(projectRoot: string): Promise<ProjectInfo> {
  const config = await loadConfig(projectRoot);

  return {
    name: config.project.name,
    type: config.project.type,
    level: config.project.level,
    created: config.project.created,
    root: projectRoot,
  };
}

/**
 * Get current phase info
 */
export async function getCurrentPhase(projectRoot: string): Promise<PhaseInfo> {
  const phasePath = path.join(projectRoot, TIMSQUAD_DIR, 'state', 'current-phase.json');

  if (!await exists(phasePath)) {
    return {
      current: 'planning',
      startedAt: new Date().toISOString(),
      progress: 0,
    };
  }

  try {
    const data = await loadYaml<PhaseInfo>(phasePath);
    return data;
  } catch {
    return {
      current: 'planning',
      startedAt: new Date().toISOString(),
      progress: 0,
    };
  }
}

/**
 * Get SSOT documents status
 */
export async function getSSOTStatus(projectRoot: string): Promise<SSOTDocument[]> {
  const config = await loadConfig(projectRoot);
  const ssotDir = path.join(projectRoot, TIMSQUAD_DIR, 'ssot');

  // Get required documents based on level and type
  const requiredByLevel = REQUIRED_SSOT_BY_LEVEL[config.project.level];
  const requiredByType = REQUIRED_SSOT_BY_TYPE[config.project.type];
  const allRequired = [...new Set([...requiredByLevel, ...requiredByType])];

  // Get all SSOT files
  const files = await listFiles('*.md', ssotDir);

  const documents: SSOTDocument[] = [];

  for (const file of files) {
    const name = path.basename(file, '.md');
    const filePath = path.join(ssotDir, file);
    const filled = await isFileFilled(filePath);

    documents.push({
      name,
      path: filePath,
      required: allRequired.includes(name),
      filled,
    });
  }

  // Add missing required documents
  for (const name of allRequired) {
    if (!documents.find(d => d.name === name)) {
      documents.push({
        name,
        path: path.join(ssotDir, `${name}.md`),
        required: true,
        filled: false,
      });
    }
  }

  return documents.sort((a, b) => {
    // Required first, then by name
    if (a.required !== b.required) return a.required ? -1 : 1;
    return a.name.localeCompare(b.name);
  });
}

/**
 * Get agents status
 */
export async function getAgentsStatus(projectRoot: string): Promise<AgentInfo[]> {
  const agentsDir = path.join(projectRoot, CLAUDE_DIR, 'agents');

  if (!await exists(agentsDir)) {
    return [];
  }

  const files = await listFiles('tsq-*.md', agentsDir);
  const config = await loadConfig(projectRoot);

  return files.map(file => {
    const name = path.basename(file, '.md').replace('tsq-', '');
    const agentConfig = config.agents[name as keyof typeof config.agents];

    return {
      name,
      type: name as AgentInfo['type'],
      model: agentConfig?.model || 'sonnet',
      available: true,
    };
  });
}

/**
 * Get logs summary
 */
export async function getLogsSummary(projectRoot: string): Promise<{ total: number; recent: string[] }> {
  const logsDir = path.join(projectRoot, TIMSQUAD_DIR, 'logs');

  if (!await exists(logsDir)) {
    return { total: 0, recent: [] };
  }

  const files = await listFiles('*.md', logsDir);
  const nonTemplateFiles = files.filter(f => !f.startsWith('_'));

  // Sort by date (filename format: YYYY-MM-DD-agent.md)
  nonTemplateFiles.sort().reverse();

  return {
    total: nonTemplateFiles.length,
    recent: nonTemplateFiles.slice(0, 3),
  };
}

/**
 * Get retrospective summary
 */
export async function getRetrospectiveSummary(projectRoot: string): Promise<{
  cycles: number;
  patterns: { success: number; failure: number };
}> {
  const retroDir = path.join(projectRoot, TIMSQUAD_DIR, 'retrospective');

  if (!await exists(retroDir)) {
    return { cycles: 0, patterns: { success: 0, failure: 0 } };
  }

  // Count cycle reports
  const cyclesDir = path.join(retroDir, 'cycles');
  const cycleFiles = await exists(cyclesDir) ? await listFiles('cycle-*.md', cyclesDir) : [];

  // Count patterns
  const patternsDir = path.join(retroDir, 'patterns');
  let successPatterns = 0;
  let failurePatterns = 0;

  if (await exists(patternsDir)) {
    const successFile = path.join(patternsDir, 'success-patterns.md');
    const failureFile = path.join(patternsDir, 'failure-patterns.md');

    if (await exists(successFile)) {
      const content = await countLines(successFile);
      // Rough estimate: count "## " headers as patterns
      successPatterns = Math.max(0, Math.floor(content / 10));
    }

    if (await exists(failureFile)) {
      const content = await countLines(failureFile);
      failurePatterns = Math.max(0, Math.floor(content / 10));
    }
  }

  return {
    cycles: cycleFiles.length,
    patterns: { success: successPatterns, failure: failurePatterns },
  };
}

/**
 * Get full project status
 */
export async function getProjectStatus(projectRoot: string): Promise<ProjectStatus> {
  const [project, phase, ssot, agents, logs, retrospective] = await Promise.all([
    getProjectInfo(projectRoot),
    getCurrentPhase(projectRoot),
    getSSOTStatus(projectRoot),
    getAgentsStatus(projectRoot),
    getLogsSummary(projectRoot),
    getRetrospectiveSummary(projectRoot),
  ]);

  return { project, phase, ssot, agents, logs, retrospective };
}

import path from 'path';
import type { TimsquadConfig, ProjectType, ProjectLevel, Platform, Domain } from '../types/index.js';
import { DEFAULT_CONFIG, FINTECH_CONFIG_OVERRIDES, buildAgentsConfig, DEFAULT_NAMING } from '../types/config.js';
import { exists } from '../utils/fs.js';
import { loadYaml, saveYaml } from '../utils/yaml.js';
import { getInstalledVersion } from './version.js';

const CONFIG_FILE = '.timsquad/config.yaml';

/**
 * Check if config file exists
 */
export async function configExists(projectRoot: string): Promise<boolean> {
  return exists(path.join(projectRoot, CONFIG_FILE));
}

/**
 * Load TimSquad configuration
 */
export async function loadConfig(projectRoot: string): Promise<TimsquadConfig> {
  const configPath = path.join(projectRoot, CONFIG_FILE);

  if (!await exists(configPath)) {
    throw new Error(`Config file not found: ${configPath}`);
  }

  return loadYaml<TimsquadConfig>(configPath);
}

/**
 * Save TimSquad configuration
 */
export async function saveConfig(projectRoot: string, config: TimsquadConfig): Promise<void> {
  const configPath = path.join(projectRoot, CONFIG_FILE);
  await saveYaml(configPath, config);
}

/**
 * Create default configuration for a new project
 */
export function createDefaultConfig(
  name: string,
  type: ProjectType,
  level: ProjectLevel,
  options?: { domain?: Domain; platform?: Platform; stack?: string[]; workspaces?: string[] },
): TimsquadConfig {
  const baseConfig: TimsquadConfig = {
    project: {
      name,
      type,
      level,
      created: new Date().toISOString(),
      framework_version: getInstalledVersion(),
      domain: options?.domain ?? 'general-web',
      platform: options?.platform ?? 'claude-code',
      stack: options?.stack ?? [],
      workspaces: options?.workspaces,
    },
    ...DEFAULT_CONFIG,
    agents: buildAgentsConfig(type),
    naming: { ...DEFAULT_NAMING },
  };

  // Default domain to 'mobile' for mobile-app
  if (type === 'mobile-app' && !options?.domain) {
    baseConfig.project.domain = 'mobile';
  }

  // Apply fintech-specific overrides
  if (type === 'fintech') {
    return {
      ...baseConfig,
      ...FINTECH_CONFIG_OVERRIDES,
      project: {
        ...baseConfig.project,
        level: 3, // Force level 3 for fintech
      },
      agents: buildAgentsConfig('fintech'),
      naming: { ...DEFAULT_NAMING },
    } as TimsquadConfig;
  }

  return baseConfig;
}

/**
 * Validate configuration
 */
export function validateConfig(config: unknown): config is TimsquadConfig {
  if (!config || typeof config !== 'object') return false;

  const c = config as Record<string, unknown>;

  // Check required fields
  if (!c.project || typeof c.project !== 'object') return false;

  const project = c.project as Record<string, unknown>;
  if (typeof project.name !== 'string') return false;
  if (!isValidProjectType(project.type)) return false;
  if (!isValidProjectLevel(project.level)) return false;

  // Validate optional v4.0 fields (only if present)
  if (project.domain !== undefined && !isValidDomain(project.domain)) return false;
  if (project.platform !== undefined && !isValidPlatform(project.platform)) return false;
  if (project.stack !== undefined && !Array.isArray(project.stack)) return false;
  if (project.workspaces !== undefined && !Array.isArray(project.workspaces)) return false;

  return true;
}

/**
 * Check if value is a valid project type
 */
function isValidProjectType(value: unknown): value is ProjectType {
  const validTypes: ProjectType[] = ['web-service', 'web-app', 'api-backend', 'platform', 'fintech', 'infra', 'mobile-app'];
  return typeof value === 'string' && validTypes.includes(value as ProjectType);
}

/**
 * Check if value is a valid project level
 */
function isValidProjectLevel(value: unknown): value is ProjectLevel {
  return typeof value === 'number' && [1, 2, 3].includes(value);
}

function isValidPlatform(value: unknown): value is Platform {
  const valid: Platform[] = ['claude-code', 'cursor', 'windsurf', 'mcp', 'gemini'];
  return typeof value === 'string' && valid.includes(value as Platform);
}

function isValidDomain(value: unknown): value is Domain {
  const valid: Domain[] = ['general-web', 'ml-engineering', 'fintech', 'mobile', 'gamedev', 'systems'];
  return typeof value === 'string' && valid.includes(value as Domain);
}

/**
 * Get project name from config
 */
export async function getProjectName(projectRoot: string): Promise<string> {
  const config = await loadConfig(projectRoot);
  return config.project.name;
}

/**
 * Get project type from config
 */
export async function getProjectType(projectRoot: string): Promise<ProjectType> {
  const config = await loadConfig(projectRoot);
  return config.project.type;
}

/**
 * Get project level from config
 */
export async function getProjectLevel(projectRoot: string): Promise<ProjectLevel> {
  const config = await loadConfig(projectRoot);
  return config.project.level;
}

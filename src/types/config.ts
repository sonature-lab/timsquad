import type { ProjectType, ProjectLevel, AgentType } from './project.js';

/**
 * Methodology settings
 */
export interface MethodologyConfig {
  development: 'tdd' | 'bdd' | 'none';
  process: 'agile' | 'waterfall' | 'kanban';
  branching: 'github-flow' | 'gitflow' | 'trunk-based';
  review: 'required' | 'optional' | 'none';
}

/**
 * Technology stack configuration
 */
export interface StackConfig {
  language: 'typescript' | 'javascript';
  frontend?: 'nextjs' | 'react' | 'vue' | 'svelte';
  backend?: 'node' | 'python' | 'go' | 'java';
  database: 'postgresql' | 'mysql' | 'mongodb' | 'sqlite';
  orm?: 'prisma' | 'typeorm' | 'drizzle';
  cache?: 'redis' | 'memcached' | 'none';
  hosting?: 'vercel' | 'aws' | 'gcp' | 'azure' | 'self-hosted';
}

/**
 * Agent configuration
 */
export interface AgentConfig {
  model: 'opus' | 'sonnet' | 'haiku';
  enabled: boolean;
}

/**
 * Quality settings
 */
export interface QualityConfig {
  test_coverage: {
    minimum: number;
    recommended: number;
  };
  security_review: 'required' | 'optional' | 'none';
}

/**
 * Consensus configuration (for fintech)
 */
export interface ConsensusConfig {
  enabled: boolean;
  required_for?: string[];
}

/**
 * Full TimSquad configuration
 */
export interface TimsquadConfig {
  project: {
    name: string;
    type: ProjectType;
    level: ProjectLevel;
    created: string;
  };
  methodology: MethodologyConfig;
  stack: StackConfig;
  agents: Record<AgentType, AgentConfig>;
  quality: QualityConfig;
  consensus?: ConsensusConfig;
  ssot?: {
    required: string[];
    optional: string[];
  };
}

/**
 * Default configuration
 */
export const DEFAULT_CONFIG: Omit<TimsquadConfig, 'project'> = {
  methodology: {
    development: 'tdd',
    process: 'agile',
    branching: 'github-flow',
    review: 'required',
  },
  stack: {
    language: 'typescript',
    frontend: 'nextjs',
    backend: 'node',
    database: 'postgresql',
    orm: 'prisma',
  },
  agents: {
    planner: { model: 'opus', enabled: true },
    developer: { model: 'sonnet', enabled: true },
    qa: { model: 'sonnet', enabled: true },
    security: { model: 'sonnet', enabled: true },
    dba: { model: 'sonnet', enabled: true },
    designer: { model: 'sonnet', enabled: true },
    prompter: { model: 'sonnet', enabled: true },
    retro: { model: 'haiku', enabled: true },
  },
  quality: {
    test_coverage: {
      minimum: 80,
      recommended: 90,
    },
    security_review: 'optional',
  },
};

/**
 * Fintech-specific configuration overrides
 */
export const FINTECH_CONFIG_OVERRIDES: Partial<TimsquadConfig> = {
  methodology: {
    development: 'tdd',
    process: 'agile',
    branching: 'gitflow',
    review: 'required',
  },
  quality: {
    test_coverage: {
      minimum: 90,
      recommended: 95,
    },
    security_review: 'required',
  },
  consensus: {
    enabled: true,
    required_for: [
      'architecture_choice',
      'security_design',
      'data_model',
      'api_design',
      'authentication_design',
      'encryption_strategy',
      'compliance_decision',
    ],
  },
};

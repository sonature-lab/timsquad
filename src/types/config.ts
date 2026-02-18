import type { ProjectType, ProjectLevel, AgentType, Platform, Domain } from './project.js';

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
 * Knowledge configuration
 */
export interface KnowledgeConfig {
  platforms: string[];
  domains: string[];
  checklists: string[];
}

/**
 * Naming convention configuration
 * PM이 Phase/Sequence/Task ID를 자동 생성할 때 사용하는 패턴
 */
export interface NamingConfig {
  phase: {
    /** Phase ID 패턴 (기본: "P{N}") */
    pattern: string;
    /** Phase 순서 (SSOT 프로세스 순서) */
    order: string[];
  };
  sequence: {
    /** Sequence ID 패턴 (기본: "P{N}-S{NNN}") */
    pattern: string;
    /** 시퀀스 번호 zero-padding 자릿수 */
    counter_pad: number;
  };
  task: {
    /** Task ID 패턴 (기본: "P{N}-S{NNN}-T{NNN}") */
    pattern: string;
    /** 태스크 번호 zero-padding 자릿수 */
    counter_pad: number;
  };
}

/**
 * Default naming configuration
 */
export const DEFAULT_NAMING: NamingConfig = {
  phase: {
    pattern: 'P{N}',
    order: ['planning', 'design', 'implementation', 'review', 'security', 'deployment'],
  },
  sequence: {
    pattern: 'P{N}-S{NNN}',
    counter_pad: 3,
  },
  task: {
    pattern: 'P{N}-S{NNN}-T{NNN}',
    counter_pad: 3,
  },
};

/**
 * Workflow automation configuration
 */
export interface AutomationConfig {
  /** Auto-create L2 sequence log when all expected agents complete tasks */
  sequence_log: boolean;
  /** Auto-create L3 phase log when all sequences complete */
  phase_log: boolean;
  /** Auto-run phase gate check after L3 creation */
  phase_gate: boolean;
  /** Auto-collect metrics on session end */
  metrics: boolean;
  /** Auto-generate retrospective on phase end */
  retro: boolean;
  /** Auto-execute L2/L3 feedback actions (workflow state, phase gate blocking) */
  feedback: boolean;
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
    framework_version?: string;
    domain?: Domain;
    platform?: Platform;
    stack?: string[];
    workspaces?: string[];
  };
  methodology: MethodologyConfig;
  stack: StackConfig;
  agents: Partial<Record<AgentType, AgentConfig>>;
  knowledge: KnowledgeConfig;
  quality: QualityConfig;
  naming?: NamingConfig;
  consensus?: ConsensusConfig;
  ssot?: {
    required: string[];
    optional: string[];
  };
}

/**
 * Default configuration
 */
/**
 * Agent presets by project type
 */
export const AGENT_PRESETS: Record<ProjectType, AgentType[]> = {
  'web-service': ['architect', 'developer', 'designer', 'qa'],
  'api-backend': ['architect', 'developer', 'dba', 'qa'],
  'fintech': ['architect', 'developer', 'dba', 'security', 'qa'],
  'web-app': ['architect', 'developer', 'designer', 'qa'],
  'platform': ['architect', 'developer', 'qa'],
  'infra': ['architect', 'developer', 'security'],
  'mobile-app': ['architect', 'developer', 'designer', 'qa'],
};

/**
 * Skill presets by project type.
 * BASE_SKILLS are always included; these are the type-specific additions.
 */
export const SKILL_PRESETS: Record<ProjectType, string[]> = {
  'web-service': [
    'frontend/react', 'frontend/nextjs', 'backend/node',
    'database', 'database/prisma', 'ui-design',
    'security', 'methodology/tdd',
  ],
  'web-app': [
    'frontend/react', 'frontend/nextjs',
    'ui-design', 'security', 'methodology/tdd',
  ],
  'api-backend': [
    'backend/node', 'database', 'database/prisma',
    'security', 'methodology/tdd',
  ],
  'platform': [
    'backend/node', 'methodology/tdd',
    'methodology/ddd', 'security',
  ],
  'fintech': [
    'backend/node', 'database', 'database/prisma',
    'security', 'methodology/tdd', 'methodology/ddd',
  ],
  'infra': [
    'security',
  ],
  'mobile-app': [
    'mobile/flutter', 'mobile/dart',
    'security', 'methodology/tdd',
  ],
};

/** Skills always deployed regardless of project type */
export const BASE_SKILLS: string[] = [
  'tsq-protocol',
  'controller',
  'coding', 'testing', 'typescript',
  'planning', 'architecture',
  'retrospective', 'prompt-engineering',
];

/**
 * Knowledge presets by project type.
 * BASE_KNOWLEDGE is always included; these are the type-specific additions.
 */
export const KNOWLEDGE_PRESETS: Record<ProjectType, string[]> = {
  'web-service': [
    'checklists/security', 'checklists/accessibility',
    'checklists/design-reference', 'checklists/architecture-review',
    'checklists/database-standards',
  ],
  'web-app': [
    'checklists/security', 'checklists/accessibility',
    'checklists/design-reference', 'checklists/architecture-review',
  ],
  'api-backend': [
    'checklists/security', 'checklists/architecture-review',
    'checklists/database-standards',
  ],
  'platform': [
    'checklists/security', 'checklists/architecture-review',
  ],
  'fintech': [
    'checklists/security', 'checklists/accessibility',
    'checklists/architecture-review', 'checklists/database-standards',
  ],
  'infra': [
    'checklists/security', 'checklists/architecture-review',
  ],
  'mobile-app': [
    'checklists/security', 'checklists/architecture-review',
  ],
};

/** Knowledge always deployed */
export const BASE_KNOWLEDGE: string[] = [
  'checklists/ssot-validation',
  'templates/task-result',
  'templates/sequence-report',
  'platforms/_template',
  'domains/_template',
];

/**
 * Domain-specific skill additions (v4.0 Composition Layer)
 * Merged with SKILL_PRESETS[type] during init
 */
export const DOMAIN_SKILL_MAP: Partial<Record<Domain, string[]>> = {
  'general-web': [],  // web 스킬은 SKILL_PRESETS[type]에서 이미 커버
  'ml-engineering': ['methodology/tdd'],
  'fintech': ['methodology/ddd'],  // DDD는 도메인 고유 (security는 type에서 커버)
  'mobile': ['mobile/flutter', 'mobile/dart'],
  'gamedev': [],
  'systems': [],  // security는 type에서 커버
};

/**
 * Domain-specific knowledge additions (v4.0 Composition Layer)
 * Merged with KNOWLEDGE_PRESETS[type] during init.
 * Only add domain-unique knowledge not already in KNOWLEDGE_PRESETS.
 */
export const DOMAIN_KNOWLEDGE_MAP: Partial<Record<Domain, string[]>> = {
  'general-web': [],  // web knowledge는 KNOWLEDGE_PRESETS[type]에서 커버
  'fintech': [],      // security/db는 KNOWLEDGE_PRESETS[fintech]에서 커버
  'ml-engineering': [],
  'mobile': [],
  'systems': [],
};

/**
 * Stack-to-skill mapping (v4.0 Composition Layer)
 * Auto-selects skills based on detected/configured stack
 */
export const STACK_SKILL_MAP: Record<string, string[]> = {
  'react': ['frontend/react'],
  'nextjs': ['frontend/nextjs'],
  'node': ['backend/node'],
  'prisma': ['database/prisma'],
  'typescript': ['typescript'],
  'postgresql': ['database'],
  'mysql': ['database'],
  'flutter': ['mobile/flutter'],
  'dart': ['mobile/dart'],
};

/**
 * Default agent model by type
 */
const AGENT_MODELS: Record<AgentType, 'opus' | 'sonnet' | 'haiku'> = {
  architect: 'opus',
  developer: 'sonnet',
  qa: 'sonnet',
  security: 'sonnet',
  dba: 'sonnet',
  designer: 'sonnet',
};

/**
 * Build agents config from preset
 */
export function buildAgentsConfig(
  projectType: ProjectType
): Partial<Record<AgentType, AgentConfig>> {
  const activeAgents = AGENT_PRESETS[projectType];
  const allAgents: AgentType[] = ['architect', 'developer', 'qa', 'security', 'dba', 'designer'];

  const agents: Partial<Record<AgentType, AgentConfig>> = {};
  for (const agent of allAgents) {
    agents[agent] = {
      model: AGENT_MODELS[agent],
      enabled: activeAgents.includes(agent),
    };
  }
  return agents;
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
  agents: buildAgentsConfig('web-service'),
  knowledge: {
    platforms: [],
    domains: [],
    checklists: ['security'],
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

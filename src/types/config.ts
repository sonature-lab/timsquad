import type { ProjectType, ProjectLevel, AgentType, Platform, Domain } from './project.js';

/**
 * Methodology settings
 */
export type DevelopmentMethodology = 'tdd' | 'bdd' | 'none';
export type ArchitecturePattern = 'layered' | 'clean' | 'hexagonal' | 'none';

export interface MethodologyConfig {
  development: DevelopmentMethodology;
  architecture: ArchitecturePattern;
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
 * Model routing configuration
 * Controller가 태스크 복잡도/phase에 따라 모델을 동적 선택
 */
export type ModelRoutingStrategy = 'aggressive' | 'balanced' | 'conservative';

export interface ModelRoutingConfig {
  enabled: boolean;
  strategy: ModelRoutingStrategy;
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
  model_routing?: ModelRoutingConfig;
  knowledge: KnowledgeConfig;
  quality: QualityConfig;
  naming?: NamingConfig;
  consensus?: ConsensusConfig;
  ssot?: {
    required: string[];
    optional: string[];
  };
  command_timeout?: {
    default: number;    // seconds (default: 120)
    test: number;       // seconds (default: 120)
    build: number;      // seconds (default: 180)
    e2e: number;        // seconds (default: 300)
  };
}

/**
 * Default configuration
 */
/**
 * Agent presets by project type
 */
export const AGENT_PRESETS: Record<ProjectType, AgentType[]> = {
  'web-service': ['architect', 'developer', 'designer', 'qa', 'librarian'],
  'api-backend': ['architect', 'developer', 'dba', 'qa', 'librarian'],
  'fintech': ['architect', 'developer', 'dba', 'security', 'qa', 'librarian'],
  'web-app': ['architect', 'developer', 'designer', 'qa', 'librarian'],
  'platform': ['architect', 'developer', 'qa', 'librarian'],
  'infra': ['architect', 'developer', 'security', 'librarian'],
  'mobile-app': ['architect', 'developer', 'designer', 'qa', 'librarian'],
};

/**
 * Skill presets by project type.
 * BASE_SKILLS are always included; these are the type-specific additions.
 */
export const SKILL_PRESETS: Record<ProjectType, string[]> = {
  'web-service': [
    'tsq-react', 'tsq-nextjs', 'tsq-hono',
    'tsq-database', 'tsq-prisma', 'tsq-ui',
    'tsq-security',
  ],
  'web-app': [
    'tsq-react', 'tsq-nextjs',
    'tsq-ui', 'tsq-security',
  ],
  'api-backend': [
    'tsq-hono', 'tsq-database', 'tsq-prisma',
    'tsq-security',
  ],
  'platform': [
    'tsq-hono', 'tsq-security',
  ],
  'fintech': [
    'tsq-hono', 'tsq-database', 'tsq-prisma',
    'tsq-security',
  ],
  'infra': [
    'tsq-security',
  ],
  'mobile-app': [
    'tsq-flutter', 'tsq-dart',
    'tsq-security',
  ],
};

/** Skills always deployed regardless of project type */
export const BASE_SKILLS: string[] = [
  'tsq-protocol', 'tsq-controller', 'tsq-librarian',
  'tsq-coding', 'tsq-testing', 'tsq-typescript',
  'tsq-planning', 'tsq-architecture',
  'tsq-retro', 'tsq-prompt',
  'tsq-spec', 'tsq-audit',
  'tsq-start', 'tsq-status', 'tsq-log',
  'tsq-update', 'tsq-delete',
  'tsq-grill', 'tsq-decompose',
  'tsq-product-audit', 'tsq-debugging', 'tsq-stability',
  'tsq-quick', 'tsq-full', 'tsq-inspect',
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
  'general-web': [],
  'ml-engineering': [],
  'fintech': [],
  'mobile': ['tsq-flutter', 'tsq-dart'],
  'gamedev': [],
  'systems': [],
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
  'react': ['tsq-react'],
  'nextjs': ['tsq-nextjs'],
  'hono': ['tsq-hono'],
  'node': ['tsq-hono'],
  'prisma': ['tsq-prisma'],
  'typescript': ['tsq-typescript'],
  'postgresql': ['tsq-database'],
  'mysql': ['tsq-database'],
  'flutter': ['tsq-flutter'],
  'dart': ['tsq-dart'],
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
  librarian: 'haiku',
};

/**
 * Default model routing configuration
 */
export const DEFAULT_MODEL_ROUTING: ModelRoutingConfig = {
  enabled: true,
  strategy: 'balanced',
};

/**
 * Build agents config from preset
 */
export function buildAgentsConfig(
  projectType: ProjectType
): Partial<Record<AgentType, AgentConfig>> {
  const activeAgents = AGENT_PRESETS[projectType];
  const allAgents: AgentType[] = ['architect', 'developer', 'qa', 'security', 'dba', 'designer', 'librarian'];

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
    architecture: 'none',
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
    architecture: 'layered',
    process: 'agile',
    branching: 'gitflow',
    review: 'required',
  },
  model_routing: {
    enabled: true,
    strategy: 'conservative',
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

/**
 * Project types supported by TimSquad
 */
export type ProjectType =
  | 'web-service'
  | 'web-app'
  | 'api-backend'
  | 'platform'
  | 'fintech'
  | 'infra';

/**
 * Project level (1=MVP, 2=Standard, 3=Enterprise)
 */
export type ProjectLevel = 1 | 2 | 3;

/**
 * Phase in the development process
 */
export type Phase =
  | 'planning'
  | 'design'
  | 'implementation'
  | 'review'
  | 'security'
  | 'deployment';

/**
 * Agent types
 */
export type AgentType =
  | 'planner'
  | 'developer'
  | 'qa'
  | 'security'
  | 'dba'
  | 'designer'
  | 'prompter'
  | 'retro';

/**
 * Project info
 */
export interface ProjectInfo {
  name: string;
  type: ProjectType;
  level: ProjectLevel;
  created: string;
  root: string;
}

/**
 * Phase info
 */
export interface PhaseInfo {
  current: Phase;
  startedAt: string;
  progress: number;
}

/**
 * SSOT document info
 */
export interface SSOTDocument {
  name: string;
  path: string;
  required: boolean;
  filled: boolean;
}

/**
 * Agent info
 */
export interface AgentInfo {
  name: string;
  type: AgentType;
  model: string;
  available: boolean;
}

/**
 * Project status
 */
export interface ProjectStatus {
  project: ProjectInfo;
  phase: PhaseInfo;
  ssot: SSOTDocument[];
  agents: AgentInfo[];
  logs: {
    total: number;
    recent: string[];
  };
  retrospective: {
    cycles: number;
    patterns: {
      success: number;
      failure: number;
    };
  };
}

/**
 * List of required SSOT documents by level
 */
export const REQUIRED_SSOT_BY_LEVEL: Record<ProjectLevel, string[]> = {
  1: ['prd', 'planning', 'requirements', 'service-spec', 'data-design'],
  2: [
    'prd', 'planning', 'requirements', 'service-spec', 'data-design',
    'glossary', 'functional-spec', 'ui-ux-spec', 'error-codes', 'env-config', 'test-spec'
  ],
  3: [
    'prd', 'planning', 'requirements', 'service-spec', 'data-design',
    'glossary', 'functional-spec', 'ui-ux-spec', 'error-codes', 'env-config', 'test-spec',
    'deployment-spec', 'integration-spec', 'security-spec'
  ],
};

/**
 * Additional required SSOT by project type
 */
export const REQUIRED_SSOT_BY_TYPE: Record<ProjectType, string[]> = {
  'web-service': ['ui-ux-spec'],
  'web-app': ['ui-ux-spec', 'data-design'],
  'api-backend': [],
  'platform': ['integration-spec', 'glossary'],
  'fintech': ['security-spec', 'error-codes', 'deployment-spec'],
  'infra': ['deployment-spec', 'env-config'],
};

/**
 * Project type descriptions
 */
export const PROJECT_TYPE_DESCRIPTIONS: Record<ProjectType, string> = {
  'web-service': 'SaaS, 풀스택 웹 서비스',
  'web-app': 'BaaS 기반 웹앱 (Supabase, Firebase 등)',
  'api-backend': 'API 서버, 마이크로서비스',
  'platform': '프레임워크, SDK',
  'fintech': '거래소, 결제',
  'infra': 'DevOps, 자동화',
};

/**
 * Project level descriptions
 */
export const PROJECT_LEVEL_DESCRIPTIONS: Record<ProjectLevel, string> = {
  1: 'MVP - 최소 문서, 빠른 개발',
  2: 'Standard - 표준 문서, 균형',
  3: 'Enterprise - 전체 문서, 완전한 추적',
};

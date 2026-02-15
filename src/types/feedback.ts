import type { AgentType, Phase } from './project.js';

/**
 * Feedback level (1=구현 수정, 2=설계 수정, 3=기획 수정)
 */
export type FeedbackLevel = 1 | 2 | 3;

/**
 * Feedback trigger types
 */
export type FeedbackTrigger =
  // Level 1 triggers
  | 'test_failure'
  | 'lint_error'
  | 'type_error'
  | 'runtime_error'
  | 'code_style_violation'
  // Level 2 triggers
  | 'architecture_issue'
  | 'api_mismatch'
  | 'performance_problem'
  | 'scalability_concern'
  | 'security_vulnerability'
  // Level 3 triggers
  | 'requirement_ambiguity'
  | 'scope_change'
  | 'business_logic_error'
  | 'feature_request'
  | 'stakeholder_feedback';

/**
 * Feedback routing result
 */
export interface FeedbackResult {
  level: FeedbackLevel;
  trigger: FeedbackTrigger;
  confidence: number;
  routeTo: AgentType | 'user';
  approvalRequired: boolean;
  ssotUpdate: boolean;
  actions: FeedbackAction[];
}

/**
 * Feedback action to take
 */
export interface FeedbackAction {
  type: 'notify' | 'log' | 'update_ssot' | 'request_approval' | 'escalate';
  target?: string;
  message?: string;
}

/**
 * Feedback routing rules
 */
export interface FeedbackRoutingRules {
  level_1: {
    name: string;
    triggers: FeedbackTrigger[];
    route_to: AgentType;
    approval_required: boolean;
  };
  level_2: {
    name: string;
    triggers: FeedbackTrigger[];
    route_to: AgentType;
    approval_required: boolean;
    ssot_update: boolean;
  };
  level_3: {
    name: string;
    triggers: FeedbackTrigger[];
    route_to: 'user';
    approval_required: boolean;
    ssot_update: boolean;
  };
}

/**
 * Default routing rules
 */
/**
 * Feedback status for tracking lifecycle
 */
export type FeedbackStatus = 'open' | 'in_review' | 'resolved' | 'approved' | 'rejected';

/**
 * Feedback entry (로컬 JSON 저장용)
 */
export interface FeedbackEntry {
  id: string;
  timestamp: string;
  type: 'feedback' | 'phase-retro';
  phase?: Phase;
  level?: FeedbackLevel;
  trigger?: string;
  message: string;
  routeTo?: string;
  tags?: string[];
  status: FeedbackStatus;
  resolvedAt?: string;
  resolvedBy?: string;
}

/**
 * Phase retro entry (Phase별 회고 데이터)
 */
export interface PhaseRetroEntry {
  id: string;
  timestamp: string;
  project: string;
  phase: Phase;
  keep: string[];
  problem: string[];
  try_next: string[];
  metrics?: {
    tasks_completed?: number;
    success_rate?: number;
    feedback_count?: Record<string, number>;
  };
  tags?: string[];
}

/**
 * Aggregated retro report (집계 리포트)
 */
export interface AggregatedReport {
  project: string;
  generated_at: string;
  period: {
    start: string;
    end: string;
  };
  phases: PhaseRetroEntry[];
  feedbacks: FeedbackEntry[];
  summary: {
    total_feedbacks: number;
    by_level: Record<string, number>;
    by_phase: Record<string, number>;
    top_issues: string[];
  };
}

export const DEFAULT_ROUTING_RULES: FeedbackRoutingRules = {
  level_1: {
    name: '구현 수정',
    triggers: ['test_failure', 'lint_error', 'type_error', 'runtime_error', 'code_style_violation'],
    route_to: 'developer',
    approval_required: false,
  },
  level_2: {
    name: '설계 수정',
    triggers: ['architecture_issue', 'api_mismatch', 'performance_problem', 'scalability_concern', 'security_vulnerability'],
    route_to: 'architect',
    approval_required: false,
    ssot_update: true,
  },
  level_3: {
    name: '기획/PRD 수정',
    triggers: ['requirement_ambiguity', 'scope_change', 'business_logic_error', 'feature_request', 'stakeholder_feedback'],
    route_to: 'user',
    approval_required: true,
    ssot_update: true,
  },
};

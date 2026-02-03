import type { AgentType } from './project.js';

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
    route_to: 'planner',
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

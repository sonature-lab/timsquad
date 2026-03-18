import type { Phase } from './project.js';

/**
 * Feedback level (1=구현 수정, 2=설계 수정, 3=기획 수정)
 */
export type FeedbackLevel = 1 | 2 | 3;

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

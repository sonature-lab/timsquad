/**
 * SSOT Map Types
 * SSOT 문서를 참조 빈도에 따라 4개 티어로 분류하는 스키마.
 */

export type SSOTTier = 'tier-0-always' | 'tier-1-phase' | 'tier-2-sequence' | 'tier-3-task';
export type InjectVia = 'hook' | 'controller';

export interface SSOTDocumentEntry {
  /** compiled spec 경로 (상대, controller 기준) */
  compiled: string;
  /** 원본 SSOT 문서 경로 (상대, .timsquad/ssot/ 기준) */
  source: string;
  /** H2/H3 기준 분할 (선택) */
  split?: 'H2' | 'H3';
  /** 타입별 선택 배포 문서 — 미존재 시 건너뜀 (validate에서 missing 제외) */
  optional?: boolean;
  /** 메모 */
  note?: string;
}

export interface SSOTTierConfig {
  description: string;
  inject_via: InjectVia;
  documents: SSOTDocumentEntry[];
}

export interface SSOTMap {
  'tier-0-always': SSOTTierConfig;
  'tier-1-phase': SSOTTierConfig;
  'tier-2-sequence': SSOTTierConfig;
  'tier-3-task': SSOTTierConfig;
}

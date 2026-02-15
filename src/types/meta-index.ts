/**
 * Meta Index types for code structure indexing
 * Mechanical (AST) + Semantic (Developer) 2-layer model
 * 저장소: .timsquad/state/meta-index/
 */

import type { UIHealthScore } from './ui-meta.js';

// ── Method 레벨 ──

export interface MethodMechanical {
  name: string;
  startLine: number;
  endLine: number;
  params: string[];
  returnType: string;
  isAsync: boolean;
  isExported: boolean;
  decorators?: string[];
}

export interface MethodSemantic {
  function?: string;           // e.g. "authenticate"
  algorithm?: string;          // e.g. "hash-compare"
  timeComplexity?: string;     // e.g. "O(1)"
  spaceComplexity?: string;
  description?: string;
}

export interface MethodEntry {
  mechanical: MethodMechanical;
  semantic?: MethodSemantic;
}

// ── Directory 레벨 ──

export interface DirectoryMechanical {
  fileCount: number;
  subdirectories: string[];
  primaryLanguage: string;        // 파일 확장자 통계 기반 (e.g. "typescript")
  topExports: string[];           // 하위 파일의 주요 exports (상위 5개)
  totalLines: number;             // 하위 파일 합산
}

export interface DirectorySemantic {
  description?: string;           // e.g. "결제 도메인 핵심 로직"
  purpose?: string;               // e.g. "domain-logic", "infrastructure", "ui-components", "shared-utils", "api-routes"
  domain?: string;                // e.g. "payment", "auth" — monorepo workspace 매핑
  boundaryType?: string;          // e.g. "module", "package", "app", "library"
  tags?: string[];
  owner?: string;                 // 담당자/팀
}

export interface DirectoryEntry {
  path: string;
  mechanical: DirectoryMechanical;
  semantic?: DirectorySemantic;
  indexedAt: string;              // ISO timestamp
}

// ── File 레벨 ──

export interface FileMechanical {
  totalLines: number;
  classes: string[];
  interfaces: string[];
  exports: string[];
  imports: Array<{ module: string; names: string[] }>;
  dependencies: string[];
  methods: Record<string, MethodEntry>;
}

export interface FileSemantic {
  description?: string;
  pattern?: string;            // e.g. "clean-architecture/use-case"
  semanticTag?: string;        // e.g. "authentication"
}

export interface FileEntry {
  path: string;
  mechanical: FileMechanical;
  semantic?: FileSemantic;
  indexedAt: string;           // ISO timestamp
  mtime: number;               // epoch ms (drift 감지용)
  lastTaskRef?: string;        // task log 파일명 참조
}

// ── Module JSON (domain.json 등) ──

export interface ModuleIndex {
  generatedAt: string;
  directory?: DirectoryEntry;       // 디렉토리 자체의 메타데이터
  files: Record<string, FileEntry>;
}

// ── Summary JSON ──

export interface MetaIndexSummary {
  generatedAt: string;
  schemaVersion: string;
  totalFiles: number;
  totalMethods: number;
  totalClasses: number;
  totalInterfaces: number;
  modules: Record<string, ModuleSummaryEntry>;
  alerts: MetaIndexAlerts;
  health: MetaHealthScore;
  uiHealth?: UIHealthScore;
}

export interface ModuleSummaryEntry {
  files: number;
  methods: number;
  patterns?: Record<string, number>;
  semantic?: DirectorySemantic;      // 디렉토리 레벨 semantic (있으면 summary에 노출)
}

export interface MetaIndexAlerts {
  oversizedFiles: string[];
  missingSemantics: string[];
  driftDetected: DriftEntry[];
  interfaceMismatches: InterfaceMismatch[];
}

// ── Drift 감지 ──

export interface DriftEntry {
  path: string;
  type: 'mtime_changed' | 'content_changed' | 'lines_changed' | 'deleted';
  indexedMtime: number;
  currentMtime: number;
  indexedLines?: number;
  currentLines?: number;
  lastModifiedBy?: string;
  lastCommitMessage?: string;
}

export interface DriftReport {
  checkedAt: string;
  totalFiles: number;
  upToDate: number;
  drifted: DriftEntry[];
}

// ── Interface 정합성 ──

export interface InterfaceMismatch {
  exportFile: string;
  exportName: string;
  issue: 'unused_export' | 'missing_import';
  details?: string;
}

// ── Pending Queue ──

export interface PendingEntry {
  timestamp: string;
  filePath: string;
  method?: string;
  semantic: Partial<MethodSemantic & FileSemantic>;
  source: 'cli' | 'task-log' | 'hook';
}

export interface DirectoryPendingEntry {
  timestamp: string;
  dirPath: string;
  semantic: Partial<DirectorySemantic>;
  source: 'cli' | 'task-log' | 'hook' | 'config';  // config = workspace 매핑에서 자동 주입
}

// ── Health 점수 ──

export interface MetaHealthScore {
  overall: number;             // 0-100
  freshness: number;           // % files with current mtime
  semanticCoverage: number;    // % files with semantic data
  interfaceHealth: number;     // % clean exports/imports
  alertCount: number;
  uiHealthScore?: number;      // UI 계층 overall (있을 때만)
}

/**
 * SSOT Map Loader
 * ssot-map.yaml을 로드하고 티어별 문서 경로를 반환한다.
 */

import path from 'path';
import { exists } from '../utils/fs.js';
import { loadYaml } from '../utils/yaml.js';
import type { SSOTMap, SSOTTier, SSOTDocumentEntry } from '../types/ssot-map.js';

const SSOT_MAP_FILE = '.timsquad/ssot-map.yaml';

/**
 * SSOT Map 로드. 없으면 null 반환.
 */
export async function loadSSOTMap(projectRoot: string): Promise<SSOTMap | null> {
  const filePath = path.join(projectRoot, SSOT_MAP_FILE);
  if (!await exists(filePath)) return null;
  try {
    return await loadYaml<SSOTMap>(filePath);
  } catch {
    return null;
  }
}

/**
 * 특정 티어의 문서 목록 반환.
 */
export function getDocumentsForTier(
  ssotMap: SSOTMap,
  tier: SSOTTier,
): SSOTDocumentEntry[] {
  return ssotMap[tier]?.documents ?? [];
}

/**
 * Tier 0 문서의 compiled 경로 목록 반환.
 * skill-inject.sh가 이 경로들을 읽어 systemMessage에 주입한다.
 */
export function getTier0CompiledPaths(ssotMap: SSOTMap): string[] {
  return getDocumentsForTier(ssotMap, 'tier-0-always')
    .map(d => d.compiled);
}

/**
 * 작업 단위에 따른 문서 반환 (controller용).
 * phase/sequence/task 수준에서 필요한 문서를 합산 반환.
 */
export function getDocumentsForScope(
  ssotMap: SSOTMap,
  scope: 'phase' | 'sequence' | 'task',
): SSOTDocumentEntry[] {
  const docs: SSOTDocumentEntry[] = [];

  // Tier 1 (phase) — phase 이상 스코프에서 포함
  if (['phase', 'sequence', 'task'].includes(scope)) {
    docs.push(...getDocumentsForTier(ssotMap, 'tier-1-phase'));
  }

  // Tier 2 (sequence) — sequence 이상에서 포함
  if (['sequence', 'task'].includes(scope)) {
    docs.push(...getDocumentsForTier(ssotMap, 'tier-2-sequence'));
  }

  // Tier 3 (task) — task에서만 포함
  if (scope === 'task') {
    docs.push(...getDocumentsForTier(ssotMap, 'tier-3-task'));
  }

  return docs;
}

/**
 * ssot-map.yaml의 모든 source 파일이 실제 존재하는지 검증.
 */
export async function validateSSOTMap(
  projectRoot: string,
  ssotMap: SSOTMap,
): Promise<{ valid: boolean; missing: string[] }> {
  const missing: string[] = [];
  const tiers: SSOTTier[] = ['tier-0-always', 'tier-1-phase', 'tier-2-sequence', 'tier-3-task'];

  for (const tier of tiers) {
    for (const doc of getDocumentsForTier(ssotMap, tier)) {
      // split 패턴 ({section} 등)은 검증 스킵
      if (doc.source.includes('{')) continue;
      // optional 문서는 미존재 허용 (타입별 선택 배포)
      if (doc.optional) continue;
      const sourcePath = path.join(projectRoot, '.timsquad', 'ssot', doc.source);
      if (!await exists(sourcePath)) {
        missing.push(doc.source);
      }
    }
  }

  return { valid: missing.length === 0, missing };
}

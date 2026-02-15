/**
 * Task Context Writer
 * 서브에이전트 시작 시 task-context.json 생성,
 * 완료 시 삭제하는 임시 컨텍스트 파일 관리.
 */

import path from 'path';
import fs from 'fs-extra';
import type { ScopedContext } from './meta-cache.js';

const CONTEXT_DIR = '.timsquad/.daemon';
const CONTEXT_FILE = 'task-context.json';

export interface TaskContext {
  index_version: string;
  agent: string;
  created_at: string;
  scope: ScopedContext['files'];
}

export async function writeContext(
  projectRoot: string,
  agent: string,
  scopedData: ScopedContext,
): Promise<string> {
  const dir = path.join(projectRoot, CONTEXT_DIR);
  await fs.ensureDir(dir);

  const context: TaskContext = {
    index_version: scopedData.index_version,
    agent,
    created_at: new Date().toISOString(),
    scope: scopedData.files,
  };

  const filePath = path.join(dir, CONTEXT_FILE);
  await fs.writeJson(filePath, context, { spaces: 2 });
  return filePath;
}

export async function clearContext(projectRoot: string): Promise<void> {
  const filePath = path.join(projectRoot, CONTEXT_DIR, CONTEXT_FILE);
  try {
    await fs.remove(filePath);
  } catch {
    // 이미 없으면 무시
  }
}

export function getContextPath(projectRoot: string): string {
  return path.join(projectRoot, CONTEXT_DIR, CONTEXT_FILE);
}

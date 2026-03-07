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

// ── Handoff Struct (9-A) ──

const HANDOFF_DIR = '.timsquad/state/handoffs';

export interface HandoffPayload {
  agent: string;
  completedAt: string;
  changedFiles: string[];
  testResults?: {
    passed: number;
    failed: number;
    skipped: number;
  };
  warnings: string[];
  executionLogRef?: string;
}

export async function writeHandoff(
  projectRoot: string,
  payload: HandoffPayload,
): Promise<string> {
  const dir = path.join(projectRoot, HANDOFF_DIR);
  await fs.ensureDir(dir);

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const fileName = `${payload.agent}-${timestamp}.json`;
  const filePath = path.join(dir, fileName);

  await fs.writeJson(filePath, payload, { spaces: 2 });
  return filePath;
}

export async function loadLatestHandoff(
  projectRoot: string,
  agent?: string,
): Promise<HandoffPayload | null> {
  const dir = path.join(projectRoot, HANDOFF_DIR);
  if (!await fs.pathExists(dir)) return null;

  const files = (await fs.readdir(dir))
    .filter(f => f.endsWith('.json'))
    .filter(f => !agent || f.startsWith(`${agent}-`))
    .sort()
    .reverse();

  if (files.length === 0) return null;

  try {
    return await fs.readJson(path.join(dir, files[0]));
  } catch {
    return null;
  }
}

/**
 * Planning.md Parser
 *
 * planning.md를 Phase → Sequence → Task 계층 구조로 파싱한다.
 * Controller와 `tsq next` CLI가 사용하는 구조화된 데이터를 생성.
 *
 * 지원 형식:
 * 1. Phase 테이블 (## 2. 마일스톤 아래의 테이블)
 * 2. Phase 헤딩 (## Phase 1: ..., ### Sequence 1: ..., #### Task 1: ...)
 * 3. Phase ID 패턴 (P1, P1-S001, P1-S001-T001)
 */

import path from 'path';
import { exists, readFile } from '../utils/fs.js';

// ─── Types ──────────────────────────────────────────────────────

export interface PlanningTask {
  id: string;
  title: string;
  description: string;
  agent?: string;
  outputs?: string[];
  dependencies?: string[];
}

export interface PlanningSequence {
  id: string;
  title: string;
  tasks: PlanningTask[];
}

export interface PlanningPhase {
  id: string;
  title: string;
  goal?: string;
  deliverables?: string[];
  completionCriteria?: string;
  sequences: PlanningSequence[];
}

export interface PlanningDocument {
  projectName: string;
  phases: PlanningPhase[];
}

// ─── Parser ─────────────────────────────────────────────────────

const PHASE_HEADING_RE = /^##\s+Phase\s+(\d+)[.:]\s*(.+)$/i;
const SEQUENCE_HEADING_RE = /^###\s+(?:Sequence\s+|S)?(\d+)[.:]\s*(.+)$/i;
const TASK_HEADING_RE = /^####\s+(?:Task\s+|T)?(\d+)[.:]\s*(.+)$/i;



/**
 * planning.md 파일을 파싱하여 구조화된 PlanningDocument 반환
 */
export async function parsePlanningFile(projectRoot: string): Promise<PlanningDocument | null> {
  const planningPath = path.join(projectRoot, '.timsquad', 'ssot', 'planning.md');
  if (!await exists(planningPath)) return null;

  const content = await readFile(planningPath);
  return parsePlanningContent(content);
}

/**
 * planning.md 내용을 파싱
 */
export function parsePlanningContent(content: string): PlanningDocument {
  const lines = content.split('\n');

  // Extract project name from H1
  const h1Match = lines.find(l => l.startsWith('# '));
  const projectName = h1Match
    ? h1Match.replace(/^#\s+/, '').replace(/\s*기획서\s*$/, '').trim()
    : 'Unknown';

  // Try structured heading parse first
  const phases = parseByHeadings(lines);

  // If no structured headings found, try milestone table
  if (phases.length === 0) {
    const tablePhases = parseMilestoneTable(lines);
    return { projectName, phases: tablePhases };
  }

  return { projectName, phases };
}

/**
 * heading 기반 파싱 (## Phase N → ### Sequence N → #### Task N)
 */
function parseByHeadings(lines: string[]): PlanningPhase[] {
  const phases: PlanningPhase[] = [];
  let currentPhase: PlanningPhase | null = null;
  let currentSequence: PlanningSequence | null = null;
  let currentTask: PlanningTask | null = null;
  let contentBuffer: string[] = [];
  let contentTarget: 'phase' | 'sequence' | 'task' | null = null;

  function flushContent(): void {
    const text = contentBuffer.join('\n').trim();
    contentBuffer = [];

    if (!text) return;

    if (contentTarget === 'task' && currentTask) {
      currentTask.description = text;
      parseTaskMetadata(currentTask, text);
    } else if (contentTarget === 'phase' && currentPhase) {
      currentPhase.goal = text.split('\n')[0];
    }
  }

  function flushTask(): void {
    flushContent();
    if (currentTask && currentSequence) {
      currentSequence.tasks.push(currentTask);
      currentTask = null;
    }
  }

  function flushSequence(): void {
    flushTask();
    if (currentSequence && currentPhase) {
      currentPhase.sequences.push(currentSequence);
      currentSequence = null;
    }
  }

  function flushPhase(): void {
    // Task가 Sequence 없이 존재하면 기본 Sequence에 넣은 뒤 flush
    if (currentTask && !currentSequence && currentPhase) {
      currentSequence = {
        id: `${currentPhase.id}-S001`,
        title: 'Default',
        tasks: [],
      };
    }
    flushSequence();
    if (currentPhase) {
      phases.push(currentPhase);
      currentPhase = null;
    }
  }

  for (const line of lines) {
    // Phase heading
    const phaseMatch = line.match(PHASE_HEADING_RE);
    if (phaseMatch) {
      flushPhase();
      const num = phaseMatch[1];
      currentPhase = {
        id: `P${num}`,
        title: phaseMatch[2].trim(),
        sequences: [],
      };
      contentTarget = 'phase';
      continue;
    }

    // Sequence heading
    const seqMatch = line.match(SEQUENCE_HEADING_RE);
    if (seqMatch && currentPhase) {
      flushSequence();
      const num = seqMatch[1].padStart(3, '0');
      currentSequence = {
        id: `${currentPhase.id}-S${num}`,
        title: seqMatch[2].trim(),
        tasks: [],
      };
      contentTarget = 'sequence';
      continue;
    }

    // Task heading
    const taskMatch = line.match(TASK_HEADING_RE);
    if (taskMatch && currentPhase) {
      flushTask();
      const seqId: string = currentSequence?.id || `${currentPhase.id}-S001`;
      if (!currentSequence) {
        currentSequence = {
          id: seqId,
          title: 'Default',
          tasks: [],
        };
      }
      const num = taskMatch[1].padStart(3, '0');
      currentTask = {
        id: `${seqId}-T${num}`,
        title: taskMatch[2].trim(),
        description: '',
      };
      contentTarget = 'task';
      continue;
    }

    // Also detect inline task IDs (e.g., "- P1-S001-T001: Login UI")
    const inlineTaskMatch = line.match(/^[-*]\s+(P(\d+)-S(\d+)-T(\d+))[.:]\s*(.+)$/);
    if (inlineTaskMatch && currentPhase) {
      flushTask();
      // Normalize to 3-digit padding (P1-S1-T1 → P1-S001-T001)
      const taskId = `P${inlineTaskMatch[2]}-S${inlineTaskMatch[3].padStart(3, '0')}-T${inlineTaskMatch[4].padStart(3, '0')}`;
      const seqId = `P${inlineTaskMatch[2]}-S${inlineTaskMatch[3].padStart(3, '0')}`;
      if (!currentSequence || currentSequence.id !== seqId) {
        flushSequence();
        currentSequence = {
          id: seqId,
          title: `Sequence ${seqId}`,
          tasks: [],
        };
      }
      currentTask = {
        id: taskId,
        title: inlineTaskMatch[5].trim(),
        description: '',
      };
      contentTarget = 'task';
      continue;
    }

    contentBuffer.push(line);
  }

  flushPhase();
  return phases;
}

/**
 * 마일스톤 테이블 파싱 (## 2. 마일스톤 아래 | Phase | 목표 | 산출물 | 완료 기준 |)
 */
function parseMilestoneTable(lines: string[]): PlanningPhase[] {
  const phases: PlanningPhase[] = [];
  let inMilestoneSection = false;
  let headerFound = false;

  for (const line of lines) {
    if (/^##\s+\d+\.\s*마일스톤/i.test(line) || /^##\s+\d+\.\s*Milestones?/i.test(line)) {
      inMilestoneSection = true;
      continue;
    }

    if (inMilestoneSection && line.startsWith('## ')) {
      break; // Next section
    }

    if (!inMilestoneSection) continue;

    // Skip header separator
    if (/^\|[-\s|]+\|$/.test(line)) {
      headerFound = true;
      continue;
    }

    // Skip header row (first row with |)
    if (!headerFound && line.startsWith('|')) {
      continue;
    }

    if (!headerFound) continue;

    // Parse data row
    const cells = line.split('|').map(c => c.trim()).filter(Boolean);
    if (cells.length < 2) continue;

    const phaseCell = cells[0];
    const phaseNumMatch = phaseCell.match(/Phase\s+(\d+)/i);
    if (!phaseNumMatch) continue;

    const num = phaseNumMatch[1];
    const goal = cells[1] || '';
    const deliverables = cells[2] ? cells[2].split(/[,;]/).map(d => d.trim()).filter(Boolean) : [];
    const criteria = cells[3] || '';

    phases.push({
      id: `P${num}`,
      title: goal || `Phase ${num}`,
      goal: goal || undefined,
      deliverables: deliverables.length > 0 ? deliverables : undefined,
      completionCriteria: criteria || undefined,
      sequences: [{
        id: `P${num}-S001`,
        title: 'Default',
        tasks: [{
          id: `P${num}-S001-T001`,
          title: goal || `Phase ${num} 구현`,
          description: criteria || '',
        }],
      }],
    });
  }

  return phases;
}

/**
 * Task 본문에서 에이전트/출력/의존성 메타데이터 추출
 */
function parseTaskMetadata(task: PlanningTask, text: string): void {
  // Agent: developer | qa | architect | librarian
  const agentMatch = text.match(/(?:Agent|에이전트|담당)[:\s]+(\w+)/i);
  if (agentMatch) task.agent = agentMatch[1].toLowerCase();

  // Outputs: 산출물 목록
  const outputLines = text.match(/(?:Output|산출물|파일)[:\s]+(.+)/gi);
  if (outputLines) {
    task.outputs = outputLines.flatMap(l =>
      l.replace(/^[^:]+:\s*/, '').split(/[,;]/).map(o => o.trim()).filter(Boolean)
    );
  }

  // Dependencies: 의존성
  const depMatch = text.match(/(?:Depends|의존|선행)[:\s]+(.+)/i);
  if (depMatch) {
    task.dependencies = depMatch[1].split(/[,;]/).map(d => d.trim()).filter(Boolean);
  }
}

// ─── Query Helpers ──────────────────────────────────────────────

/**
 * 전체 Task 목록을 flat하게 반환
 */
export function getAllTasks(doc: PlanningDocument): PlanningTask[] {
  return doc.phases.flatMap(p =>
    p.sequences.flatMap(s => s.tasks)
  );
}

/**
 * Task ID로 검색
 */
export function findTaskById(doc: PlanningDocument, taskId: string): PlanningTask | null {
  for (const phase of doc.phases) {
    for (const seq of phase.sequences) {
      const task = seq.tasks.find(t => t.id === taskId);
      if (task) return task;
    }
  }
  return null;
}

/**
 * Task가 속한 Phase를 찾기
 */
export function findPhaseForTask(doc: PlanningDocument, taskId: string): PlanningPhase | null {
  for (const phase of doc.phases) {
    for (const seq of phase.sequences) {
      if (seq.tasks.some(t => t.id === taskId)) return phase;
    }
  }
  return null;
}

/**
 * Task가 속한 Sequence를 찾기
 */
export function findSequenceForTask(doc: PlanningDocument, taskId: string): PlanningSequence | null {
  for (const phase of doc.phases) {
    for (const seq of phase.sequences) {
      if (seq.tasks.some(t => t.id === taskId)) return seq;
    }
  }
  return null;
}

/**
 * Phase에 속한 모든 Task ID 목록
 */
export function getPhaseTaskIds(doc: PlanningDocument, phaseId: string): string[] {
  const phase = doc.phases.find(p => p.id === phaseId);
  if (!phase) return [];
  return phase.sequences.flatMap(s => s.tasks.map(t => t.id));
}

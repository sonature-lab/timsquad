import { describe, it, expect } from 'vitest';
import {
  parsePlanningContent,
  getAllTasks,
  findTaskById,
  findPhaseForTask,
  findSequenceForTask,
  getPhaseTaskIds,
  type PlanningDocument,
} from '../../src/lib/planning-parser.js';

// ─── Heading-based parsing ──────────────────────────────────────

describe('parsePlanningContent — heading-based', () => {
  const HEADING_PLANNING = `# MyProject 기획서

**Version**: 1.0

## Phase 1: 인증 시스템

### Sequence 1: 로그인 구현

#### Task 1: 로그인 UI
Agent: developer
Output: src/components/LoginForm.tsx
Depends: 없음

#### Task 2: 로그인 API
Agent: developer
Output: src/api/auth.ts

### Sequence 2: 회원가입

#### Task 1: 회원가입 폼
Agent: developer

## Phase 2: 결제 모듈

### Sequence 1: 결제 연동

#### Task 1: PG 연동
Agent: developer
Output: src/lib/payment.ts

#### Task 2: 결제 테스트
Agent: qa
`;

  let doc: PlanningDocument;

  it('should parse project name', () => {
    doc = parsePlanningContent(HEADING_PLANNING);
    expect(doc.projectName).toBe('MyProject');
  });

  it('should parse 2 phases', () => {
    doc = parsePlanningContent(HEADING_PLANNING);
    expect(doc.phases).toHaveLength(2);
    expect(doc.phases[0].id).toBe('P1');
    expect(doc.phases[0].title).toBe('인증 시스템');
    expect(doc.phases[1].id).toBe('P2');
    expect(doc.phases[1].title).toBe('결제 모듈');
  });

  it('should parse sequences within phases', () => {
    doc = parsePlanningContent(HEADING_PLANNING);
    expect(doc.phases[0].sequences).toHaveLength(2);
    expect(doc.phases[0].sequences[0].id).toBe('P1-S001');
    expect(doc.phases[0].sequences[0].title).toBe('로그인 구현');
    expect(doc.phases[0].sequences[1].id).toBe('P1-S002');
  });

  it('should parse tasks within sequences', () => {
    doc = parsePlanningContent(HEADING_PLANNING);
    const loginSeq = doc.phases[0].sequences[0];
    expect(loginSeq.tasks).toHaveLength(2);
    expect(loginSeq.tasks[0].id).toBe('P1-S001-T001');
    expect(loginSeq.tasks[0].title).toBe('로그인 UI');
    expect(loginSeq.tasks[1].id).toBe('P1-S001-T002');
    expect(loginSeq.tasks[1].title).toBe('로그인 API');
  });

  it('should extract task metadata', () => {
    doc = parsePlanningContent(HEADING_PLANNING);
    const loginUI = doc.phases[0].sequences[0].tasks[0];
    expect(loginUI.agent).toBe('developer');
    expect(loginUI.outputs).toContain('src/components/LoginForm.tsx');
  });

  it('should return all tasks via getAllTasks', () => {
    doc = parsePlanningContent(HEADING_PLANNING);
    const all = getAllTasks(doc);
    expect(all).toHaveLength(5);
    expect(all.map(t => t.id)).toEqual([
      'P1-S001-T001', 'P1-S001-T002',
      'P1-S002-T001',
      'P2-S001-T001', 'P2-S001-T002',
    ]);
  });
});

// ─── Milestone table parsing ────────────────────────────────────

describe('parsePlanningContent — milestone table', () => {
  const TABLE_PLANNING = `# TestProject 기획서

## 2. 마일스톤

| Phase | 목표 | 산출물 | 완료 기준 |
|-------|-----|--------|----------|
| Phase 1 | MVP 구현 | 로그인, 대시보드 | 기본 기능 동작 |
| Phase 2 | 베타 출시 | 결제 연동 | 외부 테스트 |
| Phase 3 | 정식 출시 | 모니터링 | 안정화 |

## 3. 기술 스택
`;

  it('should parse milestone table into phases', () => {
    const doc = parsePlanningContent(TABLE_PLANNING);
    expect(doc.phases).toHaveLength(3);
    expect(doc.phases[0].id).toBe('P1');
    expect(doc.phases[0].title).toBe('MVP 구현');
    expect(doc.phases[0].deliverables).toEqual(['로그인', '대시보드']);
  });

  it('should create default sequences and tasks for table phases', () => {
    const doc = parsePlanningContent(TABLE_PLANNING);
    expect(doc.phases[0].sequences).toHaveLength(1);
    expect(doc.phases[0].sequences[0].id).toBe('P1-S001');
    expect(doc.phases[0].sequences[0].tasks[0].id).toBe('P1-S001-T001');
  });
});

// ─── Inline task ID parsing ─────────────────────────────────────

describe('parsePlanningContent — inline task IDs', () => {
  const INLINE_PLANNING = `# InlineProject 기획서

## Phase 1: 초기 구현

- P1-S001-T001: 프로젝트 셋업
- P1-S001-T002: 기본 라우팅
- P1-S002-T001: DB 스키마 설계
`;

  it('should parse inline task IDs', () => {
    const doc = parsePlanningContent(INLINE_PLANNING);
    expect(doc.phases).toHaveLength(1);
    const allTasks = getAllTasks(doc);
    expect(allTasks).toHaveLength(3);
    expect(allTasks[0].id).toBe('P1-S001-T001');
    expect(allTasks[0].title).toBe('프로젝트 셋업');
    expect(allTasks[2].id).toBe('P1-S002-T001');
  });

  it('should group inline tasks by sequence', () => {
    const doc = parsePlanningContent(INLINE_PLANNING);
    expect(doc.phases[0].sequences).toHaveLength(2);
    expect(doc.phases[0].sequences[0].tasks).toHaveLength(2);
    expect(doc.phases[0].sequences[1].tasks).toHaveLength(1);
  });
});

// ─── Query helpers ──────────────────────────────────────────────

describe('query helpers', () => {
  const SAMPLE = `# Test 기획서

## Phase 1: Alpha

### Sequence 1: Core

#### Task 1: Setup
#### Task 2: Implement

## Phase 2: Beta

### Sequence 1: Polish

#### Task 1: Refactor
`;

  let doc: PlanningDocument;

  it('findTaskById should return correct task', () => {
    doc = parsePlanningContent(SAMPLE);
    const task = findTaskById(doc, 'P1-S001-T002');
    expect(task).not.toBeNull();
    expect(task!.title).toBe('Implement');
  });

  it('findTaskById should return null for missing task', () => {
    doc = parsePlanningContent(SAMPLE);
    expect(findTaskById(doc, 'P9-S001-T001')).toBeNull();
  });

  it('findPhaseForTask should return correct phase', () => {
    doc = parsePlanningContent(SAMPLE);
    const phase = findPhaseForTask(doc, 'P2-S001-T001');
    expect(phase).not.toBeNull();
    expect(phase!.id).toBe('P2');
  });

  it('findSequenceForTask should return correct sequence', () => {
    doc = parsePlanningContent(SAMPLE);
    const seq = findSequenceForTask(doc, 'P1-S001-T002');
    expect(seq).not.toBeNull();
    expect(seq!.id).toBe('P1-S001');
  });

  it('getPhaseTaskIds should return all task IDs in phase', () => {
    doc = parsePlanningContent(SAMPLE);
    const ids = getPhaseTaskIds(doc, 'P1');
    expect(ids).toEqual(['P1-S001-T001', 'P1-S001-T002']);
  });
});

// ─── Edge cases ─────────────────────────────────────────────────

describe('edge cases', () => {
  it('should handle empty content', () => {
    const doc = parsePlanningContent('');
    expect(doc.phases).toHaveLength(0);
  });

  it('should handle content with no phases', () => {
    const doc = parsePlanningContent('# Project\n\nSome notes.');
    expect(doc.phases).toHaveLength(0);
  });

  it('should strip 기획서 from project name', () => {
    const doc = parsePlanningContent('# MyApp 기획서\n## Phase 1: Init\n#### Task 1: Setup');
    expect(doc.projectName).toBe('MyApp');
  });
});

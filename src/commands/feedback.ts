import { Command } from 'commander';
import path from 'path';
import fs from 'fs-extra';
import { colors, printHeader, printError, printSuccess, printKeyValue } from '../utils/colors.js';
import { findProjectRoot } from '../lib/project.js';
import { exists, readFile, writeFile, listFiles } from '../utils/fs.js';
import { loadYaml } from '../utils/yaml.js';
import { getDateString, getTimeString, getTimestamp } from '../utils/date.js';
import { loadWorkflowState, saveWorkflowState } from '../lib/workflow-state.js';
import type { FeedbackLevel, FeedbackRoutingRules, FeedbackEntry } from '../types/index.js';
import { DEFAULT_ROUTING_RULES } from '../types/feedback.js';

export function registerFeedbackCommand(program: Command): void {
  const feedbackCmd = program
    .command('feedback')
    .description('Manage feedback routing and lifecycle');

  // tsq feedback route <message>
  feedbackCmd
    .command('route <message>')
    .description('Classify and route feedback with auto-actions')
    .action(async (message: string) => {
      try {
        await routeFeedback(message);
      } catch (error) {
        printError((error as Error).message);
        process.exit(1);
      }
    });

  // tsq feedback list [--status <status>]
  feedbackCmd
    .command('list')
    .description('List feedback entries')
    .option('--status <status>', 'Filter by status (open, in_review, resolved, approved, rejected)')
    .action(async (options: { status?: string }) => {
      try {
        await listFeedback(options);
      } catch (error) {
        printError((error as Error).message);
        process.exit(1);
      }
    });

  // tsq feedback resolve <id>
  feedbackCmd
    .command('resolve <id>')
    .description('Mark feedback as resolved')
    .action(async (id: string) => {
      try {
        await resolveFeedback(id);
      } catch (error) {
        printError((error as Error).message);
        process.exit(1);
      }
    });

  // tsq feedback approve <id>
  feedbackCmd
    .command('approve <id>')
    .description('Approve L3 feedback (user action)')
    .action(async (id: string) => {
      try {
        await approveFeedback(id);
      } catch (error) {
        printError((error as Error).message);
        process.exit(1);
      }
    });

  // tsq feedback reject <id>
  feedbackCmd
    .command('reject <id>')
    .description('Reject L3 feedback')
    .action(async (id: string) => {
      try {
        await rejectFeedback(id);
      } catch (error) {
        printError((error as Error).message);
        process.exit(1);
      }
    });
}

// ── Route ──

async function routeFeedback(message: string): Promise<void> {
  const projectRoot = await findProjectRoot();
  if (!projectRoot) {
    throw new Error('Not a TimSquad project');
  }

  // Load routing rules
  const rulesPath = path.join(projectRoot, '.timsquad', 'feedback', 'routing-rules.yaml');
  let rules: FeedbackRoutingRules = DEFAULT_ROUTING_RULES;

  if (await exists(rulesPath)) {
    rules = await loadYaml<FeedbackRoutingRules>(rulesPath);
  }

  // Classify feedback
  const result = classifyFeedback(message, rules);

  printHeader('Feedback Routing');
  printKeyValue('Message', message.substring(0, 50) + (message.length > 50 ? '...' : ''));
  printKeyValue('Level', `${result.level} (${getLevelName(result.level)})`);
  printKeyValue('Route to', result.routeTo);
  printKeyValue('Approval required', result.approvalRequired ? 'Yes' : 'No');

  // Log feedback + auto-actions
  const entry = await logFeedback(projectRoot, message, result);
  await executeAutoActions(projectRoot, entry, result);

  console.log('');
  if (result.level === 3) {
    console.log(colors.warning('⚠ L3 feedback: user approval required (tsq feedback approve/reject)'));
  } else if (result.level === 2) {
    printSuccess(`L2 feedback routed to ${result.routeTo} (in_review, phase gate blocking)`);
  } else {
    printSuccess(`Feedback routed to ${result.routeTo}`);
  }
}

// ── Auto Actions ──

async function executeAutoActions(
  projectRoot: string,
  entry: FeedbackEntry,
  result: ClassificationResult,
): Promise<void> {
  const state = await loadWorkflowState(projectRoot);
  if (!state.automation.feedback) return;

  const feedbackDir = path.join(projectRoot, '.timsquad', 'feedback');

  if (result.level === 2) {
    // L2: SSOT 리뷰 → status='in_review', pending에 등록
    entry.status = 'in_review';
    await fs.writeJson(path.join(feedbackDir, `${entry.id}.json`), entry, { spaces: 2 });

    if (!state.pending_feedback.includes(entry.id)) {
      state.pending_feedback.push(entry.id);
      await saveWorkflowState(projectRoot, state);
    }

    await appendWorkflowLog(projectRoot,
      `[AUTO-FEEDBACK] L2 "${entry.trigger}" → ${entry.routeTo} (review required)`);
  }

  if (result.level === 3) {
    // L3: 사용자 승인 대기 → status='open', pending에 등록
    entry.status = 'open';
    await fs.writeJson(path.join(feedbackDir, `${entry.id}.json`), entry, { spaces: 2 });

    if (!state.pending_feedback.includes(entry.id)) {
      state.pending_feedback.push(entry.id);
      await saveWorkflowState(projectRoot, state);
    }

    await appendWorkflowLog(projectRoot,
      `[AUTO-FEEDBACK] L3 "${entry.trigger}" → user approval required (phase gate blocked)`);
  }
}

// ── List ──

async function listFeedback(options: { status?: string }): Promise<void> {
  const projectRoot = await findProjectRoot();
  if (!projectRoot) {
    throw new Error('Not a TimSquad project');
  }

  const feedbackDir = path.join(projectRoot, '.timsquad', 'feedback');
  if (!await fs.pathExists(feedbackDir)) {
    console.log('No feedback entries found.');
    return;
  }

  const files = await listFiles('FB-*.json', feedbackDir);
  if (files.length === 0) {
    console.log('No feedback entries found.');
    return;
  }

  printHeader('Feedback List');

  const entries: FeedbackEntry[] = [];
  for (const file of files) {
    try {
      const entry: FeedbackEntry = await fs.readJson(path.join(feedbackDir, file));
      // 하위 호환: status 없으면 'open'
      if (!entry.status) entry.status = 'open';
      entries.push(entry);
    } catch { /* skip */ }
  }

  // Filter by status
  const filtered = options.status
    ? entries.filter(e => e.status === options.status)
    : entries;

  if (filtered.length === 0) {
    console.log(`No feedback entries with status "${options.status}".`);
    return;
  }

  // Table output
  console.log(`${'ID'.padEnd(10)} ${'Lv'.padEnd(4)} ${'Status'.padEnd(12)} ${'Trigger'.padEnd(22)} ${'Route'.padEnd(12)} Timestamp`);
  console.log('-'.repeat(80));

  for (const entry of filtered) {
    const id = (entry.id || '').padEnd(10);
    const lv = `L${entry.level || '?'}`.padEnd(4);
    const status = (entry.status || 'open').padEnd(12);
    const trigger = (entry.trigger || '').substring(0, 20).padEnd(22);
    const route = (entry.routeTo || '').padEnd(12);
    const ts = entry.timestamp || '';
    console.log(`${id} ${lv} ${status} ${trigger} ${route} ${ts}`);
  }

  console.log('');
  console.log(`Total: ${filtered.length} entries`);
}

// ── Resolve ──

async function resolveFeedback(id: string): Promise<void> {
  const projectRoot = await findProjectRoot();
  if (!projectRoot) {
    throw new Error('Not a TimSquad project');
  }

  const entry = await loadFeedbackEntry(projectRoot, id);
  entry.status = 'resolved';
  entry.resolvedAt = getTimestamp();
  entry.resolvedBy = 'user';
  await saveFeedbackEntry(projectRoot, id, entry);

  await removePendingFeedback(projectRoot, id);

  printSuccess(`Feedback ${id} resolved`);
}

// ── Approve (L3) ──

async function approveFeedback(id: string): Promise<void> {
  const projectRoot = await findProjectRoot();
  if (!projectRoot) {
    throw new Error('Not a TimSquad project');
  }

  const entry = await loadFeedbackEntry(projectRoot, id);
  if (entry.level !== 3) {
    throw new Error(`Only L3 feedback can be approved (${id} is L${entry.level})`);
  }

  entry.status = 'approved';
  entry.resolvedAt = getTimestamp();
  entry.resolvedBy = 'user';
  await saveFeedbackEntry(projectRoot, id, entry);

  await removePendingFeedback(projectRoot, id);

  printSuccess(`L3 feedback ${id} approved`);
}

// ── Reject (L3) ──

async function rejectFeedback(id: string): Promise<void> {
  const projectRoot = await findProjectRoot();
  if (!projectRoot) {
    throw new Error('Not a TimSquad project');
  }

  const entry = await loadFeedbackEntry(projectRoot, id);
  if (entry.level !== 3) {
    throw new Error(`Only L3 feedback can be rejected (${id} is L${entry.level})`);
  }

  entry.status = 'rejected';
  entry.resolvedAt = getTimestamp();
  entry.resolvedBy = 'user';
  await saveFeedbackEntry(projectRoot, id, entry);

  await removePendingFeedback(projectRoot, id);

  printSuccess(`L3 feedback ${id} rejected`);
}

// ── Helpers ──

export interface ClassificationResult {
  level: FeedbackLevel;
  routeTo: string;
  approvalRequired: boolean;
  trigger: string;
}

export function classifyFeedback(message: string, rules: FeedbackRoutingRules): ClassificationResult {
  const lowerMessage = message.toLowerCase();

  // Check Level 1 triggers (implementation issues)
  for (const trigger of rules.level_1.triggers) {
    const patterns = getTriggerPatterns(trigger);
    if (patterns.some(p => lowerMessage.includes(p))) {
      return {
        level: 1,
        routeTo: rules.level_1.route_to,
        approvalRequired: rules.level_1.approval_required,
        trigger,
      };
    }
  }

  // Check Level 2 triggers (design issues)
  for (const trigger of rules.level_2.triggers) {
    const patterns = getTriggerPatterns(trigger);
    if (patterns.some(p => lowerMessage.includes(p))) {
      return {
        level: 2,
        routeTo: rules.level_2.route_to,
        approvalRequired: rules.level_2.approval_required,
        trigger,
      };
    }
  }

  // Check Level 3 triggers (planning issues)
  for (const trigger of rules.level_3.triggers) {
    const patterns = getTriggerPatterns(trigger);
    if (patterns.some(p => lowerMessage.includes(p))) {
      return {
        level: 3,
        routeTo: 'user',
        approvalRequired: rules.level_3.approval_required,
        trigger,
      };
    }
  }

  // Default to Level 1 (developer)
  return {
    level: 1,
    routeTo: 'developer',
    approvalRequired: false,
    trigger: 'default',
  };
}

export function getTriggerPatterns(trigger: string): string[] {
  const patterns: Record<string, string[]> = {
    test_failure: ['test fail', 'test error', '테스트 실패', 'assertion', 'expect'],
    lint_error: ['lint', 'eslint', 'prettier', 'format'],
    type_error: ['type error', 'typescript', '타입 에러', 'type mismatch'],
    runtime_error: ['runtime', 'exception', '런타임', 'crash', 'undefined'],
    code_style_violation: ['style', 'convention', '컨벤션', 'naming'],
    architecture_issue: ['architecture', '아키텍처', 'structure', 'design pattern'],
    api_mismatch: ['api', 'endpoint', '명세', 'spec', 'contract'],
    performance_problem: ['performance', '성능', 'slow', 'memory', 'leak'],
    scalability_concern: ['scale', '확장', 'load', 'bottleneck'],
    security_vulnerability: ['security', '보안', 'vulnerability', 'xss', 'injection'],
    requirement_ambiguity: ['requirement', '요구사항', 'unclear', '불명확', 'ambiguous'],
    scope_change: ['scope', '범위', 'change request', '변경'],
    business_logic_error: ['business', '비즈니스', 'logic', '로직'],
    feature_request: ['feature', '기능', 'request', '요청', 'add'],
    stakeholder_feedback: ['stakeholder', 'client', '고객', 'user feedback'],
  };

  return patterns[trigger] || [trigger.replace(/_/g, ' ')];
}

function getLevelName(level: FeedbackLevel): string {
  const names: Record<FeedbackLevel, string> = {
    1: '구현 수정',
    2: '설계 수정',
    3: '기획 수정',
  };
  return names[level];
}

async function logFeedback(
  projectRoot: string,
  message: string,
  result: ClassificationResult,
): Promise<FeedbackEntry> {
  const date = getDateString();
  const time = getTimeString();

  // 1. Markdown log
  const logDir = path.join(projectRoot, '.timsquad', 'logs');
  await fs.ensureDir(logDir);
  const logFile = path.join(logDir, `${date}-feedback.md`);

  let content = '';
  if (await exists(logFile)) {
    content = await readFile(logFile);
  } else {
    content = `# Feedback Log - ${date}\n\n`;
  }

  content += `## ${time} [Level ${result.level}]\n\n`;
  content += `**Trigger:** ${result.trigger}\n`;
  content += `**Route to:** ${result.routeTo}\n`;
  content += `**Message:**\n\n${message}\n\n---\n\n`;

  await writeFile(logFile, content);

  // 2. Structured JSON
  const feedbackDir = path.join(projectRoot, '.timsquad', 'feedback');
  await fs.ensureDir(feedbackDir);

  const existingFiles = await listFiles('FB-*.json', feedbackDir);
  const nextNum = existingFiles.length + 1;
  const entryId = `FB-${String(nextNum).padStart(4, '0')}`;

  const entry: FeedbackEntry = {
    id: entryId,
    timestamp: getTimestamp(),
    type: 'feedback',
    level: result.level,
    trigger: result.trigger,
    message,
    routeTo: result.routeTo,
    tags: [result.trigger, `level-${result.level}`],
    status: result.level === 1 ? 'resolved' : 'open',
  };

  await fs.writeJson(path.join(feedbackDir, `${entryId}.json`), entry, { spaces: 2 });
  return entry;
}

async function loadFeedbackEntry(projectRoot: string, id: string): Promise<FeedbackEntry> {
  const feedbackDir = path.join(projectRoot, '.timsquad', 'feedback');
  const fbPath = path.join(feedbackDir, `${id}.json`);
  if (!await fs.pathExists(fbPath)) {
    throw new Error(`Feedback entry not found: ${id}`);
  }
  const entry: FeedbackEntry = await fs.readJson(fbPath);
  if (!entry.status) entry.status = 'open';
  return entry;
}

async function saveFeedbackEntry(projectRoot: string, id: string, entry: FeedbackEntry): Promise<void> {
  const feedbackDir = path.join(projectRoot, '.timsquad', 'feedback');
  await fs.writeJson(path.join(feedbackDir, `${id}.json`), entry, { spaces: 2 });
}

async function removePendingFeedback(projectRoot: string, id: string): Promise<void> {
  const state = await loadWorkflowState(projectRoot);
  const idx = state.pending_feedback.indexOf(id);
  if (idx >= 0) {
    state.pending_feedback.splice(idx, 1);
    await saveWorkflowState(projectRoot, state);
    await appendWorkflowLog(projectRoot, `[FEEDBACK] ${id} removed from pending (resolved/approved/rejected)`);
  }
}

async function appendWorkflowLog(projectRoot: string, message: string): Promise<void> {
  const logPath = path.join(projectRoot, '.timsquad', 'logs', 'workflow-automation.log');
  await fs.ensureDir(path.dirname(logPath));
  await fs.appendFile(logPath, `${getTimestamp()} ${message}\n`);
}

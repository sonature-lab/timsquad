import { Command } from 'commander';
import path from 'path';
import { colors, printHeader, printError, printSuccess, printKeyValue } from '../utils/colors.js';
import { findProjectRoot } from '../lib/project.js';
import { exists, readFile, writeFile } from '../utils/fs.js';
import { loadYaml } from '../utils/yaml.js';
import { getDateString, getTimeString } from '../utils/date.js';
import type { FeedbackLevel, FeedbackRoutingRules } from '../types/index.js';
import { DEFAULT_ROUTING_RULES } from '../types/feedback.js';

export function registerFeedbackCommand(program: Command): void {
  program
    .command('feedback <message>')
    .description('Route feedback to appropriate agent')
    .action(async (message: string) => {
      try {
        await routeFeedback(message);
      } catch (error) {
        printError((error as Error).message);
        process.exit(1);
      }
    });
}

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

  // Log feedback
  await logFeedback(projectRoot, message, result);

  console.log('');
  if (result.approvalRequired) {
    console.log(colors.warning('⚠ This feedback requires user approval before action'));
  } else {
    printSuccess(`Feedback routed to ${result.routeTo}`);
  }
}

interface ClassificationResult {
  level: FeedbackLevel;
  routeTo: string;
  approvalRequired: boolean;
  trigger: string;
}

function classifyFeedback(message: string, rules: FeedbackRoutingRules): ClassificationResult {
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

function getTriggerPatterns(trigger: string): string[] {
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
  result: ClassificationResult
): Promise<void> {
  const date = getDateString();
  const time = getTimeString();
  const logDir = path.join(projectRoot, '.timsquad', 'logs');
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
}

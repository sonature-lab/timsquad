import { Command } from 'commander';
import path from 'path';
import { colors, printHeader, printError, printSuccess, printWarning, printKeyValue } from '../utils/colors.js';
import { findProjectRoot } from '../lib/project.js';
import { exists, writeFile, readFile } from '../utils/fs.js';
import { getDateString, getTimeString } from '../utils/date.js';
import { promptConfirm } from '../utils/prompts.js';

interface QuickModeConfig {
  keywords: string[];
  conditions: {
    single_file_change: boolean;
    ssot_update_required: boolean;
    new_feature: boolean;
    api_change: boolean;
  };
}

const DEFAULT_QUICK_CONFIG: QuickModeConfig = {
  keywords: [
    '수정', '고쳐', '바꿔', '변경',
    'fix', 'change', 'update',
    '오타', 'typo', '색상', '텍스트',
    'style', 'css', 'color', 'text',
  ],
  conditions: {
    single_file_change: true,
    ssot_update_required: false,
    new_feature: false,
    api_change: false,
  },
};

interface ComplexityAnalysis {
  isQuick: boolean;
  reason: string;
  suggestedAgent: string;
  confidence: number;
}

export function registerQuickCommand(program: Command): void {
  program
    .command('q <task>')
    .alias('quick')
    .description('Quick mode for simple tasks (bypasses SSOT/Planner)')
    .action(async (task: string) => {
      try {
        await runQuickMode(task);
      } catch (error) {
        printError((error as Error).message);
        process.exit(1);
      }
    });
}

async function runQuickMode(task: string): Promise<void> {
  const projectRoot = await findProjectRoot();
  if (!projectRoot) {
    throw new Error('Not a TimSquad project. Run "tsq init" first.');
  }

  printHeader('Quick Mode');

  // Analyze task complexity
  const analysis = analyzeTaskComplexity(task);

  printKeyValue('Task', task);
  printKeyValue('Complexity', analysis.isQuick ? 'Simple' : 'Complex');
  printKeyValue('Confidence', `${Math.round(analysis.confidence * 100)}%`);

  if (!analysis.isQuick) {
    console.log('');
    printWarning(`This task may require Full mode: ${analysis.reason}`);
    const proceed = await promptConfirm('Proceed with Quick mode anyway?', false);

    if (!proceed) {
      console.log(colors.dim('\nSwitch to Full mode with: tsq f "' + task + '"'));
      return;
    }
  }

  console.log('');
  console.log(colors.dim('Quick mode executes tasks directly without SSOT checks.'));
  console.log(colors.dim('Agent: Developer (direct call)'));
  console.log('');

  // Log the quick task
  await logQuickTask(projectRoot, task, analysis);

  printSuccess('Quick task logged');
  console.log(colors.dim(`\nLog: .timsquad/logs/quick/${getDateString()}.md`));

  console.log('');
  console.log(colors.subheader('Instructions for Claude:'));
  console.log(colors.dim('─'.repeat(40)));
  console.log(`Execute this simple task directly:`);
  console.log(colors.highlight(`\n  ${task}\n`));
  console.log(colors.dim('No SSOT check needed. Minimal logging.'));
  console.log(colors.dim('─'.repeat(40)));
}

function analyzeTaskComplexity(task: string): ComplexityAnalysis {
  const lowerTask = task.toLowerCase();
  let confidence = 0.5;
  let isQuick = false;
  let reason = 'Unknown complexity';

  // Check for quick keywords
  const quickKeywords = DEFAULT_QUICK_CONFIG.keywords;
  const hasQuickKeyword = quickKeywords.some(k => lowerTask.includes(k));

  if (hasQuickKeyword) {
    confidence += 0.3;
    isQuick = true;
    reason = 'Contains quick mode keyword';
  }

  // Check for complex indicators
  const complexPatterns = [
    { pattern: /api|endpoint|엔드포인트/, reason: 'API change detected' },
    { pattern: /feature|기능|새로운/, reason: 'New feature detected' },
    { pattern: /database|db|테이블|스키마/, reason: 'Database change detected' },
    { pattern: /auth|인증|로그인|권한/, reason: 'Authentication change detected' },
    { pattern: /아키텍처|architecture|구조|리팩토링/, reason: 'Architecture change detected' },
  ];

  for (const { pattern, reason: complexReason } of complexPatterns) {
    if (pattern.test(lowerTask)) {
      confidence -= 0.3;
      isQuick = false;
      reason = complexReason;
      break;
    }
  }

  // Adjust confidence based on task length
  if (task.length < 20) {
    confidence += 0.1;
  } else if (task.length > 100) {
    confidence -= 0.2;
  }

  // Clamp confidence
  confidence = Math.max(0.1, Math.min(0.95, confidence));

  return {
    isQuick: isQuick && confidence > 0.4,
    reason,
    suggestedAgent: 'developer',
    confidence,
  };
}

async function logQuickTask(
  projectRoot: string,
  task: string,
  analysis: ComplexityAnalysis
): Promise<void> {
  const date = getDateString();
  const time = getTimeString();
  const logDir = path.join(projectRoot, '.timsquad', 'logs', 'quick');
  const logFile = path.join(logDir, `${date}.md`);

  let content = '';
  if (await exists(logFile)) {
    content = await readFile(logFile);
  } else {
    content = `# Quick Mode Log - ${date}\n\n`;
  }

  content += `## ${time} - Developer\n\n`;
  content += `- **Task**: ${task}\n`;
  content += `- **Confidence**: ${Math.round(analysis.confidence * 100)}%\n`;
  content += `- **Status**: Pending\n`;
  content += `\n---\n\n`;

  await writeFile(logFile, content);
}

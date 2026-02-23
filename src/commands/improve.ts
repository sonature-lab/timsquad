import { Command } from 'commander';
import path from 'path';
import fs from 'fs-extra';
import { execSync, execFileSync } from 'child_process';
import { colors, printHeader, printError, printSuccess, printKeyValue, printStep } from '../utils/colors.js';
import { exists, writeFile, listFiles } from '../utils/fs.js';
import { getTimestamp, getDateString } from '../utils/date.js';

interface RetroIssue {
  number: number;
  title: string;
  body: string;
  labels: string[];
  createdAt: string;
}

interface ImprovementPattern {
  category: string;
  count: number;
  issues: string[];
  suggestion: string;
}

export function registerImproveCommand(program: Command): void {
  const improveCmd = program
    .command('improve')
    .description('Aggregate retro feedback and suggest framework improvements');

  // tsq improve fetch
  improveCmd
    .command('fetch')
    .description('Fetch retro-feedback issues from GitHub')
    .option('--repo <repo>', 'GitHub repo (owner/name)', 'ericson/timsquad')
    .option('--limit <n>', 'Max issues to fetch', '50')
    .action(async (options: { repo: string; limit: string }) => {
      try {
        await fetchRetroIssues(options.repo, parseInt(options.limit, 10));
      } catch (error) {
        printError((error as Error).message);
        process.exit(1);
      }
    });

  // tsq improve analyze
  improveCmd
    .command('analyze')
    .description('Analyze fetched issues and identify patterns')
    .action(async () => {
      try {
        await analyzePatterns();
      } catch (error) {
        printError((error as Error).message);
        process.exit(1);
      }
    });

  // tsq improve summary
  improveCmd
    .command('summary')
    .description('Show current improvement suggestions')
    .action(async () => {
      try {
        await showSummary();
      } catch (error) {
        printError((error as Error).message);
        process.exit(1);
      }
    });
}

// ============================================================
// Fetch retro issues from GitHub
// ============================================================

function getImproveDir(): string {
  return path.join(process.cwd(), '.timsquad-improve');
}

async function fetchRetroIssues(repo: string, limit: number): Promise<void> {
  printHeader('Fetching Retro Feedback Issues');

  // Check gh CLI
  try {
    execSync('gh --version', { stdio: 'ignore' });
  } catch {
    throw new Error('GitHub CLI (gh) is required. Install: https://cli.github.com');
  }

  printStep(1, 3, 'Querying GitHub issues...');

  let issuesJson: string;
  try {
    issuesJson = execFileSync(
      'gh',
      ['issue', 'list', '--repo', repo, '--label', 'retro-feedback', '--state', 'all', '--limit', String(limit), '--json', 'number,title,body,labels,createdAt'],
      { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] }
    );
  } catch {
    throw new Error(`Failed to fetch issues from ${repo}. Check repo access and gh auth.`);
  }

  const issues: RetroIssue[] = JSON.parse(issuesJson).map((issue: Record<string, unknown>) => ({
    number: issue.number,
    title: issue.title,
    body: issue.body,
    labels: (issue.labels as Array<{ name: string }>).map(l => l.name),
    createdAt: issue.createdAt,
  }));

  printStep(2, 3, `Found ${issues.length} retro-feedback issues`);

  // Save locally
  const improveDir = getImproveDir();
  await fs.ensureDir(improveDir);

  const dataPath = path.join(improveDir, 'issues.json');
  await fs.writeJson(dataPath, {
    fetchedAt: getTimestamp(),
    repo,
    count: issues.length,
    issues,
  }, { spaces: 2 });

  printStep(3, 3, 'Saved to .timsquad-improve/issues.json');

  console.log('');
  printSuccess(`${issues.length} issues fetched from ${repo}`);

  if (issues.length > 0) {
    console.log('');
    console.log(colors.dim('Recent issues:'));
    for (const issue of issues.slice(0, 5)) {
      console.log(colors.dim(`  #${issue.number} ${issue.title}`));
    }
  }

  console.log(colors.dim('\nNext: tsq improve analyze'));
}

// ============================================================
// Analyze patterns from fetched issues
// ============================================================

const PATTERN_KEYWORDS: Record<string, string[]> = {
  'agent-prompt': ['에이전트', 'agent', 'prompt', '프롬프트', 'persona', '역할'],
  'ssot-template': ['ssot', 'template', '템플릿', '문서', 'document', 'spec'],
  'workflow': ['workflow', '워크플로우', 'phase', '페이즈', 'transition', '전환'],
  'feedback-routing': ['feedback', '피드백', 'routing', '라우팅', 'level'],
  'config': ['config', '설정', 'type', 'architecture', '아키텍처'],
  'tooling': ['cli', 'command', '커맨드', 'tool', 'script'],
};

async function analyzePatterns(): Promise<void> {
  const improveDir = getImproveDir();
  const dataPath = path.join(improveDir, 'issues.json');

  if (!await exists(dataPath)) {
    throw new Error('No issues data found. Run "tsq improve fetch" first.');
  }

  printHeader('Analyzing Patterns');

  const data = await fs.readJson(dataPath);
  const issues: RetroIssue[] = data.issues;

  if (issues.length === 0) {
    console.log(colors.warning('\nNo issues to analyze.'));
    return;
  }

  printStep(1, 3, `Analyzing ${issues.length} issues...`);

  // Categorize issues by keyword patterns
  const categoryHits: Record<string, RetroIssue[]> = {};

  for (const [category, keywords] of Object.entries(PATTERN_KEYWORDS)) {
    categoryHits[category] = [];
    for (const issue of issues) {
      const text = `${issue.title} ${issue.body}`.toLowerCase();
      if (keywords.some(kw => text.includes(kw))) {
        categoryHits[category].push(issue);
      }
    }
  }

  printStep(2, 3, 'Identifying improvement patterns...');

  // Extract top problems from issue bodies
  const allProblems: string[] = [];
  for (const issue of issues) {
    const problemMatch = issue.body.match(/\*\*Problem:\*\*\n([\s\S]*?)(?:\n\*\*|\n##|$)/);
    if (problemMatch) {
      const items = problemMatch[1].split('\n')
        .map(l => l.replace(/^- /, '').trim())
        .filter(Boolean);
      allProblems.push(...items);
    }
  }

  // Count problem frequency
  const problemFreq: Record<string, number> = {};
  for (const p of allProblems) {
    const normalized = p.toLowerCase().substring(0, 80);
    problemFreq[normalized] = (problemFreq[normalized] || 0) + 1;
  }

  // Build patterns
  const patterns: ImprovementPattern[] = [];
  for (const [category, matchedIssues] of Object.entries(categoryHits)) {
    if (matchedIssues.length > 0) {
      patterns.push({
        category,
        count: matchedIssues.length,
        issues: matchedIssues.map(i => `#${i.number}: ${i.title}`),
        suggestion: generateSuggestion(category, matchedIssues.length),
      });
    }
  }

  patterns.sort((a, b) => b.count - a.count);

  // Save analysis
  const analysisPath = path.join(improveDir, 'analysis.json');
  await fs.writeJson(analysisPath, {
    analyzedAt: getTimestamp(),
    totalIssues: issues.length,
    patterns,
    topProblems: Object.entries(problemFreq)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([problem, count]) => ({ problem, count })),
  }, { spaces: 2 });

  printStep(3, 3, 'Analysis complete');

  // Generate markdown report
  const report = renderAnalysisReport(patterns, problemFreq, issues.length);
  const reportPath = path.join(improveDir, `analysis-${getDateString()}.md`);
  await writeFile(reportPath, report);

  console.log('');
  printSuccess('Pattern analysis saved');
  printKeyValue('Patterns found', String(patterns.length));
  printKeyValue('Report', reportPath);

  console.log(colors.dim('\nNext: tsq improve summary'));
}

function generateSuggestion(category: string, count: number): string {
  const suggestions: Record<string, string> = {
    'agent-prompt': `에이전트 프롬프트 관련 ${count}건 피드백. 프롬프트 지시사항 강화 또는 페르소나 조정 검토.`,
    'ssot-template': `SSOT 템플릿 관련 ${count}건 피드백. 프로젝트 타입별 템플릿 최적화 검토.`,
    'workflow': `워크플로우 관련 ${count}건 피드백. Phase 전환 조건 또는 체크리스트 개선 검토.`,
    'feedback-routing': `피드백 라우팅 관련 ${count}건 피드백. 분류 기준 또는 라우팅 규칙 조정 검토.`,
    'config': `설정 관련 ${count}건 피드백. 프로젝트 타입/아키텍처 옵션 확장 검토.`,
    'tooling': `CLI 도구 관련 ${count}건 피드백. 커맨드 UX 또는 기능 개선 검토.`,
  };

  return suggestions[category] || `${category} 관련 ${count}건 피드백 발견.`;
}

function renderAnalysisReport(
  patterns: ImprovementPattern[],
  problemFreq: Record<string, number>,
  totalIssues: number
): string {
  const lines: string[] = [];

  lines.push('# TimSquad Improvement Analysis');
  lines.push('');
  lines.push(`> Analyzed: ${getTimestamp()}`);
  lines.push(`> Total retro issues: ${totalIssues}`);
  lines.push('');

  // Patterns
  lines.push('## Improvement Patterns');
  lines.push('');
  lines.push('| Category | Count | Suggestion |');
  lines.push('|----------|:-----:|------------|');

  for (const p of patterns) {
    lines.push(`| ${p.category} | ${p.count} | ${p.suggestion} |`);
  }
  lines.push('');

  // Top problems
  const topProblems = Object.entries(problemFreq)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10);

  if (topProblems.length > 0) {
    lines.push('## Recurring Problems');
    lines.push('');
    for (const [problem, count] of topProblems) {
      lines.push(`- (x${count}) ${problem}`);
    }
    lines.push('');
  }

  // Action items
  lines.push('## Suggested Actions');
  lines.push('');

  for (const p of patterns) {
    lines.push(`### ${p.category}`);
    lines.push('');
    lines.push(p.suggestion);
    lines.push('');
    lines.push('Related issues:');
    for (const issue of p.issues.slice(0, 5)) {
      lines.push(`- ${issue}`);
    }
    lines.push('');
  }

  lines.push('---');
  lines.push('Generated by TimSquad v2.0.0');

  return lines.join('\n');
}

// ============================================================
// Show summary
// ============================================================

async function showSummary(): Promise<void> {
  const improveDir = getImproveDir();
  const analysisPath = path.join(improveDir, 'analysis.json');

  if (!await exists(analysisPath)) {
    throw new Error('No analysis found. Run "tsq improve fetch" then "tsq improve analyze".');
  }

  const analysis = await fs.readJson(analysisPath);

  printHeader('Improvement Summary');
  printKeyValue('Analyzed at', analysis.analyzedAt);
  printKeyValue('Total issues', String(analysis.totalIssues));

  if (analysis.patterns.length > 0) {
    console.log('');
    console.log(colors.subheader('  Patterns:'));
    for (const p of analysis.patterns) {
      console.log(`    ${colors.highlight(p.category)} (${p.count}건) - ${p.suggestion}`);
    }
  }

  if (analysis.topProblems?.length > 0) {
    console.log('');
    console.log(colors.subheader('  Top Problems:'));
    for (const { problem, count } of analysis.topProblems.slice(0, 5)) {
      console.log(`    ${colors.warning(`x${count}`)} ${problem}`);
    }
  }

  // Check for analysis report files
  const reports = await listFiles('analysis-*.md', improveDir);
  if (reports.length > 0) {
    console.log('');
    console.log(colors.dim(`  Reports: ${reports.length} (latest: ${reports[reports.length - 1]})`));
  }
}

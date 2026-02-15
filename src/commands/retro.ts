import { Command } from 'commander';
import path from 'path';
import fs from 'fs-extra';
import { execSync } from 'child_process';
import { colors, printHeader, printError, printSuccess, printKeyValue } from '../utils/colors.js';
import { findProjectRoot, getProjectInfo } from '../lib/project.js';
import { exists, writeFile, listFiles } from '../utils/fs.js';
import { getTimestamp, getDateString } from '../utils/date.js';
import { promptText, promptConfirm } from '../utils/prompts.js';
import type { Phase } from '../types/index.js';
import type { PhaseRetroEntry, FeedbackEntry, AggregatedReport } from '../types/feedback.js';

interface RetroState {
  currentCycle: number;
  status: 'idle' | 'collecting' | 'analyzing' | 'reporting' | 'applying';
  startedAt?: string;
  collectedAt?: string;
  analyzedAt?: string;
}

export function registerRetroCommand(program: Command): void {
  const retroCmd = program
    .command('retro')
    .description('Retrospective learning system');

  // tsq retro phase <phase-name>
  retroCmd
    .command('phase <phase>')
    .description('Run phase-level retrospective (saves locally)')
    .action(async (phase: string) => {
      try {
        await runPhaseRetro(phase as Phase);
      } catch (error) {
        printError((error as Error).message);
        process.exit(1);
      }
    });

  // tsq retro start
  retroCmd
    .command('start')
    .description('Start a new retrospective cycle')
    .action(async () => {
      try {
        await startRetro();
      } catch (error) {
        printError((error as Error).message);
        process.exit(1);
      }
    });

  // tsq retro collect
  retroCmd
    .command('collect')
    .description('Collect logs and metrics')
    .action(async () => {
      try {
        await collectRetro();
      } catch (error) {
        printError((error as Error).message);
        process.exit(1);
      }
    });

  // tsq retro analyze
  retroCmd
    .command('analyze')
    .description('Analyze patterns (requires Claude)')
    .action(async () => {
      try {
        await analyzeRetro();
      } catch (error) {
        printError((error as Error).message);
        process.exit(1);
      }
    });

  // tsq retro report
  retroCmd
    .command('report')
    .description('Generate aggregated report + create GitHub Issue')
    .option('--local', 'Skip GitHub Issue creation')
    .action(async (options: { local?: boolean }) => {
      try {
        await generateReport(options.local);
      } catch (error) {
        printError((error as Error).message);
        process.exit(1);
      }
    });

  // tsq retro apply
  retroCmd
    .command('apply')
    .description('Apply improvements')
    .action(async () => {
      try {
        await applyImprovements();
      } catch (error) {
        printError((error as Error).message);
        process.exit(1);
      }
    });

  // tsq retro auto
  retroCmd
    .command('auto')
    .description('Run full retrospective cycle automatically (start → collect → report → apply)')
    .option('--local', 'Skip GitHub Issue creation')
    .action(async (options: { local?: boolean }) => {
      try {
        await runAutoRetro(options.local);
      } catch (error) {
        printError((error as Error).message);
        process.exit(1);
      }
    });

  // tsq retro status
  retroCmd
    .command('status')
    .description('Show retrospective status')
    .action(async () => {
      try {
        await showRetroStatus();
      } catch (error) {
        printError((error as Error).message);
        process.exit(1);
      }
    });
}

// ============================================================
// Phase-level retro
// ============================================================

const VALID_PHASES: Phase[] = ['planning', 'design', 'implementation', 'review', 'security', 'deployment'];

async function runPhaseRetro(phase: Phase): Promise<void> {
  if (!VALID_PHASES.includes(phase)) {
    throw new Error(`Invalid phase: ${phase}. Valid: ${VALID_PHASES.join(', ')}`);
  }

  const projectRoot = await findProjectRoot();
  if (!projectRoot) {
    throw new Error('Not a TimSquad project');
  }

  const project = await getProjectInfo(projectRoot);

  printHeader(`Phase Retrospective: ${phase}`);
  console.log(colors.dim('KPT 프레임워크로 Phase 회고를 진행합니다.\n'));

  // Interactive KPT input
  console.log(colors.header('Keep (잘 된 것)'));
  const keepInput = await promptText('쉼표로 구분하여 입력:', '');
  const keep = keepInput.split(',').map(s => s.trim()).filter(Boolean);

  console.log('');
  console.log(colors.header('Problem (문제점)'));
  const problemInput = await promptText('쉼표로 구분하여 입력:', '');
  const problem = problemInput.split(',').map(s => s.trim()).filter(Boolean);

  console.log('');
  console.log(colors.header('Try (다음에 시도할 것)'));
  const tryInput = await promptText('쉼표로 구분하여 입력:', '');
  const tryNext = tryInput.split(',').map(s => s.trim()).filter(Boolean);

  // Create phase retro entry
  const entry: PhaseRetroEntry = {
    id: `PR-${phase}-${Date.now()}`,
    timestamp: getTimestamp(),
    project: project.name,
    phase,
    keep,
    problem,
    try_next: tryNext,
    tags: [phase, project.type],
  };

  // Save locally
  const feedbackDir = path.join(projectRoot, '.timsquad', 'feedback');
  await fs.ensureDir(feedbackDir);
  const fileName = `phase-${phase}-${getDateString()}.json`;
  await fs.writeJson(path.join(feedbackDir, fileName), entry, { spaces: 2 });

  console.log('');
  printSuccess(`Phase 회고 저장: .timsquad/feedback/${fileName}`);

  // Show summary
  console.log('');
  printKeyValue('Keep', keep.length > 0 ? keep.join(', ') : '(없음)');
  printKeyValue('Problem', problem.length > 0 ? problem.join(', ') : '(없음)');
  printKeyValue('Try', tryNext.length > 0 ? tryNext.join(', ') : '(없음)');
  console.log(colors.dim('\n전체 리포트 생성: tsq retro report'));
}

// ============================================================
// Existing retro flow
// ============================================================

async function getRetroState(projectRoot: string): Promise<RetroState> {
  const statePath = path.join(projectRoot, '.timsquad', 'retrospective', 'state.json');

  if (!await exists(statePath)) {
    return { currentCycle: 0, status: 'idle' };
  }

  return fs.readJson(statePath);
}

async function saveRetroState(projectRoot: string, state: RetroState): Promise<void> {
  const statePath = path.join(projectRoot, '.timsquad', 'retrospective', 'state.json');
  await fs.ensureDir(path.dirname(statePath));
  await fs.writeJson(statePath, state, { spaces: 2 });
}

async function startRetro(): Promise<void> {
  const projectRoot = await findProjectRoot();
  if (!projectRoot) {
    throw new Error('Not a TimSquad project');
  }

  const state = await getRetroState(projectRoot);

  if (state.status !== 'idle') {
    throw new Error(`Retrospective cycle ${state.currentCycle} is already in progress (${state.status})`);
  }

  state.currentCycle += 1;
  state.status = 'collecting';
  state.startedAt = getTimestamp();

  await saveRetroState(projectRoot, state);

  printSuccess(`Started retrospective cycle ${state.currentCycle}`);
  console.log(colors.dim('\nNext: Run "tsq retro collect" to collect metrics'));
}

async function collectRetro(): Promise<void> {
  const projectRoot = await findProjectRoot();
  if (!projectRoot) {
    throw new Error('Not a TimSquad project');
  }

  const state = await getRetroState(projectRoot);

  if (state.status !== 'collecting') {
    throw new Error('No active retrospective. Run "tsq retro start" first');
  }

  printHeader(`Collecting Metrics - Cycle ${state.currentCycle}`);

  // Collect log stats
  const logsDir = path.join(projectRoot, '.timsquad', 'logs');
  const logFiles = await listFiles('*.md', logsDir);
  const recentLogs = logFiles.filter(f => !f.startsWith('_'));

  // Count by agent
  const agentStats: Record<string, number> = {};
  for (const file of recentLogs) {
    const match = file.match(/-([a-z]+)\.md$/);
    if (match) {
      const agent = match[1];
      agentStats[agent] = (agentStats[agent] || 0) + 1;
    }
  }

  // Create metrics JSON
  const metrics = {
    cycle: state.currentCycle,
    collectedAt: getTimestamp(),
    raw_data: {
      log_files: recentLogs.length,
      agents: agentStats,
    },
    summary: {
      total_logs: recentLogs.length,
      agents_active: Object.keys(agentStats).length,
    },
  };

  const metricsPath = path.join(
    projectRoot,
    '.timsquad',
    'retrospective',
    'metrics',
    `cycle-${state.currentCycle}.json`
  );
  await fs.ensureDir(path.dirname(metricsPath));
  await fs.writeJson(metricsPath, metrics, { spaces: 2 });

  state.status = 'analyzing';
  state.collectedAt = getTimestamp();
  await saveRetroState(projectRoot, state);

  printSuccess('Metrics collected');
  printKeyValue('Log files', String(recentLogs.length));
  printKeyValue('Active agents', String(Object.keys(agentStats).length));
  console.log(colors.dim('\nNext: Run "tsq retro analyze" to analyze patterns'));
}

async function analyzeRetro(): Promise<void> {
  const projectRoot = await findProjectRoot();
  if (!projectRoot) {
    throw new Error('Not a TimSquad project');
  }

  const state = await getRetroState(projectRoot);

  if (state.status !== 'analyzing') {
    throw new Error('Collect metrics first. Run "tsq retro collect"');
  }

  printHeader(`Analyzing Patterns - Cycle ${state.currentCycle}`);

  const analysis = await runPatternAnalysis(projectRoot, state.currentCycle);

  // 결과 저장
  const analysisDir = path.join(projectRoot, '.timsquad', 'retrospective', 'analysis');
  await fs.ensureDir(analysisDir);
  await fs.writeJson(
    path.join(analysisDir, `cycle-${state.currentCycle}-analysis.json`),
    analysis,
    { spaces: 2 },
  );

  state.status = 'reporting';
  state.analyzedAt = getTimestamp();
  await saveRetroState(projectRoot, state);

  // 결과 출력
  printSuccess('Pattern analysis completed');
  printKeyValue('Sessions analyzed', String(analysis.sessions));
  printKeyValue('Agents', String(Object.keys(analysis.agents).length));
  printKeyValue('Flags', String(analysis.flags.length));

  if (analysis.flags.length > 0) {
    console.log(colors.warning('\n⚠ Detected issues:'));
    for (const flag of analysis.flags) {
      console.log(colors.dim(`  - [${flag.severity}] ${flag.message}`));
    }
  }

  console.log(colors.dim('\nNext: Run "tsq retro report" to generate report'));
}

interface AnalysisFlag {
  severity: 'warn' | 'info';
  category: string;
  message: string;
}

interface PatternAnalysis {
  cycle: number;
  analyzedAt: string;
  sessions: number;
  agents: Record<string, { calls: number; failures: number; failureRate: number }>;
  tools: Record<string, { uses: number; failures: number; failureRate: number }>;
  reworkFiles: Array<{ path: string; modifications: number }>;
  flags: AnalysisFlag[];
}

async function runPatternAnalysis(projectRoot: string, cycle: number): Promise<PatternAnalysis> {
  const sessionsDir = path.join(projectRoot, '.timsquad', 'logs', 'sessions');
  const agentStats: Record<string, { calls: number; failures: number }> = {};
  const toolStats: Record<string, { uses: number; failures: number }> = {};
  const fileModCounts: Record<string, number> = {};
  let sessionCount = 0;

  // 세션 로그 파싱
  if (await exists(sessionsDir)) {
    const logFiles = await listFiles('*.jsonl', sessionsDir);
    sessionCount = logFiles.length;

    for (const file of logFiles) {
      try {
        const content = await fs.readFile(path.join(sessionsDir, file), 'utf-8');
        for (const line of content.split('\n')) {
          const trimmed = line.trim();
          if (!trimmed) continue;
          try {
            const ev = JSON.parse(trimmed);

            // 에이전트 통계
            if (ev.event === 'SubagentStart' && ev.detail?.subagent_type) {
              const agent = ev.detail.subagent_type;
              if (!agentStats[agent]) agentStats[agent] = { calls: 0, failures: 0 };
              agentStats[agent].calls++;
            }

            // 도구 통계
            if (ev.event === 'PostToolUse' && ev.tool) {
              if (!toolStats[ev.tool]) toolStats[ev.tool] = { uses: 0, failures: 0 };
              toolStats[ev.tool].uses++;
            }
            if (ev.event === 'PostToolUseFailure' && ev.tool) {
              if (!toolStats[ev.tool]) toolStats[ev.tool] = { uses: 0, failures: 0 };
              toolStats[ev.tool].failures++;
            }
          } catch { /* skip malformed line */ }
        }
      } catch { /* skip unreadable file */ }
    }
  }

  // L1 태스크 로그에서 rework 파일 탐지
  const tasksDir = path.join(projectRoot, '.timsquad', 'logs', 'tasks');
  if (await exists(tasksDir)) {
    const taskFiles = await listFiles('*.json', tasksDir);
    for (const file of taskFiles) {
      try {
        const task = await fs.readJson(path.join(tasksDir, file));
        if (task.mechanical?.files) {
          for (const f of task.mechanical.files) {
            fileModCounts[f.path] = (fileModCounts[f.path] || 0) + 1;
          }
        }
        // 에이전트 실패 추적 (status !== 'completed')
        if (task.agent && task.status !== 'completed') {
          if (!agentStats[task.agent]) agentStats[task.agent] = { calls: 0, failures: 0 };
          agentStats[task.agent].failures++;
        }
      } catch { /* skip */ }
    }
  }

  // rework 파일 (3회+ 수정)
  const reworkFiles = Object.entries(fileModCounts)
    .filter(([, count]) => count >= 3)
    .sort(([, a], [, b]) => b - a)
    .map(([filePath, modifications]) => ({ path: filePath, modifications }));

  // 에이전트별 실패율 계산
  const agents: PatternAnalysis['agents'] = {};
  for (const [name, stat] of Object.entries(agentStats)) {
    const total = stat.calls + stat.failures;
    agents[name] = {
      calls: stat.calls,
      failures: stat.failures,
      failureRate: total > 0 ? Math.round((stat.failures / total) * 100) : 0,
    };
  }

  // 도구별 실패율 계산
  const tools: PatternAnalysis['tools'] = {};
  for (const [name, stat] of Object.entries(toolStats)) {
    const total = stat.uses + stat.failures;
    tools[name] = {
      uses: stat.uses,
      failures: stat.failures,
      failureRate: total > 0 ? Math.round((stat.failures / total) * 100) : 0,
    };
  }

  // 이상 탐지 플래그
  const flags: AnalysisFlag[] = [];

  // 에이전트 실패율 > 20%
  for (const [name, stat] of Object.entries(agents)) {
    if (stat.failureRate > 20 && (stat.calls + stat.failures) >= 3) {
      flags.push({
        severity: 'warn',
        category: 'agent-failure',
        message: `Agent "${name}" failure rate ${stat.failureRate}% (${stat.failures}/${stat.calls + stat.failures})`,
      });
    }
  }

  // 도구 실패율 > 30% (3회 이상 사용)
  for (const [name, stat] of Object.entries(tools)) {
    if (stat.failureRate > 30 && (stat.uses + stat.failures) >= 3) {
      flags.push({
        severity: 'warn',
        category: 'tool-failure',
        message: `Tool "${name}" failure rate ${stat.failureRate}% (${stat.failures}/${stat.uses + stat.failures})`,
      });
    }
  }

  // rework 파일
  for (const rw of reworkFiles.slice(0, 5)) {
    flags.push({
      severity: 'info',
      category: 'rework',
      message: `File "${rw.path}" modified ${rw.modifications} times (possible rework)`,
    });
  }

  return {
    cycle,
    analyzedAt: getTimestamp(),
    sessions: sessionCount,
    agents,
    tools,
    reworkFiles,
    flags,
  };
}

// ============================================================
// Aggregated report + GitHub Issue
// ============================================================

async function loadFeedbackEntries(projectRoot: string): Promise<FeedbackEntry[]> {
  const feedbackDir = path.join(projectRoot, '.timsquad', 'feedback');
  if (!await exists(feedbackDir)) return [];

  const files = await listFiles('FB-*.json', feedbackDir);
  const entries: FeedbackEntry[] = [];

  for (const file of files) {
    try {
      const data = await fs.readJson(path.join(feedbackDir, file));
      entries.push(data);
    } catch {
      // skip invalid files
    }
  }

  return entries.sort((a, b) => a.timestamp.localeCompare(b.timestamp));
}

async function loadPhaseRetros(projectRoot: string): Promise<PhaseRetroEntry[]> {
  const feedbackDir = path.join(projectRoot, '.timsquad', 'feedback');
  if (!await exists(feedbackDir)) return [];

  const files = await listFiles('phase-*.json', feedbackDir);
  const entries: PhaseRetroEntry[] = [];

  for (const file of files) {
    try {
      const data = await fs.readJson(path.join(feedbackDir, file));
      entries.push(data);
    } catch {
      // skip invalid files
    }
  }

  return entries.sort((a, b) => a.timestamp.localeCompare(b.timestamp));
}

function buildAggregatedReport(
  project: { name: string },
  phases: PhaseRetroEntry[],
  feedbacks: FeedbackEntry[]
): AggregatedReport {
  const byLevel: Record<string, number> = {};
  const byPhase: Record<string, number> = {};
  const issueCount: Record<string, number> = {};

  for (const fb of feedbacks) {
    const levelKey = `Level ${fb.level ?? '?'}`;
    byLevel[levelKey] = (byLevel[levelKey] || 0) + 1;

    if (fb.phase) {
      byPhase[fb.phase] = (byPhase[fb.phase] || 0) + 1;
    }

    if (fb.trigger) {
      issueCount[fb.trigger] = (issueCount[fb.trigger] || 0) + 1;
    }
  }

  for (const pr of phases) {
    byPhase[pr.phase] = (byPhase[pr.phase] || 0) + pr.problem.length;
    for (const p of pr.problem) {
      issueCount[p] = (issueCount[p] || 0) + 1;
    }
  }

  const topIssues = Object.entries(issueCount)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([issue]) => issue);

  const timestamps = [
    ...phases.map(p => p.timestamp),
    ...feedbacks.map(f => f.timestamp),
  ].sort();

  return {
    project: project.name,
    generated_at: getTimestamp(),
    period: {
      start: timestamps[0] || getTimestamp(),
      end: timestamps[timestamps.length - 1] || getTimestamp(),
    },
    phases,
    feedbacks,
    summary: {
      total_feedbacks: feedbacks.length,
      by_level: byLevel,
      by_phase: byPhase,
      top_issues: topIssues,
    },
  };
}

function renderReportMarkdown(report: AggregatedReport): string {
  const lines: string[] = [];

  lines.push(`# [retro] ${report.project} - Retrospective Report`);
  lines.push('');
  lines.push(`> Generated: ${report.generated_at}`);
  lines.push(`> Period: ${report.period.start.split('T')[0]} ~ ${report.period.end.split('T')[0]}`);
  lines.push('');

  // Summary
  lines.push('## Summary');
  lines.push('');
  lines.push('| Metric | Value |');
  lines.push('|--------|-------|');
  lines.push(`| Phase retros | ${report.phases.length} |`);
  lines.push(`| Feedbacks | ${report.summary.total_feedbacks} |`);

  for (const [level, count] of Object.entries(report.summary.by_level)) {
    lines.push(`| ${level} | ${count} |`);
  }
  lines.push('');

  // Top issues
  if (report.summary.top_issues.length > 0) {
    lines.push('## Top Issues');
    lines.push('');
    for (const issue of report.summary.top_issues) {
      lines.push(`- ${issue}`);
    }
    lines.push('');
  }

  // Phase retros
  if (report.phases.length > 0) {
    lines.push('## Phase Retrospectives');
    lines.push('');

    for (const phase of report.phases) {
      lines.push(`### ${phase.phase} (${phase.timestamp.split('T')[0]})`);
      lines.push('');

      if (phase.keep.length > 0) {
        lines.push('**Keep:**');
        for (const k of phase.keep) lines.push(`- ${k}`);
        lines.push('');
      }

      if (phase.problem.length > 0) {
        lines.push('**Problem:**');
        for (const p of phase.problem) lines.push(`- ${p}`);
        lines.push('');
      }

      if (phase.try_next.length > 0) {
        lines.push('**Try:**');
        for (const t of phase.try_next) lines.push(`- ${t}`);
        lines.push('');
      }
    }
  }

  // Feedbacks
  if (report.feedbacks.length > 0) {
    lines.push('## Feedbacks');
    lines.push('');
    lines.push('| Date | Level | Trigger | Message |');
    lines.push('|------|:-----:|---------|---------|');

    for (const fb of report.feedbacks) {
      const date = fb.timestamp.split('T')[0];
      lines.push(`| ${date} | ${fb.level ?? '-'} | ${fb.trigger ?? '-'} | ${fb.message.substring(0, 60)} |`);
    }
    lines.push('');
  }

  lines.push('## Improvement Suggestions');
  lines.push('');
  for (const issue of report.summary.top_issues) {
    lines.push(`- [ ] Address: ${issue}`);
  }
  lines.push('');
  lines.push('---');
  lines.push('Generated by TimSquad v2.0.0');

  return lines.join('\n');
}

function createGitHubIssue(title: string, body: string): string | null {
  try {
    execSync('gh --version', { stdio: 'ignore' });

    // Write body to temp file to avoid shell escaping issues
    const tmpFile = path.join('/tmp', `tsq-retro-${Date.now()}.md`);
    fs.writeFileSync(tmpFile, body, 'utf-8');

    const result = execSync(
      `gh issue create --repo ericson/timsquad --title "${title}" --label "retro-feedback" --body-file "${tmpFile}"`,
      { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] }
    );

    fs.removeSync(tmpFile);
    return result.trim();
  } catch {
    return null;
  }
}

async function generateReport(localOnly?: boolean): Promise<void> {
  const projectRoot = await findProjectRoot();
  if (!projectRoot) {
    throw new Error('Not a TimSquad project');
  }

  const project = await getProjectInfo(projectRoot);

  printHeader('Generating Aggregated Report');

  // Load all local feedback
  const phases = await loadPhaseRetros(projectRoot);
  const feedbacks = await loadFeedbackEntries(projectRoot);

  if (phases.length === 0 && feedbacks.length === 0) {
    console.log(colors.warning('\n⚠ No feedback data found.'));
    console.log(colors.dim('  Run "tsq retro phase <name>" or "tsq feedback <message>" first.\n'));
    return;
  }

  printKeyValue('Phase retros', String(phases.length));
  printKeyValue('Feedbacks', String(feedbacks.length));

  // Build aggregated report
  const report = buildAggregatedReport(project, phases, feedbacks);
  const markdown = renderReportMarkdown(report);

  // Save report locally
  const state = await getRetroState(projectRoot);
  const cycleNum = state.currentCycle > 0 ? state.currentCycle : 1;

  const reportDir = path.join(projectRoot, '.timsquad', 'retrospective', 'cycles');
  await fs.ensureDir(reportDir);
  const reportPath = path.join(reportDir, `cycle-${cycleNum}.md`);
  await writeFile(reportPath, markdown);

  const jsonPath = path.join(reportDir, `cycle-${cycleNum}.json`);
  await fs.writeJson(jsonPath, report, { spaces: 2 });

  console.log('');
  printSuccess(`Report saved: cycle-${cycleNum}.md`);
  console.log(colors.path(`  ${reportPath}`));

  // Create GitHub Issue (unless --local)
  if (!localOnly) {
    console.log('');
    const shouldCreate = await promptConfirm('GitHub Issue를 생성하시겠습니까?', true);

    if (shouldCreate) {
      const issueTitle = `[retro] ${project.name} - Cycle ${cycleNum}`;
      const issueUrl = createGitHubIssue(issueTitle, markdown);

      if (issueUrl) {
        console.log('');
        printSuccess(`GitHub Issue created: ${issueUrl}`);
      } else {
        console.log(colors.warning('\n⚠ GitHub Issue 생성 실패 (gh CLI 확인 필요)'));
        console.log(colors.dim('  수동 생성: gh issue create --repo ericson/timsquad'));
      }
    }
  }

  // Update retro state
  state.status = 'applying';
  await saveRetroState(projectRoot, state);

  console.log(colors.dim('\nNext: Review report and run "tsq retro apply" to complete'));
}

async function applyImprovements(): Promise<void> {
  const projectRoot = await findProjectRoot();
  if (!projectRoot) {
    throw new Error('Not a TimSquad project');
  }

  const state = await getRetroState(projectRoot);

  if (state.status !== 'applying') {
    throw new Error('Generate report first. Run "tsq retro report"');
  }

  console.log(colors.warning('\n⚠ Improvement application requires manual review'));
  console.log(colors.dim('  1. Review the generated report'));
  console.log(colors.dim('  2. Update templates/prompts as needed'));
  console.log(colors.dim('  3. This cycle will be marked as complete\n'));

  // Archive processed feedback
  const feedbackDir = path.join(projectRoot, '.timsquad', 'feedback');
  const archiveDir = path.join(feedbackDir, `archive-cycle-${state.currentCycle}`);

  if (await exists(feedbackDir)) {
    const files = await listFiles('*.json', feedbackDir);
    if (files.length > 0) {
      await fs.ensureDir(archiveDir);
      for (const file of files) {
        await fs.move(
          path.join(feedbackDir, file),
          path.join(archiveDir, file),
          { overwrite: true }
        );
      }
      console.log(colors.dim(`  Feedback archived: ${archiveDir}`));
    }
  }

  state.status = 'idle';
  await saveRetroState(projectRoot, state);

  printSuccess(`Retrospective cycle ${state.currentCycle} completed!`);
}

// ============================================================
// Auto retro (전체 사이클 자동 실행)
// start → collect → (analyze skip) → report → apply
// ============================================================

async function runAutoRetro(localOnly?: boolean): Promise<void> {
  const projectRoot = await findProjectRoot();
  if (!projectRoot) {
    throw new Error('Not a TimSquad project');
  }

  printHeader('Auto Retrospective');
  console.log(colors.dim('전체 회고 사이클을 자동으로 실행합니다.\n'));

  // Step 1: Start
  let state = await getRetroState(projectRoot);

  if (state.status !== 'idle') {
    console.log(colors.warning(`⚠ 기존 cycle ${state.currentCycle} (${state.status}) 가 진행 중입니다.`));
    console.log(colors.dim('  기존 사이클을 이어서 진행합니다.\n'));
  } else {
    state.currentCycle += 1;
    state.status = 'collecting';
    state.startedAt = getTimestamp();
    await saveRetroState(projectRoot, state);
    printSuccess(`[1/4] Cycle ${state.currentCycle} started`);
  }

  // Step 2: Collect
  if (state.status === 'collecting') {
    const logsDir = path.join(projectRoot, '.timsquad', 'logs');
    const logFiles = await listFiles('*.md', logsDir);
    const recentLogs = logFiles.filter(f => !f.startsWith('_'));

    const agentStats: Record<string, number> = {};
    for (const file of recentLogs) {
      const match = file.match(/-([a-z]+)\.md$/);
      if (match) {
        agentStats[match[1]] = (agentStats[match[1]] || 0) + 1;
      }
    }

    const metricsPath = path.join(
      projectRoot, '.timsquad', 'retrospective', 'metrics',
      `cycle-${state.currentCycle}.json`
    );
    await fs.ensureDir(path.dirname(metricsPath));
    await fs.writeJson(metricsPath, {
      cycle: state.currentCycle,
      collectedAt: getTimestamp(),
      raw_data: { log_files: recentLogs.length, agents: agentStats },
      summary: { total_logs: recentLogs.length, agents_active: Object.keys(agentStats).length },
    }, { spaces: 2 });

    state.status = 'analyzing';
    state.collectedAt = getTimestamp();
    await saveRetroState(projectRoot, state);
    printSuccess(`[2/4] Metrics collected (${recentLogs.length} logs, ${Object.keys(agentStats).length} agents)`);
  }

  // Step 3: Pattern analysis
  if (state.status === 'analyzing') {
    const analysis = await runPatternAnalysis(projectRoot, state.currentCycle);

    const analysisDir = path.join(projectRoot, '.timsquad', 'retrospective', 'analysis');
    await fs.ensureDir(analysisDir);
    await fs.writeJson(
      path.join(analysisDir, `cycle-${state.currentCycle}-analysis.json`),
      analysis,
      { spaces: 2 },
    );

    state.status = 'reporting';
    state.analyzedAt = getTimestamp();
    await saveRetroState(projectRoot, state);
    printSuccess(`[3/4] Analysis completed (${analysis.flags.length} flags)`);
  }

  // Step 4: Report + Apply
  if (state.status === 'reporting') {
    const project = await getProjectInfo(projectRoot);
    const phases = await loadPhaseRetros(projectRoot);
    const feedbacks = await loadFeedbackEntries(projectRoot);

    if (phases.length === 0 && feedbacks.length === 0) {
      console.log(colors.dim('\n  피드백 데이터 없음 - 빈 리포트 생성을 건너뜁니다.'));
    } else {
      const report = buildAggregatedReport(project, phases, feedbacks);
      const markdown = renderReportMarkdown(report);

      const reportDir = path.join(projectRoot, '.timsquad', 'retrospective', 'cycles');
      await fs.ensureDir(reportDir);
      await writeFile(path.join(reportDir, `cycle-${state.currentCycle}.md`), markdown);
      await fs.writeJson(path.join(reportDir, `cycle-${state.currentCycle}.json`), report, { spaces: 2 });

      printKeyValue('  Phase retros', String(phases.length));
      printKeyValue('  Feedbacks', String(feedbacks.length));

      // GitHub Issue (auto mode에서는 --local이 아니면 자동 생성 시도)
      if (!localOnly) {
        const issueTitle = `[retro] ${project.name} - Cycle ${state.currentCycle}`;
        const issueUrl = createGitHubIssue(issueTitle, markdown);
        if (issueUrl) {
          printSuccess(`  GitHub Issue: ${issueUrl}`);
        }
      }
    }

    // Apply: archive feedback
    const feedbackDir = path.join(projectRoot, '.timsquad', 'feedback');
    const archiveDir = path.join(feedbackDir, `archive-cycle-${state.currentCycle}`);

    if (await exists(feedbackDir)) {
      const files = await listFiles('*.json', feedbackDir);
      if (files.length > 0) {
        await fs.ensureDir(archiveDir);
        for (const file of files) {
          await fs.move(
            path.join(feedbackDir, file),
            path.join(archiveDir, file),
            { overwrite: true }
          );
        }
      }
    }

    state.status = 'idle';
    await saveRetroState(projectRoot, state);
    printSuccess(`[4/4] Cycle ${state.currentCycle} completed`);
  }

  // Bonus: retro → improve 자동 연결
  // GitHub Issue가 생성되었으면 improve fetch+analyze 자동 실행
  try {
    execSync('gh --version', { stdio: 'ignore' });
    console.log(colors.dim('\n  Improvement analysis 자동 실행 중...'));

    try {
      execSync('npx tsq improve fetch --limit 20', {
        cwd: projectRoot,
        stdio: 'ignore',
        timeout: 15000,
      });
      execSync('npx tsq improve analyze', {
        cwd: projectRoot,
        stdio: 'ignore',
        timeout: 15000,
      });
      printSuccess('  Improvement analysis completed');
      console.log(colors.dim('  결과 확인: tsq improve summary'));
    } catch {
      console.log(colors.dim('  Improvement analysis skipped (no issues or error)'));
    }
  } catch {
    // gh not available, skip
  }

  console.log(colors.dim('\nTip: tsq retro status 로 결과 확인'));
}

async function showRetroStatus(): Promise<void> {
  const projectRoot = await findProjectRoot();
  if (!projectRoot) {
    throw new Error('Not a TimSquad project');
  }

  const state = await getRetroState(projectRoot);

  printHeader('Retrospective Status');
  printKeyValue('Current Cycle', String(state.currentCycle));
  printKeyValue('Status', state.status);

  if (state.startedAt) {
    printKeyValue('Started', state.startedAt.split('T')[0]);
  }

  // Count pending feedback
  const feedbackDir = path.join(projectRoot, '.timsquad', 'feedback');
  if (await exists(feedbackDir)) {
    const phaseFiles = await listFiles('phase-*.json', feedbackDir);
    const fbFiles = await listFiles('FB-*.json', feedbackDir);
    console.log('');
    printKeyValue('Pending phase retros', String(phaseFiles.length));
    printKeyValue('Pending feedbacks', String(fbFiles.length));
  }

  // List completed cycles
  const cyclesDir = path.join(projectRoot, '.timsquad', 'retrospective', 'cycles');
  if (await exists(cyclesDir)) {
    const cycles = await listFiles('cycle-*.md', cyclesDir);
    if (cycles.length > 0) {
      console.log(colors.dim(`\nCompleted cycles: ${cycles.length}`));
    }
  }
}

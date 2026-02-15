import { Command } from 'commander';
import path from 'path';
import fs from 'fs-extra';
import { colors, printHeader, printError, printSuccess, printKeyValue } from '../utils/colors.js';
import { findProjectRoot } from '../lib/project.js';
import { exists, readFile, listFiles } from '../utils/fs.js';
import { getDateString, getTimestamp } from '../utils/date.js';
import type { TaskLogEntry, TaskStats } from '../types/index.js';

// ============================================================
// 지표 정의 및 의미
// ============================================================
//
// [프로세스 지표]
// - Log Activity: 에이전트별 로그 기록 빈도. 높을수록 프로세스를 잘 따르고 있음
// - Decision Ratio: 전체 로그 중 결정 기록 비율. 높을수록 의사결정이 투명하게 기록됨
// - Error Rate: 에러 로그 비율. 높으면 프로세스 개선 필요
//
// [피드백 지표]
// - Level 1 (구현 수정): 경미한 수정. 자연스러운 개발 과정
// - Level 2 (설계 수정): SSOT 변경 필요. 빈번하면 초기 설계 품질 점검 필요
// - Level 3 (기획 수정): 기획 단계 재검토 필요. 잦으면 요구사항 정의 프로세스 개선 필요
//
// [SSOT 지표]
// - Completion Rate: SSOT 문서 완성률. 100%에 가까울수록 문서 기반 개발이 잘 됨
//
// [세션 지표]
// - Tool Efficiency: 도구 성공률. 100%에 가까울수록 에이전트가 정확하게 작업 중
// - Cache Hit Rate: 프롬프트 캐시 적중률. 높을수록 토큰 비용 절감
//   - 80%+: 우수 (프롬프트 구조 안정)
//   - 60-80%: 보통 (일부 프롬프트 변경 발생)
//   - <60%: 주의 (프롬프트가 자주 변경되어 캐시 효율 낮음)
// - Avg Output/Turn: 턴당 평균 출력 토큰. 비정상적으로 높으면 불필요한 장황한 응답 의심
// - CLI Adoption: 에이전트의 TSQ CLI 사용 비율. 높을수록 프레임워크 정착도 높음
// ============================================================

interface SessionEvent {
  timestamp: string;
  event: string;
  session: string;
  tool?: string;
  status?: string;
  detail?: Record<string, unknown>;
  usage?: Record<string, number>;
  cumulative?: Record<string, number>;
  total_usage?: Record<string, number>;
}

interface SessionStats {
  totalSessions: number;
  totalEvents: number;
  totalToolUses: number;
  totalFailures: number;
  toolEfficiency: number;       // 도구 성공률 (%). 높을수록 에이전트 정확도 높음
  subagentCount: number;
  tokens: {
    totalInput: number;
    totalOutput: number;
    totalCacheCreate: number;
    totalCacheRead: number;
    cacheHitRate: number;       // 캐시 적중률 (%). 높을수록 비용 효율적
    avgOutputPerTurn: number;   // 턴당 평균 출력 토큰. 비정상 고비용 감지용
    maxOutputPerTurn: number;   // 턴당 최대 출력 토큰. 이상치 감지용
  };
  toolBreakdown: Record<string, number>;
  cliAdoption: {
    totalBashCommands: number;
    tsqCommands: number;
    adoptionRate: number;       // CLI 채택률 (%). 에이전트가 tsq 명령어를 사용하는 비율
  };
}

interface MetricsData {
  collectedAt: string;
  period: {
    start: string;
    end: string;
  };
  logs: {
    total: number;
    byAgent: Record<string, number>;
    byType: Record<string, number>;
    decisionRatio: number;      // 결정 기록 비율 (%). 의사결정 투명도 지표
    errorRate: number;          // 에러 비율 (%). 프로세스 안정성 지표
    tasks?: TaskStats;          // Task JSON 기반 태스크 수준 메트릭 (v3.0+)
  };
  feedback: {
    total: number;
    byLevel: Record<string, number>;
  };
  ssot: {
    documentsCount: number;
    filledCount: number;
    completionRate: number;     // SSOT 완성률 (%). 문서 기반 개발 성숙도
  };
  sessions: SessionStats;
  metaIndex?: {
    totalFiles: number;
    totalMethods: number;
    healthScore: number;
    freshness: number;
    semanticCoverage: number;
    driftedFiles: number;
    alertCount: number;
    uiComponents?: number;
    uiHealthScore?: number;
    uiSemanticCoverage?: number;
    uiAccessibilityCoverage?: number;
  };
}

export function registerMetricsCommand(program: Command): void {
  const metricsCmd = program
    .command('metrics')
    .description('Collect and view project quality metrics');

  // tsq metrics collect
  metricsCmd
    .command('collect')
    .description('Collect metrics from logs and session events')
    .option('-d, --days <days>', 'Days to analyze', '7')
    .action(async (options: { days: string }) => {
      try {
        await collectMetrics(parseInt(options.days, 10));
      } catch (error) {
        printError((error as Error).message);
        process.exit(1);
      }
    });

  // tsq metrics summary
  metricsCmd
    .command('summary')
    .description('Show latest metrics summary with explanations')
    .action(async () => {
      try {
        await showMetricsSummary();
      } catch (error) {
        printError((error as Error).message);
        process.exit(1);
      }
    });

  // tsq metrics trend
  metricsCmd
    .command('trend')
    .description('Compare metrics across collection periods')
    .option('-n <count>', 'Number of periods to compare', '5')
    .action(async (options: { n: string }) => {
      try {
        await showTrend(parseInt(options.n, 10));
      } catch (error) {
        printError((error as Error).message);
        process.exit(1);
      }
    });

  // tsq metrics export
  metricsCmd
    .command('export')
    .description('Export metrics to JSON')
    .option('-o, --output <file>', 'Output file path')
    .action(async (options: { output?: string }) => {
      try {
        await exportMetrics(options.output);
      } catch (error) {
        printError((error as Error).message);
        process.exit(1);
      }
    });
}

// ============================================================
// Collect
// ============================================================

async function collectMetrics(days: number): Promise<void> {
  const projectRoot = await findProjectRoot();
  if (!projectRoot) {
    throw new Error('Not a TimSquad project');
  }

  printHeader('Collecting Metrics');
  printKeyValue('Period', `Last ${days} days`);

  const now = new Date();
  const startDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

  // Collect all data sources in parallel
  const logsDir = path.join(projectRoot, '.timsquad', 'logs');
  const ssotDir = path.join(projectRoot, '.timsquad', 'ssot');
  const sessionsDir = path.join(projectRoot, '.timsquad', 'logs', 'sessions');

  const [logStats, feedbackStats, ssotStats, sessionStats, metaIndexStats] = await Promise.all([
    collectLogStats(logsDir, startDate),
    collectFeedbackStats(logsDir, startDate),
    collectSSOTStats(ssotDir),
    collectSessionStats(sessionsDir, startDate),
    collectMetaIndexStats(projectRoot),
  ]);

  const metrics: MetricsData = {
    collectedAt: getTimestamp(),
    period: {
      start: startDate.toISOString().split('T')[0],
      end: now.toISOString().split('T')[0],
    },
    logs: logStats,
    feedback: feedbackStats,
    ssot: ssotStats,
    sessions: sessionStats,
    ...(metaIndexStats ? { metaIndex: metaIndexStats } : {}),
  };

  // Save metrics
  const metricsDir = path.join(projectRoot, '.timsquad', 'retrospective', 'metrics');
  await fs.ensureDir(metricsDir);

  const metricsFile = path.join(metricsDir, `metrics-${getDateString()}.json`);
  await fs.writeJson(metricsFile, metrics, { spaces: 2 });

  printSuccess('Metrics collected');
  console.log(colors.path(`\nSaved to: ${metricsFile}`));

  console.log('');
  await displayMetrics(metrics);
}

// ============================================================
// Log Statistics
// ============================================================

async function collectLogStats(
  logsDir: string,
  startDate: Date
): Promise<MetricsData['logs']> {
  const stats: MetricsData['logs'] = {
    total: 0,
    byAgent: {},
    byType: {},
    decisionRatio: 0,
    errorRate: 0,
  };

  if (!await exists(logsDir)) return stats;

  const startDateStr = startDate.toISOString().split('T')[0];

  // ── Phase 1: Task JSON 수집 (primary) ──
  const tasksDir = path.join(logsDir, 'tasks');

  if (await exists(tasksDir)) {
    const taskFiles = await listFiles('*.json', tasksDir);
    const taskEntries: TaskLogEntry[] = [];

    for (const file of taskFiles) {
      try {
        const data: TaskLogEntry = await fs.readJson(path.join(tasksDir, file));

        // completed_at 기반 날짜 필터
        if (data.completed_at) {
          const taskDate = data.completed_at.split('T')[0];
          if (taskDate < startDateStr) continue;
        }

        taskEntries.push(data);
      } catch {
        // 파싱 불가 파일 무시
      }
    }

    if (taskEntries.length > 0) {
      const taskStats: TaskStats = {
        total: taskEntries.length,
        completed: 0,
        failed: 0,
        successRate: 0,
        byAgent: {},
        totalFilesChanged: 0,
        avgFilesPerTask: 0,
        fileActions: {},
        withErrors: 0,
        errorTypes: {},
        withSemantic: 0,
        semanticCoverage: 0,
      };

      for (const task of taskEntries) {
        const isSuccess = task.status === 'completed' || task.status === 'success';

        if (isSuccess) {
          taskStats.completed++;
        } else {
          taskStats.failed++;
        }

        // 에이전트별 카운트
        const agent = task.agent || 'unknown';
        if (!taskStats.byAgent[agent]) {
          taskStats.byAgent[agent] = { total: 0, completed: 0, failed: 0 };
        }
        taskStats.byAgent[agent].total++;
        if (isSuccess) {
          taskStats.byAgent[agent].completed++;
        } else {
          taskStats.byAgent[agent].failed++;
        }

        // 기존 byAgent에도 반영
        stats.byAgent[agent] = (stats.byAgent[agent] || 0) + 1;

        // 파일 변경 집계
        const files = task.mechanical?.files || [];
        taskStats.totalFilesChanged += files.length;
        for (const f of files) {
          const action = f.action || 'U';
          taskStats.fileActions[action] = (taskStats.fileActions[action] || 0) + 1;
        }

        // 에러 집계
        if (task.error) {
          taskStats.withErrors++;
          const errorType = task.error.type || 'unknown';
          taskStats.errorTypes[errorType] = (taskStats.errorTypes[errorType] || 0) + 1;
        }

        // semantic 채움 여부
        const sem = task.semantic || {};
        const hasSemantic = !!(
          sem.summary ||
          (sem.decisions && sem.decisions.length > 0) ||
          (sem.issues && sem.issues.length > 0) ||
          (sem.techniques && sem.techniques.length > 0)
        );
        if (hasSemantic) {
          taskStats.withSemantic++;
        }
      }

      // 파생 지표
      taskStats.successRate = taskStats.total > 0
        ? Math.round((taskStats.completed / taskStats.total) * 100) : 0;
      taskStats.avgFilesPerTask = taskStats.total > 0
        ? Math.round((taskStats.totalFilesChanged / taskStats.total) * 10) / 10 : 0;
      taskStats.semanticCoverage = taskStats.total > 0
        ? Math.round((taskStats.withSemantic / taskStats.total) * 100) : 0;

      stats.tasks = taskStats;
      stats.total += taskEntries.length;
    }
  }

  // ── Phase 2: 마크다운 폴백 (기존 로직 유지) ──
  const mdFiles = await listFiles('*.md', logsDir);

  for (const file of mdFiles) {
    if (file.startsWith('_')) continue;

    const match = file.match(/^(\d{4}-\d{2}-\d{2})-([a-z]+)\.md$/);
    if (!match) continue;

    const [, dateStr, agent] = match;
    if (dateStr < startDateStr) continue;

    stats.total++;
    stats.byAgent[agent] = (stats.byAgent[agent] || 0) + 1;

    try {
      const content = await readFile(path.join(logsDir, file));
      // log.sh 형식: ## [HH:MM:SS] type
      const workEntries = (content.match(/## \[[\d:]+\] work/g) || []).length;
      const errorEntries = (content.match(/## \[[\d:]+\] error/g) || []).length;
      const decisionEntries = (content.match(/## \[[\d:]+\] decision/g) || []).length;

      stats.byType['work'] = (stats.byType['work'] || 0) + workEntries;
      stats.byType['error'] = (stats.byType['error'] || 0) + errorEntries;
      stats.byType['decision'] = (stats.byType['decision'] || 0) + decisionEntries;
    } catch {
      // Ignore read errors
    }
  }

  // 파생 지표 계산 (마크다운 기반)
  const totalEntries = Object.values(stats.byType).reduce((a, b) => a + b, 0);
  if (totalEntries > 0) {
    stats.decisionRatio = Math.round(((stats.byType['decision'] || 0) / totalEntries) * 100);
    stats.errorRate = Math.round(((stats.byType['error'] || 0) / totalEntries) * 100);
  }

  return stats;
}

// ============================================================
// Feedback Statistics
// ============================================================

async function collectFeedbackStats(
  logsDir: string,
  startDate: Date
): Promise<MetricsData['feedback']> {
  const stats: MetricsData['feedback'] = { total: 0, byLevel: {} };

  // Structured JSON feedback (우선)
  const projectRoot = path.dirname(logsDir.replace(/\/.timsquad\/logs$/, ''));
  const structuredDir = path.join(projectRoot, '.timsquad', 'feedback');

  if (await exists(structuredDir)) {
    const jsonFiles = await listFiles('FB-*.json', structuredDir);
    for (const file of jsonFiles) {
      try {
        const data = await fs.readJson(path.join(structuredDir, file));
        if (data.level) {
          const level = String(data.level);
          stats.byLevel[level] = (stats.byLevel[level] || 0) + 1;
          stats.total++;
        }
      } catch {
        // skip
      }
    }
  }

  // Fallback: markdown feedback logs
  if (stats.total === 0 && await exists(logsDir)) {
    const startDateStr = startDate.toISOString().split('T')[0];
    const files = await listFiles('*-feedback.md', logsDir);

    for (const file of files) {
      const match = file.match(/^(\d{4}-\d{2}-\d{2})-feedback\.md$/);
      if (!match) continue;

      const [, dateStr] = match;
      if (dateStr < startDateStr) continue;

      try {
        const content = await readFile(path.join(logsDir, file));

        const level1 = (content.match(/\[Level 1\]/g) || []).length;
        const level2 = (content.match(/\[Level 2\]/g) || []).length;
        const level3 = (content.match(/\[Level 3\]/g) || []).length;

        stats.byLevel['1'] = (stats.byLevel['1'] || 0) + level1;
        stats.byLevel['2'] = (stats.byLevel['2'] || 0) + level2;
        stats.byLevel['3'] = (stats.byLevel['3'] || 0) + level3;
        stats.total += level1 + level2 + level3;
      } catch {
        // skip
      }
    }
  }

  return stats;
}

// ============================================================
// SSOT Statistics
// ============================================================

async function collectSSOTStats(ssotDir: string): Promise<MetricsData['ssot']> {
  const stats: MetricsData['ssot'] = {
    documentsCount: 0,
    filledCount: 0,
    completionRate: 0,
  };

  if (!await exists(ssotDir)) return stats;

  const files = await listFiles('*.md', ssotDir);

  for (const file of files) {
    if (file.includes('template')) continue;

    stats.documentsCount++;

    try {
      const content = await readFile(path.join(ssotDir, file));
      const cleanContent = content
        .replace(/^#.*$/gm, '')
        .replace(/^\s*$/gm, '')
        .trim();

      if (cleanContent.length > 200) {
        stats.filledCount++;
      }
    } catch {
      // skip
    }
  }

  stats.completionRate = stats.documentsCount > 0
    ? Math.round((stats.filledCount / stats.documentsCount) * 100)
    : 0;

  return stats;
}

// ============================================================
// Meta Index Statistics
// ============================================================

async function collectMetaIndexStats(
  projectRoot: string
): Promise<MetricsData['metaIndex'] | undefined> {
  const summaryPath = path.join(projectRoot, '.timsquad', 'state', 'meta-index', 'summary.json');
  if (!await exists(summaryPath)) return undefined;

  try {
    const summary = await fs.readJson(summaryPath);
    const result: MetricsData['metaIndex'] = {
      totalFiles: summary.totalFiles || 0,
      totalMethods: summary.totalMethods || 0,
      healthScore: summary.health?.overall || 0,
      freshness: summary.health?.freshness || 0,
      semanticCoverage: summary.health?.semanticCoverage || 0,
      driftedFiles: summary.alerts?.driftDetected?.length || 0,
      alertCount: (summary.alerts?.oversizedFiles?.length || 0) +
                  (summary.alerts?.missingSemantics?.length || 0) +
                  (summary.alerts?.driftDetected?.length || 0),
    };

    // UI Health (있을 때만)
    if (summary.uiHealth) {
      result.uiComponents = summary.uiHealth.componentCount || 0;
      result.uiHealthScore = summary.uiHealth.overall || 0;
      result.uiSemanticCoverage = summary.uiHealth.semanticCoverage || 0;
      result.uiAccessibilityCoverage = summary.uiHealth.accessibilityCoverage || 0;
    }

    return result;
  } catch {
    return undefined;
  }
}

// ============================================================
// Session Statistics (세션 이벤트 기반 품질 지표)
// ============================================================

async function collectSessionStats(
  sessionsDir: string,
  startDate: Date
): Promise<SessionStats> {
  const stats: SessionStats = {
    totalSessions: 0,
    totalEvents: 0,
    totalToolUses: 0,
    totalFailures: 0,
    toolEfficiency: 0,
    subagentCount: 0,
    tokens: {
      totalInput: 0,
      totalOutput: 0,
      totalCacheCreate: 0,
      totalCacheRead: 0,
      cacheHitRate: 0,
      avgOutputPerTurn: 0,
      maxOutputPerTurn: 0,
    },
    toolBreakdown: {},
    cliAdoption: {
      totalBashCommands: 0,
      tsqCommands: 0,
      adoptionRate: 0,
    },
  };

  if (!await exists(sessionsDir)) return stats;

  const files = await listFiles('*.jsonl', sessionsDir);
  const startDateStr = startDate.toISOString().split('T')[0];
  const allTurnOutputs: number[] = [];

  for (const file of files) {
    // 날짜 필터
    const dateStr = file.split('-').slice(0, 3).join('-');
    if (dateStr < startDateStr) continue;

    stats.totalSessions++;

    try {
      const content = await readFile(path.join(sessionsDir, file));
      const events: SessionEvent[] = [];

      for (const line of content.split('\n')) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        try { events.push(JSON.parse(trimmed)); } catch { /* skip */ }
      }

      stats.totalEvents += events.length;

      for (const ev of events) {
        // 도구 사용 통계
        if (ev.event === 'PostToolUse') {
          stats.totalToolUses++;
          if (ev.tool) {
            stats.toolBreakdown[ev.tool] = (stats.toolBreakdown[ev.tool] || 0) + 1;
          }

          // CLI 채택률: Bash 명령 중 tsq 사용 비율
          if (ev.tool === 'Bash') {
            stats.cliAdoption.totalBashCommands++;
            const cmd = (ev.detail?.command as string) || '';
            if (cmd.match(/^(tsq|npx tsq)\s/)) {
              stats.cliAdoption.tsqCommands++;
            }
          }
        }

        if (ev.event === 'PostToolUseFailure') stats.totalFailures++;
        if (ev.event === 'SubagentStart') stats.subagentCount++;

        // 토큰 (Stop 이벤트에서 턴별 수집)
        if (ev.event === 'Stop' && ev.usage) {
          allTurnOutputs.push(ev.usage.output || 0);
        }

        // 토큰 (SessionEnd에서 세션 합산)
        if (ev.event === 'SessionEnd' && ev.total_usage) {
          stats.tokens.totalInput += ev.total_usage.total_input || 0;
          stats.tokens.totalOutput += ev.total_usage.total_output || 0;
          stats.tokens.totalCacheCreate += ev.total_usage.total_cache_create || 0;
          stats.tokens.totalCacheRead += ev.total_usage.total_cache_read || 0;
        }
      }
    } catch {
      // skip unreadable files
    }
  }

  // 파생 지표 계산
  const totalToolAttempts = stats.totalToolUses + stats.totalFailures;
  stats.toolEfficiency = totalToolAttempts > 0
    ? Math.round((stats.totalToolUses / totalToolAttempts) * 100) : 0;

  const allInput = stats.tokens.totalInput + stats.tokens.totalCacheCreate + stats.tokens.totalCacheRead;
  stats.tokens.cacheHitRate = allInput > 0
    ? Math.round((stats.tokens.totalCacheRead / allInput) * 100) : 0;

  if (allTurnOutputs.length > 0) {
    stats.tokens.avgOutputPerTurn = Math.round(
      allTurnOutputs.reduce((a, b) => a + b, 0) / allTurnOutputs.length
    );
    stats.tokens.maxOutputPerTurn = Math.max(...allTurnOutputs);
  }

  stats.cliAdoption.adoptionRate = stats.cliAdoption.totalBashCommands > 0
    ? Math.round((stats.cliAdoption.tsqCommands / stats.cliAdoption.totalBashCommands) * 100) : 0;

  return stats;
}

// ============================================================
// Display
// ============================================================

async function displayMetrics(metrics: MetricsData): Promise<void> {
  printKeyValue('Collected at', metrics.collectedAt);
  printKeyValue('Period', `${metrics.period.start} ~ ${metrics.period.end}`);

  // ── 프로세스 지표 ──
  console.log(colors.subheader('\n  Process Metrics'));
  console.log(colors.dim('  에이전트 작업 기록 현황. 프로세스 준수도를 나타냄\n'));

  printKeyValue('  Log files', String(metrics.logs.total));

  if (Object.keys(metrics.logs.byAgent).length > 0) {
    console.log(colors.dim('  By Agent:'));
    Object.entries(metrics.logs.byAgent)
      .sort((a, b) => b[1] - a[1])
      .forEach(([agent, count]) => {
        console.log(`    ${agent.padEnd(12)} ${colors.highlight(String(count))}`);
      });
  }

  if (Object.keys(metrics.logs.byType).length > 0) {
    console.log(colors.dim('  By Type:'));
    Object.entries(metrics.logs.byType)
      .sort((a, b) => b[1] - a[1])
      .forEach(([type, count]) => {
        console.log(`    ${type.padEnd(12)} ${colors.highlight(String(count))}`);
      });
  }

  printKeyValue('  Decision Ratio', `${metrics.logs.decisionRatio}%`);
  console.log(colors.dim('    의사결정 기록 비율. 높을수록 결정 추적 가능'));
  printKeyValue('  Error Rate', `${metrics.logs.errorRate}%`);
  console.log(colors.dim('    에러 로그 비율. 낮을수록 안정적'));

  // ── 태스크 지표 ──
  if (metrics.logs.tasks && metrics.logs.tasks.total > 0) {
    const t = metrics.logs.tasks;
    console.log(colors.subheader('\n  Task Metrics'));
    console.log(colors.dim('  서브에이전트 태스크 실행 결과. 작업 품질과 효율성 추적\n'));

    printKeyValue('  Total tasks', String(t.total));
    printKeyValue('  Completed', `${t.completed} (${t.successRate}%)`);
    if (t.failed > 0) {
      printKeyValue('  Failed', String(t.failed));
    }

    if (Object.keys(t.byAgent).length > 0) {
      console.log(colors.dim('  By Agent:'));
      Object.entries(t.byAgent)
        .sort(([, a], [, b]) => b.total - a.total)
        .forEach(([agent, data]) => {
          const rate = data.total > 0 ? Math.round((data.completed / data.total) * 100) : 0;
          console.log(`    ${agent.padEnd(12)} ${colors.highlight(String(data.total))} tasks, ${rate}% success`);
        });
    }

    printKeyValue('  Files changed', String(t.totalFilesChanged));
    printKeyValue('  Avg files/task', String(t.avgFilesPerTask));

    if (Object.keys(t.fileActions).length > 0) {
      const actionLabels: Record<string, string> = { 'A': 'Added', 'M': 'Modified', 'D': 'Deleted', 'R': 'Renamed' };
      console.log(colors.dim('  File actions:'));
      Object.entries(t.fileActions)
        .sort(([, a], [, b]) => b - a)
        .forEach(([action, count]) => {
          const label = actionLabels[action] || action;
          console.log(`    ${(action + '(' + label + ')').padEnd(16)} ${colors.highlight(String(count))}`);
        });
    }

    printKeyValue('  Semantic coverage', `${t.semanticCoverage}%`);
    console.log(colors.dim('    semantic 필드 채움 비율. PM이 에이전트 리턴에서 병합'));

    if (t.withErrors > 0) {
      printKeyValue('  Tasks with errors', String(t.withErrors));
      if (Object.keys(t.errorTypes).length > 0) {
        console.log(colors.dim('  Error types:'));
        Object.entries(t.errorTypes)
          .sort(([, a], [, b]) => b - a)
          .forEach(([type, count]) => {
            console.log(`    ${type.padEnd(20)} ${colors.highlight(String(count))}`);
          });
      }
    }
  }

  // ── 피드백 지표 ──
  console.log(colors.subheader('\n  Feedback Metrics'));
  console.log(colors.dim('  피드백 레벨별 분포. Level 3이 잦으면 요구사항 정의 개선 필요\n'));

  printKeyValue('  Total feedback', String(metrics.feedback.total));

  if (Object.keys(metrics.feedback.byLevel).length > 0) {
    const levelDesc: Record<string, string> = {
      '1': '구현 수정 - 경미한 코드 수정 (정상적 개발 과정)',
      '2': '설계 수정 - SSOT 변경 필요 (빈번하면 초기 설계 검토)',
      '3': '기획 수정 - 요구사항 재검토 (잦으면 기획 프로세스 개선)',
    };

    ['1', '2', '3'].forEach(level => {
      const count = metrics.feedback.byLevel[level] || 0;
      const bar = count > 0 ? ' ' + '█'.repeat(Math.min(count, 20)) : '';
      console.log(`    Level ${level}  ${colors.highlight(String(count).padStart(3))}${colors.dim(bar)}`);
      console.log(colors.dim(`           ${levelDesc[level]}`));
    });
  }

  // ── SSOT 지표 ──
  console.log(colors.subheader('\n  SSOT Health'));
  console.log(colors.dim('  문서 기반 개발 성숙도. 100%에 가까울수록 SSOT 운영 양호\n'));

  printKeyValue('  Documents', `${metrics.ssot.filledCount}/${metrics.ssot.documentsCount}`);
  printKeyValue('  Completion', `${metrics.ssot.completionRate}%`);
  if (metrics.ssot.completionRate < 50) {
    console.log(colors.dim('    SSOT 완성률이 낮음. 문서 작성을 우선 진행하세요'));
  }

  // ── Meta Index 지표 ──
  if (metrics.metaIndex) {
    const mi = metrics.metaIndex;
    console.log(colors.subheader('\n  Meta Index Health'));
    console.log(colors.dim('  코드 구조 인덱스 건강도. AST 기반 자동 생성\n'));

    printKeyValue('  Files indexed', String(mi.totalFiles));
    printKeyValue('  Methods', String(mi.totalMethods));
    printKeyValue('  Health Score', `${mi.healthScore}%`);
    printKeyValue('  Freshness', `${mi.freshness}%`);
    console.log(colors.dim('    인덱스가 최신인 파일 비율'));
    printKeyValue('  Semantic Coverage', `${mi.semanticCoverage}%`);
    console.log(colors.dim('    semantic 데이터가 있는 파일 비율'));
    if (mi.driftedFiles > 0) {
      printKeyValue('  Drifted files', `${mi.driftedFiles}`);
      console.log(colors.dim('    파이프라인 외부에서 변경된 파일. `tsq mi check`로 상세 확인'));
    }
    if (mi.alertCount > 0) {
      printKeyValue('  Alerts', String(mi.alertCount));
    }

    // UI Components (있을 때만)
    if (mi.uiComponents && mi.uiComponents > 0) {
      console.log('');
      printKeyValue('  UI Components', String(mi.uiComponents));
      printKeyValue('  UI Health Score', `${mi.uiHealthScore || 0}%`);
      printKeyValue('  UI Semantic', `${mi.uiSemanticCoverage || 0}%`);
      console.log(colors.dim('    디자인 의도가 기록된 컴포넌트 비율'));
      printKeyValue('  Accessibility', `${mi.uiAccessibilityCoverage || 0}%`);
      console.log(colors.dim('    접근성 메타가 있는 컴포넌트 비율'));
    }
  }

  // ── 세션 지표 ──
  const s = metrics.sessions;
  console.log(colors.subheader('\n  Session & Token Metrics'));
  console.log(colors.dim('  Claude Code 세션 활동. 토큰 효율과 에이전트 정확도 추적\n'));

  printKeyValue('  Sessions', String(s.totalSessions));
  printKeyValue('  Total events', String(s.totalEvents));
  printKeyValue('  Tool uses', String(s.totalToolUses));
  printKeyValue('  Failures', String(s.totalFailures));

  printKeyValue('  Tool Efficiency', `${s.toolEfficiency}%`);
  console.log(colors.dim('    도구 성공률. 95%+ 정상, 90% 미만이면 에이전트 프롬프트 점검'));

  if (s.subagentCount > 0) {
    printKeyValue('  Subagents', String(s.subagentCount));
  }

  // 토큰
  if (s.tokens.totalOutput > 0) {
    console.log('');
    console.log(colors.dim('  Token Usage:'));
    printKeyValue('    Input', formatTokens(s.tokens.totalInput));
    printKeyValue('    Output', formatTokens(s.tokens.totalOutput));
    printKeyValue('    Cache Create', formatTokens(s.tokens.totalCacheCreate));
    printKeyValue('    Cache Read', formatTokens(s.tokens.totalCacheRead));

    printKeyValue('    Cache Hit Rate', `${s.tokens.cacheHitRate}%`);
    if (s.tokens.cacheHitRate >= 80) {
      console.log(colors.dim('      우수 - 프롬프트 구조 안정, 캐시 효율 높음'));
    } else if (s.tokens.cacheHitRate >= 60) {
      console.log(colors.dim('      보통 - 일부 프롬프트 변경으로 캐시 미스 발생'));
    } else {
      console.log(colors.dim('      주의 - 프롬프트 구조 불안정, 캐시 효율 낮음. CLAUDE.md 검토 필요'));
    }

    printKeyValue('    Avg Output/Turn', formatTokens(s.tokens.avgOutputPerTurn));
    console.log(colors.dim('      턴당 평균 출력 토큰. 비정상적으로 높으면 응답이 불필요하게 장황'));
    printKeyValue('    Max Output/Turn', formatTokens(s.tokens.maxOutputPerTurn));
    console.log(colors.dim('      최대 출력 토큰. 이상치 턴 감지용'));
  }

  // 도구 분포
  if (Object.keys(s.toolBreakdown).length > 0) {
    console.log('');
    console.log(colors.dim('  Tool Breakdown:'));
    const sorted = Object.entries(s.toolBreakdown).sort(([, a], [, b]) => b - a);
    for (const [tool, count] of sorted.slice(0, 8)) {
      const bar = '█'.repeat(Math.min(Math.round(count / Math.max(1, sorted[0][1]) * 20), 20));
      console.log(`    ${colors.primary(tool.padEnd(12))} ${colors.dim(bar)} ${count}`);
    }
  }

  // CLI 채택률
  if (s.cliAdoption.totalBashCommands > 0) {
    console.log('');
    printKeyValue('  CLI Adoption', `${s.cliAdoption.adoptionRate}% (${s.cliAdoption.tsqCommands}/${s.cliAdoption.totalBashCommands} Bash commands)`);
    console.log(colors.dim('    Bash 명령 중 tsq CLI 사용 비율. 높을수록 프레임워크 정착도 높음'));
  }
}

// ============================================================
// Trend (시계열 비교)
// ============================================================

async function showTrend(count: number): Promise<void> {
  const projectRoot = await findProjectRoot();
  if (!projectRoot) throw new Error('Not a TimSquad project');

  const metricsDir = path.join(projectRoot, '.timsquad', 'retrospective', 'metrics');

  if (!await exists(metricsDir)) {
    console.log(colors.dim('No metrics collected yet. Run: tsq metrics collect'));
    return;
  }

  const files = await listFiles('metrics-*.json', metricsDir);
  files.sort().reverse();

  if (files.length < 2) {
    console.log(colors.dim('Need at least 2 collection periods for trend analysis.'));
    console.log(colors.dim('Run: tsq metrics collect --days 7'));
    return;
  }

  printHeader('Metrics Trend');
  console.log(colors.dim('  핵심 지표의 시계열 변화. 우측이 최신.\n'));

  const periods: MetricsData[] = [];
  for (const file of files.slice(0, count).reverse()) {
    const data: MetricsData = await fs.readJson(path.join(metricsDir, file));
    periods.push(data);
  }

  // 헤더
  const dates = periods.map(p => p.period.end.slice(5)); // MM-DD
  console.log(`  ${'Metric'.padEnd(22)} ${dates.map(d => d.padStart(8)).join('')}`);
  console.log(colors.dim(`  ${'─'.repeat(22 + dates.length * 8)}`));

  // SSOT Completion
  const ssotValues = periods.map(p => `${p.ssot.completionRate}%`);
  console.log(`  ${'SSOT Completion'.padEnd(22)} ${ssotValues.map(v => v.padStart(8)).join('')}`);

  // Feedback Total
  const fbValues = periods.map(p => String(p.feedback.total));
  console.log(`  ${'Feedback Count'.padEnd(22)} ${fbValues.map(v => v.padStart(8)).join('')}`);

  // Decision Ratio
  const drValues = periods.map(p => `${p.logs.decisionRatio || 0}%`);
  console.log(`  ${'Decision Ratio'.padEnd(22)} ${drValues.map(v => v.padStart(8)).join('')}`);

  // Error Rate
  const erValues = periods.map(p => `${p.logs.errorRate || 0}%`);
  console.log(`  ${'Error Rate'.padEnd(22)} ${erValues.map(v => v.padStart(8)).join('')}`);

  // Task metrics (if available)
  if (periods.some(p => p.logs.tasks && p.logs.tasks.total > 0)) {
    console.log('');

    const tsrValues = periods.map(p =>
      p.logs.tasks ? `${p.logs.tasks.successRate}%` : '-'
    );
    console.log(`  ${'Task Success Rate'.padEnd(22)} ${tsrValues.map(v => v.padStart(8)).join('')}`);

    const tscValues = periods.map(p =>
      p.logs.tasks ? String(p.logs.tasks.total) : '-'
    );
    console.log(`  ${'Task Count'.padEnd(22)} ${tscValues.map(v => v.padStart(8)).join('')}`);

    const semValues = periods.map(p =>
      p.logs.tasks ? `${p.logs.tasks.semanticCoverage}%` : '-'
    );
    console.log(`  ${'Semantic Coverage'.padEnd(22)} ${semValues.map(v => v.padStart(8)).join('')}`);
  }

  // Meta Index metrics (if available)
  if (periods.some(p => p.metaIndex)) {
    console.log('');

    const mhValues = periods.map(p =>
      p.metaIndex ? `${p.metaIndex.healthScore}%` : '-'
    );
    console.log(`  ${'Meta Health'.padEnd(22)} ${mhValues.map(v => v.padStart(8)).join('')}`);

    // UI Health trend (있을 때만)
    if (periods.some(p => p.metaIndex?.uiComponents && p.metaIndex.uiComponents > 0)) {
      const uhValues = periods.map(p =>
        p.metaIndex?.uiHealthScore ? `${p.metaIndex.uiHealthScore}%` : '-'
      );
      console.log(`  ${'UI Health'.padEnd(22)} ${uhValues.map(v => v.padStart(8)).join('')}`);
    }
  }

  // Session metrics (if available)
  if (periods.some(p => p.sessions?.totalSessions > 0)) {
    console.log('');

    const teValues = periods.map(p => `${p.sessions?.toolEfficiency || 0}%`);
    console.log(`  ${'Tool Efficiency'.padEnd(22)} ${teValues.map(v => v.padStart(8)).join('')}`);

    const chValues = periods.map(p => `${p.sessions?.tokens.cacheHitRate || 0}%`);
    console.log(`  ${'Cache Hit Rate'.padEnd(22)} ${chValues.map(v => v.padStart(8)).join('')}`);

    const aoValues = periods.map(p => formatTokens(p.sessions?.tokens.avgOutputPerTurn || 0));
    console.log(`  ${'Avg Output/Turn'.padEnd(22)} ${aoValues.map(v => v.padStart(8)).join('')}`);

    const caValues = periods.map(p => `${p.sessions?.cliAdoption.adoptionRate || 0}%`);
    console.log(`  ${'CLI Adoption'.padEnd(22)} ${caValues.map(v => v.padStart(8)).join('')}`);
  }

  // 변화 분석
  if (periods.length >= 2) {
    const prev = periods[periods.length - 2];
    const curr = periods[periods.length - 1];

    console.log(colors.subheader('\n  Changes (latest vs previous):'));

    const changes: string[] = [];

    const ssotDelta = curr.ssot.completionRate - prev.ssot.completionRate;
    if (ssotDelta !== 0) {
      changes.push(`  SSOT Completion: ${ssotDelta > 0 ? colors.success(`+${ssotDelta}%`) : colors.error(`${ssotDelta}%`)}`);
    }

    if (curr.logs.tasks && prev.logs.tasks) {
      const taskDelta = curr.logs.tasks.successRate - prev.logs.tasks.successRate;
      if (taskDelta !== 0) {
        changes.push(`  Task Success:    ${taskDelta > 0 ? colors.success(`+${taskDelta}%`) : colors.error(`${taskDelta}%`)}`);
      }
    }

    if (curr.metaIndex && prev.metaIndex) {
      const metaDelta = curr.metaIndex.healthScore - prev.metaIndex.healthScore;
      if (metaDelta !== 0) {
        changes.push(`  Meta Health:     ${metaDelta > 0 ? colors.success(`+${metaDelta}%`) : colors.error(`${metaDelta}%`)}`);
      }
    }

    if (curr.sessions && prev.sessions) {
      const cacheDelta = curr.sessions.tokens.cacheHitRate - prev.sessions.tokens.cacheHitRate;
      if (cacheDelta !== 0) {
        changes.push(`  Cache Hit Rate:  ${cacheDelta > 0 ? colors.success(`+${cacheDelta}%`) : colors.error(`${cacheDelta}%`)}`);
      }

      const effDelta = curr.sessions.toolEfficiency - prev.sessions.toolEfficiency;
      if (effDelta !== 0) {
        changes.push(`  Tool Efficiency: ${effDelta > 0 ? colors.success(`+${effDelta}%`) : colors.error(`${effDelta}%`)}`);
      }
    }

    if (changes.length > 0) {
      changes.forEach(c => console.log(c));
    } else {
      console.log(colors.dim('  No significant changes detected.'));
    }
  }
}

// ============================================================
// Summary
// ============================================================

async function showMetricsSummary(): Promise<void> {
  const projectRoot = await findProjectRoot();
  if (!projectRoot) throw new Error('Not a TimSquad project');

  printHeader('Metrics Summary');

  const metricsDir = path.join(projectRoot, '.timsquad', 'retrospective', 'metrics');

  if (!await exists(metricsDir)) {
    console.log(colors.dim('No metrics collected yet'));
    console.log(colors.dim('\nRun: tsq metrics collect'));
    return;
  }

  const files = await listFiles('metrics-*.json', metricsDir);
  files.sort().reverse();

  if (files.length === 0) {
    console.log(colors.dim('No metrics collected yet'));
    console.log(colors.dim('\nRun: tsq metrics collect'));
    return;
  }

  const latestFile = path.join(metricsDir, files[0]);
  const metrics: MetricsData = await fs.readJson(latestFile);

  await displayMetrics(metrics);
}

// ============================================================
// Export
// ============================================================

async function exportMetrics(outputPath?: string): Promise<void> {
  const projectRoot = await findProjectRoot();
  if (!projectRoot) throw new Error('Not a TimSquad project');

  const metricsDir = path.join(projectRoot, '.timsquad', 'retrospective', 'metrics');

  if (!await exists(metricsDir)) {
    throw new Error('No metrics collected yet. Run: tsq metrics collect');
  }

  const files = await listFiles('metrics-*.json', metricsDir);
  if (files.length === 0) {
    throw new Error('No metrics collected yet. Run: tsq metrics collect');
  }

  const allMetrics: MetricsData[] = [];
  for (const file of files.sort()) {
    const data = await fs.readJson(path.join(metricsDir, file));
    allMetrics.push(data);
  }

  const output = outputPath || path.join(projectRoot, `timsquad-metrics-export-${getDateString()}.json`);

  const exportData = {
    exportedAt: getTimestamp(),
    projectRoot,
    metricsCount: allMetrics.length,
    metrics: allMetrics,
  };

  await fs.writeJson(output, exportData, { spaces: 2 });

  printSuccess('Metrics exported');
  console.log(colors.path(`\n${output}`));
}

// ============================================================
// Helpers
// ============================================================

function formatTokens(tokens: number): string {
  if (tokens < 1000) return String(tokens);
  if (tokens < 1000000) return `${(tokens / 1000).toFixed(1)}K`;
  return `${(tokens / 1000000).toFixed(2)}M`;
}

import { Command } from 'commander';
import path from 'path';
import {
  colors,
  printHeader,
  printError,
  printSuccess,
  printWarning,
  printInfo,
  printStep,
} from '../utils/colors.js';
import { findProjectRoot } from '../lib/project.js';
import { exists } from '../utils/fs.js';
import {
  compileAll,
  checkStale,
  validateDependencyGraph,
  type CompileResult,
} from '../lib/compiler.js';

export function registerCompileCommand(program: Command): void {
  const compileCmd = program
    .command('compile')
    .description('Compile SSOT documents into agent-facing specs (Context DI)');

  compileCmd
    .command('build')
    .description('Compile all SSOT documents into controller specs')
    .alias('b')
    .action(async () => {
      try {
        await runCompile();
      } catch (err) {
        printError(err instanceof Error ? err.message : String(err));
        process.exit(1);
      }
    });

  compileCmd
    .command('validate')
    .description('Validate SSOT completeness and dependency graph')
    .alias('v')
    .action(async () => {
      try {
        await runValidate();
      } catch (err) {
        printError(err instanceof Error ? err.message : String(err));
        process.exit(1);
      }
    });

  compileCmd
    .command('e2e')
    .description('Show E2E test mappings from compiled specs')
    .option('--task <source>', 'Filter by SSOT source name')
    .action(async (options: { task?: string }) => {
      try {
        await runE2eMapping(options.task);
      } catch (err) {
        printError(err instanceof Error ? err.message : String(err));
        process.exit(1);
      }
    });

  compileCmd
    .command('status')
    .description('Check for stale specs (SSOT changed since last compile)')
    .alias('s')
    .action(async () => {
      try {
        await runStatus();
      } catch (err) {
        printError(err instanceof Error ? err.message : String(err));
        process.exit(1);
      }
    });

  // Default action (no subcommand) → build
  compileCmd.action(async () => {
    try {
      await runCompile();
    } catch (err) {
      printError(err instanceof Error ? err.message : String(err));
      process.exit(1);
    }
  });
}

async function resolveProject(): Promise<{ projectRoot: string; controllerDir: string }> {
  const projectRoot = await findProjectRoot();
  if (!projectRoot) {
    throw new Error('TimSquad 프로젝트를 찾을 수 없습니다. tsq init을 먼저 실행하세요.');
  }

  const controllerDir = path.join(projectRoot, '.claude', 'skills', 'controller');
  return { projectRoot, controllerDir };
}

// ─── tsq compile (build) ─────────────────────────────────────────

async function runCompile(): Promise<void> {
  printHeader('SSOT Compile');

  const { projectRoot, controllerDir } = await resolveProject();

  // Verify SSOT directory exists
  const ssotDir = path.join(projectRoot, '.timsquad', 'ssot');
  if (!await exists(ssotDir)) {
    printError('.timsquad/ssot/ 디렉토리가 없습니다.');
    return;
  }

  printStep(1, 3, 'SSOT 문서 파싱 및 컴파일...');
  const result = await compileAll(projectRoot, controllerDir);

  printStep(2, 3, '검증 결과 확인...');
  printCompileResult(result);

  printStep(3, 3, '의존성 그래프 검증...');
  const unresolved = await validateDependencyGraph(projectRoot, controllerDir);
  printDependencyResult(unresolved);

  if (result.success && unresolved.length === 0) {
    printSuccess(`컴파일 완료 — ${result.compiled.length}개 문서, ${countOutputFiles(result)}개 spec 생성`);
  } else if (result.success) {
    printWarning(`컴파일 완료 (의존성 미해결 ${unresolved.length}건)`);
  } else {
    printError(`컴파일 실패 — ${result.errors.length}건 오류`);
  }
}

// ─── tsq compile validate ────────────────────────────────────────

async function runValidate(): Promise<void> {
  printHeader('SSOT Validate');

  const { projectRoot, controllerDir } = await resolveProject();

  // Check stale first
  const stale = await checkStale(projectRoot, controllerDir);
  if (stale.length > 0) {
    printWarning('Stale spec 감지:');
    for (const s of stale) {
      console.log(`  ${colors.warning('⚠')} ${colors.path(s.source)} — ${s.reason}`);
    }
    console.log();
  }

  // Dependency graph
  const unresolved = await validateDependencyGraph(projectRoot, controllerDir);
  printDependencyResult(unresolved);

  if (stale.length === 0 && unresolved.length === 0) {
    printSuccess('모든 검증 통과');
  }
}

// ─── tsq compile status ──────────────────────────────────────────

async function runStatus(): Promise<void> {
  printHeader('Compile Status');

  const { projectRoot, controllerDir } = await resolveProject();

  const stale = await checkStale(projectRoot, controllerDir);

  if (stale.length === 0) {
    printSuccess('모든 spec이 최신 상태입니다.');
  } else {
    printWarning(`${stale.length}개 SSOT 변경 감지 — tsq compile 실행 필요:`);
    for (const s of stale) {
      console.log(`  ${colors.warning('⚠')} ${colors.path(s.source)} — ${s.reason}`);
    }
  }
}

// ─── tsq compile e2e ─────────────────────────────────────────────

async function runE2eMapping(taskFilter?: string): Promise<void> {
  printHeader('E2E Test Mappings');

  const { projectRoot, controllerDir } = await resolveProject();

  const ssotDir = path.join(projectRoot, '.timsquad', 'ssot');
  if (!await exists(ssotDir)) {
    printError('.timsquad/ssot/ 디렉토리가 없습니다.');
    return;
  }

  const result = await compileAll(projectRoot, controllerDir);

  let mappings = result.affected_e2e;
  if (taskFilter) {
    mappings = mappings.filter(m => m.specFile.includes(taskFilter));
  }

  if (mappings.length === 0) {
    printInfo('E2E 매핑 없음' + (taskFilter ? ` (filter: ${taskFilter})` : ''));
    return;
  }

  // Also scan __tests__/e2e/ for unmapped test files
  const e2eDir = path.join(projectRoot, '__tests__', 'e2e');
  const existingE2eFiles = new Set<string>();
  if (await exists(e2eDir)) {
    const files = await import('fs-extra').then(f => f.default.readdir(e2eDir));
    for (const f of files) {
      if (f.endsWith('.test.ts') || f.endsWith('.test.js')) {
        existingE2eFiles.add(path.join('__tests__/e2e', f));
      }
    }
  }

  console.log(colors.subheader('  Spec → E2E Mappings'));
  for (const m of mappings) {
    const icon = m.exists ? '✅' : '⚠️';
    const action = m.exists ? 'run' : 'create';
    console.log(`  ${icon} ${colors.path(m.specFile)} → ${m.e2eFile} [${action}]`);
  }

  // Show unmapped E2E test files
  const mappedE2e = new Set(mappings.map(m => m.e2eFile));
  const unmapped = [...existingE2eFiles].filter(f => !mappedE2e.has(f));
  if (unmapped.length > 0) {
    console.log(colors.subheader('\n  Unmapped E2E Tests (no spec reference)'));
    for (const f of unmapped) {
      console.log(`  ${colors.dim('○')} ${f}`);
    }
  }

  printSuccess(`${mappings.length}개 E2E 매핑 (${mappings.filter(m => m.exists).length} exist, ${mappings.filter(m => !m.exists).length} missing)`);
}

// ─── Output Helpers ──────────────────────────────────────────────

function printCompileResult(result: CompileResult): void {
  // Compiled documents
  for (const c of result.compiled) {
    const validation = result.validations.find((v) => v.source === c.source);
    const score = validation ? `${validation.score}%` : '-';
    const icon = validation && validation.score === 100 ? '✅' : validation && validation.score >= 50 ? '⚠️' : '❌';
    console.log(
      `  ${icon} ${colors.path(c.source)} → ${c.outputFiles.length}개 spec (완성도: ${score})`,
    );

    // Show missing fields
    if (validation && validation.missingFields.length > 0) {
      for (const mf of validation.missingFields) {
        console.log(
          `     ${colors.dim(`└ ${mf.section}: 누락 필드 [${mf.fields.join(', ')}]`)}`,
        );
      }
    }
  }

  // Skipped (too small / template)
  if (result.skipped.length > 0) {
    console.log(
      `  ${colors.dim(`⏭ 건너뜀 (미작성): ${result.skipped.join(', ')}`)}`,
    );
  }

  // E2E mappings summary
  if (result.affected_e2e.length > 0) {
    const existing = result.affected_e2e.filter(m => m.exists).length;
    const missing = result.affected_e2e.length - existing;
    console.log(`  ${colors.dim(`🧪 E2E: ${result.affected_e2e.length}개 매핑 (${existing} exist, ${missing} missing) — tsq compile e2e 로 상세 확인`)}`);
  }

  // Errors
  for (const err of result.errors) {
    printError(err);
  }

  console.log();
}

function printDependencyResult(
  unresolved: Array<{ agent: string; missing: string[] }>,
): void {
  if (unresolved.length === 0) {
    printInfo('의존성 그래프: 모든 agent prerequisites 해결됨');
  } else {
    printWarning('미해결 의존성:');
    for (const u of unresolved) {
      console.log(
        `  ${colors.agent(u.agent)} → 누락: ${u.missing.map((m) => colors.path(m)).join(', ')}`,
      );
    }
  }
  console.log();
}

function countOutputFiles(result: CompileResult): number {
  return result.compiled.reduce((sum, c) => sum + c.outputFiles.length, 0);
}

import { Command } from 'commander';
import path from 'path';
import ora from 'ora';
import fs from 'fs-extra';
import { colors, printHeader, printSuccess, printError, printStep, printKeyValue } from '../utils/colors.js';
import { promptText, promptSelect, promptConfirm } from '../utils/prompts.js';
import { exists, mkdir } from '../utils/fs.js';
import { initializeProject } from '../lib/template.js';
import { createDefaultConfig, saveConfig } from '../lib/config.js';
import { getActiveAgents, formatActiveAgentsList } from '../lib/agent-generator.js';
import { rebuildIndex } from '../lib/meta-index.js';
import type { ProjectType, ProjectLevel, Domain } from '../types/index.js';
import { PROJECT_TYPE_DESCRIPTIONS, PROJECT_LEVEL_DESCRIPTIONS, DOMAIN_DESCRIPTIONS } from '../types/project.js';

interface InitOptions {
  name?: string;
  type?: string;
  level?: string;
  domain?: string;
  stack?: string;
  dir?: string;
  yes?: boolean;
}

export function registerInitCommand(program: Command): void {
  program
    .command('init')
    .description('Initialize a new TimSquad project')
    .option('-n, --name <name>', 'Project name')
    .option('-t, --type <type>', 'Project type (web-service|web-app|api-backend|platform|fintech|infra)')
    .option('-l, --level <level>', 'Project level (1=MVP|2=Standard|3=Enterprise)')
    .option('--domain <domain>', 'Project domain (general-web|ml-engineering|fintech|mobile|gamedev|systems)')
    .option('--stack <items>', 'Technology stack (comma-separated: react,node,prisma,typescript,nextjs,postgresql,mysql)')
    .option('-d, --dir <path>', 'Target directory', '.')
    .option('-y, --yes', 'Skip confirmation prompts')
    .action(async (options: InitOptions) => {
      try {
        await runInit(options);
      } catch (error) {
        printError((error as Error).message);
        process.exit(1);
      }
    });
}

async function runInit(options: InitOptions): Promise<void> {
  printHeader('TimSquad Project Initialization');

  // 1. Get project name
  let name = options.name;
  if (!name) {
    name = await promptText('Project name:', path.basename(process.cwd()));
  }

  // Validate name
  if (!/^[a-z0-9-]+$/.test(name)) {
    throw new Error('Project name must be lowercase alphanumeric with hyphens only');
  }

  // 2. Get project type
  let type: ProjectType;
  if (options.type && isValidProjectType(options.type)) {
    type = options.type;
  } else {
    type = await promptSelect<ProjectType>('Project type:', [
      { name: 'web-service', value: 'web-service', description: PROJECT_TYPE_DESCRIPTIONS['web-service'] },
      { name: 'web-app', value: 'web-app', description: PROJECT_TYPE_DESCRIPTIONS['web-app'] },
      { name: 'api-backend', value: 'api-backend', description: PROJECT_TYPE_DESCRIPTIONS['api-backend'] },
      { name: 'platform', value: 'platform', description: PROJECT_TYPE_DESCRIPTIONS['platform'] },
      { name: 'fintech', value: 'fintech', description: PROJECT_TYPE_DESCRIPTIONS['fintech'] },
      { name: 'infra', value: 'infra', description: PROJECT_TYPE_DESCRIPTIONS['infra'] },
    ]);
  }

  // 3. Get project level
  let level: ProjectLevel;
  if (type === 'fintech') {
    console.log(colors.warning('\n⚠ fintech 타입은 Level 3 (Enterprise)가 강제됩니다.\n'));
    level = 3;
  } else if (options.level && isValidProjectLevel(options.level)) {
    level = Number(options.level) as ProjectLevel;
  } else {
    level = await promptSelect<ProjectLevel>('Project level:', [
      { name: 'Level 1 (MVP)', value: 1, description: PROJECT_LEVEL_DESCRIPTIONS[1] },
      { name: 'Level 2 (Standard)', value: 2, description: PROJECT_LEVEL_DESCRIPTIONS[2] },
      { name: 'Level 3 (Enterprise)', value: 3, description: PROJECT_LEVEL_DESCRIPTIONS[3] },
    ]);
  }

  // 4. Get domain (v4.0 Composition Layer)
  let domain: Domain;
  if (options.domain && isValidDomain(options.domain)) {
    domain = options.domain;
  } else if (options.yes) {
    domain = 'general-web';
  } else {
    domain = await promptSelect<Domain>('Project domain:', [
      { name: 'general-web', value: 'general-web', description: DOMAIN_DESCRIPTIONS['general-web'] },
      { name: 'ml-engineering', value: 'ml-engineering', description: DOMAIN_DESCRIPTIONS['ml-engineering'] },
      { name: 'fintech', value: 'fintech', description: DOMAIN_DESCRIPTIONS['fintech'] },
      { name: 'mobile', value: 'mobile', description: DOMAIN_DESCRIPTIONS['mobile'] },
      { name: 'gamedev', value: 'gamedev', description: DOMAIN_DESCRIPTIONS['gamedev'] },
      { name: 'systems', value: 'systems', description: DOMAIN_DESCRIPTIONS['systems'] },
    ]);
  }

  // 5. Parse stack option
  const stack = options.stack
    ? options.stack.split(',').map(s => s.trim()).filter(Boolean)
    : [];

  // 6. Ask about automated backup process
  let automationEnabled = true;
  if (!options.yes) {
    automationEnabled = await promptConfirm(
      'Enable automated backup process? (logging, metrics, retro)',
      true,
    );
  }

  // 6. Determine target directory
  const targetDir = path.resolve(options.dir || '.');

  // Check if directory exists and has files
  if (await exists(path.join(targetDir, '.timsquad'))) {
    if (!options.yes) {
      const overwrite = await promptConfirm('TimSquad project already exists. Overwrite?', false);
      if (!overwrite) {
        console.log(colors.dim('\nInitialization cancelled.'));
        return;
      }
    }
  }

  // 6. Show summary
  console.log('\n');
  printKeyValue('Project Name', name);
  printKeyValue('Type', `${type} (${PROJECT_TYPE_DESCRIPTIONS[type]})`);
  printKeyValue('Domain', `${domain} (${DOMAIN_DESCRIPTIONS[domain]})`);
  printKeyValue('Level', `${level} (${PROJECT_LEVEL_DESCRIPTIONS[level]})`);
  if (stack.length > 0) {
    printKeyValue('Stack', stack.join(', '));
  }
  printKeyValue('Automation', automationEnabled ? 'ON (logging, metrics, retro)' : 'OFF (manual)');
  printKeyValue('Directory', targetDir);
  console.log('\n');

  if (!options.yes) {
    const proceed = await promptConfirm('Proceed with initialization?', true);
    if (!proceed) {
      console.log(colors.dim('\nInitialization cancelled.'));
      return;
    }
  }

  // Detect existing source code (for meta index build)
  const hasExistingCode = await detectExistingCode(targetDir);

  // 7. Initialize project
  console.log('\n');
  const totalSteps = hasExistingCode ? 9 : 8;

  // Step 1: Create config (에이전트 동적 생성에 필요)
  printStep(1, totalSteps, 'Creating configuration...');
  const config = createDefaultConfig(name, type, level, { domain, platform: 'claude-code', stack });

  // Step 2: Create directories
  printStep(2, totalSteps, 'Creating directory structure...');
  await mkdir(path.join(targetDir, '.timsquad'));
  await mkdir(path.join(targetDir, '.claude'));

  // Step 3: Copy templates + dynamic agent generation
  const spinner = ora('Copying templates...').start();
  printStep(3, totalSteps, 'Copying templates and agents...');

  try {
    await initializeProject(targetDir, name, type, level, config, automationEnabled);
    spinner.succeed('Templates copied');
  } catch (error) {
    spinner.fail('Failed to copy templates');
    throw error;
  }

  // Step 4: Save config
  printStep(4, totalSteps, 'Saving configuration...');
  await saveConfig(targetDir, config);

  // Step 5: Initialize state
  printStep(5, totalSteps, 'Initializing state files...');
  // (Already done in initializeProject)

  // Step 6: Setup SSOT
  printStep(6, totalSteps, 'Preparing SSOT documents...');
  // (Already done in initializeProject)

  // Step 7: Configure automation
  printStep(7, totalSteps, `Setting up automation (${automationEnabled ? 'ON' : 'OFF'})...`);
  // (Automation config is saved in config.yaml and workflow.json)

  // Step 8: Meta Index (기존 코드가 있는 경우)
  let metaIndexResult: { files: number; methods: number } | null = null;
  if (hasExistingCode) {
    const miSpinner = ora('Building meta index from existing code...').start();
    printStep(8, totalSteps, 'Building meta index...');
    try {
      const summary = await rebuildIndex(targetDir);
      metaIndexResult = { files: summary.totalFiles, methods: summary.totalMethods };
      miSpinner.succeed(`Meta index built: ${summary.totalFiles} files, ${summary.totalMethods} methods`);
    } catch {
      miSpinner.warn('Meta index build skipped (no parseable source files)');
    }
  }

  // Final step: Finalize
  printStep(totalSteps, totalSteps, 'Finalizing...');

  // 7. Show success message
  console.log('\n');
  printSuccess(`TimSquad project "${name}" initialized successfully!`);

  // 활성 에이전트 표시
  const activeAgents = getActiveAgents(config);
  const agentsList = formatActiveAgentsList(activeAgents);
  console.log('\n' + colors.dim('  Active agents: ') + colors.command(agentsList));
  if (metaIndexResult) {
    console.log(colors.dim('  Meta index: ') + colors.command(`${metaIndexResult.files} files, ${metaIndexResult.methods} methods`));
  }

  console.log('\n' + colors.header('Next steps:'));
  console.log(colors.dim('  1. ') + colors.command('cd ' + (targetDir === '.' ? '' : targetDir)));
  console.log(colors.dim('  2. ') + colors.command('tsq status') + colors.dim(' - Check project status'));
  console.log(colors.dim('  3. ') + 'Start with PRD: ' + colors.path('.timsquad/ssot/prd.md'));
  console.log('\n');

  console.log(colors.dim('Available commands:'));
  console.log(colors.dim('  tsq status    ') + '- Show project status');
  console.log(colors.dim('  tsq log       ') + '- Manage work logs');
  console.log(colors.dim('  tsq q "task"  ') + '- Quick mode for simple tasks');
  console.log(colors.dim('  tsq f "task"  ') + '- Full mode with SSOT checks');
  console.log(colors.dim('  tsq retro     ') + '- Run retrospective');
  console.log('\n');
}

function isValidProjectType(value: string): value is ProjectType {
  return ['web-service', 'web-app', 'api-backend', 'platform', 'fintech', 'infra'].includes(value);
}

function isValidProjectLevel(value: string): boolean {
  return ['1', '2', '3'].includes(value);
}

function isValidDomain(value: string): value is Domain {
  return ['general-web', 'ml-engineering', 'fintech', 'mobile', 'gamedev', 'systems'].includes(value);
}

/**
 * Detect if target directory has existing source code
 * (not a fresh project — has .ts, .tsx, .js, .jsx, .py, .go, etc.)
 */
async function detectExistingCode(targetDir: string): Promise<boolean> {
  const srcDirs = ['src', 'lib', 'app', 'pages', 'components', 'server', 'api'];

  for (const dir of srcDirs) {
    const dirPath = path.join(targetDir, dir);
    if (await fs.pathExists(dirPath)) {
      return true;
    }
  }

  // Check for common source files in root
  const sourceExts = ['.ts', '.tsx', '.js', '.jsx', '.py', '.go', '.java', '.rs'];
  try {
    const entries = await fs.readdir(targetDir);
    return entries.some(e => sourceExts.some(ext => e.endsWith(ext)));
  } catch {
    return false;
  }
}

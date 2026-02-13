import { Command } from 'commander';
import path from 'path';
import ora from 'ora';
import { colors, printHeader, printSuccess, printError, printStep, printKeyValue } from '../utils/colors.js';
import { promptText, promptSelect, promptConfirm } from '../utils/prompts.js';
import { exists, mkdir } from '../utils/fs.js';
import { initializeProject } from '../lib/template.js';
import { createDefaultConfig, saveConfig } from '../lib/config.js';
import type { ProjectType, ProjectLevel } from '../types/index.js';
import { PROJECT_TYPE_DESCRIPTIONS, PROJECT_LEVEL_DESCRIPTIONS } from '../types/project.js';

interface InitOptions {
  name?: string;
  type?: string;
  level?: string;
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

  // 4. Determine target directory
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

  // 5. Show summary
  console.log('\n');
  printKeyValue('Project Name', name);
  printKeyValue('Type', `${type} (${PROJECT_TYPE_DESCRIPTIONS[type]})`);
  printKeyValue('Level', `${level} (${PROJECT_LEVEL_DESCRIPTIONS[level]})`);
  printKeyValue('Directory', targetDir);
  console.log('\n');

  if (!options.yes) {
    const proceed = await promptConfirm('Proceed with initialization?', true);
    if (!proceed) {
      console.log(colors.dim('\nInitialization cancelled.'));
      return;
    }
  }

  // 6. Initialize project
  console.log('\n');
  const totalSteps = 7;

  // Step 1: Create directories
  printStep(1, totalSteps, 'Creating directory structure...');
  await mkdir(path.join(targetDir, '.timsquad'));
  await mkdir(path.join(targetDir, '.claude'));

  // Step 2: Copy templates
  const spinner = ora('Copying templates...').start();
  printStep(2, totalSteps, 'Copying templates...');

  try {
    await initializeProject(targetDir, name, type, level);
    spinner.succeed('Templates copied');
  } catch (error) {
    spinner.fail('Failed to copy templates');
    throw error;
  }

  // Step 3: Create config
  printStep(3, totalSteps, 'Creating configuration...');
  const config = createDefaultConfig(name, type, level);
  await saveConfig(targetDir, config);

  // Step 4: Initialize state
  printStep(4, totalSteps, 'Initializing state files...');
  // (Already done in initializeProject)

  // Step 5: Setup agents
  printStep(5, totalSteps, 'Setting up agents...');
  // (Already done in initializeProject)

  // Step 6: Setup SSOT
  printStep(6, totalSteps, 'Preparing SSOT documents...');
  // (Already done in initializeProject)

  // Step 7: Finalize
  printStep(7, totalSteps, 'Finalizing...');

  // 7. Show success message
  console.log('\n');
  printSuccess(`TimSquad project "${name}" initialized successfully!`);

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

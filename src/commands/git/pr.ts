import { Command } from 'commander';
import { simpleGit, SimpleGit } from 'simple-git';
import { execSync } from 'child_process';
import { colors, printHeader, printError, printSuccess, printKeyValue, printWarning } from '../../utils/colors.js';
import { findProjectRoot } from '../../lib/project.js';
import { promptInput, promptConfirm } from '../../utils/prompts.js';

export function registerPRCommand(program: Command): void {
  program
    .command('pr [title]')
    .description('Push and create Pull Request (requires gh CLI)')
    .option('-b, --base <branch>', 'Base branch', 'main')
    .option('-d, --draft', 'Create as draft PR')
    .action(async (title: string | undefined, options: { base: string; draft?: boolean }) => {
      try {
        await createPR(title, options.base, options.draft);
      } catch (error) {
        printError((error as Error).message);
        process.exit(1);
      }
    });
}

function checkGhCli(): boolean {
  try {
    execSync('gh --version', { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

async function createPR(title?: string, baseBranch = 'main', draft = false): Promise<void> {
  const projectRoot = await findProjectRoot();
  const workDir = projectRoot || process.cwd();

  // Check gh CLI
  if (!checkGhCli()) {
    printError('GitHub CLI (gh) not found');
    console.log(colors.dim('\nInstall gh CLI:'));
    console.log(colors.path('  brew install gh'));
    console.log(colors.dim('  or visit: https://cli.github.com/'));
    return;
  }

  const git: SimpleGit = simpleGit(workDir);

  // Check if git repo
  const isRepo = await git.checkIsRepo();
  if (!isRepo) {
    throw new Error('Not a git repository');
  }

  printHeader('Create Pull Request');

  // Get current branch
  const currentBranch = await git.revparse(['--abbrev-ref', 'HEAD']);
  printKeyValue('Current branch', currentBranch.trim());
  printKeyValue('Base branch', baseBranch);

  if (currentBranch.trim() === baseBranch) {
    throw new Error(`Cannot create PR from ${baseBranch} to ${baseBranch}`);
  }

  // Check for uncommitted changes
  const status = await git.status();
  if (status.files.length > 0) {
    printWarning('You have uncommitted changes');
    const proceed = await promptConfirm('Proceed anyway?', false);
    if (!proceed) {
      console.log(colors.dim('\nRun "tsq commit" to commit changes first'));
      return;
    }
  }

  // Push to remote
  console.log(colors.dim('\nPushing to remote...'));
  try {
    await git.push(['-u', 'origin', currentBranch.trim()]);
    printSuccess('Pushed to origin');
  } catch (error) {
    const errorMsg = (error as Error).message;
    if (errorMsg.includes('already exists')) {
      console.log(colors.dim('Branch already pushed'));
    } else {
      throw error;
    }
  }

  // Get PR title
  let prTitle = title;
  if (!prTitle) {
    // Get last commit message as default
    const log = await git.log({ maxCount: 1 });
    const defaultTitle = log.latest?.message.split('\n')[0] || '';
    prTitle = await promptInput('PR title:', defaultTitle);
  }

  if (!prTitle) {
    throw new Error('PR title required');
  }

  // Get PR body
  console.log(colors.dim('\nEnter PR description (empty for default):'));
  const prBody = await promptInput('Description:');

  const defaultBody = `## Summary
- ${prTitle}

## Changes
- See commits for details

---
🤖 Generated with TimSquad`;

  const body = prBody || defaultBody;

  // Create PR using gh CLI
  console.log(colors.dim('\nCreating PR...'));

  try {
    const draftFlag = draft ? '--draft' : '';
    const cmd = `gh pr create --title "${prTitle.replace(/"/g, '\\"')}" --body "${body.replace(/"/g, '\\"')}" --base ${baseBranch} ${draftFlag}`;

    const result = execSync(cmd, {
      cwd: workDir,
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    printSuccess('Pull Request created!');
    console.log(colors.path(`\n${result.trim()}`));
  } catch (error) {
    const errorOutput = (error as { stderr?: string }).stderr || (error as Error).message;

    if (errorOutput.includes('already exists')) {
      console.log(colors.warning('\nPR already exists for this branch'));

      // Get existing PR URL
      try {
        const prUrl = execSync('gh pr view --json url -q .url', {
          cwd: workDir,
          encoding: 'utf-8',
        });
        console.log(colors.path(prUrl.trim()));
      } catch {
        // Ignore
      }
    } else {
      throw new Error(`Failed to create PR: ${errorOutput}`);
    }
  }
}

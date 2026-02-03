import { Command } from 'commander';
import { simpleGit, SimpleGit } from 'simple-git';
import { colors, printHeader, printError, printSuccess, printKeyValue, printWarning } from '../../utils/colors.js';
import { findProjectRoot } from '../../lib/project.js';
import { promptConfirm } from '../../utils/prompts.js';

export function registerSyncCommand(program: Command): void {
  program
    .command('sync')
    .description('Fetch and rebase from upstream')
    .option('-b, --branch <branch>', 'Branch to sync from', 'main')
    .option('--no-stash', 'Do not stash changes before sync')
    .action(async (options: { branch: string; stash: boolean }) => {
      try {
        await syncBranch(options.branch, options.stash);
      } catch (error) {
        printError((error as Error).message);
        process.exit(1);
      }
    });
}

async function syncBranch(baseBranch = 'main', shouldStash = true): Promise<void> {
  const projectRoot = await findProjectRoot();
  const workDir = projectRoot || process.cwd();

  const git: SimpleGit = simpleGit(workDir);

  // Check if git repo
  const isRepo = await git.checkIsRepo();
  if (!isRepo) {
    throw new Error('Not a git repository');
  }

  printHeader('Sync Branch');

  // Get current branch
  const currentBranch = await git.revparse(['--abbrev-ref', 'HEAD']);
  printKeyValue('Current branch', currentBranch.trim());
  printKeyValue('Sync from', `origin/${baseBranch}`);

  // Check for uncommitted changes
  const status = await git.status();
  const hasChanges = status.files.length > 0;
  let stashed = false;

  if (hasChanges) {
    printWarning(`You have ${status.files.length} uncommitted changes`);

    if (shouldStash) {
      const doStash = await promptConfirm('Stash changes before sync?', true);
      if (doStash) {
        console.log(colors.dim('\nStashing changes...'));
        await git.stash(['push', '-m', 'tsq-sync-stash']);
        stashed = true;
        printSuccess('Changes stashed');
      } else {
        const proceed = await promptConfirm('Proceed without stashing?', false);
        if (!proceed) {
          console.log(colors.dim('Cancelled'));
          return;
        }
      }
    }
  }

  try {
    // Fetch from origin
    console.log(colors.dim('\nFetching from origin...'));
    await git.fetch('origin');
    printSuccess('Fetched latest');

    // Get ahead/behind info
    const currentRef = currentBranch.trim();
    const baseRef = `origin/${baseBranch}`;

    let behind = 0;
    let ahead = 0;

    try {
      const revList = await git.raw(['rev-list', '--left-right', '--count', `${currentRef}...${baseRef}`]);
      const [aheadStr, behindStr] = revList.trim().split('\t');
      ahead = parseInt(aheadStr, 10) || 0;
      behind = parseInt(behindStr, 10) || 0;
    } catch {
      // May fail if branches don't share history
    }

    printKeyValue('Ahead', String(ahead));
    printKeyValue('Behind', String(behind));

    if (behind === 0) {
      console.log(colors.success('\nAlready up to date'));
    } else {
      // Rebase
      console.log(colors.dim(`\nRebasing on ${baseRef}...`));

      try {
        await git.rebase([baseRef]);
        printSuccess(`Rebased ${behind} commits`);
      } catch (rebaseError) {
        printError('Rebase failed - conflicts detected');
        console.log(colors.warning('\nResolve conflicts and run:'));
        console.log(colors.path('  git rebase --continue'));
        console.log(colors.dim('Or abort with:'));
        console.log(colors.path('  git rebase --abort'));

        // Unstash if we stashed
        if (stashed) {
          console.log(colors.dim('\nYour stashed changes will be available after resolving conflicts:'));
          console.log(colors.path('  git stash pop'));
        }

        return;
      }
    }

    // Unstash if we stashed
    if (stashed) {
      console.log(colors.dim('\nRestoring stashed changes...'));
      try {
        await git.stash(['pop']);
        printSuccess('Stash restored');
      } catch {
        printWarning('Failed to restore stash - conflicts may exist');
        console.log(colors.dim('Resolve manually with: git stash pop'));
      }
    }

    console.log('');
    printSuccess('Sync completed!');

    // Show final status
    const finalStatus = await git.status();
    if (finalStatus.files.length > 0) {
      console.log(colors.dim(`\n${finalStatus.files.length} uncommitted files`));
    }
  } catch (error) {
    // If something went wrong and we stashed, inform user
    if (stashed) {
      printWarning('Your changes are still stashed');
      console.log(colors.dim('Restore with: git stash pop'));
    }
    throw error;
  }
}

import { Command } from 'commander';
import { simpleGit, SimpleGit } from 'simple-git';
import { colors, printHeader, printError, printSuccess, printKeyValue } from '../../utils/colors.js';
import { findProjectRoot } from '../../lib/project.js';
import { promptInput, promptConfirm } from '../../utils/prompts.js';

const CO_AUTHOR = 'Co-Authored-By: Claude <noreply@anthropic.com>';

export function registerCommitCommand(program: Command): void {
  program
    .command('commit [message]')
    .description('Stage and commit with Co-Author')
    .option('-a, --all', 'Stage all changes')
    .option('-m, --message <msg>', 'Commit message')
    .action(async (message: string | undefined, options: { all?: boolean; message?: string }) => {
      try {
        await runCommit(message || options.message, options.all);
      } catch (error) {
        printError((error as Error).message);
        process.exit(1);
      }
    });
}

async function runCommit(message?: string, stageAll?: boolean): Promise<void> {
  const projectRoot = await findProjectRoot();
  const workDir = projectRoot || process.cwd();

  const git: SimpleGit = simpleGit(workDir);

  // Check if git repo
  const isRepo = await git.checkIsRepo();
  if (!isRepo) {
    throw new Error('Not a git repository');
  }

  printHeader('Git Commit');

  // Get status
  const status = await git.status();

  if (status.files.length === 0) {
    console.log(colors.warning('No changes to commit'));
    return;
  }

  // Show status
  console.log(colors.subheader('Changes:'));

  const staged = status.staged;
  const unstaged = [...status.modified, ...status.deleted].filter(f => !staged.includes(f));
  const untracked = status.not_added;

  if (staged.length > 0) {
    console.log(colors.success('\nStaged:'));
    staged.forEach(f => console.log(colors.dim(`  ${f}`)));
  }

  if (unstaged.length > 0) {
    console.log(colors.warning('\nNot staged:'));
    unstaged.forEach(f => console.log(colors.dim(`  ${f}`)));
  }

  if (untracked.length > 0) {
    console.log(colors.dim('\nUntracked:'));
    untracked.forEach(f => console.log(colors.dim(`  ${f}`)));
  }

  console.log('');

  // Stage files if needed
  if (stageAll) {
    await git.add('-A');
    console.log(colors.success('Staged all changes'));
  } else if (staged.length === 0) {
    const shouldStage = await promptConfirm('No staged changes. Stage all?', true);
    if (shouldStage) {
      await git.add('-A');
      console.log(colors.success('Staged all changes'));
    } else {
      console.log(colors.dim('Use git add to stage files manually'));
      return;
    }
  }

  // Get commit message
  let commitMessage = message;
  if (!commitMessage) {
    commitMessage = await promptInput('Commit message:');
    if (!commitMessage) {
      throw new Error('Commit message required');
    }
  }

  // Add Co-Author
  const fullMessage = `${commitMessage}\n\n${CO_AUTHOR}`;

  // Commit
  const result = await git.commit(fullMessage);

  printSuccess('Committed successfully');
  printKeyValue('Commit', result.commit);
  printKeyValue('Summary', `${result.summary.changes} changes, ${result.summary.insertions} insertions, ${result.summary.deletions} deletions`);
}

import { Command } from 'commander';
import { simpleGit, SimpleGit } from 'simple-git';
import { execSync, execFileSync } from 'child_process';
import { colors, printHeader, printError, printSuccess, printKeyValue, printWarning } from '../../utils/colors.js';
import { findProjectRoot } from '../../lib/project.js';
import { promptInput, promptConfirm, promptSelect } from '../../utils/prompts.js';

type ReleaseType = 'patch' | 'minor' | 'major';

export function registerReleaseCommand(program: Command): void {
  program
    .command('release [version]')
    .description('Create a release with tag and GitHub Release')
    .option('-t, --type <type>', 'Release type: patch, minor, major')
    .option('--no-github', 'Skip GitHub Release creation')
    .action(async (version: string | undefined, options: { type?: string; github: boolean }) => {
      try {
        await createRelease(version, options.type as ReleaseType, options.github);
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

function bumpVersion(current: string, type: ReleaseType): string {
  const parts = current.replace(/^v/, '').split('.').map(Number);
  const [major, minor, patch] = parts;

  switch (type) {
    case 'major':
      return `${major + 1}.0.0`;
    case 'minor':
      return `${major}.${minor + 1}.0`;
    case 'patch':
    default:
      return `${major}.${minor}.${patch + 1}`;
  }
}

async function createRelease(
  version?: string,
  releaseType?: ReleaseType,
  createGithubRelease = true
): Promise<void> {
  const projectRoot = await findProjectRoot();
  const workDir = projectRoot || process.cwd();

  const git: SimpleGit = simpleGit(workDir);

  // Check if git repo
  const isRepo = await git.checkIsRepo();
  if (!isRepo) {
    throw new Error('Not a git repository');
  }

  printHeader('Create Release');

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

  // Get current version from tags
  let currentVersion = '0.0.0';
  try {
    const tags = await git.tags();
    const versionTags = tags.all.filter(t => /^v?\d+\.\d+\.\d+/.test(t));
    if (versionTags.length > 0) {
      currentVersion = versionTags[versionTags.length - 1].replace(/^v/, '');
    }
  } catch {
    // No tags yet
  }

  printKeyValue('Current version', currentVersion);

  // Determine new version
  let newVersion = version;
  if (!newVersion) {
    if (releaseType) {
      newVersion = bumpVersion(currentVersion, releaseType);
    } else {
      // Ask for release type
      const type = await promptSelect<ReleaseType>(
        'Release type:',
        [
          { value: 'patch' as ReleaseType, name: `patch (${bumpVersion(currentVersion, 'patch')})` },
          { value: 'minor' as ReleaseType, name: `minor (${bumpVersion(currentVersion, 'minor')})` },
          { value: 'major' as ReleaseType, name: `major (${bumpVersion(currentVersion, 'major')})` },
        ]
      );
      newVersion = bumpVersion(currentVersion, type);
    }
  }

  // Ensure version has v prefix for tag
  const tagName = newVersion.startsWith('v') ? newVersion : `v${newVersion}`;
  printKeyValue('New version', tagName);

  // Get release notes
  console.log(colors.dim('\nEnter release notes (empty for auto-generate):'));
  let releaseNotes = await promptInput('Release notes:');

  if (!releaseNotes) {
    // Auto-generate from commits since last tag
    try {
      const log = await git.log({ from: `v${currentVersion}`, to: 'HEAD' });
      releaseNotes = log.all
        .map(c => `- ${c.message.split('\n')[0]}`)
        .join('\n');

      if (!releaseNotes) {
        releaseNotes = '- Initial release';
      }
    } catch {
      releaseNotes = '- Release ' + tagName;
    }
  }

  console.log(colors.subheader('\nRelease notes:'));
  console.log(colors.dim(releaseNotes));
  console.log('');

  // Confirm
  const confirm = await promptConfirm(`Create release ${tagName}?`, true);
  if (!confirm) {
    console.log(colors.dim('Cancelled'));
    return;
  }

  // Create tag
  console.log(colors.dim('\nCreating tag...'));
  await git.addTag(tagName);
  printSuccess(`Tag ${tagName} created`);

  // Push tag
  console.log(colors.dim('Pushing tag...'));
  await git.pushTags('origin');
  printSuccess('Tag pushed to origin');

  // Create GitHub Release
  if (createGithubRelease) {
    if (!checkGhCli()) {
      printWarning('GitHub CLI (gh) not found. Skipping GitHub Release.');
      console.log(colors.dim('Install: brew install gh'));
    } else {
      console.log(colors.dim('Creating GitHub Release...'));

      try {
        const result = execFileSync(
          'gh',
          ['release', 'create', tagName, '--title', tagName, '--notes', releaseNotes],
          { cwd: workDir, encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] }
        );

        printSuccess('GitHub Release created!');
        console.log(colors.path(`\n${result.trim()}`));
      } catch (error) {
        const errorOutput = (error as { stderr?: string }).stderr || (error as Error).message;
        printWarning(`Failed to create GitHub Release: ${errorOutput}`);
      }
    }
  }

  console.log('');
  printSuccess(`Release ${tagName} completed!`);
}

/**
 * tsq upgrade
 * Sync project templates to installed TimSquad version.
 * Supports rollback to the previous locally installed version.
 */

import { Command } from 'commander';
import path from 'path';
import fs from 'fs-extra';
import { colors, printHeader, printSuccess, printError, printWarning, printStep, printKeyValue } from '../utils/colors.js';
import { promptConfirm } from '../utils/prompts.js';
import { findProjectRoot } from '../lib/project.js';
import { loadConfig, saveConfig } from '../lib/config.js';
import { getTemplatesDir, createTemplateVariables, copyAndProcessFile, copyDirectoryWithSubstitution } from '../lib/template.js';
import { getActiveAgents, generateAgentFiles } from '../lib/agent-generator.js';
import { getActiveSkills, deploySkills, getActiveKnowledge, deployKnowledge } from '../lib/skill-generator.js';
import { getInstalledVersion, isNewer, LEGACY_VERSION } from '../lib/version.js';
import { createUpgradeBackup, restoreFromBackup, getBackupManifest, removeBackup } from '../lib/upgrade-backup.js';
import { rebuildIndex } from '../lib/meta-index.js';
import type { TimsquadConfig } from '../types/config.js';

interface UpgradeReport {
  fromVersion: string;
  toVersion: string;
  settingsUpdated: boolean;
  rulesUpdated: boolean;
  agentsUpdated: string[];
  skillsUpdated: string[];
  knowledgeUpdated: boolean;
  claudeMdUpdated: boolean;
  workflowUpdated: boolean;
}

export function registerUpgradeCommand(program: Command): void {
  program
    .command('upgrade')
    .description('Sync project templates to installed TimSquad version')
    .option('-y, --yes', 'Skip confirmation prompts')
    .option('--dry-run', 'Show what would change without modifying')
    .option('--rollback', 'Restore previous version from backup')
    .action(async (options: { yes?: boolean; dryRun?: boolean; rollback?: boolean }) => {
      try {
        if (options.rollback) {
          await runRollback(options);
        } else {
          await runUpgrade(options);
        }
      } catch (error) {
        printError((error as Error).message);
        process.exit(1);
      }
    });
}

// ─────────────────────────────────────────────────
// Upgrade
// ─────────────────────────────────────────────────

async function runUpgrade(options: { yes?: boolean; dryRun?: boolean }): Promise<void> {
  const projectRoot = await findProjectRoot();
  if (!projectRoot) {
    throw new Error('Not a TimSquad project. Run "tsq init" first.');
  }

  const config = await loadConfig(projectRoot);
  const currentVersion = config.project.framework_version ?? LEGACY_VERSION;
  const targetVersion = getInstalledVersion();

  printHeader('TimSquad Upgrade');

  if (!isNewer(targetVersion, currentVersion)) {
    console.log('');
    printKeyValue('Current', `v${currentVersion}`);
    printKeyValue('Installed', `v${targetVersion}`);
    console.log('');
    printSuccess('Already up to date — no upgrade needed.');
    return;
  }

  // Show change summary
  console.log('');
  printKeyValue('Project', config.project.name);
  printKeyValue('Current', `v${currentVersion}`);
  printKeyValue('Target', `v${targetVersion}`);
  console.log('');

  const syncTargets = await getSyncTargets(projectRoot, config);

  console.log(colors.subheader('  Templates to sync:\n'));
  for (const target of syncTargets) {
    console.log(colors.dim('    •') + ` ${target}`);
  }
  console.log('');

  console.log(colors.success('  Preserved (never touched):'));
  console.log(colors.dim('    - .timsquad/config.yaml  (project configuration)'));
  console.log(colors.dim('    - .timsquad/ssot/        (SSOT documents)'));
  console.log(colors.dim('    - .timsquad/logs/        (all logs)'));
  console.log(colors.dim('    - .timsquad/state/       (workflow state, meta-index)'));
  console.log(colors.dim('    - .timsquad/knowledge/   (user knowledge)'));
  console.log(colors.dim('    - .timsquad/retrospective/ (metrics, cycles)'));
  console.log('');

  if (options.dryRun) {
    printWarning('Dry run — no changes made.');
    return;
  }

  // Confirm
  if (!options.yes) {
    const proceed = await promptConfirm('Proceed with upgrade?', true);
    if (!proceed) {
      console.log(colors.dim('\nUpgrade cancelled.'));
      return;
    }
  }

  console.log('');

  // Execute
  const report = await executeUpgrade(projectRoot, config, currentVersion, targetVersion);

  // Print report
  printUpgradeReport(report);
}

/**
 * Get human-readable list of what will be synced
 */
async function getSyncTargets(_projectRoot: string, config: TimsquadConfig): Promise<string[]> {
  const targets: string[] = [];
  const templatesDir = getTemplatesDir();
  const platformDir = path.join(templatesDir, 'platforms', config.project.platform ?? 'claude-code');

  if (await fs.pathExists(path.join(platformDir, 'settings.json'))) {
    targets.push('.claude/settings.json (hooks configuration)');
  }
  if (await fs.pathExists(path.join(platformDir, 'rules'))) {
    targets.push('.claude/rules/ (main session rules)');
  }

  const activeAgents = getActiveAgents(config);
  targets.push(`.claude/agents/ (${activeAgents.map(a => `tsq-${a}`).join(', ')})`);

  const activeSkills = getActiveSkills(config);
  targets.push(`.claude/skills/ (${activeSkills.length} skills)`);

  const activeKnowledge = getActiveKnowledge(config);
  targets.push(`.claude/knowledge/ (${activeKnowledge.length} knowledge files)`);

  if (await fs.pathExists(path.join(platformDir, 'CLAUDE.md.template'))) {
    targets.push('CLAUDE.md (project instructions)');
  }

  const typeWorkflow = path.join(templatesDir, 'project-types', config.project.type, 'process');
  if (await fs.pathExists(typeWorkflow)) {
    targets.push('.timsquad/process/ (workflow definition)');
  }

  return targets;
}

/**
 * Execute the upgrade: backup → sync templates → update config version
 */
async function executeUpgrade(
  projectRoot: string,
  config: TimsquadConfig,
  currentVersion: string,
  targetVersion: string,
): Promise<UpgradeReport> {
  const report: UpgradeReport = {
    fromVersion: currentVersion,
    toVersion: targetVersion,
    settingsUpdated: false,
    rulesUpdated: false,
    agentsUpdated: [],
    skillsUpdated: [],
    knowledgeUpdated: false,
    claudeMdUpdated: false,
    workflowUpdated: false,
  };

  const totalSteps = 10;
  const templatesDir = getTemplatesDir();
  const platformDir = path.join(templatesDir, 'platforms', config.project.platform ?? 'claude-code');
  const variables = createTemplateVariables(
    config.project.name,
    config.project.type,
    config.project.level,
    config,
  );

  // Step 1: Create backup
  printStep(1, totalSteps, 'Creating backup...');
  await createUpgradeBackup(projectRoot, currentVersion);
  printSuccess(`Backup created (v${currentVersion})`);

  // Step 2: settings.json
  printStep(2, totalSteps, 'Syncing .claude/settings.json...');
  const settingsSrc = path.join(platformDir, 'settings.json');
  if (await fs.pathExists(settingsSrc)) {
    await copyAndProcessFile(settingsSrc, path.join(projectRoot, '.claude', 'settings.json'), variables);
    report.settingsUpdated = true;
  }

  // Step 3: rules/
  printStep(3, totalSteps, 'Syncing .claude/rules/...');
  const rulesSrc = path.join(platformDir, 'rules');
  if (await fs.pathExists(rulesSrc)) {
    await copyDirectoryWithSubstitution(rulesSrc, path.join(projectRoot, '.claude', 'rules'), variables);
    report.rulesUpdated = true;
  }

  // Step 3.5: scripts/ (enforcement hooks)
  const scriptsSrc = path.join(platformDir, 'scripts');
  if (await fs.pathExists(scriptsSrc)) {
    await copyDirectoryWithSubstitution(scriptsSrc, path.join(projectRoot, '.claude', 'scripts'), variables);
  }

  // Step 4: agents
  printStep(4, totalSteps, 'Syncing agent templates...');
  const activeAgents = getActiveAgents(config);
  await generateAgentFiles(
    templatesDir,
    path.join(projectRoot, '.claude', 'agents'),
    activeAgents,
    variables,
    config,
  );
  report.agentsUpdated = activeAgents.map(a => `tsq-${a}`);

  // Step 5: skills
  printStep(5, totalSteps, 'Syncing skills...');
  const activeSkills = getActiveSkills(config);
  await deploySkills(
    templatesDir,
    path.join(projectRoot, '.claude', 'skills'),
    activeSkills,
    variables,
  );
  report.skillsUpdated = activeSkills;

  // Step 6: knowledge
  printStep(6, totalSteps, 'Syncing knowledge...');
  const activeKnowledge = getActiveKnowledge(config);
  await deployKnowledge(
    templatesDir,
    path.join(projectRoot, '.claude', 'knowledge'),
    activeKnowledge,
    variables,
  );
  report.knowledgeUpdated = true;

  // Step 7: CLAUDE.md
  printStep(7, totalSteps, 'Syncing CLAUDE.md...');
  const claudeTemplatePath = path.join(platformDir, 'CLAUDE.md.template');
  if (await fs.pathExists(claudeTemplatePath)) {
    await copyAndProcessFile(claudeTemplatePath, path.join(projectRoot, 'CLAUDE.md'), variables);
    report.claudeMdUpdated = true;
  }

  // Step 8: project-type workflow
  printStep(8, totalSteps, 'Syncing workflow definition...');
  const typeWorkflow = path.join(templatesDir, 'project-types', config.project.type, 'process');
  if (await fs.pathExists(typeWorkflow)) {
    await copyDirectoryWithSubstitution(
      typeWorkflow,
      path.join(projectRoot, '.timsquad', 'process'),
      variables,
    );
    report.workflowUpdated = true;
  }

  // Step 9: Update framework_version in config
  printStep(9, totalSteps, 'Updating config version...');
  config.project.framework_version = targetVersion;
  await saveConfig(projectRoot, config);

  // Step 10: Rebuild meta index
  printStep(10, totalSteps, 'Rebuilding meta index...');
  try {
    const summary = await rebuildIndex(projectRoot);
    printSuccess(`Meta index rebuilt: ${summary.totalFiles} files, ${summary.totalMethods} methods`);
  } catch {
    printWarning('Meta index rebuild skipped (no parseable source files)');
  }

  return report;
}

// ─────────────────────────────────────────────────
// Rollback
// ─────────────────────────────────────────────────

async function runRollback(options: { yes?: boolean }): Promise<void> {
  const projectRoot = await findProjectRoot();
  if (!projectRoot) {
    throw new Error('Not a TimSquad project.');
  }

  printHeader('TimSquad Rollback');

  // Check backup exists
  const manifest = await getBackupManifest(projectRoot);
  if (!manifest) {
    printWarning('No upgrade backup found.');
    console.log(colors.dim('\n  Backups are created automatically by "tsq upgrade".'));
    console.log(colors.dim('  Run "tsq upgrade" first, then "tsq upgrade --rollback" to revert.\n'));
    return;
  }

  const config = await loadConfig(projectRoot);
  const currentVersion = config.project.framework_version ?? LEGACY_VERSION;

  console.log('');
  printKeyValue('Current', `v${currentVersion}`);
  printKeyValue('Restore to', `v${manifest.framework_version}`);
  printKeyValue('Backup date', manifest.created);
  console.log('');

  console.log(colors.subheader('  Will restore:\n'));
  for (const entry of manifest.entries) {
    console.log(colors.dim('    •') + ` ${entry}`);
  }
  console.log('');

  // Confirm
  if (!options.yes) {
    const proceed = await promptConfirm('Proceed with rollback?', false);
    if (!proceed) {
      console.log(colors.dim('\nRollback cancelled.'));
      return;
    }
  }

  console.log('');

  const totalSteps = 3;

  // Step 1: Restore files
  printStep(1, totalSteps, 'Restoring backup files...');
  const restoredVersion = await restoreFromBackup(projectRoot);
  printSuccess(`Files restored from v${restoredVersion} backup`);

  // Step 2: Update config version
  printStep(2, totalSteps, 'Updating config version...');
  config.project.framework_version = restoredVersion;
  await saveConfig(projectRoot, config);
  printSuccess(`framework_version → ${restoredVersion}`);

  // Step 3: Remove backup
  printStep(3, totalSteps, 'Cleaning up backup...');
  await removeBackup(projectRoot);
  printSuccess('Backup removed');

  console.log('');
  printHeader('Rollback Complete');
  console.log(colors.dim(`  Project restored to v${restoredVersion} templates.`));
  console.log(colors.dim('  User data (logs, SSOT, state) was not affected.\n'));
}

// ─────────────────────────────────────────────────
// Report
// ─────────────────────────────────────────────────

function printUpgradeReport(report: UpgradeReport): void {
  console.log('');
  printHeader('Upgrade Complete');

  printKeyValue('Version', `v${report.fromVersion} → v${report.toVersion}`);
  console.log('');

  if (report.settingsUpdated) {
    printSuccess('settings.json synced');
  }
  if (report.rulesUpdated) {
    printSuccess('rules/ synced');
  }
  if (report.agentsUpdated.length > 0) {
    printSuccess(`${report.agentsUpdated.length} agents synced: ${report.agentsUpdated.join(', ')}`);
  }
  if (report.skillsUpdated.length > 0) {
    printSuccess(`${report.skillsUpdated.length} skills synced`);
  }
  if (report.knowledgeUpdated) {
    printSuccess('knowledge synced');
  }
  if (report.claudeMdUpdated) {
    printSuccess('CLAUDE.md synced');
  }
  if (report.workflowUpdated) {
    printSuccess('workflow definition synced');
  }

  console.log('');
  console.log(colors.dim('  To revert: tsq upgrade --rollback'));
  console.log('');
}

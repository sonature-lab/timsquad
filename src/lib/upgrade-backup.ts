/**
 * Upgrade backup/restore module.
 * Creates a single backup directory before each upgrade, enabling rollback to the previous version.
 */

import path from 'path';
import fs from 'fs-extra';

const BACKUP_DIR = '.timsquad/.upgrade-backup';
const MANIFEST_FILE = 'backup-manifest.json';

interface BackupManifest {
  framework_version: string;
  created: string;
  entries: string[];
}

/** Assets to back up before upgrade (relative to project root) */
const BACKUP_TARGETS = [
  { path: '.claude/agents', type: 'dir' as const },
  { path: '.claude/skills', type: 'dir' as const },
  { path: '.claude/knowledge', type: 'dir' as const },
  { path: '.claude/rules', type: 'dir' as const },
  { path: '.claude/settings.json', type: 'file' as const },
  { path: 'CLAUDE.md', type: 'file' as const },
];

/**
 * Create backup of all upgradeable assets before upgrade.
 * Overwrites any existing backup (single backup only).
 */
export async function createUpgradeBackup(
  projectRoot: string,
  currentVersion: string,
): Promise<void> {
  const backupRoot = path.join(projectRoot, BACKUP_DIR);

  // Remove previous backup
  await fs.remove(backupRoot);
  await fs.ensureDir(backupRoot);

  const entries: string[] = [];

  for (const target of BACKUP_TARGETS) {
    const srcPath = path.join(projectRoot, target.path);
    const destPath = path.join(backupRoot, target.path);

    if (!await fs.pathExists(srcPath)) continue;

    if (target.type === 'dir') {
      await fs.copy(srcPath, destPath);
    } else {
      await fs.ensureDir(path.dirname(destPath));
      await fs.copy(srcPath, destPath);
    }
    entries.push(target.path);
  }

  // Write manifest
  const manifest: BackupManifest = {
    framework_version: currentVersion,
    created: new Date().toISOString(),
    entries,
  };
  await fs.writeJson(path.join(backupRoot, MANIFEST_FILE), manifest, { spaces: 2 });
}

/**
 * Restore from backup directory.
 * Returns the framework_version that was backed up.
 */
export async function restoreFromBackup(projectRoot: string): Promise<string> {
  const backupRoot = path.join(projectRoot, BACKUP_DIR);
  const manifest = await getBackupManifest(projectRoot);

  if (!manifest) {
    throw new Error('No upgrade backup found. Run "tsq upgrade" first to create a backup.');
  }

  for (const entry of manifest.entries) {
    const srcPath = path.join(backupRoot, entry);
    const destPath = path.join(projectRoot, entry);

    if (!await fs.pathExists(srcPath)) continue;

    // For directories, remove target first to avoid merge conflicts
    const stat = await fs.stat(srcPath);
    if (stat.isDirectory()) {
      await fs.remove(destPath);
    }

    await fs.copy(srcPath, destPath, { overwrite: true });
  }

  return manifest.framework_version;
}

/**
 * Check if a backup exists
 */
export async function hasBackup(projectRoot: string): Promise<boolean> {
  const manifestPath = path.join(projectRoot, BACKUP_DIR, MANIFEST_FILE);
  return fs.pathExists(manifestPath);
}

/**
 * Get backup manifest (null if no backup)
 */
export async function getBackupManifest(projectRoot: string): Promise<BackupManifest | null> {
  const manifestPath = path.join(projectRoot, BACKUP_DIR, MANIFEST_FILE);
  if (!await fs.pathExists(manifestPath)) return null;

  try {
    return await fs.readJson(manifestPath);
  } catch {
    return null;
  }
}

/**
 * Remove backup directory after successful rollback
 */
export async function removeBackup(projectRoot: string): Promise<void> {
  await fs.remove(path.join(projectRoot, BACKUP_DIR));
}

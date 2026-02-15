import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import path from 'path';
import fs from 'fs-extra';
import os from 'os';
import {
  createUpgradeBackup,
  restoreFromBackup,
  hasBackup,
  getBackupManifest,
  removeBackup,
} from '../../src/lib/upgrade-backup.js';

const BACKUP_DIR = '.timsquad/.upgrade-backup';

describe('upgrade-backup', () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = path.join(os.tmpdir(), `tsq-test-backup-${Date.now()}`);
    await fs.ensureDir(tmpDir);

    // Create a minimal project structure
    await fs.ensureDir(path.join(tmpDir, '.timsquad'));
    await fs.writeJson(path.join(tmpDir, '.timsquad', 'config.yaml'), { project: { name: 'test' } });

    // Create .claude/ files that would be backed up
    await fs.ensureDir(path.join(tmpDir, '.claude', 'agents'));
    await fs.writeFile(path.join(tmpDir, '.claude', 'agents', 'tsq-developer.md'), '# Developer Agent v1');
    await fs.writeFile(path.join(tmpDir, '.claude', 'agents', 'tsq-qa.md'), '# QA Agent v1');

    await fs.ensureDir(path.join(tmpDir, '.claude', 'skills', 'coding'));
    await fs.writeFile(path.join(tmpDir, '.claude', 'skills', 'coding', 'SKILL.md'), '# Coding Skill v1');

    await fs.ensureDir(path.join(tmpDir, '.claude', 'knowledge'));
    await fs.writeFile(path.join(tmpDir, '.claude', 'knowledge', 'test.md'), '# Knowledge v1');

    await fs.ensureDir(path.join(tmpDir, '.claude', 'rules'));
    await fs.writeFile(path.join(tmpDir, '.claude', 'rules', 'rule1.md'), '# Rule v1');

    await fs.writeJson(path.join(tmpDir, '.claude', 'settings.json'), { hooks: {} });
    await fs.writeFile(path.join(tmpDir, 'CLAUDE.md'), '# CLAUDE.md v1');
  });

  afterEach(async () => {
    await fs.remove(tmpDir);
  });

  describe('hasBackup', () => {
    it('should return false when no backup exists', async () => {
      expect(await hasBackup(tmpDir)).toBe(false);
    });

    it('should return true after backup is created', async () => {
      await createUpgradeBackup(tmpDir, '3.0.0');
      expect(await hasBackup(tmpDir)).toBe(true);
    });
  });

  describe('createUpgradeBackup', () => {
    it('should create backup directory with manifest', async () => {
      await createUpgradeBackup(tmpDir, '3.1.0');

      const manifest = await getBackupManifest(tmpDir);
      expect(manifest).not.toBeNull();
      expect(manifest!.framework_version).toBe('3.1.0');
      expect(manifest!.created).toBeDefined();
      expect(manifest!.entries).toContain('.claude/agents');
      expect(manifest!.entries).toContain('.claude/skills');
      expect(manifest!.entries).toContain('.claude/settings.json');
      expect(manifest!.entries).toContain('CLAUDE.md');
    });

    it('should copy agent files to backup', async () => {
      await createUpgradeBackup(tmpDir, '3.0.0');

      const backupAgent = await fs.readFile(
        path.join(tmpDir, BACKUP_DIR, '.claude', 'agents', 'tsq-developer.md'),
        'utf-8',
      );
      expect(backupAgent).toBe('# Developer Agent v1');
    });

    it('should overwrite previous backup', async () => {
      await createUpgradeBackup(tmpDir, '3.0.0');
      await createUpgradeBackup(tmpDir, '3.1.0');

      const manifest = await getBackupManifest(tmpDir);
      expect(manifest!.framework_version).toBe('3.1.0');
    });

    it('should skip non-existent targets', async () => {
      // Remove rules/ dir
      await fs.remove(path.join(tmpDir, '.claude', 'rules'));

      await createUpgradeBackup(tmpDir, '3.0.0');

      const manifest = await getBackupManifest(tmpDir);
      expect(manifest!.entries).not.toContain('.claude/rules');
    });
  });

  describe('restoreFromBackup', () => {
    it('should restore files and return version', async () => {
      // Create backup of v1
      await createUpgradeBackup(tmpDir, '3.0.0');

      // Simulate upgrade: overwrite files with v2
      await fs.writeFile(path.join(tmpDir, '.claude', 'agents', 'tsq-developer.md'), '# Developer Agent v2');
      await fs.writeFile(path.join(tmpDir, 'CLAUDE.md'), '# CLAUDE.md v2');

      // Restore
      const restoredVersion = await restoreFromBackup(tmpDir);

      expect(restoredVersion).toBe('3.0.0');

      // Verify files restored to v1
      const agent = await fs.readFile(
        path.join(tmpDir, '.claude', 'agents', 'tsq-developer.md'),
        'utf-8',
      );
      expect(agent).toBe('# Developer Agent v1');

      const claudeMd = await fs.readFile(path.join(tmpDir, 'CLAUDE.md'), 'utf-8');
      expect(claudeMd).toBe('# CLAUDE.md v1');
    });

    it('should throw when no backup exists', async () => {
      await expect(restoreFromBackup(tmpDir)).rejects.toThrow('No upgrade backup found');
    });
  });

  describe('removeBackup', () => {
    it('should remove the backup directory', async () => {
      await createUpgradeBackup(tmpDir, '3.0.0');
      expect(await hasBackup(tmpDir)).toBe(true);

      await removeBackup(tmpDir);
      expect(await hasBackup(tmpDir)).toBe(false);
    });
  });
});

import { describe, it, expect } from 'vitest';
import { parseSemver, isNewer, getInstalledVersion, LEGACY_VERSION } from '../../src/lib/version.js';

describe('version utilities', () => {
  describe('parseSemver', () => {
    it('should parse standard semver', () => {
      expect(parseSemver('3.2.1')).toEqual([3, 2, 1]);
    });

    it('should parse major-only', () => {
      expect(parseSemver('5')).toEqual([5, 0, 0]);
    });

    it('should parse major.minor', () => {
      expect(parseSemver('3.1')).toEqual([3, 1, 0]);
    });

    it('should handle empty string', () => {
      expect(parseSemver('')).toEqual([0, 0, 0]);
    });
  });

  describe('isNewer', () => {
    it('should detect newer major version', () => {
      expect(isNewer('4.0.0', '3.0.0')).toBe(true);
    });

    it('should detect newer minor version', () => {
      expect(isNewer('3.2.0', '3.1.0')).toBe(true);
    });

    it('should detect newer patch version', () => {
      expect(isNewer('3.1.1', '3.1.0')).toBe(true);
    });

    it('should return false for same version', () => {
      expect(isNewer('3.0.0', '3.0.0')).toBe(false);
    });

    it('should return false for older version', () => {
      expect(isNewer('2.9.0', '3.0.0')).toBe(false);
    });

    it('should handle complex comparison', () => {
      expect(isNewer('3.3.0', '3.2.5')).toBe(true);
      expect(isNewer('3.2.5', '3.3.0')).toBe(false);
    });
  });

  describe('getInstalledVersion', () => {
    it('should return a valid semver string', () => {
      const version = getInstalledVersion();
      expect(version).toMatch(/^\d+\.\d+\.\d+$/);
    });
  });

  describe('LEGACY_VERSION', () => {
    it('should be 3.0.0', () => {
      expect(LEGACY_VERSION).toBe('3.0.0');
    });
  });
});

/**
 * Shared version utilities.
 * Used by update-check, upgrade command, and CLI entrypoint.
 */

import { createRequire } from 'module';

/** Default version for projects created before framework_version was introduced */
export const LEGACY_VERSION = '3.0.0';

/**
 * Read installed package version from package.json
 */
export function getInstalledVersion(): string {
  const require = createRequire(import.meta.url);
  const pkg = require('../../package.json');
  return pkg.version;
}

/**
 * Parse semver string to [major, minor, patch]
 */
export function parseSemver(v: string): [number, number, number] {
  const parts = v.split('.').map(Number);
  return [parts[0] || 0, parts[1] || 0, parts[2] || 0];
}

/**
 * Returns true if version `a` is newer than version `b`
 */
export function isNewer(a: string, b: string): boolean {
  const [aMaj, aMin, aPat] = parseSemver(a);
  const [bMaj, bMin, bPat] = parseSemver(b);
  if (aMaj !== bMaj) return aMaj > bMaj;
  if (aMin !== bMin) return aMin > bMin;
  return aPat > bPat;
}

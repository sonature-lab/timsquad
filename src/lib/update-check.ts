import https from 'https';
import path from 'path';
import fs from 'fs-extra';
import chalk from 'chalk';
import { getInstalledVersion, isNewer as semverIsNewer } from './version.js';

const PACKAGE_NAME = 'timsquad';
const CURRENT_VERSION = getInstalledVersion();
const CHECK_INTERVAL_MS = 24 * 60 * 60 * 1000; // 24 hours

interface UpdateCache {
  lastCheck: number;
  latestVersion: string;
}

/**
 * Get the cache file path (~/.timsquad-update-check.json)
 */
function getCachePath(): string {
  const home = process.env.HOME || process.env.USERPROFILE || '/tmp';
  return path.join(home, '.timsquad-update-check.json');
}

/**
 * Read cached check result
 */
async function readCache(): Promise<UpdateCache | null> {
  const cachePath = getCachePath();
  try {
    if (await fs.pathExists(cachePath)) {
      return await fs.readJson(cachePath);
    }
  } catch {
    // Ignore cache read errors
  }
  return null;
}

/**
 * Write cache
 */
async function writeCache(cache: UpdateCache): Promise<void> {
  try {
    await fs.writeJson(getCachePath(), cache);
  } catch {
    // Ignore cache write errors
  }
}

/**
 * Fetch latest version from npm registry
 */
function fetchLatestVersion(): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = `https://registry.npmjs.org/${PACKAGE_NAME}/latest`;

    const req = https.get(url, { headers: { 'Accept': 'application/json' }, timeout: 3000 }, (res) => {
      if (res.statusCode !== 200) {
        reject(new Error(`HTTP ${res.statusCode}`));
        res.resume();
        return;
      }

      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve(json.version || CURRENT_VERSION);
        } catch {
          reject(new Error('Invalid JSON'));
        }
      });
    });

    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Timeout'));
    });
  });
}

/**
 * Compare semver versions: returns true if latest > current
 */
function isNewer(latest: string, current: string): boolean {
  return semverIsNewer(latest, current);
}

/**
 * Check for updates (non-blocking, silent on error)
 * Called after command execution via Commander postAction hook.
 */
export async function checkForUpdates(): Promise<void> {
  // Skip in CI environments
  if (process.env.CI || process.env.TIMSQUAD_NO_UPDATE_CHECK) return;

  try {
    // Check cache first
    const cache = await readCache();
    const now = Date.now();

    if (cache && (now - cache.lastCheck) < CHECK_INTERVAL_MS) {
      // Use cached version
      if (isNewer(cache.latestVersion, CURRENT_VERSION)) {
        printUpdateNotice(cache.latestVersion);
      }
      return;
    }

    // Fetch from registry
    const latestVersion = await fetchLatestVersion();
    await writeCache({ lastCheck: now, latestVersion });

    if (isNewer(latestVersion, CURRENT_VERSION)) {
      printUpdateNotice(latestVersion);
    }
  } catch {
    // Silently fail — update check should never break the CLI
  }
}

/**
 * Print update notice
 */
function printUpdateNotice(latestVersion: string): void {
  const border = chalk.yellow('─'.repeat(48));
  console.log('');
  console.log(border);
  console.log(chalk.yellow(`  Update available: ${chalk.dim(CURRENT_VERSION)} → ${chalk.green.bold(latestVersion)}`));
  console.log(chalk.yellow(`  Run ${chalk.cyan('npm i -g timsquad')} to update`));
  console.log(border);
  console.log('');
}

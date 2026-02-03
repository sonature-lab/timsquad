import fs from 'fs-extra';
import path from 'path';
import { glob } from 'glob';

/**
 * Check if a path exists
 */
export async function exists(filePath: string): Promise<boolean> {
  return fs.pathExists(filePath);
}

/**
 * Read a file as string
 */
export async function readFile(filePath: string): Promise<string> {
  return fs.readFile(filePath, 'utf-8');
}

/**
 * Write content to a file (creates directories if needed)
 */
export async function writeFile(filePath: string, content: string): Promise<void> {
  await fs.ensureDir(path.dirname(filePath));
  await fs.writeFile(filePath, content, 'utf-8');
}

/**
 * Copy a file or directory
 */
export async function copy(src: string, dest: string): Promise<void> {
  await fs.ensureDir(path.dirname(dest));
  await fs.copy(src, dest);
}

/**
 * Create a directory (recursive)
 */
export async function mkdir(dirPath: string): Promise<void> {
  await fs.ensureDir(dirPath);
}

/**
 * Remove a file or directory
 */
export async function remove(filePath: string): Promise<void> {
  await fs.remove(filePath);
}

/**
 * List files matching a pattern
 */
export async function listFiles(pattern: string, cwd?: string): Promise<string[]> {
  return glob(pattern, { cwd: cwd || process.cwd() });
}

/**
 * Get file size in bytes
 */
export async function getFileSize(filePath: string): Promise<number> {
  const stat = await fs.stat(filePath);
  return stat.size;
}

/**
 * Check if file is empty or just a template (< 500 bytes)
 */
export async function isFileFilled(filePath: string, threshold = 500): Promise<boolean> {
  if (!await exists(filePath)) return false;
  const size = await getFileSize(filePath);
  return size > threshold;
}

/**
 * Count lines in a file
 */
export async function countLines(filePath: string): Promise<number> {
  const content = await readFile(filePath);
  return content.split('\n').length;
}

/**
 * Get the templates directory path
 */
export function getTemplatesDir(): string {
  // When installed globally or via npx, templates are relative to the package
  return path.resolve(__dirname, '..', '..', 'templates');
}

/**
 * Resolve path from project root
 */
export function resolvePath(projectRoot: string, ...segments: string[]): string {
  return path.join(projectRoot, ...segments);
}

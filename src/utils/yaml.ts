import YAML from 'yaml';
import { readFile, writeFile } from './fs.js';

/**
 * Parse YAML string to object
 */
export function parseYaml<T = unknown>(content: string): T {
  return YAML.parse(content) as T;
}

/**
 * Stringify object to YAML
 */
export function stringifyYaml(data: unknown): string {
  return YAML.stringify(data, {
    indent: 2,
    lineWidth: 0, // Disable line wrapping
  });
}

/**
 * Load YAML file
 */
export async function loadYaml<T = unknown>(filePath: string): Promise<T> {
  const content = await readFile(filePath);
  return parseYaml<T>(content);
}

/**
 * Save object to YAML file
 */
export async function saveYaml(filePath: string, data: unknown): Promise<void> {
  const content = stringifyYaml(data);
  await writeFile(filePath, content);
}

/**
 * Update specific fields in a YAML file
 */
export async function updateYaml<T extends Record<string, unknown>>(
  filePath: string,
  updates: Partial<T>
): Promise<void> {
  const existing = await loadYaml<T>(filePath);
  const updated = { ...existing, ...updates };
  await saveYaml(filePath, updated);
}

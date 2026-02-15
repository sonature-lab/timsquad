/**
 * Parse YAML frontmatter from a markdown file content.
 * Returns the parsed key-value pairs, or null if no frontmatter found.
 */
export function parseFrontmatter(content: string): Record<string, unknown> | null {
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return null;

  const result: Record<string, unknown> = {};
  const lines = match[1].split('\n');

  for (const line of lines) {
    const colonIdx = line.indexOf(':');
    if (colonIdx === -1) continue;

    const key = line.slice(0, colonIdx).trim();
    let value: unknown = line.slice(colonIdx + 1).trim();

    // Parse simple types
    if (value === 'true') value = true;
    else if (value === 'false') value = false;
    else if (!isNaN(Number(value)) && value !== '') value = Number(value);
    else if (typeof value === 'string' && value.startsWith('[') && value.endsWith(']')) {
      // Parse YAML inline array: [item1, item2, ...]
      value = value.slice(1, -1).split(',').map((s: string) => s.trim()).filter(Boolean);
    }

    result[key] = value;
  }

  return result;
}

/**
 * Extract all XML-like tags from content.
 * Returns arrays of open and close tag names.
 */
export function extractXmlTags(content: string): {
  open: string[];
  close: string[];
} {
  // Match opening tags: <tag-name> or <tag-name attr="val">
  // Exclude self-closing tags like <br/> and HTML entities
  const openMatches = content.match(/<([a-zA-Z][\w-]*)(?:\s[^>]*)?>(?!\/)/g) || [];
  const closeMatches = content.match(/<\/([a-zA-Z][\w-]*)>/g) || [];

  const open = openMatches
    .map(tag => {
      const m = tag.match(/<([a-zA-Z][\w-]*)/);
      return m ? m[1] : '';
    })
    .filter(Boolean);

  const close = closeMatches
    .map(tag => {
      const m = tag.match(/<\/([a-zA-Z][\w-]*)>/);
      return m ? m[1] : '';
    })
    .filter(Boolean);

  return { open, close };
}

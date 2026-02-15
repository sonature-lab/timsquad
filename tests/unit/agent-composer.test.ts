import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import path from 'path';
import fs from 'fs-extra';
import os from 'os';
import { parseXmlSections, mergeSection, composeAgent } from '../../src/lib/agent-composer.js';
import type { XmlSection } from '../../src/lib/agent-composer.js';

// ─── parseXmlSections ─────────────────────────────────────────

describe('parseXmlSections', () => {
  it('should parse sections with explicit strategy', () => {
    const input = `---
type: platform-overlay
target: claude-code
version: 1.0.0
---

<overlay>
  <rules strategy="APPEND">
    <must>rule 1</must>
    <must>rule 2</must>
  </rules>
</overlay>`;

    const sections = parseXmlSections(input);
    expect(sections).toHaveLength(1);
    expect(sections[0].name).toBe('rules');
    expect(sections[0].strategy).toBe('APPEND');
    expect(sections[0].content).toContain('rule 1');
  });

  it('should use default strategy when not specified', () => {
    const input = `<overlay>
  <role-summary>New summary</role-summary>
  <does-not>- do nothing</does-not>
</overlay>`;

    const sections = parseXmlSections(input);
    expect(sections).toHaveLength(2);

    const roleSummary = sections.find(s => s.name === 'role-summary');
    expect(roleSummary?.strategy).toBe('REPLACE');

    const doesNot = sections.find(s => s.name === 'does-not');
    expect(doesNot?.strategy).toBe('APPEND');
  });

  it('should skip outer wrapper tags (agent, overlay)', () => {
    const input = `<agent role="developer">
  <rules strategy="APPEND">
    <must>test</must>
  </rules>
</agent>`;

    const sections = parseXmlSections(input);
    expect(sections).toHaveLength(1);
    expect(sections[0].name).toBe('rules');
  });

  it('should handle empty input', () => {
    expect(parseXmlSections('')).toEqual([]);
  });

  it('should default to KEEP for unknown sections', () => {
    const input = `<overlay>
  <custom-section>content</custom-section>
</overlay>`;

    const sections = parseXmlSections(input);
    expect(sections[0].strategy).toBe('KEEP');
  });
});

// ─── mergeSection ─────────────────────────────────────────────

describe('mergeSection', () => {
  const baseContent = `<agent role="developer">
  <role-summary>
    Base summary
  </role-summary>

  <prerequisites>
    file-a.md
    file-b.md
  </prerequisites>

  <rules>
    <must>base rule 1</must>
    <must>base rule 2</must>
  </rules>

  <does-not>
    - base restriction
  </does-not>
</agent>`;

  it('should REPLACE section content', () => {
    const overlay: XmlSection = {
      name: 'role-summary',
      content: 'New summary from overlay',
      strategy: 'REPLACE',
    };

    const result = mergeSection(baseContent, overlay);
    expect(result).toContain('New summary from overlay');
    expect(result).not.toContain('Base summary');
  });

  it('should APPEND to section content', () => {
    const overlay: XmlSection = {
      name: 'rules',
      content: '<must>appended rule</must>',
      strategy: 'APPEND',
    };

    const result = mergeSection(baseContent, overlay);
    expect(result).toContain('base rule 1');
    expect(result).toContain('base rule 2');
    expect(result).toContain('appended rule');
  });

  it('should MERGE lines with deduplication', () => {
    const overlay: XmlSection = {
      name: 'prerequisites',
      content: 'file-b.md\nfile-c.md',
      strategy: 'MERGE',
    };

    const result = mergeSection(baseContent, overlay);
    expect(result).toContain('file-a.md');
    expect(result).toContain('file-b.md');
    expect(result).toContain('file-c.md');
    // file-b.md should appear only once
    const matches = result.match(/file-b\.md/g);
    expect(matches).toHaveLength(1);
  });

  it('should KEEP base content unchanged', () => {
    const overlay: XmlSection = {
      name: 'role-summary',
      content: 'This should be ignored',
      strategy: 'KEEP',
    };

    const result = mergeSection(baseContent, overlay);
    expect(result).toContain('Base summary');
    expect(result).not.toContain('This should be ignored');
  });

  it('should insert new section if not in base', () => {
    const overlay: XmlSection = {
      name: 'knowledge-refs',
      content: 'checklists/security.md',
      strategy: 'MERGE',
    };

    const result = mergeSection(baseContent, overlay);
    expect(result).toContain('<knowledge-refs>');
    expect(result).toContain('checklists/security.md');
    expect(result).toContain('</knowledge-refs>');
  });

  it('should not insert KEEP section if not in base', () => {
    const overlay: XmlSection = {
      name: 'nonexistent',
      content: 'ignored',
      strategy: 'KEEP',
    };

    const result = mergeSection(baseContent, overlay);
    expect(result).not.toContain('nonexistent');
  });
});

// ─── composeAgent ─────────────────────────────────────────────

describe('composeAgent', () => {
  let tmpDir: string;
  let agentsDir: string;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'tsq-compose-'));
    agentsDir = path.join(tmpDir, 'base', 'agents');
    await fs.ensureDir(path.join(agentsDir, 'base'));
    await fs.ensureDir(path.join(agentsDir, 'overlays', 'platform'));
    await fs.ensureDir(path.join(agentsDir, 'overlays', 'domain', 'general-web'));

    // Create base agent
    await fs.writeFile(path.join(agentsDir, 'base', 'tsq-developer.md'), `---
name: tsq-developer
model: sonnet
---

<agent role="developer">
  <role-summary>
    Base developer summary
  </role-summary>

  <rules>
    <must>base rule</must>
  </rules>

  <does-not>
    - base restriction
  </does-not>
</agent>
`);
  });

  afterEach(async () => {
    await fs.remove(tmpDir);
  });

  it('should return base content when no overlays exist', async () => {
    const result = await composeAgent(tmpDir, {
      role: 'developer',
      platform: 'claude-code',
    });

    expect(result).toContain('Base developer summary');
    expect(result).toContain('base rule');
  });

  it('should apply platform overlay', async () => {
    await fs.writeFile(
      path.join(agentsDir, 'overlays', 'platform', 'claude-code.md'),
      `---
type: platform-overlay
target: claude-code
version: 1.0.0
---

<overlay>
  <rules strategy="APPEND">
    <must>platform rule</must>
  </rules>
</overlay>
`,
    );

    const result = await composeAgent(tmpDir, {
      role: 'developer',
      platform: 'claude-code',
    });

    expect(result).toContain('base rule');
    expect(result).toContain('platform rule');
  });

  it('should apply domain common overlay', async () => {
    await fs.writeFile(
      path.join(agentsDir, 'overlays', 'domain', 'general-web', '_common.md'),
      `---
type: domain-overlay
target: general-web
version: 1.0.0
---

<overlay>
  <rules strategy="APPEND">
    <must>domain common rule</must>
  </rules>
</overlay>
`,
    );

    const result = await composeAgent(tmpDir, {
      role: 'developer',
      platform: 'claude-code',
      domain: 'general-web',
    });

    expect(result).toContain('base rule');
    expect(result).toContain('domain common rule');
  });

  it('should apply role-specific domain overlay', async () => {
    await fs.writeFile(
      path.join(agentsDir, 'overlays', 'domain', 'general-web', 'developer.md'),
      `---
type: domain-overlay
target: general-web
version: 1.0.0
---

<overlay>
  <role-summary strategy="REPLACE">
    Developer for general-web domain
  </role-summary>
</overlay>
`,
    );

    const result = await composeAgent(tmpDir, {
      role: 'developer',
      platform: 'claude-code',
      domain: 'general-web',
    });

    expect(result).toContain('Developer for general-web domain');
    expect(result).not.toContain('Base developer summary');
  });

  it('should apply all layers in order: base → platform → domain common → domain role', async () => {
    // Platform overlay
    await fs.writeFile(
      path.join(agentsDir, 'overlays', 'platform', 'claude-code.md'),
      `---
type: platform-overlay
---
<overlay>
  <rules strategy="APPEND">
    <must>platform rule</must>
  </rules>
</overlay>
`,
    );

    // Domain common overlay
    await fs.writeFile(
      path.join(agentsDir, 'overlays', 'domain', 'general-web', '_common.md'),
      `---
type: domain-overlay
---
<overlay>
  <rules strategy="APPEND">
    <must>domain common rule</must>
  </rules>
</overlay>
`,
    );

    // Domain role overlay
    await fs.writeFile(
      path.join(agentsDir, 'overlays', 'domain', 'general-web', 'developer.md'),
      `---
type: domain-overlay
---
<overlay>
  <does-not strategy="APPEND">
    - domain role restriction
  </does-not>
</overlay>
`,
    );

    const result = await composeAgent(tmpDir, {
      role: 'developer',
      platform: 'claude-code',
      domain: 'general-web',
    });

    expect(result).toContain('base rule');
    expect(result).toContain('platform rule');
    expect(result).toContain('domain common rule');
    expect(result).toContain('base restriction');
    expect(result).toContain('domain role restriction');
  });

  it('should throw if base agent file is missing', async () => {
    await expect(
      composeAgent(tmpDir, { role: 'qa', platform: 'claude-code' }),
    ).rejects.toThrow('Base agent file not found: tsq-qa.md');
  });

  it('should skip domain overlay when domain is not set', async () => {
    const result = await composeAgent(tmpDir, {
      role: 'developer',
      platform: 'claude-code',
      domain: undefined,
    });

    expect(result).toContain('Base developer summary');
  });
});

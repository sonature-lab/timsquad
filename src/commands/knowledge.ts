import { Command } from 'commander';
import path from 'path';
import fs from 'fs-extra';
import { colors, printHeader, printError, printSuccess, printWarning, printKeyValue, printTable } from '../utils/colors.js';
import { findProjectRoot } from '../lib/project.js';
import { exists, readFile, writeFile, listFiles } from '../utils/fs.js';

/**
 * Knowledge categories and their template paths
 */
const KNOWLEDGE_CATEGORIES = ['platforms', 'domains', 'checklists'] as const;
type KnowledgeCategory = typeof KNOWLEDGE_CATEGORIES[number];

/**
 * Required sections per category (for validation)
 */
const REQUIRED_SECTIONS: Record<KnowledgeCategory, string[]> = {
  platforms: ['핵심 개념', '자주 쓰는 패턴', '주의사항', '체크리스트'],
  domains: ['도메인 규칙', '구현 패턴', '검증 규칙', '주의사항'],
  checklists: [], // checklists are freeform
};

/**
 * Template content per category
 */
const TEMPLATES: Record<KnowledgeCategory, (name: string) => string> = {
  platforms: (name: string) => `# ${name} Knowledge

> 이 파일은 프로젝트 경험에서 추출하여 채우는 참조 지식입니다.
> 처음부터 완성하지 않고, 실제 프로젝트에서 발견한 핵심 정보만 기록합니다.

## 핵심 개념
- {이 플랫폼의 핵심 특징/제약}

## 자주 쓰는 패턴
- {검증된 패턴 + 코드 예시}

## 주의사항 / 함정
- {실수하기 쉬운 부분, 문서에 없는 제약}

## 프로젝트 적용 시 체크리스트
- [ ] {확인해야 할 항목}
`,
  domains: (name: string) => `# ${name} Knowledge

> 이 파일은 프로젝트 경험에서 추출하여 채우는 도메인 참조 지식입니다.
> 처음부터 완성하지 않고, 실제 프로젝트에서 발견한 핵심 정보만 기록합니다.

## 도메인 규칙
- {비즈니스 로직의 핵심 규칙}

## 일반적인 구현 패턴
- {이 도메인에서 자주 쓰는 패턴}

## 검증 규칙
- {입력 검증, 비즈니스 검증 규칙}

## 주의사항
- {이 도메인에서 실수하기 쉬운 부분}
`,
  checklists: (name: string) => `# ${name} Checklist

> 에이전트가 작업 시 참조하는 체크리스트입니다.

## 공통
- [ ] {체크 항목}

## 프로젝트 특화
- [ ] {프로젝트별 체크 항목}
`,
};

export function registerKnowledgeCommand(program: Command): void {
  const knowledgeCmd = program
    .command('knowledge')
    .description('Manage knowledge files (.claude/knowledge/)');

  // tsq knowledge create <category> <name>
  knowledgeCmd
    .command('create <category> <name>')
    .description('Create a new knowledge file from template')
    .action(async (category: string, name: string) => {
      try {
        await createKnowledge(category, name);
      } catch (error) {
        printError((error as Error).message);
        process.exit(1);
      }
    });

  // tsq knowledge validate
  knowledgeCmd
    .command('validate')
    .description('Validate all knowledge files')
    .action(async () => {
      try {
        await validateKnowledge();
      } catch (error) {
        printError((error as Error).message);
        process.exit(1);
      }
    });

  // tsq knowledge list
  knowledgeCmd
    .command('list')
    .description('List all knowledge files with status')
    .action(async () => {
      try {
        await listKnowledge();
      } catch (error) {
        printError((error as Error).message);
        process.exit(1);
      }
    });
}

/**
 * Create a new knowledge file
 */
async function createKnowledge(category: string, name: string): Promise<void> {
  const projectRoot = await findProjectRoot();
  if (!projectRoot) {
    throw new Error('Not a TimSquad project');
  }

  if (!KNOWLEDGE_CATEGORIES.includes(category as KnowledgeCategory)) {
    throw new Error(`Invalid category: ${category}. Use: ${KNOWLEDGE_CATEGORIES.join(', ')}`);
  }

  const cat = category as KnowledgeCategory;
  const fileName = `${name.toLowerCase().replace(/\s+/g, '-')}.md`;
  const filePath = path.join(projectRoot, '.claude', 'knowledge', cat, fileName);

  if (await exists(filePath)) {
    throw new Error(`Knowledge file already exists: ${filePath}`);
  }

  const displayName = name.charAt(0).toUpperCase() + name.slice(1);
  const content = TEMPLATES[cat](displayName);

  await writeFile(filePath, content);

  printHeader('Knowledge Created');
  printKeyValue('Category', cat);
  printKeyValue('Name', displayName);
  printKeyValue('Path', path.relative(projectRoot, filePath));
  console.log('');
  printSuccess(`Knowledge file created. Fill in the template sections.`);
}

/**
 * Validate all knowledge files
 */
async function validateKnowledge(): Promise<void> {
  const projectRoot = await findProjectRoot();
  if (!projectRoot) {
    throw new Error('Not a TimSquad project');
  }

  const knowledgeDir = path.join(projectRoot, '.claude', 'knowledge');
  if (!await exists(knowledgeDir)) {
    throw new Error('Knowledge directory not found. Run `tsq init` first.');
  }

  printHeader('Knowledge Validation');

  let totalFiles = 0;
  let validFiles = 0;
  let warningFiles = 0;
  let emptyFiles = 0;

  for (const category of KNOWLEDGE_CATEGORIES) {
    const catDir = path.join(knowledgeDir, category);
    if (!await exists(catDir)) continue;

    const files = await listFiles('*.md', catDir);
    const mdFiles = files.filter(f => !f.startsWith('_'));

    for (const file of mdFiles) {
      totalFiles++;
      const filePath = path.join(catDir, file);
      const result = await validateFile(filePath, category);

      const relPath = `${category}/${file}`;
      if (result.status === 'valid') {
        validFiles++;
        console.log(`  ${colors.success('✓')} ${colors.path(relPath)} ${colors.dim(`(${result.filledSections}/${result.totalSections} sections)`)}`);
      } else if (result.status === 'partial') {
        warningFiles++;
        console.log(`  ${colors.warning('△')} ${colors.path(relPath)} ${colors.dim(`(${result.filledSections}/${result.totalSections} sections)`)}`);
        for (const issue of result.issues) {
          console.log(`    ${colors.dim('→')} ${colors.warning(issue)}`);
        }
      } else {
        emptyFiles++;
        console.log(`  ${colors.dim('○')} ${colors.path(relPath)} ${colors.dim('(empty/template)')}`);
      }
    }
  }

  console.log('');
  printTable([
    ['Total', String(totalFiles)],
    ['Valid', String(validFiles)],
    ['Partial', String(warningFiles)],
    ['Empty', String(emptyFiles)],
  ]);

  console.log('');
  if (emptyFiles > 0) {
    printWarning(`${emptyFiles} file(s) still using template placeholders.`);
  }
  if (warningFiles === 0 && emptyFiles === 0 && totalFiles > 0) {
    printSuccess('All knowledge files are valid.');
  }
}

interface ValidationResult {
  status: 'valid' | 'partial' | 'empty';
  filledSections: number;
  totalSections: number;
  issues: string[];
}

async function validateFile(filePath: string, category: string): Promise<ValidationResult> {
  const content = await readFile(filePath);
  const lines = content.split('\n');
  const issues: string[] = [];

  // Check if still template (has placeholder markers)
  const hasPlaceholders = content.includes('{') && content.includes('}');
  const isMinimal = content.length < 200;

  if (isMinimal && hasPlaceholders) {
    return { status: 'empty', filledSections: 0, totalSections: 0, issues: [] };
  }

  // Extract ## headings
  const headings = lines
    .filter(l => l.startsWith('## '))
    .map(l => l.replace('## ', '').trim());

  const requiredSections = REQUIRED_SECTIONS[category as KnowledgeCategory] || [];
  let filledSections = 0;
  const totalSections = Math.max(headings.length, requiredSections.length);

  // Check required sections exist
  for (const required of requiredSections) {
    const found = headings.some(h =>
      h.toLowerCase().includes(required.toLowerCase()) ||
      required.toLowerCase().includes(h.toLowerCase())
    );
    if (!found) {
      issues.push(`Missing section: "${required}"`);
    }
  }

  // Check each section has content (not just placeholders)
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].startsWith('## ')) {
      // Find content until next heading or end
      let hasContent = false;
      for (let j = i + 1; j < lines.length; j++) {
        if (lines[j].startsWith('## ') || lines[j].startsWith('# ')) break;
        const line = lines[j].trim();
        if (line && !line.startsWith('>') && !line.includes('{') && line !== '-') {
          hasContent = true;
          break;
        }
      }
      if (hasContent) filledSections++;
    }
  }

  if (issues.length === 0 && filledSections >= totalSections && !hasPlaceholders) {
    return { status: 'valid', filledSections, totalSections, issues };
  }

  if (filledSections > 0 || !hasPlaceholders) {
    return { status: 'partial', filledSections, totalSections, issues };
  }

  return { status: 'empty', filledSections: 0, totalSections, issues };
}

/**
 * List all knowledge files with status
 */
async function listKnowledge(): Promise<void> {
  const projectRoot = await findProjectRoot();
  if (!projectRoot) {
    throw new Error('Not a TimSquad project');
  }

  const knowledgeDir = path.join(projectRoot, '.claude', 'knowledge');
  if (!await exists(knowledgeDir)) {
    throw new Error('Knowledge directory not found. Run `tsq init` first.');
  }

  printHeader('Knowledge Files');

  let totalFiles = 0;

  for (const category of KNOWLEDGE_CATEGORIES) {
    const catDir = path.join(knowledgeDir, category);
    if (!await exists(catDir)) {
      console.log(`  ${colors.dim(`${category}/`)} ${colors.dim('(empty)')}`);
      continue;
    }

    const files = await listFiles('*.md', catDir);
    const mdFiles = files.filter(f => !f.startsWith('_'));

    if (mdFiles.length === 0) {
      console.log(`  ${colors.dim(`${category}/`)} ${colors.dim('(empty)')}`);
      continue;
    }

    console.log(`  ${colors.bold(category + '/')}`);

    for (const file of mdFiles) {
      totalFiles++;
      const filePath = path.join(catDir, file);
      const stat = await fs.stat(filePath);
      const content = await readFile(filePath);
      const hasPlaceholders = content.includes('{') && content.includes('}');
      const size = stat.size;

      let statusIcon: string;
      let statusText: string;

      if (size < 200 && hasPlaceholders) {
        statusIcon = colors.dim('○');
        statusText = colors.dim('template');
      } else if (hasPlaceholders) {
        statusIcon = colors.warning('△');
        statusText = colors.warning('partial');
      } else {
        statusIcon = colors.success('●');
        statusText = colors.success('filled');
      }

      const name = file.replace('.md', '');
      console.log(`    ${statusIcon} ${name.padEnd(24)} ${statusText.padEnd(20)} ${colors.dim(`${size}B`)}`);
    }
  }

  // Also check templates/ knowledge (npm-distributed)
  const templatesKnowledgeDir = path.join(knowledgeDir, 'templates');
  if (await exists(templatesKnowledgeDir)) {
    const templateFiles = await listFiles('*.md', templatesKnowledgeDir);
    if (templateFiles.length > 0) {
      console.log(`  ${colors.bold('templates/')}`);
      for (const file of templateFiles) {
        totalFiles++;
        const name = file.replace('.md', '');
        console.log(`    ${colors.success('●')} ${name.padEnd(24)} ${colors.dim('curated')}`)
      }
    }
  }

  console.log(`\n  ${colors.dim(`Total: ${totalFiles} file(s)`)}\n`);
}

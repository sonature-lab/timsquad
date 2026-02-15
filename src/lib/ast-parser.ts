/**
 * AST Parser using @swc/core
 * 파일의 mechanical 코드 구조를 추출: classes, interfaces, methods, imports/exports
 * 토큰 비용: 0 (로컬 파일 파싱)
 */

import { parse } from '@swc/core';
import path from 'path';
import { readFile } from '../utils/fs.js';
import type { FileMechanical, MethodMechanical, MethodEntry } from '../types/meta-index.js';

/**
 * Parse a single file and extract mechanical structure
 */
export async function parseFile(filePath: string): Promise<FileMechanical> {
  const content = await readFile(filePath);
  const ext = path.extname(filePath);

  const isJsx = ext === '.jsx' || ext === '.tsx';
  const syntax = ext === '.jsx' || ext === '.js' ? 'ecmascript' : 'typescript';

  const module = await parse(content, {
    syntax,
    ...(syntax === 'typescript' ? { tsx: isJsx, decorators: true } : { jsx: isJsx, decorators: true }),
  });

  const totalLines = content.split('\n').length;
  const classes: string[] = [];
  const interfaces: string[] = [];
  const exports: string[] = [];
  const imports: Array<{ module: string; names: string[] }> = [];
  const methods: Record<string, MethodEntry> = {};

  for (const item of module.body) {
    switch (item.type) {
      case 'ImportDeclaration': {
        const names = item.specifiers.map((s: any) => {
          if (s.type === 'ImportDefaultSpecifier') return 'default';
          if (s.type === 'ImportNamespaceSpecifier') return '*';
          return s.local?.value || '';
        }).filter(Boolean);
        imports.push({ module: item.source.value, names });
        break;
      }

      case 'ExportDeclaration': {
        const decl = item.declaration;
        processDeclaration(decl, content, classes, interfaces, exports, methods, true);
        break;
      }

      case 'ExportDefaultDeclaration': {
        const decl = (item as any).decl;
        if (decl?.identifier?.value) {
          exports.push(decl.identifier.value);
        } else {
          exports.push('default');
        }
        break;
      }

      case 'ExportNamedDeclaration': {
        const specifiers = (item as any).specifiers || [];
        for (const s of specifiers) {
          const name = s.exported?.value || s.orig?.value;
          if (name) exports.push(name);
        }
        break;
      }

      default: {
        // Non-exported top-level declarations
        processDeclaration(item as any, content, classes, interfaces, exports, methods, false);
        break;
      }
    }
  }

  const dependencies = imports.map(i => i.module);

  return { totalLines, classes, interfaces, exports, imports, dependencies, methods };
}

function processDeclaration(
  decl: any,
  content: string,
  classes: string[],
  interfaces: string[],
  exports: string[],
  methods: Record<string, MethodEntry>,
  isExported: boolean,
): void {
  if (!decl?.type) return;

  switch (decl.type) {
    case 'ClassDeclaration': {
      const className = decl.identifier?.value;
      if (className) {
        classes.push(className);
        if (isExported) exports.push(className);
      }
      // Extract class methods
      for (const member of decl.body || []) {
        if (member.type === 'ClassMethod') {
          const method = extractClassMethod(member, content, isExported);
          if (method) {
            methods[method.name] = { mechanical: method };
          }
        }
      }
      break;
    }

    case 'TsInterfaceDeclaration': {
      const ifaceName = decl.id?.value;
      if (ifaceName) {
        interfaces.push(ifaceName);
        if (isExported) exports.push(ifaceName);
      }
      break;
    }

    case 'FunctionDeclaration': {
      const funcName = decl.identifier?.value;
      if (funcName) {
        if (isExported) exports.push(funcName);
        const method = extractFunction(decl, content, isExported);
        if (method) {
          methods[method.name] = { mechanical: method };
        }
      }
      break;
    }

    case 'TsTypeAliasDeclaration': {
      const typeName = decl.id?.value;
      if (typeName && isExported) exports.push(typeName);
      break;
    }

    case 'TsEnumDeclaration': {
      const enumName = decl.id?.value;
      if (enumName && isExported) exports.push(enumName);
      break;
    }

    case 'VariableDeclaration': {
      for (const d of decl.declarations || []) {
        const varName = d.id?.value;
        if (varName && isExported) exports.push(varName);

        // Arrow function variable: const foo = async (x: T) => { ... }
        if (d.init?.type === 'ArrowFunctionExpression' && varName) {
          const method = extractArrowFunction(varName, d.init, content, isExported);
          if (method) {
            methods[method.name] = { mechanical: method };
          }
        }
      }
      break;
    }
  }
}

function extractClassMethod(member: any, content: string, classIsExported: boolean): MethodMechanical | null {
  const name = member.key?.value;
  if (!name) return null;

  const fn = member.function;
  if (!fn) return null;

  const startLine = byteOffsetToLine(content, member.span.start);
  const endLine = byteOffsetToLine(content, member.span.end);
  const params = extractParams(fn.params, content);
  const returnType = extractReturnType(fn.returnType, content);
  const isAsync = fn.async || false;
  const isPrivate = member.accessibility === 'private' || member.accessibility === 'protected';
  const decorators = extractDecorators(member.decorators);

  return {
    name,
    startLine,
    endLine,
    params,
    returnType,
    isAsync,
    isExported: classIsExported && !isPrivate,
    ...(decorators.length > 0 ? { decorators } : {}),
  };
}

function extractFunction(decl: any, content: string, isExported: boolean): MethodMechanical | null {
  const name = decl.identifier?.value;
  if (!name) return null;

  const startLine = byteOffsetToLine(content, decl.span.start);
  const endLine = byteOffsetToLine(content, decl.span.end);
  const params = extractParams(decl.params, content);
  const returnType = extractReturnType(decl.returnType, content);
  const isAsync = decl.async || false;
  const decorators = extractDecorators(decl.decorators);

  return {
    name,
    startLine,
    endLine,
    params,
    returnType,
    isAsync,
    isExported,
    ...(decorators.length > 0 ? { decorators } : {}),
  };
}

function extractArrowFunction(name: string, init: any, content: string, isExported: boolean): MethodMechanical | null {
  const startLine = byteOffsetToLine(content, init.span.start);
  const endLine = byteOffsetToLine(content, init.span.end);
  const params = extractParams(init.params, content);
  const returnType = extractReturnType(init.returnType, content);
  const isAsync = init.async || false;

  return {
    name,
    startLine,
    endLine,
    params,
    returnType,
    isAsync,
    isExported,
  };
}

function extractParams(params: any[], content: string): string[] {
  if (!params) return [];
  return params.map((p: any) => {
    const pat = p.pat || p;
    const name = pat.value || pat.left?.value || '...';
    const typeAnn = pat.typeAnnotation?.typeAnnotation;
    if (typeAnn) {
      const typeStr = extractTypeString(typeAnn, content);
      return `${name}: ${typeStr}`;
    }
    return name;
  });
}

function extractReturnType(returnType: any, content: string): string {
  if (!returnType?.typeAnnotation) return 'void';
  return extractTypeString(returnType.typeAnnotation, content);
}

function extractTypeString(typeNode: any, content: string): string {
  if (!typeNode) return 'unknown';

  switch (typeNode.type) {
    case 'TsKeywordType':
      return typeNode.kind;
    case 'TsTypeReference': {
      const name = typeNode.typeName?.value || 'unknown';
      if (typeNode.typeParams?.params?.length) {
        const params = typeNode.typeParams.params.map((p: any) => extractTypeString(p, content));
        return `${name}<${params.join(', ')}>`;
      }
      return name;
    }
    case 'TsArrayType':
      return `${extractTypeString(typeNode.elemType, content)}[]`;
    case 'TsUnionType':
      return typeNode.types.map((t: any) => extractTypeString(t, content)).join(' | ');
    case 'TsIntersectionType':
      return typeNode.types.map((t: any) => extractTypeString(t, content)).join(' & ');
    case 'TsLiteralType':
      return String(typeNode.literal?.value ?? 'literal');
    case 'TsTypeLiteral':
      return 'object';
    case 'TsFunctionType':
      return 'Function';
    case 'TsTupleType':
      return `[${(typeNode.elemTypes || []).map((t: any) => extractTypeString(t.ty || t, content)).join(', ')}]`;
    case 'TsParenthesizedType':
      return `(${extractTypeString(typeNode.typeAnnotation, content)})`;
    default:
      // Fallback: extract from source text
      if (typeNode.span) {
        return content.substring(typeNode.span.start, typeNode.span.end).trim() || 'unknown';
      }
      return 'unknown';
  }
}

function extractDecorators(decorators: any[]): string[] {
  if (!decorators?.length) return [];
  return decorators.map((d: any) => {
    const expr = d.expression;
    if (expr?.type === 'Identifier') return `@${expr.value}`;
    if (expr?.type === 'CallExpression' && expr.callee?.value) return `@${expr.callee.value}`;
    return '@unknown';
  }).filter(Boolean);
}

function byteOffsetToLine(content: string, offset: number): number {
  // SWC span offsets are 0-based byte offsets
  const before = content.substring(0, offset);
  return before.split('\n').length;
}

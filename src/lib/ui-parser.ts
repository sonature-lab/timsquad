/**
 * UI Component Parser using @swc/core JSX AST
 * React 컴포넌트의 UI 구조를 추출: slots, hooks, events, conditional rendering
 * 토큰 비용: 0 (로컬 파일 파싱)
 */

import { parse } from '@swc/core';
import path from 'path';
import { readFile } from '../utils/fs.js';
import type {
  ComponentMechanical, SlotMechanical, HookUsage, ConditionalRender, PropsField,
} from '../types/ui-meta.js';

/**
 * Parse a single file and extract component UI structure.
 * Returns null if no React component found.
 */
export async function parseComponent(filePath: string): Promise<ComponentMechanical | null> {
  const content = await readFile(filePath);
  const ext = path.extname(filePath);

  const isJsx = ext === '.jsx' || ext === '.tsx';
  if (!isJsx) return null;

  const syntax = ext === '.jsx' ? 'ecmascript' : 'typescript';

  const module = await parse(content, {
    syntax,
    ...(syntax === 'typescript' ? { tsx: true, decorators: true } : { jsx: true }),
  });

  // Find the first exported component (function returning JSX)
  for (const item of module.body) {
    const result = findComponent(item);
    if (result) return result;
  }

  return null;
}

// ── Component Detection ──

interface ComponentCandidate {
  name: string;
  params: any[];
  body: any;
  isForwardRef: boolean;
}

function findComponent(item: any): ComponentMechanical | null {
  if (!item) return null;

  const candidates: ComponentCandidate[] = [];

  switch (item.type) {
    case 'ExportDeclaration':
      return findComponent(item.declaration);

    case 'ExportDefaultDeclaration': {
      const decl = item.decl;
      if (decl?.type === 'FunctionExpression' || decl?.type === 'ArrowFunctionExpression') {
        candidates.push({
          name: decl.identifier?.value || 'default',
          params: decl.params || [],
          body: decl.body,
          isForwardRef: false,
        });
      }
      break;
    }

    case 'FunctionDeclaration': {
      const name = item.identifier?.value;
      if (name && isComponentName(name)) {
        candidates.push({
          name,
          params: item.params || [],
          body: item.body,
          isForwardRef: false,
        });
      }
      break;
    }

    case 'VariableDeclaration': {
      for (const d of item.declarations || []) {
        const name = d.id?.value;
        if (!name) continue;

        const init = d.init;
        if (!init) continue;

        // Arrow function: const Comp = () => { return <div/> }
        if (init.type === 'ArrowFunctionExpression' && isComponentName(name)) {
          candidates.push({
            name,
            params: init.params || [],
            body: init.body,
            isForwardRef: false,
          });
        }

        // forwardRef: const Comp = forwardRef((...) => { ... })
        if (init.type === 'CallExpression') {
          const callee = init.callee?.value;
          if (callee === 'forwardRef' && init.arguments?.[0]) {
            const arrow = init.arguments[0].expression;
            if (arrow?.type === 'ArrowFunctionExpression' || arrow?.type === 'FunctionExpression') {
              candidates.push({
                name,
                params: arrow.params || [],
                body: arrow.body,
                isForwardRef: true,
              });
            }
          }
        }
      }
      break;
    }
  }

  // Try each candidate to find one with JSX return
  for (const candidate of candidates) {
    const jsxRoot = findJSXReturn(candidate.body);
    if (jsxRoot) {
      return buildComponentMechanical(candidate, jsxRoot);
    }
  }

  return null;
}

function isComponentName(name: string): boolean {
  return /^[A-Z]/.test(name);
}

// ── JSX Return Detection ──

function findJSXReturn(body: any): any | null {
  if (!body) return null;

  // Direct JSX return (arrow shorthand)
  if (body.type === 'JSXElement' || body.type === 'JSXFragment') {
    return body;
  }

  // Parenthesized expression wrapping JSX
  if (body.type === 'ParenthesisExpression') {
    return findJSXReturn(body.expression);
  }

  // Block body with return statement
  if (body.type === 'BlockStatement' && body.stmts) {
    for (const stmt of body.stmts) {
      if (stmt.type === 'ReturnStatement' && stmt.argument) {
        return findJSXReturn(stmt.argument);
      }
    }
  }

  return null;
}

// ── Build ComponentMechanical ──

function buildComponentMechanical(
  candidate: ComponentCandidate,
  jsxRoot: any,
): ComponentMechanical {
  const body = candidate.body;
  const stmts = body?.stmts || [];

  // Extract props
  const { propsInterface, propsFields } = extractProps(candidate.params);

  // Extract hooks from body
  const hooks: HookUsage[] = [];
  const contextUsage: string[] = [];
  for (const stmt of stmts) {
    extractHooks(stmt, hooks, contextUsage);
  }

  // Extract componentType from root JSX element
  const componentType = getJSXTagName(jsxRoot);

  // Extract slots, event handlers, conditional renders from JSX tree
  const slots: SlotMechanical[] = [];
  const eventHandlers: string[] = [];
  const conditionalRenders: ConditionalRender[] = [];
  traverseJSX(jsxRoot, slots, eventHandlers, conditionalRenders);

  // Detect special patterns
  const hasSuspense = slots.some(s => s.name === 'Suspense');
  const hasErrorBoundary = slots.some(s => s.name === 'ErrorBoundary');

  return {
    componentName: candidate.name,
    componentType,
    ...(propsInterface ? { propsInterface } : {}),
    ...(propsFields?.length ? { propsFields } : {}),
    slots,
    hooks,
    eventHandlers: [...new Set(eventHandlers)],
    conditionalRenders,
    hasForwardRef: candidate.isForwardRef,
    hasSuspense,
    hasErrorBoundary,
    contextUsage,
  };
}

// ── Props Extraction ──

function extractProps(params: any[]): { propsInterface?: string; propsFields?: PropsField[] } {
  if (!params?.length) return {};

  const firstParam = params[0];
  // Pattern: (props: LoginFormProps) or ({ field1, field2 }: LoginFormProps)
  const pat = firstParam.pat || firstParam;

  const typeAnn = pat.typeAnnotation?.typeAnnotation;
  let propsInterface: string | undefined;
  let propsFields: PropsField[] | undefined;

  if (typeAnn) {
    if (typeAnn.type === 'TsTypeReference') {
      propsInterface = typeAnn.typeName?.value;
    } else if (typeAnn.type === 'TsTypeLiteral' && typeAnn.members) {
      // Inline type literal: { onSubmit: () => void; name?: string }
      propsFields = typeAnn.members
        .filter((m: any) => m.type === 'TsPropertySignature')
        .map((m: any) => ({
          name: m.key?.value || 'unknown',
          type: m.typeAnnotation?.typeAnnotation ? extractTypeSimple(m.typeAnnotation.typeAnnotation) : 'unknown',
          required: !m.optional,
        }));
    }
  }

  // ObjectPattern destructuring: ({ field1, field2 })
  if (pat.type === 'ObjectPattern' && pat.properties && !propsFields) {
    propsFields = pat.properties
      .filter((p: any) => p.type === 'KeyValuePatternProperty' || p.type === 'AssignmentPatternProperty')
      .map((p: any) => {
        const key = p.key?.value || p.value?.left?.value || 'unknown';
        const hasDefault = p.value?.type === 'AssignmentPattern';
        return {
          name: key,
          type: 'unknown',
          required: !hasDefault,
          ...(hasDefault ? { defaultValue: 'provided' } : {}),
        };
      });
  }

  return { propsInterface, propsFields };
}

function extractTypeSimple(typeNode: any): string {
  if (!typeNode) return 'unknown';
  if (typeNode.type === 'TsKeywordType') return typeNode.kind;
  if (typeNode.type === 'TsTypeReference') return typeNode.typeName?.value || 'unknown';
  if (typeNode.type === 'TsFunctionType') return 'Function';
  return 'unknown';
}

// ── Hook Extraction ──

function extractHooks(stmt: any, hooks: HookUsage[], contextUsage: string[]): void {
  if (stmt.type === 'VariableDeclaration') {
    for (const d of stmt.declarations || []) {
      const init = d.init;
      if (init?.type !== 'CallExpression') continue;

      const hookName = init.callee?.value;
      if (!hookName || !hookName.startsWith('use')) continue;

      const usage: HookUsage = { hook: hookName };

      // Destructured array: const [val, setVal] = useState(...)
      if (d.id?.type === 'ArrayPattern' && d.id.elements?.length) {
        usage.variable = d.id.elements[0]?.value;
      }
      // Simple variable: const theme = useContext(...)
      if (d.id?.type === 'Identifier') {
        usage.variable = d.id.value;
      }

      // useContext special handling
      if (hookName === 'useContext' && init.arguments?.[0]) {
        const ctxName = init.arguments[0].expression?.value;
        if (ctxName) contextUsage.push(ctxName);
      }

      hooks.push(usage);
    }
  }

  // Expression statement: useEffect(() => {}, [dep1, dep2])
  if (stmt.type === 'ExpressionStatement') {
    const call = stmt.expression;
    if (call?.type === 'CallExpression') {
      const hookName = call.callee?.value;
      if (hookName?.startsWith('use')) {
        const usage: HookUsage = { hook: hookName };

        // Extract deps array length (2nd argument)
        if (call.arguments?.length > 1) {
          const depsArg = call.arguments[1]?.expression;
          if (depsArg?.type === 'ArrayExpression') {
            usage.dependencies = depsArg.elements?.length ?? 0;
          }
        }

        hooks.push(usage);
      }
    }
  }
}

// ── JSX Tree Traversal ──

function traverseJSX(
  node: any,
  slots: SlotMechanical[],
  eventHandlers: string[],
  conditionalRenders: ConditionalRender[],
): void {
  if (!node) return;

  if (node.type === 'JSXElement') {
    // Extract event handlers from attributes
    for (const attr of node.opening?.attributes || []) {
      if (attr.type === 'JSXAttribute' && attr.name?.value) {
        const name = attr.name.value;
        if (name.startsWith('on') && name.length > 2 && name[2] === name[2].toUpperCase()) {
          eventHandlers.push(name);
        }
      }
    }

    // Extract child component slots
    const tagName = getJSXTagName(node);
    const isComponent = /^[A-Z]/.test(tagName) && tagName !== 'Fragment';

    if (isComponent) {
      const slot = buildSlot(node);
      slots.push(slot);
      return; // Don't recurse into component children for top-level slots
    }

    // Recurse into HTML element children
    for (const child of node.children || []) {
      traverseJSXChild(child, slots, eventHandlers, conditionalRenders);
    }
  }

  if (node.type === 'JSXFragment') {
    for (const child of node.children || []) {
      traverseJSXChild(child, slots, eventHandlers, conditionalRenders);
    }
  }
}

function traverseJSXChild(
  child: any,
  slots: SlotMechanical[],
  eventHandlers: string[],
  conditionalRenders: ConditionalRender[],
): void {
  if (child.type === 'JSXElement') {
    traverseJSX(child, slots, eventHandlers, conditionalRenders);
  } else if (child.type === 'JSXExpressionContainer') {
    const expr = child.expression;

    // {isLoading && <Spinner />} — logical-and conditional
    if (expr?.type === 'BinaryExpression' && expr.operator === '&&') {
      const condition = extractConditionName(expr.left);
      const jsxRight = findJSXInExpression(expr.right);
      if (condition && jsxRight) {
        const renderedComponent = getJSXTagName(jsxRight);
        conditionalRenders.push({ condition, type: 'logical-and', renderedComponent });

        // Also add as conditional slot
        if (/^[A-Z]/.test(renderedComponent)) {
          const slot = buildSlot(jsxRight);
          slot.compositionType = 'conditional';
          slot.condition = condition;
          slots.push(slot);
        }
      }
    }

    // {error ? <ErrorMsg/> : <Content/>} — ternary conditional
    if (expr?.type === 'ConditionalExpression') {
      const condition = extractConditionName(expr.test);
      if (condition) {
        const consequent = findJSXInExpression(expr.consequent);
        const alternate = findJSXInExpression(expr.alternate);

        if (consequent) {
          const name = getJSXTagName(consequent);
          conditionalRenders.push({ condition, type: 'ternary', renderedComponent: name });
          if (/^[A-Z]/.test(name)) {
            const slot = buildSlot(consequent);
            slot.compositionType = 'conditional';
            slot.condition = condition;
            slots.push(slot);
          }
        }
        if (alternate) {
          const name = getJSXTagName(alternate);
          if (/^[A-Z]/.test(name)) {
            const slot = buildSlot(alternate);
            slot.compositionType = 'conditional';
            slot.condition = `!${condition}`;
            slots.push(slot);
          }
        }
      }
    }

    // {children} — passthrough slot
    if (expr?.type === 'Identifier' && expr.value === 'children') {
      slots.push({
        name: 'children',
        props: {},
        compositionType: 'passthrough',
      });
    }
  } else if (child.type === 'JSXFragment') {
    for (const c of child.children || []) {
      traverseJSXChild(c, slots, eventHandlers, conditionalRenders);
    }
  }
}

// ── Slot Building ──

function buildSlot(jsxElement: any): SlotMechanical {
  const tagName = getJSXTagName(jsxElement);
  const isCompound = jsxElement.opening?.name?.type === 'JSXMemberExpression';

  const props: Record<string, string> = {};
  for (const attr of jsxElement.opening?.attributes || []) {
    if (attr.type === 'JSXAttribute' && attr.name?.value) {
      const name = attr.name.value;
      // Skip event handlers from slot props
      if (name.startsWith('on') && name.length > 2 && name[2] === name[2].toUpperCase()) continue;

      if (attr.value?.type === 'StringLiteral') {
        props[name] = attr.value.value;
      } else if (attr.value?.type === 'JSXExpressionContainer') {
        // Expression value — just mark as dynamic
        props[name] = '{...}';
      } else if (!attr.value) {
        // Boolean shorthand: <Input required />
        props[name] = 'true';
      }
    }
  }

  // Check for render props
  let renderProp: string | undefined;
  for (const attr of jsxElement.opening?.attributes || []) {
    if (attr.type === 'JSXAttribute' && attr.name?.value) {
      const name = attr.name.value;
      if (name.startsWith('render') && attr.value?.type === 'JSXExpressionContainer') {
        renderProp = name;
        break;
      }
    }
  }

  const slot: SlotMechanical = {
    name: tagName,
    props,
    compositionType: isCompound ? 'compound' : (renderProp ? 'render-prop' : 'direct'),
    ...(renderProp ? { renderProp } : {}),
  };

  // Extract compound children
  if (isCompound || (jsxElement.children?.length > 0)) {
    const childSlots: SlotMechanical[] = [];
    for (const child of jsxElement.children || []) {
      if (child.type === 'JSXElement') {
        const childTag = getJSXTagName(child);
        if (/^[A-Z]/.test(childTag)) {
          childSlots.push(buildSlot(child));
        }
      }
    }
    if (childSlots.length > 0) {
      slot.children = childSlots;
      if (!isCompound) slot.compositionType = 'compound';
    }
  }

  return slot;
}

// ── Helpers ──

function getJSXTagName(node: any): string {
  if (node.type === 'JSXFragment') return 'fragment';

  const name = node.opening?.name;
  if (!name) return 'unknown';

  // Simple tag: <div>, <Button>
  if (name.type === 'Identifier') return name.value;

  // Member expression: <Select.Root>
  if (name.type === 'JSXMemberExpression') {
    const obj = name.object?.value || '';
    const prop = name.property?.value || '';
    return `${obj}.${prop}`;
  }

  return 'unknown';
}

function extractConditionName(expr: any): string | null {
  if (!expr) return null;
  if (expr.type === 'Identifier') return expr.value;
  // member expression: obj.field
  if (expr.type === 'MemberExpression') {
    const obj = expr.object?.value || '';
    const prop = expr.property?.value || '';
    return `${obj}.${prop}`;
  }
  // Unary not: !isValid
  if (expr.type === 'UnaryExpression' && expr.operator === '!') {
    const inner = extractConditionName(expr.argument);
    return inner ? `!${inner}` : null;
  }
  return null;
}

function findJSXInExpression(expr: any): any | null {
  if (!expr) return null;
  if (expr.type === 'JSXElement' || expr.type === 'JSXFragment') return expr;
  if (expr.type === 'ParenthesisExpression') return findJSXInExpression(expr.expression);
  return null;
}

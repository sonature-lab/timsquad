/**
 * In-Memory Meta Index Cache + IPC Server
 * 메타인덱스를 인메모리로 유지하고, Unix domain socket으로 쿼리 제공.
 * PM은 IPC로 쿼리하고, 서브에이전트는 task-context.json을 읽는다.
 */

import path from 'path';
import net from 'net';
import fs from 'fs-extra';
import { getMetaIndexDir } from '../lib/meta-index.js';
import type { ModuleIndex } from '../types/meta-index.js';

export interface SearchResult {
  path: string;
  line: number;
  type: 'class' | 'method' | 'interface' | 'function' | 'file';
  name: string;
  signature?: string;
  module: string;
}

export interface ScopedContext {
  index_version: string;
  files: Record<string, ScopedFileEntry>;
}

interface ScopedFileEntry {
  classes?: Array<{ name: string; line: number; methods: Array<{ name: string; line: number; params: string; returns: string }> }>;
  interfaces?: Array<{ name: string; line: number }>;
  functions?: Array<{ name: string; line: number; params: string; returns: string }>;
  imports: string[];
  exports: string[];
}

export class MetaCache {
  private modules: Record<string, ModuleIndex> = {};
  private socketPath: string;
  private server: net.Server | null = null;
  private projectRoot: string;
  private loadedAt = '';
  public totalFiles = 0;
  public totalMethods = 0;
  public onNotify: ((event: string, params: Record<string, unknown>) => void) | null = null;

  constructor(projectRoot: string) {
    this.projectRoot = projectRoot;
    this.socketPath = path.join(projectRoot, '.timsquad', '.daemon.sock');
  }

  async load(): Promise<void> {
    const metaDir = getMetaIndexDir(this.projectRoot);
    if (!await fs.pathExists(metaDir)) return;

    const files = await fs.readdir(metaDir);
    const jsonFiles = files.filter(f => f.endsWith('.json') && f !== 'summary.json');

    this.modules = {};
    this.totalFiles = 0;
    this.totalMethods = 0;

    for (const file of jsonFiles) {
      try {
        const data: ModuleIndex = await fs.readJson(path.join(metaDir, file));
        const name = file.replace('.json', '');
        this.modules[name] = data;
        const entries = Object.values(data.files || {});
        this.totalFiles += entries.length;
        this.totalMethods += entries.reduce((sum, f) =>
          sum + Object.keys(f.mechanical?.methods || {}).length, 0);
      } catch {
        // skip malformed
      }
    }

    this.loadedAt = new Date().toISOString();
  }

  find(keyword: string): SearchResult[] {
    const results: SearchResult[] = [];
    const lower = keyword.toLowerCase();

    for (const [moduleName, mod] of Object.entries(this.modules)) {
      for (const [, entry] of Object.entries(mod.files || {})) {
        const filePath = entry.path;

        // 파일명 매칭
        if (path.basename(filePath).toLowerCase().includes(lower)) {
          results.push({ path: filePath, line: 1, type: 'file', name: path.basename(filePath), module: moduleName });
        }

        // 클래스 매칭
        for (const cls of entry.mechanical?.classes || []) {
          if (cls.toLowerCase().includes(lower)) {
            results.push({ path: filePath, line: 1, type: 'class', name: cls, module: moduleName });
          }
        }

        // 인터페이스 매칭
        for (const iface of entry.mechanical?.interfaces || []) {
          if (iface.toLowerCase().includes(lower)) {
            results.push({ path: filePath, line: 1, type: 'interface', name: iface, module: moduleName });
          }
        }

        // 메서드 매칭
        for (const [methodName, method] of Object.entries(entry.mechanical?.methods || {})) {
          if (methodName.toLowerCase().includes(lower)) {
            const m = method.mechanical;
            const sig = `(${m.params.join(', ')}): ${m.returnType}`;
            results.push({
              path: filePath,
              line: m.startLine,
              type: m.isAsync ? 'function' : 'method',
              name: methodName,
              signature: sig,
              module: moduleName,
            });
          }
        }
      }
    }

    return results;
  }

  filterByScope(scope: string[]): ScopedContext {
    const context: ScopedContext = {
      index_version: this.loadedAt,
      files: {},
    };

    for (const mod of Object.values(this.modules)) {
      for (const [, entry] of Object.entries(mod.files || {})) {
        const filePath = entry.path;
        const matches = scope.some(s => filePath.startsWith(s) || filePath.includes(s));
        if (!matches) continue;

        const scoped: ScopedFileEntry = {
          imports: (entry.mechanical?.imports || []).map(i => i.module),
          exports: entry.mechanical?.exports || [],
        };

        // 클래스 + 메서드
        if (entry.mechanical?.classes?.length) {
          scoped.classes = entry.mechanical.classes.map(cls => ({
            name: cls,
            line: 1,
            methods: Object.entries(entry.mechanical.methods || {})
              .map(([name, m]) => ({
                name,
                line: m.mechanical.startLine,
                params: `(${m.mechanical.params.join(', ')})`,
                returns: m.mechanical.returnType,
              })),
          }));
        }

        // 인터페이스
        if (entry.mechanical?.interfaces?.length) {
          scoped.interfaces = entry.mechanical.interfaces.map(name => ({ name, line: 1 }));
        }

        // 독립 함수 (클래스 없는 메서드)
        if (!entry.mechanical?.classes?.length && Object.keys(entry.mechanical?.methods || {}).length) {
          scoped.functions = Object.entries(entry.mechanical.methods || {}).map(([name, m]) => ({
            name,
            line: m.mechanical.startLine,
            params: `(${m.mechanical.params.join(', ')})`,
            returns: m.mechanical.returnType,
          }));
        }

        context.files[filePath] = scoped;
      }
    }

    return context;
  }

  updateFiles(_changedPaths: string[]): void {
    // 변경된 파일 마킹 — 실제 AST 재파싱은 flushToDisk 시 일괄 처리
    // (인메모리 업데이트는 IPC 응답 정확도를 위해 향후 추가 가능)
  }

  async flushToDisk(): Promise<void> {
    const metaDir = getMetaIndexDir(this.projectRoot);
    if (!await fs.pathExists(metaDir)) return;

    for (const [name, mod] of Object.entries(this.modules)) {
      try {
        await fs.writeJson(path.join(metaDir, `${name}.json`), mod, { spaces: 2 });
      } catch {
        // skip
      }
    }
  }

  // ── IPC Server ──

  startIPC(): void {
    // 이전 소켓 정리
    try { fs.removeSync(this.socketPath); } catch { /* ok */ }

    this.server = net.createServer((conn) => {
      let data = '';
      conn.on('data', (chunk) => {
        data += chunk.toString();
        // 줄바꿈 단위로 메시지 처리
        const lines = data.split('\n');
        data = lines.pop() || '';
        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const req = JSON.parse(line);
            const res = this.handleRequest(req);
            conn.write(JSON.stringify(res) + '\n');
          } catch {
            conn.write(JSON.stringify({ error: 'invalid request' }) + '\n');
          }
        }
      });
    });

    this.server.listen(this.socketPath);
  }

  stopIPC(): void {
    if (this.server) {
      this.server.close();
      this.server = null;
    }
    try { fs.removeSync(this.socketPath); } catch { /* ok */ }
  }

  private handleRequest(req: { method: string; params?: Record<string, unknown> }): unknown {
    switch (req.method) {
      case 'find': {
        const keyword = String(req.params?.keyword || '');
        return { results: this.find(keyword) };
      }
      case 'scope': {
        const paths = (req.params?.paths as string[]) || [];
        return { context: this.filterByScope(paths) };
      }
      case 'notify': {
        const event = String(req.params?.event || '');
        if (this.onNotify) {
          this.onNotify(event, req.params || {});
        }
        return { ok: true, event };
      }
      case 'status':
        return {
          loadedAt: this.loadedAt,
          totalFiles: this.totalFiles,
          totalMethods: this.totalMethods,
          modules: Object.keys(this.modules),
          mode: this.onNotify ? 'hook-based' : 'jsonl',
        };
      default:
        return { error: `unknown method: ${req.method}` };
    }
  }
}

// ── IPC Client Helper ──

export async function queryDaemon(
  projectRoot: string,
  method: string,
  params: Record<string, unknown> = {},
): Promise<unknown> {
  const socketPath = path.join(projectRoot, '.timsquad', '.daemon.sock');

  return new Promise((resolve, reject) => {
    const client = net.createConnection(socketPath, () => {
      client.write(JSON.stringify({ method, params }) + '\n');
    });

    let data = '';
    client.on('data', (chunk) => {
      data += chunk.toString();
      if (data.includes('\n')) {
        try {
          resolve(JSON.parse(data.trim()));
        } catch {
          reject(new Error('Invalid daemon response'));
        }
        client.end();
      }
    });

    client.on('error', (err) => reject(err));
    client.setTimeout(5000, () => {
      client.destroy();
      reject(new Error('Daemon query timeout'));
    });
  });
}

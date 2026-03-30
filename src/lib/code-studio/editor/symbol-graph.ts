// ============================================================
// Code Studio — Symbol Dependency Graph
// ============================================================
// import/export 그래프 구축, 순환 의존성 탐지, 연결 시각화.

import type { FileNode } from '../../code-studio-types';

// ============================================================
// PART 1 — Types
// ============================================================

export interface GraphNode {
  id: string;       // file path
  name: string;     // file name
  imports: string[]; // paths this file imports from
  exports: string[]; // exported symbol names
  depth: number;
}

export interface GraphEdge {
  from: string;
  to: string;
  symbols: string[];
}

export interface DependencyGraph {
  nodes: Map<string, GraphNode>;
  edges: GraphEdge[];
  circularDeps: string[][];
}

// IDENTITY_SEAL: PART-1 | role=Types | inputs=none | outputs=GraphNode,GraphEdge,DependencyGraph

// ============================================================
// PART 2 — Graph Construction
// ============================================================

const IMPORT_PATTERN = /import\s+(?:type\s+)?(?:\{([^}]*)\}|(\w+)(?:\s*,\s*\{([^}]*)\})?)\s+from\s+['"]([^'"]+)['"]/g;
const EXPORT_PATTERN = /export\s+(?:type\s+)?(?:const|let|var|function|class|interface|enum|default)\s+(\w+)/g;

/** Extract import/export info from file content */
function analyzeFile(content: string): { imports: Array<{ source: string; symbols: string[] }>; exports: string[] } {
  const imports: Array<{ source: string; symbols: string[] }> = [];
  const exports: string[] = [];

  // Parse imports
  let m: RegExpExecArray | null;
  const importRe = new RegExp(IMPORT_PATTERN.source, 'g');
  while ((m = importRe.exec(content)) !== null) {
    const namedBlock = m[1] || m[3] || '';
    const defaultImport = m[2] || '';
    const source = m[4];
    const symbols: string[] = [];

    if (defaultImport) symbols.push(defaultImport);
    if (namedBlock) {
      for (const s of namedBlock.split(',')) {
        const name = s.trim().split(/\s+as\s+/).pop()?.trim();
        if (name) symbols.push(name);
      }
    }

    imports.push({ source, symbols });
  }

  // Parse exports
  const exportRe = new RegExp(EXPORT_PATTERN.source, 'g');
  while ((m = exportRe.exec(content)) !== null) {
    exports.push(m[1]);
  }

  // Also check re-exports: export { ... } from '...'
  const reExportRe = /export\s+\{([^}]*)\}\s+from/g;
  while ((m = reExportRe.exec(content)) !== null) {
    for (const s of m[1].split(',')) {
      const name = s.trim().split(/\s+as\s+/).pop()?.trim();
      if (name) exports.push(name);
    }
  }

  return { imports, exports };
}

/** Resolve a relative import path to an absolute-ish path */
function resolveImport(currentPath: string, importSource: string): string {
  // Skip node_modules / external
  if (!importSource.startsWith('.') && !importSource.startsWith('@/')) {
    return importSource;
  }

  if (importSource.startsWith('@/')) {
    return importSource.slice(2);
  }

  const currentDir = currentPath.split('/').slice(0, -1);
  const parts = importSource.split('/');

  for (const part of parts) {
    if (part === '..') currentDir.pop();
    else if (part !== '.') currentDir.push(part);
  }

  return currentDir.join('/');
}

/** Build dependency graph from file tree */
export function buildDependencyGraph(nodes: FileNode[], prefix = ''): DependencyGraph {
  const graph: DependencyGraph = { nodes: new Map(), edges: [], circularDeps: [] };
  const files: Array<{ path: string; content: string; name: string }> = [];

  // Flatten tree
  function flatten(nodeList: FileNode[], pfx: string): void {
    for (const node of nodeList) {
      const path = pfx ? `${pfx}/${node.name}` : node.name;
      if (node.type === 'file' && node.content && /\.(ts|tsx|js|jsx)$/.test(node.name)) {
        files.push({ path, content: node.content, name: node.name });
      }
      if (node.children) flatten(node.children, path);
    }
  }
  flatten(nodes, prefix);

  // Analyze each file
  for (const file of files) {
    const { imports, exports } = analyzeFile(file.content);
    const importPaths = imports.map(i => resolveImport(file.path, i.source));

    graph.nodes.set(file.path, {
      id: file.path,
      name: file.name,
      imports: importPaths,
      exports,
      depth: 0,
    });

    for (const imp of imports) {
      const resolved = resolveImport(file.path, imp.source);
      graph.edges.push({ from: file.path, to: resolved, symbols: imp.symbols });
    }
  }

  // Detect circular dependencies
  graph.circularDeps = detectCircularDeps(graph);

  return graph;
}

// IDENTITY_SEAL: PART-2 | role=GraphConstruction | inputs=FileNode[] | outputs=DependencyGraph

// ============================================================
// PART 3 — Circular Dependency Detection
// ============================================================

function detectCircularDeps(graph: DependencyGraph): string[][] {
  const cycles: string[][] = [];
  const visited = new Set<string>();
  const stack = new Set<string>();
  const path: string[] = [];

  function dfs(nodeId: string): void {
    if (stack.has(nodeId)) {
      const cycleStart = path.indexOf(nodeId);
      if (cycleStart >= 0) {
        cycles.push([...path.slice(cycleStart), nodeId]);
      }
      return;
    }
    if (visited.has(nodeId)) return;

    visited.add(nodeId);
    stack.add(nodeId);
    path.push(nodeId);

    const node = graph.nodes.get(nodeId);
    if (node) {
      for (const imp of node.imports) {
        // Only follow internal imports
        if (graph.nodes.has(imp)) {
          dfs(imp);
        }
        // Try with common extensions
        for (const ext of ['', '.ts', '.tsx', '.js', '.jsx', '/index.ts', '/index.tsx']) {
          if (graph.nodes.has(imp + ext)) {
            dfs(imp + ext);
            break;
          }
        }
      }
    }

    path.pop();
    stack.delete(nodeId);
  }

  for (const nodeId of graph.nodes.keys()) {
    dfs(nodeId);
  }

  // Deduplicate cycles
  const seen = new Set<string>();
  return cycles.filter(cycle => {
    const key = [...cycle].sort().join('|');
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/** Get all files that depend on a given file (reverse dependencies) */
export function getReverseDeps(graph: DependencyGraph, filePath: string): string[] {
  return graph.edges
    .filter(e => e.to === filePath || e.to.startsWith(filePath))
    .map(e => e.from);
}

/** Get dependency depth (longest chain from leaf) */
export function computeDepths(graph: DependencyGraph): Map<string, number> {
  const depths = new Map<string, number>();
  const computing = new Set<string>();

  function getDepth(nodeId: string): number {
    if (depths.has(nodeId)) return depths.get(nodeId)!;
    if (computing.has(nodeId)) return 0; // break cycles
    computing.add(nodeId);

    const node = graph.nodes.get(nodeId);
    let maxDep = 0;
    if (node) {
      for (const imp of node.imports) {
        if (graph.nodes.has(imp)) {
          maxDep = Math.max(maxDep, getDepth(imp) + 1);
        }
      }
    }

    depths.set(nodeId, maxDep);
    computing.delete(nodeId);
    return maxDep;
  }

  for (const nodeId of graph.nodes.keys()) {
    getDepth(nodeId);
  }

  return depths;
}

// IDENTITY_SEAL: PART-3 | role=CircularDetection | inputs=DependencyGraph | outputs=string[][],Map

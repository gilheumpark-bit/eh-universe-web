/**
 * dependency-analyzer.ts — Import graph builder + topological sort
 *
 * Analyzes file dependencies to determine safe modification order
 * for multi-file composition.
 */

// ============================================================
// PART 1 — Types
// ============================================================

export interface FileGraph {
  nodes: Set<string>;
  edges: Map<string, Set<string>>; // fileId -> set of fileIds it imports
}

export interface ChangeScope {
  primaryFiles: string[];
  dependentFiles: string[];
  executionOrder: string[];
}

// ============================================================
// PART 2 — Import extraction
// ============================================================

const IMPORT_RE = /(?:import\s+.*?from\s+['"]([^'"]+)['"]|require\s*\(\s*['"]([^'"]+)['"]\s*\))/g;

function extractImports(content: string): string[] {
  const imports: string[] = [];
  let m: RegExpExecArray | null;
  const re = new RegExp(IMPORT_RE.source, 'g');
  while ((m = re.exec(content)) !== null) {
    const path = m[1] || m[2];
    if (path && !path.startsWith('node_modules') && (path.startsWith('.') || path.startsWith('@/'))) {
      imports.push(path);
    }
  }
  return imports;
}

function resolveImportToFileId(
  importPath: string,
  sourceFileId: string,
  allFileIds: Map<string, string>, // fileName -> fileId
): string | null {
  // Normalize: @/lib/foo -> lib/foo, ./foo -> resolve relative
  const normalized = importPath
    .replace(/^@\//, '')
    .replace(/\.(ts|tsx|js|jsx)$/, '');

  const baseName = normalized.split('/').pop() ?? '';

  // Try exact match, then with extensions
  for (const [fileName, fileId] of allFileIds) {
    const nameWithout = fileName.replace(/\.(ts|tsx|js|jsx)$/, '');
    if (nameWithout === baseName || nameWithout.endsWith('/' + baseName) || fileName === importPath) {
      if (fileId !== sourceFileId) return fileId;
    }
  }
  return null;
}

// ============================================================
// PART 3 — Graph builder
// ============================================================

export function buildFileGraph(
  fileIds: string[],
  getContent: (id: string) => string | null,
  getFileName: (id: string) => string,
): FileGraph {
  const nodes = new Set(fileIds);
  const edges = new Map<string, Set<string>>();
  const nameToId = new Map<string, string>();

  for (const id of fileIds) {
    nameToId.set(getFileName(id), id);
  }

  for (const id of fileIds) {
    const content = getContent(id);
    if (!content) { edges.set(id, new Set()); continue; }

    const imports = extractImports(content);
    const deps = new Set<string>();

    for (const imp of imports) {
      const targetId = resolveImportToFileId(imp, id, nameToId);
      if (targetId && nodes.has(targetId)) {
        deps.add(targetId);
      }
    }

    edges.set(id, deps);
  }

  return { nodes, edges };
}

// ============================================================
// PART 4 — Topological sort (Kahn's algorithm)
// ============================================================

export function topologicalSort(graph: FileGraph): string[] {
  const inDegree = new Map<string, number>();
  for (const node of graph.nodes) inDegree.set(node, 0);

  for (const [, deps] of graph.edges) {
    for (const dep of deps) {
      inDegree.set(dep, (inDegree.get(dep) ?? 0) + 1);
    }
  }

  const queue: string[] = [];
  for (const [node, deg] of inDegree) {
    if (deg === 0) queue.push(node);
  }

  const sorted: string[] = [];
  while (queue.length > 0) {
    const node = queue.shift()!;
    sorted.push(node);
    const deps = graph.edges.get(node) ?? new Set();
    for (const dep of deps) {
      const newDeg = (inDegree.get(dep) ?? 1) - 1;
      inDegree.set(dep, newDeg);
      if (newDeg === 0) queue.push(dep);
    }
  }

  // If cycle detected, append remaining nodes (no hard failure)
  for (const node of graph.nodes) {
    if (!sorted.includes(node)) sorted.push(node);
  }

  return sorted;
}

// ============================================================
// PART 5 — Change scope resolution
// ============================================================

export function resolveChangeScope(
  graph: FileGraph,
  targetFileIds: string[],
): ChangeScope {
  const primarySet = new Set(targetFileIds);
  const dependentSet = new Set<string>();

  // Find files that import any primary file (reverse dependency)
  for (const [fileId, deps] of graph.edges) {
    if (primarySet.has(fileId)) continue;
    for (const dep of deps) {
      if (primarySet.has(dep)) {
        dependentSet.add(fileId);
        break;
      }
    }
  }

  const allAffected = [...targetFileIds, ...dependentSet];
  const subGraph: FileGraph = {
    nodes: new Set(allAffected),
    edges: new Map(),
  };
  for (const id of allAffected) {
    const deps = graph.edges.get(id) ?? new Set();
    const filtered = new Set([...deps].filter((d) => subGraph.nodes.has(d)));
    subGraph.edges.set(id, filtered);
  }

  return {
    primaryFiles: targetFileIds,
    dependentFiles: [...dependentSet],
    executionOrder: topologicalSort(subGraph),
  };
}

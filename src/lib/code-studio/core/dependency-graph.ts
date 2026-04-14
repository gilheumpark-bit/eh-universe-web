// ============================================================
// PART 1 — Types
// ============================================================

export interface GraphNode {
  id: string;
  imports: string[];
  importedBy: string[];
}

export interface CycleInfo {
  nodes: string[];
}

export interface DependencyGraphResult {
  nodes: Map<string, GraphNode>;
  edges: Array<{ source: string; target: string }>;
  cycles: CycleInfo[];
  topologicalOrder: string[];
  orphanFiles: string[];
  stats: {
    totalFiles: number;
    totalEdges: number;
    totalCycles: number;
    maxDepth: number;
  };
}

// ============================================================
// PART 2 — Import Parser
// ============================================================

/**
 * Pre-compiled patterns for all supported import/require/export forms.
 * Each captures the module specifier in group 1.
 */
const STATIC_IMPORT_RE =
  /import\s+(?:[\w*{}\s,]+\s+from\s+)?['"]([^'"]+)['"]/g;

const DYNAMIC_IMPORT_RE = /import\(\s*['"]([^'"]+)['"]\s*\)/g;

const REQUIRE_RE =
  /(?:require\(\s*['"]([^'"]+)['"]\s*\))/g;

const EXPORT_FROM_RE =
  /export\s+(?:\{[^}]*\}|\*)\s+from\s+['"]([^'"]+)['"]/g;

/**
 * Returns true when the specifier is a local/aliased path
 * that should be tracked (starts with ./, ../, or @/).
 */
function isLocalSpecifier(specifier: string): boolean {
  return (
    specifier.startsWith('./') ||
    specifier.startsWith('../') ||
    specifier.startsWith('@/')
  );
}

/**
 * Parse all import/require/export-from specifiers from source text.
 * Only returns local or @/-aliased specifiers; bare specifiers
 * (e.g. 'react', 'next/router', 'lodash') are excluded.
 */
export function parseImports(content: string): string[] {
  const specifiers: Set<string> = new Set();

  const patterns = [
    STATIC_IMPORT_RE,
    DYNAMIC_IMPORT_RE,
    REQUIRE_RE,
    EXPORT_FROM_RE,
  ];

  for (const pattern of patterns) {
    pattern.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(content)) !== null) {
      const specifier = match[1];
      if (specifier && isLocalSpecifier(specifier)) {
        specifiers.add(specifier);
      }
    }
  }

  return Array.from(specifiers);
}

// ============================================================
// PART 3 — Path Resolver & Graph Builder
// ============================================================

const EXTENSIONS = ['.ts', '.tsx', '.js', '.jsx'];
const INDEX_FILES = ['/index.ts', '/index.tsx', '/index.js', '/index.jsx'];

/**
 * Normalize a POSIX-style path: collapse `.`, `..`, and duplicate `/`.
 */
function normalizePath(p: string): string {
  const parts = p.split('/');
  const stack: string[] = [];

  for (const part of parts) {
    if (part === '' || part === '.') continue;
    if (part === '..') {
      stack.pop();
    } else {
      stack.push(part);
    }
  }

  const result = stack.join('/');
  return p.startsWith('/') ? '/' + result : result;
}

/**
 * Derive the directory portion of a file path.
 */
function dirname(filePath: string): string {
  const idx = filePath.lastIndexOf('/');
  return idx === -1 ? '' : filePath.slice(0, idx);
}

/**
 * Resolve a raw import specifier to a concrete path present in knownPaths.
 *
 * @param fromFile - The file that contains the import statement.
 * @param specifier - The raw specifier string (e.g. './utils', '@/lib/foo').
 * @param knownPaths - All file paths in the project.
 * @returns The resolved path or null when no match is found.
 */
export function resolveImport(
  fromFile: string,
  specifier: string,
  knownPaths: Set<string>,
): string | null {
  let base: string;

  if (specifier.startsWith('@/')) {
    base = specifier.slice(2); // strip @/
  } else {
    base = normalizePath(dirname(fromFile) + '/' + specifier);
  }

  // Exact match (already has extension)
  if (knownPaths.has(base)) return base;

  // Try appending each extension
  for (const ext of EXTENSIONS) {
    const candidate = base + ext;
    if (knownPaths.has(candidate)) return candidate;
  }

  // Try index files (specifier points to a directory)
  for (const idx of INDEX_FILES) {
    const candidate = base + idx;
    if (knownPaths.has(candidate)) return candidate;
  }

  return null;
}

/**
 * Compute max depth from root nodes via BFS.
 * Root nodes are those with no incoming edges (importedBy is empty).
 */
function computeMaxDepth(
  nodeMap: Map<string, GraphNode>,
): number {
  const roots: string[] = [];
  nodeMap.forEach((node, id) => {
    if (node.importedBy.length === 0) {
      roots.push(id);
    }
  });

  if (roots.length === 0) return 0;

  let maxDepth = 0;
  const visited = new Set<string>();
  const queue: Array<{ id: string; depth: number }> = roots.map((id) => ({
    id,
    depth: 0,
  }));

  while (queue.length > 0) {
    const { id, depth } = queue.shift()!;

    if (visited.has(id)) continue;
    visited.add(id);

    if (depth > maxDepth) maxDepth = depth;

    const node = nodeMap.get(id);
    if (node) {
      for (const dep of node.imports) {
        if (!visited.has(dep)) {
          queue.push({ id: dep, depth: depth + 1 });
        }
      }
    }
  }

  return maxDepth;
}

/**
 * Build the full dependency graph from a map of file paths to contents.
 */
export function buildDependencyGraph(
  files: Record<string, string>,
): DependencyGraphResult {
  const knownPaths = new Set<string>(Object.keys(files));
  const nodeMap = new Map<string, GraphNode>();
  const edges: Array<{ source: string; target: string }> = [];

  // Initialize nodes
  const pathArray = Array.from(knownPaths);
  for (const filePath of pathArray) {
    nodeMap.set(filePath, {
      id: filePath,
      imports: [],
      importedBy: [],
    });
  }

  // Parse imports, resolve, and build edges
  for (const [filePath, content] of Object.entries(files)) {
    const specifiers = parseImports(content);
    const sourceNode = nodeMap.get(filePath)!;

    for (const specifier of specifiers) {
      const resolved = resolveImport(filePath, specifier, knownPaths);
      if (resolved === null) continue;
      if (resolved === filePath) continue; // skip self-import

      if (!sourceNode.imports.includes(resolved)) {
        sourceNode.imports.push(resolved);
      }

      const targetNode = nodeMap.get(resolved);
      if (targetNode && !targetNode.importedBy.includes(filePath)) {
        targetNode.importedBy.push(filePath);
      }

      edges.push({ source: filePath, target: resolved });
    }
  }

  // Cycle detection
  const allNodes = Array.from(knownPaths);
  const cycles = detectCycles(allNodes, edges);

  // Topological sort
  const topologicalOrder = topologicalSort(allNodes, edges);

  // Orphan files: no imports AND nobody imports them
  const orphanFiles: string[] = [];
  nodeMap.forEach((node, id) => {
    if (node.imports.length === 0 && node.importedBy.length === 0) {
      orphanFiles.push(id);
    }
  });

  // Max depth via BFS from root nodes
  const maxDepth = computeMaxDepth(nodeMap);

  return {
    nodes: nodeMap,
    edges,
    cycles,
    topologicalOrder,
    orphanFiles,
    stats: {
      totalFiles: knownPaths.size,
      totalEdges: edges.length,
      totalCycles: cycles.length,
      maxDepth,
    },
  };
}

// ============================================================
// PART 4 — Cycle Detector (DFS)
// ============================================================

const enum DfsColor {
  White = 0,
  Gray = 1,
  Black = 2,
}

/**
 * Detect all cycles in a directed graph using DFS coloring.
 *
 * @param nodes - All node identifiers.
 * @param edges - Directed edges (source -> target).
 * @returns Array of CycleInfo, each containing the ordered cycle path.
 */
export function detectCycles(
  nodes: string[],
  edges: Array<{ source: string; target: string }>,
): CycleInfo[] {
  const adjacency = new Map<string, string[]>();
  for (const node of nodes) {
    adjacency.set(node, []);
  }
  for (const { source, target } of edges) {
    adjacency.get(source)?.push(target);
  }

  const color = new Map<string, DfsColor>();
  for (const node of nodes) {
    color.set(node, DfsColor.White);
  }

  const cycles: CycleInfo[] = [];
  const stack: string[] = [];

  // Deduplicate cycles by their sorted canonical form
  const seenCycles = new Set<string>();

  function dfs(node: string): void {
    color.set(node, DfsColor.Gray);
    stack.push(node);

    const neighbors = adjacency.get(node) ?? [];
    for (const neighbor of neighbors) {
      const neighborColor = color.get(neighbor);

      if (neighborColor === DfsColor.Gray) {
        // Back edge found: extract cycle from stack
        const cycleStart = stack.indexOf(neighbor);
        if (cycleStart !== -1) {
          const cyclePath = stack.slice(cycleStart);
          const canonical = [...cyclePath].sort().join('|');
          if (!seenCycles.has(canonical)) {
            seenCycles.add(canonical);
            cycles.push({ nodes: cyclePath });
          }
        }
      } else if (neighborColor === DfsColor.White) {
        dfs(neighbor);
      }
    }

    stack.pop();
    color.set(node, DfsColor.Black);
  }

  for (const node of nodes) {
    if (color.get(node) === DfsColor.White) {
      dfs(node);
    }
  }

  return cycles;
}

// ============================================================
// PART 5 — Topological Sort (Kahn's Algorithm)
// ============================================================

/**
 * Compute a topological ordering using Kahn's algorithm.
 *
 * When cycles exist the algorithm cannot process every node;
 * the returned list is a partial order containing only the
 * cycle-free portion of the graph.
 *
 * @param nodes - All node identifiers.
 * @param edges - Directed edges (source -> target).
 * @returns Topologically sorted node list (partial if cycles exist).
 */
export function topologicalSort(
  nodes: string[],
  edges: Array<{ source: string; target: string }>,
): string[] {
  const inDegree = new Map<string, number>();
  const adjacency = new Map<string, string[]>();

  for (const node of nodes) {
    inDegree.set(node, 0);
    adjacency.set(node, []);
  }

  for (const { source, target } of edges) {
    adjacency.get(source)?.push(target);
    inDegree.set(target, (inDegree.get(target) ?? 0) + 1);
  }

  // Seed queue with zero in-degree nodes
  const queue: string[] = [];
  for (const node of nodes) {
    if (inDegree.get(node) === 0) {
      queue.push(node);
    }
  }

  const result: string[] = [];

  while (queue.length > 0) {
    const current = queue.shift()!;
    result.push(current);

    const neighbors = adjacency.get(current) ?? [];
    for (const neighbor of neighbors) {
      const deg = (inDegree.get(neighbor) ?? 1) - 1;
      inDegree.set(neighbor, deg);
      if (deg === 0) {
        queue.push(neighbor);
      }
    }
  }

  return result;
}

// IDENTITY_SEAL: dependency-graph | role=import-analysis-engine | inputs=files | outputs=DependencyGraphResult

// ============================================================
// CS Quill 🦔 — Control Flow Graph (CFG) Engine
// ============================================================
// AST에서 제어 흐름 그래프 추출.
// AI에게 파일 전체가 아닌 "실행 경로만" 잘라서 주입.

// ============================================================
// PART 1 — Types
// ============================================================

export interface CFGNode {
  id: string;
  type: 'entry' | 'exit' | 'statement' | 'branch' | 'loop' | 'try' | 'catch' | 'return' | 'throw' | 'call';
  line: number;
  code: string;
  edges: string[];
  variables: { defined: string[]; used: string[]; modified: string[] };
}

export interface CFGGraph {
  nodes: Map<string, CFGNode>;
  entry: string;
  exits: string[];
  functions: Array<{ name: string; startNode: string; endNode: string; params: string[]; returnType?: string }>;
}

export interface ExecutionPath {
  nodes: CFGNode[];
  variables: Map<string, VariableState>;
  risk: 'safe' | 'nullable' | 'tainted' | 'uninitialized';
  description: string;
}

export interface VariableState {
  name: string;
  definedAt: number;
  lastModifiedAt: number;
  nullable: boolean;
  tainted: boolean;
  source?: string;
}

// IDENTITY_SEAL: PART-1 | role=types | inputs=none | outputs=CFGNode,CFGGraph,ExecutionPath

// ============================================================
// PART 2 — CFG Builder (코드 → 그래프)
// ============================================================

let nodeCounter = 0;
function newNodeId(): string { return `n${++nodeCounter}`; }

export function buildCFG(code: string, fileName: string): CFGGraph {
  nodeCounter = 0;
  const nodes = new Map<string, CFGNode>();
  const lines = code.split('\n');
  const exits: string[] = [];

  const entryId = newNodeId();
  nodes.set(entryId, {
    id: entryId, type: 'entry', line: 0, code: `// entry: ${fileName}`,
    edges: [], variables: { defined: [], used: [], modified: [] },
  });

  let prevId = entryId;
  const scopeStack: Array<{ type: string; nodeId: string; line: number }> = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('//') || trimmed.startsWith('*') || trimmed.startsWith('import ')) continue;

    const nodeId = newNodeId();
    const node: CFGNode = {
      id: nodeId, type: 'statement', line: i + 1,
      code: trimmed.slice(0, 120),
      edges: [], variables: extractVariables(trimmed),
    };

    // Determine node type
    if (/^(?:if|else\s+if)\s*\(/.test(trimmed)) {
      node.type = 'branch';
    } else if (/^(?:for|while|do)\s*[\({]/.test(trimmed) || /\.forEach\(|\.map\(|\.filter\(/.test(trimmed)) {
      node.type = 'loop';
      scopeStack.push({ type: 'loop', nodeId, line: i + 1 });
    } else if (/^switch\s*\(/.test(trimmed)) {
      node.type = 'branch';
      scopeStack.push({ type: 'switch', nodeId, line: i + 1 });
    } else if (/^case\s|^default\s*:/.test(trimmed)) {
      node.type = 'branch';
      // Connect switch head → case
      const switchScope = scopeStack.find(s => s.type === 'switch');
      if (switchScope) {
        const switchNode = nodes.get(switchScope.nodeId);
        if (switchNode) switchNode.edges.push(nodeId);
      }
    } else if (/^try\s*\{/.test(trimmed)) {
      node.type = 'try';
      scopeStack.push({ type: 'try', nodeId, line: i + 1 });
    } else if (/^catch\s*[\({]/.test(trimmed)) {
      node.type = 'catch';
      // Connect try → catch (exceptional edge)
      const tryScope = scopeStack.find(s => s.type === 'try');
      if (tryScope) {
        const tryNode = nodes.get(tryScope.nodeId);
        if (tryNode) tryNode.edges.push(nodeId);
      }
    } else if (/^finally\s*\{/.test(trimmed)) {
      node.type = 'statement'; // finally always executes
      // Connect both try and catch → finally
      const tryScope = scopeStack.find(s => s.type === 'try');
      if (tryScope) {
        const tryNode = nodes.get(tryScope.nodeId);
        if (tryNode) tryNode.edges.push(nodeId);
      }
    } else if (/^return\b/.test(trimmed)) {
      node.type = 'return';
      exits.push(nodeId);
    } else if (/^throw\b/.test(trimmed)) {
      node.type = 'throw';
    } else if (/await\s|\.then\(|\bfetch\(|\.query\(|\.exec\(/.test(trimmed)) {
      node.type = 'call';
    }

    // Connect edge from previous node
    const prevNode = nodes.get(prevId);
    if (prevNode && prevNode.type !== 'return' && prevNode.type !== 'throw') {
      prevNode.edges.push(nodeId);
    }

    // Branch: also connect to next non-branch (else/endif)
    if (node.type === 'branch') {
      // Will connect to both true and false branches
      scopeStack.push({ type: 'branch', nodeId, line: i + 1 });
    }

    // Closing brace: pop scope
    if (trimmed === '}' || trimmed === '};') {
      const scope = scopeStack.pop();
      if (scope) {
        if (scope.type === 'loop') {
          node.edges.push(scope.nodeId); // back edge
        } else if (scope.type === 'try') {
          // try block ended, connect to next statement
        } else if (scope.type === 'switch') {
          // switch ended, all cases converge here
        }
      }
    }

    // break statement: connect to enclosing loop/switch exit
    if (/^break\b/.test(trimmed)) {
      const enclosing = [...scopeStack].reverse().find(s => s.type === 'loop' || s.type === 'switch');
      if (enclosing) {
        // break exits the enclosing structure
        node.type = 'statement';
      }
    }

    nodes.set(nodeId, node);
    prevId = nodeId;
  }

  // Functions extraction
  const functions: CFGGraph['functions'] = [];
  const funcRegex = /(?:export\s+)?(?:async\s+)?function\s+(\w+)\s*\(([^)]*)\)/g;
  const arrowRegex = /(?:export\s+)?(?:const|let)\s+(\w+)\s*=\s*(?:async\s+)?(?:\(([^)]*)\)|(\w+))\s*=>/g;
  let match;

  while ((match = funcRegex.exec(code)) !== null) {
    const line = code.slice(0, match.index).split('\n').length;
    const params = match[2].split(',').map(p => p.trim().replace(/[:=].*/, '').replace(/\.\.\./g, '').trim()).filter(Boolean);
    functions.push({ name: match[1], startNode: `n${line}`, endNode: '', params });
  }
  while ((match = arrowRegex.exec(code)) !== null) {
    const line = code.slice(0, match.index).split('\n').length;
    const paramStr = match[2] ?? match[3] ?? '';
    const params = paramStr.split(',').map(p => p.trim().replace(/[:=].*/, '').trim()).filter(Boolean);
    functions.push({ name: match[1], startNode: `n${line}`, endNode: '', params });
  }

  return { nodes, entry: entryId, exits, functions };
}

function extractVariables(line: string): CFGNode['variables'] {
  const defined: string[] = [];
  const used: string[] = [];
  const modified: string[] = [];

  // Defined: const/let/var declarations
  const declMatch = line.match(/(?:const|let|var)\s+(\w+)/);
  if (declMatch) defined.push(declMatch[1]);

  // Destructuring
  const destructMatch = line.match(/(?:const|let|var)\s+\{([^}]+)\}/);
  if (destructMatch) {
    defined.push(...destructMatch[1].split(',').map(s => s.trim().replace(/:.*/, '').trim()).filter(Boolean));
  }

  // Modified: assignments
  const assignMatch = line.match(/(\w+)\s*(?:\+=|-=|\*=|\/=|=(?!=))/);
  if (assignMatch && !declMatch) modified.push(assignMatch[1]);

  // Used: identifiers (simplified)
  const identifiers = line.match(/\b[a-z_]\w*\b/g) ?? [];
  const keywords = new Set(['const', 'let', 'var', 'function', 'return', 'if', 'else', 'for', 'while', 'new', 'typeof', 'await', 'async', 'try', 'catch', 'throw', 'import', 'export', 'from', 'true', 'false', 'null', 'undefined']);
  for (const id of identifiers) {
    if (!keywords.has(id) && !defined.includes(id)) used.push(id);
  }

  return { defined, used, modified };
}

// IDENTITY_SEAL: PART-2 | role=cfg-builder | inputs=code | outputs=CFGGraph

// ============================================================
// PART 3 — Path Analyzer (위험 경로 추출)
// ============================================================

export function findRiskPaths(graph: CFGGraph): ExecutionPath[] {
  const paths: ExecutionPath[] = [];

  // Find nullable paths: variable from API call used without null check
  const nullableSources = new Set<string>();
  const guardedVars = new Set<string>();

  for (const [, node] of graph.nodes) {
    // Mark nullable sources
    if (node.type === 'call' && /await\s|fetch\(|\.find\(|\.querySelector|getElementById|\.get\(/.test(node.code)) {
      for (const v of node.variables.defined) {
        nullableSources.add(v);
      }
    }

    // Mark guarded variables
    if (node.type === 'branch') {
      for (const v of node.variables.used) {
        if (/!\s*\w+|===?\s*null|===?\s*undefined/.test(node.code)) {
          guardedVars.add(v);
        }
      }
    }
  }

  // Find uses of nullable vars without guards
  for (const [, node] of graph.nodes) {
    for (const v of node.variables.used) {
      if (nullableSources.has(v) && !guardedVars.has(v) && node.type === 'statement') {
        if (new RegExp(`${v}\\.\\w`).test(node.code)) {
          paths.push({
            nodes: [node],
            variables: new Map([[v, {
              name: v, definedAt: 0, lastModifiedAt: node.line,
              nullable: true, tainted: false, source: 'API call',
            }]]),
            risk: 'nullable',
            description: `${v} from API call accessed without null check at line ${node.line}`,
          });
        }
      }
    }
  }

  // Find tainted paths: user input reaching dangerous sinks
  const taintSources = new Set<string>();
  const dangerousSinks = /eval\(|innerHTML|dangerouslySetInnerHTML|\.query\(|\.exec\(|execSync|document\.write/;

  for (const [, node] of graph.nodes) {
    if (/req\.body|req\.params|req\.query|req\.headers|location\.search|document\.cookie|localStorage/.test(node.code)) {
      for (const v of node.variables.defined) taintSources.add(v);
    }
  }

  for (const [, node] of graph.nodes) {
    for (const v of node.variables.used) {
      if (taintSources.has(v) && dangerousSinks.test(node.code)) {
        paths.push({
          nodes: [node],
          variables: new Map([[v, {
            name: v, definedAt: 0, lastModifiedAt: node.line,
            nullable: false, tainted: true, source: 'user input',
          }]]),
          risk: 'tainted',
          description: `Tainted variable '${v}' reaches dangerous sink at line ${node.line}: ${node.code.slice(0, 60)}`,
        });
      }
    }
  }

  // Find uninitialized paths: variable used in branch where it might not be defined
  for (const _func of graph.functions) {
    const definedInBranch = new Set<string>();
    for (const [, node] of graph.nodes) {
      if (node.type === 'branch') {
        // Variables defined inside if/else might not exist in the other branch
        // This is a simplified check
        for (const v of node.variables.defined) definedInBranch.add(v);
      }
    }
  }

  return paths;
}

// IDENTITY_SEAL: PART-3 | role=path-analyzer | inputs=CFGGraph | outputs=ExecutionPath[]

// ============================================================
// PART 4 — Context Slicer (AI용 최소 컨텍스트 추출)
// ============================================================

export function sliceContext(code: string, graph: CFGGraph, riskPaths: ExecutionPath[]): string {
  if (riskPaths.length === 0) return '';

  const lines = code.split('\n');
  const relevantLines = new Set<number>();

  for (const path of riskPaths) {
    for (const node of path.nodes) {
      // Include the risk line + 3 lines context
      for (let l = Math.max(0, node.line - 4); l <= Math.min(lines.length - 1, node.line + 2); l++) {
        relevantLines.add(l);
      }
    }

    // Include variable definition sites
    for (const [, varState] of path.variables) {
      if (varState.definedAt > 0) {
        for (let l = Math.max(0, varState.definedAt - 2); l <= varState.definedAt + 1; l++) {
          relevantLines.add(l);
        }
      }
    }
  }

  // Include function signatures
  for (const func of graph.functions) {
    const startLine = parseInt(func.startNode.replace('n', ''), 10);
    if (!isNaN(startLine)) {
      for (let l = Math.max(0, startLine - 1); l <= startLine + 1; l++) {
        relevantLines.add(l);
      }
    }
  }

  // Build sliced output
  const sortedLines = [...relevantLines].sort((a, b) => a - b);
  const output: string[] = [];
  let lastLine = -2;

  for (const lineNum of sortedLines) {
    if (lineNum - lastLine > 1) {
      output.push('  // ... (생략)');
    }
    output.push(`${(lineNum + 1).toString().padStart(4)}| ${lines[lineNum]}`);
    lastLine = lineNum;
  }

  return output.join('\n');
}

// IDENTITY_SEAL: PART-4 | role=context-slicer | inputs=code,graph,riskPaths | outputs=string

// ============================================================
// PART 5 — AI Prompt Builder (정밀 컨텍스트 주입)
// ============================================================

export function buildCFGReviewPrompt(
  fileName: string,
  riskPaths: ExecutionPath[],
  slicedContext: string,
  graph: CFGGraph,
): string {
  const lines: string[] = [
    '[CS Quill CFG Analysis — Precision Context Injection]',
    '',
    `File: ${fileName}`,
    `Functions: ${graph.functions.map(f => `${f.name}(${f.params.join(',')})`).join(', ')}`,
    `Risk paths found: ${riskPaths.length}`,
    '',
  ];

  // Risk summary
  for (const [i, path] of riskPaths.entries()) {
    lines.push(`Risk #${i + 1} [${path.risk.toUpperCase()}]: ${path.description}`);
  }

  lines.push('');
  lines.push('SLICED CODE (only relevant lines, full file NOT provided):');
  lines.push('```');
  lines.push(slicedContext);
  lines.push('```');
  lines.push('');
  lines.push('INSTRUCTIONS:');
  lines.push('1. For each Risk, verify if it is a TRUE positive or FALSE positive.');
  lines.push('2. If TRUE: provide exact fix code.');
  lines.push('3. If FALSE: explain why (e.g., "guarded by line 23 if check").');
  lines.push('4. Output JSON: [{"risk":1,"verdict":"true"|"false","reason":"...","fix":"..."}]');

  return lines.join('\n');
}

// IDENTITY_SEAL: PART-5 | role=ai-prompt | inputs=riskPaths,context,graph | outputs=prompt

// ============================================================
// PART 6 — Unified Brain Runner
// ============================================================

export function runBrainAnalysis(code: string, fileName: string): {
  graph: CFGGraph;
  riskPaths: ExecutionPath[];
  slicedContext: string;
  prompt: string;
  stats: { nodes: number; edges: number; functions: number; risks: number; contextLines: number; reductionPercent: number };
} {
  const graph = buildCFG(code, fileName);
  const riskPaths = findRiskPaths(graph);
  const slicedContext = sliceContext(code, graph, riskPaths);
  const prompt = buildCFGReviewPrompt(fileName, riskPaths, slicedContext, graph);

  const totalLines = code.split('\n').length;
  const contextLines = slicedContext.split('\n').filter(l => !l.includes('생략')).length;
  const reductionPercent = totalLines > 0 ? Math.round((1 - contextLines / totalLines) * 100) : 0;

  const edgeCount = [...graph.nodes.values()].reduce((s, n) => s + n.edges.length, 0);

  return {
    graph, riskPaths, slicedContext, prompt,
    stats: {
      nodes: graph.nodes.size,
      edges: edgeCount,
      functions: graph.functions.length,
      risks: riskPaths.length,
      contextLines,
      reductionPercent,
    },
  };
}

// IDENTITY_SEAL: PART-6 | role=brain-runner | inputs=code,fileName | outputs=all

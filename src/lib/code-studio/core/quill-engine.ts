// ============================================================
// CS Quill — 4-Layer Engine (createProgram + TypeChecker)
// ============================================================
// Layer 0: Pre-filter (skip generated/minified)
// Layer 1: AST parse (typescript createSourceFile)
// Layer 2: Symbol resolution (createProgram + TypeChecker)
// Layer 3: Rule engine (evidence-based verdict)
//
// Ported from local-code-studio/packages/quill-engine/src/engine.ts

// ============================================================
// PART 1 — Types
// ============================================================

export interface Evidence {
  engine: 'typescript-ast' | 'typescript-checker' | 'esquery' | 'regex';
  detail: string;
}

export interface EngineFinding {
  ruleId: string;
  line: number;
  message: string;
  severity: 'critical' | 'error' | 'warning' | 'info';
  confidence: 'high' | 'medium' | 'low';
  evidence: Evidence[];
  explanation?: string;
}

export interface ScopeNode {
  id: string;
  kind: 'file' | 'function' | 'block' | 'class' | 'catch';
  parentId?: string;
  declared: Set<string>;
  startLine: number;
  endLine: number;
}

export interface EngineResult {
  findings: EngineFinding[];
  scopes: ScopeNode[];
  cyclomaticComplexity: number;
  nodeCount: number;
  enginesUsed: string[];
}

// ============================================================
// PART 2 — Node.js optional guards (browser-safe)
// ============================================================

let ts: typeof import('typescript') | undefined;
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  ts = require('typescript');
} catch {
  // typescript not available in browser — engine disabled
}

function tryReadFileSync(filePath: string): string | undefined {
  if (typeof process === 'undefined') return undefined;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('fs').readFileSync(filePath, 'utf-8');
  } catch {
    return undefined;
  }
}

function tryFileExists(filePath: string): boolean {
  if (typeof process === 'undefined') return false;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('fs').existsSync(filePath);
  } catch {
    return false;
  }
}

// ============================================================
// PART 3 — Layer 0: Pre-filter
// ============================================================

function shouldSkip(code: string): string | null {
  if (code.length > 150_000) return 'oversized-file';
  const first10 = code.split('\n').slice(0, 10);
  const avgLen = first10.reduce((s, l) => s + l.length, 0) / Math.max(first10.length, 1);
  if (avgLen > 200) return 'minified-or-bundled';
  return null;
}

// ============================================================
// PART 4 — Layer 1+2: TypeScript AST + TypeChecker
// ============================================================

export function analyzeWithProgram(
  _filePaths: string[],
  targetFile: string,
  code?: string,
): EngineResult {
  const findings: EngineFinding[] = [];
  const scopes: ScopeNode[] = [];
  const enginesUsed: string[] = ['typescript-ast'];
  let cyclomaticComplexity = 1;
  let nodeCount = 0;

  if (!ts) {
    return {
      findings: [{ ruleId: 'pre-filter/skip', line: 1, message: '[Bypass] typescript not available', severity: 'info', confidence: 'high', evidence: [{ engine: 'regex', detail: 'no-ts' }] }],
      scopes: [], cyclomaticComplexity: 0, nodeCount: 0, enginesUsed: ['pre-filter'],
    };
  }

  // Pre-filter
  const codeToCheck = code ?? tryReadFileSync(targetFile) ?? '';
  const skipReason = shouldSkip(codeToCheck);
  if (skipReason) {
    return {
      findings: [{ ruleId: 'pre-filter/skip', line: 1, message: `[Bypass] ${skipReason}`, severity: 'info', confidence: 'high', evidence: [{ engine: 'regex', detail: skipReason }] }],
      scopes: [], cyclomaticComplexity: 0, nodeCount: 0, enginesUsed: ['pre-filter'],
    };
  }

  // createProgram — TypeChecker
  let program: import('typescript').Program | undefined;
  let checker: import('typescript').TypeChecker | null = null;
  let sourceFile: import('typescript').SourceFile;

  try {
    const host = ts.createCompilerHost({
      target: ts.ScriptTarget.Latest,
      module: ts.ModuleKind.ESNext,
      moduleResolution: ts.ModuleResolutionKind.Bundler,
      allowJs: true,
      checkJs: true,
      noEmit: true,
      skipLibCheck: true,
      jsx: ts.JsxEmit.ReactJSX,
      strict: true,
      strictNullChecks: true,
    });

    const originalGetSourceFile = host.getSourceFile;
    host.getSourceFile = (fileName, languageVersion, onError) => {
      if (fileName === targetFile || fileName.endsWith(targetFile)) {
        return ts!.createSourceFile(fileName, codeToCheck, languageVersion, true);
      }
      return originalGetSourceFile.call(host, fileName, languageVersion, onError);
    };
    host.fileExists = (f) => f === targetFile || f.endsWith(targetFile) || tryFileExists(f);
    host.readFile = (f) => {
      if (f === targetFile || f.endsWith(targetFile)) return codeToCheck;
      return tryReadFileSync(f);
    };

    program = ts.createProgram([targetFile], {
      target: ts.ScriptTarget.Latest,
      module: ts.ModuleKind.ESNext,
      moduleResolution: ts.ModuleResolutionKind.Bundler,
      allowJs: true,
      checkJs: true,
      noEmit: true,
      skipLibCheck: true,
      jsx: ts.JsxEmit.ReactJSX,
      strict: true,
      strictNullChecks: true,
    }, host);

    checker = program.getTypeChecker();
    enginesUsed.push('typescript-checker');

    const sf = program.getSourceFile(targetFile);
    if (!sf) {
      sourceFile = ts.createSourceFile(targetFile, codeToCheck, ts.ScriptTarget.Latest, true);
    } else {
      sourceFile = sf;
    }
  } catch {
    sourceFile = ts.createSourceFile(targetFile, codeToCheck, ts.ScriptTarget.Latest, true);
    checker = null;
    program = undefined;
  }

  const lineOf = (node: import('typescript').Node) =>
    sourceFile.getLineAndCharacterOfPosition(node.getStart()).line + 1;

  // Scope graph
  let scopeId = 0;
  let currentScopeId = 'scope-0';
  scopes.push({
    id: 'scope-0', kind: 'file', declared: new Set(),
    startLine: 1, endLine: sourceFile.getLineAndCharacterOfPosition(sourceFile.getEnd()).line + 1,
  });

  const reported = new Set<string>();

  function addFinding(f: EngineFinding) {
    const key = `${f.line}:${f.ruleId}`;
    if (reported.has(key)) return;
    reported.add(key);
    findings.push(f);
  }

  // AST traversal
  function visit(node: import('typescript').Node, depth: number) {
    nodeCount++;

    // Cyclomatic complexity
    if (ts!.isIfStatement(node) || ts!.isForStatement(node) || ts!.isForInStatement(node) ||
        ts!.isForOfStatement(node) || ts!.isWhileStatement(node) || ts!.isDoStatement(node) ||
        ts!.isCaseClause(node) || ts!.isCatchClause(node) || ts!.isConditionalExpression(node)) {
      cyclomaticComplexity++;
    }
    if (ts!.isBinaryExpression(node) && (
      node.operatorToken.kind === ts!.SyntaxKind.AmpersandAmpersandToken ||
      node.operatorToken.kind === ts!.SyntaxKind.BarBarToken
    )) {
      cyclomaticComplexity++;
    }

    // Scope tracking
    if (ts!.isFunctionDeclaration(node) || ts!.isFunctionExpression(node) ||
        ts!.isArrowFunction(node) || ts!.isMethodDeclaration(node)) {
      scopeId++;
      const sid = `scope-${scopeId}`;
      const scope: ScopeNode = {
        id: sid, kind: 'function', parentId: currentScopeId,
        declared: new Set(), startLine: lineOf(node),
        endLine: sourceFile.getLineAndCharacterOfPosition(node.getEnd()).line + 1,
      };
      if ('parameters' in node) {
        for (const p of (node as { parameters: import('typescript').NodeArray<import('typescript').ParameterDeclaration> }).parameters) {
          if (ts!.isIdentifier(p.name)) scope.declared.add(p.name.text);
        }
      }
      scopes.push(scope);
      const prevScope = currentScopeId;
      currentScopeId = sid;

      // Empty function
      const body = (node as { body?: import('typescript').Node }).body;
      if (body && ts!.isBlock(body) && (body as import('typescript').Block).statements.length === 0) {
        const nameNode = (node as { name?: import('typescript').Node }).name;
        const name = nameNode?.getText?.(sourceFile) ?? 'anonymous';
        addFinding({
          ruleId: 'ERR-001', line: lineOf(node),
          message: `Empty function: ${name}()`,
          severity: 'error', confidence: 'high',
          evidence: [{ engine: 'typescript-ast', detail: 'Block.statements.length === 0' }],
        });
      }

      // Long function
      if (body && ts!.isBlock(body)) {
        const fnLines = sourceFile.getLineAndCharacterOfPosition(body.getEnd()).line -
                        sourceFile.getLineAndCharacterOfPosition(body.getStart()).line;
        if (fnLines > 60) {
          const nameNode = (node as { name?: import('typescript').Node }).name;
          const name = nameNode?.getText?.(sourceFile) ?? 'anonymous';
          addFinding({
            ruleId: 'CMX-001', line: lineOf(node),
            message: `Function ${name}() ${fnLines} lines — exceeds 60`,
            severity: 'warning', confidence: 'high',
            evidence: [{ engine: 'typescript-ast', detail: `body span: ${fnLines} lines` }],
          });
        }
      }

      // Too many parameters
      if ('parameters' in node) {
        const paramCount = (node as unknown as { parameters: unknown[] }).parameters.length;
        if (paramCount > 5) {
          addFinding({
            ruleId: 'CMX-002', line: lineOf(node),
            message: `${paramCount} parameters — exceeds 5`,
            severity: 'warning', confidence: 'high',
            evidence: [{ engine: 'typescript-ast', detail: 'parameters.length > 5' }],
          });
        }
      }

      ts!.forEachChild(node, (child) => visit(child, depth + 1));
      currentScopeId = prevScope;
      return;
    }

    // eval() / new Function()
    if (ts!.isCallExpression(node) && ts!.isIdentifier(node.expression) && node.expression.text === 'eval') {
      addFinding({
        ruleId: 'SEC-006', line: lineOf(node),
        message: 'eval() call — security risk',
        severity: 'critical', confidence: 'high',
        evidence: [{ engine: 'typescript-ast', detail: 'CallExpression callee === eval' }],
      });
    }
    if (ts!.isNewExpression(node) && ts!.isIdentifier(node.expression) && node.expression.text === 'Function') {
      addFinding({
        ruleId: 'API-008', line: lineOf(node),
        message: 'new Function() — equivalent to eval',
        severity: 'critical', confidence: 'high',
        evidence: [{ engine: 'typescript-ast', detail: 'NewExpression callee === Function' }],
      });
    }

    // == / !=
    if (ts!.isBinaryExpression(node)) {
      if (node.operatorToken.kind === ts!.SyntaxKind.EqualsEqualsToken) {
        addFinding({
          ruleId: 'LOG-001', line: lineOf(node),
          message: '== used — prefer ===',
          severity: 'warning', confidence: 'medium',
          evidence: [{ engine: 'typescript-ast', detail: 'BinaryExpression operator: ==' }],
        });
      }
      if (node.operatorToken.kind === ts!.SyntaxKind.ExclamationEqualsToken) {
        addFinding({
          ruleId: 'LOG-002', line: lineOf(node),
          message: '!= used — prefer !==',
          severity: 'warning', confidence: 'medium',
          evidence: [{ engine: 'typescript-ast', detail: 'BinaryExpression operator: !=' }],
        });
      }
    }

    // Symbol resolution via TypeChecker (Layer 2)
    if (checker && ts!.isIdentifier(node)) {
      const parent = node.parent;
      const isProperty = ts!.isPropertyAccessExpression(parent) && parent.name === node;
      const isDecl = ts!.isVariableDeclaration(parent) || ts!.isFunctionDeclaration(parent) || ts!.isParameter(parent);
      const isType = ts!.isTypeReferenceNode(parent) || ts!.isInterfaceDeclaration(parent);
      const isImport = ts!.isImportSpecifier(parent) || ts!.isImportClause(parent);

      if (!isProperty && !isDecl && !isType && !isImport) {
        try {
          const symbol = checker.getSymbolAtLocation(node);
          if (!symbol && node.text !== 'this' && node.text !== 'super' &&
              node.text.length > 1 && !/^(true|false|null|undefined|NaN|Infinity)$/.test(node.text)) {
            addFinding({
              ruleId: 'VAR-003', line: lineOf(node),
              message: `Unresolved symbol: '${node.text}'`,
              severity: 'info', confidence: 'medium',
              evidence: [{ engine: 'typescript-checker', detail: 'getSymbolAtLocation returned null' }],
            });
          }
        } catch { /* checker failure ignored */ }
      }
    }

    // API-006: console.log
    if (ts!.isCallExpression(node) && ts!.isPropertyAccessExpression(node.expression)) {
      const obj = node.expression.expression;
      const prop = node.expression.name;
      if (ts!.isIdentifier(obj) && obj.text === 'console' && (prop.text === 'log' || prop.text === 'debug')) {
        addFinding({ ruleId: 'API-006', line: lineOf(node), message: `console.${prop.text}() found`, severity: 'info', confidence: 'high', evidence: [{ engine: 'typescript-ast', detail: 'console.log/debug' }] });
      }
    }

    // API-009: document.write
    if (ts!.isCallExpression(node) && ts!.isPropertyAccessExpression(node.expression)) {
      const obj = node.expression.expression;
      const prop = node.expression.name;
      if (ts!.isIdentifier(obj) && obj.text === 'document' && prop.text === 'write') {
        addFinding({ ruleId: 'API-009', line: lineOf(node), message: 'document.write() — XSS risk', severity: 'error', confidence: 'high', evidence: [{ engine: 'typescript-ast', detail: 'document.write' }] });
      }
    }

    // ASY-008: async without await
    if ((ts!.isFunctionDeclaration(node) || ts!.isArrowFunction(node) || ts!.isMethodDeclaration(node)) &&
        node.modifiers?.some(m => m.kind === ts!.SyntaxKind.AsyncKeyword)) {
      let hasAwait = false;
      ts!.forEachChild(node, function checkAwait(child) {
        if (ts!.isAwaitExpression(child)) hasAwait = true;
        if (!hasAwait) ts!.forEachChild(child, checkAwait);
      });
      if (!hasAwait) {
        addFinding({ ruleId: 'ASY-008', line: lineOf(node), message: 'async function without await', severity: 'info', confidence: 'high', evidence: [{ engine: 'typescript-ast', detail: 'async without await' }] });
      }
    }

    // RTE-016: for...in
    if (ts!.isForInStatement(node)) {
      addFinding({ ruleId: 'RTE-016', line: lineOf(node), message: 'for...in used — prefer for...of for arrays', severity: 'warning', confidence: 'medium', evidence: [{ engine: 'typescript-ast', detail: 'ForInStatement' }] });
    }

    // RTE-018: switch without default
    if (ts!.isSwitchStatement(node)) {
      const hasDefault = node.caseBlock.clauses.some(c => ts!.isDefaultClause(c));
      if (!hasDefault) {
        addFinding({ ruleId: 'RTE-018', line: lineOf(node), message: 'switch without default case', severity: 'warning', confidence: 'high', evidence: [{ engine: 'typescript-ast', detail: 'SwitchStatement without default' }] });
      }
    }

    // ERR-005: string throw
    if (ts!.isThrowStatement(node) && node.expression && ts!.isStringLiteral(node.expression)) {
      addFinding({ ruleId: 'ERR-005', line: lineOf(node), message: 'string throw — use Error class', severity: 'warning', confidence: 'high', evidence: [{ engine: 'typescript-ast', detail: 'throw "string"' }] });
    }

    // VAR-002: var usage
    if (ts!.isVariableDeclarationList(node) && (node.flags & ts!.NodeFlags.Let) === 0 && (node.flags & ts!.NodeFlags.Const) === 0) {
      if (node.parent && ts!.isVariableStatement(node.parent)) {
        addFinding({ ruleId: 'VAR-002', line: lineOf(node), message: 'var used — prefer let/const', severity: 'warning', confidence: 'high', evidence: [{ engine: 'typescript-ast', detail: 'VariableDeclarationList without Let/Const flag' }] });
      }
    }

    // LOG-008: triple nested ternary
    if (ts!.isConditionalExpression(node) && ts!.isConditionalExpression(node.whenTrue)) {
      if (ts!.isConditionalExpression((node.whenTrue as import('typescript').ConditionalExpression).whenTrue)) {
        addFinding({ ruleId: 'LOG-008', line: lineOf(node), message: 'Triple nested ternary', severity: 'warning', confidence: 'high', evidence: [{ engine: 'typescript-ast', detail: 'triple nested ConditionalExpression' }] });
      }
    }

    ts!.forEachChild(node, (child) => visit(child, depth + 1));
  }

  visit(sourceFile, 0);

  // Cyclomatic complexity warning
  if (cyclomaticComplexity > 15) {
    addFinding({
      ruleId: 'CMX-008', line: 1,
      message: `Cyclomatic complexity ${cyclomaticComplexity} — exceeds 15`,
      severity: 'warning', confidence: 'high',
      evidence: [{ engine: 'typescript-ast', detail: `if/for/while/case/&&/|| count: ${cyclomaticComplexity}` }],
    });
  }

  // Deep nesting (scope graph based)
  const maxScopeDepth = scopes.reduce((max, s) => {
    let d = 0;
    let cur: ScopeNode | undefined = s;
    while (cur?.parentId) {
      d++;
      cur = scopes.find(sc => sc.id === cur!.parentId);
    }
    return Math.max(max, d);
  }, 0);

  if (maxScopeDepth > 5) {
    addFinding({
      ruleId: 'CMX-007', line: 1,
      message: `Max scope depth ${maxScopeDepth} — exceeds 5`,
      severity: 'warning', confidence: 'high',
      evidence: [{ engine: 'typescript-ast', detail: `scope graph depth: ${maxScopeDepth}` }],
    });
  }

  return { findings: findings.slice(0, 80), scopes, cyclomaticComplexity, nodeCount, enginesUsed };
}

// ============================================================
// PART 5 — Layer 3: esquery auxiliary (CSS selector patterns)
// ============================================================

export function analyzeWithEsquery(code: string): EngineFinding[] {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const acorn = require('acorn');
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const esquery = require('esquery');
    const findings: EngineFinding[] = [];

    const ast = acorn.parse(code, { ecmaVersion: 'latest', sourceType: 'module', locations: true });

    // eval()
    const evalCalls = esquery.query(ast, 'CallExpression[callee.name="eval"]');
    for (const node of evalCalls) {
      findings.push({
        ruleId: 'SEC-006', line: (node as { loc?: { start?: { line?: number } } }).loc?.start?.line ?? 1,
        message: 'eval() call — security risk',
        severity: 'critical', confidence: 'high',
        evidence: [{ engine: 'esquery', detail: 'CallExpression[callee.name="eval"]' }],
      });
    }

    // Triple nested loop
    const tripleLoop = esquery.query(ast,
      ':matches(ForStatement, WhileStatement, ForOfStatement) :matches(ForStatement, WhileStatement, ForOfStatement) :matches(ForStatement, WhileStatement, ForOfStatement)');
    if (tripleLoop.length > 0) {
      findings.push({
        ruleId: 'PRF-002', line: (tripleLoop[0] as { loc?: { start?: { line?: number } } }).loc?.start?.line ?? 1,
        message: 'Triple nested loop — O(n^3) complexity',
        severity: 'warning', confidence: 'high',
        evidence: [{ engine: 'esquery', detail: 'nested loop depth >= 3' }],
      });
    }

    return findings;
  } catch {
    return [];
  }
}

// ============================================================
// PART 6 — Unified Runner
// ============================================================

const TYP_RULE_IDS = new Set([
  'TYP-001', 'TYP-002', 'TYP-003', 'TYP-004', 'TYP-005', 'TYP-006', 'TYP-007', 'TYP-008', 'TYP-009',
  'TYP-010', 'TYP-011', 'TYP-012', 'TYP-013', 'TYP-014', 'TYP-015',
]);

/** ts-morph detector plugins for TYP-* rules */
function runTypMorphDetectors(code: string, fileName: string): EngineFinding[] {
  const out: EngineFinding[] = [];
  try {
    if (!ts) return out;
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { Project } = require('ts-morph');
    const project = new Project({
      useInMemoryFileSystem: true,
      compilerOptions: {
        strict: true,
        strictNullChecks: true,
        target: ts.ScriptTarget.Latest,
        module: ts.ModuleKind.ESNext,
        skipLibCheck: true,
      },
    });
    const sf = project.createSourceFile(fileName, code);

    // Try loading detectors — optional dependency
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { loadAllDetectors } = require('./detectors');
      const registry = loadAllDetectors() as { getDetectors: () => Array<{ ruleId: string; detect: (sf: unknown) => Array<{ line: number; message: string }> }> };
      for (const detector of registry.getDetectors()) {
        if (!TYP_RULE_IDS.has(detector.ruleId)) continue;
        const raw = detector.detect(sf);
        for (const pf of raw) {
          out.push({
            ruleId: detector.ruleId,
            line: pf.line,
            message: pf.message,
            severity: 'warning',
            confidence: 'medium',
            evidence: [{ engine: 'typescript-ast', detail: `ts-morph detector ${detector.ruleId}` }],
          });
        }
      }
    } catch {
      /* detectors not available */
    }
  } catch {
    /* ts-morph not available */
  }
  return out;
}

function mergeFindingsDedupe(base: EngineFinding[], extra: EngineFinding[]): EngineFinding[] {
  const seen = new Set(base.map(f => `${f.line}:${f.ruleId}`));
  for (const f of extra) {
    const k = `${f.line}:${f.ruleId}`;
    if (seen.has(k)) continue;
    seen.add(k);
    base.push(f);
  }
  return base;
}

export function runQuillEngine(code: string, fileName: string = 'temp.ts'): EngineResult {
  // Layer 1+2: TypeScript program
  const result = analyzeWithProgram([fileName], fileName, code);

  // TYP-001~015 (ts-morph plugins)
  try {
    const typMorph = runTypMorphDetectors(code, fileName);
    mergeFindingsDedupe(result.findings, typMorph);
    if (typMorph.length > 0 && !result.enginesUsed.includes('ts-morph-typ')) {
      result.enginesUsed.push('ts-morph-typ');
    }
  } catch { /* optional */ }

  // Layer 3: esquery auxiliary
  try {
    const esqFindings = analyzeWithEsquery(code);
    for (const esqF of esqFindings) {
      const existing = result.findings.find(f => f.ruleId === esqF.ruleId && f.line === esqF.line);
      if (existing) {
        existing.evidence.push(...esqF.evidence);
        if (existing.confidence === 'medium') existing.confidence = 'high';
      } else {
        result.findings.push(esqF);
      }
    }
    if (!result.enginesUsed.includes('esquery')) result.enginesUsed.push('esquery');
  } catch { /* esquery not installed — skip */ }

  result.findings = result.findings.slice(0, 80);
  return result;
}

// IDENTITY_SEAL: PART-6 | role=unified-engine | inputs=code,fileName | outputs=EngineResult

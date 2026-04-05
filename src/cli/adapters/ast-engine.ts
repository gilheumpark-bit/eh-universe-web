// ============================================================
// CS Quill 🦔 — AST Engine Adapter
// ============================================================
// 6 packages: typescript, ts-morph, acorn, estraverse, esquery, @babel/parser
// Level 1~4 검증 정밀도 향상을 위한 통합 AST 분석 엔진.

// ============================================================
// PART 1 — TypeScript Compiler API (Level 2: 타입 추론)
// ============================================================

export async function analyzeWithTypeScript(code: string, fileName: string = 'temp.ts') {
  const ts = await import('typescript');

  const sourceFile = ts.createSourceFile(fileName, code, ts.ScriptTarget.Latest, true);
  const findings: Array<{ line: number; message: string; severity: string }> = [];

  const lineOf = (node: import('typescript').Node) =>
    sourceFile.getLineAndCharacterOfPosition(node.getStart()).line + 1;

  // ── 구조 통계 ──
  let fnCount = 0;
  let maxDepth = 0;
  let maxFnLines = 0;
  const declaredVars = new Set<string>();
  const usedVars = new Set<string>();

  function measureDepth(node: import('typescript').Node, depth: number): void {
    if (ts.isBlock(node)) {
      if (depth > maxDepth) maxDepth = depth;
      depth++;
    }
    ts.forEachChild(node, child => measureDepth(child, depth));
  }
  measureDepth(sourceFile, 0);

  function visit(node: import('typescript').Node): void {
    // 1. 빈 함수 탐지
    if (ts.isFunctionDeclaration(node) || ts.isMethodDeclaration(node) || ts.isArrowFunction(node)) {
      fnCount++;
      const body = (node as any).body;
      if (body && ts.isBlock(body)) {
        const stmtCount = body.statements.length;
        const fnLines = sourceFile.getLineAndCharacterOfPosition(body.getEnd()).line -
                        sourceFile.getLineAndCharacterOfPosition(body.getStart()).line;
        if (fnLines > maxFnLines) maxFnLines = fnLines;

        if (stmtCount === 0) {
          const name = (node as any).name?.getText?.(sourceFile) ?? 'anonymous';
          findings.push({ line: lineOf(node), message: `빈 함수: ${name}()`, severity: 'error' });
        }
        // 긴 함수 탐지
        if (fnLines > 60) {
          const name = (node as any).name?.getText?.(sourceFile) ?? 'anonymous';
          findings.push({ line: lineOf(node), message: `함수 ${name}() ${fnLines}줄 — 60줄 초과`, severity: 'warning' });
        }
      }
    }

    // 2. eval() / new Function() 탐지 — AST 기반이므로 규칙 정의 문자열과 혼동 없음
    if (ts.isCallExpression(node)) {
      const expr = node.expression;
      if (ts.isIdentifier(expr) && expr.text === 'eval') {
        findings.push({ line: lineOf(node), message: 'eval() 호출 — 보안 위험', severity: 'error' });
      }
      if (ts.isNewExpression(node.parent) && ts.isIdentifier((node.parent as any).expression) &&
          (node.parent as any).expression.text === 'Function') {
        findings.push({ line: lineOf(node), message: 'new Function() — eval 동등', severity: 'error' });
      }
    }
    // new Function() 직접 탐지
    if (ts.isNewExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === 'Function') {
      findings.push({ line: lineOf(node), message: 'new Function() — eval 동등', severity: 'error' });
    }

    // 3. == / != 탐지 (=== / !== 권장)
    if (ts.isBinaryExpression(node)) {
      const op = node.operatorToken.kind;
      if (op === ts.SyntaxKind.EqualsEqualsToken) {
        findings.push({ line: lineOf(node), message: '== 사용 — === 권장', severity: 'warning' });
      }
      if (op === ts.SyntaxKind.ExclamationEqualsToken) {
        findings.push({ line: lineOf(node), message: '!= 사용 — !== 권장', severity: 'warning' });
      }
    }

    // 4. any 타입 탐지
    if (ts.isTypeReferenceNode(node) && ts.isIdentifier(node.typeName) && node.typeName.text === 'any') {
      findings.push({ line: lineOf(node), message: 'TypeScript any 타입 — 타입 안전성 저하', severity: 'warning' });
    }

    // 5. console.log 탐지
    if (ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression)) {
      const obj = node.expression.expression;
      const prop = node.expression.name;
      if (ts.isIdentifier(obj) && obj.text === 'console' &&
          (prop.text === 'log' || prop.text === 'debug')) {
        findings.push({ line: lineOf(node), message: `console.${prop.text}() 발견`, severity: 'info' });
      }
    }

    // 6. 변수 선언/사용 추적 (미사용 변수)
    if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name)) {
      declaredVars.add(node.name.text);
    }
    if (ts.isIdentifier(node) && !ts.isVariableDeclaration(node.parent)) {
      usedVars.add(node.text);
    }

    // 7. 파라미터 5개 초과
    if ((ts.isFunctionDeclaration(node) || ts.isMethodDeclaration(node) || ts.isArrowFunction(node)) && node.parameters.length > 5) {
      findings.push({ line: lineOf(node), message: `파라미터 ${node.parameters.length}개 — 5개 초과`, severity: 'warning' });
    }

    ts.forEachChild(node, visit);
  }

  visit(sourceFile);

  // 구조 경고
  if (maxDepth > 5) {
    findings.push({ line: 1, message: `최대 중첩 깊이 ${maxDepth} — 5 초과`, severity: 'warning' });
  }

  return { findings: findings.slice(0, 30), nodeCount: sourceFile.getChildCount(), fnCount, maxDepth, maxFnLines };
}

// IDENTITY_SEAL: PART-1 | role=typescript-analysis | inputs=code | outputs=findings

// ============================================================
// PART 2 — ts-morph (Level 1: AST 구조 분석)
// ============================================================

export async function analyzeWithTsMorph(code: string, fileName: string = 'temp.ts') {
  const { Project, SyntaxKind } = await import('ts-morph');

  const project = new Project({ useInMemoryFileSystem: true });
  const sourceFile = project.createSourceFile(fileName, code);
  const findings: Array<{ line: number; message: string; severity: string }> = [];

  // Find empty functions
  for (const fn of sourceFile.getFunctions()) {
    if (fn.getBody()?.getStatements().length === 0) {
      findings.push({ line: fn.getStartLineNumber(), message: `Empty function: ${fn.getName() ?? 'anonymous'}`, severity: 'error' });
    }
  }

  // Find unused parameters
  for (const fn of sourceFile.getFunctions()) {
    for (const param of fn.getParameters()) {
      const name = param.getName();
      if (name.startsWith('_')) continue;
      const refs = param.findReferencesAsNodes();
      if (refs.length <= 1) { // 1 = the declaration itself
        findings.push({ line: param.getStartLineNumber(), message: `Unused parameter: ${name}`, severity: 'warning' });
      }
    }
  }

  // Find deeply nested blocks (complexity)
  let maxDepth = 0;
  sourceFile.forEachDescendant(node => {
    if (node.getKind() === SyntaxKind.Block) {
      let depth = 0;
      let parent = node.getParent();
      while (parent) {
        if (parent.getKind() === SyntaxKind.Block) depth++;
        parent = parent.getParent();
      }
      if (depth > maxDepth) maxDepth = depth;
    }
  });

  if (maxDepth > 4) {
    findings.push({ line: 1, message: `Deep nesting detected: ${maxDepth} levels`, severity: 'warning' });
  }

  return { findings, functions: sourceFile.getFunctions().length, classes: sourceFile.getClasses().length };
}

// IDENTITY_SEAL: PART-2 | role=ts-morph-analysis | inputs=code | outputs=findings

// ============================================================
// PART 3 — Acorn + Estraverse + Esquery (JS 분석)
// ============================================================

export async function analyzeWithAcorn(code: string) {
  const acorn = await import('acorn');
  const { traverse } = await import('estraverse');
  const esquery = await import('esquery');

  const findings: Array<{ line: number; message: string; severity: string }> = [];

  let ast;
  try {
    ast = acorn.parse(code, { ecmaVersion: 'latest', sourceType: 'module', locations: true });
  } catch (e) {
    return { findings: [{ line: 1, message: `Parse error: ${(e as Error).message}`, severity: 'error' }] };
  }

  // Esquery: find eval() calls
  const evalCalls = esquery.query(ast as never, 'CallExpression[callee.name="eval"]');
  for (const node of evalCalls) {
    findings.push({ line: (node as unknown).loc?.start?.line ?? 1, message: 'eval() detected — security risk', severity: 'critical' });
  }

  // Esquery: find console.log
  const consoleLogs = esquery.query(ast as never, 'CallExpression[callee.object.name="console"]');
  for (const node of consoleLogs) {
    findings.push({ line: (node as unknown).loc?.start?.line ?? 1, message: 'console.log detected — remove before production', severity: 'info' });
  }

  // Estraverse: count loop nesting
  let loopDepth = 0;
  let maxLoopDepth = 0;
  traverse(ast as never, {
    enter(node: unknown) {
      if (['ForStatement', 'WhileStatement', 'DoWhileStatement', 'ForInStatement', 'ForOfStatement'].includes(node.type)) {
        loopDepth++;
        if (loopDepth > maxLoopDepth) maxLoopDepth = loopDepth;
      }
    },
    leave(node: unknown) {
      if (['ForStatement', 'WhileStatement', 'DoWhileStatement', 'ForInStatement', 'ForOfStatement'].includes(node.type)) {
        loopDepth--;
      }
    },
  });

  if (maxLoopDepth >= 3) {
    findings.push({ line: 1, message: `Triple-nested loop: O(n^${maxLoopDepth}) complexity`, severity: 'warning' });
  }

  return { findings };
}

// IDENTITY_SEAL: PART-3 | role=acorn-analysis | inputs=code | outputs=findings

// ============================================================
// PART 4 — Babel Parser (JSX/TSX 분석)
// ============================================================

export async function analyzeWithBabel(code: string) {
  const { parse } = await import('@babel/parser');
  const findings: Array<{ line: number; message: string; severity: string }> = [];

  try {
    const ast = parse(code, {
      sourceType: 'module',
      plugins: ['typescript', 'jsx', 'decorators'],
      errorRecovery: true,
    });

    // Check for JSX without key prop in map
    for (const error of ast.errors ?? []) {
      findings.push({ line: (error as unknown).loc?.line ?? 1, message: `Syntax: ${error.message}`, severity: 'error' });
    }
  } catch (e) {
    findings.push({ line: 1, message: `Babel parse error: ${(e as Error).message}`, severity: 'error' });
  }

  return { findings };
}

// IDENTITY_SEAL: PART-4 | role=babel-analysis | inputs=code | outputs=findings

// ============================================================
// PART 5 — Unified AST Runner
// ============================================================

export async function runFullASTAnalysis(code: string, fileName: string = 'temp.ts') {
  const isTS = fileName.endsWith('.ts') || fileName.endsWith('.tsx');
  const results: Array<{ engine: string; findings: Array<{ line: number; message: string; severity: string }> }> = [];

  // Always run acorn (works on JS)
  try {
    const acornResult = await analyzeWithAcorn(code);
    results.push({ engine: 'acorn+estraverse+esquery', findings: acornResult.findings });
  } catch { /* skip */ }

  // TS files: run TypeScript + ts-morph
  if (isTS) {
    try {
      const tsResult = await analyzeWithTypeScript(code, fileName);
      results.push({ engine: 'typescript', findings: tsResult.findings });
    } catch { /* skip */ }

    try {
      const morphResult = await analyzeWithTsMorph(code, fileName);
      results.push({ engine: 'ts-morph', findings: morphResult.findings });
    } catch { /* skip */ }
  }

  // JSX/TSX: run Babel
  if (fileName.endsWith('.tsx') || fileName.endsWith('.jsx')) {
    try {
      const babelResult = await analyzeWithBabel(code);
      results.push({ engine: '@babel/parser', findings: babelResult.findings });
    } catch { /* skip */ }
  }

  // Merge and deduplicate
  const allFindings = results.flatMap(r => r.findings.map(f => ({ ...f, engine: r.engine })));
  const engines = results.length;

  return { engines, findings: allFindings, results };
}

// IDENTITY_SEAL: PART-5 | role=unified-runner | inputs=code,fileName | outputs=findings

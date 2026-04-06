// ============================================================
// Code Studio — Static Analysis Pipeline (8-Team + AST + Multi-AI Review)
// ============================================================
// 코드 변경 시 8개 팀이 정적 분석을 수행, AST 기반 정밀 분석 병합, AI 리뷰 지원.
// AI 호출 없이 로컬에서 즉시 실행.

import { logger } from '@/lib/logger';
import { detectGoodPatterns, type GoodPatternReport } from './good-pattern-detector';

export interface PipelineStage {
  name: string;
  status: 'pass' | 'warn' | 'fail' | 'running' | 'pending';
  score: number;
  message: string;
  findings: string[];
}

export interface PipelineResult {
  stages: PipelineStage[];
  overallScore: number;
  overallStatus: 'pass' | 'warn' | 'fail';
  timestamp: number;
  /** 양품 패턴 탐지 결과 (good-pattern-catalog 기반) */
  goodPatterns?: GoodPatternReport;
}

/** Structured finding for precise line-level reporting */
export interface PipelineFinding {
  line: number;
  message: string;
  severity: 'error' | 'warning' | 'info';
  source: 'regex' | 'ast';
}

// ============================================================
// PART 1 — Team 1: Simulation (런타임 동작 예측)
// ============================================================

function analyzeSimulation(code: string, _language: string): PipelineStage {
  const findings: string[] = [];
  let score = 100;
  const lines = code.split('\n');

  // 무한 루프 패턴
  for (let i = 0; i < lines.length; i++) {
    if (/while\s*\(\s*true\s*\)/.test(lines[i])) {
      // Check if there's a break within the next 50 lines
      const scope = lines.slice(i, i + 50).join('\n');
      if (!/break/.test(scope)) {
        findings.push(`L${i + 1}: Potential infinite loop: while(true) without break`);
        score -= 30;
      }
    }
  }

  // 재귀 호출 (기본 케이스 없음)
  const funcMatch = code.match(/function\s+(\w+)/g);
  if (funcMatch) {
    for (const f of funcMatch) {
      const name = f.replace('function ', '');
      const regex = new RegExp(`${name}\\s*\\(`, 'g');
      const calls = (code.match(regex) || []).length;
      if (calls > 2 && !code.includes('return') && !code.includes('if')) {
        findings.push(`Recursive function "${name}" may lack base case`);
        score -= 20;
      }
    }
  }

  // 비동기 에러 핸들링 누락
  for (let i = 0; i < lines.length; i++) {
    if (/\bawait\s+/.test(lines[i])) {
      // Look backward for try block
      const precedingBlock = lines.slice(Math.max(0, i - 15), i + 1).join('\n');
      if (!/\btry\s*\{/.test(precedingBlock)) {
        findings.push(`L${i + 1}: Async await without try/catch error handling`);
        score -= 10;
        break; // Report once per file to avoid noise
      }
    }
  }

  return {
    name: 'Simulation',
    score: Math.max(0, score),
    status: score >= 80 ? 'pass' : score >= 60 ? 'warn' : 'fail',
    message: findings[0] || 'Runtime behavior OK',
    findings,
  };
}

// IDENTITY_SEAL: PART-1 | role=runtime behavior prediction | inputs=code,language | outputs=PipelineStage

// ============================================================
// PART 2 — Team 2: Generation (코드 구조)
// ============================================================

function analyzeGeneration(code: string, _language: string): PipelineStage {
  const findings: string[] = [];
  let score = 100;
  const lines = code.split('\n');

  // 함수 길이 검사
  let inFunc = false;
  let funcStart = 0;
  let funcName = '';
  for (let i = 0; i < lines.length; i++) {
    if (/(?:function|const\s+\w+\s*=.*=>)/.test(lines[i]) && !inFunc) {
      inFunc = true;
      funcStart = i;
      funcName = lines[i].match(/(?:function\s+(\w+)|const\s+(\w+))/)?.[1] || '';
    }
    if (inFunc && lines[i].trim() === '}' && i - funcStart > 50) {
      findings.push(`L${funcStart + 1}: Function "${funcName || 'anonymous'}" is ${i - funcStart} lines (consider splitting)`);
      score -= 10;
      inFunc = false;
    }
  }

  // TODO/FIXME 감지
  for (let i = 0; i < lines.length; i++) {
    if (/\/\/\s*(TODO|FIXME|HACK|XXX)/i.test(lines[i])) {
      findings.push(`L${i + 1}: ${lines[i].trim()}`);
      score -= 5;
    }
  }

  // 빈 함수 감지
  for (let i = 0; i < lines.length; i++) {
    if (/\{\s*\}/.test(lines[i]) && !/=>\s*\{\}/.test(lines[i])) {
      findings.push(`L${i + 1}: Empty function body detected`);
      score -= 15;
      break;
    }
  }

  // console.log 잔존
  const consoleLines: number[] = [];
  for (let i = 0; i < lines.length; i++) {
    if (/console\.(log|debug|info)\(/.test(lines[i])) {
      consoleLines.push(i + 1);
    }
  }
  if (consoleLines.length > 3) {
    findings.push(`${consoleLines.length} console.log calls at lines ${consoleLines.slice(0, 5).join(',')}${consoleLines.length > 5 ? '...' : ''}`);
    score -= 5;
  }

  return {
    name: 'Generation',
    score: Math.max(0, score),
    status: score >= 80 ? 'pass' : score >= 60 ? 'warn' : 'fail',
    message: findings[0] || 'Structure valid',
    findings,
  };
}

// IDENTITY_SEAL: PART-2 | role=code structure analysis | inputs=code,language | outputs=PipelineStage

// ============================================================
// PART 3 — Team 3: Validation (린트/타입)
// ============================================================

function analyzeValidation(code: string, language: string): PipelineStage {
  const findings: string[] = [];
  let score = 100;
  const lines = code.split('\n');

  // any 타입 사용
  if (language.includes('typescript')) {
    for (let i = 0; i < lines.length; i++) {
      if (/:\s*any\b/.test(lines[i])) {
        findings.push(`L${i + 1}: "any" type usage — consider specific types`);
        score -= 5;
      }
    }
  }

  // == 대신 === 사용 권장
  for (let i = 0; i < lines.length; i++) {
    if (/[^!=]==[^=]/.test(lines[i])) {
      findings.push(`L${i + 1}: loose equality (==) — use strict (===)`);
      score -= 3;
    }
  }

  // var 사용
  for (let i = 0; i < lines.length; i++) {
    if (/\bvar\s+/.test(lines[i])) {
      findings.push(`L${i + 1}: Using "var" — prefer "const" or "let"`);
      score -= 10;
      break;
    }
  }

  // 미사용 import 패턴 (간이)
  const importRegex = /import\s+\{([^}]+)\}/g;
  let importMatch: RegExpExecArray | null;
  while ((importMatch = importRegex.exec(code)) !== null) {
    const names = importMatch[1].split(',').map((n) => n.trim());
    const lineIdx = code.slice(0, importMatch.index).split('\n').length;
    for (const name of names) {
      const clean = name.replace(/\s+as\s+\w+/, '').trim();
      if (clean) {
        const codeWithoutImport = code.slice(0, importMatch.index) + code.slice(importMatch.index + importMatch[0].length);
        if (!new RegExp(`\\b${clean}\\b`).test(codeWithoutImport)) {
          findings.push(`L${lineIdx}: Possibly unused import: "${clean}"`);
          score -= 3;
        }
      }
    }
  }

  return {
    name: 'Validation',
    score: Math.max(0, score),
    status: score >= 80 ? 'pass' : score >= 60 ? 'warn' : 'fail',
    message: findings[0] || 'All checks pass',
    findings,
  };
}

// IDENTITY_SEAL: PART-3 | role=lint and type analysis | inputs=code,language | outputs=PipelineStage

// ============================================================
// PART 4 — Team 4: Size-Density (코드 밀도)
// ============================================================

function analyzeSizeDensity(code: string, _language: string): PipelineStage {
  const findings: string[] = [];
  let score = 100;
  const lines = code.split('\n');
  const nonBlankLines = lines.filter((l) => l.trim().length > 0);
  const totalLines = lines.length;

  // 빈 줄 비율 검사
  const blankRatio = 1 - (nonBlankLines.length / Math.max(1, totalLines));
  if (blankRatio > 0.4) {
    findings.push(`Blank line ratio ${(blankRatio * 100).toFixed(0)}% — code may be too sparse`);
    score -= 10;
  } else if (blankRatio < 0.05 && totalLines > 30) {
    findings.push(`Blank line ratio ${(blankRatio * 100).toFixed(0)}% — code is very dense, consider adding spacing`);
    score -= 5;
  }

  // 평균 줄 길이
  const avgLineLength = nonBlankLines.reduce((s, l) => s + l.length, 0) / Math.max(1, nonBlankLines.length);
  if (avgLineLength > 100) {
    findings.push(`Average line length ${avgLineLength.toFixed(0)} chars — consider wrapping`);
    score -= 10;
  }

  // 함수당 줄 수 (간이 측정)
  const funcHeaders = code.match(/(?:function\s+\w+|(?:const|let)\s+\w+\s*=\s*(?:async\s*)?\()/g) || [];
  const funcCount = funcHeaders.length;
  if (funcCount > 0) {
    const linesPerFunc = Math.round(nonBlankLines.length / funcCount);
    if (linesPerFunc > 40) {
      findings.push(`~${linesPerFunc} lines/function — consider splitting large functions`);
      score -= 10;
    }
  }

  // 긴 줄 경고 (120자 초과)
  const longLineIndices: number[] = [];
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].length > 120) longLineIndices.push(i + 1);
  }
  if (longLineIndices.length > 5) {
    findings.push(`${longLineIndices.length} lines exceed 120 chars (first at L${longLineIndices[0]})`);
    score -= 5;
  }

  return {
    name: 'Size-Density',
    score: Math.max(0, score),
    status: score >= 80 ? 'pass' : score >= 60 ? 'warn' : 'fail',
    message: findings[0] || 'Code density OK',
    findings,
  };
}

// IDENTITY_SEAL: PART-4 | role=code density analysis | inputs=code,language | outputs=PipelineStage

// ============================================================
// PART 5 — Team 5: Asset Trace (의존성)
// ============================================================

function analyzeAssetTrace(code: string, _language: string): PipelineStage {
  const findings: string[] = [];
  let score = 100;

  const importLines = code.match(/^import\s.+$/gm) || [];
  const importCount = importLines.length;
  if (importCount > 15) {
    findings.push(`${importCount} imports — consider splitting this module`);
    score -= 10;
  }

  const externalDeps = importLines.filter((l) => /from\s+['"][^./]/.test(l));
  const internalDeps = importLines.filter((l) => /from\s+['"][./]/.test(l));
  if (externalDeps.length > 10) {
    findings.push(`${externalDeps.length} external deps — heavy third-party dependency`);
    score -= 5;
  }

  const relativeImports = (code.match(/from\s+['"]\.\//g) || []).length;
  if (relativeImports > 5) {
    findings.push(`${relativeImports} same-dir imports — watch for circular dependencies`);
    score -= 5;
  }

  const reExports = (code.match(/export\s+\{[^}]+\}\s+from/g) || []).length;
  if (reExports > 5) {
    findings.push(`${reExports} re-exports — potential barrel file, check for tree-shaking impact`);
    score -= 5;
  }

  const dynamicImports = (code.match(/import\s*\(/g) || []).length;
  if (dynamicImports > 0) {
    findings.push(`${dynamicImports} dynamic import(s) — verify code-splitting intent`);
  }

  const requireCalls = (code.match(/\brequire\s*\(/g) || []).length;
  if (requireCalls > 0 && importCount > 0) {
    findings.push('Mixed ESM import + CJS require() — pick one module system');
    score -= 10;
  }

  if (findings.length === 0) {
    findings.push(`${externalDeps.length} external, ${internalDeps.length} internal deps`);
  }

  return {
    name: 'Asset Trace',
    score: Math.max(0, score),
    status: score >= 80 ? 'pass' : score >= 60 ? 'warn' : 'fail',
    message: findings[0] || 'Imports resolved',
    findings,
  };
}

// IDENTITY_SEAL: PART-5 | role=dependency analysis | inputs=code,language | outputs=PipelineStage

// ============================================================
// PART 6 — Team 6: Stability (성능/메모리)
// ============================================================

function analyzeStability(code: string, _language: string): PipelineStage {
  const findings: string[] = [];
  let score = 100;
  const lines = code.split('\n');

  // O(n^2) 패턴: 중첩 루프
  let depth = 0;
  let maxDepth = 0;
  let nestedLine = -1;
  for (let i = 0; i < lines.length; i++) {
    if (/\bfor\s*\(/.test(lines[i])) {
      depth++;
      if (depth >= 2 && nestedLine < 0) nestedLine = i;
    }
    if (depth > 0 && lines[i].includes('}')) depth = Math.max(0, depth - 1);
    maxDepth = Math.max(maxDepth, depth);
  }
  if (maxDepth >= 2) {
    findings.push(`L${nestedLine + 1}: Nested loops detected (O(n^2) potential)`);
    score -= 15;
  }

  // 대용량 배열 복사
  for (let i = 0; i < lines.length; i++) {
    if (/\.\.\.(?:arr|list|items|data|array)/i.test(lines[i])) {
      findings.push(`L${i + 1}: Spread operator on potentially large array — consider alternatives`);
      score -= 5;
      break;
    }
  }

  // 메모리 리크 패턴
  if (code.includes('addEventListener') && !code.includes('removeEventListener')) {
    for (let i = 0; i < lines.length; i++) {
      if (/addEventListener/.test(lines[i])) {
        findings.push(`L${i + 1}: addEventListener without removeEventListener — potential memory leak`);
        score -= 15;
        break;
      }
    }
  }

  // 동기 파일 읽기
  for (let i = 0; i < lines.length; i++) {
    if (/readFileSync|writeFileSync/.test(lines[i])) {
      findings.push(`L${i + 1}: Synchronous file I/O — consider async alternatives`);
      score -= 10;
      break;
    }
  }

  return {
    name: 'Stability',
    score: Math.max(0, score),
    status: score >= 80 ? 'pass' : score >= 60 ? 'warn' : 'fail',
    message: findings[0] || 'No performance issues',
    findings,
  };
}

// IDENTITY_SEAL: PART-6 | role=performance and memory analysis | inputs=code,language | outputs=PipelineStage

// ============================================================
// PART 7 — Team 7: Release IP (라이선스)
// ============================================================

function analyzeReleaseIP(code: string, _language: string): PipelineStage {
  const findings: string[] = [];
  let score = 100;
  const lines = code.split('\n');

  // 하드코딩된 시크릿
  for (let i = 0; i < lines.length; i++) {
    if (/(?:api[_-]?key|secret|password|token)\s*[=:]\s*['"][^'"]{8,}['"]/i.test(lines[i])) {
      findings.push(`L${i + 1}: Hardcoded secret detected — use environment variables`);
      score -= 40;
      break;
    }
  }

  // 라이선스 헤더 없음 (대형 파일)
  if (lines.length > 100 && !code.includes('LICENSE') && !code.includes('Copyright') && !code.includes('@license')) {
    findings.push('Large file without license header');
    score -= 5;
  }

  return {
    name: 'Release IP',
    score: Math.max(0, score),
    status: score >= 80 ? 'pass' : score >= 60 ? 'warn' : 'fail',
    message: findings[0] || 'No license issues',
    findings,
  };
}

// IDENTITY_SEAL: PART-7 | role=license and secrets detection | inputs=code,language | outputs=PipelineStage

// ============================================================
// PART 8 — Team 8: Governance (종합)
// ============================================================

function analyzeGovernance(code: string, _language: string): PipelineStage {
  const findings: string[] = [];
  let score = 100;
  const lines = code.split('\n');

  if (lines.length > 300) {
    findings.push(`File is ${lines.length} lines — consider splitting`);
    score -= 10;
  }

  const commentLines = lines.filter((l) => /^\s*(\/\/|\/\*|\*)/.test(l)).length;
  const commentRatio = commentLines / Math.max(1, lines.length);
  if (commentRatio < 0.05 && lines.length > 50) {
    findings.push('Low comment ratio — consider adding documentation');
    score -= 5;
  }

  const exports = (code.match(/\bexport\b/g) || []).length;
  if (exports > 20) {
    findings.push(`${exports} exports — module may have too many responsibilities`);
    score -= 10;
  }

  return {
    name: 'Governance',
    score: Math.max(0, score),
    status: score >= 80 ? 'pass' : score >= 60 ? 'warn' : 'fail',
    message: findings[0] || 'Standards met',
    findings,
  };
}

// IDENTITY_SEAL: PART-8 | role=governance and standards | inputs=code,language | outputs=PipelineStage

// ============================================================
// PART 9 — AST Analysis (TypeScript Compiler API)
// ============================================================
// Dynamic import: TS compiler may not be available at client-side runtime.
// Each detector returns PipelineFinding[] with accurate line numbers.

/**
 * Attempt to load the TypeScript module dynamically.
 * Returns null if unavailable (e.g. client-side bundle without TS).
 */
async function loadTS(): Promise<typeof import('typescript') | null> {
  try {
    // Dynamic import wrapped for environments where TS isn't bundled
    const tsModule = await import('typescript');
    return tsModule;
  } catch {
    return null;
  }
}

/** AST detector: unused imports */
function detectUnusedImportsAST(
  ts: typeof import('typescript'),
  sourceFile: import('typescript').SourceFile,
  code: string,
): PipelineFinding[] {
  const findings: PipelineFinding[] = [];
  const importedNames = new Map<string, { line: number; node: import('typescript').Node }>();

  // Collect all imported names
  ts.forEachChild(sourceFile, (node) => {
    if (ts.isImportDeclaration(node) && node.importClause) {
      const clause = node.importClause;
      // Default import
      if (clause.name) {
        const pos = ts.getLineAndCharacterOfPosition(sourceFile, clause.name.getStart(sourceFile));
        importedNames.set(clause.name.text, { line: pos.line + 1, node: clause.name });
      }
      // Named imports
      if (clause.namedBindings && ts.isNamedImports(clause.namedBindings)) {
        for (const spec of clause.namedBindings.elements) {
          const localName = spec.name.text;
          const pos = ts.getLineAndCharacterOfPosition(sourceFile, spec.name.getStart(sourceFile));
          importedNames.set(localName, { line: pos.line + 1, node: spec.name });
        }
      }
      // Namespace import
      if (clause.namedBindings && ts.isNamespaceImport(clause.namedBindings)) {
        const nsName = clause.namedBindings.name.text;
        const pos = ts.getLineAndCharacterOfPosition(sourceFile, clause.namedBindings.name.getStart(sourceFile));
        importedNames.set(nsName, { line: pos.line + 1, node: clause.namedBindings.name });
      }
    }
  });

  // Count references for each imported name (excluding the import itself)
  for (const [name, info] of importedNames) {
    let refCount = 0;
    const walk = (node: import('typescript').Node) => {
      if (ts.isIdentifier(node) && node.text === name && node !== info.node) {
        // Make sure this isn't the import specifier itself
        const parent = node.parent;
        if (parent && !ts.isImportSpecifier(parent) && !ts.isImportClause(parent) && !ts.isNamespaceImport(parent)) {
          refCount++;
        }
      }
      ts.forEachChild(node, walk);
    };
    ts.forEachChild(sourceFile, walk);

    if (refCount === 0) {
      findings.push({
        line: info.line,
        message: `Unused import: "${name}"`,
        severity: 'warning',
        source: 'ast',
      });
    }
  }

  return findings;
}

/** AST detector: unused variables */
function detectUnusedVariablesAST(
  ts: typeof import('typescript'),
  sourceFile: import('typescript').SourceFile,
): PipelineFinding[] {
  const findings: PipelineFinding[] = [];
  const declarations = new Map<string, { line: number; node: import('typescript').Node }>();

  const collectDeclarations = (node: import('typescript').Node) => {
    if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name)) {
      const pos = ts.getLineAndCharacterOfPosition(sourceFile, node.name.getStart(sourceFile));
      declarations.set(node.name.text, { line: pos.line + 1, node: node.name });
    }
    ts.forEachChild(node, collectDeclarations);
  };
  ts.forEachChild(sourceFile, collectDeclarations);

  for (const [name, info] of declarations) {
    // Skip underscore-prefixed (intentionally unused)
    if (name.startsWith('_')) continue;

    let refCount = 0;
    const walk = (node: import('typescript').Node) => {
      if (ts.isIdentifier(node) && node.text === name && node !== info.node) {
        const parent = node.parent;
        if (parent && !ts.isVariableDeclaration(parent)) {
          refCount++;
        }
      }
      ts.forEachChild(node, walk);
    };
    ts.forEachChild(sourceFile, walk);

    if (refCount === 0) {
      findings.push({
        line: info.line,
        message: `Unused variable: "${name}"`,
        severity: 'warning',
        source: 'ast',
      });
    }
  }

  return findings;
}

/** AST detector: missing return type on exported functions */
function detectMissingReturnTypeAST(
  ts: typeof import('typescript'),
  sourceFile: import('typescript').SourceFile,
): PipelineFinding[] {
  const findings: PipelineFinding[] = [];

  const check = (node: import('typescript').Node) => {
    const mods = ts.canHaveModifiers(node) ? ts.getModifiers(node) : undefined;
    const isExported =
      mods?.some((m: import('typescript').Modifier) => m.kind === ts.SyntaxKind.ExportKeyword) ?? false;

    if (isExported && ts.isFunctionDeclaration(node) && node.name && !node.type) {
      const pos = ts.getLineAndCharacterOfPosition(sourceFile, node.name.getStart(sourceFile));
      findings.push({
        line: pos.line + 1,
        message: `Exported function "${node.name.text}" missing return type annotation`,
        severity: 'info',
        source: 'ast',
      });
    }

    // Also check exported arrow functions via variable declarations
    if (isExported && ts.isVariableStatement(node)) {
      for (const decl of node.declarationList.declarations) {
        if (
          ts.isIdentifier(decl.name) &&
          decl.initializer &&
          ts.isArrowFunction(decl.initializer) &&
          !decl.initializer.type &&
          !decl.type
        ) {
          const pos = ts.getLineAndCharacterOfPosition(sourceFile, decl.name.getStart(sourceFile));
          findings.push({
            line: pos.line + 1,
            message: `Exported arrow function "${decl.name.text}" missing return type annotation`,
            severity: 'info',
            source: 'ast',
          });
        }
      }
    }

    ts.forEachChild(node, check);
  };
  ts.forEachChild(sourceFile, check);

  return findings;
}

/** AST detector: empty function bodies */
function detectEmptyFunctionsAST(
  ts: typeof import('typescript'),
  sourceFile: import('typescript').SourceFile,
): PipelineFinding[] {
  const findings: PipelineFinding[] = [];

  const check = (node: import('typescript').Node) => {
    let body: import('typescript').Block | undefined;
    let name = '<anonymous>';

    if (ts.isFunctionDeclaration(node) && node.body) {
      body = node.body;
      name = node.name?.text ?? '<anonymous>';
    } else if (ts.isMethodDeclaration(node) && node.body) {
      body = node.body;
      name = ts.isIdentifier(node.name) ? node.name.text : '<computed>';
    } else if (ts.isArrowFunction(node) && ts.isBlock(node.body) && node.body.statements.length === 0) {
      body = node.body;
    }

    if (body && body.statements.length === 0) {
      const pos = ts.getLineAndCharacterOfPosition(sourceFile, node.getStart(sourceFile));
      findings.push({
        line: pos.line + 1,
        message: `Empty function body: "${name}"`,
        severity: 'warning',
        source: 'ast',
      });
    }

    ts.forEachChild(node, check);
  };
  ts.forEachChild(sourceFile, check);

  return findings;
}

/**
 * Run all AST detectors on the given code.
 * Returns empty array if TS compiler is unavailable.
 */
async function runASTAnalysis(
  code: string,
  fileName: string,
): Promise<PipelineFinding[]> {
  const ts = await loadTS();
  if (!ts) {
    logger.warn('pipeline', 'TypeScript compiler not available for AST analysis');
    return [];
  }

  // Determine script kind from file extension
  let scriptKind = ts.ScriptKind.TS;
  if (fileName.endsWith('.tsx') || fileName.endsWith('.jsx')) {
    scriptKind = ts.ScriptKind.TSX;
  } else if (fileName.endsWith('.js')) {
    scriptKind = ts.ScriptKind.JS;
  } else if (fileName.endsWith('.jsx')) {
    scriptKind = ts.ScriptKind.JSX;
  }

  const sourceFile = ts.createSourceFile(
    fileName,
    code,
    ts.ScriptTarget.Latest,
    /* setParentNodes */ true,
    scriptKind,
  );

  const allFindings: PipelineFinding[] = [
    ...detectUnusedImportsAST(ts, sourceFile, code),
    ...detectUnusedVariablesAST(ts, sourceFile),
    ...detectMissingReturnTypeAST(ts, sourceFile),
    ...detectEmptyFunctionsAST(ts, sourceFile),
  ];

  return allFindings;
}

// IDENTITY_SEAL: PART-9 | role=AST-based code analysis via TS compiler | inputs=code,fileName | outputs=PipelineFinding[]

// ============================================================
// PART 10 — Pipeline Runner (with AST merge)
// ============================================================

/**
 * Merge AST findings into a PipelineStage by deducting score and adding findings.
 * AST findings take priority over regex findings on the same line+message.
 */
function mergeASTFindings(
  stage: PipelineStage,
  astFindings: PipelineFinding[],
  category: string,
): PipelineStage {
  if (astFindings.length === 0) return stage;

  const existingSet = new Set(stage.findings.map((f) => f.toLowerCase()));
  const merged = [...stage.findings];
  let scoreAdjust = 0;

  for (const af of astFindings) {
    const fStr = `L${af.line}: ${af.message}`;
    const lower = fStr.toLowerCase();

    // Check for duplicates (same line, similar message)
    const isDuplicate = merged.some((existing) => {
      const existingLower = existing.toLowerCase();
      // Same line reference and overlapping content
      if (existingLower.includes(`l${af.line}:`) && existingLower.includes(af.message.toLowerCase().slice(0, 20))) {
        return true;
      }
      return existingSet.has(lower);
    });

    if (!isDuplicate) {
      merged.push(`[AST] ${fStr}`);
      scoreAdjust -= (af.severity === 'error' ? 15 : af.severity === 'warning' ? 5 : 2);
    }
  }

  const newScore = Math.max(0, stage.score + scoreAdjust);
  return {
    ...stage,
    score: newScore,
    status: newScore >= 80 ? 'pass' : newScore >= 60 ? 'warn' : 'fail',
    findings: merged,
    message: merged[0] || stage.message,
  };
}

/** Deduplicate findings within a stage (exact match) */
function deduplicateFindings(stage: PipelineStage): PipelineStage {
  const seen = new Set<string>();
  const unique: string[] = [];
  for (const f of stage.findings) {
    const key = f.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      unique.push(f);
    }
  }
  return { ...stage, findings: unique };
}

/**
 * Synchronous pipeline runner (original behavior, no AST).
 * Use this when AST analysis is not needed or in sync contexts.
 */
export function runStaticPipeline(code: string, language: string): PipelineResult {
  const stages: PipelineStage[] = [
    analyzeSimulation(code, language),
    analyzeGeneration(code, language),
    analyzeValidation(code, language),
    analyzeSizeDensity(code, language),
    analyzeAssetTrace(code, language),
    analyzeStability(code, language),
    analyzeReleaseIP(code, language),
    analyzeGovernance(code, language),
  ].map(deduplicateFindings);

  // ── Good Pattern Detection — 양품 패턴 점수 보정 ──
  const goodPatterns = detectGoodPatterns(code);
  const baseScore = Math.round(stages.reduce((s, t) => s + t.score, 0) / stages.length);
  const overallScore = Math.min(100, baseScore + goodPatterns.scoreBonus);
  const overallStatus = overallScore >= 80 ? 'pass' : overallScore >= 60 ? 'warn' : 'fail';

  return { stages, overallScore, overallStatus, timestamp: Date.now(), goodPatterns };
}

/**
 * Async pipeline runner with AST analysis merged.
 * Falls back to regex-only if AST is unavailable.
 * @param fileName - e.g. "index.tsx", used for AST scriptKind detection
 */
export async function runStaticPipelineWithAST(
  code: string,
  language: string,
  fileName?: string,
): Promise<PipelineResult> {
  // Run regex-based pipeline
  const baseResult = runStaticPipeline(code, language);

  // Determine if AST analysis applies
  const isJSTS = /typescript|javascript|tsx|jsx|ts|js/i.test(language);
  if (!isJSTS) return baseResult;

  const resolvedName = fileName || `file.${language.includes('tsx') ? 'tsx' : language.includes('jsx') ? 'jsx' : language.includes('javascript') ? 'js' : 'ts'}`;

  // Run AST analysis
  const astFindings = await runASTAnalysis(code, resolvedName);
  if (astFindings.length === 0) return baseResult;

  // Categorize AST findings and merge into appropriate stages
  const unusedImportFindings = astFindings.filter((f) => f.message.startsWith('Unused import'));
  const unusedVarFindings = astFindings.filter((f) => f.message.startsWith('Unused variable'));
  const missingReturnFindings = astFindings.filter((f) => f.message.includes('missing return type'));
  const emptyFuncFindings = astFindings.filter((f) => f.message.startsWith('Empty function'));

  const stages = [...baseResult.stages];

  // Merge unused imports/vars into Validation (index 2)
  stages[2] = mergeASTFindings(stages[2], [...unusedImportFindings, ...unusedVarFindings], 'validation');

  // Merge missing return types into Governance (index 7)
  stages[7] = mergeASTFindings(stages[7], missingReturnFindings, 'governance');

  // Merge empty functions into Generation (index 1)
  stages[1] = mergeASTFindings(stages[1], emptyFuncFindings, 'generation');

  // Deduplicate all stages
  const dedupedStages = stages.map(deduplicateFindings);

  const overallScore = Math.round(dedupedStages.reduce((s, t) => s + t.score, 0) / dedupedStages.length);
  const overallStatus = overallScore >= 80 ? 'pass' : overallScore >= 60 ? 'warn' : 'fail';

  return { stages: dedupedStages, overallScore, overallStatus, timestamp: Date.now() };
}

// IDENTITY_SEAL: PART-10 | role=PipelineRunner (sync + async with AST merge) | inputs=code,language,fileName | outputs=PipelineResult

// ============================================================
// PART 11 — Multi-AI Review (AI 기반 코드 리뷰)
// ============================================================

export interface AIReviewRequest {
  code: string;
  language: string;
  context?: string;
  reviewFocus?: ('security' | 'performance' | 'readability' | 'architecture')[];
}

export interface AIReviewComment {
  line: number;
  severity: 'critical' | 'warning' | 'suggestion';
  category: string;
  message: string;
  suggestedFix?: string;
}

export interface AIReviewResult {
  comments: AIReviewComment[];
  summary: string;
  score: number;
  reviewerId: string;
  timestamp: number;
}

/**
 * Multi-AI 리뷰를 위한 프롬프트 생성.
 * 실제 AI 호출은 호출 측(CodeStudioShell 등)에서 streamChat으로 수행.
 */
export function buildReviewPrompt(req: AIReviewRequest): string {
  const focusStr = req.reviewFocus?.join(', ') || 'general quality';
  return [
    `You are a senior code reviewer. Review the following ${req.language} code.`,
    `Focus on: ${focusStr}.`,
    req.context ? `Context: ${req.context}` : '',
    '',
    'Respond in strict JSON format:',
    '{ "comments": [{ "line": number, "severity": "critical"|"warning"|"suggestion", "category": string, "message": string, "suggestedFix"?: string }], "summary": string, "score": number(0-100) }',
    '',
    '```' + req.language,
    req.code,
    '```',
  ].filter(Boolean).join('\n');
}

/**
 * AI 리뷰 응답 파싱. JSON 파싱 실패 시 빈 결과 반환.
 */
export function parseReviewResponse(raw: string, reviewerId: string): AIReviewResult {
  try {
    const jsonMatch = raw.match(/```(?:json)?\s*([\s\S]*?)```/) || raw.match(/(\{[\s\S]*\})/);
    if (!jsonMatch) throw new Error('No JSON found');
    const parsed = JSON.parse(jsonMatch[1]) as { comments?: AIReviewComment[]; summary?: string; score?: number };
    return {
      comments: Array.isArray(parsed.comments) ? parsed.comments : [],
      summary: typeof parsed.summary === 'string' ? parsed.summary : 'Review completed',
      score: typeof parsed.score === 'number' ? Math.max(0, Math.min(100, parsed.score)) : 50,
      reviewerId,
      timestamp: Date.now(),
    };
  } catch {
    return {
      comments: [],
      summary: 'Failed to parse AI review response',
      score: 0,
      reviewerId,
      timestamp: Date.now(),
    };
  }
}

// IDENTITY_SEAL: PART-11 | role=MultiAIReview prompt builder & parser | inputs=AIReviewRequest,raw string | outputs=AIReviewResult

// ============================================================
// PART 12 — Full Pipeline (New 8-Team from pipeline-teams.ts)
// ============================================================

import {
  runTeam1Simulation,
  runTeam2Generation,
  runTeam3Validation,
  runTeam4SizeDensity,
  runTeam5AssetTrace,
  runTeam6Stability,
  runTeam7ReleaseIP,
  runTeam8Governance,
  type TeamResult as FullTeamResult,
} from './pipeline-teams';

export type { FullTeamResult };

export interface FullPipelineCallbacks {
  onTeamStart?: (stage: string) => void;
  onTeamComplete?: (result: FullTeamResult) => void;
  signal?: AbortSignal;
}

export interface FullPipelineResult {
  id: string;
  timestamp: number;
  overallStatus: 'pass' | 'warn' | 'fail';
  overallScore: number;
  stages: FullTeamResult[];
  /** 양품 패턴 탐지 결과 (good-pattern-catalog 기반) */
  goodPatterns?: GoodPatternReport;
}

type TeamFn = (code: string, language: string, fileName: string) => FullTeamResult;

/** Keep stage order / blocking flags in sync with `core/pipeline-execution-model.ts` (`PIPELINE_TEAM_STAGES`). */
const FULL_TEAMS: { stage: string; run: TeamFn; blocking: boolean }[] = [
  { stage: 'simulation',   run: runTeam1Simulation,   blocking: false },
  { stage: 'generation',   run: runTeam2Generation,   blocking: false },
  { stage: 'validation',   run: runTeam3Validation,   blocking: true  },
  { stage: 'size-density',  run: runTeam4SizeDensity,  blocking: false },
  { stage: 'asset-trace',   run: runTeam5AssetTrace,   blocking: false },
  { stage: 'stability',     run: runTeam6Stability,    blocking: false },
  { stage: 'release-ip',    run: runTeam7ReleaseIP,    blocking: true  },
  { stage: 'governance',    run: runTeam8Governance,   blocking: false },
];

/**
 * Run all 8 new teams: parallel for non-blocking, sequential for blocking.
 * Supports abort via signal and progress callbacks.
 */
export async function runFullPipeline(
  code: string,
  language: string,
  fileName: string,
  callbacks?: FullPipelineCallbacks,
): Promise<FullPipelineResult> {
  const results: FullTeamResult[] = [];

  const parallelTeams = FULL_TEAMS.filter((t) => !t.blocking);
  const blockingTeams = FULL_TEAMS.filter((t) => t.blocking);

  // Run non-blocking teams in parallel
  if (!callbacks?.signal?.aborted) {
    const promises = parallelTeams.map(async (team) => {
      if (callbacks?.signal?.aborted) return null;
      callbacks?.onTeamStart?.(team.stage);
      try {
        const result = team.run(code, language, fileName);
        callbacks?.onTeamComplete?.(result);
        return result;
      } catch (err) {
        const errorResult: FullTeamResult = {
          stage: team.stage,
          status: 'fail',
          score: 0,
          findings: [{ severity: 'critical', message: `오류: ${(err as Error).message}`, rule: 'TEAM_ERROR' }],
        };
        callbacks?.onTeamComplete?.(errorResult);
        return errorResult;
      }
    });

    const parallelResults = await Promise.all(promises);
    for (const r of parallelResults) {
      if (r) results.push(r);
    }
  }

  // Run blocking teams sequentially
  for (const team of blockingTeams) {
    if (callbacks?.signal?.aborted) break;
    callbacks?.onTeamStart?.(team.stage);
    try {
      const result = team.run(code, language, fileName);
      results.push(result);
      callbacks?.onTeamComplete?.(result);
    } catch (err) {
      const errorResult: FullTeamResult = {
        stage: team.stage,
        status: 'fail',
        score: 0,
        findings: [{ severity: 'critical', message: `오류: ${(err as Error).message}`, rule: 'TEAM_ERROR' }],
      };
      results.push(errorResult);
      callbacks?.onTeamComplete?.(errorResult);
    }
  }

  // ── Good Pattern Detection — 양품 패턴 점수 보정 ──
  const goodPatterns = detectGoodPatterns(code);

  const baseAvg = results.length > 0
    ? Math.round(results.reduce((s, r) => s + r.score, 0) / results.length)
    : 0;
  const avgScore = Math.min(100, baseAvg + goodPatterns.scoreBonus);

  const hasFail = results.some((r) => r.status === 'fail');
  const hasWarn = results.some((r) => r.status === 'warn');

  return {
    id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `pipe_${Date.now()}`,
    timestamp: Date.now(),
    overallStatus: hasFail ? 'fail' : hasWarn ? 'warn' : 'pass',
    overallScore: avgScore,
    stages: results,
    goodPatterns,
  };
}

// IDENTITY_SEAL: PART-12 | role=FullPipeline orchestrator | inputs=code,language,fileName,callbacks | outputs=FullPipelineResult

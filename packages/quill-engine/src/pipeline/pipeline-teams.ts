// ============================================================
// Code Studio — 8-Team Pipeline (Static Analysis, No AI)
// ============================================================
// Each team: (code, language, fileName) => TeamResult
// Pure regex + heuristic based analysis.

import { detectGoodPatterns, downgradeFindings } from './good-pattern-detector';
import { applyScopePolicyToFindings } from '../scope-policy';

// ============================================================
// PART 1 — Shared Types
// ============================================================

export type TeamStatus = 'pending' | 'running' | 'pass' | 'warn' | 'fail';
export type Severity = 'critical' | 'major' | 'minor' | 'info';

export interface Finding {
  severity: Severity;
  message: string;
  line?: number;
  rule?: string;
}

export interface TeamResult {
  stage: string;
  status: TeamStatus;
  score: number;
  findings: Finding[];
  metrics?: Record<string, number>;
}

// IDENTITY_SEAL: PART-1 | role=Types | inputs=none | outputs=TeamResult,Finding

// ============================================================
// PART 2 — Team 1: Simulation (Intent + Complexity)
// ============================================================

type IntentType = 'generation' | 'repair' | 'review' | 'refactor' | 'explain' | 'unknown';

const INTENT_PATTERNS: { type: IntentType; patterns: RegExp[] }[] = [
  { type: 'generation', patterns: [/(?:생성|만들|작성|추가|구현|create|generate|add|implement|build|write)\b/i] },
  { type: 'repair', patterns: [/(?:수정|고치|fix|repair|bug|버그|에러|error|오류|patch)\b/i] },
  { type: 'review', patterns: [/(?:리뷰|검토|review|analyze|분석|check|확인|audit)\b/i] },
  { type: 'refactor', patterns: [/(?:리팩토링|refactor|개선|optimize|최적화|정리|cleanup)\b/i] },
  { type: 'explain', patterns: [/(?:설명|explain|이해|understand|뭐|what|어떻게|how|왜|why)\b/i] },
];

function classifyIntent(code: string): IntentType {
  for (const { type, patterns } of INTENT_PATTERNS) {
    if (patterns.some((p) => p.test(code))) return type;
  }
  return code.trim().length > 10 ? 'review' : 'unknown';
}

function calculateCyclomaticComplexity(code: string): number {
  let complexity = 1;
  const patterns = [
    { regex: /\bif\s*\(/g, label: 'if' },
    { regex: /\belse\s+if\s*\(/g, label: 'else if' },
    { regex: /\bwhile\s*\(/g, label: 'while' },
    { regex: /\bfor\s*\(/g, label: 'for' },
    { regex: /\bcase\s+[^:]+:/g, label: 'case' },
    { regex: /\bcatch\s*\(/g, label: 'catch' },
    { regex: /&&/g, label: '&&' },
    { regex: /\|\|/g, label: '||' },
  ];

  const ifCount = (code.match(/\bif\s*\(/g) ?? []).length;
  const elseIfCount = (code.match(/\belse\s+if\s*\(/g) ?? []).length;
  complexity += ifCount - elseIfCount;
  complexity += elseIfCount;

  for (const { regex, label } of patterns) {
    if (label === 'if' || label === 'else if') continue;
    complexity += (code.match(regex) ?? []).length;
  }

  const ternaryCount = (code.match(/\?[^?.:\n][^:\n]*:/g) ?? []).length;
  complexity += ternaryCount;

  return complexity;
}

function calculateCognitiveComplexity(code: string): number {
  const lines = code.split('\n');
  let complexity = 0;
  let nestingLevel = 0;
  const flowBreakers = /\b(if|else\s+if|else|for|while|do|switch|catch|try)\b/;
  const logicalOps = /&&|\|\|/g;

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('//') || trimmed.startsWith('/*') || trimmed.startsWith('*') || !trimmed) continue;

    const flowMatch = trimmed.match(flowBreakers);
    if (flowMatch) {
      complexity += 1;
      if (flowMatch[1] !== 'else') {
        complexity += nestingLevel;
      }
    }

    const logicMatches = trimmed.match(logicalOps);
    if (logicMatches) complexity += logicMatches.length;

    const opens = (trimmed.match(/\{/g) || []).length;
    const closes = (trimmed.match(/\}/g) || []).length;
    nestingLevel += opens - closes;
    if (nestingLevel < 0) nestingLevel = 0;
  }

  return complexity;
}

export function runTeam1Simulation(code: string, _language: string, _fileName: string): TeamResult {
  const findings: Finding[] = [];
  const intent = classifyIntent(code);
  const lines = code.split('\n').length;
  const cyclomatic = calculateCyclomaticComplexity(code);
  const cognitive = calculateCognitiveComplexity(code);

  if (cyclomatic > 20) {
    findings.push({ severity: 'major', message: `순환 복잡도 ${cyclomatic} (매우 높음)`, rule: 'HIGH_CYCLOMATIC' });
  } else if (cyclomatic > 10) {
    findings.push({ severity: 'minor', message: `순환 복잡도 ${cyclomatic} (높음)`, rule: 'MOD_CYCLOMATIC' });
  }

  if (cognitive > 30) {
    findings.push({ severity: 'major', message: `인지 복잡도 ${cognitive} (매우 높음)`, rule: 'HIGH_COGNITIVE' });
  } else if (cognitive > 15) {
    findings.push({ severity: 'minor', message: `인지 복잡도 ${cognitive} (높음)`, rule: 'MOD_COGNITIVE' });
  }

  const importCount = (code.match(/(?:import|require)\s*\(?/g) || []).length;
  if (importCount > 10) {
    findings.push({ severity: 'minor', message: `다수 의존성 (${importCount}개 import)`, rule: 'MANY_IMPORTS' });
  }

  const score = Math.max(0, 100
    - findings.filter((f) => f.severity === 'critical').length * 25
    - findings.filter((f) => f.severity === 'major').length * 15
    - findings.filter((f) => f.severity === 'minor').length * 5);

  return {
    stage: 'simulation',
    status: score >= 80 ? 'pass' : score >= 50 ? 'warn' : 'fail',
    score,
    findings,
    metrics: { intent: intent.length, lines, cyclomatic, cognitive },
  };
}

// IDENTITY_SEAL: PART-2 | role=Simulation | inputs=code,lang,file | outputs=TeamResult

// ============================================================
// PART 3 — Team 2: Generation (Structure + Naming + Types)
// ============================================================

interface FunctionInfo {
  name: string;
  line: number;
  bodyLines: number;
  params: number;
}

function extractFunctions(code: string): FunctionInfo[] {
  const lines = code.split('\n');
  const fns: FunctionInfo[] = [];
  let braceDepth = 0;
  let current: FunctionInfo | null = null;

  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim();
    const fnMatch = trimmed.match(
      /(?:(?:export\s+)?(?:async\s+)?function\s+(\w+)|(?:const|let)\s+(\w+)\s*=\s*(?:async\s*)?\([^)]*\)\s*(?::[^=]*?)?\s*=>)/,
    );
    if (fnMatch) {
      const name = fnMatch[1] || fnMatch[2];
      const paramMatch = trimmed.match(/\(([^)]*)\)/);
      const params = paramMatch ? paramMatch[1].split(',').filter((p) => p.trim()).length : 0;
      current = { name, line: i + 1, bodyLines: 0, params };
      fns.push(current);
    }
    const opens = (lines[i].match(/\{/g) || []).length;
    const closes = (lines[i].match(/\}/g) || []).length;
    if (current) current.bodyLines++;
    braceDepth += opens - closes;
    if (braceDepth <= 0 && current) current = null;
  }
  return fns;
}

export function runTeam2Generation(code: string, _language: string, _fileName: string): TeamResult {
  const findings: Finding[] = [];
  const fns = extractFunctions(code);
  const lines = code.split('\n');

  // Empty function bodies
  for (const fn of fns) {
    if (fn.bodyLines <= 2) {
      const bodyLine = lines[fn.line - 1]?.trim() ?? '';
      if (/\{\s*\}/.test(bodyLine)) {
        findings.push({ severity: 'major', message: `빈 함수 본문: ${fn.name}()`, line: fn.line, rule: 'EMPTY_FUNCTION' });
      }
    }
  }

  // Type safety: any usage
  for (let i = 0; i < lines.length; i++) {
    const stripped = lines[i].replace(/"[^"]*"|'[^']*'|`[^`]*`/g, '""');
    if (/:\s*any\b/.test(stripped) || /<any>/.test(stripped)) {
      findings.push({ severity: 'major', message: `'any' 타입 사용 감지`, line: i + 1, rule: 'TYPE_SAFETY_ANY' });
    }
  }

  // Naming: class should be PascalCase
  for (let i = 0; i < lines.length; i++) {
    const classMatch = lines[i].match(/(?:export\s+)?class\s+(\w+)/);
    if (classMatch && /^[a-z]/.test(classMatch[1])) {
      findings.push({ severity: 'minor', message: `클래스명 소문자 시작: ${classMatch[1]}`, line: i + 1, rule: 'NAMING_CLASS' });
    }
  }

  // Duplicate 3-line blocks
  const blockHashes = new Map<string, number>();
  for (let i = 0; i < lines.length - 2; i++) {
    const block = lines.slice(i, i + 3).map((l) => l.trim()).filter((l) => l && !l.startsWith('//')).join('|');
    if (block.length < 20) continue;
    const prev = blockHashes.get(block);
    if (prev !== undefined && i - prev > 3) {
      findings.push({ severity: 'minor', message: `중복 코드 블록 (L${prev + 1}과 유사)`, line: i + 1, rule: 'DUPLICATE_BLOCK' });
    } else {
      blockHashes.set(block, i);
    }
  }

  const totalFunctions = fns.length;
  const avgLen = totalFunctions > 0 ? Math.round(fns.reduce((s, f) => s + f.bodyLines, 0) / totalFunctions) : 0;
  const majors = findings.filter((f) => f.severity === 'major').length;
  const minors = findings.filter((f) => f.severity === 'minor').length;
  const score = Math.max(0, 100 - majors * 15 - minors * 5);

  return {
    stage: 'generation',
    status: majors > 0 ? 'warn' : 'pass',
    score,
    findings,
    metrics: { functions: totalFunctions, avgFunctionLength: avgLen },
  };
}

// IDENTITY_SEAL: PART-3 | role=Generation | inputs=code,lang,file | outputs=TeamResult

// ============================================================
// PART 4 — Team 3: Validation (Security + Logic + Null + Async)
// ============================================================

const VALIDATION_RULES: { pattern: RegExp; severity: Severity; message: string; rule: string }[] = [
  { pattern: /\beval\s*\(/, severity: 'critical', message: 'eval() 사용 감지 — 보안 위험', rule: 'NO_EVAL' },
  { pattern: /\bexec\s*\(/, severity: 'critical', message: 'exec() 사용 감지', rule: 'NO_EXEC' },
  { pattern: /os\.system\s*\(/, severity: 'critical', message: 'os.system() 사용 감지', rule: 'NO_OS_SYSTEM' },
  { pattern: /\bpassword\s*=\s*["'][^"']+["']/, severity: 'critical', message: '하드코딩된 비밀번호 감지', rule: 'NO_HARDCODED_SECRET' },
  { pattern: /(?:api[_-]?key|secret|token)\s*=\s*["'][A-Za-z0-9_-]{16,}["']/, severity: 'critical', message: '하드코딩된 API 키/토큰', rule: 'NO_HARDCODED_KEY' },
  { pattern: /\/\/\s*(?:TODO|FIXME|HACK|XXX)\b|\/\*\s*(?:TODO|FIXME|HACK|XXX)\b/, severity: 'major', message: 'TODO/FIXME/HACK 잔존', rule: 'NO_TODO' },
  { pattern: /debugger\s*;?/, severity: 'major', message: 'debugger 문 잔존', rule: 'NO_DEBUGGER' },
];

function checkBrackets(code: string): Finding | null {
  const stack: { char: string; line: number }[] = [];
  const pairs: Record<string, string> = { '(': ')', '[': ']', '{': '}' };
  const closers = new Set(Object.values(pairs));
  const lines = code.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].replace(/\/\/.*$/, '').replace(/"[^"]*"|'[^']*'|`[^`]*`/g, '');
    for (const ch of line) {
      if (pairs[ch]) stack.push({ char: ch, line: i + 1 });
      else if (closers.has(ch)) {
        const last = stack.pop();
        if (!last || pairs[last.char] !== ch) {
          return { severity: 'critical', message: `괄호 불일치: '${ch}'`, line: i + 1, rule: 'BRACKET_MISMATCH' };
        }
      }
    }
  }

  if (stack.length > 0) {
    const last = stack[stack.length - 1];
    return { severity: 'critical', message: `닫히지 않은 괄호: '${last.char}'`, line: last.line, rule: 'BRACKET_UNCLOSED' };
  }
  return null;
}

function checkUnusedImports(code: string): Finding[] {
  const findings: Finding[] = [];
  const lines = code.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const match = lines[i].match(/import\s+(?:\{([^}]+)\}|(\w+))\s+from/);
    if (!match) continue;

    const names = (match[1] || match[2] || '')
      .split(',')
      .map((n) => n.trim().split(' as ').pop()?.trim())
      .filter(Boolean) as string[];

    const rest = code.slice(code.indexOf('\n', code.indexOf(lines[i])) + 1);
    for (const name of names) {
      if (name && !new RegExp(`\\b${name}\\b`).test(rest)) {
        findings.push({ severity: 'minor', message: `미사용 import: '${name}'`, line: i + 1, rule: 'UNUSED_IMPORT' });
      }
    }
  }
  return findings;
}

function checkAsyncPatterns(code: string): Finding[] {
  const findings: Finding[] = [];
  const lines = code.split('\n');

  // Async without await detection
  let inAsyncFn = false;
  let asyncFnStart = 0;
  let hasAwait = false;
  let asyncFnDepth = 0;
  let braceDepth = 0;

  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim();

    if (/(?:async\s+function\s|=\s*async\s)/.test(trimmed)) {
      inAsyncFn = true;
      asyncFnStart = i + 1;
      hasAwait = false;
      asyncFnDepth = braceDepth;
    }

    const opens = (lines[i].match(/\{/g) || []).length;
    const closes = (lines[i].match(/\}/g) || []).length;
    braceDepth += opens - closes;

    if (inAsyncFn) {
      if (/\bawait\b/.test(trimmed)) hasAwait = true;
      if (braceDepth <= asyncFnDepth) {
        if (!hasAwait) {
          findings.push({ severity: 'minor', message: `async 함수에 await 없음`, line: asyncFnStart, rule: 'ASYNC_WITHOUT_AWAIT' });
        }
        inAsyncFn = false;
      }
    }
  }

  return findings;
}

function checkNullSafety(code: string): Finding[] {
  const findings: Finding[] = [];
  const lines = code.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const stripped = lines[i].replace(/"[^"]*"|'[^']*'|`[^`]*`/g, '""');
    if (/\.(find|querySelector|getElementById)\s*\([^)]*\)\s*\./.test(stripped)) {
      if (!/\.(find|querySelector|getElementById)\s*\([^)]*\)\s*\?\./.test(stripped)) {
        findings.push({ severity: 'major', message: 'null 가능 반환값에 직접 속성 접근', line: i + 1, rule: 'MISSING_OPTIONAL_CHAIN' });
      }
    }
  }
  return findings;
}

// --- gstack #15: 런타임 호환성 (SSR/CSR API 혼용 감지) ---

const NODE_ONLY_APIS = [
  { pattern: /\brequire\s*\(\s*['"]fs['"]/, api: 'fs', rule: 'NODE_ONLY_FS' },
  { pattern: /\brequire\s*\(\s*['"]child_process['"]/, api: 'child_process', rule: 'NODE_ONLY_CP' },
  { pattern: /\brequire\s*\(\s*['"]path['"]/, api: 'path', rule: 'NODE_ONLY_PATH' },
  { pattern: /\bimport\b.*\bfrom\s+['"]fs['"]/, api: 'fs', rule: 'NODE_ONLY_FS' },
  { pattern: /\bimport\b.*\bfrom\s+['"]child_process['"]/, api: 'child_process', rule: 'NODE_ONLY_CP' },
  { pattern: /\bprocess\.env\b/, api: 'process.env', rule: 'NODE_PROCESS_ENV' },
];

const BROWSER_ONLY_APIS = [
  { pattern: /\bdocument\.(getElementById|querySelector|createElement)\b/, api: 'document DOM', rule: 'BROWSER_ONLY_DOM' },
  { pattern: /\bwindow\.(location|history|navigator|innerWidth|innerHeight)\b/, api: 'window.*', rule: 'BROWSER_ONLY_WINDOW' },
  { pattern: /\blocalStorage\b|\bsessionStorage\b/, api: 'localStorage/sessionStorage', rule: 'BROWSER_ONLY_STORAGE' },
  { pattern: /\balert\s*\(|\bconfirm\s*\(|\bprompt\s*\(/, api: 'alert/confirm/prompt', rule: 'BROWSER_ONLY_DIALOG' },
];

function checkRuntimeCompat(code: string, lines: string[]): Finding[] {
  const findings: Finding[] = [];
  const hasUseClient = /^['"]use client['"]/.test(code.trim());
  const hasUseServer = /^['"]use server['"]/.test(code.trim());
  const isComponent = /\bexport\s+(?:default\s+)?function\s+[A-Z]/.test(code) || /\bexport\s+default\s+[A-Z]/.test(code);

  // 서버 전용 API가 클라이언트 코드에서 사용됨
  if (hasUseClient || (!hasUseServer && isComponent)) {
    for (let i = 0; i < lines.length; i++) {
      for (const { pattern, api, rule } of NODE_ONLY_APIS) {
        if (pattern.test(lines[i]) && rule !== 'NODE_PROCESS_ENV') {
          findings.push({ severity: 'major', message: `클라이언트 코드에서 Node.js API '${api}' 사용`, line: i + 1, rule });
        }
      }
    }
  }

  // 브라우저 전용 API가 서버 코드에서 사용됨
  if (hasUseServer) {
    for (let i = 0; i < lines.length; i++) {
      for (const { pattern, api, rule } of BROWSER_ONLY_APIS) {
        if (pattern.test(lines[i])) {
          findings.push({ severity: 'major', message: `서버 코드에서 브라우저 API '${api}' 사용`, line: i + 1, rule });
        }
      }
    }
  }

  // SSR 안전성: typeof window 가드 없이 직접 접근
  if (!hasUseClient && isComponent) {
    for (let i = 0; i < lines.length; i++) {
      if (/\bwindow\b/.test(lines[i]) && !/typeof\s+window/.test(lines[i])) {
        const prevLines = lines.slice(Math.max(0, i - 3), i).join('\n');
        if (!/typeof\s+window/.test(prevLines)) {
          findings.push({ severity: 'minor', message: 'SSR 환경에서 typeof 가드 없이 window 접근', line: i + 1, rule: 'SSR_WINDOW_GUARD' });
          break; // 한 번만 보고
        }
      }
    }
  }

  return findings;
}

export function runTeam3Validation(code: string, _language: string, _fileName: string): TeamResult {
  const findings: Finding[] = [];
  const lines = code.split('\n');

  for (let i = 0; i < lines.length; i++) {
    for (const rule of VALIDATION_RULES) {
      if (rule.pattern.test(lines[i])) {
        findings.push({ severity: rule.severity, message: rule.message, line: i + 1, rule: rule.rule });
      }
    }
  }

  const bracketResult = checkBrackets(code);
  if (bracketResult) findings.push(bracketResult);
  findings.push(...checkUnusedImports(code));
  findings.push(...checkNullSafety(code));
  findings.push(...checkAsyncPatterns(code));
  findings.push(...checkRuntimeCompat(code, lines));

  // ── Good Pattern Suppression — 양품 패턴으로 오탐 경감 ──
  const goodReport = detectGoodPatterns(code);
  const adjusted = goodReport.suppressedRules.length > 0
    ? downgradeFindings(findings, goodReport)
    : findings;

  const criticals = adjusted.filter((f) => f.severity === 'critical').length;
  const majors = adjusted.filter((f) => f.severity === 'major').length;
  const minors = adjusted.filter((f) => f.severity === 'minor').length;
  const baseScore = Math.max(0, 100 - criticals * 25 - majors * 10 - minors * 3);
  // 양품 보너스: boost 패턴당 +1, 최대 +10
  const score = Math.min(100, baseScore + Math.min(10, goodReport.scoreBonus));

  return {
    stage: 'validation',
    status: criticals > 0 ? 'fail' : majors > 2 ? 'warn' : 'pass',
    score,
    findings: adjusted,
    metrics: { goodPatternsDetected: goodReport.totalDetected, goodScoreBonus: goodReport.scoreBonus },
  };
}

// IDENTITY_SEAL: PART-4 | role=Validation | inputs=code,lang,file | outputs=TeamResult

// ============================================================
// PART 5 — Team 4: Size-Density
// ============================================================

export function runTeam4SizeDensity(code: string, _language: string, _fileName: string): TeamResult {
  const findings: Finding[] = [];
  const lines = code.split('\n');
  const nonBlank = lines.filter((l) => l.trim().length > 0);
  const totalLines = lines.length;

  const blankRatio = 1 - (nonBlank.length / Math.max(1, totalLines));
  if (blankRatio > 0.4) {
    findings.push({ severity: 'minor', message: `빈 줄 비율 ${(blankRatio * 100).toFixed(0)}% — 코드 밀도 낮음`, rule: 'SPARSE_CODE' });
  } else if (blankRatio < 0.05 && totalLines > 30) {
    findings.push({ severity: 'minor', message: `빈 줄 비율 ${(blankRatio * 100).toFixed(0)}% — 코드 너무 밀집`, rule: 'DENSE_CODE' });
  }

  const avgLineLen = nonBlank.reduce((s, l) => s + l.length, 0) / Math.max(1, nonBlank.length);
  if (avgLineLen > 100) {
    findings.push({ severity: 'minor', message: `평균 줄 길이 ${avgLineLen.toFixed(0)}자 — 줄 바꿈 권장`, rule: 'LONG_LINES' });
  }

  const funcHeaders = code.match(/(?:function\s+\w+|(?:const|let)\s+\w+\s*=\s*(?:async\s*)?\()/g) || [];
  const funcCount = funcHeaders.length;
  const density = funcCount > 0 ? Math.round(nonBlank.length / funcCount) : 0;

  const score = Math.max(0, 100 - findings.length * 10);
  return {
    stage: 'size-density',
    status: score >= 80 ? 'pass' : score >= 50 ? 'warn' : 'fail',
    score,
    findings,
    metrics: { totalLines, nonBlankLines: nonBlank.length, functions: funcCount, linesPerFunction: density },
  };
}

// IDENTITY_SEAL: PART-5 | role=SizeDensity | inputs=code,lang,file | outputs=TeamResult

// ============================================================
// PART 6 — Team 5: Asset Trace (Export/Import Dependency)
// ============================================================

export function runTeam5AssetTrace(code: string, _language: string, _fileName: string): TeamResult {
  const findings: Finding[] = [];
  const lines = code.split('\n');

  // Parse imports
  const importLines = lines.filter((l) => /^\s*import\s/.test(l));
  const externalImports = importLines.filter((l) => /from\s+['"][^./]/.test(l));
  const internalImports = importLines.filter((l) => /from\s+['"][./]/.test(l));

  if (importLines.length > 15) {
    findings.push({ severity: 'minor', message: `import ${importLines.length}개 — 모듈 분리 권장`, rule: 'TOO_MANY_IMPORTS' });
  }
  if (externalImports.length > 10) {
    findings.push({ severity: 'minor', message: `외부 의존성 ${externalImports.length}개 — 번들 크기 주의`, rule: 'HEAVY_EXTERNAL_DEPS' });
  }

  // Parse exports
  const exportCount = (code.match(/^export\s/gm) ?? []).length;
  const reExportCount = (code.match(/export\s+\{[^}]+\}\s+from/g) ?? []).length;

  if (exportCount > 15) {
    findings.push({ severity: 'minor', message: `export ${exportCount}개 — 모듈 분리 권장`, rule: 'TOO_MANY_EXPORTS' });
  }

  // Barrel file detection
  const nonEmpty = lines.filter((l) => l.trim() && !l.trim().startsWith('//'));
  const exportOnlyLines = nonEmpty.filter((l) => /^export\s/.test(l.trim()));
  if (nonEmpty.length > 0 && exportOnlyLines.length === nonEmpty.length && exportOnlyLines.length > 5) {
    findings.push({ severity: 'minor', message: `배럴 파일 감지 (${exportOnlyLines.length}개 re-export)`, rule: 'BARREL_FILE' });
  }

  // --- gstack #20: 의존성 건강도 ---

  // 알려진 deprecated 패키지 패턴
  const DEPRECATED_PACKAGES = [
    'request', 'request-promise', 'node-uuid', 'nomnom', 'istanbul',
    'left-pad', 'querystring', 'colors', 'mkdirp',
    'tslint', 'moment',
  ];
  for (const dep of DEPRECATED_PACKAGES) {
    const depPattern = new RegExp(`from\\s+['"]${dep}['"]`);
    for (let i = 0; i < lines.length; i++) {
      if (depPattern.test(lines[i])) {
        findings.push({ severity: 'minor', message: `deprecated 패키지 '${dep}' 사용`, line: i + 1, rule: 'DEPRECATED_PACKAGE' });
        break;
      }
    }
  }

  // 와일드카드 버전 범위 (package.json 코드 내 감지)
  if (_fileName.includes('package.json')) {
    for (let i = 0; i < lines.length; i++) {
      if (/["']\s*:\s*["']\*["']/.test(lines[i])) {
        findings.push({ severity: 'major', message: '와일드카드(*) 버전 — 재현 불가 빌드 위험', line: i + 1, rule: 'WILDCARD_VERSION' });
      }
    }
  }

  // 동일 모듈 다중 경로 import (../foo와 @/foo 혼용)
  const importPaths = new Map<string, string[]>();
  for (const line of importLines) {
    const pathMatch = line.match(/from\s+['"]([^'"]+)['"]/);
    if (pathMatch) {
      const fullPath = pathMatch[1];
      const baseName = fullPath.split('/').pop() ?? fullPath;
      const existing = importPaths.get(baseName) ?? [];
      existing.push(fullPath);
      importPaths.set(baseName, existing);
    }
  }
  for (const [base, paths] of importPaths) {
    const uniquePaths = [...new Set(paths)];
    if (uniquePaths.length >= 2 && uniquePaths.some((p) => p.startsWith('.')) && uniquePaths.some((p) => p.startsWith('@'))) {
      findings.push({ severity: 'minor', message: `모듈 '${base}' 다중 경로 import (상대+절대 혼용)`, rule: 'MIXED_IMPORT_PATHS' });
    }
  }

  const { majors: fMajors, minors: fMinors } = findings.reduce(
    (acc, f) => {
      if (f.severity === 'major') acc.majors++;
      else if (f.severity === 'minor') acc.minors++;
      return acc;
    },
    { majors: 0, minors: 0 },
  );
  const score = Math.max(0, 100 - fMajors * 15 - fMinors * 5);

  return {
    stage: 'asset-trace',
    status: score >= 80 ? 'pass' : score >= 50 ? 'warn' : 'fail',
    score,
    findings,
    metrics: { imports: importLines.length, internalImports: internalImports.length, externalImports: externalImports.length, exports: exportCount, reExports: reExportCount },
  };
}

// IDENTITY_SEAL: PART-6 | role=AssetTrace | inputs=code,lang,file | outputs=TeamResult

// ============================================================
// PART 7 — Team 6: Stability (Performance Patterns)
// ============================================================

export function runTeam6Stability(code: string, _language: string, _fileName: string): TeamResult {
  const findings: Finding[] = [];
  const lines = code.split('\n');

  // Nested loops O(n^2)
  let loopDepth = 0;
  const loopPattern = /\bfor\s*\(|\bwhile\s*\(|\b\.forEach\s*\(/;
  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim();
    if (loopPattern.test(trimmed)) {
      loopDepth++;
      if (loopDepth >= 2) {
        findings.push({ severity: 'major', message: `중첩 루프 감지 — O(n^2) 성능 우려`, line: i + 1, rule: 'NESTED_LOOP' });
      }
    }
    const opens = (lines[i].match(/\{/g) || []).length;
    const closes = (lines[i].match(/\}/g) || []).length;
    if (closes > opens) loopDepth = Math.max(0, loopDepth - (closes - opens));
  }

  // Array method chains (3+)
  for (let i = 0; i < lines.length; i++) {
    const chainMatch = lines[i].match(/\.(sort|filter|map|reduce|flatMap|find|every|some)\s*\(/g);
    if (chainMatch && chainMatch.length >= 3) {
      findings.push({ severity: 'minor', message: `배열 메서드 체인 ${chainMatch.length}단계`, line: i + 1, rule: 'ARRAY_CHAIN' });
    }
  }

  // Synchronous I/O
  for (let i = 0; i < lines.length; i++) {
    if (/\breadFileSync\b|\bwriteFileSync\b|\bexecSync\b/.test(lines[i])) {
      findings.push({ severity: 'major', message: '동기 I/O 패턴 — 비동기 대안 권장', line: i + 1, rule: 'SYNC_IO' });
    }
  }

  // Memory leak patterns
  for (let i = 0; i < lines.length; i++) {
    if (/setInterval\s*\(/.test(lines[i]) && !/clearInterval/.test(code)) {
      findings.push({ severity: 'major', message: 'setInterval without clearInterval — 메모리 누수 가능', line: i + 1, rule: 'MEMORY_LEAK_INTERVAL' });
      break;
    }
    if (/addEventListener\s*\(/.test(lines[i]) && !/removeEventListener/.test(code)) {
      findings.push({ severity: 'minor', message: 'addEventListener without removeEventListener', line: i + 1, rule: 'MEMORY_LEAK_LISTENER' });
      break;
    }
  }

  // N+1 pattern (DB queries in loops)
  for (let i = 0; i < lines.length; i++) {
    if (loopPattern.test(lines[i].trim())) {
      const scope = lines.slice(i, Math.min(i + 20, lines.length)).join('\n');
      if (/\bawait\b.*\b(fetch|query|find|get)\b/.test(scope)) {
        findings.push({ severity: 'major', message: 'N+1 쿼리 패턴 의심 — 배치 처리 권장', line: i + 1, rule: 'N_PLUS_1' });
      }
    }
  }

  // --- gstack #14: 응답속도 예측 (Render Performance) ---

  // Inline object/array/function in JSX props → 매 렌더마다 새 참조 생성
  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim();
    if (/\w+=\{\s*\{/.test(trimmed) && /<\w/.test(lines[Math.max(0, i - 3)]?.trim() ?? '')) {
      findings.push({ severity: 'minor', message: 'JSX prop에 인라인 객체 — 불필요 리렌더 유발 가능', line: i + 1, rule: 'INLINE_OBJECT_PROP' });
    }
    if (/\w+=\{\s*\(\)\s*=>/.test(trimmed) || /\w+=\{\s*function\s*\(/.test(trimmed)) {
      findings.push({ severity: 'minor', message: 'JSX prop에 인라인 함수 — useCallback 권장', line: i + 1, rule: 'INLINE_FUNCTION_PROP' });
    }
  }

  // useEffect 의존성 과다 (6개 이상)
  for (let i = 0; i < lines.length; i++) {
    const effectMatch = lines[i].match(/useEffect\s*\(/);
    if (effectMatch) {
      // 다음 10줄 내에서 의존성 배열 탐색
      const block = lines.slice(i, Math.min(i + 10, lines.length)).join('\n');
      const depsMatch = block.match(/\],\s*\[([^\]]*)\]\s*\)/);
      if (depsMatch) {
        const deps = depsMatch[1].split(',').filter((d) => d.trim()).length;
        if (deps >= 6) {
          findings.push({ severity: 'minor', message: `useEffect 의존성 ${deps}개 — 분리 또는 커스텀 훅 권장`, line: i + 1, rule: 'EFFECT_DEPS_OVERLOAD' });
        }
      }
    }
  }

  // 렌더 블로킹: 컴포넌트 최상위 레벨 heavy 연산
  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim();
    if (/^(?:const|let)\s+\w+\s*=\s*\w+\.(?:filter|map|sort|reduce)\s*\(/.test(trimmed)) {
      // useMemo 없이 매 렌더마다 재계산
      const prevLines = lines.slice(Math.max(0, i - 3), i).join('\n');
      if (!/useMemo/.test(prevLines) && !/useCallback/.test(prevLines)) {
        // 컴포넌트 내부인지 확인 (return <JSX가 아래 존재)
        const belowBlock = lines.slice(i, Math.min(i + 30, lines.length)).join('\n');
        if (/return\s*\(?\s*</.test(belowBlock)) {
          findings.push({ severity: 'minor', message: '컴포넌트 내 배열 변환 — useMemo 미적용 시 렌더마다 재계산', line: i + 1, rule: 'RENDER_BLOCKING_COMPUTE' });
        }
      }
    }
  }

  // --- gstack #18: 배치 처리 효율 (Sequential Await) ---

  // for/for-of 루프 내 개별 await → Promise.all 전환 가능
  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim();
    if (/\bfor\s*\(|for\s+.*\bof\b/.test(trimmed)) {
      const scope = lines.slice(i + 1, Math.min(i + 15, lines.length)).join('\n');
      const awaitCount = (scope.match(/\bawait\b/g) || []).length;
      if (awaitCount >= 2) {
        findings.push({ severity: 'major', message: '루프 내 직렬 await — Promise.all 또는 Promise.allSettled 권장', line: i + 1, rule: 'SEQUENTIAL_AWAIT' });
      }
    }
  }

  const { criticals: sCrits, majors: sMajors, minors: sMinors } = findings.reduce(
    (acc, f) => {
      if (f.severity === 'critical') acc.criticals++;
      else if (f.severity === 'major') acc.majors++;
      else if (f.severity === 'minor') acc.minors++;
      return acc;
    },
    { criticals: 0, majors: 0, minors: 0 },
  );
  const score = Math.max(0, 100 - sCrits * 30 - sMajors * 15 - sMinors * 5);

  return {
    stage: 'stability',
    status: score >= 80 ? 'pass' : score >= 50 ? 'warn' : 'fail',
    score,
    findings,
  };
}

// IDENTITY_SEAL: PART-7 | role=Stability | inputs=code,lang,file | outputs=TeamResult

// ============================================================
// PART 8 — Team 7: Release-IP (License + Secrets)
// ============================================================

const SECRET_PATTERNS: { pattern: RegExp; message: string }[] = [
  { pattern: /(?:password|passwd|pwd)\s*[:=]\s*["'][^"']{4,}["']/i, message: '하드코딩된 비밀번호' },
  { pattern: /(?:api[_-]?key|apikey)\s*[:=]\s*["'][A-Za-z0-9_-]{16,}["']/i, message: '하드코딩된 API 키' },
  { pattern: /(?:secret|token|bearer)\s*[:=]\s*["'][A-Za-z0-9_-]{16,}["']/i, message: '하드코딩된 시크릿/토큰' },
  { pattern: /-----BEGIN\s+(?:RSA\s+)?PRIVATE\s+KEY-----/, message: '프라이빗 키 감지' },
  { pattern: /(?:aws_access_key_id|aws_secret)\s*[:=]/i, message: 'AWS 자격증명 감지' },
];

const PII_PATTERNS: { pattern: RegExp; message: string; rule: string }[] = [
  { pattern: /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/, message: '이메일 주소 감지', rule: 'PII_EMAIL' },
  { pattern: /\d{6}-[1-4]\d{6}/, message: '주민등록번호 감지', rule: 'PII_RRN' },
];

const DB_CONN_PATTERNS: { pattern: RegExp; message: string }[] = [
  { pattern: /mongodb(?:\+srv)?:\/\/[^\s"']+/i, message: 'MongoDB 연결 문자열 감지' },
  { pattern: /postgres(?:ql)?:\/\/[^\s"']+/i, message: 'PostgreSQL 연결 문자열 감지' },
  { pattern: /mysql:\/\/[^\s"']+/i, message: 'MySQL 연결 문자열 감지' },
];

export function runTeam7ReleaseIP(code: string, _language: string, _fileName: string): TeamResult {
  const findings: Finding[] = [];
  const lines = code.split('\n');

  // License / copyright header check
  const hasLicense = /licen[sc]e|copyright|©|\(c\)/i.test(lines.slice(0, 10).join('\n'));
  if (!hasLicense && lines.length > 20) {
    findings.push({ severity: 'minor', message: '[라이선스] 라이선스 선언 누락', rule: 'LICENSE_MISSING' });
  }

  // Secret scan
  for (let i = 0; i < lines.length; i++) {
    for (const { pattern, message } of SECRET_PATTERNS) {
      if (pattern.test(lines[i])) {
        findings.push({ severity: 'critical', message: `[보안] ${message}`, line: i + 1, rule: 'HARDCODED_SECRET' });
      }
    }
  }

  // PII scan
  for (let i = 0; i < lines.length; i++) {
    for (const { pattern, message, rule } of PII_PATTERNS) {
      if (pattern.test(lines[i])) {
        findings.push({ severity: 'major', message: `[PII] ${message}`, line: i + 1, rule });
      }
    }
  }

  // DB connection string scan
  for (let i = 0; i < lines.length; i++) {
    for (const { pattern, message } of DB_CONN_PATTERNS) {
      if (pattern.test(lines[i])) {
        findings.push({ severity: 'critical', message: `[보안] ${message}`, line: i + 1, rule: 'DB_CONNECTION_STRING' });
      }
    }
  }

  const criticals = findings.filter((f) => f.severity === 'critical').length;
  const score = Math.max(0, 100 - criticals * 30 - (findings.length - criticals) * 5);

  return {
    stage: 'release-ip',
    status: criticals > 0 ? 'fail' : findings.length > 0 ? 'warn' : 'pass',
    score,
    findings,
  };
}

// IDENTITY_SEAL: PART-8 | role=ReleaseIP | inputs=code,lang,file | outputs=TeamResult

// ============================================================
// PART 9 — Team 8: Governance (Rules + Trust + Cohesion)
// ============================================================

const GOVERNANCE_BUDGET = {
  maxCyclomatic: 15,
  maxNesting: 5,
  maxParams: 7,
  maxLinesPerFunction: 50,
};

export function runTeam8Governance(code: string, _language: string, _fileName: string): TeamResult {
  const findings: Finding[] = [];
  const lines = code.split('\n');

  // Nesting depth
  let maxNesting = 0;
  let currentNesting = 0;
  for (const line of lines) {
    const opens = (line.match(/\{/g) || []).length;
    const closes = (line.match(/\}/g) || []).length;
    currentNesting += opens - closes;
    maxNesting = Math.max(maxNesting, currentNesting);
  }
  if (maxNesting > GOVERNANCE_BUDGET.maxNesting) {
    findings.push({ severity: 'major', message: `네스팅 깊이 ${maxNesting} > 최대 ${GOVERNANCE_BUDGET.maxNesting}`, rule: 'NESTING_DEPTH' });
  }

  // Function length + param count
  const fns = extractFunctions(code);
  let longestFn = 0;
  for (const fn of fns) {
    longestFn = Math.max(longestFn, fn.bodyLines);
    if (fn.bodyLines > GOVERNANCE_BUDGET.maxLinesPerFunction) {
      findings.push({ severity: 'major', message: `함수 ${fn.name}: ${fn.bodyLines}줄 > 제한 ${GOVERNANCE_BUDGET.maxLinesPerFunction}줄`, line: fn.line, rule: 'FUNCTION_LENGTH' });
    }
    if (fn.params > GOVERNANCE_BUDGET.maxParams) {
      findings.push({ severity: 'minor', message: `함수 ${fn.name}: 파라미터 ${fn.params}개 > 제한 ${GOVERNANCE_BUDGET.maxParams}개`, line: fn.line, rule: 'PARAM_COUNT' });
    }
  }

  // Cyclomatic complexity (global)
  const cc = calculateCyclomaticComplexity(code);
  if (cc > GOVERNANCE_BUDGET.maxCyclomatic) {
    findings.push({ severity: 'major', message: `순환 복잡도 ${cc} > 제한 ${GOVERNANCE_BUDGET.maxCyclomatic}`, rule: 'CYCLOMATIC_COMPLEXITY' });
  }

  // Naming conventions
  for (let i = 0; i < lines.length; i++) {
    const classMatch = lines[i].match(/class\s+(\w+)/);
    if (classMatch && !/^[A-Z][a-zA-Z0-9]*$/.test(classMatch[1])) {
      findings.push({ severity: 'minor', message: `클래스명 '${classMatch[1]}' PascalCase 위반`, line: i + 1, rule: 'NAMING_CLASS_CASE' });
    }
    const typeMatch = lines[i].match(/(?:interface|type)\s+(\w+)/);
    if (typeMatch && !/^[A-Z][a-zA-Z0-9]*$/.test(typeMatch[1])) {
      findings.push({ severity: 'minor', message: `타입명 '${typeMatch[1]}' PascalCase 위반`, line: i + 1, rule: 'NAMING_TYPE_CASE' });
    }
  }

  // Legacy pattern detection
  const hasLegacy = /\bvar\s+\w|module\.exports/.test(code);
  if (hasLegacy) {
    findings.push({ severity: 'minor', message: '레거시 패턴 감지 (var / module.exports)', rule: 'LEGACY_PATTERN' });
  }

  // --- gstack #12: 컬러/테마 일관성 ---

  let hardcodedColorCount = 0;
  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim();
    // 인라인 style에 하드코딩 색상
    if (/style\s*=\s*\{/.test(trimmed) && /#[0-9a-fA-F]{3,8}\b/.test(trimmed)) {
      hardcodedColorCount++;
      if (hardcodedColorCount <= 2) {
        findings.push({ severity: 'minor', message: '인라인 스타일에 하드코딩 색상 — CSS 변수 권장', line: i + 1, rule: 'HARDCODED_COLOR_INLINE' });
      }
    }
    // className에 색상 하드코딩 (tailwind zinc-500 등은 허용, #hex는 비허용)
    if (/(?:color|background|border)\s*:\s*['"]?#[0-9a-fA-F]{3,8}/.test(trimmed)) {
      hardcodedColorCount++;
      if (hardcodedColorCount <= 2) {
        findings.push({ severity: 'minor', message: 'CSS 속성에 하드코딩 hex 색상', line: i + 1, rule: 'HARDCODED_COLOR_CSS' });
      }
    }
  }
  if (hardcodedColorCount > 2) {
    findings.push({ severity: 'major', message: `하드코딩 색상 ${hardcodedColorCount}건 — 테마 시스템 미적용 우려`, rule: 'HARDCODED_COLOR_BULK' });
  }

  // --- gstack #19: 로깅 품질 ---

  // 민감정보 로깅 감지
  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim();
    if (/console\.\w+\s*\(/.test(trimmed)) {
      if (/(?:password|token|secret|apiKey|api_key|bearer|credential)/i.test(trimmed)) {
        findings.push({ severity: 'major', message: '민감정보 포함 가능한 console 출력', line: i + 1, rule: 'LOG_SENSITIVE_DATA' });
      }
    }
  }

  // console.error 없이 console.log만 남발
  const logCount = (code.match(/console\.log\s*\(/g) ?? []).length;
  const errorLogCount = (code.match(/console\.(?:error|warn)\s*\(/g) ?? []).length;
  if (logCount > 5 && errorLogCount === 0) {
    findings.push({ severity: 'minor', message: `console.log ${logCount}회, error/warn 0회 — 로그 레벨 미분류`, rule: 'LOG_LEVEL_MISSING' });
  }

  // 에러 객체에서 스택 트레이스 노출
  for (let i = 0; i < lines.length; i++) {
    if (/\.stack\b/.test(lines[i]) && /(?:res|response|json|send|render)/.test(lines[i])) {
      findings.push({ severity: 'major', message: '에러 스택 트레이스가 응답에 노출될 수 있음', line: i + 1, rule: 'STACK_TRACE_EXPOSURE' });
      break;
    }
  }

  // Trust scoring
  const todoCount = (code.match(/\/\/\s*(?:TODO|FIXME|HACK)\b|\/\*\s*(?:TODO|FIXME|HACK)\b/gi) ?? []).length;

  // ── Good Pattern Boost — 양품 패턴으로 신뢰도 보정 ──
  const govGoodReport = detectGoodPatterns(code);
  const adjustedFindings = govGoodReport.suppressedRules.length > 0
    ? downgradeFindings(findings, govGoodReport)
    : findings;
  // 양품 패턴이 많으면 finding 패널티 경감 (15 → 12)
  const findingPenalty = govGoodReport.boostCount >= 5 ? 12 : 15;
  const baseTrust = Math.max(0, 100 - adjustedFindings.length * findingPenalty - todoCount * 5) / 100;
  // 양품 보너스: 신뢰도에 직접 가산 (최대 +0.1)
  const goodTrustBonus = Math.min(0.1, govGoodReport.boostCount * 0.01);
  const adjustedTrust = Math.min(1, baseTrust + goodTrustBonus);
  const trustState = adjustedTrust < 0.3 ? 'untrusted' : adjustedTrust < 0.6 ? 'degraded' : 'trusted';

  if (trustState === 'untrusted') {
    adjustedFindings.push({ severity: 'critical', message: `신뢰도 저하: ${trustState} (${(adjustedTrust * 100).toFixed(0)}%)`, rule: 'TRUST_DEGRADATION' });
  } else if (trustState === 'degraded') {
    adjustedFindings.push({ severity: 'major', message: `신뢰도 주의: ${trustState} (${(adjustedTrust * 100).toFixed(0)}%)`, rule: 'TRUST_DEGRADATION' });
  }

  const score = Math.max(0, Math.min(100, Math.round(adjustedTrust * 100)));

  return {
    stage: 'governance',
    status: trustState === 'untrusted' ? 'fail' : trustState === 'degraded' ? 'warn' : 'pass',
    score,
    findings: adjustedFindings,
    metrics: { cyclomaticComplexity: cc, maxNesting, longestFunction: longestFn, trustScore: Math.round(adjustedTrust * 100), goodPatternsDetected: govGoodReport.totalDetected },
  };
}

// IDENTITY_SEAL: PART-9 | role=Governance | inputs=code,lang,file | outputs=TeamResult

// ============================================================
// PART 10 — Scope Policy Filtering (Team Result Post-Processing)
// ============================================================

/**
 * TeamResult의 findings에 scope policy를 적용.
 * suppress 규칙의 finding 제거, warn 규칙은 severity 다운그레이드.
 * 파이프라인 최종 결과 반환 전 호출.
 */
export function filterTeamResultByScope(
  result: TeamResult,
  filePath: string,
): TeamResult {
  const filtered = applyScopePolicyToFindings(result.findings, filePath);
  if (filtered.length === result.findings.length) return result;

  // finding 수 변동 시 score 재계산
  const suppressedCount = result.findings.length - filtered.length;
  const adjustedScore = Math.min(100, result.score + suppressedCount * 10);

  return {
    ...result,
    findings: filtered,
    score: adjustedScore,
    status: adjustedScore >= 80 ? 'pass' : adjustedScore >= 60 ? 'warn' : 'fail',
  };
}

// IDENTITY_SEAL: PART-10 | role=ScopePolicyFilter | inputs=TeamResult,filePath | outputs=TeamResult

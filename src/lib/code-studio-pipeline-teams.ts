// ============================================================
// Code Studio — 8-Team Pipeline (Static Analysis, No AI)
// ============================================================
// Each team: (code, language, fileName) => TeamResult
// Pure regex + heuristic based analysis.

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
  { pattern: /\bTODO\b|\bFIXME\b|\bHACK\b|\bXXX\b/, severity: 'major', message: 'TODO/FIXME/HACK 잔존', rule: 'NO_TODO' },
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

  const criticals = findings.filter((f) => f.severity === 'critical').length;
  const majors = findings.filter((f) => f.severity === 'major').length;
  const minors = findings.filter((f) => f.severity === 'minor').length;
  const score = Math.max(0, 100 - criticals * 25 - majors * 10 - minors * 3);

  return {
    stage: 'validation',
    status: criticals > 0 ? 'fail' : majors > 2 ? 'warn' : 'pass',
    score,
    findings,
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

  const score = Math.max(0, 100 - findings.filter((f) => f.severity === 'major').length * 15 - findings.filter((f) => f.severity === 'minor').length * 5);

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

  const score = Math.max(0, 100
    - findings.filter((f) => f.severity === 'critical').length * 30
    - findings.filter((f) => f.severity === 'major').length * 15
    - findings.filter((f) => f.severity === 'minor').length * 5);

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

  // Trust scoring
  const todoCount = (code.match(/\bTODO\b|\bFIXME\b|\bHACK\b/gi) ?? []).length;
  const baseTrust = Math.max(0, 100 - findings.length * 15 - todoCount * 5) / 100;
  const trustState = baseTrust < 0.3 ? 'untrusted' : baseTrust < 0.6 ? 'degraded' : 'trusted';

  if (trustState === 'untrusted') {
    findings.push({ severity: 'critical', message: `신뢰도 저하: ${trustState} (${(baseTrust * 100).toFixed(0)}%)`, rule: 'TRUST_DEGRADATION' });
  } else if (trustState === 'degraded') {
    findings.push({ severity: 'major', message: `신뢰도 주의: ${trustState} (${(baseTrust * 100).toFixed(0)}%)`, rule: 'TRUST_DEGRADATION' });
  }

  const score = Math.max(0, Math.min(100, Math.round(baseTrust * 100)));

  return {
    stage: 'governance',
    status: trustState === 'untrusted' ? 'fail' : trustState === 'degraded' ? 'warn' : 'pass',
    score,
    findings,
    metrics: { cyclomaticComplexity: cc, maxNesting, longestFunction: longestFn, trustScore: Math.round(baseTrust * 100) },
  };
}

// IDENTITY_SEAL: PART-9 | role=Governance | inputs=code,lang,file | outputs=TeamResult

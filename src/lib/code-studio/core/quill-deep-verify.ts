// ============================================================
// CS Quill — Deep Verification Engine
// ============================================================
// Catches logical bugs that 8-team pipeline misses.
// 6 checks: declaration-order, brace-balance, async-patterns,
//           unsafe-casts, resource-leaks, math-logic
//
// Ported from local-code-studio/packages/quill-engine/src/deep-verify.ts

// ============================================================
// PART 1 — Types
// ============================================================

export interface DeepFinding {
  file: string;
  line: number;
  message: string;
  severity: 'P0' | 'P1' | 'P2';
  category: string;
  fix?: string;
}

export interface DeepVerifyResult {
  findings: DeepFinding[];
  score: number;
  checks: number;
  duration: number;
}

// ============================================================
// PART 2 — Check: Declaration Order (P0 prevention)
// ============================================================

function checkDeclarationOrder(code: string, fileName: string): DeepFinding[] {
  const findings: DeepFinding[] = [];
  const cleaned = code.replace(/\/\*[\s\S]*?\*\//g, '');
  const lines = cleaned.split('\n');

  const IGNORE_NAMES = new Set([
    'name', 'length', 'id', 'type', 'value', 'data', 'key', 'index',
    'error', 'message', 'result', 'code', 'path', 'config', 'options',
    'status', 'state', 'content', 'text', 'title', 'label', 'description',
    'size', 'count', 'width', 'height', 'score', 'level', 'mode', 'kind',
    'start', 'end', 'line', 'file', 'url', 'query', 'params', 'args',
    'input', 'output', 'source', 'target', 'parent', 'children', 'items',
    'entries', 'values', 'keys', 'map', 'set', 'list', 'array', 'buffer',
    'resolve', 'reject', 'callback', 'handler', 'listener', 'event',
    'req', 'res', 'ctx', 'env', 'db', 'fn', 'cb', 'el', 'i', 'j', 'k',
    'e', 'f', 's', 't', 'n', 'm', 'p', 'v', 'x', 'y', 'a', 'b', 'c', 'd',
    'true', 'false', 'null', 'undefined', 'this', 'self', 'window', 'document',
    'console', 'process', 'module', 'require', 'Promise', 'Error', 'Array',
    'Object', 'String', 'Number', 'Boolean', 'Map', 'Set', 'Date', 'RegExp',
    'JSON', 'Math', 'Symbol', 'Buffer', 'setTimeout', 'clearTimeout',
  ]);

  const declarations = new Map<string, number>();
  const usages: Array<{ name: string; line: number }> = [];

  for (let i = 0; i < lines.length; i++) {
    const ln = lines[i].trim();

    if (/^(import |\/\/|\/\*|\*|type |interface |export type |export interface )/.test(ln)) continue;

    const declMatch = ln.match(/(?:const|let|var)\s+(\w+)\s*[=:]/);
    if (declMatch) {
      const nm = declMatch[1];
      if (!declarations.has(nm) && !IGNORE_NAMES.has(nm)) {
        declarations.set(nm, i + 1);
      }
    }

    const paramMatch = ln.match(/(?:function\s+\w+|=>\s*)\(([^)]+)\)/);
    if (paramMatch) {
      for (const param of paramMatch[1].split(',')) {
        const pName = param.trim().replace(/[:=].*/, '').replace(/\.\.\./g, '').trim();
        if (pName && !pName.startsWith('_') && !IGNORE_NAMES.has(pName)) {
          declarations.set(pName, i + 1);
        }
      }
    }

    const stripped = ln
      .replace(/['"`](?:[^'"`\\]|\\.)*['"`]/g, '')
      .replace(/\/\/.*$/g, '')
      .replace(/\.\??\w+/g, '');
    const identifiers = stripped.match(/\b[a-zA-Z_]\w*\b/g);
    if (identifiers) {
      for (const ident of identifiers) {
        if (IGNORE_NAMES.has(ident)) continue;
        if (/^(const|let|var|function|class|import|export|return|if|else|for|while|new|typeof|await|async|try|catch|throw|break|continue|switch|case|default|from|as|of|in)$/.test(ident)) continue;
        if (ln.includes(`const ${ident}`) || ln.includes(`let ${ident}`) || ln.includes(`var ${ident}`)) continue;
        usages.push({ name: ident, line: i + 1 });
      }
    }
  }

  const reported = new Set<string>();
  for (const usage of usages) {
    if (reported.has(usage.name)) continue;
    const declLine = declarations.get(usage.name);
    if (declLine && usage.line < declLine && declLine - usage.line > 10) {
      findings.push({
        file: fileName, line: usage.line,
        message: `'${usage.name}' used at line ${usage.line} but declared at line ${declLine}`,
        severity: 'P1', category: 'declaration-order',
        fix: `Move declaration of '${usage.name}' before line ${usage.line}`,
      });
      reported.add(usage.name);
    }
  }

  return findings;
}

// ============================================================
// PART 3 — Check: Brace Balance (P0 prevention)
// ============================================================

function checkBraceBalance(code: string, fileName: string): DeepFinding[] {
  const findings: DeepFinding[] = [];
  const lines = code.split('\n');

  let braceDepth = 0;
  let parenDepth = 0;
  const bracketDepth = { value: 0 };
  const braceStack: Array<{ line: number; char: string }> = [];

  for (let i = 0; i < lines.length; i++) {
    const cleaned = lines[i]
      .replace(/\/\/.*$/, '')
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/'[^']*'/g, '""')
      .replace(/"[^"]*"/g, '""')
      .replace(/`[^`]*`/g, '""');

    for (const char of cleaned) {
      if (char === '{') { braceDepth++; braceStack.push({ line: i + 1, char: '{' }); }
      if (char === '}') {
        braceDepth--;
        if (braceDepth < 0) {
          findings.push({
            file: fileName, line: i + 1,
            message: `Extra closing brace '}' without matching '{'`,
            severity: 'P0', category: 'brace-balance',
            fix: 'Remove extra } or add missing {',
          });
          braceDepth = 0;
        } else {
          braceStack.pop();
        }
      }
      if (char === '(') parenDepth++;
      if (char === ')') parenDepth--;
      if (char === '[') bracketDepth.value++;
      if (char === ']') bracketDepth.value--;
    }
  }

  if (braceDepth > 0) {
    const unclosed = braceStack.slice(-braceDepth);
    for (const b of unclosed) {
      findings.push({
        file: fileName, line: b.line,
        message: `Unclosed '{' at line ${b.line}`,
        severity: 'P0', category: 'brace-balance',
        fix: 'Add missing }',
      });
    }
  }

  if (parenDepth !== 0) {
    findings.push({
      file: fileName, line: lines.length,
      message: `Parentheses imbalance: ${parenDepth > 0 ? 'unclosed (' : 'extra )'}`,
      severity: 'P1', category: 'brace-balance',
    });
  }

  return findings;
}

// ============================================================
// PART 4 — Check: Async Anti-patterns (P1 prevention)
// ============================================================

function checkAsyncPatterns(code: string, fileName: string): DeepFinding[] {
  const findings: DeepFinding[] = [];
  const lines = code.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const ln = lines[i];

    // Busy wait
    if (/while\s*\(/.test(ln) && /execSync.*sleep/i.test(lines.slice(i, i + 5).join('\n'))) {
      findings.push({
        file: fileName, line: i + 1,
        message: 'Synchronous busy-wait detected (execSync sleep in loop)',
        severity: 'P1', category: 'async-pattern',
        fix: 'Use await new Promise(r => setTimeout(r, ms))',
      });
    }

    // Promise constructor inside async
    if (/new Promise/.test(ln)) {
      const above = lines.slice(Math.max(0, i - 10), i).join('\n');
      if (/async\s/.test(above) && /resolve.*reject/.test(lines.slice(i, i + 5).join('\n'))) {
        const promiseBody = lines.slice(i, i + 5).join('\n');
        if (/\.question\(|\.on\(/.test(promiseBody)) {
          if (!/\.close\(\)|finally/.test(lines.slice(i, i + 10).join('\n'))) {
            findings.push({
              file: fileName, line: i + 1,
              message: 'Promise wrapping callback without cleanup in finally',
              severity: 'P2', category: 'async-pattern',
              fix: 'Add finally { resource.close() }',
            });
          }
        }
      }
    }

    // await in loop
    if (/for\s*\(|for\s+of|while\s*\(/.test(ln)) {
      const loopBody = lines.slice(i, Math.min(i + 15, lines.length)).join('\n');
      const awaitCount = (loopBody.match(/await\s/g) ?? []).length;
      if (awaitCount >= 2) {
        findings.push({
          file: fileName, line: i + 1,
          message: `Multiple awaits (${awaitCount}) inside loop — potential N+1 issue`,
          severity: 'P2', category: 'async-pattern',
          fix: 'Consider Promise.all() for parallel execution',
        });
      }
    }
  }

  return findings;
}

// ============================================================
// PART 5 — Check: Unsafe Casts (P1 prevention)
// ============================================================

function checkUnsafeCasts(code: string, fileName: string): DeepFinding[] {
  const findings: DeepFinding[] = [];
  const lines = code.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const ln = lines[i];

    if (/as\s+never/.test(ln)) {
      findings.push({
        file: fileName, line: i + 1,
        message: "'as never' cast — bypasses all type checking",
        severity: 'P1', category: 'unsafe-cast',
        fix: 'Use proper type guard or generic constraint',
      });
    }

    if (/as\s+any\b/.test(ln) && !/\/\/.*as any/.test(ln)) {
      findings.push({
        file: fileName, line: i + 1,
        message: "'as any' cast — loses type safety",
        severity: 'P2', category: 'unsafe-cast',
        fix: 'Use unknown + type guard, or proper interface',
      });
    }

    if (/@ts-ignore|@ts-expect-error/.test(ln)) {
      findings.push({
        file: fileName, line: i + 1,
        message: 'TypeScript suppression comment — hiding potential error',
        severity: 'P2', category: 'unsafe-cast',
        fix: 'Fix the underlying type error instead',
      });
    }

    if (/\w+\([^)]*\)!\./.test(ln)) {
      findings.push({
        file: fileName, line: i + 1,
        message: 'Non-null assertion on function return — may crash if null',
        severity: 'P1', category: 'unsafe-cast',
        fix: 'Add null check or use optional chaining',
      });
    }
  }

  return findings;
}

// ============================================================
// PART 6 — Check: Resource Leaks (P2 prevention)
// ============================================================

function checkResourceLeaks(code: string, fileName: string): DeepFinding[] {
  const findings: DeepFinding[] = [];
  const lines = code.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const ln = lines[i];

    if (/createInterface\s*\(/.test(ln)) {
      const rest = lines.slice(i, Math.min(i + 20, lines.length)).join('\n');
      if (!rest.includes('.close()') && !rest.includes('finally')) {
        findings.push({
          file: fileName, line: i + 1,
          message: 'readline created without .close() or finally block',
          severity: 'P2', category: 'resource-leak',
          fix: 'Use try-finally { rl.close() }',
        });
      }
    }

    if (/setInterval\s*\(/.test(ln)) {
      const varMatch = ln.match(/(?:const|let|var)\s+(\w+)\s*=\s*setInterval/);
      if (varMatch) {
        const rest = lines.slice(i, lines.length).join('\n');
        if (!rest.includes(`clearInterval(${varMatch[1]})`) && !rest.includes(`clearInterval(this.${varMatch[1]}`)) {
          findings.push({
            file: fileName, line: i + 1,
            message: `setInterval assigned to '${varMatch[1]}' but never cleared`,
            severity: 'P2', category: 'resource-leak',
            fix: `Add clearInterval(${varMatch[1]}) in cleanup`,
          });
        }
      }
    }

    if (/\bspawn\s*\(/.test(ln) && !ln.includes('execSync')) {
      const rest = lines.slice(i, Math.min(i + 30, lines.length)).join('\n');
      if (!rest.includes('.kill(') && !rest.includes('.destroy(') && !rest.includes('on(\'close\'')) {
        findings.push({
          file: fileName, line: i + 1,
          message: 'Child process spawned without kill/close handling',
          severity: 'P2', category: 'resource-leak',
          fix: 'Add process.kill() in cleanup or on(\'close\') handler',
        });
      }
    }
  }

  return findings;
}

// ============================================================
// PART 7 — Check: Math/Logic Errors (P1 prevention)
// ============================================================

function checkMathLogic(code: string, fileName: string): DeepFinding[] {
  const findings: DeepFinding[] = [];
  const lines = code.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const ln = lines[i];

    if (/Score.*Math\.round\(\w+\s*\*\s*100\)/.test(ln) || /score.*\*\s*100/.test(ln)) {
      findings.push({
        file: fileName, line: i + 1,
        message: 'Score multiplied by 100 — may already be 0-100 range',
        severity: 'P1', category: 'math-logic',
        fix: 'Verify if value is already 0-100 or 0-1',
      });
    }

    if (/\/\s*(?:\w+\.length|scores\.length|total|count)/.test(ln) && !/Math\.max\s*\(\s*1/.test(ln) && !/\|\| 1/.test(ln)) {
      findings.push({
        file: fileName, line: i + 1,
        message: 'Division by variable that could be 0',
        severity: 'P1', category: 'math-logic',
        fix: 'Use Math.max(1, divisor) or add zero check',
      });
    }

    if (/\.sort\s*\(/.test(ln) && !/\[\.\.\./.test(ln) && !ln.includes('Array.from')) {
      if (/\]\s*\.sort/.test(ln) || /\)\s*\.sort/.test(ln)) {
        // Creating new array — OK
      } else if (/\w+\.sort\(/.test(ln)) {
        const varMatch = ln.match(/(\w+)\.sort\(/);
        if (varMatch && !/^(?:_|temp|sorted|copy)/.test(varMatch[1])) {
          findings.push({
            file: fileName, line: i + 1,
            message: `'${varMatch[1]}.sort()' mutates original array`,
            severity: 'P2', category: 'math-logic',
            fix: `Use [...${varMatch[1]}].sort() to preserve original`,
          });
        }
      }
    }
  }

  return findings;
}

// ============================================================
// PART 8 — Unified Deep Verify Runner
// ============================================================

export function runDeepVerify(code: string, fileName: string): DeepVerifyResult {
  const start = performance.now();

  const allFindings: DeepFinding[] = [
    ...checkDeclarationOrder(code, fileName),
    ...checkBraceBalance(code, fileName),
    ...checkAsyncPatterns(code, fileName),
    ...checkUnsafeCasts(code, fileName),
    ...checkResourceLeaks(code, fileName),
    ...checkMathLogic(code, fileName),
  ];

  // Deduplicate
  const seen = new Set<string>();
  const unique = allFindings.filter(f => {
    const key = `${f.file}:${f.line}:${f.category}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  // Score
  const p0 = unique.filter(f => f.severity === 'P0').length;
  const p1 = unique.filter(f => f.severity === 'P1').length;
  const p2 = unique.filter(f => f.severity === 'P2').length;
  const sc = Math.max(0, 100 - p0 * 30 - p1 * 15 - p2 * 5);

  return {
    findings: unique,
    score: sc,
    checks: 6,
    duration: Math.round(performance.now() - start),
  };
}

// ============================================================
// PART 9 — Project-Wide Deep Verify (server-side only)
// ============================================================

export function runDeepVerifyProject(rootPath: string): {
  files: number;
  totalFindings: number;
  score: number;
  findings: DeepFinding[];
  bySeverity: Record<string, number>;
  byCategory: Record<string, number>;
} {
  // Guard: only works in Node.js environment
  if (typeof process === 'undefined') {
    return { files: 0, totalFindings: 0, score: 100, findings: [], bySeverity: {}, byCategory: {} };
  }

  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { readdirSync, readFileSync } = require('fs');
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { join, relative } = require('path');

  const IGNORE = new Set(['node_modules', '.next', '.git', 'dist', '.cs']);
  const allFindings: DeepFinding[] = [];
  let fileCount = 0;
  let totalScore = 0;

  function walk(dir: string): void {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (entry.name.startsWith('.') || IGNORE.has(entry.name)) continue;
      const full = join(dir, entry.name);
      if (entry.isDirectory()) { walk(full); continue; }
      if (!/\.(ts|tsx|js|jsx)$/.test(entry.name)) continue;

      const code = readFileSync(full, 'utf-8');
      const result = runDeepVerify(code, relative(rootPath, full));
      allFindings.push(...result.findings);
      totalScore += result.score;
      fileCount++;
    }
  }

  walk(rootPath);

  const bySeverity: Record<string, number> = { P0: 0, P1: 0, P2: 0 };
  const byCategory: Record<string, number> = {};
  for (const f of allFindings) {
    bySeverity[f.severity] = (bySeverity[f.severity] ?? 0) + 1;
    byCategory[f.category] = (byCategory[f.category] ?? 0) + 1;
  }

  return {
    files: fileCount,
    totalFindings: allFindings.length,
    score: fileCount > 0 ? Math.round(totalScore / fileCount) : 100,
    findings: allFindings,
    bySeverity,
    byCategory,
  };
}

// IDENTITY_SEAL: PART-9 | role=project-verify | inputs=rootPath | outputs=project-results

// ============================================================
// Team 3: Validation — Static code analysis
// Ported from csl_team_agent/validation/
// ============================================================

import type { TeamResult, Finding, PipelineContext } from "../types";

// ── Validation Rules (from codex_rules.py) ──

const RULES: { pattern: RegExp; severity: "critical" | "major" | "minor"; message: string; rule: string }[] = [
  // Critical
  { pattern: /\beval\s*\(/, severity: "critical", message: "eval() 사용 감지 — 보안 위험", rule: "NO_EVAL" },
  { pattern: /\bexec\s*\(/, severity: "critical", message: "exec() 사용 감지", rule: "NO_EXEC" },
  { pattern: /\b__import__\s*\(/, severity: "critical", message: "__import__() 남용 감지", rule: "NO_DYNAMIC_IMPORT" },
  { pattern: /os\.system\s*\(/, severity: "critical", message: "os.system() 사용 감지", rule: "NO_OS_SYSTEM" },
  { pattern: /\bpassword\s*=\s*["'][^"']+["']/, severity: "critical", message: "하드코딩된 비밀번호 감지", rule: "NO_HARDCODED_SECRET" },
  { pattern: /(?:api[_-]?key|secret|token)\s*=\s*["'][A-Za-z0-9_-]{16,}["']/, severity: "critical", message: "하드코딩된 API 키/토큰 감지", rule: "NO_HARDCODED_KEY" },

  // Major
  { pattern: /console\.log\s*\(/, severity: "major", message: "console.log 잔존 — 프로덕션 코드에서 제거 필요", rule: "NO_CONSOLE_LOG" },
  { pattern: /\bTODO\b|\bFIXME\b|\bHACK\b|\bXXX\b/, severity: "major", message: "TODO/FIXME/HACK 주석 잔존", rule: "NO_TODO" },
  { pattern: /debugger\s*;?/, severity: "major", message: "debugger 문 잔존", rule: "NO_DEBUGGER" },
  { pattern: /\bany\b/, severity: "major", message: "TypeScript 'any' 타입 사용", rule: "NO_ANY_TYPE" },

  // Minor
  { pattern: /^\s{0,3}\S.{119,}$/m, severity: "minor", message: "줄 길이 120자 초과", rule: "LINE_LENGTH" },
  { pattern: /\t/, severity: "minor", message: "탭 문자 사용 (스페이스 권장)", rule: "NO_TABS" },
];

export function runValidation(ctx: PipelineContext): TeamResult {
  const start = performance.now();
  const lines = ctx.code.split("\n");
  const findings: Finding[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    for (const rule of RULES) {
      if (rule.pattern.test(line)) {
        findings.push({
          severity: rule.severity,
          message: rule.message,
          line: i + 1,
          rule: rule.rule,
        });
      }
    }
  }

  // Bracket matching
  const brackets = checkBrackets(ctx.code);
  if (brackets) findings.push(brackets);

  // Unused imports (simple heuristic)
  const unusedImports = checkUnusedImports(ctx.code);
  findings.push(...unusedImports);

  // Logic error detection
  findings.push(...checkLogicErrors(ctx.code));

  // Null safety
  findings.push(...checkNullSafety(ctx.code));

  // Async validation
  findings.push(...checkAsyncPatterns(ctx.code));

  // Error handling validation
  findings.push(...checkErrorHandling(ctx.code));

  const criticals = findings.filter((f) => f.severity === "critical").length;
  const majors = findings.filter((f) => f.severity === "major").length;
  const minors = findings.filter((f) => f.severity === "minor").length;

  const score = Math.max(0, 100 - criticals * 25 - majors * 10 - minors * 3);
  const status = criticals > 0 ? "fail" : majors > 2 ? "warn" : "pass";

  return {
    team: "validation",
    status,
    score,
    message: `${findings.length}개 발견 (C:${criticals} M:${majors} m:${minors})`,
    findings,
    suggestions: [],
    durationMs: Math.round(performance.now() - start),
  };
}

function checkBrackets(code: string): Finding | null {
  const stack: { char: string; line: number }[] = [];
  const pairs: Record<string, string> = { "(": ")", "[": "]", "{": "}" };
  const closers = new Set(Object.values(pairs));
  const lines = code.split("\n");

  for (let i = 0; i < lines.length; i++) {
    // Skip strings and comments (simplified)
    const line = lines[i].replace(/\/\/.*$/, "").replace(/"[^"]*"|'[^']*'|`[^`]*`/g, "");
    for (const ch of line) {
      if (pairs[ch]) stack.push({ char: ch, line: i + 1 });
      else if (closers.has(ch)) {
        const last = stack.pop();
        if (!last || pairs[last.char] !== ch) {
          return { severity: "critical", message: `괄호 불일치: '${ch}' at line ${i + 1}`, line: i + 1, rule: "BRACKET_MISMATCH" };
        }
      }
    }
  }

  if (stack.length > 0) {
    return { severity: "critical", message: `닫히지 않은 괄호: '${stack[stack.length - 1].char}' at line ${stack[stack.length - 1].line}`, line: stack[stack.length - 1].line, rule: "BRACKET_UNCLOSED" };
  }
  return null;
}

// ── Logic Error Detection ──

function checkLogicErrors(code: string): Finding[] {
  const findings: Finding[] = [];
  const lines = code.split("\n");

  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim();

    // Unreachable code after return/throw/break/continue
    if (/^(return\b|throw\b|break\b|continue\b)/.test(trimmed) && !trimmed.endsWith("{")) {
      // Check if next non-empty line is in same block (not a closing brace or new label)
      for (let j = i + 1; j < lines.length; j++) {
        const next = lines[j].trim();
        if (next === "" || next.startsWith("//") || next.startsWith("*")) continue;
        if (next === "}" || next === "});") break;
        if (/^(case\s|default\s*:)/.test(next)) break;
        findings.push({
          severity: "major",
          message: `도달 불가 코드 감지 (L${i + 1} 이후)`,
          line: j + 1,
          rule: "UNREACHABLE_CODE",
        });
        break;
      }
    }

    // Conditions that are always true/false
    if (/if\s*\(\s*true\s*\)/.test(trimmed) || /if\s*\(\s*false\s*\)/.test(trimmed)) {
      findings.push({ severity: "major", message: "항상 참/거짓인 조건문 감지", line: i + 1, rule: "CONSTANT_CONDITION" });
    }
    // Contradictory condition: x && !x
    const contradictionMatch = trimmed.match(/(\w+)\s*&&\s*!\1\b/);
    if (contradictionMatch) {
      findings.push({ severity: "major", message: `모순 조건 감지: ${contradictionMatch[1]} && !${contradictionMatch[1]}`, line: i + 1, rule: "CONTRADICTORY_CONDITION" });
    }

    // Duplicate case labels in switch
    if (/^switch\s*\(/.test(trimmed)) {
      const caseLabels: Map<string, number> = new Map();
      let depth = 0;
      for (let j = i; j < lines.length; j++) {
        const opens = (lines[j].match(/\{/g) || []).length;
        const closes = (lines[j].match(/\}/g) || []).length;
        depth += opens - closes;
        const caseMatch = lines[j].trim().match(/^case\s+(.+?)\s*:/);
        if (caseMatch) {
          const label = caseMatch[1];
          const prevLine = caseLabels.get(label);
          if (prevLine !== undefined) {
            findings.push({
              severity: "major",
              message: `중복 case 라벨: '${label}' (L${prevLine}과 중복)`,
              line: j + 1,
              rule: "DUPLICATE_CASE",
            });
          } else {
            caseLabels.set(label, j + 1);
          }
        }
        if (depth <= 0 && j > i) break;
      }
    }
  }

  return findings;
}

// ── Null Safety ──

function checkNullSafety(code: string): Finding[] {
  const findings: Finding[] = [];
  const lines = code.split("\n");

  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim();
    if (trimmed.startsWith("//") || trimmed.startsWith("*")) continue;
    const stripped = lines[i].replace(/"[^"]*"|'[^']*'|`[^`]*`/g, '""');

    // Non-null assertion overuse
    const bangAssertions = stripped.match(/\w+!/g);
    if (bangAssertions && bangAssertions.length > 0) {
      // Filter out != and !== operators
      const realAssertions = stripped.match(/\w+!(?!=)/g);
      if (realAssertions && realAssertions.length >= 2) {
        findings.push({
          severity: "minor",
          message: `비-null 단언(!) 과다 사용 (${realAssertions.length}회)`,
          line: i + 1,
          rule: "NON_NULL_ASSERTION_OVERUSE",
        });
      }
    }

    // Property access on potentially null value (result of find/querySelector without ?.)
    if (/\.(find|querySelector|getElementById)\s*\([^)]*\)\s*\./.test(stripped)) {
      if (!/\.(find|querySelector|getElementById)\s*\([^)]*\)\s*\?\./.test(stripped)) {
        findings.push({
          severity: "major",
          message: "null 가능 반환값에 직접 속성 접근 — optional chaining(?.) 필요",
          line: i + 1,
          rule: "MISSING_OPTIONAL_CHAIN",
        });
      }
    }
  }

  return findings;
}

// ── Async Validation ──

function checkAsyncPatterns(code: string): Finding[] {
  const findings: Finding[] = [];
  const lines = code.split("\n");

  // Collect async function names defined in this file
  const asyncFnNames = new Set<string>();
  for (const line of lines) {
    const match = line.match(/(?:async\s+function\s+(\w+))|(?:(?:const|let)\s+(\w+)\s*=\s*async\s)/);
    if (match) asyncFnNames.add(match[1] || match[2]);
  }

  let inAsyncFn = false;
  let asyncFnDepth = 0;
  let asyncFnStart = 0;
  let hasAwait = false;
  let braceDepth = 0;

  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim();

    // Track async function boundaries
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
          findings.push({
            severity: "minor",
            message: `async 함수에 await 없음 (L${asyncFnStart})`,
            line: asyncFnStart,
            rule: "ASYNC_WITHOUT_AWAIT",
          });
        }
        inAsyncFn = false;
      }
    }

    // Floating promise: calling an async function without await or .then
    for (const fnName of asyncFnNames) {
      const callPattern = new RegExp(`(?<!await\\s)(?<!return\\s)\\b${fnName}\\s*\\(`);
      if (callPattern.test(trimmed) && !/\.then\s*\(/.test(trimmed) && !/\.catch\s*\(/.test(trimmed)) {
        // Don't flag the definition line itself
        if (!/(?:async\s+function|=\s*async)/.test(trimmed)) {
          findings.push({
            severity: "major",
            message: `플로팅 프로미스 감지: ${fnName}() 호출 결과 미사용`,
            line: i + 1,
            rule: "FLOATING_PROMISE",
          });
        }
      }
    }

    // Promise.all with non-array argument
    if (/Promise\.all\s*\(\s*[^[\s]/.test(trimmed)) {
      findings.push({
        severity: "major",
        message: "Promise.all에 배열이 아닌 인자 전달",
        line: i + 1,
        rule: "PROMISE_ALL_NON_ARRAY",
      });
    }
  }

  return findings;
}

// ── Error Handling Validation ──

function checkErrorHandling(code: string): Finding[] {
  const findings: Finding[] = [];
  const lines = code.split("\n");

  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim();

    // Empty catch blocks: catch (e) {} or catch (e) { }
    if (/catch\s*\([^)]*\)\s*\{\s*\}/.test(trimmed)) {
      findings.push({ severity: "major", message: "빈 catch 블록 감지", line: i + 1, rule: "EMPTY_CATCH" });
      continue;
    }

    // Catch without error usage
    const catchMatch = trimmed.match(/catch\s*\(\s*(\w+)\s*\)\s*\{?/);
    if (catchMatch && catchMatch[1] !== "_") {
      const errName = catchMatch[1];
      // Scan catch block body for usage of the error variable
      let depth = 0;
      let started = false;
      let errUsed = false;
      for (let j = i; j < lines.length; j++) {
        const opens = (lines[j].match(/\{/g) || []).length;
        const closes = (lines[j].match(/\}/g) || []).length;
        if (opens > 0 && !started) started = true;
        depth += opens - closes;
        if (j > i && new RegExp(`\\b${errName}\\b`).test(lines[j])) {
          errUsed = true;
          break;
        }
        if (started && depth <= 0) break;
      }
      if (!errUsed) {
        findings.push({
          severity: "minor",
          message: `catch 블록에서 에러 변수 '${errName}' 미사용 — '_'로 변경하거나 사용 필요`,
          line: i + 1,
          rule: "UNUSED_CATCH_ERROR",
        });
      }
    }

    // Try blocks that are too large (>50 lines)
    if (/^try\s*\{?$/.test(trimmed) || /^try\s*\{/.test(trimmed)) {
      let depth = 0;
      let started = false;
      let tryLength = 0;
      for (let j = i; j < lines.length; j++) {
        const opens = (lines[j].match(/\{/g) || []).length;
        const closes = (lines[j].match(/\}/g) || []).length;
        if (opens > 0 && !started) started = true;
        depth += opens - closes;
        tryLength++;
        if (started && depth <= 0) break;
      }
      if (tryLength > 50) {
        findings.push({
          severity: "minor",
          message: `try 블록 과대 (${tryLength}줄) — 범위 축소 권장`,
          line: i + 1,
          rule: "LARGE_TRY_BLOCK",
        });
      }
    }
  }

  return findings;
}

function checkUnusedImports(code: string): Finding[] {
  const findings: Finding[] = [];
  const lines = code.split("\n");

  for (let i = 0; i < lines.length; i++) {
    const match = lines[i].match(/import\s+(?:\{([^}]+)\}|(\w+))\s+from/);
    if (!match) continue;

    const names = (match[1] || match[2] || "")
      .split(",")
      .map((n) => n.trim().split(" as ").pop()?.trim())
      .filter(Boolean) as string[];

    const rest = code.slice(code.indexOf("\n", code.indexOf(lines[i])) + 1);
    for (const name of names) {
      if (name && !new RegExp(`\\b${name}\\b`).test(rest)) {
        findings.push({
          severity: "minor",
          message: `미사용 import: '${name}'`,
          line: i + 1,
          rule: "UNUSED_IMPORT",
        });
      }
    }
  }

  return findings;
}

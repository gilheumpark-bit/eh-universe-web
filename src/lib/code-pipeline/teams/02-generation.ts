// ============================================================
// Team 02: Generation — Code Structure Validation & Quality
// ============================================================

import type { TeamResult, Finding, Suggestion, PipelineContext } from "../types";

// ── Structure Analysis ──

interface CodeStructure {
  functions: { name: string; line: number; params: number; bodyLines: number; isAsync: boolean }[];
  classes: { name: string; line: number; methods: number }[];
  interfaces: { name: string; line: number }[];
  typeAliases: { name: string; line: number }[];
  exports: { name: string; line: number; isDefault: boolean }[];
}

function analyzeStructure(code: string): CodeStructure {
  const lines = code.split("\n");
  const result: CodeStructure = { functions: [], classes: [], interfaces: [], typeAliases: [], exports: [] };

  let braceDepth = 0;
  let currentFunction: CodeStructure["functions"][0] | null = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // Functions (named, arrow, method)
    const fnMatch = trimmed.match(/(?:(?:export\s+)?(?:async\s+)?function\s+(\w+)|(?:const|let)\s+(\w+)\s*=\s*(?:async\s*)?\([^)]*\)\s*(?::\s*\w+)?\s*=>)/);
    if (fnMatch) {
      const name = fnMatch[1] || fnMatch[2];
      const paramMatch = trimmed.match(/\(([^)]*)\)/);
      const params = paramMatch ? paramMatch[1].split(",").filter((p) => p.trim()).length : 0;
      const isAsync = /async/.test(trimmed);
      currentFunction = { name, line: i + 1, params, bodyLines: 0, isAsync };
      result.functions.push(currentFunction);
    }

    // Classes
    const classMatch = trimmed.match(/(?:export\s+)?class\s+(\w+)/);
    if (classMatch) {
      result.classes.push({ name: classMatch[1], line: i + 1, methods: 0 });
    }

    // Interfaces
    const ifaceMatch = trimmed.match(/(?:export\s+)?interface\s+(\w+)/);
    if (ifaceMatch) {
      result.interfaces.push({ name: ifaceMatch[1], line: i + 1 });
    }

    // Type aliases
    const typeMatch = trimmed.match(/(?:export\s+)?type\s+(\w+)\s*=/);
    if (typeMatch) {
      result.typeAliases.push({ name: typeMatch[1], line: i + 1 });
    }

    // Exports
    if (/^export\s/.test(trimmed)) {
      const isDefault = /export\s+default/.test(trimmed);
      const nameMatch = trimmed.match(/(?:export\s+(?:default\s+)?(?:function|class|const|let|var|interface|type)\s+)(\w+)/);
      result.exports.push({ name: nameMatch?.[1] ?? "default", line: i + 1, isDefault });
    }

    // Track function body lines
    const opens = (line.match(/\{/g) || []).length;
    const closes = (line.match(/\}/g) || []).length;
    if (currentFunction) currentFunction.bodyLines++;
    braceDepth += opens - closes;
    if (braceDepth <= 0 && currentFunction) {
      currentFunction = null;
    }
  }

  // Count class methods
  for (const cls of result.classes) {
    const classStart = cls.line - 1;
    let depth = 0;
    let started = false;
    for (let i = classStart; i < lines.length; i++) {
      const opens = (lines[i].match(/\{/g) || []).length;
      const closes = (lines[i].match(/\}/g) || []).length;
      if (opens > 0 && !started) started = true;
      depth += opens - closes;
      if (/^\s+(?:async\s+)?\w+\s*\(/.test(lines[i]) && depth >= 2) {
        cls.methods++;
      }
      if (started && depth <= 0) break;
    }
  }

  return result;
}

// ── Completeness Checks ──

function checkCompleteness(code: string, structure: CodeStructure): Finding[] {
  const findings: Finding[] = [];
  const lines = code.split("\n");

  // Empty function bodies
  for (const fn of structure.functions) {
    if (fn.bodyLines <= 2) {
      const bodyLine = lines[fn.line]?.trim() ?? "";
      if (/\{\s*\}/.test(bodyLine) || (fn.bodyLines === 2 && lines[fn.line]?.trim() === "}")) {
        findings.push({ severity: "major", message: `빈 함수 본문: ${fn.name}()`, line: fn.line, rule: "EMPTY_FUNCTION" });
      }
    }
  }

  // TODO/FIXME in function bodies (already in Team 03 but here as structure concern)
  for (let i = 0; i < lines.length; i++) {
    if (/throw\s+new\s+Error\s*\(\s*["'](?:not\s+implemented|todo)/i.test(lines[i])) {
      findings.push({ severity: "major", message: "미구현 throw 감지", line: i + 1, rule: "NOT_IMPLEMENTED" });
    }
  }

  // Classes with no methods
  for (const cls of structure.classes) {
    if (cls.methods === 0) {
      findings.push({ severity: "minor", message: `메서드 없는 클래스: ${cls.name}`, line: cls.line, rule: "EMPTY_CLASS" });
    }
  }

  return findings;
}

// ── Naming Convention ──

function checkNaming(structure: CodeStructure): Finding[] {
  const findings: Finding[] = [];

  for (const fn of structure.functions) {
    if (/^[A-Z]/.test(fn.name) && !/^[A-Z][a-z]/.test(fn.name)) {
      // ALL_CAPS is OK for constants, but PascalCase functions are React components (OK)
      // Skip PascalCase (React convention)
    } else if (/[_]/.test(fn.name) && /[a-z]/.test(fn.name) && /[A-Z]/.test(fn.name)) {
      findings.push({ severity: "minor", message: `네이밍 혼재 (mixed case): ${fn.name}`, line: fn.line, rule: "NAMING_MIXED" });
    }
  }

  for (const cls of structure.classes) {
    if (/^[a-z]/.test(cls.name)) {
      findings.push({ severity: "minor", message: `클래스명 소문자 시작: ${cls.name} (PascalCase 권장)`, line: cls.line, rule: "NAMING_CLASS" });
    }
  }

  return findings;
}

// ── Type Safety Verification ──

function checkTypeSafety(code: string): Finding[] {
  const findings: Finding[] = [];
  const lines = code.split("\n");
  let inComment = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // Track block comments
    if (/\/\*/.test(trimmed) && !/\*\//.test(trimmed)) { inComment = true; continue; }
    if (/\*\//.test(trimmed)) { inComment = false; continue; }
    if (inComment || trimmed.startsWith("//") || trimmed.startsWith("*")) continue;

    // Strip strings to avoid false positives
    const stripped = line.replace(/"[^"]*"|'[^']*'|`[^`]*`/g, '""');

    // Detect `any` type usage (in type positions, not in variable names like "anyValue")
    if (/:\s*any\b/.test(stripped) || /\bany\s*[,)>]/.test(stripped) || /<any>/.test(stripped)) {
      findings.push({ severity: "major", message: `'any' 타입 사용 감지 — 타입 안전성 저하`, line: i + 1, rule: "TYPE_SAFETY_ANY" });
    }

    // Excessive type assertions (as casts)
    if (/\bas\s+\w+/.test(stripped)) {
      findings.push({ severity: "minor", message: `타입 단언(as) 사용 — 타입 가드 사용 권장`, line: i + 1, rule: "TYPE_ASSERTION" });
    }

    // Missing return type on exported functions
    if (/^export\s+(?:async\s+)?function\s+\w+\s*\([^)]*\)\s*\{/.test(trimmed)) {
      // No return type annotation between ) and {
      findings.push({ severity: "minor", message: `export 함수에 반환 타입 누락`, line: i + 1, rule: "MISSING_RETURN_TYPE" });
    }

    // Missing parameter types (params without colon type annotation)
    const fnParamMatch = trimmed.match(/function\s+\w+\s*\(([^)]+)\)/);
    if (fnParamMatch) {
      const params = fnParamMatch[1].split(",").map((p) => p.trim());
      for (const param of params) {
        if (param && !param.includes(":") && !param.startsWith("...")) {
          findings.push({ severity: "minor", message: `파라미터 타입 누락: '${param.split("=")[0].trim()}'`, line: i + 1, rule: "MISSING_PARAM_TYPE" });
        }
      }
    }
  }

  return findings;
}

// ── Function Completeness ──

function checkFunctionCompleteness(code: string, structure: CodeStructure): Finding[] {
  const findings: Finding[] = [];
  const lines = code.split("\n");

  for (const fn of structure.functions) {
    const startIdx = fn.line - 1;
    const endIdx = Math.min(startIdx + fn.bodyLines, lines.length);
    const bodyLines = lines.slice(startIdx, endIdx);
    const bodyText = bodyLines.map((l) => l.trim()).join("\n");

    // Empty body: only braces or braces with a single comment
    const bodyContent = bodyText.replace(/[{}]/g, "").trim();
    if (bodyContent === "" || /^\/\/.*$/.test(bodyContent) || /^\/\*[\s\S]*\*\/$/.test(bodyContent)) {
      if (fn.bodyLines <= 3) {
        // Avoid duplicating the existing EMPTY_FUNCTION check; only flag comment-only bodies
        if (bodyContent.startsWith("//") || bodyContent.startsWith("/*")) {
          findings.push({ severity: "major", message: `함수에 주석만 존재 (구현 없음): ${fn.name}()`, line: fn.line, rule: "COMMENT_ONLY_FUNCTION" });
        }
      }
    }

    // "throw new Error('not implemented')" pattern (broader than existing check)
    for (let j = startIdx; j < endIdx; j++) {
      const l = lines[j]?.trim() ?? "";
      if (/throw\s+new\s+Error\s*\(\s*["']/.test(l) && /not\s*impl|stub|placeholder/i.test(l)) {
        findings.push({ severity: "major", message: `스텁 구현 감지: ${fn.name}()`, line: j + 1, rule: "STUB_IMPLEMENTATION" });
      }
    }

    // TODO/FIXME inside function bodies
    for (let j = startIdx; j < endIdx; j++) {
      const l = lines[j] ?? "";
      if (/\bTODO\b|\bFIXME\b/i.test(l)) {
        findings.push({ severity: "minor", message: `함수 본문에 TODO/FIXME 잔존: ${fn.name}()`, line: j + 1, rule: "FUNCTION_TODO" });
      }
    }
  }

  return findings;
}

// ── Module Structure ──

function checkModuleStructure(code: string, structure: CodeStructure): Finding[] {
  const findings: Finding[] = [];
  const lines = code.split("\n");

  // Too many exports (>15)
  if (structure.exports.length > 15) {
    findings.push({
      severity: "minor",
      message: `파일 export 과다 (${structure.exports.length}개) — 모듈 분리 권장 (목표: ≤15)`,
      line: 1,
      rule: "TOO_MANY_EXPORTS",
    });
  }

  // Mixing concerns: detect UI (JSX/React) + business logic (class/complex functions) in same file
  const hasJSX = /React|jsx|tsx|<\w+[\s/>]|className=/.test(code);
  const hasBusinessLogic = structure.classes.length > 0 || structure.functions.filter((f) => f.bodyLines > 20).length > 2;
  if (hasJSX && hasBusinessLogic) {
    findings.push({
      severity: "minor",
      message: "UI와 비즈니스 로직이 혼재 — 관심사 분리 권장",
      line: 1,
      rule: "MIXED_CONCERNS",
    });
  }

  // Barrel file with circular re-exports (files that only re-export)
  const nonEmptyLines = lines.filter((l) => l.trim() && !l.trim().startsWith("//"));
  const exportLines = nonEmptyLines.filter((l) => /^export\s/.test(l.trim()));
  if (nonEmptyLines.length > 0 && exportLines.length === nonEmptyLines.length && exportLines.length > 5) {
    const reExports = exportLines.filter((l) => /from\s+["']\./.test(l));
    if (reExports.length === exportLines.length) {
      findings.push({
        severity: "minor",
        message: `배럴 파일 감지 (${exportLines.length}개 re-export) — 순환 의존성 주의`,
        line: 1,
        rule: "BARREL_FILE",
      });
    }
  }

  return findings;
}

// ── Documentation Verification ──

function checkDocumentation(code: string, structure: CodeStructure): Finding[] {
  const findings: Finding[] = [];
  const lines = code.split("\n");

  // Exported functions without JSDoc
  for (const exp of structure.exports) {
    const lineIdx = exp.line - 1;
    const expLine = lines[lineIdx]?.trim() ?? "";
    if (/export\s+(?:async\s+)?function\s/.test(expLine) || /export\s+(?:default\s+)?class\s/.test(expLine)) {
      // Check if preceding line(s) have JSDoc
      let hasJSDoc = false;
      for (let j = lineIdx - 1; j >= Math.max(0, lineIdx - 5); j--) {
        const prev = lines[j].trim();
        if (prev === "") continue;
        if (prev.endsWith("*/") || prev.startsWith("/**")) { hasJSDoc = true; break; }
        break;
      }
      if (!hasJSDoc) {
        const isClass = /class\s/.test(expLine);
        findings.push({
          severity: "minor",
          message: isClass
            ? `public 클래스에 JSDoc 설명 누락: ${exp.name}`
            : `export 함수에 JSDoc 누락: ${exp.name}()`,
          line: exp.line,
          rule: isClass ? "MISSING_CLASS_DOC" : "MISSING_FUNCTION_DOC",
        });
      }
    }
  }

  // Complex functions (>20 lines) without any comments
  for (const fn of structure.functions) {
    if (fn.bodyLines > 20) {
      const startIdx = fn.line - 1;
      const endIdx = Math.min(startIdx + fn.bodyLines, lines.length);
      const hasComment = lines.slice(startIdx, endIdx).some((l) => /\/\/|\/\*|\*\//.test(l));
      if (!hasComment) {
        findings.push({
          severity: "minor",
          message: `복잡한 함수(${fn.bodyLines}줄)에 주석 없음: ${fn.name}()`,
          line: fn.line,
          rule: "COMPLEX_NO_COMMENTS",
        });
      }
    }
  }

  return findings;
}

// ── Duplicate Detection (simple hash) ──

function checkDuplicates(code: string): Finding[] {
  const findings: Finding[] = [];
  const lines = code.split("\n");
  const blockHashes = new Map<string, number>();

  // Hash 3-line sliding windows
  for (let i = 0; i < lines.length - 2; i++) {
    const block = lines.slice(i, i + 3).map((l) => l.trim()).filter((l) => l && !l.startsWith("//") && !l.startsWith("*")).join("|");
    if (block.length < 20) continue; // skip short blocks

    const prev = blockHashes.get(block);
    if (prev !== undefined && i - prev > 3) {
      findings.push({ severity: "minor", message: `중복 코드 블록 (L${prev + 1}과 유사)`, line: i + 1, rule: "DUPLICATE_BLOCK" });
    } else {
      blockHashes.set(block, i);
    }
  }

  return findings;
}

// ── Main ──

export function runGeneration(ctx: PipelineContext): TeamResult {
  const start = performance.now();
  const structure = analyzeStructure(ctx.code);
  const findings: Finding[] = [];
  const suggestions: Suggestion[] = [];

  // Completeness
  findings.push(...checkCompleteness(ctx.code, structure));

  // Type safety
  findings.push(...checkTypeSafety(ctx.code));

  // Function completeness
  findings.push(...checkFunctionCompleteness(ctx.code, structure));

  // Module structure
  findings.push(...checkModuleStructure(ctx.code, structure));

  // Documentation
  findings.push(...checkDocumentation(ctx.code, structure));

  // Naming
  findings.push(...checkNaming(structure));

  // Duplicates
  findings.push(...checkDuplicates(ctx.code));

  // Quality metrics
  const totalFunctions = structure.functions.length;
  const totalClasses = structure.classes.length;
  const totalExports = structure.exports.length;
  const avgFunctionLength = totalFunctions > 0
    ? Math.round(structure.functions.reduce((s, f) => s + f.bodyLines, 0) / totalFunctions)
    : 0;

  // Suggestions
  if (totalFunctions === 0 && totalClasses === 0 && ctx.code.split("\n").length > 20) {
    suggestions.push({ type: "refactor", message: "함수/클래스 정의 없이 절차적 코드만 존재 — 구조화 권장" });
  }
  if (avgFunctionLength > 30) {
    suggestions.push({ type: "refactor", message: `평균 함수 길이 ${avgFunctionLength}줄 — 분리 권장 (목표: <20줄)` });
  }
  if (totalExports === 0 && ctx.code.split("\n").length > 10) {
    suggestions.push({ type: "style", message: "export 없음 — 모듈로 사용하려면 export 추가 필요" });
  }

  const majors = findings.filter((f) => f.severity === "major").length;
  const minors = findings.filter((f) => f.severity === "minor").length;
  const score = Math.max(0, 100 - majors * 15 - minors * 5);
  const status = majors > 0 ? "warn" : "pass";

  return {
    team: "generation",
    status,
    score,
    message: `fn:${totalFunctions} cls:${totalClasses} exp:${totalExports} | 평균 함수: ${avgFunctionLength}줄 | ${findings.length}건`,
    findings,
    suggestions,
    durationMs: Math.round(performance.now() - start),
  };
}

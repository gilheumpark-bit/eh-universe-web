// ============================================================
// Team 06: Stability — Semantic Diff Analysis & Regression Risk
// ============================================================

import type { TeamResult, Finding, Suggestion, PipelineContext } from "../types";

// ── LCS-based Diff ──

type ChangeType = "unchanged" | "added" | "removed" | "modified";

interface DiffLine {
  type: ChangeType;
  oldLine?: number;
  newLine?: number;
  content: string;
}

function computeDiff(oldCode: string, newCode: string): DiffLine[] {
  const oldLines = oldCode.split("\n");
  const newLines = newCode.split("\n");
  const m = oldLines.length;
  const n = newLines.length;

  // LCS table
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = oldLines[i - 1] === newLines[j - 1]
        ? dp[i - 1][j - 1] + 1
        : Math.max(dp[i - 1][j], dp[i][j - 1]);
    }
  }

  // Backtrack
  const result: DiffLine[] = [];
  let i = m, j = n;
  const stack: DiffLine[] = [];

  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && oldLines[i - 1] === newLines[j - 1]) {
      stack.push({ type: "unchanged", oldLine: i, newLine: j, content: oldLines[i - 1] });
      i--; j--;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      stack.push({ type: "added", newLine: j, content: newLines[j - 1] });
      j--;
    } else {
      stack.push({ type: "removed", oldLine: i, content: oldLines[i - 1] });
      i--;
    }
  }

  while (stack.length > 0) result.push(stack.pop()!);
  return result;
}

// ── Change Classification ──

interface ChangeStats {
  added: number;
  removed: number;
  modified: number;
  unchanged: number;
  totalOld: number;
  totalNew: number;
  changeRatio: number;
}

function classifyChanges(diff: DiffLine[]): ChangeStats {
  let added = 0, removed = 0, unchanged = 0;

  for (const d of diff) {
    if (d.type === "added") added++;
    else if (d.type === "removed") removed++;
    else unchanged++;
  }

  const modified = Math.min(added, removed);
  const totalOld = removed + unchanged;
  const totalNew = added + unchanged;
  const changeRatio = totalOld > 0 ? (added + removed) / (totalOld + totalNew) : (added > 0 ? 1 : 0);

  return { added, removed, modified, unchanged, totalOld, totalNew, changeRatio };
}

// ── Breaking Change Detection ──

function detectBreakingChanges(oldCode: string, newCode: string): Finding[] {
  const findings: Finding[] = [];

  // Extract exported signatures
  const oldExports = extractExportSignatures(oldCode);
  const newExports = extractExportSignatures(newCode);

  // Check removed exports
  for (const [name, sig] of oldExports) {
    if (!newExports.has(name)) {
      findings.push({
        severity: "critical",
        message: `export 삭제됨: ${name} — 브레이킹 체인지`,
        rule: "EXPORT_REMOVED",
      });
    } else {
      const newSig = newExports.get(name)!;
      // Check parameter count change
      if (sig.params !== newSig.params) {
        findings.push({
          severity: "major",
          message: `파라미터 변경: ${name}(${sig.params}→${newSig.params}개) — 브레이킹 가능`,
          rule: "PARAM_CHANGE",
        });
      }
      // Check return type change (if detectable)
      if (sig.returnType && newSig.returnType && sig.returnType !== newSig.returnType) {
        findings.push({
          severity: "major",
          message: `반환 타입 변경: ${name} (${sig.returnType}→${newSig.returnType})`,
          rule: "RETURN_TYPE_CHANGE",
        });
      }
    }
  }

  // Check renamed exports (possible breaking)
  for (const [name] of newExports) {
    if (!oldExports.has(name)) {
      findings.push({
        severity: "info",
        message: `새 export 추가: ${name}`,
        rule: "EXPORT_ADDED",
      });
    }
  }

  return findings;
}

interface ExportSignature {
  params: number;
  returnType?: string;
}

function extractExportSignatures(code: string): Map<string, ExportSignature> {
  const sigs = new Map<string, ExportSignature>();
  const lines = code.split("\n");

  for (const line of lines) {
    const match = line.match(/export\s+(?:default\s+)?(?:async\s+)?function\s+(\w+)\s*\(([^)]*)\)(?:\s*:\s*(\w+))?/);
    if (match) {
      const params = match[2] ? match[2].split(",").filter((p) => p.trim()).length : 0;
      sigs.set(match[1], { params, returnType: match[3] });
    }

    const constMatch = line.match(/export\s+(?:const|let)\s+(\w+)\s*(?::\s*(\w+))?\s*=/);
    if (constMatch) {
      sigs.set(constMatch[1], { params: 0, returnType: constMatch[2] });
    }
  }

  return sigs;
}

// ── Regression Risk ──

type RiskLevel = "none" | "low" | "medium" | "high" | "critical";

function assessRegressionRisk(stats: ChangeStats, breakingFindings: Finding[]): { level: RiskLevel; reasons: string[] } {
  const reasons: string[] = [];

  const criticals = breakingFindings.filter((f) => f.severity === "critical").length;
  const majors = breakingFindings.filter((f) => f.severity === "major").length;

  if (criticals > 0) reasons.push(`${criticals}개 export 삭제`);
  if (majors > 0) reasons.push(`${majors}개 시그니처 변경`);
  if (stats.changeRatio > 0.5) reasons.push(`변경 비율 ${Math.round(stats.changeRatio * 100)}%`);
  if (stats.removed > 20) reasons.push(`${stats.removed}줄 삭제`);

  const level: RiskLevel =
    criticals > 0 ? "critical" :
    majors > 1 || stats.changeRatio > 0.5 ? "high" :
    majors > 0 || stats.changeRatio > 0.3 ? "medium" :
    stats.changeRatio > 0.1 ? "low" : "none";

  return { level, reasons };
}

// ── Behavioral Change Detection ──

function detectBehavioralChanges(oldCode: string, newCode: string): Finding[] {
  const findings: Finding[] = [];
  const oldFns = extractFunctionBodies(oldCode);
  const newFns = extractFunctionBodies(newCode);

  for (const [name, newBody] of newFns) {
    const oldBody = oldFns.get(name);
    if (!oldBody) continue; // New function, not a change

    const oldLineCount = oldBody.split("\n").length;
    const newLineCount = newBody.split("\n").length;
    const lineDiff = Math.abs(newLineCount - oldLineCount);

    // Significant body size change (>50% or >10 lines)
    if (lineDiff > 10 || (oldLineCount > 5 && lineDiff / oldLineCount > 0.5)) {
      findings.push({
        severity: "minor",
        message: `함수 본문 크게 변경: ${name}() (${oldLineCount}→${newLineCount}줄)`,
        rule: "BEHAVIORAL_SIZE_CHANGE",
      });
    }

    // New conditionals added
    const oldConds = (oldBody.match(/\bif\s*\(|\bswitch\s*\(|\?/g) || []).length;
    const newConds = (newBody.match(/\bif\s*\(|\bswitch\s*\(|\?/g) || []).length;
    if (newConds > oldConds + 2) {
      findings.push({
        severity: "minor",
        message: `조건문 증가: ${name}() (${oldConds}→${newConds}개) — 로직 복잡성 증가`,
        rule: "BEHAVIORAL_COND_ADDED",
      });
    }

    // Loops added/removed
    const oldLoops = (oldBody.match(/\bfor\s*\(|\bwhile\s*\(|\b\.forEach\s*\(/g) || []).length;
    const newLoops = (newBody.match(/\bfor\s*\(|\bwhile\s*\(|\b\.forEach\s*\(/g) || []).length;
    if (oldLoops !== newLoops) {
      findings.push({
        severity: "minor",
        message: `루프 변경: ${name}() (${oldLoops}→${newLoops}개)`,
        rule: "BEHAVIORAL_LOOP_CHANGE",
      });
    }
  }

  return findings;
}

function extractFunctionBodies(code: string): Map<string, string> {
  const fns = new Map<string, string>();
  const lines = code.split("\n");

  for (let i = 0; i < lines.length; i++) {
    const match = lines[i].match(/(?:(?:export\s+)?(?:async\s+)?function\s+(\w+)|(?:const|let)\s+(\w+)\s*=\s*(?:async\s*)?\([^)]*\)\s*(?::[^=]*?)?\s*=>)/);
    if (!match) continue;
    const name = match[1] || match[2];
    let depth = 0;
    let started = false;
    const bodyLines: string[] = [];
    for (let j = i; j < lines.length; j++) {
      const opens = (lines[j].match(/\{/g) || []).length;
      const closes = (lines[j].match(/\}/g) || []).length;
      if (opens > 0 && !started) started = true;
      depth += opens - closes;
      bodyLines.push(lines[j]);
      if (started && depth <= 0) break;
    }
    fns.set(name, bodyLines.join("\n"));
  }

  return fns;
}

// ── Test Coverage Awareness ──

function checkTestCoverage(ctx: PipelineContext, oldCode: string, newCode: string): Finding[] {
  const findings: Finding[] = [];
  const oldFns = extractFunctionBodies(oldCode);
  const newFns = extractFunctionBodies(newCode);

  // Find modified functions
  const modifiedFns: string[] = [];
  for (const [name, newBody] of newFns) {
    const oldBody = oldFns.get(name);
    if (oldBody && oldBody !== newBody) {
      modifiedFns.push(name);
    }
  }

  if (modifiedFns.length > 0) {
    // Check if the file has a corresponding test file (by name convention)
    const baseName = ctx.fileName.replace(/\.(ts|tsx|js|jsx)$/, "");
    const hasTestHint = ctx.code.includes(".test.") || ctx.code.includes(".spec.") ||
      ctx.fileName.includes(".test.") || ctx.fileName.includes(".spec.");

    if (!hasTestHint) {
      findings.push({
        severity: "minor",
        message: `변경된 함수 ${modifiedFns.length}개 (${modifiedFns.slice(0, 3).join(", ")}${modifiedFns.length > 3 ? "..." : ""}) — 테스트 파일 확인 필요 (${baseName}.test.* / ${baseName}.spec.*)`,
        rule: "MISSING_TEST_COVERAGE",
      });
    }
  }

  return findings;
}

// ── Performance Regression Detection ──

function detectPerformanceRegressions(oldCode: string, newCode: string): Finding[] {
  const findings: Finding[] = [];
  const newLines = newCode.split("\n");
  const oldLines = oldCode.split("\n");

  // Nested loops detection (O(n^2) patterns)
  const oldNestedLoops = countNestedLoops(oldLines);
  const newNestedLoops = countNestedLoops(newLines);
  if (newNestedLoops > oldNestedLoops) {
    findings.push({
      severity: "major",
      message: `중첩 루프 증가 (${oldNestedLoops}→${newNestedLoops}) — O(n²) 성능 저하 가능`,
      rule: "PERF_NESTED_LOOPS",
    });
  }

  // Array operation chains (.sort().filter().map() etc.)
  for (let i = 0; i < newLines.length; i++) {
    const line = newLines[i];
    const chainMatch = line.match(/\.(sort|filter|map|reduce|flatMap|find|every|some)\s*\(/g);
    if (chainMatch && chainMatch.length >= 3) {
      // Check if this is new (not in old code at same position)
      const oldLine = oldLines[i] ?? "";
      const oldChain = oldLine.match(/\.(sort|filter|map|reduce|flatMap|find|every|some)\s*\(/g);
      if (!oldChain || oldChain.length < 3) {
        findings.push({
          severity: "minor",
          message: `배열 메서드 체인 추가 (${chainMatch.length}단계) — 대규모 데이터 시 성능 주의`,
          line: i + 1,
          rule: "PERF_ARRAY_CHAIN",
        });
      }
    }
  }

  // Synchronous I/O patterns added
  const syncIOPatterns = /\breadFileSync\b|\bwriteFileSync\b|\bexecSync\b|\bspawnSync\b/;
  const oldHasSyncIO = syncIOPatterns.test(oldCode);
  const newHasSyncIO = syncIOPatterns.test(newCode);
  if (newHasSyncIO && !oldHasSyncIO) {
    for (let i = 0; i < newLines.length; i++) {
      if (syncIOPatterns.test(newLines[i])) {
        findings.push({
          severity: "major",
          message: "동기 I/O 패턴 추가 — 비동기 대안 사용 권장",
          line: i + 1,
          rule: "PERF_SYNC_IO",
        });
      }
    }
  }

  return findings;
}

function countNestedLoops(lines: string[]): number {
  let count = 0;
  let loopDepth = 0;
  const loopPattern = /\bfor\s*\(|\bwhile\s*\(|\b\.forEach\s*\(/;

  for (const line of lines) {
    const trimmed = line.trim();
    if (loopPattern.test(trimmed)) {
      loopDepth++;
      if (loopDepth >= 2) count++;
    }
    const opens = (line.match(/\{/g) || []).length;
    const closes = (line.match(/\}/g) || []).length;
    if (closes > opens) {
      loopDepth = Math.max(0, loopDepth - (closes - opens));
    }
  }

  return count;
}

// ── Error Handling Changes ──

function detectErrorHandlingChanges(oldCode: string, newCode: string): Finding[] {
  const findings: Finding[] = [];

  // Count try-catch blocks
  const oldTryCatch = (oldCode.match(/\btry\s*\{/g) || []).length;
  const newTryCatch = (newCode.match(/\btry\s*\{/g) || []).length;

  if (newTryCatch < oldTryCatch) {
    findings.push({
      severity: "major",
      message: `try-catch 블록 감소 (${oldTryCatch}→${newTryCatch}) — 에러 처리 누락 가능`,
      rule: "ERROR_HANDLING_REMOVED",
    });
  } else if (newTryCatch > oldTryCatch) {
    findings.push({
      severity: "info",
      message: `try-catch 블록 추가 (${oldTryCatch}→${newTryCatch})`,
      rule: "ERROR_HANDLING_ADDED",
    });
  }

  // Error type changes (catch block error class changes)
  const oldErrorTypes = extractErrorTypes(oldCode);
  const newErrorTypes = extractErrorTypes(newCode);
  for (const errType of oldErrorTypes) {
    if (!newErrorTypes.has(errType)) {
      findings.push({
        severity: "minor",
        message: `에러 타입 변경/제거: ${errType}`,
        rule: "ERROR_TYPE_CHANGED",
      });
    }
  }

  // Error propagation changes (throw statements)
  const oldThrows = (oldCode.match(/\bthrow\s+/g) || []).length;
  const newThrows = (newCode.match(/\bthrow\s+/g) || []).length;
  if (oldThrows !== newThrows) {
    findings.push({
      severity: "minor",
      message: `throw 문 변경 (${oldThrows}→${newThrows}개) — 에러 전파 패턴 변경`,
      rule: "ERROR_PROPAGATION_CHANGED",
    });
  }

  return findings;
}

function extractErrorTypes(code: string): Set<string> {
  const types = new Set<string>();
  const matches = code.matchAll(/\bnew\s+((?:\w+)?Error)\s*\(/g);
  for (const m of matches) {
    types.add(m[1]);
  }
  // Also catch instanceof checks
  const instanceMatches = code.matchAll(/instanceof\s+(\w+Error)\b/g);
  for (const m of instanceMatches) {
    types.add(m[1]);
  }
  return types;
}

// ── Main ──

export function runStability(ctx: PipelineContext): TeamResult {
  const start = performance.now();
  const findings: Finding[] = [];
  const suggestions: Suggestion[] = [];

  if (!ctx.previousCode) {
    return {
      team: "stability",
      status: "pass",
      score: 95,
      message: "이전 코드 없음 — 신규 파일",
      findings: [],
      suggestions: [{ type: "style", message: "신규 파일 — 다음 수정 시부터 안정성 추적 시작" }],
      durationMs: Math.round(performance.now() - start),
    };
  }

  // Compute diff
  const diff = computeDiff(ctx.previousCode, ctx.code);
  const stats = classifyChanges(diff);

  // Breaking changes
  const breakingFindings = detectBreakingChanges(ctx.previousCode, ctx.code);
  findings.push(...breakingFindings);

  // Behavioral change detection
  findings.push(...detectBehavioralChanges(ctx.previousCode, ctx.code));

  // Test coverage awareness
  findings.push(...checkTestCoverage(ctx, ctx.previousCode, ctx.code));

  // Performance regression detection
  findings.push(...detectPerformanceRegressions(ctx.previousCode, ctx.code));

  // Error handling changes
  findings.push(...detectErrorHandlingChanges(ctx.previousCode, ctx.code));

  // Regression risk
  const risk = assessRegressionRisk(stats, breakingFindings);

  // Change size warnings
  if (stats.changeRatio > 0.7) {
    findings.push({ severity: "major", message: `대규모 변경: ${Math.round(stats.changeRatio * 100)}% 변경됨`, rule: "MASSIVE_CHANGE" });
  } else if (stats.changeRatio > 0.4) {
    findings.push({ severity: "minor", message: `상당한 변경: ${Math.round(stats.changeRatio * 100)}% 변경됨`, rule: "LARGE_CHANGE" });
  }

  // Suggestions
  if (risk.level === "high" || risk.level === "critical") {
    suggestions.push({ type: "security", message: "회귀 테스트를 강력히 권장합니다" });
  }
  if (stats.removed > stats.added * 2) {
    suggestions.push({ type: "refactor", message: "대량 삭제 — 의도한 변경인지 확인 필요" });
  }

  const score = Math.max(0, 100
    - findings.filter((f) => f.severity === "critical").length * 30
    - findings.filter((f) => f.severity === "major").length * 15
    - findings.filter((f) => f.severity === "minor").length * 5
  );

  return {
    team: "stability",
    status: risk.level === "critical" ? "fail" : risk.level === "high" ? "warn" : score >= 70 ? "pass" : "warn",
    score,
    message: `+${stats.added} -${stats.removed} ~${stats.modified} | 회귀 위험: ${risk.level.toUpperCase()}`,
    findings,
    suggestions,
    durationMs: Math.round(performance.now() - start),
  };
}

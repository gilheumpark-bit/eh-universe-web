// ============================================================
// Team 8: Governance — History, Trust, Complexity
// Ported from csl_team_agent/governance/
// ============================================================

import type { TeamResult, Finding, Suggestion, PipelineContext, TrustState } from "../types";

// ── Trust Degradation Index (from trust_degradation.py) ──

interface _TrustRecord {
  partId: string;
  state: TrustState;
  score: number;
  reasons: string[];
}

const DEGRADED_THRESHOLD = 0.6;
const UNTRUSTED_THRESHOLD = 0.3;

function classifyTrust(score: number): TrustState {
  if (score < UNTRUSTED_THRESHOLD) return "untrusted";
  if (score < DEGRADED_THRESHOLD) return "degraded";
  return "trusted";
}

// ── Complexity Budget (from complexity_governor.py) ──

interface ComplexityBudget {
  maxCyclomatic: number;
  maxNesting: number;
  maxParams: number;
  maxLinesPerFunction: number;
}

const DEFAULT_BUDGET: ComplexityBudget = {
  maxCyclomatic: 15,
  maxNesting: 5,
  maxParams: 7,
  maxLinesPerFunction: 50,
};

function estimateComplexity(code: string): { nesting: number; longestFunction: number; paramCounts: number[] } {
  const lines = code.split("\n");
  let maxNesting = 0;
  let currentNesting = 0;
  let currentFunctionLines = 0;
  let longestFunction = 0;
  const paramCounts: number[] = [];
  let inFunction = false;

  for (const line of lines) {
    const trimmed = line.trim();

    // Track nesting
    const opens = (trimmed.match(/\{/g) || []).length;
    const closes = (trimmed.match(/\}/g) || []).length;
    currentNesting += opens - closes;
    maxNesting = Math.max(maxNesting, currentNesting);

    // Track function length
    const funcMatch = trimmed.match(/(?:function\s+\w+|(?:const|let|var)\s+\w+\s*=\s*(?:async\s+)?(?:\([^)]*\)|[^=])\s*=>|\w+\s*\([^)]*\)\s*\{)/);
    if (funcMatch) {
      if (inFunction && currentFunctionLines > 0) {
        longestFunction = Math.max(longestFunction, currentFunctionLines);
      }
      inFunction = true;
      currentFunctionLines = 0;

      // Count params
      const paramMatch = trimmed.match(/\(([^)]*)\)/);
      if (paramMatch) {
        const params = paramMatch[1].split(",").filter((p) => p.trim()).length;
        paramCounts.push(params);
      }
    }
    if (inFunction) currentFunctionLines++;
  }
  if (inFunction) longestFunction = Math.max(longestFunction, currentFunctionLines);

  return { nesting: maxNesting, longestFunction, paramCounts };
}

// ── Accurate Cyclomatic Complexity ──

function calculateCyclomaticComplexity(code: string): number {
  let complexity = 1; // Base path

  // Remove string literals and comments to avoid false matches
  const cleaned = code
    .replace(/\/\/.*$/gm, "")          // single-line comments
    .replace(/\/\*[\s\S]*?\*\//g, "")  // multi-line comments
    .replace(/"(?:[^"\\]|\\.)*"/g, '""')  // double-quoted strings
    .replace(/'(?:[^'\\]|\\.)*'/g, "''")  // single-quoted strings
    .replace(/`(?:[^`\\]|\\.)*`/g, "``"); // template literals

  const patterns: { regex: RegExp; label: string }[] = [
    { regex: /\bif\s*\(/g, label: "if" },
    { regex: /\belse\s+if\s*\(/g, label: "else if" },
    { regex: /\bwhile\s*\(/g, label: "while" },
    { regex: /\bfor\s*\(/g, label: "for" },
    { regex: /\bcase\s+[^:]+:/g, label: "case" },
    { regex: /\bcatch\s*\(/g, label: "catch" },
    { regex: /&&/g, label: "&&" },
    { regex: /\|\|/g, label: "||" },
    { regex: /\?\?/g, label: "??" },
  ];

  // Count "if" but subtract "else if" to avoid double-counting
  const ifCount = (cleaned.match(/\bif\s*\(/g) ?? []).length;
  const elseIfCount = (cleaned.match(/\belse\s+if\s*\(/g) ?? []).length;
  complexity += ifCount - elseIfCount; // standalone ifs
  complexity += elseIfCount;           // else ifs

  // Count other decision points (skip "if" and "else if" already handled)
  for (const { regex, label } of patterns) {
    if (label === "if" || label === "else if") continue;
    const matches = cleaned.match(regex) ?? [];
    complexity += matches.length;
  }

  // Ternary operators (? followed by : but not ?. optional chaining or ?? nullish)
  const ternaryCount = (cleaned.match(/\?[^?.:\n][^:\n]*:/g) ?? []).length;
  complexity += ternaryCount;

  return complexity;
}

// ── Code Cohesion (LCOM-like metric) ──

interface CohesionResult {
  score: number;           // 0-1 (1 = highly cohesive)
  classCount: number;
  warnings: string[];
}

function analyzeCohesion(code: string): CohesionResult {
  const warnings: string[] = [];
  const lines = code.split("\n");

  // Find class-like structures and their methods/properties
  const classRegex = /\bclass\s+(\w+)/g;
  let _classMatch;
  let classCount = 0;
  let totalCohesionScore = 0;

  // Also analyze module-level cohesion: do functions share variables?
  const functionNames: string[] = [];
  const topLevelVars: string[] = [];
  const functionVarUsage = new Map<string, Set<string>>();

  // Extract top-level variable declarations
  let nestingLevel = 0;
  let currentFunction: string | null = null;

  for (const line of lines) {
    const trimmed = line.trim();

    // Track nesting to identify top-level scope
    const opens = (trimmed.match(/\{/g) || []).length;
    const closes = (trimmed.match(/\}/g) || []).length;

    // Top-level variable detection
    if (nestingLevel === 0) {
      const varMatch = trimmed.match(/(?:const|let|var)\s+(\w+)/);
      if (varMatch && !trimmed.includes("function") && !trimmed.includes("=>")) {
        topLevelVars.push(varMatch[1]);
      }
      const funcMatch = trimmed.match(/(?:function\s+(\w+)|(?:const|let|var)\s+(\w+)\s*=\s*(?:async\s+)?(?:\(|[^=]*=>))/);
      if (funcMatch) {
        currentFunction = funcMatch[1] ?? funcMatch[2];
        functionNames.push(currentFunction);
        functionVarUsage.set(currentFunction, new Set());
      }
    }

    // Track which top-level vars are used in each function
    if (currentFunction) {
      for (const v of topLevelVars) {
        if (new RegExp(`\\b${v}\\b`).test(trimmed)) {
          functionVarUsage.get(currentFunction)?.add(v);
        }
      }
    }

    nestingLevel += opens - closes;
    if (nestingLevel <= 0) {
      nestingLevel = 0;
      currentFunction = null;
    }
  }

  // Calculate LCOM-like metric for module-level cohesion
  if (functionNames.length >= 2 && topLevelVars.length > 0) {
    let sharedPairs = 0;
    let totalPairs = 0;

    for (let i = 0; i < functionNames.length; i++) {
      for (let j = i + 1; j < functionNames.length; j++) {
        totalPairs++;
        const varsI = functionVarUsage.get(functionNames[i]) ?? new Set();
        const varsJ = functionVarUsage.get(functionNames[j]) ?? new Set();
        // Check if they share any variable
        for (const v of varsI) {
          if (varsJ.has(v)) {
            sharedPairs++;
            break;
          }
        }
      }
    }

    const cohesion = totalPairs > 0 ? sharedPairs / totalPairs : 1;
    totalCohesionScore = cohesion;

    if (cohesion < 0.3) {
      warnings.push(`모듈 응집도 낮음 (${(cohesion * 100).toFixed(0)}%) — 함수들이 공유 상태를 거의 사용하지 않음. 모듈 분리 권장`);
    }
  } else {
    totalCohesionScore = 1; // Small modules are considered cohesive
  }

  // Count classes (for reporting)
  while ((_classMatch = classRegex.exec(code)) !== null) {
    classCount++;
  }

  return { score: totalCohesionScore, classCount, warnings };
}

// ── Convention Compliance ──

interface ConventionResult {
  violations: Finding[];
  checkedCount: number;
}

function checkConventions(code: string): ConventionResult {
  const violations: Finding[] = [];
  const lines = code.split("\n");
  let checkedCount = 0;

  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim();

    // Check function naming: should be camelCase
    const funcMatch = trimmed.match(/function\s+([A-Z_]\w*)\s*\(/);
    if (funcMatch && !/^[A-Z][a-z]/.test(funcMatch[1])) {
      // Allow PascalCase for React components but flag UPPER_CASE or other
      if (/^[A-Z_]+$/.test(funcMatch[1]) || funcMatch[1].includes("_")) {
        violations.push({
          severity: "minor",
          message: `함수명 '${funcMatch[1]}'가 camelCase 규칙 위반 (line ${i + 1})`,
          line: i + 1,
          rule: "NAMING_FUNCTION_CASE",
        });
      }
      checkedCount++;
    }

    // Check class naming: should be PascalCase
    const classMatch = trimmed.match(/class\s+(\w+)/);
    if (classMatch) {
      checkedCount++;
      if (!/^[A-Z][a-zA-Z0-9]*$/.test(classMatch[1])) {
        violations.push({
          severity: "minor",
          message: `클래스명 '${classMatch[1]}'가 PascalCase 규칙 위반 (line ${i + 1})`,
          line: i + 1,
          rule: "NAMING_CLASS_CASE",
        });
      }
    }

    // Check constant naming: top-level const with object/array init is fine,
    // but primitive constants should be UPPER_CASE if they look like config
    const constMatch = trimmed.match(/^(?:export\s+)?const\s+([a-z]\w*)\s*=\s*(?:["'`\d]|true|false|null)/);
    if (constMatch) {
      checkedCount++;
      // Only flag if name looks like it should be a constant (all lowercase single word or has underscore)
      // This is a soft check — skip short names
      if (constMatch[1].length > 10 && constMatch[1] === constMatch[1].toUpperCase()) {
        // Already UPPER_CASE, fine
      }
    }

    // Check UPPER_CASE constants: should not use camelCase
    const upperConstMatch = trimmed.match(/^(?:export\s+)?const\s+([A-Z][A-Z0-9_]*)\s*=/);
    if (upperConstMatch) {
      checkedCount++;
      // This is correct UPPER_CASE — no violation
    }

    // Check interface/type naming: should be PascalCase
    const typeMatch = trimmed.match(/(?:interface|type)\s+(\w+)/);
    if (typeMatch) {
      checkedCount++;
      if (!/^[A-Z][a-zA-Z0-9]*$/.test(typeMatch[1])) {
        violations.push({
          severity: "minor",
          message: `타입/인터페이스명 '${typeMatch[1]}'가 PascalCase 규칙 위반 (line ${i + 1})`,
          line: i + 1,
          rule: "NAMING_TYPE_CASE",
        });
      }
    }
  }

  return { violations, checkedCount };
}

// ── History-Based Trust ──

interface FileHistoryMetrics {
  churnRate: number;        // 0-1 (estimated from code patterns)
  hasRecentChanges: boolean;
  estimatedAge: "new" | "mature" | "legacy";
}

function estimateFileHistory(code: string, previousCode: string | undefined): FileHistoryMetrics {
  const lines = code.split("\n");
  const totalLines = lines.length;

  // Estimate churn: TODO/FIXME/HACK density suggests instability
  const todoCount = (code.match(/(?:TODO|FIXME|HACK|XXX|WORKAROUND)\b/gi) ?? []).length;
  const commentDensity = lines.filter((l) => l.trim().startsWith("//") || l.trim().startsWith("/*")).length / Math.max(totalLines, 1);

  // High comment density + TODOs suggest high churn
  const churnRate = Math.min(1, (todoCount * 0.15) + (commentDensity > 0.3 ? 0.3 : 0));

  // Check if there are recent changes by comparing with previous code
  const hasRecentChanges = previousCode !== undefined && previousCode !== code;

  // Estimate age: legacy code patterns
  const hasLegacyPatterns = /\bvar\s+\w|module\.exports|require\s*\(/.test(code);
  const hasModernPatterns = /\bconst\s+\w|import\s+|export\s+|async\s+|await\s+/.test(code);

  let estimatedAge: FileHistoryMetrics["estimatedAge"] = "mature";
  if (hasLegacyPatterns && !hasModernPatterns) estimatedAge = "legacy";
  else if (!hasLegacyPatterns && totalLines < 50) estimatedAge = "new";

  return { churnRate, hasRecentChanges, estimatedAge };
}

function applyHistoryTrust(baseTrustScore: number, history: FileHistoryMetrics): { adjustedScore: number; reasons: string[] } {
  let adjustedScore = baseTrustScore;
  const reasons: string[] = [];

  // High churn reduces trust
  if (history.churnRate > 0.5) {
    adjustedScore -= 0.2;
    reasons.push(`높은 변경률 (${(history.churnRate * 100).toFixed(0)}%) — 신뢰도 감소`);
  } else if (history.churnRate > 0.3) {
    adjustedScore -= 0.1;
    reasons.push(`중간 변경률 (${(history.churnRate * 100).toFixed(0)}%) — 주의 필요`);
  }

  // Legacy code has reduced trust
  if (history.estimatedAge === "legacy") {
    adjustedScore -= 0.15;
    reasons.push("레거시 패턴 감지 — 현대화 권장");
  }

  // Recent changes in unstable code further reduce trust
  if (history.hasRecentChanges && history.churnRate > 0.3) {
    adjustedScore -= 0.1;
    reasons.push("불안정한 코드에 최근 변경 — 추가 검증 필요");
  }

  return { adjustedScore: Math.max(0, Math.min(1, adjustedScore)), reasons };
}

// ── Main ──

export function runGovernance(ctx: PipelineContext): TeamResult {
  const start = performance.now();
  const findings: Finding[] = [];
  const suggestions: Suggestion[] = [];
  const _lines = ctx.code.split("\n");

  // Complexity check (structural)
  const { nesting, longestFunction, paramCounts } = estimateComplexity(ctx.code);
  const budget = DEFAULT_BUDGET;

  if (nesting > budget.maxNesting) {
    findings.push({
      severity: "major",
      message: `네스팅 깊이 ${nesting} > 최대 ${budget.maxNesting}`,
      rule: "NESTING_DEPTH",
    });
  }

  if (longestFunction > budget.maxLinesPerFunction) {
    findings.push({
      severity: "major",
      message: `함수 최대 ${longestFunction}줄 > 제한 ${budget.maxLinesPerFunction}줄`,
      rule: "FUNCTION_LENGTH",
    });
  }

  for (let i = 0; i < paramCounts.length; i++) {
    if (paramCounts[i] > budget.maxParams) {
      findings.push({
        severity: "minor",
        message: `함수 파라미터 ${paramCounts[i]}개 > 제한 ${budget.maxParams}개`,
        rule: "PARAM_COUNT",
      });
    }
  }

  // Accurate cyclomatic complexity (McCabe)
  const cyclomaticComplexity = calculateCyclomaticComplexity(ctx.code);
  if (cyclomaticComplexity > budget.maxCyclomatic) {
    findings.push({
      severity: "major",
      message: `순환 복잡도 ${cyclomaticComplexity} > 제한 ${budget.maxCyclomatic} — 함수 분리 필요`,
      rule: "CYCLOMATIC_COMPLEXITY",
    });
    suggestions.push({
      type: "refactor",
      message: `순환 복잡도 ${cyclomaticComplexity} — 조건 로직 추출 또는 전략 패턴 적용 권장`,
    });
  } else if (cyclomaticComplexity > budget.maxCyclomatic * 0.7) {
    findings.push({
      severity: "minor",
      message: `순환 복잡도 ${cyclomaticComplexity} — 제한(${budget.maxCyclomatic})에 근접`,
      rule: "CYCLOMATIC_COMPLEXITY_WARNING",
    });
  }

  // Code cohesion (LCOM-like)
  const cohesion = analyzeCohesion(ctx.code);
  for (const warning of cohesion.warnings) {
    findings.push({
      severity: "minor",
      message: warning,
      rule: "LOW_COHESION",
    });
    suggestions.push({
      type: "refactor",
      message: `응집도 개선 — 관련 함수끼리 별도 모듈로 분리 권장`,
    });
  }

  // Convention compliance
  const conventions = checkConventions(ctx.code);
  findings.push(...conventions.violations);
  if (conventions.violations.length > 3) {
    suggestions.push({
      type: "style",
      message: `네이밍 규칙 위반 ${conventions.violations.length}건 — 코드 컨벤션 가이드 참고`,
    });
  }

  // History-based trust adjustment
  const fileHistory = estimateFileHistory(ctx.code, ctx.previousCode);

  // Trust scoring (base)
  const baseTrustScore = Math.max(0, 100 - findings.length * 15) / 100;

  // Apply history-based adjustment
  const { adjustedScore: historyAdjustedScore, reasons: historyReasons } =
    applyHistoryTrust(baseTrustScore, fileHistory);

  for (const reason of historyReasons) {
    findings.push({
      severity: "minor",
      message: `이력 기반: ${reason}`,
      rule: "HISTORY_TRUST",
    });
  }

  const trustScore = historyAdjustedScore;
  const trustState = classifyTrust(trustScore);

  if (trustState === "untrusted") {
    findings.push({ severity: "critical", message: `신뢰도 저하: ${trustState} (${(trustScore * 100).toFixed(0)}%)`, rule: "TRUST_DEGRADATION" });
  } else if (trustState === "degraded") {
    findings.push({ severity: "major", message: `신뢰도 주의: ${trustState} (${(trustScore * 100).toFixed(0)}%)`, rule: "TRUST_DEGRADATION" });
  }

  const score = Math.max(0, Math.min(100, Math.round(trustScore * 100)));
  const status = trustState === "untrusted" ? "fail" : trustState === "degraded" ? "warn" : "pass";

  return {
    team: "governance",
    status,
    score,
    message: `신뢰도: ${trustState} | CC: ${cyclomaticComplexity} | 응집도: ${(cohesion.score * 100).toFixed(0)}% | 네스팅 ${nesting} | 컨벤션 위반: ${conventions.violations.length} | 이력: ${fileHistory.estimatedAge}`,
    findings,
    suggestions,
    durationMs: Math.round(performance.now() - start),
  };
}

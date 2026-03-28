// ============================================================
// Team 01: Simulation — Intent Parsing & Dry-Run Estimation
// ============================================================

import type { TeamResult, Finding, Suggestion, PipelineContext } from "../types";

// ── Intent Classification ──

type IntentType = "generation" | "repair" | "review" | "refactor" | "explain" | "unknown";

const INTENT_PATTERNS: { type: IntentType; patterns: RegExp[] }[] = [
  {
    type: "generation",
    patterns: [
      /(?:생성|만들|작성|추가|구현|create|generate|add|implement|build|write)\b/i,
      /(?:새로운|new|신규)\s+(?:함수|클래스|컴포넌트|파일|모듈|api|function|class|component)/i,
    ],
  },
  {
    type: "repair",
    patterns: [
      /(?:수정|고치|fix|repair|bug|버그|에러|error|오류|patch|hotfix)\b/i,
      /(?:작동.*안|doesn.*work|not.*working|broken|깨진)\b/i,
    ],
  },
  {
    type: "review",
    patterns: [
      /(?:리뷰|검토|review|analyze|분석|check|확인|inspect|audit)\b/i,
      /(?:코드.*품질|quality|성능|performance|보안|security)\b/i,
    ],
  },
  {
    type: "refactor",
    patterns: [
      /(?:리팩토링|리팩터|refactor|개선|optimize|최적화|정리|cleanup|simplify)\b/i,
      /(?:변환|convert|migrate|마이그레이션|transform|typescript로|to\s+typescript)\b/i,
    ],
  },
  {
    type: "explain",
    patterns: [
      /(?:설명|explain|이해|understand|뭐|what|어떻게|how|왜|why)\b/i,
    ],
  },
];

function classifyIntent(intent: string, code: string): IntentType {
  for (const { type, patterns } of INTENT_PATTERNS) {
    if (patterns.some((p) => p.test(intent))) return type;
  }
  // Fallback: if code exists, assume review; if no code, assume generation
  return code.trim().length > 10 ? "review" : "generation";
}

// ── Language Detection ──

const LANG_PATTERNS: { lang: string; patterns: RegExp[] }[] = [
  { lang: "typescript", patterns: [/:\s*(?:string|number|boolean|void|any|unknown)\b/, /interface\s+\w+/, /type\s+\w+\s*=/, /<\w+>/, /\.tsx?$/] },
  { lang: "javascript", patterns: [/(?:const|let|var)\s+\w+\s*=/, /function\s+\w+/, /=>\s*\{/, /\.jsx?$/] },
  { lang: "python", patterns: [/def\s+\w+\s*\(/, /import\s+\w+/, /class\s+\w+:/, /\.py$/] },
  { lang: "rust", patterns: [/fn\s+\w+/, /let\s+mut\s+/, /impl\s+/, /\.rs$/] },
  { lang: "go", patterns: [/func\s+\w+/, /package\s+\w+/, /import\s+\(/, /\.go$/] },
  { lang: "java", patterns: [/public\s+class/, /private\s+\w+/, /System\.out/, /\.java$/] },
];

function detectLanguage(code: string, fileName: string): string {
  // File extension first
  for (const { lang, patterns } of LANG_PATTERNS) {
    if (patterns.some((p) => p.test(fileName))) return lang;
  }
  // Code pattern fallback
  for (const { lang, patterns } of LANG_PATTERNS) {
    const matches = patterns.filter((p) => p.test(code)).length;
    if (matches >= 2) return lang;
  }
  return "unknown";
}

// ── Complexity Estimation ──

function estimateComplexity(code: string): { level: "low" | "medium" | "high"; factors: string[] } {
  const lines = code.split("\n");
  const factors: string[] = [];

  // Line count
  if (lines.length > 300) factors.push(`대용량 (${lines.length}줄)`);
  else if (lines.length > 100) factors.push(`중간 규모 (${lines.length}줄)`);

  // Nesting depth
  let maxNesting = 0;
  let current = 0;
  for (const line of lines) {
    current += (line.match(/\{/g) || []).length - (line.match(/\}/g) || []).length;
    maxNesting = Math.max(maxNesting, current);
  }
  if (maxNesting > 5) factors.push(`깊은 네스팅 (${maxNesting}단계)`);

  // Async patterns
  if (/async|await|Promise|\.then\(/.test(code)) factors.push("비동기 패턴");

  // Error handling
  if (/try\s*\{|catch\s*\(|\.catch\(/.test(code)) factors.push("에러 핸들링");

  // External dependencies
  const imports = (code.match(/(?:import|require)\s*\(?/g) || []).length;
  if (imports > 10) factors.push(`다수 의존성 (${imports}개 import)`);

  const level = factors.length >= 3 ? "high" : factors.length >= 1 ? "medium" : "low";
  return { level, factors };
}

// ── Cyclomatic Complexity (McCabe) ──

function calculateCyclomaticComplexity(code: string): { complexity: number; details: string[] } {
  const details: string[] = [];
  let complexity = 1; // Base complexity

  const patterns: { label: string; regex: RegExp }[] = [
    { label: "if", regex: /\bif\s*\(/g },
    { label: "else if", regex: /\belse\s+if\s*\(/g },
    { label: "while", regex: /\bwhile\s*\(/g },
    { label: "for", regex: /\bfor\s*\(/g },
    { label: "case", regex: /\bcase\s+[^:]+:/g },
    { label: "catch", regex: /\bcatch\s*\(/g },
    { label: "&&", regex: /&&/g },
    { label: "||", regex: /\|\|/g },
    { label: "ternary (?:)", regex: /\?[^?.:]*:/g },
  ];

  for (const { label, regex } of patterns) {
    const matches = code.match(regex) ?? [];
    if (matches.length > 0) {
      // Avoid double-counting: "else if" is also matched by "if"
      if (label === "if") {
        const elseIfCount = (code.match(/\belse\s+if\s*\(/g) ?? []).length;
        const adjustedCount = matches.length - elseIfCount;
        if (adjustedCount > 0) {
          complexity += adjustedCount;
          details.push(`if: ${adjustedCount}`);
        }
      } else {
        complexity += matches.length;
        details.push(`${label}: ${matches.length}`);
      }
    }
  }

  return { complexity, details };
}

// ── Cognitive Complexity (Sonar-style) ──

function calculateCognitiveComplexity(code: string): { complexity: number; details: string[] } {
  const lines = code.split("\n");
  let complexity = 0;
  let nestingLevel = 0;
  const details: string[] = [];

  // Track brace-based nesting for penalty
  const flowBreakers = /\b(if|else\s+if|else|for|while|do|switch|catch|try)\b/;
  const logicalOps = /&&|\|\|/g;
  const ternary = /\?[^?.:]*:/g;

  for (const line of lines) {
    const trimmed = line.trim();

    // Skip comments and empty lines
    if (trimmed.startsWith("//") || trimmed.startsWith("/*") || trimmed.startsWith("*") || !trimmed) continue;

    // Check for flow-breaking structures
    const flowMatch = trimmed.match(flowBreakers);
    if (flowMatch) {
      const keyword = flowMatch[1];
      // Increment: +1 for each flow breaker
      complexity += 1;
      // Nesting penalty: additional +nestingLevel for nested structures
      if (keyword !== "else") {
        complexity += nestingLevel;
        if (nestingLevel > 0) {
          details.push(`${keyword} (nesting +${nestingLevel})`);
        }
      }
    }

    // Logical operators add structural complexity
    const logicMatches = trimmed.match(logicalOps);
    if (logicMatches) {
      complexity += logicMatches.length;
    }

    // Ternary adds complexity
    const ternaryMatches = trimmed.match(ternary);
    if (ternaryMatches) {
      complexity += ternaryMatches.length + nestingLevel;
    }

    // Track nesting level via braces
    const opens = (trimmed.match(/\{/g) || []).length;
    const closes = (trimmed.match(/\}/g) || []).length;
    nestingLevel += opens - closes;
    if (nestingLevel < 0) nestingLevel = 0;
  }

  return { complexity, details };
}

// ── Risk Matrix ──

interface RiskMatrix {
  changeArea: "small" | "medium" | "large";
  impactScope: "low" | "medium" | "high";
  overallRisk: "Low" | "Medium" | "High" | "Critical";
}

function calculateRiskMatrix(code: string, previousCode: string | undefined): RiskMatrix {
  // Change area: percentage of lines changed
  let changePercent = 0;
  const totalLines = code.split("\n").length;

  if (previousCode && previousCode.trim().length > 0) {
    const prevLines = new Set(previousCode.split("\n").map((l) => l.trim()));
    const currentLines = code.split("\n").map((l) => l.trim());
    let changedLines = 0;
    for (const line of currentLines) {
      if (line && !prevLines.has(line)) changedLines++;
    }
    changePercent = totalLines > 0 ? (changedLines / totalLines) * 100 : 0;
  } else {
    changePercent = 100; // New file = 100% change
  }

  const changeArea: RiskMatrix["changeArea"] =
    changePercent > 50 ? "large" : changePercent > 20 ? "medium" : "small";

  // Impact scope: number of import statements (indicates coupling)
  const importCount = (code.match(/(?:^|\n)\s*import\s+/g) ?? []).length;
  const impactScope: RiskMatrix["impactScope"] =
    importCount > 10 ? "high" : importCount > 5 ? "medium" : "low";

  // Risk matrix combination
  const riskLookup: Record<string, RiskMatrix["overallRisk"]> = {
    "small-low": "Low",
    "small-medium": "Low",
    "small-high": "Medium",
    "medium-low": "Low",
    "medium-medium": "Medium",
    "medium-high": "High",
    "large-low": "Medium",
    "large-medium": "High",
    "large-high": "Critical",
  };

  const overallRisk = riskLookup[`${changeArea}-${impactScope}`] ?? "Medium";

  return { changeArea, impactScope, overallRisk };
}

// ── Dependency Impact (Reverse Dependency Count) ──

function estimateDependencyImpact(code: string): { exportCount: number; isHighImpact: boolean } {
  // Count how many exports this file provides — more exports = more files likely depend on it
  const namedExports = (code.match(/\bexport\s+(?:const|let|var|function|class|interface|type|enum)\s+/g) ?? []).length;
  const defaultExport = /\bexport\s+default\b/.test(code) ? 1 : 0;
  const reExports = (code.match(/\bexport\s+\{[^}]+\}\s+from\s+/g) ?? []).length;
  const exportCount = namedExports + defaultExport + reExports;

  // High impact if file is a barrel/index file or has many exports
  const isBarrelFile = exportCount > 5 || reExports > 2;
  const isHighImpact = isBarrelFile || exportCount > 3;

  return { exportCount, isHighImpact };
}

// ── Risk Assessment ──

function assessRisk(intent: IntentType, code: string): { level: "low" | "medium" | "high"; reasons: string[] } {
  const reasons: string[] = [];

  if (intent === "refactor" && code.split("\n").length > 200) {
    reasons.push("대규모 리팩토링 — 회귀 위험");
  }
  if (/export\s+default|module\.exports/.test(code)) {
    reasons.push("public API 변경 가능성");
  }
  if (/database|sql|query|migration/i.test(code)) {
    reasons.push("데이터베이스 관련 코드");
  }
  if (/auth|token|session|cookie|password/i.test(code)) {
    reasons.push("인증/보안 관련 코드");
  }

  const level = reasons.length >= 2 ? "high" : reasons.length >= 1 ? "medium" : "low";
  return { level, reasons };
}

// ── Main ──

export function runSimulation(ctx: PipelineContext): TeamResult {
  const start = performance.now();
  const findings: Finding[] = [];
  const suggestions: Suggestion[] = [];

  const intent = classifyIntent(ctx.intent, ctx.code);
  const language = detectLanguage(ctx.code, ctx.fileName);
  const complexity = estimateComplexity(ctx.code);
  const risk = assessRisk(intent, ctx.code);
  const lines = ctx.code.split("\n").length;
  const hasCode = ctx.code.trim().length > 0;

  // Cyclomatic complexity (McCabe)
  const cyclomatic = calculateCyclomaticComplexity(ctx.code);

  // Cognitive complexity (Sonar-style)
  const cognitive = calculateCognitiveComplexity(ctx.code);

  // Risk matrix
  const riskMatrix = calculateRiskMatrix(ctx.code, ctx.previousCode);

  // Dependency impact
  const depImpact = estimateDependencyImpact(ctx.code);

  // Findings
  if (!hasCode && intent !== "generation") {
    findings.push({ severity: "major", message: "코드 없이 리뷰/수정 요청", rule: "NO_CODE_FOR_REVIEW" });
  }
  if (language === "unknown" && hasCode) {
    findings.push({ severity: "minor", message: "프로그래밍 언어 식별 불가", rule: "UNKNOWN_LANGUAGE" });
  }
  if (risk.level === "high") {
    for (const reason of risk.reasons) {
      findings.push({ severity: "major", message: `위험 요소: ${reason}`, rule: "HIGH_RISK" });
    }
  }

  // Cyclomatic complexity findings
  if (cyclomatic.complexity > 20) {
    findings.push({
      severity: "major",
      message: `순환 복잡도 ${cyclomatic.complexity} (매우 높음) — ${cyclomatic.details.join(", ")}`,
      rule: "HIGH_CYCLOMATIC_COMPLEXITY",
    });
  } else if (cyclomatic.complexity > 10) {
    findings.push({
      severity: "minor",
      message: `순환 복잡도 ${cyclomatic.complexity} (높음) — ${cyclomatic.details.join(", ")}`,
      rule: "MODERATE_CYCLOMATIC_COMPLEXITY",
    });
  }

  // Cognitive complexity findings
  if (cognitive.complexity > 30) {
    findings.push({
      severity: "major",
      message: `인지 복잡도 ${cognitive.complexity} (매우 높음) — 중첩 구조 단순화 필요`,
      rule: "HIGH_COGNITIVE_COMPLEXITY",
    });
  } else if (cognitive.complexity > 15) {
    findings.push({
      severity: "minor",
      message: `인지 복잡도 ${cognitive.complexity} (높음) — 가독성 개선 권장`,
      rule: "MODERATE_COGNITIVE_COMPLEXITY",
    });
  }

  // Risk matrix findings
  if (riskMatrix.overallRisk === "Critical") {
    findings.push({
      severity: "critical",
      message: `위험 매트릭스: Critical (변경 범위: ${riskMatrix.changeArea}, 영향 범위: ${riskMatrix.impactScope})`,
      rule: "RISK_MATRIX_CRITICAL",
    });
  } else if (riskMatrix.overallRisk === "High") {
    findings.push({
      severity: "major",
      message: `위험 매트릭스: High (변경 범위: ${riskMatrix.changeArea}, 영향 범위: ${riskMatrix.impactScope})`,
      rule: "RISK_MATRIX_HIGH",
    });
  }

  // Dependency impact findings
  if (depImpact.isHighImpact) {
    findings.push({
      severity: "minor",
      message: `고영향 파일: export ${depImpact.exportCount}개 — 변경 시 다수 파일에 영향 가능`,
      rule: "HIGH_DEPENDENCY_IMPACT",
    });
  }

  // Suggestions
  if (complexity.level === "high") {
    suggestions.push({ type: "refactor", message: "복잡도가 높습니다. 함수 분리를 권장합니다." });
  }
  if (intent === "generation" && !ctx.intent.includes("테스트") && !ctx.intent.includes("test")) {
    suggestions.push({ type: "style", message: "테스트 코드도 함께 생성하는 것을 권장합니다." });
  }
  if (cyclomatic.complexity > 10) {
    suggestions.push({ type: "refactor", message: `순환 복잡도 ${cyclomatic.complexity} — 조건 분기 추출/전략 패턴 권장` });
  }
  if (cognitive.complexity > 15) {
    suggestions.push({ type: "refactor", message: `인지 복잡도 ${cognitive.complexity} — 중첩 구조를 조기 반환(early return)으로 개선` });
  }

  const score = Math.max(0, 100
    - findings.filter((f) => f.severity === "critical").length * 25
    - findings.filter((f) => f.severity === "major").length * 15
    - findings.filter((f) => f.severity === "minor").length * 5
    - (risk.level === "high" ? 10 : 0)
    - (riskMatrix.overallRisk === "Critical" ? 15 : riskMatrix.overallRisk === "High" ? 10 : 0)
  );

  const status = score >= 80 ? "pass" : score >= 50 ? "warn" : "fail";

  return {
    team: "simulation",
    status,
    score,
    message: `의도: ${intent} | 언어: ${language} | 복잡도: ${complexity.level} | CC: ${cyclomatic.complexity} | 인지: ${cognitive.complexity} | 위험: ${riskMatrix.overallRisk} | ${lines}줄`,
    findings,
    suggestions,
    durationMs: Math.round(performance.now() - start),
  };
}

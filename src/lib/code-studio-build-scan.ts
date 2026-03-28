// ============================================================
// Code Studio — Build Scan
// ============================================================
// 빌드 출력 파싱, 에러/경고 추출, 수정 제안, 자동 수정.

import { parseErrors, type ParsedError } from './code-studio-error-parser';

// ============================================================
// PART 1 — Types
// ============================================================

export type FixAction = 'add-import' | 'add-type' | 'remove-unused' | 'fix-syntax' | 'add-dependency' | 'manual';

export interface BuildFinding {
  error: ParsedError;
  suggestedFix: string;
  fixAction: FixAction;
  autoFixable: boolean;
  fixCode?: string; // Code transformation if auto-fixable
}

export interface BuildScanResult {
  findings: BuildFinding[];
  totalErrors: number;
  totalWarnings: number;
  autoFixableCount: number;
  timestamp: number;
}

// IDENTITY_SEAL: PART-1 | role=Types | inputs=none | outputs=BuildFinding,BuildScanResult

// ============================================================
// PART 2 — Fix Suggestion Engine
// ============================================================

interface FixRule {
  pattern: RegExp;
  action: FixAction;
  suggest: (match: RegExpMatchArray, error: ParsedError) => string;
  autoFixable: boolean;
  generateFix?: (match: RegExpMatchArray, error: ParsedError) => string | undefined;
}

const FIX_RULES: FixRule[] = [
  {
    pattern: /Cannot find module '([^']+)'/,
    action: 'add-dependency',
    suggest: (m) => `Install missing module: npm install ${m[1]}`,
    autoFixable: false,
  },
  {
    pattern: /Cannot find name '(\w+)'/,
    action: 'add-import',
    suggest: (m) => `Add missing import for '${m[1]}'`,
    autoFixable: false,
  },
  {
    pattern: /Property '(\w+)' does not exist on type '(\w+)'/,
    action: 'add-type',
    suggest: (m) => `Add property '${m[1]}' to type '${m[2]}' or use type assertion`,
    autoFixable: false,
  },
  {
    pattern: /'(\w+)' is declared but (its value is )?never (read|used)/,
    action: 'remove-unused',
    suggest: (m) => `Remove unused declaration '${m[1]}' or prefix with underscore`,
    autoFixable: true,
    generateFix: (m) => `// Remove or rename: ${m[1]} → _${m[1]}`,
  },
  {
    pattern: /Unexpected token/,
    action: 'fix-syntax',
    suggest: () => `Fix syntax error — check for missing brackets, semicolons, or typos`,
    autoFixable: false,
  },
  {
    pattern: /Type '(.+?)' is not assignable to type '(.+?)'/,
    action: 'add-type',
    suggest: (m) => `Fix type mismatch: '${m[1]}' is not assignable to '${m[2]}'`,
    autoFixable: false,
  },
  {
    pattern: /Module '"(.+?)"' has no exported member '(\w+)'/,
    action: 'add-import',
    suggest: (m) => `'${m[2]}' is not exported from '${m[1]}' — check export name or module`,
    autoFixable: false,
  },
  {
    pattern: /Expected (\d+) arguments?, but got (\d+)/,
    action: 'fix-syntax',
    suggest: (m) => `Function expects ${m[1]} argument(s) but received ${m[2]}`,
    autoFixable: false,
  },
];

function suggestFix(error: ParsedError): BuildFinding {
  for (const rule of FIX_RULES) {
    const match = error.message.match(rule.pattern);
    if (match) {
      return {
        error,
        suggestedFix: rule.suggest(match, error),
        fixAction: rule.action,
        autoFixable: rule.autoFixable,
        fixCode: rule.generateFix?.(match, error),
      };
    }
  }

  return {
    error,
    suggestedFix: `Manual review needed: ${error.message}`,
    fixAction: 'manual',
    autoFixable: false,
  };
}

// IDENTITY_SEAL: PART-2 | role=FixSuggestion | inputs=ParsedError | outputs=BuildFinding

// ============================================================
// PART 3 — Build Scan API
// ============================================================

/** Scan build output for errors and suggest fixes */
export function scanBuildOutput(buildOutput: string): BuildScanResult {
  const errors = parseErrors(buildOutput);
  const findings = errors.map(suggestFix);

  return {
    findings,
    totalErrors: findings.filter(f => f.error.severity === 'error').length,
    totalWarnings: findings.filter(f => f.error.severity === 'warning').length,
    autoFixableCount: findings.filter(f => f.autoFixable).length,
    timestamp: Date.now(),
  };
}

/** Get only auto-fixable findings */
export function getAutoFixable(result: BuildScanResult): BuildFinding[] {
  return result.findings.filter(f => f.autoFixable);
}

/** Format build scan as human-readable report */
export function formatBuildReport(result: BuildScanResult): string {
  const lines: string[] = [
    `Build Scan: ${result.totalErrors} error(s), ${result.totalWarnings} warning(s)`,
    `Auto-fixable: ${result.autoFixableCount}`,
    '',
  ];

  for (const finding of result.findings) {
    const icon = finding.error.severity === 'error' ? '[E]' : '[W]';
    lines.push(`${icon} ${finding.error.file}:${finding.error.line} — ${finding.error.message}`);
    lines.push(`   Fix: ${finding.suggestedFix}`);
    if (finding.fixCode) lines.push(`   Code: ${finding.fixCode}`);
    lines.push('');
  }

  return lines.join('\n');
}

// IDENTITY_SEAL: PART-3 | role=BuildScanAPI | inputs=buildOutput | outputs=BuildScanResult

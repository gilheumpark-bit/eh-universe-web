// ============================================================
// Code Studio — Project Rules
// ============================================================
// 네이밍 컨벤션, 파일 크기 제한, 필수/금지 패턴, 커스텀 린트 규칙.

// ============================================================
// PART 1 — Types & Defaults
// ============================================================

export interface ProjectRule {
  id: string;
  name: string;
  description: string;
  severity: 'error' | 'warning' | 'info';
  enabled: boolean;
  check: (fileName: string, content: string) => RuleViolation[];
}

export interface RuleViolation {
  ruleId: string;
  ruleName: string;
  severity: 'error' | 'warning' | 'info';
  message: string;
  file: string;
  line?: number;
}

export interface ProjectRulesConfig {
  maxFileSize: number;          // bytes, default 50KB
  maxFileLines: number;         // default 500
  namingConvention: 'camelCase' | 'kebab-case' | 'snake_case' | 'PascalCase';
  requiredPatterns: string[];   // regex patterns that must exist
  forbiddenPatterns: string[];  // regex patterns that must not exist
  customRules: ProjectRule[];
}

export const DEFAULT_RULES_CONFIG: ProjectRulesConfig = {
  maxFileSize: 50_000,
  maxFileLines: 500,
  namingConvention: 'kebab-case',
  requiredPatterns: [],
  forbiddenPatterns: [
    'console\\.log\\(',   // no console.log in production
    'debugger',           // no debugger statements
    '\\/\\/ TODO',        // flag TODOs
  ],
  customRules: [],
};

// IDENTITY_SEAL: PART-1 | role=TypesDefaults | inputs=none | outputs=ProjectRule,RuleViolation,ProjectRulesConfig

// ============================================================
// PART 2 — Built-in Rule Checks
// ============================================================

function checkFileSize(fileName: string, content: string, config: ProjectRulesConfig): RuleViolation[] {
  const size = new TextEncoder().encode(content).length;
  if (size > config.maxFileSize) {
    return [{
      ruleId: 'max-file-size',
      ruleName: 'Max File Size',
      severity: 'warning',
      message: `File exceeds ${Math.round(config.maxFileSize / 1000)}KB limit (${Math.round(size / 1000)}KB)`,
      file: fileName,
    }];
  }
  return [];
}

function checkFileLines(fileName: string, content: string, config: ProjectRulesConfig): RuleViolation[] {
  const lineCount = content.split('\n').length;
  if (lineCount > config.maxFileLines) {
    return [{
      ruleId: 'max-file-lines',
      ruleName: 'Max File Lines',
      severity: 'warning',
      message: `File exceeds ${config.maxFileLines} line limit (${lineCount} lines)`,
      file: fileName,
    }];
  }
  return [];
}

function checkNamingConvention(fileName: string, _content: string, config: ProjectRulesConfig): RuleViolation[] {
  const name = fileName.split('/').pop()?.replace(/\.\w+$/, '') ?? '';
  if (!name) return [];

  // Skip special files
  if (name.startsWith('.') || name === 'index') return [];

  const patterns: Record<string, RegExp> = {
    'camelCase': /^[a-z][a-zA-Z0-9]*$/,
    'kebab-case': /^[a-z][a-z0-9]*(-[a-z0-9]+)*$/,
    'snake_case': /^[a-z][a-z0-9]*(_[a-z0-9]+)*$/,
    'PascalCase': /^[A-Z][a-zA-Z0-9]*$/,
  };

  const regex = patterns[config.namingConvention];
  if (regex && !regex.test(name)) {
    return [{
      ruleId: 'naming-convention',
      ruleName: 'Naming Convention',
      severity: 'info',
      message: `File name '${name}' does not match ${config.namingConvention} convention`,
      file: fileName,
    }];
  }
  return [];
}

function checkForbiddenPatterns(fileName: string, content: string, config: ProjectRulesConfig): RuleViolation[] {
  const violations: RuleViolation[] = [];
  const lines = content.split('\n');

  for (const pattern of config.forbiddenPatterns) {
    try {
      const regex = new RegExp(pattern, 'g');
      for (let i = 0; i < lines.length; i++) {
        if (regex.test(lines[i])) {
          violations.push({
            ruleId: 'forbidden-pattern',
            ruleName: 'Forbidden Pattern',
            severity: 'warning',
            message: `Forbidden pattern found: ${pattern}`,
            file: fileName,
            line: i + 1,
          });
        }
        regex.lastIndex = 0;
      }
    } catch {
      // invalid regex
    }
  }

  return violations;
}

// IDENTITY_SEAL: PART-2 | role=BuiltinChecks | inputs=fileName,content,config | outputs=RuleViolation[]

// ============================================================
// PART 3 — Public API
// ============================================================

/** Run all rules against a file */
export function checkFile(
  fileName: string,
  content: string,
  config: ProjectRulesConfig = DEFAULT_RULES_CONFIG,
): RuleViolation[] {
  const violations: RuleViolation[] = [];

  violations.push(...checkFileSize(fileName, content, config));
  violations.push(...checkFileLines(fileName, content, config));
  violations.push(...checkNamingConvention(fileName, content, config));
  violations.push(...checkForbiddenPatterns(fileName, content, config));

  for (const rule of config.customRules) {
    if (rule.enabled) {
      violations.push(...rule.check(fileName, content));
    }
  }

  return violations;
}

/** Storage */
const RULES_STORAGE_KEY = 'eh-cs-project-rules';

export function saveRulesConfig(config: ProjectRulesConfig): void {
  if (typeof window === 'undefined') return;
  try {
    // Custom rules have functions, so we save config without them
    const serializable = { ...config, customRules: [] };
    localStorage.setItem(RULES_STORAGE_KEY, JSON.stringify(serializable));
  } catch { /* quota */ }
}

export function loadRulesConfig(): ProjectRulesConfig {
  if (typeof window === 'undefined') return DEFAULT_RULES_CONFIG;
  try {
    const raw = localStorage.getItem(RULES_STORAGE_KEY);
    if (!raw) return DEFAULT_RULES_CONFIG;
    return { ...DEFAULT_RULES_CONFIG, ...JSON.parse(raw), customRules: [] };
  } catch {
    return DEFAULT_RULES_CONFIG;
  }
}

// IDENTITY_SEAL: PART-3 | role=PublicAPI | inputs=fileName,content,config | outputs=RuleViolation[]

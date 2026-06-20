/**
 * security-gate.ts
 * 3-Layer AI Request Pre-Flight Security Scanner
 *
 * Zero-dependency, synchronous, pure-function scanner.
 * Scans content before AI API calls to detect:
 *   Layer 1 — Prompt injection
 *   Layer 2 — Code injection
 *   Layer 3 — PII / secret leakage
 */

// ============================================================
// PART 1 — Types & Interfaces
// ============================================================

export type Severity = 'critical' | 'high' | 'moderate' | 'info';
export type ScanLayer = 'prompt-injection' | 'code-injection' | 'pii-secret';
export type Sensitivity = 'strict' | 'normal' | 'permissive';

export interface Finding {
  layer: ScanLayer;
  severity: Severity;
  pattern: string;
  matchedText: string;
  position: number;
}

export interface ScanResult {
  safe: boolean;
  score: number;
  findings: Finding[];
  sanitizedContent?: string;
  durationMs: number;
}

export interface SecurityGateConfig {
  sensitivity: Sensitivity;
  enablePromptInjection: boolean;
  enableCodeInjection: boolean;
  enablePiiSecret: boolean;
}

export class SecurityGateError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SecurityGateError';
    Object.setPrototypeOf(this, SecurityGateError.prototype);
  }
}

// ============================================================
// PART 2 — Pattern Definitions (pre-compiled RegExp)
// ============================================================

interface PatternDef {
  name: string;
  regex: RegExp;
  severity: Severity;
  layer: ScanLayer;
}

const PROMPT_INJECTION_PATTERNS: PatternDef[] = [
  { name: 'ignore-previous-instructions', regex: /ignore\s+(all\s+)?(previous|prior|above)\s+instructions/i, severity: 'critical', layer: 'prompt-injection' },
  { name: 'role-reassignment-you-are', regex: /you\s+are\s+now/i, severity: 'critical', layer: 'prompt-injection' },
  { name: 'role-reassignment-youre', regex: /you'?re\s+now/i, severity: 'critical', layer: 'prompt-injection' },
  { name: 'dan-mode', regex: /DAN\s+mode/i, severity: 'critical', layer: 'prompt-injection' },
  { name: 'developer-mode', regex: /developer\s+mode/i, severity: 'high', layer: 'prompt-injection' },
  { name: 'jailbreak', regex: /jailbreak/i, severity: 'critical', layer: 'prompt-injection' },
  { name: 'system-prompt-extraction', regex: /system\s+prompt/i, severity: 'high', layer: 'prompt-injection' },
  { name: 'system-message-extraction', regex: /system\s+message/i, severity: 'high', layer: 'prompt-injection' },
  { name: 'do-anything-now', regex: /do\s+anything\s+now/i, severity: 'critical', layer: 'prompt-injection' },
  { name: 'bypass-safety', regex: /bypass\s+(safety|restrictions|filters)/i, severity: 'critical', layer: 'prompt-injection' },
  { name: 'pretend-to-be', regex: /pretend\s+(to\s+be|you\s+are)/i, severity: 'high', layer: 'prompt-injection' },
  { name: 'act-as', regex: /act\s+as/i, severity: 'moderate', layer: 'prompt-injection' },
  { name: 'disregard-safety', regex: /disregard\s+(safety|guidelines|rules)/i, severity: 'critical', layer: 'prompt-injection' },
  { name: 'override-instructions', regex: /override\s+(instructions|prompt|safety)/i, severity: 'critical', layer: 'prompt-injection' },
  { name: 'forget-instructions', regex: /forget\s+(everything|instructions|rules)/i, severity: 'critical', layer: 'prompt-injection' },
  { name: 'new-persona', regex: /new\s+(persona|identity)/i, severity: 'high', layer: 'prompt-injection' },
  { name: 'encoding-attempt-base64', regex: /Base64:/i, severity: 'high', layer: 'prompt-injection' },
  { name: 'encoding-attempt-rot13', regex: /rot13/i, severity: 'high', layer: 'prompt-injection' },
  { name: 'markdown-system-injection', regex: /```system/i, severity: 'critical', layer: 'prompt-injection' },
];

const CODE_INJECTION_PATTERNS: PatternDef[] = [
  { name: 'eval-call', regex: /\beval\s*\(/, severity: 'critical', layer: 'code-injection' },
  { name: 'exec-call', regex: /\bexec\s*\(/, severity: 'critical', layer: 'code-injection' },
  { name: 'execSync-call', regex: /\bexecSync\s*\(/, severity: 'critical', layer: 'code-injection' },
  { name: 'dunder-import', regex: /__import__\s*\(/, severity: 'critical', layer: 'code-injection' },
  { name: 'importlib', regex: /\bimportlib\b/, severity: 'high', layer: 'code-injection' },
  { name: 'os-system', regex: /os\.system\s*\(/, severity: 'critical', layer: 'code-injection' },
  { name: 'subprocess', regex: /\bsubprocess\b/, severity: 'high', layer: 'code-injection' },
  { name: 'new-Function', regex: /new\s+Function\s*\(/, severity: 'critical', layer: 'code-injection' },
  { name: 'Function-constructor', regex: /\bFunction\s*\(/, severity: 'high', layer: 'code-injection' },
  { name: 'child-process', regex: /child_process/, severity: 'critical', layer: 'code-injection' },
  { name: 'require-child-process', regex: /require\s*\(\s*['"]child_process['"]\s*\)/, severity: 'critical', layer: 'code-injection' },
  { name: 'process-env-access', regex: /process\.env/, severity: 'moderate', layer: 'code-injection' },
];

const PII_SECRET_PATTERNS: PatternDef[] = [
  { name: 'openai-api-key', regex: /sk-[a-zA-Z0-9]{20,}/, severity: 'critical', layer: 'pii-secret' },
  { name: 'anthropic-api-key', regex: /sk-ant-[a-zA-Z0-9]{20,}/, severity: 'critical', layer: 'pii-secret' },
  { name: 'aws-access-key', regex: /AKIA[0-9A-Z]{16}/, severity: 'critical', layer: 'pii-secret' },
  { name: 'github-pat', regex: /ghp_[a-zA-Z0-9]{36}/, severity: 'critical', layer: 'pii-secret' },
  { name: 'github-oauth', regex: /gho_[a-zA-Z0-9]{36}/, severity: 'critical', layer: 'pii-secret' },
  { name: 'github-user-token', regex: /ghu_[a-zA-Z0-9]{36}/, severity: 'critical', layer: 'pii-secret' },
  { name: 'github-server-token', regex: /ghs_[a-zA-Z0-9]{36}/, severity: 'critical', layer: 'pii-secret' },
  { name: 'github-refresh-token', regex: /ghr_[a-zA-Z0-9]{36}/, severity: 'critical', layer: 'pii-secret' },
  { name: 'google-api-key', regex: /AIza[0-9A-Za-z\-_]{35}/, severity: 'critical', layer: 'pii-secret' },
  { name: 'stripe-secret-key', regex: /sk_live_[a-zA-Z0-9]{24,}/, severity: 'critical', layer: 'pii-secret' },
  { name: 'slack-bot-token', regex: /xoxb-[0-9]{10,}/, severity: 'critical', layer: 'pii-secret' },
  { name: 'slack-user-token', regex: /xoxp-[0-9]{10,}/, severity: 'critical', layer: 'pii-secret' },
  { name: 'visa-card', regex: /\b4[0-9]{15}\b/, severity: 'critical', layer: 'pii-secret' },
  { name: 'mastercard', regex: /\b5[1-5][0-9]{14}\b/, severity: 'critical', layer: 'pii-secret' },
  { name: 'amex-card', regex: /\b3[47][0-9]{13}\b/, severity: 'critical', layer: 'pii-secret' },
  { name: 'ssn', regex: /\b\d{3}-\d{2}-\d{4}\b/, severity: 'critical', layer: 'pii-secret' },
  { name: 'private-key-block', regex: /-----BEGIN\s+(RSA\s+|EC\s+)?PRIVATE\s+KEY-----/, severity: 'critical', layer: 'pii-secret' },
  { name: 'jwt-token', regex: /eyJ[a-zA-Z0-9_-]{10,}\.[a-zA-Z0-9_-]{10,}\.[a-zA-Z0-9_-]{10,}/, severity: 'high', layer: 'pii-secret' },
  { name: 'database-url', regex: /(postgres|mysql|mongodb):\/\/[^\s]+/, severity: 'critical', layer: 'pii-secret' },
  { name: 'bearer-token', regex: /Bearer\s+[a-zA-Z0-9\-._~+/]+=*/, severity: 'high', layer: 'pii-secret' },
  { name: 'generic-high-entropy-key', regex: /[a-zA-Z0-9]{32,}/, severity: 'info', layer: 'pii-secret' },
];

// ============================================================
// PART 3 — Utility Functions
// ============================================================

/**
 * Shannon entropy of a string (bits per character).
 * Higher entropy suggests random/generated content (keys, tokens).
 */
export function shannonEntropy(str: string): number {
  if (str.length === 0) return 0;

  const freq = new Map<string, number>();
  for (let i = 0; i < str.length; i++) {
    const ch = str[i];
    freq.set(ch, (freq.get(ch) ?? 0) + 1);
  }

  let entropy = 0;
  const len = str.length;
  freq.forEach((count) => {
    const p = count / len;
    if (p > 0) {
      entropy -= p * Math.log2(p);
    }
  });

  return entropy;
}

const SEVERITY_PENALTY: Record<Severity, number> = {
  critical: -30,
  high: -15,
  moderate: -5,
  info: -1,
};

const SAFE_THRESHOLD: Record<Sensitivity, number> = {
  strict: 80,
  normal: 50,
  permissive: 30,
};

/**
 * Truncate matched text to first 40 characters for safe logging.
 */
function truncateMatch(text: string): string {
  return text.length > 40 ? text.slice(0, 40) : text;
}

// ============================================================
// PART 4 — Configuration
// ============================================================

export function getDefaultConfig(sensitivity: Sensitivity = 'normal'): SecurityGateConfig {
  return {
    sensitivity,
    enablePromptInjection: true,
    enableCodeInjection: true,
    enablePiiSecret: true,
  };
}

function resolveConfig(partial?: Partial<SecurityGateConfig>): SecurityGateConfig {
  const base = getDefaultConfig(partial?.sensitivity);
  if (partial == null) return base;

  return {
    sensitivity: partial.sensitivity ?? base.sensitivity,
    enablePromptInjection: partial.enablePromptInjection ?? base.enablePromptInjection,
    enableCodeInjection: partial.enableCodeInjection ?? base.enableCodeInjection,
    enablePiiSecret: partial.enablePiiSecret ?? base.enablePiiSecret,
  };
}

/**
 * Determine if a pattern should be active under the current sensitivity.
 * permissive mode only runs critical and high patterns.
 */
function isPatternActive(severity: Severity, sensitivity: Sensitivity): boolean {
  if (sensitivity === 'permissive') {
    return severity === 'critical' || severity === 'high';
  }
  return true;
}

// ============================================================
// PART 5 — Core Scanner
// ============================================================

/**
 * Run a single pattern list against content, collecting findings.
 */
function runPatterns(
  content: string,
  patterns: readonly PatternDef[],
  sensitivity: Sensitivity,
  findings: Finding[],
): void {
  for (const def of patterns) {
    if (!isPatternActive(def.severity, sensitivity)) continue;

    // Reset lastIndex for global-less regex (stateless per call)
    const match = def.regex.exec(content);
    if (match == null) continue;

    // For the generic high-entropy key, enforce Shannon entropy threshold
    if (def.name === 'generic-high-entropy-key') {
      if (shannonEntropy(match[0]) <= 3.5) continue;
    }

    findings.push({
      layer: def.layer,
      severity: def.severity,
      pattern: def.name,
      matchedText: truncateMatch(match[0]),
      position: match.index,
    });
  }
}

/**
 * Scan content through all enabled layers. Synchronous, pure function.
 *
 * @param content  - Raw text to scan (user prompt, AI payload, etc.)
 * @param config   - Optional partial configuration
 * @returns ScanResult with safety verdict, score, and findings
 */
export function scanContent(
  content: string,
  config?: Partial<SecurityGateConfig>,
): ScanResult {
  if (typeof content !== 'string') {
    throw new SecurityGateError('scanContent: content must be a string');
  }

  const t0 = performance.now();
  const cfg = resolveConfig(config);
  const findings: Finding[] = [];

  if (cfg.enablePromptInjection) {
    runPatterns(content, PROMPT_INJECTION_PATTERNS, cfg.sensitivity, findings);
  }

  if (cfg.enableCodeInjection) {
    runPatterns(content, CODE_INJECTION_PATTERNS, cfg.sensitivity, findings);
  }

  if (cfg.enablePiiSecret) {
    runPatterns(content, PII_SECRET_PATTERNS, cfg.sensitivity, findings);
  }

  // Calculate score
  let score = 100;
  for (const f of findings) {
    score += SEVERITY_PENALTY[f.severity];
  }
  score = Math.max(0, score);

  const threshold = SAFE_THRESHOLD[cfg.sensitivity];
  const safe = score >= threshold;

  const durationMs = Math.round((performance.now() - t0) * 1000) / 1000;

  return {
    safe,
    score,
    findings,
    sanitizedContent: findings.length > 0 ? maskSecrets(content) : undefined,
    durationMs,
  };
}

// ============================================================
// PART 6 — Secret Masking
// ============================================================

/**
 * All regex patterns that should be masked (PII/secret layer only).
 * Masks matched regions with `first6***last4` format.
 */
const MASKABLE_PATTERNS: RegExp[] = PII_SECRET_PATTERNS
  .filter((p) => p.name !== 'generic-high-entropy-key')
  .map((p) => new RegExp(p.regex.source, p.regex.flags + (p.regex.flags.includes('g') ? '' : 'g')));

/**
 * Replace each secret match with a masked version: first 6 chars + *** + last 4 chars.
 * If the match is too short (<= 10 chars), replaces entirely with '***'.
 */
function maskSingle(matched: string): string {
  if (matched.length <= 10) return '***';
  return matched.slice(0, 6) + '***' + matched.slice(-4);
}

/**
 * Mask all detected secrets/PII in content.
 * Returns a copy with sensitive substrings replaced.
 */
export function maskSecrets(content: string): string {
  if (typeof content !== 'string') {
    throw new SecurityGateError('maskSecrets: content must be a string');
  }

  let result = content;
  for (const rx of MASKABLE_PATTERNS) {
    // Reset global regex state
    rx.lastIndex = 0;
    result = result.replace(rx, maskSingle);
  }

  return result;
}

// IDENTITY_SEAL: security-gate | role=pre-flight-scanner | inputs=content,config | outputs=ScanResult

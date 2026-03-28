// ============================================================
// Smart Beacon Engine — 평균 수렴 방지
// ============================================================
// 기존: target = (min+max)/2 → 모든 출력이 중간값으로 수렴
// 개선: 확률적 타겟팅 + 맥락 가중치 + 밀도 기반 검증

import type { BeaconConfig, UsageIntent } from "./types";
import { DEFAULT_BEACON } from "./types";

// ── 1. Gaussian Target: 범위 내 확률적 변동 ──

function gaussianRandom(): number {
  // Box-Muller transform
  const u1 = Math.random();
  const u2 = Math.random();
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
}

export function computeSmartTarget(
  config: BeaconConfig = DEFAULT_BEACON,
  intent: UsageIntent = "default",
): { targetKb: number; targetLines: number; range: [number, number] } {
  const { minKb, maxKb, sigma, intentBias, linesPerKb } = config;
  const midKb = (minKb + maxKb) / 2;
  const spread = (maxKb - minKb) / 2;

  // Apply intent bias
  const bias = intentBias[intent] ?? 0;
  const biasedMid = midKb * (1 + bias);

  // Gaussian displacement within bounds
  const displacement = gaussianRandom() * sigma * spread;
  const raw = biasedMid + displacement;
  const clamped = Math.max(minKb, Math.min(maxKb, raw));

  return {
    targetKb: Math.round(clamped * 100) / 100,
    targetLines: Math.round(clamped * linesPerKb),
    range: [Math.round(minKb * linesPerKb), Math.round(maxKb * linesPerKb)],
  };
}

// ── 2. Entropy-based Density Score ──

export function computeEntropy(code: string): number {
  const lines = code.split("\n");
  if (lines.length === 0) return 0;

  let infoLines = 0;
  let commentLines = 0;
  let emptyLines = 0;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) { emptyLines++; continue; }
    if (trimmed.startsWith("//") || trimmed.startsWith("#") || trimmed.startsWith("/*") || trimmed.startsWith("*")) {
      commentLines++;
    } else {
      infoLines++;
    }
  }

  const total = lines.length;
  const density = infoLines / total;                    // 0~1
  const commentRatio = commentLines / (total || 1);     // 0~1
  const paddingRatio = emptyLines / (total || 1);       // 0~1

  // Entropy score: high info density + moderate comments = good
  // Too many comments or padding = penalized
  const score = Math.min(100, Math.round(
    density * 70 +
    Math.min(commentRatio, 0.2) * 100 +  // reward up to 20% comments
    (1 - paddingRatio) * 30 -             // penalize excessive padding
    Math.max(0, commentRatio - 0.3) * 50  // penalize comment-heavy code
  ));

  return Math.max(0, score);
}

// ── 3. Dynamic Error Correction ──

interface FeedbackRecord {
  actualLines: number;
  targetLines: number;
  hadLogicGap: boolean;
  hadPadding: boolean;
}

let feedbackHistory: FeedbackRecord[] = [];

export function recordFeedback(record: FeedbackRecord): void {
  feedbackHistory.push(record);
  if (feedbackHistory.length > 20) feedbackHistory = feedbackHistory.slice(-20);
}

export function getCorrectionFactor(): number {
  if (feedbackHistory.length < 3) return 0;

  const recent = feedbackHistory.slice(-5);
  const avgDelta = recent.reduce((sum, r) => sum + (r.actualLines - r.targetLines), 0) / recent.length;
  const gapCount = recent.filter((r) => r.hadLogicGap).length;
  const padCount = recent.filter((r) => r.hadPadding).length;

  // If consistently too short with logic gaps → increase target
  if (gapCount >= 2) return 0.1;
  // If consistently too long with padding → decrease target
  if (padCount >= 2) return -0.1;
  // General drift correction
  if (Math.abs(avgDelta) > 20) return avgDelta > 0 ? -0.05 : 0.05;

  return 0;
}

// ── 4. Code Bloat Detection ──

export interface BloatFinding {
  type: "copy-paste" | "wrapper-function" | "over-abstraction" | "dead-parameter";
  message: string;
  line?: number;
}

/**
 * Detect copy-paste blocks: similar 5+ line blocks appearing multiple times.
 */
function detectCopyPasteBlocks(lines: string[]): BloatFinding[] {
  const findings: BloatFinding[] = [];
  const blockSize = 5;
  const blockMap = new Map<string, number[]>();

  for (let i = 0; i <= lines.length - blockSize; i++) {
    const block = lines.slice(i, i + blockSize).map((l) => l.trim()).filter((l) => l.length > 0);
    if (block.length < 3) continue; // skip mostly-empty blocks
    const key = block.join("\n");
    if (!blockMap.has(key)) {
      blockMap.set(key, []);
    }
    blockMap.get(key)!.push(i + 1);
  }

  for (const [, positions] of blockMap) {
    if (positions.length >= 2) {
      // Only report non-overlapping occurrences
      const nonOverlapping = [positions[0]];
      for (let i = 1; i < positions.length; i++) {
        if (positions[i] - nonOverlapping[nonOverlapping.length - 1] >= blockSize) {
          nonOverlapping.push(positions[i]);
        }
      }
      if (nonOverlapping.length >= 2) {
        findings.push({
          type: "copy-paste",
          message: `복사-붙여넣기 블록 감지: ${nonOverlapping.length}회 반복 (라인 ${nonOverlapping.slice(0, 3).join(", ")})`,
          line: nonOverlapping[0],
        });
      }
    }
  }

  return findings;
}

/**
 * Detect unnecessary wrapper functions: functions that just call another function with the same params.
 */
function detectWrapperFunctions(code: string): BloatFinding[] {
  const findings: BloatFinding[] = [];
  const lines = code.split("\n");

  // Match patterns like: function foo(a, b) { return bar(a, b); }
  // or: const foo = (a, b) => bar(a, b);
  const wrapperPatterns = [
    /function\s+(\w+)\s*\(([^)]*)\)\s*\{?\s*\n?\s*return\s+(\w+)\s*\(\2\)\s*;?\s*\}?/,
    /(?:const|let|var)\s+(\w+)\s*=\s*\(([^)]*)\)\s*=>\s*(\w+)\s*\(\2\)/,
  ];

  for (let i = 0; i < lines.length; i++) {
    // Check two-line window for wrapper patterns
    const twoLines = lines.slice(i, i + 2).join(" ");
    for (const pattern of wrapperPatterns) {
      const match = twoLines.match(pattern);
      if (match && match[1] !== match[3]) {
        findings.push({
          type: "wrapper-function",
          message: `불필요한 래퍼 함수: ${match[1]}() → ${match[3]}() 직접 호출 권장`,
          line: i + 1,
        });
      }
    }
  }

  return findings;
}

/**
 * Detect dead parameters: function params never used in the function body.
 */
function detectDeadParameters(code: string): BloatFinding[] {
  const findings: BloatFinding[] = [];
  const lines = code.split("\n");

  // Simple function detection: function name(params) { ... }
  const funcPattern = /(?:function\s+\w+|(?:const|let|var)\s+\w+\s*=\s*(?:async\s*)?)\s*\(([^)]+)\)/;

  for (let i = 0; i < lines.length; i++) {
    const match = lines[i].match(funcPattern);
    if (!match) continue;

    const params = match[1]
      .split(",")
      .map((p) => p.trim().replace(/[:=].*$/, "").replace(/^\.\.\.|[?]$/, "").trim())
      .filter((p) => p.length > 0 && !p.startsWith("_"));

    if (params.length === 0) continue;

    // Collect function body (simple brace counting)
    let braceDepth = 0;
    let bodyStarted = false;
    const bodyLines: string[] = [];
    for (let j = i; j < Math.min(i + 100, lines.length); j++) {
      for (const ch of lines[j]) {
        if (ch === "{") { braceDepth++; bodyStarted = true; }
        if (ch === "}") braceDepth--;
      }
      if (bodyStarted) bodyLines.push(lines[j]);
      if (bodyStarted && braceDepth <= 0) break;
    }

    const _body = bodyLines.join("\n");
    for (const param of params) {
      // Check if param name appears in the body (beyond the declaration line)
      const usagePattern = new RegExp(`\\b${param.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`);
      const bodyWithoutDecl = bodyLines.slice(1).join("\n");
      if (!usagePattern.test(bodyWithoutDecl)) {
        findings.push({
          type: "dead-parameter",
          message: `미사용 파라미터: '${param}' — 제거 또는 '_' 접두사 사용 권장`,
          line: i + 1,
        });
      }
    }
  }

  return findings;
}

/**
 * Detect over-abstraction: interfaces/abstract classes with only one implementor.
 * (Heuristic: counts declarations vs references in the same file.)
 */
function detectOverAbstraction(code: string): BloatFinding[] {
  const findings: BloatFinding[] = [];
  const lines = code.split("\n");

  // Find interfaces
  const interfacePattern = /^(?:export\s+)?interface\s+(\w+)/;
  // Find abstract classes
  const abstractPattern = /^(?:export\s+)?abstract\s+class\s+(\w+)/;

  const declarations: { name: string; line: number; kind: string }[] = [];

  for (let i = 0; i < lines.length; i++) {
    const ifMatch = lines[i].match(interfacePattern);
    if (ifMatch) declarations.push({ name: ifMatch[1], line: i + 1, kind: "interface" });

    const abMatch = lines[i].match(abstractPattern);
    if (abMatch) declarations.push({ name: abMatch[1], line: i + 1, kind: "abstract class" });
  }

  for (const decl of declarations) {
    const implPattern = new RegExp(`(?:implements|extends)\\s+.*\\b${decl.name}\\b`);
    let implCount = 0;
    for (const line of lines) {
      if (implPattern.test(line)) implCount++;
    }
    if (implCount <= 1) {
      findings.push({
        type: "over-abstraction",
        message: `과도한 추상화: ${decl.kind} '${decl.name}'의 구현체가 ${implCount}개 — 추상화 필요성 재검토 권장`,
        line: decl.line,
      });
    }
  }

  return findings;
}

export function detectCodeBloat(code: string): BloatFinding[] {
  const lines = code.split("\n");
  return [
    ...detectCopyPasteBlocks(lines),
    ...detectWrapperFunctions(code),
    ...detectDeadParameters(code),
    ...detectOverAbstraction(code),
  ];
}

// ── 5. Language-Specific Size Targets ──

export interface LanguageSizeBounds {
  minKb: number;
  maxKb: number;
}

const LANGUAGE_SIZE_TARGETS: Record<string, LanguageSizeBounds> = {
  typescript: { minKb: 1, maxKb: 30 },
  javascript: { minKb: 1, maxKb: 30 },
  tsx: { minKb: 1, maxKb: 30 },
  jsx: { minKb: 1, maxKb: 30 },
  python: { minKb: 1, maxKb: 20 },
  rust: { minKb: 1, maxKb: 40 },
  go: { minKb: 1, maxKb: 40 },
  css: { minKb: 0.5, maxKb: 20 },
  scss: { minKb: 0.5, maxKb: 20 },
  less: { minKb: 0.5, maxKb: 20 },
  html: { minKb: 0.5, maxKb: 50 },
  json: { minKb: 0.1, maxKb: 100 },
};

export function getLanguageSizeBounds(language: string): LanguageSizeBounds | null {
  const lang = language.toLowerCase().replace(/^\./, "");
  return LANGUAGE_SIZE_TARGETS[lang] ?? null;
}

export function resolveBeaconConfig(
  base: BeaconConfig,
  language?: string,
): BeaconConfig {
  if (!language) return base;
  const bounds = getLanguageSizeBounds(language);
  if (!bounds) return base;
  return {
    ...base,
    minKb: bounds.minKb,
    maxKb: bounds.maxKb,
    targetKb: (bounds.minKb + bounds.maxKb) / 2,
  };
}

// ── 6. Composite Beacon Check ──

export interface BeaconVerdict {
  status: "pass" | "warn" | "fail";
  score: number;
  targetLines: number;
  actualLines: number;
  entropy: number;
  message: string;
  bloatFindings?: BloatFinding[];
  languageBounds?: LanguageSizeBounds | null;
}

export function checkBeacon(
  code: string,
  config: BeaconConfig = DEFAULT_BEACON,
  intent: UsageIntent = "default",
  language?: string,
): BeaconVerdict {
  // Resolve language-specific size bounds
  const effectiveConfig = language ? resolveBeaconConfig(config, language) : config;
  const langBounds = language ? getLanguageSizeBounds(language) : null;

  const { targetLines, range: _range } = computeSmartTarget(effectiveConfig, intent);
  const correction = getCorrectionFactor();
  const adjustedTarget = Math.round(targetLines * (1 + correction));

  const lines = code.split("\n").length;
  const entropy = computeEntropy(code);
  const kb = new TextEncoder().encode(code).length / 1024;

  let status: "pass" | "warn" | "fail" = "pass";
  let score = 100;
  let message = `${lines}줄, ${kb.toFixed(1)}KB, 밀도 ${entropy}/100`;

  // Size check (using language-adjusted bounds)
  if (kb < effectiveConfig.minKb) {
    status = "warn";
    score -= 20;
    message = `크기 미달: ${kb.toFixed(1)}KB < ${effectiveConfig.minKb}KB 최소`;
  } else if (kb > effectiveConfig.maxKb) {
    status = "fail";
    score -= 40;
    message = `크기 초과: ${kb.toFixed(1)}KB > ${effectiveConfig.maxKb}KB 최대`;
  }

  if (langBounds) {
    message += ` [${language} 기준: ${langBounds.minKb}-${langBounds.maxKb}KB]`;
  }

  // Entropy check
  if (entropy < 40) {
    status = status === "fail" ? "fail" : "warn";
    score -= 15;
    message += ` | 밀도 저하 (${entropy}/100)`;
  }

  // Line deviation from smart target
  const deviation = Math.abs(lines - adjustedTarget) / (adjustedTarget || 1);
  if (deviation > 0.5) {
    score -= Math.round(deviation * 20);
  }

  // Code bloat detection
  const bloatFindings = detectCodeBloat(code);
  if (bloatFindings.length > 0) {
    score -= Math.min(20, bloatFindings.length * 5);
    status = status === "fail" ? "fail" : "warn";
    message += ` | 코드 비대화 ${bloatFindings.length}건 감지`;
  }

  score = Math.max(0, Math.min(100, score));

  return {
    status, score, targetLines: adjustedTarget, actualLines: lines, entropy, message,
    bloatFindings: bloatFindings.length > 0 ? bloatFindings : undefined,
    languageBounds: langBounds,
  };
}

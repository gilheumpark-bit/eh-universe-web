// ============================================================
// Good Pattern Detector — 양품 패턴 탐지 (Web Pipeline 전용)
// ============================================================
// good-pattern-catalog (CLI)의 메타데이터를 활용하여
// 코드에서 양품 패턴을 regex 기반으로 탐지한다.
// 용도: (1) 오탐(false-positive) 억제  (2) 품질 점수 가산  (3) 팀 검증 보정
//
// 카탈로그 원본: src/cli/core/good-pattern-catalog.ts

import type { GoodPatternMeta, GoodSignal, IsoQuality } from '@eh/quill-engine/good-pattern-catalog';
import { GOOD_PATTERN_CATALOG, getSuppressorsFor } from '@eh/quill-engine/good-pattern-catalog';

// ============================================================
// PART 1 — Types
// ============================================================

export interface DetectedGoodPattern {
  id: string;
  title: string;
  quality: IsoQuality;
  signal: GoodSignal;
  count: number;
  lines: number[];
  suppresses?: string[];
}

export interface GoodPatternReport {
  patterns: DetectedGoodPattern[];
  totalDetected: number;
  boostCount: number;
  suppressCount: number;
  scoreBonus: number;
  suppressedRules: string[];
}

// IDENTITY_SEAL: PART-1 | role=types | inputs=none | outputs=DetectedGoodPattern,GoodPatternReport

// ============================================================
// PART 2 — Regex Detection Rules (Web-side subset, 40 key patterns)
// ============================================================

interface DetectionRule {
  catalogId: string;
  test: (code: string, lines: string[]) => { count: number; lines: number[] };
}

const DETECTION_RULES: DetectionRule[] = [
  // ── Naming ──
  { catalogId: 'GQ-NM-002', test: (_, lines) => {
    const found: number[] = [];
    for (let i = 0; i < lines.length; i++) {
      if (/\b(?:is|has|can|should|was|did|will)[A-Z]\w*\s*[:=?]/.test(lines[i])) found.push(i + 1);
    }
    return { count: found.length, lines: found.slice(0, 5) };
  }},
  { catalogId: 'GQ-NM-003', test: (code) => {
    const m = code.match(/\bconst\s+[A-Z][A-Z0-9_]{2,}\s*=/g) ?? [];
    return { count: m.length, lines: [] };
  }},
  { catalogId: 'GQ-NM-008', test: (_, lines) => {
    const found: number[] = [];
    for (let i = 0; i < lines.length; i++) {
      if (/(?:function|const|let)\s+(?:get|set|create|update|delete|fetch|load|save|handle|process|validate|parse|render|build|init|compute|calculate|format|transform|convert|check|verify|ensure|assert)[A-Z]/.test(lines[i])) found.push(i + 1);
    }
    return { count: found.length, lines: found.slice(0, 5) };
  }},

  // ── Type System ──
  { catalogId: 'GQ-TS-004', test: (code) => {
    const m = code.match(/:\s*unknown\b/g) ?? [];
    return { count: m.length, lines: [] };
  }},
  { catalogId: 'GQ-TS-005', test: (code) => {
    const m = code.match(/\breadonly\s+\w/g) ?? [];
    return { count: m.length, lines: [] };
  }},
  { catalogId: 'GQ-TS-009', test: (_, lines) => {
    const found: number[] = [];
    for (let i = 0; i < lines.length; i++) {
      if (/\bis\s+\w/.test(lines[i]) && /:\s*\w+\s+is\s+\w/.test(lines[i])) found.push(i + 1);
    }
    return { count: found.length, lines: found };
  }},
  { catalogId: 'GQ-TS-010', test: (code) => {
    const m = code.match(/type\s+\w+\s*=[\s\S]*?\|\s*\{[\s\S]*?(?:kind|type|tag)\s*:/g) ?? [];
    return { count: m.length, lines: [] };
  }},

  // ── Function Design ──
  { catalogId: 'GQ-FN-004', test: (_, lines) => {
    const found: number[] = [];
    for (let i = 0; i < lines.length; i++) {
      if (/^\s*if\s*\(.*\)\s*(?:return|throw)\b/.test(lines[i])) found.push(i + 1);
    }
    return { count: found.length, lines: found.slice(0, 5) };
  }},
  { catalogId: 'GQ-FN-009', test: (code) => {
    const constDecls = (code.match(/\bconst\s+\w/g) ?? []).length;
    const letDecls = (code.match(/\blet\s+\w/g) ?? []).length;
    const varDecls = (code.match(/\bvar\s+\w/g) ?? []).length;
    const total = constDecls + letDecls + varDecls;
    if (total === 0) return { count: 0, lines: [] };
    const ratio = constDecls / total;
    return { count: ratio >= 0.7 ? constDecls : 0, lines: [] };
  }},
  { catalogId: 'GQ-FN-010', test: (code) => {
    const m = code.match(/\.\.\.\w+/g) ?? [];
    return { count: m.length, lines: [] };
  }},
  { catalogId: 'GQ-FN-008', test: (code) => {
    const m = code.match(/\.filter\s*\([\s\S]*?\.map\s*\(/g) ?? [];
    const m2 = code.match(/\.map\s*\([\s\S]*?\.filter\s*\(/g) ?? [];
    return { count: m.length + m2.length, lines: [] };
  }},

  // ── Async ──
  { catalogId: 'GQ-AS-001', test: (code) => {
    const awaits = (code.match(/\bawait\s+/g) ?? []).length;
    const asyncFns = (code.match(/\basync\s+(?:function|\(|[a-zA-Z])/g) ?? []).length;
    return { count: awaits > 0 && asyncFns > 0 ? awaits : 0, lines: [] };
  }},
  { catalogId: 'GQ-AS-002', test: (code) => {
    const m = code.match(/Promise\.all\s*\(/g) ?? [];
    return { count: m.length, lines: [] };
  }},
  { catalogId: 'GQ-AS-003', test: (code) => {
    const m = code.match(/Promise\.allSettled\s*\(/g) ?? [];
    return { count: m.length, lines: [] };
  }},
  { catalogId: 'GQ-AS-004', test: (code) => {
    const m = code.match(/AbortController|AbortSignal/g) ?? [];
    return { count: m.length, lines: [] };
  }},
  { catalogId: 'GQ-AS-005', test: (_, lines) => {
    const found: number[] = [];
    for (let i = 0; i < lines.length; i++) {
      if (/\btry\s*\{/.test(lines[i])) {
        const block = lines.slice(i, Math.min(i + 50, lines.length)).join('\n');
        if (/\bcatch\b/.test(block) && /\bfinally\b/.test(block)) found.push(i + 1);
      }
    }
    return { count: found.length, lines: found };
  }},

  // ── Error Handling ──
  { catalogId: 'GQ-EH-001', test: (code) => {
    const m = code.match(/class\s+\w+Error\s+extends\s+Error/g) ?? [];
    return { count: m.length, lines: [] };
  }},
  { catalogId: 'GQ-EH-002', test: (code) => {
    const m = code.match(/instanceof\s+\w*Error/g) ?? [];
    return { count: m.length, lines: [] };
  }},
  { catalogId: 'GQ-EH-003', test: (_, lines) => {
    let found = 0;
    for (let i = 0; i < lines.length; i++) {
      if (/\bcatch\s*\(/.test(lines[i])) {
        const block = lines.slice(i, Math.min(i + 10, lines.length)).join('\n');
        if (/\bthrow\b/.test(block) || /\breturn\b/.test(block) || /console\.(?:error|warn)/.test(block)) found++;
      }
    }
    return { count: found, lines: [] };
  }},
  { catalogId: 'GQ-EH-004', test: (code) => {
    const m = code.match(/\bfinally\s*\{/g) ?? [];
    return { count: m.length, lines: [] };
  }},

  // ── Null Safety ──
  { catalogId: 'GQ-NL-001', test: (code) => {
    const m = code.match(/\?\./g) ?? [];
    return { count: m.length, lines: [] };
  }},
  { catalogId: 'GQ-NL-002', test: (code) => {
    const m = code.match(/\?\?(?!=)/g) ?? [];
    return { count: m.length, lines: [] };
  }},
  { catalogId: 'GQ-NL-005', test: (code) => {
    const m = code.match(/\{\s*\w+\s*=\s*[^,}]+\s*[,}]/g) ?? [];
    return { count: m.length, lines: [] };
  }},
  { catalogId: 'GQ-NL-006', test: (code) => {
    const m = code.match(/Array\.isArray\s*\(/g) ?? [];
    return { count: m.length, lines: [] };
  }},
  { catalogId: 'GQ-NL-010', test: (_, lines) => {
    let found = 0;
    for (let i = 0; i < lines.length; i++) {
      if (/typeof\s+\w+\s*(?:===|!==)\s*['"]/.test(lines[i])) found++;
      if (/\w+\s+instanceof\s+\w+/.test(lines[i])) found++;
      if (/\bis\w+\s*\(/.test(lines[i]) && /\bif\s*\(/.test(lines[i])) found++;
    }
    return { count: found, lines: [] };
  }},

  // ── Security ──
  { catalogId: 'GQ-SC-003', test: (code) => {
    const m = code.match(/process\.env\.\w+/g) ?? [];
    return { count: m.length, lines: [] };
  }},
  { catalogId: 'GQ-SC-009', test: (code) => {
    const m = code.match(/\b(?:zod|joi|yup|superstruct|valibot)\b|\.parse\s*\(|\.safeParse\s*\(/g) ?? [];
    return { count: m.length, lines: [] };
  }},

  // ── Performance ──
  { catalogId: 'GQ-PF-002', test: (code) => {
    const m = code.match(/new\s+(?:Map|Set|WeakMap|WeakSet)\s*\(/g) ?? [];
    return { count: m.length, lines: [] };
  }},
  { catalogId: 'GQ-PF-005', test: (code) => {
    const m = code.match(/\b(?:debounce|throttle|useDebounce|useDebouncedCallback)\s*\(/g) ?? [];
    return { count: m.length, lines: [] };
  }},
  { catalogId: 'GQ-PF-006', test: (code) => {
    const m = code.match(/(?:dynamic\s*\(\s*\(\)\s*=>|import\s*\(|React\.lazy\s*\()/g) ?? [];
    return { count: m.length, lines: [] };
  }},

  // ── Resource Management ──
  { catalogId: 'GQ-RS-005', test: (code) => {
    const setters = (code.match(/setTimeout|setInterval/g) ?? []).length;
    const clearers = (code.match(/clearTimeout|clearInterval/g) ?? []).length;
    return { count: setters > 0 && clearers > 0 ? clearers : 0, lines: [] };
  }},
  { catalogId: 'GQ-RS-006', test: (code) => {
    const controllers = (code.match(/AbortController/g) ?? []).length;
    const aborts = (code.match(/\.abort\s*\(/g) ?? []).length;
    return { count: controllers > 0 && aborts > 0 ? aborts : 0, lines: [] };
  }},

  // ── Modern TypeScript ──
  { catalogId: 'GQ-NW-004', test: (code) => {
    const m = code.match(/import\s+type\b/g) ?? [];
    return { count: m.length, lines: [] };
  }},
  { catalogId: 'GQ-NW-006', test: (code) => {
    const m = code.match(/\.at\s*\(\s*-?\d+\s*\)/g) ?? [];
    return { count: m.length, lines: [] };
  }},
  { catalogId: 'GQ-NW-007', test: (code) => {
    const m = code.match(/structuredClone\s*\(/g) ?? [];
    return { count: m.length, lines: [] };
  }},

  // ── Design Patterns ──
  { catalogId: 'GQ-DP-001', test: (code) => {
    const m = code.match(/(?:function|const)\s+create[A-Z]\w*\s*[=(]/g) ?? [];
    return { count: m.length, lines: [] };
  }},
  { catalogId: 'GQ-DP-005', test: (code) => {
    const exports = (code.match(/\bexport\s+(?:function|const|class|type|interface)\b/g) ?? []).length;
    return { count: exports >= 2 ? exports : 0, lines: [] };
  }},

  // ── Documentation ──
  { catalogId: 'GQ-DC-001', test: (code) => {
    const m = code.match(/\/\*\*[\s\S]*?\*\//g) ?? [];
    return { count: m.length, lines: [] };
  }},
  { catalogId: 'GQ-DC-002', test: (code) => {
    const m = code.match(/@(?:param|returns|throws|example)\b/g) ?? [];
    return { count: m.length, lines: [] };
  }},
];

// IDENTITY_SEAL: PART-2 | role=detection-rules | inputs=code | outputs=DetectedGoodPattern[]

// ============================================================
// PART 3 — Detector Engine
// ============================================================

const _catalogMap = new Map(GOOD_PATTERN_CATALOG.map(p => [p.id, p]));

/**
 * 코드에서 양품 패턴을 탐지한다.
 * 가벼운 regex 기반 — AST 불필요, 즉시 실행 가능.
 */
export function detectGoodPatterns(code: string): GoodPatternReport {
  const lines = code.split('\n');
  const patterns: DetectedGoodPattern[] = [];
  const suppressedRules = new Set<string>();
  let boostCount = 0;
  let suppressCount = 0;

  for (const rule of DETECTION_RULES) {
    const meta = _catalogMap.get(rule.catalogId);
    if (!meta) continue;

    const result = rule.test(code, lines);
    if (result.count === 0) continue;

    patterns.push({
      id: meta.id,
      title: meta.title,
      quality: meta.quality,
      signal: meta.signal,
      count: result.count,
      lines: result.lines,
      suppresses: meta.suppresses,
    });

    if (meta.signal === 'boost') boostCount++;
    if (meta.signal === 'suppress-fp') suppressCount++;

    if (meta.suppresses) {
      for (const ruleId of meta.suppresses) {
        suppressedRules.add(ruleId);
      }
    }
  }

  // Score bonus: +1 per boost pattern, capped at +15
  const scoreBonus = Math.min(15, boostCount);

  return {
    patterns,
    totalDetected: patterns.length,
    boostCount,
    suppressCount,
    scoreBonus,
    suppressedRules: [...suppressedRules],
  };
}

// IDENTITY_SEAL: PART-3 | role=detector-engine | inputs=code | outputs=GoodPatternReport

// ============================================================
// PART 4 — Finding Suppression (오탐 억제)
// ============================================================

/**
 * 파이프라인 finding을 양품 패턴으로 필터링한다.
 * suppress-fp 또는 boost 시그널을 가진 양품 패턴이 탐지되면
 * 해당 불량 ruleId와 매칭되는 finding의 severity를 다운그레이드한다.
 *
 * @returns 필터링된 findings (원본 배열 비변경)
 */
export function suppressFindings<T extends { message: string; rule?: string }>(
  findings: T[],
  report: GoodPatternReport,
): T[] {
  if (report.suppressedRules.length === 0) return findings;

  const suppressSet = new Set(report.suppressedRules);

  return findings.filter(f => {
    if (f.rule && suppressSet.has(f.rule)) return false;
    return true;
  });
}

/**
 * severity를 다운그레이드 (error→warning, warning→info)
 * 완전 제거가 아닌 경감 처리용.
 */
export function downgradeFindings<T extends { severity: string; rule?: string }>(
  findings: T[],
  report: GoodPatternReport,
): T[] {
  if (report.suppressedRules.length === 0) return findings;

  const suppressSet = new Set(report.suppressedRules);
  const DOWNGRADE: Record<string, string> = {
    critical: 'major',
    major: 'minor',
    minor: 'info',
    error: 'warning',
    warning: 'info',
    fail: 'warn',
    warn: 'pass',
  };

  return findings.map(f => {
    if (f.rule && suppressSet.has(f.rule)) {
      const lower = DOWNGRADE[f.severity];
      if (lower) return { ...f, severity: lower };
    }
    return f;
  });
}

// IDENTITY_SEAL: PART-4 | role=false-positive-suppression | inputs=findings,report | outputs=filtered-findings

// ============================================================
// Code Studio — Patent/IP Scanner
// ============================================================
// 2026-04-23 리팩토링: SUSPICIOUS_PATTERNS 중복 제거, `lib/ip-guard/scan.ts`의
// 공용 스캐너(`scanTextForIP`)에 위임. License 감지는 코드 전용(SPDX·헤더) 로직이라
// 이 파일에 유지. 기존 공개 API(`scanProject`, `IPReport`)는 하위 호환.

import type { FileNode } from '../core/types';
import { scanTextForIP } from '@/lib/ip-guard/scan';

// ============================================================
// PART 1 — Types (공개 — 하위 호환)
// ============================================================

export interface LicenseInfo {
  file: string;
  license: string;
  spdxId: string;
  hasHeader: boolean;
  isOSS: boolean;
}

export interface CodePatternMatch {
  file: string;
  line: number;
  pattern: string;
  description: string;
  severity: 'info' | 'warning' | 'critical';
}

export interface IPReport {
  licenses: LicenseInfo[];
  patterns: CodePatternMatch[];
  score: number;
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  summary: string;
  recommendations: string[];
}

// IDENTITY_SEAL: PART-1 | role=types | inputs=none | outputs=LicenseInfo,CodePatternMatch,IPReport

// ============================================================
// PART 2 — License Detection (코드 전용 — 유지)
// ============================================================
// SPDX·헤더 감지는 소스코드 특화 로직이라 `lib/ip-guard/scan.ts`(소설·RAG용)와
// 별도로 둔다. 소설 본문엔 이런 패턴이 나올 일이 없음.

const LICENSE_PATTERNS: Array<{ regex: RegExp; license: string; spdxId: string }> = [
  { regex: /MIT License/i, license: 'MIT', spdxId: 'MIT' },
  { regex: /Apache License.*2\.0/i, license: 'Apache 2.0', spdxId: 'Apache-2.0' },
  { regex: /GNU General Public License.*v3/i, license: 'GPL-3.0', spdxId: 'GPL-3.0-only' },
  { regex: /GNU General Public License.*v2/i, license: 'GPL-2.0', spdxId: 'GPL-2.0-only' },
  { regex: /BSD 3-Clause/i, license: 'BSD-3-Clause', spdxId: 'BSD-3-Clause' },
  { regex: /BSD 2-Clause/i, license: 'BSD-2-Clause', spdxId: 'BSD-2-Clause' },
  { regex: /ISC License/i, license: 'ISC', spdxId: 'ISC' },
  { regex: /Mozilla Public License.*2\.0/i, license: 'MPL-2.0', spdxId: 'MPL-2.0' },
  { regex: /Creative Commons/i, license: 'CC', spdxId: 'CC-BY-4.0' },
  { regex: /Unlicense/i, license: 'Unlicense', spdxId: 'Unlicense' },
];

const HEADER_PATTERNS = [
  /^\s*\/\*[\s\S]*?Copyright/m,
  /^\s*\/\/.*Copyright/m,
  /^\s*#.*Copyright/m,
  /^\s*\/\*[\s\S]*?License/m,
  /^\s*\/\/.*SPDX-License-Identifier/m,
];

function detectLicense(content: string): { license: string; spdxId: string } | null {
  for (const p of LICENSE_PATTERNS) {
    if (p.regex.test(content)) return { license: p.license, spdxId: p.spdxId };
  }
  return null;
}

function hasLicenseHeader(content: string): boolean {
  return HEADER_PATTERNS.some((p) => p.test(content.slice(0, 500)));
}

// IDENTITY_SEAL: PART-2 | role=license detection | inputs=file content | outputs=LicenseInfo

// ============================================================
// PART 3 — File Tree Flatten
// ============================================================

function flattenFiles(nodes: FileNode[], prefix = ''): Array<{ path: string; content: string }> {
  const out: Array<{ path: string; content: string }> = [];
  for (const n of nodes) {
    const p = prefix ? `${prefix}/${n.name}` : n.name;
    if (n.type === 'file' && n.content != null) out.push({ path: p, content: n.content });
    if (n.children) out.push(...flattenFiles(n.children, p));
  }
  return out;
}

// IDENTITY_SEAL: PART-3 | role=file-tree flatten | inputs=FileNode[] | outputs=flat file list

// ============================================================
// PART 4 — Report Generation
// ============================================================

export function scanProject(files: FileNode[]): IPReport {
  const flat = flattenFiles(files);
  const licenses: LicenseInfo[] = [];
  const patterns: CodePatternMatch[] = [];

  for (const f of flat) {
    // License detection (코드 전용)
    const lic = detectLicense(f.content);
    if (lic || /license/i.test(f.path)) {
      licenses.push({
        file: f.path,
        license: lic?.license ?? 'Unknown',
        spdxId: lic?.spdxId ?? '',
        hasHeader: hasLicenseHeader(f.content),
        isOSS: !!lic,
      });
    }

    // Pattern scanning — `lib/ip-guard/scan.ts`의 공용 스캐너에 위임
    // (SUSPICIOUS_PATTERNS 중복 제거, 2026-04-23 리팩토링)
    const ipResult = scanTextForIP(f.content);
    for (const m of ipResult.patterns) {
      patterns.push({
        file: f.path,
        line: m.line,
        pattern: m.pattern,
        description: m.description,
        severity: m.severity,
      });
    }
  }

  const criticals = patterns.filter((p) => p.severity === 'critical').length;
  const warnings = patterns.filter((p) => p.severity === 'warning').length;
  const score = Math.max(0, 100 - criticals * 25 - warnings * 10);
  const grade: IPReport['grade'] =
    score >= 90 ? 'A' : score >= 70 ? 'B' : score >= 50 ? 'C' : score >= 30 ? 'D' : 'F';

  const recommendations: string[] = [];
  if (licenses.length === 0) recommendations.push('Add a LICENSE file to the project');
  if (criticals > 0) recommendations.push('Review critical IP flags before distribution');
  if (flat.some((f) => !hasLicenseHeader(f.content) && /\.(ts|tsx|js|jsx)$/.test(f.path))) {
    recommendations.push('Consider adding license headers to source files');
  }

  return {
    licenses,
    patterns,
    score,
    grade,
    summary: `IP scan: ${score}/100 (${grade}). ${licenses.length} license files, ${patterns.length} patterns flagged.`,
    recommendations,
  };
}

// IDENTITY_SEAL: PART-4 | role=report | inputs=FileNode[] | outputs=IPReport

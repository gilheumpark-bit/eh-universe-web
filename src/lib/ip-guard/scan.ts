/**
 * IP Guard — 공용 문자열 스캐너 (2026-04-23 신설)
 *
 * 소설·번역·RAG 문서 등 임의 텍스트에 대해 다음 리스크를 탐지한다:
 *   - 저작권 헤더 / All rights reserved / 소유권 문구
 *   - "copied from", "based on" 같은 IP 차용 흔적
 *   - 라이선스 문구 (MIT/Apache/GPL 등 — 소설엔 드물지만 감지)
 *   - 상표·프랜차이즈 이름 (brand-blocklist 통합)
 *
 * Code Studio의 `patent-scanner.ts` 와의 관계:
 *   - patent-scanner: FileNode[] 기반 (프로젝트 파일 트리 스캔)
 *   - scan.ts: string 기반 (단일 문서, RAG 결과, 생성 본문 등)
 *   - 두 곳 모두 동일 `SUSPICIOUS_PATTERNS`를 재사용하도록 설계됐으나,
 *     현재는 독립 유지 — 추후 patent-scanner가 이 모듈을 import 하도록 리팩토링 예정.
 *
 * 사용 시나리오:
 *   1. RAG ingestion 전 문서 검열 → `scanTextForIP(doc)` 호출, score 낮으면 격리
 *   2. RAG retrieval 후 결과 재필터 → 각 doc.content에 대해 빠른 게이트
 *   3. 생성 후 본문 검증 → 준수 채점 축 7의 입력
 */

import {
  scanTextForBrands,
  type BrandFlag,
  type BrandSeverity,
  type BrandEntry,
} from './brand-blocklist';

// ============================================================
// PART 1 — Types
// ============================================================

export type IPSeverity = 'info' | 'warning' | 'critical';

export interface IPPatternMatch {
  readonly pattern: string;
  readonly description: string;
  readonly severity: IPSeverity;
  readonly position: number;
  readonly line: number;
}

export interface IPLicenseMatch {
  readonly license: string;
  readonly spdxId: string;
  readonly position: number;
}

export interface IPScanResult {
  readonly patterns: readonly IPPatternMatch[];
  readonly licenses: readonly IPLicenseMatch[];
  readonly brands: readonly BrandFlag[];
  readonly score: number;          // 0~100 (높을수록 안전)
  readonly grade: 'A' | 'B' | 'C' | 'D' | 'F';
  readonly summary: string;
  readonly recommendations: readonly string[];
}

export interface IPScanOptions {
  /** 브랜드 스캔에 커스텀 블록리스트 주입 (Codex의 작가 정의) */
  readonly customBlocklist?: readonly BrandEntry[];
  /** 브랜드 스캔 최소 심각도 (기본 warning — info 필터링) */
  readonly brandMinSeverity?: BrandSeverity;
  /** 텍스트 최대 길이 (ReDoS 방어) */
  readonly maxLength?: number;
}

// IDENTITY_SEAL: ip-guard/scan | role=string-scanner | inputs=text,options | outputs=IPScanResult

// ============================================================
// PART 2 — 패턴 사전
// ============================================================

/** 라이선스 문구 매칭 — 소설 본문엔 드물지만 RAG 문서 오염 감지 */
const LICENSE_PATTERNS: ReadonlyArray<{ regex: RegExp; license: string; spdxId: string }> = [
  { regex: /MIT License/i, license: 'MIT', spdxId: 'MIT' },
  { regex: /Apache License.*2\.0/i, license: 'Apache 2.0', spdxId: 'Apache-2.0' },
  { regex: /GNU General Public License.*v3/i, license: 'GPL-3.0', spdxId: 'GPL-3.0-only' },
  { regex: /GNU General Public License.*v2/i, license: 'GPL-2.0', spdxId: 'GPL-2.0-only' },
  { regex: /BSD 3-Clause/i, license: 'BSD-3-Clause', spdxId: 'BSD-3-Clause' },
  { regex: /Creative Commons/i, license: 'CC', spdxId: 'CC-BY-4.0' },
];

/**
 * 의심 패턴 — 소설·RAG 문서용. Code Studio patent-scanner의 확장판.
 * "copied from" 같은 메타 흔적 + "© 2024", "all rights reserved" 같은 소유권 문구.
 */
const SUSPICIOUS_PATTERNS: ReadonlyArray<{
  regex: RegExp;
  description: string;
  severity: IPSeverity;
}> = [
  { regex: /all rights reserved/i, description: 'All rights reserved notice', severity: 'critical' },
  { regex: /©\s*(\d{4}|\w+)|copyright\s+©?\s*\d{4}/i, description: 'Copyright notice', severity: 'critical' },
  { regex: /proprietary|confidential/i, description: 'Proprietary/confidential marker', severity: 'critical' },
  { regex: /patent pending|patented/i, description: 'Patent reference', severity: 'critical' },
  { regex: /무단\s*전재\s*금지|무단\s*복제\s*금지|저작권자/i, description: '한국어 저작권 문구', severity: 'critical' },
  { regex: /copied from|taken from|based on the (novel|series|work) by/i, description: 'Copy attribution — 차용 흔적', severity: 'warning' },
  { regex: /adapted from|fan ?fic|fanfiction/i, description: '2차 창작 표기', severity: 'warning' },
  { regex: /™|®/, description: '상표 기호 (™/®) 직접 사용', severity: 'warning' },
  { regex: /stackoverflow\.com|github\.com\/[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+/i, description: '외부 소스 URL 직접 인용', severity: 'info' },
];

// ============================================================
// PART 3 — 내부 매칭
// ============================================================

const DEFAULT_MAX_LENGTH = 200_000;

function matchLicenses(text: string): IPLicenseMatch[] {
  const out: IPLicenseMatch[] = [];
  for (const p of LICENSE_PATTERNS) {
    const m = p.regex.exec(text);
    if (m && typeof m.index === 'number') {
      out.push({ license: p.license, spdxId: p.spdxId, position: m.index });
    }
  }
  return out;
}

function matchPatterns(text: string): IPPatternMatch[] {
  const out: IPPatternMatch[] = [];
  // 라인 기반 기록을 위해 lineStarts 사전 계산
  const lines = text.split('\n');
  const lineStarts: number[] = [0];
  for (let i = 0; i < lines.length - 1; i++) {
    lineStarts.push(lineStarts[i] + lines[i].length + 1);
  }
  const positionToLine = (pos: number): number => {
    // 이진 탐색 아닌 선형 — 패턴 수가 적어 충분
    for (let i = lineStarts.length - 1; i >= 0; i--) {
      if (pos >= lineStarts[i]) return i + 1;
    }
    return 1;
  };

  for (const sp of SUSPICIOUS_PATTERNS) {
    // 전역 매칭을 위해 regex 복제 후 g 플래그 보장
    const source = sp.regex.source;
    const flags = sp.regex.flags.includes('g') ? sp.regex.flags : `${sp.regex.flags}g`;
    const re = new RegExp(source, flags);
    let m: RegExpExecArray | null;
    while ((m = re.exec(text)) !== null) {
      out.push({
        pattern: m[0].slice(0, 100),
        description: sp.description,
        severity: sp.severity,
        position: m.index,
        line: positionToLine(m.index),
      });
      if (m.index === re.lastIndex) re.lastIndex++; // 0-length 매치 무한루프 방지
    }
  }
  return out;
}

// ============================================================
// PART 4 — 점수 산출
// ============================================================

function scoreOf(patterns: readonly IPPatternMatch[], brands: readonly BrandFlag[]): number {
  const criticals =
    patterns.filter(p => p.severity === 'critical').length +
    brands.filter(b => b.entry.severity === 'critical').length;
  const warnings =
    patterns.filter(p => p.severity === 'warning').length +
    brands.filter(b => b.entry.severity === 'warning').length;
  const infos =
    patterns.filter(p => p.severity === 'info').length +
    brands.filter(b => b.entry.severity === 'info').length;
  // critical이 가장 치명 — 브랜드 매칭 1개만 있어도 -25점
  return Math.max(0, 100 - criticals * 25 - warnings * 10 - infos * 2);
}

function gradeOf(score: number): IPScanResult['grade'] {
  if (score >= 90) return 'A';
  if (score >= 70) return 'B';
  if (score >= 50) return 'C';
  if (score >= 30) return 'D';
  return 'F';
}

function buildRecommendations(
  patterns: readonly IPPatternMatch[],
  brands: readonly BrandFlag[],
  licenses: readonly IPLicenseMatch[],
): string[] {
  const out: string[] = [];
  const critBrands = brands.filter(b => b.entry.severity === 'critical');
  if (critBrands.length > 0) {
    const names = critBrands.slice(0, 3).map(b => b.matched).join(', ');
    out.push(`실존 IP 매칭 ${critBrands.length}건 (${names}${critBrands.length > 3 ? ' …' : ''}) — 자체 네이밍으로 치환 필요.`);
  }
  const critPatterns = patterns.filter(p => p.severity === 'critical');
  if (critPatterns.length > 0) {
    out.push(`저작권·소유권 문구 ${critPatterns.length}건 감지 — RAG 문서 오염 가능성, ingestion 전 원저자 확인 필요.`);
  }
  if (licenses.length > 0) {
    out.push(`소프트웨어 라이선스 문구 ${licenses.length}건 — 소설 본문엔 부적절, 타 문서에서 유입된 흔적일 가능성.`);
  }
  if (out.length === 0) {
    out.push('검출된 IP 리스크 없음 (이 스캐너 한도 내에서).');
  }
  return out;
}

// ============================================================
// PART 5 — 공개 API
// ============================================================

/**
 * 텍스트에 대한 IP 리스크 종합 스캔.
 * 실패·빈 입력 시 `score: 100, grade: 'A'` 기본값 반환.
 */
export function scanTextForIP(text: string, options: IPScanOptions = {}): IPScanResult {
  const maxLen = options.maxLength ?? DEFAULT_MAX_LENGTH;
  const source = !text ? '' : text.length > maxLen ? text.slice(0, maxLen) : text;

  if (!source.trim()) {
    return {
      patterns: [],
      licenses: [],
      brands: [],
      score: 100,
      grade: 'A',
      summary: 'empty input — no IP risk',
      recommendations: [],
    };
  }

  const licenses = matchLicenses(source);
  const patterns = matchPatterns(source);
  const brands = scanTextForBrands(source, options.customBlocklist);

  const minSev = options.brandMinSeverity;
  const filteredBrands = minSev
    ? (() => {
        const ORDER: Record<BrandSeverity, number> = { info: 0, warning: 1, critical: 2 };
        const threshold = ORDER[minSev];
        return brands.filter(b => ORDER[b.entry.severity] >= threshold);
      })()
    : brands;

  const score = scoreOf(patterns, filteredBrands);
  const grade = gradeOf(score);
  const recommendations = buildRecommendations(patterns, filteredBrands, licenses);

  return {
    patterns,
    licenses,
    brands: filteredBrands,
    score,
    grade,
    summary: `IP scan: ${score}/100 (${grade}) — ${patterns.length} patterns, ${filteredBrands.length} brands, ${licenses.length} licenses`,
    recommendations,
  };
}

/**
 * 빠른 게이트 — 점수·등급만 확인. 상세 보고서 불필요한 루프용.
 */
export function quickIPCheck(text: string, options: IPScanOptions = {}): {
  score: number;
  grade: IPScanResult['grade'];
  critical: number;
} {
  const result = scanTextForIP(text, options);
  const critical =
    result.patterns.filter(p => p.severity === 'critical').length +
    result.brands.filter(b => b.entry.severity === 'critical').length;
  return { score: result.score, grade: result.grade, critical };
}

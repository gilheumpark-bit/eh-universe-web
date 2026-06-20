// ============================================================
// quality-gate-v2 — Task 4 Phase 2 — Draft / Detail 전용 검증
// ============================================================
//
// 기존 quality-gate.ts 는 1-stage (5,500~7,000자) 완성본 기준.
// v2 는 Draft(4,000자)와 Detail(6,000자)을 각각 독립 검증.
//
// 핵심 원칙:
//   - Draft 는 "초안 수준" — 4문단 이상 + 한글 비율 + 분량만 체크.
//   - Detail 은 "완성본 수준" — 분량 + 대사 비율까지 체크.
//   - 레거시 평가(tension/pacing/grade)는 건드리지 않음. 이 모듈은 '형식' 검증.
//
// 사용처:
//   - UI "AI 살 붙이기" 버튼이 Detail 결과를 받은 뒤 validateDetailPass() 로 1차 게이팅.
//   - Draft 결과는 runDraftPass 내부 또는 호출자가 validateDraftPass() 로 검증.
//
// [C] 빈 입력 / 초장대 입력(50k+) / 플랫폼 미지원 모두 방어.
// [G] 정규식은 파일 상단에서 사전 컴파일, 텍스트 순회 1회.
// [K] 기존 validate10PartStructure 재사용.

import {
  DRAFT_TARGET_CHARS,
  DETAIL_TARGET_CHARS,
  PLATFORM_DRAFT_OVERRIDE,
  type PlatformDraftKey,
} from './pipeline-constants';
import { validate10PartStructure } from './validator';

// ============================================================
// PART 1 — Types
// ============================================================

export interface QualityGateV2Metrics {
  /** 전체 문자 수 (공백 포함) */
  chars: number;
  /** 문단 개수 — 빈 줄로 구분된 블록 */
  paragraphs: number;
  /** 대사 비율 — 0~1, 대화 따옴표 내부 문자수 / 전체 */
  dialogueRatio: number;
  /** 한글 비율 — 0~1, 한글 유니코드 문자수 / 전체 */
  hangulRatio: number;
}

export interface QualityGateV2Result {
  ok: boolean;
  reasons: string[];
  metrics: QualityGateV2Metrics;
}

// ============================================================
// PART 2 — Shared metric extractor
// ============================================================

// ReDoS 방어용 상한 — validator.ts 와 동일 기준
const MAX_TEXT_LENGTH = 50_000;

// [G] 사전 컴파일 — 호출 반복 시 재컴파일 방지
const HANGUL_RE = /[\uAC00-\uD7AF]/g;
const DIALOGUE_RE = /["「『'"][^"」』'"]*["」』'"]/g;

/**
 * 공통 지표 계산.
 * [C] 50k 초과 입력은 앞 50k만 사용 (ReDoS / OOM 방어).
 * [C] paragraphs / dialogueRatio / hangulRatio 모두 분모 0 방어.
 */
export function extractQualityMetrics(text: string): QualityGateV2Metrics {
  const safe = text.length > MAX_TEXT_LENGTH ? text.slice(0, MAX_TEXT_LENGTH) : text;
  const chars = safe.length;

  if (chars === 0) {
    return { chars: 0, paragraphs: 0, dialogueRatio: 0, hangulRatio: 0 };
  }

  const paragraphs = safe
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0).length;

  // Hangul ratio
  const hangulMatches = safe.match(HANGUL_RE);
  const hangulRatio = (hangulMatches?.length ?? 0) / chars;

  // Dialogue ratio — 매치된 따옴표 블록 총 길이 / 전체
  let dialogueChars = 0;
  DIALOGUE_RE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = DIALOGUE_RE.exec(safe)) !== null) {
    dialogueChars += m[0].length;
    // [G] zero-length match 방지 (이론상 DIALOGUE_RE 는 최소 2자라 안전하지만 보수적으로)
    if (m.index === DIALOGUE_RE.lastIndex) DIALOGUE_RE.lastIndex++;
  }
  const dialogueRatio = Math.min(1, dialogueChars / chars);

  return { chars, paragraphs, dialogueRatio, hangulRatio };
}

// ============================================================
// PART 3 — Platform range resolver
// ============================================================

function resolveDraftRange(platform?: string | null): { min: number; max: number } {
  if (platform) {
    const upper = platform.toUpperCase() as PlatformDraftKey;
    const p = PLATFORM_DRAFT_OVERRIDE[upper];
    if (p) return { min: p.min, max: p.max };
  }
  return { min: DRAFT_TARGET_CHARS.min, max: DRAFT_TARGET_CHARS.max };
}

function resolveDetailRange(platform?: string | null): { min: number; max: number } {
  // Detail 은 레거시 완성본 기준을 따르되,
  // 플랫폼이 NOVELPIA/SYOSETU 처럼 짧으면 min 을 내려잡아 과도한 재시도 방지.
  if (platform) {
    const upper = platform.toUpperCase() as PlatformDraftKey;
    const p = PLATFORM_DRAFT_OVERRIDE[upper];
    if (p) {
      // Detail 상한은 Draft max + 2,000 ~ DETAIL_TARGET_CHARS.max 중 작은 쪽
      const max = Math.min(DETAIL_TARGET_CHARS.max, p.max + 2000);
      const min = Math.max(DETAIL_TARGET_CHARS.min - 500, p.min + 1000);
      return { min, max };
    }
  }
  return { min: DETAIL_TARGET_CHARS.min, max: DETAIL_TARGET_CHARS.max };
}

// ============================================================
// PART 4 — Draft pass validator
// ============================================================

/**
 * Draft pass 검증.
 *   - 3,500~5,500자 (플랫폼 오버라이드 지원)
 *   - 최소 4문단, 최대 8문단 권장
 *   - 한글 비율 ≥ 60% (영어/일어/중국어 오염 방지)
 *
 * [C] 빈 입력 → ok:false + chars=0 사유.
 */
export function validateDraftPass(
  text: string,
  platform?: string | null,
): QualityGateV2Result {
  const metrics = extractQualityMetrics(text);
  const reasons: string[] = [];
  const range = resolveDraftRange(platform);

  if (metrics.chars === 0) {
    reasons.push('empty_draft');
    return { ok: false, reasons, metrics };
  }

  // 1) 분량
  if (metrics.chars < range.min) {
    reasons.push(`draft_too_short: ${metrics.chars} < ${range.min}`);
  } else if (metrics.chars > range.max) {
    reasons.push(`draft_too_long: ${metrics.chars} > ${range.max}`);
  }

  // 2) 문단 구조 — Draft 는 4~8문단 권장 (1문단 초장문 / 10+ 잘게 쪼갬 방지)
  if (metrics.paragraphs < 4) {
    reasons.push(`draft_paragraph_low: ${metrics.paragraphs} < 4`);
  } else if (metrics.paragraphs > 8) {
    reasons.push(`draft_paragraph_high: ${metrics.paragraphs} > 8`);
  }

  // 3) 한글 비율 — KO 컨텍스트에서 60% 미만이면 영어 오염 의심
  if (metrics.hangulRatio < 0.6) {
    reasons.push(`hangul_ratio_low: ${metrics.hangulRatio.toFixed(2)} < 0.60`);
  }

  // 4) 10-Part 범위 확인 (정보성) — Draft range 사용
  const structure = validate10PartStructure(text, range);
  if (!structure.withinRange) {
    // 1) 분량에서 이미 잡혔을 가능성 크지만 이중 확인
    if (!reasons.some((r) => r.startsWith('draft_too_'))) {
      reasons.push(`draft_range_off: chars=${metrics.chars} range=${range.min}-${range.max}`);
    }
  }

  return { ok: reasons.length === 0, reasons, metrics };
}

// ============================================================
// PART 5 — Detail pass validator
// ============================================================

/**
 * Detail pass 검증.
 *   - 5,000~7,000자 (플랫폼 가감)
 *   - 대사 비율 10%~45% (대사만 과다 / 서술만 과다 방지)
 *   - 한글 비율 ≥ 60%
 *   - 최소 5문단 (Detail 은 초안보다 풍부해야 함)
 */
export function validateDetailPass(
  text: string,
  platform?: string | null,
): QualityGateV2Result {
  const metrics = extractQualityMetrics(text);
  const reasons: string[] = [];
  const range = resolveDetailRange(platform);

  if (metrics.chars === 0) {
    reasons.push('empty_detail');
    return { ok: false, reasons, metrics };
  }

  // 1) 분량
  if (metrics.chars < range.min) {
    reasons.push(`detail_too_short: ${metrics.chars} < ${range.min}`);
  } else if (metrics.chars > range.max) {
    reasons.push(`detail_too_long: ${metrics.chars} > ${range.max}`);
  }

  // 2) 한글 비율
  if (metrics.hangulRatio < 0.6) {
    reasons.push(`hangul_ratio_low: ${metrics.hangulRatio.toFixed(2)} < 0.60`);
  }

  // 3) 대사 비율 — 10%~45%
  //    [C] chars < 500 인 초단편에는 의미 없으므로 스킵 (이미 too_short 으로 잡힘)
  if (metrics.chars >= 500) {
    if (metrics.dialogueRatio < 0.05) {
      reasons.push(`dialogue_ratio_low: ${metrics.dialogueRatio.toFixed(2)} < 0.05`);
    } else if (metrics.dialogueRatio > 0.5) {
      reasons.push(`dialogue_ratio_high: ${metrics.dialogueRatio.toFixed(2)} > 0.50`);
    }
  }

  // 4) 문단 수 — Detail 은 풍부해야 하므로 최소 5문단
  if (metrics.paragraphs < 5) {
    reasons.push(`detail_paragraph_low: ${metrics.paragraphs} < 5`);
  }

  // 5) 10-Part 범위 (정보성)
  const structure = validate10PartStructure(text, range);
  if (!structure.withinRange && !reasons.some((r) => r.startsWith('detail_too_'))) {
    reasons.push(`detail_range_off: chars=${metrics.chars} range=${range.min}-${range.max}`);
  }

  return { ok: reasons.length === 0, reasons, metrics };
}

// IDENTITY_SEAL: quality-gate-v2 | role=Draft/Detail 형식 검증 | inputs=text,platform | outputs=QualityGateV2Result

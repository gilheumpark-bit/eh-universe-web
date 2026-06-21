// ============================================================
// quality-harness — 프로젝트 맞춤 품질 하네스 (X4 — 하네스 기법 접목)
//
// 하네스 = 작업(프로젝트) 도메인에 맞춘 검증 세트를 생성 → 저장 → 재사용.
//   1. buildHarness({genre, grade, platform}) → 활성 검증 셋(checks) + 가중(weights)
//   2. 저장: StoryConfig.qualityHarness (additive — setConfig 영속 경로)
//   3. 재사용: 같은 프로젝트 재방문 시 loadOrBuildHarness 가 일치 시 load
//      (genre/grade/platform 변경 시 자동 재생성 — claude3 _하네스/ 매칭 룰의 축약판)
//
// 장르 프리셋: 기존 korean-genre-matrix.ts 재사용 (라벨·프로파일 — 산식 발명 X).
// 검증 임계는 본 파일의 결정적 프리셋 테이블 — 모델 자가 측정/날조 지표 아님.
// 순수 TS. React/DOM/fetch 의존 0.
// ============================================================

import {
  getKoreanGenreProfile,
  type KoreanGenreId,
} from '@/lib/translation/korean-genre-matrix';
import type { AuditCategory, PublishAuditOptions } from '@/lib/translation/publish-audit';

// ============================================================
// PART 1 — Types
// ============================================================

/** 콘텐츠 등급 — StoryConfig.prismMode 축약 (ALL/FREE/OFF→all, T15→teen15, M18→adult19) */
export type HarnessGrade = 'all' | 'teen15' | 'adult19';

/** 검증 종류 — 전부 기존 엔진에 실재하는 검사만 (기능 가장 금지) */
export type HarnessCheckKind = 'publish-audit' | 'ai-signature' | 'rhythm' | 'ip-filter';

export interface HarnessCheck {
  /** 유일 식별자 (예: 'audit:spelling', 'ai-signature:max-score') */
  id: string;
  kind: HarnessCheckKind;
  label: { ko: string; en: string; ja?: string; zh?: string };
  enabled: boolean;
  /**
   * kind 별 임계/강도 (결정적 프리셋):
   * - ai-signature:max-score → scanAISignature score 허용 상한
   * - rhythm:max-avg-len    → analyzeRhythm macro.avgLen 권장 상한(자)
   * - rhythm:min-burstiness → micro.burstiness 권장 하한
   * - ip-filter:strength    → 0(완화) / 1(표준) / 2(강) — 등급 기반
   */
  threshold?: number;
}

export interface QualityHarness {
  /** 매칭 키 — `${genre}_${grade}_${platform}_v1` */
  id: string;
  version: 1;
  genre: KoreanGenreId;
  grade: HarnessGrade;
  /** PublishPlatform 값 문자열 ('NONE' 포함) */
  platform: string;
  checks: HarnessCheck[];
  /** publish-audit 카테고리별 penalty 배수 (1 = 기본) */
  weights: Record<AuditCategory, number>;
  createdAt: number;
  lastUsedAt: number;
  useCount: number;
}

export interface HarnessInput {
  genre: KoreanGenreId;
  grade: HarnessGrade;
  platform: string;
}

// ============================================================
// PART 2 — 결정적 프리셋 테이블 (장르 페이싱 그룹 · 등급 · 플랫폼)
// ============================================================

/** 장르 → 페이싱 그룹 (korean-genre-matrix pacingHint 성격의 결정적 분류) */
type PacingGroup = 'fast' | 'mid' | 'slow' | 'neutral';

const GENRE_PACING: Record<KoreanGenreId, PacingGroup> = {
  hunter: 'fast', // "Fast scene transitions"
  regression: 'fast', // "knowledge advantage payoff" per chapter
  romantasy: 'slow', // "Slower romantic tension build-up"
  romance: 'slow', // "Dialogue-driven, emotional beats"
  fantasy: 'mid',
  sf: 'mid',
  'martial-arts': 'mid',
  generic: 'neutral',
};

/** 페이싱 그룹별 리듬/표현 습관/구조 프리셋 */
const PACING_PRESET: Record<
  PacingGroup,
  { maxAvgLen: number; minBurstiness: number; aiSigMax: number; structureWeight: number }
> = {
  fast: { maxAvgLen: 50, minBurstiness: 0.35, aiSigMax: 30, structureWeight: 1.5 },
  mid: { maxAvgLen: 65, minBurstiness: 0.3, aiSigMax: 30, structureWeight: 1.0 },
  slow: { maxAvgLen: 80, minBurstiness: 0.25, aiSigMax: 25, structureWeight: 0.75 },
  neutral: { maxAvgLen: 70, minBurstiness: 0.3, aiSigMax: 35, structureWeight: 1.0 },
};

/** 등급 → IP 필터 강도 (전체 등급일수록 강) */
const GRADE_IP_STRENGTH: Record<HarnessGrade, number> = {
  all: 2,
  teen15: 1,
  adult19: 0,
};

/** 한국 플랫폼 — 한국어 맞춤법 가중 대상 */
const KO_PLATFORMS = new Set(['MUNPIA', 'NOVELPIA', 'KAKAOPAGE', 'SERIES']);

/** 플랫폼 표시 라벨 (PublishPlatform enum 값 → ko/en) */
const PLATFORM_LABELS: Record<string, { ko: string; en: string }> = {
  NONE: { ko: '플랫폼 미지정', en: 'No platform' },
  MUNPIA: { ko: '문피아', en: 'Munpia' },
  NOVELPIA: { ko: '노벨피아', en: 'Novelpia' },
  KAKAOPAGE: { ko: '카카오페이지', en: 'KakaoPage' },
  SERIES: { ko: '네이버 시리즈', en: 'Naver Series' },
  ROYAL_ROAD: { ko: '로열로드', en: 'Royal Road' },
  WEBNOVEL: { ko: '웹노벨', en: 'Webnovel' },
  KINDLE_VELLA: { ko: '킨들 벨라', en: 'Kindle Vella' },
  WATTPAD: { ko: '왓패드', en: 'Wattpad' },
  KAKUYOMU: { ko: '카쿠요무', en: 'Kakuyomu' },
  NAROU: { ko: '나로우', en: 'Narou' },
  ALPHAPOLIS: { ko: '알파폴리스', en: 'Alphapolis' },
  QIDIAN: { ko: '치디엔', en: 'Qidian' },
  JJWXC: { ko: '진장원창', en: 'JJWXC' },
  FANQIE: { ko: '판치에', en: 'Fanqie' },
};

const GRADE_LABELS: Record<HarnessGrade, { ko: string; en: string }> = {
  all: { ko: '전체 등급', en: 'All ages' },
  teen15: { ko: '15세', en: 'Teen 15' },
  adult19: { ko: '19금', en: 'Adult 19' },
};

const AUDIT_CATEGORIES: readonly AuditCategory[] = [
  'punctuation',
  'spacing',
  'spelling',
  'structure',
  'consistency',
  'completeness',
] as const;

const AUDIT_CATEGORY_LABELS: Record<AuditCategory, { ko: string; en: string }> = {
  punctuation: { ko: '문장부호', en: 'Punctuation' },
  spacing: { ko: '띄어쓰기', en: 'Spacing' },
  spelling: { ko: '맞춤법', en: 'Spelling' },
  structure: { ko: '문장·문단 길이', en: 'Sentence/paragraph length' },
  consistency: { ko: '표기 일관성', en: 'Consistency' },
  completeness: { ko: '미완 표식', en: 'Unfinished markers' },
};

// ============================================================
// PART 3 — 입력 정규화 헬퍼 (StoryConfig → HarnessInput)
// ============================================================

/** StoryConfig.genre(enum 문자열) → KoreanGenreId. 미매핑/빈값은 'generic'. */
export function koreanGenreIdFromStoryGenre(genre: string | undefined | null): KoreanGenreId {
  switch (genre) {
    case 'SYSTEM_HUNTER':
      return 'hunter';
    case 'FANTASY':
      return 'fantasy';
    case 'MODERN_FANTASY':
      return 'fantasy';
    case 'FANTASY_ROMANCE':
      return 'romantasy';
    case 'ROMANCE':
      return 'romance';
    case 'SF':
      return 'sf';
    case 'WUXIA':
      return 'martial-arts';
    default:
      // THRILLER / HORROR / ALT_HISTORY / LIGHT_NOVEL / undefined — 전용 프로파일 없음 → generic (날조 금지)
      return 'generic';
  }
}

/** StoryConfig.prismMode → HarnessGrade. 미지정/OFF/FREE/ALL/CUSTOM → 'all'. */
export function gradeFromPrismMode(mode: string | undefined | null): HarnessGrade {
  if (mode === 'M18') return 'adult19';
  if (mode === 'T15') return 'teen15';
  return 'all';
}

// ============================================================
// PART 4 — buildHarness (생성)
// ============================================================

export function buildHarness(input: HarnessInput, now: number = Date.now()): QualityHarness {
  const genre: KoreanGenreId = GENRE_PACING[input.genre] ? input.genre : 'generic';
  const grade: HarnessGrade = GRADE_IP_STRENGTH[input.grade] !== undefined ? input.grade : 'all';
  const platform = typeof input.platform === 'string' && input.platform ? input.platform : 'NONE';

  const pacing = PACING_PRESET[GENRE_PACING[genre]];

  // ── weights: publish-audit 카테고리 penalty 배수 (전부 양수·기본 1) ──
  const weights: Record<AuditCategory, number> = {
    punctuation: 1,
    spacing: 1,
    spelling: KO_PLATFORMS.has(platform) ? 1.25 : 1, // 한국 플랫폼 — 맞춤법 가중
    structure: pacing.structureWeight, // 페이싱 그룹 — 긴 문장 페널티 가중/완화
    consistency: 1,
    completeness: platform !== 'NONE' ? 1.5 : 1, // 출고 대상 플랫폼 — 미완 표식 치명
  };

  // ── checks: 출판감사 6 + 표현 습관 1 + 리듬 2 + IP 필터 1 = 10종 ──
  const checks: HarnessCheck[] = [
    ...AUDIT_CATEGORIES.map<HarnessCheck>((cat) => ({
      id: `audit:${cat}`,
      kind: 'publish-audit',
      label: AUDIT_CATEGORY_LABELS[cat],
      enabled: true,
    })),
    {
      id: 'ai-signature:max-score',
      kind: 'ai-signature',
      label: { ko: '표현 습관 기준', en: 'Writing style limit', ja: '表現のクセ確認ライン', zh: '表达习惯检查线' },
      enabled: true,
      threshold: pacing.aiSigMax,
    },
    {
      id: 'rhythm:max-avg-len',
      kind: 'rhythm',
      label: { ko: '평균 문장 길이 상한', en: 'Avg sentence length cap' },
      enabled: true,
      threshold: pacing.maxAvgLen,
    },
    {
      id: 'rhythm:min-burstiness',
      kind: 'rhythm',
      label: { ko: '리듬 변동성 하한', en: 'Rhythm burstiness floor' },
      enabled: true,
      threshold: pacing.minBurstiness,
    },
    {
      id: 'ip-filter:strength',
      kind: 'ip-filter',
      label: { ko: 'IP 필터 강도', en: 'IP filter strength' },
      enabled: true,
      threshold: GRADE_IP_STRENGTH[grade],
    },
  ];

  return {
    id: `${genre}_${grade}_${platform}_v1`,
    version: 1,
    genre,
    grade,
    platform,
    checks,
    weights,
    createdAt: now,
    lastUsedAt: now,
    useCount: 0,
  };
}

// ============================================================
// PART 5 — 저장/재사용 (match · load · used)
// ============================================================

/** 저장된 하네스가 현 프로젝트 입력과 일치하는가 (claude3 정확 일치 매칭) */
export function isHarnessMatch(
  saved: QualityHarness | undefined | null,
  input: HarnessInput,
): saved is QualityHarness {
  return Boolean(
    saved &&
      saved.version === 1 &&
      Array.isArray(saved.checks) &&
      saved.genre === input.genre &&
      saved.grade === input.grade &&
      saved.platform === input.platform,
  );
}

/**
 * 재사용 우선 load — 일치 시 저장본 그대로(reused: true), 불일치/없음 시 신규 생성.
 * 저장(영속)은 호출 측 책임 (setConfig — 렌더 중 부수효과 금지).
 */
export function loadOrBuildHarness(
  saved: QualityHarness | undefined | null,
  input: HarnessInput,
  now: number = Date.now(),
): { harness: QualityHarness; reused: boolean } {
  if (isHarnessMatch(saved, input)) {
    return { harness: saved, reused: true };
  }
  return { harness: buildHarness(input, now), reused: false };
}

/** 사용 1회 기록 — 불변 갱신본 반환 (lastUsedAt·useCount). 원본 비변경. */
export function markHarnessUsed(h: QualityHarness, now: number = Date.now()): QualityHarness {
  return { ...h, lastUsedAt: now, useCount: (h.useCount ?? 0) + 1 };
}

// ============================================================
// PART 6 — 적용 어댑터 + 요약
// ============================================================

/** 하네스 → runPublishAudit additive 옵션 (활성 카테고리 + 카테고리 가중) */
export function harnessToAuditOptions(h: QualityHarness): PublishAuditOptions {
  const enabledCategories = h.checks
    .filter((c) => c.kind === 'publish-audit' && c.enabled)
    .map((c) => c.id.replace(/^audit:/, '') as AuditCategory)
    .filter((c) => AUDIT_CATEGORIES.includes(c));
  return {
    enabledCategories,
    categoryWeights: h.weights,
  };
}

/** UI 1줄 요약 — 예: "헌터물 · 전체 등급 · 문피아 — 검증 10종" (L4 호환 {ko,en}) */
export function summarizeHarness(h: QualityHarness): { ko: string; en: string } {
  const genreLabel = getKoreanGenreProfile(h.genre).label;
  const gradeLabel = GRADE_LABELS[h.grade] ?? GRADE_LABELS.all;
  const platformLabel = PLATFORM_LABELS[h.platform] ?? { ko: h.platform, en: h.platform };
  const count = h.checks.filter((c) => c.enabled).length;
  return {
    ko: `${genreLabel.ko} · ${gradeLabel.ko} · ${platformLabel.ko} — 검증 ${count}종`,
    en: `${genreLabel.en} · ${gradeLabel.en} · ${platformLabel.en} — ${count} checks`,
  };
}

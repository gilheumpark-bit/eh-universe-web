// ============================================================
// PART 1 — 타입 정의 (스포일러 4등급 + 매체 변환 게이트)
// ============================================================
// 사양: claude/_도구/07_IP_자산화/_spoiler_classification.md
//   §1 4등급 매트릭스 / §2 자동 추론 룰 / §3 매체 변환 차단 게이트 / §8 judgment.
// 순수 TS. React/DOM/fetch 미사용. 외부 모듈 미import. 자체 타입.

/**
 * 공개 등급 4단계 (사양 §1).
 * Public(자유) < Internal(회차 도달 후) < Restricted(payoff 회차만) < Confidential(절대 차단).
 */
export type SpoilerLevel = 'Public' | 'Internal' | 'Restricted' | 'Confidential';

/**
 * 매체 변환 대상 (사양 §3.1~§3.4).
 * image=이미지 프롬프트 / video=영상 / audio=음성 / cover=표지·캐릭 일러.
 */
export type MediaTarget = 'image' | 'video' | 'audio' | 'cover';

/** 게이트 판정 3종 (사양 §8 spoilerGate.judgment). */
export type ExposureJudgment = 'PASS' | 'WARNING' | 'BLOCKED';

/**
 * 분류 대상 entry (세계관 fact·캐릭 시트 슬롯·복선 답 등).
 * 사양 §2 auto_classification 입력 + §2.1 classification 슬롯.
 */
export interface SpoilerEntry {
  /** 명시 등급 (§2.1 슬롯). 있으면 추론보다 우선. 미인식 토큰은 보수 디폴트. */
  classification?: string | null;
  /** §2: 1=표면 사실 / 2=시스템 작동 원리 / 3=형이상학·작품 주제. */
  tier?: number | null;
  /** §2: 작품 핵심 주제 연결. non-empty면 Confidential. */
  themeLink?: string | null;
  /** §2: 충돌하는 fact id 목록. */
  conflictsWith?: readonly string[] | null;
  /** §2: "fact contradicts 표면 룰" 여부 (conflictsWith와 AND 조건). */
  contradictsSurfaceRule?: boolean | null;
}

/** 회차 컨텍스트 (사양 §3.1 imagePromptGate — 현재 회차 vs 공개 회차). */
export interface EpisodeContext {
  /** 현재 작성·변환 중 회차. */
  currentEpisode?: number | null;
  /** 이 entry가 공개되는 회차 (§2.1 publicAtEpisode). */
  publicAtEpisode?: number | null;
}

/** canExposeInMedia 판정 결과. */
export interface MediaExposureDecision {
  /** true = 프롬프트 참조 허용 (WARNING 포함), false = 차단. */
  allowed: boolean;
  /** PASS=자유 / WARNING=작가 확인 후 진행 (§8) / BLOCKED=차단. */
  judgment: ExposureJudgment;
  /** 판정에 사용된 정규화 등급 (미상 입력은 Confidential로 정규화). */
  level: SpoilerLevel;
  /** 판정에 사용된 정규화 매체 (미상 입력은 'image' 게이트 기준). */
  mediaTarget: MediaTarget;
  /** 판정 근거 1줄. */
  reason: string;
}

// 등급 보수성 순서 — 큰 값일수록 보수적(비공개). 승급만 허용, 강등 금지.
const LEVEL_ORDER: Record<SpoilerLevel, number> = {
  Public: 0,
  Internal: 1,
  Restricted: 2,
  Confidential: 3,
};

// 미상·결손 입력의 안전 디폴트 = 가장 보수적 (사양 §1 Confidential = 절대 차단).
const SAFE_DEFAULT_LEVEL: SpoilerLevel = 'Confidential';

// ============================================================
// PART 2 — 입력 정규화 (미상 → 보수 디폴트)
// ============================================================

const VALID_LEVELS: readonly SpoilerLevel[] = ['Public', 'Internal', 'Restricted', 'Confidential'];
const VALID_MEDIA: readonly MediaTarget[] = ['image', 'video', 'audio', 'cover'];

/**
 * 등급 토큰 정규화. 대소문자 무시. 미인식 → undefined (호출부에서 보수 디폴트 적용).
 */
function normalizeLevel(raw: unknown): SpoilerLevel | undefined {
  if (typeof raw !== 'string') {
    return undefined;
  }
  const key = raw.trim().toLowerCase();
  return VALID_LEVELS.find((lv) => lv.toLowerCase() === key);
}

/**
 * 매체 토큰 정규화. 미인식 → undefined.
 */
function normalizeMedia(raw: unknown): MediaTarget | undefined {
  if (typeof raw !== 'string') {
    return undefined;
  }
  const key = raw.trim().toLowerCase();
  return VALID_MEDIA.find((m) => m === key);
}

// 유효 회차 번호인지 (음수·NaN·비숫자 방어).
function isEpisodeNumber(v: unknown): v is number {
  return typeof v === 'number' && Number.isFinite(v) && v >= 0;
}

// ============================================================
// PART 3 — classifySpoiler (entry → 4등급, 사양 §2)
// ============================================================

/**
 * entry의 공개 등급을 분류한다.
 *
 * 우선순위 (사양 §2 auto_classification):
 *  1. 명시 classification 슬롯이 유효 토큰이면 그대로 (§2.1).
 *     명시했으나 미인식 토큰 → Confidential (미상 = 보수 디폴트).
 *  2. tier 기반: 1→Public / 2→Internal / 3→Restricted·Confidential.
 *  3. themeLink 존재 → Confidential로 승급 (tier 3의 "or Confidential" 분기 해소).
 *  4. conflictsWith.length > 0 AND contradictsSurfaceRule → 최소 Restricted로 승급.
 *  5. tier 미상·entry 결손 → Confidential (가장 보수적).
 *
 * 승급만 허용 — 룰 충돌 시 더 보수적인 등급이 이긴다.
 * [추정 표명] 사양 §2 yaml은 tier 3을 "Restricted or Confidential"로만 적어 분기 기준이
 * 명시되지 않음. themeLink 유무로 해소함 (themeLink 룰이 바로 다음 줄에 위치).
 * 이 해석의 confidence 0.6 — 사양만으로 100% 증명 불가.
 *
 * @param entry 분류 대상 (null/비객체 안전 — 보수 디폴트 Confidential)
 */
export function classifySpoiler(entry: SpoilerEntry | null | undefined): SpoilerLevel {
  // [방어] null/비객체 → 가장 보수적.
  if (entry == null || typeof entry !== 'object') {
    return SAFE_DEFAULT_LEVEL;
  }

  // 1. 명시 등급 우선.
  if (entry.classification != null && String(entry.classification).trim() !== '') {
    const explicit = normalizeLevel(entry.classification);
    // 명시했는데 미인식 토큰 = "미상 등급" → 보수 디폴트.
    return explicit ?? SAFE_DEFAULT_LEVEL;
  }

  // 2. tier 기반 base 등급.
  let base: SpoilerLevel | undefined;
  if (entry.tier === 1) {
    base = 'Public';
  } else if (entry.tier === 2) {
    base = 'Internal';
  } else if (entry.tier === 3) {
    // §2: tier 3 → Restricted or Confidential. themeLink로 분기 (아래 3에서 승급).
    base = 'Restricted';
  }

  // 3. themeLink → Confidential 승급.
  const hasThemeLink =
    typeof entry.themeLink === 'string' && entry.themeLink.trim().length > 0;

  // 4. 충돌 + 표면 룰 모순 → 최소 Restricted 승급.
  const hasSurfaceConflict =
    Array.isArray(entry.conflictsWith) &&
    entry.conflictsWith.length > 0 &&
    entry.contradictsSurfaceRule === true;

  // 5. tier 미상이고 추론 신호도 없으면 보수 디폴트.
  if (base === undefined && !hasThemeLink && !hasSurfaceConflict) {
    return SAFE_DEFAULT_LEVEL;
  }

  let level: SpoilerLevel = base ?? 'Public'; // 신호가 있으면 아래 승급이 등급을 끌어올림.
  if (hasSurfaceConflict && LEVEL_ORDER[level] < LEVEL_ORDER.Restricted) {
    level = 'Restricted';
  }
  if (hasThemeLink && LEVEL_ORDER[level] < LEVEL_ORDER.Confidential) {
    level = 'Confidential';
  }
  // [방어] base 미상인데 신호만 있던 경우 — 위 승급으로 Restricted/Confidential 보장됨.
  if (base === undefined && LEVEL_ORDER[level] < LEVEL_ORDER.Restricted) {
    level = SAFE_DEFAULT_LEVEL;
  }
  return level;
}

// ============================================================
// PART 4 — canExposeInMedia (매체 변환 차단 게이트, 사양 §1·§3·§8)
// ============================================================

/**
 * 등급 × 매체 변환 노출 가능 판정.
 *
 * 차단 매트릭스 (사양 §1·§3.1 — §3.2 영상 동일·§3.3 음성·§3.4 표지):
 *  - Public        → PASS (✓ 자유).
 *  - Internal      → 회차 도달 시 PASS / 미도달 BLOCKED / 회차 미상 WARNING (작가 확인).
 *  - Restricted    → 회차 도달 시 WARNING (⚠ §8 "작가 확인") / 미도달·미상 BLOCKED.
 *  - Confidential  → BLOCKED (✗ 절대 차단 — 회차 무관).
 *  - cover(표지·캐릭 일러)는 §3.4: Restricted·Confidential 무조건 차단 (회차 개념 없음).
 *  - 미상 등급 → Confidential로 간주 (보수 디폴트) → BLOCKED.
 *
 * @param level 공개 등급 (미상 안전 디폴트 = Confidential)
 * @param mediaTarget 변환 매체 (미상 시 image 게이트와 동일 규칙 적용)
 * @param episode 회차 컨텍스트 (선택 — Internal/Restricted 회차 게이트용)
 */
export function canExposeInMedia(
  level: SpoilerLevel | string | null | undefined,
  mediaTarget: MediaTarget | string | null | undefined,
  episode?: EpisodeContext | null,
): MediaExposureDecision {
  // [방어] 미상 등급 → 가장 보수적으로 정규화.
  const lv = normalizeLevel(level) ?? SAFE_DEFAULT_LEVEL;
  const levelWasUnknown = normalizeLevel(level) === undefined;
  // [방어] 미상 매체 → image 게이트 기준 (cover 특례를 임의 적용하지 않음 — §3.1이 기본 게이트).
  const media = normalizeMedia(mediaTarget) ?? 'image';

  const decide = (
    allowed: boolean,
    judgment: ExposureJudgment,
    reason: string,
  ): MediaExposureDecision => ({ allowed, judgment, level: lv, mediaTarget: media, reason });

  // 1. Confidential — §1 "✗ 절대 차단". 회차·매체 무관.
  if (lv === 'Confidential') {
    return decide(
      false,
      'BLOCKED',
      levelWasUnknown
        ? '미상 등급 → 보수 디폴트 Confidential — 절대 차단 (§1)'
        : 'Confidential — 매체 변환 절대 차단 (§1)',
    );
  }

  // 2. Public — §1 "✓ 자유".
  if (lv === 'Public') {
    return decide(true, 'PASS', 'Public — 자유 노출 (§1)');
  }

  // 3. 표지·캐릭 일러 특례 — §3.4: Restricted(+Confidential)는 회차 무관 차단.
  if (media === 'cover' && lv === 'Restricted') {
    return decide(false, 'BLOCKED', 'Restricted — 표지·1화 일러 차단 (§3.4)');
  }

  // 4. 회차 게이트 (Internal·Restricted 공통, §3.1).
  const cur = episode?.currentEpisode;
  const pub = episode?.publicAtEpisode;
  const hasEpisodeInfo = isEpisodeNumber(cur) && isEpisodeNumber(pub);

  if (lv === 'Restricted') {
    if (!hasEpisodeInfo) {
      // §3.1: Restricted (publicAtEpisode > 현재) = 차단. 회차 미상 → 도달 증명 불가 → 차단.
      return decide(false, 'BLOCKED', 'Restricted — 회차 미상, 도달 증명 불가 → 자동 차단 (§3.1)');
    }
    if (pub! <= cur!) {
      // §1 "⚠ 등장 회차 도달 후만" + §8 "Restricted 있음? → 작가 확인".
      return decide(true, 'WARNING', `Restricted — ep${pub} 도달 (현재 ep${cur}), 작가 확인 후 노출 (§8)`);
    }
    return decide(false, 'BLOCKED', `Restricted — 공개 회차 ep${pub} 미도달 (현재 ep${cur}) → 차단 (§3.1)`);
  }

  // 5. Internal — §1 "✓ 회차 도달 후".
  if (hasEpisodeInfo) {
    if (pub! <= cur!) {
      return decide(true, 'PASS', `Internal — ep${pub} 도달 (현재 ep${cur}) → 노출 가능 (§3.1)`);
    }
    return decide(false, 'BLOCKED', `Internal — 공개 회차 ep${pub} 미도달 (현재 ep${cur}) → 차단 (§3.1)`);
  }
  // 회차 미상 Internal — 사양 자동 차단 대상(Restricted·Confidential) 아님.
  // 허용하되 WARNING으로 회차 확인 요구 (§8 작가 확인 패턴).
  return decide(true, 'WARNING', 'Internal — 회차 미상, 공개 회차 도달 여부 확인 필요 (§1·§8)');
}

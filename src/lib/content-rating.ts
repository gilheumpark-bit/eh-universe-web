// ============================================================
// PART 1 — Types & Constants
// ============================================================
//
// Content Rating — 19+ 콘텐츠 플래그 + 연령 등급 자가 선언 시스템.
// 한국 청소년보호법 + KDP/Apple Books/Royal Road 성인 분기 대응.
//
// - 프로젝트 단위 자가 선언만 지원(실제 본인 인증은 PASS API 필요)
// - localStorage `noa_rating_<projectId>` 저장
// - Export 시 EPUB `<dc:audience>Adult</dc:audience>` + 파일명 [19+] prefix
// ============================================================

import { logger } from './logger';
import type { AppLanguage } from './studio-types';

export type ContentRating = 'all' | '12+' | '15+' | '19+';
export type ContentWarning = 'violence' | 'sexual' | 'language' | 'gambling' | 'drug';

export interface RatingMetadata {
  rating: ContentRating;
  warnings: ContentWarning[];
  declaredAt: string;
}

const STORAGE_PREFIX = 'noa_rating_';
const AGE_CONFIRMED_KEY = 'noa_age_confirmed_14';

const DEFAULT_META: RatingMetadata = {
  rating: 'all',
  warnings: [],
  declaredAt: '',
};

// 매우 단순한 휴리스틱 — 실제 분류는 사용자 자가 선언이 우선.
const SEXUAL_HINTS = /[가-힣]*(정사|섹스|성관계|알몸|벌거|누드|성욕)|(sexual|erotic|nude|nsfw)/i;
const VIOLENCE_HINTS = /(살인|고문|피투성|절단|난자)|(murder|torture|gore|decapitat)/i;
const PROFANITY_HINTS = /(씨발|좆같|개새끼|병신)|\b(fuck|shit|damn|bitch)\b/i;

// ============================================================
// PART 2 — Storage (per-project)
// ============================================================

function safeRead(projectId: string): RatingMetadata {
  if (typeof window === 'undefined') return { ...DEFAULT_META };
  try {
    const raw = localStorage.getItem(STORAGE_PREFIX + projectId);
    if (!raw) return { ...DEFAULT_META };
    const parsed = JSON.parse(raw) as Partial<RatingMetadata>;
    return {
      rating: (parsed.rating ?? 'all') as ContentRating,
      warnings: Array.isArray(parsed.warnings) ? (parsed.warnings as ContentWarning[]) : [],
      declaredAt: typeof parsed.declaredAt === 'string' ? parsed.declaredAt : '',
    };
  } catch (err) {
    logger.warn('content-rating', `read failed for ${projectId}`, err);
    return { ...DEFAULT_META };
  }
}

function safeWrite(projectId: string, meta: RatingMetadata): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_PREFIX + projectId, JSON.stringify(meta));
  } catch (err) {
    logger.warn('content-rating', `write failed for ${projectId}`, err);
  }
}

export function getRating(projectId: string): RatingMetadata {
  return safeRead(projectId);
}

export function setRating(
  projectId: string,
  rating: ContentRating,
  warnings: ContentWarning[] = [],
): RatingMetadata {
  const meta: RatingMetadata = {
    rating,
    warnings: Array.from(new Set(warnings)),
    declaredAt: new Date().toISOString(),
  };
  safeWrite(projectId, meta);
  return meta;
}

export function clearRating(projectId: string): void {
  if (!projectId || typeof window === 'undefined') return;
  try {
    localStorage.removeItem(STORAGE_PREFIX + projectId);
  } catch (err) {
    logger.warn('content-rating', `clear failed for ${projectId}`, err);
  }
}

// ============================================================
// PART 3 — Heuristic recommendation + gating
// ============================================================

/** 본문 샘플을 훑어 권장 등급 산출 — UI에서 참고용 */
export function getRecommendedRating(content: string): ContentRating {
  if (!content || typeof content !== 'string') return 'all';
  const sample = content.length > 20_000 ? content.slice(0, 20_000) : content;
  // 각 카테고리 match 수로 간이 점수
  const sexual = (sample.match(SEXUAL_HINTS) ?? []).length;
  const violence = (sample.match(VIOLENCE_HINTS) ?? []).length;
  const profane = (sample.match(PROFANITY_HINTS) ?? []).length;

  if (sexual >= 1) return '19+';
  if (violence >= 3) return '19+';
  if (violence >= 1 || profane >= 3) return '15+';
  if (profane >= 1) return '12+';
  return 'all';
}

/** 미성년자 접근 경고가 필요한지 — 19+ 확정 시 true */
export function warnIfMinorAccess(rating: ContentRating): boolean {
  return rating === '19+';
}

// ============================================================
// PART 4 — Age gate (self-declaration, not identity verification)
// ============================================================

/** Welcome에서 체크박스로 ‘만 14세 이상’ 자가 선언했는지 */
export function hasConfirmedAge(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return localStorage.getItem(AGE_CONFIRMED_KEY) === '1';
  } catch {
    return false;
  }
}

export function confirmAge(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(AGE_CONFIRMED_KEY, '1');
  } catch (err) {
    logger.warn('content-rating', 'confirmAge failed', err);
  }
}

// ============================================================
// PART 5 — Export labels (EPUB/DOCX prefix + disclosure text)
// ============================================================

const RATING_LABELS: Record<ContentRating, Record<AppLanguage, string>> = {
  'all': { KO: '전연령', EN: 'All Ages', JP: '全年齢', CN: '全年龄' },
  '12+': { KO: '12세 이상', EN: 'Ages 12+', JP: '12歳以上', CN: '12岁以上' },
  '15+': { KO: '15세 이상', EN: 'Ages 15+', JP: '15歳以上', CN: '15岁以上' },
  '19+': { KO: '성인 (19+)', EN: 'Adult (19+)', JP: '成人 (19+)', CN: '成人 (19+)' },
};

const WARNING_LABELS: Record<ContentWarning, Record<AppLanguage, string>> = {
  violence: { KO: '폭력', EN: 'Violence', JP: '暴力', CN: '暴力' },
  sexual: { KO: '선정성', EN: 'Sexual', JP: '性的', CN: '性暗示' },
  language: { KO: '욕설', EN: 'Language', JP: '粗言', CN: '粗俗语言' },
  gambling: { KO: '사행성', EN: 'Gambling', JP: 'ギャンブル', CN: '赌博' },
  drug: { KO: '약물', EN: 'Drug Use', JP: '薬物', CN: '药物' },
};

export function formatRatingLabel(rating: ContentRating, lang: AppLanguage): string {
  return RATING_LABELS[rating]?.[lang] ?? RATING_LABELS[rating]?.KO ?? String(rating);
}

export function formatWarnings(warnings: ContentWarning[], lang: AppLanguage): string {
  if (!warnings || warnings.length === 0) return '';
  return warnings
    .map(w => WARNING_LABELS[w]?.[lang] ?? WARNING_LABELS[w]?.KO ?? String(w))
    .join(', ');
}

/** 파일명에 붙일 등급 prefix — 19+만 붙음 */
export function filenamePrefix(rating: ContentRating): string {
  return rating === '19+' ? '[19+] ' : '';
}

/** Export 고지문에 추가될 성인 경고 (19+만) */
export function buildAdultWarning(
  meta: RatingMetadata,
  lang: AppLanguage,
): string {
  if (meta.rating !== '19+') return '';
  const warnStr = formatWarnings(meta.warnings, lang);
  const warnSuffix = warnStr ? ` — ${warnStr}` : '';
  const adultLines: Record<AppLanguage, string> = {
    KO: `[성인 콘텐츠 경고] 본 작품은 19세 이상 독자를 대상으로 합니다${warnSuffix}. 미성년자의 열람을 금지합니다.`,
    EN: `[Adult Content Warning] This work is intended for readers 19+${warnSuffix}. Minors should not access this content.`,
    JP: `[成人向けコンテンツ警告] 本作品は19歳以上の読者を対象としています${warnSuffix}。未成年者の閲覧を禁じます。`,
    CN: `[成人内容警告] 本作品面向19岁以上读者${warnSuffix}。未成年人请勿阅读。`,
  };
  return adultLines[lang] ?? adultLines.KO;
}

/** EPUB 메타데이터용 `<dc:audience>` 값 */
export function epubAudience(rating: ContentRating): string | null {
  if (rating === '19+') return 'Adult';
  if (rating === '15+') return 'Teen';
  if (rating === '12+') return 'Juvenile';
  return null;
}

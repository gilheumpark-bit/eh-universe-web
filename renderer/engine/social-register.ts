// ============================================================
// Social Register Pack — MVP 5 Axes
// ============================================================
//
// Provides speech register metadata for characters.
// Used in pipeline.ts to inject character social context into prompts.

import type { SocialProfile } from '../lib/studio-types';
import type { AppLanguage } from '../lib/studio-types';

// ============================================================
// PART 1 — Label Maps (i18n)
// ============================================================

const RELATION_LABELS: Record<AppLanguage, Record<string, string>> = {
  KO: { stranger: '낯선 사이', formal: '격식체', colleague: '동료', friend: '친구', intimate: '친밀', hostile: '적대' },
  EN: { stranger: 'Stranger', formal: 'Formal', colleague: 'Colleague', friend: 'Friend', intimate: 'Intimate', hostile: 'Hostile' },
  JP: { stranger: '他人', formal: '敬語', colleague: '同僚', friend: '友人', intimate: '親密', hostile: '敵対' },
  CN: { stranger: '陌生人', formal: '正式', colleague: '同事', friend: '朋友', intimate: '亲密', hostile: '敌对' },
};

const AGE_LABELS: Record<AppLanguage, Record<string, string>> = {
  KO: { teen: '10대', young_adult: '청년', adult: '성인', middle: '중년', elder: '노년' },
  EN: { teen: 'Teen', young_adult: 'Young Adult', adult: 'Adult', middle: 'Middle-aged', elder: 'Elder' },
  JP: { teen: '10代', young_adult: '青年', adult: '成人', middle: '中年', elder: '高齢' },
  CN: { teen: '青少年', young_adult: '青年', adult: '成人', middle: '中年', elder: '老年' },
};

const EXPLICIT_LABELS: Record<AppLanguage, Record<string, string>> = {
  KO: { none: '없음', implied: '암시', low: '낮음', medium: '중간', high: '높음' },
  EN: { none: 'None', implied: 'Implied', low: 'Low', medium: 'Medium', high: 'High' },
  JP: { none: 'なし', implied: '暗示', low: '低', medium: '中', high: '高' },
  CN: { none: '无', implied: '暗示', low: '低', medium: '中', high: '高' },
};

const PROFANITY_LABELS: Record<AppLanguage, Record<string, string>> = {
  KO: { none: '없음', mild: '경미', strong: '강함' },
  EN: { none: 'None', mild: 'Mild', strong: 'Strong' },
  JP: { none: 'なし', mild: '軽度', strong: '強い' },
  CN: { none: '无', mild: '轻微', strong: '强烈' },
};

// IDENTITY_SEAL: PART-1 | role=i18n label maps | inputs=none | outputs=label records

// ============================================================
// PART 2 — Prompt Builder
// ============================================================

/**
 * Format a character's SocialProfile into a prompt-injectable string.
 */
export function formatSocialProfile(
  profile: SocialProfile,
  charName: string,
  language: AppLanguage,
): string {
  const relation = RELATION_LABELS[language]?.[profile.relationDistance] ?? profile.relationDistance;
  const age = AGE_LABELS[language]?.[profile.ageRegister] ?? profile.ageRegister;
  const explicit = EXPLICIT_LABELS[language]?.[profile.explicitness] ?? profile.explicitness;
  const profanity = PROFANITY_LABELS[language]?.[profile.profanityLevel] ?? profile.profanityLevel;

  const isKO = language === 'KO';
  const parts: string[] = [];

  if (isKO) {
    parts.push(`[${charName} 사회적 레지스터]`);
    parts.push(`관계: ${relation}`);
    parts.push(`나이대: ${age}`);
    if (profile.professionRegister) parts.push(`직업: ${profile.professionRegister}`);
    parts.push(`수위: ${explicit}`);
    parts.push(`비속어: ${profanity}`);
  } else {
    parts.push(`[${charName} Social Register]`);
    parts.push(`Relation: ${relation}`);
    parts.push(`Age: ${age}`);
    if (profile.professionRegister) parts.push(`Profession: ${profile.professionRegister}`);
    parts.push(`Explicitness: ${explicit}`);
    parts.push(`Profanity: ${profanity}`);
  }

  return parts.join(' / ');
}

// Exported label maps for UI dropdowns
export { RELATION_LABELS, AGE_LABELS, EXPLICIT_LABELS, PROFANITY_LABELS };

// IDENTITY_SEAL: PART-2 | role=Prompt builder for social register | inputs=SocialProfile,name,lang | outputs=string

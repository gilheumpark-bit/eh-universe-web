import type { TranslatedEpisode } from '@/engine/translation';
import type { TranslatedManuscriptEntry } from '@/lib/studio-types';

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

const CJK_REGEX = /[\u4E00-\u9FFF\u3040-\u309F\u30A0-\u30FF\uAC00-\uD7AF]/;
const KO_CHAR_REGEX = /[가-힣]/;
const JP_KANA_KANJI_REGEX = /[一-龠ぁ-んァ-ン]/;
const JP_HIRAGANA_KATAKANA_REGEX = /[\u3040-\u309F\u30A0-\u30FF]/;

export const KO_PARTICLES_AFTER = [
  '입니다', '였다', '이었다', '다가', '까지', '에서', '에게', '께서',
  '이다', '부터', '라고', '라는', '지만', '니까',
  '으로', '해요', '합니다',
  '은', '는', '을', '를', '의', '에', '도', '만', '께',
  '이', '가', '로', '와', '과', '해', '다', '면',
];

export const JP_PARTICLES_AFTER = [
  'である', 'です', 'した',
  'から', 'まで', 'より',
  'は', 'が', 'を', 'に', 'の', 'で', 'と', 'へ',
  'や', 'か', 'も', 'だ',
];

export function findKOBoundaryMatch(text: string, target: string): boolean {
  if (!text || !target) return false;
  if (target.length === 0) return false;

  let searchFrom = 0;
  while (searchFrom <= text.length - target.length) {
    const index = text.indexOf(target, searchFrom);
    if (index === -1) return false;

    const before = index > 0 ? text[index - 1] : '';
    const afterIndex = index + target.length;
    const after = afterIndex < text.length ? text[afterIndex] : '';

    if (before && KO_CHAR_REGEX.test(before)) {
      searchFrom = index + 1;
      continue;
    }

    if (after && KO_CHAR_REGEX.test(after)) {
      const suffix = text.slice(afterIndex, afterIndex + 5);
      const hasParticle = KO_PARTICLES_AFTER.some((particle) => suffix.startsWith(particle));
      if (!hasParticle) {
        searchFrom = index + 1;
        continue;
      }
    }

    return true;
  }
  return false;
}

export function findJPBoundaryMatch(text: string, target: string): boolean {
  if (!text || !target) return false;
  if (target.length === 0) return false;

  let searchFrom = 0;
  while (searchFrom <= text.length - target.length) {
    const index = text.indexOf(target, searchFrom);
    if (index === -1) return false;

    const before = index > 0 ? text[index - 1] : '';
    const afterIndex = index + target.length;

    if (before && JP_KANA_KANJI_REGEX.test(before)) {
      searchFrom = index + 1;
      continue;
    }

    if (afterIndex >= text.length) return true;
    const after = text[afterIndex];
    if (!JP_KANA_KANJI_REGEX.test(after)) return true;

    const suffix = text.slice(afterIndex, afterIndex + 3);
    const hasParticle = JP_PARTICLES_AFTER.some((particle) => suffix.startsWith(particle));
    if (hasParticle) return true;

    searchFrom = index + 1;
  }
  return false;
}

export function findGlossaryUsage<T extends { source: string; target: string; context?: string }>(
  glossary: T[],
  translatedText: string,
): T[] {
  if (!Array.isArray(glossary) || glossary.length === 0) return [];
  if (!translatedText || typeof translatedText !== 'string') return [];

  const used: T[] = [];
  for (const entry of glossary) {
    if (!entry || !entry.target || entry.target.length < 2) continue;
    const target = entry.target;

    if (KO_CHAR_REGEX.test(target)) {
      if (findKOBoundaryMatch(translatedText, target)) used.push(entry);
      continue;
    }

    if (JP_HIRAGANA_KATAKANA_REGEX.test(target)) {
      if (findJPBoundaryMatch(translatedText, target)) used.push(entry);
      continue;
    }

    if (CJK_REGEX.test(target)) {
      if (translatedText.includes(target)) used.push(entry);
      continue;
    }

    try {
      const pattern = new RegExp(`\\b${escapeRegex(target)}\\b`, 'i');
      if (pattern.test(translatedText)) used.push(entry);
    } catch {
      if (translatedText.toLowerCase().includes(target.toLowerCase())) used.push(entry);
    }
  }
  return used;
}

export function toManuscriptEntry(
  result: TranslatedEpisode,
  title: string = ''
): TranslatedManuscriptEntry {
  return {
    episode: result.episode,
    sourceLang: result.sourceLang,
    targetLang: result.targetLang,
    mode: result.mode,
    translatedTitle: title,
    translatedContent: result.translatedText,
    charCount: result.translatedText.length,
    avgScore: result.avgScore,
    band: result.band,
    glossarySnapshot: result.glossarySnapshot.map((entry) => ({
      source: entry.source,
      target: entry.target,
      locked: entry.locked,
    })),
    lastUpdate: result.timestamp,
  };
}
